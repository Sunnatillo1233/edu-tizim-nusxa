// ============================================================
// UMUMIY HOLAT VA YORDAMCHI FUNKSIYALAR
// ============================================================
let TOKEN = localStorage.getItem('token') || null;
let ROLE = localStorage.getItem('role') || null;
let USER_NAME = localStorage.getItem('userName') || '';
let TEACHER_ID = localStorage.getItem('teacherId') || null;

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}

function fmtDate(d) {
  if (!d) return '-';
  return d;
}

// ============================================================
// LOGIN
// ============================================================
const loginScreen = document.getElementById('loginScreen');
const appEl = document.getElementById('app');

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const data = await api('/login', 'POST', { username, password });
    TOKEN = data.token;
    ROLE = data.role;
    USER_NAME = data.name;
    TEACHER_ID = data.teacherId || null;
    localStorage.setItem('token', TOKEN);
    localStorage.setItem('role', ROLE);
    localStorage.setItem('userName', USER_NAME);
    if (TEACHER_ID) localStorage.setItem('teacherId', TEACHER_ID);
    enterApp();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  location.reload();
});

function enterApp() {
  loginScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  document.getElementById('userName').textContent = `${USER_NAME} (${ROLE === 'admin' ? 'Admin' : "O'qituvchi"})`;
  if (ROLE !== 'admin') {
    document.querySelectorAll('.admin-only').forEach((b) => b.classList.add('hidden'));
  }
  goToPage('dashboard');
}

if (TOKEN) enterApp();

// ============================================================
// NAVIGATSIYA
// ============================================================
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => goToPage(btn.dataset.page));
});

function goToPage(page) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach((p) => p.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');
  const renderers = {
    dashboard: renderDashboard,
    groups: renderGroups,
    students: renderStudents,
    teachers: renderTeachers,
    parents: renderParents,
    lessons: renderLessons,
    stats: renderStats
  };
  renderers[page]();
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  const container = document.getElementById('page-dashboard');
  container.innerHTML = `<h1 class="page-title">🏠 Bosh sahifa</h1><div id="dashStats" class="stat-grid">Yuklanmoqda...</div>`;
  if (ROLE !== 'admin') {
    container.querySelector('#dashStats').innerHTML = `<div class="card">Xush kelibsiz, ${USER_NAME}! Chap menyudan guruhlaringiz va darslaringizni boshqaring.</div>`;
    return;
  }
  try {
    const s = await api('/stats/overview');
    container.querySelector('#dashStats').innerHTML = `
      ${statCard(s.totalStudents, "O'quvchilar")}
      ${statCard(s.totalTeachers, "O'qituvchilar")}
      ${statCard(s.totalGroups, 'Guruhlar')}
      ${statCard(s.totalParentsLinked + '/' + s.totalParents, "Bog'langan ota-onalar")}
      ${statCard(s.lessonsClosedToday + '/' + s.lessonsToday, 'Bugungi baholangan darslar')}
    `;
  } catch (e) {
    container.querySelector('#dashStats').innerHTML = `<div class="card">Xatolik: ${e.message}</div>`;
  }
}

function statCard(num, label) {
  return `<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

// ============================================================
// GURUHLAR
// ============================================================
async function renderGroups() {
  const container = document.getElementById('page-groups');
  const teachers = ROLE === 'admin' ? await api('/teachers') : [];
  const groups = await api('/groups');

  container.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">👥 Guruhlar</h1>
      ${ROLE === 'admin' ? '<button class="btn" id="addGroupBtn">+ Yangi guruh</button>' : ''}
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Nomi</th><th>Sinf</th><th>O'qituvchi</th><th>O'quvchilar</th>${ROLE === 'admin' ? '<th></th>' : ''}</tr></thead>
        <tbody>
          ${groups.map((g) => `
            <tr>
              <td>${g.name}</td>
              <td>${g.gradeLevel}-sinf</td>
              <td>${g.teacherName || '<span class="badge gray">Belgilanmagan</span>'}</td>
              <td>${g.studentCount}</td>
              ${ROLE === 'admin' ? `<td><button class="btn small danger" onclick="deleteGroup('${g.id}')">O'chirish</button></td>` : ''}
            </tr>`).join('') || `<tr><td colspan="5">Hozircha guruh yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  if (ROLE === 'admin') {
    document.getElementById('addGroupBtn').addEventListener('click', () => openGroupModal(teachers));
  }
}

