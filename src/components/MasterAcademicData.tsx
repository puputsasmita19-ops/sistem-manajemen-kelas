import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Layers,
  Clock,
  Cloud,
  Database,
  Upload,
  Download,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Award,
  ChevronRight,
  ExternalLink,
  HardDrive,
  Users,
  Check,
  X,
  Sparkles,
  School,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import { DatabaseService } from '../services/databaseService';
import { FirestoreSyncService } from '../services/firestoreSyncService';
import { GoogleDriveService } from '../services/googleDriveService';
import {
  User,
  AcademicYear,
  Curriculum,
  Department,
  MasterSubject,
  Extracurricular,
  StudyScheduleSlot
} from '../types';
import { OverallMasterDataManager } from './OverallMasterDataManager';

interface MasterAcademicDataProps {
  currentUser: User;
}

type TabKey =
  | 'master_keseluruhan'
  | 'tahun_ajaran'
  | 'kurikulum'
  | 'jurusan'
  | 'mapel'
  | 'ekskul'
  | 'jadwal_jam'
  | 'cloud_sync';

export const MasterAcademicData: React.FC<MasterAcademicDataProps> = ({ currentUser }) => {
  const dbService = DatabaseService.getInstance();
  const firestoreService = FirestoreSyncService.getInstance();
  const driveService = GoogleDriveService.getInstance();

  const [activeTab, setActiveTab] = useState<TabKey>('tahun_ajaran');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);

  // Master Data States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<MasterSubject[]>([]);
  const [extracurriculars, setExtracurriculars] = useState<Extracurricular[]>([]);
  const [studySchedules, setStudySchedules] = useState<StudyScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);

  // Modal States
  const [modalType, setModalType] = useState<
    'ay' | 'curr' | 'dept' | 'subject' | 'ekskul' | 'schedule' | null
  >(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [ayForm, setAyForm] = useState({
    tahun: '2025/2026',
    semesterAktif: 'Ganjil' as 'Ganjil' | 'Genap',
    status: 'Aktif' as 'Aktif' | 'Arsip' | 'Mendatang',
    tanggalMulai: '2025-07-14',
    tanggalSelesai: '2025-12-20',
    kepalaSekolah: 'Drs. H. Mulyadi, M.Pd',
    nipKepalaSekolah: '196805121994031005'
  });

  const [currForm, setCurrForm] = useState({
    kode: 'KM-2024',
    nama: 'Kurikulum Merdeka',
    tingkat: 'Fase E (Kelas X), Fase F (Kelas XI), Fase F (Kelas XII)',
    status: 'Aktif' as 'Aktif' | 'Transisi' | 'Nonaktif',
    deskripsi: ''
  });

  const [deptForm, setDeptForm] = useState({
    kode: 'MIPA',
    nama: 'Matematika dan Ilmu Pengetahuan Alam',
    kepalaProgram: '',
    kuota: 144,
    status: 'Aktif' as 'Aktif' | 'Nonaktif'
  });

  const [subjectForm, setSubjectForm] = useState({
    kode_mapel: 'MP-MAT-01',
    nama_mapel: 'Matematika',
    kelompok: 'Umum / Wajib' as
      | 'Umum / Wajib'
      | 'Peminatan / Kejuruan'
      | 'Muatan Lokal'
      | 'Pilihan',
    kkm: 75,
    tingkatKelas: 'Semua',
    guru_id: '',
    alokasiJamPerMinggu: 4,
    status: 'Aktif' as 'Aktif' | 'Nonaktif'
  });

  const [ekskulForm, setEkskulForm] = useState({
    nama: '',
    pembina: '',
    hariLatihan: 'Jumat',
    jamLatihan: '15:00 - 17:00 WIB',
    lokasi: 'Lapangan / Ruang Ekskul',
    jumlahAnggota: 20,
    status: 'Aktif' as 'Aktif' | 'Nonaktif'
  });

  const [scheduleForm, setScheduleForm] = useState({
    jamKe: 1,
    waktuMulai: '07:15',
    waktuSelesai: '08:00',
    keterangan: 'Jam KBM Ke-1',
    isBreak: false
  });

  const loadData = () => {
    setAcademicYears(dbService.getAcademicYears());
    setCurriculums(dbService.getCurriculums());
    setDepartments(dbService.getDepartments());
    setMasterSubjects(dbService.getMasterSubjects());
    setExtracurriculars(dbService.getExtracurriculars());
    setStudySchedules(dbService.getStudySchedules());

    const allUsers = dbService.getAllUsers();
    const guruList = allUsers.filter((u: User) => u.role === 'guru' || u.role === 'wali_kelas' || u.role === 'admin');
    setTeachers(guruList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeYear = academicYears.find(y => y.status === 'Aktif') || academicYears[0];

  // ==========================================
  // CLOUD SYNC & GOOGLE DRIVE ACTIONS
  // ==========================================
  const handleSyncFirebase = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await firestoreService.syncAllMasterAcademicToFirestore();
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Sinkronisasi Berhasil',
          text: `${res.count} data Master Akademik berhasil disinkronkan ke Firebase Firestore!`,
          confirmButtonColor: '#2563eb'
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Tersimpan di Cache',
          text: 'Data master akademik telah diperbarui dan siap diunggah ke Firebase saat jaringan terhubung.',
          confirmButtonColor: '#2563eb'
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: e?.message || 'Terjadi kesalahan saat menyinkronkan dengan Firebase.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleBackupToGoogleDrive = async () => {
    setIsBackingUpDrive(true);
    try {
      const { blob, filename } = dbService.exportMasterAcademicJSON();
      const textData = await blob.text();
      const res = await driveService.uploadMasterAcademicBackupToDrive(textData, filename);

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Cadangan Google Drive Tersimpan',
          html: `
            <p class="text-sm text-slate-600 mb-2">Master Data Akademik berhasil diarsipkan ke Google Drive dalam format file <b>${filename}</b>.</p>
            <div class="mt-3 text-xs bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-left text-slate-700 dark:text-slate-200">
              <span class="font-semibold block text-slate-900 dark:text-white">ID Berkas Drive:</span> ${res.fileId || 'SIMAK_DRIVE_ARCHIVE'}
            </div>
          `,
          confirmButtonColor: '#2563eb'
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Cadangan Drive',
        text: e?.message || 'Tidak dapat menghubungi Google Drive API.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  const handleDownloadJSON = () => {
    dbService.downloadMasterAcademicJSON();
    Swal.fire({
      icon: 'success',
      title: 'Berkas JSON Terunduh',
      text: 'File cadangan Master Data Akademik telah disimpan ke perangkat Anda.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = dbService.restoreMasterAcademicJSON(content);
      if (res.success) {
        loadData();
        Swal.fire({
          icon: 'success',
          title: 'Pemulihan Berhasil',
          text: res.message,
          confirmButtonColor: '#2563eb'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Format Tidak Sesuai',
          text: res.message,
          confirmButtonColor: '#ef4444'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ==========================================
  // CRUD HANDLERS
  // ==========================================

  // --- Academic Year ---
  const handleSaveAY = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      dbService.updateAcademicYear(editingItem.id, ayForm);
    } else {
      dbService.createAcademicYear(ayForm);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleSetActiveAY = (id: string, tahun: string) => {
    Swal.fire({
      title: 'Aktifkan Periode Akademik?',
      text: `Tetapkan Tahun Ajaran ${tahun} sebagai periode akademik sistem yang sedang berjalan.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Aktifkan',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.setActiveAcademicYear(id);
        loadData();
        Swal.fire({
          icon: 'success',
          title: 'Periode Diaktifkan',
          text: `Tahun Ajaran ${tahun} kini aktif di seluruh sistem.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const handleDeleteAY = (id: string, tahun: string) => {
    Swal.fire({
      title: 'Hapus Tahun Ajaran?',
      text: `Apakah Anda yakin ingin menghapus data periode ${tahun}? Tindakan ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteAcademicYear(id);
        loadData();
        Swal.fire({
          icon: 'success',
          title: 'Data Dihapus',
          text: `Tahun Ajaran ${tahun} berhasil dihapus.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // --- Curriculum ---
  const handleSaveCurr = (e: React.FormEvent) => {
    e.preventDefault();
    const tingkatArr = currForm.tingkat.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      kode: currForm.kode,
      nama: currForm.nama,
      tingkat: tingkatArr,
      status: currForm.status,
      deskripsi: currForm.deskripsi
    };

    if (editingItem) {
      dbService.updateCurriculum(editingItem.id, payload);
    } else {
      dbService.createCurriculum(payload);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteCurr = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Kurikulum?',
      text: `Hapus kurikulum "${nama}" dari Master Data?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteCurriculum(id);
        loadData();
      }
    });
  };

  // --- Department ---
  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      dbService.updateDepartment(editingItem.id, deptForm);
    } else {
      dbService.createDepartment(deptForm);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteDept = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Jurusan?',
      text: `Hapus jurusan "${nama}" dari Master Data?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteDepartment(id);
        loadData();
      }
    });
  };

  // --- Master Subject ---
  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === subjectForm.guru_id);
    const guruId = subjectForm.guru_id || (teachers.length > 0 ? teachers[0].id : currentUser.id);

    const payload = {
      ...subjectForm,
      guru_id: guruId
    };

    if (editingItem) {
      dbService.updateMasterSubject(editingItem.id, payload);
    } else {
      dbService.createMasterSubject(payload);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteSubject = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Mata Pelajaran?',
      text: `Hapus mapel "${nama}" dari Master Data Akademik?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteMasterSubject(id);
        loadData();
      }
    });
  };

  // --- Extracurricular ---
  const handleSaveEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      dbService.updateExtracurricular(editingItem.id, ekskulForm);
    } else {
      dbService.createExtracurricular(ekskulForm);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteEkskul = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Ekstrakurikuler?',
      text: `Hapus ekskul "${nama}" dari Master Data?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteExtracurricular(id);
        loadData();
      }
    });
  };

  // --- Study Schedule Slot ---
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      dbService.updateStudySchedule(editingItem.id, scheduleForm);
    } else {
      dbService.createStudySchedule(scheduleForm);
    }
    loadData();
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteSchedule = (id: string, keterangan: string) => {
    Swal.fire({
      title: 'Hapus Slot Jam Belajar?',
      text: `Hapus slot "${keterangan}" dari jadwal?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteStudySchedule(id);
        loadData();
      }
    });
  };

  // Filtered Lists
  const filteredAY = academicYears.filter(
    y => y.tahun.toLowerCase().includes(searchQuery.toLowerCase()) ||
         y.kepalaSekolah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCurr = curriculums.filter(
    c => c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDept = departments.filter(
    d => d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
         d.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = masterSubjects.filter(
    s => s.nama_mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.kode_mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.kelompok.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEkskul = extracurriculars.filter(
    e => e.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
         e.pembina.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSchedules = studySchedules.filter(
    s => s.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.waktuMulai.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12" id="master-academic-root">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                Master Data Akademik
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200">
                Khusus Role Administrator
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-white" />
              Pusat Konfigurasi & Master Data Akademik
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Kelola struktur tahun pelajaran, kurikulum nasional, program jurusan, master mata pelajaran,
              jadwal KBM, serta sinkronisasi otomatis ke Firebase Firestore & Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSyncFirebase}
              disabled={isSyncingCloud}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              title="Sinkronkan master data ke Firebase Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              {isSyncingCloud ? 'Menyinkronkan...' : 'Sync ke Firebase'}
            </button>

            <button
              onClick={handleBackupToGoogleDrive}
              disabled={isBackingUpDrive}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              title="Cadangkan arsip master data ke Google Drive"
            >
              <HardDrive className="w-4 h-4" />
              {isBackingUpDrive ? 'Mengunggah...' : 'Cadangkan ke Drive'}
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10"
              title="Unduh file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Tahun Ajaran Aktif</span>
            <span className="font-bold text-sm text-emerald-300 truncate block">
              {activeYear ? `${activeYear.tahun} (${activeYear.semesterAktif})` : 'Belum Diatur'}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Kurikulum</span>
            <span className="font-bold text-sm text-blue-300 truncate block">
              {curriculums.find(c => c.status === 'Aktif')?.nama || `${curriculums.length} Terdaftar`}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Jurusan / Program</span>
            <span className="font-bold text-sm text-purple-300 block">
              {departments.length} Jurusan
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Master Mapel</span>
            <span className="font-bold text-sm text-amber-300 block">
              {masterSubjects.length} Mata Pelajaran
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Ekstrakurikuler</span>
            <span className="font-bold text-sm text-cyan-300 block">
              {extracurriculars.length} Kegiatan
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-slate-300 font-medium block mb-0.5">Jam KBM Harian</span>
            <span className="font-bold text-sm text-rose-300 block">
              {studySchedules.filter(s => !s.isBreak).length} Jam Pelajaran
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="p-1.5 bg-slate-100/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => { setActiveTab('master_keseluruhan'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'master_keseluruhan'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Database className="w-4 h-4" />
            Master Data Keseluruhan
          </button>

          <button
            onClick={() => { setActiveTab('tahun_ajaran'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'tahun_ajaran'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Tahun Ajaran & Semester
          </button>

          <button
            onClick={() => { setActiveTab('kurikulum'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'kurikulum'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Layers className="w-4 h-4" />
            Kurikulum & Fase
          </button>

          <button
            onClick={() => { setActiveTab('jurusan'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'jurusan'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <School className="w-4 h-4" />
            Jurusan & Kuota
          </button>

          <button
            onClick={() => { setActiveTab('mapel'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'mapel'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Master Mapel & KKM
          </button>

          <button
            onClick={() => { setActiveTab('ekskul'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'ekskul'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Award className="w-4 h-4" />
            Ekstrakurikuler
          </button>

          <button
            onClick={() => { setActiveTab('jadwal_jam'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'jadwal_jam'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Clock className="w-4 h-4" />
            Jam Belajar & Bel
          </button>

          <button
            onClick={() => { setActiveTab('cloud_sync'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === 'cloud_sync'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Cloud & Backup
          </button>
        </div>

        {/* Search Bar & Primary Add Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {activeTab !== 'cloud_sync' && activeTab !== 'master_keseluruhan' && (
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari data..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              />
            </div>
          )}

          {activeTab === 'tahun_ajaran' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setAyForm({
                  tahun: '2026/2027',
                  semesterAktif: 'Ganjil',
                  status: 'Mendatang',
                  tanggalMulai: '2026-07-13',
                  tanggalSelesai: '2026-12-19',
                  kepalaSekolah: 'Drs. H. Mulyadi, M.Pd',
                  nipKepalaSekolah: '196805121994031005'
                });
                setModalType('ay');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Tahun
            </button>
          )}

          {activeTab === 'kurikulum' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setCurrForm({
                  kode: '',
                  nama: '',
                  tingkat: 'Fase E (Kelas X), Fase F (Kelas XI), Fase F (Kelas XII)',
                  status: 'Aktif',
                  deskripsi: ''
                });
                setModalType('curr');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Kurikulum
            </button>
          )}

          {activeTab === 'jurusan' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setDeptForm({
                  kode: '',
                  nama: '',
                  kepalaProgram: '',
                  kuota: 108,
                  status: 'Aktif'
                });
                setModalType('dept');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Jurusan
            </button>
          )}

          {activeTab === 'mapel' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setSubjectForm({
                  kode_mapel: `MP-${Date.now().toString().slice(-4)}`,
                  nama_mapel: '',
                  kelompok: 'Umum / Wajib',
                  kkm: 75,
                  tingkatKelas: 'Semua',
                  guru_id: teachers[0]?.id || '',
                  alokasiJamPerMinggu: 3,
                  status: 'Aktif'
                });
                setModalType('subject');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Mapel
            </button>
          )}

          {activeTab === 'ekskul' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setEkskulForm({
                  nama: '',
                  pembina: teachers[0]?.nama || 'Guru Pembina',
                  hariLatihan: 'Jumat',
                  jamLatihan: '15:00 - 17:00 WIB',
                  lokasi: 'Lapangan Sekolah',
                  jumlahAnggota: 20,
                  status: 'Aktif'
                });
                setModalType('ekskul');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Ekskul
            </button>
          )}

          {activeTab === 'jadwal_jam' && (
            <button
              onClick={() => {
                setEditingItem(null);
                setScheduleForm({
                  jamKe: studySchedules.length + 1,
                  waktuMulai: '14:30',
                  waktuSelesai: '15:15',
                  keterangan: `Jam KBM Ke-${studySchedules.length + 1}`,
                  isBreak: false
                });
                setModalType('schedule');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Slot Jam
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 0: MASTER DATA KESELURUHAN APLIKASI */}
      {/* ========================================================================= */}
      {activeTab === 'master_keseluruhan' && (
        <OverallMasterDataManager
          currentUser={currentUser}
          onNavigateTab={tabKey => {
            if (
              tabKey === 'tahun_ajaran' ||
              tabKey === 'kurikulum' ||
              tabKey === 'jurusan' ||
              tabKey === 'mapel' ||
              tabKey === 'ekskul' ||
              tabKey === 'jadwal_jam' ||
              tabKey === 'cloud_sync'
            ) {
              setActiveTab(tabKey as TabKey);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: TAHUN AJARAN & SEMESTER */}
      {/* ========================================================================= */}
      {activeTab === 'tahun_ajaran' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAY.map(ay => {
              const isActive = ay.status === 'Aktif';
              return (
                <div
                  key={ay.id}
                  className={`rounded-2xl p-5 border transition-all relative ${
                    isActive
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/80 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          T.A. {ay.tahun}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : ay.status === 'Mendatang'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {ay.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
                        Semester {ay.semesterAktif}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(ay);
                          setAyForm({
                            tahun: ay.tahun,
                            semesterAktif: ay.semesterAktif,
                            status: ay.status,
                            tanggalMulai: ay.tanggalMulai,
                            tanggalSelesai: ay.tanggalSelesai,
                            kepalaSekolah: ay.kepalaSekolah,
                            nipKepalaSekolah: ay.nipKepalaSekolah
                          });
                          setModalType('ay');
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Tahun Ajaran"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAY(ay.id, ay.tahun)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Hapus Tahun Ajaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-white/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Rentang Waktu:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {ay.tanggalMulai} s/d {ay.tanggalSelesai}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Kepala Sekolah:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {ay.kepalaSekolah}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">NIP Kepsek:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {ay.nipKepalaSekolah || '-'}
                      </span>
                    </div>
                  </div>

                  {!isActive ? (
                    <button
                      onClick={() => handleSetActiveAY(ay.id, ay.tahun)}
                      className="w-full py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Jadikan Periode Aktif
                    </button>
                  ) : (
                    <div className="w-full py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sedang Aktif Digunakan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: KURIKULUM & FASE */}
      {/* ========================================================================= */}
      {activeTab === 'kurikulum' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCurr.map(curr => (
            <div
              key={curr.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all relative"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      {curr.kode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        curr.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {curr.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    {curr.nama}
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingItem(curr);
                      setCurrForm({
                        kode: curr.kode,
                        nama: curr.nama,
                        tingkat: curr.tingkat.join(', '),
                        status: curr.status,
                        deskripsi: curr.deskripsi
                      });
                      setModalType('curr');
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCurr(curr.id, curr.nama)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                {curr.deskripsi || 'Tidak ada catatan deskripsi kurikulum.'}
              </p>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Tingkat & Fase Pembelajaran:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {curr.tingkat.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-lg font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: JURUSAN & KUOTA */}
      {/* ========================================================================= */}
      {activeTab === 'jurusan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDept.map(dept => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {dept.kode}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingItem(dept);
                        setDeptForm({
                          kode: dept.kode,
                          nama: dept.nama,
                          kepalaProgram: dept.kepalaProgram,
                          kuota: dept.kuota,
                          status: dept.status
                        });
                        setModalType('dept');
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept.id, dept.nama)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {dept.nama}
                </h3>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ketua Program:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {dept.kepalaProgram || 'Belum Ditunjuk'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Daya Tampung / Kuota:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {dept.kuota} Siswa
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: MASTER MATA PELAJARAN (MAPEL) */}
      {/* ========================================================================= */}
      {activeTab === 'mapel' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Kode Mapel</th>
                  <th className="px-4 py-3.5">Nama Mata Pelajaran</th>
                  <th className="px-4 py-3.5">Kelompok</th>
                  <th className="px-4 py-3.5">Tingkat</th>
                  <th className="px-4 py-3.5 text-center">KKM</th>
                  <th className="px-4 py-3.5 text-center">Alokasi Jam</th>
                  <th className="px-4 py-3.5">Guru Pengampu</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSubjects.map(ms => {
                  const teacher = teachers.find(t => t.id === ms.guru_id);
                  return (
                    <tr key={ms.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {ms.kode_mapel}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {ms.nama_mapel}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ms.kelompok}
                        </span>
                      </td>
                      <td className="px-4 py-3">{ms.tingkatKelas}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                          {ms.kkm}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {ms.alokasiJamPerMinggu} JP/mgg
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                        {teacher?.nama || 'Guru Pengampu'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ms.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {ms.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingItem(ms);
                              setSubjectForm({
                                kode_mapel: ms.kode_mapel,
                                nama_mapel: ms.nama_mapel,
                                kelompok: ms.kelompok,
                                kkm: ms.kkm,
                                tingkatKelas: ms.tingkatKelas,
                                guru_id: ms.guru_id,
                                alokasiJamPerMinggu: ms.alokasiJamPerMinggu,
                                status: ms.status
                              });
                              setModalType('subject');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(ms.id, ms.nama_mapel)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 5: EKSTRAKURIKULER */}
      {/* ========================================================================= */}
      {activeTab === 'ekskul' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEkskul.map(ekskul => (
            <div
              key={ekskul.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {ekskul.nama}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingItem(ekskul);
                        setEkskulForm({
                          nama: ekskul.nama,
                          pembina: ekskul.pembina,
                          hariLatihan: ekskul.hariLatihan,
                          jamLatihan: ekskul.jamLatihan,
                          lokasi: ekskul.lokasi,
                          jumlahAnggota: ekskul.jumlahAnggota,
                          status: ekskul.status
                        });
                        setModalType('ekskul');
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEkskul(ekskul.id, ekskul.nama)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Pembina:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {ekskul.pembina}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Jadwal:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {ekskul.hariLatihan}, {ekskul.jamLatihan}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Lokasi:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {ekskul.lokasi}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Anggota Terdaftar:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {ekskul.jumlahAnggota} Siswa
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 6: JADWAL JAM BELAJAR & BEL */}
      {/* ========================================================================= */}
      {activeTab === 'jadwal_jam' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 text-center">Jam Ke</th>
                  <th className="px-4 py-3.5">Waktu Mulai</th>
                  <th className="px-4 py-3.5">Waktu Selesai</th>
                  <th className="px-4 py-3.5">Keterangan Aktivitas</th>
                  <th className="px-4 py-3.5 text-center">Tipe Slot</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSchedules.map(slot => (
                  <tr
                    key={slot.id}
                    className={`transition-colors ${
                      slot.isBreak
                        ? 'bg-amber-50/50 dark:bg-amber-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">
                      {slot.jamKe === 0 ? '-' : `Jam ke-${slot.jamKe}`}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {slot.waktuMulai} WIB
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {slot.waktuSelesai} WIB
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {slot.keterangan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          slot.isBreak
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                        }`}
                      >
                        {slot.isBreak ? 'Istirahat / Non-KBM' : 'KBM Pembelajaran'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(slot);
                            setScheduleForm({
                              jamKe: slot.jamKe,
                              waktuMulai: slot.waktuMulai,
                              waktuSelesai: slot.waktuSelesai,
                              keterangan: slot.keterangan,
                              isBreak: slot.isBreak
                            });
                            setModalType('schedule');
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(slot.id, slot.keterangan)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 7: CLOUD SYNC & BACKUP (FIREBASE & GOOGLE DRIVE) */}
      {/* ========================================================================= */}
      {activeTab === 'cloud_sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firebase Firestore Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Firebase Cloud Firestore
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Sinkronisasi database NoSQL waktu nyata untuk data akademik
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Koleksi Terhubung:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  academic_years, curriculums, departments, master_subjects, extracurriculars, study_schedules
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Mode Sinkronisasi:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dua Arah (Real-Time onSnapshot)
                </span>
              </div>
            </div>

            <button
              onClick={handleSyncFirebase}
              disabled={isSyncingCloud}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              {isSyncingCloud ? 'Menyinkronkan ke Firestore...' : 'Sinkronkan Seluruh Master Data ke Firebase'}
            </button>
          </div>

          {/* Google Drive Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Drive Cloud Backup
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Arsip otomatis snapshot cadangan Master Data Akademik
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Folder Khusus:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  SIMAK_Foto_Siswa & Cadangan
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Format Arsip:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  JSON Schema 2.0.0
                </span>
              </div>
            </div>

            <button
              onClick={handleBackupToGoogleDrive}
              disabled={isBackingUpDrive}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              {isBackingUpDrive ? 'Mengarsipkan...' : 'Unggah Cadangan Master ke Google Drive'}
            </button>
          </div>

          {/* Export / Import File Section */}
          <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Ekspor & Pemulihan Berkas JSON
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Simpan file offline atau pulihkan master data akademik dari arsip JSON sebelumnya.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleDownloadJSON}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-white/15 transition-all"
              >
                <Download className="w-4 h-4" />
                Unduh JSON
              </button>

              <label className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md">
                <Upload className="w-4 h-4" />
                Impor JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOGS FOR CREATE / EDIT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-blue-600" />
                  {editingItem ? 'Edit Master Data' : 'Tambah Master Data Baru'}
                </h3>
                <button
                  onClick={() => { setModalType(null); setEditingItem(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Academic Year */}
              {modalType === 'ay' && (
                <form onSubmit={handleSaveAY} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tahun Ajaran (Contoh: 2026/2027)
                    </label>
                    <input
                      type="text"
                      required
                      value={ayForm.tahun}
                      onChange={e => setAyForm({ ...ayForm, tahun: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Semester
                      </label>
                      <select
                        value={ayForm.semesterAktif}
                        onChange={e => setAyForm({ ...ayForm, semesterAktif: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={ayForm.status}
                        onChange={e => setAyForm({ ...ayForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Arsip">Arsip</option>
                        <option value="Mendatang">Mendatang</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        required
                        value={ayForm.tanggalMulai}
                        onChange={e => setAyForm({ ...ayForm, tanggalMulai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        required
                        value={ayForm.tanggalSelesai}
                        onChange={e => setAyForm({ ...ayForm, tanggalSelesai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      required
                      value={ayForm.kepalaSekolah}
                      onChange={e => setAyForm({ ...ayForm, kepalaSekolah: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={ayForm.nipKepalaSekolah}
                      onChange={e => setAyForm({ ...ayForm, nipKepalaSekolah: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Form Curriculum */}
              {modalType === 'curr' && (
                <form onSubmit={handleSaveCurr} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Kurikulum
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kurikulum Merdeka"
                      value={currForm.nama}
                      onChange={e => setCurrForm({ ...currForm, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kode Kurikulum
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: KM-2024"
                        value={currForm.kode}
                        onChange={e => setCurrForm({ ...currForm, kode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={currForm.status}
                        onChange={e => setCurrForm({ ...currForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Transisi">Transisi</option>
                        <option value="Nonaktif">Nonaktif</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tingkat / Fase (Pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      value={currForm.tingkat}
                      onChange={e => setCurrForm({ ...currForm, tingkat: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Deskripsi
                    </label>
                    <textarea
                      rows={3}
                      value={currForm.deskripsi}
                      onChange={e => setCurrForm({ ...currForm, deskripsi: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Form Department */}
              {modalType === 'dept' && (
                <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Jurusan / Program
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rekayasa Perangkat Lunak"
                      value={deptForm.nama}
                      onChange={e => setDeptForm({ ...deptForm, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kode Singkatan
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: RPL"
                        value={deptForm.kode}
                        onChange={e => setDeptForm({ ...deptForm, kode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kuota Siswa
                      </label>
                      <input
                        type="number"
                        required
                        value={deptForm.kuota}
                        onChange={e => setDeptForm({ ...deptForm, kuota: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ketua Program / Kepala Jurusan
                    </label>
                    <input
                      type="text"
                      value={deptForm.kepalaProgram}
                      onChange={e => setDeptForm({ ...deptForm, kepalaProgram: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Form Master Subject */}
              {modalType === 'subject' && (
                <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Fisika Terapan"
                      value={subjectForm.nama_mapel}
                      onChange={e => setSubjectForm({ ...subjectForm, nama_mapel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kode Mapel
                      </label>
                      <input
                        type="text"
                        required
                        value={subjectForm.kode_mapel}
                        onChange={e => setSubjectForm({ ...subjectForm, kode_mapel: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kelompok Mapel
                      </label>
                      <select
                        value={subjectForm.kelompok}
                        onChange={e => setSubjectForm({ ...subjectForm, kelompok: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="Umum / Wajib">Umum / Wajib</option>
                        <option value="Peminatan / Kejuruan">Peminatan / Kejuruan</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                        <option value="Pilihan">Pilihan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        KKM (Nilai Minimum)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={subjectForm.kkm}
                        onChange={e => setSubjectForm({ ...subjectForm, kkm: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jam / Minggu (JP)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="10"
                        value={subjectForm.alokasiJamPerMinggu}
                        onChange={e => setSubjectForm({ ...subjectForm, alokasiJamPerMinggu: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tingkat Kelas
                      </label>
                      <select
                        value={subjectForm.tingkatKelas}
                        onChange={e => setSubjectForm({ ...subjectForm, tingkatKelas: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <option value="Semua">Semua Tingkat</option>
                        <option value="Kelas X">Kelas X</option>
                        <option value="Kelas XI">Kelas XI</option>
                        <option value="Kelas XII">Kelas XII</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guru Pengampu Utama
                    </label>
                    <select
                      value={subjectForm.guru_id}
                      onChange={e => setSubjectForm({ ...subjectForm, guru_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nama} ({t.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Form Extracurricular */}
              {modalType === 'ekskul' && (
                <form onSubmit={handleSaveEkskul} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Ekstrakurikuler
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bulu Tangkis Club"
                      value={ekskulForm.nama}
                      onChange={e => setEkskulForm({ ...ekskulForm, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guru Pembina / Pelatih
                    </label>
                    <input
                      type="text"
                      required
                      value={ekskulForm.pembina}
                      onChange={e => setEkskulForm({ ...ekskulForm, pembina: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hari Latihan
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Sabtu"
                        value={ekskulForm.hariLatihan}
                        onChange={e => setEkskulForm({ ...ekskulForm, hariLatihan: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jam Latihan
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 08:00 - 10:30 WIB"
                        value={ekskulForm.jamLatihan}
                        onChange={e => setEkskulForm({ ...ekskulForm, jamLatihan: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lokasi Latihan
                      </label>
                      <input
                        type="text"
                        required
                        value={ekskulForm.lokasi}
                        onChange={e => setEkskulForm({ ...ekskulForm, lokasi: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jumlah Anggota
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={ekskulForm.jumlahAnggota}
                        onChange={e => setEkskulForm({ ...ekskulForm, jumlahAnggota: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Form Schedule Slot */}
              {modalType === 'schedule' && (
                <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jam Ke
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="15"
                        value={scheduleForm.jamKe}
                        onChange={e => setScheduleForm({ ...scheduleForm, jamKe: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mulai (HH:MM)
                      </label>
                      <input
                        type="time"
                        required
                        value={scheduleForm.waktuMulai}
                        onChange={e => setScheduleForm({ ...scheduleForm, waktuMulai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Selesai (HH:MM)
                      </label>
                      <input
                        type="time"
                        required
                        value={scheduleForm.waktuSelesai}
                        onChange={e => setScheduleForm({ ...scheduleForm, waktuSelesai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Keterangan Aktivitas
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Jam KBM Ke-1 / Istirahat Siang"
                      value={scheduleForm.keterangan}
                      onChange={e => setScheduleForm({ ...scheduleForm, keterangan: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isBreakCheck"
                      checked={scheduleForm.isBreak}
                      onChange={e => setScheduleForm({ ...scheduleForm, isBreak: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="isBreakCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Tandai sebagai Waktu Istirahat / Non-KBM
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
