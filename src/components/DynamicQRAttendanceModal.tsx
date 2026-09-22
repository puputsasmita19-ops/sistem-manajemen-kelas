import React, { useState, useEffect, useRef } from 'react';
import { DynamicQRAttendanceService } from '../services/dynamicQRAttendanceService';
import { DynamicQRSession, User } from '../types';
import Swal from 'sweetalert2';
import {
  QrCode,
  Clock,
  ShieldCheck,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  PlusCircle,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  Volume2,
  VolumeX,
  X,
  KeyRound,
  Download,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { navigationBackService } from '../services/navigationBackService';

interface DynamicQRAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  classNameTitle: string;
  subjectId: string;
  subjectNameTitle: string;
  selectedDate: string;
  studentsInClass: User[];
  onAttendanceUpdated?: () => void;
}

export const DynamicQRAttendanceModal: React.FC<DynamicQRAttendanceModalProps> = ({
  isOpen,
  onClose,
  classId,
  classNameTitle,
  subjectId,
  subjectNameTitle,
  selectedDate,
  studentsInClass,
  onAttendanceUpdated
}) => {
  const qrService = DynamicQRAttendanceService.getInstance();
  const [session, setSession] = useState<DynamicQRSession | null>(() =>
    qrService.getActiveSession(classId)
  );

  // Configuration options for new session
  const [selectedDuration, setSelectedDuration] = useState<number>(5); // default 5 menit
  const [customDuration, setCustomDuration] = useState<string>('');
  const [autoRotate, setAutoRotate] = useState<number>(0); // 0 = off, 15, 30
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Intercept tombol kembali perangkat Android untuk menutup modal proyektor QR
  useEffect(() => {
    if (!isOpen) return;
    const unregister = navigationBackService.registerHandler('dynamic_qr_attendance_modal', () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true;
      }
      onClose();
      return true;
    });
    return () => unregister();
  }, [isOpen, isFullscreen, onClose]);

  // Subscribe to dynamic QR session state
  useEffect(() => {
    const unsub = qrService.subscribe((active) => {
      if (active && active.classId === classId) {
        setSession(active);
      } else {
        setSession(null);
      }
    });
    return () => unsub();
  }, [classId]);

  // Regenerate QR Image whenever session updates
  useEffect(() => {
    let isMounted = true;
    if (session) {
      qrService.generateQRCodeDataUrl(session).then((url) => {
        if (isMounted) setQrDataUrl(url);
      });
    } else {
      setQrDataUrl('');
    }
    return () => {
      isMounted = false;
    };
  }, [session?.token, session?.rotateIndex, session?.sessionId]);

  // Realtime countdown ticker
  useEffect(() => {
    if (!session || session.status !== 'active') {
      setTimeLeftSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const now = new Date().getTime();
      const expire = new Date(session.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expire - now) / 1000));
      setTimeLeftSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt, session?.status]);

  // Polite audio chime on scan
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  const handleCreateSession = () => {
    const finalDuration = customDuration ? parseInt(customDuration, 10) || 5 : selectedDuration;
    const newSession = qrService.createSession({
      classId,
      classNameTitle,
      subjectId,
      subjectNameTitle,
      date: selectedDate,
      durationMinutes: finalDuration,
      autoRotateSeconds: autoRotate,
      createdBy: 'Guru Pengajar'
    });
    setSession(newSession);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'QR Code Dinamis Diterbitkan',
      text: `Berlaku selama ${finalDuration} menit hingga pukul ${new Date(newSession.expiresAt).toLocaleTimeString('id-ID')}`,
      timer: 3000,
      showConfirmButton: false
    });
  };

  const handleExtend = (minutes: number) => {
    const updated = qrService.extendSession(minutes);
    if (updated) {
      setSession(updated);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Masa Berlaku Ditambah +${minutes} Menit`,
        text: `Sekarang berlaku hingga pukul ${new Date(updated.expiresAt).toLocaleTimeString('id-ID')}`,
        timer: 2500,
        showConfirmButton: false
      });
    }
  };

  const handleRegenerateToken = () => {
    const updated = qrService.regenerateToken();
    if (updated) {
      setSession(updated);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Token QR Diregenerasi',
        text: 'Kode QR dan PIN OTP baru telah aktif.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleToggleLock = () => {
    if (!session) return;
    if (session.status === 'locked') {
      qrService.unlockSession();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Sesi QR Dibuka Kembali',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      qrService.lockSession();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Sesi QR Dikunci Sementara',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleCloseSession = () => {
    Swal.fire({
      title: 'Selesaikan Sesi QR Dinamis?',
      text: 'Masa berlaku QR code akan diakhiri dan presensi tidak dapat dipindai lagi menggunakan kode ini.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Akhiri Sesi',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        qrService.closeSession();
        if (onAttendanceUpdated) onAttendanceUpdated();
      }
    });
  };

  const handleSimulateStudentScan = (student: User) => {
    if (!session) return;
    const res = qrService.verifyAndRecordAttendance({
      scannedTextOrOtp: session.otpCode,
      studentId: student.id,
      studentName: student.nama,
      targetClassId: classId,
      method: 'Simulasi Proyektor'
    });

    if (res.success) {
      playChime();
      if (onAttendanceUpdated) onAttendanceUpdated();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `✅ Hadir: ${student.nama}`,
        text: 'Presensi tercatat dari simulasi scan QR Dinamis.',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memindai',
        text: res.message
      });
    }
  };

  const handleDownloadQRImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Presensi_${classNameTitle.replace(/\s+/g, '_')}_${selectedDate}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  const totalStudents = studentsInClass.length;
  const scannedCount = session?.scannedStudents.length || 0;
  const progressPercent = totalStudents > 0 ? Math.round((scannedCount / totalStudents) * 100) : 0;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSessionSeconds = (session?.validDurationMinutes || 5) * 60;
  const timeProgressPercent =
    totalSessionSeconds > 0 ? Math.min(100, Math.max(0, (timeLeftSeconds / totalSessionSeconds) * 100)) : 0;

  const isExpired = session?.status === 'expired' || timeLeftSeconds === 0;
  const isLocked = session?.status === 'locked';

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto transition-all ${
        isFullscreen ? 'p-0!' : ''
      }`}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white w-full flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? 'h-full w-full rounded-none border-none max-w-none'
            : 'max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* MODAL TOP HEADER */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  QR Code Presensi Dinamis Kelas
                </h3>
                {session && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${
                      isExpired
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isLocked
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {isExpired ? 'Kadaluarsa' : isLocked ? 'Terkunci' : 'Sesi Aktif'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelas: <strong className="text-slate-200">{classNameTitle}</strong> • Mapel:{' '}
                <strong className="text-slate-200">{subjectNameTitle}</strong> • Tanggal:{' '}
                <span className="text-blue-400 font-mono">{selectedDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-900/40 border-blue-700/60 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Suara Beep Notifikasi"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-xs font-bold border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Proyektor Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">
                {isFullscreen ? 'Kecilkan' : 'Proyektor'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 border border-slate-700 text-slate-400 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {!session ? (
            /* CONFIGURATOR VIEW (BUAT SESI BARU) */
            <div className="max-w-xl mx-auto py-4 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" /> Sistem Presensi Anti-Kecurangan
                </div>
                <h4 className="text-xl font-black text-white">Atur Masa Berlaku QR Code Kelas</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Tentukan durasi aktifnya kode QR di layar. Setelah masa berlaku habis, kode otomatis
                  terkunci sehingga mencegah siswa titip absen dari luar kelas.
                </p>
              </div>

              {/* DURATION PRESET BUTTONS */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Pilih Masa Berlaku QR Code:
                  </span>
                  <span className="text-blue-400 font-bold">
                    {customDuration ? `${customDuration} Menit` : `${selectedDuration} Menit`}
                  </span>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { min: 1, label: '1 Menit', desc: 'Kilat' },
                    { min: 3, label: '3 Menit', desc: 'Cepat' },
                    { min: 5, label: '5 Menit', desc: 'Standar' },
                    { min: 10, label: '10 Menit', desc: 'Fleksibel' },
                    { min: 15, label: '15 Menit', desc: 'Panjang' },
                    { min: 30, label: '30 Menit', desc: '1 Jam Mapel' }
                  ].map((d) => (
                    <button
                      key={d.min}
                      type="button"
                      onClick={() => {
                        setSelectedDuration(d.min);
                        setCustomDuration('');
                      }}
                      className={`p-3 rounded-2xl border text-center transition cursor-pointer relative ${
                        selectedDuration === d.min && !customDuration
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
                      }`}
                    >
                      {d.min === 5 && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-[9px] font-black uppercase tracking-wider text-slate-950 px-1.5 py-0.2 rounded-full shadow-xs">
                          Populer
                        </span>
                      )}
                      <div className="text-sm font-black">{d.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Custom duration input */}
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Atau durasi kustom:</span>
                  <div className="flex items-center gap-2 max-w-[140px]">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Contoh: 7"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-xs text-slate-400">Menit</span>
                  </div>
                </div>
              </div>

              {/* SECURITY OPTIONS */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Fitur Tambahan Anti-Screenshot (Auto-Rotate):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { val: 0, label: 'Nonaktif', sub: 'Token Statis selama durasi' },
                    { val: 15, label: 'Tiap 15 Detik', sub: 'Berganti sangat cepat' },
                    { val: 30, label: 'Tiap 30 Detik', sub: 'Anti-share foto WhatsApp' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setAutoRotate(opt.val)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        autoRotate === opt.val
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-white text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={handleCreateSession}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-600/20 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Terbitkan QR Code Dinamis ({customDuration || selectedDuration} Menit)</span>
              </button>
            </div>
          ) : (
            /* ACTIVE PROJECTOR & LIVE ATTENDANCE VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT / CENTER: QR HERO CARD & COUNTDOWN (COL 7) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4 bg-slate-950/80 rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
                {/* Visual Security Radar Halo */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
                    isExpired
                      ? 'bg-rose-950/20'
                      : isLocked
                      ? 'bg-amber-950/20'
                      : 'bg-gradient-to-b from-blue-500/5 to-indigo-500/10'
                  }`}
                ></div>

                {/* COUNTDOWN TIMER BADGE */}
                <div className="w-full flex items-center justify-between gap-2 z-10">
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`w-4 h-4 ${
                        isExpired
                          ? 'text-rose-400'
                          : timeLeftSeconds < 60
                          ? 'text-amber-400 animate-bounce'
                          : 'text-emerald-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-300">Waktu Tersisa:</span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-2xl sm:text-3xl font-black font-mono tracking-wider ${
                        isExpired
                          ? 'text-rose-400'
                          : timeLeftSeconds < 60
                          ? 'text-amber-400 animate-pulse'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* COUNTDOWN PROGRESS BAR */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden z-10">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isExpired
                        ? 'bg-rose-500 w-0'
                        : timeLeftSeconds < 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${isExpired ? 0 : timeProgressPercent}%` }}
                  ></div>
                </div>

                {/* THE QR CODE DISPLAY BOX */}
                <div className="relative p-4 bg-white rounded-3xl shadow-2xl border-4 border-slate-700/50 mt-2 z-10 group">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Presensi Dinamis"
                      className={`w-64 h-64 sm:w-72 sm:h-72 object-contain transition duration-300 ${
                        isExpired || isLocked ? 'filter blur-xs grayscale opacity-40' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center bg-slate-100 text-slate-400">
                      <QrCode className="w-16 h-16 animate-spin" />
                    </div>
                  )}

                  {/* OVERLAY IF EXPIRED OR LOCKED */}
                  {(isExpired || isLocked) && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-3 z-20">
                      {isExpired ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7" />
                          </div>
                          <div className="text-sm font-black text-rose-300">Masa Berlaku Telah Habis</div>
                          <p className="text-[11px] text-slate-300 max-w-xs">
                            QR Code otomatis terkunci. Klik tombol di bawah untuk menambah waktu.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleExtend(5)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Perpanjang +5 Menit</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Lock className="w-7 h-7" />
                          </div>
                          <div className="text-sm font-black text-amber-300">Sesi Presensi Dikunci</div>
                          <p className="text-[11px] text-slate-300 max-w-xs">
                            Siswa tidak dapat memindai sementara.
                          </p>
                          <button
                            type="button"
                            onClick={handleToggleLock}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Buka Kunci Presensi</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 6-DIGIT BACKUP PIN OTP */}
                <div className="z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-400">Kode PIN Cadangan Siswa:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black tracking-widest text-amber-300 bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-800/80">
                      {session.otpCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateToken}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Ganti Kode Baru"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* CONTROLS TOOLBAR */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 z-10">
                  <button
                    type="button"
                    onClick={() => handleExtend(5)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+5 Menit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExtend(1)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+1 Menit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isLocked
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isLocked ? 'Buka Kunci' : 'Kunci'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQRImage}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Unduh PNG</span>
                  </button>
                </div>
              </div>

              {/* RIGHT: REALTIME ATTENDEES LIST & SIMULATION (COL 5) */}
              <div className="lg:col-span-5 space-y-4">
                {/* STATS HERO CARD */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-200">
                      <Users className="w-4 h-4" />
                      <span>Kehadiran Terverifikasi</span>
                    </div>
                    <span className="text-xs font-black text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-white">
                      {scannedCount} <span className="text-sm font-normal text-slate-300">/ {totalStudents} Siswa</span>
                    </div>
                    <span className="text-[11px] text-blue-300">
                      {totalStudents - scannedCount} Belum Presensi
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* LIVE SCANNED FEED TABLE */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Daftar Masuk Realtime
                    </span>
                    <span className="text-[10px] text-slate-400">Terbaru di atas</span>
                  </div>

                  <div className="divide-y divide-slate-800/80 max-h-[220px] overflow-y-auto pr-1">
                    {session.scannedStudents.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        Menunggu siswa memindai kode QR di layar proyektor...
                      </div>
                    ) : (
                      session.scannedStudents.map((st, i) => (
                        <div key={i} className="py-2 flex items-center justify-between text-xs animate-fadeIn">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {i + 1}
                            </div>
                            <span className="font-bold text-slate-200 truncate">{st.nama}</span>
                          </div>
                          <span className="font-mono text-[11px] text-emerald-400 shrink-0 font-semibold">
                            {st.scannedAt}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SIMULASI CEPAT UJI SCAN (UNTUK GURU/PENGUJI) */}
                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" /> Uji Coba Scan Cepat (Simulasi Siswa)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Klik nama siswa di bawah untuk menguji respons real-time layar:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                    {studentsInClass.slice(0, 10).map((std) => {
                      const already = session.scannedStudents.some((s) => s.studentId === std.id);
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => handleSimulateStudentScan(std)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                            already
                              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          {already && <CheckCircle2 className="w-2.5 h-2.5" />}
                          <span>{std.nama.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BOTTOM ACTION: RESET / END SESSION */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateSession}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Buat Ulang Sesi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseSession}
                    className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold rounded-xl border border-rose-700/60 transition cursor-pointer"
                  >
                    Selesaikan Sesi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
