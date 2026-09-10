require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { withData, load } = require('./db');
const { genId, genLinkCode, genToken, hashPassword, checkPassword } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Sessiyalar (xotirada, oddiy) ----------
// token -> { role: 'admin' | 'teacher', id: teacherId|null }
const sessions = new Map();

function requireAuth(roles) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const session = token && sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
    if (roles && !roles.includes(session.role)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    req.session = session;
    next();
  };
}

// ============ AUTH ============

// Admin login (.env dagi ADMIN_USERNAME / ADMIN_PASSWORD orqali)
// O'qituvchi login (data.json dagi teachers ro'yxati orqali)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = genToken();
    sessions.set(token, { role: 'admin', id: null, name: 'Admin' });
    return res.json({ token, role: 'admin', name: 'Admin' });
  }

  const data = load();
  const teacher = data.teachers.find((t) => t.username === username);
  if (teacher && checkPassword(password, teacher.passwordHash)) {
    const token = genToken();
    sessions.set(token, { role: 'teacher', id: teacher.id, name: teacher.name });
    return res.json({ token, role: 'teacher', name: teacher.name, teacherId: teacher.id });
  }

  res.status(401).json({ error: 'Login yoki parol xato' });
});

app.post('/api/logout', requireAuth(), (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  sessions.delete(token);
  res.json({ ok: true });
});

// ============ O'QITUVCHILAR (admin) ============

app.get('/api/teachers', requireAuth(['admin']), (req, res) => {
  const data = load();
  res.json(data.teachers.map(({ passwordHash, ...t }) => t));
});

app.post('/api/teachers', requireAuth(['admin']), (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
  }
  const result = withData((data) => {
    if (data.teachers.some((t) => t.username === username)) {
      return { error: 'Bu login band' };
    }
    const teacher = { id: genId('teacher'), name, username, passwordHash: hashPassword(password) };
    data.teachers.push(teacher);
    return { teacher: { id: teacher.id, name, username } };
  });
  if (result.error) return res.status(400).json(result);
  res.json(result.teacher);
});

