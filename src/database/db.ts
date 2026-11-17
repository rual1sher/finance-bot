import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Абсолютный путь к папке data в корне проекта
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'finance.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Настройки SQLite
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Инициализация таблиц базы данных
 */
export const initDatabase = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      type TEXT NOT NULL DEFAULT 'expense',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name, type)
    );

    CREATE TABLE IF NOT EXISTS pending_expenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS quick_buttons;
  `);

  // Безопасная миграция колонок для существующих баз данных
  try {
    db.exec(`ALTER TABLE categories ADD COLUMN type TEXT NOT NULL DEFAULT 'expense';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE pending_expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense';`);
  } catch {}

  // Обновление названий категорий
  try {
    db.exec(`UPDATE categories SET name = 'Транспорт' WHERE name = 'Такси';`);
    db.exec(`UPDATE categories SET name = 'Магазин' WHERE name = 'Продукты';`);
    db.exec(`UPDATE transactions SET category = 'Транспорт' WHERE category = 'Такси';`);
    db.exec(`UPDATE transactions SET category = 'Магазин' WHERE category = 'Продукты';`);
  } catch {}
};

// Создаем таблицы при первом подключении
initDatabase();
