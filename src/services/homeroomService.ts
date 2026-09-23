import { INITIAL_HOMEROOM_DATA, HomeroomClassData } from '../mockHomeroomData';
import { realtimeNotificationService } from './realtimeNotificationService';
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
  ClassBulletinBoardItem
} from '../types/homeroom';

const HOMEROOM_STORAGE_PREFIX = 'SIMAK_HOMEROOM_DATA_v1_';

export class HomeroomService {
  private static instance: HomeroomService;
  private cache: Record<string, HomeroomClassData> = {};

  private constructor() {}

  public static getInstance(): HomeroomService {
    if (!HomeroomService.instance) {
      HomeroomService.instance = new HomeroomService();
    }
    return HomeroomService.instance;
  }

  private getStorageKey(classId: string): string {
    return `${HOMEROOM_STORAGE_PREFIX}${classId}`;
  }

  public getClassHomeroomData(classId: string): HomeroomClassData {
    if (this.cache[classId]) {
      return this.cache[classId];
    }

    const key = this.getStorageKey(classId);
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const template = INITIAL_HOMEROOM_DATA[classId] || INITIAL_HOMEROOM_DATA['class_10_ipa1'];
        
        // Guarantee all 18 properties exist even if stored with older schema
        parsed.lessonSchedules = Array.isArray(parsed.lessonSchedules) ? parsed.lessonSchedules : (template?.lessonSchedules || []);
        parsed.piketSchedules = Array.isArray(parsed.piketSchedules) ? parsed.piketSchedules : (template?.piketSchedules || []);
        parsed.classAgreement = parsed.classAgreement || template?.classAgreement;
        parsed.seatingLayout = parsed.seatingLayout || template?.seatingLayout;
        parsed.studentIdentities = Array.isArray(parsed.studentIdentities) ? parsed.studentIdentities : (template?.studentIdentities || []);
        parsed.classStructure = parsed.classStructure || template?.classStructure;
        parsed.inventories = Array.isArray(parsed.inventories) ? parsed.inventories : (template?.inventories || []);
        parsed.guidanceLogs = Array.isArray(parsed.guidanceLogs) ? parsed.guidanceLogs : (template?.guidanceLogs || []);
        parsed.piketAttendanceLogs = Array.isArray(parsed.piketAttendanceLogs) ? parsed.piketAttendanceLogs : (template?.piketAttendanceLogs || []);
        parsed.attitudeAssessments = Array.isArray(parsed.attitudeAssessments) ? parsed.attitudeAssessments : (template?.attitudeAssessments || []);
        parsed.treasuryTransactions = Array.isArray(parsed.treasuryTransactions) ? parsed.treasuryTransactions : (template?.treasuryTransactions || []);
        parsed.schoolFeeAdministration = parsed.schoolFeeAdministration || template?.schoolFeeAdministration;
        parsed.classJournals = Array.isArray(parsed.classJournals) ? parsed.classJournals : (template?.classJournals || []);
        parsed.studentMutations = Array.isArray(parsed.studentMutations) ? parsed.studentMutations : (template?.studentMutations || []);
        parsed.studentCases = Array.isArray(parsed.studentCases) ? parsed.studentCases : (template?.studentCases || []);
        parsed.studentAchievements = Array.isArray(parsed.studentAchievements) ? parsed.studentAchievements : (template?.studentAchievements || []);
        parsed.homeVisits = Array.isArray(parsed.homeVisits) ? parsed.homeVisits : (template?.homeVisits || []);
        parsed.classBulletinBoard = Array.isArray(parsed.classBulletinBoard) ? parsed.classBulletinBoard : (template?.classBulletinBoard || []);

        this.cache[classId] = parsed;
        return parsed;
      } catch (e) {
        console.error('Error parsing stored homeroom data for class', classId, e);
      }
    }

    // Fallback to initial mock data or empty templates
    let initial = INITIAL_HOMEROOM_DATA[classId];
    if (!initial) {
      // Generate standard fallback structure if accessing another class
      initial = JSON.parse(JSON.stringify(INITIAL_HOMEROOM_DATA['class_10_ipa1']));
      // Relabel class_id
      initial.lessonSchedules?.forEach((s: any) => (s.class_id = classId));
      initial.piketSchedules?.forEach((s: any) => (s.class_id = classId));
      if (initial.classAgreement) initial.classAgreement.class_id = classId;
      if (initial.seatingLayout) initial.seatingLayout.class_id = classId;
      initial.studentIdentities?.forEach((s: any) => (s.class_id = classId));
      if (initial.classStructure) initial.classStructure.class_id = classId;
      initial.inventories?.forEach((s: any) => (s.class_id = classId));
      initial.guidanceLogs?.forEach((s: any) => (s.class_id = classId));
      initial.piketAttendanceLogs?.forEach((s: any) => (s.class_id = classId));
      initial.attitudeAssessments?.forEach((s: any) => (s.class_id = classId));
      initial.treasuryTransactions?.forEach((s: any) => (s.class_id = classId));
      initial.classJournals?.forEach((s: any) => (s.class_id = classId));
      initial.studentMutations?.forEach((s: any) => (s.class_id = classId));
      initial.studentCases?.forEach((s: any) => (s.class_id = classId));
      initial.studentAchievements?.forEach((s: any) => (s.class_id = classId));
      initial.homeVisits?.forEach((s: any) => (s.class_id = classId));
      initial.classBulletinBoard?.forEach((b: any) => (b.class_id = classId));
    }

    this.cache[classId] = JSON.parse(JSON.stringify(initial));
    this.saveClassData(classId, this.cache[classId]);
    return this.cache[classId];
  }

  public resetClassHomeroomData(classId: string): HomeroomClassData {
    const key = this.getStorageKey(classId);
    localStorage.removeItem(key);
    delete this.cache[classId];
    realtimeNotificationService.notifyActionWarning('Data Administrasi Direset', 'Data administrasi kelas telah dipulihkan ke format awal.');
    return this.getClassHomeroomData(classId);
  }

  public getHomeroomData(classId: string): HomeroomClassData {
    return this.getClassHomeroomData(classId);
  }

  private saveClassData(classId: string, data: HomeroomClassData): void {
    this.cache[classId] = data;
    try {
      localStorage.setItem(this.getStorageKey(classId), JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save homeroom data to localStorage', e);
    }
  }

  // 1) Lesson Schedule
  public updateLessonSchedules(classId: string, schedules: LessonScheduleItem[]): void {
    const data = this.getClassHomeroomData(classId);
    data.lessonSchedules = schedules;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Jadwal Pelajaran Disimpan', 'Jadwal pelajaran mingguan kelas berhasil disimpan.');
  }

  public addLessonSchedule(classId: string, item: Omit<LessonScheduleItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: LessonScheduleItem = {
      ...item,
      id: `sch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.lessonSchedules.push(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Jadwal Ditambahkan', `${item.subjectName} (${item.day}) berhasil dimasukkan ke jadwal.`);
  }

  public deleteLessonSchedule(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.lessonSchedules = data.lessonSchedules.filter(s => s.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Jadwal Dihapus', 'Jadwal mata pelajaran telah dihapus.');
  }

  // 2) Piket Schedule
  public updatePiketSchedules(classId: string, schedules: PiketScheduleItem[]): void {
    const data = this.getClassHomeroomData(classId);
    data.piketSchedules = schedules;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Jadwal Piket Disimpan', 'Daftar pembagian regu piket kelas berhasil disimpan.');
  }

  // 3) Class Agreement
  public updateClassAgreement(classId: string, agreement: ClassAgreementDoc): void {
    const data = this.getClassHomeroomData(classId);
    data.classAgreement = agreement;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Kesepakatan Kelas Disimpan', 'Piagam norma dan kesepakatan kelas berhasil diperbarui.');
  }

  // 4) Seating Layout
  public updateSeatingLayout(classId: string, layout: SeatingLayout): void {
    const data = this.getClassHomeroomData(classId);
    data.seatingLayout = layout;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Denah Tempat Duduk Disimpan', 'Posisi dan denah duduk siswa di kelas berhasil diperbarui.');
  }

  // 5 & 6) Student Identities
  public updateStudentIdentities(classId: string, list: StudentIdentityItem[]): void {
    const data = this.getClassHomeroomData(classId);
    data.studentIdentities = list;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Buku Induk Disimpan', 'Daftar profil dan identitas siswa berhasil diperbarui.');
  }

  public saveStudentIdentity(classId: string, item: StudentIdentityItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.studentIdentities.findIndex(s => s.id === item.id || s.studentId === item.studentId);
    if (idx >= 0) {
      data.studentIdentities[idx] = item;
    } else {
      data.studentIdentities.push(item);
    }
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Identitas Siswa Disimpan', `Data buku induk untuk ${item.fullName || 'Siswa'} berhasil disimpan.`);
  }

  // 7) Class Structure
  public updateClassStructure(classId: string, structure: ClassStructure): void {
    const data = this.getClassHomeroomData(classId);
    data.classStructure = structure;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Struktur Organisasi Disimpan', 'Bagan kepengurusan kelas berhasil diperbarui.');
  }

  // 8) Inventories
  public addInventoryItem(classId: string, item: Omit<ClassInventoryItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: ClassInventoryItem = {
      ...item,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.inventories.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Inventaris Ditambahkan', `Barang "${item.itemName}" berhasil dicatat dalam inventaris kelas.`);
  }

  public updateInventoryItem(classId: string, item: ClassInventoryItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.inventories.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      data.inventories[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Inventaris Diperbarui', `Data inventaris "${item.itemName}" berhasil disimpan.`);
    }
  }

  public deleteInventoryItem(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.inventories = data.inventories.filter(i => i.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Inventaris Dihapus', 'Data barang inventaris telah dihapus.');
  }

  // 9) Guidance Logs
  public addGuidanceLog(classId: string, item: Omit<ClassGuidanceItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: ClassGuidanceItem = {
      ...item,
      id: `gd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.guidanceLogs.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Konseling Dicatat', `Catatan bimbingan untuk ${item.studentName} berhasil disimpan.`);
  }

  public updateGuidanceLog(classId: string, item: ClassGuidanceItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.guidanceLogs.findIndex(g => g.id === item.id);
    if (idx >= 0) {
      data.guidanceLogs[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Konseling Diperbarui', `Status bimbingan untuk ${item.studentName} berhasil diperbarui.`);
    }
  }

  public deleteGuidanceLog(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.guidanceLogs = data.guidanceLogs.filter(g => g.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Konseling Dihapus', 'Catatan bimbingan siswa telah dihapus.');
  }

  // 10) Piket Attendance
  public addPiketAttendance(classId: string, item: Omit<PiketAttendanceRecord, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: PiketAttendanceRecord = {
      ...item,
      id: `patt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.piketAttendanceLogs.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Presensi Piket Disimpan', `Laporan piket regu ${item.day} berhasil disimpan.`);
  }

  public deletePiketAttendance(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.piketAttendanceLogs = data.piketAttendanceLogs.filter(p => p.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Laporan Piket Dihapus', 'Catatan pelaksanaan piket telah dihapus.');
  }

  // 11) Attitude Assessment
  public updateAttitudeAssessment(classId: string, item: AttitudeAssessmentItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.attitudeAssessments.findIndex(a => a.studentId === item.studentId || a.id === item.id);
    if (idx >= 0) {
      data.attitudeAssessments[idx] = item;
    } else {
      data.attitudeAssessments.push(item);
    }
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Penilaian Sikap Disimpan', `Catatan jurnal sikap ${item.studentName} berhasil disimpan.`);
  }

  public saveAttitudeAssessment(classId: string, item: AttitudeAssessmentItem): void {
    this.updateAttitudeAssessment(classId, item);
  }

  public deleteAttitudeAssessment(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.attitudeAssessments = data.attitudeAssessments.filter(a => a.id !== id && a.studentId !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Penilaian Sikap Dihapus', 'Catatan observasi sikap telah dihapus.');
  }

  // 12) Class Treasury / Administrasi Keuangan
  public addTreasuryTransaction(
    classId: string,
    item: Omit<ClassTreasuryTransaction, 'id' | 'class_id' | 'balanceAfter'>
  ): void {
    const data = this.getClassHomeroomData(classId);
    const currentBalance = data.treasuryTransactions.length > 0 ? data.treasuryTransactions[0].balanceAfter : 0;
    const change = item.type === 'Pemasukan' ? item.amount : -item.amount;
    const balanceAfter = Math.max(0, currentBalance + change);

    const newTrs: ClassTreasuryTransaction = {
      ...item,
      id: `trs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId,
      balanceAfter
    };
    data.treasuryTransactions.unshift(newTrs);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess(
      'Transaksi Kas Dicatat',
      `${item.type} Rp ${item.amount.toLocaleString('id-ID')} (${item.description}) berhasil dicatat.`
    );
  }

  public deleteTreasuryTransaction(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.treasuryTransactions = data.treasuryTransactions.filter(t => t.id !== id);
    // Recalculate balances chronologically
    let runningBalance = 0;
    for (let i = data.treasuryTransactions.length - 1; i >= 0; i--) {
      const t = data.treasuryTransactions[i];
      if (t.type === 'Pemasukan') runningBalance += t.amount;
      else runningBalance -= t.amount;
      t.balanceAfter = Math.max(0, runningBalance);
    }
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Transaksi Dihapus', 'Catatan kas kelas telah dihapus dan saldo disesuaikan.');
  }

  // 12.B) Rincian Administrasi Pembayaran Sekolah (Format Resmi SPP, Asrama, Buku, Praktikum, dll.)
  public getSchoolFeeAdministration(classId: string): SchoolFeeAdministrationDoc {
    const data = this.getClassHomeroomData(classId);
    if (!data.schoolFeeAdministration) {
      const template = INITIAL_HOMEROOM_DATA[classId]?.schoolFeeAdministration || INITIAL_HOMEROOM_DATA['class_10_ipa1']?.schoolFeeAdministration;
      if (template) {
        data.schoolFeeAdministration = JSON.parse(JSON.stringify(template));
        data.schoolFeeAdministration!.class_id = classId;
      } else {
        data.schoolFeeAdministration = {
          class_id: classId,
          className: 'XI APL',
          month: 'Agustus 2026',
          academicYear: '2026 - 2027',
          tagihanPreviousHeader: 'TAGIHAN KELAS X',
          asramaHeaderPeriod: 'ASRAMA 2026 - 2027',
          sppHeaderPeriod: 'SPP (JULI 2026 - JUNI 2027)',
          dataPerDate: 'Data per Tanggal 15 Agustus 2026',
          signDate: 'Jember, 31 Agustus 2026',
          homeroomTeacherName: 'Puput Sasmita, S.Pd., Gr.',
          homeroomTeacherCallName: 'BAPAK PUPUT',
          schoolTreasurerName: 'Agustin Rahmawati, A.Md.',
          receivingTreasurerName: 'Agustin Rahmawati',
          bankName: 'BANK SYARIAH INDONESIA (BSI)',
          bankAccountNumber: '4444-400-167',
          bankAccountHolder: 'SMK DR SOEBANDI JEMBER',
          records: [],
          updatedAt: new Date().toISOString()
        };
      }
      this.saveClassData(classId, data);
    }
    return data.schoolFeeAdministration!;
  }

  public saveSchoolFeeAdministration(classId: string, doc: SchoolFeeAdministrationDoc): void {
    const data = this.getClassHomeroomData(classId);
    doc.updatedAt = new Date().toISOString();
    data.schoolFeeAdministration = doc;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess(
      'Administrasi Disimpan',
      'Data rincian administrasi pembayaran sekolah berhasil disimpan.'
    );
  }

  public updateStudentFeeRecord(classId: string, record: StudentSchoolFeeRecord): void {
    const doc = this.getSchoolFeeAdministration(classId);
    const index = doc.records.findIndex(r => r.id === record.id);
    if (index >= 0) {
      doc.records[index] = record;
    } else {
      doc.records.push(record);
    }
    this.saveSchoolFeeAdministration(classId, doc);
  }

  public addStudentFeeRecord(classId: string, item: Omit<StudentSchoolFeeRecord, 'id'>): void {
    const doc = this.getSchoolFeeAdministration(classId);
    const newRecord: StudentSchoolFeeRecord = {
      ...item,
      id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    doc.records.push(newRecord);
    this.saveSchoolFeeAdministration(classId, doc);
  }

  public deleteStudentFeeRecord(classId: string, id: string): void {
    const doc = this.getSchoolFeeAdministration(classId);
    doc.records = doc.records.filter(r => r.id !== id);
    this.saveSchoolFeeAdministration(classId, doc);
    realtimeNotificationService.notifyActionInfo(
      'Data Siswa Dihapus',
      'Rincian pembayaran siswa telah dihapus dari lembar administrasi.'
    );
  }

  // 13) Class Journals (Input Guru Mapel & Validasi Wali Kelas)
  public addClassJournal(classId: string, item: Omit<ClassJournalItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const validationStatus = item.validationStatus || (item.submittedByRole === 'wali_kelas' ? 'Terverifikasi' : 'Menunggu Validasi');
    const newItem: ClassJournalItem = {
      ...item,
      id: `jrnl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId,
      submittedByRole: item.submittedByRole || 'guru_mapel',
      validationStatus
    };
    data.classJournals.unshift(newItem);
    this.saveClassData(classId, data);
    const notifMsg = validationStatus === 'Menunggu Validasi'
      ? `Jurnal KBM ${item.subjectName} telah diajukan dan menunggu validasi Wali Kelas.`
      : `Jurnal KBM ${item.subjectName} (${item.date}) berhasil disimpan.`;
    realtimeNotificationService.notifyActionSuccess('Jurnal KBM Dicatat', notifMsg);
  }

  public updateClassJournal(classId: string, item: ClassJournalItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.classJournals.findIndex(j => j.id === item.id);
    if (idx >= 0) {
      data.classJournals[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess(
        'Jurnal KBM Diperbarui',
        `Perubahan jurnal ${item.subjectName} (${item.date}) berhasil disimpan.`
      );
    }
  }

  public validateClassJournal(
    classId: string,
    journalId: string,
    status: 'Terverifikasi' | 'Perlu Revisi',
    validatedBy: string,
    notes?: string
  ): void {
    const data = this.getClassHomeroomData(classId);
    const journal = data.classJournals.find(j => j.id === journalId);
    if (journal) {
      journal.validationStatus = status;
      journal.validationDate = new Date().toISOString().split('T')[0];
      journal.validatedByWaliName = validatedBy;
      if (notes !== undefined) {
        journal.validationNotes = notes;
      }
      if (status === 'Terverifikasi') {
        journal.teacherSign = true;
      }
      this.saveClassData(classId, data);
      const title = status === 'Terverifikasi' ? 'Jurnal Terverifikasi' : 'Catatan Revisi Dikirim';
      const msg = status === 'Terverifikasi'
        ? `Jurnal ${journal.subjectName} telah divalidasi dan diparaf resmi oleh Wali Kelas (${validatedBy}).`
        : `Catatan perbaikan untuk jurnal ${journal.subjectName} telah dikirimkan ke guru mapel.`;
      realtimeNotificationService.notifyActionSuccess(title, msg);
    }
  }

  public deleteClassJournal(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.classJournals = data.classJournals.filter(j => j.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Agenda Dihapus', 'Catatan agenda kegiatan kelas telah dihapus.');
  }

  public getTeacherJournalsAcrossClasses(teacherNameOrId: string): Array<{ classId: string; className: string; journal: ClassJournalItem }> {
    const classIds = ['class_10_ipa1', 'class_10_ipa2', 'class_11_ipa1', 'class_12_ipa1'];
    const classLabels: Record<string, string> = {
      class_10_ipa1: 'XI APL (SMK dr. Soebandi)',
      class_10_ipa2: 'X APL',
      class_11_ipa1: 'XII APL',
      class_12_ipa1: 'X AKL'
    };

    const results: Array<{ classId: string; className: string; journal: ClassJournalItem }> = [];
    classIds.forEach(cId => {
      const d = this.getClassHomeroomData(cId);
      d.classJournals.forEach(j => {
        if (
          !teacherNameOrId ||
          j.teacherId === teacherNameOrId ||
          j.teacherName.toLowerCase().includes(teacherNameOrId.toLowerCase())
        ) {
          results.push({
            classId: cId,
            className: classLabels[cId] || cId,
            journal: j
          });
        }
      });
    });
    return results;
  }

  // 14) Mutations
  public addStudentMutation(classId: string, item: Omit<StudentMutationItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: StudentMutationItem = {
      ...item,
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.studentMutations.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Mutasi Siswa Dicatat', `Data siswa ${item.type.toLowerCase()} (${item.studentName}) berhasil dicatat.`);
  }

  public deleteStudentMutation(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.studentMutations = data.studentMutations.filter(m => m.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Mutasi Dihapus', 'Catatan mutasi siswa telah dihapus.');
  }

  // 15) Student Cases
  public addStudentCase(classId: string, item: Omit<StudentCaseItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: StudentCaseItem = {
      ...item,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.studentCases.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Kasus Siswa Dicatat', `Catatan kasus siswa untuk ${item.studentName} berhasil disimpan.`);
  }

  public updateStudentCase(classId: string, item: StudentCaseItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.studentCases.findIndex(c => c.id === item.id);
    if (idx >= 0) {
      data.studentCases[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Kasus Siswa Diperbarui', `Status tindak lanjut kasus ${item.studentName} berhasil disimpan.`);
    }
  }

  public deleteStudentCase(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.studentCases = data.studentCases.filter(c => c.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Kasus Siswa Dihapus', 'Catatan kasus khusus siswa telah dihapus.');
  }

  // 16) Achievements
  public addStudentAchievement(classId: string, item: Omit<StudentAchievementItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: StudentAchievementItem = {
      ...item,
      id: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.studentAchievements.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Prestasi Siswa Dicatat', `Prestasi "${item.achievementTitle}" (${item.studentName}) berhasil disimpan.`);
  }

  public deleteStudentAchievement(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.studentAchievements = data.studentAchievements.filter(a => a.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Prestasi Dihapus', 'Catatan piagam prestasi siswa telah dihapus.');
  }

  // 17) Home Visits
  public addHomeVisit(classId: string, item: Omit<HomeVisitItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    const newItem: HomeVisitItem = {
      ...item,
      id: `hv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId
    };
    data.homeVisits.unshift(newItem);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Home Visit Dicatat', `Laporan kunjungan rumah untuk ${item.studentName} berhasil disimpan.`);
  }

  public updateHomeVisit(classId: string, item: HomeVisitItem): void {
    const data = this.getClassHomeroomData(classId);
    const idx = data.homeVisits.findIndex(h => h.id === item.id);
    if (idx >= 0) {
      data.homeVisits[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Home Visit Diperbarui', `Laporan evaluasi home visit ${item.studentName} berhasil diperbarui.`);
    }
  }

  public deleteHomeVisit(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    data.homeVisits = data.homeVisits.filter(h => h.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Home Visit Dihapus', 'Catatan kunjungan rumah telah dihapus.');
  }

  // 18) Bulletin Board / Mading Kelas & Dokumentasi Administrasi
  public addBulletinBoardItem(classId: string, item: Omit<ClassBulletinBoardItem, 'id' | 'class_id'>): void {
    const data = this.getClassHomeroomData(classId);
    if (!data.classBulletinBoard) data.classBulletinBoard = [];
    const newItem: ClassBulletinBoardItem = {
      ...item,
      id: `bb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      class_id: classId,
      likesCount: item.likesCount ?? 0,
      commentsCount: item.commentsCount ?? 0
    };
    // Pinned items go on top
    if (newItem.isPinned) {
      data.classBulletinBoard.unshift(newItem);
    } else {
      // after pinned items
      const firstNonPinnedIndex = data.classBulletinBoard.findIndex(b => !b.isPinned);
      if (firstNonPinnedIndex === -1) {
        data.classBulletinBoard.push(newItem);
      } else {
        data.classBulletinBoard.splice(firstNonPinnedIndex, 0, newItem);
      }
    }
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Mading Diterbitkan', `Postingan "${item.title}" berhasil dipublikasikan di mading kelas.`);
  }

  public updateBulletinBoardItem(classId: string, item: ClassBulletinBoardItem): void {
    const data = this.getClassHomeroomData(classId);
    if (!data.classBulletinBoard) data.classBulletinBoard = [];
    const idx = data.classBulletinBoard.findIndex(b => b.id === item.id);
    if (idx >= 0) {
      data.classBulletinBoard[idx] = item;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Mading Diperbarui', `Perubahan postingan "${item.title}" berhasil disimpan.`);
    }
  }

  public deleteBulletinBoardItem(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    if (!data.classBulletinBoard) return;
    data.classBulletinBoard = data.classBulletinBoard.filter(b => b.id !== id);
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionInfo('Mading Dihapus', 'Kiriman mading kelas telah dihapus.');
  }

  public toggleLikeBulletinBoardItem(classId: string, id: string): void {
    const data = this.getClassHomeroomData(classId);
    if (!data.classBulletinBoard) return;
    const item = data.classBulletinBoard.find(b => b.id === id);
    if (item) {
      item.likesCount = (item.likesCount || 0) + 1;
      this.saveClassData(classId, data);
      realtimeNotificationService.notifyActionSuccess('Apresiasi Diterima', 'Terima kasih atas apresiasi suka Anda pada postingan mading ini.');
    }
  }

  public updateBulletinBoardItems(classId: string, items: ClassBulletinBoardItem[]): void {
    const data = this.getClassHomeroomData(classId);
    data.classBulletinBoard = items;
    this.saveClassData(classId, data);
    realtimeNotificationService.notifyActionSuccess('Mading Diperbarui', 'Data mading kelas berhasil disinkronkan.');
  }

  public resetClassData(classId: string): void {
    delete this.cache[classId];
    localStorage.removeItem(this.getStorageKey(classId));
    realtimeNotificationService.notifyActionWarning('Cache Dihapus', 'Data memori lokal kelas telah dibersihkan.');
  }
}
