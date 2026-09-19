import React, { useState, useMemo } from 'react';
import { DatabaseService } from '../services/databaseService';
import { UserRole, User, ClassEntity } from '../types';
import Swal from 'sweetalert2';
import {
  KeyRound,
  UserCheck,
  Sparkles,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Users,
  Shield,
  GraduationCap,
  Sliders,
  FileSpreadsheet,
  ArrowRight,
  Eye,
  EyeOff,
  CheckSquare,
  Square
} from 'lucide-react';

interface BulkUserAccountManagerProps {
  onUpdateSuccess: () => void;
}

interface AccountDraft {
  user: User;
  className?: string;
  newUsername?: string;
  newPassword?: string;
}

export const BulkUserAccountManager: React.FC<BulkUserAccountManagerProps> = ({ onUpdateSuccess }) => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const allUsers = dbService.getAllUsers();

  // Target Filter State
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Password Generator State
  const [passwordPattern, setPasswordPattern] = useState<'role_random' | 'school_random' | 'custom_uniform' | 'alphanumeric' | 'numeric_pin'>('role_random');
  const [customPasswordText, setCustomPasswordText] = useState<string>('pass123');

  // Username Generator State
  const [usernamePattern, setUsernamePattern] = useState<'clean_name' | 'role_prefix' | 'custom_sequence' | 'email_prefix'>('clean_name');
  const [customUsernamePrefix, setCustomUsernamePrefix] = useState<string>('user');

  // Proposed Changes Map: userId -> { newUsername?: string, newPassword?: string }
  const [proposedChanges, setProposedChanges] = useState<Map<string, { newUsername?: string; newPassword?: string }>>(new Map());
  const [showPlainPasswords, setShowPlainPasswords] = useState<boolean>(true);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      // Role match
      if (selectedRole !== 'all' && u.role !== selectedRole) return false;

      // Class match
      if (selectedClassId !== 'all') {
        const classMembers = dbService.getStudentsInClass(selectedClassId);
        const inClass = classMembers.some(m => m.id === u.id);
        if (!inClass) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.nama.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesUsername = u.username?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesUsername) return false;
      }

      return true;
    });
  }, [allUsers, selectedRole, selectedClassId, searchQuery, dbService]);

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleToggleUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  // Helper to get class name of user
  const getUserClassName = (user: User): string => {
    if (user.role === 'siswa') {
      const cls = dbService.getStudentClass(user.id);
      return cls ? cls.nama_kelas : '-';
    }
    if (user.role === 'wali_kelas') {
      const cls = dbService.getHomeroomClass(user.id);
      return cls ? `Wali: ${cls.nama_kelas}` : '-';
    }
    return '-';
  };

  // --- BULK PASSWORD GENERATION LOGIC ---
  const handleGeneratePasswords = () => {
    if (selectedUserIds.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Akun',
        text: 'Silakan centang satu atau lebih pengguna untuk diubah kata sandinya.'
      });
      return;
    }

    const nextProposed = new Map(proposedChanges);
    let sequenceCounter = 1;

    filteredUsers.forEach(u => {
      if (selectedUserIds.has(u.id)) {
        let generatedPass = '';
        const random4Digit = Math.floor(1000 + Math.random() * 9000);
        const random6Digit = Math.floor(100000 + Math.random() * 900000);

        if (passwordPattern === 'role_random') {
          generatedPass = `${u.role}_${random4Digit}`;
        } else if (passwordPattern === 'school_random') {
          generatedPass = `simak2026_${random4Digit}`;
        } else if (passwordPattern === 'custom_uniform') {
          generatedPass = customPasswordText || 'pass123';
        } else if (passwordPattern === 'alphanumeric') {
          const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          generatedPass = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } else if (passwordPattern === 'numeric_pin') {
          generatedPass = `${random6Digit}`;
        }

        const existingProp = nextProposed.get(u.id) || {};
        nextProposed.set(u.id, {
          ...existingProp,
          newPassword: generatedPass
        });
      }
    });

    setProposedChanges(nextProposed);

    Swal.fire({
      icon: 'success',
      title: 'Pratinjau Kata Sandi Dibuat!',
      text: `Berhasil meng-generate ${selectedUserIds.size} password baru. Periksa tabel di bawah sebelum menerapkan.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // --- BULK USERNAME GENERATION LOGIC ---
  const handleGenerateUsernames = () => {
    if (selectedUserIds.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Akun',
        text: 'Silakan centang satu atau lebih pengguna untuk diubah username-nya.'
      });
      return;
    }

    const nextProposed = new Map(proposedChanges);
    let seq = 1;

    filteredUsers.forEach(u => {
      if (selectedUserIds.has(u.id)) {
        let generatedUname = '';

        if (usernamePattern === 'clean_name') {
          // e.g. "Budi Santoso, S.Kom" -> "budi.santoso"
          const clean = u.nama
            .toLowerCase()
            .replace(/,\s*[a-z.\s]+/g, '') // remove degree suffixes like ", S.Kom", ", M.Pd"
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .join('.');
          generatedUname = clean || `user_${u.id.slice(-4)}`;
        } else if (usernamePattern === 'role_prefix') {
          const prefix = u.role === 'siswa' ? 'std' : (u.role === 'guru' ? 'guru' : (u.role === 'wali_kelas' ? 'wali' : (u.role === 'orang_tua' ? 'ortu' : 'adm')));
          const firstName = u.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
          generatedUname = `${prefix}_${firstName}`;
        } else if (usernamePattern === 'custom_sequence') {
          const padSeq = String(seq).padStart(3, '0');
          generatedUname = `${customUsernamePrefix || 'user'}_${padSeq}`;
          seq++;
        } else if (usernamePattern === 'email_prefix') {
          generatedUname = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        }

        // Avoid blank
        if (!generatedUname) generatedUname = `user_${u.id.slice(-4)}`;

        const existingProp = nextProposed.get(u.id) || {};
        nextProposed.set(u.id, {
          ...existingProp,
          newUsername: generatedUname
        });
      }
    });

    setProposedChanges(nextProposed);

    Swal.fire({
      icon: 'success',
      title: 'Pratinjau Username Dibuat!',
      text: `Berhasil meng-generate ${selectedUserIds.size} username baru. Periksa tabel di bawah sebelum menerapkan.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Clear proposed changes
  const handleResetProposed = () => {
    setProposedChanges(new Map());
  };

  // --- APPLY PROPOSED CHANGES TO DATABASE & FIRESTORE ---
  const handleApplyBatchChanges = async () => {
    if (proposedChanges.size === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Perubahan',
        text: 'Silakan generate password atau username baru terlebih dahulu.'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Terapkan Perubahan Massal?',
      html: `
        <div class="text-xs text-left text-slate-600 dark:text-slate-300 space-y-2 mt-1">
          <p>Anda akan memperbarui kredensial untuk <strong>${proposedChanges.size} akun pengguna</strong>.</p>
          <div class="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
            ⚠️ Perubahan ini akan langsung berlaku di database lokal dan tersinkronisasi otomatis ke Firebase.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Terapkan Sekarang',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      const updates = Array.from(proposedChanges.entries()).map(([userId, val]) => ({
        userId,
        newUsername: val.newUsername,
        newPassword: val.newPassword
      }));

      const res = dbService.bulkUpdateUserCredentials(updates);

      if (res.success) {
        setProposedChanges(new Map());
        onUpdateSuccess();

        Swal.fire({
          icon: 'success',
          title: 'Perubahan Massal Berhasil Diterapkan!',
          text: `${res.count} akun pengguna telah diperbarui dan disinkronkan.`,
          confirmButtonColor: '#7c3aed'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memperbarui',
          text: 'Tidak ada akun yang diubah atau terjadi kesalahan.'
        });
      }
    }
  };

  // Prepare cards data for print / export
  const getSelectedUsersWithProposed = () => {
    const list = selectedUserIds.size > 0
      ? filteredUsers.filter(u => selectedUserIds.has(u.id))
      : filteredUsers;

    return list.map(u => {
      const prop = proposedChanges.get(u.id);
      return {
        id: u.id,
        nama: u.nama,
        role: u.role,
        username: prop?.newUsername || u.username || u.email.split('@')[0],
        password_hash: prop?.newPassword || u.password_hash || 'pass123',
        className: getUserClassName(u),
        no_wa: u.no_wa
      };
    });
  };

  // Print PDF Login Cards
  const handlePrintLoginCards = () => {
    const data = getSelectedUsersWithProposed();
    dbService.exportUserCredentialsPDF(data);
  };

  // Export CSV Credentials Sheet
  const handleExportCredentialsCSV = () => {
    const data = getSelectedUsersWithProposed();
    dbService.exportUserCredentialsCSV(data);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5 text-purple-200" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pengaturan Massal Username & Kata Sandi Akun
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Generate password dan username massal, reset kredensial per kelas/role, serta cetak kartu login siswa dan guru.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPlainPasswords(!showPlainPasswords)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            {showPlainPasswords ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-purple-600" />}
            <span>{showPlainPasswords ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}</span>
          </button>
        </div>
      </div>

      {/* Target Filtering & Search Card */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            <span>1. Tentukan Sasaran Akun Pengguna</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Ditemukan <strong>{filteredUsers.length}</strong> akun ({selectedUserIds.size} dipilih)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Filter Peran (Role)
            </label>
            <select
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                setSelectedUserIds(new Set());
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Peran ({allUsers.length})</option>
              <option value="siswa">Khusus Siswa ({allUsers.filter(u => u.role === 'siswa').length})</option>
              <option value="guru">Khusus Guru ({allUsers.filter(u => u.role === 'guru').length})</option>
              <option value="wali_kelas">Khusus Wali Kelas ({allUsers.filter(u => u.role === 'wali_kelas').length})</option>
              <option value="orang_tua">Khusus Orang Tua ({allUsers.filter(u => u.role === 'orang_tua').length})</option>
              <option value="admin">Khusus Admin ({allUsers.filter(u => u.role === 'admin').length})</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Filter Kelas Siswa
            </label>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSelectedUserIds(new Set());
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.nama_kelas} ({c.tahun_ajaran})
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Cari Nama / Email / Username
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci pencarian..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>Batal Pilih Semua</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-slate-500" />
                <span>Pilih Semua Akun ({filteredUsers.length})</span>
              </>
            )}
          </button>

          {selectedUserIds.size > 0 && (
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              ✓ {selectedUserIds.size} akun terpilih
            </span>
          )}
        </div>
      </div>

      {/* Generator Tools: Two Columns (Password & Username) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Column 1: Bulk Password Generator */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-600" />
              <span>2. Generator Kata Sandi (Password Massal)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold">
              Bulk Password
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Pola Format Kata Sandi:
            </label>
            <select
              value={passwordPattern}
              onChange={e => setPasswordPattern(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="role_random">Format Role + 4 Angka Acak (misal: siswa_4920, guru_8192)</option>
              <option value="school_random">Format SIMAK 2026 + 4 Angka Acak (misal: simak2026_5821)</option>
              <option value="custom_uniform">Kata Sandi Seragam / Kustom (misal: pass123, Smk#2026)</option>
              <option value="alphanumeric">Alfanumerik Acak Kuat 8 Karakter (misal: k9Xp2mQ7)</option>
              <option value="numeric_pin">PIN 6 Digit Angka (misal: 839201)</option>
            </select>

            {passwordPattern === 'custom_uniform' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customPasswordText}
                  onChange={e => setCustomPasswordText(e.target.value)}
                  placeholder="Masukkan kata sandi seragam..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGeneratePasswords}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span>Generate Pratinjau Password ({selectedUserIds.size || filteredUsers.length} Akun)</span>
          </button>
        </div>

        {/* Column 2: Bulk Username Generator */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>3. Generator & Normalisasi Username Massal</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
              Bulk Username
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Pola Format Username:
            </label>
            <select
              value={usernamePattern}
              onChange={e => setUsernamePattern(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="clean_name">Nama Lengkap Bersih (misal: budi.santoso, siti.aisyah)</option>
              <option value="role_prefix">Prefix Role + Nama Depan (misal: std_rizky, guru_dewi)</option>
              <option value="custom_sequence">Prefix Kustom + Nomor Urut 3-Digit (misal: smk2026_001)</option>
              <option value="email_prefix">Berdasarkan Awalan Alamat Email</option>
            </select>

            {usernamePattern === 'custom_sequence' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customUsernamePrefix}
                  onChange={e => setCustomUsernamePrefix(e.target.value)}
                  placeholder="Awalan username kustom (misal: smkn1_2026)..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateUsernames}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Generate Pratinjau Username ({selectedUserIds.size || filteredUsers.length} Akun)</span>
          </button>
        </div>

      </div>

      {/* Changes Status Bar & Action Controls */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
            {proposedChanges.size}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {proposedChanges.size > 0
                ? `${proposedChanges.size} Akun Memiliki Rencana Perubahan Kredensial`
                : 'Belum Ada Perubahan Kredensial yang Digenerate'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {proposedChanges.size > 0
                ? 'Klik tombol terapkan di samping untuk menyimpan secara permanen.'
                : 'Pilih akun dan jalankan generator password / username di atas.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {proposedChanges.size > 0 && (
            <button
              type="button"
              onClick={handleResetProposed}
              className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pratinjau</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCredentialsCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Ekspor daftar username & password ke file CSV/Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Lembar Akun (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLoginCards}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Cetak kartu login siswa & guru format A4 siap gunting"
          >
            <Printer className="w-3.5 h-3.5 text-blue-200" />
            <span>Cetak Slip Login (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleApplyBatchChanges}
            disabled={proposedChanges.size === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terapkan Perubahan Massal</span>
          </button>
        </div>
      </div>

      {/* Interactive Accounts Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Daftar Akun Pengguna ({filteredUsers.length} Terdata)</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Periksa kolom <strong>Username Baru</strong> & <strong>Password Baru</strong> sebelum disimpan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Nama Lengkap & Kontak</th>
                <th className="py-2.5 px-3 text-center">Role Akses</th>
                <th className="py-2.5 px-3">Kelas / Keterangan</th>
                <th className="py-2.5 px-3">Username (ID Login)</th>
                <th className="py-2.5 px-3">Kata Sandi (Password)</th>
                <th className="py-2.5 px-3 text-center">Status Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada akun pengguna yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedUserIds.has(user.id);
                  const proposed = proposedChanges.get(user.id);
                  const className = getUserClassName(user);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUser(user.id)}
                          className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {user.nama}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {user.email} {user.no_wa && user.no_wa !== '-' ? `• WA: ${user.no_wa}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                          user.role === 'guru' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                          user.role === 'wali_kelas' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                          user.role === 'siswa' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {className}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {proposed?.newUsername ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            <span className="line-through text-slate-400 font-normal">@{user.username || user.email.split('@')[0]}</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>@{proposed.newUsername}</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            @{user.username || user.email.split('@')[0]}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {proposed?.newPassword ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                            <span className="line-through text-slate-400 font-normal">
                              {showPlainPasswords ? (user.password_hash || 'pass123') : '••••••••'}
                            </span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>
                              {showPlainPasswords ? proposed.newPassword : '••••••••'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            {showPlainPasswords ? (user.password_hash || 'pass123') : '••••••••'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {proposed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Siap Disimpan
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
