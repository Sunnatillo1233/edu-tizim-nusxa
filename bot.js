require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { load, withData } = require('./db');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('⚠️  BOT_TOKEN .env faylida topilmadi. Bot ishga tushmaydi.');
  module.exports = null;
  return;
}

const bot = new Telegraf(BOT_TOKEN);

const mainMenu = Markup.keyboard([
  ['📅 Bugungi dars'],
  ['📊 Bu hafta', '📈 Bu oy'],
  ['ℹ️ Farzandim haqida']
]).resize();

function findParentByTelegramId(data, telegramId) {
  return data.parents.find((p) => p.telegramId === String(telegramId));
}

function studentsOfParent(data, parent) {
  return data.students.filter((s) => s.parentId === parent.id);
}

// ---------- /start ----------
bot.start((ctx) => {
  const data = load();
  const existing = findParentByTelegramId(data, ctx.from.id);
  if (existing) {
    return ctx.reply(
      `Xush kelibsiz, ${existing.name}! 👋\nQuyidagi menyudan kerakli bo'limni tanlang.`,
      mainMenu
    );
  }
  ctx.reply(
    "Assalomu alaykum! 👋\n\nBu bot orqali farzandingizning o'quv jarayoni statistikasini kuzatib borishingiz mumkin.\n\nIltimos, o'quv markazidan olgan 6 xonali bog'lanish kodingizni yuboring:"
  );
});

// ---------- Bog'lanish kodini qabul qilish ----------
bot.hears(/^\d{6}$/, (ctx) => {
  const code = ctx.message.text.trim();
  const result = withData((data) => {
    const parent = data.parents.find((p) => p.linkCode === code);
    if (!parent) return { error: 'notfound' };
    if (parent.telegramId && parent.telegramId !== String(ctx.from.id)) {
      return { error: 'used' };
    }
    parent.telegramId = String(ctx.from.id);
    return { parent };
  });

  if (result.error === 'notfound') {
    return ctx.reply("❌ Bunday kod topilmadi. Kodni qaytadan tekshirib yuboring.");
  }
  if (result.error === 'used') {
    return ctx.reply("❌ Bu kod allaqachon boshqa akkauntga bog'langan. O'quv markaziga murojaat qiling.");
  }
  ctx.reply(
    `✅ Muvaffaqiyatli bog'landingiz, ${result.parent.name}!\n\nEndi quyidagi menyudan farzandingiz statistikasini ko'rishingiz mumkin.`,
    mainMenu
  );
});

function requireParent(ctx) {
  const data = load();
  const parent = findParentByTelegramId(data, ctx.from.id);
  if (!parent) {
    ctx.reply("Avval bog'lanish kodini yuboring, yoki /start bosing.");
    return null;
  }
  return { data, parent };
}

// Bir nechta farzand bo'lsa, tanlash klaviaturasi
function pickChild(ctx, students, onPickedCallbackDataPrefix) {
  if (students.length === 1) return students[0];
  const buttons = students.map((s) =>
    Markup.button.callback(s.name, `${onPickedCallbackDataPrefix}:${s.id}`)
  );
  ctx.reply("Qaysi farzandingiz bo'yicha ma'lumot kerak?", Markup.inlineKeyboard(buttons, { columns: 1 }));
  return null;
}

function formatLessonReport(data, student, lessons) {
  if (!lessons.length) return `*${student.name}* uchun bu davrda dars yozuvi topilmadi.`;

  let msg = `📚 *${student.name}* — hisobot\n\n`;
  lessons.forEach((lesson) => {
    const att = data.attendance.find((a) => a.lessonId === lesson.id && a.studentId === student.id);
    const grade = data.grades.find((g) => g.lessonId === lesson.id && g.studentId === student.id);
    const attIcon = att ? { present: '✅ Keldi', absent: '❌ Kelmadi', late: '⏰ Kech qoldi' }[att.status] : '—';
    msg += `📅 *${lesson.date}*${lesson.topic ? ' — ' + lesson.topic : ''}\n`;
    msg += `Davomat: ${attIcon}\n`;
    if (grade) {
      msg += `Baho: ${grade.score}\n`;
      if (grade.comment) msg += `Izoh: _${grade.comment}_\n`;
    }
    msg += '\n';
  });
  return msg;
}

function lessonsForStudentInRange(data, student, fromDate) {
  const groupLessons = data.lessons.filter(
    (l) => l.groupId === student.groupId && l.status === 'closed' && new Date(l.date) >= fromDate
  );
  return groupLessons.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function handleReport(ctx, rangeDays, label) {
  const ctxData = requireParent(ctx);
  if (!ctxData) return;
  const { data, parent } = ctxData;
  const students = studentsOfParent(data, parent);
  if (!students.length) return ctx.reply("Sizga bog'langan o'quvchi topilmadi. O'quv markaziga murojaat qiling.");

  const send = (student) => {
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    const lessons = lessonsForStudentInRange(data, student, from);
    ctx.replyWithMarkdown(formatLessonReport(data, student, lessons));
  };

  const picked = pickChild(ctx, students, `report_${rangeDays}`);
  if (picked) send(picked);
}

bot.hears('📅 Bugungi dars', (ctx) => handleReport(ctx, 0, 'bugun'));
bot.hears('📊 Bu hafta', (ctx) => handleReport(ctx, 7, 'hafta'));
bot.hears('📈 Bu oy', (ctx) => handleReport(ctx, 30, 'oy'));

bot.hears('ℹ️ Farzandim haqida', (ctx) => {
  const ctxData = requireParent(ctx);
  if (!ctxData) return;
  const { data, parent } = ctxData;
  const students = studentsOfParent(data, parent);
  if (!students.length) return ctx.reply("Sizga bog'langan o'quvchi topilmadi.");

  students.forEach((student) => {
    const group = data.groups.find((g) => g.id === student.groupId);
    const grades = data.grades.filter((g) => g.studentId === student.id);
    const attendance = data.attendance.filter((a) => a.studentId === student.id);
    const avgScore = grades.length
      ? (grades.reduce((sum, g) => sum + Number(g.score || 0), 0) / grades.length).toFixed(1)
      : "ma'lumot yo'q";
    const attRate = attendance.length
      ? Math.round((attendance.filter((a) => a.status === 'present').length / attendance.length) * 100)
      : null;

    let msg = `👤 *${student.name}*\n`;
    msg += `Guruh: ${group ? group.name : "belgilanmagan"}\n`;
    msg += `O'rtacha baho: ${avgScore}\n`;
    if (attRate !== null) msg += `Davomat foizi: ${attRate}%\n`;
    ctx.replyWithMarkdown(msg);
  });
});

// Callback: bir nechta farzand orasidan tanlash bosilganda
bot.on('callback_query', (ctx) => {
  const cbData = ctx.callbackQuery.data; // report_<days>:<studentId>
  const match = cbData.match(/^report_(\d+):(.+)$/);
  if (!match) return ctx.answerCbQuery();

  const rangeDays = Number(match[1]);
  const studentId = match[2];
  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return ctx.answerCbQuery('Topilmadi');

  const from = new Date();
  from.setDate(from.getDate() - rangeDays);
  const lessons = lessonsForStudentInRange(data, student, from);
  ctx.replyWithMarkdown(formatLessonReport(data, student, lessons));
  ctx.answerCbQuery();
});

bot.catch((err) => console.error('Bot xatosi:', err));

module.exports = bot;
