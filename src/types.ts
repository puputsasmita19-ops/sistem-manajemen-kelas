export type UserRole = 'admin' | 'wali_kelas' | 'guru' | 'siswa' | 'orang_tua';

export interface User {
  id: string;
  nama: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  no_wa: string;
  nis?: string;
  nip?: string;
  nisn?: string;
  jenis_kelamin?: string;
  alamat?: string;
  last_login?: string; // ISO 8601 timestamp e.g. "2026-09-21T18:30:00.000Z"
}

export interface RunningTextItem {
  id: string;
  badge: string; // e.g. "Sapaan", "Pengumuman", "Sekolah", "Akademik", "Presensi", "Motivasi", "Penting"
  text: string;
  isActive: boolean;
}

export interface AppSettings {
  appName: string;
  appDescription: string;
  logoType: 'icon' | 'image';
  logoIcon: string; // 'School' | 'GraduationCap' | 'BookOpen' | 'Landmark' | 'Award' | 'Sparkles' | 'ShieldCheck'
  logoColor: string; // 'blue' | 'indigo' | 'emerald' | 'purple' | 'amber'
  logoImageUrl?: string;
  creatorName?: string; // Nama pembuat aplikasi (ditampilkan di bagian bawah footer)
  adminPhone?: string;  // Nomor WhatsApp admin untuk bantuan lupa kata sandi
  runningTextSpeed?: number; // Kecepatan putaran detik (default: 28s)
  runningTextIncludeGreeting?: boolean; // Sertakan sapaan otomatis sesuai waktu
  runningTextItems?: RunningTextItem[]; // Daftar pesan running text yang dapat diedit admin
  // Geofence & Realtime Attendance Settings
  schoolLatitude?: number; // default: -6.2088
  schoolLongitude?: number; // default: 106.8456
  schoolRadiusMeters?: number; // default: 200m
  schoolAddress?: string; // default: 'Kompleks Pendidikan Utama No. 1, Jakarta'
  attendanceCutoffTime?: string; // default: '07:30'
  antiCheatEnabled?: boolean; // default: true (sistem keamanan anti cheat & rekayasa aktif)
  antiCheatSecurityPopupsEnabled?: boolean; // default: true (switch on/off pop-up peringatan keamanan anti cheat dan anti rekayasa)
  antiCheatBlockDevTools?: boolean; // default: true (blokir F12, Inspect Element)
  antiCheatBlockRightClick?: boolean; // default: true (blokir menu klik kanan & long press)
  antiCheatBlockCopyPaste?: boolean; // default: true (blokir penyalinan teks antarmuka)
  // Pengaturan Kertas Dokumen Cetak / PDF
  paperSize?: 'a4' | 'f4' | 'letter' | 'legal'; // default: 'a4'
  paperOrientation?: 'portrait' | 'landscape'; // default: 'portrait'
  paperMarginTop?: number; // default: 15 mm
  paperMarginBottom?: number; // default: 15 mm
  paperMarginLeft?: number; // default: 15 mm
  paperMarginRight?: number; // default: 15 mm
  paperPageNumbering?: boolean; // default: true
  // Pengaturan Kop Surat Resmi Kedinasan
  kopEnabled?: boolean; // default: true
  kopInstansiUtama?: string; // default: 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA'
  kopDinas?: string; // default: 'DINAS PENDIDIKAN DAN KEBUDAYAAN'
  kopNamaSekolah?: string; // default: 'SMA NEGERI UNGGULAN INDONESIA'
  kopSubHeading?: string; // default: 'SEKOLAH PENGGERAK • STATUS AKREDITASI A (UNGGUL)'
  kopAlamat?: string; // default: 'Jl. Pendidikan Nasional No. 45, Kompleks Edukasi, Jakarta'
  kopKontak?: string; // default: 'Telp: (021) 7890123 • Email: info@sekolah.sch.id • Web: www.sekolah.sch.id'
  kopKodePos?: string; // default: 'Kode Pos: 12345'
  kopLogoUrl?: string; // logo khusus kop surat (opsional, jika kosong pakai logo sekolah)
  kopLogoPosition?: 'left' | 'both' | 'center'; // default: 'left'
  kopBorderType?: 'double' | 'single' | 'none'; // default: 'double'
  // Pengaturan Tanda Tangan & Legalisasi Dokumen
  signatureEnabled?: boolean; // default: true
  signatureKota?: string; // default: 'Jakarta'
  signatureTanggalOtomatis?: boolean; // default: true (mengikuti tanggal cetak sistem)
  signatureTanggalManual?: string; // default: '' (diisi jika tanggal manual dipilih)
  signatureJabatanKiri?: string; // default: 'Wali Kelas / Petugas Administrasi'
  signatureNamaKiri?: string; // default: 'Dra. Hj. Siti Rahmawati, M.Pd'
  signatureNipKiri?: string; // default: 'NIP. 19780512 200312 2 001'
  signatureLeftImageUrl?: string; // Tanda tangan digital resmi petugas / wali kelas (PNG/JPG transparan)
  signatureJabatanKanan?: string; // default: 'Kepala Sekolah'
  signatureNamaKanan?: string; // default: 'Dr. H. Bambang Sudarsono, M.Si'
  signatureNipKanan?: string; // default: 'NIP. 19690415 199403 1 004'
  signatureRightImageUrl?: string; // Tanda tangan digital resmi Kepala Sekolah (PNG/JPG transparan)
  signatureStampUrl?: string; // stempel digital resmi instansi (opsional)
  signatureQrVerification?: boolean; // default: true (QR Code verifikasi keaslian dokumen digital)
  // Drag-and-drop interactive layout positions
  signaturePosKiri?: 'left_signer' | 'right_signer' | 'empty'; // default: 'left_signer'
  signaturePosTengah?: 'left_signer' | 'right_signer' | 'empty'; // default: 'empty'
  signaturePosKanan?: 'left_signer' | 'right_signer' | 'empty'; // default: 'right_signer'
}

