import { ipcMain } from 'electron';

import { loadKey, saveKey } from './credential-store';
import {
  initDB,
  runMigrations,
  addOrUpdateWorldInfo,
  deleteWorldInfo,
  getGenres,
  updateWorldBookmark,
  getWorldInfo,
  getVisitStatuses,
  getBookmarkList,
  updateWorldGenres,
  getWorldIdsToUpdate,
  SelectQueryBase,
  getBookmark,
} from './database';
import { getLLMRecommendWorld } from './llm/bedrock/conversation';
import { fetchWorldInfo } from './vrchat-api';

import { ORDERABLE_COLUMNS, SORT_ORDERS_ID, VISITS_STATUS } from 'src/consts/const';
import { VRChatServerError, WorldNotFoundError } from 'src/errors/vrchat-errors';
import type { BookmarkListOptions, UpdateWorldBookmarkOptions, UpdateWorldGenresOptions, VRChatWorldInfo } from 'src/types/renderer';
import { shuffleArray } from 'src/utils/util';

export async function upsertWorldBookmark(worldId: string) {
  try {
    const world = await fetchWorldInfo(worldId);

    addOrUpdateWorldInfo(world);
  } catch (error) {
    if (error instanceof WorldNotFoundError) {
      deleteWorldInfo(worldId);
    } else if (error instanceof VRChatServerError) {
      console.error('VRChat server error:', error);
      return {
        error: `VRChat server error: ${error.message}`,
      };
    } else {
      console.error(`Error fetching world info for ${worldId}:`, error);
      return {
        error: `Error fetching world info: ${error.message}`,
      };
    }
  }

  return { data: getWorldInfo(worldId) };
}

function registerIpcHandlersForDatabase() {
  ipcMain.handle('get_genres', async () => {
    const genres = getGenres();

    return genres;
  });

  ipcMain.handle('get_visit_statuses', async () => {
    const visitStatuses = getVisitStatuses();

    return visitStatuses;
  });

  ipcMain.handle('add_or_update_world_info', async (event, worldId: string) => {
    return upsertWorldBookmark(worldId);
  });

  ipcMain.handle('get_world_info', async (event, worldId: string) => {
    return getWorldInfo(worldId);
  });

  ipcMain.handle('update_world_bookmark', async (event, options: UpdateWorldBookmarkOptions) => {
    updateWorldBookmark(options);
  });

  ipcMain.handle('update_world_genres', async (event, options: UpdateWorldGenresOptions) => {
    updateWorldGenres(options);
  });

  ipcMain.handle('get_bookmark_list', async (event, options: BookmarkListOptions) => {
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
    const whereClauses: string[] = [];
    const groupByClauses = ['world.id'];
    const orderByClauses: string[] = [];
    const paginationClauses: string[] = [];

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

    if (options.orderByColumns.length > 0) {
      options.orderByColumns.forEach((orderColumn) => {
        if (ORDERABLE_COLUMNS.find(column => column.id === orderColumn.name)) {
          orderByClauses.push(`${orderColumn.name} ${orderColumn.sortOrder}`);
        } else {
          console.warn(`Invalid order by column: ${orderColumn.name}`);
        }
      });
    }

    if (options.limit) {
      paginationClauses.push('LIMIT @limit');
      params.limit = options.limit;

      if (options.page) {
        paginationClauses.push('OFFSET @offset');
        params.offset = (options.page - 1) * (options.limit);
      }
    }

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
  });

  ipcMain.handle('get_world_ids_to_update', async () => {
    return getWorldIdsToUpdate();
  });

  ipcMain.handle('get_random_recommended_world', async () => {
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

    const whereClauses: string[] = [];

    // 少なくともジャンルが設定されているものを候補にする
    whereClauses.push('EXISTS (SELECT world.id FROM world_genres wg WHERE world.id = wg.world_id)');

    // 訪れたことの無い場所を対象にする
    whereClauses.push(`bookmark.visit_status_id = ${VISITS_STATUS.unvisited}`);

    // 削除されていないワールドが対象
    whereClauses.push('world.deleted_at IS NULL');

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
      return null;
    }

    return {
      ...result,
      tags: result.tags ? JSON.parse(result.tags) as string[] : [],
      genreIds: result.genreIds ? result.genreIds.split(',').map(id => parseInt(id, 10)) : [],
    };
  });

  ipcMain.handle('get_llm_recommend_world', async (event, requestMessage: string) => {
    try {
      const result = await getLLMRecommendWorld(requestMessage);
      return { data: result };
    } catch (error) {
      console.error('Error getting LLM recommend world:', error);
      return { error: error.message };
    }
  });
}

function registerIpcHandlersForCredentialStore() {
  ipcMain.handle('save_key', (_event, key: string, value: string) => {
    saveKey(key, value);
  });

  ipcMain.handle('load_key', (_event, key: string) => {
    return loadKey(key);
  });

  ipcMain.handle('is_key_saved', (_event, key: string) => {
    const value = loadKey(key);
    return !!value; // キーが存在する場合trueを返す
  });
}

export function initializeApp() {
  initDB();
  runMigrations();

  registerIpcHandlersForDatabase();
  registerIpcHandlersForCredentialStore();
}
