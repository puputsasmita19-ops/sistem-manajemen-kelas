import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { storage, firestore } from './firebaseClient';
import { DatabaseService } from './databaseService';
import { PrintAndExportService } from './printAndExportService';
import Swal from 'sweetalert2';
import {
  ScheduledExportConfig,
  ScheduledExportReport,
  ScheduledReportType,
  ScheduleFrequency,
  AppSettings,
  ClassEntity,
  User,
  Attendance,
  Grade,
  Subject,
  ClassMember,
  DatabaseSnapshot
} from '../types';

export class ScheduledExportService {
  private static instance: ScheduledExportService;
  private dbService = DatabaseService.getInstance();
  private printService = PrintAndExportService.getInstance();
  private heartbeatInterval: any = null;
  private isProcessing = false;
  private subscribers: Array<() => void> = [];

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): ScheduledExportService {
    if (!ScheduledExportService.instance) {
      ScheduledExportService.instance = new ScheduledExportService();
    }
    return ScheduledExportService.instance;
  }

  /**
   * Subscribe to schedule and report change events
   */
  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {}
    });
  }

  /**
   * Memulai pemeriksaan berkala untuk jadwal otomatis (Heartbeat)
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;
    // Periksa setiap 60 detik
    this.heartbeatInterval = setInterval(() => {
      this.checkAndRunDueSchedules().catch((err) => {
        console.warn('Scheduled export check error:', err);
      });
    }, 60000);

    // Jalankan pemeriksaan awal setelah inisialisasi
    setTimeout(() => {
      this.checkAndRunDueSchedules().catch(() => {});
    }, 3000);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Mengambil semua konfigurasi jadwal ekspor
   */
  public getSchedules(): ScheduledExportConfig[] {
    const raw = (this.dbService.getRawSnapshot().scheduled_export_configs || {}) as Record<string, ScheduledExportConfig>;
    return Object.values(raw).sort((a: ScheduledExportConfig, b: ScheduledExportConfig) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  /**
   * Mengambil semua arsip laporan hasil ekspor otomatis
   */
  public getReports(): ScheduledExportReport[] {
    const raw = (this.dbService.getRawSnapshot().scheduled_reports || {}) as Record<string, ScheduledExportReport>;
    return Object.values(raw).sort((a: ScheduledExportReport, b: ScheduledExportReport) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
  }

  /**
   * Menyimpan / memperbarui konfigurasi jadwal ekspor
   */
  public async saveSchedule(
    config: Omit<ScheduledExportConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    currentUserId: string = 'user_admin1'
  ): Promise<ScheduledExportConfig> {
    const isNew = !config.id;
    const nowIso = new Date().toISOString();
    const id = config.id || `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const nextRun = this.calculateNextRun(
      config.frequency,
      config.timeOfDay || '23:59',
      config.dayOfMonth,
      config.dayOfWeek
    );

    const snapshot = this.dbService.getRawSnapshot();
    const fullConfig: ScheduledExportConfig = {
      ...config,
      id,
      createdAt: isNew ? nowIso : (snapshot.scheduled_export_configs?.[id]?.createdAt || nowIso),
      updatedAt: nowIso,
      nextRunAt: nextRun.toISOString()
    };

    if (!snapshot.scheduled_export_configs) {
      snapshot.scheduled_export_configs = {};
    }
    snapshot.scheduled_export_configs[id] = fullConfig;
    this.dbService.saveToStorage();

    // Simpan ke Firestore jika terhubung
    try {
      await setDoc(doc(firestore, 'scheduled_export_configs', id), fullConfig, { merge: true });
    } catch (err) {
      console.warn('Firestore sync scheduled config warning:', err);
    }

    this.dbService.logActivity(
      'scheduled_export_config_update',
      isNew ? 'Membuat Jadwal Ekspor Otomatis' : 'Memperbarui Jadwal Ekspor Otomatis',
      `Jadwal "${fullConfig.title}" (${fullConfig.frequency}) berhasil ${isNew ? 'dibuat' : 'diperbarui'}.`,
      'scheduled_export_configs',
      { configId: id }
    );

    this.notifySubscribers();
    return fullConfig;
  }

  /**
   * Menghapus konfigurasi jadwal
   */
  public async deleteSchedule(scheduleId: string): Promise<boolean> {
    const snapshot = this.dbService.getRawSnapshot();
    if (snapshot.scheduled_export_configs && snapshot.scheduled_export_configs[scheduleId]) {
      const title = snapshot.scheduled_export_configs[scheduleId].title;
      delete snapshot.scheduled_export_configs[scheduleId];
      this.dbService.saveToStorage();

      try {
        await deleteDoc(doc(firestore, 'scheduled_export_configs', scheduleId));
      } catch (err) {
        console.warn('Firestore delete scheduled config warning:', err);
      }

      this.dbService.logActivity(
        'scheduled_export_delete',
        'Menghapus Jadwal Ekspor',
        `Jadwal ekspor otomatis "${title}" berhasil dihapus.`,
        'scheduled_export_configs',
        { scheduleId }
      );
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  /**
   * Mengaktifkan atau menonaktifkan jadwal
   */
  public async toggleSchedule(scheduleId: string, isEnabled: boolean): Promise<void> {
    const snapshot = this.dbService.getRawSnapshot();
    if (snapshot.scheduled_export_configs && snapshot.scheduled_export_configs[scheduleId]) {
      snapshot.scheduled_export_configs[scheduleId].isEnabled = isEnabled;
      snapshot.scheduled_export_configs[scheduleId].updatedAt = new Date().toISOString();
      this.dbService.saveToStorage();

      try {
        await setDoc(
          doc(firestore, 'scheduled_export_configs', scheduleId),
          { isEnabled, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch {}

      this.dbService.logActivity(
        'scheduled_export_config_update',
        isEnabled ? 'Mengaktifkan Jadwal Ekspor' : 'Menonaktifkan Jadwal Ekspor',
        `Status jadwal "${snapshot.scheduled_export_configs[scheduleId].title}" diubah menjadi ${isEnabled ? 'Aktif' : 'Nonaktif'}.`,
        'scheduled_export_configs',
        { scheduleId, isEnabled }
      );
      this.notifySubscribers();
    }
  }

  /**
   * Menghapus arsip dokumen laporan dari Firebase Storage & Database
   */
  public async deleteReport(reportId: string): Promise<boolean> {
    const snapshot = this.dbService.getRawSnapshot();
    if (snapshot.scheduled_reports && snapshot.scheduled_reports[reportId]) {
      const report = snapshot.scheduled_reports[reportId];

      // Hapus dari Firebase Storage jika ada storagePath
      if (report.storagePath) {
        try {
          const fileRef = ref(storage, report.storagePath);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn('Could not delete file from Firebase Storage:', storageErr);
        }
      }

      delete snapshot.scheduled_reports[reportId];
      this.dbService.saveToStorage();

      try {
        await deleteDoc(doc(firestore, 'scheduled_reports', reportId));
      } catch {}

      this.dbService.logActivity(
        'scheduled_export_delete',
        'Menghapus Arsip Laporan PDF',
        `Arsip laporan "${report.title}" (${report.fileName}) telah dihapus dari Firebase Storage dan database.`,
        'scheduled_reports',
        { reportId, fileName: report.fileName }
      );
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  /**
   * Mencatat penambahan counter unduhan dokumen
   */
  public incrementDownloadCount(reportId: string): void {
    const snapshot = this.dbService.getRawSnapshot();
    if (snapshot.scheduled_reports && snapshot.scheduled_reports[reportId]) {
      snapshot.scheduled_reports[reportId].downloadCount = (snapshot.scheduled_reports[reportId].downloadCount || 0) + 1;
      this.dbService.saveToStorage();
    }
  }

  /**
   * Memeriksa dan mengeksekusi jadwal yang telah jatuh tempo
   */
  public async checkAndRunDueSchedules(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const schedules = this.getSchedules().filter((s) => s.isEnabled);
      const now = new Date();

      for (const sched of schedules) {
        if (this.isScheduleDue(sched, now)) {
          console.log(`[ScheduledExport] Executing scheduled report: "${sched.title}" (${sched.frequency})`);
          try {
            await this.generateAndUploadReport(sched.id, undefined, 'system_cron');
          } catch (execErr: any) {
            console.error(`[ScheduledExport] Failed executing "${sched.title}":`, execErr);
            const errorMsg = execErr?.message || 'Gagal mengeksekusi pembuatan laporan PDF terjadwal di backend.';

            // Catat galat ke konfigurasi jadwal
            const snapshot = this.dbService.getRawSnapshot();
            if (snapshot.scheduled_export_configs?.[sched.id]) {
              snapshot.scheduled_export_configs[sched.id].lastError = errorMsg;
              snapshot.scheduled_export_configs[sched.id].lastErrorAt = new Date().toISOString();
              this.dbService.saveToStorage();
              try {
                await setDoc(doc(firestore, 'scheduled_export_configs', sched.id), snapshot.scheduled_export_configs[sched.id], { merge: true });
              } catch (e) {}
            }

            this.dbService.logActivity(
              'export_pdf',
              'Ekspor PDF Terjadwal Gagal',
              `Gagal menjalankan jadwal otomatis "${sched.title}": ${errorMsg}`,
              'scheduled_reports',
              { scheduleId: sched.id, error: errorMsg }
            );

            this.notifySubscribers();

            // Tampilkan notifikasi real-time via SweetAlert2 dengan opsi Manual Trigger
            this.triggerRealtimeFailureNotification(sched, errorMsg);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Memicu Notifikasi Real-time via SweetAlert2 ketika jadwal ekspor PDF gagal dijalankan
   */
  public async triggerRealtimeFailureNotification(
    sched: ScheduledExportConfig,
    errorMessage: string
  ): Promise<void> {
    const frequencyLabel = this.getFrequencyLabel(sched.frequency);
    const reportTypeLabel = this.getReportTypeLabel(sched.reportType);

    const result = await Swal.fire({
      icon: 'error',
      title: '<div class="text-base font-black text-rose-500">⚠️ Ekspor PDF Otomatis Gagal Dijalankan</div>',
      html: `
        <div class="text-left text-xs space-y-2.5 mt-2">
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 space-y-1">
            <p class="font-bold text-rose-900 dark:text-rose-200 text-xs">Detail Jadwal Ekspor:</p>
            <p><strong class="text-slate-700 dark:text-slate-300">Nama Jadwal:</strong> <span class="font-semibold text-slate-900 dark:text-white">${sched.title}</span></p>
            <p><strong class="text-slate-700 dark:text-slate-300">Frekuensi:</strong> <span class="font-semibold text-amber-600 dark:text-amber-400">${frequencyLabel} (Pukul ${sched.timeOfDay || '23:59'})</span></p>
            <p><strong class="text-slate-700 dark:text-slate-300">Jenis Dokumen:</strong> <span class="font-semibold text-slate-800 dark:text-slate-200">${reportTypeLabel}</span></p>
          </div>

          <div class="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <p class="text-[11px] font-bold text-slate-900 dark:text-slate-200">Keterangan Galat Sistem:</p>
            <p class="font-mono text-[11px] text-rose-600 dark:text-rose-400 break-words mt-0.5">${errorMessage || 'Koneksi penyimpanan atau perenderan dokumen PDF mengalami kendala teknis.'}</p>
          </div>

          <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Sistem otomatis mendeteksi kegagalan pada jadwal berkala ini. Anda dapat langsung menjalankan pembuatan laporan secara manual sekarang (<strong>Manual Trigger</strong>).
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '🔁 Coba Ulang Sekarang (Manual Trigger)',
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      showCloseButton: true,
      allowOutsideClick: false,
      background: '#0F172A',
      color: '#F8FAFC',
      customClass: {
        popup: 'rounded-2xl border border-rose-500/30 shadow-2xl',
        confirmButton: 'text-xs py-2.5 px-4 rounded-xl font-bold shadow-md cursor-pointer',
        cancelButton: 'text-xs py-2.5 px-4 rounded-xl font-medium cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      // Tampilkan indikator proses SweetAlert2
      Swal.fire({
        title: 'Memproses Pembuatan Ulang PDF...',
        html: `
          <div class="text-xs text-slate-300 space-y-2 mt-2">
            <p>Sedang mengeksekusi manual laporan <strong>"${sched.title}"</strong> dan menyinkronkan ke Firebase Storage...</p>
            <div class="flex justify-center my-3">
              <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#F8FAFC'
      });

      try {
        const report = await this.generateAndUploadReport(sched.id, undefined, 'user_admin1');
        this.notifySubscribers();

        // Notifikasi Berhasil
        Swal.fire({
          icon: 'success',
          title: 'Manual Trigger Berhasil!',
          html: `
            <div class="text-xs text-left space-y-1.5 mt-2 text-slate-200">
              <p>Laporan PDF bulanan berhasil dieksekusi ulang dan diarsipkan.</p>
              <p><strong>Nama Berkas:</strong> <span class="text-blue-400 font-mono">${report.fileName}</span></p>
              <p><strong>Ukuran:</strong> ${report.fileSizeFormatted}</p>
              <p><strong>Penyimpanan:</strong> <span class="text-emerald-400 font-semibold">${report.storageProvider === 'firebase_storage' ? 'Firebase Storage' : 'Cloud Sync Archive'}</span></p>
              <p><strong>Periode:</strong> ${report.periodLabel}</p>
            </div>
          `,
          confirmButtonText: 'Unduh Berkas PDF',
          showCancelButton: true,
          cancelButtonText: 'Tutup',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#64748b',
          background: '#0F172A',
          color: '#F8FAFC'
        }).then((dlRes) => {
          if (dlRes.isConfirmed) {
            const link = document.createElement('a');
            link.href = report.downloadUrl || report.pdfBase64 || '';
            link.download = report.fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        });
      } catch (retryErr: any) {
        Swal.fire({
          icon: 'error',
          title: 'Percobaan Ulang Gagal',
          html: `
            <div class="text-xs text-left space-y-1.5 mt-2 text-slate-200">
              <p>Eksekusi manual masih mengalami kendala:</p>
              <p class="font-mono text-rose-400">${retryErr?.message || 'Galat sistem tak terduga.'}</p>
            </div>
          `,
          confirmButtonText: 'Tutup',
          background: '#0F172A',
          color: '#F8FAFC'
        });
      }
    }
  }

  /**
   * Menentukan apakah jadwal sudah jatuh tempo
   */
  private isScheduleDue(sched: ScheduledExportConfig, now: Date): boolean {
    if (!sched.isEnabled) return false;

    // Jika belum pernah dijalankan dan nextRunAt sudah lewat atau belum dihitung
    if (!sched.nextRunAt) return true;

    const nextRun = new Date(sched.nextRunAt);
    if (now >= nextRun) {
      return true;
    }

    // Pengecekan spesifik akhir bulan
    if (sched.frequency === 'monthly_end') {
      const isLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
      const [targetH, targetM] = (sched.timeOfDay || '23:59').split(':').map((v) => parseInt(v, 10));
      const isPastTime = now.getHours() > targetH || (now.getHours() === targetH && now.getMinutes() >= targetM);

      if (isLastDay && isPastTime) {
        if (!sched.lastRunAt) return true;
        const lastRun = new Date(sched.lastRunAt);
        // Pastikan belum jalan hari ini
        return lastRun.toDateString() !== now.toDateString();
      }
    }

    return false;
  }

  /**
   * Menghitung tanggal dan waktu eksekusi berikutnya
   */
  public calculateNextRun(
    frequency: ScheduleFrequency,
    timeOfDay: string = '23:59',
    dayOfMonth?: number,
    dayOfWeek?: number
  ): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map((v) => parseInt(v, 10));

    if (frequency === 'daily') {
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    if (frequency === 'weekly') {
      // Hari tertentu (default: 5 = Jumat)
      const targetDay = dayOfWeek !== undefined ? dayOfWeek : 5;
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      const currentDay = now.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0 && next <= now) {
        daysUntil = 7;
      }
      next.setDate(next.getDate() + daysUntil);
      return next;
    }

    if (frequency === 'monthly_end') {
      // Hari terakhir dari bulan berjalan
      const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDayOfCurrentMonth.setHours(hours, minutes, 0, 0);

      if (lastDayOfCurrentMonth <= now) {
        // Pindah ke akhir bulan berikutnya
        const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        lastDayOfNextMonth.setHours(hours, minutes, 0, 0);
        return lastDayOfNextMonth;
      }
      return lastDayOfCurrentMonth;
    }

    if (frequency === 'semester_end') {
      // Akhir semester 1 (Juni 30) atau semester 2 (Desember 31)
      const year = now.getFullYear();
      const sem1End = new Date(year, 5, 30, hours, minutes, 0, 0); // 30 Juni
      const sem2End = new Date(year, 11, 31, hours, minutes, 0, 0); // 31 Des

      if (now < sem1End) return sem1End;
      if (now < sem2End) return sem2End;
      return new Date(year + 1, 5, 30, hours, minutes, 0, 0);
    }

    if (frequency === 'custom_month_range') {
      // Eksekusi pada hari terakhir bulan berjalan
      const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDayOfCurrentMonth.setHours(hours, minutes, 0, 0);
      if (lastDayOfCurrentMonth <= now) {
        const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        lastDayOfNextMonth.setHours(hours, minutes, 0, 0);
        return lastDayOfNextMonth;
      }
      return lastDayOfCurrentMonth;
    }

    // Custom day of month
    const targetDayNumber = dayOfMonth || 1;
    const next = new Date(now.getFullYear(), now.getMonth(), targetDayNumber, hours, minutes, 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  /**
   * Menghasilkan Laporan PDF dan Mengunggah ke Firebase Storage
   */
  public async generateAndUploadReport(
    scheduleId?: string,
    manualConfig?: Partial<ScheduledExportConfig>,
    executorId: string = 'user_admin1'
  ): Promise<ScheduledExportReport> {
    const snapshot = this.dbService.getRawSnapshot();
    const appSettings = this.dbService.getAppSettings();
    const isSystem = executorId === 'system_cron';

    // 1. Tentukan konfigurasi laporan
    let config: ScheduledExportConfig;
    const existingSched = scheduleId && snapshot.scheduled_export_configs ? snapshot.scheduled_export_configs[scheduleId] : undefined;

    if (existingSched) {
      config = existingSched;
    } else if (manualConfig) {
      config = {
        id: `adhoc_${Date.now()}`,
        title: manualConfig.title || 'Rekapitulasi Presensi Lengkap',
        description: manualConfig.description || 'Ekspor manual terarsip ke Firebase Storage',
        reportType: manualConfig.reportType || 'attendance_recap',
        frequency: manualConfig.frequency || 'monthly_end',
        timeOfDay: manualConfig.timeOfDay || '23:59',
        targetClassId: manualConfig.targetClassId || 'all',
        includeSignatures: manualConfig.includeSignatures !== false,
        includeKopSurat: manualConfig.includeKopSurat !== false,
        paperSize: manualConfig.paperSize || 'a4',
        paperOrientation: manualConfig.paperOrientation || 'portrait',
        storageDestination: 'firebase_storage',
        startMonth: manualConfig.startMonth,
        startYear: manualConfig.startYear,
        endMonth: manualConfig.endMonth,
        endYear: manualConfig.endYear,
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      throw new Error('Konfigurasi ekspor tidak valid.');
    }

    const now = new Date();
    const dateRange = this.calculateDateRange(config.frequency, now, {
      startMonth: config.startMonth,
      startYear: config.startYear,
      endMonth: config.endMonth,
      endYear: config.endYear
    });

    // 2. Bangun dokumen PDF
    const { doc: pdfDoc, totalRecords, safeTitle } = this.buildPDFDocument(
      config,
      appSettings,
      dateRange.periodLabel,
      dateRange.startDate,
      dateRange.endDate
    );

    // Dapatkan data Base64 dan Uint8Array Blob
    const pdfBase64 = pdfDoc.output('datauristring');
    const pdfBlob = pdfDoc.output('blob');
    const fileSizeBytes = pdfBlob.size;
    const fileSizeFormatted = this.formatFileSize(fileSizeBytes);

    // 3. Nama file dan path Firebase Storage
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const safeNameClean = safeTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `Laporan_${safeNameClean}_${dateRange.dateCode}_${timestampStr.substring(0, 10)}.pdf`;
    const storagePath = `automated_reports/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${safeFileName}`;

    let downloadUrl = pdfBase64;
    let storageProvider: 'firebase_storage' | 'cloud_synced' = 'cloud_synced';

    // 4. Upload ke Firebase Storage
    try {
      const storageReference = ref(storage, storagePath);
      const snapshotUpload = await uploadBytes(storageReference, pdfBlob, {
        contentType: 'application/pdf',
        customMetadata: {
          title: config.title,
          reportType: config.reportType,
          frequency: config.frequency,
          period: dateRange.periodLabel,
          generatedBy: isSystem ? 'Sistem Otomatis (Cron)' : executorId,
          totalRecords: String(totalRecords)
        }
      });
      downloadUrl = await getDownloadURL(snapshotUpload.ref);
      storageProvider = 'firebase_storage';
    } catch (uploadError) {
      console.warn('Firebase Storage upload notice (using persistent local data URI):', uploadError);
      // Fallback ke base64 data URI jika Firebase Storage offline/restricted
      downloadUrl = pdfBase64;
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReport: ScheduledExportReport = {
      id: reportId,
      scheduleId: config.id,
      title: config.title,
      fileName: safeFileName,
      reportType: config.reportType,
      frequencyType: this.getFrequencyLabel(config.frequency),
      periodLabel: dateRange.periodLabel,
      generatedAt: now.toISOString(),
      fileSizeBytes,
      fileSizeFormatted,
      storagePath,
      downloadUrl,
      pdfBase64,
      status: 'completed',
      generatedBy: isSystem ? 'Sistem Otomatis (Cron)' : (executorId === 'user_admin1' ? 'Administrator' : executorId),
      totalRecordsCount: totalRecords,
      downloadCount: 0,
      storageProvider
    };

    // 5. Simpan ke database lokal
    if (!snapshot.scheduled_reports) {
      snapshot.scheduled_reports = {};
    }
    snapshot.scheduled_reports[reportId] = newReport;

    // Perbarui status jadwal jika ada
    if (existingSched && snapshot.scheduled_export_configs?.[existingSched.id]) {
      const nextRun = this.calculateNextRun(
        existingSched.frequency,
        existingSched.timeOfDay,
        existingSched.dayOfMonth,
        existingSched.dayOfWeek
      );
      snapshot.scheduled_export_configs[existingSched.id].lastRunAt = now.toISOString();
      snapshot.scheduled_export_configs[existingSched.id].nextRunAt = nextRun.toISOString();
      delete snapshot.scheduled_export_configs[existingSched.id].lastError;
      delete snapshot.scheduled_export_configs[existingSched.id].lastErrorAt;
    }

    this.dbService.saveToStorage();

    // 6. Simpan dokumen metadata laporan ke Firestore
    try {
      const firestorePayload: any = { ...newReport };
      delete firestorePayload.pdfBase64;
      await setDoc(doc(firestore, 'scheduled_reports', reportId), firestorePayload);

      if (existingSched && snapshot.scheduled_export_configs?.[existingSched.id]) {
        await setDoc(
          doc(firestore, 'scheduled_export_configs', existingSched.id),
          snapshot.scheduled_export_configs[existingSched.id],
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn('Firestore sync scheduled report error:', fsErr);
    }

    // 7. Catat ke Activity Log
    this.dbService.logActivity(
      'export_pdf',
      'Ekspor PDF Terjadwal Berhasil',
      `Laporan "${newReport.title}" (${newReport.fileName}) berhasil diekspor dan disimpan ke ${storageProvider === 'firebase_storage' ? 'Firebase Storage' : 'Cloud Storage'}.`,
      'scheduled_reports',
      { reportId, fileName: safeFileName, size: fileSizeFormatted }
    );

    this.notifySubscribers();
    return newReport;
  }

  /**
   * Bangun dokumen jsPDF Lengkap sesuai Tipe Laporan
   */
  private buildPDFDocument(
    config: ScheduledExportConfig,
    appSettings: AppSettings,
    periodLabel: string,
    startDate: string,
    endDate: string
  ): { doc: jsPDF; totalRecords: number; safeTitle: string } {
    const doc = this.printService.initPDF(appSettings, config.paperOrientation);
    const paper = this.printService.getPaperFormat(appSettings, config.paperOrientation);
    const pageWidth = paper.width;

    const snapshot = this.dbService.getRawSnapshot();
    const allClasses = Object.values(snapshot.classes || {}) as ClassEntity[];
    const allUsers = Object.values(snapshot.users || {}) as User[];
    const allStudents = allUsers.filter((u) => u.role === 'siswa');
    const allAttendance = Object.values(snapshot.attendance || {}) as Attendance[];
    const allGrades = Object.values(snapshot.grades || {}) as Grade[];
    const allMembers = Object.values(snapshot.class_members || {}) as ClassMember[];

    let safeTitle = config.title;
    let documentSubTitle = `Periode Evaluasi: ${periodLabel} • Tercatat Otomatis oleh Sistem SIMAK`;

    if (config.targetClassId !== 'all') {
      const targetClass = allClasses.find((c) => c.id === config.targetClassId);
      if (targetClass) {
        documentSubTitle += ` • Kelas: ${targetClass.nama_kelas}`;
      }
    }

    // 1. Render Kop Surat
    let startY = paper.marginTop;
    if (config.includeKopSurat) {
      startY = this.printService.renderKopSurat(
        doc,
        appSettings,
        config.title.toUpperCase(),
        documentSubTitle,
        config.paperOrientation
      );
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(config.title.toUpperCase(), pageWidth / 2, startY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(documentSubTitle, pageWidth / 2, startY + 11, { align: 'center' });
      startY += 18;
    }

    let totalRecords = 0;

    // 2. Render Konten Sesuai Tipe
    if (config.reportType === 'attendance_recap' || config.reportType === 'homeroom_summary') {
      // Filter presensi dalam rentang tanggal
      const filteredAtt = allAttendance.filter((a) => {
        if (a.date < startDate || a.date > endDate) return false;
        if (config.targetClassId !== 'all' && a.class_id !== config.targetClassId) return false;
        return true;
      });

      totalRecords = filteredAtt.length;

      // Filter siswa target
      const targetStudents = allStudents.filter((s) => {
        if (config.targetClassId === 'all') return true;
        const membership = allMembers.find(
          (cm) => cm.student_id === s.id && cm.class_id === config.targetClassId
        );
        return !!membership;
      });

      // Hitung ringkasan statistik
      const totalHadir = filteredAtt.filter((a) => a.status === 'H').length;
      const totalIzin = filteredAtt.filter((a) => a.status === 'I').length;
      const totalSakit = filteredAtt.filter((a) => a.status === 'S').length;
      const totalAlpa = filteredAtt.filter((a) => a.status === 'A').length;
      const totalTotal = filteredAtt.length;
      const attendancePercent = totalTotal > 0 ? ((totalHadir / totalTotal) * 100).toFixed(1) : '100.0';

      // Kotak Ringkasan Eksekutif
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(paper.marginLeft, startY, pageWidth - paper.marginLeft - paper.marginRight, 15, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      const colW = (pageWidth - paper.marginLeft - paper.marginRight) / 4;
      doc.text(`Total Siswa: ${targetStudents.length} Siswa`, paper.marginLeft + 4, startY + 6);
      doc.text(`Tingkat Kehadiran: ${attendancePercent}%`, paper.marginLeft + 4, startY + 11);

      doc.text(`Hadir (H): ${totalHadir} log`, paper.marginLeft + colW + 4, startY + 6);
      doc.text(`Izin (I): ${totalIzin} log`, paper.marginLeft + colW + 4, startY + 11);

      doc.text(`Sakit (S): ${totalSakit} log`, paper.marginLeft + colW * 2 + 4, startY + 6);
      doc.text(`Alpa (A): ${totalAlpa} log`, paper.marginLeft + colW * 2 + 4, startY + 11);

      doc.text(`Total Log: ${totalTotal} Entri`, paper.marginLeft + colW * 3 + 4, startY + 6);
      doc.text(`Status: Terverifikasi`, paper.marginLeft + colW * 3 + 4, startY + 11);

      startY += 19;

      // Buat Tabel Rekapitulasi per Siswa
      const tableRows = targetStudents.map((std, idx) => {
        const studentAtt = filteredAtt.filter((a) => a.student_id === std.id);
        const h = studentAtt.filter((a) => a.status === 'H').length;
        const i = studentAtt.filter((a) => a.status === 'I').length;
        const s = studentAtt.filter((a) => a.status === 'S').length;
        const a = studentAtt.filter((a) => a.status === 'A').length;
        const tot = studentAtt.length;
        const pct = tot > 0 ? `${((h / tot) * 100).toFixed(0)}%` : '-';

        // Cari nama kelas
        const mem = allMembers.find((cm) => cm.student_id === std.id);
        const cls = mem ? allClasses.find((c) => c.id === mem.class_id) : null;

        return [
          String(idx + 1),
          std.nis || std.username || '-',
          std.nama,
          cls ? cls.nama_kelas : '-',
          String(h),
          String(i),
          String(s),
          String(a),
          pct,
          pct === '-' || parseInt(pct, 10) >= 85 ? 'Sangat Baik' : parseInt(pct, 10) >= 75 ? 'Cukup' : 'Perlu Bimbingan'
        ];
      });

      autoTable(doc, {
        startY,
        head: [['No', 'NIS/ID', 'Nama Lengkap Siswa', 'Kelas', 'H', 'I', 'S', 'A', '% Hadir', 'Keterangan']],
        body: tableRows,
        margin: { left: paper.marginLeft, right: paper.marginRight },
        styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 10, halign: 'center' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 28 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 50;
    } else if (config.reportType === 'grades_recap') {
      // Rekapitulasi Nilai
      const targetStudents = allStudents.filter((s) => {
        if (config.targetClassId === 'all') return true;
        const membership = allMembers.find(
          (cm) => cm.student_id === s.id && cm.class_id === config.targetClassId
        );
        return !!membership;
      });

      totalRecords = allGrades.length;

      const tableRows = targetStudents.map((std, idx) => {
        const studentGrades = allGrades.filter((g) => g.student_id === std.id);
        const tugasGrades = studentGrades.filter((g) => g.type === 'Tugas').map((g) => g.score);
        const utsGrades = studentGrades.filter((g) => g.type === 'UTS').map((g) => g.score);
        const uasGrades = studentGrades.filter((g) => g.type === 'UAS').map((g) => g.score);

        const avgTugas = tugasGrades.length > 0 ? (tugasGrades.reduce((a, b) => a + b, 0) / tugasGrades.length).toFixed(1) : '-';
        const avgUTS = utsGrades.length > 0 ? (utsGrades.reduce((a, b) => a + b, 0) / utsGrades.length).toFixed(1) : '-';
        const avgUAS = uasGrades.length > 0 ? (uasGrades.reduce((a, b) => a + b, 0) / uasGrades.length).toFixed(1) : '-';

        const allScores = [...tugasGrades, ...utsGrades, ...uasGrades];
        const finalAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : '-';

        const mem = allMembers.find((cm) => cm.student_id === std.id);
        const cls = mem ? allClasses.find((c) => c.id === mem.class_id) : null;

        const predikat = finalAvg === '-' ? '-' : parseFloat(finalAvg) >= 88 ? 'A (Amat Baik)' : parseFloat(finalAvg) >= 78 ? 'B (Baik)' : 'C (Cukup)';

        return [
          String(idx + 1),
          std.nis || std.username || '-',
          std.nama,
          cls ? cls.nama_kelas : '-',
          avgTugas,
          avgUTS,
          avgUAS,
          finalAvg,
          predikat
        ];
      });

      autoTable(doc, {
        startY,
        head: [['No', 'NIS/ID', 'Nama Lengkap Siswa', 'Kelas', 'Rata Tugas', 'UTS', 'UAS', 'Nilai Akhir', 'Predikat']],
        body: tableRows,
        margin: { left: paper.marginLeft, right: paper.marginRight },
        styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          8: { cellWidth: 26, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 50;
    } else {
      // Comprehensive Academic Recap
      const tableRows = allClasses.map((cls, idx) => {
        const members = allMembers.filter((cm) => cm.class_id === cls.id);
        const teacher = allUsers.find((u) => u.id === cls.wali_kelas_id);
        return [
          String(idx + 1),
          cls.nama_kelas,
          cls.tahun_ajaran || '2025/2026',
          teacher ? teacher.nama : 'Belum Ditentukan',
          `${members.length} Siswa`,
          'Aktif Terjadwal'
        ];
      });

      totalRecords = allClasses.length;

      autoTable(doc, {
        startY,
        head: [['No', 'Rombongan Belajar / Kelas', 'Tahun Ajaran', 'Wali Kelas', 'Jumlah Siswa', 'Status']],
        body: tableRows,
        margin: { left: paper.marginLeft, right: paper.marginRight },
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 28, halign: 'center' },
          5: { cellWidth: 32, halign: 'center' }
        }
      });

      startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 50;
    }

    // 3. Render Tanda Tangan & Pengesahan
    if (config.includeSignatures) {
      this.printService.renderTandaTangan(
        doc,
        appSettings,
        startY,
        undefined,
        undefined,
        config.paperOrientation
      );
    }

    return { doc, totalRecords, safeTitle };
  }

  /**
   * Hitung rentang tanggal berdasarkan frekuensi atau rentang bulan spesifik
   */
  public calculateDateRange(
    freq: ScheduleFrequency,
    refDate: Date = new Date(),
    monthRange?: {
      startMonth?: number;
      startYear?: number;
      endMonth?: number;
      endYear?: number;
    }
  ): { periodLabel: string; startDate: string; endDate: string; dateCode: string } {
    const year = refDate.getFullYear();
    const month = refDate.getMonth(); // 0-indexed

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Jika frekuensi custom_month_range atau disediakan monthRange
    if (freq === 'custom_month_range' || (monthRange && monthRange.startMonth && monthRange.endMonth)) {
      let sYear = monthRange?.startYear || year;
      let sMonth = monthRange?.startMonth || (month + 1);
      let eYear = monthRange?.endYear || sYear;
      let eMonth = monthRange?.endMonth || sMonth;

      // Validasi urutan agar start <= end
      if (sYear > eYear || (sYear === eYear && sMonth > eMonth)) {
        const tempY = sYear; sYear = eYear; eYear = tempY;
        const tempM = sMonth; sMonth = eMonth; eMonth = tempM;
      }

      const firstDay = new Date(sYear, sMonth - 1, 1);
      const lastDay = new Date(eYear, eMonth, 0); // hari terakhir di bulan eMonth
      const startStr = this.formatDateIso(firstDay);
      const endStr = this.formatDateIso(lastDay);

      let label = '';
      let code = '';

      if (sYear === eYear && sMonth === eMonth) {
        label = `Bulan ${monthNames[sMonth - 1]} ${sYear}`;
        code = `${sYear}_M${String(sMonth).padStart(2, '0')}`;
      } else if (sYear === eYear) {
        label = `${monthNames[sMonth - 1]} - ${monthNames[eMonth - 1]} ${sYear}`;
        code = `${sYear}_M${String(sMonth).padStart(2, '0')}_sd_M${String(eMonth).padStart(2, '0')}`;
      } else {
        label = `${monthNames[sMonth - 1]} ${sYear} - ${monthNames[eMonth - 1]} ${eYear}`;
        code = `${sYear}_M${String(sMonth).padStart(2, '0')}_sd_${eYear}_M${String(eMonth).padStart(2, '0')}`;
      }

      return { periodLabel: label, startDate: startStr, endDate: endStr, dateCode: code };
    }

    if (freq === 'monthly_end') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startStr = this.formatDateIso(firstDay);
      const endStr = this.formatDateIso(lastDay);
      const label = `${firstDay.getDate()} ${monthNames[month]} ${year} - ${lastDay.getDate()} ${monthNames[month]} ${year}`;
      const code = `${year}_${String(month + 1).padStart(2, '0')}_AkhirBulan`;
      return { periodLabel: label, startDate: startStr, endDate: endStr, dateCode: code };
    }

    if (freq === 'weekly') {
      // 7 hari terakhir
      const endDay = new Date(refDate);
      const startDay = new Date(refDate);
      startDay.setDate(startDay.getDate() - 6);
      const startStr = this.formatDateIso(startDay);
      const endStr = this.formatDateIso(endDay);
      const label = `${startDay.getDate()} ${monthNames[startDay.getMonth()]} - ${endDay.getDate()} ${monthNames[endDay.getMonth()]} ${year}`;
      const code = `${year}_W${this.getWeekNumber(refDate)}_${this.formatDateIso(endDay)}`;
      return { periodLabel: label, startDate: startStr, endDate: endStr, dateCode: code };
    }

    if (freq === 'daily') {
      const dayStr = this.formatDateIso(refDate);
      const label = `${refDate.getDate()} ${monthNames[month]} ${year}`;
      const code = `${dayStr}_Harian`;
      return { periodLabel: label, startDate: dayStr, endDate: dayStr, dateCode: code };
    }

    // Default Semester (6 bulan)
    const isFirstSemester = month <= 5;
    const startDay = isFirstSemester ? new Date(year, 0, 1) : new Date(year, 6, 1);
    const endDay = isFirstSemester ? new Date(year, 5, 30) : new Date(year, 11, 31);
    const label = `Semester ${isFirstSemester ? 'Genap' : 'Ganjil'} (${monthNames[startDay.getMonth()]} - ${monthNames[endDay.getMonth()]} ${year})`;
    const code = `${year}_Sem${isFirstSemester ? '2' : '1'}`;
    return { periodLabel: label, startDate: this.formatDateIso(startDay), endDate: this.formatDateIso(endDay), dateCode: code };
  }

  private formatDateIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  public getFrequencyLabel(freq: ScheduleFrequency): string {
    switch (freq) {
      case 'monthly_end':
        return 'Setiap Akhir Bulan';
      case 'weekly':
        return 'Mingguan';
      case 'daily':
        return 'Harian';
      case 'semester_end':
        return 'Akhir Semester';
      case 'custom_day':
        return 'Kustom';
      case 'custom_month_range':
        return 'Rentang Bulan Spesifik';
      default:
        return freq;
    }
  }

  public getReportTypeLabel(type: ScheduledReportType): string {
    switch (type) {
      case 'attendance_recap':
        return 'Rekapitulasi Presensi Lengkap';
      case 'grades_recap':
        return 'Rekapitulasi Nilai Akademik';
      case 'homeroom_summary':
        return 'Laporan Presensi & Wali Kelas';
      case 'comprehensive_academic':
        return 'Laporan Akademik Terpadu';
      default:
        return type;
    }
  }
}
