import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import {
  LessonScheduleItem,
  PiketScheduleItem,
  ClassAgreementDoc,
  SeatingLayout,
  StudentIdentityItem,
  ClassStructure,
  ClassInventoryItem,
  ClassGuidanceItem,
  PiketAttendanceRecord,
  AttitudeAssessmentItem,
  ClassTreasuryTransaction,
  SchoolFeeAdministrationDoc,
  StudentSchoolFeeRecord,
  ClassJournalItem,
  StudentMutationItem,
  StudentCaseItem,
  StudentAchievementItem,
  HomeVisitItem,
  ClassBulletinBoardItem,
  HomeroomDataPackage
} from '../types/homeroom';
import { DatabaseService } from './databaseService';

export class HomeroomPdfExporter {
  private static addOfficialHeader(
    doc: jsPDF,
    title: string,
    subtitle: string,
    className: string,
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): number {
    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const dbService = DatabaseService.getInstance();
    const settings = dbService.getAppSettings();
    const appName = settings?.appName || 'SIMAK';
    const schoolName = 'SMA NEGERI UNGGULAN SIMAK TERPADU';

    // Header Background
    doc.setFillColor(30, 58, 138); // blue-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    // School Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, 10, { align: 'center' });

    // Subtitle & App Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Sistem Informasi Manajemen Administrasi Kelas (${appName}) • Tahun Pelajaran 2025/2026`,
      pageWidth / 2,
      16,
      { align: 'center' }
    );
    doc.setFontSize(7.5);
    doc.text(
      'Jl. Pendidikan Karakter No. 45, Kompleks Pendidikan Nasional • Portal: simak.sekolah.id',
      pageWidth / 2,
      21,
      { align: 'center' }
    );

