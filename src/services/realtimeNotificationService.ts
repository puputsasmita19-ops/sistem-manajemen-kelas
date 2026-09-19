import Swal from 'sweetalert2';
import { SchoolAnnouncement, User, Grade } from '../types';
import { DatabaseService } from './databaseService';

class RealtimeNotificationService {
  private static instance: RealtimeNotificationService;
  private isInitialized = false;
  private audioContext: AudioContext | null = null;

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
   * Inisialisasi pemantauan real-time notifikasi pengumuman & nilai pada client side
   */
  public init(getCurrentUser: () => User | null): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const dbService = DatabaseService.getInstance();

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

        if (isForCurrentStudent) {
          alertMessage = `Nilai <strong>${info.subjectName} (${info.scoreType})</strong> Anda telah diperbarui menjadi <strong>${info.score}</strong>.`;
        } else if (isForParentChild) {
          alertMessage = `Nilai <strong>${info.subjectName} (${info.scoreType})</strong> ananda <strong>${info.studentName}</strong> telah diperbarui (Skor: ${info.score}).`;
        } else {
          alertMessage = `Nilai <strong>${info.subjectName}</strong> untuk <strong>${info.studentName}</strong> berhasil diperbarui (${info.scoreType}: ${info.score}).`;
        }

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
   * Simulasi Pengujian Notifikasi Realtime (Dapat dipanggil dari tombol di header / dashboard)
   */
  public triggerTestNotification(type: 'announcement' | 'grade', currentUser?: User | null): void {
    const dbService = DatabaseService.getInstance();
    const student = dbService.getAllUsers().find(u => u.role === 'siswa') || { id: 'user_std1', nama: 'Ahmad Rizky Pratama' };
    const subject = dbService.getAllSubjects()[0] || { nama_mapel: 'Matematika Wajib' };

    if (type === 'announcement') {
      const sampleAnn: SchoolAnnouncement = {
        id: 'test_ann_' + Date.now(),
        title: '📢 Simulasi Pengumuman Realtime Firebase',
        content: 'Pengumuman ini adalah uji coba sistem pemantauan realtime client-side menggunakan SweetAlert2.',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        category: 'Penting',
        author: 'Administrator Sekolah',
        authorRole: 'admin',
        priority: 'high',
        targetRole: 'all'
      };
      dbService.notifyAnnouncementUpdate(sampleAnn);
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
}

export const realtimeNotificationService = RealtimeNotificationService.getInstance();