function openGroupModal(teachers) {
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>Yangi guruh qo'shish</h3>
        <div class="form-row"><input id="gName" placeholder="Guruh nomi (masalan: 2-A)"></div>
        <div class="form-row">
          <select id="gGrade">
            <option value="1">1-sinf</option>
            <option value="2">2-sinf</option>
            <option value="3">3-sinf</option>
            <option value="4">4-sinf</option>
          </select>
          <select id="gTeacher">
            <option value="">O'qituvchi tanlanmagan</option>
            ${teachers.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Saqlash</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const name = modal.querySelector('#gName').value.trim();
    const gradeLevel = modal.querySelector('#gGrade').value;
    const teacherId = modal.querySelector('#gTeacher').value || null;
    if (!name) return alert('Guruh nomini kiriting');
    await api('/groups', 'POST', { name, gradeLevel, teacherId });
    modal.remove();
    renderGroups();
  };
}

async function deleteGroup(id) {
  if (!confirm("Guruhni o'chirishni tasdiqlaysizmi?")) return;
  await api('/groups/' + id, 'DELETE');
  renderGroups();
}

// ============================================================
// O'QUVCHILAR
// ============================================================
async function renderStudents() {
  const container = document.getElementById('page-students');
  const [students, groups, parents] = await Promise.all([
    api('/students'),
    api('/groups'),
    ROLE === 'admin' ? api('/parents') : Promise.resolve([])
  ]);

  container.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">🧑‍🎓 O'quvchilar</h1>
      ${ROLE === 'admin' ? '<button class="btn" id="addStudentBtn">+ Yangi o\'quvchi</button>' : ''}
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Ism</th><th>Guruh</th><th>Ota-ona</th>${ROLE === 'admin' ? '<th></th>' : '<th>Statistika</th>'}</tr></thead>
        <tbody>
          ${students.map((s) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.groupName || '-'}</td>
              <td>${s.parentName || '<span class="badge gray">Bog\'lanmagan</span>'}</td>
              <td>
                <button class="btn small secondary" onclick="showStudentStats('${s.id}','${s.name.replace(/'/g, "")}')">📊 Ko'rish</button>
                ${ROLE === 'admin' ? `<button class="btn small danger" onclick="deleteStudent('${s.id}')">O'chirish</button>` : ''}
              </td>
            </tr>`).join('') || `<tr><td colspan="4">Hozircha o'quvchi yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  if (ROLE === 'admin') {
    document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal(groups, parents));
  }
}

function openStudentModal(groups, parents) {
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>Yangi o'quvchi qo'shish</h3>
        <div class="form-row"><input id="sName" placeholder="O'quvchi to'liq ismi"></div>
        <div class="form-row">
          <select id="sGroup">
            <option value="">Guruh tanlanmagan</option>
            ${groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join('')}
          </select>
          <select id="sParent">
            <option value="">Ota-ona tanlanmagan</option>
            ${parents.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Saqlash</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const name = modal.querySelector('#sName').value.trim();
    const groupId = modal.querySelector('#sGroup').value || null;
    const parentId = modal.querySelector('#sParent').value || null;
    if (!name) return alert('Ismni kiriting');
    await api('/students', 'POST', { name, groupId, parentId });
    modal.remove();
    renderStudents();
  };
}

async function deleteStudent(id) {
  if (!confirm("O'quvchini o'chirishni tasdiqlaysizmi?")) return;
  await api('/students/' + id, 'DELETE');
  renderStudents();
}

async function showStudentStats(id, name) {
  const s = await api('/stats/student/' + id);
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>📊 ${name} — statistika</h3>
        <p><b>Davomat foizi:</b> ${s.attendanceRate !== null ? s.attendanceRate + '%' : "Ma'lumot yo'q"}</p>
        <h4>Baholar tarixi</h4>
        <table>
          <thead><tr><th>Sana</th><th>Mavzu</th><th>Baho</th><th>Izoh</th></tr></thead>
          <tbody>
            ${s.grades.map((g) => `<tr><td>${g.date || '-'}</td><td>${g.topic || '-'}</td><td>${g.score}</td><td>${g.comment || '-'}</td></tr>`).join('') || '<tr><td colspan="4">Baho yozuvi yo\'q</td></tr>'}
          </tbody>
        </table>
        <div class="form-row" style="justify-content:flex-end; margin-top:14px;">
          <button class="btn secondary" id="closeBtn">Yopish</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#closeBtn').onclick = () => modal.remove();
}

