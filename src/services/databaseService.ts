import { INITIAL_DATABASE } from '../mockData';
import { DatabaseSnapshot, User, ClassEntity, Subject, Attendance, Grade, UserRole, AttendanceStatus, GradeType, SchoolAnnouncement, AppSettings, RunningTextItem, AcademicEvent, ActivityLog, ActivityActionType } from '../types';
import { FirestoreSyncService } from './firestoreSyncService';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

const STORAGE_KEY = 'SIMAK_FIREBASE_RTDB_SIMULATION';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: DatabaseSnapshot;
  private announcementListeners: Array<(ann: SchoolAnnouncement) => void> = [];
  private settingsListeners: Array<(settings: AppSettings) => void> = [];
  private gradeUpdateListeners: Array<(info: {
    studentId: string;
    studentName: string;
    subjectName: string;
    scoreType: string;
    score: number;
    updatedBy: string;
  }) => void> = [];
  private activityLogListeners: Array<(logs: ActivityLog[]) => void> = [];

  private constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.db = JSON.parse(saved);
        if (!this.db.announcements) {
          this.db.announcements = JSON.parse(JSON.stringify(INITIAL_DATABASE.announcements || {}));
        }
        if (!this.db.academic_events || Object.keys(this.db.academic_events).length === 0) {
          this.db.academic_events = JSON.parse(JSON.stringify(INITIAL_DATABASE.academic_events || {}));
        }
        if (!this.db.activity_logs || Object.keys(this.db.activity_logs).length === 0) {
          this.db.activity_logs = JSON.parse(JSON.stringify(INITIAL_DATABASE.activity_logs || {}));
        }
        if (!this.db.attendance || Object.keys(this.db.attendance).length < 25) {
          this.db.attendance = {
            ...JSON.parse(JSON.stringify(INITIAL_DATABASE.attendance || {})),
            ...(this.db.attendance || {})
          };
        }
        if (!this.db.app_settings) {
          this.db.app_settings = JSON.parse(JSON.stringify(INITIAL_DATABASE.app_settings));
        } else {
          if (!this.db.app_settings.creatorName) {
            this.db.app_settings.creatorName = 'Puput Sasmita';
          }
          if (!this.db.app_settings.adminPhone) {
            this.db.app_settings.adminPhone = '0812-3456-7890';
          }
        }
        // Ensure all users have a username and default credentials
        Object.values(this.db.users).forEach(u => {
          if (!u.username) {
            if (u.role === 'admin') u.username = 'admin';
            else if (u.role === 'wali_kelas') u.username = 'walikelas';
            else if (u.role === 'guru') u.username = 'guru';
            else if (u.role === 'siswa') u.username = 'siswa';
            else if (u.role === 'orang_tua') u.username = 'ortu';
            else u.username = u.email ? u.email.split('@')[0] : 'user';
          }
        });

        // Guarantee default core role accounts exist with exact default credentials
        const defaultRoleUsers = [
          { id: 'user_admin1', role: 'admin', username: 'admin', password_hash: 'admin123', nama: 'Bambang Wijaya, M.Kom', email: 'admin@sekolah.id', no_wa: '081234567890' },
          { id: 'user_wk1', role: 'wali_kelas', username: 'walikelas', password_hash: 'wali123', nama: 'Budi Santoso, S.Pd', email: 'budi.santoso@sekolah.id', no_wa: '081234567891' },
          { id: 'user_guru1', role: 'guru', username: 'guru', password_hash: 'guru123', nama: 'Siti Rahmawati, M.Pd', email: 'siti.rahma@sekolah.id', no_wa: '081234567892' },
          { id: 'user_std1', role: 'siswa', username: 'siswa', password_hash: 'siswa123', nama: 'Ahmad Rizky Pratama', email: 'ahmad.rizky@siswa.sekolah.id', no_wa: '082198765431' },
          { id: 'user_par1', role: 'orang_tua', username: 'ortu', password_hash: 'ortu123', nama: 'Hendra Pratama (Ayah Ahmad)', email: 'hendra.pratama@gmail.com', no_wa: '081399887766' }
        ];

        defaultRoleUsers.forEach(defUser => {
          if (!this.db.users[defUser.id]) {
            this.db.users[defUser.id] = { ...defUser as User };
          } else {
            // Synchronize default username & password_hash if not set or corrupted
            if (!this.db.users[defUser.id].username) this.db.users[defUser.id].username = defUser.username;
            if (!this.db.users[defUser.id].password_hash) this.db.users[defUser.id].password_hash = defUser.password_hash;
          }
        });
        this.persist();
      } catch (e) {
        console.error('Failed to parse local DB, using initial', e);
        this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
      }
    } else {
      this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
      this.persist();
    }

    // Cross-tab and window synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.db = JSON.parse(e.newValue);
            if (this.db.app_settings) {
              this.settingsListeners.forEach(l => {
                try {
                  l(this.db.app_settings!);
                } catch (err) {
                  console.error('Error notifying settings listener from storage event', err);
                }
              });
            }
          } catch (err) {
            console.error('Error parsing updated DB from storage event', err);
          }
        }
      });
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.warn('Failed to persist local DB to localStorage:', e);
    }
  }

  public resetDatabase(): void {
    this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.persist();
  }

  public getRawSnapshot(): DatabaseSnapshot {
    return this.db;
  }

  // --- APP SETTINGS (Identitas, Logo & Running Text) ---
  public getAppSettings(): AppSettings {
    const defaultRunningItems: RunningTextItem[] = [
      {
        id: 'rt_1',
        badge: 'Sapaan',
        text: 'Tetap produktif mengawal aktivitas belajar mengajar hari ini.',
        isActive: true
      },
      {
        id: 'rt_2',
        badge: 'Sekolah',
        text: 'Selamat Datang di Portal Resmi Sistem Informasi Manajemen Sekolah',
        isActive: true
      },
      {
        id: 'rt_3',
        badge: 'Akademik',
        text: 'Tahun Ajaran 2024/2025 • Semester Aktif',
        isActive: true
      },
      {
        id: 'rt_4',
        badge: 'Presensi',
        text: 'Wajib lapor kehadiran harian & rekap administrasi tepat waktu',
        isActive: true
      },
      {
        id: 'rt_5',
        badge: 'Pengumuman',
        text: 'Mewujudkan ekosistem sekolah digital yang transparan, adaptif, dan berakhlak mulia',
        isActive: true
      }
    ];

    if (!this.db.app_settings) {
      this.db.app_settings = {
        appName: "SIMAK",
        appDescription: "Sistem Informasi Manajemen Kelas",
        logoType: "icon",
        logoIcon: "School",
        logoColor: "blue",
        logoImageUrl: "",
        creatorName: "Puput Sasmita",
        adminPhone: "0812-3456-7890",
        runningTextSpeed: 28,
        runningTextIncludeGreeting: true,
        runningTextItems: defaultRunningItems,
        schoolLatitude: -6.2088,
        schoolLongitude: 106.8456,
        schoolRadiusMeters: 200,
        schoolAddress: "Kompleks Pendidikan Utama No. 1, Jakarta",
        attendanceCutoffTime: "07:30",
        antiCheatEnabled: true,
        antiCheatSecurityPopupsEnabled: true,
        antiCheatBlockDevTools: true,
        antiCheatBlockRightClick: true,
        antiCheatBlockCopyPaste: true
      };
      this.persist();
    } else {
      if (!this.db.app_settings.creatorName) {
        this.db.app_settings.creatorName = 'Puput Sasmita';
      }
      if (!this.db.app_settings.adminPhone) {
        this.db.app_settings.adminPhone = '0812-3456-7890';
      }
      if (this.db.app_settings.runningTextItems === undefined) {
        this.db.app_settings.runningTextItems = defaultRunningItems;
      }
      if (!this.db.app_settings.runningTextSpeed) {
        this.db.app_settings.runningTextSpeed = 28;
      }
      if (this.db.app_settings.runningTextIncludeGreeting === undefined) {
        this.db.app_settings.runningTextIncludeGreeting = true;
      }
      if (this.db.app_settings.schoolLatitude === undefined) {
        this.db.app_settings.schoolLatitude = -6.2088;
      }
      if (this.db.app_settings.schoolLongitude === undefined) {
        this.db.app_settings.schoolLongitude = 106.8456;
      }
      if (this.db.app_settings.schoolRadiusMeters === undefined) {
        this.db.app_settings.schoolRadiusMeters = 200;
      }
      if (!this.db.app_settings.schoolAddress) {
        this.db.app_settings.schoolAddress = 'Kompleks Pendidikan Utama No. 1, Jakarta';
      }
      if (!this.db.app_settings.attendanceCutoffTime) {
        this.db.app_settings.attendanceCutoffTime = '07:30';
      }
      if (this.db.app_settings.antiCheatEnabled === undefined) {
        this.db.app_settings.antiCheatEnabled = true;
      }
      if (this.db.app_settings.antiCheatSecurityPopupsEnabled === undefined) {
        this.db.app_settings.antiCheatSecurityPopupsEnabled = true;
      }
      if (this.db.app_settings.antiCheatBlockDevTools === undefined) {
        this.db.app_settings.antiCheatBlockDevTools = true;
      }
      if (this.db.app_settings.antiCheatBlockRightClick === undefined) {
        this.db.app_settings.antiCheatBlockRightClick = true;
      }
      if (this.db.app_settings.antiCheatBlockCopyPaste === undefined) {
        this.db.app_settings.antiCheatBlockCopyPaste = true;
      }
    }
    return this.db.app_settings;
  }

  public updateAppSettings(newSettings: Partial<AppSettings>): AppSettings {
    const current = this.getAppSettings();
    this.db.app_settings = { ...current, ...newSettings };
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('app_settings', 'global_config', this.db.app_settings);
    this.settingsListeners.forEach(l => {
      try {
        l(this.db.app_settings!);
      } catch (e) {
        console.error('Error notifying settings listener', e);
      }
    });
    return this.db.app_settings;
  }

  public subscribeAppSettings(listener: (settings: AppSettings) => void): () => void {
    this.settingsListeners.push(listener);
    return () => {
      this.settingsListeners = this.settingsListeners.filter(l => l !== listener);
    };
  }

  // --- REAL-TIME DATA REFRESH LISTENERS (DASHBOARD & CHARTS) ---
  private dataChangeListeners: (() => void)[] = [];

  public notifyDataChange(): void {
    this.dataChangeListeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.warn('Data change listener error:', e);
      }
    });
  }

  public subscribeDataChange(listener: () => void): () => void {
    this.dataChangeListeners.push(listener);
    return () => {
      this.dataChangeListeners = this.dataChangeListeners.filter(l => l !== listener);
    };
  }

  // --- ACTIVITY LOGS (LOG AKTIVITAS SISTEM & AUDIT TRAIL) ---
  public logActivity(
    actionType: ActivityActionType,
    actionTitle: string,
    details: string,
    targetEntity?: string,
    metadata?: Record<string, any>,
    userOverride?: { id: string; nama: string; role: UserRole }
  ): ActivityLog {
    if (!this.db.activity_logs) {
      this.db.activity_logs = {};
    }

    let actorId = 'user_admin1';
    let actorName = 'Admin';
    let actorRole: UserRole = 'admin';

    if (userOverride) {
      actorId = userOverride.id;
      actorName = userOverride.nama;
      actorRole = userOverride.role;
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('SIMAK_ACTIVE_USER_SESSION');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            actorId = parsed.id;
            actorName = parsed.nama || actorName;
            actorRole = parsed.role || actorRole;
          }
        }
      } catch (e) {}
    }

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newLog: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      userId: actorId,
      userName: actorName,
      userRole: actorRole,
      actionType,
      actionTitle,
      details,
      targetEntity,
      metadata,
      ipOrDevice: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Chrome / Desktop' : 'Web Client') : 'Web Client',
      syncedToFirebase: true
    };

    this.db.activity_logs[logId] = newLog;
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('logs', logId, newLog);

    const allLogs = this.getAllActivityLogs();
    this.activityLogListeners.forEach(listener => {
      try {
        listener(allLogs);
      } catch (e) {}
    });

    return newLog;
  }

  public getAllActivityLogs(): ActivityLog[] {
    if (!this.db.activity_logs || Object.keys(this.db.activity_logs).length === 0) {
      this.db.activity_logs = JSON.parse(JSON.stringify(INITIAL_DATABASE.activity_logs || {}));
      this.persist();
    }
    return Object.values(this.db.activity_logs || {}).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public clearActivityLogs(): void {
    this.db.activity_logs = {};
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('logs', 'cleared_marker', { clearedAt: new Date().toISOString() });
    this.activityLogListeners.forEach(l => {
      try { l([]); } catch (e) {}
    });
  }

  public subscribeActivityLogs(listener: (logs: ActivityLog[]) => void): () => void {
    this.activityLogListeners.push(listener);
    listener(this.getAllActivityLogs());
    return () => {
      this.activityLogListeners = this.activityLogListeners.filter(l => l !== listener);
    };
  }

  public exportLogsToCSV(): void {
    const logs = this.getAllActivityLogs();
    const headers = ['No', 'Waktu (ISO/WIB)', 'Nama Pengguna', 'Peran (Role)', 'Tipe Aksi', 'Judul Aktivitas', 'Rincian Aktivitas', 'Perangkat/Klien'];
    const rows = logs.map((l, idx) => [
      `"${idx + 1}"`,
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userRole.toUpperCase()}"`,
      `"${l.actionType}"`,
      `"${l.actionTitle.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.ipOrDevice || '-').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const fileName = `SIMAK_Audit_Log_Aktivitas_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSVFile(csvContent, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Log Aktivitas Berhasil Diekspor',
      text: `File "${fileName}" berisi ${logs.length} catatan audit log berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  // --- REAL-TIME EVENT LISTENERS (GRADES & ANNOUNCEMENTS) ---
  public subscribeGradeUpdates(listener: (info: {
    studentId: string;
    studentName: string;
    subjectName: string;
    scoreType: string;
    score: number;
    updatedBy: string;
  }) => void): () => void {
    this.gradeUpdateListeners.push(listener);
    return () => {
      this.gradeUpdateListeners = this.gradeUpdateListeners.filter(l => l !== listener);
    };
  }

  public notifyGradeUpdate(info: {
    studentId: string;
    studentName: string;
    subjectName: string;
    scoreType: string;
    score: number;
    updatedBy: string;
  }): void {
    this.gradeUpdateListeners.forEach(listener => {
      try {
        listener(info);
      } catch (err) {
        console.error('Error notifying grade update:', err);
      }
    });
  }

  public subscribeAnnouncementUpdates(listener: (ann: SchoolAnnouncement) => void): () => void {
    this.announcementListeners.push(listener);
    return () => {
      this.announcementListeners = this.announcementListeners.filter(l => l !== listener);
    };
  }

  public notifyAnnouncementUpdate(ann: SchoolAnnouncement): void {
    this.announcementListeners.forEach(listener => {
      try {
        listener(ann);
      } catch (err) {
        console.error('Error broadcasting announcement:', err);
      }
    });
  }

  public isStudentChildOfParent(parentId: string, studentId: string): boolean {
    return Object.values(this.db.parent_student_relations).some(
      r => r.parent_id === parentId && r.student_id === studentId
    );
  }

  // --- USERS & AUTH ---
  public getAllUsers(): User[] {
    return Object.values(this.db.users);
  }

  public getUserById(id: string): User | undefined {
    return this.db.users[id];
  }

  public findUserByEmail(email: string): User | undefined {
    return Object.values(this.db.users).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByUsername(username: string): User | undefined {
    const clean = username.trim().toLowerCase();
    return Object.values(this.db.users).find(u =>
      (u.username && u.username.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase() === clean)
    );
  }

  public findUserByCredential(credential: string): User | undefined {
    return this.findUserByUsername(credential);
  }

  public createUser(userData: Omit<User, 'id' | 'username'> & { username?: string }): User {
    const id = 'user_' + Date.now();
    const username = userData.username || userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newUser: User = { id, ...userData, username };
    this.db.users[id] = newUser;
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('users', id, newUser);
    
    this.logActivity(
      'user_create',
      'Penambahan Akun Pengguna Baru',
      `Akun pengguna baru didaftarkan: ${newUser.nama} (@${newUser.username}) dengan role ${newUser.role.toUpperCase()}.`,
      `user_${id}`
    );

    return newUser;
  }

  public updateUser(id: string, userData: Partial<User>): User {
    if (!this.db.users[id]) throw new Error('Pengguna tidak ditemukan');
    const oldName = this.db.users[id].nama;
    this.db.users[id] = { ...this.db.users[id], ...userData };
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('users', id, this.db.users[id]);

    this.logActivity(
      'user_update',
      'Pembaruan Data Pengguna',
      `Data profil pengguna "${oldName}" diperbarui oleh administrator.`,
      `user_${id}`
    );

    return this.db.users[id];
  }

  public deleteUser(id: string): void {
    const targetUser = this.db.users[id];
    const targetName = targetUser?.nama || id;
    const targetRole = targetUser?.role || 'user';

    delete this.db.users[id];
    FirestoreSyncService.getInstance().deleteDocument('users', id);
    // Clean up class_members if student
    Object.keys(this.db.class_members).forEach(cmId => {
      if (this.db.class_members[cmId].student_id === id) {
        delete this.db.class_members[cmId];
        FirestoreSyncService.getInstance().deleteDocument('class_members', cmId);
      }
    });
    // Clean up relations
    Object.keys(this.db.parent_student_relations).forEach(psrId => {
      if (this.db.parent_student_relations[psrId].parent_id === id || this.db.parent_student_relations[psrId].student_id === id) {
        delete this.db.parent_student_relations[psrId];
      }
    });
    this.persist();

    this.logActivity(
      'user_delete',
      'Penghapusan Akun Pengguna',
      `Akun pengguna "${targetName}" (${targetRole.toUpperCase()}) telah dihapus dari sistem beserta relasi datanya.`,
      `user_${id}`
    );
  }

  public batchDeleteUsers(userIds: string[]): { deletedCount: number; skippedAdminCount: number } {
    let deletedCount = 0;
    let skippedAdminCount = 0;

    userIds.forEach(id => {
      const user = this.db.users[id];
      if (!user) return;

      // Protect primary admin accounts
      if (
        user.role === 'admin' &&
        (user.id === 'user-admin' ||
          user.id === 'user_admin1' ||
          user.email === 'admin@sekolah.id' ||
          user.username === 'admin')
      ) {
        skippedAdminCount++;
        return;
      }

      delete this.db.users[id];
      FirestoreSyncService.getInstance().deleteDocument('users', id);

      // Clean up class_members if student
      Object.keys(this.db.class_members).forEach(cmId => {
        if (this.db.class_members[cmId].student_id === id) {
          delete this.db.class_members[cmId];
          FirestoreSyncService.getInstance().deleteDocument('class_members', cmId);
        }
      });

      // Clean up parent-student relations
      Object.keys(this.db.parent_student_relations).forEach(psrId => {
        if (
          this.db.parent_student_relations[psrId].parent_id === id ||
          this.db.parent_student_relations[psrId].student_id === id
        ) {
          delete this.db.parent_student_relations[psrId];
        }
      });

      deletedCount++;
    });

    this.persist();
    this.notifyDataChange();

    this.logActivity(
      'user_batch_delete',
      'Penghapusan Massal Pengguna',
      `Administrator melakukan batch delete pada ${deletedCount} akun pengguna (Dilewati: ${skippedAdminCount} akun admin).`,
      'batch_action'
    );

    return { deletedCount, skippedAdminCount };
  }

  public batchUpdateUserRole(
    userIds: string[],
    newRole: UserRole
  ): { updatedCount: number; skippedAdminCount: number } {
    let updatedCount = 0;
    let skippedAdminCount = 0;

    userIds.forEach(id => {
      const user = this.db.users[id];
      if (!user) return;

      // Protect root admin account from accidental role demotion
      if (
        user.role === 'admin' &&
        (user.id === 'user-admin' ||
          user.id === 'user_admin1' ||
          user.email === 'admin@sekolah.id' ||
          user.username === 'admin') &&
        newRole !== 'admin'
      ) {
        skippedAdminCount++;
        return;
      }

      this.db.users[id].role = newRole;
      FirestoreSyncService.getInstance().syncDocument('users', id, this.db.users[id]);
      updatedCount++;
    });

    this.persist();
    this.notifyDataChange();

    this.logActivity(
      'user_batch_role_change',
      'Pembaruan Peran Massal',
      `Administrator mengubah peran ${updatedCount} pengguna menjadi "${newRole.toUpperCase()}".`,
      'batch_action'
    );

    return { updatedCount, skippedAdminCount };
  }

  // --- CLASSES & SUBJECTS ---
  public getAllClasses(): ClassEntity[] {
    return Object.values(this.db.classes);
  }

  public getClassById(id: string): ClassEntity | undefined {
    return this.db.classes[id];
  }

  public getHomeroomClass(teacherId: string): ClassEntity | undefined {
    return Object.values(this.db.classes).find(c => c.wali_kelas_id === teacherId);
  }

  public getStudentClass(studentId: string): ClassEntity | undefined {
    const cm = Object.values(this.db.class_members).find(m => m.student_id === studentId);
    if (!cm) return undefined;
    return this.db.classes[cm.class_id];
  }

  public getAllSubjects(): Subject[] {
    return Object.values(this.db.subjects);
  }

  public getSubjectsByTeacher(teacherId: string): Subject[] {
    return Object.values(this.db.subjects).filter(s => s.guru_id === teacherId);
  }

  // --- RELATIONAL JOIN: Siswa dalam Kelas ---
  public getStudentsInClass(classId: string): (User & { memberId: string })[] {
    const members = Object.values(this.db.class_members).filter(cm => cm.class_id === classId);
    const students: (User & { memberId: string })[] = [];

    for (const m of members) {
      const studentUser = this.db.users[m.student_id];
      if (studentUser) {
        students.push({
          ...studentUser,
          memberId: m.id
        });
      }
    }
    return students.sort((a, b) => a.nama.localeCompare(b.nama));
  }

  public getClassStudents(classId: string): (User & { memberId: string })[] {
    return this.getStudentsInClass(classId);
  }

  // --- RELATIONAL JOIN: Presensi Siswa ---
  public getAttendanceByClassAndDate(classId: string, date: string, subjectId: string = 'subj_mat') {
    const students = this.getStudentsInClass(classId);
    const attendanceRecords = Object.values(this.db.attendance).filter(
      a => a.class_id === classId && a.date === date && a.subject_id === subjectId
    );

    return students.map(student => {
      const rec = attendanceRecords.find(a => a.student_id === student.id);
      return {
        studentId: student.id,
        nama: student.nama,
        email: student.email,
        no_wa: student.no_wa,
        attendanceId: rec?.id || null,
        status: (rec?.status || 'H') as AttendanceStatus,
        date
      };
    });
  }

  public getAttendanceByClassAndDateRange(
    classId: string,
    startDate: string,
    endDate: string,
    subjectId?: string
  ) {
    const students = this.getStudentsInClass(classId);
    const studentMap = new Map(students.map(s => [s.id, s]));

    const allRecords = Object.values(this.db.attendance).filter(a => {
      if (a.class_id !== classId) return false;
      if (subjectId && subjectId !== 'all' && a.subject_id !== subjectId) return false;
      if (a.date < startDate || a.date > endDate) return false;
      return true;
    });

    allRecords.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      const nameA = studentMap.get(a.student_id)?.nama || '';
      const nameB = studentMap.get(b.student_id)?.nama || '';
      return nameA.localeCompare(nameB);
    });

    return allRecords.map(rec => {
      const student = studentMap.get(rec.student_id);
      return {
        id: rec.id,
        studentId: rec.student_id,
        nama: student?.nama || 'Siswa',
        email: student?.email || '',
        no_wa: student?.no_wa || '',
        nis: student?.nis || '',
        date: rec.date,
        subject_id: rec.subject_id,
        status: rec.status,
        timestamp: rec.timestamp,
        photoUrl: rec.photoUrl,
        location: rec.location,
        verified: rec.verified,
        notes: rec.notes
      };
    });
  }

  public saveBulkAttendance(
    classId: string,
    subjectId: string,
    date: string,
    records: { studentId: string; status: AttendanceStatus }[]
  ): void {
    const batchItems: Array<{ id: string; data: any }> = [];
    records.forEach(({ studentId, status }) => {
      const existingKey = Object.keys(this.db.attendance).find(
        k => this.db.attendance[k].class_id === classId &&
             this.db.attendance[k].date === date &&
             this.db.attendance[k].subject_id === subjectId &&
             this.db.attendance[k].student_id === studentId
      );

      if (existingKey) {
        this.db.attendance[existingKey].status = status;
        batchItems.push({ id: existingKey, data: this.db.attendance[existingKey] });
      } else {
        const newId = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const newAtt = {
          id: newId,
          class_id: classId,
          subject_id: subjectId,
          date,
          student_id: studentId,
          status
        };
        this.db.attendance[newId] = newAtt;
        batchItems.push({ id: newId, data: newAtt });
      }
    });

    this.persist();
    if (batchItems.length > 0) {
      FirestoreSyncService.getInstance().syncBatchDocuments('attendance', batchItems);
    }
    this.notifyDataChange();

    const cls = this.db.classes[classId];
    this.logActivity(
      'attendance_input',
      'Input Presensi Harian Siswa',
      `Presensi tanggal ${date} untuk ${cls ? cls.nama_kelas : 'Kelas'} sebanyak ${records.length} siswa berhasil diperbarui.`,
      `att_${classId}_${date}`
    );
  }

  public getStudentAttendanceSummary(studentId: string) {
    const records = Object.values(this.db.attendance).filter(a => a.student_id === studentId);
    const summary = { H: 0, I: 0, S: 0, A: 0, total: records.length };
    records.forEach(r => {
      if (summary[r.status] !== undefined) {
        summary[r.status]++;
      }
    });
    return { summary, records };
  }

  public getAllAttendance(): Attendance[] {
    return Object.values(this.db.attendance);
  }

  /**
   * Menghitung statistik presensi teragregasi secara dinamis berdasarkan rentang waktu:
   * 'mingguan' (Pekan Berjalan), 'bulanan' (Bulan Berjalan), 'semester' (Semester Berjalan).
   */
  public getAttendanceStatsByRange(range: 'mingguan' | 'bulanan' | 'semester'): {
    hCount: number;
    iCount: number;
    sCount: number;
    aCount: number;
    total: number;
    rate: number;
    periodLabel: string;
    subLabel: string;
    rangeName: string;
  } {
    const all = Object.values(this.db.attendance || {});

    // Referensi tanggal kalender akademik SIMAK (September 2026)
    const weekStart = '2026-09-14';
    const weekEnd = '2026-09-20';
    const monthPrefix = '2026-09';
    const semesterStart = '2026-07-01';
    const semesterEnd = '2026-12-31';

    let filtered = all;
    let periodLabel = '';
    let subLabel = '';
    let rangeName = '';

    if (range === 'mingguan') {
      rangeName = 'Mingguan';
      periodLabel = 'Pekan Berjalan (14 - 20 Sep 2026)';
      subLabel = 'Presensi 7 Hari Terakhir';
      // Filter presensi pekan ini
      filtered = all.filter(a => {
        if (a.date >= weekStart && a.date <= weekEnd) return true;
        // Hanya rekam presensi yang bukan rekam historis pekan awal september/agustus
        return !a.date.startsWith('2026-08') && !['2026-09-02', '2026-09-08', '2026-09-09', '2026-09-10'].includes(a.date);
      });
    } else if (range === 'bulanan') {
      rangeName = 'Bulanan';
      periodLabel = 'Bulan September 2026';
      subLabel = 'Presensi 30 Hari Berjalan';
      filtered = all.filter(a => a.date.startsWith(monthPrefix) || a.date >= '2026-09-01');
    } else {
      rangeName = 'Semester';
      periodLabel = 'Semester Ganjil TA 2025/2026';
      subLabel = 'Presensi Kumulatif Semester';
      filtered = all.filter(a => a.date >= semesterStart && a.date <= semesterEnd);
    }

    const hCount = filtered.filter(a => a.status === 'H').length;
    const iCount = filtered.filter(a => a.status === 'I').length;
    const sCount = filtered.filter(a => a.status === 'S').length;
    const aCount = filtered.filter(a => a.status === 'A').length;
    const total = (hCount + iCount + sCount + aCount) || 1;
    const rate = Math.round((hCount / total) * 100);

    return {
      hCount,
      iCount,
      sCount,
      aCount,
      total,
      rate,
      periodLabel,
      subLabel,
      rangeName
    };
  }

  // --- PRESENSI MANDIRI REALTIME: Foto Selfie, Timestamp & Validasi GPS ---
  public getStudentTodayAttendance(studentId: string, dateStr?: string): Attendance | null {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const rec = Object.values(this.db.attendance).find(
      a => a.student_id === studentId && a.date === date
    );
    return rec || null;
  }

  public saveStudentSelfieAttendance(params: {
    studentId: string;
    classId: string;
    status: AttendanceStatus;
    photoUrl: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    distanceMeters: number;
    isWithinRadius: boolean;
    address?: string;
    note?: string;
    timestamp?: string;
  }): Attendance {
    const today = new Date().toISOString().split('T')[0];
    const nowTime =
      params.timestamp ||
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' WIB';

    // Cari apakah sudah ada record presensi hari ini
    const existingKey = Object.keys(this.db.attendance).find(
      k =>
        this.db.attendance[k].student_id === params.studentId &&
        this.db.attendance[k].date === today
    );

    let savedAttendance: Attendance;

    if (existingKey) {
      this.db.attendance[existingKey] = {
        ...this.db.attendance[existingKey],
        class_id: params.classId,
        status: params.status,
        photoUrl: params.photoUrl,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy: params.accuracy,
        distanceMeters: params.distanceMeters,
        isWithinRadius: params.isWithinRadius,
        address: params.address || this.db.app_settings?.schoolAddress || 'Sekolah',
        timestamp: nowTime,
        note: params.note || (params.isWithinRadius ? 'Hadir tepat waktu di area sekolah' : 'Presensi di luar radius sekolah'),
        verifiedBy: 'self_scan_gps'
      };
      savedAttendance = this.db.attendance[existingKey];
    } else {
      const newId = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      savedAttendance = {
        id: newId,
        class_id: params.classId,
        subject_id: 'HOMEROOM',
        date: today,
        student_id: params.studentId,
        status: params.status,
        photoUrl: params.photoUrl,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy: params.accuracy,
        distanceMeters: params.distanceMeters,
        isWithinRadius: params.isWithinRadius,
        address: params.address || this.db.app_settings?.schoolAddress || 'Sekolah',
        timestamp: nowTime,
        note: params.note || (params.isWithinRadius ? 'Hadir tepat waktu di area sekolah' : 'Presensi di luar radius sekolah'),
        verifiedBy: 'self_scan_gps'
      };
      this.db.attendance[newId] = savedAttendance;
    }

    this.persist();
    FirestoreSyncService.getInstance().syncDocument('attendance', savedAttendance.id, savedAttendance);
    this.notifyDataChange();

    const student = this.db.users[params.studentId];
    const studentName = student ? student.nama : 'Siswa';

    // Catat log aktivitas keamanan & presensi
    this.logActivity(
      'attendance_input',
      'Presensi Mandiri Realtime (Selfie & GPS)',
      `Siswa ${studentName} melakukan presensi selfie mandiri pada ${nowTime}. Jarak: ${params.distanceMeters}m (${params.isWithinRadius ? 'Dalam Radius' : 'Luar Radius'}).`,
      `att_${savedAttendance.id}`,
      {
        studentId: params.studentId,
        lat: params.latitude,
        lng: params.longitude,
        distanceMeters: params.distanceMeters,
        isWithinRadius: params.isWithinRadius
      },
      student ? { id: student.id, nama: student.nama, role: 'siswa' } : undefined
    );

    return savedAttendance;
  }

  public getAllAttendanceWithDetails(dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const records = Object.values(this.db.attendance).filter(a => a.date === targetDate);

    return records.map(r => {
      const student = this.db.users[r.student_id];
      const cls = this.db.classes[r.class_id];
      return {
        ...r,
        studentName: student ? student.nama : 'Siswa',
        studentUsername: student ? student.username : '',
        className: cls ? cls.nama_kelas : 'Kelas',
        academicYear: cls ? cls.tahun_ajaran : ''
      };
    }).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  // --- RELATIONAL JOIN: Nilai Siswa ---
  public getGradesByClassAndSubject(classId: string, subjectId: string) {
    const students = this.getStudentsInClass(classId);
    const subject = this.db.subjects[subjectId];

    return students.map(student => {
      const studentGrades = Object.values(this.db.grades).filter(
        g => g.student_id === student.id && g.subject_id === subjectId
      );

      const tugas = studentGrades.find(g => g.type === 'Tugas')?.score ?? 0;
      const uts = studentGrades.find(g => g.type === 'UTS')?.score ?? 0;
      const uas = studentGrades.find(g => g.type === 'UAS')?.score ?? 0;

      // Bobot Nilai: Tugas 30%, UTS 30%, UAS 40%
      const finalScore = Math.round((tugas * 0.3) + (uts * 0.3) + (uas * 0.4));
      let predicate = 'D';
      if (finalScore >= 88) predicate = 'A';
      else if (finalScore >= 78) predicate = 'B';
      else if (finalScore >= 68) predicate = 'C';

      return {
        studentId: student.id,
        nama: student.nama,
        subjectId,
        subjectName: subject ? subject.nama_mapel : 'Mapel',
        tugas,
        uts,
        uas,
        finalScore,
        predicate
      };
    });
  }

  public saveStudentGrade(studentId: string, subjectId: string, type: GradeType, score: number): void {
    const existing = Object.values(this.db.grades).find(
      g => g.student_id === studentId && g.subject_id === subjectId && g.type === type
    );

    let targetGrade: Grade;
    const isNew = !existing;
    if (existing) {
      existing.score = score;
      targetGrade = existing;
    } else {
      const id = 'grd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      targetGrade = {
        id,
        student_id: studentId,
        subject_id: subjectId,
        type,
        score
      };
      this.db.grades[id] = targetGrade;
    }
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('grades', targetGrade.id, targetGrade);

    const student = this.db.users[studentId];
    const subject = this.db.subjects[subjectId];
    const studentName = student ? student.nama : 'Siswa';
    const subjectName = subject ? subject.nama_mapel : 'Mata Pelajaran';

    // Log Activity
    this.logActivity(
      isNew ? 'grade_input' : 'grade_update',
      'Pembaruan Nilai Siswa',
      `Nilai ${type} mapel ${subjectName} untuk siswa ${studentName} disimpan (Skor: ${score}).`,
      `grade_${targetGrade.id}`
    );

    // Trigger Realtime Notification Broadcast
    this.notifyGradeUpdate({
      studentId,
      studentName,
      subjectName,
      scoreType: type,
      score,
      updatedBy: 'Guru Pengampu'
    });

    this.notifyDataChange();
  }

  public getStudentReport(studentId: string) {
    const student = this.db.users[studentId];
    if (!student) return null;

    // Find class
    const membership = Object.values(this.db.class_members).find(cm => cm.student_id === studentId);
    const studentClass = membership ? this.db.classes[membership.class_id] : null;
    const waliKelas = studentClass ? this.db.users[studentClass.wali_kelas_id] : null;

    // Subjects and grades
    const subjects = Object.values(this.db.subjects);
    const gradeDetails = subjects.map(sub => {
      const subGrades = Object.values(this.db.grades).filter(
        g => g.student_id === studentId && g.subject_id === sub.id
      );
      const tugas = subGrades.find(g => g.type === 'Tugas')?.score ?? 0;
      const uts = subGrades.find(g => g.type === 'UTS')?.score ?? 0;
      const uas = subGrades.find(g => g.type === 'UAS')?.score ?? 0;
      const finalScore = Math.round((tugas * 0.3) + (uts * 0.3) + (uas * 0.4));
      let predicate = 'D';
      if (finalScore >= 88) predicate = 'A';
      else if (finalScore >= 78) predicate = 'B';
      else if (finalScore >= 68) predicate = 'C';

      return {
        subjectId: sub.id,
        subjectName: sub.nama_mapel,
        tugas,
        uts,
        uas,
        finalScore,
        predicate
      };
    });

    const { summary: attendanceSummary } = this.getStudentAttendanceSummary(studentId);

    return {
      student,
      studentClass,
      waliKelas,
      gradeDetails,
      attendanceSummary
    };
  }

  // --- RELATIONAL JOIN: Orang Tua ke Siswa ---
  public getChildrenOfParent(parentId: string): User[] {
    const relations = Object.values(this.db.parent_student_relations).filter(psr => psr.parent_id === parentId);
    return relations.map(r => this.db.users[r.student_id]).filter(Boolean);
  }

  // --- EKSPOR PDF RAPOR SISWA ---
  public exportStudentReportPDF(studentId: string): void {
    const report = this.getStudentReport(studentId);
    if (!report) {
      Swal.fire({ icon: 'error', title: 'Data Rapor Tidak Ditemukan' });
      return;
    }

    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // Tailwind blue-600

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMBAR LAPORAN HASIL BELAJAR (RAPOR BAYANGAN)', 105, 15, { align: 'center' });

    // Biodata
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let y = 35;
    doc.text(`Nama Siswa    : ${report.student.nama}`, 20, y);
    doc.text(`Kelas              : ${report.studentClass?.nama_kelas || '-'}`, 130, y);
    y += 7;
    doc.text(`Email Siswa   : ${report.student.email}`, 20, y);
    doc.text(`Tahun Ajaran : ${report.studentClass?.tahun_ajaran || '2025/2026'}`, 130, y);
    y += 7;
    doc.text(`Wali Kelas     : ${report.waliKelas?.nama || '-'}`, 20, y);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 130, y);

    // Tabel Nilai Header
    y += 12;
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('No', 24, y + 6);
    doc.text('Mata Pelajaran', 35, y + 6);
    doc.text('Tugas (30%)', 95, y + 6);
    doc.text('UTS (30%)', 125, y + 6);
    doc.text('UAS (40%)', 150, y + 6);
    doc.text('Akhir', 172, y + 6);

    // Tabel Nilai Rows
    doc.setFont('helvetica', 'normal');
    y += 8;
    report.gradeDetails.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 8, 'F');
      }
      doc.text(String(idx + 1), 25, y + 6);
      doc.text(row.subjectName, 35, y + 6);
      doc.text(String(row.tugas), 100, y + 6);
      doc.text(String(row.uts), 130, y + 6);
      doc.text(String(row.uas), 155, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.text(`${row.finalScore} (${row.predicate})`, 172, y + 6);
      doc.setFont('helvetica', 'normal');
      y += 8;
    });

    // Rekap Kehadiran
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Rekapitulasi Presensi Kehadiran:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const att = report.attendanceSummary;
    doc.text(`Hadir: ${att.H} hari   |   Izin: ${att.I} hari   |   Sakit: ${att.S} hari   |   Alpa: ${att.A} hari`, 20, y);

    // Tanda Tangan
    y += 25;
    doc.text('Mengetahui,', 20, y);
    doc.text('Wali Kelas,', 140, y);
    y += 20;
    doc.text('( Orang Tua / Wali Siswa )', 20, y);
    doc.text(`( ${report.waliKelas?.nama || 'Wali Kelas'} )`, 140, y);

    // Save
    doc.save(`Rapor_${report.student.nama.replace(/\s+/g, '_')}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'Rapor Berhasil Diunduh!',
      text: `File PDF Rapor untuk ${report.student.nama} telah diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  // --- EKSPOR PDF PRESENSI KELAS ---
  public exportAttendancePDF(classId: string, date: string, subjectId: string): void {
    const cls = this.getClassById(classId);
    const sub = this.db.subjects[subjectId];
    const records = this.getAttendanceByClassAndDate(classId, date, subjectId);

    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`REKAP PRESENSI KELAS ${cls?.nama_kelas || ''}`, 105, 14, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 32;
    doc.text(`Mata Pelajaran : ${sub?.nama_mapel || 'Presensi Harian'}`, 20, y);
    doc.text(`Tanggal: ${date}`, 140, y);

    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('No', 25, y + 6);
    doc.text('Nama Siswa', 40, y + 6);
    doc.text('WhatsApp', 110, y + 6);
    doc.text('Status Kehadiran', 150, y + 6);

    y += 8;
    doc.setFont('helvetica', 'normal');
    records.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 8, 'F');
      }
      doc.text(String(idx + 1), 26, y + 6);
      doc.text(r.nama, 40, y + 6);
      doc.text(r.no_wa || '-', 110, y + 6);
      
      let statusLabel = 'Hadir';
      if (r.status === 'I') statusLabel = 'Izin';
      if (r.status === 'S') statusLabel = 'Sakit';
      if (r.status === 'A') statusLabel = 'Alpa';
      
      doc.setFont('helvetica', 'bold');
      doc.text(statusLabel, 155, y + 6);
      doc.setFont('helvetica', 'normal');
      y += 8;
    });

    doc.save(`Presensi_${cls?.nama_kelas}_${date}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'Rekap Presensi Diekspor!',
      text: 'File PDF Presensi berhasil disimpan.',
      timer: 1800,
      showConfirmButton: false
    });
  }

  // --- EKSPOR LAPORAN PRESENSI BULANAN UNTUK WALI KELAS (jsPDF) ---
  public getMonthlyAttendanceSummary(classId: string, monthYear: string) {
    const students = this.getClassStudents(classId);
    const allAtt = Object.values(this.db.attendance).filter(
      a => a.class_id === classId && a.date.startsWith(monthYear)
    );

    // Ambil daftar tanggal unik di mana presensi dicatat dalam bulan tersebut
    const recordedDates = Array.from(new Set(allAtt.map(a => a.date))).sort();

    const studentSummaries = students.map((student: User) => {
      const records = allAtt.filter(a => a.student_id === student.id);
      const hCount = records.filter(a => a.status === 'H').length;
      const iCount = records.filter(a => a.status === 'I').length;
      const sCount = records.filter(a => a.status === 'S').length;
      const aCount = records.filter(a => a.status === 'A').length;
      const totalDays = hCount + iCount + sCount + aCount || 1;
      const percentage = Math.round((hCount / totalDays) * 100);

      let note = 'Sangat Baik';
      if (percentage < 75) note = 'Perlu Pembinaan';
      else if (percentage < 85) note = 'Cukup';
      else if (percentage < 95) note = 'Baik';

      return {
        student,
        hCount,
        iCount,
        sCount,
        aCount,
        totalDays: records.length,
        percentage,
        note
      };
    });

    return {
      recordedDates,
      studentSummaries
    };
  }

  public exportMonthlyAttendanceReportPDF(classId: string, monthYear: string): void {
    const cls = this.getClassById(classId);
    if (!cls) {
      Swal.fire({ icon: 'error', title: 'Kelas tidak ditemukan' });
      return;
    }

    const waliKelas = this.getUserById(cls.wali_kelas_id);
    const { recordedDates, studentSummaries } = this.getMonthlyAttendanceSummary(classId, monthYear);

    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[parseInt(month, 10) - 1] || month;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Kop Surat Sekolah Resmi
    doc.setFillColor(30, 58, 138); // blue-900
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SMA NEGERI UNGGULAN SIMAK TERPADU', 105, 11, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pendidikan Karakter No. 45, Kompleks Pendidikan Nasional • Web: simak.sekolah.id', 105, 18, { align: 'center' });

    // Garis Pemisah Kop
    doc.setDrawColor(218, 165, 32); // Gold accent
    doc.setLineWidth(1);
    doc.line(14, 28, 196, 28);

    // Judul Laporan
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN REKAPITULASI PRESENSI BULANAN SISWA', 105, 37, { align: 'center' });

    // Metadata Laporan
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    let y = 46;
    doc.text(`Kelas / Rombel  : ${cls.nama_kelas}`, 16, y);
    doc.text(`Bulan / Tahun   : ${monthName} ${year}`, 125, y);
    y += 5.5;
    doc.text(`Wali Kelas       : ${waliKelas?.nama || '-'}`, 16, y);
    doc.text(`Tahun Pelajaran: ${cls.tahun_ajaran}`, 125, y);
    y += 5.5;
    doc.text(`Total Siswa      : ${studentSummaries.length} Siswa`, 16, y);
    doc.text(`Total Hari Efektif : ${recordedDates.length || 20} Hari Pembelajaran`, 125, y);

    // Header Tabel
    y += 8;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(14, y, 182, 9, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.2);
    doc.rect(14, y, 182, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('No', 18, y + 6);
    doc.text('Nama Siswa', 32, y + 6);
    doc.text('Hadir', 95, y + 6, { align: 'center' });
    doc.text('Izin', 110, y + 6, { align: 'center' });
    doc.text('Sakit', 124, y + 6, { align: 'center' });
    doc.text('Alpa', 138, y + 6, { align: 'center' });
    doc.text('Persen', 155, y + 6, { align: 'center' });
    doc.text('Keterangan', 178, y + 6, { align: 'center' });

    // Isi Tabel
    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    let totalH = 0;
    let totalI = 0;
    let totalS = 0;
    let totalA = 0;

    studentSummaries.forEach((row: any, idx: number) => {
      totalH += row.hCount;
      totalI += row.iCount;
      totalS += row.sCount;
      totalA += row.aCount;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 7.5, 'F');
      }
      doc.rect(14, y, 182, 7.5, 'S');

      doc.setTextColor(30, 41, 59);
      doc.text(String(idx + 1), 18, y + 5);
      doc.text(row.student.nama, 32, y + 5);
      doc.text(String(row.hCount), 95, y + 5, { align: 'center' });
      doc.text(String(row.iCount), 110, y + 5, { align: 'center' });
      doc.text(String(row.sCount), 124, y + 5, { align: 'center' });
      
      // Beri warna merah jika ada alpa
      if (row.aCount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
      }
      doc.text(String(row.aCount), 138, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      doc.setFont('helvetica', 'bold');
      doc.text(`${row.percentage}%`, 155, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      doc.text(row.note, 178, y + 5, { align: 'center' });

      y += 7.5;
    });

    // Baris Total Akumulasi Kelas
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(14, y, 182, 8, 'F');
    doc.rect(14, y, 182, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL REKAPITULASI KELAS', 32, y + 5.5);
    doc.text(String(totalH), 95, y + 5.5, { align: 'center' });
    doc.text(String(totalI), 110, y + 5.5, { align: 'center' });
    doc.text(String(totalS), 124, y + 5.5, { align: 'center' });
    doc.text(String(totalA), 138, y + 5.5, { align: 'center' });
    const grandTotal = totalH + totalI + totalS + totalA || 1;
    const avgPercent = Math.round((totalH / grandTotal) * 100);
    doc.text(`${avgPercent}%`, 155, y + 5.5, { align: 'center' });
    doc.text(avgPercent >= 85 ? 'Tuntas' : 'Evaluasi', 178, y + 5.5, { align: 'center' });

    // Kolom Tanda Tangan Resmi
    y += 18;
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    doc.text('Mengetahui,', 26, y);
    doc.text(`Kota Pendidikan, ${todayFormatted}`, 130, y);
    y += 4.5;
    doc.text('Kepala Sekolah SMA Negeri Unggulan,', 26, y);
    doc.text('Wali Kelas Yang Bersangkutan,', 130, y);

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Drs. H. Mulyadi, M.Pd', 26, y);
    doc.text(waliKelas?.nama || 'Budi Santoso, S.Pd', 130, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('NIP. 19750812 199903 1 002', 26, y);
    doc.text('NIP. 19830415 200801 1 014', 130, y);

    // Simpan PDF
    const filename = `Laporan_Presensi_${cls.nama_kelas.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`;
    doc.save(filename);

    Swal.fire({
      icon: 'success',
      title: 'Laporan Bulanan Berhasil Dicetak!',
      text: `File "${filename}" telah diunduh dengan format resmi dokumen Wali Kelas.`,
      timer: 2500,
      showConfirmButton: false
    });
  }

  // --- ANNOUNCEMENT (PENGUMUMAN SEKOLAH) CRUD & REALTIME EVENTS ---
  public getAllAnnouncements(): SchoolAnnouncement[] {
    if (!this.db.announcements) {
      this.db.announcements = JSON.parse(JSON.stringify(INITIAL_DATABASE.announcements || {}));
    }
    return Object.values(this.db.announcements).sort((a, b) => b.date.localeCompare(a.date));
  }

  public getAnnouncementsForRole(role: UserRole): SchoolAnnouncement[] {
    const all = this.getAllAnnouncements();
    return all.filter(a => a.targetRole === 'all' || a.targetRole === role);
  }

  public createAnnouncement(data: Omit<SchoolAnnouncement, 'id' | 'date' | 'time'>): SchoolAnnouncement {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const newId = `ann_${Date.now()}`;
    const newAnn: SchoolAnnouncement = {
      ...data,
      id: newId,
      date: dateStr,
      time: timeStr
    };

    if (!this.db.announcements) {
      this.db.announcements = {};
    }
    this.db.announcements[newId] = newAnn;
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('announcements', newId, newAnn);

    this.logActivity(
      'announcement_create',
      'Penerbitan Pengumuman Sekolah',
      `Pengumuman baru "${newAnn.title}" diterbitkan untuk sasaran: ${newAnn.targetRole.toUpperCase()}.`,
      `ann_${newId}`
    );

    // Broadcast ke semua listener realtime
    this.announcementListeners.forEach(listener => {
      try {
        listener(newAnn);
      } catch (err) {
        console.error('Error broadcasting announcement:', err);
      }
    });

    return newAnn;
  }

  public deleteAnnouncement(id: string): void {
    if (this.db.announcements && this.db.announcements[id]) {
      const title = this.db.announcements[id].title;
      delete this.db.announcements[id];
      this.persist();
      FirestoreSyncService.getInstance().deleteDocument('announcements', id);

      this.logActivity(
        'announcement_delete',
        'Penghapusan Pengumuman',
        `Pengumuman "${title}" telah dihapus oleh administrator.`,
        `ann_${id}`
      );
    }
  }

  public onAnnouncementAdded(listener: (ann: SchoolAnnouncement) => void): () => void {
    this.announcementListeners.push(listener);
    return () => {
      this.announcementListeners = this.announcementListeners.filter(l => l !== listener);
    };
  }

  // --- ACADEMIC CALENDAR & IMPORTANT EVENTS CRUD ---
  public getAllAcademicEvents(): AcademicEvent[] {
    if (!this.db.academic_events || Object.keys(this.db.academic_events).length === 0) {
      this.db.academic_events = JSON.parse(JSON.stringify(INITIAL_DATABASE.academic_events || {}));
      this.persist();
    }
    const eventsObj = this.db.academic_events || {};
    return Object.values(eventsObj).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  public createAcademicEvent(data: Omit<AcademicEvent, 'id'>): AcademicEvent {
    const newId = `evt_${Date.now()}`;
    const newEvent: AcademicEvent = {
      ...data,
      id: newId
    };

    if (!this.db.academic_events) {
      this.db.academic_events = {};
    }
    this.db.academic_events[newId] = newEvent;
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('academic_events', newId, newEvent);

    return newEvent;
  }

  public updateAcademicEvent(id: string, data: Partial<AcademicEvent>): AcademicEvent | null {
    if (!this.db.academic_events || !this.db.academic_events[id]) return null;
    this.db.academic_events[id] = {
      ...this.db.academic_events[id],
      ...data
    };
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('academic_events', id, this.db.academic_events[id]);
    return this.db.academic_events[id];
  }

  public deleteAcademicEvent(id: string): void {
    if (this.db.academic_events && this.db.academic_events[id]) {
      delete this.db.academic_events[id];
      this.persist();
      FirestoreSyncService.getInstance().deleteDocument('academic_events', id);
    }
  }

  // --- CSV UTILITIES & EXPORT / BULK-IMPORT METHODS ---
  private downloadCSVFile(content: string, fileName: string): void {
    // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheets open Indonesian characters properly
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public exportUsersToCSV(): void {
    const users = this.getAllUsers();
    const headers = ['ID Pengguna', 'Nama Lengkap', 'Alamat Email', 'Role Akses', 'No. WhatsApp / Telepon'];
    const rows = users.map(u => [
      `"${u.id}"`,
      `"${u.nama.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${(u.no_wa || '-').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const fileName = `SIMAK_Daftar_Pengguna_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSVFile(csvString, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Ekspor CSV Berhasil',
      text: `File "${fileName}" berisi ${users.length} data pengguna berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  public exportAttendanceLogsToCSV(classId?: string, monthYear?: string): void {
    const allAtt = Object.values(this.db.attendance);
    let filtered = allAtt;

    if (classId) {
      filtered = filtered.filter(a => a.class_id === classId);
    }
    if (monthYear) {
      filtered = filtered.filter(a => a.date.startsWith(monthYear));
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const headers = [
      'ID Presensi',
      'Tanggal',
      'Nama Siswa',
      'Email Siswa',
      'Kelas',
      'Mata Pelajaran',
      'Kode Status',
      'Keterangan Status'
    ];

    const rows = filtered.map(a => {
      const student = this.getUserById(a.student_id);
      const cls = this.getClassById(a.class_id);
      const subj = this.db.subjects[a.subject_id];

      let statusLabel = 'Hadir';
      if (a.status === 'I') statusLabel = 'Izin';
      if (a.status === 'S') statusLabel = 'Sakit';
      if (a.status === 'A') statusLabel = 'Alpa (Tanpa Keterangan)';

      return [
        `"${a.id}"`,
        `"${a.date}"`,
        `"${(student?.nama || a.student_id).replace(/"/g, '""')}"`,
        `"${(student?.email || '-').replace(/"/g, '""')}"`,
        `"${(cls?.nama_kelas || a.class_id).replace(/"/g, '""')}"`,
        `"${(subj?.nama_mapel || a.subject_id).replace(/"/g, '""')}"`,
        `"${a.status}"`,
        `"${statusLabel}"`
      ];
    });

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const periodLabel = monthYear || 'Semua_Periode';
    const fileName = `SIMAK_Log_Presensi_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSVFile(csvString, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Log Presensi CSV Berhasil Diekspor',
      text: `File "${fileName}" berisi ${filtered.length} riwayat presensi telah diunduh.`,
      timer: 2200,
      showConfirmButton: false
    });
  }

  // --- ADVANCED MULTI-ROLE EXPORT, IMPORT & BULK CREDENTIALS ---
  public exportUsersMultiRoleCSV(options: {
    role?: string;
    classId?: string;
    includePassword?: boolean;
  } = {}): void {
    const { role = 'all', classId = 'all', includePassword = true } = options;
    let users = this.getAllUsers();

    if (role && role !== 'all') {
      users = users.filter(u => u.role === role);
    }

    if (classId && classId !== 'all') {
      const classMemberStudentIds = new Set(
        Object.values(this.db.class_members)
          .filter(cm => cm.class_id === classId)
          .map(cm => cm.student_id)
      );
      users = users.filter(u => classMemberStudentIds.has(u.id));
    }

    const headers = [
      'ID Pengguna',
      'Nama Lengkap',
      'Username',
      'Email',
      'Role Akses',
      'No. WhatsApp',
      ...(includePassword ? ['Password Akun'] : []),
      'Kelas Siswa',
      'Wali Kelas Dari',
      'Mata Pelajaran Diampu',
      'Relasi Anak (Orang Tua)'
    ];

    const rows = users.map(u => {
      // Find class info if student
      let studentClassName = '-';
      if (u.role === 'siswa') {
        const cm = Object.values(this.db.class_members).find(m => m.student_id === u.id);
        if (cm) {
          const cls = this.getClassById(cm.class_id);
          if (cls) studentClassName = `${cls.nama_kelas} (${cls.tahun_ajaran})`;
        }
      }

      // Find homeroom class if wali_kelas
      let homeroomClass = '-';
      if (u.role === 'wali_kelas') {
        const cls = Object.values(this.db.classes).find(c => c.wali_kelas_id === u.id);
        if (cls) homeroomClass = `${cls.nama_kelas} (${cls.tahun_ajaran})`;
      }

      // Find taught subjects if guru
      let taughtSubjects = '-';
      if (u.role === 'guru') {
        const subs = Object.values(this.db.subjects).filter(s => s.guru_id === u.id);
        if (subs.length > 0) taughtSubjects = subs.map(s => s.nama_mapel).join('; ');
      }

      // Find children if parent
      let childrenNames = '-';
      if (u.role === 'orang_tua') {
        const children = this.getChildrenOfParent(u.id);
        if (children.length > 0) childrenNames = children.map(c => `${c.nama} (@${c.username || c.email})`).join('; ');
      }

      return [
        `"${u.id}"`,
        `"${u.nama.replace(/"/g, '""')}"`,
        `"${(u.username || u.email.split('@')[0]).replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        `"${u.role}"`,
        `"${(u.no_wa || '-').replace(/"/g, '""')}"`,
        ...(includePassword ? [`"${(u.password_hash || 'pass123').replace(/"/g, '""')}"`] : []),
        `"${studentClassName.replace(/"/g, '""')}"`,
        `"${homeroomClass.replace(/"/g, '""')}"`,
        `"${taughtSubjects.replace(/"/g, '""')}"`,
        `"${childrenNames.replace(/"/g, '""')}"`
      ];
    });

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const roleLabel = role === 'all' ? 'Semua_Role' : role;
    const fileName = `SIMAK_Data_Pengguna_${roleLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSVFile(csvString, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Ekspor Data Berhasil!',
      text: `File "${fileName}" berisi ${users.length} akun pengguna (${roleLabel}) berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  public downloadMultiRoleTemplateCSV(templateType: 'all' | 'guru' | 'siswa' | 'orang_tua' | 'admin' = 'all'): void {
    let headers: string[] = [];
    let sampleRows: string[][] = [];
    let fileName = '';

    if (templateType === 'all') {
      headers = ['Nama Lengkap', 'Role', 'Username', 'Email', 'Password', 'No_WhatsApp', 'Kelas', 'Siswa_Terkait'];
      sampleRows = [
        ['"Drs. H. Ahmad Subarjo, M.Pd"', '"admin"', '"admin_utama"', '"admin.utama@sekolah.sch.id"', '"admin123"', '"081234567890"', '""', '""'],
        ['"Budi Santoso, S.Kom"', '"guru"', '"guru_budi"', '"budi.santoso@sekolah.sch.id"', '"guru123"', '"081298765432"', '""', '""'],
        ['"Siti Rahmawati, S.Pd"', '"wali_kelas"', '"wali_siti"', '"siti.rahmawati@sekolah.sch.id"', '"wali123"', '"081376543210"', '"X-A"', '""'],
        ['"Muhammad Rizky Pratama"', '"siswa"', '"rizky_pratama"', '"rizky.pratama@sekolah.sch.id"', '"siswa123"', '"081512345678"', '"X-A"', '""'],
        ['"Aisyah Putri Maharani"', '"siswa"', '"aisyah_putri"', '"aisyah.putri@sekolah.sch.id"', '"siswa123"', '"081698761234"', '"X-A"', '""'],
        ['"Hendra Pratama (Wali Rizky)"', '"orang_tua"', '"ortu_rizky"', '"hendra.pratama@gmail.com"', '"ortu123"', '"081287654321"', '""', '"rizky.pratama@sekolah.sch.id"']
      ];
      fileName = 'Template_Import_Semua_Role_SIMAK.csv';
    } else if (templateType === 'guru') {
      headers = ['Nama Lengkap', 'Role', 'Username', 'Email', 'Password', 'No_WhatsApp'];
      sampleRows = [
        ['"Budi Santoso, S.Kom"', '"guru"', '"guru_budi"', '"budi.santoso@sekolah.sch.id"', '"guru123"', '"081298765432"'],
        ['"Dewi Sartika, S.Pd"', '"guru"', '"guru_dewi"', '"dewi.sartika@sekolah.sch.id"', '"guru123"', '"081387654321"'],
        ['"Siti Rahmawati, S.Pd"', '"wali_kelas"', '"wali_siti"', '"siti.rahmawati@sekolah.sch.id"', '"wali123"', '"081598765432"']
      ];
      fileName = 'Template_Import_Guru_WaliKelas_SIMAK.csv';
    } else if (templateType === 'siswa') {
      headers = ['Nama Lengkap', 'Username', 'Email', 'Password', 'No_WhatsApp', 'Kelas'];
      sampleRows = [
        ['"Muhammad Rizky Pratama"', '"rizky_pratama"', '"rizky.pratama@sekolah.sch.id"', '"siswa123"', '"081298765432"', '"X-A"'],
        ['"Siti Aisyah Putri"', '"siti_aisyah"', '"siti.aisyah@sekolah.sch.id"', '"siswa123"', '"081376543210"', '"X-A"'],
        ['"Dimas Arya Saputra"', '"dimas_arya"', '"dimas.arya@sekolah.sch.id"', '"siswa123"', '"081512345678"', '"X-B"']
      ];
      fileName = 'Template_Import_Siswa_Kelas_SIMAK.csv';
    } else if (templateType === 'orang_tua') {
      headers = ['Nama Orang Tua / Wali', 'Username', 'Email', 'Password', 'No_WhatsApp', 'Email_Atau_Username_Siswa_Anak'];
      sampleRows = [
        ['"Hendra Pratama"', '"ortu_rizky"', '"hendra.pratama@gmail.com"', '"ortu123"', '"081287654321"', '"rizky.pratama@sekolah.sch.id"'],
        ['"Ratna Sari"', '"ortu_aisyah"', '"ratna.sari@gmail.com"', '"ortu123"', '"081398765432"', '"siti.aisyah@sekolah.sch.id"']
      ];
      fileName = 'Template_Import_OrangTua_Wali_SIMAK.csv';
    } else {
      headers = ['Nama Lengkap', 'Role', 'Username', 'Email', 'Password', 'No_WhatsApp'];
      sampleRows = [
        ['"Administrator Tata Usaha"', '"admin"', '"admin_tu"', '"admin.tu@sekolah.sch.id"', '"admin123"', '"081234567890"']
      ];
      fileName = 'Template_Import_Admin_SIMAK.csv';
    }

    const content = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
    this.downloadCSVFile(content, fileName);
  }

  public importUsersMultiRoleCSV(
    csvText: string,
    options: {
      defaultRole?: UserRole;
      defaultClassId?: string;
      duplicateStrategy?: 'update' | 'skip';
      defaultPassword?: string;
    } = {}
  ): {
    success: boolean;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    enrolledCount: number;
    parentLinkedCount: number;
    errorMessages: string[];
    processedUsers: User[];
  } {
    const {
      defaultRole = 'siswa',
      defaultClassId = '',
      duplicateStrategy = 'update',
      defaultPassword = ''
    } = options;

    const lines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      return {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        enrolledCount: 0,
        parentLinkedCount: 0,
        errorMessages: ['File CSV kosong atau hanya memiliki satu baris header.'],
        processedUsers: []
      };
    }

    const parseCSVRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (insideQuote && row[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = lines[0];
    const headerCols = parseCSVRow(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    // Intelligent index mapper
    const findIndexByKeywords = (keywords: string[]) => {
      return headerCols.findIndex(col => keywords.some(k => col.includes(k)));
    };

    const nameIdx = findIndexByKeywords(['nama', 'name']);
    const roleIdx = findIndexByKeywords(['role', 'peran', 'jabatan', 'tipe']);
    const userIdx = findIndexByKeywords(['username', 'user', 'uname', 'login']);
    const emailIdx = findIndexByKeywords(['email', 'surel', 'mail']);
    const passIdx = findIndexByKeywords(['pass', 'sandi', 'password', 'pwd']);
    const phoneIdx = findIndexByKeywords(['wa', 'telepon', 'phone', 'hp', 'ponsel', 'kontak']);
    const classIdx = findIndexByKeywords(['kelas', 'class', 'rombel']);
    const childIdx = findIndexByKeywords(['anak', 'siswa', 'child', 'student', 'terkait', 'relasi']);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let enrolledCount = 0;
    let parentLinkedCount = 0;
    const errorMessages: string[] = [];
    const processedUsers: User[] = [];

    const validRoles: UserRole[] = ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua'];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = parseCSVRow(line);

      const rawName = nameIdx !== -1 && nameIdx < cols.length ? cols[nameIdx] : cols[0];
      if (!rawName) {
        errorMessages.push(`Baris ${i + 1}: Nama tidak boleh kosong.`);
        continue;
      }

      // Parse email
      let rawEmail = emailIdx !== -1 && emailIdx < cols.length ? cols[emailIdx] : '';
      if (!rawEmail) {
        // Auto-generate email from name if missing
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        rawEmail = `${safeName}@sekolah.sch.id`;
      }

      // Parse Role
      let rawRole: UserRole = defaultRole;
      if (roleIdx !== -1 && roleIdx < cols.length && cols[roleIdx]) {
        const candidateRole = cols[roleIdx].toLowerCase().trim();
        if (candidateRole.includes('admin')) rawRole = 'admin';
        else if (candidateRole.includes('wali')) rawRole = 'wali_kelas';
        else if (candidateRole.includes('guru') || candidateRole.includes('pengajar') || candidateRole.includes('teacher')) rawRole = 'guru';
        else if (candidateRole.includes('ortu') || candidateRole.includes('orang_tua') || candidateRole.includes('orang') || candidateRole.includes('parent')) rawRole = 'orang_tua';
        else if (candidateRole.includes('siswa') || candidateRole.includes('murid') || candidateRole.includes('student')) rawRole = 'siswa';
        else if (validRoles.includes(candidateRole as UserRole)) rawRole = candidateRole as UserRole;
      }

      // Parse Username
      let rawUsername = userIdx !== -1 && userIdx < cols.length ? cols[userIdx] : '';
      if (!rawUsername) {
        rawUsername = rawEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${Date.now()}_${i}`;
      }
      rawUsername = rawUsername.toLowerCase().replace(/\s+/g, '');

      // Parse Password
      let rawPassword = passIdx !== -1 && passIdx < cols.length ? cols[passIdx] : '';
      if (!rawPassword) {
        if (defaultPassword) {
          rawPassword = defaultPassword;
        } else {
          // Standard default password according to role
          if (rawRole === 'admin') rawPassword = 'admin123';
          else if (rawRole === 'guru' || rawRole === 'wali_kelas') rawPassword = 'guru123';
          else if (rawRole === 'orang_tua') rawPassword = 'ortu123';
          else rawPassword = 'siswa123';
        }
      }

      // Parse Phone
      const rawPhone = phoneIdx !== -1 && phoneIdx < cols.length ? cols[phoneIdx] : '-';

      // Parse Class (if specified)
      const rawClass = classIdx !== -1 && classIdx < cols.length ? cols[classIdx] : '';

      // Parse Child/Student for parent (if specified)
      const rawChild = childIdx !== -1 && childIdx < cols.length ? cols[childIdx] : '';

      // Check existing user by email or username
      let existingUser = this.findUserByEmail(rawEmail);
      if (!existingUser && rawUsername) {
        existingUser = this.findUserByUsername(rawUsername);
      }

      let activeUserId = '';

      if (existingUser) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          processedUsers.push(existingUser);
          continue;
        } else {
          // Update existing user
          this.updateUser(existingUser.id, {
            nama: rawName,
            username: rawUsername,
            email: rawEmail,
            role: rawRole,
            no_wa: rawPhone || existingUser.no_wa,
            password_hash: rawPassword || existingUser.password_hash
          });
          activeUserId = existingUser.id;
          updatedCount++;
          processedUsers.push(this.db.users[activeUserId]);
        }
      } else {
        // Create new user
        const newUser = this.createUser({
          nama: rawName,
          username: rawUsername,
          email: rawEmail,
          role: rawRole,
          no_wa: rawPhone || '-',
          password_hash: rawPassword
        });
        activeUserId = newUser.id;
        createdCount++;
        processedUsers.push(newUser);
      }

      // Handle Class Enrollment for Students
      if (rawRole === 'siswa' && activeUserId) {
        let targetClass = '';
        if (rawClass) {
          // Find class by name or ID
          const matchedClass = Object.values(this.db.classes).find(
            c => c.id === rawClass || c.nama_kelas.toLowerCase() === rawClass.toLowerCase()
          );
          if (matchedClass) targetClass = matchedClass.id;
        }
        if (!targetClass && defaultClassId) {
          targetClass = defaultClassId;
        }

        if (targetClass) {
          const alreadyInClass = Object.values(this.db.class_members).some(
            cm => cm.class_id === targetClass && cm.student_id === activeUserId
          );
          if (!alreadyInClass) {
            const newCmId = 'cm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            const memberObj = {
              id: newCmId,
              class_id: targetClass,
              student_id: activeUserId
            };
            this.db.class_members[newCmId] = memberObj;
            FirestoreSyncService.getInstance().syncDocument('class_members', newCmId, memberObj);
            enrolledCount++;
          }
        }
      }

      // Handle Parent-Student Relation for Orang Tua
      if (rawRole === 'orang_tua' && activeUserId && rawChild) {
        const student = this.findUserByEmail(rawChild) || this.findUserByUsername(rawChild) || Object.values(this.db.users).find(u => u.nama.toLowerCase() === rawChild.toLowerCase() && u.role === 'siswa');
        if (student) {
          const alreadyLinked = Object.values(this.db.parent_student_relations).some(
            psr => psr.parent_id === activeUserId && psr.student_id === student.id
          );
          if (!alreadyLinked) {
            const newPsrId = 'psr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            const relObj = {
              id: newPsrId,
              parent_id: activeUserId,
              student_id: student.id
            };
            this.db.parent_student_relations[newPsrId] = relObj;
            FirestoreSyncService.getInstance().syncDocument('parent_student_relations', newPsrId, relObj);
            parentLinkedCount++;
          }
        }
      }
    }

    this.persist();

    return {
      success: createdCount > 0 || updatedCount > 0,
      createdCount,
      updatedCount,
      skippedCount,
      enrolledCount,
      parentLinkedCount,
      errorMessages,
      processedUsers
    };
  }

  // --- BULK USERNAME & PASSWORD MANAGEMENT ---
  public bulkUpdateUserCredentials(updates: Array<{
    userId: string;
    newUsername?: string;
    newPassword?: string;
  }>): { success: boolean; count: number } {
    let count = 0;
    updates.forEach(u => {
      const user = this.db.users[u.userId];
      if (user) {
        let changed = false;
        if (u.newUsername && u.newUsername.trim() && u.newUsername !== user.username) {
          user.username = u.newUsername.trim().toLowerCase().replace(/\s+/g, '');
          changed = true;
        }
        if (u.newPassword && u.newPassword.trim() && u.newPassword !== user.password_hash) {
          user.password_hash = u.newPassword.trim();
          changed = true;
        }
        if (changed) {
          FirestoreSyncService.getInstance().syncDocument('users', user.id, user);
          count++;
        }
      }
    });

    if (count > 0) {
      this.persist();
      this.logActivity(
        'bulk_action',
        'Pembaruan Massal Kredensial Pengguna',
        `Berhasil memperbarui username / kata sandi untuk ${count} akun pengguna.`,
        'bulk_credentials'
      );
    }

    return { success: count > 0, count };
  }

  public exportUserCredentialsCSV(usersList: Array<{
    id: string;
    nama: string;
    role: string;
    username: string;
    password_hash: string;
    className?: string;
    no_wa?: string;
  }>): void {
    const headers = ['No', 'Nama Lengkap', 'Role Akses', 'Kelas', 'Username (ID Login)', 'Password Akun', 'No. WhatsApp'];
    const rows = usersList.map((u, idx) => [
      `"${idx + 1}"`,
      `"${u.nama.replace(/"/g, '""')}"`,
      `"${u.role.toUpperCase()}"`,
      `"${(u.className || '-').replace(/"/g, '""')}"`,
      `"${(u.username || '-').replace(/"/g, '""')}"`,
      `"${(u.password_hash || '-').replace(/"/g, '""')}"`,
      `"${(u.no_wa || '-').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const fileName = `SIMAK_Daftar_Kredensial_Akun_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSVFile(csvString, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Daftar Kredensial Berhasil Diekspor',
      text: `File "${fileName}" berisi ${usersList.length} akun berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  public exportUserCredentialsPDF(usersList: Array<{
    id: string;
    nama: string;
    role: string;
    username: string;
    password_hash: string;
    className?: string;
    no_wa?: string;
  }>): void {
    if (usersList.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Pilih Akun', text: 'Tidak ada data pengguna yang dipilih untuk dicetak.' });
      return;
    }

    const appSettings = this.getAppSettings();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 6 Cards per A4 page (2 columns x 3 rows)
    const cardWidth = 88;
    const cardHeight = 80;
    const marginX = 12;
    const marginY = 16;
    const gapX = 10;
    const gapY = 8;
    const cardsPerPage = 6;

    usersList.forEach((user, idx) => {
      const pageIndex = Math.floor(idx / cardsPerPage);
      const cardIndexOnPage = idx % cardsPerPage;

      if (idx > 0 && cardIndexOnPage === 0) {
        doc.addPage();
      }

      const col = cardIndexOnPage % 2;
      const row = Math.floor(cardIndexOnPage / 2);
      const x = marginX + col * (cardWidth + gapX);
      const y = marginY + row * (cardHeight + gapY);

      // Card Container Outer Box
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

      // Card Header Banner
      let bannerColor = [79, 70, 229]; // indigo-600
      if (user.role === 'admin') bannerColor = [147, 51, 234]; // purple-600
      else if (user.role === 'guru') bannerColor = [37, 99, 235]; // blue-600
      else if (user.role === 'wali_kelas') bannerColor = [2, 132, 199]; // sky-600
      else if (user.role === 'siswa') bannerColor = [5, 150, 105]; // emerald-600
      else if (user.role === 'orang_tua') bannerColor = [217, 119, 6]; // amber-600

      doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
      doc.roundedRect(x, y, cardWidth, 14, 3, 3, 'F');
      doc.rect(x, y + 8, cardWidth, 6, 'F'); // square bottom of banner

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(appSettings.appName.toUpperCase() || 'SIMAK SEKOLAH', x + 5, y + 6);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`KARTU AKSES & LOGIN: ${user.role.toUpperCase().replace('_', ' ')}`, x + 5, y + 11);

      // Body Details
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const truncatedName = doc.splitTextToSize(user.nama, cardWidth - 10)[0];
      doc.text(truncatedName, x + 5, y + 21);

      if (user.className && user.className !== '-') {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Kelas: ${user.className}`, x + 5, y + 26);
      }

      // Box Credentials Container
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(x + 5, y + 29, cardWidth - 10, 28, 2, 2, 'FD');

      // Username Field
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'bold');
      doc.text('USERNAME / ID LOGIN:', x + 8, y + 35);
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont('courier', 'bold');
      doc.text(`@${user.username}`, x + 8, y + 41);

      // Password Field
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('KATA SANDI (PASSWORD):', x + 8, y + 47);
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72); // rose-600
      doc.setFont('courier', 'bold');
      doc.text(user.password_hash || 'pass123', x + 8, y + 53);

      // Footer note & cut line
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Rahasiakan akun Anda. Ganti kata sandi setelah login pertama.', x + 5, y + 62);
      doc.text('Diterbitkan oleh Admin Sistem Informasi Akademik.', x + 5, y + 66);

      // Dashed cutting line around each card for scissors
      doc.setLineDashPattern([2, 2], 0);
      doc.setDrawColor(203, 213, 225);
      doc.rect(x - 1, y - 1, cardWidth + 2, cardHeight + 2, 'S');
      doc.setLineDashPattern([], 0); // reset dash
    });

    const fileName = `SIMAK_Kartu_Akses_Login_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    Swal.fire({
      icon: 'success',
      title: 'Kartu Akun Siap Dicetak!',
      text: `File "${fileName}" berisi ${usersList.length} kartu kredensial berhasil dibuat (format A4 siap cetak & gunting).`,
      timer: 2500,
      showConfirmButton: false
    });
  }

  /**
   * Mengunduh seluruh snapshot database Firebase/Lokal ke file JSON lokal sebagai cadangan mandiri Admin
   */
  public exportDatabaseJSON(customFileName?: string): { blob: Blob; filename: string; summary: Record<string, number> } {
    const snapshot = this.getRawSnapshot();
    const summary: Record<string, number> = {
      users: Object.keys(snapshot.users || {}).length,
      classes: Object.keys(snapshot.classes || {}).length,
      subjects: Object.keys(snapshot.subjects || {}).length,
      class_members: Object.keys(snapshot.class_members || {}).length,
      attendance: Object.keys(snapshot.attendance || {}).length,
      grades: Object.keys(snapshot.grades || {}).length,
      parent_student_relations: Object.keys(snapshot.parent_student_relations || {}).length,
      announcements: Object.keys(snapshot.announcements || {}).length,
      academic_events: Object.keys(snapshot.academic_events || {}).length,
      activity_logs: Object.keys(snapshot.activity_logs || {}).length
    };

    const backupPayload = {
      _meta: {
        appName: snapshot.app_settings?.appName || 'SIMAK',
        appVersion: '3.2',
        backupDate: new Date().toISOString(),
        backupTimestamp: Date.now(),
        totalEntities: Object.values(summary).reduce((a, b) => a + b, 0),
        recordCounts: summary,
        systemCreator: snapshot.app_settings?.creatorName || 'Puput Sasmita'
      },
      database: snapshot
    };

    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const dateFormatted = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = customFileName || `SIMAK_Backup_Database_${dateFormatted}.json`;

    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit log
    this.logActivity(
      'export_data',
      'Unduh Cadangan Database JSON',
      `Mengunduh cadangan lengkap database JSON (${backupPayload._meta.totalEntities} data)`,
      filename,
      summary
    );

    return { blob, filename, summary };
  }

  /**
   * Memulihkan (restore) seluruh database dari file JSON cadangan
   */
  public restoreDatabaseJSON(jsonContent: string): { success: boolean; message: string; summary?: Record<string, number> } {
    try {
      const parsed = JSON.parse(jsonContent);
      const dataToRestore: DatabaseSnapshot = parsed.database ? parsed.database : parsed;

      // Basic structure validation
      if (!dataToRestore.users || !dataToRestore.classes) {
        return {
          success: false,
          message: 'Format file JSON tidak valid. Pastikan file berisi node "users" dan "classes".'
        };
      }

      this.db = dataToRestore;
      this.persist();

      const summary: Record<string, number> = {
        users: Object.keys(this.db.users || {}).length,
        classes: Object.keys(this.db.classes || {}).length,
        subjects: Object.keys(this.db.subjects || {}).length,
        attendance: Object.keys(this.db.attendance || {}).length,
        grades: Object.keys(this.db.grades || {}).length
      };

      this.logActivity(
        'import_data',
        'Pemulihan Database dari JSON',
        `Memulihkan database dari file cadangan JSON`,
        'restore_backup',
        summary
      );

      return {
        success: true,
        message: 'Database berhasil dipulihkan dari cadangan JSON.',
        summary
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Gagal memproses file JSON: ${e?.message || 'Format tidak valid'}`
      };
    }
  }
}