export interface ClassEntity {
  id: string;
  nama_kelas: string;
  wali_kelas_id: string; // FK -> users.id (role: wali_kelas)
  tahun_ajaran: string;
}

export interface Subject {
  id: string;
  nama_mapel: string;
  guru_id: string; // FK -> users.id (role: guru)
}

export interface ClassMember {
  id: string;
  class_id: string; // FK -> classes.id
  student_id: string; // FK -> users.id (role: siswa)
}

export type AttendanceStatus = 'H' | 'I' | 'S' | 'A'; // Hadir, Izin, Sakit, Alpa

export type TimeRangeFilter = 'mingguan' | 'bulanan' | 'semester';

export interface Attendance {
  id: string;
  class_id: string; // FK -> classes.id
  subject_id: string; // FK -> subjects.id (bisa 'HOMEROOM' jika presensi harian)
  date: string; // YYYY-MM-DD
  student_id: string; // FK -> users.id
  status: AttendanceStatus;
  note?: string;
  notes?: string;
  // Realtime Selfie & Geolocation validation metadata
  photoUrl?: string; // Base64 data URL dengan watermark stempel waktu & GPS
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lng: number };
  accuracy?: number; // Radius akurasi GPS dalam meter
  address?: string; // Alamat / landmark
  timestamp?: string; // Format: "07:15:22 WIB"
  isWithinRadius?: boolean; // True jika dalam batas radius geofence sekolah
  distanceMeters?: number; // Jarak kalkulasi meter ke titik pusat sekolah
  deviceInfo?: string; // Informasi peramban / perangkat
  verifiedBy?: 'self_scan_gps' | 'manual_teacher' | 'quick_qr' | 'admin';
  verified?: boolean;
}

export type GradeType = 'Tugas' | 'UTS' | 'UAS';

