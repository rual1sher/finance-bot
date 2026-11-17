export interface ParsedExpense {
  amount: number;
  type: 'expense' | 'income';
}

export const MIN_AMOUNT = 1000;

/**
 * Парсинг текста для извлечения суммы и типа операции (расход или доход).
 * Строго требует указания знака:
 *  - Расходы (со знаком -): "-40k", "-35000", "-1.5kk"
 *  - Доходы (со знаком +): "+40k", "+500k", "+2kk", "+ 1000000"
 */
export const parseExpenseInput = (text: string): ParsedExpense | null => {
  if (!text) return null;
  let trimmed = text.trim();

  // Игнорируем команды бота
  if (trimmed.startsWith('/')) {
    return null;
  }

  let type: 'expense' | 'income';
  if (trimmed.startsWith('+')) {
    type = 'income';
    trimmed = trimmed.slice(1).trim();
  } else if (trimmed.startsWith('-')) {
    type = 'expense';
    trimmed = trimmed.slice(1).trim();
  } else {
    // Без обязательного знака (+) или (-) ввод отклоняется
    return null;
  }

  // Регулярное выражение строго для числа (без дополнительного текста)
  const regex = /^(\d[\d\s]*(?:[.,]\d+)?\s*(?:kk|k)?)$/i;
  const match = trimmed.match(regex);

  if (!match) {
    return null;
  }

  const rawAmount = match[1].toLowerCase().replace(/\s+/g, '');

  let multiplier = 1;
  let numericPart = rawAmount;

  if (numericPart.endsWith('kk')) {
    multiplier = 1_000_000;
    numericPart = numericPart.slice(0, -2);
  } else if (numericPart.endsWith('k')) {
    multiplier = 1_000;
    numericPart = numericPart.slice(0, -1);
  }

  // Заменяем запятую на точку для Float
  numericPart = numericPart.replace(',', '.');
  const amountNumber = parseFloat(numericPart);

  if (isNaN(amountNumber) || amountNumber <= 0) {
    return null;
  }

  const finalAmount = Math.round(amountNumber * multiplier);

  // Ограничение на сумму (до 100 миллиардов)
  if (finalAmount <= 0 || finalAmount > 100_000_000_000) {
    return null;
  }

  return {
    amount: finalAmount,
    type,
  };
};
