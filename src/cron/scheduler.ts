import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { generateMonthReport, generateWeekReport } from '../handlers/reports.js';

/**
 * Инициализация автоматических отчётов по расписанию (cron-jobs)
 */
export const initCronJobs = (bot: Telegraf): void => {
  const adminIdStr = process.env.ADMIN_ID;
  if (!adminIdStr) {
    console.warn('Предупреждение: ADMIN_ID не задан в .env, расписание отчётов не запущено');
    return;
  }

  const adminId = Number(adminIdStr);
  const timezone = process.env.TZ || 'Asia/Tashkent';

  // 1. Еженедельный отчёт: каждое воскресенье в 09:00
  cron.schedule(
    '0 9 * * 0',
    async () => {
      console.log('Запуск еженедельного cron-отчёта (воскресенье 09:00)...');
      try {
        const message = generateWeekReport(adminId);
        await bot.telegram.sendMessage(adminId, `🔔 Регулярный отчёт:\n\n${message}`);
      } catch (error) {
        console.error('Ошибка отправки еженедельного отчёта по cron:', error);
      }
    },
    { timezone }
  );

  // 2. Ежемесячный отчёт: 1-е число каждого месяца в 09:00
  cron.schedule(
    '0 9 1 * *',
    async () => {
      console.log('Запуск ежемесячного cron-отчёта (1-е число месяца 09:00)...');
      try {
        const message = generateMonthReport(adminId);
        await bot.telegram.sendMessage(adminId, `🔔 Регулярный отчёт:\n\n${message}`);
      } catch (error) {
        console.error('Ошибка отправки ежемесячного отчёта по cron:', error);
      }
    },
    { timezone }
  );

  console.log(`Cron-задачи инициализированы: Воскресенье 09:00, 1-е число 09:00 (таймзона: ${timezone})`);
};

