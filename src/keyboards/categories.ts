import { Markup } from 'telegraf';
import { getUserCategories } from '../database/transactions.js';

/**
 * Создать инлайн-клавиатуру выбора категорий (для расхода или дохода)
 */
export const getCategoriesKeyboard = (
  userId: number,
  amount: number,
  type: 'expense' | 'income',
  pendingId: string
) => {
  const categories = getUserCategories(userId, type);

  const buttons = categories.map((cat) => {
    const icon = cat.icon || '🔹';
    return Markup.button.callback(
      `${icon} ${cat.name}`,
      `cat:${cat.id}:${amount}:${type}:${pendingId}`
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  // Кнопка «Ручное» и кнопка «Отмена»
  rows.push([
    Markup.button.callback('✏️ Ручное', `manual_cat:${amount}:${type}:${pendingId}`),
    Markup.button.callback('Отмена', `cancel_prompt:${pendingId}`),
  ]);

  return Markup.inlineKeyboard(rows);
};
