import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { SchoolAnnouncement, UserRole } from '../types';
import Swal from 'sweetalert2';
import {
  Bell,
  Megaphone,
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Trash2,
  X,
  ChevronRight,
  Info,
  CheckCircle2,
  Tag
} from 'lucide-react';

interface AnnouncementBannerProps {
  currentUserRole: UserRole;
  currentUserName: string;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  currentUserRole,
  currentUserName
}) => {
  const dbService = DatabaseService.getInstance();
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SchoolAnnouncement | null>(null);

  // Form State for creating new announcement
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'Penting' | 'Akademik' | 'Kegiatan' | 'Libur'>('Akademik');
  const [newPriority, setNewPriority] = useState<'high' | 'normal'>('normal');
  const [newTargetRole, setNewTargetRole] = useState<'all' | 'siswa' | 'guru' | 'wali_kelas' | 'orang_tua'>('all');

  const loadAnnouncements = () => {
    const list = dbService.getAnnouncementsForRole(currentUserRole);
    setAnnouncements(list);
  };

  useEffect(() => {
    loadAnnouncements();

    // Subscribe to realtime announcement additions
    const unsubscribe = dbService.onAnnouncementAdded((newAnn) => {
      loadAnnouncements();
      // Trigger SweetAlert2 toast notification
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: newAnn.priority === 'high' ? 'warning' : 'info',
        title: `📢 Pengumuman Baru: ${newAnn.title}`,
        text: `Kategori: ${newAnn.category} • Oleh: ${newAnn.author}`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserRole]);

  // Auto-rotate ticker if multiple announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % announcements.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      Swal.fire({ icon: 'warning', title: 'Mohon isi judul dan isi pengumuman' });
      return;
    }

    dbService.createAnnouncement({
      title: newTitle,
      content: newContent,
      category: newCategory,
      priority: newPriority,
      author: currentUserName,
      authorRole: currentUserRole,
      targetRole: newTargetRole
    });

    setIsModalOpen(false);
    setNewTitle('');
    setNewContent('');
    loadAnnouncements();

    Swal.fire({
      icon: 'success',
      title: 'Pengumuman Diterbitkan!',
      text: 'Informasi telah disiarkan secara realtime ke seluruh pengguna terkait.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    Swal.fire({
      title: 'Hapus Pengumuman?',
      text: 'Pengumuman ini akan dihapus dari papan informasi sekolah.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        dbService.deleteAnnouncement(id);
        loadAnnouncements();
        setSelectedAnnouncement(null);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Pengumuman dihapus',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  if (announcements.length === 0 && currentUserRole !== 'admin' && currentUserRole !== 'wali_kelas') {
    return null;
  }

  const currentAnn = announcements[activeIdx] || announcements[0];
  const canManage = currentUserRole === 'admin' || currentUserRole === 'wali_kelas';

  return (
    <div className="space-y-3">
      {/* Dynamic Announcement Banner Bar */}
      {currentAnn && (
        <div
          onClick={() => setSelectedAnnouncement(currentAnn)}
          className={`cursor-pointer rounded-2xl p-4 transition shadow-xs border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group relative overflow-hidden ${
            currentAnn.priority === 'high'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-950/60'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 hover:bg-blue-100/80 dark:hover:bg-blue-950/60'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                currentAnn.priority === 'high'
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {currentAnn.priority === 'high' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Megaphone className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    currentAnn.category === 'Penting'
                      ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : currentAnn.category === 'Akademik'
                      ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : currentAnn.category === 'Kegiatan'
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  }`}
                >
                  {currentAnn.category}
                </span>

                <span className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {currentAnn.title}
                </span>

                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium hidden md:inline flex items-center gap-1">
                  • {currentAnn.date} {currentAnn.time}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-200 truncate mt-0.5 max-w-3xl font-medium">
                {currentAnn.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {announcements.length > 1 && (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {activeIdx + 1} dari {announcements.length}
              </span>
            )}

            <button
              type="button"
              className="px-3 py-1 bg-white/80 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-lg border border-black/5 dark:border-white/10 flex items-center gap-1 transition"
            >
              <span>Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {canManage && (
              <div className="flex items-center gap-1.5">
                {currentUserRole === 'admin' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewPriority('high');
                      setNewCategory('Penting');
                      setIsModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-lg flex items-center gap-1 shadow-xs transition"
                    title="Siarkan pengumuman darurat/mendesak yang muncul saat pengguna login"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Push Mendesak</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewPriority('normal');
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buat Baru</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    selectedAnnouncement.category === 'Penting'
                      ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
                      : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {selectedAnnouncement.category}
                </span>
                {selectedAnnouncement.priority === 'high' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                    Prioritas Tinggi
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                {selectedAnnouncement.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {selectedAnnouncement.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {selectedAnnouncement.time} WIB
                </span>
                <span>• Oleh: {selectedAnnouncement.author}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {selectedAnnouncement.content}
            </div>

            <div className="flex items-center justify-between pt-2">
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedAnnouncement.id)}
                  className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Pengumuman
                </button>
              )}
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="ml-auto px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Terbitkan Pengumuman Sekolah
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Ujian Tengah Semester..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Penting">Penting</option>
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Libur">Hari Libur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi (Peringatan)</option>
                  </select>
                </div>
              </div>

              {newPriority === 'high' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Mode Siaran Mendesak Aktif:</span> Pesan ini akan muncul otomatis sebagai pop-up layar penuh (push banner) seketika saat pengguna target login ke akun mereka.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Sasaran
                </label>
                <select
                  value={newTargetRole}
                  onChange={(e: any) => setNewTargetRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Semua Pengguna</option>
                  <option value="siswa">Khusus Siswa</option>
                  <option value="guru">Khusus Guru</option>
                  <option value="wali_kelas">Khusus Wali Kelas</option>
                  <option value="orang_tua">Khusus Orang Tua</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Isi / Detail Pengumuman
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tuliskan pesan lengkap pengumuman di sini..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Siarkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
