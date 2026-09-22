import {
  firestore,
  testFirestoreConnection
} from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { DatabaseService } from './databaseService';
import { GoogleDriveService } from './googleDriveService';
import Swal from 'sweetalert2';

export interface SyncStatus {
  isConnected: boolean;
  isSeeded: boolean;
  totalSynced: number;
  lastSyncedAt: string | null;
  error: string | null;
}

// SweetAlert2 Toast configuration for elegant non-intrusive realtime notifications
const SyncToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#0F172A',
  color: '#F8FAFC',
  customClass: {
    popup: 'rounded-xl shadow-2xl border border-slate-700/80 text-xs text-left'
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export class FirestoreSyncService {
  private static instance: FirestoreSyncService;
  private status: SyncStatus = {
    isConnected: false,
    isSeeded: false,
    totalSynced: 0,
    lastSyncedAt: null,
    error: null
  };
  private listeners: ((status: SyncStatus) => void)[] = [];
  private activeSubscriptions: (() => void)[] = [];
  private isInitialLoadComplete = false;
  private toastDebounceTimer: any = null;
  private pendingToastMessages: Set<string> = new Set();

  public static getInstance(): FirestoreSyncService {
    if (!FirestoreSyncService.instance) {
      FirestoreSyncService.instance = new FirestoreSyncService();
    }
    return FirestoreSyncService.instance;
  }

  /**
   * Tampilkan SweetAlert2 Toast pemberitahuan sinkronisasi Firebase
   */
  public showFirebaseToast(title: string, detail?: string, icon: 'success' | 'info' | 'warning' = 'success') {
    if (!this.isInitialLoadComplete) return;

    const messageKey = detail ? `${title}: ${detail}` : title;
    this.pendingToastMessages.add(messageKey);

    if (this.toastDebounceTimer) {
      clearTimeout(this.toastDebounceTimer);
    }

    this.toastDebounceTimer = setTimeout(() => {
      const messages = Array.from(this.pendingToastMessages);
      this.pendingToastMessages.clear();

      if (messages.length === 0) return;

      const displayTitle = messages.length === 1 ? title : 'Sinkronisasi Real-time Cloud';
      const displayDetail = messages.length === 1 ? (detail || 'Data berhasil disinkronisasi.') : `${messages.length} pembaruan data berhasil disinkronisasi ke Firebase Firestore.`;

      SyncToast.fire({
        icon,
        title: `<div class="font-bold flex items-center gap-1.5 text-xs text-emerald-400">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          ${displayTitle}
        </div>`,
        html: `<div class="text-[11px] text-slate-300 font-normal mt-0.5 leading-snug">${displayDetail}</div>`
      });
    }, 400);
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach(l => l(s));
  }

  /**
   * Cek koneksi ke Firestore dan lakukan inisialisasi & sinkronisasi data dua arah
   */
  public async initializeAndSeed(): Promise<boolean> {
    try {
      const connected = await testFirestoreConnection();
      this.status.isConnected = connected;

      if (!connected) {
        this.status.error = 'Koneksi Firestore belum terhubung.';
        this.notify();
        return false;
      }

      // Periksa apakah koleksi users sudah memiliki data di Firestore
      const usersCol = collection(firestore, 'users');
      const snapshot = await getDocs(usersCol);

      if (snapshot.empty) {
        console.log('Seeding initial data to Firebase Firestore...');
        await this.pushAllDataToFirestore();
        this.status.isSeeded = true;
      } else {
        console.log(`Firestore contains ${snapshot.size} users. Pulling cloud state...`);
        this.status.isSeeded = true;
        this.status.totalSynced = snapshot.size;
        await this.pullAllDataFromFirestore();
      }

      // Inisialisasi real-time listeners untuk cloud update
      this.startRealtimeListeners();

      this.isInitialLoadComplete = true;
      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.status.error = null;
      this.notify();
      return true;
    } catch (err: any) {
      this.isInitialLoadComplete = true;
      console.error('Firestore init error:', err);
      this.status.error = err.message || 'Gagal menyinkronkan Firestore';
      this.notify();
      return false;
    }
  }

  /**
   * Membaca seluruh data dari cloud Firestore ke memory & local cache
   */
  public async pullAllDataFromFirestore(): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      const current = dbService.getRawSnapshot();

      // 1. Users
      const usersSnap = await getDocs(collection(firestore, 'users'));
      if (!usersSnap.empty) {
        usersSnap.forEach(d => {
          const u = d.data();
          if (u.id) current.users[u.id] = u as any;
        });
      }

      // 2. Classes
      const classesSnap = await getDocs(collection(firestore, 'classes'));
      if (!classesSnap.empty) {
        classesSnap.forEach(d => {
          const c = d.data();
          if (c.id) current.classes[c.id] = c as any;
        });
      }

      // 3. Subjects
      const subjectsSnap = await getDocs(collection(firestore, 'subjects'));
      if (!subjectsSnap.empty) {
        subjectsSnap.forEach(d => {
          const s = d.data();
          if (s.id) current.subjects[s.id] = s as any;
        });
      }

      // 4. Class Members
      const cmSnap = await getDocs(collection(firestore, 'class_members'));
      if (!cmSnap.empty) {
        cmSnap.forEach(d => {
          const cm = d.data();
          if (cm.id) current.class_members[cm.id] = cm as any;
        });
      }

      // 5. Attendance
      const attSnap = await getDocs(collection(firestore, 'attendance'));
      if (!attSnap.empty) {
        attSnap.forEach(d => {
          const a = d.data();
          if (a.id) current.attendance[a.id] = a as any;
        });
      }

      // 6. Grades
      const grdSnap = await getDocs(collection(firestore, 'grades'));
      if (!grdSnap.empty) {
        grdSnap.forEach(d => {
          const g = d.data();
          if (g.id) current.grades[g.id] = g as any;
        });
      }

      // 7. Announcements
      const annSnap = await getDocs(collection(firestore, 'announcements'));
      if (!annSnap.empty) {
        if (!current.announcements) current.announcements = {};
        annSnap.forEach(d => {
          const ann = d.data();
          if (ann.id) current.announcements[ann.id] = ann as any;
        });
      }

      // 8. App Settings
      const settingsSnap = await getDocs(collection(firestore, 'app_settings'));
      if (!settingsSnap.empty) {
        settingsSnap.forEach(d => {
          const st = d.data();
          if (st) current.app_settings = st as any;
        });
      }

      // 9. Activity Logs
      const logsSnap = await getDocs(collection(firestore, 'logs'));
      if (!logsSnap.empty) {
        if (!current.activity_logs) {
          (current as any).activity_logs = {};
        }
        logsSnap.forEach(d => {
          const lg = d.data();
          if (lg && lg.id && current.activity_logs) {
            current.activity_logs[lg.id] = lg as any;
          }
        });
      }

      // 10. Master Data: Academic Years
      const aySnap = await getDocs(collection(firestore, 'academic_years'));
      if (!aySnap.empty) {
        if (!current.academic_years) current.academic_years = {};
        aySnap.forEach(d => {
          const ay = d.data();
          if (ay && ay.id) current.academic_years![ay.id] = ay as any;
        });
      }

      // 11. Master Data: Curriculums
      const currSnap = await getDocs(collection(firestore, 'curriculums'));
      if (!currSnap.empty) {
        if (!current.curriculums) current.curriculums = {};
        currSnap.forEach(d => {
          const curr = d.data();
          if (curr && curr.id) current.curriculums![curr.id] = curr as any;
        });
      }

      // 12. Master Data: Departments
      const deptSnap = await getDocs(collection(firestore, 'departments'));
      if (!deptSnap.empty) {
        if (!current.departments) current.departments = {};
        deptSnap.forEach(d => {
          const dept = d.data();
          if (dept && dept.id) current.departments![dept.id] = dept as any;
        });
      }

      // 13. Master Data: Master Subjects
      const msSnap = await getDocs(collection(firestore, 'master_subjects'));
      if (!msSnap.empty) {
        if (!current.master_subjects) current.master_subjects = {};
        msSnap.forEach(d => {
          const ms = d.data();
          if (ms && ms.id) current.master_subjects![ms.id] = ms as any;
        });
      }

      // 14. Master Data: Extracurriculars
      const ekskulSnap = await getDocs(collection(firestore, 'extracurriculars'));
      if (!ekskulSnap.empty) {
        if (!current.extracurriculars) current.extracurriculars = {};
        ekskulSnap.forEach(d => {
          const ekskul = d.data();
          if (ekskul && ekskul.id) current.extracurriculars![ekskul.id] = ekskul as any;
        });
      }

      // 15. Master Data: Study Schedules
      const schedSnap = await getDocs(collection(firestore, 'study_schedules'));
      if (!schedSnap.empty) {
        if (!current.study_schedules) current.study_schedules = {};
        schedSnap.forEach(d => {
          const sched = d.data();
          if (sched && sched.id) current.study_schedules![sched.id] = sched as any;
        });
      }

      // Simpan pembaruan ke local storage
      localStorage.setItem('SIMAK_FIREBASE_RTDB_SIMULATION', JSON.stringify(current));
    } catch (e) {
      console.warn('Pull all data from Firestore exception:', e);
    }
  }

  /**
   * Menjalankan listener waktu nyata (real-time onSnapshot) pada koleksi penting
   */
  private startRealtimeListeners() {
    this.activeSubscriptions.forEach(unsub => unsub());
    this.activeSubscriptions = [];

    try {
      // Listener Users Realtime
      const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const userData = change.doc.data() as any;
            if (userData && userData.id) {
              raw.users[userData.id] = userData;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.users[change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Data Pengguna Tersinkronisasi', 'Pembaruan data akun berhasil disinkronkan dengan Firebase.');
        }
      }, (err) => console.warn('Users realtime listener warning:', err));
      this.activeSubscriptions.push(unsubUsers);

      // Listener Classes Realtime
      const unsubClasses = onSnapshot(collection(firestore, 'classes'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const classData = change.doc.data() as any;
            if (classData && classData.id) {
              raw.classes[classData.id] = classData;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.classes[change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Data Kelas Tersinkronisasi', 'Pembaruan manajemen kelas berhasil disinkronkan dengan Firebase.');
        }
      }, (err) => console.warn('Classes realtime listener warning:', err));
      this.activeSubscriptions.push(unsubClasses);

      // Listener Class Members Realtime
      const unsubMembers = onSnapshot(collection(firestore, 'class_members'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const cmData = change.doc.data() as any;
            if (cmData && cmData.id) {
              raw.class_members[cmData.id] = cmData;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.class_members[change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
        }
      }, (err) => console.warn('Class members realtime listener warning:', err));
      this.activeSubscriptions.push(unsubMembers);

      // Listener App Settings
      const unsubSettings = onSnapshot(collection(firestore, 'app_settings'), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            if (data && data.appName) {
              const dbService = DatabaseService.getInstance();
              dbService.updateAppSettings(data as any);
              this.showFirebaseToast('Pengaturan Sekolah Tersinkronisasi', 'Identitas dan konfigurasi aplikasi disinkronkan.');
            }
          }
        });
      }, (err) => console.warn('AppSettings realtime listener warning:', err));
      this.activeSubscriptions.push(unsubSettings);

      // Listener Announcements
      const unsubAnn = onSnapshot(collection(firestore, 'announcements'), (snap) => {
        snap.docChanges().forEach(change => {
          const dbService = DatabaseService.getInstance();
          const raw = dbService.getRawSnapshot();
          if (!raw.announcements) raw.announcements = {};
          if (change.type === 'added' || change.type === 'modified') {
            const item = change.doc.data();
            if (item.id) {
              raw.announcements[item.id] = item as any;
              // Broadcast realtime event
              dbService.notifyAnnouncementUpdate(item as any);
              this.showFirebaseToast('Pengumuman Baru', `${item.judul || 'Pengumuman'} tersinkronisasi dari cloud.`);
            }
          } else if (change.type === 'removed') {
            delete raw.announcements[change.doc.id];
          }
        });
      }, (err) => console.warn('Announcements realtime listener warning:', err));
      this.activeSubscriptions.push(unsubAnn);

      // Listener Attendance Realtime (Auto-Refresh Dashboard & Charts)
      const unsubAttendance = onSnapshot(collection(firestore, 'attendance'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const attData = change.doc.data() as any;
            if (attData && attData.id) {
              raw.attendance[attData.id] = attData;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.attendance[change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Presensi Tersinkronisasi', 'Catatan absensi siswa berhasil disinkronkan ke cloud.');
        }
      }, (err) => console.warn('Attendance realtime listener warning:', err));
      this.activeSubscriptions.push(unsubAttendance);

      // Listener Grades Realtime (Auto-Refresh Dashboard & Charts)
      const unsubGrades = onSnapshot(collection(firestore, 'grades'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const gradeData = change.doc.data() as any;
            if (gradeData && gradeData.id) {
              raw.grades[gradeData.id] = gradeData;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.grades[change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Nilai Tersinkronisasi', 'Pembaruan nilai akademik tersinkronkan.');
        }
      }, (err) => console.warn('Grades realtime listener warning:', err));
      this.activeSubscriptions.push(unsubGrades);

      // Listener Activity Logs Realtime
      const unsubLogs = onSnapshot(collection(firestore, 'logs'), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const dbService = DatabaseService.getInstance();
            const raw = dbService.getRawSnapshot();
            if (!raw.activity_logs) raw.activity_logs = {};
            const logData = change.doc.data() as any;
            if (logData && logData.id) {
              raw.activity_logs[logData.id] = logData;
            }
          }
        });
      }, (err) => console.warn('Logs realtime listener warning:', err));
      this.activeSubscriptions.push(unsubLogs);

      // Listener Master Data: Academic Years Realtime
      const unsubAY = onSnapshot(collection(firestore, 'academic_years'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.academic_years) raw.academic_years = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.academic_years![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.academic_years![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Tahun Ajaran Tersinkronisasi', 'Master Tahun Ajaran disinkronkan dengan Firebase.');
        }
      }, (err) => console.warn('AcademicYears realtime listener warning:', err));
      this.activeSubscriptions.push(unsubAY);

      // Listener Master Data: Curriculums Realtime
      const unsubCurr = onSnapshot(collection(firestore, 'curriculums'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.curriculums) raw.curriculums = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.curriculums![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.curriculums![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Kurikulum Tersinkronisasi', 'Master Kurikulum disinkronkan.');
        }
      }, (err) => console.warn('Curriculums realtime listener warning:', err));
      this.activeSubscriptions.push(unsubCurr);

      // Listener Master Data: Departments Realtime
      const unsubDept = onSnapshot(collection(firestore, 'departments'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.departments) raw.departments = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.departments![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.departments![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Jurusan Tersinkronisasi', 'Master Jurusan / Program Keahlian disinkronkan.');
        }
      }, (err) => console.warn('Departments realtime listener warning:', err));
      this.activeSubscriptions.push(unsubDept);

      // Listener Master Data: Master Subjects Realtime
      const unsubMS = onSnapshot(collection(firestore, 'master_subjects'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.master_subjects) raw.master_subjects = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.master_subjects![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.master_subjects![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Master Mapel Tersinkronisasi', 'Data Master Mata Pelajaran disinkronkan.');
        }
      }, (err) => console.warn('MasterSubjects realtime listener warning:', err));
      this.activeSubscriptions.push(unsubMS);

      // Listener Master Data: Extracurriculars Realtime
      const unsubEks = onSnapshot(collection(firestore, 'extracurriculars'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.extracurriculars) raw.extracurriculars = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.extracurriculars![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.extracurriculars![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Ekstrakurikuler Tersinkronisasi', 'Master Ekstrakurikuler disinkronkan.');
        }
      }, (err) => console.warn('Extracurriculars realtime listener warning:', err));
      this.activeSubscriptions.push(unsubEks);

      // Listener Master Data: Study Schedules Realtime
      const unsubSched = onSnapshot(collection(firestore, 'study_schedules'), (snap) => {
        let hasChanges = false;
        const dbService = DatabaseService.getInstance();
        const raw = dbService.getRawSnapshot();
        if (!raw.study_schedules) raw.study_schedules = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            if (data && data.id) {
              raw.study_schedules![data.id] = data;
              hasChanges = true;
            }
          } else if (change.type === 'removed') {
            delete raw.study_schedules![change.doc.id];
            hasChanges = true;
          }
        });
        if (hasChanges) {
          dbService.persist();
          dbService.notifyDataChange();
          this.showFirebaseToast('Jadwal Belajar Tersinkronisasi', 'Master Jam Belajar disinkronkan.');
        }
      }, (err) => console.warn('StudySchedules realtime listener warning:', err));
      this.activeSubscriptions.push(unsubSched);
    } catch (err) {
      console.warn('Realtime listeners start error:', err);
    }
  }

  /**
   * Unggah seluruh data awal (Seed Data) ke Firestore secara sistematis
   */
  public async pushAllDataToFirestore(): Promise<number> {
    const dbService = DatabaseService.getInstance();
    const snapshot = dbService.getRawSnapshot();
    const driveService = GoogleDriveService.getInstance();

    const batch = writeBatch(firestore);
    let count = 0;

    // 1. Users
    Object.values(snapshot.users).forEach(user => {
      const ref = doc(firestore, 'users', user.id);
      batch.set(ref, user, { merge: true });
      count++;
    });

    // 2. Classes
    Object.values(snapshot.classes).forEach(cls => {
      const ref = doc(firestore, 'classes', cls.id);
      batch.set(ref, cls, { merge: true });
      count++;
    });

    // 3. Subjects
    Object.values(snapshot.subjects).forEach(sub => {
      const ref = doc(firestore, 'subjects', sub.id);
      batch.set(ref, sub, { merge: true });
      count++;
    });

    // 4. Class Members
    Object.values(snapshot.class_members).forEach(cm => {
      const ref = doc(firestore, 'class_members', cm.id);
      batch.set(ref, cm, { merge: true });
      count++;
    });

    // 5. Attendance
    Object.values(snapshot.attendance).forEach(att => {
      const ref = doc(firestore, 'attendance', att.id);
      batch.set(ref, att, { merge: true });
      count++;
    });

    // 6. Grades
    Object.values(snapshot.grades).forEach(grd => {
      const ref = doc(firestore, 'grades', grd.id);
      batch.set(ref, grd, { merge: true });
      count++;
    });

    // 7. Announcements
    if (snapshot.announcements) {
      Object.values(snapshot.announcements).forEach(ann => {
        const ref = doc(firestore, 'announcements', ann.id);
        batch.set(ref, ann, { merge: true });
        count++;
      });
    }

    // 8. App Settings
    if (snapshot.app_settings) {
      const ref = doc(firestore, 'app_settings', 'global_config');
      batch.set(ref, snapshot.app_settings, { merge: true });
      count++;
    }

    // 9. Activity Logs
    if (snapshot.activity_logs) {
      Object.values(snapshot.activity_logs).forEach(lg => {
        const ref = doc(firestore, 'logs', lg.id);
        batch.set(ref, lg, { merge: true });
        count++;
      });
    }

    // 10. Google Drive Student Photos
    const photos = driveService.getAllPhotoRecords();
    photos.forEach(photo => {
      const ref = doc(firestore, 'student_photos', photo.id);
      batch.set(ref, photo, { merge: true });
      count++;
    });

    // 11. Master Data: Academic Years
    if (snapshot.academic_years) {
      Object.values(snapshot.academic_years).forEach(ay => {
        const ref = doc(firestore, 'academic_years', ay.id);
        batch.set(ref, ay, { merge: true });
        count++;
      });
    }

    // 12. Master Data: Curriculums
    if (snapshot.curriculums) {
      Object.values(snapshot.curriculums).forEach(curr => {
        const ref = doc(firestore, 'curriculums', curr.id);
        batch.set(ref, curr, { merge: true });
        count++;
      });
    }

    // 13. Master Data: Departments
    if (snapshot.departments) {
      Object.values(snapshot.departments).forEach(dept => {
        const ref = doc(firestore, 'departments', dept.id);
        batch.set(ref, dept, { merge: true });
        count++;
      });
    }

    // 14. Master Data: Master Subjects
    if (snapshot.master_subjects) {
      Object.values(snapshot.master_subjects).forEach(ms => {
        const ref = doc(firestore, 'master_subjects', ms.id);
        batch.set(ref, ms, { merge: true });
        count++;
      });
    }

    // 15. Master Data: Extracurriculars
    if (snapshot.extracurriculars) {
      Object.values(snapshot.extracurriculars).forEach(ekskul => {
        const ref = doc(firestore, 'extracurriculars', ekskul.id);
        batch.set(ref, ekskul, { merge: true });
        count++;
      });
    }

    // 16. Master Data: Study Schedules
    if (snapshot.study_schedules) {
      Object.values(snapshot.study_schedules).forEach(sched => {
        const ref = doc(firestore, 'study_schedules', sched.id);
        batch.set(ref, sched, { merge: true });
        count++;
      });
    }

    await batch.commit();

    this.status.totalSynced = count;
    this.status.isSeeded = true;
    this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
    this.notify();

    return count;
  }

  /**
   * Helper untuk menyinkronkan item secara individual
   */
  public async syncItemToFirestore(collectionName: string, item: any): Promise<void> {
    if (!item || !item.id) return;
    return this.syncDocument(collectionName, item.id, item);
  }

  /**
   * Helper untuk menghapus item secara individual
   */
  public async deleteItemFromFirestore(collectionName: string, id: string): Promise<void> {
    if (!id) return;
    return this.deleteDocument(collectionName, id);
  }

  /**
   * Menyinkronkan seluruh master akademik ke Firebase Firestore
   */
  public async syncAllMasterAcademicToFirestore(): Promise<{ success: boolean; count: number }> {
    try {
      const dbService = DatabaseService.getInstance();
      const snapshot = dbService.getRawSnapshot();
      const batch = writeBatch(firestore);
      let count = 0;

      if (snapshot.academic_years) {
        Object.values(snapshot.academic_years).forEach(ay => {
          batch.set(doc(firestore, 'academic_years', ay.id), ay, { merge: true });
          count++;
        });
      }
      if (snapshot.curriculums) {
        Object.values(snapshot.curriculums).forEach(curr => {
          batch.set(doc(firestore, 'curriculums', curr.id), curr, { merge: true });
          count++;
        });
      }
      if (snapshot.departments) {
        Object.values(snapshot.departments).forEach(dept => {
          batch.set(doc(firestore, 'departments', dept.id), dept, { merge: true });
          count++;
        });
      }
      if (snapshot.master_subjects) {
        Object.values(snapshot.master_subjects).forEach(ms => {
          batch.set(doc(firestore, 'master_subjects', ms.id), ms, { merge: true });
          count++;
        });
      }
      if (snapshot.extracurriculars) {
        Object.values(snapshot.extracurriculars).forEach(ekskul => {
          batch.set(doc(firestore, 'extracurriculars', ekskul.id), ekskul, { merge: true });
          count++;
        });
      }
      if (snapshot.study_schedules) {
        Object.values(snapshot.study_schedules).forEach(sched => {
          batch.set(doc(firestore, 'study_schedules', sched.id), sched, { merge: true });
          count++;
        });
      }

      await batch.commit();
      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.notify();
      this.showFirebaseToast('Master Data Disinkronkan', `${count} Master Data Akademik tersinkronisasi ke Firebase Firestore.`);
      return { success: true, count };
    } catch (err: any) {
      console.warn('Sync all master academic error:', err);
      return { success: false, count: 0 };
    }
  }

  /**
   * Simpan atau perbarui dokumen secara individual ke Firestore
   */
  public async syncDocument(collectionName: string, id: string, data: any): Promise<void> {
    try {
      const ref = doc(firestore, collectionName, id);
      await setDoc(ref, data, { merge: true });
      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.notify();
      this.showFirebaseToast('Data Berhasil Disinkronkan', `Dokumen pada koleksi ${collectionName} berhasil disimpan ke Firebase.`);
    } catch (err) {
      console.warn(`Background sync failed for ${collectionName}/${id}:`, err);
    }
  }

  /**
   * Hapus dokumen dari Firestore
   */
  public async deleteDocument(collectionName: string, id: string): Promise<void> {
    try {
      const ref = doc(firestore, collectionName, id);
      await deleteDoc(ref);
      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.notify();
      this.showFirebaseToast('Data Dihapus di Cloud', `Dokumen pada koleksi ${collectionName} telah dihapus dari Firebase.`);
    } catch (err) {
      console.warn(`Background delete failed for ${collectionName}/${id}:`, err);
    }
  }

  /**
   * Simpan sekumpulan dokumen (Batch) ke Firestore
   */
  public async syncBatchDocuments(collectionName: string, items: Array<{ id: string; data: any }>): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      items.forEach(item => {
        const ref = doc(firestore, collectionName, item.id);
        batch.set(ref, item.data, { merge: true });
      });
      await batch.commit();
      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.notify();
      this.showFirebaseToast('Batch Data Tersinkronisasi', `${items.length} dokumen ${collectionName} berhasil disimpan ke Firebase Firestore.`);
    } catch (err) {
      console.warn(`Batch sync failed for ${collectionName}:`, err);
    }
  }
}
