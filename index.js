require('./server'); // Express admin panel + API ni ishga tushiradi

const bot = require('./bot');
if (bot) {
  bot.launch();
  console.log('✅ Telegram bot ishga tushdi');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
