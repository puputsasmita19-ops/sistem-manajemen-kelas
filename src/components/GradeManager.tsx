import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { GradeType } from '../types';
import Swal from 'sweetalert2';
import { Award, Save, BookOpen, Users, CheckCircle2, TrendingUp, Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import { ChartGrades } from './ChartGrades';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GradeManagerProps {
  currentRole: string;
  currentUserId: string;
}

interface StudentGradeRow {
  studentId: string;
  nama: string;
  subjectName?: string;
  tugas: number;
  uts: number;
  uas: number;
  finalScore: number;
  predicate: string;
}

export const GradeManager: React.FC<GradeManagerProps> = ({ currentRole, currentUserId }) => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const subjects = dbService.getAllSubjects();
  const appSettings = dbService.getAppSettings();

  // Pick teacher subjects
  const teacherSubjects = dbService.getSubjectsByTeacher(currentUserId);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_GRADE_CLASS_ID');
      if (saved && classes.some(c => c.id === saved)) return saved;
    } catch (e) {}
    return classes[0]?.id || '';
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_GRADE_SUBJECT_ID');
      if (saved && subjects.some(s => s.id === saved)) return saved;
    } catch (e) {}
    return teacherSubjects.length > 0 ? teacherSubjects[0].id : (subjects[0]?.id || '');
  });

  useEffect(() => {
    try {
      if (selectedClassId) localStorage.setItem('SIMAK_GRADE_CLASS_ID', selectedClassId);
    } catch (e) {}
  }, [selectedClassId]);

  useEffect(() => {
    try {
      if (selectedSubjectId) localStorage.setItem('SIMAK_GRADE_SUBJECT_ID', selectedSubjectId);
    } catch (e) {}
  }, [selectedSubjectId]);

  const [rows, setRows] = useState<StudentGradeRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const loadGrades = () => {
    if (!selectedClassId || !selectedSubjectId) return;
    const data = dbService.getGradesByClassAndSubject(selectedClassId, selectedSubjectId);
    setRows(data);
  };

  useEffect(() => {
    loadGrades();
  }, [selectedClassId, selectedSubjectId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  const handleScoreChange = (studentId: string, field: 'tugas' | 'uts' | 'uas', val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setRows(prev =>
      prev.map(row => {
        if (row.studentId === studentId) {
          const updated = { ...row, [field]: clamped };
          const finalScore = Math.round((updated.tugas * 0.3) + (updated.uts * 0.3) + (updated.uas * 0.4));
          let predicate = 'D';
          if (finalScore >= 88) predicate = 'A';
          else if (finalScore >= 78) predicate = 'B';
          else if (finalScore >= 68) predicate = 'C';

          return {
            ...updated,
            finalScore,
            predicate
          };
        }
        return row;
      })
    );
  };

  const handleSaveAll = () => {
    try {
      rows.forEach(r => {
        dbService.saveStudentGrade(r.studentId, selectedSubjectId, 'Tugas', r.tugas);
        dbService.saveStudentGrade(r.studentId, selectedSubjectId, 'UTS', r.uts);
        dbService.saveStudentGrade(r.studentId, selectedSubjectId, 'UAS', r.uas);
      });

      Swal.fire({
        icon: 'success',
        title: 'Nilai Berhasil Disimpan!',
        text: `Data nilai Tugas, UTS, dan UAS untuk seluruh siswa telah diperbarui.`,
        timer: 1800,
        showConfirmButton: false
      });
      loadGrades();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem'
      });
    }
  };

  // Export Class Grade Ledger to PDF using jsPDF
  const exportClassLedgerPDF = () => {
    if (rows.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Kosong',
        text: 'Tidak ada data nilai siswa untuk diekspor.'
      });
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Header Banner
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(appSettings.appName.toUpperCase() + ' — LAPORAN REKAPITULASI NILAI AKADEMIK', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${appSettings.appDescription || 'Sistem Informasi Manajemen Kelas'} • Dicetak: ${today}`, 14, 18);

      // Metadata Info Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Kelas: ${selectedClass?.nama_kelas || '-'} (${selectedClass?.tahun_ajaran || '-'})`, 14, 32);
      doc.text(`Mata Pelajaran: ${selectedSubject?.nama_mapel || '-'}`, 120, 32);
      doc.text(`Jumlah Siswa: ${rows.length} Orang`, 230, 32);

      // Statistics Row
      const avg = Math.round(rows.reduce((acc, r) => acc + r.finalScore, 0) / rows.length);
      const cntA = rows.filter(r => r.predicate === 'A').length;
      const cntB = rows.filter(r => r.predicate === 'B').length;
      const cntC = rows.filter(r => r.predicate === 'C').length;
      const cntD = rows.filter(r => r.predicate === 'D').length;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Rata-rata Kelas: ${avg} | Predikat A: ${cntA} | Predikat B: ${cntB} | Predikat C: ${cntC} | Predikat D: ${cntD}`, 14, 38);

      // Table Generation
      const tableData = rows.map((r, idx) => [
        (idx + 1).toString(),
        r.nama,
        r.tugas.toString(),
        r.uts.toString(),
        r.uas.toString(),
        r.finalScore.toString(),
        r.predicate,
        r.finalScore >= 68 ? 'TUNTAS' : 'REMEDIAL'
      ]);

      autoTable(doc, {
        head: [['No', 'Nama Siswa', 'Tugas (30%)', 'UTS (30%)', 'UAS (40%)', 'Nilai Akhir', 'Predikat', 'Status Kelulusan']],
        body: tableData,
        startY: 42,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { cellWidth: 80, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 26 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 35 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5
        }
      });

      // Signature Section
      const finalY = ((doc as any).lastAutoTable?.finalY || 130) + 12;
      if (finalY < 185) {
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Mengetahui,`, 220, finalY);
        doc.text(`Guru Pengampu / Wali Kelas`, 220, finalY + 5);
        doc.text(`( .................................................. )`, 220, finalY + 22);
      }

      // Save file
      const fileName = `Rekap_Nilai_${selectedClass?.nama_kelas || 'Kelas'}_${selectedSubject?.nama_mapel || 'Mapel'}.pdf`
        .replace(/\s+/g, '_');
      doc.save(fileName);

      Swal.fire({
        icon: 'success',
        title: 'PDF Berhasil Dibuat!',
        text: `Laporan nilai kelas "${selectedClass?.nama_kelas}" telah diunduh.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat PDF',
        text: err.message || 'Terjadi kesalahan saat memproses laporan.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export Individual Student Report Card to PDF
  const exportIndividualStudentPDF = (student: StudentGradeRow) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(appSettings.appName.toUpperCase(), 14, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('LEMBAR HASIL EVALUASI CAPAIAN PEMBELAJARAN SISWA', 14, 19);

      // Student Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('BIODATA PESERTA DIDIK', 14, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Nama Siswa`, 14, 43);
      doc.text(`: ${student.nama}`, 50, 43);
      doc.text(`Kelas / Rombel`, 14, 49);
      doc.text(`: ${selectedClass?.nama_kelas || '-'} (${selectedClass?.tahun_ajaran || '-'})`, 50, 49);
      doc.text(`Mata Pelajaran`, 14, 55);
      doc.text(`: ${selectedSubject?.nama_mapel || '-'}`, 50, 55);
      doc.text(`Tanggal Cetak`, 14, 61);
      doc.text(`: ${today}`, 50, 61);

      // Grade Breakdown Table
      autoTable(doc, {
        head: [['Komponen Penilaian', 'Bobot (%)', 'Skor Capaian', 'Predikat', 'Keterangan']],
        body: [
          ['Tugas / Portofolio Harian', '30%', student.tugas.toString(), student.tugas >= 75 ? 'Tuntas' : 'Perlu Bimbingan', 'Penugasan mandiri & kelompok'],
          ['Ujian Tengah Semester (UTS)', '30%', student.uts.toString(), student.uts >= 75 ? 'Tuntas' : 'Perlu Bimbingan', 'Evaluasi materi tengah semester'],
          ['Ujian Akhir Semester (UAS)', '40%', student.uas.toString(), student.uas >= 75 ? 'Tuntas' : 'Perlu Bimbingan', 'Evaluasi komprehensif akhir semester'],
          ['NILAI AKHIR KUMULATIF', '100%', student.finalScore.toString(), `Predikat ${student.predicate}`, student.finalScore >= 68 ? 'KOMPETEN / LULUS' : 'REMEDIAL']
        ],
        startY: 68,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3.5
        }
      });

      // Notes & Signature
      const finalY = ((doc as any).lastAutoTable?.finalY || 140) + 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Catatan & Rekomendasi Guru:', 14, finalY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const note = student.finalScore >= 88
        ? 'Sangat baik! Pertahankan prestasi dan terus kembangkan bakat kepemimpinan dalam diskusi kelas.'
        : student.finalScore >= 78
        ? 'Pencapaian baik! Tingkatkan keaktifan pengerjaan tugas mandiri untuk hasil yang lebih optimal.'
        : 'Perlu bimbingan lanjutan dan pengayaan materi pada topik yang belum tuntas.';
      doc.text(`"${note}"`, 14, finalY + 6);

      // Signatures
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Orang Tua / Wali Siswa,', 25, finalY + 25);
      doc.text('( ....................................... )', 25, finalY + 45);

      doc.text('Guru Mata Pelajaran,', 140, finalY + 25);
      doc.text('( ....................................... )', 140, finalY + 45);

      doc.save(`Rapor_${student.nama.replace(/\s+/g, '_')}_${selectedSubject?.nama_mapel || 'Mapel'}.pdf`);
      Swal.fire({
        icon: 'success',
        title: 'Rapor Siswa Terunduh!',
        text: `Laporan individual untuk ${student.nama} siap dicetak.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat Rapor',
        text: err.message
      });
    }
  };

  // Class statistics
  const averageFinal = rows.length > 0
    ? Math.round(rows.reduce((acc, r) => acc + r.finalScore, 0) / rows.length)
    : 0;
  const countA = rows.filter(r => r.predicate === 'A').length;
  const countB = rows.filter(r => r.predicate === 'B').length;
  const countC = rows.filter(r => r.predicate === 'C').length;
  const countD = rows.filter(r => r.predicate === 'D').length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Buku Nilai & Manajemen Akademik
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Input nilai Tugas, UTS, dan UAS dengan pembobotan otomatis (30% Tugas + 30% UTS + 40% UAS).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* PDF Export Button for Class Grade Data */}
            <button
              id="btn-export-pdf-grades"
              onClick={exportClassLedgerPDF}
              disabled={isExporting || rows.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl flex items-center gap-2 shadow-xs shadow-rose-500/20 transition cursor-pointer disabled:opacity-50"
              title="Ekspor Data Nilai Kelas Ini ke File PDF (jsPDF)"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Membuat PDF...' : 'Ekspor PDF Nilai Kelas'}</span>
            </button>

            {/* Save All Button */}
            <button
              id="btn-save-all-grades"
              onClick={handleSaveAll}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Semua Nilai
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Pilih Kelas
            </label>
            <select
              id="select-grade-class"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nama_kelas} ({c.tahun_ajaran})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Mata Pelajaran
            </label>
            <select
              id="select-grade-subject"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nama_mapel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase">Rata-Rata Kelas</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            {averageFinal}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">/ 100</span>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Predikat A (≥88)</div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{countA} <span className="text-xs font-normal">siswa</span></div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase">Predikat B (≥78)</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{countB} <span className="text-xs font-normal">siswa</span></div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase">Predikat C (≥68)</div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{countC} <span className="text-xs font-normal">siswa</span></div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase">Predikat D (&lt;68)</div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">{countD} <span className="text-xs font-normal">siswa</span></div>
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-colors">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Daftar Siswa & Formulir Penilaian
            </span>
            <button
              type="button"
              id="btn-export-pdf-table-toolbar"
              onClick={exportClassLedgerPDF}
              disabled={isExporting || rows.length === 0}
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="Ekspor Rekapitulasi Nilai Kelas Ini ke File PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Ekspor PDF ({selectedClass?.nama_kelas || 'Kelas'})</span>
            </button>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Rumus: <code className="bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 py-0.5 rounded font-mono">Nilai Akhir = (Tugas × 0.3) + (UTS × 0.3) + (UAS × 0.4)</code>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-28 text-center">Tugas (30%)</th>
                <th className="py-3 px-4 w-28 text-center">UTS (30%)</th>
                <th className="py-3 px-4 w-28 text-center">UAS (40%)</th>
                <th className="py-3 px-4 w-28 text-center">Nilai Akhir</th>
                <th className="py-3 px-4 w-24 text-center">Predikat</th>
                <th className="py-3 px-4 w-28 text-center">Cetak Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600 dark:text-slate-300 font-medium">
                    Tidak ada siswa pada kelas yang dipilih.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  let badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
                  if (row.predicate === 'A') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                  if (row.predicate === 'B') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
                  if (row.predicate === 'C') badgeColor = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';

                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-200 font-mono text-xs font-bold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.nama}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.tugas}
                          onChange={e => handleScoreChange(row.studentId, 'tugas', parseInt(e.target.value))}
                          className="w-20 text-center font-mono font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.uts}
                          onChange={e => handleScoreChange(row.studentId, 'uts', parseInt(e.target.value))}
                          className="w-20 text-center font-mono font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.uas}
                          onChange={e => handleScoreChange(row.studentId, 'uas', parseInt(e.target.value))}
                          className="w-20 text-center font-mono font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {row.finalScore}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
                          {row.predicate}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => exportIndividualStudentPDF(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition shadow-2xs cursor-pointer"
                          title={`Cetak Rapor PDF untuk ${row.nama}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>PDF Rapor</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Chart Comparison */}
      {rows.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition-colors">
          <ChartGrades
            title={`Perbandingan Nilai Siswa (${rows[0]?.subjectName || 'Mata Pelajaran'})`}
            labels={rows.map(r => r.nama.split(' ')[0])}
            tugas={rows.map(r => r.tugas)}
            uts={rows.map(r => r.uts)}
            uas={rows.map(r => r.uas)}
            finalScores={rows.map(r => r.finalScore)}
          />
        </div>
      )}
    </div>
  );
};
