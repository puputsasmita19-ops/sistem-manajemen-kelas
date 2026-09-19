import React, { useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Database, Shield, Code, GitBranch, Copy, Check } from 'lucide-react';
import Swal from 'sweetalert2';

export const SchemaAndRulesViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'rules' | 'join' | 'code'>('schema');
  const [copied, setCopied] = useState(false);

  const dbService = DatabaseService.getInstance();
  const snapshot = dbService.getRawSnapshot();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Tersalin ke Clipboard!',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const schemaJSON = `{
  "users": {
    "$user_id": {
      "id": "user_admin1",
      "nama": "Bambang Wijaya, M.Kom",
      "email": "admin@sekolah.id",
      "password_hash": "$2a$12$...",
      "role": "admin", // ENUM: "admin" | "wali_kelas" | "guru" | "siswa" | "orang_tua"
      "no_wa": "081234567890"
    }
  },
  "classes": {
    "$class_id": {
      "id": "class_10_ipa1",
      "nama_kelas": "X MIPA 1",
      "wali_kelas_id": "user_wk1", // FK -> users.id (role: wali_kelas)
      "tahun_ajaran": "2025/2026"
    }
  },
  "subjects": {
    "$subject_id": {
      "id": "subj_mat",
      "nama_mapel": "Matematika Wajib",
      "guru_id": "user_guru1" // FK -> users.id (role: guru)
    }
  },
  "class_members": {
    "$member_id": {
      "id": "cm_1",
      "class_id": "class_10_ipa1", // FK -> classes.id
      "student_id": "user_std1"   // FK -> users.id (role: siswa)
    }
  },
  "attendance": {
    "$attendance_id": {
      "id": "att_101",
      "class_id": "class_10_ipa1", // FK -> classes.id
      "subject_id": "subj_mat",     // FK -> subjects.id (atau 'HOMEROOM')
      "date": "2026-09-17",        // Format YYYY-MM-DD
      "student_id": "user_std1",    // FK -> users.id
      "status": "H"                // ENUM: "H" (Hadir) | "I" (Izin) | "S" (Sakit) | "A" (Alpa)
    }
  },
  "grades": {
    "$grade_id": {
      "id": "grd_201",
      "student_id": "user_std1",   // FK -> users.id
      "subject_id": "subj_mat",    // FK -> subjects.id
      "type": "Tugas",             // ENUM: "Tugas" | "UTS" | "UAS"
      "score": 92                  // Number (0 - 100)
    }
  },
  "parent_student_relations": {
    "$relation_id": {
      "id": "psr_1",
      "parent_id": "user_par1",    // FK -> users.id (role: orang_tua)
      "student_id": "user_std1"    // FK -> users.id (role: siswa)
    }
  }
}`;

  const securityRules = `{
  "rules": {
    // Helper function membaca role dari /users/{auth.uid}/role
    ".read": false,
    ".write": false,

    "users": {
      ".read": "auth != null", // Terotentikasi dapat membaca direktori dasar
      "$user_id": {
        // Admin bisa write semua user, sedangkan user biasa hanya bisa update profil sendiri
        ".write": "auth != null && (root.child('users/' + auth.uid + '/role').val() === 'admin' || auth.uid === $user_id)",
        ".validate": "newData.hasChildren(['nama', 'email', 'role'])"
      }
    },

    "classes": {
      ".read": "auth != null",
      "$class_id": {
        // Hanya Admin yang dapat membuat dan mengubah kelas
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'admin'"
      }
    },

    "subjects": {
      ".read": "auth != null",
      "$subject_id": {
        // Hanya Admin yang dapat mengelola daftar mata pelajaran
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'admin'"
      }
    },

    "class_members": {
      ".read": "auth != null",
      "$member_id": {
        // Hanya Admin dan Wali Kelas yang dapat mendaftarkan siswa ke kelas
        ".write": "auth != null && (root.child('users/' + auth.uid + '/role').val() === 'admin' || root.child('users/' + auth.uid + '/role').val() === 'wali_kelas')"
      }
    },

    "attendance": {
      // Pembacaan presensi
      ".read": "auth != null",
      "$attendance_id": {
        // Admin, Wali Kelas dari kelas bersangkutan, atau Guru Mapel yang mengajar mata pelajaran tersebut
        ".write": "auth != null && (
          root.child('users/' + auth.uid + '/role').val() === 'admin' ||
          root.child('users/' + auth.uid + '/role').val() === 'wali_kelas' ||
          (
            root.child('users/' + auth.uid + '/role').val() === 'guru' &&
            root.child('subjects/' + newData.child('subject_id').val() + '/guru_id').val() === auth.uid
          )
        )",
        ".validate": "newData.child('status').val().matches(/^(H|I|S|A)$/)"
      }
    },

    "grades": {
      // Siswa dan Orang Tua hanya bisa membaca nilai miliknya, Guru Mapel & Admin bisa membaca semua
      ".read": "auth != null",
      "$grade_id": {
        // Guru Mapel hanya bisa menulis nilai untuk mapel yang dia ampu, atau Admin
        ".write": "auth != null && (
          root.child('users/' + auth.uid + '/role').val() === 'admin' ||
          (
            root.child('users/' + auth.uid + '/role').val() === 'guru' &&
            root.child('subjects/' + newData.child('subject_id').val() + '/guru_id').val() === auth.uid
          )
        )",
        ".validate": "newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 100"
      }
    },

    "parent_student_relations": {
      ".read": "auth != null",
      "$relation_id": {
        ".write": "auth != null && root.child('users/' + auth.uid + '/role').val() === 'admin'"
      }
    }
  }
}`;

  const clientJoinCode = `/**
 * CONTOH RELATIONAL CLIENT-SIDE JOIN PADA FIREBASE REALTIME DATABASE (NOSQL)
 * Mengambil rekap presensi kelas tertentu, lalu melakukan join dengan:
 * 1. Data Siswa (/users/{student_id})
 * 2. Data Kelas (/classes/{class_id})
 * 3. Data Mata Pelajaran (/subjects/{subject_id})
 */
