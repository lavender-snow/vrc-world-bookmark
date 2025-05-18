CREATE TABLE vrchat_worlds (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name_cached TEXT NOT NULL,
  capacity_cached INTEGER NOT NULL,
  world_created_at TEXT NOT NULL,
  default_content_settings_cached TEXT,
  description_cached TEXT,
  favorites_cached INTEGER NOT NULL,
  featured INTEGER,
  heat_cached INTEGER,
  image_url_cached TEXT,
  labs_publication_date_at TEXT NOT NULL,
  name_cached TEXT NOT NULL,
  organization TEXT,
  popularity_cached INTEGER,
  preview_youtube_id_cached TEXT,
  publication_date TEXT,
  recommended_capacity_cached INTEGER,
  release_status_cached TEXT NOT NULL,
  tags_cached TEXT,
  thumbnail_image_url_cached TEXT,
  udon_products TEXT,
  unity_packages TEXT,
  world_updated_at_cached TEXT NOT NULL,
  url_list_cached TEXT,
  version_cached INTEGER NOT NULL,
  visits_cached INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE genres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_jp TEXT NOT NULL UNIQUE
);

INSERT INTO
  genres (id, name, name_jp)
VALUES
  (0, 'Uncategorized', '未分類'),
  (1, 'HighQuality', '高品質'),
  (2, 'Game', 'ゲーム'),
  (3, 'Horror', 'ホラー'),
  (4, 'PhotoSpot', '撮影');

CREATE TABLE visit_statuses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_jp TEXT NOT NULL UNIQUE
);

INSERT INTO
  visit_statuses (id, name, name_jp)
VALUES
  (0, 'Unvisited', '未訪問'),
  (1, 'Visited', '訪問済'),
  (2, 'Blocked', 'ブロック'),
  (3, 'Hidden', '非表示');

CREATE TABLE bookmarks (
  world_id TEXT PRIMARY KEY REFERENCES vrchat_worlds(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  visited INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  visit_status_id INTEGER NOT NULL DEFAULT 0 REFERENCES visit_statuses(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
