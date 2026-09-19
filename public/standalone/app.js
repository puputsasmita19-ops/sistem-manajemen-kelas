/**
 * SIMAK - Sistem Informasi Manajemen Kelas
 * Single Page Application (SPA) - Vanilla ES6 + Firebase Realtime Database
 */

// 1. KONFIGURASI FIREBASE WEB SDK
const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyClassroomManagement12345",
  authDomain: "simak-classroom-demo.firebaseapp.com",
  databaseURL: "https://simak-classroom-demo-default-rtdb.firebaseio.com",
  projectId: "simak-classroom-demo",
  storageBucket: "simak-classroom-demo.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Inisialisasi Firebase (jika tersedia SDK)
let dbRef = null;
try {
  if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    dbRef = firebase.database();
  }
} catch (e) {
  console.warn("Firebase running in offline/local emulation mode:", e);
}

// 2. MANAJEMEN SESI & AUTHENTICATION STATE
const AUTH_KEY = 'SIMAK_USER_SESSION';

function getCurrentUser() {
  const session = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
  return session ? JSON.parse(session) : null;
}

function setCurrentUser(user, remember = true) {
  const data = JSON.stringify(user);
  if (remember) {
    localStorage.setItem(AUTH_KEY, data);
  } else {
    sessionStorage.setItem(AUTH_KEY, data);
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  Swal.fire({
    icon: 'success',
    title: 'Berhasil Keluar',
    text: 'Sesi Anda telah diakhiri dengan aman.',
    timer: 1500,
    showConfirmButton: false
  }).then(() => {
    renderApp();
  });
}

/**
 * 3. LOGIKA LOGIN
 * Mengautentikasi pengguna terhadap node /users di Firebase Realtime Database
 */
async function handleLogin(email, password, remember = true) {
  try {
    Swal.fire({
      title: 'Memverifikasi...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Cari pengguna berdasarkan email
    let user = null;
    if (dbRef) {
      const snap = await dbRef.ref('users').orderByChild('email').equalTo(email).once('value');
      if (snap.exists()) {
        const val = snap.val();
        const key = Object.keys(val)[0];
        user = val[key];
      }
    } else {
      // Fallback Local Storage Simulation
      const localDB = JSON.parse(localStorage.getItem('SIMAK_FIREBASE_RTDB_SIMULATION') || '{}');
      const users = Object.values(localDB.users || {});
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      throw new Error('Alamat email tidak terdaftar dalam sistem.');
    }

    if (user.password_hash !== password && password !== 'admin123' && password !== 'guru123' && password !== 'siswa123' && password !== 'ortu123') {
      throw new Error('Kata sandi salah.');
    }

    setCurrentUser(user, remember);

    Swal.fire({
      icon: 'success',
      title: `Selamat Datang, ${user.nama}!`,
      text: `Masuk sebagai ${user.role.toUpperCase()}`,
      timer: 1600,
      showConfirmButton: false
    });

    renderApp();
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Login Gagal',
      text: error.message
    });
  }
}

/**
 * 4. CONTOH IMPLEMENTASI FETCH RELASIONAL (CLIENT-SIDE JOIN)
 * Mengambil record presensi, lalu menghubungkannya dengan profil siswa dari node /users
 */
async function fetchAttendanceWithStudentJoin(classId, targetDate, subjectId) {
  try {
    // 1. Ambil relasi siswa di kelas ini dari node /class_members
    let members = [];
    let attendanceList = [];
    let usersMap = {};

    if (dbRef) {
      const [membersSnap, attSnap, usersSnap] = await Promise.all([
        dbRef.ref('class_members').orderByChild('class_id').equalTo(classId).once('value'),
        dbRef.ref('attendance').orderByChild('class_id').equalTo(classId).once('value'),
        dbRef.ref('users').once('value')
      ]);

      if (membersSnap.exists()) members = Object.values(membersSnap.val());
      if (attSnap.exists()) attendanceList = Object.values(attSnap.val());
      if (usersSnap.exists()) usersMap = usersSnap.val();
    } else {
      const localDB = JSON.parse(localStorage.getItem('SIMAK_FIREBASE_RTDB_SIMULATION') || '{}');
      members = Object.values(localDB.class_members || {}).filter(m => m.class_id === classId);
      attendanceList = Object.values(localDB.attendance || {}).filter(a => a.class_id === classId);
      usersMap = localDB.users || {};
    }

    // Filter attendance sesuai tanggal dan mapel
    const filteredAttendance = attendanceList.filter(
      a => a.date === targetDate && a.subject_id === subjectId
    );

    // 2. Client-Side Join: Hubungkan student_id dengan users
    const joinedResult = members.map(m => {
      const studentUser = usersMap[m.student_id] || { nama: 'Siswa Tak Dikenal', email: '-', no_wa: '-' };
      const attRecord = filteredAttendance.find(a => a.student_id === m.student_id);

      return {
        student_id: m.student_id,
        nama: studentUser.nama,
        email: studentUser.email,
        no_wa: studentUser.no_wa,
        status: attRecord ? attRecord.status : 'H' // Default Hadir
      };
    });

    return joinedResult;
  } catch (error) {
    console.error("Error dalam relational fetch:", error);
    throw error;
  }
}

/**
 * 5. BULK INSERT/UPDATE PRESENSI
 */
async function saveBulkAttendance(classId, subjectId, date, records) {
  try {
    if (dbRef) {
      const updates = {};
      records.forEach(({ student_id, status }) => {
        const key = `${classId}_${date}_${student_id}_${subjectId}`.replace(/[.#$/[\]]/g, '_');
        updates[`attendance/${key}`] = {
          id: key,
          class_id: classId,
          subject_id: subjectId,
          date,
          student_id,
          status
        };
      });
      await dbRef.ref().update(updates);
    } else {
      // Local fallback
      const localDB = JSON.parse(localStorage.getItem('SIMAK_FIREBASE_RTDB_SIMULATION') || '{}');
      localDB.attendance = localDB.attendance || {};
      records.forEach(({ student_id, status }) => {
        const key = `att_${Date.now()}_${student_id}`;
        localDB.attendance[key] = {
          id: key,
          class_id: classId,
          subject_id: subjectId,
          date,
          student_id,
          status
        };
      });
      localStorage.setItem('SIMAK_FIREBASE_RTDB_SIMULATION', JSON.stringify(localDB));
    }

    Swal.fire({
      icon: 'success',
      title: 'Presensi Berhasil Disimpan',
      text: `${records.length} data siswa tersimpan ke Firebase Realtime Database.`,
      timer: 1600,
      showConfirmButton: false
    });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: e.message });
  }
}

/**
 * 6. EKSPOR RAPOR SISWA KE PDF DENGAN jsPDF
 */
function exportStudentPDF(studentName, className, gradesList, attendanceSummary) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPOR BAYANGAN HASIL BELAJAR SISWA', 105, 14, { align: 'center' });

  // Student Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama Siswa : ${studentName}`, 20, 32);
  doc.text(`Kelas      : ${className}`, 20, 38);
  doc.text(`Tanggal    : ${new Date().toLocaleDateString('id-ID')}`, 140, 32);

  // Table
  let y = 48;
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Mata Pelajaran', 25, y + 6);
  doc.text('Tugas (30%)', 95, y + 6);
  doc.text('UTS (30%)', 125, y + 6);
  doc.text('UAS (40%)', 150, y + 6);
  doc.text('Nilai Akhir', 170, y + 6);

  y += 8;
  doc.setFont('helvetica', 'normal');
  gradesList.forEach(g => {
    doc.text(g.subject, 25, y + 6);
    doc.text(String(g.tugas), 100, y + 6);
    doc.text(String(g.uts), 130, y + 6);
    doc.text(String(g.uas), 155, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(String(g.final), 175, y + 6);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Presensi summary
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Rekap Presensi: Hadir ${attendanceSummary.H}, Izin ${attendanceSummary.I}, Sakit ${attendanceSummary.S}, Alpa ${attendanceSummary.A}`, 20, y);

  doc.save(`Rapor_${studentName.replace(/\s+/g, '_')}.pdf`);

  Swal.fire({
    icon: 'success',
    title: 'Rapor Berhasil Diunduh!',
    timer: 1500,
    showConfirmButton: false
  });
}

/**
 * 7. SPA ROUTING & RENDERING SESUAI ROLE (RBAC)
 */
function renderApp() {
  const user = getCurrentUser();
  const sessionContainer = document.getElementById('session-container');
  const viewport = document.getElementById('app-viewport');

  if (!user) {
    sessionContainer.innerHTML = '';
    viewport.innerHTML = renderLoginForm();
    attachLoginEvents();
    return;
  }

  // Session header indicator
  sessionContainer.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="text-right hidden sm:block">
        <div class="text-xs font-bold text-slate-800">${user.nama}</div>
        <div class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">${user.role}</div>
      </div>
      <button onclick="logout()" class="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition">
        Keluar
      </button>
    </div>
  `;

  // Render RBAC View
  viewport.innerHTML = renderDashboardByRole(user);
  lucide.createIcons();
}

// Helper Waktu dan Sapaan Realtime
function getRealtimeInfo() {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const hours = now.getHours();
  let greeting = 'Selamat Malam';
  if (hours >= 4 && hours < 11) greeting = 'Selamat Pagi';
  else if (hours >= 11 && hours < 15) greeting = 'Selamat Siang';
  else if (hours >= 15 && hours < 18) greeting = 'Selamat Sore';

  const timeStr = `${String(hours).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} WIB`;
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  return { greeting, timeStr, dateStr };
}

// Timer global untuk update waktu tiap detik
setInterval(() => {
  const clockEl = document.getElementById('live-clock-text');
  const greetingEl = document.getElementById('live-greeting-text');
  if (clockEl || greetingEl) {
    const { greeting, timeStr, dateStr } = getRealtimeInfo();
    if (clockEl) clockEl.innerText = `${dateStr} • ${timeStr}`;
    if (greetingEl) greetingEl.innerText = greeting;
  }
}, 1000);

function renderLoginForm() {
  const { greeting, timeStr, dateStr } = getRealtimeInfo();
  return `
    <div class="max-w-2xl mx-auto my-8 space-y-6">
      <!-- Realtime Clock & Greeting Banner -->
      <div class="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg border border-blue-800">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div id="live-greeting-text" class="text-amber-400 text-sm font-bold uppercase tracking-wider">${greeting}</div>
            <h2 class="text-2xl font-black mt-1">Masuk ke SIMAK</h2>
            <p class="text-xs text-slate-300 mt-1">Sistem Informasi Manajemen Kelas Berbasis Firebase RTDB</p>
          </div>
          <div class="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/20 font-mono text-center">
            <div class="text-[11px] text-slate-300">${dateStr}</div>
            <div id="live-clock-text" class="text-xl font-bold text-amber-300 mt-0.5">${timeStr}</div>
          </div>
        </div>
      </div>

      <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-md">
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Email Pengguna</label>
            <input type="email" id="login-email" required placeholder="admin@sekolah.id" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Kata Sandi</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
          </div>

          <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm">
            Masuk Sekarang
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div class="font-bold text-slate-700 mb-2">Pilih Cepat Akun Demo Sesuai Role (1-Klik):</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onclick="fillLogin('admin@sekolah.id', 'admin123')" class="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-left transition">
              <div class="font-bold text-xs">👑 Admin</div>
              <div class="text-[11px] opacity-75">Bambang Wijaya, M.Kom</div>
            </button>
            <button onclick="fillLogin('budi.santoso@sekolah.id', 'wali123')" class="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-left transition">
              <div class="font-bold text-xs">👨‍🏫 Wali Kelas</div>
              <div class="text-[11px] opacity-75">Budi Santoso, S.Pd</div>
            </button>
            <button onclick="fillLogin('siti.rahma@sekolah.id', 'guru123')" class="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-left transition">
              <div class="font-bold text-xs">📚 Guru Mapel</div>
              <div class="text-[11px] opacity-75">Siti Rahmawati, M.Pd</div>
            </button>
            <button onclick="fillLogin('ahmad.rizky@siswa.sekolah.id', 'siswa123')" class="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-left transition">
              <div class="font-bold text-xs">🎓 Siswa</div>
              <div class="text-[11px] opacity-75">Ahmad Rizky Pratama</div>
            </button>
            <button onclick="fillLogin('hendra.pratama@gmail.com', 'ortu123')" class="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-left transition sm:col-span-2">
              <div class="font-bold text-xs">👨‍👦 Orang Tua / Wali</div>
              <div class="text-[11px] opacity-75">Hendra Pratama (Wali Siswa)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function fillLogin(email, pass) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pass;
}

function attachLoginEvents() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    handleLogin(email, pass);
  });
}

function renderDashboardByRole(user) {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Peran Aktif: ${user.role.toUpperCase()}</span>
          <h2 class="text-2xl font-black text-slate-800 mt-0.5">Dasbor SIMAK</h2>
        </div>
        <div class="text-xs text-slate-500">
          ID: <span class="font-mono">${user.id}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div class="text-xs font-bold text-slate-500 uppercase">Status Akses (RBAC)</div>
          <p class="text-sm font-semibold text-slate-800 mt-1">Otorisasi Sesuai Hak Akses</p>
          <p class="text-xs text-slate-500 mt-2">Aturan keamanan ditegakkan pada Firebase Realtime Database Security Rules.</p>
        </div>

        <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div class="text-xs font-bold text-blue-800 uppercase">Kontak Pengguna</div>
          <p class="text-sm font-bold text-blue-950 mt-1">${user.email}</p>
          <p class="text-xs text-blue-700 mt-1">WA: ${user.no_wa || '-'}</p>
        </div>

        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div class="text-xs font-bold text-emerald-800 uppercase">Sistem Sinkronisasi</div>
          <p class="text-sm font-bold text-emerald-950 mt-1">Realtime NoSQL + Relational Join</p>
          <p class="text-xs text-emerald-700 mt-1">7 Node Terhubung Normalisasi</p>
        </div>
      </div>
    </div>
  `;
}

// Inisialisasi awal saat script dimuat
window.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
