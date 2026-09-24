import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Cloud,
  Download,
  Eye,
  Trash2,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  FileSpreadsheet,
  AlertCircle,
  Settings,
  ChevronRight,
  Filter,
  Check,
  X,
  Sparkles,
  Layers,
  ArrowUpDown,
  Calendar,
  CalendarRange
} from 'lucide-react';
import { ScheduledExportService } from '../services/scheduledExportService';
import { DatabaseService } from '../services/databaseService';
import {
  ScheduledExportConfig,
  ScheduledExportReport,
  ScheduledReportType,
  ScheduleFrequency,
  ClassEntity
} from '../types';
import Swal from 'sweetalert2';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028];

export const ScheduledExportManager: React.FC = () => {
  const exportService = ScheduledExportService.getInstance();
  const dbService = DatabaseService.getInstance();

  const [activeTab, setActiveTab] = useState<'archives' | 'schedules' | 'logs'>('archives');
  const [schedules, setSchedules] = useState<ScheduledExportConfig[]>([]);
  const [reports, setReports] = useState<ScheduledExportReport[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // Loading & Processing states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingScheduleId, setExecutingScheduleId] = useState<string | null>(null);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledExportConfig | null>(null);
  const [previewReport, setPreviewReport] = useState<ScheduledExportReport | null>(null);
  const [isQuickTriggerModalOpen, setIsQuickTriggerModalOpen] = useState(false);

  // Date defaults based on current date
  const nowObj = new Date();
  const currentMonthNum = nowObj.getMonth() + 1; // 1-12
  const currentYearNum = nowObj.getFullYear();

  // Form State for Schedule Modal
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReportType, setFormReportType] = useState<ScheduledReportType>('attendance_recap');
  const [formFrequency, setFormFrequency] = useState<ScheduleFrequency>('monthly_end');
  const [formTimeOfDay, setFormTimeOfDay] = useState('23:59');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(5);
  const [formTargetClassId, setFormTargetClassId] = useState('all');
  const [formIncludeSignatures, setFormIncludeSignatures] = useState(true);
  const [formIncludeKopSurat, setFormIncludeKopSurat] = useState(true);
  const [formPaperSize, setFormPaperSize] = useState<'a4' | 'f4' | 'letter' | 'legal'>('a4');
  const [formPaperOrientation, setFormPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [formStartMonth, setFormStartMonth] = useState<number>(currentMonthNum);
  const [formStartYear, setFormStartYear] = useState<number>(currentYearNum);
  const [formEndMonth, setFormEndMonth] = useState<number>(currentMonthNum);
  const [formEndYear, setFormEndYear] = useState<number>(currentYearNum);

  // Quick Trigger State
  const [quickTitle, setQuickTitle] = useState('Rekapitulasi Presensi Lengkap (September 2026)');
  const [quickReportType, setQuickReportType] = useState<ScheduledReportType>('attendance_recap');
  const [quickFrequency, setQuickFrequency] = useState<ScheduleFrequency>('monthly_end');
  const [quickTargetClassId, setQuickTargetClassId] = useState('all');
  const [quickPeriodMode, setQuickPeriodMode] = useState<'month_range' | 'preset'>('month_range');
  const [quickStartMonth, setQuickStartMonth] = useState<number>(currentMonthNum);
  const [quickStartYear, setQuickStartYear] = useState<number>(currentYearNum);
  const [quickEndMonth, setQuickEndMonth] = useState<number>(currentMonthNum);
  const [quickEndYear, setQuickEndYear] = useState<number>(currentYearNum);

  // Immediate Bulk Academic Export State
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(new Date(nowObj.getFullYear(), nowObj.getMonth(), 1).toISOString().split('T')[0]);
  const [bulkEndDate, setBulkEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkTargetClassId, setBulkTargetClassId] = useState('all');
  const [bulkTitle, setBulkTitle] = useState('Laporan Akademik Terpadu (Presensi, Nilai & Jurnal KBM)');
  const [bulkIncludeAttendance, setBulkIncludeAttendance] = useState(true);
  const [bulkIncludeGrades, setBulkIncludeGrades] = useState(true);
  const [bulkIncludeTeachingJournal, setBulkIncludeTeachingJournal] = useState(true);
  const [bulkIncludeClassRoster, setBulkIncludeClassRoster] = useState(true);
  const [bulkIncludeExecutiveSummary, setBulkIncludeExecutiveSummary] = useState(true);
  const [bulkIncludeKopSurat, setBulkIncludeKopSurat] = useState(true);
  const [bulkIncludeSignatures, setBulkIncludeSignatures] = useState(true);
  const [bulkPaperSize, setBulkPaperSize] = useState<'a4' | 'f4' | 'letter' | 'legal'>('a4');
  const [bulkPaperOrientation, setBulkPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  const refreshData = () => {
    setSchedules(exportService.getSchedules());
    setReports(exportService.getReports());
    setClasses(dbService.getAllClasses());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = exportService.subscribe(refreshData);
    const interval = setInterval(refreshData, 8000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSimulateFailure = async (sched: ScheduledExportConfig) => {
    const errorMsg = `[Uji Sistem] Kegagalan otomatis saat perenderan berkas PDF "${sched.title}" & timeout koneksi Firebase Storage (HTTP 504 Gateway Timeout).`;
    await exportService.triggerRealtimeFailureNotification(sched, errorMsg);
  };

  // Helper: Judul otomatis berdasarkan jenis dan rentang bulan
  const getAutoTitleForMonthRange = (
    reportType: ScheduledReportType,
    sMonth: number,
    sYear: number,
    eMonth: number,
    eYear: number
  ) => {
    let typeName = 'Rekapitulasi Presensi Lengkap';
    if (reportType === 'grades_recap') typeName = 'Rekapitulasi Nilai Akademik';
    else if (reportType === 'homeroom_summary') typeName = 'Laporan Presensi & Evaluasi';
    else if (reportType === 'comprehensive_academic') typeName = 'Laporan Akademik Terpadu';

    let rangeStr = '';
    if (sYear === eYear && sMonth === eMonth) {
      rangeStr = `${MONTH_NAMES[sMonth - 1]} ${sYear}`;
    } else if (sYear === eYear) {
      rangeStr = `${MONTH_NAMES[sMonth - 1]} - ${MONTH_NAMES[eMonth - 1]} ${sYear}`;
    } else {
      rangeStr = `${MONTH_NAMES[sMonth - 1]} ${sYear} - ${MONTH_NAMES[eMonth - 1]} ${eYear}`;
    }

    return `${typeName} (${rangeStr})`;
  };

  const applyQuickMonthPreset = (preset: 'this_month' | 'last_month' | 'quarter_3m' | 'semester_ganjil' | 'semester_genap') => {
    const curM = nowObj.getMonth() + 1;
    const curY = nowObj.getFullYear();
    let sM = curM;
    let sY = curY;
    let eM = curM;
    let eY = curY;

    if (preset === 'this_month') {
      sM = curM;
      eM = curM;
      sY = curY;
      eY = curY;
    } else if (preset === 'last_month') {
      if (curM === 1) {
        sM = 12;
        eM = 12;
        sY = curY - 1;
        eY = curY - 1;
      } else {
        sM = curM - 1;
        eM = curM - 1;
        sY = curY;
        eY = curY;
      }
    } else if (preset === 'quarter_3m') {
      if (curM >= 3) {
        sM = curM - 2;
        eM = curM;
        sY = curY;
        eY = curY;
      } else if (curM === 2) {
        sM = 12;
        sY = curY - 1;
        eM = 2;
        eY = curY;
      } else {
        sM = 11;
        sY = curY - 1;
        eM = 1;
        eY = curY;
      }
    } else if (preset === 'semester_ganjil') {
      sM = 7;
      eM = 12;
      sY = curY;
      eY = curY;
    } else if (preset === 'semester_genap') {
      sM = 1;
      eM = 6;
      sY = curY;
      eY = curY;
    }

    setQuickStartMonth(sM);
    setQuickStartYear(sY);
    setQuickEndMonth(eM);
    setQuickEndYear(eY);
    setQuickTitle(getAutoTitleForMonthRange(quickReportType, sM, sY, eM, eY));
  };

  const handleOpenQuickTriggerModal = () => {
    setQuickPeriodMode('month_range');
    const curM = nowObj.getMonth() + 1;
    const curY = nowObj.getFullYear();
    setQuickStartMonth(curM);
    setQuickStartYear(curY);
    setQuickEndMonth(curM);
    setQuickEndYear(curY);
    setQuickTitle(getAutoTitleForMonthRange(quickReportType, curM, curY, curM, curY));
    setIsQuickTriggerModalOpen(true);
  };

  const applyBulkDatePreset = (preset: 'today' | 'last_7d' | 'last_30d' | 'this_month' | 'last_month' | 'semester_1' | 'semester_2' | 'full_year') => {
    const today = new Date();
    const formatYmd = (d: Date) => d.toISOString().split('T')[0];

    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start = new Date(today);
      end = new Date(today);
    } else if (preset === 'last_7d') {
      start.setDate(today.getDate() - 6);
      end = new Date(today);
    } else if (preset === 'last_30d') {
      start.setDate(today.getDate() - 29);
      end = new Date(today);
    } else if (preset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === 'semester_1') {
      start = new Date(today.getFullYear(), 6, 1); // 1 Juli
      end = new Date(today.getFullYear(), 11, 31); // 31 Des
    } else if (preset === 'semester_2') {
      start = new Date(today.getFullYear(), 0, 1); // 1 Jan
      end = new Date(today.getFullYear(), 5, 30); // 30 Jun
    } else if (preset === 'full_year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    }

    const sStr = formatYmd(start);
    const eStr = formatYmd(end);
    setBulkStartDate(sStr);
    setBulkEndDate(eStr);
    setBulkTitle(`Laporan Akademik Terpadu (${sStr} s/d ${eStr})`);
  };

  const handleOpenBulkExportModal = () => {
    applyBulkDatePreset('this_month');
    setIsBulkExportModalOpen(true);
  };

  const handleExecuteBulkExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStartDate || !bulkEndDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Rentang Tanggal Belum Lengkap',
        text: 'Silakan tentukan tanggal mulai dan tanggal akhir untuk ekspor massal data akademik.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
      return;
    }

    if (bulkStartDate > bulkEndDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Rentang Tanggal Terbalik',
        text: 'Tanggal mulai tidak boleh lebih akhir daripada tanggal selesai.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
      return;
    }

    setIsBulkExecuting(true);
    try {
      const report = await exportService.exportImmediateBulkAcademicPDF(
        {
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          targetClassId: bulkTargetClassId,
          title: bulkTitle,
          includeAttendance: bulkIncludeAttendance,
          includeGrades: bulkIncludeGrades,
          includeTeachingJournal: bulkIncludeTeachingJournal,
          includeClassRoster: bulkIncludeClassRoster,
          includeExecutiveSummary: bulkIncludeExecutiveSummary,
          includeKopSurat: bulkIncludeKopSurat,
          includeSignatures: bulkIncludeSignatures,
          paperSize: bulkPaperSize,
          paperOrientation: bulkPaperOrientation
        },
        'user_admin1'
      );

      setIsBulkExportModalOpen(false);
      refreshData();

      // Trigger instant direct download for the user
      const link = document.createElement('a');
      link.href = report.pdfBase64 || report.downloadUrl;
      link.download = report.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Massal PDF Selesai!',
        html: `
          <div class="text-xs text-left space-y-2 mt-2">
            <p><strong>Berkas:</strong> <span class="text-indigo-400 font-mono">${report.fileName}</span></p>
            <p><strong>Ukuran:</strong> ${report.fileSizeFormatted}</p>
            <p><strong>Periode:</strong> ${report.periodLabel}</p>
            <p><strong>Total Data:</strong> ${report.totalRecordsCount} entri akademik dikompilasi</p>
            <div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
              Dokumen PDF otomatis diunduh dan diarsipkan ke riwayat laporan sistem.
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Buka Pratinjau PDF',
        cancelButtonText: 'Tutup',
        background: '#0F172A',
        color: '#F8FAFC'
      }).then((result) => {
        if (result.isConfirmed) {
          setPreviewReport(report);
        }
        setActiveTab('archives');
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat Ekspor Massal',
        text: err?.message || 'Terjadi kesalahan sistem saat memproses berkas PDF massal.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.fileName.toLowerCase().includes(q) ||
      r.periodLabel.toLowerCase().includes(q) ||
      r.frequencyType.toLowerCase().includes(q);

    const matchesType = selectedTypeFilter === 'all' || r.reportType === selectedTypeFilter;
    const matchesFreq =
      selectedFrequencyFilter === 'all' ||
      (selectedFrequencyFilter === 'monthly' && r.frequencyType.toLowerCase().includes('bulan')) ||
      (selectedFrequencyFilter === 'weekly' && r.frequencyType.toLowerCase().includes('minggu')) ||
      (selectedFrequencyFilter === 'semester' && r.frequencyType.toLowerCase().includes('semester')) ||
      (selectedFrequencyFilter === 'custom_month' && r.frequencyType.toLowerCase().includes('rentang'));

    const matchesMonth =
      selectedMonthFilter === 'all' ||
      r.periodLabel.toLowerCase().includes(MONTH_NAMES[parseInt(selectedMonthFilter, 10) - 1].toLowerCase()) ||
      r.fileName.toLowerCase().includes(`m${selectedMonthFilter.padStart(2, '0')}`);

    const matchesYear =
      selectedYearFilter === 'all' ||
      r.periodLabel.includes(selectedYearFilter) ||
      r.fileName.includes(selectedYearFilter);

    return matchesSearch && matchesType && matchesFreq && matchesMonth && matchesYear;
  });

  // Calculate totals
  const totalSizeBytes = reports.reduce((acc, r) => acc + (r.fileSizeBytes || 0), 0);
  const formattedTotalStorage = totalSizeBytes > 1024 * 1024
    ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  const totalDownloads = reports.reduce((acc, r) => acc + (r.downloadCount || 0), 0);

  // Handlers
  const handleOpenNewScheduleModal = () => {
    setEditingSchedule(null);
    setFormTitle('Rekapitulasi Presensi Lengkap Akhir Bulan');
    setFormDescription('Ekspor otomatis rekap kehadiran seluruh rombel setiap akhir bulan ke PDF resmi.');
    setFormReportType('attendance_recap');
    setFormFrequency('monthly_end');
    setFormTimeOfDay('23:59');
    setFormDayOfWeek(5);
    setFormTargetClassId('all');
    setFormIncludeSignatures(true);
    setFormIncludeKopSurat(true);
    setFormPaperSize('a4');
    setFormPaperOrientation('portrait');
    setFormStartMonth(nowObj.getMonth() + 1);
    setFormStartYear(nowObj.getFullYear());
    setFormEndMonth(nowObj.getMonth() + 1);
    setFormEndYear(nowObj.getFullYear());
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditScheduleModal = (sched: ScheduledExportConfig) => {
    setEditingSchedule(sched);
    setFormTitle(sched.title);
    setFormDescription(sched.description || '');
    setFormReportType(sched.reportType);
    setFormFrequency(sched.frequency);
    setFormTimeOfDay(sched.timeOfDay || '23:59');
    setFormDayOfWeek(sched.dayOfWeek ?? 5);
    setFormTargetClassId(sched.targetClassId || 'all');
    setFormIncludeSignatures(sched.includeSignatures);
    setFormIncludeKopSurat(sched.includeKopSurat);
    setFormPaperSize(sched.paperSize || 'a4');
    setFormPaperOrientation(sched.paperOrientation || 'portrait');
    setFormStartMonth(sched.startMonth || nowObj.getMonth() + 1);
    setFormStartYear(sched.startYear || nowObj.getFullYear());
    setFormEndMonth(sched.endMonth || nowObj.getMonth() + 1);
    setFormEndYear(sched.endYear || nowObj.getFullYear());
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Judul Wajib Diisi',
        text: 'Silakan berikan nama atau judul untuk jadwal ekspor otomatis ini.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
      return;
    }

    try {
      await exportService.saveSchedule({
        id: editingSchedule?.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        reportType: formReportType,
        frequency: formFrequency,
        timeOfDay: formTimeOfDay,
        dayOfWeek: formDayOfWeek,
        targetClassId: formTargetClassId,
        includeSignatures: formIncludeSignatures,
        includeKopSurat: formIncludeKopSurat,
        paperSize: formPaperSize,
        paperOrientation: formPaperOrientation,
        storageDestination: 'firebase_storage',
        startMonth: formFrequency === 'custom_month_range' ? formStartMonth : undefined,
        startYear: formFrequency === 'custom_month_range' ? formStartYear : undefined,
        endMonth: formFrequency === 'custom_month_range' ? formEndMonth : undefined,
        endYear: formFrequency === 'custom_month_range' ? formEndYear : undefined,
        isEnabled: editingSchedule ? editingSchedule.isEnabled : true
      });

      setIsScheduleModalOpen(false);
      refreshData();

      Swal.fire({
        icon: 'success',
        title: editingSchedule ? 'Jadwal Diperbarui' : 'Jadwal Otomatis Dibuat',
        text: `Jadwal "${formTitle}" telah tersimpan dan siap dieksekusi oleh sistem secara otomatis.`,
        timer: 2000,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#F8FAFC'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Jadwal',
        text: err?.message || 'Terjadi kesalahan sistem saat menyimpan jadwal.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
    }
  };

  const handleToggleSchedule = async (sched: ScheduledExportConfig) => {
    await exportService.toggleSchedule(sched.id, !sched.isEnabled);
    refreshData();
  };

  const handleDeleteSchedule = async (sched: ScheduledExportConfig) => {
    const result = await Swal.fire({
      title: 'Hapus Jadwal Otomatis?',
      text: `Apakah Anda yakin ingin menghapus jadwal "${sched.title}"? Jadwal tidak akan dieksekusi lagi.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Jadwal',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#E11D48',
      background: '#0F172A',
      color: '#F8FAFC'
    });

    if (result.isConfirmed) {
      await exportService.deleteSchedule(sched.id);
      refreshData();
      Swal.fire({
        icon: 'success',
        title: 'Jadwal Dihapus',
        timer: 1500,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#F8FAFC'
      });
    }
  };

  const handleRunScheduleNow = async (sched: ScheduledExportConfig) => {
    setExecutingScheduleId(sched.id);
    setIsExecuting(true);

    try {
      const report = await exportService.generateAndUploadReport(sched.id, undefined, 'user_admin1');
      refreshData();

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil!',
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Nama Berkas:</strong> <span class="text-blue-400 font-mono">${report.fileName}</span></p>
            <p><strong>Ukuran:</strong> ${report.fileSizeFormatted}</p>
            <p><strong>Penyimpanan:</strong> <span class="text-emerald-400 font-semibold">${report.storageProvider === 'firebase_storage' ? 'Firebase Storage' : 'Cloud Sync Archive'}</span></p>
            <p><strong>Periode:</strong> ${report.periodLabel}</p>
          </div>
        `,
        confirmButtonText: 'Buka Arsip Laporan',
        background: '#0F172A',
        color: '#F8FAFC'
      }).then(() => {
        setActiveTab('archives');
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Ekspor Gagal',
        text: err?.message || 'Gagal membuat dan mengunggah dokumen PDF ke Firebase Storage.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
    } finally {
      setIsExecuting(false);
      setExecutingScheduleId(null);
    }
  };

  const handleQuickTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);

    try {
      const isMonthRange = quickPeriodMode === 'month_range';
      const report = await exportService.generateAndUploadReport(
        undefined,
        {
          title: quickTitle,
          reportType: quickReportType,
          frequency: isMonthRange ? 'custom_month_range' : quickFrequency,
          targetClassId: quickTargetClassId,
          startMonth: isMonthRange ? quickStartMonth : undefined,
          startYear: isMonthRange ? quickStartYear : undefined,
          endMonth: isMonthRange ? quickEndMonth : undefined,
          endYear: isMonthRange ? quickEndYear : undefined,
          includeSignatures: true,
          includeKopSurat: true
        },
        'user_admin1'
      );

      setIsQuickTriggerModalOpen(false);
      refreshData();

      Swal.fire({
        icon: 'success',
        title: 'Laporan PDF Berhasil Dibuat & Diunggah',
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Nama Berkas:</strong> <span class="text-blue-400 font-mono">${report.fileName}</span></p>
            <p><strong>Ukuran:</strong> ${report.fileSizeFormatted}</p>
            <p><strong>Status:</strong> Tersimpan di Firebase Storage</p>
          </div>
        `,
        confirmButtonText: 'Tutup & Lihat Arsip',
        background: '#0F172A',
        color: '#F8FAFC'
      }).then(() => {
        setActiveTab('archives');
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Ekspor Gagal',
        text: err?.message || 'Terjadi gangguan saat memproses laporan PDF.',
        background: '#0F172A',
        color: '#F8FAFC'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadReport = (report: ScheduledExportReport) => {
    exportService.incrementDownloadCount(report.id);
    refreshData();

    // Trigger download
    const link = document.createElement('a');
    link.href = report.pdfBase64 || report.downloadUrl;
    link.download = report.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteReport = async (report: ScheduledExportReport) => {
    const result = await Swal.fire({
      title: 'Hapus Arsip Dokumen?',
      text: `Apakah Anda yakin ingin menghapus "${report.fileName}" dari Firebase Storage dan arsip cloud?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Arsip',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#E11D48',
      background: '#0F172A',
      color: '#F8FAFC'
    });

    if (result.isConfirmed) {
      await exportService.deleteReport(report.id);
      refreshData();
      Swal.fire({
        icon: 'success',
        title: 'Arsip Dihapus',
        timer: 1500,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#F8FAFC'
      });
    }
  };

  const handleCopyLink = (report: ScheduledExportReport) => {
    navigator.clipboard.writeText(report.downloadUrl);
    Swal.fire({
      icon: 'success',
      title: 'Tautan Disalin!',
      text: 'Tautan unduh Firebase Storage berhasil disalin ke papan klip.',
      timer: 1500,
      showConfirmButton: false,
      background: '#0F172A',
      color: '#F8FAFC'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-xl p-6 md:p-8 text-white">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Cloud className="w-3.5 h-3.5 animate-pulse" />
              <span>Firebase Storage & Automated Cron Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <CalendarClock className="w-8 h-8 text-indigo-400" />
              Jadwal Ekspor Otomatis & Arsip Cloud
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Otomasi ekspor rekapitulasi presensi dan nilai ke dokumen PDF resmi berstandar kedinasan secara berkala (akhir bulan/mingguan), tersimpan di Firebase Storage untuk diunduh kapan saja oleh administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenBulkExportModal}
              disabled={isBulkExecuting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-100 animate-pulse" />
              <span>Ekspor Massal PDF (Rentang Tanggal)</span>
            </button>
            <button
              type="button"
              onClick={handleOpenQuickTriggerModal}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Eksekusi PDF Sekarang</span>
            </button>
            <button
              type="button"
              onClick={handleOpenNewScheduleModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Otomatis</span>
            </button>
          </div>
        </div>

        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Arsip Laporan</span>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-white mt-1">{reports.length} Dokumen</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Jadwal Aktif</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {schedules.filter((s) => s.isEnabled).length} / {schedules.length}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Firebase Storage</span>
              <HardDrive className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-blue-300 mt-1">{formattedTotalStorage}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Diunduh</span>
              <Download className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-300 mt-1">{totalDownloads} Kali</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('archives')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'archives'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Arsip Laporan PDF ({reports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'schedules'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Konfigurasi Jadwal ({schedules.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={refreshData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Segarkan</span>
        </button>
      </div>

      {/* TAB 1: ARSIP LAPORAN PDF CLOUD */}
      {activeTab === 'archives' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama dokumen, periode, atau tipe..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto flex-wrap">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              >
                <option value="all">Semua Jenis Laporan</option>
                <option value="attendance_recap">Rekapitulasi Presensi</option>
                <option value="grades_recap">Rekapitulasi Nilai</option>
                <option value="homeroom_summary">Laporan Wali Kelas</option>
                <option value="comprehensive_academic">Laporan Terpadu</option>
              </select>

              <select
                value={selectedFrequencyFilter}
                onChange={(e) => setSelectedFrequencyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              >
                <option value="all">Semua Frekuensi</option>
                <option value="custom_month">Rentang Bulan Spesifik</option>
                <option value="monthly">Akhir Bulan</option>
                <option value="weekly">Mingguan</option>
                <option value="semester">Akhir Semester</option>
              </select>

              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              >
                <option value="all">Semua Bulan</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>
                    Bulan {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              >
                <option value="all">Semua Tahun</option>
                {AVAILABLE_YEARS.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table / List of Reports */}
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Arsip Laporan PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedMonthFilter !== 'all' || selectedYearFilter !== 'all'
                  ? 'Tidak ada dokumen yang cocok dengan filter atau kata kunci pencarian Anda.'
                  : 'Laporan otomatis akan muncul di sini setiap kali jadwal ekspor dijalankan atau saat Anda mengeksekusi ekspor manual.'}
              </p>
              <button
                type="button"
                onClick={handleOpenQuickTriggerModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Buat Laporan Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 shrink-0 font-bold text-xs">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {report.title}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {report.fileName}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      <Cloud className="w-3 h-3" />
                      {report.storageProvider === 'firebase_storage' ? 'Firebase Storage' : 'Cloud Sync'}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Periode Data:</span>
                      <span className="font-semibold">{report.periodLabel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Ukuran Dokumen:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{report.fileSizeFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Dibuat Pada:</span>
                      <span>{new Date(report.generatedAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Eksekutor:</span>
                      <span>{report.generatedBy}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Diunduh: <strong className="text-slate-800 dark:text-slate-200">{report.downloadCount || 0}x</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewReport(report)}
                        title="Pratinjau PDF"
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(report)}
                        title="Salin Tautan Firebase Storage"
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadReport(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report)}
                        title="Hapus dari Cloud"
                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KONFIGURASI JADWAL OTOMATIS */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Atur frekuensi pemicu otomatis dan format laporan untuk setiap dokumen resmi yang akan dihasilkan.
            </p>
            <button
              type="button"
              onClick={handleOpenNewScheduleModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((sched) => {
              const isRunning = executingScheduleId === sched.id;
              const targetClass = classes.find((c) => c.id === sched.targetClassId);

              return (
                <div
                  key={sched.id}
                  className={`p-5 rounded-2xl border transition space-y-4 relative ${
                    sched.isEnabled
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {exportService.getFrequencyLabel(sched.frequency)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                        {sched.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(sched)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        sched.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={sched.isEnabled ? 'Nonaktifkan Jadwal' : 'Aktifkan Jadwal'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          sched.isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {sched.description || 'Tidak ada deskripsi tambahan.'}
                  </p>

                  {/* Error Box if last run failed */}
                  {sched.lastError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300 space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Eksekusi Terakhir Gagal</span>
                        </span>
                        <span className="text-[10px] text-rose-400">
                          {sched.lastErrorAt ? new Date(sched.lastErrorAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-rose-600 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-900/40 p-1.5 rounded-lg break-words">
                        {sched.lastError}
                      </p>
                      <button
                        type="button"
                        onClick={() => exportService.triggerRealtimeFailureNotification(sched, sched.lastError || 'Galat eksekusi otomatis.')}
                        className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white underline cursor-pointer flex items-center gap-1 pt-0.5"
                      >
                        <span>Buka SweetAlert2 & Coba Ulang (Manual Trigger)</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Settings Detail */}
                  <div className="space-y-1.5 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tipe Laporan:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {exportService.getReportTypeLabel(sched.reportType)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jam Eksekusi:</span>
                      <span className="font-semibold">{sched.timeOfDay || '23:59'} WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cakupan Kelas:</span>
                      <span className="font-semibold">{targetClass ? targetClass.nama_kelas : 'Semua Kelas'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kop & Tanda Tangan:</span>
                      <span className="font-semibold">
                        {sched.includeKopSurat ? 'Kop Resmi' : 'Standar'} • {sched.includeSignatures ? 'TTD Digital' : 'Tanpa TTD'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[10px]">
                      <span className="text-slate-400">Jadwal Berikutnya:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {sched.nextRunAt ? new Date(sched.nextRunAt).toLocaleDateString('id-ID') : 'Sesuai Cron'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunScheduleNow(sched)}
                      disabled={isRunning || isExecuting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Jalankan Sekarang</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateFailure(sched)}
                      className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 transition cursor-pointer text-xs"
                      title="Simulasi Notifikasi Gagal & Manual Trigger"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditScheduleModal(sched)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer text-xs"
                      title="Edit Pengaturan"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(sched)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer text-xs"
                      title="Hapus Jadwal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW PDF */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {previewReport.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {previewReport.fileName} • {previewReport.fileSizeFormatted}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReport(previewReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Iframe Viewer */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              {previewReport.pdfBase64 ? (
                <iframe
                  src={previewReport.pdfBase64}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center space-y-3 p-8">
                  <FileText className="w-12 h-12 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Dokumen siap diunduh langsung dari Firebase Storage.
                  </p>
                  <a
                    href={previewReport.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Tautan Dokumen</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT JADWAL OTOMATIS */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingSchedule ? 'Edit Jadwal Ekspor Otomatis' : 'Buat Jadwal Ekspor Otomatis Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Judul Jadwal Laporan: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Rekapitulasi Presensi Akhir Bulan X MIPA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Catatan Jadwal:
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Catatan tujuan laporan atau peruntukan arsip dinas..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Laporan:
                  </label>
                  <select
                    value={formReportType}
                    onChange={(e) => setFormReportType(e.target.value as ScheduledReportType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="attendance_recap">Rekapitulasi Presensi Lengkap</option>
                    <option value="grades_recap">Rekapitulasi Nilai Akademik</option>
                    <option value="homeroom_summary">Laporan Evaluasi Wali Kelas</option>
                    <option value="comprehensive_academic">Laporan Akademik Terpadu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Frekuensi Eksekusi:
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as ScheduleFrequency)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="monthly_end">Setiap Akhir Bulan (Hari Terakhir)</option>
                    <option value="custom_month_range">Rentang Bulan Spesifik (Kustom Periode Bulan)</option>
                    <option value="weekly">Setiap Akhir Pekan (Mingguan)</option>
                    <option value="daily">Setiap Hari (Harian)</option>
                    <option value="semester_end">Setiap Akhir Semester (Juni/Desember)</option>
                  </select>
                </div>
              </div>

              {/* Pemilihan Rentang Bulan Khusus pada Jadwal */}
              {formFrequency === 'custom_month_range' && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <CalendarRange className="w-4 h-4 text-amber-500" />
                    <span>Rentang Bulan Spesifik yang Diekspor:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mulai Bulan:
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={formStartMonth}
                          onChange={(e) => setFormStartMonth(Number(e.target.value))}
                          className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={formStartYear}
                          onChange={(e) => setFormStartYear(Number(e.target.value))}
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sampai Bulan:
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={formEndMonth}
                          onChange={(e) => setFormEndMonth(Number(e.target.value))}
                          className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={formEndYear}
                          onChange={(e) => setFormEndYear(Number(e.target.value))}
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    📌 Dokumen PDF yang digenerate oleh jadwal ini akan otomatis memuat rekapitulasi data dari {MONTH_NAMES[formStartMonth - 1]} {formStartYear} s/d {MONTH_NAMES[formEndMonth - 1]} {formEndYear}.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Eksekusi Otomatis (WIB):
                  </label>
                  <input
                    type="time"
                    value={formTimeOfDay}
                    onChange={(e) => setFormTimeOfDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Rombel / Kelas:
                  </label>
                  <select
                    value={formTargetClassId}
                    onChange={(e) => setFormTargetClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="all">Semua Rombongan Belajar (Semua Kelas)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Pengaturan Dokumen Cetak Kedinasan:
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIncludeKopSurat}
                      onChange={(e) => setFormIncludeKopSurat(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sertakan Kop Surat Resmi</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIncludeSignatures}
                      onChange={(e) => setFormIncludeSignatures(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sertakan Tanda Tangan & TTD Digital</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                <Cloud className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Penyimpanan Cloud Otomatis:</strong> Dokumen PDF yang dihasilkan akan langsung disimpan di folder Firebase Storage <code className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded">automated_reports/YYYY/MM/</code>.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK TRIGGER EKSPOR SEKARANG */}
      {isQuickTriggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-500 fill-current" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Eksekusi Ekspor PDF Sekarang
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih rentang bulan spesifik atau preset untuk membuat dokumen PDF resmi seketika
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickTriggerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickTrigger} className="p-5 space-y-4">
              {/* Mode Switcher Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Metode Pemilihan Periode Data:
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPeriodMode('month_range');
                      setQuickTitle(getAutoTitleForMonthRange(quickReportType, quickStartMonth, quickStartYear, quickEndMonth, quickEndYear));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      quickPeriodMode === 'month_range'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4" />
                    <span>Rentang Bulan Spesifik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPeriodMode('preset')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      quickPeriodMode === 'preset'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Preset Frekuensi Standar</span>
                  </button>
                </div>
              </div>

              {/* RENTANG BULAN SPESIFIK VIEW */}
              {quickPeriodMode === 'month_range' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  {/* Shortcut Chips */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Pilihan Cepat Rentang Bulan:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyQuickMonthPreset('this_month')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        Bulan Ini ({MONTH_NAMES[nowObj.getMonth()]})
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickMonthPreset('last_month')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        Bulan Kemarin
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickMonthPreset('quarter_3m')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        3 Bulan Terakhir
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickMonthPreset('semester_ganjil')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        Sem. Ganjil (Jul - Des)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickMonthPreset('semester_genap')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        Sem. Genap (Jan - Jun)
                      </button>
                    </div>
                  </div>

                  {/* Month Range Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mulai Dari Bulan:
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={quickStartMonth}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuickStartMonth(val);
                            setQuickTitle(getAutoTitleForMonthRange(quickReportType, val, quickStartYear, quickEndMonth, quickEndYear));
                          }}
                          className="col-span-3 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={quickStartYear}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuickStartYear(val);
                            setQuickTitle(getAutoTitleForMonthRange(quickReportType, quickStartMonth, val, quickEndMonth, quickEndYear));
                          }}
                          className="col-span-2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Sampai Dengan Bulan:
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={quickEndMonth}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuickEndMonth(val);
                            setQuickTitle(getAutoTitleForMonthRange(quickReportType, quickStartMonth, quickStartYear, val, quickEndYear));
                          }}
                          className="col-span-3 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={quickEndYear}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuickEndYear(val);
                            setQuickTitle(getAutoTitleForMonthRange(quickReportType, quickStartMonth, quickStartYear, quickEndMonth, val));
                          }}
                          className="col-span-2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Reassurance Callout */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5">
                    <CalendarRange className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        Cakupan Laporan: {MONTH_NAMES[quickStartMonth - 1]} {quickStartYear} {quickStartMonth === quickEndMonth && quickStartYear === quickEndYear ? '(1 Bulan Penuh)' : `s/d ${MONTH_NAMES[quickEndMonth - 1]} ${quickEndYear}`}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Hanya data pada rentang bulan yang dipilih ini yang diproses dan diekspor ke PDF resmi tanpa perlu mengunduh seluruh data tahunan.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* PRESET FREKUENSI VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pilihan Periode Preset:
                    </label>
                    <select
                      value={quickFrequency}
                      onChange={(e) => setQuickFrequency(e.target.value as ScheduleFrequency)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      <option value="monthly_end">Bulan Berjalan Ini (Akhir Bulan)</option>
                      <option value="weekly">Minggu Ini (7 Hari Terakhir)</option>
                      <option value="semester_end">Semester Berjalan Ini (6 Bulan)</option>
                      <option value="daily">Hari Ini</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Jenis Laporan & Target Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Dokumen Laporan:
                  </label>
                  <select
                    value={quickReportType}
                    onChange={(e) => {
                      const newType = e.target.value as ScheduledReportType;
                      setQuickReportType(newType);
                      if (quickPeriodMode === 'month_range') {
                        setQuickTitle(getAutoTitleForMonthRange(newType, quickStartMonth, quickStartYear, quickEndMonth, quickEndYear));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="attendance_recap">Rekapitulasi Presensi Lengkap</option>
                    <option value="grades_recap">Rekapitulasi Nilai Akademik</option>
                    <option value="homeroom_summary">Laporan Presensi & Evaluasi Wali Kelas</option>
                    <option value="comprehensive_academic">Laporan Akademik Terpadu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Rombel / Kelas:
                  </label>
                  <select
                    value={quickTargetClassId}
                    onChange={(e) => setQuickTargetClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="all">Semua Kelas (Seluruh Rombel)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nama Laporan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama / Judul Dokumen Laporan:
                  </label>
                  {quickPeriodMode === 'month_range' && (
                    <button
                      type="button"
                      onClick={() => setQuickTitle(getAutoTitleForMonthRange(quickReportType, quickStartMonth, quickStartYear, quickEndMonth, quickEndYear))}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Sesuaikan Judul Otomatis
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="Masukkan judul laporan PDF..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickTriggerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat PDF & Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Generate & Simpan ke Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BULK EXPORT MASSAL DATA AKADEMIK (RENTANG TANGGAL) */}
      {isBulkExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Ekspor Massal Semua Data Akademik ke PDF
                  </h3>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Kompilasi satu bundel PDF resmi mencakup presensi, nilai, agenda guru, dan data rombel untuk rentang tanggal kustom.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkExportModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkExport} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Preset Rentang Tanggal Cepat */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Pilihan Cepat Rentang Waktu (Preset):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'last_7d', label: '7 Hari Terakhir' },
                    { id: 'last_30d', label: '30 Hari Terakhir' },
                    { id: 'this_month', label: 'Bulan Ini' },
                    { id: 'last_month', label: 'Bulan Lalu' },
                    { id: 'semester_1', label: 'Semester 1 (Ganjil)' },
                    { id: 'semester_2', label: 'Semester 2 (Genap)' },
                    { id: 'full_year', label: '1 Tahun Penuh' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyBulkDatePreset(p.id as any)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai (Start Date):
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => {
                      setBulkStartDate(e.target.value);
                      setBulkTitle(`Laporan Akademik Terpadu (${e.target.value} s/d ${bulkEndDate})`);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai (End Date):
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => {
                      setBulkEndDate(e.target.value);
                      setBulkTitle(`Laporan Akademik Terpadu (${bulkStartDate} s/d ${e.target.value})`);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              {/* Target Rombel / Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cakupan Rombongan Belajar (Kelas):
                </label>
                <select
                  value={bulkTargetClassId}
                  onChange={(e) => setBulkTargetClassId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">Semua Kelas & Rombongan Belajar (Seluruh Sekolah)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kelas} ({c.tahun_ajaran || '2025/2026'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Modul Akademik yang Dimasukkan ke Bundel PDF */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  Komponen & Modul yang Dimasukkan ke PDF:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeAttendance}
                      onChange={(e) => setBulkIncludeAttendance(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Rekap Presensi & Kehadiran Siswa</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeGrades}
                      onChange={(e) => setBulkIncludeGrades(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Ledger Nilai & Capaian Belajar</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeTeachingJournal}
                      onChange={(e) => setBulkIncludeTeachingJournal(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Jurnal Mengajar & Agenda KBM Guru</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeClassRoster}
                      onChange={(e) => setBulkIncludeClassRoster(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Struktur Rombel & Wali Kelas</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeExecutiveSummary}
                      onChange={(e) => setBulkIncludeExecutiveSummary(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Ringkasan Eksekutif & Statistik</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkIncludeKopSurat}
                      onChange={(e) => setBulkIncludeKopSurat(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Kop Surat Resmi Kedinasan</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={bulkIncludeSignatures}
                      onChange={(e) => setBulkIncludeSignatures(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Lembar Pengesahan & Tanda Tangan Resmi</span>
                  </label>
                </div>
              </div>

              {/* Format Kertas & Orientasi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ukuran Kertas:
                  </label>
                  <select
                    value={bulkPaperSize}
                    onChange={(e) => setBulkPaperSize(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="f4">F4 / Folio (215 x 330 mm)</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Orientasi Halaman:
                  </label>
                  <select
                    value={bulkPaperOrientation}
                    onChange={(e) => setBulkPaperOrientation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="portrait">Tegak (Portrait)</option>
                    <option value="landscape">Mendatar (Landscape)</option>
                  </select>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Judul Dokumen PDF:
                </label>
                <input
                  type="text"
                  value={bulkTitle}
                  onChange={(e) => setBulkTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBulkExecuting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isBulkExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses Ekspor Massal PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Proses & Unduh PDF Massal Seketika</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
