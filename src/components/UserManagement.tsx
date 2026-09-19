import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { User, UserRole, ClassEntity } from '../types';
import { AppSettingsManager } from './AppSettingsManager';
import { BulkUserAccountManager } from './BulkUserAccountManager';
import { MultiRoleExportImportModal } from './MultiRoleExportImportModal';
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
  Sparkles
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const [activeAdminView, setActiveAdminView] = useState<'users' | 'bulk_credentials' | 'settings'>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_USER_ADMIN_VIEW');
      if (saved === 'users' || saved === 'bulk_credentials' || saved === 'settings') return saved;
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
    const matchSearch =
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

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
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Admin</span>;
      case 'wali_kelas':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Wali Kelas</span>;
      case 'guru':
        return <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Guru Mapel</span>;
      case 'siswa':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Siswa</span>;
      case 'orang_tua':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Orang Tua</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveAdminView('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminView === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Kelola Pengguna (Akun & Role)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminView('bulk_credentials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminView === 'bulk_credentials'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Pengaturan Massal Username & Password</span>
          <span className="px-1.5 py-0.2 bg-purple-500/30 text-[10px] rounded-md font-bold uppercase">
            Baru
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminView('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminView === 'settings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Identitas & Logo</span>
        </button>
      </div>

      {activeAdminView === 'settings' ? (
        <AppSettingsManager />
      ) : activeAdminView === 'bulk_credentials' ? (
        <BulkUserAccountManager onUpdateSuccess={reload} />
      ) : (
        <>
          {/* Header & Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Manajemen Pengguna (CRUD Admin)
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
                  <span>Ekspor Data (Semua Role)</span>
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
                  <span>Impor Massal (Semua Role)</span>
                </button>

                {/* Bulk Password Shortcut Button */}
                <button
                  id="btn-switch-bulk-credentials"
                  type="button"
                  onClick={() => setActiveAdminView('bulk_credentials')}
                  className="px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Atur Username & Password Massal"
                >
                  <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Atur Password Massal</span>
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

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-search-user"
                  type="text"
                  placeholder="Cari nama, username, atau email pengguna..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <select
                  id="select-filter-role"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="all">Semua Peran (All Roles)</option>
                  <option value="admin">Administrator</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="guru">Guru Mata Pelajaran</option>
                  <option value="siswa">Siswa</option>
                  <option value="orang_tua">Orang Tua / Wali</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Daftar Akun Pengguna ({filteredUsers.length} Entri)
              </div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Node Database: <span className="font-mono">users/&#123;id&#125;</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-200">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & Username</th>
                    <th className="py-3 px-4">Email & WhatsApp</th>
                    <th className="py-3 px-4 text-center">Peran (Role)</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-600 dark:text-slate-300 font-medium">
                        Tidak ada pengguna yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                          {idx + 1}
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
