import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { GoogleDriveService, DrivePhotoRecord } from '../services/googleDriveService';
import { imageCompressionService, CompressedImageResult } from '../services/imageCompressionService';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getAccessToken
} from '../services/googleAuthService';
import { User, UserRole } from '../types';
import Swal from 'sweetalert2';
import {
  Image,
  Upload,
  HardDrive,
  CheckCircle,
  ExternalLink,
  Trash2,
  Filter,
  UserCheck,
  Search,
  Camera,
  FolderOpen,
  CloudCheck,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  Cpu,
  Globe
} from 'lucide-react';

interface DrivePhotoManagerProps {
  currentRole: UserRole;
  currentUserId: string;
}

export const DrivePhotoManager: React.FC<DrivePhotoManagerProps> = ({ currentRole, currentUserId }) => {
  const dbService = DatabaseService.getInstance();
  const driveService = GoogleDriveService.getInstance();

  const classes = dbService.getAllClasses();
  const allStudents = dbService.getAllUsers().filter(u => u.role === 'siswa');

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_DRIVE_CLASS_ID');
      if (saved && classes.some(c => c.id === saved)) return saved;
    } catch (e) {}
    return classes[0]?.id || '';
  });

  useEffect(() => {
    try {
      if (selectedClassId) localStorage.setItem('SIMAK_DRIVE_CLASS_ID', selectedClassId);
    } catch (e) {}
  }, [selectedClassId]);
  const studentsInClass = selectedClassId ? dbService.getStudentsInClass(selectedClassId) : allStudents;

  const [photos, setPhotos] = useState<DrivePhotoRecord[]>(driveService.getAllPhotoRecords());
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Google OAuth Auth State
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetStudentId, setUploadTargetStudentId] = useState<string>(studentsInClass[0]?.id || '');
  const [uploadCaption, setUploadCaption] = useState<string>('Pasfoto Resmi Siswa 3x4');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<CompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Check initial auth state
    const unsubscribe = initAuth(
      (u, token) => {
        setIsGoogleConnected(true);
        setGoogleUserEmail(u.email || 'Akun Google Terhubung');
        driveService.setAccessToken(token);
      },
      () => {
        setIsGoogleConnected(false);
        setGoogleUserEmail(null);
      }
    );

    // Initial check if memory already has token
    getAccessToken().then(tok => {
      if (tok) {
        setIsGoogleConnected(true);
        driveService.setAccessToken(tok);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const reloadPhotos = () => {
    setPhotos(driveService.getAllPhotoRecords());
  };

  const handleConnectGoogleDrive = async () => {
    setIsConnectingGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsGoogleConnected(true);
        setGoogleUserEmail(result.user.email || 'Akun Google Terhubung');
        driveService.setAccessToken(result.accessToken);
        Swal.fire({
          icon: 'success',
          title: 'Google Drive Terhubung!',
          text: `Akun ${result.user.email || ''} berhasil terhubung dengan izin akses Google Drive.`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err: any) {
      console.error('Google connect err:', err);
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Gagal',
        text: err.message || 'Gagal menghubungkan Google Drive'
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    await logoutGoogle();
    setIsGoogleConnected(false);
    setGoogleUserEmail(null);
    driveService.setAccessToken('');
    Swal.fire({
      icon: 'info',
      title: 'Koneksi Google Diputus',
      text: 'Token sesi Google Drive telah dibersihkan dari memori.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const filteredPhotos = photos.filter(p => {
    const student = dbService.getUserById(p.studentId);
    const matchStudent = selectedStudentId === 'all' || p.studentId === selectedStudentId;
    const matchSearch =
      (student?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.caption || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStudent && matchSearch;
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'Format Tidak Sesuai', text: 'Berkas harus berupa gambar (JPG, PNG, WebP).' });
      return;
    }

    setIsCompressing(true);
    try {
      // Kompresi sisi klien (Browser HP/Laptop) sebelum dikirim
      const compressed = await imageCompressionService.compressImageSource(file, {
        maxWidth: 720,
        maxHeight: 960,
        quality: 0.78,
        mimeType: 'image/jpeg'
      });
      setSelectedFile(compressed.file);
      setPreviewDataUrl(compressed.dataUrl);
      setCompressionStats(compressed);
    } catch (err) {
      console.warn('Compression fallback to original file:', err);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreviewDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleExecuteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTargetStudentId) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Pilih siswa dan file foto terlebih dahulu.' });
      return;
    }

    setIsUploading(true);
    try {
      const student = dbService.getUserById(uploadTargetStudentId);
      await driveService.uploadStudentPhoto(
        uploadTargetStudentId,
        selectedFile,
        uploadCaption,
        student ? `Wali/Admin (${student.nama})` : 'Petugas'
      );

      setIsUploading(false);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewDataUrl(null);
      setCompressionStats(null);
      reloadPhotos();

      Swal.fire({
        icon: 'success',
        title: 'Foto Berhasil Disimpan ke Google Drive!',
        html: `
          <div class="text-left text-xs space-y-2 mt-2">
            <p>Berkas <strong>"${selectedFile.name}"</strong> berhasil diunggah ke Google Drive dengan hak akses publik otomatis.</p>
            ${
              compressionStats
                ? `<div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200">
                    <div>⚡ <strong>Kompresi Sisi Perangkat:</strong></div>
                    <div>${compressionStats.originalSizeKB} KB ➔ ${compressionStats.compressedSizeKB} KB (Hemat <strong>${compressionStats.savedPercentage}%</strong> Kuota)</div>
                  </div>`
                : ''
            }
          </div>
        `,
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      setIsUploading(false);
      Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: err.message || 'Terjadi kesalahan sistem' });
    }
  };

  /**
   * User Confirmation for Destructive Operations (MANDATORY):
   * Selalu meminta konfirmasi pengguna eksplisit sebelum menghapus berkas
   */
  const handleDeletePhoto = (photo: DrivePhotoRecord) => {
    Swal.fire({
      title: '⚠️ Hapus Berkas dari Google Drive?',
      html: `
        <div class="text-left text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>Tindakan ini akan <strong>menghapus berkas permanen</strong> dari penyimpanan Google Drive dan indeks database SIMAK:</p>
          <div class="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
            <div><strong>Nama Berkas:</strong> ${photo.fileName}</div>
            <div><strong>Keterangan:</strong> ${photo.caption || '-'}</div>
            <div><strong>ID Berkas:</strong> <code class="font-mono text-[10px]">${photo.driveFileId}</code></div>
          </div>
          <p class="text-rose-600 dark:text-rose-400 font-semibold">Tindakan ini tidak dapat dibatalkan.</p>
          <p class="font-medium text-slate-700 dark:text-slate-200 mt-2">
            Untuk mencegah penghapusan tidak disengaja, ketik kata <strong class="text-rose-600 dark:text-rose-400 font-mono">HAPUS</strong> di bawah:
          </p>
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Ketik "HAPUS" di sini...',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Konfirmasi Hapus',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (value !== 'HAPUS') {
          return 'Ketik kata "HAPUS" (huruf kapital) untuk konfirmasi!';
        }
      }
    }).then(async res => {
      if (res.isConfirmed) {
        await driveService.deletePhotoRecord(photo.id);
        reloadPhotos();
        Swal.fire({
          icon: 'success',
          title: 'Berkas Dihapus!',
          text: `Berkas "${photo.fileName}" telah dihapus.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Database Foto Siswa (Google Drive Storage)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  v3 REST API
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                Penyimpanan cloud terpusat untuk pasfoto resmi, kartu identitas pelajar, dan berkas siswa di Google Drive.
              </p>
            </div>
          </div>

          {/* Action and Google Sign-in Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isGoogleConnected ? (
              <button
                type="button"
                onClick={handleConnectGoogleDrive}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition"
                title="Hubungkan Google Drive untuk sinkronisasi folder otomatis"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Google Drive'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300 truncate max-w-[140px]">
                  {googleUserEmail}
                </span>
                <button
                  onClick={handleDisconnectGoogleDrive}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                  title="Putuskan Hubungan Google Drive"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setUploadTargetStudentId(studentsInClass[0]?.id || '');
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Unggah Foto Siswa
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Rombel / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nama_kelas} ({c.tahun_ajaran})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Filter Siswa Tertentu
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Semua Siswa ({studentsInClass.length} Siswa)</option>
              {studentsInClass.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cari Berkas / Keterangan
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau file..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Galeri Berkas Foto Siswa ({filteredPhotos.length} Berkas)
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            Tersimpan di Cloud Google Drive & Terindeks di Firestore
          </span>
        </div>

        {filteredPhotos.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Camera className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Belum ada foto siswa yang diunggah untuk kriteria ini.</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Unggah Foto Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => {
              const student = dbService.getUserById(photo.studentId);
              return (
                <div
                  key={photo.id}
                  className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-md transition group flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={photo.viewUrl}
                      alt={photo.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-amber-400" />
                      <span>Google Drive</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {student?.nama || 'Siswa'}
                      </div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                        {photo.caption || photo.fileName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold mt-1 truncate">
                        File ID: {photo.driveFileId}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 text-[10px] font-medium">{photo.uploadedAt}</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={photo.viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
                          title="Buka Pratinjau Foto di Tab Baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          title="Hapus Berkas dari Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Unggah Foto Siswa ke Google Drive
            </h3>

            <form onSubmit={handleExecuteUpload} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Siswa
                </label>
                <select
                  required
                  value={uploadTargetStudentId}
                  onChange={e => setUploadTargetStudentId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Kategori Foto
                </label>
                <input
                  type="text"
                  required
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  placeholder="Contoh: Pasfoto 3x4 Ijazah / Kartu Pelajar"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Berkas Foto
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/60 hover:bg-blue-50/50 transition"
                >
                  {previewDataUrl ? (
                    <div className="space-y-2">
                      <img
                        src={previewDataUrl}
                        alt="Preview"
                        className="w-24 h-24 object-cover mx-auto rounded-xl border border-slate-300 shadow-xs"
                      />
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedFile?.name}</div>
                      {compressionStats && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                          <Cpu className="w-3 h-3" />
                          <span>{compressionStats.originalSizeKB}KB ➔ {compressionStats.compressedSizeKB}KB (Hemat {compressionStats.savedPercentage}%)</span>
                        </div>
                      )}
                      <div className="text-[11px] text-blue-600">Klik untuk mengganti foto</div>
                    </div>
                  ) : isCompressing ? (
                    <div className="py-4 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Mengompresi di perangkat...</div>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Klik untuk memilih berkas foto
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, atau WebP (Otomatis Dikompresi)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Public permissions guarantee info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-200">
                <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Sistem secara otomatis menetapkan hak akses <strong>Publik (Anyone with link)</strong> pada Google Drive sehingga foto tidak akan rusak (broken link).</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {isUploading ? 'Menyimpan...' : 'Simpan ke Google Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
