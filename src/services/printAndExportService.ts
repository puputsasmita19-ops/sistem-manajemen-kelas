import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { AppSettings } from '../types';

export interface OfficialPDFDocOptions {
  orientation?: 'portrait' | 'landscape';
  title?: string;
  subTitle?: string;
  categoryName?: string;
}

export class PrintAndExportService {
  private static instance: PrintAndExportService;

  public static getInstance(): PrintAndExportService {
    if (!PrintAndExportService.instance) {
      PrintAndExportService.instance = new PrintAndExportService();
    }
    return PrintAndExportService.instance;
  }

  /**
   * Mengembalikan dimensi dan format kertas sesuai preferensi AppSettings
   */
  public getPaperFormat(appSettings: AppSettings, overrideOrientation?: 'portrait' | 'landscape'): {
    format: string | [number, number];
    orientation: 'portrait' | 'landscape';
    width: number;
    height: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
  } {
    const paperSize = appSettings.paperSize || 'a4';
    const orientation = overrideOrientation || appSettings.paperOrientation || 'portrait';
    const marginTop = appSettings.paperMarginTop ?? 15;
    const marginBottom = appSettings.paperMarginBottom ?? 15;
    const marginLeft = appSettings.paperMarginLeft ?? 15;
    const marginRight = appSettings.paperMarginRight ?? 15;

    let width = 210;
    let height = 297;
    let format: string | [number, number] = 'a4';

    if (paperSize === 'f4') {
      width = 215;
      height = 330;
      format = [215, 330];
    } else if (paperSize === 'letter') {
      width = 216;
      height = 279;
      format = 'letter';
    } else if (paperSize === 'legal') {
      width = 216;
      height = 356;
      format = 'legal';
    } else {
      width = 210;
      height = 297;
      format = 'a4';
    }

    if (orientation === 'landscape') {
      const temp = width;
      width = height;
      height = temp;
    }

    return {
      format,
      orientation,
      width,
      height,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight
    };
  }

  /**
   * Inisialisasi dokumen jsPDF standar kedinasan
   */
  public initPDF(appSettings: AppSettings, orientation?: 'portrait' | 'landscape'): jsPDF {
    const paper = this.getPaperFormat(appSettings, orientation);
    return new jsPDF({
      orientation: paper.orientation,
      unit: 'mm',
      format: paper.format
    });
  }

