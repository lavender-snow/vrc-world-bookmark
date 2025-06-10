import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import Database from 'better-sqlite3';

import { GENRE, ORDERABLE_COLUMNS } from 'src/consts/const';
import type { VRChatWorldInfo, UpdateWorldBookmarkOptions, BookmarkListOptions, UpdateWorldGenresOptions } from 'src/types/renderer';
import type { Genre, VisitStatus } from 'src/types/table';
import type { VRChatWorld } from 'src/types/vrchat';

const DB_PATH = path.join(process.env.APPDATA || '', process.env.APP_NAME, 'app.db');
const MIGRATIONS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'migrations/sqlite')
  : path.join(process.cwd() , 'migrations/sqlite');

let db: Database.Database;

export function initDB() {
  const isDebug = process.env.NODE_ENV === 'development';
  db = new Database(DB_PATH, { verbose: isDebug ? console.log : undefined});
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );`,
  );

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  files.forEach(file => {
    const already = db.prepare('SELECT 1 FROM migrations WHERE filename = ?;').get(file);
    if (!already) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      db.exec(sql);
      db.prepare("INSERT INTO migrations (filename, applied_at) VALUES (?, datetime('now'));").run(file);
      console.log(`Migration executed: ${file}`);
    }
  });
}

function buildSelectQuery({
  select,
  from,
  where = [],
  groupBy = [],
  orderBy = [],
  pagination = [],
}: {
  select: string;
  from: string;
  where?: string[];
  groupBy?: string[];
  orderBy?: string[];
  pagination?: string[];
}) {
  return [
    `SELECT ${select}`,
    `FROM ${from}`,
    where.length ? `WHERE ${where.join(' AND ')}` : '',
    groupBy.length ? `GROUP BY ${groupBy.join(', ')}` : '',
    orderBy.length ? orderBy.join(' ') : '',
    pagination.length ? pagination.join(' ') : '',
  ].filter(Boolean).join('\n');
}

export function getGenres(): Genre[] {
  const result = db.prepare('SELECT * FROM genres ORDER BY id;').all() as Genre[];

  return result;
}

export function getVisitStatuses(): VisitStatus[] {
  const result = db.prepare('SELECT * FROM visit_statuses ORDER BY id;').all() as VisitStatus[];

  return result;
}

function parseWorldTagsToGenreIds(worldTags: string[]): number[] {
  const genreIds = [];
  const lowerTags = worldTags.map(tag => tag.toLowerCase());

  if (lowerTags.includes('author_tag_horror')) {
    genreIds.push(GENRE.HORROR);
  }

  const gameTags = ['author_tag_game', 'author_tag_riddle'];
  if (lowerTags.some(tag => gameTags.includes(tag))) {
    genreIds.push(GENRE.GAME);
  }

  if (lowerTags.findIndex(tag => tag.startsWith('admin_')) >= 0) {
    genreIds.push(GENRE.HIGH_QUALITY);
  }

  if (lowerTags.includes('author_tag_chill')) {
    genreIds.push(GENRE.CHILL);
  }

  return genreIds;
}

function addWorldGenres(worldId: string, genreIds: number[]) {
  const values: string[] = [];
  const params: Record<string, string | number> = { worldId };

  if (genreIds.length === 0) return;

  genreIds.forEach((id, i) => {
    values.push(`(@worldId, @genreId${i})`);
    params[`genreId${i}`] = id;
  });

  db.prepare(`INSERT INTO world_genres (world_id, genre_id) VALUES ${values.join(', ')};`).run(params);
}

function addBookmark(worldId: string, worldTags: string[]) {
  db.prepare(`
    INSERT INTO bookmarks (world_id, visited, note, created_at, updated_at) VALUES (@worldId, 0, '', datetime('now'), datetime('now'));
  `).run({ worldId });

  const genreIds = parseWorldTagsToGenreIds(worldTags);

  addWorldGenres(worldId, genreIds);
}

export function updateWorldGenres(options: UpdateWorldGenresOptions) {
  const { worldId, genreIds } = options;

  db.prepare('DELETE FROM world_genres WHERE world_id = @worldId;').run({ worldId });

  addWorldGenres(worldId, genreIds);
}

export function updateWorldBookmark(options: UpdateWorldBookmarkOptions) {
  const keys = Object.keys(options).filter(key => key !== 'worldId');
  const params: Partial<UpdateWorldBookmarkOptions> = {
    worldId: options.worldId,
  };

  if (keys.some(key => options[key as keyof typeof options] !== undefined)) {
    const setClauses: string[] = [];

    if (options.note !== undefined) {
      setClauses.push('note = @note');
      params.note = options.note;
    }
    if (options.visitStatusId !== undefined) {
      setClauses.push('visit_status_id = @visitStatusId');
      params.visitStatusId = options.visitStatusId;
    }

    db.prepare(`UPDATE bookmarks SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE world_id = @worldId;`).run(params);
  } else {
    console.warn('No fields to update in bookmark for world:', options.worldId);
  }
}

export function addOrUpdateWorldInfo(world: VRChatWorld) {
  const params = {
    id: world.id,
    authorId: world.authorId,
    authorName: world.authorName,
    capacity: world.capacity,
    createdAt: world.created_at,
    defaultContentSettings: JSON.stringify(world.defaultContentSettings),
    description: world.description,
    favorites: world.favorites,
    featured: world.featured ? 1 : 0,
    heat: world.heat,
    imageUrl: world.imageUrl,
    labsPublicationDate: world.labsPublicationDate,
    name: world.name,
    organization: world.organization,
    popularity: world.popularity,
    previewYoutubeId: world.previewYoutubeId,
    publicationDate: world.publicationDate,
    recommendedCapacity: world.recommendedCapacity,
    releaseStatus: world.releaseStatus,
    tags: JSON.stringify(world.tags),
    thumbnailImageUrl: world.thumbnailImageUrl,
    udonProducts: JSON.stringify(world.udonProducts),
    unityPackages: JSON.stringify(world.unityPackages),
    updatedAt: world.updated_at,
    urlList: JSON.stringify(world.urlList),
    version: world.version,
    visits: world.visits,
  };

  const result = db.prepare(`INSERT INTO vrchat_worlds (
    id,
    author_id,
    author_name_cached,
    capacity_cached,
    world_created_at,
    default_content_settings_cached,
    description_cached,
    favorites_cached,
    featured,
    heat_cached,
    image_url_cached,
    labs_publication_date_at,
    name_cached,
    organization,
    popularity_cached,
    preview_youtube_id_cached,
    publication_date,
    recommended_capacity_cached,
    release_status_cached,
    tags_cached,
    thumbnail_image_url_cached,
    udon_products,
    unity_packages,
    world_updated_at_cached,
    url_list_cached,
    version_cached,
    visits_cached,
    created_at,
    updated_at,
    deleted_at
  )
  VALUES (
    @id,
    @authorId,
    @authorName,
    @capacity,
    @createdAt,
    @defaultContentSettings,
    @description,
    @favorites,
    @featured,
    @heat,
    @imageUrl,
    @labsPublicationDate,
    @name,
    @organization,
    @popularity,
    @previewYoutubeId,
    @publicationDate,
    @recommendedCapacity,
    @releaseStatus,
    @tags,
    @thumbnailImageUrl,
    @udonProducts,
    @unityPackages,
    @updatedAt,
    @urlList,
    @version,
    @visits,
    datetime('now'),
    datetime('now'),
    null
  )
  ON CONFLICT(id) DO UPDATE SET
    author_name_cached = @authorName,
    capacity_cached = @capacity,
    default_content_settings_cached = @defaultContentSettings,
    description_cached = @description,
    favorites_cached = @favorites,
    heat_cached = @heat,
    image_url_cached = @imageUrl,
    name_cached = @name,
    popularity_cached = @popularity,
    preview_youtube_id_cached = @previewYoutubeId,
    publication_date = @publicationDate,
    recommended_capacity_cached = @recommendedCapacity,
    release_status_cached = @releaseStatus,
    tags_cached = @tags,
    thumbnail_image_url_cached = @thumbnailImageUrl,
    world_updated_at_cached = @updatedAt,
    url_list_cached = @urlList,
    version_cached = @version,
    visits_cached = @visits,
    updated_at = datetime('now');`)
    .run(params);

  if (result.changes > 0) {
    console.log(`World info upsert: ${world.id}`);

    const exists = db.prepare('SELECT 1 FROM bookmarks WHERE world_id = ?;').get(world.id);

    if (!exists) {
      addBookmark(world.id, world.tags);
    }
  } else {
    console.error(`World info upsert failed: ${world.id}`);
  }
};

export function getWorldInfo(worldId: string) {
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
  `;

  const fromSql = `
    vrchat_worlds world
    INNER JOIN bookmarks bookmark ON world.id = bookmark.world_id
    LEFT JOIN world_genres wg ON world.id = wg.world_id
  `;

  const sql = buildSelectQuery({
    select: selectSql,
    from: fromSql,
    where: ['world.id = ?'],
  });

  const result = db.prepare(sql).get(worldId) as (VRChatWorldInfo & { tags: string, genreIds: string}) | undefined;

  if (result) {
    return {
      ...result,
      tags: result.tags ? JSON.parse(result.tags) as string[] : [],
      genreIds: result.genreIds ? result.genreIds.split(',').map(id => parseInt(id, 10)) : [],
    };
  } else {
    console.error(`World info not found: ${worldId}`);
    return null;
  }
}

