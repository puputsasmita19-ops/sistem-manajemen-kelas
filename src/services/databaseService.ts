import { INITIAL_DATABASE } from '../mockData';
import { DatabaseSnapshot, User, ClassEntity, Subject, Attendance, Grade, UserRole, AttendanceStatus, GradeType, SchoolAnnouncement, AppSettings, RunningTextItem } from '../types';
import { FirestoreSyncService } from './firestoreSyncService';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

const STORAGE_KEY = 'SIMAK_FIREBASE_RTDB_SIMULATION';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: DatabaseSnapshot;
  private announcementListeners: Array<(ann: SchoolAnnouncement) => void> = [];
  private settingsListeners: Array<(settings: AppSettings) => void> = [];

  private constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.db = JSON.parse(saved);
        if (!this.db.announcements) {
          this.db.announcements = JSON.parse(JSON.stringify(INITIAL_DATABASE.announcements || {}));
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

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
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
        runningTextItems: defaultRunningItems
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
    return newUser;
  }

  public updateUser(id: string, userData: Partial<User>): User {
    if (!this.db.users[id]) throw new Error('Pengguna tidak ditemukan');
    this.db.users[id] = { ...this.db.users[id], ...userData };
    this.persist();
    FirestoreSyncService.getInstance().syncDocument('users', id, this.db.users[id]);
    return this.db.users[id];
  }

  public deleteUser(id: string): void {
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
      delete this.db.announcements[id];
      this.persist();
      FirestoreSyncService.getInstance().deleteDocument('announcements', id);
    }
  }

  public onAnnouncementAdded(listener: (ann: SchoolAnnouncement) => void): () => void {
    this.announcementListeners.push(listener);
    return () => {
      this.announcementListeners = this.announcementListeners.filter(l => l !== listener);
    };
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

  public downloadSampleStudentCSV(): void {
    const headers = ['Nama Lengkap', 'Email', 'No_WhatsApp'];
    const sampleRows = [
      ['"Muhammad Rizky Pratama"', '"rizky.pratama@sekolah.sch.id"', '"081298765432"'],
      ['"Siti Aisyah Putri"', '"siti.aisyah@sekolah.sch.id"', '"081376543210"'],
      ['"Dimas Arya Saputra"', '"dimas.arya@sekolah.sch.id"', '"081512345678"']
    ];

    const content = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
    this.downloadCSVFile(content, 'Template_Import_Siswa_SIMAK.csv');
  }

  public importStudentsFromCSV(csvText: string, targetClassId: string): {
    success: boolean;
    createdCount: number;
    enrolledCount: number;
    errorMessages: string[];
  } {
    const lines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      return {
        success: false,
        createdCount: 0,
        enrolledCount: 0,
        errorMessages: ['File CSV kosong atau hanya memiliki baris header.']
      };
    }

    // Parse header to find column indices
    const headerLine = lines[0];
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

    const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Determine indices
    let nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
    let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('surel'));
    let phoneIdx = headers.findIndex(h => h.includes('wa') || h.includes('telepon') || h.includes('phone') || h.includes('hp'));

    if (nameIdx === -1) nameIdx = 0; // Default first col
    if (emailIdx === -1) emailIdx = 1; // Default second col
    if (phoneIdx === -1) phoneIdx = 2; // Default third col

    let createdCount = 0;
    let enrolledCount = 0;
    const errorMessages: string[] = [];

    for (let idx = 1; idx < lines.length; idx++) {
      const line = lines[idx];
      if (!line) continue;
      const cols = parseCSVRow(line);

      const nama = cols[nameIdx];
      const email = cols[emailIdx];
      const no_wa = phoneIdx < cols.length ? cols[phoneIdx] : '';

      if (!nama || !email) {
        errorMessages.push(`Baris ${idx + 1}: Nama atau email kosong (${line})`);
        continue;
      }

      // Check if user already exists
      let existingUser = this.findUserByEmail(email);
      let studentId = existingUser?.id;

      if (!existingUser) {
        // Create user
        const generatedUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `siswa_${Date.now()}_${idx}`;
        const newUser = this.createUser({
          nama,
          username: generatedUsername,
          email,
          role: 'siswa',
          password_hash: 'siswa123',
          no_wa: no_wa || '-'
        });
        studentId = newUser.id;
        createdCount++;
      } else {
        studentId = existingUser.id;
      }

      // Enroll in targetClassId if specified and not already enrolled
      if (targetClassId && studentId) {
        const alreadyInClass = Object.values(this.db.class_members).some(
          cm => cm.class_id === targetClassId && cm.student_id === studentId
        );

        if (!alreadyInClass) {
          const newCmId = 'cm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          const newMember = {
            id: newCmId,
            class_id: targetClassId,
            student_id: studentId
          };
          this.db.class_members[newCmId] = newMember;
          FirestoreSyncService.getInstance().syncDocument('class_members', newCmId, newMember);
          enrolledCount++;
        }
      }
    }

    this.persist();

    return {
      success: createdCount > 0 || enrolledCount > 0,
      createdCount,
      enrolledCount,
      errorMessages
    };
  }
}