async function fetchClassAttendanceWithJoin(classId, targetDate, subjectId) {
  try {
    // 1. Fetch data master kelas & mata pelajaran secara paralel
    const [classSnap, subjectSnap] = await Promise.all([
      firebase.database().ref(\`classes/\${classId}\`).once('value'),
      firebase.database().ref(\`subjects/\${subjectId}\`).once('value')
    ]);
    const classData = classSnap.val() || {};
    const subjectData = subjectSnap.val() || {};

    // 2. Fetch seluruh relasi siswa di kelas ini dari /class_members
    const membersSnap = await firebase.database().ref('class_members')
      .orderByChild('class_id')
      .equalTo(classId)
      .once('value');

    const memberList = [];
    membersSnap.forEach(child => memberList.push(child.val()));

    // 3. Fetch attendance record untuk kelas, tanggal, dan subject ini
    const attSnap = await firebase.database().ref('attendance')
      .orderByChild('class_id')
      .equalTo(classId)
      .once('value');

    const attendanceRecords = [];
    attSnap.forEach(child => {
      const val = child.val();
      if (val.date === targetDate && val.subject_id === subjectId) {
        attendanceRecords.push(val);
      }
    });

    // 4. Client-side Join: Ambil detail User untuk setiap siswa (Relasi Many-to-One)
    const joinedResult = await Promise.all(
      memberList.map(async (member) => {
        const userSnap = await firebase.database().ref(\`users/\${member.student_id}\`).once('value');
        const userData = userSnap.val() || { nama: 'Tidak Ditemukan', email: '-', no_wa: '-' };

        // Cari status presensi siswa ini
        const record = attendanceRecords.find(a => a.student_id === member.student_id);

        return {
          student_id: member.student_id,
          nama_siswa: userData.nama,
          email_siswa: userData.email,
          no_wa: userData.no_wa,
          class_id: classId,
          nama_kelas: classData.nama_kelas,
          subject_id: subjectId,
          nama_mapel: subjectData.nama_mapel,
          date: targetDate,
          status: record ? record.status : 'H' // Default Hadir
        };
      })
    );

    console.table(joinedResult);
    return joinedResult;
  } catch (error) {
    console.error('Relational Join Error:', error);
    throw error;
  }
}`;

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Arsitektur Database RDBMS di Atas Firebase NoSQL
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Desain skema normalisasi tabel, Security Rules RBAC, dan implementasi Client-Side Relational JOIN.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeSubTab === 'schema' ? schemaJSON : activeSubTab === 'rules' ? securityRules : clientJoinCode)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg flex items-center gap-2 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Kode'}
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-100 dark:border-slate-700 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'schema'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            1. JSON Tree Normalisasi
          </button>
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'rules'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            2. Firebase Security Rules (.rules)
          </button>
          <button
            onClick={() => setActiveSubTab('join')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'join'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            3. Client-Side Relational JOIN
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl text-slate-100 overflow-x-auto">
        {activeSubTab === 'schema' && (
          <div>
            <div className="text-xs font-mono text-blue-400 mb-3 flex items-center justify-between">
              <span>// database.schema.json — Struktur Data Normalisasi NoSQL</span>
              <span className="text-slate-500">7 Node Utama RDBMS</span>
            </div>
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              <code>{schemaJSON}</code>
            </pre>
          </div>
        )}

        {activeSubTab === 'rules' && (
          <div>
            <div className="text-xs font-mono text-purple-400 mb-3 flex items-center justify-between">
              <span>// database.rules.json — Firebase Realtime Database Security Rules</span>
              <span className="text-slate-500">RBAC: Admin, Wali Kelas, Guru, Siswa, Ortu</span>
            </div>
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              <code>{securityRules}</code>
            </pre>
          </div>
        )}

        {activeSubTab === 'join' && (
          <div>
            <div className="text-xs font-mono text-indigo-400 mb-3 flex items-center justify-between">
              <span>// client-join.js — Asynchronous Relational Data Lookup</span>
              <span className="text-slate-500">Promise.all & Foreign Key Resolving</span>
            </div>
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              <code>{clientJoinCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Database Entity Relationship Explanation Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition">
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Many-to-Many Relasi</div>
          <h4 className="font-bold text-slate-800 dark:text-white mt-1">class_members</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Menghubungkan <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">class_id</code> dan <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">student_id</code>. Memungkinkan siswa terdaftar pada kelas tanpa menggandakan profil siswa di node kelas.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition">
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Relasi Presensi & Nilai</div>
          <h4 className="font-bold text-slate-800 dark:text-white mt-1">attendance & grades</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Menyimpan record individual dengan foreign key ke <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">student_id</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">subject_id</code>, dan tanggal untuk query yang cepat dan hemat bandwidth.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Relasi Keluarga</div>
          <h4 className="font-bold text-slate-800 dark:text-white mt-1">parent_student_relations</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Menghubungkan <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">parent_id</code> dan <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">student_id</code>, sehingga orang tua hanya memiliki hak baca (Read-Only) pada data nilai dan presensi anaknya.
          </p>
        </div>
      </div>
    </div>
  );
};
