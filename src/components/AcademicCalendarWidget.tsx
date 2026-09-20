import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MapPin,
  Users,
  Clock,
  AlertCircle,
  Sparkles,
  BookOpen,
  Coffee,
  Briefcase,
  Award,
  Filter,
  CheckCircle2,
  CalendarDays,
  Palmtree,
  FileText
} from 'lucide-react';
import { AcademicEvent, AcademicEventCategory, UserRole } from '../types';
import { DatabaseService } from '../services/databaseService';
import Swal from 'sweetalert2';

interface AcademicCalendarWidgetProps {
  currentUserRole: UserRole;
  currentUserName: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const CATEGORY_CONFIG: Record<AcademicEventCategory, { label: string; color: string; badgeClass: string; icon: any }> = {
  ujian: {
    label: 'Ujian & Asesmen',
    color: '#ef4444',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: BookOpen
  },
  libur: {
    label: 'Libur Nasional & Sekolah',
    color: '#10b981',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: Coffee
  },
  kegiatan: {
    label: 'Kegiatan & Kesiswaan',
    color: '#3b82f6',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: Sparkles
  },
  rapat: {
    label: 'Rapat & Evaluasi Guru',
    color: '#a855f7',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: Briefcase
  },
  rapor: {
    label: 'Pembagian Rapor',
    color: '#f59e0b',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Award
  }
};

export const AcademicCalendarWidget: React.FC<AcademicCalendarWidgetProps> = ({
  currentUserRole,
  currentUserName
}) => {
  const dbService = DatabaseService.getInstance();
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeDisplayMode, setActiveDisplayMode] = useState<'calendar' | 'holidays' | 'exams'>('calendar');

  // Today's date reference
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calendar View State (Current Year & Month)
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed (8 = Sept)
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(todayStr);

