import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { expenseHandler } from './command/expense.js';
import { startCommand } from './command/start.js';
import { initDatabase } from './database/db.js';
import {
  handleCancelPromptCallback,
  handleCategoryCallback,
  handleManualCategoryCallback,
  handleUndoCallback,
} from './handlers/expenses.js';
import { fallbackHandler } from './handlers/fallback.js';
import {
  handleWeekReport,
  handleMonthReport,
} from './handlers/reports.js';
import {
  handleDeleteHistoryItem,
  handleHistory,
  handleHistoryPageCallback,
} from './handlers/history.js';
import { initCronJobs } from './cron/scheduler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не указан в .env файле');
  process.exit(1);
}

// Инициализация базы данных SQLite
initDatabase();

const bot = new Telegraf(BOT_TOKEN);

// 1. Middleware: авторизация и приватность
bot.use(authMiddleware);

// 2. Команды
bot.start(startCommand);
bot.command('history', handleHistory);

// 3. Кнопки постоянного меню (отчёты и история)
bot.hears('📊 Отчёт за неделю', handleWeekReport);
bot.hears('📅 Отчёт за месяц', handleMonthReport);
bot.hears('🕒 История', handleHistory);

// 4. Обработка операций (ввод сумм и ручной ввод категорий)
bot.on('text', expenseHandler);

// 5. Обработка инлайн-кнопок категорий, отмены, истории и пагинации
bot.action(/^cat:/, handleCategoryCallback);
bot.action(/^manual_cat:/, handleManualCategoryCallback);
bot.action(/^cancel_prompt:/, handleCancelPromptCallback);
bot.action(/^undo_\d+$/, handleUndoCallback);
bot.action(/^del_tx:\d+/, handleDeleteHistoryItem);
bot.action(/^history_page:\d+$/, handleHistoryPageCallback);
bot.action('history_noop', (ctx) => ctx.answerCbQuery());

// 6. Подсказка для остальных нераспознанных сообщений
bot.on('message', fallbackHandler);

// 7. Инициализация cron-задач (автоматические отчёты)
initCronJobs(bot);

// Запуск бота
bot.launch().then(() => {
  console.log('Бот успешно запущен на TypeScript!');
});

// Корректная остановка при выключении процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
