import { Context } from 'telegraf';
import { getExpenseReport } from '../database/transactions.js';
import { formatReportMessage } from '../utils/formatter.js';

/**
 * Генерация отчёта за неделю (для кнопок и cron)
 */
export const generateWeekReport = (userId: number): string => {
  const report = getExpenseReport(userId, 7);
  return formatReportMessage('📊', 'за неделю', report);
};

/**
 * Генерация отчёта за месяц (для кнопок и cron)
 */
export const generateMonthReport = (userId: number): string => {
  const report = getExpenseReport(userId, 30);
  return formatReportMessage('📅', 'за месяц', report);
};

/**
 * Обработчик кнопки «📊 Отчёт за неделю»
 */
export const handleWeekReport = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const message = generateWeekReport(userId);
    await ctx.reply(message);
  } catch (error) {
    console.error('Ошибка формирования отчёта за неделю:', error);
    await ctx.reply('Произошла ошибка при формировании отчёта.');
  }
};

/**
 * Обработчик кнопки «📅 Отчёт за месяц»
 */
export const handleMonthReport = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const message = generateMonthReport(userId);
    await ctx.reply(message);
  } catch (error) {
    console.error('Ошибка формирования отчёта за месяц:', error);
    await ctx.reply('Произошла ошибка при формировании отчёта.');
  }
};
