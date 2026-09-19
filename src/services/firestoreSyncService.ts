import {
  firestore,
  testFirestoreConnection
} from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { DatabaseService } from './databaseService';
import { INITIAL_DATABASE } from '../mockData';

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
   * Cek koneksi ke Firestore dan lakukan seeding awal data sekolah
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
        console.log(`Firestore already contains ${snapshot.size} users.`);
        this.status.isSeeded = true;
        this.status.totalSynced = snapshot.size;
      }

      this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
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
   * Unggah seluruh data awal (Seed Data) ke Firestore
   */
  public async pushAllDataToFirestore(): Promise<number> {
    const dbService = DatabaseService.getInstance();
    const snapshot = dbService.getRawSnapshot();

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
    Object.values(snapshot.subjects).forEach(subj => {
      const ref = doc(firestore, 'subjects', subj.id);
      batch.set(ref, subj, { merge: true });
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

    await batch.commit();

    this.status.totalSynced = count;
    this.status.isSeeded = true;
    this.status.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
    this.notify();

    return count;
  }

  /**
   * Simpan atau update dokumen secara individual ke Firestore
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
}
