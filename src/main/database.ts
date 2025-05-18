import { app, ipcMain } from "electron";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import type { VRChatWorld } from "../types/vrchat";
import type { Genre } from '../types/table';

const DB_PATH = "app.db";
const MIGRATIONS_DIR = path.join(__dirname, "../../migrations/sqlite") // TODO: パッケージ化に対応する

let db: Database.Database;

function initDB() {
  db = new Database(DB_PATH, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

function runMigrations() {
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

function getGenres(): Genre[] {
  if (db === undefined) return [];

  const result = db.prepare("SELECT * FROM genres ORDER BY id;").all() as Genre[];
  
  return result;
}

function addWorldBookmark(world: VRChatWorld, genre_id: number) {
  if (db === undefined) return;
  console.log("sqlParameter",world.id,
    world.authorId,
    world.authorName,
    world.capacity,
    world.created_at,
    JSON.stringify(world.defaultContentSettings),
    world.description,
    world.favorites,
    world.featured,
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
    world.visits);
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
  );`).run(
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
    world.visits
  );

  if (result.changes > 0) {
    db.prepare(`INSERT INTO bookmarks (world_id, genre_id, visited, created_at, updated_at) VALUES (?, ?, 0, datetime('now'), datetime('now'));`).run(world.id, genre_id);
  }
}

app.whenReady().then(() => {
  initDB();
  runMigrations();

  ipcMain.handle("get_genres", async () => {
    const genres = getGenres();

    return genres;
  });

  ipcMain.handle("add_world_bookmark", async (event, world: VRChatWorld, genre_id: number) => {
    addWorldBookmark(world, genre_id);
  });
});
