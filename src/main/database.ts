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

  files.map(file => {
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
  db.prepare(`UPDATE bookmarks SET genre_id = ?, note = ?, updated_at = datetime('now') WHERE world_id = ?;`).run(genreId, worldNote, worldId);
}

export function addOrUpdateWorldInfo(world: VRChatWorld) {
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
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    datetime('now'),
    datetime('now'),
    null
  )
  ON CONFLICT(id) DO UPDATE SET
    author_name_cached = ?,
    capacity_cached = ?,
    default_content_settings_cached = ?,
    description_cached = ?,
    favorites_cached = ?,
    heat_cached = ?,
    image_url_cached = ?,
    name_cached = ?,
    popularity_cached = ?,
    preview_youtube_id_cached = ?,
    publication_date = ?,
    recommended_capacity_cached = ?,
    release_status_cached = ?,
    tags_cached = ?,
    thumbnail_image_url_cached = ?,
    world_updated_at_cached = ?,
    url_list_cached = ?,
    version_cached = ?,
    visits_cached = ?,
    updated_at = datetime('now');`).run(
    world.id,
    world.authorId,
    world.authorName,
    world.capacity,
    world.created_at,
    JSON.stringify(world.defaultContentSettings),
    world.description,
    world.favorites,
    world.featured ? 1 : 0,
    world.heat,
    world.imageUrl,
    world.labsPublicationDate,
    world.name,
    world.organization,
    world.popularity,
    world.previewYoutubeId,
    world.publicationDate,
    world.recommendedCapacity,
    world.releaseStatus,
    JSON.stringify(world.tags),
    world.thumbnailImageUrl,
    JSON.stringify(world.udonProducts),
    JSON.stringify(world.unityPackages),
    world.updated_at,
    JSON.stringify(world.urlList),
    world.version,
    world.visits,
    world.authorName,
    world.capacity,
    JSON.stringify(world.defaultContentSettings),
    world.description,
    world.favorites,
    world.heat,
    world.imageUrl,
    world.name,
    world.popularity,
    world.previewYoutubeId,
    world.publicationDate,
    world.recommendedCapacity,
    world.releaseStatus,
    JSON.stringify(world.tags),
    world.thumbnailImageUrl,
    world.updated_at,
    JSON.stringify(world.urlList),
    world.version,
    world.visits
  );

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
