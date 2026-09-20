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

export type ActivityActionType =
  | 'login'
  | 'logout'
  | 'grade_input'
  | 'grade_update'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_batch_delete'
  | 'user_batch_role_change'
  | 'attendance_input'
  | 'announcement_create'
  | 'announcement_delete'
  | 'settings_update'
  | 'export_pdf'
  | 'export_data'
  | 'import_data'
  | 'bulk_action';

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
}
