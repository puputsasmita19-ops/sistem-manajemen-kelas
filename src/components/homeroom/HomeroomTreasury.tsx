import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  DollarSign,
  Plus,
  Trash2,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Receipt,
  FileCheck,
  Edit,
  Save,
  Download,
  Settings,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  CreditCard,
  UserCheck,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ClassTreasuryTransaction,
  SchoolFeeAdministrationDoc,
  StudentSchoolFeeRecord,
  PaymentStatusColor,
  SppMonthlyFee
} from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomTreasuryProps {
  classId: string;
  className: string;
  transactions: ClassTreasuryTransaction[];
  studentList?: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

const SPP_MONTH_KEYS: Array<{ key: keyof SppMonthlyFee; label: string }> = [
  { key: 'juli', label: 'JULI' },
  { key: 'agustus', label: 'AGUSTUS' },
  { key: 'september', label: 'SEPTEMBER' },
  { key: 'oktober', label: 'OKTOBER' },
  { key: 'november', label: 'NOVEMBER' },
  { key: 'desember', label: 'DESEMBER' },
  { key: 'januari', label: 'JANUARI' },
  { key: 'februari', label: 'FEBRUARI' },
  { key: 'maret', label: 'MARET' },
  { key: 'april', label: 'APRIL' },
  { key: 'mei', label: 'MEI' },
  { key: 'juni', label: 'JUNI' }
];

export const HomeroomTreasury: React.FC<HomeroomTreasuryProps> = ({
  classId,
  className,
  transactions,
  studentList = [],
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [docData, setDocData] = useState<SchoolFeeAdministrationDoc>(() =>
    service.getSchoolFeeAdministration(classId)
  );

  const [activeTab, setActiveTab] = useState<'sheet' | 'cashbook'>('sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'wajib' | 'cicil' | 'subsidi' | 'lunas'>('all');

  // Modal State for Student Fee Record
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StudentSchoolFeeRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Modal State for Settings & Headers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    month: docData.month || 'Agustus 2026',
    academicYear: docData.academicYear || '2026 - 2027',
    tagihanPreviousHeader: docData.tagihanPreviousHeader || 'TAGIHAN KELAS X',
    asramaHeaderPeriod: docData.asramaHeaderPeriod || 'ASRAMA 2026 - 2027',
    sppHeaderPeriod: docData.sppHeaderPeriod || 'SPP (JULI 2026 - JUNI 2027)',
    dataPerDate: docData.dataPerDate || 'Data per Tanggal 15 Agustus 2026',
    signDate: docData.signDate || 'Jember, 31 Agustus 2026',
    homeroomTeacherName: docData.homeroomTeacherName || 'Puput Sasmita, S.Pd., Gr.',
    homeroomTeacherCallName: docData.homeroomTeacherCallName || 'BAPAK PUPUT',
    schoolTreasurerName: docData.schoolTreasurerName || 'Agustin Rahmawati, A.Md.',
    receivingTreasurerName: docData.receivingTreasurerName || 'Agustin Rahmawati',
    bankName: docData.bankName || 'BANK SYARIAH INDONESIA (BSI)',
    bankAccountNumber: docData.bankAccountNumber || '4444-400-167',
    bankAccountHolder: docData.bankAccountHolder || 'SMK DR SOEBANDI JEMBER'
  });

  // Cashbook state for transaction addition
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashCategory, setCashCategory] = useState<ClassTreasuryTransaction['category']>('Iuran Kas Rutin');
  const [cashType, setCashType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [cashAmount, setCashAmount] = useState<number>(20000);
  const [cashDesc, setCashDesc] = useState('');
  const [cashReceipt, setCashReceipt] = useState(`KW-${Date.now().toString().slice(-5)}`);
  const [cashRecorder, setCashRecorder] = useState('Bendahara Kelas');

  // Sync data with service updates
  const reloadData = () => {
    const updated = service.getSchoolFeeAdministration(classId);
    setDocData(updated);
    onRefresh();
  };

  // Calculate Student Grand Total
  const calculateStudentTotal = (r: StudentSchoolFeeRecord): number => {
    const prev = Number(r.tagihanKelasX) || 0;
    const asrama = Number(r.asrama) || 0;
    const pts = Number(r.ptsPas) || 0;
    const buku = Number(r.buku) || 0;
    const prak = Number(r.praktikum) || 0;
    const kesis = Number(r.kesiswaan) || 0;
    const sppTotal = SPP_MONTH_KEYS.reduce((acc, m) => acc + (Number(r.spp?.[m.key]) || 0), 0);
    return prev + asrama + pts + buku + prak + kesis + sppTotal;
  };

  // Aggregate Totals for Column Footer
  const totals = useMemo(() => {
    let tagihanX = 0;
    let asrama = 0;
    let ptsPas = 0;
    let buku = 0;
    let praktikum = 0;
    let kesiswaan = 0;
    const sppTotals: Record<string, number> = {
      juli: 0, agustus: 0, september: 0, oktober: 0, november: 0, desember: 0,
      januari: 0, februari: 0, maret: 0, april: 0, mei: 0, juni: 0
    };
    let grandTotal = 0;

    docData.records.forEach(r => {
      tagihanX += Number(r.tagihanKelasX) || 0;
      asrama += Number(r.asrama) || 0;
      ptsPas += Number(r.ptsPas) || 0;
      buku += Number(r.buku) || 0;
      praktikum += Number(r.praktikum) || 0;
      kesiswaan += Number(r.kesiswaan) || 0;

      SPP_MONTH_KEYS.forEach(m => {
        sppTotals[m.key] += Number(r.spp?.[m.key]) || 0;
      });

      grandTotal += calculateStudentTotal(r);
    });

    return {
      tagihanX,
      asrama,
      ptsPas,
      buku,
      praktikum,
      kesiswaan,
      sppTotals,
      grandTotal
    };
  }, [docData]);

  // Financial Stats
  const stats = useMemo(() => {
    const totalStudents = docData.records.length;
    let lunasCount = 0;
    let wajibCount = 0;
    let cicilCount = 0;
    let subsidiCount = 0;

    docData.records.forEach(r => {
      const studentTotal = calculateStudentTotal(r);
      const hasWajib = Object.values(r.cellStatus || {}).some(s => s === 'wajib') || r.rowHighlight === 'wajib';
      const hasCicil = Object.values(r.cellStatus || {}).some(s => s === 'cicil') || r.rowHighlight === 'cicil';
      const hasSubsidi = Object.values(r.cellStatus || {}).some(s => s === 'subsidi') || r.rowHighlight === 'subsidi';

      if (studentTotal === 0 || r.rowHighlight === 'lunas_full') {
        lunasCount++;
      } else if (hasWajib) {
        wajibCount++;
      } else if (hasCicil) {
        cicilCount++;
      } else if (hasSubsidi) {
        subsidiCount++;
      }
    });

    return {
      totalStudents,
      lunasCount,
      wajibCount,
      cicilCount,
      subsidiCount
    };
  }, [docData]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return docData.records.filter(r => {
      const matchSearch =
        !searchQuery ||
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'lunas') {
        return calculateStudentTotal(r) === 0 || r.rowHighlight === 'lunas_full';
      }
      if (statusFilter === 'wajib') {
        return Object.values(r.cellStatus || {}).some(s => s === 'wajib') || r.rowHighlight === 'wajib';
      }
      if (statusFilter === 'cicil') {
        return Object.values(r.cellStatus || {}).some(s => s === 'cicil') || r.rowHighlight === 'cicil';
      }
      if (statusFilter === 'subsidi') {
        return Object.values(r.cellStatus || {}).some(s => s === 'subsidi') || r.rowHighlight === 'subsidi';
      }
      return true;
    });
  }, [docData.records, searchQuery, statusFilter]);

  // Handle Edit Student
  const handleOpenEdit = (record: StudentSchoolFeeRecord) => {
    setEditingRecord(JSON.parse(JSON.stringify(record)));
    setIsNewRecord(false);
    setShowEditModal(true);
  };

  const handleOpenNew = () => {
    const emptySpp: SppMonthlyFee = {
      juli: 200000,
      agustus: 200000,
      september: 200000,
      oktober: 200000,
      november: 200000,
      desember: 200000,
      januari: 200000,
      februari: 200000,
      maret: 200000,
      april: 200000,
      mei: 200000,
      juni: 200000
    };
    setEditingRecord({
      id: `fee_${Date.now()}`,
      studentId: `std_${Date.now().toString().slice(-4)}`,
      studentName: '',
      tagihanKelasX: 0,
      asrama: 0,
      ptsPas: 400000,
      buku: 700000,
      praktikum: 2000000,
      kesiswaan: 500000,
      spp: emptySpp,
      cellStatus: {},
      rowHighlight: 'none',
      notes: ''
    });
    setIsNewRecord(true);
    setShowEditModal(true);
  };

  const handleSaveStudentFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.studentName.trim()) {
      Swal.fire('Perhatian', 'Nama siswa wajib diisi.', 'warning');
      return;
    }

    if (isNewRecord) {
      service.addStudentFeeRecord(classId, editingRecord);
    } else {
      service.updateStudentFeeRecord(classId, editingRecord);
    }

    setShowEditModal(false);
    reloadData();
  };

  const handleDeleteStudentFee = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Rincian Pembayaran?',
      text: `Data administrasi pembayaran untuk ${name} akan dihapus dari lembar ini.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteStudentFeeRecord(classId, id);
        reloadData();
      }
    });
  };

  // Sync Class Students
  const handleSyncStudents = () => {
    if (studentList.length === 0) {
      Swal.fire('Info', 'Tidak ada daftar siswa yang terhubung di kelas ini.', 'info');
      return;
    }

    Swal.fire({
      title: 'Sinkronkan Siswa Kelas?',
      text: `Akan menambahkan ${studentList.length} siswa rombel ${className} yang belum ada di lembar administrasi.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Sinkronkan',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        const existingNames = new Set(docData.records.map(r => r.studentName.toLowerCase().trim()));
        let addedCount = 0;

        const defaultSpp: SppMonthlyFee = {
          juli: 200000,
          agustus: 200000,
          september: 200000,
          oktober: 200000,
          november: 200000,
          desember: 200000,
          januari: 200000,
          februari: 200000,
          maret: 200000,
          april: 200000,
          mei: 200000,
          juni: 200000
        };

        studentList.forEach(std => {
          if (!existingNames.has(std.nama.toLowerCase().trim())) {
            service.addStudentFeeRecord(classId, {
              studentId: std.id,
              studentName: std.nama.toUpperCase(),
              tagihanKelasX: 0,
              asrama: 0,
              ptsPas: 400000,
              buku: 700000,
              praktikum: 2000000,
              kesiswaan: 500000,
              spp: { ...defaultSpp },
              cellStatus: {
                buku: 'cicil',
                kesiswaan: 'cicil',
                spp_juli: 'wajib'
              },
              rowHighlight: 'none',
              notes: 'Sinkronisasi otomatis dari data rombel kelas.'
            });
            addedCount++;
          }
        });

        reloadData();
        Swal.fire('Berhasil', `${addedCount} siswa baru berhasil ditambahkan ke lembar administrasi.`, 'success');
      }
    });
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDoc: SchoolFeeAdministrationDoc = {
      ...docData,
      ...settingsForm
    };
    service.saveSchoolFeeAdministration(classId, updatedDoc);
    setShowSettingsModal(false);
    reloadData();
  };

  // Export CSV / Excel Format
  const handleExportCSV = () => {
    const headers = [
      'NO',
      'NAMA SISWA',
      docData.tagihanPreviousHeader || 'TAGIHAN KELAS X',
      docData.asramaHeaderPeriod || 'ASRAMA 2026 - 2027',
      'PTS - PAS',
      'BUKU',
      'PRAKTIKUM 1 TAHUN',
      'KESISWAAN',
      'SPP JULI',
      'SPP AGUSTUS',
      'SPP SEPTEMBER',
      'SPP OKTOBER',
      'SPP NOVEMBER',
      'SPP DESEMBER',
      'SPP JANUARI',
      'SPP FEBRUARI',
      'SPP MARET',
      'SPP APRIL',
      'SPP MEI',
      'SPP JUNI',
      'TOTAL ADMINISTRASI',
      'STATUS CATATAN'
    ];

    const rows = docData.records.map((r, idx) => {
      const studentTotal = calculateStudentTotal(r);
      return [
        idx + 1,
        `"${r.studentName}"`,
        r.tagihanKelasX || 0,
        r.asrama || 0,
        r.ptsPas || 0,
        r.buku || 0,
        r.praktikum || 0,
        r.kesiswaan || 0,
        r.spp?.juli || 0,
        r.spp?.agustus || 0,
        r.spp?.september || 0,
        r.spp?.oktober || 0,
        r.spp?.november || 0,
        r.spp?.desember || 0,
        r.spp?.januari || 0,
        r.spp?.februari || 0,
        r.spp?.maret || 0,
        r.spp?.april || 0,
        r.spp?.mei || 0,
        r.spp?.juni || 0,
        studentTotal,
        `"${r.notes || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rincian_Administrasi_Sekolah_${className.replace(/\s+/g, '_')}_${(docData.month || 'Agustus').replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Cell Status Styling
  const getCellClassName = (status?: PaymentStatusColor, baseTextRight: boolean = true) => {
    const align = baseTextRight ? 'text-right' : 'text-center';
    if (status === 'wajib') {
      return `bg-orange-500 text-white font-black px-1.5 py-1 text-[11px] ${align} shadow-2xs`;
    }
    if (status === 'cicil') {
      return `bg-amber-300 dark:bg-amber-400 text-slate-900 font-bold px-1.5 py-1 text-[11px] ${align}`;
    }
    if (status === 'subsidi') {
      return `bg-sky-300 dark:bg-sky-400 text-slate-900 font-bold px-1.5 py-1 text-[11px] ${align}`;
    }
    return `text-slate-800 dark:text-slate-200 px-1.5 py-1 text-[11px] ${align}`;
  };

  // Cashbook transactions
  const totalIncome = transactions.filter(t => t.type === 'Pemasukan').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Pengeluaran').reduce((acc, t) => acc + t.amount, 0);
  const cashBalance = totalIncome - totalExpense;

  const handleAddCashTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashDesc || !cashAmount) return;
    service.addTreasuryTransaction(classId, {
      date: cashDate,
      category: cashCategory,
      type: cashType,
      amount: Number(cashAmount),
      description: cashDesc,
      receiptNumber: cashReceipt || undefined,
      recordedBy: cashRecorder || 'Bendahara Kelas'
    });
    setShowAddCashModal(false);
    setCashDesc('');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-black">
              MENU 12
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Rincian Administrasi Sekolah ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Format resmi pembayaran administrasi siswa: SPP bulanan, Asrama, PTS-PAS, Buku Paket, Praktikum, Kesiswaan & Rekapitulasi Pembayaran.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Lembar Administrasi Resmi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cashbook')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cashbook'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Buku Kas Kelas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportSchoolFeeAdministrationPDF(className, docData)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Cetak Lembar Resmi PDF Sesuai Format SMK dr. Soebandi"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">Cetak PDF Resmi</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Unduh File Spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition cursor-pointer"
            title="Pengaturan Kop, Bank & Pengesahan"
          >
            <Settings className="w-4 h-4" />
          </button>

          {activeTab === 'sheet' ? (
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Siswa / Tagihan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCashModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi Kas</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Total Seluruh Administrasi
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Rp {totals.grandTotal.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">Akumulasi tagihan {docData.records.length} siswa</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Praktikum & Kesiswaan
            </span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
            Rp {(totals.praktikum + totals.kesiswaan).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">
            Prak: Rp {totals.praktikum.toLocaleString('id-ID')} • Kesis: Rp {totals.kesiswaan.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Status Wajib & Cicil
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 text-lg sm:text-xl font-black">
            <span className="text-orange-600">{stats.wajibCount} Wajib</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-amber-500">{stats.cicilCount} Dicicil</span>
          </div>
          <p className="text-[10px] text-slate-500">Perlu monitoring intensif wali kelas</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Rekening Bank BSI
            </span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 truncate">
            {docData.bankAccountNumber || '4444-400-167'}
          </div>
          <p className="text-[10px] text-slate-500 truncate">{docData.bankAccountHolder || 'SMK DR SOEBANDI JEMBER'}</p>
        </div>
      </div>

      {/* VIEW MODE 1: LEMBAR ADMINISTRASI RESMI (SESUAI GAMBAR) */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filter, Sync */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa atau catatan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Filter Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-bold outline-none cursor-pointer"
                >
                  <option value="all">Semua Siswa ({docData.records.length})</option>
                  <option value="wajib">Wajib Dilunasi ({stats.wajibCount})</option>
                  <option value="cicil">Mohon Dicicil ({stats.cicilCount})</option>
                  <option value="subsidi">Subsidi Bantuan ({stats.subsidiCount})</option>
                  <option value="lunas">Lunas / Beasiswa ({stats.lunasCount})</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSyncStudents}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Sinkronkan nama siswa dari daftar rombel kelas"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron Rombel</span>
              </button>
            </div>
          </div>

          {/* Official Sheet Container (Paper/Spreadsheet Layout) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-sm p-4 sm:p-6 overflow-hidden">
            {/* Kop Surat Resmi */}
            <div className="border-b-2 border-slate-900 dark:border-slate-300 pb-3 mb-4 text-center space-y-0.5">
              <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                YAYASAN PENDIDIKAN JEMBER INTERNATIONAL SCHOOL
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide">
                SMK dr. SOEBANDI
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                TERAKREDITASI (A)
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-300">
                (BAN-PDM) NOMOR : 604/BAN-PDM/SK/2025
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400">
                NSS: 342052429294 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NPSN: 60724703
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400">
                Jl. dr. Soebandi No. 99A, Telp. (0331) 5104296, Jember
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400">
                E-mail : smkdr.soebandi@gmail.com, Website : www.smkdrsoebandijember.sch.id
              </div>
            </div>

            {/* Document Title & Class Header */}
            <div className="text-center my-3">
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white underline underline-offset-4 tracking-wider">
                RINCIAN ADMINISTRASI SEKOLAH
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 px-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-16">Bulan</span>
                  <span>: {docData.month || 'Agustus 2026'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">Kelas</span>
                  <span>: {docData.className || className || 'XI APL'}</span>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 sm:mt-0">
                {docData.dataPerDate || 'Data per Tanggal 15 Agustus 2026'}
              </div>
            </div>

            {/* SPREADSHEET TABLE (Horizontal Scrollable for Dense 21-Columns) */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
              <table className="w-full text-left border-collapse select-text min-w-[1100px]">
                <thead>
                  {/* Row Header 1 */}
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-b border-slate-300 dark:border-slate-600">
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center w-10">
                      NO.
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-left min-w-[180px]">
                      NAMA SISWA
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[90px]">
                      {docData.tagihanPreviousHeader || 'TAGIHAN KELAS X'}
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[95px]">
                      {docData.asramaHeaderPeriod || 'ASRAMA 2026 - 2027'}
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[75px]">
                      PTS - PAS
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[75px]">
                      BUKU
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[100px]">
                      PRAKTIKUM 1 TAHUN
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[85px]">
                      KESISWAAN
                    </th>
                    <th colSpan={12} className="border-r border-slate-300 dark:border-slate-600 p-1.5 text-center bg-slate-200/80 dark:bg-slate-700">
                      {docData.sppHeaderPeriod || 'SPP (JULI 2026 - JUNI 2027)'}
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 dark:border-slate-600 p-2 text-center min-w-[100px] bg-slate-200/60 dark:bg-slate-700">
                      TOTAL
                    </th>
                    <th rowSpan={2} className="p-2 text-center w-16 no-print">
                      AKSI
                    </th>
                  </tr>

                  {/* Row Header 2 (SPP 12 Months Sub-Columns) */}
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[9px] sm:text-[10px] font-bold border-b border-slate-300 dark:border-slate-600">
                    {SPP_MONTH_KEYS.map(m => (
                      <th
                        key={m.key}
                        className="border-r border-slate-300 dark:border-slate-600 p-1 text-center min-w-[62px]"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={22} className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada data rincian pembayaran siswa yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => {
                      const studentTotal = calculateStudentTotal(record);
                      const isFullLunasRow = record.rowHighlight === 'lunas_full' || studentTotal === 0;

                      return (
                        <tr
                          key={record.id}
                          className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            isFullLunasRow ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                          }`}
                        >
                          {/* No */}
                          <td className="border-r border-slate-200 dark:border-slate-700 p-1.5 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            {index + 1}
                          </td>

                          {/* Student Name */}
                          <td className="border-r border-slate-200 dark:border-slate-700 p-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            <div className="flex items-center justify-between gap-1">
                              <span>{record.studentName}</span>
                              {record.rowHighlight === 'lunas_full' && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 shrink-0">
                                  BEASISWA / LUNAS
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tagihan Kelas X */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.tagihanKelasX)}`}>
                            {record.tagihanKelasX > 0 ? record.tagihanKelasX.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* Asrama */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.asrama)}`}>
                            {record.asrama > 0 ? record.asrama.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* PTS - PAS */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.ptsPas)}`}>
                            {record.ptsPas > 0 ? record.ptsPas.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* Buku */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.buku)}`}>
                            {record.buku > 0 ? record.buku.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* Praktikum 1 Tahun */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.praktikum)}`}>
                            {record.praktikum > 0 ? record.praktikum.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* Kesiswaan */}
                          <td className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(record.cellStatus?.kesiswaan)}`}>
                            {record.kesiswaan > 0 ? record.kesiswaan.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* 12 Months SPP */}
                          {SPP_MONTH_KEYS.map(m => {
                            const val = record.spp?.[m.key] || 0;
                            const statusKey = `spp_${m.key}` as keyof NonNullable<typeof record.cellStatus>;
                            const status = record.cellStatus?.[statusKey];

                            return (
                              <td
                                key={m.key}
                                className={`border-r border-slate-200 dark:border-slate-700 ${getCellClassName(status)}`}
                              >
                                {val > 0 ? val.toLocaleString('id-ID') : '-'}
                              </td>
                            );
                          })}

                          {/* Total Siswa */}
                          <td className="border-r border-slate-200 dark:border-slate-700 p-1.5 text-right text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60">
                            {studentTotal > 0 ? studentTotal.toLocaleString('id-ID') : '-'}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-1.5 text-center no-print">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(record)}
                                className="p-1 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition cursor-pointer"
                                title="Edit Rincian Tagihan & Status"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudentFee(record.id, record.studentName)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                title="Hapus Siswa dari Lembar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* SUMMARY ROW: JUMLAH (Sesuai Gambar Lampiran) */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-400 text-[11px]">
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-center"></td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-center tracking-wider uppercase">
                      JUMLAH
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.tagihanX > 0 ? totals.tagihanX.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.asrama > 0 ? totals.asrama.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.ptsPas > 0 ? totals.ptsPas.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.buku > 0 ? totals.buku.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.praktikum > 0 ? totals.praktikum.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right">
                      {totals.kesiswaan > 0 ? totals.kesiswaan.toLocaleString('id-ID') : '-'}
                    </td>

                    {/* SPP Totals */}
                    {SPP_MONTH_KEYS.map(m => (
                      <td
                        key={m.key}
                        className="border-r border-slate-300 dark:border-slate-600 p-1.5 text-right text-[10px]"
                      >
                        {totals.sppTotals[m.key] > 0 ? totals.sppTotals[m.key].toLocaleString('id-ID') : '-'}
                      </td>
                    ))}

                    <td className="border-r border-slate-300 dark:border-slate-600 p-2 text-right text-emerald-700 dark:text-emerald-300 text-xs">
                      {totals.grandTotal > 0 ? totals.grandTotal.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="p-2 no-print"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER SECTION (Legend, Rekening BSI & Tanda Tangan Resmi Sesuai Gambar) */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Kolom Kiri: Callout Wali Kelas & Status Legend */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-900 dark:text-white uppercase">
                  <div>{docData.className || className || 'XI APL'}</div>
                  <div className="text-emerald-700 dark:text-emerald-400">
                    {docData.homeroomTeacherCallName || 'BAPAK PUPUT'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Keterangan Status:
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-bold">
                    <div className="flex items-center justify-between border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-800">
                      <span>LUNAS</span>
                      <span className="w-10 h-3.5 bg-slate-100 border border-slate-300 rounded-xs"></span>
                    </div>
                    <div className="flex items-center justify-between border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-800">
                      <span>WAJIB DILUNASI</span>
                      <span className="w-10 h-3.5 bg-orange-500 rounded-xs"></span>
                    </div>
                    <div className="flex items-center justify-between border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-800">
                      <span>MOHON DICICIL</span>
                      <span className="w-10 h-3.5 bg-amber-300 dark:bg-amber-400 rounded-xs"></span>
                    </div>
                    <div className="flex items-center justify-between border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-800">
                      <span>SUBSIDI BANTUAN</span>
                      <span className="w-10 h-3.5 bg-sky-300 dark:bg-sky-400 rounded-xs"></span>
                    </div>
                  </div>
                </div>

                {/* Tanda Tangan Kiri: Mengetahui Bendahara Sekolah */}
                <div className="pt-4 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <div>Mengetahui,</div>
                  <div className="font-bold">Bendahara Sekolah</div>
                  <div className="h-14"></div>
                  <div className="font-black underline">{docData.schoolTreasurerName || 'Agustin Rahmawati, A.Md.'}</div>
                </div>
              </div>

              {/* Kolom Tengah: Info Rekening Bank Sekolah */}
              <div className="flex flex-col items-center justify-center p-4 bg-amber-400/90 dark:bg-amber-500/90 text-slate-950 rounded-2xl border-2 border-slate-900 dark:border-slate-900 shadow-md space-y-1.5 text-center">
                <CreditCard className="w-6 h-6 text-slate-900" />
                <div className="text-xs font-black uppercase tracking-wider">
                  {docData.bankName || 'BANK SYARIAH INDONESIA (BSI)'}
                </div>
                <div className="text-lg font-black tracking-widest bg-white/70 px-3 py-1 rounded-lg border border-slate-900">
                  {docData.bankAccountNumber || '4444-400-167'}
                </div>
                <div className="text-[11px] font-extrabold uppercase">
                  {docData.bankAccountHolder || 'SMK DR SOEBANDI JEMBER'}
                </div>
                <p className="text-[10px] text-slate-900 font-medium">
                  Sertakan keterangan nama siswa & kelas saat melakukan transfer/setor tunai.
                </p>
              </div>

              {/* Kolom Kanan: Pengesahan ACC Bendahara Penerimaan & Wali Kelas */}
              <div className="space-y-6 text-right text-xs text-slate-800 dark:text-slate-200">
                <div className="space-y-1">
                  <div className="font-bold text-slate-600 dark:text-slate-400">
                    {docData.dataPerDate || 'Data per Tanggal 15 Agustus 2026'}
                  </div>
                  <div className="font-bold">ACC Bendahara Penerimaan</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Jember, .................... 2026</div>
                  <div className="h-10"></div>
                  <div className="font-black underline">{docData.receivingTreasurerName || 'Agustin Rahmawati'}</div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                  <div>{docData.signDate || 'Jember, 31 Agustus 2026'}</div>
                  <div className="font-bold">Wali Kelas</div>
                  <div className="h-12"></div>
                  <div className="font-black underline">{docData.homeroomTeacherName || 'Puput Sasmita, S.Pd., Gr.'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BUKU KAS HARIAN KELAS (COMPATIBILITY) */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Buku Mutasi Kas Kelas & Iuran Rutin Mingguan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan kas operasional kelas, kebersihan, infaq sosial, dan transparansi saldo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => HomeroomPdfExporter.exportTreasuryPDF(className, transactions)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Buku Kas</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Pemasukan Kas</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                Rp {totalIncome.toLocaleString('id-ID')}
              </div>
              <p className="text-[10px] text-slate-500">Akumulasi penerimaan</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Pengeluaran Kas</span>
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                Rp {totalExpense.toLocaleString('id-ID')}
              </div>
              <p className="text-[10px] text-slate-500">Biaya kebersihan & operasional</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Sisa Saldo Kas Kelas</span>
                <Wallet className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                Rp {cashBalance.toLocaleString('id-ID')}
              </div>
              <p className="text-[10px] text-slate-500">Saldo aktif bendahara kelas</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300">
              Riwayat Mutasi Kas ({transactions.length} Catatan)
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Belum ada mutasi transaksi kas kelas.</div>
              ) : (
                transactions.map(item => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${item.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'}`}>
                        {item.type === 'Pemasukan' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{item.description}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.date} • <span className="font-semibold">{item.category}</span> • Oleh: {item.recordedBy}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black ${item.type === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.type === 'Pemasukan' ? '+' : '-'} Rp {item.amount.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400">Saldo: Rp {item.balanceAfter.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / TAMBAH RINCIAN PEMBAYARAN SISWA */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isNewRecord ? 'Tambah Rincian Administrasi Siswa' : `Edit Administrasi: ${editingRecord.studentName}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur rincian tagihan pos biaya, SPP 12 bulan, dan status warna lembar resmi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentFee} className="space-y-4">
              {/* Student Name & Highlight Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.studentName}
                    onChange={e => setEditingRecord({ ...editingRecord, studentName: e.target.value.toUpperCase() })}
                    placeholder="Contoh: ALIRA DIDIK SALSA BHITA"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Status Baris (Khusus)</label>
                  <select
                    value={editingRecord.rowHighlight || 'none'}
                    onChange={e => setEditingRecord({ ...editingRecord, rowHighlight: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold cursor-pointer"
                  >
                    <option value="none">Normal (Sesuai status per sel)</option>
                    <option value="lunas_full">Baris Hijau Muda (Beasiswa Penuh / Bebas Biaya)</option>
                    <option value="wajib">Prioritas Wajib Pelunasan</option>
                  </select>
                </div>
              </div>

              {/* Pos Biaya Non-SPP */}
              <div className="border border-slate-200 dark:border-slate-700 p-3 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Pos Biaya & Administrasi Pokok</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pilih warna status untuk menandai sel di lembar resmi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Tagihan Kelas X */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Tagihan Kelas X (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.tagihanKelasX || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, tagihanKelasX: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.tagihanKelasX || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, tagihanKelasX: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>

                  {/* Asrama */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Asrama 2026-2027 (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.asrama || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, asrama: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.asrama || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, asrama: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>

                  {/* PTS - PAS */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">PTS - PAS (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.ptsPas || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, ptsPas: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.ptsPas || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, ptsPas: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>

                  {/* Buku */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Buku Paket (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.buku || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, buku: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.buku || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, buku: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>

                  {/* Praktikum 1 Tahun */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Praktikum 1 Tahun (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.praktikum || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, praktikum: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.praktikum || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, praktikum: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>

                  {/* Kesiswaan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Kesiswaan (Rp)</label>
                    <input
                      type="number"
                      value={editingRecord.kesiswaan || 0}
                      onChange={e => setEditingRecord({ ...editingRecord, kesiswaan: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={editingRecord.cellStatus?.kesiswaan || ''}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          cellStatus: { ...editingRecord.cellStatus, kesiswaan: (e.target.value || undefined) as any }
                        })
                      }
                      className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Polos / Lunas</option>
                      <option value="cicil">Kuning (Mohon Dicicil)</option>
                      <option value="wajib">Oranye (Wajib Dilunasi)</option>
                      <option value="subsidi">Biru (Subsidi Bantuan)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rincian SPP 12 Bulan */}
              <div className="border border-slate-200 dark:border-slate-700 p-3 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Rincian SPP (Juli s.d. Juni)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const all200: any = {};
                        SPP_MONTH_KEYS.forEach(m => (all200[m.key] = 200000));
                        setEditingRecord({ ...editingRecord, spp: all200 });
                      }}
                      className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                    >
                      Set Semua Rp 200.000
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allZero: any = {};
                        SPP_MONTH_KEYS.forEach(m => (allZero[m.key] = 0));
                        setEditingRecord({ ...editingRecord, spp: allZero });
                      }}
                      className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                    >
                      Set Semua Lunas (Rp 0)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {SPP_MONTH_KEYS.map(m => {
                    const statusKey = `spp_${m.key}` as keyof NonNullable<typeof editingRecord.cellStatus>;
                    const currentStatus = editingRecord.cellStatus?.[statusKey] || '';

                    return (
                      <div key={m.key} className="space-y-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 text-center uppercase">
                          {m.label}
                        </div>
                        <input
                          type="number"
                          value={editingRecord.spp?.[m.key] || 0}
                          onChange={e =>
                            setEditingRecord({
                              ...editingRecord,
                              spp: { ...editingRecord.spp, [m.key]: Number(e.target.value) }
                            })
                          }
                          className="w-full px-1.5 py-1 text-xs text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white"
                        />
                        <select
                          value={currentStatus}
                          onChange={e =>
                            setEditingRecord({
                              ...editingRecord,
                              cellStatus: {
                                ...editingRecord.cellStatus,
                                [statusKey]: (e.target.value || undefined) as any
                              }
                            })
                          }
                          className="w-full text-[9px] py-0.5 px-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                        >
                          <option value="">Polos</option>
                          <option value="wajib">Oranye (Wajib)</option>
                          <option value="cicil">Kuning (Cicil)</option>
                          <option value="subsidi">Biru (Subsidi)</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Catatan Khusus */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Catatan Khusus Siswa</label>
                <input
                  type="text"
                  value={editingRecord.notes || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  placeholder="Contoh: SPP Juli wajib dilunasi, buku & kesiswaan mohon dicicil."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Rincian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PENGATURAN KOP, BANK & PENGESAHAN */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pengaturan Lembar Rincian Administrasi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kop surat, nama pejabat bendahara, wali kelas, dan nomor rekening sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bulan Laporan</label>
                  <input
                    type="text"
                    value={settingsForm.month}
                    onChange={e => setSettingsForm({ ...settingsForm, month: e.target.value })}
                    placeholder="Contoh: Agustus 2026"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Teks Data Per Tanggal</label>
                  <input
                    type="text"
                    value={settingsForm.dataPerDate}
                    onChange={e => setSettingsForm({ ...settingsForm, dataPerDate: e.target.value })}
                    placeholder="Contoh: Data per Tanggal 15 Agustus 2026"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Header SPP (12 Bulan)</label>
                  <input
                    type="text"
                    value={settingsForm.sppHeaderPeriod}
                    onChange={e => setSettingsForm({ ...settingsForm, sppHeaderPeriod: e.target.value })}
                    placeholder="Contoh: SPP (JULI 2026 - JUNI 2027)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Header Asrama</label>
                  <input
                    type="text"
                    value={settingsForm.asramaHeaderPeriod}
                    onChange={e => setSettingsForm({ ...settingsForm, asramaHeaderPeriod: e.target.value })}
                    placeholder="Contoh: ASRAMA 2026 - 2027"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Bank Account Settings */}
              <div className="border border-slate-200 dark:border-slate-700 p-3 rounded-xl space-y-2 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Rekening Bank Pembayaran Sekolah
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Nama Bank</label>
                    <input
                      type="text"
                      value={settingsForm.bankName}
                      onChange={e => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Nomor Rekening</label>
                    <input
                      type="text"
                      value={settingsForm.bankAccountNumber}
                      onChange={e => setSettingsForm({ ...settingsForm, bankAccountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Atas Nama Rekening</label>
                    <input
                      type="text"
                      value={settingsForm.bankAccountHolder}
                      onChange={e => setSettingsForm({ ...settingsForm, bankAccountHolder: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Signatures Pejabat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bendahara Sekolah</label>
                  <input
                    type="text"
                    value={settingsForm.schoolTreasurerName}
                    onChange={e => setSettingsForm({ ...settingsForm, schoolTreasurerName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ACC Bendahara Penerimaan</label>
                  <input
                    type="text"
                    value={settingsForm.receivingTreasurerName}
                    onChange={e => setSettingsForm({ ...settingsForm, receivingTreasurerName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Wali Kelas</label>
                  <input
                    type="text"
                    value={settingsForm.homeroomTeacherName}
                    onChange={e => setSettingsForm({ ...settingsForm, homeroomTeacherName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Panggilan Wali Kelas (Header Kiri)</label>
                  <input
                    type="text"
                    value={settingsForm.homeroomTeacherCallName}
                    onChange={e => setSettingsForm({ ...settingsForm, homeroomTeacherCallName: e.target.value })}
                    placeholder="Contoh: BAPAK PUPUT"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATAT TRANSAKSI KAS HARIAN */}
      {showAddCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Catat Transaksi Kas Kelas</h3>
              <button
                type="button"
                onClick={() => setShowAddCashModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCashTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Jenis Mutasi</label>
                  <select
                    value={cashType}
                    onChange={e => setCashType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold"
                  >
                    <option value="Pemasukan">Pemasukan (+)</option>
                    <option value="Pengeluaran">Pengeluaran (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tanggal</label>
                  <input
                    type="date"
                    value={cashDate}
                    onChange={e => setCashDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={cashAmount}
                  onChange={e => setCashAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-black text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Kategori</label>
                <select
                  value={cashCategory}
                  onChange={e => setCashCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Iuran Kas Rutin">Iuran Kas Rutin Mingguan</option>
                  <option value="Infaq Jumat">Infaq Jumat Berkah</option>
                  <option value="Kebersihan">Perlengkapan Kebersihan</option>
                  <option value="Foto Kopi / Modul">Foto Kopi / Modul / ATK</option>
                  <option value="Kegiatan Kelas">Kegiatan / Lomba Kelas</option>
                  <option value="Lainnya">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Uraian Transaksi</label>
                <input
                  type="text"
                  required
                  value={cashDesc}
                  onChange={e => setCashDesc(e.target.value)}
                  placeholder="Contoh: Penerimaan iuran kas pekan 1"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCashModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
