import {
  LessonScheduleItem,
  PiketScheduleItem,
  ClassAgreementDoc,
  SeatingLayout,
  StudentIdentityItem,
  ClassStructure,
  ClassInventoryItem,
  ClassGuidanceItem,
  PiketAttendanceRecord,
  AttitudeAssessmentItem,
  ClassTreasuryTransaction,
  ClassJournalItem,
  StudentMutationItem,
  StudentCaseItem,
  StudentAchievementItem,
  HomeVisitItem,
  ClassBulletinBoardItem
} from './types/homeroom';

export interface HomeroomClassData {
  lessonSchedules: LessonScheduleItem[];
  piketSchedules: PiketScheduleItem[];
  classAgreement: ClassAgreementDoc;
  seatingLayout: SeatingLayout;
  studentIdentities: StudentIdentityItem[];
  classStructure: ClassStructure;
  inventories: ClassInventoryItem[];
  guidanceLogs: ClassGuidanceItem[];
  piketAttendanceLogs: PiketAttendanceRecord[];
  attitudeAssessments: AttitudeAssessmentItem[];
  treasuryTransactions: ClassTreasuryTransaction[];
  classJournals: ClassJournalItem[];
  studentMutations: StudentMutationItem[];
  studentCases: StudentCaseItem[];
  studentAchievements: StudentAchievementItem[];
  homeVisits: HomeVisitItem[];
  classBulletinBoard: ClassBulletinBoardItem[];
}

