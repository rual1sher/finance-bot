import { Context, Markup } from 'telegraf';
import { db } from '../database/db.js';
import {
  addTransaction,
  deleteTransaction,
  getPendingExpense,
} from '../database/transactions.js';
import { Category } from '../type/index.js';
import { formatAmount } from '../utils/formatter.js';

interface WaitingManualCategoryData {
  amount: number;
  type: 'expense' | 'income';
  createdAt: number;
}

const waitingManualCategory = new Map<number, WaitingManualCategoryData>();

/**
 * Проверить, ожидает ли пользователь ввод названия категории
 */
export const getWaitingManualCategory = (
  userId: number
): WaitingManualCategoryData | undefined => {
  return waitingManualCategory.get(userId);
};

/**
 * Очистить состояние ожидания ручного ввода категории
 */
export const clearWaitingManualCategory = (userId: number): void => {
  waitingManualCategory.delete(userId);
};

/**
 * Установить состояние ожидания ручного ввода категории
 */
export const setWaitingManualCategory = (
  userId: number,
  data: WaitingManualCategoryData
): void => {
  waitingManualCategory.set(userId, data);
};

/**
 * Обработка выбора готовой категории из инлайн-кнопок
 */
export const handleCategoryCallback = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !userId || !data.startsWith('cat:')) return;

  const parts = data.split(':');
  if (parts.length !== 5) return;

  const catId = Number(parts[1]);
  const fallbackAmount = Number(parts[2]);
  const fallbackType = (parts[3] as 'expense' | 'income') || 'expense';
  const pendingId = parts[4];

  const stmt = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
  const category = stmt.get(catId, userId) as unknown as Category | undefined;

  if (!category) {
    await ctx.answerCbQuery('Категория не найдена');
    return;
  }

  // Получаем данные из SQLite
  const pending = getPendingExpense(pendingId, userId);
  const amount = pending ? pending.amount : fallbackAmount;
  const type = pending ? pending.type : fallbackType;

  try {
    const txId = addTransaction(
      userId,
      amount,
      category.name,
      type
    );

    await ctx.answerCbQuery(type === 'income' ? 'Доход сохранён' : 'Расход сохранён');

    const icon = category.icon ? `${category.icon} ` : '';
    const prefix = type === 'income' ? 'Записан доход: +' : 'Записан расход: -';
    const message = `${prefix}${formatAmount(amount)} — ${icon}${category.name}`;

    await ctx.editMessageText(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('Отменить', `undo_${txId}`)],
      ])
    );
  } catch (error) {
    console.error('Ошибка сохранения операции по категории:', error);
    await ctx.answerCbQuery('Ошибка при сохранении');
  }
};

/**
 * Обработка нажатия на кнопку «Ручное»
 */
export const handleManualCategoryCallback = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !userId || !data.startsWith('manual_cat:')) return;

  const parts = data.split(':');
  if (parts.length !== 4) return;

  const fallbackAmount = Number(parts[1]);
  const fallbackType = (parts[2] as 'expense' | 'income') || 'expense';
  const pendingId = parts[3];

  const pending = getPendingExpense(pendingId, userId);
  const amount = pending ? pending.amount : fallbackAmount;
  const type = pending ? pending.type : fallbackType;

  setWaitingManualCategory(userId, {
    amount,
    type,
    createdAt: Date.now(),
  });

  try {
    await ctx.answerCbQuery();
    const prefix = type === 'income' ? 'Доход: +' : 'Расход: -';
    await ctx.editMessageText(
      `${prefix}${formatAmount(amount)}\nНапишите текстом название новой категории:`
    );
  } catch (error) {
    console.error('Ошибка перехода в ручной ввод категории:', error);
  }
};

/**
 * Обработка отмены выбора категории
 */
export const handleCancelPromptCallback = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !data.startsWith('cancel_prompt:')) return;

  const pendingId = data.replace('cancel_prompt:', '');
  if (userId) {
    getPendingExpense(pendingId, userId);
    clearWaitingManualCategory(userId);
  }

  try {
    await ctx.answerCbQuery('Отменено');
    await ctx.editMessageText('Ввод операции отменён.');
  } catch (error) {
    console.error('Ошибка отмены выбора:', error);
  }
};

/**
 * Обработка инлайн-кнопки «Отменить» (удаление сохранённой записи)
 */
export const handleUndoCallback = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !userId || !data.startsWith('undo_')) return;

  const txId = Number(data.replace('undo_', ''));

  try {
    const success = deleteTransaction(txId, userId);
    if (success) {
      await ctx.answerCbQuery('Операция отменена');
      await ctx.editMessageText('Операция успешно отменена.');
    } else {
      await ctx.answerCbQuery('Запись уже была отменена');
    }
  } catch (error) {
    console.error('Ошибка отмены транзакции:', error);
    await ctx.answerCbQuery('Ошибка при отмене');
  }
};
