import { Markup } from 'telegraf';

/**
 * Главная Reply-клавиатура (отчёты и основные действия)
 */
export const getMainKeyboard = () => {
  return Markup.keyboard([
    ['📊 Отчёт за неделю', '📅 Отчёт за месяц'],
    ['🕒 История'],
  ]).resize();
};
