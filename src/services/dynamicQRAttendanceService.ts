import QRCode from 'qrcode';
import { DatabaseService } from './databaseService';
import { DynamicQRSession, DynamicQRAttendee, AttendanceStatus } from '../types';

const STORAGE_ACTIVE_QR_KEY = 'SIMAK_ACTIVE_DYNAMIC_QR_SESSION';

export class DynamicQRAttendanceService {
  private static instance: DynamicQRAttendanceService;
  private dbService = DatabaseService.getInstance();
  private subscribers: Array<(session: DynamicQRSession | null) => void> = [];
  private activeSession: DynamicQRSession | null = null;
  private timerInterval: any = null;

  private constructor() {
    this.loadInitialSession();
    this.startSessionWatcher();
  }

  public static getInstance(): DynamicQRAttendanceService {
    if (!DynamicQRAttendanceService.instance) {
      DynamicQRAttendanceService.instance = new DynamicQRAttendanceService();
    }
    return DynamicQRAttendanceService.instance;
  }

  private loadInitialSession() {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_QR_KEY);
      if (saved) {
        const parsed: DynamicQRSession = JSON.parse(saved);
        // Check if still within expiration or recent
        this.activeSession = parsed;
      }
    } catch (e) {
      console.warn('Failed loading active dynamic QR session', e);
    }
  }

  private startSessionWatcher() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.activeSession && this.activeSession.status === 'active') {
        const now = new Date().getTime();
        const expireTime = new Date(this.activeSession.expiresAt).getTime();
        
        if (now >= expireTime) {
          this.activeSession.status = 'expired';
          this.saveSessionState();
          this.notifySubscribers();
        } else if (
          this.activeSession.autoRotateSeconds > 0 &&
          Math.floor((now - new Date(this.activeSession.createdAt).getTime()) / 1000) %
            this.activeSession.autoRotateSeconds === 0
        ) {
          // Auto rotate token for extra anti-screenshot protection
          this.rotateTokenInternal();
        }
      }
    }, 1000);
  }

  public subscribe(callback: (session: DynamicQRSession | null) => void): () => void {
    this.subscribers.push(callback);
    callback(this.activeSession);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.activeSession ? { ...this.activeSession } : null);
      } catch (e) {}
    });
  }

  private saveSessionState() {
    if (this.activeSession) {
      localStorage.setItem(STORAGE_ACTIVE_QR_KEY, JSON.stringify(this.activeSession));
      const raw = this.dbService.getRawSnapshot();
      if (!raw.dynamic_qr_sessions) raw.dynamic_qr_sessions = {};
      raw.dynamic_qr_sessions[this.activeSession.sessionId] = { ...this.activeSession };
      this.dbService.saveToStorage();
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_QR_KEY);
    }
  }

  /**
   * Membuat Sesi QR Code Dinamis Baru dengan Masa Berlaku yang Dapat Disesuaikan (1-30 menit)
   */
  public createSession(params: {
    classId: string;
    classNameTitle: string;
    subjectId: string;
    subjectNameTitle: string;
    date: string;
    durationMinutes: number; // e.g. 1, 3, 5, 10, 15, 30
    autoRotateSeconds?: number; // 0, 15, 30
    createdBy?: string;
  }): DynamicQRSession {
    const now = new Date();
    const durationMin = Math.max(1, Math.min(120, params.durationMinutes || 5));
    const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000);
    const sessionId = `dqrs_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `SMK-${params.classId.toUpperCase()}-${randomHex}`;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newSession: DynamicQRSession = {
      sessionId,
      classId: params.classId,
      subjectId: params.subjectId,
      classNameTitle: params.classNameTitle,
      subjectNameTitle: params.subjectNameTitle,
      date: params.date,
      validDurationMinutes: durationMin,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      token,
      otpCode,
      autoRotateSeconds: params.autoRotateSeconds || 0,
      rotateIndex: 1,
      status: 'active',
      createdBy: params.createdBy || 'Guru Pengajar',
      scannedStudents: []
    };

    this.activeSession = newSession;
    this.saveSessionState();
    this.notifySubscribers();

    this.dbService.logActivity(
      'qr_session_create',
      'Pembuatan QR Dinamis Presensi',
      `Sesi QR Code Dinamis dibuat untuk ${params.classNameTitle} (${durationMin} Menit). Masa berlaku s/d ${expiresAt.toLocaleTimeString('id-ID')} WIB.`,
      'dynamic_qr_sessions',
      { sessionId, durationMin, classId: params.classId, subjectId: params.subjectId }
    );

    return newSession;
  }

  public getActiveSession(classId?: string): DynamicQRSession | null {
    if (!this.activeSession) return null;
    if (classId && this.activeSession.classId !== classId) return null;
    return this.activeSession;
  }

  /**
   * Memperpanjang Masa Berlaku QR Code Dinamis
   */
  public extendSession(addMinutes: number = 5): DynamicQRSession | null {
    if (!this.activeSession) return null;

    const currentExpire = new Date(this.activeSession.expiresAt).getTime();
    const now = new Date().getTime();
    const baseTime = currentExpire > now ? currentExpire : now;
    const newExpiresAt = new Date(baseTime + addMinutes * 60 * 1000);

    this.activeSession.expiresAt = newExpiresAt.toISOString();
    this.activeSession.validDurationMinutes += addMinutes;
    this.activeSession.status = 'active';

    this.saveSessionState();
    this.notifySubscribers();

    this.dbService.logActivity(
      'attendance_input',
      'Perpanjangan Masa Berlaku QR Presensi',
      `Masa berlaku QR Code kelas diperpanjang +${addMinutes} menit hingga ${newExpiresAt.toLocaleTimeString('id-ID')}.`,
      'dynamic_qr_sessions',
      { sessionId: this.activeSession.sessionId, addMinutes }
    );

    return this.activeSession;
  }

  /**
   * Regenerasi token baru secara manual untuk mencegah kebocoran
   */
  public regenerateToken(): DynamicQRSession | null {
    if (!this.activeSession) return null;
    this.rotateTokenInternal();
    return this.activeSession;
  }

  private rotateTokenInternal() {
    if (!this.activeSession) return;
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.activeSession.token = `SMK-${this.activeSession.classId.toUpperCase()}-${randomHex}`;
    this.activeSession.otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.activeSession.rotateIndex += 1;

    this.saveSessionState();
    this.notifySubscribers();
  }

  /**
   * Kunci sesi presensi seketika
   */
  public lockSession(): void {
    if (!this.activeSession) return;
    this.activeSession.status = 'locked';
    this.saveSessionState();
    this.notifySubscribers();
  }

  /**
   * Buka kembali sesi yang terkunci
   */
  public unlockSession(): void {
    if (!this.activeSession) return;
    const now = new Date().getTime();
    const expireTime = new Date(this.activeSession.expiresAt).getTime();
    if (now >= expireTime) {
      // jika sudah lewat waktu, tambahkan minimal 3 menit
      this.activeSession.expiresAt = new Date(now + 3 * 60 * 1000).toISOString();
    }
    this.activeSession.status = 'active';
    this.saveSessionState();
    this.notifySubscribers();
  }

  /**
   * Selesaikan / Tutup Sesi
   */
  public closeSession(): void {
    if (!this.activeSession) return;
    this.activeSession.status = 'expired';
    this.saveSessionState();
    this.notifySubscribers();
  }

  /**
   * Generate payload string for QR Code encoding
   */
  public getPayloadString(session: DynamicQRSession): string {
    return JSON.stringify({
      app: 'SIMAK_SECURE_QR',
      type: 'DYNAMIC_CLASS_ATTENDANCE',
      sid: session.sessionId,
      cid: session.classId,
      sub: session.subjectId,
      dt: session.date,
      tok: session.token,
      otp: session.otpCode,
      exp: session.expiresAt,
      rot: session.rotateIndex
    });
  }

  /**
   * Generate high-quality QR Code Data URL
   */
  public async generateQRCodeDataUrl(session: DynamicQRSession): Promise<string> {
    const payload = this.getPayloadString(session);
    return await QRCode.toDataURL(payload, {
      width: 480,
      margin: 1.5,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#020617', // Slate 950
        light: '#FFFFFF'
      }
    });
  }

  /**
   * Verifikasi dan catat presensi siswa dari scan QR dinamis atau input PIN OTP
   */
  public verifyAndRecordAttendance(params: {
    scannedTextOrOtp: string;
    studentId: string;
    studentName?: string;
    targetClassId?: string;
    method?: string;
  }): {
    success: boolean;
    message: string;
    isExpired?: boolean;
    isDuplicate?: boolean;
    session?: DynamicQRSession;
  } {
    const { scannedTextOrOtp, studentId, targetClassId, method = 'Kamera Live QR Dinamis' } = params;
    const cleanInput = (scannedTextOrOtp || '').trim();

    if (!this.activeSession) {
      return {
        success: false,
        message: 'Tidak ada sesi QR Code dinamis yang sedang aktif di kelas saat ini.'
      };
    }

    const session = this.activeSession;

    // Check Class Matching
    if (targetClassId && session.classId !== targetClassId) {
      return {
        success: false,
        message: `Sesi QR ini milik kelas ${session.classNameTitle}, bukan kelas yang Anda pilih.`
      };
    }

    // Check Session Expiration
    const now = new Date().getTime();
    const expireTime = new Date(session.expiresAt).getTime();

    if (session.status === 'locked') {
      return {
        success: false,
        message: 'Sesi presensi QR dinamis sedang DIKUNCI oleh guru pengajar.',
        isExpired: true
      };
    }

    if (now > expireTime || session.status === 'expired') {
      const expiredAtStr = new Date(session.expiresAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return {
        success: false,
        message: `Masa berlaku QR Code telah HABIS pada pukul ${expiredAtStr} WIB. Silakan minta guru untuk memperpanjang waktu presensi.`,
        isExpired: true
      };
    }

    // Match Token / OTP / JSON
    let isMatched = false;

    // Case 1: 6-digit OTP Pin
    if (cleanInput === session.otpCode) {
      isMatched = true;
    }
    // Case 2: Exact Token String
    else if (cleanInput === session.token) {
      isMatched = true;
    }
    // Case 3: JSON Payload
    else {
      try {
        if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
          const parsed = JSON.parse(cleanInput);
          if (
            (parsed.sid === session.sessionId || parsed.sessionId === session.sessionId) &&
            (parsed.tok === session.token || parsed.token === session.token || parsed.otp === session.otpCode)
          ) {
            isMatched = true;
          }
        }
      } catch (e) {
        // not JSON
      }
    }

    if (!isMatched) {
      return {
        success: false,
        message: 'Kode QR tidak valid atau token keamanan telah diperbarui oleh sistem (Anti-Screenshot).'
      };
    }

    // Resolve Student Name if not provided
    const studentsInClass = this.dbService.getStudentsInClass(session.classId);
    const matchedStudent = studentsInClass.find((s) => s.id === studentId);
    const resolvedName = params.studentName || matchedStudent?.nama || studentId;

    if (!matchedStudent && targetClassId) {
      return {
        success: false,
        message: `Siswa ${resolvedName} (${studentId}) bukan anggota kelas ${session.classNameTitle}.`
      };
    }

    // Check Duplicate Scan in this session
    const alreadyScanned = session.scannedStudents.some((st) => st.studentId === studentId);

    const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    if (!alreadyScanned) {
      const attendee: DynamicQRAttendee = {
        studentId,
        nama: resolvedName,
        scannedAt: nowTimeStr,
        method
      };
      session.scannedStudents.unshift(attendee);
    }

    // Record Hadir (H) in database
    this.dbService.saveBulkAttendance(session.classId, session.subjectId, session.date, [
      { studentId, status: 'H' as AttendanceStatus }
    ]);

    // Log Activity for Audit Trail & Admin Activity Log Monitoring
    this.dbService.logActivity(
      'qr_attendance_scan',
      'Scan QR Code Presensi Siswa',
      `Siswa ${resolvedName} (${studentId}) berhasil melakukan presensi QR Code untuk kelas ${session.classNameTitle} (${session.subjectNameTitle || 'Presensi Harian'}) pada ${nowTimeStr} WIB. Status: Hadir (H). Metode: ${method}.`,
      `att_${session.classId}_${session.date}_${studentId}`,
      {
        studentId,
        studentName: resolvedName,
        classId: session.classId,
        className: session.classNameTitle,
        subjectId: session.subjectId,
        subjectName: session.subjectNameTitle,
        date: session.date,
        scannedAt: nowTimeStr,
        sessionId: session.sessionId,
        method,
        status: 'H'
      },
      {
        id: studentId,
        nama: resolvedName,
        role: 'siswa'
      }
    );

    this.saveSessionState();
    this.notifySubscribers();

    return {
      success: true,
      message: `Presensi berhasil diverifikasi! ${resolvedName} tercatat HADIR pukul ${nowTimeStr} WIB.`,
      isDuplicate: alreadyScanned,
      session
    };
  }
}