  /**
   * Menempelkan Kop Surat Resmi ke lembar dokumen jsPDF
   * Menghasilkan startY tepat untuk tabel berikutnya
   */
  public renderKopSurat(
    doc: jsPDF,
    appSettings: AppSettings,
    documentTitle: string,
    documentSubTitle?: string,
    overrideOrientation?: 'portrait' | 'landscape'
  ): number {
    const paper = this.getPaperFormat(appSettings, overrideOrientation);
    const pageWidth = paper.width;
    const isKopEnabled = appSettings.kopEnabled !== false;

    let currentY = paper.marginTop;

    if (isKopEnabled) {
      const instansiUtama = (appSettings.kopInstansiUtama || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA').toUpperCase();
      const dinas = (appSettings.kopDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN').toUpperCase();
      const namaSekolah = (appSettings.kopNamaSekolah || appSettings.appName || 'SMA NEGERI UNGGULAN INDONESIA').toUpperCase();
      const subHeading = appSettings.kopSubHeading || 'SEKOLAH PENGGERAK • STATUS AKREDITASI A (UNGGUL)';
      const alamat = appSettings.kopAlamat || appSettings.schoolAddress || 'Jl. Pendidikan Nasional No. 45, Jakarta';
      const kontak = appSettings.kopKontak || 'Telp: (021) 7890123 • Email: info@sekolah.sch.id • Web: www.sekolah.sch.id';
      const kodePos = appSettings.kopKodePos || 'Kode Pos: 12345';

      // 1. Simbol / Logo Instansi di Kop Surat
      const logoSize = 20;
      const logoY = currentY + 0.5;
      const logoPos = appSettings.kopLogoPosition || 'left';
      const customLogo = appSettings.kopLogoUrl || (appSettings.logoType === 'image' ? appSettings.logoImageUrl : undefined);

      const renderLogoAt = (x: number) => {
        if (customLogo && (customLogo.startsWith('data:image/') || customLogo.startsWith('http'))) {
          try {
            const imgFormat = customLogo.includes('image/png')
              ? 'PNG'
              : customLogo.includes('image/jpeg') || customLogo.includes('image/jpg')
              ? 'JPEG'
              : customLogo.includes('image/webp')
              ? 'WEBP'
              : 'PNG';
            doc.addImage(customLogo, imgFormat, x, logoY, logoSize, logoSize, undefined, 'FAST');
          } catch {
            this.renderDefaultLogoEmblem(doc, x, logoY, logoSize, appSettings);
          }
        } else {
          this.renderDefaultLogoEmblem(doc, x, logoY, logoSize, appSettings);
        }
      };

      if (logoPos === 'left' || logoPos === 'both') {
        renderLogoAt(paper.marginLeft + 2);
      }
      if (logoPos === 'both') {
        renderLogoAt(pageWidth - paper.marginRight - logoSize - 2);
      }

      // 2. Teks Utama Kop Surat (Rata Tengah)
      const centerX = logoPos === 'left' ? (pageWidth / 2 + 5) : (pageWidth / 2); // penyesuaian posisi tengah seimbang terhadap logo

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(instansiUtama, centerX, currentY + 4, { align: 'center' });

      doc.setFontSize(10.5);
      doc.text(dinas, centerX, currentY + 9, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(namaSekolah, centerX, currentY + 15, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(subHeading, centerX, currentY + 19.5, { align: 'center' });

      const fullContact = `${alamat} • ${kontak} • ${kodePos}`;
      doc.setFontSize(7.5);
      doc.text(fullContact, centerX, currentY + 23.5, { align: 'center' });

      // 3. Garis Pembatas Kop Surat Resmi Kedinasan
      const lineY = currentY + 26.5;
      const borderType = appSettings.kopBorderType || 'double';

      if (borderType === 'double') {
        // Garis tebal di atas
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(1.1);
        doc.line(paper.marginLeft, lineY, pageWidth - paper.marginRight, lineY);

        // Garis tipis di bawah
        doc.setLineWidth(0.35);
        doc.line(paper.marginLeft, lineY + 1.1, pageWidth - paper.marginRight, lineY + 1.1);
      } else if (borderType === 'single') {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.8);
        doc.line(paper.marginLeft, lineY, pageWidth - paper.marginRight, lineY);
      }

      currentY = lineY + 6;
    } else {
      // Header Sederhana jika Kop Surat dinonaktifkan
      doc.setFillColor(30, 41, 59);
      doc.rect(paper.marginLeft, currentY, pageWidth - paper.marginLeft - paper.marginRight, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(appSettings.appName.toUpperCase(), paper.marginLeft + 4, currentY + 5.5);
      currentY += 13;
    }

    // 4. Judul Dokumen Resmi (Document Title Banner)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(documentTitle.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

    if (documentSubTitle) {
      currentY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(documentSubTitle, pageWidth / 2, currentY, { align: 'center' });
    }

    currentY += 6;
    return currentY;
  }

  /**
   * Helper rendering emblem default untuk Kop Surat
   */
  private renderDefaultLogoEmblem(
    doc: jsPDF,
    x: number,
    y: number,
    size: number,
    appSettings: AppSettings
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const radius = size / 2;

    doc.setFillColor(30, 58, 138); // Deep Navy Blue
    doc.circle(cx, cy, radius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, radius - 1.2, 'F');
    doc.setFillColor(30, 58, 138);
    doc.circle(cx, cy, radius - 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const shortBrand = (appSettings.appName || 'SIMAK').slice(0, 5).toUpperCase();
    doc.text(shortBrand, cx, cy + 1.5, { align: 'center' });
  }

  /**
   * Menempelkan Tanda Tangan Resmi (Dukungan posisi dinamis: Kiri, Tengah, Kanan)
   */
  public async renderTandaTangan(
    doc: jsPDF,
    appSettings: AppSettings,
    currentY: number,
    customKiri?: { jabatan?: string; nama?: string; nip?: string },
    customKanan?: { jabatan?: string; nama?: string; nip?: string },
    overrideOrientation?: 'portrait' | 'landscape'
  ): Promise<number> {
    if (appSettings.signatureEnabled === false) {
      return currentY;
    }

    const paper = this.getPaperFormat(appSettings, overrideOrientation);
    const pageWidth = paper.width;
    const pageHeight = paper.height;

    // Kebutuhan tinggi blok tanda tangan ~45mm
    const requiredHeight = 45;
    if (currentY + requiredHeight > pageHeight - paper.marginBottom) {
      doc.addPage();
      currentY = paper.marginTop + 5;
    } else {
      currentY += 6;
    }

    const kota = appSettings.signatureKota || 'Jakarta';
    let tanggalStr = '';
    if (appSettings.signatureTanggalOtomatis !== false) {
      tanggalStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else {
      tanggalStr = appSettings.signatureTanggalManual || new Date().toLocaleDateString('id-ID');
    }

    const jabatanKiri = customKiri?.jabatan || appSettings.signatureJabatanKiri || 'Wali Kelas / Petugas Administrasi';
    const namaKiri = customKiri?.nama || appSettings.signatureNamaKiri || 'Dra. Hj. Siti Rahmawati, M.Pd';
    const nipKiri = customKiri?.nip || appSettings.signatureNipKiri || 'NIP. 19780512 200312 2 001';

    const jabatanKanan = customKanan?.jabatan || appSettings.signatureJabatanKanan || 'Kepala Sekolah';
    const namaKanan = customKanan?.nama || appSettings.signatureNamaKanan || 'Dr. H. Bambang Sudarsono, M.Si';
    const nipKanan = customKanan?.nip || appSettings.signatureNipKanan || 'NIP. 19690415 199403 1 004';

    // Ambil slot konfigurasi drag-and-drop
    let slotKiri = appSettings.signaturePosKiri || 'left_signer';
    let slotTengah = appSettings.signaturePosTengah || 'empty';
    let slotKanan = appSettings.signaturePosKanan || 'right_signer';

    // Fallback jika semua kosong
    if (slotKiri === 'empty' && slotTengah === 'empty' && slotKanan === 'empty') {
      slotKiri = 'left_signer';
      slotKanan = 'right_signer';
    }

    const usableWidth = pageWidth - paper.marginLeft - paper.marginRight;
    const leftColX = paper.marginLeft + 6;
    const centerColX = paper.marginLeft + (usableWidth / 2) - 27;
    const rightColX = pageWidth - paper.marginRight - 58;

    // Siapkan QR Code jika diaktifkan
    let qrDataUrl: string | null = null;
    if (appSettings.signatureQrVerification !== false) {
      try {
        const qrData = `SIMAK-VERIFIED|${appSettings.appName}|${tanggalStr}|LEGAL`;
        qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 80 });
      } catch {}
    }

    const renderSignerBlock = (
      type: 'left_signer' | 'right_signer',
      x: number,
      baseY: number
    ) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      if (type === 'left_signer') {
        doc.text('Mengetahui,', x, baseY);
        doc.setFont('helvetica', 'bold');
        doc.text(jabatanKiri, x, baseY + 4.5);

        // Gambar Tanda Tangan Digital Kiri
        const signBoxY = baseY + 6;
        if (
          appSettings.signatureLeftImageUrl &&
          (appSettings.signatureLeftImageUrl.startsWith('data:image/') || appSettings.signatureLeftImageUrl.startsWith('http'))
        ) {
          try {
            const imgFormat = appSettings.signatureLeftImageUrl.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(appSettings.signatureLeftImageUrl, imgFormat, x + 2, signBoxY, 26, 15, undefined, 'FAST');
          } catch {}
        }

        const nameY = baseY + 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(namaKiri, x, nameY);

        const textWidth = doc.getTextWidth(namaKiri);
        doc.setLineWidth(0.3);
        doc.setDrawColor(15, 23, 42);
        doc.line(x, nameY + 0.6, x + textWidth, nameY + 0.6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(nipKiri, x, nameY + 4.5);
      } else if (type === 'right_signer') {
        doc.text(`${kota}, ${tanggalStr}`, x, baseY);
        doc.setFont('helvetica', 'bold');
        doc.text(jabatanKanan, x, baseY + 4.5);

        const signBoxY = baseY + 6;

        // QR Code Verifikasi di samping kanan TTD
        if (qrDataUrl) {
          try {
            doc.addImage(qrDataUrl, 'PNG', x + 38, signBoxY, 13, 13);
          } catch {}
        }

        // Gambar Tanda Tangan Digital Kanan
        if (
          appSettings.signatureRightImageUrl &&
          (appSettings.signatureRightImageUrl.startsWith('data:image/') || appSettings.signatureRightImageUrl.startsWith('http'))
        ) {
          try {
            const imgFormat = appSettings.signatureRightImageUrl.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(appSettings.signatureRightImageUrl, imgFormat, x + 2, signBoxY, 26, 15, undefined, 'FAST');
          } catch {}
        }

        const nameY = baseY + 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(namaKanan, x, nameY);

        const textWidth = doc.getTextWidth(namaKanan);
        doc.setLineWidth(0.3);
        doc.setDrawColor(15, 23, 42);
        doc.line(x, nameY + 0.6, x + textWidth, nameY + 0.6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(nipKanan, x, nameY + 4.5);
      }
    };

    // Render masing-masing slot sesuai posisi
    if (slotKiri && slotKiri !== 'empty') {
      renderSignerBlock(slotKiri, leftColX, currentY);
    }
    if (slotTengah && slotTengah !== 'empty') {
      renderSignerBlock(slotTengah, centerColX, currentY);
    }
    if (slotKanan && slotKanan !== 'empty') {
      renderSignerBlock(slotKanan, rightColX, currentY);
    }

    return currentY + 36;
  }

  /**
   * Menempelkan nomor halaman ("Halaman X dari Y") dan footer resmi di seluruh halaman
   */
  public renderFooterAndPageNumbers(
    doc: jsPDF,
    appSettings: AppSettings,
    overrideOrientation?: 'portrait' | 'landscape'
  ): void {
    const paper = this.getPaperFormat(appSettings, overrideOrientation);
    const totalPages = doc.getNumberOfPages();
    const isPageNumEnabled = appSettings.paperPageNumbering !== false;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = paper.height - paper.marginBottom + 5;

      // Garis tipis footer
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.25);
      doc.line(paper.marginLeft, footerY - 3, paper.width - paper.marginRight, footerY - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400

      // Kiri: Nama Aplikasi & Identitas Sistem
      const leftBrand = `${appSettings.appName} — Sistem Informasi Manajemen Sekolah Digital`;
      doc.text(leftBrand, paper.marginLeft, footerY);

      // Kanan: Penomoran Halaman
      if (isPageNumEnabled) {
        const pageText = `Halaman ${i} dari ${totalPages}`;
        doc.text(pageText, paper.width - paper.marginRight, footerY, { align: 'right' });
      }
    }
  }

  /**
   * Helper Ekspor Excel (.xlsx) seragam dan andal
   */
  public saveExcelWorkbook(wb: XLSX.WorkBook, fileName: string): void {
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Helper Ekspor PDF (.pdf) seragam dan andal
   */
  public savePDFDocument(doc: jsPDF, fileName: string): void {
    doc.save(fileName);
  }
}