export function deleteWorldInfo(worldId: string) {
  const result = db.prepare("UPDATE vrchat_worlds SET deleted_at = datetime('now') WHERE id = ?;").run(worldId);

  if (result.changes > 0) {
    console.log(`World info deleted: ${worldId}`);
  } else {
    console.error(`World info delete failed: ${worldId}`);
  }
}

export function getBookmarkList(options: BookmarkListOptions) {
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
  `;

  const fromSql = `
    vrchat_worlds world
    INNER JOIN bookmarks bookmark ON world.id = bookmark.world_id
    LEFT JOIN world_genres wg ON world.id = wg.world_id
  `;

  const groupByClauses = ['world.id'];

  const params: Record<string, string | number> = {};
  const whereClauses: string[] = [];
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

  if (options.orderBy && ORDERABLE_COLUMNS.find(column => column.id === options.orderBy)) {
    orderByClauses.push(`ORDER BY ${options.orderBy} ${options.sortOrder}`);
  }

  if (options.limit) {
    paginationClauses.push('LIMIT @limit');
    params.limit = options.limit;

    if (options.page) {
      paginationClauses.push('OFFSET @offset');
      params.offset = (options.page - 1) * (options.limit);
    }
  }

  const sql = buildSelectQuery({
    select: selectSql,
    from: fromSql,
    where: whereClauses,
    groupBy: groupByClauses,
    orderBy: orderByClauses,
    pagination: paginationClauses,
  });

  const results = db.prepare(sql).all(params) as (VRChatWorldInfo & { tags: string, genreIds: string} & { total_count: number })[];

  const totalCount = results.length > 0 ? results[0].total_count : 0;

  const bookmarkList = results.map((worldInfo) => {
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
}
