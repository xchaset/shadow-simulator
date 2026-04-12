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

const db = new Database(DB_PATH)

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
    thumbnail       TEXT DEFAULT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (directory_id) REFERENCES directories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_models_directory ON models(directory_id);
`)

export default db
