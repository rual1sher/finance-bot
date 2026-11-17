import { db } from './db.js';
import {
  Transaction,
  RecentTransactionItem,
  Category,
  CategoryReportItem,
  PeriodReport,
} from '../type/index.js';

export interface PendingExpense {
  id: string;
  user_id: number;
  amount: number;
  type: 'expense' | 'income';
}

/**
 * Добавить транзакцию (расход или доход)
 */
export const addTransaction = (
  userId: number,
  amount: number,
  category: string,
  type: 'expense' | 'income' = 'expense',
  comment?: string
): number => {
  const stmt = db.prepare(`
    INSERT INTO transactions (user_id, amount, category, type, comment)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, amount, category, type, comment || null);
  return Number(result.lastInsertRowid);
};

/**
 * Получить последнюю транзакцию пользователя
 */
export const getLastTransaction = (userId: number): Transaction | null => {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 1
  `);
  const row = stmt.get(userId) as unknown as Transaction | undefined;
  return row || null;
};

/**
 * Получить общее количество транзакций пользователя
 */
export const getTransactionsCount = (userId: number): number => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?');
  const res = stmt.get(userId) as { count: number | bigint };
  return Number(res.count);
};

/**
 * Получить страницу транзакций пользователя с пагинацией
 */
export const getTransactionsPage = (
  userId: number,
  page: number = 1,
  limit: number = 5
): RecentTransactionItem[] => {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * limit;
  const stmt = db.prepare(`
    SELECT t.*, c.icon
    FROM transactions t
    LEFT JOIN categories c ON c.name = t.category AND c.user_id = t.user_id AND c.type = t.type
    WHERE t.user_id = ?
    ORDER BY t.id DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(userId, limit, offset) as unknown as RecentTransactionItem[];
};

/**
 * Получить последние N транзакций пользователя с иконками категорий
 */
export const getRecentTransactions = (
  userId: number,
  limit: number = 5
): RecentTransactionItem[] => {
  return getTransactionsPage(userId, 1, limit);
};

/**
 * Удалить транзакцию по id (для кнопки отмены)
 */
export const deleteTransaction = (id: number, userId: number): boolean => {
  const stmt = db.prepare(`
    DELETE FROM transactions
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(id, userId);
  return Number(result.changes) > 0;
};

/**
 * Заполнить базовые категории (расходы и доходы)
 */
export const seedDefaultCategories = (userId: number): void => {
  const checkStmt = db.prepare(`
    SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND type = ?
  `);

  const defaults: { name: string; icon: string; type: 'expense' | 'income' }[] = [
    // Расходы
    { name: 'Еда', icon: '🍔', type: 'expense' },
    { name: 'Транспорт', icon: '🚗', type: 'expense' },
    { name: 'Магазин', icon: '🛒', type: 'expense' },
    { name: 'Свидание', icon: '💑', type: 'expense' },
    { name: 'Прочее', icon: '📦', type: 'expense' },
    // Доходы
    { name: 'Зарплата', icon: '💼', type: 'income' },
    { name: 'Проект', icon: '📈', type: 'income' },
    { name: 'Подарок', icon: '🎁', type: 'income' },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO categories (user_id, name, icon, type)
    VALUES (?, ?, ?, ?)
  `);

  for (const type of ['expense', 'income'] as const) {
    const res = checkStmt.get(userId, type) as { count: number | bigint };
    if (Number(res.count) === 0) {
      const typeDefaults = defaults.filter((cat) => cat.type === type);
      for (const cat of typeDefaults) {
        insertStmt.run(userId, cat.name, cat.icon, cat.type);
      }
    }
  }

  // Гарантируем добавление категории "Прочее" для существующих пользователей
  insertStmt.run(userId, 'Прочее', '📦', 'expense');
};

/**
 * Получить список категорий пользователя по типу (расходы или доходы)
 */
export const getUserCategories = (
  userId: number,
  type: 'expense' | 'income' = 'expense'
): Category[] => {
  seedDefaultCategories(userId);

  const stmt = db.prepare(`
    SELECT * FROM categories
    WHERE user_id = ? AND (type = ? OR type IS NULL)
    ORDER BY id ASC
  `);
  return stmt.all(userId, type) as unknown as Category[];
};

/**
 * Добавить новую категорию пользователя
 */
export const addUserCategory = (
  userId: number,
  name: string,
  type: 'expense' | 'income' = 'expense',
  icon: string = '🔹'
): Category => {
  const normalizedName = name.trim();

  // Проверяем, существует ли уже категория с таким именем и типом
  const findStmt = db.prepare(`
    SELECT * FROM categories
    WHERE user_id = ? AND LOWER(name) = LOWER(?) AND type = ?
    LIMIT 1
  `);
  const existing = findStmt.get(userId, normalizedName, type) as unknown as Category | undefined;
  if (existing) {
    return existing;
  }

  const insertStmt = db.prepare(`
    INSERT INTO categories (user_id, name, icon, type)
    VALUES (?, ?, ?, ?)
  `);
  const result = insertStmt.run(userId, normalizedName, icon, type);
  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    name: normalizedName,
    icon,
    type,
  };
};

/**
 * Сохранить временную операцию в SQLite до выбора категории
 */
export const savePendingExpense = (
  userId: number,
  amount: number,
  type: 'expense' | 'income' = 'expense'
): string => {
  const id = Math.random().toString(36).substring(2, 10);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pending_expenses (id, user_id, amount, type)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, userId, amount, type);

  // Очистка старых записей старше 1 дня
  db.exec(`
    DELETE FROM pending_expenses 
    WHERE created_at < datetime('now', '-1 day');
  `);

  return id;
};

/**
 * Получить и удалить временную операцию по id
 */
export const getPendingExpense = (
  id: string,
  userId: number
): { amount: number; type: 'expense' | 'income' } | null => {
  const stmt = db.prepare(`
    SELECT * FROM pending_expenses
    WHERE id = ? AND user_id = ?
  `);
  const row = stmt.get(id, userId) as PendingExpense | undefined;
  if (!row) return null;

  // Удаляем использованную запись
  db.prepare(`DELETE FROM pending_expenses WHERE id = ?`).run(id);

  return {
    amount: row.amount,
    type: (row.type as 'expense' | 'income') || 'expense',
  };
};

/**
 * Получить сводный отчёт за указанное количество дней (доходы, расходы, сальдо и категории)
 */
export const getExpenseReport = (
  userId: number,
  days: number
): PeriodReport => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  // 1. Сумма доходов
  const incomeStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? 
      AND type = 'income' 
      AND created_at >= datetime('now', '-' || ? || ' days')
  `);
  const incomeRes = incomeStmt.get(userId, days) as { total: number };
  const totalIncome = Number(incomeRes.total) || 0;

  // 2. Сумма расходов
  const expenseStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? 
      AND type = 'expense' 
      AND created_at >= datetime('now', '-' || ? || ' days')
  `);
  const expenseRes = expenseStmt.get(userId, days) as { total: number };
  const totalExpense = Number(expenseRes.total) || 0;

  const balance = totalIncome - totalExpense;

  // 3. Группировка расходов по категориям
  const itemsStmt = db.prepare(`
    SELECT 
      t.category,
      SUM(t.amount) as total,
      c.icon
    FROM transactions t
    LEFT JOIN categories c ON c.user_id = t.user_id AND c.name = t.category AND c.type = 'expense'
    WHERE t.user_id = ? 
      AND t.type = 'expense' 
      AND t.created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY t.category
    ORDER BY total DESC
  `);

  interface RawRow {
    category: string;
    total: number;
    icon: string | null;
  }

  const rawRows = itemsStmt.all(userId, days) as unknown as RawRow[];

  const items: CategoryReportItem[] = rawRows.map((row) => {
    const total = Number(row.total);
    const percentage = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
    return {
      category: row.category,
      total,
      percentage,
      icon: row.icon || '🔹',
    };
  });

  return {
    totalIncome,
    totalExpense,
    balance,
    startDate,
    endDate,
    items,
  };
};
