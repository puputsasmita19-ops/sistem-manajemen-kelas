/**
 * NavigationBackService
 * 
 * Layanan terpadu untuk mencegat (intercept) tombol Kembali / Back pada perangkat Android,
 * gesture swipe back pada browser mobile, dan navigasi riwayat peramban.
 * 
 * Manfaat:
 * 1. Menutup modal, menu drawer, atau kamera yang sedang aktif saat tombol kembali ditekan,
 *    bukan langsung keluar dari aplikasi.
 * 2. Mengembalikan ke dasbor utama jika pengguna berada di sub-halaman/fitur.
 * 3. Memunculkan dialog konfirmasi "Ingin Keluar dari Aplikasi?" jika sudah berada di halaman utama.
 */

export type BackHandler = () => boolean | void;

interface HandlerEntry {
  id: string;
  handler: BackHandler;
}

class NavigationBackService {
  private static instance: NavigationBackService;
  private handlerStack: HandlerEntry[] = [];
  private isInitialized = false;
  private onConfirmExitRequest?: () => void;
  private onNavigateHomeRequest?: () => boolean;

  private constructor() {}

  public static getInstance(): NavigationBackService {
    if (!NavigationBackService.instance) {
      NavigationBackService.instance = new NavigationBackService();
    }
    return NavigationBackService.instance;
  }

  /**
   * Inisialisasi pendengar riwayat peramban (popstate)
   */
  public initialize(config: {
    onConfirmExit: () => void;
    onNavigateHome?: () => boolean;
  }): () => void {
    this.onConfirmExitRequest = config.onConfirmExit;
    this.onNavigateHomeRequest = config.onNavigateHome;

    if (this.isInitialized) {
      return () => {};
    }

    this.isInitialized = true;

    // Pasang guard state di history agar tombol kembali peramban selalu memicu popstate di aplikasi
    try {
      if (!window.history.state || window.history.state.app !== 'simak-guard') {
        window.history.replaceState({ app: 'simak-root' }, '', window.location.href);
        window.history.pushState({ app: 'simak-guard' }, '', window.location.href);
      }
    } catch (e) {
      console.warn('History API initial state error:', e);
    }

    const handlePopState = (event: PopStateEvent) => {
      // Re-push guard state segera agar pengguna tidak terlempar keluar dari aplikasi
      try {
        window.history.pushState({ app: 'simak-guard' }, '', window.location.href);
      } catch (e) {
        // Ignore
      }

      // 1. Cek apakah ada SweetAlert2 yang sedang terbuka
      const swalContainer = document.querySelector('.swal2-container');
      if (swalContainer && window.getComputedStyle(swalContainer).display !== 'none') {
        const swalCancelBtn = document.querySelector('.swal2-cancel') as HTMLElement | null;
        const swalCloseBtn = document.querySelector('.swal2-close') as HTMLElement | null;
        if (swalCancelBtn) {
          swalCancelBtn.click();
          return;
        } else if (swalCloseBtn) {
          swalCloseBtn.click();
          return;
        }
      }

      // 2. Cek apakah ada modal, drawer, atau kamera di handler stack
      if (this.handlerStack.length > 0) {
        const topEntry = this.handlerStack.pop();
        if (topEntry) {
          try {
            const handled = topEntry.handler();
            if (handled !== false) {
              return;
            }
          } catch (err) {
            console.error(`Error in back handler ${topEntry.id}:`, err);
          }
        }
      }

      // 3. DI SEMUA KONDISI: Terapkan pencegahan keluar pada smartphone di halaman manapun yang sedang diakses
      if (this.onConfirmExitRequest) {
        this.onConfirmExitRequest();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      this.isInitialized = false;
    };
  }

  /**
   * Daftarkan handler saat modal, drawer, kamera, atau menu dibuka
   * Mengembalikan fungsi unregister untuk dipanggil saat komponen ditutup/unmount
   */
  public registerHandler(id: string, handler: BackHandler): () => void {
    // Hapus id lama jika sudah ada agar urutan tetap di puncak stack (LIFO)
    this.handlerStack = this.handlerStack.filter(entry => entry.id !== id);
    this.handlerStack.push({ id, handler });

    // Pastikan ada guard di history
    try {
      window.history.pushState({ app: 'simak-modal', id }, '', window.location.href);
    } catch (e) {
      // Ignore
    }

    return () => {
      this.unregisterHandler(id);
    };
  }

  /**
   * Lepas handler saat modal/menu ditutup secara normal melalui tombol di layar
   */
  public unregisterHandler(id: string): void {
    this.handlerStack = this.handlerStack.filter(entry => entry.id !== id);
  }

  /**
   * Cek apakah ada handler modal aktif saat ini
   */
  public hasActiveHandlers(): boolean {
    return this.handlerStack.length > 0;
  }
}

export const navigationBackService = NavigationBackService.getInstance();
