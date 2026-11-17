import { Context } from 'telegraf';

/**
 * Обработчик нераспознанных сообщений: вывод подсказки по формату ввода
 */
export const fallbackHandler = async (ctx: Context): Promise<void> => {
  const message =
    'Формат ввода операций (от 1 000 сум):\n\n' +
    '🔴 Расход (со знаком -):\n' +
    '• -40k (40 000)\n' +
    '• -35000\n' +
    '• -1.5kk (1 500 000)\n\n' +
    '🟢 Доход / Прибыль (со знаком +):\n' +
    '• +40k (40 000)\n' +
    '• +500k (500 000)\n' +
    '• +2kk (2 000 000)';

  await ctx.reply(message);
};
