import { orderableColumns } from './prompt';

import { GENRE, SORT_ORDERS_ID, VISITS_STATUS } from 'src/consts/const';
import { InvalidParameterError } from 'src/errors/llm-errors';
import { SelectQueryBase } from 'src/main/database';

export function buildWorldListQuery(genre: string, orderBy: string, sortOrder: string): SelectQueryBase {
  const selectSql = `
      world.id AS id,
      world.capacity_cached AS capacity,
      world.world_created_at AS createdAt,
      world.description_cached AS description,
      world.favorites_cached AS favorites,
      world.name_cached AS name,
      world.tags_cached AS tags,
      world.world_updated_at_cached AS updatedAt,
      world.visits_cached AS visits,
      bookmark.note
    `.trim();

  const whereClauses: string[] = [];

  // GENREの定義と一致する値があれば数値を返却
  const isValidGenreKey = (Object.keys(GENRE) as Array<keyof typeof GENRE>).includes(genre as keyof typeof GENRE);
  const genreValue = isValidGenreKey
    ? GENRE[genre as keyof typeof GENRE]
    : undefined;

  if (genreValue === undefined) {
    throw new InvalidParameterError('Invalid genre value from parameter');
  }

  // 指定されたジャンルのワールドを抽出
  whereClauses.push(`
      world.id IN (
        SELECT world_id
        FROM world_genres
        WHERE genre_id IN (${genreValue})
      )
    `.trim());

  // 訪れたことの無い場所を対象にする
  whereClauses.push(`bookmark.visit_status_id = ${VISITS_STATUS.unvisited}`);

  // 削除されていないワールドが対象
  whereClauses.push('world.deleted_at IS NULL');

  const orderByClauses: string[] = [];

  if (orderableColumns.includes(orderBy) && sortOrder in SORT_ORDERS_ID) {
    orderByClauses.push(`${orderBy} ${sortOrder}`);
  } else {
    throw new InvalidParameterError(`Invalid order by param: ${orderBy} ${sortOrder}`);
  }

  const selectQueryBase: SelectQueryBase = {
    select: selectSql,
    where: whereClauses,
    orderBy: orderByClauses,
    pagination: ['LIMIT 10'], // 最大10件取得
  };

  return selectQueryBase;
}
