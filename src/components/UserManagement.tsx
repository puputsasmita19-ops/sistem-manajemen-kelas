import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { User, UserRole, ClassEntity } from '../types';
import { AppSettingsManager } from './AppSettingsManager';
import { BulkUserAccountManager } from './BulkUserAccountManager';
import { MultiRoleExportImportModal } from './MultiRoleExportImportModal';
import { ClassManagement } from './ClassManagement';
import { Pagination } from './Pagination';
import Swal from 'sweetalert2';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  Phone,
  Mail,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle,
  AlertTriangle,
  FileText,
  X,
  Settings,
  User as UserIcon,
  KeyRound,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Users,
  School,
  Clock,
  AlertCircle,
  Activity,
  UserX,
  CalendarCheck
} from 'lucide-react';

export interface UserManagementProps {
  onNavigateTab?: (tab: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNavigateTab }) => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const [activeAdminView, setActiveAdminView] = useState<'users' | 'classes' | 'bulk_credentials' | 'settings'>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_USER_ADMIN_VIEW');
      if (saved === 'users' || saved === 'classes' || saved === 'bulk_credentials' || saved === 'settings') return saved;
    } catch (e) {}
    return 'users';
  });
  const [users, setUsers] = useState<User[]>(dbService.getAllUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_USER_ROLE_FILTER');
      if (saved) return saved;
    } catch (e) {}
    return 'all';
  });
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_USER_ACTIVITY_FILTER');
      if (saved === 'all' || saved === 'active' || saved === 'inactive') return saved;
    } catch (e) {}
    return 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('SIMAK_USER_ADMIN_VIEW', activeAdminView);
    } catch (e) {}
  }, [activeAdminView]);

  useEffect(() => {
    try {
      localStorage.setItem('SIMAK_USER_ROLE_FILTER', roleFilter);
    } catch (e) {}
  }, [roleFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('SIMAK_USER_ACTIVITY_FILTER', activityFilter);
    } catch (e) {}
  }, [activityFilter]);

  // Helper to determine if an account is considered inactive
  const isInactiveUser = (user: User) => {
    if (!user.last_login) return true;
    const loginTime = new Date(user.last_login).getTime();
    if (isNaN(loginTime)) return true;
    const daysDiff = (Date.now() - loginTime) / (1000 * 60 * 60 * 24);
    return daysDiff > 14; // Tidak login > 14 hari atau belum pernah login
  };

  // Helper to format last_login timestamp and return relative metadata
  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) {
      return {
        formatted: 'Belum Pernah',
        full: 'Pengguna belum pernah login ke sistem',
        relative: 'Belum Pernah Login',
        type: 'never' as const
      };
    }
    const date = new Date(lastLogin);
    if (isNaN(date.getTime())) {
      return {
        formatted: 'Belum Pernah',
        full: 'Pengguna belum pernah login ke sistem',
        relative: 'Belum Pernah Login',
        type: 'never' as const
      };
    }

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (diffMins < 60) {
      return {
        formatted: `${formattedTime} WIB`,
        full: `${formattedDate}, ${formattedTime} WIB`,
        relative: diffMins <= 1 ? 'Baru saja' : `${diffMins} mnt lalu`,
        type: 'recent' as const
      };
    } else if (diffHours < 24) {
      return {
        formatted: `Hari ini, ${formattedTime}`,
        full: `${formattedDate}, ${formattedTime} WIB`,
        relative: `${diffHours} jam lalu`,
        type: 'recent' as const
      };
    } else if (diffDays <= 7) {
      return {
        formatted: formattedDate,
        full: `${formattedDate}, ${formattedTime} WIB`,
        relative: `${diffDays} hari lalu`,
        type: 'week' as const
      };
    } else if (diffDays <= 30) {
      return {
        formatted: formattedDate,
        full: `${formattedDate}, ${formattedTime} WIB`,
        relative: `${diffDays} hari lalu`,
        type: 'month' as const
      };
    } else {
      return {
        formatted: formattedDate,
        full: `${formattedDate}, ${formattedTime} WIB`,
        relative: `${diffDays} hari lalu`,
        type: 'inactive' as const
      };
    }
  };

  // Modal State for Single User Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    email: '',
    role: 'siswa' as UserRole,
    no_wa: '',
    password_hash: 'pass123'
  });

  // Modal State for Multi-Role Export / Import
  const [isMultiRoleModalOpen, setIsMultiRoleModalOpen] = useState(false);
  const [multiRoleModalTab, setMultiRoleModalTab] = useState<'export' | 'import'>('export');

  const reload = () => {
    setUsers(dbService.getAllUsers());
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.trim().toLowerCase();
    
    let matchSearch = true;
    if (q) {
      const matchName = u.nama.toLowerCase().includes(q);
      const matchUsername = Boolean(u.username && u.username.toLowerCase().includes(q));
      const matchEmail = Boolean(u.email && u.email.toLowerCase().includes(q));
      const matchPhone = Boolean(u.no_wa && u.no_wa.includes(q));
      const matchNis = Boolean(u.nis && u.nis.toLowerCase().includes(q));
      const matchId = u.id.toLowerCase().includes(q);
      const matchRoleName = u.role.toLowerCase().includes(q);

      let matchClass = false;
      if (u.role === 'siswa') {
        const studentClass = dbService.getStudentClass(u.id);
        if (studentClass && studentClass.nama_kelas.toLowerCase().includes(q)) {
          matchClass = true;
        }
      } else if (u.role === 'wali_kelas') {
        const homeroom = dbService.getHomeroomClass(u.id);
        if (homeroom && homeroom.nama_kelas.toLowerCase().includes(q)) {
          matchClass = true;
        }
      }

      matchSearch = matchName || matchUsername || matchEmail || matchPhone || matchNis || matchId || matchRoleName || matchClass;
    }

    const matchRole = roleFilter === 'all' || u.role === roleFilter;

    let matchActivity = true;
    if (activityFilter === 'active') {
      matchActivity = !isInactiveUser(u);
    } else if (activityFilter === 'inactive') {
      matchActivity = isInactiveUser(u);
    }

    return matchSearch && matchRole && matchActivity;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, activityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedUsers = filteredUsers.slice(
    (validCurrentPage - 1) * itemsPerPage,
    validCurrentPage * itemsPerPage
  );

  // Batch Action Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchTargetRole, setBatchTargetRole] = useState<UserRole>('siswa');

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllVisible = () => {
    const selectableUsers = paginatedUsers.filter(u => u.role !== 'admin');
    const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedUserIds.includes(u.id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !selectableUsers.some(u => u.id === id)));
    } else {
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...selectableUsers.map(u => u.id)])));
    }
  };

  const handleSelectAllFiltered = () => {
    const selectableUsers = filteredUsers.filter(u => u.role !== 'admin');
    setSelectedUserIds(selectableUsers.map(u => u.id));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedUserIds.length === 0) return;

    Swal.fire({
      title: `⚠️ Hapus Massal ${selectedUserIds.length} Pengguna?`,
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200">
            <strong>PERINGATAN BATCH ACTION:</strong> Anda akan menghapus <strong>${selectedUserIds.length} akun pengguna</strong> sekaligus.
            <br/>Akun Administrator Utama terlindungi otomatis dari penghapusan massal.
          </div>
          <p class="font-medium text-slate-700 dark:text-slate-200">
            Ketik kata <strong class="text-rose-600 dark:text-rose-400 font-mono">HAPUS MASSAL</strong> untuk konfirmasi:
          </p>
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Ketik "HAPUS MASSAL" di sini...',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Semua Terpilih',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (value !== 'HAPUS MASSAL') {
          return 'Ketik kata "HAPUS MASSAL" (huruf kapital) untuk konfirmasi!';
        }
      }
    }).then(result => {
      if (result.isConfirmed) {
        const res = dbService.batchDeleteUsers(selectedUserIds);
        setSelectedUserIds([]);
        reload();
        Swal.fire({
          icon: 'success',
          title: 'Batch Action Selesai',
          text: `Berhasil menghapus ${res.deletedCount} akun. ${res.skippedAdminCount > 0 ? `(${res.skippedAdminCount} akun admin terlindungi dilewati).` : ''}`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  };

  const handleBatchChangeRole = (newRole: UserRole) => {
    if (selectedUserIds.length === 0) return;

    Swal.fire({
      title: `Ubah Peran Massal?`,
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <p>
            Anda akan mengubah peran <strong>${selectedUserIds.length} pengguna</strong> terpilih menjadi <strong class="text-purple-600 dark:text-purple-400 font-bold uppercase">${newRole}</strong>.
          </p>
          <div class="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200">
            Perubahan hak akses akan segera berlaku pada login berikutnya untuk masing-masing akun.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#64748B',
      confirmButtonText: `Ya, Ubah Menjadi ${newRole.toUpperCase()}`,
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        const res = dbService.batchUpdateUserRole(selectedUserIds, newRole);
        setSelectedUserIds([]);
        reload();
        Swal.fire({
          icon: 'success',
          title: 'Peran Berhasil Diperbarui',
          text: `Berhasil memperbarui peran untuk ${res.updatedCount} akun.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({
      nama: '',
      username: '',
      email: '',
      role: 'siswa',
      no_wa: '',
      password_hash: 'pass123'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      nama: user.nama,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      role: user.role,
      no_wa: user.no_wa || '',
      password_hash: user.password_hash || 'pass123'
    });
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    if (user.role === 'admin' && (user.id === 'user-admin' || user.id === 'user_admin1' || user.email === 'admin@sekolah.id' || user.username === 'admin')) {
      Swal.fire({
        icon: 'error',
        title: 'Akun Dilindungi',
        text: 'Akun Administrator Utama sistem tidak dapat dihapus untuk menjaga stabilitas akses sekolah.'
      });
      return;
    }

    Swal.fire({
      title: `⚠️ Hapus Pengguna: ${user.nama}?`,
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200">
            <strong>PERINGATAN:</strong> Anda akan menghapus akun <strong>${user.nama}</strong> (Peran: ${user.role.toUpperCase()}).
            <br/>Semua data relasi kelas dan keterlibatan akun ini akan dibersihkan secara permanen.
          </div>
          <p class="font-medium text-slate-700 dark:text-slate-200">
            Untuk mencegah penghapusan secara tidak sengaja, silakan ketik kata <strong class="text-rose-600 dark:text-rose-400 font-mono">HAPUS</strong> pada kotak berikut:
          </p>
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Ketik "HAPUS" di sini...',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (value !== 'HAPUS') {
          return 'Ketik kata "HAPUS" (huruf kapital) untuk konfirmasi!';
        }
      }
    }).then(result => {
      if (result.isConfirmed) {
        dbService.deleteUser(user.id);
        reload();
        Swal.fire({
          icon: 'success',
          title: 'Akun Berhasil Dihapus',
          text: `Pengguna ${user.nama} telah dibersihkan dari database sistem.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.email.trim()) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Nama dan Email wajib diisi!' });
      return;
    }

    try {
      if (editingUserId) {
        dbService.updateUser(editingUserId, formData);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Diperbarui!',
          text: `Data ${formData.nama} telah diperbarui.`,
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        dbService.createUser(formData);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Dibuat!',
          text: `Pengguna baru ${formData.nama} berhasil didaftarkan.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
      setIsModalOpen(false);
      reload();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Terjadi kesalahan sistem' });
    }
  };

  const handleOpenExportModal = () => {
    setMultiRoleModalTab('export');
    setIsMultiRoleModalOpen(true);
  };

  const handleOpenImportModal = () => {
    setMultiRoleModalTab('import');
    setIsMultiRoleModalOpen(true);
  };

  const renderRoleBadge = (role: UserRole) => {
    const isFiltered = roleFilter === role;
    const baseClasses = "text-xs px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition inline-flex items-center gap-1 hover:opacity-90";
    
    switch (role) {
      case 'admin':
        return (
          <button
            type="button"
            onClick={() => setRoleFilter(isFiltered ? 'all' : 'admin')}
            title={`Role Admin - Klik untuk ${isFiltered ? 'menghapus filter' : 'filter role ini'}`}
            className={`${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border ${
              isFiltered ? 'border-purple-600 ring-2 ring-purple-400' : 'border-purple-200 dark:border-purple-800'
            }`}
          >
            <span>Admin</span>
            {isFiltered && <span className="text-[10px] ml-0.5">✓</span>}
          </button>
        );
      case 'wali_kelas':
        return (
          <button
            type="button"
            onClick={() => setRoleFilter(isFiltered ? 'all' : 'wali_kelas')}
            title={`Role Wali Kelas - Klik untuk ${isFiltered ? 'menghapus filter' : 'filter role ini'}`}
            className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border ${
              isFiltered ? 'border-blue-600 ring-2 ring-blue-400' : 'border-blue-200 dark:border-blue-800'
            }`}
          >
            <span>Wali Kelas</span>
            {isFiltered && <span className="text-[10px] ml-0.5">✓</span>}
          </button>
        );
      case 'guru':
        return (
          <button
            type="button"
            onClick={() => setRoleFilter(isFiltered ? 'all' : 'guru')}
            title={`Role Guru Mapel - Klik untuk ${isFiltered ? 'menghapus filter' : 'filter role ini'}`}
            className={`${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border ${
              isFiltered ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <span>Guru Mapel</span>
            {isFiltered && <span className="text-[10px] ml-0.5">✓</span>}
          </button>
        );
      case 'siswa':
        return (
          <button
            type="button"
            onClick={() => setRoleFilter(isFiltered ? 'all' : 'siswa')}
            title={`Role Siswa - Klik untuk ${isFiltered ? 'menghapus filter' : 'filter role ini'}`}
            className={`${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border ${
              isFiltered ? 'border-emerald-600 ring-2 ring-emerald-400' : 'border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span>Siswa</span>
            {isFiltered && <span className="text-[10px] ml-0.5">✓</span>}
          </button>
        );
      case 'orang_tua':
        return (
          <button
            type="button"
            onClick={() => setRoleFilter(isFiltered ? 'all' : 'orang_tua')}
            title={`Role Orang Tua - Klik untuk ${isFiltered ? 'menghapus filter' : 'filter role ini'}`}
            className={`${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border ${
              isFiltered ? 'border-amber-600 ring-2 ring-amber-400' : 'border-amber-200 dark:border-amber-800'
            }`}
          >
            <span>Orang Tua</span>
            {isFiltered && <span className="text-[10px] ml-0.5">✓</span>}
          </button>
        );
      default:
        return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Sub-navigation */}
      <div className="p-1.5 bg-slate-100/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveAdminView('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeAdminView === 'users'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Kelola Pengguna (Akun & Role)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminView('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeAdminView === 'classes'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Manajemen Kelas & Roster</span>
          <span className="px-1.5 py-0.2 bg-blue-500/30 text-[10px] rounded-md font-bold uppercase">
            {classes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminView('bulk_credentials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeAdminView === 'bulk_credentials'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Pengaturan Massal Username & Password</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('app_settings');
            } else {
              setActiveAdminView('settings');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
            activeAdminView === 'settings'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Identitas & Logo</span>
        </button>
      </div>

      {activeAdminView === 'settings' ? (
        <AppSettingsManager onNavigateTab={onNavigateTab} />
      ) : activeAdminView === 'classes' ? (
        <ClassManagement onRefresh={reload} />
      ) : activeAdminView === 'bulk_credentials' ? (
        <BulkUserAccountManager onUpdateSuccess={reload} />
      ) : (
        <>
          {/* Header & Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Daftar Pengguna (CRUD Admin)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                  Pengelolaan terpusat akun Admin, Wali Kelas, Guru Mapel, Siswa, dan Orang Tua pada node <code className="font-mono bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 py-0.5 rounded text-xs">/users</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Export Multi-Role CSV Button */}
                <button
                  id="btn-export-users-csv"
                  type="button"
                  onClick={handleOpenExportModal}
                  className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Ekspor Data Pengguna (Semua Role & Kelas)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Ekspor Data</span>
                </button>

                {/* Bulk Import Multi-Role CSV Button */}
                <button
                  id="btn-bulk-import-multi-role"
                  type="button"
                  onClick={handleOpenImportModal}
                  className="px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Impor Massal Pengguna Semua Role Akses (CSV)"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Impor Massal</span>
                </button>

                {/* Switch to Class Management */}
                <button
                  type="button"
                  onClick={() => setActiveAdminView('classes')}
                  className="px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Buka Manajemen Rombel & Kelas"
                >
                  <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Manajemen Kelas</span>
                </button>

                {/* Add User Button */}
                <button
                  id="btn-add-user"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>
            </div>

            {/* Enhanced Fast Search Bar & Role Filter Pills */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar with Fast Clear and Counter */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-search-user"
                    type="text"
                    placeholder="Pencarian cepat nama, username, email, WhatsApp, NIS, atau kelas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="sm:w-56">
                  <select
                    id="select-filter-role"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden cursor-pointer"
                  >
                    <option value="all">Semua Peran ({users.length})</option>
                    <option value="admin">Administrator ({users.filter(u => u.role === 'admin').length})</option>
                    <option value="wali_kelas">Wali Kelas ({users.filter(u => u.role === 'wali_kelas').length})</option>
                    <option value="guru">Guru Mapel ({users.filter(u => u.role === 'guru').length})</option>
                    <option value="siswa">Siswa ({users.filter(u => u.role === 'siswa').length})</option>
                    <option value="orang_tua">Orang Tua ({users.filter(u => u.role === 'orang_tua').length})</option>
                  </select>
                </div>

                {/* Activity & Login Status Filter Dropdown */}
                <div className="sm:w-56">
                  <select
                    id="select-filter-activity"
                    value={activityFilter}
                    onChange={e => setActivityFilter(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden cursor-pointer"
                  >
                    <option value="all">Semua Status Login</option>
                    <option value="active">Aktif (Login &lt; 14 Hari)</option>
                    <option value="inactive">Inaktif / Belum Login ({users.filter(isInactiveUser).length})</option>
                  </select>
                </div>
              </div>

              {/* Live Search Status & Quick Role / Activity Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    Menampilkan <b className="text-purple-600 dark:text-purple-400 font-bold">{filteredUsers.length}</b> dari {users.length} akun pengguna
                  </span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md text-[11px]">
                      Filter: "{searchQuery}"
                    </span>
                  )}
                  {activityFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[11px]">
                      Status: {activityFilter === 'active' ? 'Aktif' : 'Inaktif / Belum Login'}
                    </span>
                  )}
                </div>

                {/* Quick Role & Inactive Shortcut Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      roleFilter === 'all'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('siswa')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      roleFilter === 'siswa'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Siswa ({users.filter(u => u.role === 'siswa').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('guru')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      roleFilter === 'guru'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Guru ({users.filter(u => u.role === 'guru').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('wali_kelas')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      roleFilter === 'wali_kelas'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Wali Kelas ({users.filter(u => u.role === 'wali_kelas').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('orang_tua')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      roleFilter === 'orang_tua'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Orang Tua ({users.filter(u => u.role === 'orang_tua').length})
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                  {/* Inactive Quick Button */}
                  <button
                    type="button"
                    onClick={() => setActivityFilter(activityFilter === 'inactive' ? 'all' : 'inactive')}
                    title="Filter akun yang belum pernah login atau inaktif >14 hari"
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      activityFilter === 'inactive'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    <UserX className="w-3 h-3" />
                    <span>Inaktif ({users.filter(isInactiveUser).length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Action Toolbar */}
          {selectedUserIds.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-950/60 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-3.5 mt-4 shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {selectedUserIds.length}
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-100 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>{selectedUserIds.length} Siswa/Pengguna Terpilih</span>
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <span>Eksekusi tindakan massal untuk semua akun yang dicentang</span>
                    {filteredUsers.filter(u => u.role !== 'admin').length > selectedUserIds.length && (
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 rounded-md transition border border-purple-300 dark:border-purple-700 cursor-pointer"
                        title="Pilih seluruh akun di semua halaman yang cocok dengan filter saat ini"
                      >
                        Pilih Semua Halaman ({filteredUsers.filter(u => u.role !== 'admin').length} Akun)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Batch Change Role Dropdown & Button */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-800 p-1 shadow-xs">
                  <select
                    value={batchTargetRole}
                    onChange={e => setBatchTargetRole(e.target.value as UserRole)}
                    className="text-xs bg-transparent text-slate-800 dark:text-slate-200 px-2 py-1 outline-none font-semibold cursor-pointer"
                  >
                    <option value="siswa">Peran: Siswa</option>
                    <option value="guru">Peran: Guru Mapel</option>
                    <option value="wali_kelas">Peran: Wali Kelas</option>
                    <option value="orang_tua">Peran: Orang Tua</option>
                    <option value="admin">Peran: Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleBatchChangeRole(batchTargetRole)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Ubah peran untuk semua siswa/pengguna yang dicentang"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Terapkan Peran</span>
                  </button>
                </div>

                {/* Batch Delete Button */}
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Hapus permanen semua siswa/pengguna yang dicentang"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Massal ({selectedUserIds.length})</span>
                </button>

                {/* Cancel Selection */}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition mt-4">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span>Daftar Akun Pengguna ({filteredUsers.length} Entri)</span>
                {selectedUserIds.length > 0 && (
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                    {selectedUserIds.length} dipilih
                  </span>
                )}
              </div>

              {/* Table Toolbar Dropdown Filter */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <label htmlFor="table-header-role-filter" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Filter Role:
                  </label>
                  <select
                    id="table-header-role-filter"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
                  >
                    <option value="all">Semua Peran ({users.length})</option>
                    <option value="admin">Administrator ({users.filter(u => u.role === 'admin').length})</option>
                    <option value="wali_kelas">Wali Kelas ({users.filter(u => u.role === 'wali_kelas').length})</option>
                    <option value="guru">Guru Mapel ({users.filter(u => u.role === 'guru').length})</option>
                    <option value="siswa">Siswa ({users.filter(u => u.role === 'siswa').length})</option>
                    <option value="orang_tua">Orang Tua ({users.filter(u => u.role === 'orang_tua').length})</option>
                  </select>
                  {roleFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter('all')}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 ml-1 cursor-pointer flex items-center gap-0.5"
                      title="Reset filter role ke Semua"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:block">
                  Node: <span className="font-mono">users/&#123;id&#125;</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-200">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedUsers.filter(u => u.role !== 'admin').length > 0 &&
                          paginatedUsers.filter(u => u.role !== 'admin').every(u => selectedUserIds.includes(u.id))
                        }
                        onChange={handleSelectAllVisible}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                        title="Pilih semua pada halaman ini"
                      />
                    </th>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & Username</th>
                    <th className="py-3 px-4">Email & WhatsApp</th>
                    <th className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <span>Peran (Role)</span>
                        <div className="relative inline-flex items-center">
                          <select
                            id="table-column-role-filter"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className={`text-[10px] font-bold py-1 pl-2 pr-6 rounded-lg border outline-none cursor-pointer transition appearance-none ${
                              roleFilter !== 'all'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
                            }`}
                            title="Filter daftar berdasarkan peran pengguna"
                          >
                            <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Semua ({users.length})</option>
                            <option value="admin" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Admin ({users.filter(u => u.role === 'admin').length})</option>
                            <option value="wali_kelas" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Wali Kelas ({users.filter(u => u.role === 'wali_kelas').length})</option>
                            <option value="guru" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Guru Mapel ({users.filter(u => u.role === 'guru').length})</option>
                            <option value="siswa" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Siswa ({users.filter(u => u.role === 'siswa').length})</option>
                            <option value="orang_tua" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Orang Tua ({users.filter(u => u.role === 'orang_tua').length})</option>
                          </select>
                          <Filter className={`w-3 h-3 absolute right-1.5 pointer-events-none ${roleFilter !== 'all' ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Terakhir Masuk (Last Login)</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-600 dark:text-slate-300 font-medium">
                        Tidak ada pengguna yang cocok dengan pencarian / filter aktif.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, idx) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                          selectedUserIds.includes(user.id) ? 'bg-purple-50/60 dark:bg-purple-950/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          {user.role === 'admin' ? (
                            <span title="Akun Administrator Utama dilindungi" className="cursor-not-allowed">
                              <Shield className="w-3.5 h-3.5 text-slate-400 mx-auto opacity-40" />
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => handleToggleSelectUser(user.id)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                          {(validCurrentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{user.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              @{user.username || user.email.split('@')[0]}
                            </span>
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-medium">{user.id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                            <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.no_wa && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{user.no_wa}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderRoleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const info = formatLastLogin(user.last_login);
                            if (info.type === 'never') {
                              return (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-md">
                                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>Belum Pernah</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Akun inaktif / baru</span>
                                </div>
                              );
                            }
                            if (info.type === 'recent') {
                              return (
                                <div className="flex flex-col items-start gap-0.5" title={info.full}>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>{info.relative}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{info.formatted}</span>
                                </div>
                              );
                            }
                            if (info.type === 'week') {
                              return (
                                <div className="flex flex-col items-start gap-0.5" title={info.full}>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                                    <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span>{info.relative}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{info.formatted}</span>
                                </div>
                              );
                            }
                            if (info.type === 'month') {
                              return (
                                <div className="flex flex-col items-start gap-0.5" title={info.full}>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>{info.relative}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{info.formatted}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex flex-col items-start gap-0.5" title={info.full}>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>Inaktif ({info.relative})</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{info.formatted}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                              title="Edit Pengguna"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={validCurrentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[10, 25, 50, 100]}
              itemLabel="pengguna"
            />
          </div>
        </>
      )}

      {/* MODAL: MULTI-ROLE EXPORT & IMPORT */}
      <MultiRoleExportImportModal
        isOpen={isMultiRoleModalOpen}
        initialTab={multiRoleModalTab}
        onClose={() => setIsMultiRoleModalOpen(false)}
        onSuccess={() => {
          reload();
        }}
      />

      {/* MODAL: ADD / EDIT SINGLE USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700">
              {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Siti Aisyah, S.Pd"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Username (Untuk Login)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">@</span>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      placeholder="username"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">Digunakan untuk login cepat tanpa email</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Alamat Email (Akun)
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@sekolah.id"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Peran (Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="guru">Guru Mapel</option>
                    <option value="siswa">Siswa</option>
                    <option value="orang_tua">Orang Tua</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.no_wa}
                    onChange={e => setFormData({ ...formData, no_wa: e.target.value })}
                    placeholder="08123456789"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Password Hash / Sesi
                </label>
                <input
                  type="text"
                  value={formData.password_hash}
                  onChange={e => setFormData({ ...formData, password_hash: e.target.value })}
                  placeholder="Password akun"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg shadow-sm transition cursor-pointer"
                >
                  {editingUserId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
