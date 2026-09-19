import { DatabaseSnapshot } from './types';

export const INITIAL_DATABASE: DatabaseSnapshot = {
  users: {
    user_admin1: {
      id: "user_admin1",
      nama: "Bambang Wijaya, M.Kom",
      username: "admin",
      email: "admin@sekolah.id",
      password_hash: "admin123", // Dalam produksi menggunakan bcrypt / Firebase Auth UID
      role: "admin",
      no_wa: "081234567890"
    },
    user_wk1: {
      id: "user_wk1",
      nama: "Budi Santoso, S.Pd",
      username: "walikelas",
      email: "budi.santoso@sekolah.id",
      password_hash: "wali123",
      role: "wali_kelas",
      no_wa: "081234567891"
    },
    user_guru1: {
      id: "user_guru1",
      nama: "Siti Rahmawati, M.Pd",
      username: "guru",
      email: "siti.rahma@sekolah.id",
      password_hash: "guru123",
      role: "guru",
      no_wa: "081234567892"
    },
    user_guru2: {
      id: "user_guru2",
      nama: "Joko Susilo, M.Pd",
      username: "joko_susilo",
      email: "joko.susilo@sekolah.id",
      password_hash: "guru123",
      role: "guru",
      no_wa: "081234567893"
    },
    user_std1: {
      id: "user_std1",
      nama: "Ahmad Rizky Pratama",
      username: "siswa",
      email: "ahmad.rizky@siswa.sekolah.id",
      password_hash: "siswa123",
      role: "siswa",
      no_wa: "082198765431"
    },
    user_std2: {
      id: "user_std2",
      nama: "Dewi Lestari",
      username: "dewi_lestari",
      email: "dewi.lestari@siswa.sekolah.id",
      password_hash: "siswa123",
      role: "siswa",
      no_wa: "082198765432"
    },
    user_std3: {
      id: "user_std3",
      nama: "Fahri Ramadhan",
      username: "fahri_ramadhan",
      email: "fahri.ramadhan@siswa.sekolah.id",
      password_hash: "siswa123",
      role: "siswa",
      no_wa: "082198765433"
    },
    user_std4: {
      id: "user_std4",
      nama: "Nabila Putri Maharani",
      username: "nabila_putri",
      email: "nabila.putri@siswa.sekolah.id",
      password_hash: "siswa123",
      role: "siswa",
      no_wa: "082198765434"
    },
    user_std5: {
      id: "user_std5",
      nama: "Reza Aditya Nugraha",
      username: "reza_aditya",
      email: "reza.aditya@siswa.sekolah.id",
      password_hash: "siswa123",
      role: "siswa",
      no_wa: "082198765435"
    },
    user_par1: {
      id: "user_par1",
      nama: "Hendra Pratama (Ayah Ahmad)",
      username: "ortu",
      email: "hendra.pratama@gmail.com",
      password_hash: "ortu123",
      role: "orang_tua",
      no_wa: "081399887766"
    },
    user_par2: {
      id: "user_par2",
      nama: "Ratna Dewi (Ibu Dewi)",
      username: "ratna_dewi",
      email: "ratna.dewi@gmail.com",
      password_hash: "ortu123",
      role: "orang_tua",
      no_wa: "081399887767"
    }
  },
  classes: {
    class_10_ipa1: {
      id: "class_10_ipa1",
      nama_kelas: "X MIPA 1",
      wali_kelas_id: "user_wk1",
      tahun_ajaran: "2025/2026"
    },
    class_10_ipa2: {
      id: "class_10_ipa2",
      nama_kelas: "X MIPA 2",
      wali_kelas_id: "user_wk1",
      tahun_ajaran: "2025/2026"
    }
  },
  subjects: {
    subj_mat: {
      id: "subj_mat",
      nama_mapel: "Matematika Wajib",
      guru_id: "user_guru1"
    },
    subj_fis: {
      id: "subj_fis",
      nama_mapel: "Fisika Dasar",
      guru_id: "user_guru2"
    },
    subj_kim: {
      id: "subj_kim",
      nama_mapel: "Kimia Sains",
      guru_id: "user_guru1"
    }
  },
  class_members: {
    cm_1: { id: "cm_1", class_id: "class_10_ipa1", student_id: "user_std1" },
    cm_2: { id: "cm_2", class_id: "class_10_ipa1", student_id: "user_std2" },
    cm_3: { id: "cm_3", class_id: "class_10_ipa1", student_id: "user_std3" },
    cm_4: { id: "cm_4", class_id: "class_10_ipa1", student_id: "user_std4" },
    cm_5: { id: "cm_5", class_id: "class_10_ipa1", student_id: "user_std5" }
  },
  attendance: {
    att_1: { id: "att_1", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-15", student_id: "user_std1", status: "H" },
    att_2: { id: "att_2", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-15", student_id: "user_std2", status: "H" },
    att_3: { id: "att_3", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-15", student_id: "user_std3", status: "S" },
    att_4: { id: "att_4", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-15", student_id: "user_std4", status: "H" },
    att_5: { id: "att_5", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-15", student_id: "user_std5", status: "I" },

    att_6: { id: "att_6", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-16", student_id: "user_std1", status: "H" },
    att_7: { id: "att_7", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-16", student_id: "user_std2", status: "H" },
    att_8: { id: "att_8", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-16", student_id: "user_std3", status: "H" },
    att_9: { id: "att_9", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-16", student_id: "user_std4", status: "H" },
    att_10: { id: "att_10", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-16", student_id: "user_std5", status: "H" },

    att_11: { id: "att_11", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std1", status: "H" },
    att_12: { id: "att_12", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std2", status: "I" },
    att_13: { id: "att_13", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std3", status: "H" },
    att_14: { id: "att_14", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std4", status: "H" },
    att_15: { id: "att_15", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std5", status: "A" }
  },
  grades: {
    grd_1: { id: "grd_1", student_id: "user_std1", subject_id: "subj_mat", type: "Tugas", score: 88 },
    grd_2: { id: "grd_2", student_id: "user_std1", subject_id: "subj_mat", type: "UTS", score: 92 },
    grd_3: { id: "grd_3", student_id: "user_std1", subject_id: "subj_mat", type: "UAS", score: 90 },

    grd_4: { id: "grd_4", student_id: "user_std1", subject_id: "subj_fis", type: "Tugas", score: 82 },
    grd_5: { id: "grd_5", student_id: "user_std1", subject_id: "subj_fis", type: "UTS", score: 85 },
    grd_6: { id: "grd_6", student_id: "user_std1", subject_id: "subj_fis", type: "UAS", score: 87 },

    grd_7: { id: "grd_7", student_id: "user_std2", subject_id: "subj_mat", type: "Tugas", score: 78 },
    grd_8: { id: "grd_8", student_id: "user_std2", subject_id: "subj_mat", type: "UTS", score: 84 },
    grd_9: { id: "grd_9", student_id: "user_std2", subject_id: "subj_mat", type: "UAS", score: 86 },

    grd_10: { id: "grd_10", student_id: "user_std3", subject_id: "subj_mat", type: "Tugas", score: 70 },
    grd_11: { id: "grd_11", student_id: "user_std3", subject_id: "subj_mat", type: "UTS", score: 75 },
    grd_12: { id: "grd_12", student_id: "user_std3", subject_id: "subj_mat", type: "UAS", score: 78 },

    grd_13: { id: "grd_13", student_id: "user_std4", subject_id: "subj_mat", type: "Tugas", score: 95 },
    grd_14: { id: "grd_14", student_id: "user_std4", subject_id: "subj_mat", type: "UTS", score: 96 },
    grd_15: { id: "grd_15", student_id: "user_std4", subject_id: "subj_mat", type: "UAS", score: 98 },

    grd_16: { id: "grd_16", student_id: "user_std5", subject_id: "subj_mat", type: "Tugas", score: 65 },
    grd_17: { id: "grd_17", student_id: "user_std5", subject_id: "subj_mat", type: "UTS", score: 70 },
    grd_18: { id: "grd_18", student_id: "user_std5", subject_id: "subj_mat", type: "UAS", score: 72 }
  },
  parent_student_relations: {
    psr_1: {
      id: "psr_1",
      parent_id: "user_par1",
      student_id: "user_std1"
    },
    psr_2: {
      id: "psr_2",
      parent_id: "user_par2",
      student_id: "user_std2"
    }
  },
  announcements: {
    ann_1: {
      id: "ann_1",
      title: "Jadwal Penilaian Tengah Semester (PTS) Ganjil 2025/2026",
      content: "Diberitahukan kepada seluruh siswa dan dewan guru bahwa PTS Ganjil akan dimulai pada 28 September 2026. Mohon memastikan rekap presensi dan ketuntasan materi telah selesai.",
      date: "2026-09-17",
      time: "08:00",
      category: "Akademik",
      author: "Bambang Wijaya, M.Kom",
      authorRole: "admin",
      priority: "high",
      targetRole: "all"
    },
    ann_2: {
      id: "ann_2",
      title: "Undangan Pertemuan Konsultasi Wali Murid Kelas X MIPA",
      content: "Pertemuan pembagian laporan progres belajar tengah semester dan evaluasi kedisiplinan siswa akan dilaksanakan secara hybrid pada Sabtu mendatang.",
      date: "2026-09-16",
      time: "10:30",
      category: "Penting",
      author: "Budi Santoso, S.Pd",
      authorRole: "wali_kelas",
      priority: "high",
      targetRole: "orang_tua"
    },
    ann_3: {
      id: "ann_3",
      title: "Pekan Olahraga & Lomba Kebersihan Ruang Kelas",
      content: "Setiap kelas wajib menyiapkan perwakilan tim basket, futsal, dan piket kebersihan kelas. Penilaian kebersihan akan diadakan secara berkala tiap hari Jumat.",
      date: "2026-09-15",
      time: "14:15",
      category: "Kegiatan",
      author: "Bambang Wijaya, M.Kom",
      authorRole: "admin",
      priority: "normal",
      targetRole: "siswa"
    }
  },
  app_settings: {
    appName: "SIMAK",
    appDescription: "Sistem Informasi Manajemen Kelas",
    logoType: "icon",
    logoIcon: "School",
    logoColor: "blue",
    logoImageUrl: "",
    creatorName: "Puput Sasmita",
    adminPhone: "0812-3456-7890"
  }
};
