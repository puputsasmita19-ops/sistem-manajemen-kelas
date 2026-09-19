export interface LessonScheduleItem {
  id: string;
  class_id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  periodNumber: number; // Jam Ke-1, Ke-2, dst
  timeRange: string; // e.g. 07:15 - 08:00
  subjectName: string;
  teacherName: string;
  room: string;
}

export interface PiketScheduleItem {
  id: string;
  class_id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  studentIds: string[];
  studentNames: string[];
  zoneDuties: string; // e.g. Sapu Lantai, Bersihkan Papan Tulis & Jendela
}

export interface ClassAgreementItem {
  id: string;
  class_id: string;
  ruleTitle: string;
  description: string;
  category: 'Kedisiplinan' | 'Kebersihan' | 'Etika & Sopan Santun' | 'Akademik' | 'Kerjasama';
  consequence: string;
}

export interface ClassAgreementDoc {
  id: string;
  class_id: string;
  title: string;
  motto: string;
  signedDate: string;
  homeroomTeacher: string;
  classPresident: string;
  rules: ClassAgreementItem[];
}

export interface DeskPosition {
  deskNumber: number;
  row: number; // 1 to 4
  col: number; // 1 to 4
  student1Id?: string;
  student1Name?: string;
  student2Id?: string;
  student2Name?: string;
}

export interface SeatingLayout {
  class_id: string;
  rows: number;
  cols: number;
  teacherDeskPosition: 'Kiri Depan' | 'Tengah Depan' | 'Kanan Depan';
  desks: DeskPosition[];
  updatedAt: string;
}

export interface StudentIdentityItem {
  id: string;
  studentId: string;
  class_id: string;
  nis: string;
  nisn: string;
  fullName: string;
  nickname: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  religion: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Konghucu';
  address: string;
  distanceToSchoolKm: number;
  transportation: 'Jalan Kaki' | 'Sepeda' | 'Sepeda Motor' | 'Angkutan Umum' | 'Diantar Orang Tua';
  bloodType: 'A' | 'B' | 'AB' | 'O' | '-';
  fatherName: string;
  motherName: string;
  parentOccupation: string;
  parentPhone: string;
  economicStatus: 'Mampu' | 'KIP / PIP' | 'Prasejahtera';
  healthNotes: string;
}

export interface ClassStructure {
  class_id: string;
  homeroomTeacher: string;
  president: string;
  vicePresident: string;
  secretary1: string;
  secretary2: string;
  treasurer1: string;
  treasurer2: string;
  sectionCleaning: string[];
  sectionSecurity: string[];
  sectionReligious: string[];
  sectionSports: string[];
  sectionPublicRelations: string[];
  sectionEquipment: string[];
}

export interface ClassInventoryItem {
  id: string;
  class_id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string; // buah, unit, stel, set
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  source: 'Sekolah' | 'BOS' | 'Kas Kelas / Swadaya' | 'Komite';
  notes: string;
  lastCheckedDate: string;
}

export interface ClassGuidanceItem {
  id: string;
  class_id: string;
  date: string;
  studentId: string;
  studentName: string;
  guidanceType: 'Akademik / Belajar' | 'Pribadi' | 'Sosial / Pertemanan' | 'Kedisiplinan / Karakter';
  problemDescription: string;
  counselingGiven: string;
  followUpPlan: string;
  status: 'Selesai' | 'Dalam Proses' | 'Perlu Monitoring' | 'Dirujuk ke Guru BK';
}

export interface PiketAttendanceRecord {
  id: string;
  class_id: string;
  date: string;
  day: string;
  cleanlinessScore: number; // 1 - 100
  inspectorName: string;
  attendanceList: {
    studentId: string;
    studentName: string;
    status: 'Melaksanakan' | 'Tidak Melaksanakan' | 'Izin';
    notes?: string;
  }[];
  evaluationNotes: string;
}

export interface AttitudeAssessmentItem {
  id: string;
  class_id: string;
  studentId: string;
  studentName: string;
  spiritualScore: 'SB' | 'B' | 'C' | 'PB'; // Sangat Baik, Baik, Cukup, Perlu Bimbingan
  socialScore: 'SB' | 'B' | 'C' | 'PB';
  spiritualDescription: string; // e.g. Selalu taat beribadah, berdoa sebelum belajar
  socialDescription: string; // e.g. Memiliki sikap santun, disiplin tinggi dan gotong royong
  specialNotes?: string;
  incidents: {
    date: string;
    trait: string;
    type: 'Positif' | 'Negatif';
    action: string;
  }[];
}