app.put('/api/teachers/:id', requireAuth(['admin']), (req, res) => {
  const { name, username, password } = req.body;
  const result = withData((data) => {
    const t = data.teachers.find((x) => x.id === req.params.id);
    if (!t) return { error: 'Topilmadi' };
    if (name) t.name = name;
    if (username) t.username = username;
    if (password) t.passwordHash = hashPassword(password);
    return { teacher: { id: t.id, name: t.name, username: t.username } };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result.teacher);
});

app.delete('/api/teachers/:id', requireAuth(['admin']), (req, res) => {
  withData((data) => {
    data.teachers = data.teachers.filter((t) => t.id !== req.params.id);
    data.groups.forEach((g) => { if (g.teacherId === req.params.id) g.teacherId = null; });
  });
  res.json({ ok: true });
});

// ============ GURUHLAR ============

app.get('/api/groups', requireAuth(['admin', 'teacher']), (req, res) => {
  const data = load();
  let groups = data.groups;
  if (req.session.role === 'teacher') {
    groups = groups.filter((g) => g.teacherId === req.session.id);
  }
  const withCounts = groups.map((g) => ({
    ...g,
    studentCount: data.students.filter((s) => s.groupId === g.id).length,
    teacherName: (data.teachers.find((t) => t.id === g.teacherId) || {}).name || null
  }));
  res.json(withCounts);
});

app.post('/api/groups', requireAuth(['admin']), (req, res) => {
  const { name, gradeLevel, teacherId } = req.body;
  if (!name || !gradeLevel) return res.status(400).json({ error: 'Nomi va sinfi shart' });
  const group = withData((data) => {
    const g = { id: genId('group'), name, gradeLevel, teacherId: teacherId || null };
    data.groups.push(g);
    return g;
  });
  res.json(group);
});

app.put('/api/groups/:id', requireAuth(['admin']), (req, res) => {
  const { name, gradeLevel, teacherId } = req.body;
  const result = withData((data) => {
    const g = data.groups.find((x) => x.id === req.params.id);
    if (!g) return { error: 'Topilmadi' };
    if (name) g.name = name;
    if (gradeLevel) g.gradeLevel = gradeLevel;
    if (teacherId !== undefined) g.teacherId = teacherId;
    return { group: g };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result.group);
});

app.delete('/api/groups/:id', requireAuth(['admin']), (req, res) => {
  withData((data) => {
    data.groups = data.groups.filter((g) => g.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ============ O'QUVCHILAR ============

app.get('/api/students', requireAuth(['admin', 'teacher']), (req, res) => {
  const data = load();
  let students = data.students;
  if (req.session.role === 'teacher') {
    const myGroupIds = data.groups.filter((g) => g.teacherId === req.session.id).map((g) => g.id);
    students = students.filter((s) => myGroupIds.includes(s.groupId));
  }
  if (req.query.groupId) {
    students = students.filter((s) => s.groupId === req.query.groupId);
  }
  const enriched = students.map((s) => ({
    ...s,
    groupName: (data.groups.find((g) => g.id === s.groupId) || {}).name || null,
    parentName: (data.parents.find((p) => p.id === s.parentId) || {}).name || null
  }));
  res.json(enriched);
});

app.post('/api/students', requireAuth(['admin']), (req, res) => {
  const { name, groupId, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Ism shart' });
  const student = withData((data) => {
    const s = { id: genId('student'), name, groupId: groupId || null, parentId: parentId || null };
    data.students.push(s);
    return s;
  });
  res.json(student);
});

app.put('/api/students/:id', requireAuth(['admin']), (req, res) => {
  const { name, groupId, parentId } = req.body;
  const result = withData((data) => {
    const s = data.students.find((x) => x.id === req.params.id);
    if (!s) return { error: 'Topilmadi' };
    if (name) s.name = name;
    if (groupId !== undefined) s.groupId = groupId;
    if (parentId !== undefined) s.parentId = parentId;
    return { student: s };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result.student);
});

app.delete('/api/students/:id', requireAuth(['admin']), (req, res) => {
  withData((data) => {
    data.students = data.students.filter((s) => s.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ============ OTA-ONALAR ============

app.get('/api/parents', requireAuth(['admin']), (req, res) => {
  const data = load();
  const enriched = data.parents.map((p) => ({
    ...p,
    children: data.students.filter((s) => s.parentId === p.id).map((s) => s.name),
    linked: !!p.telegramId
  }));
  res.json(enriched);
});

app.post('/api/parents', requireAuth(['admin']), (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Ism shart' });
  const parent = withData((data) => {
    const p = { id: genId('parent'), name, phone: phone || '', telegramId: null, linkCode: genLinkCode() };
    data.parents.push(p);
    return p;
  });
  res.json(parent);
});

app.post('/api/parents/:id/regenerate-code', requireAuth(['admin']), (req, res) => {
  const result = withData((data) => {
    const p = data.parents.find((x) => x.id === req.params.id);
    if (!p) return { error: 'Topilmadi' };
    p.linkCode = genLinkCode();
    p.telegramId = null; // eski bog'lanish bekor qilinadi
    return { parent: p };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result.parent);
});

app.delete('/api/parents/:id', requireAuth(['admin']), (req, res) => {
  withData((data) => {
    data.parents = data.parents.filter((p) => p.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ============ DARSLAR + BAHOLASH (o'qituvchi) ============

app.get('/api/lessons', requireAuth(['admin', 'teacher']), (req, res) => {
  const data = load();
  let lessons = data.lessons;
  if (req.session.role === 'teacher') {
    const myGroupIds = data.groups.filter((g) => g.teacherId === req.session.id).map((g) => g.id);
    lessons = lessons.filter((l) => myGroupIds.includes(l.groupId));
  }
  if (req.query.groupId) lessons = lessons.filter((l) => l.groupId === req.query.groupId);
  res.json(lessons.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

// Yangi dars ochish
app.post('/api/lessons', requireAuth(['admin', 'teacher']), (req, res) => {
  const { groupId, date, topic } = req.body;
  if (!groupId || !date) return res.status(400).json({ error: 'Guruh va sana shart' });
  const lesson = withData((data) => {
    const l = { id: genId('lesson'), groupId, date, topic: topic || '', status: 'open' };
    data.lessons.push(l);
    return l;
  });
  res.json(lesson);
});

// Darsni yopish: davomat + baho + izohlarni bir vaqtda saqlash
// body: { entries: [{ studentId, attendance: 'present'|'absent'|'late', score, comment }] }
app.post('/api/lessons/:id/close', requireAuth(['admin', 'teacher']), (req, res) => {
  const { entries } = req.body;
  const result = withData((data) => {
    const lesson = data.lessons.find((l) => l.id === req.params.id);
    if (!lesson) return { error: 'Dars topilmadi' };

    (entries || []).forEach((e) => {
      data.attendance.push({
        id: genId('att'),
        lessonId: lesson.id,
        studentId: e.studentId,
        status: e.attendance || 'present'
      });
      if (e.score !== undefined && e.score !== null && e.score !== '') {
        data.grades.push({
          id: genId('grade'),
          lessonId: lesson.id,
          studentId: e.studentId,
          score: e.score,
          comment: e.comment || ''
        });
      }
    });
    lesson.status = 'closed';
    return { lesson };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result.lesson);
});

// ============ STATISTIKA (admin) ============

app.get('/api/stats/overview', requireAuth(['admin']), (req, res) => {
  const data = load();
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    totalStudents: data.students.length,
    totalTeachers: data.teachers.length,
    totalGroups: data.groups.length,
    totalParentsLinked: data.parents.filter((p) => p.telegramId).length,
    totalParents: data.parents.length,
    lessonsToday: data.lessons.filter((l) => l.date === today).length,
    lessonsClosedToday: data.lessons.filter((l) => l.date === today && l.status === 'closed').length
  });
});

app.get('/api/stats/student/:id', requireAuth(['admin', 'teacher']), (req, res) => {
  const data = load();
  const studentId = req.params.id;
  const grades = data.grades.filter((g) => g.studentId === studentId).map((g) => {
    const lesson = data.lessons.find((l) => l.id === g.lessonId);
    return { ...g, date: lesson ? lesson.date : null, topic: lesson ? lesson.topic : null };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const attendance = data.attendance.filter((a) => a.studentId === studentId).map((a) => {
    const lesson = data.lessons.find((l) => l.id === a.lessonId);
    return { ...a, date: lesson ? lesson.date : null };
  });

  const attendanceRate = attendance.length
    ? Math.round((attendance.filter((a) => a.status === 'present').length / attendance.length) * 100)
    : null;

  res.json({ grades, attendance, attendanceRate });
});

app.get('/api/stats/teachers', requireAuth(['admin']), (req, res) => {
  const data = load();
  const stats = data.teachers.map((t) => {
    const groupIds = data.groups.filter((g) => g.teacherId === t.id).map((g) => g.id);
    const lessons = data.lessons.filter((l) => groupIds.includes(l.groupId));
    const closed = lessons.filter((l) => l.status === 'closed').length;
    const open = lessons.filter((l) => l.status === 'open').length;
    return { id: t.id, name: t.name, totalLessons: lessons.length, closed, openNotGraded: open };
  });
  res.json(stats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
});

module.exports = app;
