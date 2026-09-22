import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Layers,
  School,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Award,
  Search,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Printer,
  FileText,
  Sparkles,
  ExternalLink,
  Filter,
  Check,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import { PrintAndExportService } from '../services/printAndExportService';
import { DatabaseService } from '../services/databaseService';
import { Pagination } from './Pagination';
import {
  User,
  ClassEntity,
  AcademicYear,
  Curriculum,
  Department,
  MasterSubject,
  Extracurricular,
  StudyScheduleSlot,
  AcademicEvent,
  AppSettings
} from '../types';

interface OverallMasterDataManagerProps {
  currentUser: User;
  onNavigateTab?: (tab: string) => void;
}

type EntityCategory =
  | 'overview'
  | 'classes'
  | 'teachers'
  | 'students'
  | 'parents'
  | 'subjects'
  | 'curriculum'
  | 'agenda'
  | 'schedule'
  | 'extracurricular'
  | 'school_profile';

export const OverallMasterDataManager: React.FC<OverallMasterDataManagerProps> = ({
  currentUser,
  onNavigateTab
}) => {
  const dbService = DatabaseService.getInstance();
  const rawDb = dbService.getRawSnapshot();

  const [activeCategory, setActiveCategory] = useState<EntityCategory>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
    type: string;
    data: any;
  } | null>(null);

  // Derived datasets
  const allUsers = useMemo(() => Object.values(rawDb.users || {}), [rawDb]);
  const allClasses = useMemo(() => Object.values(rawDb.classes || {}), [rawDb]);
  const allSubjects = useMemo(() => dbService.getMasterSubjects(), [rawDb]);
  const allAcademicYears = useMemo(() => dbService.getAcademicYears(), [rawDb]);
  const allCurriculums = useMemo(() => dbService.getCurriculums(), [rawDb]);
  const allDepartments = useMemo(() => dbService.getDepartments(), [rawDb]);
  const allExtracurriculars = useMemo(() => dbService.getExtracurriculars(), [rawDb]);
  const allStudySchedules = useMemo(() => dbService.getStudySchedules(), [rawDb]);
  const allEvents = useMemo(() => dbService.getAllAcademicEvents(), [rawDb]);
  const appSettings: AppSettings = useMemo(() => dbService.getAppSettings(), [rawDb]);

  // Relation helpers
  const getParentOfStudent = (studentId: string): User | undefined => {
    const rel = Object.values(rawDb.parent_student_relations || {}).find(r => r.student_id === studentId);
    return rel ? rawDb.users[rel.parent_id] : undefined;
  };

  const getStudentClassMembers = (classId: string) => {
    return Object.values(rawDb.class_members || {}).filter(cm => cm.class_id === classId);
  };

  // User segments
  const teachers = useMemo(
    () => allUsers.filter(u => u.role === 'guru' || u.role === 'wali_kelas'),
    [allUsers]
  );
  const students = useMemo(() => allUsers.filter(u => u.role === 'siswa'), [allUsers]);
  const parents = useMemo(() => allUsers.filter(u => u.role === 'orang_tua'), [allUsers]);
  const activeAY = useMemo(() => allAcademicYears.find(y => y.status === 'Aktif'), [allAcademicYears]);

  // Data Integrity & Consistency Audit
  const auditReport = useMemo(() => {
    // 1. Siswa tanpa kelas
    const studentsWithoutClass = students.filter(s => {
      const cls = dbService.getStudentClass(s.id);
      return !cls;
    });

    // 2. Kelas tanpa wali kelas
    const classesWithoutHomeroom = allClasses.filter(c => !c.wali_kelas_id);

    // 3. Guru tanpa mapel pengampu
    const teachersWithoutSubject = teachers.filter(t => {
      const subs = dbService.getSubjectsByTeacher(t.id);
      return subs.length === 0;
    });

    // 4. Siswa tanpa data orang tua
    const studentsWithoutParent = students.filter(s => {
      const p = getParentOfStudent(s.id);
      return !p;
    });

    // Health Score calculation
    let deductions = 0;
    if (studentsWithoutClass.length > 0) deductions += 15;
    if (classesWithoutHomeroom.length > 0) deductions += 20;
    if (teachersWithoutSubject.length > 0) deductions += 10;
    if (studentsWithoutParent.length > 0) deductions += 5;

    const score = Math.max(50, 100 - deductions);

    return {
      score,
      studentsWithoutClass,
      classesWithoutHomeroom,
      teachersWithoutSubject,
      studentsWithoutParent,
      isPerfect: deductions === 0
    };
  }, [students, teachers, allClasses, dbService]);

  // Handle Complete Workbook Export to Excel (.xlsx)
  const handleExportMasterWorkbook = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet Ringkasan Master
      const summaryData = [
        ['LAPORAN MASTER DATA KESELURUHAN APLIKASI SIMAK'],
        ['Instansi / Sekolah', appSettings.appName || 'SIMAK'],
        ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
        ['Diekspor Oleh', currentUser.nama + ` (${currentUser.role.toUpperCase()})`],
        ['Tahun Ajaran Aktif', activeAY ? `${activeAY.tahun} - Semester ${activeAY.semesterAktif}` : 'Belum Diatur'],
        [],
        ['ENTITAS MASTER DATA', 'JUMLAH DATA', 'STATUS SINKRONISASI'],
        ['Rombongan Belajar (Kelas)', allClasses.length, 'Tersimpan'],
        ['Tenaga Pendidik (Guru & Wali Kelas)', teachers.length, 'Aktif'],
        ['Peserta Didik (Siswa)', students.length, 'Aktif'],
        ['Wali Murid (Orang Tua)', parents.length, 'Terdaftar'],
        ['Master Mata Pelajaran', allSubjects.length, 'Tersedia'],
        ['Kurikulum Pendidikan', allCurriculums.length, 'Terkonfigurasi'],
        ['Program Keahlian / Jurusan', allDepartments.length, 'Tersedia'],
        ['Ekstrakurikuler', allExtracurriculars.length, 'Aktif'],
        ['Jadwal Jam Pelajaran KBM', allStudySchedules.length, 'Tersusun'],
        ['Agenda Kalender Akademik', allEvents.length, 'Terjadwal']
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Master');

      // 2. Sheet Profil Sekolah
      const schoolData = [
        ['PARAMETER', 'NILAI PENGATURAN'],
        ['Nama Aplikasi / Instansi', appSettings.appName],
        ['Deskripsi / Slogan', appSettings.appDescription],
        ['Alamat Sekolah', appSettings.schoolAddress || '-'],
        ['Latitude Geofence', appSettings.schoolLatitude || 0],
        ['Longitude Geofence', appSettings.schoolLongitude || 0],
        ['Radius Presensi (Meter)', appSettings.schoolRadiusMeters || 200],
        ['Batas Jam Presensi Pagi', appSettings.attendanceCutoffTime || '07:30'],
        ['Nomor Admin / Call Center', appSettings.adminPhone || '-'],
        ['Nama Pengembang / Creator', appSettings.creatorName || 'Puput Sasmita'],
        ['Proteksi Anti-Cheat', appSettings.antiCheatEnabled !== false ? 'Aktif' : 'Nonaktif']
      ];
      const wsSchool = XLSX.utils.aoa_to_sheet(schoolData);
      XLSX.utils.book_append_sheet(wb, wsSchool, 'Profil_Sekolah');

      // 3. Sheet Master Kelas
      const classRows = allClasses.map((c, idx) => {
        const homeroomUser = allUsers.find(u => u.id === c.wali_kelas_id);
        const enrolled = getStudentClassMembers(c.id);
        return {
          No: idx + 1,
          'ID Kelas': c.id,
          'Nama Rombel / Kelas': c.nama_kelas,
          'Tahun Ajaran': c.tahun_ajaran,
          'ID Wali Kelas': c.wali_kelas_id || '-',
          'Nama Wali Kelas': homeroomUser ? homeroomUser.nama : 'Belum Ditentukan',
          'NIP Wali Kelas': homeroomUser?.nip || '-',
          'Jumlah Siswa': enrolled.length
        };
      });
      const wsClass = XLSX.utils.json_to_sheet(classRows);
      XLSX.utils.book_append_sheet(wb, wsClass, 'Master_Kelas');

      // 4. Sheet Master Guru
      const teacherRows = teachers.map((t, idx) => {
        const wkClass = dbService.getHomeroomClass(t.id);
        const mapelList = dbService.getSubjectsByTeacher(t.id).map(s => s.nama_mapel).join(', ');
        return {
          No: idx + 1,
          'ID Guru': t.id,
          'Nama Lengkap': t.nama,
          NIP: t.nip || '-',
          Username: t.username || '-',
          Email: t.email || '-',
          'No WhatsApp': t.no_wa || '-',
          Peran: t.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru Mapel',
          'Wali Kelas di': wkClass ? wkClass.nama_kelas : '-',
          'Mapel Diampu': mapelList || 'Belum Ditentukan'
        };
      });
      const wsTeacher = XLSX.utils.json_to_sheet(teacherRows);
      XLSX.utils.book_append_sheet(wb, wsTeacher, 'Master_Guru');

      // 5. Sheet Master Siswa
      const studentRows = students.map((s, idx) => {
        const cls = dbService.getStudentClass(s.id);
        const parent = getParentOfStudent(s.id);
        return {
          No: idx + 1,
          'ID Siswa': s.id,
          'Nama Lengkap': s.nama,
          NISN: s.nisn || '-',
          NIS: s.nis || '-',
          Kelas: cls ? cls.nama_kelas : 'Belum Ada Kelas',
          Username: s.username || '-',
          'Jenis Kelamin': s.jenis_kelamin || '-',
          'Nama Wali Murid': parent ? parent.nama : '-',
          'No WA Wali': parent ? parent.no_wa : (s.no_wa || '-')
        };
      });
      const wsStudent = XLSX.utils.json_to_sheet(studentRows);
      XLSX.utils.book_append_sheet(wb, wsStudent, 'Master_Siswa');

      // 6. Sheet Master Orang Tua
      const parentRows = parents.map((p, idx) => {
        const children = dbService.getChildrenOfParent(p.id).map(c => c.nama).join(', ');
        return {
          No: idx + 1,
          'ID Wali': p.id,
          'Nama Lengkap': p.nama,
          Username: p.username || '-',
          'No WhatsApp': p.no_wa || '-',
          Email: p.email || '-',
          'Anak Asuh (Siswa)': children || '-'
        };
      });
      const wsParent = XLSX.utils.json_to_sheet(parentRows);
      XLSX.utils.book_append_sheet(wb, wsParent, 'Master_Orang_Tua');

      // 7. Sheet Master Mapel
      const subjectRows = allSubjects.map((sb, idx) => {
        const teacher = allUsers.find(u => u.id === sb.guru_id);
        return {
          No: idx + 1,
          'Kode Mapel': sb.kode_mapel,
          'Nama Mata Pelajaran': sb.nama_mapel,
          Kelompok: sb.kelompok,
          KKM: sb.kkm,
          'Tingkat Kelas': sb.tingkatKelas || 'Semua',
          'Alokasi Jam/Minggu': sb.alokasiJamPerMinggu || 2,
          'Guru Pengampu': teacher ? teacher.nama : 'Belum Ditentukan',
          Status: sb.status
        };
      });
      const wsSubject = XLSX.utils.json_to_sheet(subjectRows);
      XLSX.utils.book_append_sheet(wb, wsSubject, 'Master_Mapel');

      // 8. Sheet Kurikulum & Jurusan
      const currRows = allCurriculums.map((cr, idx) => ({
        No: idx + 1,
        'Kode Kurikulum': cr.kode,
        'Nama Kurikulum': cr.nama,
        Tingkat: Array.isArray(cr.tingkat) ? cr.tingkat.join(', ') : cr.tingkat,
        Status: cr.status,
        Deskripsi: cr.deskripsi || '-'
      }));
      const wsCurr = XLSX.utils.json_to_sheet(currRows);
      XLSX.utils.book_append_sheet(wb, wsCurr, 'Master_Kurikulum');

      const deptRows = allDepartments.map((dp, idx) => ({
        No: idx + 1,
        'Kode Jurusan': dp.kode,
        'Nama Program Keahlian': dp.nama,
        'Kepala Program': dp.kepalaProgram || '-',
        'Kuota Tampung': dp.kuota,
        Status: dp.status
      }));
      const wsDept = XLSX.utils.json_to_sheet(deptRows);
      XLSX.utils.book_append_sheet(wb, wsDept, 'Master_Jurusan');

      // 9. Sheet Agenda & Jam Belajar
      const scheduleRows = allStudySchedules.map((sc, idx) => ({
        No: idx + 1,
        'Jam Ke': sc.jamKe,
        'Waktu Mulai': sc.waktuMulai,
        'Waktu Selesai': sc.waktuSelesai,
        Keterangan: sc.keterangan,
        'Kategori Istirahat': sc.isBreak ? 'Ya (Istirahat)' : 'KBM Efektif'
      }));
      const wsSchedule = XLSX.utils.json_to_sheet(scheduleRows);
      XLSX.utils.book_append_sheet(wb, wsSchedule, 'Master_Jam_KBM');

      const eventRows = allEvents.map((ev: AcademicEvent, idx: number) => ({
        No: idx + 1,
        'Judul Agenda': ev.title,
        'Tanggal Mulai': ev.startDate,
        'Tanggal Selesai': ev.endDate,
        Kategori: ev.category,
        'Deskripsi Agenda': ev.description || '-'
      }));
      const wsEvent = XLSX.utils.json_to_sheet(eventRows);
      XLSX.utils.book_append_sheet(wb, wsEvent, 'Master_Agenda_Sekolah');

      // Save file
      const fileName = `SIMAK_Master_Data_Keseluruhan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      dbService.logActivity(
        'export_data',
        'Ekspor Master Data Keseluruhan',
        `Mengunduh master data keseluruhan dalam format multi-sheet Excel (.xlsx)`,
        'master_academic'
      );

      Swal.fire({
        icon: 'success',
        title: 'Master Workbook Berhasil Diunduh!',
        text: `File "${fileName}" mencakup 10 sheet master data aplikasi (Profil, Kelas, Guru, Siswa, Orang Tua, Mapel, Kurikulum, Jurusan, Jam KBM, dan Agenda).`,
        confirmButtonColor: '#2563eb'
      });
    } catch (error: any) {
      console.error('Export Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Master Data',
        text: error?.message || 'Terjadi kendala saat merakit dokumen Excel.'
      });
    }
  };

  // Handle JSON Snapshot Backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rawDb, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SIMAK_Snapshot_Master_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Swal.fire({
      icon: 'success',
      title: 'Cadangan JSON Disimpan',
      text: 'Snapshot database master aplikasi berhasil diekspor.',
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Handle Complete Master PDF Export with Official Kop Surat & Signatures
  const handleExportCompleteMasterPDF = async () => {
    try {
      const printService = PrintAndExportService.getInstance();
      const doc = printService.initPDF(appSettings, 'portrait');
      const paper = printService.getPaperFormat(appSettings, 'portrait');

      // 1. Render Kop Surat Resmi di Lembar Pertama
      let currentY = printService.renderKopSurat(
        doc,
        appSettings,
        'DOKUMEN INDUK & REKAPITULASI MASTER DATA AKADEMIK',
        `Tahun Ajaran ${activeAY ? activeAY.tahun + ' (' + activeAY.semesterAktif + ')' : new Date().getFullYear()} • Dicetak Pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      );

      // Section I: Ikhtisar Ringkasan Master
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('I. IKHTISAR DATA INDUK & EKOSISTEM PENDIDIKAN', paper.marginLeft, currentY);
      currentY += 3;

      const summaryTableData = [
        ['1', 'Rombongan Belajar (Kelas Terdaftar)', `${allClasses.length} Rombel`, 'Lengkap & Terverifikasi'],
        ['2', 'Pendidik (Guru & Wali Kelas)', `${teachers.length} Guru`, 'Aktif Mengajar'],
        ['3', 'Peserta Didik (Siswa Aktif)', `${students.length} Siswa`, '100% Terdaftar KBM'],
        ['4', 'Wali Murid / Orang Tua', `${parents.length} Wali`, 'Tersinkronisasi'],
        ['5', 'Mata Pelajaran & Kurikulum', `${allSubjects.length} Mapel`, 'Sesuai Standar Kurikulum'],
        ['6', 'Agenda & Kalender Akademik', `${allEvents.length} Kegiatan`, 'Terjadwal']
      ];

      autoTable(doc, {
        head: [['No', 'Entitas Master Data', 'Jumlah Terdaftar', 'Status Verifikasi']],
        body: summaryTableData,
        startY: currentY,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 80, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 40 },
          3: { halign: 'center' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Section II: Direktori Rombongan Belajar (Kelas)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('II. DIREKTORI ROMBONGAN BELAJAR & WALI KELAS', paper.marginLeft, currentY);
      currentY += 3;

      const classTableData = allClasses.map((c, idx) => {
        const wk = allUsers.find(u => u.id === c.wali_kelas_id);
        const enrolled = getStudentClassMembers(c.id);
        return [
          String(idx + 1),
          c.nama_kelas,
          c.nama_kelas.split(' ')[0] || 'Reguler',
          c.tahun_ajaran,
          wk ? `${wk.nama}${wk.nip ? ' (' + wk.nip + ')' : ''}` : 'Belum Ditugaskan',
          `${enrolled.length} Siswa`
        ];
      });

      autoTable(doc, {
        head: [['No', 'Nama Kelas', 'Tingkat', 'Tahun Ajaran', 'Wali Kelas / Penanggung Jawab', 'Anggota']],
        body: classTableData,
        startY: currentY,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 28 },
          4: { cellWidth: 60 },
          5: { halign: 'center' }
        }
      });

      // Section III: Direktori Tenaga Pendidik & Guru
      doc.addPage();
      currentY = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('III. DIREKTORI TENAGA PENDIDIK & GURU', paper.marginLeft, currentY);
      currentY += 3;

      const teacherTableData = teachers.map((t, idx) => {
        const wkClass = dbService.getHomeroomClass(t.id);
        const mapels = dbService.getSubjectsByTeacher(t.id).map(s => s.nama_mapel).join(', ') || '-';
        return [
          String(idx + 1),
          t.nama,
          t.nip || '-',
          wkClass ? `Wali Kelas ${wkClass.nama_kelas}` : 'Guru Mata Pelajaran',
          mapels,
          t.no_wa || '-'
        ];
      });

      autoTable(doc, {
        head: [['No', 'Nama Lengkap Pendidik', 'NIP / NUPTK', 'Tugas / Peran', 'Mapel Diampu', 'Kontak']],
        body: teacherTableData,
        startY: currentY,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 45, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 40 },
          5: { halign: 'center' }
        }
      });

      // Section IV: Direktori Peserta Didik
      doc.addPage();
      currentY = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('IV. DIREKTORI PESERTA DIDIK (BUKU INDUK SISWA)', paper.marginLeft, currentY);
      currentY += 3;

      const studentTableData = students.map((s, idx) => {
        const cls = dbService.getStudentClass(s.id);
        const parent = getParentOfStudent(s.id);
        return [
          String(idx + 1),
          s.nama,
          s.nisn || '-',
          s.nis || '-',
          cls ? cls.nama_kelas : 'Belum Ditentukan',
          s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-',
          parent ? parent.nama : '-'
        ];
      });

      autoTable(doc, {
        head: [['No', 'Nama Lengkap Siswa', 'NISN', 'NIS', 'Rombel', 'L/P', 'Nama Wali Murid']],
        body: studentTableData,
        startY: currentY,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 45, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 16 },
          6: { cellWidth: 35 }
        }
      });

      // Section V: Mata Pelajaran & Kurikulum
      currentY = (doc as any).lastAutoTable.finalY + 8;
      if (currentY + 50 > 280) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('V. STRUKTUR KURIKULUM & MATA PELAJARAN', paper.marginLeft, currentY);
      currentY += 3;

      const subjectTableData = allSubjects.map((s, idx) => [
        String(idx + 1),
        s.kode_mapel,
        s.nama_mapel,
        s.kelompok || 'Wajib',
        `${s.alokasiJamPerMinggu || 2} Jam/Mgg`,
        String(s.kkm || 75)
      ]);

      autoTable(doc, {
        head: [['No', 'Kode', 'Nama Mata Pelajaran', 'Kelompok Kurikulum', 'Alokasi Waktu', 'KKM']],
        body: subjectTableData,
        startY: currentY,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 22 },
          2: { cellWidth: 60, fontStyle: 'bold' },
          3: { cellWidth: 38 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center' }
        }
      });

      // Section VI: Tanda Tangan Resmi Dokumen
      const finalY = (doc as any).lastAutoTable.finalY + 4;
      await printService.renderTandaTangan(doc, appSettings, finalY);

      // Section VII: Footer & Penomoran Halaman di Semua Lembar
      printService.renderFooterAndPageNumbers(doc, appSettings);

      const fileName = `SIMAK_Dokumen_Master_Lengkap_${new Date().toISOString().slice(0, 10)}.pdf`;
      printService.savePDFDocument(doc, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Dokumen PDF Master Berhasil Diterbitkan!',
        text: `File "${fileName}" telah terunduh dengan Kop Surat Kedinasan, Matriks Lengkap, dan Tanda Tangan Pengesahan.`,
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor PDF Master',
        text: err?.message || 'Terjadi kesalahan saat merender dokumen PDF.'
      });
    }
  };

  // Handle Export Category to Excel (.xlsx)
  const handleExportCategoryExcel = (category: EntityCategory) => {
    try {
      const wb = XLSX.utils.book_new();
      let sheetName = 'Data';
      let dataRows: any[] = [];

      if (category === 'classes') {
        sheetName = 'Master_Kelas';
        dataRows = filteredClasses.map((c, idx) => {
          const wk = allUsers.find(u => u.id === c.wali_kelas_id);
          const enrolled = getStudentClassMembers(c.id);
          return {
            No: idx + 1,
            'Nama Kelas': c.nama_kelas,
            Tingkat: c.nama_kelas.split(' ')[0] || 'Reguler',
            'Tahun Ajaran': c.tahun_ajaran,
            'Wali Kelas': wk ? wk.nama : 'Belum Ditugaskan',
            'NIP Wali Kelas': wk?.nip || '-',
            'Jumlah Siswa': enrolled.length
          };
        });
      } else if (category === 'teachers') {
        sheetName = 'Master_Guru';
        dataRows = filteredTeachers.map((t, idx) => {
          const wkClass = dbService.getHomeroomClass(t.id);
          const mapels = dbService.getSubjectsByTeacher(t.id).map(s => s.nama_mapel).join(', ');
          return {
            No: idx + 1,
            'Nama Lengkap': t.nama,
            NIP: t.nip || '-',
            Peran: wkClass ? `Wali Kelas ${wkClass.nama_kelas}` : 'Guru Mapel',
            'Mata Pelajaran': mapels || '-',
            Email: t.email || '-',
            'No WhatsApp': t.no_wa || '-'
          };
        });
      } else if (category === 'students') {
        sheetName = 'Master_Siswa';
        dataRows = filteredStudents.map((s, idx) => {
          const cls = dbService.getStudentClass(s.id);
          const parent = getParentOfStudent(s.id);
          return {
            No: idx + 1,
            'Nama Siswa': s.nama,
            NISN: s.nisn || '-',
            NIS: s.nis || '-',
            Kelas: cls ? cls.nama_kelas : 'Belum Ditentukan',
            'Jenis Kelamin': s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
            'Wali Murid': parent ? parent.nama : '-',
            'No HP Siswa': s.no_wa || '-'
          };
        });
      } else if (category === 'parents') {
        sheetName = 'Wali_Murid';
        dataRows = filteredParents.map((p, idx) => {
          return {
            No: idx + 1,
            'Nama Wali': p.nama,
            Email: p.email || '-',
            'No WhatsApp': p.no_wa || '-',
            Pekerjaan: 'Orang Tua / Wali'
          };
        });
      } else if (category === 'subjects') {
        sheetName = 'Mata_Pelajaran';
        dataRows = filteredSubjects.map((s, idx) => ({
          No: idx + 1,
          'Kode Mapel': s.kode_mapel,
          'Nama Mapel': s.nama_mapel,
          Kelompok: s.kelompok,
          'Beban Jam/Minggu': s.alokasiJamPerMinggu || 2,
          KKM: s.kkm || 75
        }));
      } else if (category === 'agenda') {
        sheetName = 'Agenda_Akademik';
        dataRows = filteredEvents.map((e, idx) => ({
          No: idx + 1,
          Judul: e.title,
          Kategori: e.category,
          'Tanggal Mulai': e.startDate,
          'Tanggal Selesai': e.endDate || e.startDate,
          Keterangan: e.description || '-'
        }));
      }

      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const fileName = `SIMAK_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Excel Berhasil!',
        text: `Data "${sheetName}" berhasil diunduh ke berkas ${fileName}.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Excel',
        text: e?.message || 'Terjadi kesalahan saat memproses berkas Excel.'
      });
    }
  };

  // Handle Export Category to PDF (.pdf) with Kop and Signatures
  const handleExportCategoryPDF = async (category: EntityCategory) => {
    try {
      const printService = PrintAndExportService.getInstance();
      const doc = printService.initPDF(appSettings, 'portrait');

      let title = 'LAPORAN DATA MASTER';
      let subtitle = 'Sistem Informasi Manajemen Administrasi & Kehadiran Sekolah';
      let head: string[][] = [];
      let body: string[][] = [];
      let columnStyles: any = {};
      let customKiri: any = undefined;

      if (category === 'classes') {
        title = 'DIREKTORI MASTER ROMBONGAN BELAJAR & KELAS';
        subtitle = `Rekapitulasi Daftar Rombel, Tingkat, dan Wali Kelas (${filteredClasses.length} Kelas)`;
        head = [['No', 'Nama Kelas', 'Tingkat', 'Tahun Ajaran', 'Wali Kelas / NIP', 'Jumlah Siswa']];
        body = filteredClasses.map((c, idx) => {
          const wk = allUsers.find(u => u.id === c.wali_kelas_id);
          const enrolled = getStudentClassMembers(c.id);
          return [
            String(idx + 1),
            c.nama_kelas,
            c.nama_kelas.split(' ')[0] || 'Reguler',
            c.tahun_ajaran,
            wk ? `${wk.nama}${wk.nip ? ' (' + wk.nip + ')' : ''}` : 'Belum Ditugaskan',
            `${enrolled.length} Siswa`
          ];
        });
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 28 },
          4: { cellWidth: 65 },
          5: { halign: 'center', cellWidth: 25 }
        };
      } else if (category === 'teachers') {
        title = 'DIREKTORI TENAGA PENDIDIK & GURU PENGAJAR';
        subtitle = `Daftar Tenaga Pendidik, Wali Kelas, dan Mata Pelajaran Pengampu (${filteredTeachers.length} Guru)`;
        head = [['No', 'Nama Lengkap Pendidik', 'NIP / NUPTK', 'Tugas Pokok', 'Mapel Diampu', 'Kontak']];
        body = filteredTeachers.map((t, idx) => {
          const wkClass = dbService.getHomeroomClass(t.id);
          const mapels = dbService.getSubjectsByTeacher(t.id).map(s => s.nama_mapel).join(', ') || '-';
          return [
            String(idx + 1),
            t.nama,
            t.nip || '-',
            wkClass ? `Wali Kelas ${wkClass.nama_kelas}` : 'Guru Pengampu',
            mapels,
            t.no_wa || '-'
          ];
        });
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 45, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 40 },
          5: { halign: 'center', cellWidth: 20 }
        };
      } else if (category === 'students') {
        title = 'BUKU INDUK PESERTA DIDIK & SISWA AKTIF';
        subtitle = `Daftar Lengkap Siswa Aktif, NISN, NIS, Penempatan Rombel & Orang Tua (${filteredStudents.length} Siswa)`;
        head = [['No', 'Nama Siswa', 'NISN', 'NIS', 'Kelas', 'L/P', 'Wali Murid']];
        body = filteredStudents.map((s, idx) => {
          const cls = dbService.getStudentClass(s.id);
          const parent = getParentOfStudent(s.id);
          return [
            String(idx + 1),
            s.nama,
            s.nisn || '-',
            s.nis || '-',
            cls ? cls.nama_kelas : 'Belum Ditentukan',
            s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
            parent ? parent.nama : '-'
          ];
        });
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 48, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 20 },
          6: { cellWidth: 35 }
        };
      } else if (category === 'parents') {
        title = 'DIREKTORI DATA WALI MURID & ORANG TUA';
        subtitle = `Informasi Kontak dan Hubungan Orang Tua / Wali Peserta Didik (${filteredParents.length} Wali)`;
        head = [['No', 'Nama Wali Murid', 'Nomor WhatsApp', 'Email', 'Pekerjaan']];
        body = filteredParents.map((p, idx) => [
          String(idx + 1),
          p.nama,
          p.no_wa || '-',
          p.email || '-',
          'Orang Tua / Wali'
        ]);
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 40 }
        };
      } else if (category === 'subjects') {
        title = 'STRUKTUR KURIKULUM & MATA PELAJARAN';
        subtitle = `Standar Mata Pelajaran, Kelompok Kurikulum, Alokasi Waktu & KKM (${filteredSubjects.length} Mapel)`;
        head = [['No', 'Kode', 'Nama Mata Pelajaran', 'Kelompok', 'Jam/Mgg', 'KKM']];
        body = filteredSubjects.map((s, idx) => [
          String(idx + 1),
          s.kode_mapel,
          s.nama_mapel,
          s.kelompok || 'Wajib',
          `${s.alokasiJamPerMinggu || 2} Jam`,
          String(s.kkm || 75)
        ]);
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { cellWidth: 65, fontStyle: 'bold' },
          3: { cellWidth: 40 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 18 }
        };
      } else if (category === 'agenda') {
        title = 'AGENDA & KALENDER PENDIDIKAN';
        subtitle = `Jadwal Kegiatan Belajar Mengajar, Asesmen & Libur Sekolah (${filteredEvents.length} Agenda)`;
        head = [['No', 'Nama Kegiatan / Agenda', 'Kategori', 'Tanggal Mulai', 'Tanggal Selesai', 'Keterangan']];
        body = filteredEvents.map((e, idx) => [
          String(idx + 1),
          e.title,
          e.category,
          e.startDate,
          e.endDate || e.startDate,
          e.description || '-'
        ]);
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 24 },
          5: { cellWidth: 47 }
        };
      }

      const startY = printService.renderKopSurat(doc, appSettings, title, subtitle);

      autoTable(doc, {
        head,
        body,
        startY: startY + 2,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.2
        },
        columnStyles
      });

      const finalTableY = ((doc as any).lastAutoTable?.finalY || startY + 50) + 4;
      await printService.renderTandaTangan(doc, appSettings, finalTableY, customKiri);
      printService.renderFooterAndPageNumbers(doc, appSettings);

      const fileName = `SIMAK_Dokumen_${category}_${new Date().toISOString().slice(0, 10)}.pdf`;
      printService.savePDFDocument(doc, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Dokumen PDF Berhasil Diterbitkan!',
        text: `Berkas "${fileName}" dengan Kop Surat resmi dan Pengesahan Tanda Tangan berhasil diunduh.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Dokumen PDF',
        text: err?.message || 'Terjadi kesalahan saat memproses lembar PDF.'
      });
    }
  };

  // Filtered queries based on active category
  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allClasses;
    return allClasses.filter(c => {
      const wk = allUsers.find(u => u.id === c.wali_kelas_id);
      return (
        c.nama_kelas.toLowerCase().includes(q) ||
        c.tahun_ajaran.toLowerCase().includes(q) ||
        (wk && wk.nama.toLowerCase().includes(q))
      );
    });
  }, [allClasses, allUsers, searchQuery]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter(
      t =>
        t.nama.toLowerCase().includes(q) ||
        (t.nip && t.nip.includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.no_wa && t.no_wa.includes(q))
    );
  }, [teachers, searchQuery]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s => {
      const cls = dbService.getStudentClass(s.id);
      return (
        s.nama.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.includes(q)) ||
        (s.nis && s.nis.includes(q)) ||
        (cls && cls.nama_kelas.toLowerCase().includes(q))
      );
    });
  }, [students, dbService, searchQuery]);

  const filteredParents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return parents;
    return parents.filter(
      p =>
        p.nama.toLowerCase().includes(q) ||
        (p.no_wa && p.no_wa.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [parents, searchQuery]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allSubjects;
    return allSubjects.filter(
      s =>
        s.nama_mapel.toLowerCase().includes(q) ||
        s.kode_mapel.toLowerCase().includes(q) ||
        s.kelompok.toLowerCase().includes(q)
    );
  }, [allSubjects, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allEvents;
    return allEvents.filter(
      (e: AcademicEvent) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [allEvents, searchQuery]);

  // Pagination State for Active Table View
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  // Paginated Slices
  const paginatedClasses = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredClasses.length / itemsPerPage)));
    return filteredClasses.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredClasses, currentPage, itemsPerPage]);

  const paginatedTeachers = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredTeachers.length / itemsPerPage)));
    return filteredTeachers.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredTeachers, currentPage, itemsPerPage]);

  const paginatedStudents = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage)));
    return filteredStudents.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const paginatedParents = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredParents.length / itemsPerPage)));
    return filteredParents.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredParents, currentPage, itemsPerPage]);

  const paginatedSubjects = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredSubjects.length / itemsPerPage)));
    return filteredSubjects.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredSubjects, currentPage, itemsPerPage]);

  const paginatedEvents = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage)));
    return filteredEvents.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Header Banner Master Data Keseluruhan */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Master Data Keseluruhan Aplikasi
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Pusat Kendali Data
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Direktori menyeluruh yang merangkum seluruh entitas master data SIMAK: Kelas, Guru, Siswa, Wali Murid, Mapel, Kurikulum, Agenda, dan Profil Sekolah.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Unduh snapshot database dalam format JSON"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor JSON</span>
          </button>

          <button
            type="button"
            id="btn-export-master-excel"
            onClick={handleExportMasterWorkbook}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 cursor-pointer"
            title="Ekspor seluruh master data ke 1 file Excel multi-sheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Master Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            id="btn-export-master-pdf"
            onClick={handleExportCompleteMasterPDF}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 transition shadow-sm flex items-center gap-2 cursor-pointer"
            title="Ekspor seluruh master data ke Dokumen PDF Resmi lengkap dengan Kop Surat & Tanda Tangan"
          >
            <FileText className="w-4 h-4" />
            <span>Unduh Master PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Top Statistical Matrix Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div
          onClick={() => setActiveCategory('classes')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'classes'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <School className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Rombel</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {allClasses.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Kelas Terdaftar
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('teachers')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'teachers'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendidik</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {teachers.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Guru & Wali Kelas
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('students')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'students'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <GraduationCap className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Siswa</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {students.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Peserta Didik Aktif
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('parents')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'parents'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Wali</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {parents.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Wali Murid Terhubung
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('subjects')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'subjects'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mapel</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {allSubjects.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Mata Pelajaran
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('agenda')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeCategory === 'agenda'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Agenda</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {allEvents.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Agenda Akademik
          </span>
        </div>
      </div>

      {/* Sub-Category Nav Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => { setActiveCategory('overview'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Matriks & Audit
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('classes'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'classes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Master Kelas ({allClasses.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('teachers'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'teachers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Master Guru ({teachers.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('students'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'students'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Master Siswa ({students.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('parents'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'parents'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Wali Murid ({parents.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('subjects'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'subjects'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mapel & KKM ({allSubjects.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('agenda'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'agenda'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Agenda Kalender ({allEvents.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveCategory('school_profile'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'school_profile'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Profil Sekolah
          </button>
        </div>

        {/* Search Input */}
        {activeCategory !== 'overview' && activeCategory !== 'school_profile' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Cari dalam ${activeCategory}...`}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1. OVERVIEW & HEALTH CHECK AUDIT */}
      {/* ===================================================================== */}
      {activeCategory === 'overview' && (
        <div className="space-y-6">
          {/* Audit Integritas Data Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    auditReport.isPerfect
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Audit Kesehatan & Integritas Master Data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pemeriksaan otomatis struktur relasi antar entitas sekolah untuk mencegah data hilang atau tidak lengkap
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    auditReport.isPerfect
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  }`}
                >
                  Skor: {auditReport.score}% {auditReport.isPerfect ? 'Optimal' : 'Perlu Perhatian'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Check 1 */}
              <div
                className={`p-3.5 rounded-xl border ${
                  auditReport.studentsWithoutClass.length === 0
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Siswa Tanpa Kelas
                  </span>
                  {auditReport.studentsWithoutClass.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {auditReport.studentsWithoutClass.length} Siswa
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {auditReport.studentsWithoutClass.length === 0
                    ? 'Semua siswa telah terdaftar dalam rombel kelas'
                    : 'Segera masukkan siswa ke dalam rombel'}
                </p>
              </div>

              {/* Check 2 */}
              <div
                className={`p-3.5 rounded-xl border ${
                  auditReport.classesWithoutHomeroom.length === 0
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Kelas Tanpa Wali
                  </span>
                  {auditReport.classesWithoutHomeroom.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {auditReport.classesWithoutHomeroom.length} Kelas
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {auditReport.classesWithoutHomeroom.length === 0
                    ? 'Setiap rombel memiliki guru penanggung jawab'
                    : 'Tetapkan wali kelas pada kelas bersangkutan'}
                </p>
              </div>

              {/* Check 3 */}
              <div
                className={`p-3.5 rounded-xl border ${
                  auditReport.teachersWithoutSubject.length === 0
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Guru Tanpa Mapel
                  </span>
                  {auditReport.teachersWithoutSubject.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {auditReport.teachersWithoutSubject.length} Guru
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {auditReport.teachersWithoutSubject.length === 0
                    ? 'Seluruh tenaga pendidik mengampu mapel'
                    : 'Alokasikan mata pelajaran pengampu'}
                </p>
              </div>

              {/* Check 4 */}
              <div
                className={`p-3.5 rounded-xl border ${
                  auditReport.studentsWithoutParent.length === 0
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Relasi Orang Tua
                  </span>
                  {auditReport.studentsWithoutParent.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Info className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {students.length - auditReport.studentsWithoutParent.length} / {students.length}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Siswa telah memiliki kontak wali terdaftar
                </p>
              </div>
            </div>
          </div>

          {/* Quick Ecosystem Entities Explorer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card: Rombel & Kelas */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Rombongan Belajar (Kelas)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total: {allClasses.length} Rombel Terdata
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('classes')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Daftar kelas X, XI, XII beserta penugasan wali kelas dan alokasi anggota siswa aktif.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tahun Ajaran</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeAY?.tahun || '2024/2025'}
                </span>
              </div>
            </div>

            {/* Card: Tenaga Pendidik */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tenaga Pendidik & Guru
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total: {teachers.length} Guru Aktif
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('teachers')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Identitas NIP, kontak dinas, penugasan wali kelas, serta distribusi mata pelajaran pengampu.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Wali Kelas Aktif</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {teachers.filter(t => t.role === 'wali_kelas').length} Guru
                </span>
              </div>
            </div>

            {/* Card: Peserta Didik */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Peserta Didik (Siswa)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total: {students.length} Siswa Terdaftar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('students')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Nomor Induk Siswa Nasional (NISN), NIS, gender, penempatan rombel, dan relasi orang tua.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status Keberadaan</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  100% Aktif KBM
                </span>
              </div>
            </div>

            {/* Card: Kurikulum & Mapel */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Mata Pelajaran & KKM
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {allSubjects.length} Mata Pelajaran
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('subjects')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Struktur kurikulum nasional, kriteria ketuntasan minimal (KKM), kelompok wajib & peminatan.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Kurikulum Aktif</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {allCurriculums.find(c => c.status === 'Aktif')?.nama || 'Kurikulum Merdeka'}
                </span>
              </div>
            </div>

            {/* Card: Agenda & Kalender */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Agenda Kalender Sekolah
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {allEvents.length} Jadwal Kegiatan
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('agenda')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Kalender pendidikan, jadwal PTS/PAS/Ujian Akhir, libur semester, dan perayaan nasional.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Agenda Terdekat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {allEvents[0]?.title || 'Belum Ada Agenda'}
                </span>
              </div>
            </div>

            {/* Card: Profil & Pengaturan Sekolah */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Profil & Identitas Sekolah
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {appSettings.appName || 'SIMAK'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('school_profile')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Alamat instansi, koordinat GPS geofence absensi, nomor administrasi, dan kop surat rapor.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Radius GPS Presensi</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {appSettings.schoolRadiusMeters || 200} Meter
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. TABEL MASTER KELAS */}
      {/* ===================================================================== */}
      {activeCategory === 'classes' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Kelas & Rombel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredClasses.length} rombel kelas yang terdaftar dalam sistem
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('classes')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor daftar kelas ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('classes')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak dokumen resmi kelas lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Rombel / Kelas</th>
                  <th className="px-4 py-3">Tahun Ajaran</th>
                  <th className="px-4 py-3">Wali Kelas Pengampu</th>
                  <th className="px-4 py-3">Jumlah Anggota Siswa</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data kelas yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedClasses.map((cls, idx) => {
                    const wk = allUsers.find(u => u.id === cls.wali_kelas_id);
                    const members = getStudentClassMembers(cls.id);
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                        <td className="px-4 py-3 font-semibold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {cls.nama_kelas}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {cls.tahun_ajaran}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {wk ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold">{wk.nama}</span>
                            </div>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Belum Ditetapkan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                            {members.length} Siswa
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedItemDetail({ type: 'class', data: { cls, wk, members } })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredClasses.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="kelas"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TABEL MASTER GURU */}
      {/* ===================================================================== */}
      {activeCategory === 'teachers' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Guru & Tenaga Pendidik
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredTeachers.length} guru pengampu dan wali kelas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('teachers')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor direktori guru ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('teachers')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak direktori guru resmi lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Guru</th>
                  <th className="px-4 py-3">NIP / NUPTK</th>
                  <th className="px-4 py-3">Peran / Tugas</th>
                  <th className="px-4 py-3">Wali Kelas</th>
                  <th className="px-4 py-3">Kontak WhatsApp</th>
                  <th className="px-4 py-3 text-right">Mapel Diampu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data guru yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedTeachers.map((t, idx) => {
                    const wkClass = dbService.getHomeroomClass(t.id);
                    const mapelList = dbService.getSubjectsByTeacher(t.id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                        <td className="px-4 py-3 font-semibold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{t.nama}</span>
                          <span className="text-[10px] text-slate-500">{t.email || '-'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {t.nip || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.role === 'wali_kelas'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                            }`}
                          >
                            {t.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru Mapel'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {wkClass ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                              {wkClass.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">{t.no_wa || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {mapelList.length} Mapel
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredTeachers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="guru"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. TABEL MASTER SISWA */}
      {/* ===================================================================== */}
      {activeCategory === 'students' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Peserta Didik (Siswa)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredStudents.length} peserta didik yang terdaftar dalam rombel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('students')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor buku induk siswa ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('students')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak buku induk siswa resmi lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">NISN / NIS</th>
                  <th className="px-4 py-3">Kelas / Rombel</th>
                  <th className="px-4 py-3">Jenis Kelamin</th>
                  <th className="px-4 py-3">Wali Murid</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s, idx) => {
                    const cls = dbService.getStudentClass(s.id);
                    const parent = getParentOfStudent(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                        <td className="px-4 py-3 font-semibold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {s.nama}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {s.nisn || s.nis || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {cls ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold">
                              {cls.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold text-[11px]">
                              Tanpa Kelas
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{s.jenis_kelamin || 'L/P'}</td>
                        <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                          {parent ? parent.nama : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                            Aktif
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="siswa"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. TABEL MASTER WALI MURID */}
      {/* ===================================================================== */}
      {activeCategory === 'parents' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Orang Tua / Wali Murid
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredParents.length} wali murid yang terhubung dengan akun siswa
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('parents')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor data wali murid ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('parents')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak direktori wali murid resmi lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Wali Murid</th>
                  <th className="px-4 py-3">Nomor WhatsApp</th>
                  <th className="px-4 py-3">Email Akun</th>
                  <th className="px-4 py-3 text-right">Anak Asuh (Siswa)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredParents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data wali murid yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginatedParents.map((p, idx) => {
                    const children = dbService.getChildrenOfParent(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                        <td className="px-4 py-3 font-semibold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.nama}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {p.no_wa || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.email || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {children.map(c => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[10px]"
                              >
                                {c.nama}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredParents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="wali murid"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. TABEL MASTER MAPEL & KKM */}
      {/* ===================================================================== */}
      {activeCategory === 'subjects' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Mata Pelajaran & Standar KKM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredSubjects.length} mata pelajaran terdaftar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('subjects')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor struktur mata pelajaran ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('subjects')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak struktur kurikulum resmi lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Kode Mapel</th>
                  <th className="px-4 py-3">Nama Mata Pelajaran</th>
                  <th className="px-4 py-3">Kelompok</th>
                  <th className="px-4 py-3">Standar KKM</th>
                  <th className="px-4 py-3">Tingkat Kelas</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada mapel yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedSubjects.map((sb, idx) => (
                    <tr key={sb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                      <td className="px-4 py-3 font-semibold text-slate-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sb.kode_mapel}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {sb.nama_mapel}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {sb.kelompok}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-bold">
                          {sb.kkm}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {sb.tingkatKelas || 'Semua'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                          {sb.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredSubjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="mapel"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. TABEL MASTER AGENDA KALENDER */}
      {/* ===================================================================== */}
      {activeCategory === 'agenda' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Master Agenda & Kalender Pendidikan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredEvents.length} agenda kegiatan akademik sekolah
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCategoryExcel('agenda')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Ekspor agenda akademik ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCategoryPDF('agenda')}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Cetak kalender pendidikan resmi lengkap dengan Kop & Tanda Tangan"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Agenda / Kegiatan</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tanggal Pelaksanaan</th>
                  <th className="px-4 py-3">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada agenda kalender yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((ev: AcademicEvent, idx: number) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                      <td className="px-4 py-3 font-semibold text-slate-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{ev.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          {ev.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                        {ev.startDate} s/d {ev.endDate}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{ev.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredEvents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            itemLabel="agenda"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. MASTER PROFIL SEKOLAH */}
      {/* ===================================================================== */}
      {activeCategory === 'school_profile' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Profil & Identitas Instansi Sekolah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data induk instansi yang dijadikan acuan untuk kop surat rapor, sertifikat, dan presensi geofence
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nama Sekolah / Aplikasi</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {appSettings.appName || 'SIMAK'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Slogan / Deskripsi Resmi</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {appSettings.appDescription || 'Sistem Informasi Manajemen Kelas'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Alamat Lengkap</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {appSettings.schoolAddress || 'Kompleks Pendidikan Utama No. 1, Jakarta'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kontak Telepon / WhatsApp Admin</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {appSettings.adminPhone || '0812-3456-7890'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Koordinat Geofence Presensi</span>
              <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                Lat: {appSettings.schoolLatitude || -6.2088}, Long: {appSettings.schoolLongitude || 106.8456}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Radius & Jam Cutoff Presensi</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {appSettings.schoolRadiusMeters || 200} Meter • Pukul {appSettings.attendanceCutoffTime || '07:30'} WIB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rincian Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Rincian Master Kelas
              </h4>
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Nama Kelas:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedItemDetail.data.cls.nama_kelas}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Tahun Ajaran:</span>
                <span className="font-semibold">{selectedItemDetail.data.cls.tahun_ajaran}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Wali Kelas:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedItemDetail.data.wk?.nama || 'Belum Ditentukan'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Jumlah Siswa:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedItemDetail.data.members.length} Siswa Terdaftar
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="w-full py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
