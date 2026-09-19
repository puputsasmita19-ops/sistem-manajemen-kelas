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

export interface SyncStatus {
  isConnected: boolean;
  isSeeded: boolean;
  totalSynced: number;
  lastSyncedAt: string | null;
  error: string | null;
}

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

  public static getInstance(): FirestoreSyncService {
    if (!FirestoreSyncService.instance) {
      FirestoreSyncService.instance = new FirestoreSyncService();
    }
    return FirestoreSyncService.instance;
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

      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.status.error = null;
      this.notify();
      return true;
    } catch (err: any) {
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
      // Listener App Settings
      const unsubSettings = onSnapshot(collection(firestore, 'app_settings'), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            if (data && data.appName) {
              const dbService = DatabaseService.getInstance();
              dbService.updateAppSettings(data as any);
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
            }
          } else if (change.type === 'removed') {
            delete raw.announcements[change.doc.id];
          }
        });
      }, (err) => console.warn('Announcements realtime listener warning:', err));
      this.activeSubscriptions.push(unsubAnn);

      // Listener Grades Realtime
      const unsubGrades = onSnapshot(collection(firestore, 'grades'), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const dbService = DatabaseService.getInstance();
            const raw = dbService.getRawSnapshot();
            const gradeData = change.doc.data() as any;
            if (gradeData && gradeData.id) {
              raw.grades[gradeData.id] = gradeData;
            }
          }
        });
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

    await batch.commit();

    this.status.totalSynced = count;
    this.status.isSeeded = true;
    this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
    this.notify();

    return count;
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
    } catch (err) {
      console.warn(`Batch sync failed for ${collectionName}:`, err);
    }
  }
}
