import { Context } from 'telegraf';
import { getMainKeyboard } from '../keyboards/main.js';

export const startCommand = async (ctx: Context) => {
  const welcomeText =
    'Бот учёта личных финансов.\n\n' +
    'Формат ввода (от 1 000 сум):\n' +
    '• Расход: -40k, -35000, -1.5kk\n' +
    '• Доход: +40k, +500k, +2kk';

  await ctx.reply(welcomeText, getMainKeyboard());
};
