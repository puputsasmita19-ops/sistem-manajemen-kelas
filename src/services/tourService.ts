import Swal from 'sweetalert2';
import { User, UserRole } from '../types';

export interface TourStep {
  title: string;
  badge: string;
  badgeColor: string;
  content: string;
  icon: string; // emoji or svg icon representation
  actionHint?: string;
  targetTab?: string;
}

export class TourService {
  private static instance: TourService;

  private constructor() {}

  public static getInstance(): TourService {
    if (!TourService.instance) {
      TourService.instance = new TourService();
    }
    return TourService.instance;
  }

  private getTourStorageKey(userId: string): string {
    return `SIMAK_TOUR_SEEN_${userId}`;
  }

  public hasSeenTour(userId: string): boolean {
    try {
      return localStorage.getItem(this.getTourStorageKey(userId)) === 'true';
    } catch (e) {
      return false;
    }
  }

  public setTourSeen(userId: string): void {
    try {
      localStorage.setItem(this.getTourStorageKey(userId), 'true');
    } catch (e) {}
  }

  public resetTourSeen(userId: string): void {
    try {
      localStorage.removeItem(this.getTourStorageKey(userId));
    } catch (e) {}
  }

  private getRoleSteps(role: UserRole, userName: string, appName: string): TourStep[] {
    switch (role) {
      case 'admin':
        return [
          {
            title: `Selamat Datang, ${userName}!`,
            badge: 'Admin Tour 1/5',
            badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
            icon: '🛡️',
            content: `Anda masuk sebagai <strong>Administrator Utama</strong> pada sistem <strong>${appName}</strong>. Dashboard ini memberikan kontrol terpusat atas data pengguna, presensi, akademik, hingga pengaturan identitas sekolah.`,
            actionHint: 'Klik tombol "Lanjut" untuk menjelajahi menu penting lainnya.'
          },
          {
            title: 'Manajemen Pengguna & Multi-Role',
            badge: 'Admin Tour 2/5',
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '👥',
            content: `Di tab <strong>Pengguna</strong>, Anda dapat:
            <ul class="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Mendaftarkan & mengedit 5 role akses sekolah.</li>
              <li>Ekspor & Impor massal data akun via CSV.</li>
              <li>Generator Username & Sandi Massal + Cetak Kartu Akun PDF.</li>
            </ul>`,
            targetTab: 'users'
          },
          {
            title: 'Buku Nilai & Analisis Performa Visual',
            badge: 'Admin Tour 3/5',
            badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '📊',
            content: `Kelola nilai Tugas, UTS, dan UAS di tab <strong>Nilai & Rapor</strong>. Tersedia fitur <strong>Laporan Analisis Performa Visual (Chart.js)</strong> yang dapat diekspor langsung menjadi dokumen PDF resmi lengkap dengan diagram grafis!`,
            targetTab: 'grades'
          },
          {
            title: 'Audit Trail & Log Aktivitas Firebase',
            badge: 'Admin Tour 4/5',
            badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
            icon: '📋',
            content: `Setiap perubahan penting seperti <strong>login, input nilai, penghapusan akun, dan konfigurasi</strong> dicatat otomatis ke riwayat <strong>Log Aktivitas</strong> yang tersinkronisasi dengan Firebase Cloud.`,
            targetTab: 'users'
          },
          {
            title: 'Kustomisasi Identitas & Running Text',
            badge: 'Admin Tour 5/5',
            badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
            icon: '⚙️',
            content: `Ubah nama sekolah, logo visual, warna tema, teks berjalan halaman login (running text), dan kontak bantuan WhatsApp sesuai profil institusi Anda di tab <strong>Identitas & Logo</strong>.`,
            actionHint: 'Panduan selesai! Anda dapat mengulang tour ini kapan saja dari tombol Panduan di bilah atas.'
          }
        ];

      case 'wali_kelas':
        return [
          {
            title: `Selamat Datang, Bapak/Ibu ${userName}!`,
            badge: 'Wali Kelas Tour 1/4',
            badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            icon: '🏫',
            content: `Anda memegang mandat sebagai <strong>Wali Kelas</strong> di sistem <strong>${appName}</strong>. Anda dapat mengawal perkembangan akademik dan karakter anak didik secara menyeluruh.`,
            actionHint: 'Klik "Lanjut" untuk melihat fitur khusus wali kelas.'
          },
          {
            title: '18 Modul Administrasi Wali Kelas Lengkap',
            badge: 'Wali Kelas Tour 2/4',
            badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
            icon: '📂',
            content: `Buka tab <strong>Menu Wali Kelas</strong> untuk mengakses 18 alat kerja terpadu: Catatan Kasus/BK, Prestasi, Jurnal Guru, Struktur Kelas, Kas Kelas, Inventaris, hingga Leger Nilai Komprehensif.`,
            targetTab: 'homeroom'
          },
          {
            title: 'Presensi & Rekapitulasi Nilai Kelas',
            badge: 'Wali Kelas Tour 3/4',
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '📝',
            content: `Pantau kehadiran harian siswa di tab <strong>Presensi</strong> dan input nilai pada tab <strong>Nilai & Rapor</strong>. Disediakan analisis capaian ketuntasan KKM dan ekspor rapor siswa.`,
            targetTab: 'attendance'
          },
          {
            title: 'Cetak Dokumen & Rapor PDF',
            badge: 'Wali Kelas Tour 4/4',
            badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '🖨️',
            content: `Seluruh laporan administrasi kelas, data rekap kehadiran, dan rapor individual siswa dapat langsung diunduh dan dicetak dalam format PDF standar sekolah nasional.`,
            actionHint: 'Tour selesai! Selamat bertugas membimbing kelas binaan Anda.'
          }
        ];

      case 'guru':
        return [
          {
            title: `Selamat Datang, Bapak/Ibu Guru ${userName}!`,
            badge: 'Guru Tour 1/3',
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '📚',
            content: `Portal Guru <strong>${appName}</strong> dirancang untuk memudahkan Anda mengelola KBM harian, presensi pertemuan kelas, dan pembobotan nilai secara otomatis.`,
            actionHint: 'Mari kenali fitur utama pengajaran Anda.'
          },
          {
            title: 'Presensi Kelas Harian & QR Code',
            badge: 'Guru Tour 2/3',
            badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '✅',
            content: `Di tab <strong>Presensi</strong>, Anda dapat mencatat absensi siswa per jam pelajaran atau menggunakan fitur Pemindai QR untuk absensi cepat.`,
            targetTab: 'attendance'
          },
          {
            title: 'Buku Nilai & Analisis Performa Visual (Chart.js)',
            badge: 'Guru Tour 3/3',
            badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            icon: '📈',
            content: `Input skor Tugas, UTS, dan UAS di tab <strong>Nilai & Rapor</strong>. Sistem otomatis menghitung nilai akhir dengan bobot baku, menyajikan grafik tren performa kelas, dan menghasilkan dokumen PDF siap cetak.`,
            targetTab: 'grades'
          }
        ];

      case 'siswa':
        return [
          {
            title: `Halo, ${userName}!`,
            badge: 'Siswa Tour 1/3',
            badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '🎓',
            content: `Selamat datang di <strong>Portal Siswa ${appName}</strong>. Di sini kamu bisa memantau seluruh rekaman akademik, presensi kehadiran harian, dan pengumuman sekolah secara real-time.`,
            actionHint: 'Klik "Lanjut" untuk melihat fitur portalmu.'
          },
          {
            title: 'Cek Kehadiran & Kartu Pelajar QR',
            badge: 'Siswa Tour 2/3',
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '🆔',
            content: `Periksa rekap persentase kehadiranmu setiap bulan dan gunakan <strong>Kartu Pelajar Digital QR Code</strong> untuk proses absensi digital di sekolah.`,
            targetTab: 'student_portal'
          },
          {
            title: 'Hasil Capaian Nilai & Unduh Rapor',
            badge: 'Siswa Tour 3/3',
            badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
            icon: '📜',
            content: `Lihat nilai Tugas, UTS, UAS, dan predikat kelulusan tiap mata pelajaran. Kamu juga bisa mengunduh <strong>Lembar Rapor Digital PDF</strong> secara mandiri!`,
            targetTab: 'student_portal'
          }
        ];

      case 'orang_tua':
        return [
          {
            title: `Selamat Datang, Bapak/Ibu ${userName}!`,
            badge: 'Orang Tua Tour 1/3',
            badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
            icon: '👨‍👩‍👧‍👦',
            content: `Terima kasih telah menggunakan <strong>Portal Orang Tua / Wali ${appName}</strong>. Sistem ini membantu Anda memantau transparansi kehadiran dan perkembangan belajar putra-putri tercinta.`,
            actionHint: 'Klik "Lanjut" untuk melihat ringkasan fasilitas.'
          },
          {
            title: 'Pemantauan Presensi Waktu Nyata',
            badge: 'Orang Tua Tour 2/3',
            badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: '🕒',
            content: `Dapatkan informasi presensi harian ananda (Hadir, Izin, Sakit, Alpa) dan notifikasi instan jika terdapat ketidakhadiran di kelas.`,
            targetTab: 'student_portal'
          },
          {
            title: 'Perkembangan Nilai & Pengumuman Sekolah',
            badge: 'Orang Tua Tour 3/3',
            badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            icon: '📢',
            content: `Pantau skor tugas serta ujian ananda, unduh salinan rapor digital, dan baca pengumuman resmi serta agenda kalender akademik sekolah.`,
            targetTab: 'student_portal'
          }
        ];

      default:
        return [];
    }
  }

