import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { GradeType, Attendance } from '../types';
import Swal from 'sweetalert2';
import { Award, Save, BookOpen, Users, CheckCircle2, TrendingUp, Download, FileText, Printer, FileSpreadsheet, Maximize2, Minimize2, Sparkles, Check } from 'lucide-react';
import { ChartGrades } from './ChartGrades';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

  // Zen Mode state for distraction-free grade input
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

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

  // Listen for Escape key to exit Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

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

  // Export Grade & Attendance data to Excel (.xlsx) format
  const exportGradeAndAttendanceExcel = () => {
    try {
      if (rows.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Data Belum Tersedia',
          text: 'Tidak ada data nilai siswa untuk diekspor.'
        });
        return;
      }

      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
      const allAttendance: Attendance[] = dbService.getAllAttendance().filter((a: Attendance) => a.class_id === selectedClassId);

      // 1. Workbook Creation
      const wb = XLSX.utils.book_new();

      // 2. Sheet 1: Rekapitulasi Nilai
      const gradeSheetData: any[][] = [
        ['LAPORAN REKAPITULASI NILAI SISWA'],
        [`Sekolah: ${appSettings.appName || 'SIMAK SEKOLAH'}`],
        [`Kelas: ${selectedClass?.nama_kelas || '-'} | Mata Pelajaran: ${selectedSubject?.nama_mapel || '-'}`],
        [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`],
        [],
        ['No', 'Nama Siswa', 'Tugas (30%)', 'UTS (30%)', 'UAS (40%)', 'Nilai Akhir', 'Predikat', 'Status Kelulusan']
      ];

      rows.forEach((r, idx) => {
        gradeSheetData.push([
          idx + 1,
          r.nama,
          r.tugas,
          r.uts,
          r.uas,
          r.finalScore,
          r.predicate,
          r.finalScore >= 68 ? 'TUNTAS' : 'REMEDIAL'
        ]);
      });

      // Add summary rows at the bottom of Nilai
      const avgScore = rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + r.finalScore, 0) / rows.length) : 0;
      gradeSheetData.push([]);
      gradeSheetData.push(['RATA-RATA KELAS', '', '', '', '', avgScore, '', avgScore >= 68 ? 'TUNTAS' : 'REMEDIAL']);

      const wsGrades = XLSX.utils.aoa_to_sheet(gradeSheetData);
      wsGrades['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsGrades, 'Rekap Nilai');

      // 3. Sheet 2: Rekapitulasi Presensi Kehadiran
      const attendanceSheetData: any[][] = [
        ['LAPORAN REKAPITULASI PRESENSI KEHADIRAN SISWA'],
        [`Sekolah: ${appSettings.appName || 'SIMAK SEKOLAH'}`],
        [`Kelas: ${selectedClass?.nama_kelas || '-'}`],
        [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`],
        [],
        ['No', 'Nama Siswa', 'Hadir (H)', 'Izin (I)', 'Sakit (S)', 'Alpa (A)', 'Total Sesi', 'Persentase Hadir (%)', 'Keterangan Disiplin']
      ];

      rows.forEach((r, idx) => {
        const studentAtt = allAttendance.filter(a => a.student_id === r.studentId);
        const h = studentAtt.filter(a => a.status === 'H').length;
        const i = studentAtt.filter(a => a.status === 'I').length;
        const s = studentAtt.filter(a => a.status === 'S').length;
        const a = studentAtt.filter(a => a.status === 'A').length;
        const total = studentAtt.length;
        const pct = total > 0 ? Math.round((h / total) * 100) : 100;
        const statusDisiplin = pct >= 85 ? 'Sangat Baik' : pct >= 75 ? 'Cukup' : 'Perlu Pembinaan';

        attendanceSheetData.push([
          idx + 1,
          r.nama,
          h,
          i,
          s,
          a,
          total,
          `${pct}%`,
          statusDisiplin
        ]);
      });

      const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceSheetData);
      wsAttendance['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 20 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Rekap Presensi');

      // 4. Download file
      const fileName = `Rekap_Nilai_dan_Presensi_${selectedClass?.nama_kelas || 'Kelas'}_${selectedSubject?.nama_mapel || 'Mapel'}.xlsx`
        .replace(/\s+/g, '_');
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Excel Berhasil Diekspor!',
        text: `File "${fileName}" berisi Rekap Nilai & Rekap Presensi berhasil diunduh.`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error exporting excel:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Excel',
        text: err.message || 'Terjadi kesalahan sistem saat mengekspor ke Excel.'
      });
    }
  };

  // Export Individual Student Report Card to PDF with Official School Letterhead (Kop Surat dari AppSettings)
  const exportIndividualStudentPDF = (student: StudentGradeRow) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // 182mm

      const todayFormatted = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // -------------------------------------------------------------
      // 1. KOP SURAT RESMI SEKOLAH (DARI AppSettings)
      // -------------------------------------------------------------
      let currentY = 13;

      // Baris 1: Nama Lembaga / Sekolah (Uppercase, Bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      const schoolTitle = (appSettings.appName || 'SIMAK SEKOLAH').toUpperCase();
      doc.text(schoolTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      // Baris 2: Sub-judul / Satuan Pendidikan
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700
      const subTitle = appSettings.appDescription || 'Sistem Manajemen Kelas & Administrasi Pendidikan Terpadu';
      doc.text(subTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;

      // Baris 3: Alamat Lengkap Sekolah (dari appSettings.schoolAddress)
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      const addressText = appSettings.schoolAddress || 'Kompleks Pendidikan Utama No. 1, Jakarta';
      doc.text(addressText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4;

      // Baris 4: Kontak / Telepon / WA (dari appSettings.adminPhone)
      const contactText = `Layanan Informasi / WhatsApp: ${appSettings.adminPhone || '0812-3456-7890'} • Portal Akademik Resmi`;
      doc.text(contactText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;

      // Garis Ganda Kop Surat Resmi (Official Indonesian School Double Line Standard)
      // Garis tebal pertama
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1.1);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      // Garis tipis kedua
      currentY += 1.2;
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6.5;

      // -------------------------------------------------------------
      // 2. JUDUL DOKUMEN LAPORAN NILAI
      // -------------------------------------------------------------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(30, 41, 59);
      doc.text('LAPORAN CAPAIAN HASIL BELAJAR PESERTA DIDIK', pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tahun Ajaran ${selectedClass?.tahun_ajaran || '2025/2026'} — Semester Ganjil`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;

      // -------------------------------------------------------------
      // 3. KOTAK BIODATA SISWA (CARD ELEGAN)
      // -------------------------------------------------------------
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, currentY, contentWidth, 23, 2, 2, 'FD');

      doc.setFontSize(8.5);
      const col1X = margin + 4;
      const col1ValX = margin + 34;
      const col2X = margin + 98;
      const col2ValX = margin + 128;
      let bioY = currentY + 5;

      // Kolom 1
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Nama Siswa', col1X, bioY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${student.nama}`, col1ValX, bioY);

      // Kolom 2
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Kelas / Rombel', col2X, bioY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${selectedClass?.nama_kelas || '-'}`, col2ValX, bioY);

      bioY += 5.5;
      // Baris 2
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('ID / NISN Siswa', col1X, bioY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${student.studentId}`, col1ValX, bioY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Mata Pelajaran', col2X, bioY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${selectedSubject?.nama_mapel || '-'}`, col2ValX, bioY);

      bioY += 5.5;
      // Baris 3
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Tanggal Terbit', col1X, bioY);
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${todayFormatted}`, col1ValX, bioY);

      const waliKelasUser = selectedClass ? dbService.getUserById(selectedClass.wali_kelas_id) : null;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Wali Kelas', col2X, bioY);
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${waliKelasUser?.nama || 'Wali Kelas'}`, col2ValX, bioY);

      currentY += 27;

      // -------------------------------------------------------------
      // 4. TABEL RINCIAN EVALUASI NILAI
      // -------------------------------------------------------------
      const isLulus = student.finalScore >= 68;
      autoTable(doc, {
        head: [['No', 'Komponen Asesmen', 'Bobot', 'Nilai Capaian', 'Predikat', 'Keterangan Ketuntasan']],
        body: [
          ['1', 'Tugas & Portofolio Harian', '30%', student.tugas.toString(), student.tugas >= 75 ? 'Tuntas' : 'Perlu Pengayaan', 'Penugasan mandiri & keaktifan terstruktur'],
          ['2', 'Ujian Tengah Semester (UTS)', '30%', student.uts.toString(), student.uts >= 75 ? 'Tuntas' : 'Perlu Pendampingan', 'Evaluasi sumatif materi tengah semester'],
          ['3', 'Ujian Akhir Semester (UAS)', '40%', student.uas.toString(), student.uas >= 75 ? 'Tuntas' : 'Perlu Bimbingan', 'Evaluasi komprehensif capaian akhir semester'],
          ['★', 'NILAI AKHIR KUMULATIF', '100%', student.finalScore.toString(), `Predikat ${student.predicate}`, isLulus ? 'TUNTAS (MEMENUHI KKM)' : 'REMEDIAL']
        ],
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235], // Blue 600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8.5
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
          1: { cellWidth: 55, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 26 },
          5: { cellWidth: 47, fontSize: 7.8 }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        },
        didParseCell: function(data) {
          if (data.row.index === 3) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = isLulus ? [236, 253, 245] : [255, 241, 242];
            if (data.column.index === 3 || data.column.index === 5) {
              data.cell.styles.textColor = isLulus ? [5, 150, 105] : [225, 29, 72];
            }
          }
        }
      });

      let nextY = (doc as any).lastAutoTable?.finalY + 6;

      // -------------------------------------------------------------
      // 5. KOTAK REKAPITULASI CAPAIAN MAPEL LAIN (JIKA TERSEDIA)
      // -------------------------------------------------------------
      const fullReport = dbService.getStudentReport(student.studentId);
      if (fullReport && fullReport.gradeDetails && fullReport.gradeDetails.length > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Rangkuman Nilai Seluruh Mata Pelajaran Siswa:', margin, nextY);
        nextY += 2.5;

        const allMapelBody = fullReport.gradeDetails.map((g, idx) => [
          (idx + 1).toString(),
          g.subjectName,
          g.tugas.toString(),
          g.uts.toString(),
          g.uas.toString(),
          g.finalScore.toString(),
          g.predicate
        ]);

        autoTable(doc, {
          head: [['No', 'Mata Pelajaran', 'Tugas', 'UTS', 'UAS', 'Akhir', 'Predikat']],
          body: allMapelBody,
          startY: nextY,
          theme: 'striped',
          headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            halign: 'center',
            fontSize: 7.5
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 70 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 1.8
          }
        });

        nextY = (doc as any).lastAutoTable?.finalY + 6;
      }

      // -------------------------------------------------------------
      // 6. CATATAN GURU & CAPAIAN KOMPETENSI
      // -------------------------------------------------------------
      if (nextY > 230) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Catatan & Rekomendasi Guru Pengampu:', margin, nextY);
      nextY += 4;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const noteText = student.finalScore >= 88
        ? 'Sangat baik! Menunjukkan penguasaan kompetensi yang luar biasa. Pertahankan prestasi dan jadilah teladan dalam diskusi serta kolaborasi ilmiah di kelas.'
        : student.finalScore >= 78
        ? 'Pencapaian baik! Memiliki pemahaman materi yang konsisten. Terus pertahankan kedisiplinan dan tingkatkan partisipasi aktif saat penugasan mandiri.'
        : student.finalScore >= 68
        ? 'Capaian telah memenuhi standar KKM minimal. Disarankan untuk menambah referensi belajar dan lebih aktif dalam sesi tanya jawab materi.'
        : 'Perlu bimbingan dan remedial terstruktur pada materi yang belum tuntas. Diharapkan berkomunikasi dengan guru untuk bimbingan tambahan.';

      const splitNote = doc.splitTextToSize(`"${noteText}"`, contentWidth);
      doc.text(splitNote, margin, nextY);
      nextY += splitNote.length * 4 + 7;

      // -------------------------------------------------------------
      // 7. TANDA TANGAN PENGESAHAN DUA PIHAK
      // -------------------------------------------------------------
      if (nextY > 245) {
        doc.addPage();
        nextY = 25;
      }

      const colLeftX = margin + 15;
      const colRightX = pageWidth - margin - 55;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      doc.text('Mengetahui,', colLeftX, nextY);
      const city = appSettings.schoolAddress ? (appSettings.schoolAddress.split(',')[1]?.trim() || 'Jakarta') : 'Jakarta';
      doc.text(`${city}, ${todayFormatted.split(',')[1]?.trim() || todayFormatted}`, colRightX, nextY);

      nextY += 4.5;
      doc.text('Orang Tua / Wali Siswa,', colLeftX, nextY);
      doc.text('Guru Pengampu / Wali Kelas,', colRightX, nextY);

      nextY += 18;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('( ............................................ )', colLeftX, nextY);
      const currentTeacher = dbService.getUserById(currentUserId);
      const teacherName = currentTeacher ? currentTeacher.nama : (waliKelasUser?.nama || 'Guru Pengampu');
      doc.text(`( ${teacherName} )`, colRightX, nextY);

      // Save PDF file
      const cleanFileName = `Rapor_${student.nama.replace(/\s+/g, '_')}_${selectedSubject?.nama_mapel || 'Mapel'}_${selectedClass?.nama_kelas || 'Kelas'}.pdf`;
      doc.save(cleanFileName);

      Swal.fire({
        icon: 'success',
        title: 'Rapor Siswa Berhasil Diunduh!',
        text: `Laporan capaian nilai untuk ${student.nama} lengkap dengan kop surat sekolah siap dicetak.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error generating student report PDF:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat Rapor',
        text: err.message || 'Terjadi kesalahan sistem saat mengekspor laporan.'
      });
    }
  };

  // Export Individual Student Report & Attendance to Excel (.xlsx)
  const exportIndividualStudentExcel = (student: StudentGradeRow) => {
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
      const studentAttendance: Attendance[] = dbService.getAllAttendance().filter((a: Attendance) => a.student_id === student.studentId && a.class_id === selectedClassId);

      const hadir = studentAttendance.filter(a => a.status === 'H').length;
      const izin = studentAttendance.filter(a => a.status === 'I').length;
      const sakit = studentAttendance.filter(a => a.status === 'S').length;
      const alpa = studentAttendance.filter(a => a.status === 'A').length;
      const totalSesi = studentAttendance.length;
      const pctHadir = totalSesi > 0 ? `${Math.round((hadir / totalSesi) * 100)}%` : '100%';

      const wb = XLSX.utils.book_new();

      const data: any[][] = [
        ['LAPORAN HASIL BELAJAR & PRESENSI INDIVIDUAL'],
        [`Sekolah: ${appSettings.appName || 'SIMAK SEKOLAH'}`],
        [`Alamat: ${appSettings.schoolAddress || '-'}`],
        [],
        ['DATA SISWA & AKADEMIK'],
        ['Nama Lengkap', student.nama],
        ['Kelas', selectedClass?.nama_kelas || '-'],
        ['Mata Pelajaran', selectedSubject?.nama_mapel || '-'],
        ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
        [],
        ['RINCIAN NILAI KOMPONEN', 'BOBOT', 'NILAI', 'NILAI TERBOBOT'],
        ['Nilai Tugas Mandiri / Harian', '30%', student.tugas, (student.tugas * 0.3).toFixed(1)],
        ['Ujian Tengah Semester (UTS)', '30%', student.uts, (student.uts * 0.3).toFixed(1)],
        ['Ujian Akhir Semester (UAS)', '40%', student.uas, (student.uas * 0.4).toFixed(1)],
        ['NILAI AKHIR KUMULATIF', '100%', student.finalScore, student.finalScore],
        ['Predikat Capaian', '', student.predicate, ''],
        ['Status Kelulusan', '', student.finalScore >= 68 ? 'TUNTAS' : 'REMEDIAL', ''],
        [],
        ['REKAPITULASI PRESENSI KEHADIRAN'],
        ['Hadir (H)', hadir],
        ['Izin (I)', izin],
        ['Sakit (S)', sakit],
        ['Alpa (A)', alpa],
        ['Total Pertemuan', totalSesi],
        ['Persentase Kehadiran', pctHadir]
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Rapor Siswa');

      const fileName = `Rapor_${student.nama.replace(/\s+/g, '_')}_${selectedSubject?.nama_mapel || 'Mapel'}.xlsx`;
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Excel Rapor Diunduh!',
        text: `Data nilai dan presensi ${student.nama} berhasil diekspor ke Excel.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error exporting individual student excel:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Excel',
        text: err.message || 'Terjadi kesalahan sistem saat mengekspor ke Excel.'
      });
    }
  };

  // Modal dialog to select student and export PDF
  const handleOpenExportStudentModal = () => {
    if (rows.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Siswa Kosong',
        text: 'Belum ada data siswa di kelas ini.'
      });
      return;
    }

    const inputOptions: Record<string, string> = {};
    rows.forEach(r => {
      inputOptions[r.studentId] = `${r.nama} — Skor Akhir: ${r.finalScore} (${r.predicate})`;
    });

    Swal.fire({
      title: 'Cetak Rapor Nilai Per Siswa',
      text: 'Pilih siswa untuk mengunduh laporan capaian hasil belajar individual (PDF lengkap dengan kop surat resmi sekolah):',
      input: 'select',
      inputOptions,
      inputPlaceholder: '-- Pilih Nama Siswa --',
      showCancelButton: true,
      confirmButtonText: 'Unduh Rapor PDF',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563EB',
      inputValidator: (value) => {
        if (!value) {
          return 'Silakan pilih siswa terlebih dahulu!';
        }
        return null;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const targetStudent = rows.find(r => r.studentId === res.value);
        if (targetStudent) {
          exportIndividualStudentPDF(targetStudent);
        }
      }
    });
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

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Zen Mode Button */}
            <button
              id="btn-toggle-zen-mode"
              type="button"
              onClick={() => setIsZenMode(true)}
              className="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer flex-1 sm:flex-initial"
              title="Aktifkan Mode Fokus (Zen Mode) untuk menyembunyikan navigasi & distraksi saat input nilai"
            >
              <Maximize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Mode Fokus (Zen)</span>
            </button>

            {/* PDF Export Button for Individual Student Report Card */}
            <button
              id="btn-export-student-pdf"
              onClick={handleOpenExportStudentModal}
              disabled={rows.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
              title="Cetak Laporan Rapor Per Siswa ke File PDF Lengkap dengan Kop Sekolah Resmi"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak Rapor Siswa</span>
            </button>

            {/* PDF Export Button for Class Grade Data */}
            <button
              id="btn-export-pdf-grades"
              onClick={exportClassLedgerPDF}
              disabled={isExporting || rows.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-rose-500/20 transition cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
              title="Ekspor Rekap Nilai Satu Kelas ke File PDF (jsPDF)"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Membuat PDF...' : 'Ekspor PDF Rekap'}</span>
            </button>

            {/* Excel Export Button (.xlsx) */}
            <button
              id="btn-export-excel-grades"
              onClick={exportGradeAndAttendanceExcel}
              disabled={rows.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
              title="Ekspor Rekap Nilai dan Presensi Kelas ke Format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            {/* Save All Button */}
            <button
              id="btn-save-all-grades"
              onClick={handleSaveAll}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer flex-1 sm:flex-initial"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Nilai</span>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => exportIndividualStudentPDF(row)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition shadow-2xs cursor-pointer"
                            title={`Cetak Rapor PDF untuk ${row.nama}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => exportIndividualStudentExcel(row)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition shadow-2xs cursor-pointer"
                            title={`Ekspor Nilai & Presensi ${row.nama} ke Excel (.xlsx)`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Excel</span>
                          </button>
                        </div>
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

      {/* ZEN MODE FULLSCREEN OVERLAY (Hides all navbar, sidebar, tabs & distractions) */}
      {isZenMode && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex flex-col justify-start animate-in fade-in duration-200">
          <div className="max-w-7xl w-full mx-auto space-y-4">
            {/* Top Floating Zen Bar */}
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                      Mode Fokus / Zen Mode (Input Nilai Siswa)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Bebas Distraksi
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Navigasi dan menu disembunyikan. Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px] border border-slate-600">Esc</kbd> untuk keluar.
                  </p>
                </div>
              </div>

              {/* Quick Selectors in Zen Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 font-medium">Kelas:</span>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                        {c.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 font-medium">Mapel:</span>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-800 text-white">
                        {s.nama_mapel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save All Button in Zen Mode */}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Nilai</span>
                </button>

                {/* Exit Zen Mode Button */}
                <button
                  type="button"
                  onClick={() => setIsZenMode(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-600"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Keluar (Esc)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar in Zen Mode */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Rata-Rata</span>
                <p className="text-xl font-bold text-white mt-0.5">{averageFinal} / 100</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">Predikat A</span>
                <p className="text-xl font-bold text-emerald-300 mt-0.5">{countA} Siswa</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] text-blue-400 uppercase font-semibold">Predikat B</span>
                <p className="text-xl font-bold text-blue-300 mt-0.5">{countB} Siswa</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] text-amber-400 uppercase font-semibold">Predikat C</span>
                <p className="text-xl font-bold text-amber-300 mt-0.5">{countC} Siswa</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                <span className="text-[10px] text-rose-400 uppercase font-semibold">Predikat D</span>
                <p className="text-xl font-bold text-rose-300 mt-0.5">{countD} Siswa</p>
              </div>
            </div>

            {/* Zen Mode Grade Input Table */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/60 text-[11px] uppercase tracking-wider font-bold text-slate-300">
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4 w-32 text-center text-indigo-300">Tugas (30%)</th>
                      <th className="py-3.5 px-4 w-32 text-center text-indigo-300">UTS (30%)</th>
                      <th className="py-3.5 px-4 w-32 text-center text-indigo-300">UAS (40%)</th>
                      <th className="py-3.5 px-4 w-28 text-center text-white">Nilai Akhir</th>
                      <th className="py-3.5 px-4 w-24 text-center">Predikat</th>
                      <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-sm">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          Tidak ada siswa pada kelas yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        let badgeColor = 'bg-rose-900/40 text-rose-300 border-rose-700';
                        if (row.predicate === 'A') badgeColor = 'bg-emerald-900/40 text-emerald-300 border-emerald-700';
                        if (row.predicate === 'B') badgeColor = 'bg-blue-900/40 text-blue-300 border-blue-700';
                        if (row.predicate === 'C') badgeColor = 'bg-amber-900/40 text-amber-300 border-amber-700';

                        return (
                          <tr key={`zen-${row.studentId}`} className="hover:bg-slate-700/40 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs font-bold">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              {row.nama}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.tugas}
                                onChange={e => handleScoreChange(row.studentId, 'tugas', parseInt(e.target.value))}
                                className="w-24 text-center font-mono font-bold text-base bg-slate-900 border border-slate-600 focus:border-indigo-400 rounded-xl py-2 px-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.uts}
                                onChange={e => handleScoreChange(row.studentId, 'uts', parseInt(e.target.value))}
                                className="w-24 text-center font-mono font-bold text-base bg-slate-900 border border-slate-600 focus:border-indigo-400 rounded-xl py-2 px-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.uas}
                                onChange={e => handleScoreChange(row.studentId, 'uas', parseInt(e.target.value))}
                                className="w-24 text-center font-mono font-bold text-base bg-slate-900 border border-slate-600 focus:border-indigo-400 rounded-xl py-2 px-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-lg text-white">
                              {row.finalScore}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                {row.predicate}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => exportIndividualStudentPDF(row)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-900/40 hover:bg-blue-800/50 border border-blue-700 rounded-xl transition cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-blue-400" />
                                <span>Rapor</span>
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
          </div>
        </div>
      )}
    </div>
  );
};
