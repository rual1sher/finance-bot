import { Context, MiddlewareFn } from 'telegraf';

export const authMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const adminId = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : null;

  if (adminId && ctx.from?.id !== adminId) {
    console.log(`Попытка неавторизованного доступа: ${ctx.from?.id}`);
    await ctx.reply('Это личный конфиденциальный бот. Доступ ограничен.');
    return;
  }

  return next();
};