// ============================================================
// O'QITUVCHILAR (faqat admin)
// ============================================================
async function renderTeachers() {
  const container = document.getElementById('page-teachers');
  const teachers = await api('/teachers');
  container.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">🧑‍🏫 O'qituvchilar</h1>
      <button class="btn" id="addTeacherBtn">+ Yangi o'qituvchi</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Ism</th><th>Login</th><th></th></tr></thead>
        <tbody>
          ${teachers.map((t) => `
            <tr>
              <td>${t.name}</td>
              <td>${t.username}</td>
              <td><button class="btn small danger" onclick="deleteTeacher('${t.id}')">O'chirish</button></td>
            </tr>`).join('') || `<tr><td colspan="3">Hozircha o'qituvchi yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addTeacherBtn').addEventListener('click', openTeacherModal);
}

function openTeacherModal() {
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>Yangi o'qituvchi qo'shish</h3>
        <div class="form-row"><input id="tName" placeholder="To'liq ism"></div>
        <div class="form-row"><input id="tUsername" placeholder="Login (masalan: malika_teacher)"></div>
        <div class="form-row"><input id="tPassword" type="text" placeholder="Vaqtinchalik parol"></div>
        <div class="form-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Saqlash</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const name = modal.querySelector('#tName').value.trim();
    const username = modal.querySelector('#tUsername').value.trim();
    const password = modal.querySelector('#tPassword').value;
    if (!name || !username || !password) return alert("Barcha maydonlarni to'ldiring");
    try {
      await api('/teachers', 'POST', { name, username, password });
      modal.remove();
      renderTeachers();
    } catch (e) {
      alert(e.message);
    }
  };
}

async function deleteTeacher(id) {
  if (!confirm("O'qituvchini o'chirishni tasdiqlaysizmi?")) return;
  await api('/teachers/' + id, 'DELETE');
  renderTeachers();
}

// ============================================================
// OTA-ONALAR (faqat admin)
// ============================================================
async function renderParents() {
  const container = document.getElementById('page-parents');
  const parents = await api('/parents');
  container.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">👪 Ota-onalar</h1>
      <button class="btn" id="addParentBtn">+ Yangi ota-ona</button>
    </div>
    <div class="card">
      <p style="color:#6b7280; font-size:13px; margin-top:0;">
        Ota-ona Telegram botga <b>${window.__BOT_USERNAME || '@your_bot'}</b> kirib, quyidagi 6 xonali kodni yuborishi orqali farzandiga bog'lanadi.
      </p>
      <table>
        <thead><tr><th>Ism</th><th>Telefon</th><th>Farzandlari</th><th>Bog'lanish kodi</th><th>Holati</th><th></th></tr></thead>
        <tbody>
          ${parents.map((p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.phone || '-'}</td>
              <td>${p.children.join(', ') || '-'}</td>
              <td><span class="link-code">${p.linkCode}</span></td>
              <td>${p.linked ? '<span class="badge green">Bog\'langan</span>' : '<span class="badge yellow">Kutilmoqda</span>'}</td>
              <td>
                <button class="btn small secondary" onclick="regenerateCode('${p.id}')">Yangi kod</button>
                <button class="btn small danger" onclick="deleteParent('${p.id}')">O'chirish</button>
              </td>
            </tr>`).join('') || `<tr><td colspan="6">Hozircha ota-ona yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addParentBtn').addEventListener('click', openParentModal);
}

function openParentModal() {
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>Yangi ota-ona qo'shish</h3>
        <div class="form-row"><input id="pName" placeholder="To'liq ism"></div>
        <div class="form-row"><input id="pPhone" placeholder="Telefon raqami"></div>
        <div class="form-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Saqlash</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const name = modal.querySelector('#pName').value.trim();
    const phone = modal.querySelector('#pPhone').value.trim();
    if (!name) return alert('Ismni kiriting');
    await api('/parents', 'POST', { name, phone });
    modal.remove();
    renderParents();
  };
}

async function regenerateCode(id) {
  if (!confirm("Yangi kod yaratilsa, eski Telegram bog'lanishi bekor bo'ladi. Davom etasizmi?")) return;
  await api('/parents/' + id + '/regenerate-code', 'POST');
  renderParents();
}

async function deleteParent(id) {
  if (!confirm("Ota-onani o'chirishni tasdiqlaysizmi?")) return;
  await api('/parents/' + id, 'DELETE');
  renderParents();
}

// ============================================================
// DARSLAR + BAHOLASH
// ============================================================
async function renderLessons() {
  const container = document.getElementById('page-lessons');
  const groups = await api('/groups');
  const lessons = await api('/lessons');

  container.innerHTML = `
    <div class="flex-between">
      <h1 class="page-title">📅 Darslar</h1>
      <button class="btn" id="addLessonBtn">+ Yangi dars ochish</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Sana</th><th>Guruh</th><th>Mavzu</th><th>Holati</th><th></th></tr></thead>
        <tbody>
          ${lessons.map((l) => {
            const g = groups.find((x) => x.id === l.groupId);
            return `
            <tr>
              <td>${l.date}</td>
              <td>${g ? g.name : '-'}</td>
              <td>${l.topic || '-'}</td>
              <td>${l.status === 'closed' ? '<span class="badge green">Baholangan</span>' : '<span class="badge yellow">Baholanmagan</span>'}</td>
              <td>${l.status === 'open' ? `<button class="btn small" onclick="openGradeModal('${l.id}','${l.groupId}')">✍️ Baholash</button>` : '<span style="color:#6b7280; font-size:12px;">Yopilgan</span>'}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="5">Hozircha dars yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('addLessonBtn').addEventListener('click', () => openLessonModal(groups));
}

function openLessonModal(groups) {
  const today = new Date().toISOString().slice(0, 10);
  const modal = el(`
    <div class="modal-bg">
      <div class="modal">
        <h3>Yangi dars ochish</h3>
        <div class="form-row">
          <select id="lGroup">
            ${groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join('') || '<option value="">Guruh yo\'q</option>'}
          </select>
          <input id="lDate" type="date" value="${today}">
        </div>
        <div class="form-row"><input id="lTopic" placeholder="Dars mavzusi (ixtiyoriy)"></div>
        <div class="form-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Ochish</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const groupId = modal.querySelector('#lGroup').value;
    const date = modal.querySelector('#lDate').value;
    const topic = modal.querySelector('#lTopic').value.trim();
    if (!groupId || !date) return alert('Guruh va sanani tanlang');
    await api('/lessons', 'POST', { groupId, date, topic });
    modal.remove();
    renderLessons();
  };
}

async function openGradeModal(lessonId, groupId) {
  const students = await api('/students?groupId=' + groupId);
  const modal = el(`
    <div class="modal-bg">
      <div class="modal" style="width:640px;">
        <h3>✍️ Darsni baholash</h3>
        <table>
          <thead><tr><th>O'quvchi</th><th>Davomat</th><th>Baho</th><th>Izoh</th></tr></thead>
          <tbody id="gradeRows">
            ${students.map((s) => `
              <tr data-student="${s.id}">
                <td>${s.name}</td>
                <td>
                  <select class="attSelect">
                    <option value="present">✅ Keldi</option>
                    <option value="late">⏰ Kech qoldi</option>
                    <option value="absent">❌ Kelmadi</option>
                  </select>
                </td>
                <td><input class="scoreInput" type="text" placeholder="baho" style="width:70px;"></td>
                <td><input class="commentInput" type="text" placeholder="izoh (ixtiyoriy)" style="width:150px;"></td>
              </tr>`).join('') || '<tr><td colspan="4">Bu guruhda o\'quvchi yo\'q</td></tr>'}
          </tbody>
        </table>
        <div class="form-row" style="justify-content:flex-end; margin-top:14px;">
          <button class="btn secondary" id="cancelBtn">Bekor qilish</button>
          <button class="btn" id="saveBtn">Darsni yakunlash va saqlash</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#saveBtn').onclick = async () => {
    const rows = modal.querySelectorAll('#gradeRows tr[data-student]');
    const entries = Array.from(rows).map((row) => ({
      studentId: row.dataset.student,
      attendance: row.querySelector('.attSelect').value,
      score: row.querySelector('.scoreInput').value.trim(),
      comment: row.querySelector('.commentInput').value.trim()
    }));
    await api(`/lessons/${lessonId}/close`, 'POST', { entries });
    modal.remove();
    renderLessons();
  };
}

// ============================================================
// STATISTIKA (admin)
// ============================================================
async function renderStats() {
  const container = document.getElementById('page-stats');
  const teacherStats = await api('/stats/teachers');
  container.innerHTML = `
    <h1 class="page-title">📊 Statistika</h1>
    <div class="card">
      <h3 style="margin-top:0;">O'qituvchilar faolligi</h3>
      <table>
        <thead><tr><th>O'qituvchi</th><th>Jami darslar</th><th>Baholangan</th><th>Baholanmagan</th></tr></thead>
        <tbody>
          ${teacherStats.map((t) => `
            <tr>
              <td>${t.name}</td>
              <td>${t.totalLessons}</td>
              <td><span class="badge green">${t.closed}</span></td>
              <td>${t.openNotGraded > 0 ? `<span class="badge red">${t.openNotGraded}</span>` : '<span class="badge gray">0</span>'}</td>
            </tr>`).join('') || `<tr><td colspan="4">Ma'lumot yo'q</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
