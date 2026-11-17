import { Context, Markup } from 'telegraf';
import {
  deleteTransaction,
  getTransactionsCount,
  getTransactionsPage,
} from '../database/transactions.js';
import { formatAmount, formatDateTimeShort } from '../utils/formatter.js';

export const PAGE_SIZE = 5;

/**
 * Формирование текста и инлайн-кнопок для истории операций с пагинацией
 */
export const buildHistoryView = (userId: number, page: number = 1) => {
  const totalCount = getTransactionsCount(userId);

  if (totalCount === 0) {
    return {
      text: 'Записей пока нет.',
      keyboard: Markup.inlineKeyboard([]),
      hasItems: false,
    };
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const items = getTransactionsPage(userId, currentPage, PAGE_SIZE);

  let text = `🕒 История операций (Стр. ${currentPage}/${totalPages}):\n\n`;
  const deleteButtons: ReturnType<typeof Markup.button.callback>[] = [];

  items.forEach((item, index) => {
    const num = index + 1;
    const isIncome = item.type === 'income';
    const sign = isIncome ? '+' : '-';
    const icon = item.icon ? `${item.icon} ` : isIncome ? '💼 ' : '🔹 ';
    const dateFormatted = formatDateTimeShort(item.created_at);

    text += `${num}. ${dateFormatted} | ${icon}${item.category} — ${sign}${formatAmount(item.amount)}\n`;
    deleteButtons.push(Markup.button.callback(`❌ ${num}`, `del_tx:${item.id}:${currentPage}`));
  });

  text += '\nНажмите на кнопку с номером для удаления:';

  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  if (deleteButtons.length > 0) {
    rows.push(deleteButtons);
  }

  // Кнопки навигации пагинации
  if (totalPages > 1) {
    const navButtons: ReturnType<typeof Markup.button.callback>[] = [];

    if (currentPage > 1) {
      navButtons.push(Markup.button.callback('⬅️ Назад', `history_page:${currentPage - 1}`));
    }
    navButtons.push(Markup.button.callback(`${currentPage} / ${totalPages}`, 'history_noop'));
    if (currentPage < totalPages) {
      navButtons.push(Markup.button.callback('Вперёд ➡️', `history_page:${currentPage + 1}`));
    }

    rows.push(navButtons);
  }

  return {
    text,
    keyboard: Markup.inlineKeyboard(rows),
    hasItems: true,
  };
};

/**
 * Обработчик кнопки меню «🕒 История» и команды /history
 */
export const handleHistory = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const view = buildHistoryView(userId, 1);
    if (view.hasItems) {
      await ctx.reply(view.text, view.keyboard);
    } else {
      await ctx.reply(view.text);
    }
  } catch (error) {
    console.error('Ошибка вывода истории операций:', error);
    await ctx.reply('Произошла ошибка при загрузке истории.');
  }
};

/**
 * Обработчик переключения страниц пагинации
 */
export const handleHistoryPageCallback = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !userId || !data.startsWith('history_page:')) return;

  const page = Number(data.replace('history_page:', '')) || 1;

  try {
    await ctx.answerCbQuery();
    const view = buildHistoryView(userId, page);
    if (view.hasItems) {
      await ctx.editMessageText(view.text, view.keyboard);
    } else {
      await ctx.editMessageText(view.text);
    }
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      return;
    }
    console.error('Ошибка переключения страницы истории:', error);
  }
};

/**
 * Обработчик удаления записи из истории по кнопке [❌ N]
 */
export const handleDeleteHistoryItem = async (ctx: Context): Promise<void> => {
  const callbackQuery = ctx.callbackQuery;
  const data = (callbackQuery as { data?: string })?.data;
  const userId = ctx.from?.id;

  if (!data || !userId || !data.startsWith('del_tx:')) return;

  const parts = data.split(':');
  const txId = Number(parts[1]);
  const page = Number(parts[2]) || 1;

  try {
    const success = deleteTransaction(txId, userId);

    if (success) {
      await ctx.answerCbQuery('Операция удалена');
    } else {
      await ctx.answerCbQuery('Запись уже была удалена');
    }

    // Обновляем список на той же странице (или с безопасным пересчётом, если страница опустела)
    const view = buildHistoryView(userId, page);
    if (view.hasItems) {
      await ctx.editMessageText(view.text, view.keyboard);
    } else {
      await ctx.editMessageText('Записей больше нет.');
    }
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      return;
    }
    console.error('Ошибка удаления записи из истории:', error);
    await ctx.answerCbQuery('Ошибка при удалении');
  }
};