  /**
   * Menjalankan Tur Interaktif Bertahap menggunakan SweetAlert2
   */
  public async startTour(
    currentUser: User,
    appName: string = 'SIMAK',
    onNavigateTab?: (tab: string) => void,
    isManualTrigger: boolean = false
  ): Promise<void> {
    if (!currentUser) return;

    // Jika bukan trigger manual dan sudah pernah lihat, lewati
    if (!isManualTrigger && this.hasSeenTour(currentUser.id)) {
      return;
    }

    const steps = this.getRoleSteps(currentUser.role, currentUser.nama, appName);
    if (steps.length === 0) return;

    let currentStepIndex = 0;

    const renderStepModal = async (stepIndex: number): Promise<void> => {
      const step = steps[stepIndex];
      const isFirst = stepIndex === 0;
      const isLast = stepIndex === steps.length - 1;

      // Berpindah tab jika step memiliki targetTab
      if (step.targetTab && onNavigateTab) {
        onNavigateTab(step.targetTab);
      }

      const result = await Swal.fire({
        title: `
          <div class="flex items-center justify-between gap-3 text-left w-full border-b border-slate-100 dark:border-slate-700 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">${step.icon}</span>
              <span class="text-base font-bold text-slate-900 dark:text-white leading-tight">${step.title}</span>
            </div>
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full border ${step.badgeColor} whitespace-nowrap shrink-0">
              ${step.badge}
            </span>
          </div>
        `,
        html: `
          <div class="text-left space-y-4 pt-2">
            <div class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              ${step.content}
            </div>
            ${
              step.actionHint
                ? `<div class="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                     <span>💡</span>
                     <span>${step.actionHint}</span>
                   </div>`
                : ''
            }
            <div class="flex items-center justify-center gap-1.5 pt-2">
              ${steps
                .map(
                  (_, idx) => `
                <div class="w-2.5 h-2.5 rounded-full transition-all ${
                  idx === stepIndex
                    ? 'bg-blue-600 w-6'
                    : idx < stepIndex
                    ? 'bg-blue-300 dark:bg-blue-800'
                    : 'bg-slate-200 dark:bg-slate-700'
                }"></div>
              `
                )
                .join('')}
            </div>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: !isFirst,
        confirmButtonText: isLast ? 'Selesai & Mulai Bekerja 🎉' : 'Lanjut ➔',
        denyButtonText: '⬅️ Kembali',
        cancelButtonText: 'Lewati Tour',
        confirmButtonColor: '#2563eb',
        denyButtonColor: '#64748b',
        cancelButtonColor: '#94a3b8',
        allowOutsideClick: false,
        customClass: {
          popup: 'rounded-3xl p-6 dark:bg-slate-800 dark:border-slate-700 max-w-lg shadow-2xl',
          confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5 shadow-sm',
          denyButton: 'rounded-xl text-xs font-semibold px-3 py-2.5',
          cancelButton: 'rounded-xl text-xs font-medium px-3 py-2.5 text-slate-600'
        }
      });

      if (result.isConfirmed) {
        if (isLast) {
          this.setTourSeen(currentUser.id);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Tour Selesai!',
            text: 'Selamat menggunakan SIMAK!',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          await renderStepModal(stepIndex + 1);
        }
      } else if (result.isDenied) {
        if (stepIndex > 0) {
          await renderStepModal(stepIndex - 1);
        }
      } else if (result.isDismissed) {
        this.setTourSeen(currentUser.id);
      }
    };

    await renderStepModal(0);
  }
}

export const tourService = TourService.getInstance();
