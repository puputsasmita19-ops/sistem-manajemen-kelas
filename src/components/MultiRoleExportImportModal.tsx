import React, { useState, useRef, useMemo } from 'react';
import { DatabaseService } from '../services/databaseService';
import { UserRole, ClassEntity, User } from '../types';
import Swal from 'sweetalert2';
import {
  X,
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Shield,
  GraduationCap,
  Sparkles,
  KeyRound,
  Layers,
  Database,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';

interface MultiRoleExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'export' | 'import';
}

export const MultiRoleExportImportModal: React.FC<MultiRoleExportImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'export'
}) => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const allUsers = dbService.getAllUsers();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // --- EXPORT STATE ---
  const [exportRole, setExportRole] = useState<string>('all');
  const [exportClassId, setExportClassId] = useState<string>('all');
  const [exportIncludePassword, setExportIncludePassword] = useState<boolean>(true);

  // --- IMPORT STATE ---
  const [importInputMode, setImportInputMode] = useState<'file' | 'text'>('file');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRawText, setImportRawText] = useState<string>('');
  const [defaultRole, setDefaultRole] = useState<UserRole>('siswa');
  const [defaultClassId, setDefaultClassId] = useState<string>(classes[0]?.id || '');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');
  const [defaultPasswordOption, setDefaultPasswordOption] = useState<string>('auto');
  const [customDefaultPassword, setCustomDefaultPassword] = useState<string>('pass123');

  const [parsedPreviewRows, setParsedPreviewRows] = useState<Array<{
    nama: string;
    role: UserRole;
    username: string;
    email: string;
    password: string;
    no_wa: string;
    className: string;
    childName: string;
    status: 'new' | 'update' | 'skip' | 'error';
    errorMsg?: string;
  }>>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered users count for export preview
  const exportMatchingUsers = useMemo(() => {
    let list = allUsers;
    if (exportRole !== 'all') {
      list = list.filter(u => u.role === exportRole);
    }
    if (exportClassId !== 'all') {
      const classMemberStudentIds = new Set(
        dbService.getStudentsInClass(exportClassId).map(s => s.id)
      );
      list = list.filter(u => classMemberStudentIds.has(u.id));
    }
    return list;
  }, [allUsers, exportRole, exportClassId, dbService]);

  if (!isOpen) return null;

  // --- EXPORT HANDLERS ---
  const handleExecuteExportCSV = () => {
    dbService.exportUsersMultiRoleCSV({
      role: exportRole,
      classId: exportClassId,
      includePassword: exportIncludePassword
    });
  };

  const handleExecuteExportJSON = () => {
    const dataStr = JSON.stringify(exportMatchingUsers, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIMAK_Backup_Pengguna_${exportRole}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Cadangan JSON Diunduh',
      text: `Berisi ${exportMatchingUsers.length} data akun.`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  // --- PARSE CSV TEXT INTO PREVIEW ---
  const parseCSVToPreview = (csvText: string) => {
    setImportError(null);
    const lines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedPreviewRows([]);
      setImportError('Berkas CSV kosong atau hanya memiliki baris judul (header).');
      return;
    }

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (insideQuote && row[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = lines[0];
    const headerCols = parseRow(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    const findIndex = (keywords: string[]) => {
      return headerCols.findIndex(col => keywords.some(k => col.includes(k)));
    };

    const nameIdx = findIndex(['nama', 'name']);
    const roleIdx = findIndex(['role', 'peran', 'jabatan', 'tipe']);
    const userIdx = findIndex(['username', 'user', 'uname', 'login']);
    const emailIdx = findIndex(['email', 'surel', 'mail']);
    const passIdx = findIndex(['pass', 'sandi', 'password', 'pwd']);
    const phoneIdx = findIndex(['wa', 'telepon', 'phone', 'hp', 'ponsel', 'kontak']);
    const classIdx = findIndex(['kelas', 'class', 'rombel']);
    const childIdx = findIndex(['anak', 'siswa', 'child', 'student', 'terkait', 'relasi']);

    const validRoles: UserRole[] = ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua'];
    const previews: typeof parsedPreviewRows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = parseRow(line);

      const rawName = nameIdx !== -1 && nameIdx < cols.length ? cols[nameIdx] : cols[0];
      if (!rawName) continue;

      let rawEmail = emailIdx !== -1 && emailIdx < cols.length ? cols[emailIdx] : '';
      if (!rawEmail) {
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        rawEmail = `${safeName}@sekolah.sch.id`;
      }

      let rawRole: UserRole = defaultRole;
      if (roleIdx !== -1 && roleIdx < cols.length && cols[roleIdx]) {
        const candidate = cols[roleIdx].toLowerCase().trim();
        if (candidate.includes('admin')) rawRole = 'admin';
        else if (candidate.includes('wali')) rawRole = 'wali_kelas';
        else if (candidate.includes('guru') || candidate.includes('pengajar')) rawRole = 'guru';
        else if (candidate.includes('ortu') || candidate.includes('orang')) rawRole = 'orang_tua';
        else if (candidate.includes('siswa') || candidate.includes('murid')) rawRole = 'siswa';
        else if (validRoles.includes(candidate as UserRole)) rawRole = candidate as UserRole;
      }

      let rawUsername = userIdx !== -1 && userIdx < cols.length ? cols[userIdx] : '';
      if (!rawUsername) {
        rawUsername = rawEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${i}`;
      }
      rawUsername = rawUsername.toLowerCase().replace(/\s+/g, '');

      let rawPass = passIdx !== -1 && passIdx < cols.length ? cols[passIdx] : '';
      if (!rawPass) {
        if (defaultPasswordOption === 'custom') rawPass = customDefaultPassword;
        else if (rawRole === 'admin') rawPass = 'admin123';
        else if (rawRole === 'guru' || rawRole === 'wali_kelas') rawPass = 'guru123';
        else if (rawRole === 'orang_tua') rawPass = 'ortu123';
        else rawPass = 'siswa123';
      }

      const rawPhone = phoneIdx !== -1 && phoneIdx < cols.length ? cols[phoneIdx] : '-';
      const rawClass = classIdx !== -1 && classIdx < cols.length ? cols[classIdx] : (rawRole === 'siswa' ? defaultClassId : '-');
      const rawChild = childIdx !== -1 && childIdx < cols.length ? cols[childIdx] : '-';

      // Check existing
      const existing = dbService.findUserByEmail(rawEmail) || dbService.findUserByUsername(rawUsername);
      let status: 'new' | 'update' | 'skip' | 'error' = 'new';
      if (existing) {
        status = duplicateStrategy === 'skip' ? 'skip' : 'update';
      }

      previews.push({
        nama: rawName,
        role: rawRole,
        username: rawUsername,
        email: rawEmail,
        password: rawPass,
        no_wa: rawPhone,
        className: rawClass,
        childName: rawChild,
        status
      });
    }

    setParsedPreviewRows(previews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setImportError('File harus berformat CSV (.csv)');
      return;
    }
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) parseCSVToPreview(text);
    };
    reader.readAsText(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setImportError('File harus berformat CSV (.csv)');
      return;
    }
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) parseCSVToPreview(text);
    };
    reader.readAsText(file);
  };

  const handleTextareaChange = (text: string) => {
    setImportRawText(text);
    if (text.trim().length > 10) {
      parseCSVToPreview(text);
    } else {
      setParsedPreviewRows([]);
    }
  };

  // --- EXECUTE IMPORT ---
  const handleExecuteImport = () => {
    let csvData = '';
    if (importInputMode === 'file') {
      if (!importFile) {
        setImportError('Silakan pilih file CSV terlebih dahulu.');
        return;
      }
      const reader = new FileReader();
      reader.onload = event => {
        csvData = (event.target?.result as string) || '';
        proceedImport(csvData);
      };
      reader.readAsText(importFile);
    } else {
      csvData = importRawText;
      if (!csvData.trim()) {
        setImportError('Silakan tempel teks CSV pada kolom.');
        return;
      }
      proceedImport(csvData);
    }
  };

  const proceedImport = (csvText: string) => {
    const defaultPassVal = defaultPasswordOption === 'custom' ? customDefaultPassword : '';

    const result = dbService.importUsersMultiRoleCSV(csvText, {
      defaultRole,
      defaultClassId,
      duplicateStrategy,
      defaultPassword: defaultPassVal
    });

    if (result.success) {
      onSuccess();
      onClose();

      Swal.fire({
        icon: 'success',
        title: 'Impor Data Berhasil!',
        html: `
          <div class="text-left text-xs space-y-1.5 mt-2 text-slate-700 dark:text-slate-200">
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold">
              ✨ Ringkasan Pemrosesan Data:
            </div>
            <p>✅ Akun Baru Dibuat: <strong>${result.createdCount}</strong> pengguna</p>
            <p>🔄 Akun Diperbarui & Disinkronkan: <strong>${result.updatedCount}</strong> pengguna</p>
            <p>⏭️ Akun Dilewati (Duplikat): <strong>${result.skippedCount}</strong> pengguna</p>
            <p>🏫 Pendaftaran Anggota Kelas: <strong>${result.enrolledCount}</strong> siswa</p>
            <p>👨‍👩‍👦 Relasi Orang Tua & Siswa: <strong>${result.parentLinkedCount}</strong> koneksi</p>
            ${result.errorMessages.length > 0 ? `
              <div class="mt-2 text-amber-600 dark:text-amber-400 font-bold">Catatan Peringatan:</div>
              <ul class="list-disc pl-4 text-[11px] text-slate-500 max-h-24 overflow-y-auto">
                ${result.errorMessages.map(e => `<li>${e}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `,
        confirmButtonColor: '#7c3aed'
      });
    } else {
      setImportError(result.errorMessages[0] || 'Gagal memproses data CSV.');
    }
  };

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>;
      case 'wali_kelas':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Wali Kelas</span>;
      case 'guru':
        return <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Guru</span>;
      case 'siswa':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Siswa</span>;
      case 'orang_tua':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Orang Tua</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{role}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pusat Ekspor & Impor Data Multi-Role
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola berkas CSV/Spreadsheet untuk Admin, Guru, Wali Kelas, Siswa, dan Orang Tua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pt-3 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data Pengguna (CSV / JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Impor Massal Pengguna (Multi-Role)</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          
          {/* ================= TAB 1: EKSPOR DATA ================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
                  <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Kustomisasi Parameter Ekspor Data Pengguna</span>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Hasil unduhan mencakup relasi kelas, mata pelajaran, dan kontak dengan enkoding UTF-8 BOM yang langsung rapi di Microsoft Excel, Google Sheets, dan LibreOffice.
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Filter Peran (Role Akses)
                  </label>
                  <select
                    value={exportRole}
                    onChange={e => setExportRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Semua Peran ({allUsers.length} Total Akun)</option>
                    <option value="admin">Administrator ({allUsers.filter(u => u.role === 'admin').length} Akun)</option>
                    <option value="wali_kelas">Wali Kelas ({allUsers.filter(u => u.role === 'wali_kelas').length} Akun)</option>
                    <option value="guru">Guru Mapel ({allUsers.filter(u => u.role === 'guru').length} Akun)</option>
                    <option value="siswa">Siswa ({allUsers.filter(u => u.role === 'siswa').length} Akun)</option>
                    <option value="orang_tua">Orang Tua / Wali ({allUsers.filter(u => u.role === 'orang_tua').length} Akun)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Filter Rombongan Belajar (Kelas)
                  </label>
                  <select
                    value={exportClassId}
                    onChange={e => setExportClassId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Semua Kelas (Tidak Dibatasi)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.nama_kelas} ({c.tahun_ajaran})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Option Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sertakan Kolom Kata Sandi (Password Akun)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Diperlukan jika ingin mencetak kartu login atau mendistribusikan kredensial awal kepada siswa/guru
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={exportIncludePassword}
                  onChange={e => setExportIncludePassword(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Summary Box */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Target Akun Siap Diekspor:
                </span>
                <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">
                  {exportMatchingUsers.length} Pengguna
                </span>
              </div>

              {/* Export Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteExportCSV}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh File Spreadsheet (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteExportJSON}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Cadangan (JSON)</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: IMPOR DATA ================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              
              {/* Template Download Section */}
              <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span>Unduh Format Template CSV Standar:</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Pilih template sesuai kebutuhan</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => dbService.downloadMultiRoleTemplateCSV('all')}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Template dengan kombinasi semua peran (Admin, Guru, Wali Kelas, Siswa, Ortu)"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Semua Role</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => dbService.downloadMultiRoleTemplateCSV('guru')}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Template khusus Guru Mata Pelajaran dan Wali Kelas"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Guru & Wali</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => dbService.downloadMultiRoleTemplateCSV('siswa')}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Template khusus Siswa dan Penempatan Kelas"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Siswa & Kelas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => dbService.downloadMultiRoleTemplateCSV('orang_tua')}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Template khusus Orang Tua / Wali beserta email siswa anak"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>Orang Tua</span>
                  </button>
                </div>
              </div>

              {/* Input Mode Selector (File vs Text) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportInputMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    importInputMode === 'file'
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Unggah Berkas CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setImportInputMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    importInputMode === 'text'
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Salin & Tempel Teks CSV
                </button>
              </div>

              {/* Upload Drop Zone OR Textarea */}
              {importInputMode === 'file' ? (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl p-5 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-7 h-7 text-purple-500 mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {importFile ? importFile.name : 'Klik untuk memilih berkas CSV atau seret ke sini'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Format .csv pemisah koma (,)'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tempel Isi CSV di Sini (Dengan Baris Header):
                  </label>
                  <textarea
                    rows={4}
                    value={importRawText}
                    onChange={e => handleTextareaChange(e.target.value)}
                    placeholder="Nama Lengkap, Role, Username, Email, Password, No_WhatsApp, Kelas&#10;Budi Santoso, guru, guru_budi, budi@sekolah.sch.id, guru123, 0812345678, &#10;Muhammad Rizky, siswa, rizky_p, rizky@sekolah.sch.id, siswa123, 0812987654, X-A"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Advanced Import Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Bawaan (Jika Kolom Role Kosong)
                  </label>
                  <select
                    value={defaultRole}
                    onChange={e => setDefaultRole(e.target.value as UserRole)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru Mapel</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="orang_tua">Orang Tua</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kelas Tujuan (Jika Siswa Belum Ada Kelas)
                  </label>
                  <select
                    value={defaultClassId}
                    onChange={e => setDefaultClassId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Strategi Duplikasi (Email/Username)
                  </label>
                  <select
                    value={duplicateStrategy}
                    onChange={e => setDuplicateStrategy(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="update">Perbarui & Sinkronkan Password</option>
                    <option value="skip">Lewati Akun yang Sudah Ada</option>
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Live Preview Table */}
              {parsedPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-600" />
                      Pratinjau Data ({parsedPreviewRows.length} Baris Terdeteksi):
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-600 font-bold">
                        {parsedPreviewRows.filter(r => r.status === 'new').length} Baru
                      </span>
                      <span className="text-blue-600 font-bold">
                        {parsedPreviewRows.filter(r => r.status === 'update').length} Update
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8 text-center">No</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3 text-center">Role</th>
                          <th className="py-2 px-3 font-mono">Username</th>
                          <th className="py-2 px-3 font-mono">Password</th>
                          <th className="py-2 px-3">Kelas / Relasi</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {parsedPreviewRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {row.nama}
                              <div className="text-[10px] text-slate-400 font-normal">{row.email}</div>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {renderRoleBadge(row.role)}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-blue-600 dark:text-blue-400">
                              @{row.username}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-rose-600 dark:text-rose-400">
                              {row.password}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                              {row.className !== '-' ? `Kelas: ${row.className}` : (row.childName !== '-' ? `Anak: ${row.childName}` : '-')}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {row.status === 'new' && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Baru
                                </span>
                              )}
                              {row.status === 'update' && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                                  Update
                                </span>
                              )}
                              {row.status === 'skip' && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  Lewati
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedPreviewRows.length > 15 && (
                      <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                        ...dan {parsedPreviewRows.length - 15} baris data lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
          
          {activeTab === 'import' && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={parsedPreviewRows.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Jalankan Impor ({parsedPreviewRows.length} Akun)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
