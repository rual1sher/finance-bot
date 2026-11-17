import { Context, Markup, MiddlewareFn } from 'telegraf';
import {
  addTransaction,
  addUserCategory,
  savePendingExpense,
} from '../database/transactions.js';
import {
  clearWaitingManualCategory,
  getWaitingManualCategory,
} from '../handlers/expenses.js';
import { getCategoriesKeyboard } from '../keyboards/categories.js';
import { formatAmount } from '../utils/formatter.js';
import { MIN_AMOUNT, parseExpenseInput } from '../utils/parser.js';

/**
 * Обработчик текстовых сообщений:
 * 1. Ручной ввод названия новой категории (если бот ожидает текст)
 * 2. Ввод суммы расхода или дохода
 */
export const expenseHandler: MiddlewareFn<Context> = async (ctx, next) => {
  const text = (ctx.message as { text?: string })?.text;
  const userId = ctx.from?.id;

  if (!text || !userId) {
    return next();
  }

  // 1. Проверяем, ожидает ли бот ручной ввод названия категории
  const waiting = getWaitingManualCategory(userId);
  if (waiting) {
    clearWaitingManualCategory(userId);

    const categoryName = text.trim();
    if (!categoryName || categoryName.startsWith('/')) {
      await ctx.reply('Некорректное название категории. Ввод отменён.');
      return;
    }

    // Приводим первую букву к заглавной
    const formattedCategory =
      categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    try {
      // Сохраняем новую категорию для соответствующего типа операции
      const newCat = addUserCategory(userId, formattedCategory, waiting.type);

      // Записываем транзакцию
      const txId = addTransaction(
        userId,
        waiting.amount,
        newCat.name,
        waiting.type
      );

      const prefix = waiting.type === 'income' ? 'Записан доход: +' : 'Записан расход: -';
      const message = `${prefix}${formatAmount(waiting.amount)} — 🔹 ${newCat.name}\n(Категория сохранена в ваш список)`;

      await ctx.reply(
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback('Отменить', `undo_${txId}`)],
        ])
      );
      return;
    } catch (error) {
      console.error('Ошибка сохранения ручной категории и операции:', error);
      await ctx.reply('Произошла ошибка при сохранении операции.');
      return;
    }
  }

  // 2. Обрабатываем ввод суммы
  const parsed = parseExpenseInput(text);
  if (!parsed) {
    return next();
  }

  // Проверка минимальной суммы (от 1 000 сум)
  if (parsed.amount < MIN_AMOUNT) {
    await ctx.reply('Минимальная сумма для записи — 1 000 сум.');
    return;
  }

  try {
    // Сохраняем во временную таблицу в SQLite
    const pendingId = savePendingExpense(userId, parsed.amount, parsed.type);
    const isIncome = parsed.type === 'income';
    const promptText = isIncome
      ? `Выберите категорию дохода для +${formatAmount(parsed.amount)}:`
      : `Выберите категорию расхода для -${formatAmount(parsed.amount)}:`;

    await ctx.reply(
      promptText,
      getCategoriesKeyboard(userId, parsed.amount, parsed.type, pendingId)
    );
  } catch (error) {
    console.error('Ошибка обработки ввода операции:', error);
    await ctx.reply('Произошла ошибка при обработке суммы.');
  }
};