export const INITIAL_HOMEROOM_DATA: Record<string, HomeroomClassData> = {
  class_10_ipa1: {
    // 1) DAFTAR PELAJARAN
    lessonSchedules: [
      { id: 'sch_1', class_id: 'class_10_ipa1', day: 'Senin', periodNumber: 1, timeRange: '07:15 - 08:00', subjectName: 'Upacara Bendera', teacherName: 'Semua Guru / Wali Kelas', room: 'Lapangan Utama' },
      { id: 'sch_2', class_id: 'class_10_ipa1', day: 'Senin', periodNumber: 2, timeRange: '08:00 - 09:30', subjectName: 'Matematika Peminatan', teacherName: 'Siti Rahmawati, M.Pd', room: 'R. 10 MIPA 1' },
      { id: 'sch_3', class_id: 'class_10_ipa1', day: 'Senin', periodNumber: 3, timeRange: '09:45 - 11:15', subjectName: 'Fisika', teacherName: 'Joko Susilo, M.Pd', room: 'Lab Fisika' },
      { id: 'sch_4', class_id: 'class_10_ipa1', day: 'Senin', periodNumber: 4, timeRange: '11:15 - 12:45', subjectName: 'Bahasa Indonesia', teacherName: 'Budi Santoso, S.Pd', room: 'R. 10 MIPA 1' },

      { id: 'sch_5', class_id: 'class_10_ipa1', day: 'Selasa', periodNumber: 1, timeRange: '07:15 - 08:45', subjectName: 'Biologi', teacherName: 'Nurul Hidayah, S.Si', room: 'Lab Biologi' },
      { id: 'sch_6', class_id: 'class_10_ipa1', day: 'Selasa', periodNumber: 2, timeRange: '09:00 - 10:30', subjectName: 'Kimia', teacherName: 'Dra. Sri Wahyuni', room: 'Lab Kimia' },
      { id: 'sch_7', class_id: 'class_10_ipa1', day: 'Selasa', periodNumber: 3, timeRange: '10:45 - 12:15', subjectName: 'Bahasa Inggris', teacherName: 'David Pratama, M.Hum', room: 'R. 10 MIPA 1' },

      { id: 'sch_8', class_id: 'class_10_ipa1', day: 'Rabu', periodNumber: 1, timeRange: '07:15 - 08:45', subjectName: 'Pendidikan Agama & Budi Pekerti', teacherName: 'Ust. Ahmad Fauzan, S.Ag', room: 'R. 10 MIPA 1' },
      { id: 'sch_9', class_id: 'class_10_ipa1', day: 'Rabu', periodNumber: 2, timeRange: '09:00 - 10:30', subjectName: 'Matematika Wajib', teacherName: 'Siti Rahmawati, M.Pd', room: 'R. 10 MIPA 1' },
      { id: 'sch_10', class_id: 'class_10_ipa1', day: 'Rabu', periodNumber: 3, timeRange: '10:45 - 12:15', subjectName: 'Informatika', teacherName: 'Bambang Wijaya, M.Kom', room: 'Lab Komputer 1' },

      { id: 'sch_11', class_id: 'class_10_ipa1', day: 'Kamis', periodNumber: 1, timeRange: '07:15 - 08:45', subjectName: 'Pendidikan Jasmani, Olahraga & Kesehatan', teacherName: 'Hendra Setiawan, S.Pd', room: 'Gelanggang Olahraga' },
      { id: 'sch_12', class_id: 'class_10_ipa1', day: 'Kamis', periodNumber: 2, timeRange: '09:00 - 10:30', subjectName: 'Sejarah Indonesia', teacherName: 'Agus Salim, M.Pd', room: 'R. 10 MIPA 1' },
      { id: 'sch_13', class_id: 'class_10_ipa1', day: 'Kamis', periodNumber: 3, timeRange: '10:45 - 12:15', subjectName: 'Seni Budaya', teacherName: 'Ratna Sari, S.Sn', room: 'R. Studio Seni' },

      { id: 'sch_14', class_id: 'class_10_ipa1', day: 'Jumat', periodNumber: 1, timeRange: '07:00 - 07:45', subjectName: 'Senam Pagi & Literasi Religi', teacherName: 'Wali Kelas & Pembina', room: 'Halaman Sekolah' },
      { id: 'sch_15', class_id: 'class_10_ipa1', day: 'Jumat', periodNumber: 2, timeRange: '07:45 - 09:15', subjectName: 'Pendidikan Pancasila (PPKn)', teacherName: 'Drs. Hendrawan', room: 'R. 10 MIPA 1' },
      { id: 'sch_16', class_id: 'class_10_ipa1', day: 'Jumat', periodNumber: 3, timeRange: '09:30 - 11:00', subjectName: 'Prakarya & Kewirausahaan', teacherName: 'Mega Puspita, S.E', room: 'R. 10 MIPA 1' }
    ],

    // 2) DAFTAR PIKET
    piketSchedules: [
      {
        id: 'pkt_1',
        class_id: 'class_10_ipa1',
        day: 'Senin',
        studentIds: ['user_std1', 'user_std4'],
        studentNames: ['Ahmad Rizky Pratama (Koord)', 'Siti Aisyah'],
        zoneDuties: 'Menyapu lantai, merapikan meja guru & menghapus papan tulis'
      },
      {
        id: 'pkt_2',
        class_id: 'class_10_ipa1',
        day: 'Selasa',
        studentIds: ['user_std2', 'user_std5'],
        studentNames: ['Dewi Lestari (Koord)', 'Bayu Saputra'],
        zoneDuties: 'Membersihkan kaca jendela, menyapu teras kelas & membuang sampah'
      },
      {
        id: 'pkt_3',
        class_id: 'class_10_ipa1',
        day: 'Rabu',
        studentIds: ['user_std3', 'user_std1'],
        studentNames: ['Fajar Nugraha (Koord)', 'Ahmad Rizky Pratama'],
        zoneDuties: 'Merapikan taplak meja, menyapu lorong & mengisi ulang spidol'
      },
      {
        id: 'pkt_4',
        class_id: 'class_10_ipa1',
        day: 'Kamis',
        studentIds: ['user_std4', 'user_std2'],
        studentNames: ['Siti Aisyah (Koord)', 'Dewi Lestari'],
        zoneDuties: 'Membersihkan kipas/ventilasi, menyapu lantai & mengepel area kotor'
      },
      {
        id: 'pkt_5',
        class_id: 'class_10_ipa1',
        day: 'Jumat',
        studentIds: ['user_std5', 'user_std3'],
        studentNames: ['Bayu Saputra (Koord)', 'Fajar Nugraha'],
        zoneDuties: 'Operasi Semut (Jumat Bersih), menyiram tanaman kelas & kunci pintu kelas'
      }
    ],

    // 3) KESEPAKATAN KELAS
    classAgreement: {
      id: 'agree_1',
      class_id: 'class_10_ipa1',
      title: 'Piagam Kesepakatan & Budaya Positif Kelas X MIPA 1',
      motto: '"Disiplin dalam Sikap, Unggul dalam Karya, Santun dalam Budi Pekerti"',
      signedDate: '2026-07-20',
      homeroomTeacher: 'Budi Santoso, S.Pd',
      classPresident: 'Ahmad Rizky Pratama',
      rules: [
        {
          id: 'rule_1',
          class_id: 'class_10_ipa1',
          ruleTitle: 'Hadir Tepat Waktu',
          description: 'Berada di kelas maksimal pukul 07.00 WIB dan siap memulai pembelajaran dengan tertib.',
          category: 'Kedisiplinan',
          consequence: 'Membaca ayat suci / ringkasan literasi buku selama 15 menit dan piket tambahan.'
        },
        {
          id: 'rule_2',
          class_id: 'class_10_ipa1',
          ruleTitle: 'Menjaga Kebersihan Ruang Kelas (LiSa - Lihat Sampah Ambil)',
          description: 'Ruang kelas harus dalam keadaan rapi, bebas sampah, dan papan tulis bersih setelah KBM berakhir.',
          category: 'Kebersihan',
          consequence: 'Wajib membersihkan area sudut kelas dan memilah sampah daur ulang sekolah.'
        },
        {
          id: 'rule_3',
          class_id: 'class_10_ipa1',
          ruleTitle: 'Saling Menghargai & Berbicara Santun (Stop Bullying)',
          description: 'Tidak memotong pembicaraan teman/guru, dilarang melontarkan ejekan verbal, fisik, maupun media sosial.',
          category: 'Etika & Sopan Santun',
          consequence: 'Meminta maaf secara tulus di hadapan kelas dan membuat surat refleksi pembinaan.'
        },
        {
          id: 'rule_4',
          class_id: 'class_10_ipa1',
          ruleTitle: 'Kejujuran Akademik & Disiplin Tugas',
          description: 'Mengumpulkan tugas tepat waktu dan menjunjung tinggi integritas tanpa plagiasi/mencontek.',
          category: 'Akademik',
          consequence: 'Mengerjakan paket soal pengayaan mandiri dan penilaian ulang.'
        },
        {
          id: 'rule_5',
          class_id: 'class_10_ipa1',
          ruleTitle: 'Penggunaan Gawai yang Bertanggung Jawab',
          description: 'Ponsel diletakkan di kotak loker gawai depan saat KBM kecuali atas izin guru mata pelajaran untuk riset.',
          category: 'Kedisiplinan',
          consequence: 'Ponsel dititipkan di meja wali kelas hingga jam kepulangan.'
        }
      ]
    },

    // 4) DENAH TEMPAT DUDUK
    seatingLayout: {
      class_id: 'class_10_ipa1',
      rows: 3,
      cols: 2,
      teacherDeskPosition: 'Kiri Depan',
      updatedAt: '2026-09-15',
      desks: [
        {
          deskNumber: 1,
          row: 1,
          col: 1,
          student1Id: 'user_std1',
          student1Name: 'Ahmad Rizky Pratama',
          student2Id: 'user_std3',
          student2Name: 'Fajar Nugraha'
        },
        {
          deskNumber: 2,
          row: 1,
          col: 2,
          student1Id: 'user_std2',
          student1Name: 'Dewi Lestari',
          student2Id: 'user_std4',
          student2Name: 'Siti Aisyah'
        },
        {
          deskNumber: 3,
          row: 2,
          col: 1,
          student1Id: 'user_std5',
          student1Name: 'Bayu Saputra',
          student2Id: '',
          student2Name: 'Meja Kosong / Mitra Studi'
        },
        {
          deskNumber: 4,
          row: 2,
          col: 2,
          student1Id: '',
          student1Name: 'Cadangan Siswa Pindahan',
          student2Id: '',
          student2Name: 'Cadangan Meja'
        },
        {
          deskNumber: 5,
          row: 3,
          col: 1,
          student1Id: '',
          student1Name: 'Meja Diskusi 1',
          student2Id: '',
          student2Name: 'Meja Diskusi 2'
        },
        {
          deskNumber: 6,
          row: 3,
          col: 2,
          student1Id: '',
          student1Name: 'Pojok Baca Literasi',
          student2Id: '',
          student2Name: 'Rak Buku Kelas'
        }
      ]
    },

    // 5 & 6) DATA IDENTITAS SISWA (Basis Statistik & Buku Induk)
    studentIdentities: [
      {
        id: 'id_std_1',
        studentId: 'user_std1',
        class_id: 'class_10_ipa1',
        nis: '240101',
        nisn: '0089123451',
        fullName: 'Ahmad Rizky Pratama',
        nickname: 'Rizky',
        gender: 'L',
        birthPlace: 'Bandung',
        birthDate: '2008-04-12',
        religion: 'Islam',
        address: 'Jl. Merdeka No. 45, Bandung',
        distanceToSchoolKm: 2.5,
        transportation: 'Sepeda Motor',
        bloodType: 'O',
        fatherName: 'Ir. Hendra Pratama',
        motherName: 'Siti Aminah',
        parentOccupation: 'Wiraswasta',
        parentPhone: '081298765431',
        economicStatus: 'Mampu',
        healthNotes: 'Sehat, alergi udang ringan'
      },
      {
        id: 'id_std_2',
        studentId: 'user_std2',
        class_id: 'class_10_ipa1',
        nis: '240102',
        nisn: '0089123452',
        fullName: 'Dewi Lestari',
        nickname: 'Dewi',
        gender: 'P',
        birthPlace: 'Cimahi',
        birthDate: '2008-08-25',
        religion: 'Islam',
        address: 'Jl. Gatot Subroto No. 12, Cimahi',
        distanceToSchoolKm: 5.0,
        transportation: 'Angkutan Umum',
        bloodType: 'A',
        fatherName: 'Bambang Kusuma',
        motherName: 'Rina Maryani',
        parentOccupation: 'Karyawan Swasta',
        parentPhone: '081298765432',
        economicStatus: 'Mampu',
        healthNotes: 'Riwayat asma ringan saat cuaca dingin'
      },
      {
        id: 'id_std_3',
        studentId: 'user_std3',
        class_id: 'class_10_ipa1',
        nis: '240103',
        nisn: '0089123453',
        fullName: 'Fajar Nugraha',
        nickname: 'Fajar',
        gender: 'L',
        birthPlace: 'Bandung',
        birthDate: '2008-01-15',
        religion: 'Islam',
        address: 'Komplek Sukamenak Blok B3, Bandung',
        distanceToSchoolKm: 3.8,
        transportation: 'Sepeda Motor',
        bloodType: 'B',
        fatherName: 'Dedi Nugraha',
        motherName: 'Yuyun Yuningsih',
        parentOccupation: 'Pedagang',
        parentPhone: '081298765433',
        economicStatus: 'KIP / PIP',
        healthNotes: 'Mata minus 1.25 (menggunakan kacamata)'
      },
      {
        id: 'id_std_4',
        studentId: 'user_std4',
        class_id: 'class_10_ipa1',
        nis: '240104',
        nisn: '0089123454',
        fullName: 'Siti Aisyah',
        nickname: 'Aisyah',
        gender: 'P',
        birthPlace: 'Sumedang',
        birthDate: '2008-11-03',
        religion: 'Islam',
        address: 'Jl. Cikutra Timur No. 89, Bandung',
        distanceToSchoolKm: 1.2,
        transportation: 'Jalan Kaki',
        bloodType: 'AB',
        fatherName: 'Agus Aisyah',
        motherName: 'Neneng Nurjanah',
        parentOccupation: 'PNS',
        parentPhone: '081298765434',
        economicStatus: 'Mampu',
        healthNotes: 'Sehat, stamina fisik prima'
      },
      {
        id: 'id_std_5',
        studentId: 'user_std5',
        class_id: 'class_10_ipa1',
        nis: '240105',
        nisn: '0089123455',
        fullName: 'Bayu Saputra',
        nickname: 'Bayu',
        gender: 'L',
        birthPlace: 'Bandung',
        birthDate: '2008-06-19',
        religion: 'Islam',
        address: 'Jl. Bojongsoang Asri No. 101, Bandung',
        distanceToSchoolKm: 6.5,
        transportation: 'Sepeda Motor',
        bloodType: 'O',
        fatherName: 'Iwan Saputra',
        motherName: 'Lilis Suryani',
        parentOccupation: 'Buruh Pabrik',
        parentPhone: '081298765435',
        economicStatus: 'KIP / PIP',
        healthNotes: 'Sehat tanpa keluhan'
      }
    ],

    // 7) STRUKTUR KELAS
    classStructure: {
      class_id: 'class_10_ipa1',
      homeroomTeacher: 'Budi Santoso, S.Pd',
      president: 'Ahmad Rizky Pratama',
      vicePresident: 'Bayu Saputra',
      secretary1: 'Dewi Lestari',
      secretary2: 'Siti Aisyah',
      treasurer1: 'Siti Aisyah',
      treasurer2: 'Dewi Lestari',
      sectionCleaning: ['Dewi Lestari', 'Bayu Saputra'],
      sectionSecurity: ['Fajar Nugraha'],
      sectionReligious: ['Ahmad Rizky Pratama'],
      sectionSports: ['Bayu Saputra'],
      sectionPublicRelations: ['Siti Aisyah'],
      sectionEquipment: ['Fajar Nugraha']
    },

    // 8) KARTU INVENTARIS RUANGAN
    inventories: [
      { id: 'inv_1', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-001', itemName: 'Papan Tulis Whiteboard Besar (Magnetic)', quantity: 1, unit: 'Buah', condition: 'Baik', source: 'BOS', notes: 'Kondisi mulus, spidol & penghapus lengkap', lastCheckedDate: '2026-09-10' },
      { id: 'inv_2', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-002', itemName: 'Meja Guru Kayu Jati & Kursi Busa', quantity: 1, unit: 'Set', condition: 'Baik', source: 'Sekolah', notes: 'Laci meja dapat dikunci rapi', lastCheckedDate: '2026-09-10' },
      { id: 'inv_3', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-003', itemName: 'Meja & Kursi Siswa Gandeng / Single', quantity: 36, unit: 'Set', condition: 'Baik', source: 'Sekolah', notes: '34 kondisi sangat baik, 2 butuh pengencangan baut', lastCheckedDate: '2026-09-10' },
      { id: 'inv_4', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-004', itemName: 'LCD Proyektor & Layar Gantung (Screen)', quantity: 1, unit: 'Unit', condition: 'Baik', source: 'BOS', notes: 'Kabel HDMI & remote operasional normal', lastCheckedDate: '2026-09-12' },
      { id: 'inv_5', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-005', itemName: 'Kipas Angin Dinding Tornado (Wall Fan)', quantity: 2, unit: 'Unit', condition: 'Baik', source: 'Kas Kelas / Swadaya', notes: 'Dipasang di sisi kiri dan kanan', lastCheckedDate: '2026-09-10' },
      { id: 'inv_6', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-006', itemName: 'Jam Dinding Digital & Analog', quantity: 1, unit: 'Buah', condition: 'Baik', source: 'Kas Kelas / Swadaya', notes: 'Baterai baru diganti awal semester', lastCheckedDate: '2026-09-01' },
      { id: 'inv_7', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-007', itemName: 'Kotak P3K Lengkap & Obat Darurat', quantity: 1, unit: 'Kotak', condition: 'Baik', source: 'Komite', notes: 'Betadine, perban, minyak kayu putih, plester', lastCheckedDate: '2026-09-15' },
      { id: 'inv_8', class_id: 'class_10_ipa1', itemCode: 'INV-10M1-008', itemName: 'Alat Kebersihan (Sapu, Pel, Pengki, Ember)', quantity: 4, unit: 'Set', condition: 'Baik', source: 'Kas Kelas / Swadaya', notes: 'Tersimpan rapi di lemari belakang', lastCheckedDate: '2026-09-15' }
    ],

    // 9) KEGIATAN PEMBIMBINGAN KELAS
    guidanceLogs: [
      {
        id: 'gd_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-14',
        studentId: 'user_std3',
        studentName: 'Fajar Nugraha',
        guidanceType: 'Akademik / Belajar',
        problemDescription: 'Kesulitan dalam mengatur waktu belajar mandiri pada mata pelajaran Fisika & Kimia analitis.',
        counselingGiven: 'Diberikan bimbingan teknik belajar Pomodoro, pembagian jadwal belajar mingguan, dan ditautkan dengan tutor sebaya Ahmad Rizky.',
        followUpPlan: 'Evaluasi hasil kuis Fisika 2 pekan mendatang bersama guru pengampu Pak Joko Susilo.',
        status: 'Dalam Proses'
      },
      {
        id: 'gd_2',
        class_id: 'class_10_ipa1',
        date: '2026-09-08',
        studentId: 'user_std2',
        studentName: 'Dewi Lestari',
        guidanceType: 'Pribadi',
        problemDescription: 'Terlihat cemas dan kurang percaya diri saat presentasi kelompok di depan kelas.',
        counselingGiven: 'Diberikan motivasi penguatan diri, teknik pernapasan relaksasi sebelum berbicara, dan penugasan sebagai moderator diskusi kecil.',
        followUpPlan: 'Pengamatan performa saat presentasi Biologi pekan depan.',
        status: 'Selesai'
      },
      {
        id: 'gd_3',
        class_id: 'class_10_ipa1',
        date: '2026-09-02',
        studentId: 'user_std5',
        studentName: 'Bayu Saputra',
        guidanceType: 'Kedisiplinan / Karakter',
        problemDescription: 'Terlambat masuk sekolah sebanyak 2 kali karena kendala jarak tempuh dan rantai motor rusak.',
        counselingGiven: 'Pengarahan manajemen waktu keberangkatan 20 menit lebih awal serta koordinasi rute perjalanan aman.',
        followUpPlan: 'Monitoring absensi pagi selama 1 bulan.',
        status: 'Perlu Monitoring'
      }
    ],

    // 10) ABSENSI PIKET
    piketAttendanceLogs: [
      {
        id: 'patt_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-18',
        day: 'Jumat',
        cleanlinessScore: 95,
        inspectorName: 'Budi Santoso, S.Pd (Wali Kelas)',
        attendanceList: [
          { studentId: 'user_std5', studentName: 'Bayu Saputra', status: 'Melaksanakan', notes: 'Sapu teras dan pel lantai' },
          { studentId: 'user_std3', studentName: 'Fajar Nugraha', status: 'Melaksanakan', notes: 'Kuras tempat sampah & rapikan meja' }
        ],
        evaluationNotes: 'Kelas sangat bersih, wangi, papan tulis siap digunakan untuk pekan depan.'
      },
      {
        id: 'patt_2',
        class_id: 'class_10_ipa1',
        date: '2026-09-17',
        day: 'Kamis',
        cleanlinessScore: 88,
        inspectorName: 'Ahmad Rizky Pratama (Ketua Kelas)',
        attendanceList: [
          { studentId: 'user_std4', studentName: 'Siti Aisyah', status: 'Melaksanakan', notes: 'Membersihkan jendela' },
          { studentId: 'user_std2', studentName: 'Dewi Lestari', status: 'Melaksanakan', notes: 'Menyapu lantai' }
        ],
        evaluationNotes: 'Kebersihan cukup baik, spidol cadangan sudah diisi ulang.'
      },
      {
        id: 'patt_3',
        class_id: 'class_10_ipa1',
        date: '2026-09-16',
        day: 'Rabu',
        cleanlinessScore: 92,
        inspectorName: 'Budi Santoso, S.Pd (Wali Kelas)',
        attendanceList: [
          { studentId: 'user_std1', studentName: 'Ahmad Rizky Pratama', status: 'Melaksanakan', notes: 'Sapu teras & halaman kelas' },
          { studentId: 'user_std3', studentName: 'Fajar Nugraha', status: 'Melaksanakan', notes: 'Bersihkan papan tulis' }
        ],
        evaluationNotes: 'Area lorong depan kelas bersih dan rapi.'
      }
    ],

    // 11) PENILAIAN SIKAP
    attitudeAssessments: [
      {
        id: 'attd_1',
        class_id: 'class_10_ipa1',
        studentId: 'user_std1',
        studentName: 'Ahmad Rizky Pratama',
        spiritualScore: 'SB',
        socialScore: 'SB',
        spiritualDescription: 'Selalu taat menjalankan ibadah salat zuhur berjamaah, memimpin doa kelas dengan khusyuk, dan toleran terhadap sesama.',
        socialDescription: 'Menunjukkan jiwa kepemimpinan yang bertanggung jawab, santun, jujur, serta aktif membantu teman yang kesulitan.',
        specialNotes: 'Menjadi teladan integritas bagi anggota kelas.',
        incidents: [
          { date: '2026-09-10', trait: 'Tanggung Jawab', type: 'Positif', action: 'Mengkoordinir pembersihan kelas saat jam kosong tanpa disuruh.' }
        ]
      },
      {
        id: 'attd_2',
        class_id: 'class_10_ipa1',
        studentId: 'user_std2',
        studentName: 'Dewi Lestari',
        spiritualScore: 'SB',
        socialScore: 'B',
        spiritualDescription: 'Rajin berdoa sebelum dan sesudah belajar, menghormati guru dan teman seiman maupun berbeda agama.',
        socialDescription: 'Disiplin dan ramah, perlu terus didorong untuk lebih berani mengemukakan pendapat di forum besar.',
        specialNotes: 'Sangat teliti dalam pembukuan catatan sekretaris.',
        incidents: [
          { date: '2026-09-12', trait: 'Kejujuran', type: 'Positif', action: 'Menyerahkan dompet tertinggal di lab fisika ke ruang piket.' }
        ]
      },
      {
        id: 'attd_3',
        class_id: 'class_10_ipa1',
        studentId: 'user_std3',
        studentName: 'Fajar Nugraha',
        spiritualScore: 'B',
        socialScore: 'B',
        spiritualDescription: 'Melaksanakan ibadah dengan baik, berpartisipasi aktif dalam kegiatan kerohanian sekolah.',
        socialDescription: 'Memiliki empati tinggi dan suka bergotong royong, perlu mempertahankan kedisiplinan pengumpulan tugas.',
        specialNotes: 'Aktif di kegiatan ekstrakurikuler kepramukaan.',
        incidents: [
          { date: '2026-09-05', trait: 'Gotong Royong', type: 'Positif', action: 'Membantu mengangkat perlengkapan proyektor guru mapel.' }
        ]
      },
      {
        id: 'attd_4',
        class_id: 'class_10_ipa1',
        studentId: 'user_std4',
        studentName: 'Siti Aisyah',
        spiritualScore: 'SB',
        socialScore: 'SB',
        spiritualDescription: 'Memiliki komitmen ibadah yang istiqomah dan akhlakul karimah yang terpuji.',
        socialDescription: 'Sangat teliti, jujur dalam mengelola uang kas kelas, santun dalam bertutur kata dan bersikap.',
        specialNotes: 'Bendahara kelas yang amanah dan transparan.',
        incidents: [
          { date: '2026-09-08', trait: 'Kejujuran', type: 'Positif', action: 'Membuat laporan keuangan kas mingguan secara rinci dan ditempel di mading.' }
        ]
      },
      {
        id: 'attd_5',
        class_id: 'class_10_ipa1',
        studentId: 'user_std5',
        studentName: 'Bayu Saputra',
        spiritualScore: 'B',
        socialScore: 'B',
        spiritualDescription: 'Mengikuti kegiatan ibadah rutin dan menjaga sikap hormat kepada sesama rekan.',
        socialDescription: 'Memiliki jiwa sportifitas tinggi dan loyal pada kelas, sedang dalam pembinaan ketepatan waktu hadir.',
        specialNotes: 'Andalan tim futsal dan atletik sekolah.',
        incidents: [
          { date: '2026-09-15', trait: 'Sportifitas', type: 'Positif', action: 'Membantu rekan yang terjatuh saat lari pemanasan olahraga.' }
        ]
      }
    ],

    // 12) RINCIAN ADMINISTRASI SEKOLAH (Buku Kas & Keuangan Kelas)
    treasuryTransactions: [
      {
        id: 'trs_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-01',
        type: 'Pemasukan',
        category: 'Iuran Kas Rutin',
        description: 'Penerimaan iuran kas awal bulan September (36 siswa @ Rp 10.000)',
        amount: 360000,
        balanceAfter: 360000,
        receiptNumber: 'KAS-09-001',
        recordedBy: 'Siti Aisyah (Bendahara)'
      },
      {
        id: 'trs_2',
        class_id: 'class_10_ipa1',
        date: '2026-09-05',
        type: 'Pengeluaran',
        category: 'Kebersihan',
        description: 'Pembelian 2 refill spidol whiteboard hitam & biru + penghapus magnetik',
        amount: 45000,
        balanceAfter: 315000,
        receiptNumber: 'KWT-TKO-882',
        recordedBy: 'Siti Aisyah (Bendahara)'
      },
      {
        id: 'trs_3',
        class_id: 'class_10_ipa1',
        date: '2026-09-08',
        type: 'Pengeluaran',
        category: 'Kebersihan',
        description: 'Pembelian 2 botol cairan pembersih lantai & pengharum ruangan otomatis',
        amount: 55000,
        balanceAfter: 260000,
        receiptNumber: 'KWT-MRKT-192',
        recordedBy: 'Siti Aisyah (Bendahara)'
      },
      {
        id: 'trs_4',
        class_id: 'class_10_ipa1',
        date: '2026-09-12',
        type: 'Pemasukan',
        category: 'Infaq Jumat',
        description: 'Penggalangan Infaq Jumat Berkah Kelas X MIPA 1',
        amount: 145000,
        balanceAfter: 405000,
        receiptNumber: 'KAS-09-002',
        recordedBy: 'Siti Aisyah (Bendahara)'
      },
      {
        id: 'trs_5',
        class_id: 'class_10_ipa1',
        date: '2026-09-15',
        type: 'Pengeluaran',
        category: 'Foto Kopi / Modul',
        description: 'Penggandaan lembar kerja asesmen formatif Matematika & Fisika',
        amount: 72000,
        balanceAfter: 333000,
        receiptNumber: 'KWT-FC-401',
        recordedBy: 'Siti Aisyah (Bendahara)'
      }
    ],

    // 13) JURNAL KELAS
    classJournals: [
      {
        id: 'jrnl_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-18',
        period: 'Jam ke 1 - 2 (07:45 - 09:15)',
        subjectName: 'Pendidikan Pancasila',
        teacherName: 'Drs. Hendrawan',
        competencyOrTopic: 'Bab 2: Penerapan Norma & Konstitusi dalam Kehidupan Berbangsa',
        materialsSummary: 'Diskusi kelompok mengenai penyelesaian sengketa musyawarah mufakat, presentasi kelompok 1 & 2.',
        attendanceNote: '5 Hadir Lengkap (100%)',
        classIncident: 'KBM berjalan sangat kondusif, siswa antusias berdebat secara sehat.',
        teacherSign: true
      },
      {
        id: 'jrnl_2',
        class_id: 'class_10_ipa1',
        date: '2026-09-17',
        period: 'Jam ke 1 - 2 (07:15 - 08:45)',
        subjectName: 'PJOK',
        teacherName: 'Hendra Setiawan, S.Pd',
        competencyOrTopic: 'Permainan Bola Besar: Variasi Passing & Dribbling Bola Basket',
        materialsSummary: 'Praktek lapangan teknik chest pass, bounce pass, dan overhead pass berpasangan.',
        attendanceNote: '4 Hadir, 1 Izin (Dewi Lestari flu ringan)',
        classIncident: 'Cuaca cerah berawan, semua siswa memakai seragam olahraga lengkap.',
        teacherSign: true
      },
      {
        id: 'jrnl_3',
        class_id: 'class_10_ipa1',
        date: '2026-09-16',
        period: 'Jam ke 2 - 3 (09:00 - 10:30)',
        subjectName: 'Matematika Wajib',
        teacherName: 'Siti Rahmawati, M.Pd',
        competencyOrTopic: 'Sistem Persamaan Linear Tiga Variabel (SPLTV)',
        materialsSummary: 'Metode eliminasi dan substitusi gabungan pada studi kasus permasalahan ekonomi.',
        attendanceNote: '5 Hadir Lengkap (100%)',
        classIncident: 'Latihan soal mandiri 5 nomor, rata-rata ketuntasan mencapai 88%.',
        teacherSign: true
      }
    ],

    // 14) DAFTAR MUTASI
    studentMutations: [
      {
        id: 'mut_1',
        class_id: 'class_10_ipa1',
        type: 'Masuk',
        date: '2026-08-01',
        studentName: 'Bayu Saputra',
        nisn: '0089123455',
        gender: 'L',
        schoolDestinationOrOrigin: 'SMAN 3 Cimahi',
        reason: 'Mengikuti kepindahan domisili orang tua ke Kota Bandung',
        letterNumber: '421.3/089/Disdik/2026',
        statusDocument: 'Lengkap'
      },
      {
        id: 'mut_2',
        class_id: 'class_10_ipa1',
        type: 'Keluar',
        date: '2026-07-28',
        studentName: 'Muhammad Farhan',
        nisn: '0087654321',
        gender: 'L',
        schoolDestinationOrOrigin: 'SMA Taruna Nusantara Magelang',
        reason: 'Diterima melalui seleksi beasiswa jalur prestasi khusus',
        letterNumber: '421.2/104/SMA-MUT/2026',
        statusDocument: 'Lengkap'
      }
    ],

    // 15) CATATAN KASUS
    studentCases: [
      {
        id: 'case_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-02',
        studentId: 'user_std5',
        studentName: 'Bayu Saputra',
        incidentCategory: 'Keterlambatan',
        severity: 'Ringan',
        penaltyPoints: 5,
        chronology: 'Terlambat hadir 15 menit pada jam pelajaran pertama karena rantai sepeda motor lepas di jalan.',
        actionTaken: 'Mendapat teguran lisan, menulis komitmen tepat waktu, dan melakukan piket pembersihan teras perpustakaan.',
        parentSummoned: false,
        resolutionStatus: 'Selesai'
      },
      {
        id: 'case_2',
        class_id: 'class_10_ipa1',
        date: '2026-08-20',
        studentId: 'user_std3',
        studentName: 'Fajar Nugraha',
        incidentCategory: 'HP / Gadget',
        severity: 'Ringan',
        penaltyPoints: 5,
        chronology: 'Memainkan gawai saat penjelasan materi Sejarah tanpa instruksi guru pengajar.',
        actionTaken: 'Ponsel diamankan di meja wali kelas hingga jam pulang sekolah, diberikan pemahaman adab menuntut ilmu.',
        parentSummoned: false,
        resolutionStatus: 'Selesai'
      }
    ],

    // 16) CATATAN PRESTASI SISWA
    studentAchievements: [
      {
        id: 'ach_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-05',
        studentId: 'user_std1',
        studentName: 'Ahmad Rizky Pratama',
        achievementTitle: 'Olimpiade Sains Nasional (OSN) Tingkat Kota Bandung',
        field: 'Sains / Olimpiade',
        competitionLevel: 'Kota / Kabupaten',
        rank: 'Juara 1',
        organizer: 'Pusat Prestasi Nasional & Dinas Pendidikan Kota Bandung',
        coachTeacher: 'Siti Rahmawati, M.Pd',
        notes: 'Lolos mewakili Kota Bandung ke seleksi OSN Tingkat Provinsi Jawa Barat'
      },
      {
        id: 'ach_2',
        class_id: 'class_10_ipa1',
        date: '2026-08-28',
        studentId: 'user_std4',
        studentName: 'Siti Aisyah',
        achievementTitle: 'Lomba Debat Bahasa Indonesia Festival Literasi Pelajar',
        field: 'Akademik',
        competitionLevel: 'Provinsi',
        rank: 'Juara 2',
        organizer: 'Balai Bahasa Jawa Barat & MGMP Bahasa Indonesia',
        coachTeacher: 'Budi Santoso, S.Pd',
        notes: 'Meraih predikat Best Speaker pada babak semifinal'
      },
      {
        id: 'ach_3',
        class_id: 'class_10_ipa1',
        date: '2026-08-15',
        studentId: 'user_std5',
        studentName: 'Bayu Saputra',
        achievementTitle: 'Kejuaraan Futsal Antar Pelajar Piala Walikota',
        field: 'Olahraga',
        competitionLevel: 'Kota / Kabupaten',
        rank: 'Juara 1',
        organizer: 'Asosiasi Futsal Kota Bandung & Koni',
        coachTeacher: 'Hendra Setiawan, S.Pd',
        notes: 'Top Scorer dengan torehan 8 gol sepanjang turnamen'
      }
    ],

    // 17) KUNJUNGAN RUMAH
    homeVisits: [
      {
        id: 'hv_1',
        class_id: 'class_10_ipa1',
        date: '2026-09-04',
        studentId: 'user_std3',
        studentName: 'Fajar Nugraha',
        address: 'Komplek Sukamenak Blok B3, Bandung',
        parentOrGuardianMet: 'Bapak Dedi Nugraha & Ibu Yuyun (Orang Tua)',
        reasonForVisit: 'Prestasi & Bimbingan Khusus',
        discussionSummary: 'Silaturahmi dan penyelarasan program bimbingan belajar persiapan seleksi beasiswa perguruan tinggi dan koordinasi jadwal istirahat Fajar di rumah.',
        parentCommitment: 'Orang tua berkomitmen membatasi waktu bermain game malam hari dan menyediakan suasana belajar tenang.',
        followUpPlan: 'Pemantauan perkembangan akademik bulanan melalui grup komunikasi wali murid.',
        visitingTeachers: 'Budi Santoso, S.Pd (Wali Kelas)',
        status: 'Selesai'
      },
      {
        id: 'hv_2',
        class_id: 'class_10_ipa1',
        date: '2026-08-12',
        studentId: 'user_std5',
        studentName: 'Bayu Saputra',
        address: 'Jl. Bojongsoang Asri No. 101, Bandung',
        parentOrGuardianMet: 'Ibu Lilis Suryani (Ibu Kandung)',
        reasonForVisit: 'Silaturahmi Rutin',
        discussionSummary: 'Kunjungan silaturahmi awal tahun ajaran untuk siswa baru mutasi masuk, perkenalan tata tertib sekolah dan apresiasi bakat olahraga atletik Bayu.',
        parentCommitment: 'Mendukung penuh jadwal latihan futsal sekolah dan memastikan transportasi berangkat sekolah lancar.',
        followUpPlan: 'Pengurusan berkas KIP/PIP di kelurahan dibantu oleh pihak tata usaha sekolah.',
        visitingTeachers: 'Budi Santoso, S.Pd (Wali Kelas) & Rina Marlina, M.Psi (Guru BK)',
        status: 'Selesai'
      }
    ],

    // 18) DOKUMENTASI ADMINISTRASI & MADING KELAS
    classBulletinBoard: [
      {
        id: 'bb_1',
        class_id: 'class_10_ipa1',
        title: 'Panduan & Jadwal Gelar Karya P5 (Projek Penguatan Profil Pelajar Pancasila)',
        category: 'Pengumuman Resmi',
        publishDate: '2026-09-15',
        author: 'Budi Santoso, S.Pd',
        authorRole: 'Wali Kelas X-IPA-1',
        content: 'Diberitahukan kepada seluruh siswa Kelas X-IPA-1 bahwa pameran Gelar Karya P5 bertema "Gaya Hidup Berkelanjutan: Daur Ulang Sampah Organik & Bank Sampah Mandiri" akan dilaksanakan pada hari Rabu, 30 September 2026 di Aula Utama. Setiap kelompok wajib mengunggah proposal ringkas dan poster infografis ke koordinator kelas paling lambat Jumat pekan ini.',
        imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
        tags: ['#P5', '#ProjekProfilPelajarPancasila', '#GayaHidupBerkelanjutan', '#PengumumanResmi'],
        isPinned: true,
        likesCount: 28,
        commentsCount: 6,
        attachmentName: 'Jadwal_Teknis_P5_Kelas_X.pdf'
      },
      {
        id: 'bb_2',
        class_id: 'class_10_ipa1',
        title: 'Dokumentasi Aksi Bersih & Penataan Sudut Baca Literasi Kelas',
        category: 'Dokumentasi Kegiatan',
        publishDate: '2026-09-12',
        author: 'Ahmad Fauzi & Tim Piket',
        authorRole: 'Ketua Kelas & Seksi Kebersihan',
        content: 'Alhamdulillah, kegiatan sabtu bersih dan penataan ulang Pojok Baca / Sudut Literasi kelas telah selesai dilaksanakan dengan penuh semangat kebersamaan. Koleksi buku ilmiah, ensiklopedia mini, dan rak novel donasi siswa telah tertata rapi. Terima kasih atas partisipasi seluruh rekan-rekan!',
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
        tags: ['#SabtuBersih', '#PojokBaca', '#BudayaPositif', '#GotongRoyong'],
        isPinned: false,
        likesCount: 34,
        commentsCount: 4,
        attachmentName: 'Dokumentasi_Foto_Sudut_Baca.jpg'
      },
      {
        id: 'bb_3',
        class_id: 'class_10_ipa1',
        title: 'Puisi Siswa: "Langkah Penjelajah Waktu di Lorong Belajar"',
        category: 'Karya & Kreativitas Siswa',
        publishDate: '2026-09-10',
        author: 'Siti Aminah',
        authorRole: 'Siswa / Seksi Mading & Literasi',
        content: 'Di antara gemersik kertas dan deru angin pagi,\nkita merajut mimpi di papan tulis berdebu.\nBukan hanya tentang angka dan rumus abadi,\ntapi tentang rasa persaudaraan yang tak akan membeku.\nTeruslah melangkah, wahai para pencari cahaya.',
        imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
        tags: ['#PuisiSiswa', '#KaryaLiterasi', '#MadingKreatif', '#Sastra'],
        isPinned: false,
        likesCount: 41,
        commentsCount: 9
      },
      {
        id: 'bb_4',
        class_id: 'class_10_ipa1',
        title: 'Bintang Kelas Pekan Ini: Apresiasi Ketertiban & Karakter Kolaboratif',
        category: 'Prestasi & Apresiasi',
        publishDate: '2026-09-08',
        author: 'Budi Santoso, S.Pd',
        authorRole: 'Wali Kelas X-IPA-1',
        content: 'Selamat kepada Muhammad Rizky dan Siti Aminah atas keteladanan kedisiplinan piket serta inisiatif dalam memfasilitasi belajar kelompok mata pelajaran Kimia & Fisika. Terus tularkan semangat belajar yang sportif dan saling merangkul rekan sekelas.',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
        tags: ['#BintangKelas', '#ApresiasiSiswa', '#KarakterPelajar', '#Inspiratif'],
        isPinned: true,
        likesCount: 52,
        commentsCount: 12
      },
      {
        id: 'bb_5',
        class_id: 'class_10_ipa1',
        title: 'Artikel Literasi: Tips Mengelola Waktu Antara KBM, Organisasi & Istirahat Cukup',
        category: 'Mading Literasi & Opini',
        publishDate: '2026-09-02',
        author: 'Dinda Permata Sari',
        authorRole: 'Siswa / Anggota OSIS',
        content: 'Banyak teman-teman yang merasa kewalahan membagi waktu antara tugas praktikum, rapat ekskul, dan waktu istirahat di rumah. Terapkan teknik Time Boxing 25 menit (Pomodoro) serta susun skala prioritas mingguan untuk menjaga stamina dan konsentrasi belajar tetap prima.',
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        tags: ['#TipsBelajar', '#ManajemenWaktu', '#LiterasiRemaja', '#KesehatanMental'],
        isPinned: false,
        likesCount: 30,
        commentsCount: 5
      }
    ]
  }
};