export interface ClassTreasuryTransaction {
  id: string;
  class_id: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: 'Iuran Kas Rutin' | 'Infaq Jumat' | 'Foto Kopi / Modul' | 'Kebersihan' | 'Kegiatan Kelas' | 'Lainnya';
  description: string;
  amount: number;
  balanceAfter: number;
  receiptNumber?: string;
  recordedBy: string;
}

export interface ClassJournalItem {
  id: string;
  class_id: string;
  date: string;
  period: string; // Jam ke-1 - 2 (07:15 - 08:45)
  subjectName: string;
  teacherName: string;
  competencyOrTopic: string;
  materialsSummary: string;
  attendanceNote: string; // e.g. 35 Hadir, 1 Izin (Dewi)
  classIncident: string;
  teacherSign: boolean;
}

export interface StudentMutationItem {
  id: string;
  class_id: string;
  type: 'Masuk' | 'Keluar';
  date: string;
  studentName: string;
  nisn: string;
  gender: 'L' | 'P';
  schoolDestinationOrOrigin: string;
  reason: string;
  letterNumber: string;
  statusDocument: 'Lengkap' | 'Menunggu Berkas' | 'Diverifikasi Dinas';
}

export interface StudentCaseItem {
  id: string;
  class_id: string;
  date: string;
  studentId: string;
  studentName: string;
  incidentCategory: 'Keterlambatan' | 'Kerapian / Seragam' | 'Perkelahian / Konflik' | 'Bolos / Tidak Masuk' | 'HP / Gadget' | 'Tindakan Lainnya';
  severity: 'Ringan' | 'Sedang' | 'Berat';
  penaltyPoints: number;
  chronology: string;
  actionTaken: string;
  parentSummoned: boolean;
  resolutionStatus: 'Selesai' | 'Dalam Pembinaan' | 'Dirujuk ke Guru BK' | 'Surat Peringatan (SP)';
}

export interface StudentAchievementItem {
  id: string;
  class_id: string;
  date: string;
  studentId: string;
  studentName: string;
  achievementTitle: string;
  field: 'Akademik' | 'Sains / Olimpiade' | 'Olahraga' | 'Seni & Budaya' | 'Teknologi / Robotik' | 'Keagamaan / MTQ';
  competitionLevel: 'Sekolah' | 'Kecamatan' | 'Kota / Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  rank: 'Juara 1' | 'Juara 2' | 'Juara 3' | 'Harapan 1' | 'Finalis' | 'Best Speaker / Participant';
  organizer: string;
  coachTeacher?: string;
  notes?: string;
}

export interface HomeVisitItem {
  id: string;
  class_id: string;
  date: string;
  studentId: string;
  studentName: string;
  address: string;
  parentOrGuardianMet: string;
  reasonForVisit: 'Ketidakhadiran Berturut-turut' | 'Kesehatan / Sakit Lama' | 'Prestasi & Bimbingan Khusus' | 'Masalah Disiplin' | 'Silaturahmi Rutin';
  discussionSummary: string;
  parentCommitment: string;
  followUpPlan: string;
  visitingTeachers: string; // e.g. Budi Santoso, S.Pd (Wali Kelas) & Rina, S.Psi (Guru BK)
  status: 'Selesai' | 'Perlu Kunjungan Lanjutan' | 'Dalam Pantauan';
}

export type HomeVisitRecord = HomeVisitItem;
export type StudentAttitudeAssessment = AttitudeAssessmentItem;

// 18) DOKUMENTASI ADMINISTRASI & MADING KELAS
export type BulletinCategory =
  | 'Pengumuman Resmi'
  | 'Dokumentasi Kegiatan'
  | 'Karya & Kreativitas Siswa'
  | 'Mading Literasi & Opini'
  | 'Prestasi & Apresiasi';

export interface ClassBulletinBoardItem {
  id: string;
  class_id: string;
  title: string;
  category: BulletinCategory;
  publishDate: string;
  author: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
  isPinned?: boolean;
  likesCount?: number;
  commentsCount?: number;
  attachmentName?: string;
}

export type ClassMadingItem = ClassBulletinBoardItem;

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

export type HomeroomDataPackage = HomeroomClassData;

