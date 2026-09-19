export type UserRole = 'admin' | 'wali_kelas' | 'guru' | 'siswa' | 'orang_tua';

export interface User {
  id: string;
  nama: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  no_wa: string;
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

export interface DatabaseSnapshot {
  users: Record<string, User>;
  classes: Record<string, ClassEntity>;
  subjects: Record<string, Subject>;
  class_members: Record<string, ClassMember>;
  attendance: Record<string, Attendance>;
  grades: Record<string, Grade>;
  parent_student_relations: Record<string, ParentStudentRelation>;
  announcements: Record<string, SchoolAnnouncement>;
  app_settings?: AppSettings;
}
