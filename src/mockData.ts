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
    att_15: { id: "att_15", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-17", student_id: "user_std5", status: "A" },

    // Rekam Presensi Historis Pekan 1 & 2 September 2026 (Presensi Bulanan)
    att_16: { id: "att_16", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-08", student_id: "user_std1", status: "H" },
    att_17: { id: "att_17", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-08", student_id: "user_std2", status: "H" },
    att_18: { id: "att_18", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-08", student_id: "user_std3", status: "H" },
    att_19: { id: "att_19", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-08", student_id: "user_std4", status: "H" },
    att_20: { id: "att_20", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-08", student_id: "user_std5", status: "H" },

    att_21: { id: "att_21", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-09", student_id: "user_std1", status: "H" },
    att_22: { id: "att_22", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-09", student_id: "user_std2", status: "H" },
    att_23: { id: "att_23", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-09", student_id: "user_std3", status: "S" },
    att_24: { id: "att_24", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-09", student_id: "user_std4", status: "H" },
    att_25: { id: "att_25", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-09", student_id: "user_std5", status: "I" },

    att_26: { id: "att_26", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-10", student_id: "user_std1", status: "H" },
    att_27: { id: "att_27", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-10", student_id: "user_std2", status: "H" },
    att_28: { id: "att_28", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-10", student_id: "user_std3", status: "H" },
    att_29: { id: "att_29", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-10", student_id: "user_std4", status: "H" },
    att_30: { id: "att_30", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-10", student_id: "user_std5", status: "H" },

    att_31: { id: "att_31", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-02", student_id: "user_std1", status: "H" },
    att_32: { id: "att_32", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-02", student_id: "user_std2", status: "H" },
    att_33: { id: "att_33", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-02", student_id: "user_std3", status: "H" },
    att_34: { id: "att_34", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-02", student_id: "user_std4", status: "H" },
    att_35: { id: "att_35", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-09-02", student_id: "user_std5", status: "H" },

    // Rekam Presensi Historis Bulan Agustus 2026 (Semester Ganjil)
    att_36: { id: "att_36", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-25", student_id: "user_std1", status: "H" },
    att_37: { id: "att_37", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-25", student_id: "user_std2", status: "H" },
    att_38: { id: "att_38", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-25", student_id: "user_std3", status: "H" },
    att_39: { id: "att_39", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-25", student_id: "user_std4", status: "H" },
    att_40: { id: "att_40", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-25", student_id: "user_std5", status: "I" },

    att_41: { id: "att_41", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-26", student_id: "user_std1", status: "H" },
    att_42: { id: "att_42", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-26", student_id: "user_std2", status: "H" },
    att_43: { id: "att_43", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-26", student_id: "user_std3", status: "S" },
    att_44: { id: "att_44", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-26", student_id: "user_std4", status: "H" },
    att_45: { id: "att_45", class_id: "class_10_ipa1", subject_id: "subj_mat", date: "2026-08-26", student_id: "user_std5", status: "H" }
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
  academic_events: {
    evt_1: {
      id: "evt_1",
      title: "Penilaian Tengah Semester (PTS) Ganjil",
      description: "Pelaksanaan asesmen sumatif tengah semester untuk seluruh mata pelajaran kelas X, XI, dan XII.",
      startDate: "2026-09-28",
      endDate: "2026-10-03",
      category: "ujian",
      location: "Ruang Kelas & Lab Komputer",
      targetRole: "all",
      isHoliday: false
    },
    evt_2: {
      id: "evt_2",
      title: "Maulid Nabi Muhammad SAW 1448 H",
      description: "Hari libur nasional peringatan Maulid Nabi Muhammad SAW.",
      startDate: "2026-09-24",
      category: "libur",
      targetRole: "all",
      isHoliday: true
    },
    evt_3: {
      id: "evt_3",
      title: "Rapat Koordinasi Evaluasi Pembelajaran & Kurikulum",
      description: "Rapat evaluasi capaian kurikulum merdeka dan kesiapan penilaian tengah semester bersama dewan guru.",
      startDate: "2026-09-22",
      category: "rapat",
      location: "Ruang Guru & Aula Utama",
      targetRole: "guru",
      isHoliday: false
    },
    evt_4: {
      id: "evt_4",
      title: "Simulasi & Gladi Bersih ANBK 2026",
      description: "Gladi bersih Asesmen Nasional Berbasis Komputer bagi siswa terpilih.",
      startDate: "2026-09-14",
      endDate: "2026-09-16",
      category: "ujian",
      location: "Laboratorium Komputer 1 & 2",
      targetRole: "siswa",
      isHoliday: false
    },
    evt_5: {
      id: "evt_5",
      title: "Pekan Olahraga & Seni (Porseni) Antarkelas",
      description: "Kompetisi futsal, basket, catur, tari kreasi, dan mading antarkelas.",
      startDate: "2026-10-12",
      endDate: "2026-10-16",
      category: "kegiatan",
      location: "Lapangan Olahraga & Panggung Seni",
      targetRole: "all",
      isHoliday: false
    },
    evt_6: {
      id: "evt_6",
      title: "Pembagian KHS / Rapor Siswa Tengah Semester",
      description: "Penyerahan laporan hasil belajar siswa tengah semester ganjil kepada orang tua/wali murid.",
      startDate: "2026-10-24",
      category: "rapor",
      location: "Ruang Kelas Masing-masing",
      targetRole: "orang_tua",
      isHoliday: false
    },
    evt_7: {
      id: "evt_7",
      title: "Penilaian Akhir Semester (PAS) Ganjil",
      description: "Ujian akhir semester ganjil tahun ajaran 2026/2027.",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
      category: "ujian",
      location: "Ruang Ujian Utama",
      targetRole: "all",
      isHoliday: false
    }
  },
  activity_logs: {
    log_1: {
      id: "log_1",
      timestamp: "2026-09-19T07:15:20.000Z",
      userId: "user_admin1",
      userName: "Bambang Wijaya, M.Kom",
      userRole: "admin",
      actionType: "login",
      actionTitle: "Autentikasi Pengguna Berhasil",
      details: "Administrator Bambang Wijaya berhasil login ke sistem SIMAK.",
      ipOrDevice: "Chrome / Desktop (192.168.1.10)",
      syncedToFirebase: true
    },
    log_2: {
      id: "log_2",
      timestamp: "2026-09-19T07:30:12.000Z",
      userId: "user_guru1",
      userName: "Siti Rahmawati, M.Pd",
      userRole: "guru",
      actionType: "grade_input",
      actionTitle: "Pembaruan Nilai Siswa",
      details: "Guru Siti Rahmawati menyimpan nilai Tugas & UTS mata pelajaran Matematika kelas X IPA 1.",
      targetEntity: "grades_matematika_x_ipa1",
      ipOrDevice: "Firefox / Laptop",
      syncedToFirebase: true
    },
    log_3: {
      id: "log_3",
      timestamp: "2026-09-19T08:00:45.000Z",
      userId: "user_wk1",
      userName: "Budi Santoso, S.Pd",
      userRole: "wali_kelas",
      actionType: "attendance_input",
      actionTitle: "Input Presensi Harian Siswa",
      details: "Presensi harian tanggal 2026-09-19 untuk kelas X IPA 1 dicatat (Hadir: 5, Izin: 0, Sakit: 0, Alpa: 0).",
      targetEntity: "attendance_2026-09-19",
      ipOrDevice: "Safari / iPad",
      syncedToFirebase: true
    },
    log_4: {
      id: "log_4",
      timestamp: "2026-09-19T08:20:00.000Z",
      userId: "user_admin1",
      userName: "Bambang Wijaya, M.Kom",
      userRole: "admin",
      actionType: "settings_update",
      actionTitle: "Sinkronisasi Cloud Firebase",
      details: "Koleksi data sekolah berhasil disinkronkan ke Firebase Firestore.",
      ipOrDevice: "Chrome / Admin Console",
      syncedToFirebase: true
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