export interface Grade {
  id: string;
  student_id: string; // FK -> users.id
  subject_id: string; // FK -> subjects.id
  type: GradeType;
  score: number;
}

export interface ParentStudentRelation {
  id: string;
  parent_id: string; // FK -> users.id (role: orang_tua)
  student_id: string; // FK -> users.id (role: siswa)
}

export type AnnouncementCategory = 'Penting' | 'Akademik' | 'Kegiatan' | 'Libur';

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: AnnouncementCategory;
  author: string;
  authorRole: UserRole;
  priority: 'high' | 'normal';
  targetRole: 'all' | 'siswa' | 'guru' | 'wali_kelas' | 'orang_tua';
}

export type AcademicEventCategory = 'ujian' | 'libur' | 'kegiatan' | 'rapat' | 'rapor';

export interface AcademicEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  category: AcademicEventCategory;
  location?: string;
  targetRole?: 'all' | 'siswa' | 'guru' | 'wali_kelas' | 'orang_tua';
  isHoliday?: boolean;
}

// Master Data Akademik Model Definitions
export interface AcademicYear {
  id: string;
  tahun: string; // e.g., "2025/2026"
  semesterAktif: 'Ganjil' | 'Genap';
  status: 'Aktif' | 'Arsip' | 'Mendatang';
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  kepalaSekolah: string;
  nipKepalaSekolah: string;
}

export interface Curriculum {
  id: string;
  kode: string; // e.g., "KM-2024"
  nama: string; // e.g., "Kurikulum Merdeka"
  tingkat: string[]; // e.g., ["Fase E (Kelas X)", "Fase F (Kelas XI)", "Fase F (Kelas XII)"]
  status: 'Aktif' | 'Transisi' | 'Nonaktif';
  deskripsi: string;
}

