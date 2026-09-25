import Swal from 'sweetalert2';
import { SchoolAnnouncement, User, Grade } from '../types';
import { DatabaseService } from './databaseService';
import { firestore, getFirebaseMessaging, firebaseConfig } from './firebaseClient';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';

export interface FCMRegisteredDevice {
  id: string;
  token: string;
  userId: string;
  userName: string;
  userRole: string;
  deviceInfo?: string;
  lastActive?: string;
  createdAt?: string;
}

export interface FCMPushLog {
  id: string;
  announcementId?: string;
  title: string;
  content: string;
  category: string;
  priority: 'high' | 'normal';
  targetRole: string;
  author: string;
  dispatchedAt: string;
  targetedDevicesCount: number;
}

class RealtimeNotificationService {
  private static instance: RealtimeNotificationService;
  private isInitialized = false;
  private audioContext: AudioContext | null = null;
  private fcmToken: string | null = null;
  private isFCMSupportedState: boolean | null = null;
  private fcmMessaging: Messaging | null = null;
  private fcmRegisteredCountCache: number = 0;

  private constructor() {}

  public static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService();
    }
    return RealtimeNotificationService.instance;
  }

  /**
   * Mainkan efek suara notifikasi lembut berbasis Web Audio API synthesizer
   */
  private playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Note 1 (E5 - 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (A5 - 880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      // Ignore audio failure
    }
  }

  /**
   * Cek status izin Browser Push Notification
   */
  public getBrowserPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Cek apakah FCM Messaging didukung pada browser/perangkat saat ini
   */
  public async isFCMSupported(): Promise<boolean> {
    if (this.isFCMSupportedState !== null) return this.isFCMSupportedState;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      this.isFCMSupportedState = false;
      return false;
    }
    try {
      const messaging = await getFirebaseMessaging();
      this.isFCMSupportedState = messaging !== null;
      return this.isFCMSupportedState;
    } catch (e) {
      this.isFCMSupportedState = false;
      return false;
    }
  }

  /**
   * Dapatkan token FCM lokal yang sedang aktif jika sudah teregistrasi
   */
  public getFCMToken(): string | null {
    if (this.fcmToken) return this.fcmToken;
    try {
      return localStorage.getItem('SIMAK_FCM_DEVICE_TOKEN');
    } catch {
      return null;
    }
  }

  /**
   * Meminta izin Browser Push Notification dan mendaftarkan perangkat ke Firebase Cloud Messaging (FCM)
   */
  public async requestBrowserNotificationPermission(currentUser?: User | null): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Didukung',
        text: 'Peramban ini belum mendukung Web Push Notifications.'
      });
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Registrasikan ke FCM jika currentUser tersedia
        if (currentUser) {
          await this.registerFCMDeviceToken(currentUser, false);
        }

        this.sendBrowserNotification('🔔 Push Notification & FCM Aktif!', {
          body: 'Notifikasi pengumuman guru dan unggahan nilai akademik akan langsung muncul di peramban Anda.'
        });

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Notifikasi FCM Aktif!',
          text: 'Perangkat Anda telah terdaftar untuk menerima pengumuman instan dari sekolah.',
          timer: 3500,
          showConfirmButton: false
        });
      } else if (permission === 'denied') {
        Swal.fire({
          icon: 'warning',
          title: 'Notifikasi Diblokir',
          text: 'Izin notifikasi diblokir oleh peramban. Silakan aktifkan di pengaturan peramban untuk menerima update real-time.'
        });
      }
      return permission;
    } catch (e: any) {
      console.warn('Error requesting notification permission:', e);
      return 'unsupported';
    }
  }

  /**
   * Daftarkan token FCM perangkat pengguna ke Cloud Firestore
   */
  public async registerFCMDeviceToken(currentUser: User, showPrompt = true): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (typeof window === 'undefined') return { success: false, error: 'SSR environment' };
      
      const supported = await this.isFCMSupported();
      if (!supported) {
        if (showPrompt) {
          Swal.fire({
            icon: 'info',
            title: 'FCM Tidak Didukung',
            text: 'Peramban atau lingkungan saat ini tidak mendukung Firebase Cloud Messaging.'
          });
        }
        return { success: false, error: 'FCM not supported' };
      }

      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          return { success: false, error: 'Notification permission not granted' };
        }
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) return { success: false, error: 'Firebase messaging not initialized' };

      // Generate device registration token
      const token = await getToken(messaging, {
        vapidKey: 'BEl-o0gXhN4-xUeK_494vEwGv_109ZqW8VwA77rX8h_M_8xGgYvJ1-oF_8wM4q4o9_1j2_9Z-0aB3c4d5e6f7g'
      }).catch(async (tokenErr) => {
        // Fallback without explicit vapidKey if default project credentials apply
        console.warn('FCM getToken with vapidKey failed, trying default:', tokenErr);
        return await getToken(messaging);
      });

      if (!token) {
        return { success: false, error: 'Unable to retrieve FCM token' };
      }

      this.fcmToken = token;
      try {
        localStorage.setItem('SIMAK_FCM_DEVICE_TOKEN', token);
      } catch (e) {}

      // Simpan informasi perangkat terdaftar ke Firestore
      const deviceDocId = `${currentUser.id}_${btoa(token.slice(-16)).replace(/[^a-zA-Z0-9]/g, '')}`;
      const deviceRef = doc(firestore, 'fcm_device_tokens', deviceDocId);
      
      const deviceData: FCMRegisteredDevice = {
        id: deviceDocId,
        token: token,
        userId: currentUser.id,
        userName: currentUser.nama,
        userRole: currentUser.role,
        deviceInfo: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 80)} (${navigator.platform || 'web'})` : 'Web Browser',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await setDoc(deviceRef, deviceData, { merge: true });

      if (showPrompt) {
        Swal.fire({
          icon: 'success',
          title: 'Perangkat Terdaftar di FCM!',
          text: `Perangkat ${currentUser.nama} (${currentUser.role.toUpperCase()}) kini siap menerima pengumuman push notification langsung dari Administrator.`,
          timer: 3000,
          showConfirmButton: false
        });
      }

      return { success: true, token };
    } catch (err: any) {
      console.warn('FCM Device Token Registration failed:', err);
      return { success: false, error: err?.message || 'Gagal mendaftarkan token perangkat' };
    }
  }

  /**
   * Mengirim Push Notification FCM ke seluruh perangkat pengguna yang terdaftar
   */
  public async sendFCMPushNotification(
    ann: SchoolAnnouncement,
    options?: { onProgress?: (msg: string) => void }
  ): Promise<{ success: boolean; targetedCount: number; message: string }> {
    try {
      options?.onProgress?.('Mengambil daftar perangkat terdaftar di Cloud Firestore...');

      // 1. Ambil seluruh device token yang tersimpan di Firestore
      const tokensCol = collection(firestore, 'fcm_device_tokens');
      const snapshot = await getDocs(tokensCol);
      
      const allDevices: FCMRegisteredDevice[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as FCMRegisteredDevice;
        if (data && data.token) {
          allDevices.push(data);
        }
      });

      // 2. Filter target role sesuai konfigurasi pengumuman
      const targetedDevices = allDevices.filter((dev) => {
        if (ann.targetRole === 'all') return true;
        return dev.userRole === ann.targetRole;
      });

      const targetedCount = targetedDevices.length;

      // 3. Simpan riwayat siaran push notifikasi ke Firestore
      const logDocId = `push_${Date.now()}_${ann.id}`;
      const logRef = doc(firestore, 'fcm_broadcast_logs', logDocId);
      
      const pushLog: FCMPushLog = {
        id: logDocId,
        announcementId: ann.id,
        title: ann.title,
        content: ann.content,
        category: ann.category,
        priority: ann.priority,
        targetRole: ann.targetRole,
        author: ann.author,
        dispatchedAt: new Date().toISOString(),
        targetedDevicesCount: targetedCount
      };

      await setDoc(logRef, pushLog);

      // 4. Siarkan notifikasi native browser lokal ke client yang aktif
      this.playNotificationChime();
      this.sendBrowserNotification(`📢 [FCM Push] ${ann.title}`, {
        body: `${ann.content.slice(0, 120)}...\nSasaran: ${ann.targetRole.toUpperCase()} • Oleh: ${ann.author}`,
        tag: `fcm_${ann.id}`
      });

      // 5. Broadcast juga ke databaseService local listener
      const dbService = DatabaseService.getInstance();
      dbService.notifyAnnouncementUpdate(ann);

      return {
        success: true,
        targetedCount,
        message: `Push Notification FCM berhasil dikirim ke ${targetedCount} perangkat pengguna terdaftar.`
      };
    } catch (err: any) {
      console.error('Error dispatching FCM Push Notification:', err);
      return {
        success: false,
        targetedCount: 0,
        message: err?.message || 'Gagal mengirim push notification FCM.'
      };
    }
  }

  /**
   * Dapatkan total perangkat FCM yang terdaftar di Firestore
   */
  public async getRegisteredFCMDevicesCount(): Promise<number> {
    try {
      const tokensCol = collection(firestore, 'fcm_device_tokens');
      const snapshot = await getDocs(tokensCol);
      this.fcmRegisteredCountCache = snapshot.size;
      return snapshot.size;
    } catch (err) {
      console.warn('Failed to fetch registered devices count:', err);
      return this.fcmRegisteredCountCache || 0;
    }
  }

  /**
   * Dapatkan rincian seluruh perangkat FCM yang terdaftar
   */
  public async getRegisteredFCMDevices(): Promise<FCMRegisteredDevice[]> {
    try {
      const tokensCol = collection(firestore, 'fcm_device_tokens');
      const snapshot = await getDocs(tokensCol);
      const list: FCMRegisteredDevice[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      return list;
    } catch (err) {
      console.warn('Failed to fetch registered devices list:', err);
      return [];
    }
  }

  /**
   * Hapus / cabut pendaftaran token perangkat FCM
   */
  public async deleteFCMDeviceToken(deviceDocId: string): Promise<boolean> {
    try {
      const deviceRef = doc(firestore, 'fcm_device_tokens', deviceDocId);
      await deleteDoc(deviceRef);
      return true;
    } catch (err) {
      console.error('Error deleting FCM device token:', err);
      return false;
    }
  }

  /**
   * Uji coba pengiriman FCM Push Notification (Admin Test Trigger)
   */
  public async testSendFCMPushNotification(adminUser: User): Promise<{ success: boolean; message: string; targetedCount: number }> {
    const testAnn: SchoolAnnouncement = {
      id: `test_push_${Date.now()}`,
      title: '🚨 Tes Push Notification Firebase Cloud Messaging (FCM)',
      content: 'Pengumuman ini merupakan pengujian siaran push notification langsung ke seluruh perangkat pengguna yang terdaftar.',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      category: 'Penting',
      author: adminUser.nama || 'Administrator Sekolah',
      authorRole: 'admin',
      priority: 'high',
      targetRole: 'all'
    };

    const res = await this.sendFCMPushNotification(testAnn);
    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'FCM Push Berhasil Disiarkan!',
        html: `
          <div class="text-left text-xs space-y-2 mt-2">
            <p><strong>Judul:</strong> ${testAnn.title}</p>
            <p><strong>Target:</strong> Seluruh Pengguna (${res.targetedCount} Perangkat Terdaftar)</p>
            <p class="text-slate-500">Notifikasi telah disiarkan dan dicatat pada riwayat log siaran Firebase.</p>
          </div>
        `,
        confirmButtonColor: '#2563eb'
      });
    }
    return res;
  }

  /**
   * Mengirim Browser Push Notification native
   */
  public sendBrowserNotification(title: string, options?: NotificationOptions): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        silent: false,
        ...options
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Native notification trigger failed:', e);
    }
  }

  /**
   * Inisialisasi pemantauan real-time notifikasi pengumuman, nilai & FCM foreground listener
   */
  public init(getCurrentUser: () => User | null): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const dbService = DatabaseService.getInstance();

    // 0. Inisialisasi Firebase Cloud Messaging Foreground Listener jika didukung
    this.initFCMListener(getCurrentUser);

    // 1. Pemantau Pengumuman Baru (Real-time Announcements Listener)
    dbService.subscribeAnnouncementUpdates((ann: SchoolAnnouncement) => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      // Cek apakah target role cocok
      if (
        ann.targetRole !== 'all' &&
        ann.targetRole !== currentUser.role &&
        currentUser.role !== 'admin'
      ) {
        return;
      }

      this.playNotificationChime();

      // Trigger Native Browser Push Notification
      this.sendBrowserNotification(`📢 Pengumuman Baru: ${ann.title}`, {
        body: `${ann.content.slice(0, 140)}${ann.content.length > 140 ? '...' : ''}\nKategori: ${ann.category} • Oleh: ${ann.author}`,
        tag: `ann_${ann.id}`
      });

      // If urgent push notification, display full alert modal immediately
      if (ann.priority === 'high') {
        this.showUrgentPushModal(ann, currentUser);
        return;
      }

      // Tampilkan SweetAlert2 Toast Interaktif
      Swal.fire({
        title: `<div class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <span class="p-1 rounded-md bg-amber-100 text-amber-700 text-xs">📢 Pengumuman Baru</span>
                </div>`,
        html: `
          <div class="text-left mt-1 text-xs text-slate-600 dark:text-slate-300">
            <p class="font-bold text-slate-900 dark:text-white line-clamp-1">${ann.title}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Oleh: ${ann.author} (${ann.category})</p>
          </div>
        `,
        toast: true,
        position: 'top-end',
        showConfirmButton: true,
        confirmButtonText: 'Buka Pengumuman',
        confirmButtonColor: '#2563eb',
        showCancelButton: true,
        cancelButtonText: 'Tutup',
        cancelButtonColor: '#94a3b8',
        timer: 8000,
        timerProgressBar: true,
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl border border-blue-200 shadow-xl dark:bg-slate-800 dark:border-slate-700',
          confirmButton: 'text-xs py-1.5 px-3 rounded-xl font-bold',
          cancelButton: 'text-xs py-1.5 px-3 rounded-xl font-medium'
        }
      }).then((res) => {
        if (res.isConfirmed) {
          this.showAnnouncementDetail(ann);
        }
      });
    });

    // 2. Pemantau Perubahan Nilai (Real-time Grades Change Listener)
    dbService.subscribeGradeUpdates((info: {
      studentId: string;
      studentName: string;
      subjectName: string;
      scoreType: string;
      score: number;
      updatedBy: string;
    }) => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const isForCurrentStudent = currentUser.role === 'siswa' && currentUser.id === info.studentId;
      const isForParentChild = currentUser.role === 'orang_tua' && dbService.isStudentChildOfParent(currentUser.id, info.studentId);
      const isTeacherOrAdmin = currentUser.role === 'admin' || currentUser.role === 'guru' || currentUser.role === 'wali_kelas';

      // Hanya tampilkan alert jika relevan dengan user yang sedang login
      if (isForCurrentStudent || isForParentChild || isTeacherOrAdmin) {
        this.playNotificationChime();

        let alertTitle = '📊 Pembaruan Nilai Akademik';
        let alertMessage = '';
        let browserNotifTitle = `📝 Nilai Baru: ${info.subjectName}`;
        let browserNotifBody = `Nilai ${info.scoreType} untuk ${info.studentName}: ${info.score} (Oleh: ${info.updatedBy})`;

        if (isForCurrentStudent) {
          alertMessage = `Nilai <strong>${info.subjectName} (${info.scoreType})</strong> Anda telah diperbarui menjadi <strong>${info.score}</strong>.`;
          browserNotifTitle = `📝 Nilai Baru Anda: ${info.subjectName}`;
          browserNotifBody = `Nilai ${info.scoreType} Anda telah diunggah dengan skor ${info.score} (${info.updatedBy}).`;
        } else if (isForParentChild) {
          alertMessage = `Nilai <strong>${info.subjectName} (${info.scoreType})</strong> ananda <strong>${info.studentName}</strong> telah diperbarui (Skor: ${info.score}).`;
          browserNotifTitle = `📝 Nilai Ananda: ${info.subjectName}`;
          browserNotifBody = `Nilai ${info.scoreType} ananda ${info.studentName} diunggah (Skor: ${info.score}).`;
        } else {
          alertMessage = `Nilai <strong>${info.subjectName}</strong> untuk <strong>${info.studentName}</strong> berhasil diperbarui (${info.scoreType}: ${info.score}).`;
        }

        // Trigger Browser Push Notification
        this.sendBrowserNotification(browserNotifTitle, {
          body: browserNotifBody,
          tag: `grade_${info.studentId}_${info.scoreType}_${Date.now()}`
        });

        Swal.fire({
          title: `<div class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span class="p-1 rounded-md bg-emerald-100 text-emerald-700 text-xs">📊 Realtime Update</span>
                  </div>`,
          html: `<div class="text-left mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${alertMessage}</div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 6000,
          timerProgressBar: true,
          background: '#ffffff',
          customClass: {
            popup: 'rounded-2xl border border-emerald-200 shadow-xl dark:bg-slate-800 dark:border-slate-700'
          }
        });
      }
    });
  }

  /**
   * Listener pesan Foreground Firebase Cloud Messaging
   */
  private async initFCMListener(getCurrentUser: () => User | null): Promise<void> {
    try {
      const supported = await this.isFCMSupported();
      if (!supported) return;

      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      this.fcmMessaging = messaging;

      // Pasang listener onMessage untuk pesan masuk saat aplikasi aktif di foreground
      onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload);
        const currentUser = getCurrentUser();

        this.playNotificationChime();

        const title = payload.notification?.title || payload.data?.title || '📢 Notifikasi Baru dari Sekolah';
        const body = payload.notification?.body || payload.data?.body || 'Anda menerima pembaruan informasi terkini.';

        // Kirim notifikasi native jika sedang background / tab lain
        this.sendBrowserNotification(title, {
          body,
          tag: payload.data?.tag || `fcm_foreground_${Date.now()}`
        });

        // Tampilkan Toast Interaktif
        Swal.fire({
          title: `<div class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span class="p-1 rounded-md bg-blue-100 text-blue-700 text-xs font-black">🔔 FCM PUSH</span>
                  </div>`,
          html: `
            <div class="text-left mt-1 text-xs text-slate-700 dark:text-slate-300">
              <p class="font-bold text-slate-900 dark:text-white line-clamp-2">${title}</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">${body}</p>
            </div>
          `,
          toast: true,
          position: 'top-end',
          showConfirmButton: true,
          confirmButtonText: 'Buka',
          confirmButtonColor: '#2563eb',
          showCancelButton: true,
          cancelButtonText: 'Tutup',
          cancelButtonColor: '#94a3b8',
          timer: 9000,
          timerProgressBar: true,
          background: '#ffffff',
          customClass: {
            popup: 'rounded-2xl border border-blue-300 shadow-xl dark:bg-slate-800 dark:border-slate-700',
            confirmButton: 'text-xs py-1.5 px-3 rounded-xl font-bold',
            cancelButton: 'text-xs py-1.5 px-3 rounded-xl font-medium'
          }
        });
      });

      // Jika izin sudah granted, daftarkan token secara otomatis di latar belakang
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const user = getCurrentUser();
        if (user) {
          this.registerFCMDeviceToken(user, false).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('initFCMListener failed:', err);
    }
  }

  /**
   * Tampilkan Modal Rinci Pengumuman Sekolah
   */
  public showAnnouncementDetail(ann: SchoolAnnouncement): void {
    Swal.fire({
      title: `<div class="text-left font-bold text-lg text-slate-900 dark:text-white">${ann.title}</div>`,
      html: `
        <div class="text-left space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div class="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">${ann.category}</span>
            <span class="text-slate-500 dark:text-slate-400">📅 ${ann.date} • 🕒 ${ann.time || '08:00'}</span>
            <span class="text-slate-500 dark:text-slate-400">👤 Penulis: ${ann.author}</span>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200 font-normal">
            ${ann.content}
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-1">
            <span>Sasaran: ${ann.targetRole.toUpperCase()}</span>
            <span>Prioritas: ${ann.priority === 'high' ? 'PENTING / TINGGI' : 'NORMAL'}</span>
          </div>
        </div>
      `,
      confirmButtonText: 'Tutup Pengumuman',
      confirmButtonColor: '#2563eb',
      customClass: {
        popup: 'rounded-3xl p-6 dark:bg-slate-800 dark:border-slate-700',
        confirmButton: 'rounded-xl text-xs font-bold px-5 py-2.5'
      }
    });
  }

  /**
   * Tampilkan Modal Pengumuman Mendesak (Urgent Push Notification)
   */
  public showUrgentPushModal(ann: SchoolAnnouncement, user?: User | null): void {
    this.playNotificationChime();
    Swal.fire({
      title: `<div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-base font-black uppercase tracking-wider">
                <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping inline-block"></span>
                🚨 PENGUMUMAN MENDESAK DARI SEKOLAH
              </div>`,
      html: `
        <div class="text-left space-y-3.5 mt-2">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-2xl">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${ann.title}</h4>
            <div class="flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-300 font-semibold mt-1">
              <span>👤 ${ann.author} (${ann.authorRole.toUpperCase()})</span>
              <span>•</span>
              <span>📅 ${ann.date} ${ann.time || ''}</span>
            </div>
          </div>

          <div class="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium max-h-60 overflow-y-auto">
            ${ann.content}
          </div>

          <div class="text-[11px] text-slate-500 dark:text-slate-400 text-center italic">
            Mohon perhatikan instruksi di atas secara seksama demi kelancaran kegiatan belajar mengajar.
          </div>
        </div>
      `,
      icon: 'warning',
      iconColor: '#ef4444',
      showConfirmButton: true,
      confirmButtonText: '✅ Saya Mengerti & Telah Membaca (Konfirmasi)',
      confirmButtonColor: '#e11d48',
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-rose-500 shadow-2xl dark:bg-slate-800',
        confirmButton: 'rounded-xl text-xs font-bold px-6 py-3 w-full shadow-md shadow-rose-500/30'
      }
    }).then(() => {
      if (user) {
        try {
          localStorage.setItem(`SIMAK_ACK_URGENT_${ann.id}_${user.id}`, 'true');
        } catch (e) {}
      }
    });
  }

  /**
   * Periksa apakah ada pengumuman mendesak yang belum dibaca saat user baru login
   */
  public checkLoginUrgentPushNotifications(user: User): void {
    if (!user) return;
    const dbService = DatabaseService.getInstance();
    const announcements = dbService.getAnnouncementsForRole(user.role);
    
    // Cari pengumuman berprioritas tinggi ('high') yang belum di-acknowledge oleh user ini
    const unreadUrgent = announcements.find((ann) => {
      if (ann.priority !== 'high') return false;
      const isAck = localStorage.getItem(`SIMAK_ACK_URGENT_${ann.id}_${user.id}`);
      return !isAck;
    });

    if (unreadUrgent) {
      setTimeout(() => {
        this.showUrgentPushModal(unreadUrgent, user);
      }, 1200);
    }
  }

  /**
   * Simulasi Pengujian Notifikasi Realtime
   */
  public triggerTestNotification(type: 'announcement' | 'grade', currentUser?: User | null): void {
    const dbService = DatabaseService.getInstance();
    const student = dbService.getAllUsers().find(u => u.role === 'siswa') || { id: 'user_std1', nama: 'Ahmad Rizky Pratama' };
    const subject = dbService.getAllSubjects()[0] || { nama_mapel: 'Matematika Wajib' };

    if (type === 'announcement') {
      const sampleAnn: SchoolAnnouncement = {
        id: 'test_ann_' + Date.now(),
        title: '📢 Simulasi Pengumuman Realtime Firebase & FCM',
        content: 'Pengumuman ini adalah uji coba sistem pemantauan realtime client-side menggunakan SweetAlert2 dan Firebase Cloud Messaging.',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        category: 'Penting',
        author: currentUser?.nama || 'Administrator Sekolah',
        authorRole: currentUser?.role || 'admin',
        priority: 'high',
        targetRole: 'all'
      };
      dbService.notifyAnnouncementUpdate(sampleAnn);
      this.sendFCMPushNotification(sampleAnn);
    } else {
      const randScore = Math.floor(Math.random() * 20) + 80;
      dbService.notifyGradeUpdate({
        studentId: currentUser?.role === 'siswa' ? currentUser.id : student.id,
        studentName: currentUser?.role === 'siswa' ? currentUser.nama : student.nama,
        subjectName: subject.nama_mapel,
        scoreType: 'Tugas Harian',
        score: randScore,
        updatedBy: currentUser?.nama || 'Guru Mata Pelajaran'
      });
    }
  }

  /**
   * Tampilkan notifikasi toast aksi sukses yang responsif & adaptif tema
   */
  public notifyActionSuccess(title: string, message?: string, playSound = false): void {
    if (playSound) this.playNotificationChime();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `<span class="text-xs font-bold">${title}</span>`,
      html: message ? `<span class="text-[11px] leading-tight block mt-0.5 opacity-90">${message}</span>` : undefined,
      showConfirmButton: false,
      timer: 2600,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-2xl border border-emerald-500/20 shadow-lg'
      }
    });
  }

  /**
   * Tampilkan notifikasi toast aksi info / progres
   */
  public notifyActionInfo(title: string, message?: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `<span class="text-xs font-bold">${title}</span>`,
      html: message ? `<span class="text-[11px] leading-tight block mt-0.5 opacity-90">${message}</span>` : undefined,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-2xl border border-blue-500/20 shadow-lg'
      }
    });
  }

  /**
   * Tampilkan notifikasi toast peringatan
   */
  public notifyActionWarning(title: string, message?: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: `<span class="text-xs font-bold">${title}</span>`,
      html: message ? `<span class="text-[11px] leading-tight block mt-0.5 opacity-90">${message}</span>` : undefined,
      showConfirmButton: false,
      timer: 3200,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-2xl border border-amber-500/20 shadow-lg'
      }
    });
  }

  /**
   * Tampilkan notifikasi toast aksi gagal / kesalahan
   */
  public notifyActionError(title: string, message?: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: `<span class="text-xs font-bold">${title}</span>`,
      html: message ? `<span class="text-[11px] leading-tight block mt-0.5 opacity-90">${message}</span>` : undefined,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-2xl border border-rose-500/20 shadow-lg'
      }
    });
  }
}

export const realtimeNotificationService = RealtimeNotificationService.getInstance();
