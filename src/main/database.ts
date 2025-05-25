import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import type { VRChatWorld } from "../types/vrchat";
import type { Genre } from '../types/table';
import type { VRChatWorldInfo } from "../types/renderer";

const DB_PATH = "app.db";
const MIGRATIONS_DIR = path.join(__dirname, "../../migrations/sqlite") // TODO: パッケージ化に対応する

let db: Database.Database;

export function initDB() {
  db = new Database(DB_PATH, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );`
  );

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();

  files.forEach(file => {
    const already = db.prepare("SELECT 1 FROM migrations WHERE filename = ?;").get(file);
    if (!already) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      db.exec(sql);
      db.prepare("INSERT INTO migrations (filename, applied_at) VALUES (?, datetime('now'));").run(file);
      console.log(`Migration executed: ${file}`);
    }
  })
}

export function getGenres(): Genre[] {
  const result = db.prepare("SELECT * FROM genres ORDER BY id;").all() as Genre[];
  
  return result;
}

function addBookmark(worldId: string) {
  db.prepare(`INSERT INTO bookmarks (world_id, genre_id, visited, note, created_at, updated_at) VALUES (?, 0, 0, '', datetime('now'), datetime('now'));`).run(worldId);
}

export function updateWorldBookmark(worldId: string, genreId: number, worldNote: string) {
  const params = {
    genreId: genreId,
    note: worldNote,
    worldId: worldId,
  }

  db.prepare(`UPDATE bookmarks SET genre_id = @genreId, note = @note, updated_at = datetime('now') WHERE world_id = @worldId;`).run(params);
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
  }

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

    const exists = db.prepare("SELECT 1 FROM bookmarks WHERE world_id = ?;").get(world.id);

    if (!exists) {
      addBookmark(world.id);
    }
  } else {
    console.error(`World info upsert failed: ${world.id}`);
  }
};

export function getWorldInfo(worldId: string) {
  const result = db.prepare(`
    SELECT 
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
      bookmark.genre_id AS genreId,
      bookmark.note
    FROM
      vrchat_worlds world
      INNER JOIN bookmarks bookmark
      ON world.id = bookmark.world_id
    WHERE
      world.id = ?;
  `).get(worldId) as (VRChatWorldInfo & { tags: string}) | undefined;

  if (result) {
    return { 
      ...result,
      tags: result.tags ? JSON.parse(result.tags) as string[] : [],
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