  // Modal State for adding events
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<AcademicEventCategory>('ujian');
  const [newEventStartDate, setNewEventStartDate] = useState(todayStr);
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventTargetRole, setNewEventTargetRole] = useState<'all' | 'siswa' | 'guru' | 'wali_kelas' | 'orang_tua'>('all');
  const [newEventIsHoliday, setNewEventIsHoliday] = useState(false);

  // Load events
  const loadEvents = () => {
    const list = dbService.getAllAcademicEvents();
    setEvents(list);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Filter events by role and category
  const visibleEvents = useMemo(() => {
    return events.filter(evt => {
      // Role filter
      if (evt.targetRole && evt.targetRole !== 'all' && evt.targetRole !== currentUserRole && currentUserRole !== 'admin') {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [events, currentUserRole, selectedCategory]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleTodayShortcut = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Calendar Grid Matrix Generation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // In JS, getDay(): 0 = Sun, 1 = Mon ... 6 = Sat.
    // Convert to Monday-first (0 = Mon, 6 = Sun)
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const totalDays = lastDayOfMonth.getDate();
    const daysArray = [];

    // Blank cells before first day
    for (let i = 0; i < startDayIndex; i++) {
      daysArray.push(null);
    }

    // Days in month
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

      // Events matching this date (either single day or within range)
      const dayEvents = visibleEvents.filter(evt => {
        if (evt.startDate === dateKey) return true;
        if (evt.endDate && evt.startDate <= dateKey && evt.endDate >= dateKey) return true;
        return false;
      });

      daysArray.push({
        dayNumber: d,
        dateKey,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDateStr,
        events: dayEvents
      });
    }

    return daysArray;
  }, [currentYear, currentMonth, visibleEvents, todayStr, selectedDateStr]);

  // Events for selected date or upcoming
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return visibleEvents.filter(evt => {
      if (evt.startDate === selectedDateStr) return true;
      if (evt.endDate && evt.startDate <= selectedDateStr && evt.endDate >= selectedDateStr) return true;
      return false;
    });
  }, [visibleEvents, selectedDateStr]);

  // Upcoming events sorted from today onwards
  const upcomingEvents = useMemo(() => {
    return [...visibleEvents]
      .filter(evt => evt.startDate >= todayStr || (evt.endDate && evt.endDate >= todayStr))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5);
  }, [visibleEvents, todayStr]);

  // Handle Add Event
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventStartDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Judul dan tanggal mulai agenda wajib diisi.'
      });
      return;
    }

    dbService.createAcademicEvent({
      title: newEventTitle.trim(),
      description: newEventDescription.trim() || undefined,
      startDate: newEventStartDate,
      endDate: newEventEndDate.trim() || undefined,
      category: newEventCategory,
      location: newEventLocation.trim() || undefined,
      targetRole: newEventTargetRole,
      isHoliday: newEventIsHoliday || newEventCategory === 'libur'
    });

    loadEvents();
    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventLocation('');
    setNewEventEndDate('');

    Swal.fire({
      icon: 'success',
      title: 'Agenda Tersimpan!',
      text: 'Event kalender akademik berhasil disinkronisasi ke Firebase & database lokal.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDeleteEvent = (id: string, title: string) => {
    Swal.fire({
      title: 'Hapus Agenda?',
      text: `Apakah Anda yakin ingin menghapus agenda "${title}" dari kalender akademik?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        dbService.deleteAcademicEvent(id);
        loadEvents();
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Agenda berhasil dihapus.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const getCountdownLabel = (startDate: string) => {
    if (startDate === todayStr) return 'Hari Ini';
    const start = new Date(startDate);
    const curr = new Date(todayStr);
    const diffTime = start.getTime() - curr.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Besok';
    if (diffDays > 1) return `${diffDays} hari lagi`;
    return 'Sedang Berjalan';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition space-y-5">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Kalender Akademik & Agenda Sekolah
              </h3>
              {currentUserRole === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Tersinkronisasi Firebase
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jadwal ujian semester, hari libur nasional, rapat guru, dan kegiatan kesiswaan
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentUserRole === 'admin' && (
            <button
              id="btn-add-academic-event"
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Agenda</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTodayShortcut}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* Main View Mode Selector (Kalender Bulanan, Daftar Hari Libur, Jadwal Ujian) */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveDisplayMode('calendar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeDisplayMode === 'calendar'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Kalender Bulanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDisplayMode('holidays')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeDisplayMode === 'holidays'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Palmtree className="w-3.5 h-3.5 text-emerald-500" />
          <span>Daftar Hari Libur</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px]">
            {events.filter(e => e.category === 'libur').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDisplayMode('exams')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeDisplayMode === 'exams'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-rose-500" />
          <span>Jadwal Ujian</span>
          <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-full text-[10px]">
            {events.filter(e => e.category === 'ujian').length}
          </span>
        </button>
      </div>

      {/* DISPLAY MODE 1: KALENDER BULANAN & AGENDA HARIAN */}
      {activeDisplayMode === 'calendar' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua ({events.length})
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
              const count = events.filter(e => e.category === catKey).length;
              const isSelected = selectedCategory === catKey;
              const CatIcon = config.icon;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <CatIcon className="w-3 h-3" />
                  <span>{config.label}</span>
                  <span className="opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Main Grid: Calendar Box + Side Agenda Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Calendar View (7 Cols on desktop) */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center justify-center text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center justify-center text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((day, idx) => (
              <div
                key={day}
                className={`py-1 text-[11px] font-bold uppercase tracking-wider ${
                  idx >= 5 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-14 rounded-xl opacity-0 pointer-events-none" />;
              }

              const hasEvents = cell.events.length > 0;
              const hasHoliday = cell.events.some(e => e.isHoliday || e.category === 'libur');

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateKey)}
                  className={`h-14 rounded-xl p-1.5 flex flex-col justify-between text-left border transition-all cursor-pointer relative ${
                    cell.isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300 dark:ring-blue-700'
                      : cell.isToday
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold'
                      : hasHoliday
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200'
                      : hasEvents
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-800 dark:text-slate-200'
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isSelected ? 'text-white' : cell.isToday ? 'text-blue-600 dark:text-blue-400' : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isToday && !cell.isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>

                  {/* Event Indicator Badges / Dots */}
                  {hasEvents && (
                    <div className="flex items-center gap-1 flex-wrap mt-auto">
                      {cell.events.slice(0, 3).map((evt, eIdx) => {
                        const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.kegiatan;
                        return (
                          <span
                            key={eIdx}
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cell.isSelected ? '#ffffff' : cfg.color }}
                            title={`${evt.title} (${cfg.label})`}
                          />
                        );
                      })}
                      {cell.events.length > 3 && (
                        <span className="text-[9px] font-bold opacity-80">+{cell.events.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail & Upcoming Agenda (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Date Events */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Agenda Tanggal: <strong className="text-blue-600 dark:text-blue-400">{selectedDateStr || 'Pilih Tanggal'}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {selectedDateEvents.length} Event
              </span>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {selectedDateEvents.map(evt => {
                  const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.kegiatan;
                  const CatIcon = cfg.icon;

                  return (
                    <div
                      key={evt.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1.5 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.badgeClass}`}>
                          <CatIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>

                        {currentUserRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="text-slate-400 hover:text-rose-600 transition p-0.5 opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Hapus event ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {evt.title}
                      </h5>

                      {evt.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {evt.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {evt.location}
                          </span>
                        )}
                        {evt.endDate && evt.endDate !== evt.startDate && (
                          <span className="font-medium">
                            Sampai: {evt.endDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Tidak ada agenda sekolah yang dijadwalkan pada tanggal ini.
              </div>
            )}
          </div>

          {/* Upcoming School Events List */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Agenda Mendatang
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Terdekat</span>
            </div>

            <div className="space-y-2">
              {upcomingEvents.map(evt => {
                const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.kegiatan;
                const countdown = getCountdownLabel(evt.startDate);

                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedDateStr(evt.startDate);
                      const [y, m] = evt.startDate.split('-').map(Number);
                      setCurrentYear(y);
                      setCurrentMonth(m - 1);
                    }}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <h6 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {evt.title}
                        </h6>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 ml-4">
                        {evt.startDate} {evt.endDate ? `s/d ${evt.endDate}` : ''}
                      </div>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {countdown}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
        </div>
      )}

      {/* DISPLAY MODE 2: DAFTAR HARI LIBUR NASIONAL & SEKOLAH */}
      {activeDisplayMode === 'holidays' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  Daftar Hari Libur Nasional & Libur Sekolah
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Agenda libur resmi semester dan peringatan hari besar yang dikelola oleh Administrator.
                </p>
              </div>
            </div>

            {currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setNewEventCategory('libur');
                  setShowAddModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Hari Libur</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.filter(e => e.category === 'libur').length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                Belum ada data hari libur yang terdaftar.
              </div>
            ) : (
              events
                .filter(e => e.category === 'libur')
                .map((evt) => {
                  const countdown = getCountdownLabel(evt.startDate);
                  return (
                    <div
                      key={`hol-${evt.id}`}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 p-4.5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <Palmtree className="w-3 h-3" /> Libur Resmi
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {countdown}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5">
                          {evt.title}
                        </h5>

                        {evt.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{evt.startDate} {evt.endDate ? `s/d ${evt.endDate}` : ''}</span>
                        </div>

                        {currentUserRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                            title="Hapus Hari Libur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* DISPLAY MODE 3: JADWAL UJIAN & ASESMEN */}
      {activeDisplayMode === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                  Jadwal Ujian & Evaluasi Akademik (PTS / PAS / ANBK)
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  Kalender jadwal evaluasi hasil belajar siswa terpusat yang dapat dikelola khusus oleh Administrator.
                </p>
              </div>
            </div>

            {currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setNewEventCategory('ujian');
                  setShowAddModal(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Jadwal Ujian</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.filter(e => e.category === 'ujian').length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                Belum ada jadwal ujian yang terdaftar.
              </div>
            ) : (
              events
                .filter(e => e.category === 'ujian')
                .map((evt) => {
                  const countdown = getCountdownLabel(evt.startDate);
                  return (
                    <div
                      key={`exam-${evt.id}`}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 p-4.5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Asesmen / Ujian
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {countdown}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5">
                          {evt.title}
                        </h5>

                        {evt.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{evt.startDate} {evt.endDate ? `s/d ${evt.endDate}` : ''}</span>
                        </div>

                        {currentUserRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                            title="Hapus Jadwal Ujian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Tambah Agenda Kalender (Admin Only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tambah Agenda Kalender Akademik
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Agenda
                </label>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value as AcademicEventCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="ujian">Ujian & Asesmen (PTS/PAS/ANBK)</option>
                  <option value="libur">Libur Nasional & Sekolah</option>
                  <option value="kegiatan">Kegiatan Sekolah & Kesiswaan</option>
                  <option value="rapat">Rapat Dewan Guru & Orang Tua</option>
                  <option value="rapor">Pembagian Rapor / KHS Siswa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Agenda / Kegiatan
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Contoh: Gladi Bersih ANBK 2026 / Ujian Tengah Semester"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={newEventStartDate}
                    onChange={(e) => setNewEventStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={newEventEndDate}
                    onChange={(e) => setNewEventEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi / Keterangan Ruang (Opsional)
                </label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="Contoh: Ruang Lab Komputer / Lapangan Utama"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Keterangan singkat kegiatan..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
