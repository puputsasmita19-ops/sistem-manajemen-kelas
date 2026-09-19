import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Newspaper,
  Plus,
  Trash2,
  Printer,
  Search,
  Pin,
  Heart,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  Calendar,
  User,
  Tag,
  Share2,
  ExternalLink,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';
import { ClassBulletinBoardItem, BulletinCategory } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomBulletinBoardProps {
  classId: string;
  className: string;
  bulletinItems: ClassBulletinBoardItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomBulletinBoard: React.FC<HomeroomBulletinBoardProps> = ({
  classId,
  className,
  bulletinItems = [],
  studentList = [],
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'gallery' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClassBulletinBoardItem | null>(null);

  // Quick comments state in detail modal
  const [commentInput, setCommentInput] = useState('');
  const [itemComments, setItemComments] = useState<Record<string, Array<{ author: string; text: string; time: string }>>>({
    bb_1: [
      { author: 'Ahmad Fauzi (Ketua Kelas)', text: 'Siap Pak, kelompok 1 sudah menyelesaikan draf proposal dan infografis!', time: '15 Sep 2026, 10:15' },
      { author: 'Siti Aminah', text: 'Apakah poster wajib dicetak ukuran A3 atau digital Pak?', time: '15 Sep 2026, 11:30' }
    ],
    bb_3: [
      { author: 'Budi Santoso, S.Pd', text: 'Karya yang sangat menyentuh dan memiliki rima yang harmonis. Teruslah berkarya!', time: '10 Sep 2026, 14:00' }
    ]
  });

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BulletinCategory>('Pengumuman Resmi');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [author, setAuthor] = useState('Budi Santoso, S.Pd');
  const [authorRole, setAuthorRole] = useState('Wali Kelas');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('#Pendidikan, #Kreativitas');
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');

  // Pre-set suggested image collections
  const PRESET_IMAGES = [
    { label: 'Pameran / P5', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80' },
    { label: 'Kebersihan & Kelas', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80' },
    { label: 'Karya & Literasi', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80' },
    { label: 'Apresiasi & Prestasi', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80' },
    { label: 'Belajar & Diskusi', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80' },
  ];

  // Filtering
  const filteredItems = bulletinItems.filter(item => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));
    return matchCategory && matchSearch;
  });

  const categoryBadgeColor = (cat: BulletinCategory) => {
    switch (cat) {
      case 'Pengumuman Resmi':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Dokumentasi Kegiatan':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Karya & Kreativitas Siswa':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Mading Literasi & Opini':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Prestasi & Apresiasi':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !author) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith('#') ? t : `#${t}`));

    service.addBulletinBoardItem(classId, {
      title,
      category,
      publishDate,
      author,
      authorRole: authorRole || undefined,
      content,
      imageUrl: imageUrl || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      isPinned,
      attachmentName: attachmentName || undefined,
      likesCount: 0,
      commentsCount: 0
    });

    setShowAddModal(false);
    setTitle('');
    setContent('');
    setImageUrl('');
    setAttachmentName('');
    setIsPinned(false);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Kiriman Mading?',
      text: 'Dokumentasi atau karya siswa ini akan dihapus dari papan mading kelas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteBulletinBoardItem(classId, id);
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
        onRefresh();
      }
    });
  };

  const handleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    service.toggleLikeBulletinBoardItem(classId, id);
    onRefresh();
  };

  const handleAddComment = (itemId: string) => {
    if (!commentInput.trim()) return;
    const now = new Date();
    const formatted = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    const newComment = {
      author: 'Wali Kelas (Budi Santoso, S.Pd)',
      text: commentInput.trim(),
      time: formatted
    };

    setItemComments(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), newComment]
    }));
    setCommentInput('');
  };

  // Metrics
  const totalPosts = bulletinItems.length;
  const officialAnnouncements = bulletinItems.filter(b => b.category === 'Pengumuman Resmi').length;
  const photoDocs = bulletinItems.filter(b => b.category === 'Dokumentasi Kegiatan' || !!b.imageUrl).length;
  const studentWorks = bulletinItems.filter(b => b.category === 'Karya & Kreativitas Siswa' || b.category === 'Mading Literasi & Opini').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-xs font-black">
              MENU 18
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Dokumentasi Administrasi & Mading Kelas ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mading digital, galeri foto dokumentasi kegiatan, arsip karya kreasi, pojok literasi & apresiasi kelas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Mading</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-rose-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Posting Mading Baru</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Terbitan</span>
            <Newspaper className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-400">
            {totalPosts} <span className="text-xs font-normal">Artikel / Dok</span>
          </div>
          <p className="text-[10px] text-rose-600/80">Arsip mading kelas {className}</p>
        </div>

        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-800 dark:text-blue-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pengumuman Resmi</span>
            <Pin className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400">
            {officialAnnouncements} <span className="text-xs font-normal">Agenda</span>
          </div>
          <p className="text-[10px] text-blue-600/80">Agenda KBM & P5 aktif</p>
        </div>

        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Dokumentasi Foto</span>
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
            {photoDocs} <span className="text-xs font-normal">Galeri</span>
          </div>
          <p className="text-[10px] text-emerald-600/80">Kegiatan & aksi kelas</p>
        </div>

        <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/70 dark:border-purple-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-800 dark:text-purple-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Karya & Literasi</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-400">
            {studentWorks} <span className="text-xs font-normal">Karya Siswa</span>
          </div>
          <p className="text-[10px] text-purple-600/80">Puisi, artikel & opini</p>
        </div>
      </div>

      {/* Filter Category & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            'Semua',
            'Pengumuman Resmi',
            'Dokumentasi Kegiatan',
            'Karya & Kreativitas Siswa',
            'Mading Literasi & Opini',
            'Prestasi & Apresiasi'
          ].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Mode & Search */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tampilan Papan Mading Grid"
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'gallery'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tampilan Galeri Foto"
            >
              Galeri Foto
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tampilan Arsip Daftar"
            >
              Daftar
            </button>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari judul, tagar, atau penulis..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                  item.isPinned
                    ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800'
                }`}
              >
                {/* Pinned Ribbon */}
                {item.isPinned && (
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-xs">
                    <Pin className="w-3 h-3 fill-current" />
                    <span>DISEMATKAN</span>
                  </div>
                )}

                <div>
                  {/* Photo Header if available */}
                  {item.imageUrl && (
                    <div className="relative w-full h-44 overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                      <span
                        className={`absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-md shadow-xs ${categoryBadgeColor(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-2.5">
                    {!item.imageUrl && (
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${categoryBadgeColor(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.publishDate}
                        </span>
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-line leading-relaxed">
                      {item.content}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[65%]">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium text-[11px]">
                      {item.author}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={e => handleLike(item.id, e)}
                      className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:scale-110 transition cursor-pointer"
                      title="Sukai kiriman ini"
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span>{item.likesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Hapus kiriman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <Newspaper className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-slate-600 dark:text-slate-300">Belum ada publikasi mading atau dokumentasi kelas.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol "Posting Mading Baru" di atas untuk menambah pengumuman, galeri foto, atau karya siswa.</p>
            </div>
          )}
        </div>
      )}

      {/* Gallery Photo View */}
      {viewMode === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.filter(i => !!i.imageUrl).length > 0 ? (
            filteredItems
              .filter(i => !!i.imageUrl)
              .map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs bg-black aspect-video cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                    <span
                      className={`self-start px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md mb-1 ${categoryBadgeColor(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                    <h4 className="text-white text-xs font-bold line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-slate-300 text-[10px] mt-0.5">
                      Oleh: {item.author} • {item.publishDate}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              Tidak ada dokumentasi foto yang sesuai dengan filter saat ini.
            </div>
          )}
        </div>
      )}

      {/* List / Document Table View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-4">Judul Publikasi & Uraian Singkat</th>
                  <th className="py-3 px-3">Penulis / Kontributor</th>
                  <th className="py-3 px-3 text-center">Interaksi</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        {item.isPinned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            Pin
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">Reguler</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {item.publishDate}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryBadgeColor(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.content}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {item.author}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap text-rose-600 dark:text-rose-400 font-bold">
                        ♥ {item.likesCount || 0}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada catatan mading yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${categoryBadgeColor(
                      selectedItem.category
                    )}`}
                  >
                    {selectedItem.category}
                  </span>
                  {selectedItem.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      <Pin className="w-2.5 h-2.5 fill-current" />
                      Disematkan
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedItem.publishDate}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedItem.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Author info */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-xs">
                  {selectedItem.author.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedItem.author}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedItem.authorRole || 'Kontributor Kelas'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLike(selectedItem.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Beri Apresiasi ({selectedItem.likesCount || 0})</span>
              </button>
            </div>

            {/* High-res Image Preview */}
            {selectedItem.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-80 bg-slate-900">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Full text */}
            <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed space-y-2 p-1">
              {selectedItem.content}
            </div>

            {/* Tags */}
            {selectedItem.tags && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedItem.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Attachment preview if any */}
            {selectedItem.attachmentName && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedItem.attachmentName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Tersedia untuk diunduh</span>
              </div>
            )}

            {/* Feedback / Comments Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <MessageCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Tanggapan & Diskusi Kelas</span>
              </div>

              {/* Comments list */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(itemComments[selectedItem.id] || []).length > 0 ? (
                  itemComments[selectedItem.id].map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-0.5 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {c.author}
                        </span>
                        <span className="text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Belum ada tanggapan untuk kiriman ini.</p>
                )}
              </div>

              {/* Add comment input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddComment(selectedItem.id);
                    }
                  }}
                  placeholder="Tulis tanggapan / apresiasi sebagai Wali Kelas..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddComment(selectedItem.id)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer"
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Buat Publikasi Mading / Dokumentasi Kelas
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kategori Publikasi</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as BulletinCategory)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Pengumuman Resmi">Pengumuman Resmi</option>
                    <option value="Dokumentasi Kegiatan">Dokumentasi Kegiatan</option>
                    <option value="Karya & Kreativitas Siswa">Karya & Kreativitas Siswa</option>
                    <option value="Mading Literasi & Opini">Mading Literasi & Opini</option>
                    <option value="Prestasi & Apresiasi">Prestasi & Apresiasi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal Terbit</label>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={e => setPublishDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Judul Mading / Dokumentasi</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Gelar Karya P5: Gaya Hidup Berkelanjutan..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Penulis / Kontributor</label>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Nama penulis atau siswa..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    list="mading-authors"
                    required
                  />
                  <datalist id="mading-authors">
                    <option value="Budi Santoso, S.Pd (Wali Kelas)" />
                    <option value="Pengurus Kelas X-IPA-1" />
                    <option value="Seksi Mading & Literasi" />
                    {studentList.map(s => (
                      <option key={s.id} value={s.nama} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Peran / Jabatan</label>
                  <input
                    type="text"
                    value={authorRole}
                    onChange={e => setAuthorRole(e.target.value)}
                    placeholder="Contoh: Wali Kelas / Siswa / Ketua Kelas"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Isi / Konten Mading</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan isi pengumuman, bait puisi, artikel opini, atau rincian kegiatan kelas..."
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">URL Gambar / Foto Dokumentasi</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Rekomendasi preset foto:</span>
                  {PRESET_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 text-[10px] text-slate-600 dark:text-slate-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tagar / Label (pisahkan koma)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    placeholder="#P5, #Literasi, #Karya"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Lampiran Dokumen</label>
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={e => setAttachmentName(e.target.value)}
                    placeholder="Contoh: Proposal_P5.pdf"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin-post"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="pin-post" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Sematkan di bagian teratas (Pinned Announcement)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Terbitkan Mading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
