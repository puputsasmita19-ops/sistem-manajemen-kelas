import React, { useState, useMemo } from 'react';
import {
  School,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Calendar,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  BookOpen,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { ClassEntity, User } from '../types';
import Swal from 'sweetalert2';

interface ClassManagementProps {
  onRefresh?: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ onRefresh }) => {
  const dbService = DatabaseService.getInstance();
  const [dataVersion, setDataVersion] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '10' | '11' | '12' | 'has_homeroom' | 'no_homeroom'>('all');
  const [sortField, setSortField] = useState<'nama_kelas' | 'tahun_ajaran' | 'student_count'>('nama_kelas');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [formData, setFormData] = useState({
    nama_kelas: '',
    wali_kelas_id: '',
    tahun_ajaran: '2024/2025'
  });

  // Roster Modal State
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<ClassEntity | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');

  // Fetch data
  const rawData = dbService.getRawSnapshot();
  const allClasses = Object.values(rawData.classes || {});
  const allUsers = Object.values(rawData.users || {});
  const teachers = allUsers.filter(u => u.role === 'guru' || u.role === 'wali_kelas');
  const allStudents = allUsers.filter(u => u.role === 'siswa');

  // Compute members map
  const classStudentsMap = useMemo(() => {
    const map: Record<string, (User & { memberId: string })[]> = {};
    allClasses.forEach(cls => {
      map[cls.id] = dbService.getStudentsInClass(cls.id);
    });
    return map;
  }, [allClasses, rawData.class_members, dataVersion]);

  // Unassigned students
  const unassignedStudents = useMemo(() => {
    return dbService.getUnassignedStudents();
  }, [allStudents, rawData.class_members, dataVersion]);

  // Filtered & Sorted Classes with Fast Search Bar logic
  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allClasses.filter(cls => {
      // 1. Grade/Filter pill condition
      if (gradeFilter === '10') {
        const isGrade10 = cls.nama_kelas.toLowerCase().startsWith('10') || cls.nama_kelas.toLowerCase().startsWith('x ');
        if (!isGrade10) return false;
      } else if (gradeFilter === '11') {
        const isGrade11 = cls.nama_kelas.toLowerCase().startsWith('11') || cls.nama_kelas.toLowerCase().startsWith('xi ');
        if (!isGrade11) return false;
      } else if (gradeFilter === '12') {
        const isGrade12 = cls.nama_kelas.toLowerCase().startsWith('12') || cls.nama_kelas.toLowerCase().startsWith('xii ');
        if (!isGrade12) return false;
      } else if (gradeFilter === 'has_homeroom') {
        if (!cls.wali_kelas_id) return false;
      } else if (gradeFilter === 'no_homeroom') {
        if (cls.wali_kelas_id) return false;
      }

      // 2. Fast Search Bar Query Matching
      if (!query) return true;

      const matchClassName = cls.nama_kelas.toLowerCase().includes(query);
      const matchAcademicYear = cls.tahun_ajaran.toLowerCase().includes(query);
      const matchClassId = cls.id.toLowerCase().includes(query);

      const wali = rawData.users[cls.wali_kelas_id];
      const matchWali = wali && (
        wali.nama.toLowerCase().includes(query) ||
        wali.username.toLowerCase().includes(query) ||
        wali.email.toLowerCase().includes(query) ||
        wali.no_wa.includes(query)
      );

      // Also search if any student name in this class matches the query
      const students = classStudentsMap[cls.id] || [];
      const matchStudent = students.some(s =>
        s.nama.toLowerCase().includes(query) ||
        (s.nis && s.nis.includes(query)) ||
        s.username.toLowerCase().includes(query)
      );

      return matchClassName || matchAcademicYear || matchClassId || Boolean(matchWali) || matchStudent;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'nama_kelas') {
        comparison = a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'tahun_ajaran') {
        comparison = a.tahun_ajaran.localeCompare(b.tahun_ajaran);
      } else if (sortField === 'student_count') {
        const countA = (classStudentsMap[a.id] || []).length;
        const countB = (classStudentsMap[b.id] || []).length;
        comparison = countA - countB;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [allClasses, searchQuery, gradeFilter, sortField, sortAsc, classStudentsMap, rawData.users]);

  // Metrics summary
  const totalClassesCount = allClasses.length;
  const totalAssignedStudents = Object.values(rawData.class_members || {}).length;
  const homeroomCount = allClasses.filter(c => Boolean(c.wali_kelas_id)).length;
  const averageStudentsPerClass = totalClassesCount > 0 ? (totalAssignedStudents / totalClassesCount).toFixed(1) : '0';

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({
      nama_kelas: '',
      wali_kelas_id: '',
      tahun_ajaran: '2024/2025'
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassEntity) => {
    setEditingClass(cls);
    setFormData({
      nama_kelas: cls.nama_kelas,
      wali_kelas_id: cls.wali_kelas_id || '',
      tahun_ajaran: cls.tahun_ajaran
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kelas.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Kelas Wajib Diisi',
        text: 'Silakan masukkan nama kelas (contoh: 10 IPA 1, XII RPL).'
      });
      return;
    }

    try {
      if (editingClass) {
        dbService.updateClass(editingClass.id, {
          nama_kelas: formData.nama_kelas.trim(),
          wali_kelas_id: formData.wali_kelas_id,
          tahun_ajaran: formData.tahun_ajaran.trim()
        });

        Swal.fire({
          icon: 'success',
          title: 'Kelas Diperbarui',
          text: `Data kelas ${formData.nama_kelas} berhasil diperbarui dan disinkronkan ke Firebase.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        dbService.createClass({
          nama_kelas: formData.nama_kelas.trim(),
          wali_kelas_id: formData.wali_kelas_id,
          tahun_ajaran: formData.tahun_ajaran.trim()
        });

        Swal.fire({
          icon: 'success',
          title: 'Kelas Ditambahkan',
          text: `Kelas baru ${formData.nama_kelas} berhasil dibuat dan disinkronkan ke Firebase.`,
          timer: 2000,
          showConfirmButton: false
        });
      }

      setIsAddEditModalOpen(false);
      setDataVersion(v => v + 1);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Kelas',
        text: err.message || 'Terjadi kesalahan saat menyimpan data kelas.'
      });
    }
  };

  const handleDeleteClass = (cls: ClassEntity) => {
    const studentCount = (classStudentsMap[cls.id] || []).length;

    Swal.fire({
      title: `Hapus Kelas ${cls.nama_kelas}?`,
      html: `
        <div class="text-left text-sm text-slate-600 dark:text-slate-300 space-y-2">
          <p>Tindakan ini akan menghapus kelas secara permanen dari basis data dan cloud Firebase.</p>
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300">
            <strong>Perhatian:</strong> Terdapat <b>${studentCount} siswa</b> yang saat ini terdaftar di kelas ini. Status pendaftaran siswa akan direset menjadi tanpa kelas.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Kelas',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        try {
          dbService.deleteClass(cls.id);
          setDataVersion(v => v + 1);
          if (onRefresh) onRefresh();
          Swal.fire({
            icon: 'success',
            title: 'Kelas Dihapus',
            text: `Kelas ${cls.nama_kelas} berhasil dihapus dari sistem.`,
            timer: 2000,
            showConfirmButton: false
          });
        } catch (err: any) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: err.message || 'Terjadi kesalahan saat menghapus kelas.'
          });
        }
      }
    });
  };

  const handleAssignStudent = (classId: string, studentId: string, studentName: string) => {
    try {
      dbService.assignStudentToClass(classId, studentId);
      setDataVersion(v => v + 1);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menambahkan Siswa',
        text: err.message
      });
    }
  };

  const handleRemoveStudent = (classId: string, studentId: string, studentName: string) => {
    try {
      dbService.removeStudentFromClass(classId, studentId);
      setDataVersion(v => v + 1);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengeluarkan Siswa',
        text: err.message
      });
    }
  };

  const handleExportClassListCSV = (cls: ClassEntity) => {
    const students = classStudentsMap[cls.id] || [];
    const wali = rawData.users[cls.wali_kelas_id];

    let csvContent = `DAFTAR SISWA KELAS ${cls.nama_kelas.toUpperCase()}\n`;
    csvContent += `Tahun Ajaran: ${cls.tahun_ajaran}\n`;
    csvContent += `Wali Kelas: ${wali?.nama || 'Belum Ditentukan'}\n`;
    csvContent += `Total Siswa: ${students.length}\n\n`;
    csvContent += `No,NIS,Nama Lengkap,Username,Email,No WhatsApp\n`;

    students.forEach((s, idx) => {
      csvContent += `${idx + 1},"${s.nis || '-'}",` +
        `"${s.nama.replace(/"/g, '""')}",` +
        `"${s.username}",` +
        `"${s.email}",` +
        `"${s.no_wa || '-'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Siswa_${cls.nama_kelas.replace(/\s+/g, '_')}_${cls.tahun_ajaran.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Kelas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalClassesCount}</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Rombongan belajar aktif</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Siswa Terdaftar</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalAssignedStudents}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {unassignedStudents.length > 0 ? `${unassignedStudents.length} siswa belum ada kelas` : 'Semua siswa terdistribusi'}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Wali Kelas Bertugas</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{homeroomCount} / {totalClassesCount}</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Kelas dengan pembimbing</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{averageStudentsPerClass}</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Siswa per rombel</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Controls & Search Bar Header */}
        <div className="p-4 md:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Manajemen Kelas & Roster Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola pembagian rombongan belajar, penugasan wali kelas, dan daftar anggota siswa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kelas Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Search Bar & Category Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pencarian cepat kelas, tahun ajaran, wali kelas, atau nama siswa..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setGradeFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  gradeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Semua ({allClasses.length})
              </button>
              <button
                type="button"
                onClick={() => setGradeFilter('10')}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  gradeFilter === '10'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Kelas 10
              </button>
              <button
                type="button"
                onClick={() => setGradeFilter('11')}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  gradeFilter === '11'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Kelas 11
              </button>
              <button
                type="button"
                onClick={() => setGradeFilter('12')}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  gradeFilter === '12'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Kelas 12
              </button>
              <button
                type="button"
                onClick={() => setGradeFilter('has_homeroom')}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  gradeFilter === 'has_homeroom'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Ada Wali
              </button>
            </div>
          </div>

          {/* Search Result Counter & Active Query Pill */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan <b className="text-slate-800 dark:text-slate-200">{filteredClasses.length}</b> dari {allClasses.length} kelas
              </span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                  Kata kunci: "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'nama_kelas') setSortAsc(!sortAsc);
                  else {
                    setSortField('nama_kelas');
                    setSortAsc(true);
                  }
                }}
                className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3" />
                Urut: {sortField === 'nama_kelas' ? 'Nama Kelas' : sortField === 'student_count' ? 'Jml Siswa' : 'Tahun'} ({sortAsc ? 'A-Z' : 'Z-A'})
              </button>
            </div>
          </div>
        </div>

        {/* Classes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Nama Kelas</th>
                <th className="px-4 py-3.5">Tahun Ajaran</th>
                <th className="px-4 py-3.5">Wali Kelas</th>
                <th className="px-4 py-3.5">Jumlah Siswa</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <School className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Kelas Tidak Ditemukan</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? `Tidak ada kelas yang cocok dengan kata kunci "${searchQuery}".` : 'Belum ada kelas yang terdaftar di sistem.'}
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setGradeFilter('all');
                          }}
                          className="mt-2 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, idx) => {
                  const students = classStudentsMap[cls.id] || [];
                  const wali = rawData.users[cls.wali_kelas_id];

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                            {cls.nama_kelas.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{cls.nama_kelas}</span>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {cls.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {cls.tahun_ajaran}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {wali ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                              {wali.nama.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white leading-tight">{wali.nama}</div>
                              <div className="text-[10px] text-slate-400">@{wali.username}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                            <UserX className="w-3 h-3" />
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900 dark:text-white">{students.length} Siswa</span>
                            <span className="text-slate-400 text-[10px]">Kapasitas ~36</span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (students.length / 36) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedClassForRoster(cls)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition cursor-pointer"
                            title="Kelola Daftar Siswa / Roster"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportClassListCSV(cls)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition cursor-pointer"
                            title="Ekspor CSV Daftar Siswa"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cls)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit Data Kelas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Kelas */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {editingClass ? 'Edit Informasi Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_kelas}
                  onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                  placeholder="Contoh: 10 IPA 1, 11 IPS 2, XII RPL"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tahun_ajaran}
                  onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                  placeholder="Contoh: 2024/2025"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Penugasan Wali Kelas
                </label>
                <select
                  value={formData.wali_kelas_id}
                  onChange={(e) => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tanpa Wali Kelas (Dapat Diatur Nanti) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} ({t.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru'}) - @{t.username}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pilih guru yang bertanggung jawab sebagai wali kelas untuk rombongan belajar ini.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Buat Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kelola Daftar Anggota Siswa (Roster) */}
      {selectedClassForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Roster Siswa Kelas {selectedClassForRoster.nama_kelas}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tahun Ajaran: {selectedClassForRoster.tahun_ajaran} • Total: {(classStudentsMap[selectedClassForRoster.id] || []).length} Siswa Terdaftar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassForRoster(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Split into 2 columns (Current Students vs Add Unassigned Students) */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-y-auto flex-1">
              {/* Column 1: Current Students in this class */}
              <div className="p-4 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Siswa dalam Kelas ({ (classStudentsMap[selectedClassForRoster.id] || []).length })
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExportClassListCSV(selectedClassForRoster)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>

                {/* Search within class */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={rosterSearchQuery}
                    onChange={(e) => setRosterSearchQuery(e.target.value)}
                    placeholder="Cari siswa dalam kelas..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* List of current students */}
                <div className="space-y-1.5 overflow-y-auto max-h-72 pr-1 flex-1">
                  {(classStudentsMap[selectedClassForRoster.id] || [])
                    .filter(s => {
                      const q = rosterSearchQuery.toLowerCase();
                      return !q || s.nama.toLowerCase().includes(q) || (s.nis && s.nis.includes(q)) || s.username.toLowerCase().includes(q);
                    })
                    .map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-slate-400 font-mono w-4 text-center">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{s.nama}</p>
                            <p className="text-[10px] text-slate-400 truncate">NIS: {s.nis || '-'} • @{s.username}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(selectedClassForRoster.id, s.id, s.nama)}
                          className="px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition cursor-pointer shrink-0"
                          title="Keluarkan dari kelas"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  {(classStudentsMap[selectedClassForRoster.id] || []).length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Belum ada siswa di kelas ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Unassigned Students (Available to Add) */}
              <div className="p-4 space-y-3 flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Siswa Belum Ada Kelas ({unassignedStudents.length})
                  </span>
                </div>

                {/* Search unassigned */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={unassignedSearchQuery}
                    onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                    placeholder="Cari siswa untuk dimasukkan..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* List of available unassigned students */}
                <div className="space-y-1.5 overflow-y-auto max-h-72 pr-1 flex-1">
                  {unassignedStudents
                    .filter(s => {
                      const q = unassignedSearchQuery.toLowerCase();
                      return !q || s.nama.toLowerCase().includes(q) || (s.nis && s.nis.includes(q)) || s.username.toLowerCase().includes(q);
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-2 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{s.nama}</p>
                          <p className="text-[10px] text-slate-400 truncate">NIS: {s.nis || '-'} • @{s.username}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssignStudent(selectedClassForRoster.id, s.id, s.nama)}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      </div>
                    ))}
                  {unassignedStudents.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Semua siswa sudah terdaftar di kelas.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedClassForRoster(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 transition cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
