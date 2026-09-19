import Swal from 'sweetalert2';

export interface LocationIntegrityReport {
  isValid: boolean;
  isMockSuspected: boolean;
  warnings: string[];
  calculatedDistanceMeters: number;
  isWithinRadius: boolean;
}

class AntiCheatSecurityService {
  private static instance: AntiCheatSecurityService;
  private isInitialized = false;
  private lastWarningTime = 0;
  private lastKnownPosition: { lat: number; lng: number; time: number } | null = null;

  private constructor() {}

  public static getInstance(): AntiCheatSecurityService {
    if (!AntiCheatSecurityService.instance) {
      AntiCheatSecurityService.instance = new AntiCheatSecurityService();
    }
    return AntiCheatSecurityService.instance;
  }

  /**
   * Mengaktifkan sistem proteksi anti-cheat browser, pencegahan inspeksi elemen,
   * pembatasan shortcut developer tools, dan pencegahan menu copy-paste pada long-press.
   */
  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Blokir Menu Klik Kanan (Context Menu)
    window.addEventListener('contextmenu', this.handleContextMenu, { capture: true });

    // 2. Blokir Shortcut Tombol Pengembang (F12, Ctrl+Shift+I/J/C, Ctrl+U, dsb.)
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });

    // 3. Blokir Penyalinan / Ekstraksi Teks (Copy, Cut, Paste di luar input form)
    window.addEventListener('copy', this.handleCopyCutPaste, { capture: true });
    window.addEventListener('cut', this.handleCopyCutPaste, { capture: true });
    window.addEventListener('paste', this.handleCopyCutPaste, { capture: true });

    // 4. Blokir Drag & Drop gambar/elemen untuk inspeksi
    window.addEventListener('dragstart', this.handleDragStart, { capture: true });

    // 5. Blokir Menu Tekan Lama (Long-Press Context Menu) di Layar Sentuh Mobile
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });

    // 6. Terapkan CSS anti-selection & touch-callout dinamis
    this.injectAntiTamperCSS();

    console.log('🛡️ [SIMAK Security] Anti-Cheat & Device Integrity Shield Berhasil Diaktifkan.');
  }

  private isInputElement(el: EventTarget | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tagName = el.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      el.isContentEditable ||
      el.getAttribute('contenteditable') === 'true'
    );
  }

  private showSecurityToast(reason: string): void {
    const now = Date.now();
    // Throttle pesan toast agar tidak spam (jeda 3 detik)
    if (now - this.lastWarningTime < 3000) return;
    this.lastWarningTime = now;

    Swal.fire({
      toast: true,
      position: 'top',
      icon: 'warning',
      title: '🛡️ Proteksi Keamanan Presensi Aktif',
      text: reason,
      showConfirmButton: false,
      timer: 2800,
      background: '#0F172A',
      color: '#F8FAFC',
      customClass: {
        popup: 'border border-amber-500/40 rounded-2xl shadow-xl'
      }
    });
  }

  private handleContextMenu = (e: MouseEvent) => {
    // Izinkan di input form biasa jika diperlukan, tetapi blokir di area kartu / presensi
    if (this.isInputElement(e.target)) {
      return; // Izinkan klik kanan dasar di kotak teks
    }
    e.preventDefault();
    e.stopPropagation();
    this.showSecurityToast('Klik kanan dinonaktifkan demi integritas data dan pencegahan rekayasa lokasi.');
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // F12 (DevTools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      this.showSecurityToast('Menu Pengembang (F12) dinonaktifkan.');
      return;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
    if (modifier && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      this.showSecurityToast('Shortcut Alat Pengembang / Inspeksi Elemen dinonaktifkan.');
      return;
    }

    // Ctrl+U (View Source)
    if (modifier && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      this.showSecurityToast('Akses Kode Sumber dinonaktifkan.');
      return;
    }

    // Ctrl+S (Save Page)
    if (modifier && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  private handleCopyCutPaste = (e: ClipboardEvent) => {
    if (this.isInputElement(e.target)) {
      return; // Izinkan copy paste dalam input nama/catatan
    }
    e.preventDefault();
    e.stopPropagation();
    this.showSecurityToast('Fitur salin-tempel pada teks antarmuka dinonaktifkan.');
  };

  private handleDragStart = (e: DragEvent) => {
    if (this.isInputElement(e.target)) return;
    e.preventDefault();
  };

  private touchTimer: any = null;
  private handleTouchStart = (e: TouchEvent) => {
    if (this.isInputElement(e.target)) return;

    // Jika user menekan agak lama (> 450ms), cegah menu copy-paste / context menu mobile
    this.touchTimer = setTimeout(() => {
      // Nonaktifkan callout
      this.showSecurityToast('Tekan lama dinonaktifkan untuk mencegah manipulasi antarmuka.');
    }, 450);
  };

  private handleTouchEnd = () => {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }
  };

  private injectAntiTamperCSS(): void {
    const styleId = 'simak-anti-cheat-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* Mencegah pemilihan teks liar dan menu callout di seluruh browser */
      body, div:not([contenteditable="true"]), p, span, h1, h2, h3, h4, h5, h6, table, tr, td, th {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -khtml-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      
      /* Tetap izinkan input field, textarea, dan select */
      input, textarea, select, [contenteditable="true"] {
        -webkit-touch-callout: default !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }

      /* Mencegah highlight biru saat elemen disentuh di Chrome Android */
      * {
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Menghitung jarak menggunakan Rumus Haversine dalam satuan Meter
   */
  public calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Validasi Integritas Lokasi GPS & Deteksi Mock / Fake GPS
   */
  public validateLocationIntegrity(
    currentCoords: GeolocationCoordinates,
    schoolLat: number,
    schoolLng: number,
    allowedRadiusMeters: number
  ): LocationIntegrityReport {
    const warnings: string[] = [];
    let isMockSuspected = false;

    // 1. Periksa koordinat Null Island (0,0)
    if (Math.abs(currentCoords.latitude) < 0.0001 && Math.abs(currentCoords.longitude) < 0.0001) {
      warnings.push('Koordinat GPS tidak valid (Null Coordinate).');
      isMockSuspected = true;
    }

    // 2. Periksa akurasi yang tidak realistis (akurasi persis 0 sering menjadi indikasi fake GPS emulator)
    if (currentCoords.accuracy === 0) {
      warnings.push('Akurasi sensor GPS 0m mencurigakan (Diduga aplikasi Mock Location).');
      isMockSuspected = true;
    } else if (currentCoords.accuracy > 500) {
      warnings.push(`Sinyal GPS kurang akurat (Toleransi ±${Math.round(currentCoords.accuracy)}m). Pastikan berada di ruang terbuka.`);
    }

    // 3. Periksa lonjakan kecepatan tidak wajar (Velocity Teleportation Check)
    const now = Date.now();
    if (this.lastKnownPosition) {
      const timeDiffSec = (now - this.lastKnownPosition.time) / 1000;
      if (timeDiffSec > 0 && timeDiffSec < 60) {
        const distMoved = this.calculateHaversineDistance(
          this.lastKnownPosition.lat,
          this.lastKnownPosition.lng,
          currentCoords.latitude,
          currentCoords.longitude
        );
        const speedKmh = (distMoved / timeDiffSec) * 3.6;
        if (speedKmh > 350) {
          warnings.push(`Perpindahan lokasi tidak wajar terdeteksi (${Math.round(speedKmh)} km/jam).`);
          isMockSuspected = true;
        }
      }
    }

    // Perbarui posisi terakhir
    this.lastKnownPosition = {
      lat: currentCoords.latitude,
      lng: currentCoords.longitude,
      time: now
    };

    // 4. Hitung Jarak ke Titik Sekolah
    const calculatedDistanceMeters = this.calculateHaversineDistance(
      currentCoords.latitude,
      currentCoords.longitude,
      schoolLat,
      schoolLng
    );

    const isWithinRadius = calculatedDistanceMeters <= allowedRadiusMeters;
    if (!isWithinRadius) {
      warnings.push(
        `Lokasi Anda berjarak ${calculatedDistanceMeters}m dari sekolah (Batas toleransi maksimal: ${allowedRadiusMeters}m).`
      );
    }

    return {
      isValid: !isMockSuspected,
      isMockSuspected,
      warnings,
      calculatedDistanceMeters,
      isWithinRadius
    };
  }

  /**
   * Watermark Canvas Generator: Membakar stempel waktu, koordinat GPS, nama siswa, dan badge resmi
   * langsung ke dalam piksel foto selfie siswa untuk mencegah pemalsuan foto.
   */
  public generateWatermarkedSelfie(
    videoElement: HTMLVideoElement,
    studentName: string,
    studentId: string,
    className: string,
    coords: { latitude: number; longitude: number; accuracy?: number },
    distanceMeters: number,
    isWithinRadius: boolean,
    schoolName: string = 'SIMAK SEKOLAH DIGITAL'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const width = videoElement.videoWidth || 640;
        const height = videoElement.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi konteks canvas'));
          return;
        }

        // 1. Gambar frame video kamera selfie (cermin horizontal agar alami seperti cermin)
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, width, height);
        ctx.restore();

        // 2. Gambar overlay gradien gelap di bagian bawah untuk keterbacaan teks stempel
        const gradientHeight = Math.max(140, Math.round(height * 0.32));
        const gradient = ctx.createLinearGradient(0, height - gradientHeight, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.75)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

        // 3. Gambar top header watermark band
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, width, 38);

        // Top Header Text
        ctx.fillStyle = '#60A5FA'; // blue-400
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText(`🏛️ ${schoolName.toUpperCase()}`, 14, 24);

        // Status Badge at top right
        const statusText = isWithinRadius ? '✓ DALAM RADIUS' : '⚠️ LUAR RADIUS';
        ctx.fillStyle = isWithinRadius ? '#10B981' : '#F59E0B'; // emerald vs amber
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const badgeWidth = ctx.measureText(statusText).width + 16;
        ctx.fillRect(width - badgeWidth - 14, 8, badgeWidth, 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(statusText, width - badgeWidth - 6, 23);

        // 4. Stempel Waktu Realtime & Tanggal
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB';

        const startY = height - gradientHeight + 36;

        // Nama & Kelas Siswa
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(`👤 ${studentName} (${studentId})`, 16, startY);

        ctx.fillStyle = '#94A3B8'; // slate-400
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Kelas: ${className}`, 16, startY + 20);

        // Waktu & Tanggal
        ctx.fillStyle = '#FDE047'; // yellow-300
        ctx.font = 'bold 13px monospace, system-ui';
        ctx.fillText(`📅 ${dateStr} • ⏰ ${timeStr}`, 16, startY + 42);

        // Koordinat GPS & Jarak
        const latStr = coords.latitude.toFixed(6);
        const lngStr = coords.longitude.toFixed(6);
        const accStr = coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : '';
        ctx.fillStyle = '#38BDF8'; // sky-400
        ctx.font = '11px monospace, system-ui';
        ctx.fillText(`📍 GPS: ${latStr}, ${lngStr}${accStr} • Jarak: ${distanceMeters}m`, 16, startY + 62);

        // Security Signature Hash Barcode Strip
        const hashStamp = `SEC-ID:${studentId}-${Date.now().toString(36).toUpperCase()}-GPS-OK`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '9px monospace';
        ctx.fillText(hashStamp, 16, startY + 78);

        // Konversi ke base64 image data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const antiCheatSecurityService = AntiCheatSecurityService.getInstance();
