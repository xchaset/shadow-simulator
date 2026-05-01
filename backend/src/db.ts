import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'shadow-simulator.db')

const db: Database.Database = new Database(DB_PATH)

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS directories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS models (
    id              TEXT PRIMARY KEY,
    directory_id    TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    location_lat    REAL NOT NULL DEFAULT 39.9042,
    location_lng    REAL NOT NULL DEFAULT 116.4074,
    city_name       TEXT NOT NULL DEFAULT '北京',
    date_time       TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    building_count  INTEGER NOT NULL DEFAULT 0,
    scene_data      TEXT NOT NULL DEFAULT '[]',
    canvas_size     REAL NOT NULL DEFAULT 2000,
    show_grid       INTEGER NOT NULL DEFAULT 1,
    grid_divisions  INTEGER NOT NULL DEFAULT 200,
    thumbnail       TEXT DEFAULT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (directory_id) REFERENCES directories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_models_directory ON models(directory_id);
`)

// ─── Migration: Add canvas settings columns to models table ──────────────────

// Check if canvas_size column exists, if not, add it
const columns = db.prepare(`PRAGMA table_info(models)`).all() as any[]
const columnNames = columns.map(c => c.name)

if (!columnNames.includes('canvas_size')) {
  db.exec(`ALTER TABLE models ADD COLUMN canvas_size REAL NOT NULL DEFAULT 2000`)
}

if (!columnNames.includes('show_grid')) {
  db.exec(`ALTER TABLE models ADD COLUMN show_grid INTEGER NOT NULL DEFAULT 1`)
}

if (!columnNames.includes('grid_divisions')) {
  db.exec(`ALTER TABLE models ADD COLUMN grid_divisions INTEGER NOT NULL DEFAULT 200`)
}

if (!columnNames.includes('terrain_data')) {
  db.exec(`ALTER TABLE models ADD COLUMN terrain_data TEXT DEFAULT NULL`)
}

// ─── Migration: Add recent_models table ────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS recent_models (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id   TEXT NOT NULL,
    opened_at  TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_recent_models_model ON recent_models(model_id);
  CREATE INDEX IF NOT EXISTS idx_recent_models_opened ON recent_models(opened_at DESC);
`)

// ─── Migration: Add model_versions table for history ────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS model_versions (
    id               TEXT PRIMARY KEY,
    model_id         TEXT NOT NULL,
    version_number   INTEGER NOT NULL DEFAULT 1,
    name             TEXT DEFAULT '',
    description      TEXT DEFAULT '',
    location_lat     REAL NOT NULL DEFAULT 39.9042,
    location_lng     REAL NOT NULL DEFAULT 116.4074,
    city_name        TEXT NOT NULL DEFAULT '北京',
    date_time        TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    building_count   INTEGER NOT NULL DEFAULT 0,
    scene_data       TEXT NOT NULL DEFAULT '[]',
    canvas_size      REAL NOT NULL DEFAULT 2000,
    show_grid        INTEGER NOT NULL DEFAULT 1,
    grid_divisions   INTEGER NOT NULL DEFAULT 200,
    thumbnail        TEXT DEFAULT NULL,
    terrain_data     TEXT DEFAULT NULL,
    created_at       TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_model_versions_model ON model_versions(model_id);
  CREATE INDEX IF NOT EXISTS idx_model_versions_created ON model_versions(created_at DESC);
`)

// 检查 model_versions 表的列是否完整
const versionColumns = db.prepare(`PRAGMA table_info(model_versions)`).all() as any[]
const versionColumnNames = versionColumns.map(c => c.name)

if (!versionColumnNames.includes('terrain_data')) {
  db.exec(`ALTER TABLE model_versions ADD COLUMN terrain_data TEXT DEFAULT NULL`)
}

// ─── Migration: Add shares table for share functionality ────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS shares (
    id               TEXT PRIMARY KEY,
    token            TEXT NOT NULL UNIQUE,
    model_id         TEXT,
    name             TEXT NOT NULL,
    description      TEXT DEFAULT '',
    location_lat     REAL NOT NULL DEFAULT 39.9042,
    location_lng     REAL NOT NULL DEFAULT 116.4074,
    city_name        TEXT NOT NULL DEFAULT '北京',
    date_time        TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    building_count   INTEGER NOT NULL DEFAULT 0,
    scene_data       TEXT NOT NULL DEFAULT '[]',
    canvas_size      REAL NOT NULL DEFAULT 2000,
    show_grid        INTEGER NOT NULL DEFAULT 1,
    grid_divisions   INTEGER NOT NULL DEFAULT 200,
    terrain_data     TEXT DEFAULT NULL,
    expires_at       TEXT DEFAULT NULL,
    view_count       INTEGER NOT NULL DEFAULT 0,
    is_read_only     INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
  CREATE INDEX IF NOT EXISTS idx_shares_model ON shares(model_id);
`)

export default db
