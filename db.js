// Oddiy fayl-asosidagi ma'lumotlar bazasi.
// Kichik o'quv markazi (bitta markaz, bir necha yuzlab o'quvchi) uchun
// bu yechim to'liq yetarli va hech qanday tashqi DB server talab qilmaydi.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function emptyData() {
  return {
    teachers: [],   // {id, name, username, passwordHash}
    groups: [],     // {id, name, gradeLevel, teacherId}
    students: [],   // {id, name, groupId, parentId}
    parents: [],    // {id, name, phone, telegramId, linkCode}
    lessons: [],    // {id, groupId, date, topic, status}
    grades: [],     // {id, lessonId, studentId, score, comment}
    attendance: []  // {id, lessonId, studentId, status} status: present|absent|late
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    save(emptyData());
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Har bir yozish operatsiyasidan oldin diskdan o'qib, keyin saqlaymiz.
// Kichik tizim uchun bu yetarlicha xavfsiz va oddiy.
function withData(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

module.exports = { load, save, withData, emptyData };
