import { PeriodReport } from "../type/index.js";

/**
 * Форматирование денежной суммы с пробелами между разрядами.
 * Пример: 90000 -> "90 000 сум"
 */
export const formatAmount = (amount: number, currency: string = 'сум'): string => {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${currency}`.trim();
};

/**
 * Форматирование даты в читаемый вид (ДД.ММ.ГГГГ ЧЧ:ММ).
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Короткий формат даты: ДД.ММ
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * Короткий формат даты и времени: ДД.ММ ЧЧ:ММ
 */
export const formatDateTimeShort = (dateStr: string): string => {
  const normalized = dateStr.includes('T') || dateStr.endsWith('Z')
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.TZ || 'Asia/Tashkent',
  });
};


/**
 * Сформировать текст отчёта (доходы, расходы, сальдо и категории)
 */
export const formatReportMessage = (titleIcon: string, periodTitle: string, report: PeriodReport): string => {
  const dateRange = `${formatShortDate(report.startDate)} — ${formatShortDate(report.endDate)}`;
  const header = `${titleIcon} Отчёт ${periodTitle} (${dateRange})\n`;

  if (report.totalIncome === 0 && report.totalExpense === 0) {
    return `${header}\nЗа выбранный период операций нет.`;
  }

  const sign = report.balance >= 0 ? '+' : '-';
  const balanceStr = `${sign}${formatAmount(Math.abs(report.balance))}`;

  let body =
    `Доходы: +${formatAmount(report.totalIncome)}\n` +
    `Расходы: ${formatAmount(report.totalExpense)}\n` +
    '—————————————\n' +
    `Сальдо: ${balanceStr}\n`;

  if (report.items.length > 0) {
    body += '\nКатегории расходов:\n';
    const lines = report.items.map((item) => {
      const icon = item.icon ? `${item.icon} ` : '🔹 ';
      return `${icon}${item.category} — ${formatAmount(item.total)} (${item.percentage}%)`;
    });
    body += lines.join('\n');
  }

  return `${header}\n${body}`;
};
