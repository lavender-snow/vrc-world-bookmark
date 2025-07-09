import { loadKey } from './credential-store';
import {
  addOrUpdateWorldInfo,
  deleteWorldInfo,
  getWorldInfo,
  getBookmarkList,
  SelectQueryBase,
  getBookmark,
} from './database';
import { getLLMRecommendWorld as getRecommendWorldForBedrock } from './llm/bedrock/conversation';
import { getLLMRecommendWorld as getRecommendWorldForOpenAI } from './llm/openai/conversation';
import { fetchWorldInfo } from './vrchat-api';

import { ORDERABLE_COLUMNS, SORT_ORDERS_ID, VISITS_STATUS } from 'src/consts/const';
import { VRChatServerError, WorldNotFoundError } from 'src/errors/vrchat-errors';
import type { BookmarkListOptions, VRChatWorldInfo } from 'src/types/renderer';
import { shuffleArray } from 'src/utils/util';

export async function upsertWorldBookmark(worldId: string) {
  try {
    const world = await fetchWorldInfo(worldId);
    const upsertResult = addOrUpdateWorldInfo(world);

    return { data: getWorldInfo(worldId), upsertResult };
  } catch (error) {
    if (error instanceof WorldNotFoundError) {
      const isExist = deleteWorldInfo(worldId);
      if (!isExist) {
        return {
          error: 'ワールドIDが誤っている、もしくは削除されています',
        };
      }
    } else if (error instanceof VRChatServerError) {
      console.error('VRChat server error:', error);
      return {
        error: `VRChatのサーバーにエラーが発生しています。 ${error.message}`,
      };
    } else {
      console.error(`Error fetching world info for ${worldId}:`, error);
      return {
        error: `ワールド情報取得時にエラーが発生しています。 ${error.message}`,
      };
    }
  }

  return { error: '予期しないエラーが発生しました。' };
}

function buildBookmarkListWhereClauses(options: BookmarkListOptions, params: Record<string, string | number>): string[] {
  const whereClauses: string[] = [];

  if (options.selectedGenres.length > 0) {
    const genreFilterCondition = options.genreFilterMode === 'and'
      ? 'GROUP BY world_id HAVING COUNT(DISTINCT genre_id) = ' + options.selectedGenres.length
      : '';

    whereClauses.push(`
    world.id IN (
        SELECT world_id
        FROM world_genres
        WHERE genre_id IN (
          ${options.selectedGenres.map((_, i) => `@genreId${i}`).join(',')}
        )
        ${genreFilterCondition}
    )
  `);
    options.selectedGenres.forEach((id, i) => {
      params[`genreId${i}`] = id;
    });
  } else {
    whereClauses.push('NOT EXISTS (SELECT world.id FROM world_genres wg WHERE world.id = wg.world_id)');
  }

  if (options.selectedVisitStatuses.length > 0) {
    whereClauses.push(`bookmark.visit_status_id IN (${options.selectedVisitStatuses.map((_, i) => `@visitStatusId${i}`).join(',')})`);
    options.selectedVisitStatuses.forEach((id, i) => {
      params[`visitStatusId${i}`] = id;
    });
  }

  if (options.searchTerm) {
    whereClauses.push('(world.name_cached LIKE @searchTerm OR world.description_cached LIKE @searchTerm OR bookmark.note LIKE @searchTerm)');
    params.searchTerm = `%${options.searchTerm}%`;
  }

  return whereClauses;
}

function buildBookmarkListOrderByClauses(options: BookmarkListOptions): string[] {
  const orderByClauses: string[] = [];

  if (options.orderByColumns.length > 0) {
    options.orderByColumns.forEach((orderColumn) => {
      if (ORDERABLE_COLUMNS.find(column => column.id === orderColumn.name)) {
        orderByClauses.push(`${orderColumn.name} ${orderColumn.sortOrder}`);
      } else {
        console.warn(`Invalid order by column: ${orderColumn.name}`);
      }
    });
  }

  return orderByClauses;
}

function buildPaginationClauses(options: BookmarkListOptions, params: Record<string, string | number>): string[] {
  const paginationClauses: string[] = [];

  if (options.limit) {
    paginationClauses.push('LIMIT @limit');
    params.limit = options.limit;

    if (options.page) {
      paginationClauses.push('OFFSET @offset');
      params.offset = (options.page - 1) * (options.limit);
    }
  }

  return paginationClauses;
}