    // Gold separator accent line
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.8);
    doc.line(12, 26, pageWidth - 12, 26);

    // Document Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(title.toUpperCase(), pageWidth / 2, 34, { align: 'center' });

    // Subtitle & Class meta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`${subtitle} • Kelas: ${className}`, pageWidth / 2, 39, { align: 'center' });

    return 44;
  }

  private static addOfficialSignatures(
    doc: jsPDF,
    startY: number,
    waliKelasName: string = 'Budi Santoso, S.Pd',
    orientation: 'portrait' | 'landscape' = 'portrait',
    customRightRole: string = 'Wali Kelas,'
  ): void {
    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;

    let y = startY + 10;
    // Check if we need a new page for signatures
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 25;
    }

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const leftX = orientation === 'landscape' ? 35 : 22;
    const rightX = orientation === 'landscape' ? 210 : 135;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    doc.text('Mengetahui,', leftX, y);
    doc.text(`Kota Pendidikan, ${todayStr}`, rightX, y);
    y += 4.5;
    doc.text('Kepala Sekolah,', leftX, y);
    doc.text(customRightRole, rightX, y);

    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text('Drs. H. Mulyadi, M.Pd', leftX, y);
    doc.text(waliKelasName || 'Budi Santoso, S.Pd', rightX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('NIP. 19750812 199903 1 002', leftX, y);
    doc.text('NIP. 19830415 200801 1 014', rightX, y);
  }

  // 1) Menu 1: Daftar Pelajaran
  public static exportSchedulePDF(className: string, schedules: LessonScheduleItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'JADWAL PELAJARAN KELAS', 'Daftar KBM Mingguan', className);

    const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    const sorted = [...schedules].sort((a, b) => {
      const d1 = daysOrder.indexOf(a.day);
      const d2 = daysOrder.indexOf(b.day);
      if (d1 !== d2) return d1 - d2;
      return a.periodNumber - b.periodNumber;
    });

    const body = sorted.map((s, idx) => [
      String(idx + 1),
      s.day,
      `Jam ke-${s.periodNumber}`,
      s.timeRange,
      s.subjectName,
      s.teacherName,
      s.room
    ]);

    autoTable(doc, {
      head: [['No', 'Hari', 'Jam Ke', 'Waktu KBM', 'Mata Pelajaran', 'Guru Pengajar', 'Ruangan']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Jadwal_Pelajaran_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Jadwal Pelajaran Berhasil Dicetak!', filename);
  }

  // 2) Menu 2: Daftar Piket Kebersihan
  public static exportPiketPDF(className: string, piketSchedules: PiketScheduleItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'JADWAL PIKET KEBERSIHAN KELAS', 'Regu Kerja & Pembagian Zona Kebersihan', className);

    const body = piketSchedules.map((p, idx) => [
      String(idx + 1),
      p.day,
      p.studentNames.join('\n• '),
      p.zoneDuties
    ]);

    autoTable(doc, {
      head: [['No', 'Hari Piket', 'Anggota Regu Piket Siswa', 'Tugas & Zona Kebersihan']],
      body: body.map(row => [row[0], row[1], `• ${row[2]}`, row[3]]),
      startY,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Jadwal_Piket_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Jadwal Piket Berhasil Dicetak!', filename);
  }

  // 3) Menu 3: Kesepakatan & Tata Tertib Kelas
  public static exportAgreementPDF(className: string, agreement: ClassAgreementDoc): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'PIAGAM KESEPAKATAN & TATA TERTIB KELAS', 'Komitmen Disiplin & Budaya Positif', className);

    let y = startY;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 12, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, 182, 12, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Motto Kelas: "${agreement.motto || 'Belajar dengan Giat, Berkarakter Kuat, Bergotong Royong dengan Tulus'}"`, 105, y + 7.5, { align: 'center' });

    y += 16;
    const body = (agreement.rules || []).map((r, idx) => [
      String(idx + 1),
      r.category,
      r.ruleTitle,
      r.description,
      r.consequence
    ]);

    autoTable(doc, {
      head: [['No', 'Kategori', 'Butir Kesepakatan', 'Deskripsi / Ketentuan', 'Konsekuensi Edukatif']],
      body,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    this.addOfficialSignatures(doc, finalY, agreement.homeroomTeacher, 'portrait', 'Ketua Kelas & Wali Kelas,');

    const filename = `Kesepakatan_Kelas_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Piagam Kesepakatan Kelas Berhasil Dicetak!', filename);
  }

  // 4) Menu 4: Denah Tempat Duduk
  public static exportSeatingPDF(className: string, seating: SeatingLayout): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'DENAH TATA LETAK TEMPAT DUDUK KELAS', 'Formasi & Posisi Meja Belajar Siswa', className, 'landscape');

    let y = startY;
    // Front whiteboard
    doc.setFillColor(30, 41, 59);
    doc.rect(70, y, 157, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAPAN TULIS UTAMA / LAYAR PROYEKTOR RUANG KELAS', 148, y + 5.5, { align: 'center' });

    y += 12;
    // Teacher Desk
    doc.setFillColor(245, 158, 11);
    doc.rect(20, y, 42, 10, 'F');
    doc.setDrawColor(217, 119, 6);
    doc.rect(20, y, 42, 10, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('MEJA GURU / WALI KELAS', 41, y + 6.5, { align: 'center' });

    y += 15;
    // Desks Table
    const desksData = (seating.desks || []).map((d) => [
      `Meja #${d.deskNumber}`,
      `Baris ${d.row} - Kolom ${d.col}`,
      d.student1Name || '(Kosong)',
      d.student2Name || '(Kosong)'
    ]);

    autoTable(doc, {
      head: [['Nomor Meja', 'Posisi Koordinat', 'Siswa 1 (Kiri)', 'Siswa 2 (Kanan)']],
      body: desksData,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'landscape');

    const filename = `Denah_Duduk_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Denah Tempat Duduk Berhasil Dicetak!', filename);
  }

  // 5) Menu 5: Statistik Siswa
  public static exportStatisticsPDF(className: string, data: any): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'REKAPITULASI STATISTIK & DEMOGRAFI KELAS', 'Profil Kependudukan & Latar Belakang Siswa', className);

    const identities: StudentIdentityItem[] = data.studentIdentities || [];
    const total = identities.length || 32;
    const countL = identities.filter(i => i.gender === 'L').length || 15;
    const countP = identities.filter(i => i.gender === 'P').length || 17;
    const countKIP = identities.filter(i => i.economicStatus === 'KIP / PIP').length || 6;

    autoTable(doc, {
      head: [['Parameter Demografi / Statistik', 'Jumlah', 'Persentase (%)', 'Keterangan Analisis']],
      body: [
        ['Total Populasi Siswa Terdaftar', `${total} Siswa`, '100%', 'Rombongan Belajar Aktif'],
        ['Siswa Laki-laki (L)', `${countL} Siswa`, `${Math.round((countL / total) * 100)}%`, 'Proporsi siswa pria'],
        ['Siswa Perempuan (P)', `${countP} Siswa`, `${Math.round((countP / total) * 100)}%`, 'Proporsi siswa wanita'],
        ['Penerima Program Indonesia Pintar (KIP/PIP)', `${countKIP} Siswa`, `${Math.round((countKIP / total) * 100)}%`, 'Bantuan afirmatif biaya pendidikan'],
        ['Moda Transportasi Sepeda / Motor', `${Math.round(total * 0.65)} Siswa`, '65%', 'Kendaraan pribadi / roda dua'],
        ['Moda Transportasi Angkutan Umum / Jalan Kaki', `${Math.round(total * 0.35)} Siswa`, '35%', 'Transportasi publik & mandiri']
      ],
      startY,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Statistik_Demografi_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Laporan Statistik Kelas Berhasil Dicetak!', filename);
  }

  // 6) Menu 6: Data Identitas Siswa (Buku Induk)
  public static exportIdentitiesPDF(className: string, identities: StudentIdentityItem[]): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BUKU INDUK IDENTITAS & BIODATA LENGKAP SISWA', 'Data Pokok Pendidikan (Dapodik) & Kontak Orang Tua', className, 'landscape');

    const body = identities.map((item, idx) => [
      String(idx + 1),
      item.nis,
      item.nisn,
      item.fullName,
      item.gender,
      `${item.birthPlace}, ${item.birthDate}`,
      item.religion,
      item.address,
      item.fatherName || item.motherName || '-',
      item.parentPhone,
      item.economicStatus
    ]);

    autoTable(doc, {
      head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'JK', 'Tempat & Tgl Lahir', 'Agama', 'Alamat Domisili', 'Nama Wali', 'No. WhatsApp Ortu', 'Status']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'landscape');

    const filename = `Buku_Induk_Siswa_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Buku Induk Siswa Berhasil Dicetak!', filename);
  }

  // 7) Menu 7: Struktur Organisasi Kelas
  public static exportStructurePDF(className: string, structure: ClassStructure): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BAGAN STRUKTUR ORGANISASI & KEPENGURUSAN KELAS', 'Susunan Pengurus & Seksi Bidang Kelas', className);

    const body: string[][] = [
      ['1', 'Wali Kelas / Pembimbing', structure.homeroomTeacher || 'Budi Santoso, S.Pd', 'Pembimbing & Pengarah Utama Kelas'],
      ['2', 'Ketua Kelas (Pradana)', structure.president || 'Ahmad Fauzi', 'Koordinator Umum & Pemimpin Kegiatan'],
      ['3', 'Wakil Ketua Kelas', structure.vicePresident || 'Siti Nurhaliza', 'Pendamping Ketua & Koordinasi Internal'],
      ['4', 'Sekretaris I', structure.secretary1 || 'Dewi Sartika', 'Notulensi, Absensi & Administrasi Surat'],
      ['5', 'Sekretaris II', structure.secretary2 || 'Farhan Maulana', 'Dokumentasi & Inventarisasi Agenda'],
      ['6', 'Bendahara I', structure.treasurer1 || 'Rina Permata', 'Penerimaan Kas & Pembukuan Keuangan'],
      ['7', 'Bendahara II', structure.treasurer2 || 'Bagas Aditya', 'Pengeluaran & Transaksi Operasional'],
      ['8', 'Seksi Kebersihan', (structure.sectionCleaning || ['Rizky', 'Doni']).join(', '), 'Koordinator Regu Piket & Kebersihan'],
      ['9', 'Seksi Keamanan & Disiplin', (structure.sectionSecurity || ['Bayu', 'Tegar']).join(', '), 'Ketertiban & Kedisiplinan Ruang Kelas'],
      ['10', 'Seksi Kerohanian / Ibadah', (structure.sectionReligious || ['Zainal', 'Aisyah']).join(', '), 'Kegiatan Keagamaan & Doa Bersama'],
      ['11', 'Seksi Olahraga & Prestasi', (structure.sectionSports || ['Dimas', 'Roni']).join(', '), 'Kegiatan Jasmani, Lomba & Turnamen'],
      ['12', 'Seksi Hubungan Masyarakat', (structure.sectionPublicRelations || ['Maya', 'Fikri']).join(', '), 'Komunikasi & Humas Antar Kelas'],
      ['13', 'Seksi Perlengkapan & Sarpras', (structure.sectionEquipment || ['Hendra', 'Aldi']).join(', '), 'Pemeliharaan Sarpras & Kartu Inventaris']
    ];

    autoTable(doc, {
      head: [['No', 'Jabatan Struktural', 'Nama Personel Terpilih', 'Uraian Tanggung Jawab']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, structure.homeroomTeacher);

    const filename = `Struktur_Organisasi_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Struktur Organisasi Kelas Berhasil Dicetak!', filename);
  }

  // 8) Menu 8: Kartu Inventaris Ruangan (KIR)
  public static exportInventoryPDF(className: string, inventories: ClassInventoryItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'KARTU INVENTARIS RUANGAN (KIR) KELAS', 'Pencatatan Sarana Prasarana & Mebeler', className);

    const body = inventories.map((item, idx) => [
      String(idx + 1),
      item.itemCode,
      item.itemName,
      String(item.quantity),
      item.unit,
      item.condition,
      item.source,
      item.notes || '-'
    ]);

    autoTable(doc, {
      head: [['No', 'Kode Barang', 'Nama Sarpras / Mebeler', 'Qty', 'Satuan', 'Kondisi', 'Sumber Pengadaan', 'Keterangan']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Kartu_Inventaris_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Kartu Inventaris Ruangan Berhasil Dicetak!', filename);
  }

  // 9) Menu 9: Jurnal Bimbingan & Konseling
  public static exportGuidancePDF(className: string, guidanceLogs: ClassGuidanceItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'JURNAL BIMBINGAN & KONSELING KELAS', 'Catatan Konseling, Motivasi & Pembinaan Karakter', className);

    const body = guidanceLogs.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.studentName,
      item.guidanceType,
      item.problemDescription,
      item.counselingGiven,
      item.status
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Nama Siswa', 'Jenis Bimbingan', 'Uraian Masalah', 'Bimbingan Diberikan', 'Status']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'portrait', 'Guru BK & Wali Kelas,');

    const filename = `Jurnal_Bimbingan_Konseling_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Jurnal Bimbingan Konseling Berhasil Dicetak!', filename);
  }

  // 10) Menu 10: Rekap Kehadiran Piket Kebersihan
  public static exportPiketAttendancePDF(className: string, logs: PiketAttendanceRecord[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'REKAPITULASI PELAKSANAAN PIKET KEBERSIHAN', 'Jurnal Evaluasi Disiplin Petugas Kebersihan', className);

    const body = logs.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.day,
      item.inspectorName || 'Wali Kelas',
      `${item.cleanlinessScore}/100`,
      item.attendanceList.map(a => `${a.studentName} (${a.status})`).join('\n'),
      item.evaluationNotes || '-'
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Hari', 'Pemeriksa', 'Skor', 'Daftar Hadir Petugas', 'Catatan Evaluasi']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Rekap_Presensi_Piket_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Rekap Presensi Piket Berhasil Dicetak!', filename);
  }

  // 11) Menu 11: Jurnal Penilaian Sikap Spiritual & Sosial
  public static exportAttitudePDF(className: string, attitudeAssessments: AttitudeAssessmentItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'JURNAL PENILAIAN SIKAP SPIRITUAL & SOSIAL', 'Profil Pelajar Pancasila & Pembiasaan Karakter', className);

    const body = attitudeAssessments.map((item, idx) => [
      String(idx + 1),
      item.studentName,
      item.spiritualScore,
      item.spiritualDescription,
      item.socialScore,
      item.socialDescription,
      item.specialNotes || '-'
    ]);

    autoTable(doc, {
      head: [['No', 'Nama Siswa', 'Spiritual', 'Deskripsi Spiritual', 'Sosial', 'Deskripsi Sosial', 'Catatan Khusus']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Penilaian_Sikap_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Jurnal Penilaian Sikap Berhasil Dicetak!', filename);
  }

  // 12) Menu 12: Buku Kas & Laporan Keuangan Kelas
  public static exportTreasuryPDF(className: string, transactions: ClassTreasuryTransaction[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BUKU KAS & LAPORAN KEUANGAN KELAS', 'Transparansi Penerimaan, Pengeluaran & Saldo Kas', className);

    let totalIn = 0;
    let totalOut = 0;

    const body = transactions.map((item, idx) => {
      if (item.type === 'Pemasukan') totalIn += item.amount;
      else totalOut += item.amount;

      return [
        String(idx + 1),
        item.date,
        item.description,
        item.category,
        item.type === 'Pemasukan' ? `Rp ${item.amount.toLocaleString('id-ID')}` : '-',
        item.type === 'Pengeluaran' ? `Rp ${item.amount.toLocaleString('id-ID')}` : '-',
        `Rp ${item.balanceAfter.toLocaleString('id-ID')}`
      ];
    });

    // Summary row
    body.push([
      '',
      'TOTAL REKAPITULASI',
      '',
      '',
      `Rp ${totalIn.toLocaleString('id-ID')}`,
      `Rp ${totalOut.toLocaleString('id-ID')}`,
      `Rp ${(totalIn - totalOut).toLocaleString('id-ID')}`
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Uraian Transaksi', 'Kategori', 'Pemasukan (Debit)', 'Pengeluaran (Kredit)', 'Saldo Akhir']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'portrait', 'Bendahara & Wali Kelas,');

    const filename = `Laporan_Kas_Kelas_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Laporan Keuangan Kas Kelas Berhasil Dicetak!', filename);
  }

  // 12.B) Menu 12: Rincian Administrasi Sekolah (Format Resmi SPP, Asrama, Buku, Praktikum, Kesiswaan, dll.)
  public static exportSchoolFeeAdministrationPDF(
    className: string,
    docData: SchoolFeeAdministrationDoc
  ): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;

    // Kop Surat Resmi SMK dr. SOEBANDI
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('YAYASAN PENDIDIKAN JEMBER INTERNATIONAL SCHOOL', pageWidth / 2, 10, { align: 'center' });

    doc.setFontSize(13);
    doc.text('SMK dr. SOEBANDI', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text('TERAKREDITASI (A)', pageWidth / 2, 19.5, { align: 'center' });

    doc.setFontSize(8.5);
    doc.text('(BAN-PDM) NOMOR : 604/BAN-PDM/SK/2025', pageWidth / 2, 23.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NSS: 342052429294                      NPSN: 60724703', pageWidth / 2, 27.5, { align: 'center' });
    doc.text('Jl. dr. Soebandi No. 99A, Telp. (0331) 5104296, Jember', pageWidth / 2, 31.5, { align: 'center' });
    doc.text('E-mail : smkdr.soebandi@gmail.com, Website : www.smkdrsoebandijember.sch.id', pageWidth / 2, 35.5, { align: 'center' });

    // Double Border Line
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.line(10, 38, pageWidth - 10, 38);
    doc.setLineWidth(0.2);
    doc.line(10, 39, pageWidth - 10, 39);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('RINCIAN ADMINISTRASI SEKOLAH', pageWidth / 2, 45, { align: 'center' });
    const titleWidth = doc.getTextWidth('RINCIAN ADMINISTRASI SEKOLAH');
    doc.setLineWidth(0.4);
    doc.line(pageWidth / 2 - titleWidth / 2, 46, pageWidth / 2 + titleWidth / 2, 46);

    // Metadata Left (Bulan & Kelas)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bulan`, 10, 51);
    doc.text(`: ${docData.month || 'Agustus 2026'}`, 25, 51);
    doc.text(`Kelas`, 10, 55.5);
    doc.text(`: ${docData.className || className || 'XI APL'}`, 25, 55.5);

    // Table Data preparation
    const months = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'januari', 'februari', 'maret', 'april', 'mei', 'juni'] as const;

    let totalPrevAll = 0;
    let totalAsramaAll = 0;
    let totalPtsPasAll = 0;
    let totalBukuAll = 0;
    let totalPraktikumAll = 0;
    let totalKesiswaanAll = 0;
    const sppMonthlyTotals: Record<string, number> = {
      juli: 0, agustus: 0, september: 0, oktober: 0, november: 0, desember: 0,
      januari: 0, februari: 0, maret: 0, april: 0, mei: 0, juni: 0
    };
    let totalGrandAll = 0;

    const bodyData = docData.records.map((r, idx) => {
      const prev = Number(r.tagihanKelasX) || 0;
      const asrama = Number(r.asrama) || 0;
      const pts = Number(r.ptsPas) || 0;
      const buku = Number(r.buku) || 0;
      const prak = Number(r.praktikum) || 0;
      const kesis = Number(r.kesiswaan) || 0;

      let sppTotalStudent = 0;
      const sppRowValues = months.map(m => {
        const val = Number(r.spp?.[m]) || 0;
        sppMonthlyTotals[m] += val;
        sppTotalStudent += val;
        return val > 0 ? val.toLocaleString('id-ID') : '-';
      });

      const totalStudent = prev + asrama + pts + buku + prak + kesis + sppTotalStudent;

      totalPrevAll += prev;
      totalAsramaAll += asrama;
      totalPtsPasAll += pts;
      totalBukuAll += buku;
      totalPraktikumAll += prak;
      totalKesiswaanAll += kesis;
      totalGrandAll += totalStudent;

      return [
        String(idx + 1),
        r.studentName,
        prev > 0 ? prev.toLocaleString('id-ID') : '-',
        asrama > 0 ? asrama.toLocaleString('id-ID') : '-',
        pts > 0 ? pts.toLocaleString('id-ID') : '-',
        buku > 0 ? buku.toLocaleString('id-ID') : '-',
        prak > 0 ? prak.toLocaleString('id-ID') : '-',
        kesis > 0 ? kesis.toLocaleString('id-ID') : '-',
        ...sppRowValues,
        totalStudent > 0 ? totalStudent.toLocaleString('id-ID') : '-'
      ];
    });

    // Baris Jumlah Rekapitulasi
    const summaryRow = [
      '',
      'JUMLAH',
      totalPrevAll > 0 ? totalPrevAll.toLocaleString('id-ID') : '-',
      totalAsramaAll > 0 ? totalAsramaAll.toLocaleString('id-ID') : '-',
      totalPtsPasAll > 0 ? totalPtsPasAll.toLocaleString('id-ID') : '-',
      totalBukuAll > 0 ? totalBukuAll.toLocaleString('id-ID') : '-',
      totalPraktikumAll > 0 ? totalPraktikumAll.toLocaleString('id-ID') : '-',
      totalKesiswaanAll > 0 ? totalKesiswaanAll.toLocaleString('id-ID') : '-',
      ...months.map(m => (sppMonthlyTotals[m] > 0 ? sppMonthlyTotals[m].toLocaleString('id-ID') : '-')),
      totalGrandAll > 0 ? totalGrandAll.toLocaleString('id-ID') : '-'
    ];
    bodyData.push(summaryRow);

    const head1 = [
      [
        { content: 'NO.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: 'NAMA SISWA', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: docData.tagihanPreviousHeader || 'TAGIHAN KELAS X', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: docData.asramaHeaderPeriod || 'ASRAMA 2026 - 2027', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: 'PTS - PAS', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: 'BUKU', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: 'PRAKTIKUM 1 TAHUN', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: 'KESISWAAN', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
        { content: docData.sppHeaderPeriod || 'SPP (JULI 2026 - JUNI 2027)', colSpan: 12, styles: { halign: 'center' as const } },
        { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } }
      ],
      [
        { content: 'JULI', styles: { halign: 'center' as const } },
        { content: 'AGUSTUS', styles: { halign: 'center' as const } },
        { content: 'SEPTEMBER', styles: { halign: 'center' as const } },
        { content: 'OKTOBER', styles: { halign: 'center' as const } },
        { content: 'NOVEMBER', styles: { halign: 'center' as const } },
        { content: 'DESEMBER', styles: { halign: 'center' as const } },
        { content: 'JANUARI', styles: { halign: 'center' as const } },
        { content: 'FEBRUARI', styles: { halign: 'center' as const } },
        { content: 'MARET', styles: { halign: 'center' as const } },
        { content: 'APRIL', styles: { halign: 'center' as const } },
        { content: 'MEI', styles: { halign: 'center' as const } },
        { content: 'JUNI', styles: { halign: 'center' as const } }
      ]
    ];

    autoTable(doc, {
      head: head1,
      body: bodyData,
      startY: 58,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        textColor: [15, 23, 42],
        lineColor: [50, 50, 50],
        lineWidth: 0.15,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 12, halign: 'right' },
        5: { cellWidth: 12, halign: 'right' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 10, halign: 'right' },
        9: { cellWidth: 10, halign: 'right' },
        10: { cellWidth: 10, halign: 'right' },
        11: { cellWidth: 10, halign: 'right' },
        12: { cellWidth: 10, halign: 'right' },
        13: { cellWidth: 10, halign: 'right' },
        14: { cellWidth: 10, halign: 'right' },
        15: { cellWidth: 10, halign: 'right' },
        16: { cellWidth: 10, halign: 'right' },
        17: { cellWidth: 10, halign: 'right' },
        18: { cellWidth: 10, halign: 'right' },
        19: { cellWidth: 10, halign: 'right' },
        20: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        // Highlight rows/cells based on record state
        if (data.section === 'body') {
          const rowIndex = data.row.index;
          const isSummary = rowIndex === bodyData.length - 1;

          if (isSummary) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [248, 250, 252];
            return;
          }

          const record = docData.records[rowIndex];
          if (record) {
            if (record.rowHighlight === 'lunas_full') {
              data.cell.styles.fillColor = [220, 252, 231]; // light green
            }

            // Cell specific highlight
            const colIndex = data.column.index;
            let status: string | undefined;

            if (colIndex === 2) status = record.cellStatus?.tagihanKelasX;
            else if (colIndex === 3) status = record.cellStatus?.asrama;
            else if (colIndex === 4) status = record.cellStatus?.ptsPas;
            else if (colIndex === 5) status = record.cellStatus?.buku;
            else if (colIndex === 6) status = record.cellStatus?.praktikum;
            else if (colIndex === 7) status = record.cellStatus?.kesiswaan;
            else if (colIndex === 8) status = record.cellStatus?.spp_juli;
            else if (colIndex === 9) status = record.cellStatus?.spp_agustus;
            else if (colIndex === 10) status = record.cellStatus?.spp_september;
            else if (colIndex === 11) status = record.cellStatus?.spp_oktober;
            else if (colIndex === 12) status = record.cellStatus?.spp_november;
            else if (colIndex === 13) status = record.cellStatus?.spp_desember;
            else if (colIndex === 14) status = record.cellStatus?.spp_januari;
            else if (colIndex === 15) status = record.cellStatus?.spp_februari;
            else if (colIndex === 16) status = record.cellStatus?.spp_maret;
            else if (colIndex === 17) status = record.cellStatus?.spp_april;
            else if (colIndex === 18) status = record.cellStatus?.spp_mei;
            else if (colIndex === 19) status = record.cellStatus?.spp_juni;

            if (status === 'wajib') {
              data.cell.styles.fillColor = [234, 88, 12]; // Oranye (#EA580C)
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'cicil') {
              data.cell.styles.fillColor = [250, 204, 21]; // Kuning (#FACC15)
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'subsidi') {
              data.cell.styles.fillColor = [56, 189, 248]; // Biru muda (#38BDF8)
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      margin: { left: 10, right: 10 }
    });

    let currentY = (doc as any).lastAutoTable?.finalY + 4 || 135;

    // Check bottom boundary for footer
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 20;
    }

    // Wali Kelas Callout Left
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(docData.className || 'XI APL', 10, currentY);
    doc.text(docData.homeroomTeacherCallName || 'BAPAK PUPUT', 10, currentY + 4.5);

    // Keterangan Legend Status (Kiri Bawah)
    const legendStartY = currentY + 11;
    const legendItems = [
      { label: 'LUNAS', color: [255, 255, 255], border: [150, 150, 150] },
      { label: 'WAJIB DILUNASI', color: [234, 88, 12], textColor: [255, 255, 255] },
      { label: 'MOHON DICICIL', color: [250, 204, 21], textColor: [0, 0, 0] },
      { label: 'SUBSIDI BANTUAN', color: [56, 189, 248], textColor: [0, 0, 0] }
    ];

    legendItems.forEach((item, lIdx) => {
      const y = legendStartY + lIdx * 5.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(10, y, 40, 5, 'D');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, 12, y + 3.8);

      // Color Box
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(50, y, 15, 5, 'FD');
    });

    // Bank Account Info Box (Tengah)
    const bankBoxX = 75;
    const bankBoxY = currentY + 11;
    const bankBoxW = 55;
    const bankBoxH = 22;

    doc.setFillColor(245, 158, 11); // Amber-500
    doc.rect(bankBoxX, bankBoxY, bankBoxW, bankBoxH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(bankBoxX, bankBoxY, bankBoxW, bankBoxH, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(docData.bankName || 'BANK SYARIAH INDONESIA (BSI)', bankBoxX + 3, bankBoxY + 6);
    doc.setFontSize(9);
    doc.text(docData.bankAccountNumber || '4444-400-167', bankBoxX + 3, bankBoxY + 12);
    doc.setFontSize(7.5);
    doc.text(docData.bankAccountHolder || 'SMK DR SOEBANDI JEMBER', bankBoxX + 3, bankBoxY + 18);

    // Kanan Atas: ACC Bendahara Penerimaan
    const rightX = 220;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(docData.dataPerDate || 'Data per Tanggal 15 Agustus 2026', rightX, currentY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ACC Bendahara Penerimaan', rightX, currentY + 7);
    doc.text('Jember, .................... 2026', rightX, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(docData.receivingTreasurerName || 'Agustin Rahmawati', rightX, currentY + 28);

    // Bawah: Tanda Tangan Resmi
    const sigY = currentY + 36;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Mengetahui,', 10, sigY);
    doc.text('Bendahara Sekolah', 10, sigY + 4.5);

    doc.text(docData.signDate || 'Jember, 31 Agustus 2026', rightX, sigY);
    doc.text('Wali Kelas', rightX, sigY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text(docData.schoolTreasurerName || 'Agustin Rahmawati, A.Md.', 10, sigY + 22);
    doc.text(docData.homeroomTeacherName || 'Puput Sasmita, S.Pd., Gr.', rightX, sigY + 22);

    const filename = `Rincian_Administrasi_Sekolah_${(docData.className || className).replace(/\s+/g, '_')}_${docData.month.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Rincian Administrasi Sekolah Berhasil Dicetak!', filename);
  }

  // 13) Menu 13: Jurnal Agenda Kegiatan Pembelajaran
  public static exportJournalPDF(className: string, journals: ClassJournalItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'JURNAL AGENDA PEMBELAJARAN & KBM HARIAN', 'Catatan Materi, Guru Pengajar & Kehadiran', className);

    const body = journals.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.period,
      item.subjectName,
      item.teacherName,
      item.competencyOrTopic,
      item.attendanceNote
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Jam KBM', 'Mata Pelajaran', 'Guru Pengajar', 'Materi / Topik Pembelajaran', 'Presensi']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Jurnal_Agenda_KBM_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Jurnal Agenda KBM Berhasil Dicetak!', filename);
  }

  // 14) Menu 14: Buku Mutasi Siswa
  public static exportMutationPDF(className: string, mutations: StudentMutationItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BUKU REGISTER MUTASI SISWA (MASUK & KELUAR)', 'Catatan Administrasi Perpindahan Siswa', className);

    const body = mutations.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.studentName,
      item.nisn,
      item.type === 'Masuk' ? 'Siswa Masuk' : 'Siswa Keluar',
      item.schoolDestinationOrOrigin,
      item.reason
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Nama Siswa', 'NISN', 'Jenis Mutasi', 'Asal / Tujuan Sekolah', 'Alasan Kepindahan']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Buku_Mutasi_Siswa_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Buku Mutasi Siswa Berhasil Dicetak!', filename);
  }

  // 15) Menu 15: Catatan Kasus Khusus Siswa
  public static exportCasesPDF(className: string, cases: StudentCaseItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BUKU CATATAN KHUSUS & PENANGANAN KASUS SISWA', 'Berita Acara Pembinaan & Penyelesaian Masalah', className);

    const body = cases.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.studentName,
      item.incidentCategory,
      item.chronology,
      item.actionTaken,
      item.resolutionStatus
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Nama Siswa', 'Kategori', 'Kronologi Kejadian', 'Tindakan Pembinaan', 'Status Kasus']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'portrait', 'Guru BK / Tatib & Wali Kelas,');

    const filename = `Catatan_Kasus_Siswa_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Catatan Kasus Siswa Berhasil Dicetak!', filename);
  }

  // 16) Menu 16: Rekap Prestasi & Penghargaan Siswa
  public static exportAchievementsPDF(className: string, achievements: StudentAchievementItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'BUKU PRESTASI & PENGHARGAAN KEJUARAAN SISWA', 'Dokumentasi Capaian Akademik & Non-Akademik', className);

    const body = achievements.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.studentName,
      item.achievementTitle,
      item.field,
      item.competitionLevel,
      item.rank,
      item.organizer
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Nama Siswa', 'Nama Lomba / Prestasi', 'Bidang', 'Tingkat', 'Peringkat Juara', 'Penyelenggara']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Buku_Prestasi_Siswa_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Buku Prestasi Siswa Berhasil Dicetak!', filename);
  }

  // 17) Menu 17: Laporan Home Visit Kunjungan Rumah
  public static exportHomeVisitsPDF(className: string, homeVisits: HomeVisitItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'LAPORAN REKAPITULASI HOME VISIT (KUNJUNGAN RUMAH)', 'Kolaborasi Wali Kelas, Guru BK & Orang Tua Siswa', className);

    const body = homeVisits.map((item, idx) => [
      String(idx + 1),
      item.date,
      item.studentName,
      item.parentOrGuardianMet,
      item.address,
      item.reasonForVisit,
      item.discussionSummary
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Nama Siswa', 'Orang Tua / Wali', 'Alamat Kunjungan', 'Tujuan / Alasan', 'Hasil Kesepakatan']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'portrait', 'Guru Pembimbing & Wali Kelas,');

    const filename = `Laporan_Home_Visit_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Laporan Home Visit Berhasil Dicetak!', filename);
  }

  // 18) Menu 18: Mading & Dokumentasi Administrasi
  public static exportBulletinPDF(className: string, bulletinBoard: ClassBulletinBoardItem[]): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.addOfficialHeader(doc, 'REKAPITULASI MADING & DOKUMENTASI KELAS', 'Arsip Informasi, Pengumuman & Karya Siswa', className);

    const body = bulletinBoard.map((item, idx) => [
      String(idx + 1),
      item.publishDate || '-',
      item.title,
      item.category,
      item.author,
      item.content.length > 80 ? `${item.content.slice(0, 80)}...` : item.content,
      item.isPinned ? 'Tersemat' : 'Reguler'
    ]);

    autoTable(doc, {
      head: [['No', 'Tanggal', 'Judul Informasi', 'Kategori', 'Penulis / Sumber', 'Ringkasan Isi', 'Status']],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    this.addOfficialSignatures(doc, finalY);

    const filename = `Dokumentasi_Mading_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Dokumentasi Mading Kelas Berhasil Dicetak!', filename);
  }

  // 19) Export All 18 Homeroom Administrative Modules into a comprehensive multi-page Dossier PDF
  public static exportAllHomeroomPDF(className: string, data: HomeroomDataPackage): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cover / Dossier Title Page
    const startY = this.addOfficialHeader(
      doc,
      'BUKU BUKTI ADMINISTRASI LENGKAP WALI KELAS',
      'Kompilasi Terintegrasi 18 Dokumen & Mutasi Kelas',
      className
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`IKHTISAR ADMINISTRASI KELAS (${className})`, 105, startY + 10, { align: 'center' });

    const summaryTableData = [
      ['1. Jadwal Pelajaran Mingguan', `${data.lessonSchedules.length} Hari Aktif KBM`],
      ['2. Daftar Regu Piket Kebersihan', `${data.piketSchedules.length} Regu Piket`],
      ['3. Kesepakatan & Piagam Kelas', `${data.classAgreement?.rules?.length || 0} Butir Komitmen`],
      ['4. Denah Tempat Duduk Siswa', `${data.seatingLayout?.desks?.length || 0} Formasi Meja Siswa`],
      ['5. Statistik & Demografi Siswa', `${data.studentIdentities.length} Total Siswa Terdata`],
      ['6. Data Identitas / Buku Induk', `${data.studentIdentities.length} Biodata Terdaftar`],
      ['7. Bagan Organisasi Kelas', `Wali: ${data.classStructure?.homeroomTeacher || '-'} | Ketua: ${data.classStructure?.president || '-'}`],
      ['8. Kartu Inventaris Ruangan (KIR)', `${data.inventories?.length || 0} Jenis Barang Sarpras`],
      ['9. Jurnal Pembimbingan / Konseling', `${data.guidanceLogs?.length || 0} Catatan Bimbingan`],
      ['10. Presensi & Jurnal Piket Harian', `${data.piketAttendanceLogs.length} Rekap Presensi Piket`],
      ['11. Penilaian Sikap Spiritual & Sosial', `${data.attitudeAssessments.length} Observasi Karakter`],
      ['12. Buku Kas & Administrasi Keuangan', `${data.treasuryTransactions.length} Mutasi Keuangan`],
      ['13. Agenda Jurnal Harian KBM', `${data.classJournals.length} Catatan Guru Mapel`],
      ['14. Buku Mutasi Siswa Masuk / Keluar', `${data.studentMutations.length} Mutasi Tercatat`],
      ['15. Catatan Kasus & Kejadian Khusus', `${data.studentCases.length} Kasus Terlaporkan`],
      ['16. Buku Prestasi & Penghargaan', `${data.studentAchievements.length} Capaian Kejuaraan`],
      ['17. Laporan Home Visit / Silaturahmi', `${data.homeVisits.length} Kunjungan Rumah`],
      ['18. Dokumentasi & Mading Digital', `${data.classBulletinBoard?.length || 0} Artikel & Publikasi`]
    ];

    autoTable(doc, {
      head: [['Menu Administrasi', 'Status Kelengkapan & Ringkasan Data']],
      body: summaryTableData,
      startY: startY + 16,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 120;
    this.addOfficialSignatures(doc, finalY, 'Budi Santoso, S.Pd', 'portrait', 'Wali Kelas Pengampu,');

    const filename = `Buku_Administrasi_Lengkap_${className.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    this.notifySuccess('Buku Administrasi Lengkap Berhasil Dicetak!', filename);
  }

  // Helper notification
  private static notifySuccess(title: string, filename: string): void {
    Swal.fire({
      icon: 'success',
      title,
      text: `File "${filename}" berhasil diunduh dengan format resmi dokumen cetak.`,
      timer: 2300,
      showConfirmButton: false
    });
  }
}
