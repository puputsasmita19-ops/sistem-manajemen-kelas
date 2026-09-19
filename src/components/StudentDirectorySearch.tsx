import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  GraduationCap,
  Users,
  School,
  Mail,
  Phone,
  Filter,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { User, ClassEntity } from '../types';
import { DatabaseService } from '../services/databaseService';

interface StudentDirectorySearchProps {
  students: User[];
  classes: ClassEntity[];
}

export const StudentDirectorySearch: React.FC<StudentDirectorySearchProps> = ({
  students,
  classes
}) => {
  const dbService = DatabaseService.getInstance();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');

  // Retrieve raw class_members mapping
  const classMembers = useMemo(() => {
    return Object.values(dbService.getRawSnapshot().class_members || {});
  }, [dbService]);

  // Enrich students with class information
  const enrichedStudents = useMemo(() => {
    return students.map(student => {
      const member = classMembers.find(cm => cm.student_id === student.id);
      const classId = member?.class_id || '';
      const cls = classes.find(c => c.id === classId);
      const className = cls?.nama_kelas || 'Belum Ada Kelas';
      const academicYear = cls?.tahun_ajaran || '2025/2026';

      return {
        ...student,
        classId,
        className,
        academicYear
      };
    });
  }, [students, classes, classMembers]);

  // Filter students based on searchTerm (name OR class ID) and selectedClassId
  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return enrichedStudents.filter(student => {
      // Filter by dropdown class if not ALL
      if (selectedClassId !== 'ALL' && student.classId !== selectedClassId) {
        return false;
      }

      // If search query is empty, pass all
      if (!query) return true;

      // 1) Match student name
      const matchName = student.nama.toLowerCase().includes(query);
      const matchUsername = student.username.toLowerCase().includes(query);

      // 2) Match class ID or class Name
      const matchClassId = student.classId.toLowerCase().includes(query);
      const matchClassName = student.className.toLowerCase().includes(query);

      // 3) Additional match for email
      const matchEmail = (student.email || '').toLowerCase().includes(query);

      return matchName || matchUsername || matchClassId || matchClassName || matchEmail;
    });
  }, [enrichedStudents, searchTerm, selectedClassId]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedClassId('ALL');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pencarian & Direktori Siswa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter data siswa secara realtime berdasarkan nama lengkap atau ID kelas
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Menampilkan <strong className="text-slate-900 dark:text-white">{filteredStudents.length}</strong> dari {students.length} siswa
        </div>
      </div>

      {/* Search Bar & Class Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-search-student-dashboard"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ketik nama siswa atau ID kelas (contoh: Ahmad, class_10_ipa1, X MIPA 1)..."
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900/90 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter by Class dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Kelas:</span>
          </div>
          <select
            id="select-filter-class-dashboard"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.nama_kelas} ({cls.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Class Quick Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Pintasan:
        </span>
        <button
          type="button"
          onClick={() => setSelectedClassId('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            selectedClassId === 'ALL'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Semua ({enrichedStudents.length})
        </button>
        {classes.map(c => {
          const count = enrichedStudents.filter(s => s.classId === c.id).length;
          const isSelected = selectedClassId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClassId(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{c.nama_kelas}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                {c.id}
              </span>
              <span className="opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Student Results Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {filteredStudents.map((student) => {
            const cleanWa = student.no_wa ? student.no_wa.replace(/\D/g, '').replace(/^0/, '62') : '';
            const waUrl = cleanWa ? `https://wa.me/${cleanWa}` : '';

            return (
              <div
                key={student.id}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:bg-white dark:hover:bg-slate-800/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {student.nama.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {student.nama}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          @{student.username}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                    </span>
                  </div>

                  {/* Class Info & Class ID Tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <School className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      {student.className}
                    </span>

                    {student.classId && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-600"
                        title="ID Kelas"
                      >
                        ID: {student.classId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 truncate" title={student.email}>
                    <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                    <span className="truncate">{student.email || '-'}</span>
                  </div>

                  {student.no_wa && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold shrink-0 ml-2"
                      title="Hubungi via WhatsApp"
                    >
                      <Phone className="w-3 h-3" />
                      <span>WA</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Tidak Ada Siswa yang Cocok
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ditemukan data siswa dengan nama atau ID kelas{' '}
              <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">"{searchTerm}"</strong>
              {selectedClassId !== 'ALL' && ` pada filter kelas "${selectedClassId}"`}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Pencarian</span>
          </button>
        </div>
      )}
    </div>
  );
};