export function searchBookmarkList(options: BookmarkListOptions) {
  const selectSql = `
    world.id,
    world.author_name_cached AS authorName,
    world.capacity_cached AS capacity,
    world.world_created_at AS createdAt,
    world.description_cached AS description,
    world.favorites_cached AS favorites,
    world.image_url_cached AS imageUrl,
    world.name_cached AS name,
    world.release_status_cached AS releaseStatus,
    world.tags_cached AS tags,
    world.thumbnail_image_url_cached AS thumbnailImageUrl,
    world.world_updated_at_cached AS updatedAt,
    world.visits_cached AS visits,
    world.deleted_at AS deletedAt,
    GROUP_CONCAT(wg.genre_id) AS genreIds,
    bookmark.note,
    bookmark.visit_status_id AS visitStatusId,
    COUNT(*) OVER() as total_count
  `.trim();

  const params: Record<string, string | number> = {};
  const whereClauses: string[] = buildBookmarkListWhereClauses(options, params);
  const groupByClauses = ['world.id'];
  const orderByClauses: string[] = buildBookmarkListOrderByClauses(options);
  const paginationClauses: string[] = buildPaginationClauses(options, params);

  const selectQueryBase: SelectQueryBase = {
    select: selectSql,
    where: whereClauses,
    groupBy: groupByClauses,
    orderBy: orderByClauses,
    pagination: paginationClauses,
  };

  const result = getBookmarkList(selectQueryBase, params) as (VRChatWorldInfo & { tags: string, genreIds: string} & { total_count: number })[];
  const totalCount = result.length > 0 ? result[0].total_count : 0;

  const bookmarkList = result.map((worldInfo) => {
    delete worldInfo.total_count;

    return {
      ...worldInfo,
      tags: worldInfo.tags ? JSON.parse(worldInfo.tags) as string[] : [],
      genreIds: worldInfo.genreIds ? worldInfo.genreIds.split(',').map(id => parseInt(id, 10)) : [],
    };
  });

  return {
    bookmarkList,
    totalCount,
  };
};

export function searchRandomRecommendedWorld() {
// ランダムにおすすめのワールドを1件取得する
  const selectSql = `
      world.id,
      world.author_name_cached AS authorName,
      world.capacity_cached AS capacity,
      world.world_created_at AS createdAt,
      world.description_cached AS description,
      world.favorites_cached AS favorites,
      world.image_url_cached AS imageUrl,
      world.name_cached AS name,
      world.release_status_cached AS releaseStatus,
      world.tags_cached AS tags,
      world.thumbnail_image_url_cached AS thumbnailImageUrl,
      world.world_updated_at_cached AS updatedAt,
      world.visits_cached AS visits,
      world.deleted_at AS deletedAt,
      GROUP_CONCAT(wg.genre_id) AS genreIds,
      bookmark.note,
      bookmark.visit_status_id AS visitStatusId
    `.trim();

  const whereClauses: string[] = [
    'EXISTS (SELECT world.id FROM world_genres wg WHERE world.id = wg.world_id)', // 少なくともジャンルが設定されているものを候補にする
    `bookmark.visit_status_id = ${VISITS_STATUS.unvisited}`, // 訪れたことの無い場所を対象にする
    'world.deleted_at IS NULL', // 削除されていないワールドが対象
  ];

  const groupByClauses = ['world.id'];

  const candidateColumns = ['favorites_cached', 'world_updated_at_cached', 'visits_cached'];
  const shuffledColumns = shuffleArray(candidateColumns);
  const orderByClauses = shuffledColumns.map(columnName => `${columnName} ${SORT_ORDERS_ID.desc}`);

  const offset = Math.floor(Math.random() * 5);
  const paginationClauses = ['LIMIT 1', `OFFSET ${offset}`];

  const selectQueryBase: SelectQueryBase = {
    select: selectSql,
    where: whereClauses,
    groupBy: groupByClauses,
    orderBy: orderByClauses,
    pagination: paginationClauses,
  };

  const result = getBookmark(selectQueryBase) as (VRChatWorldInfo & { tags: string, genreIds: string}) | undefined;

  if (!result) {
    return { error: '登録されているデータからおすすめとなるワールドが取得できませんでした。' };
  }

  const primaryOrderByColumn = shuffledColumns[0];
  const columnNames = {
    favorites_cached: 'お気に入り数',
    world_updated_at_cached: '更新日時',
    visits_cached: '訪問数',
  };

  const reason = Object.hasOwn(columnNames, primaryOrderByColumn) ?
    `${columnNames[primaryOrderByColumn as keyof typeof columnNames]}が上位のワールドから選定しました。` :
    '';

  return {
    data: {
      VRChatWorldInfo: { ...result,
        tags: result.tags ? JSON.parse(result.tags) as string[] : [],
        genreIds: result.genreIds ? result.genreIds.split(',').map(id => parseInt(id, 10)) : [],
      },
      reason,
    },
  };
}

export async function searchLLMRecommendWorld(requestMessage: string) {
  try {
    const currentLLM = loadKey('currentLLM');

    let result;
    if (currentLLM === 'bedrock') {
      result = await getRecommendWorldForBedrock(requestMessage);
    } else {
      // デフォルトはOpenAIを使用
      result = await getRecommendWorldForOpenAI(requestMessage);
    }

    return { data: result };
  } catch (error) {
    console.error('Error getting LLM recommend world:', error);
    return { error: error.message };
  }
}