export interface Department {
  id: string;
  kode: string; // e.g., "MIPA", "IPS", "RPL", "TKJ"
  nama: string; // e.g., "Matematika & Ilmu Pengetahuan Alam"
  kepalaProgram: string;
  kuota: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface MasterSubject {
  id: string;
  kode_mapel: string; // e.g., "MP-MAT-01"
  nama_mapel: string;
  kelompok: 'Umum / Wajib' | 'Peminatan / Kejuruan' | 'Muatan Lokal' | 'Pilihan';
  kkm: number; // e.g., 75
  tingkatKelas: string; // e.g., "Semua" | "Kelas X" | "Kelas XI" | "Kelas XII"
  guru_id: string; // FK -> users.id
  alokasiJamPerMinggu: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface Extracurricular {
  id: string;
  nama: string;
  pembina: string;
  hariLatihan: string;
  jamLatihan: string;
  lokasi: string;
  jumlahAnggota: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface StudyScheduleSlot {
  id: string;
  jamKe: number;
  waktuMulai: string; // e.g., "07:00"
  waktuSelesai: string; // e.g., "07:45"
  keterangan: string; // e.g., "Upacara / Apel Pagi", "KBM 1", "Istirahat 1"
  isBreak: boolean;
}

export type ActivityActionType =
  | 'login'
  | 'logout'
  | 'password_reset_request'
  | 'grade_input'
  | 'grade_update'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_batch_delete'
  | 'user_batch_role_change'
  | 'attendance_input'
  | 'qr_attendance_scan'
  | 'qr_session_create'
  | 'announcement_create'
  | 'announcement_delete'
  | 'settings_update'
  | 'export_pdf'
  | 'export_data'
  | 'import_data'
  | 'bulk_action'
  | 'master_academic_create'
  | 'master_academic_update'
  | 'master_academic_delete'
  | 'master_academic_sync'
  | 'scheduled_export_run'
  | 'scheduled_export_config_update'
  | 'scheduled_export_delete';

export type ScheduledReportType =
  | 'attendance_recap'
  | 'grades_recap'
  | 'comprehensive_academic'
  | 'homeroom_summary';

export type ScheduleFrequency =
  | 'monthly_end'
  | 'weekly'
  | 'daily'
  | 'semester_end'
  | 'custom_day'
  | 'custom_month_range';

export interface ScheduledExportConfig {
  id: string;
  title: string;
  description?: string;
  reportType: ScheduledReportType;
  frequency: ScheduleFrequency;
  timeOfDay: string; // HH:mm e.g. "23:59" or "17:00"
  dayOfMonth?: number; // 1-31 (or 0 for last day of month)
  dayOfWeek?: number; // 0: Sunday, 1: Monday ... 5: Friday, 6: Saturday
  targetClassId: string; // 'all' or class ID
  targetSubjectId?: string; // 'all' or subject ID
  includeSignatures: boolean;
  includeKopSurat: boolean;
  paperSize: 'a4' | 'f4' | 'letter' | 'legal';
  paperOrientation: 'portrait' | 'landscape';
  storageDestination: 'firebase_storage' | 'cloud_and_local';
  isEnabled: boolean;
  // Rentang bulan spesifik untuk ekspor
  startMonth?: number; // 1-12
  startYear?: number;
  endMonth?: number; // 1-12
  endYear?: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledExportReport {
  id: string;
  scheduleId?: string;
  title: string;
  fileName: string;
  reportType: ScheduledReportType;
  frequencyType: string;
  periodLabel: string;
  generatedAt: string; // ISO string
  fileSizeBytes: number;
  fileSizeFormatted: string;
  storagePath: string;
  downloadUrl: string;
  pdfBase64?: string;
  status: 'completed' | 'failed' | 'processing';
  generatedBy: string;
  totalRecordsCount?: number;
  downloadCount?: number;
  storageProvider: 'firebase_storage' | 'cloud_synced';
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  userRole: UserRole;
  actionType: ActivityActionType;
  actionTitle: string;
  details: string;
  targetEntity?: string;
  metadata?: Record<string, any>;
  ipOrDevice?: string;
  syncedToFirebase?: boolean;
}

export interface DynamicQRAttendee {
  studentId: string;
  nama: string;
  scannedAt: string;
  method?: string;
  deviceInfo?: string;
}

export interface DynamicQRSession {
  sessionId: string;
  classId: string;
  subjectId: string;
  classNameTitle: string;
  subjectNameTitle: string;
  date: string;
  validDurationMinutes: number; // e.g. 1, 3, 5, 10, 15, 30
  createdAt: string; // ISO
  expiresAt: string; // ISO
  token: string;
  otpCode: string;
  autoRotateSeconds: number; // 0 = off, 15, 30
  rotateIndex: number;
  status: 'active' | 'expired' | 'locked';
  createdBy?: string;
  scannedStudents: DynamicQRAttendee[];
}

export interface DatabaseSnapshot {
  users: Record<string, User>;
  classes: Record<string, ClassEntity>;
  subjects: Record<string, Subject>;
  class_members: Record<string, ClassMember>;
  attendance: Record<string, Attendance>;
  grades: Record<string, Grade>;
  parent_student_relations: Record<string, ParentStudentRelation>;
  announcements: Record<string, SchoolAnnouncement>;
  academic_events?: Record<string, AcademicEvent>;
  activity_logs?: Record<string, ActivityLog>;
  app_settings?: AppSettings;
  academic_years?: Record<string, AcademicYear>;
  curriculums?: Record<string, Curriculum>;
  departments?: Record<string, Department>;
  master_subjects?: Record<string, MasterSubject>;
  extracurriculars?: Record<string, Extracurricular>;
  study_schedules?: Record<string, StudyScheduleSlot>;
  scheduled_export_configs?: Record<string, ScheduledExportConfig>;
  scheduled_reports?: Record<string, ScheduledExportReport>;
  dynamic_qr_sessions?: Record<string, DynamicQRSession>;
}
