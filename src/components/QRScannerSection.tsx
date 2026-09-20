import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { User } from '../types';
import Swal from 'sweetalert2';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  Upload,
  Sparkles,
  Printer,
  Volume2,
  VolumeX,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { navigationBackService } from '../services/navigationBackService';

interface ScannedLog {
  studentId: string;
  nama: string;
  time: string;
  method: 'Kamera Live' | 'Unggah Gambar' | 'Simulasi Kartu';
}

interface QRScannerSectionProps {
  classId: string;
  classNameTitle: string;
  students: User[];
  onAttendanceMarked: (studentId: string, nama: string) => void;
  onClose?: () => void;
}

export const QRScannerSection: React.FC<QRScannerSectionProps> = ({
  classId,
  classNameTitle,
  students,
  onAttendanceMarked,
  onClose
}) => {
  // Intercept tombol kembali perangkat Android untuk membatalkan/menutup scanner
  useEffect(() => {
    if (!onClose) return;
    const unregister = navigationBackService.registerHandler('qr_scanner_section', () => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [onClose]);
  const [activeSubTab, setActiveSubTab] = useState<'camera' | 'upload' | 'simulate' | 'cards'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedLogs, setScannedLogs] = useState<ScannedLog[]>([]);
  const [lastScannedStudent, setLastScannedStudent] = useState<{ id: string; nama: string; time: string } | null>(null);
  const [studentQRCodes, setStudentQRCodes] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Play synthesized polite chime on successful scan
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio feedback error', e);
    }
  };

  // Generate real QR code image URLs for students in this class
  useEffect(() => {
    students.forEach(async (std) => {
      try {
        const qrPayload = JSON.stringify({
          app: 'SIMAK',
          type: 'STUDENT_ATTENDANCE',
          studentId: std.id,
          nama: std.nama,
          classId
        });
        const url = await QRCode.toDataURL(qrPayload, {
          width: 250,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        });
        setStudentQRCodes(prev => ({ ...prev, [std.id]: url }));
      } catch (err) {
        console.error('Failed generating QR code for', std.nama, err);
      }
    });
  }, [students, classId]);

  // Process decoded QR text
  const handleDecodedText = (text: string, method: 'Kamera Live' | 'Unggah Gambar' | 'Simulasi Kartu') => {
    let studentIdToFind = text.trim();

    // Check if JSON payload
    try {
      if (text.startsWith('{') && text.endsWith('}')) {
        const parsed = JSON.parse(text);
        if (parsed.studentId) {
          studentIdToFind = parsed.studentId;
        }
      }
    } catch (e) {
      // plain text ID
    }

    const matched = students.find(
      s => s.id === studentIdToFind || s.nama.toLowerCase() === studentIdToFind.toLowerCase()
    );

    if (!matched) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'QR Code Tidak Dikenal',
        text: `Data "${studentIdToFind}" bukan siswa di kelas ini.`,
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    playScanBeep();

    // Update UI state
    setLastScannedStudent({
      id: matched.id,
      nama: matched.nama,
      time: timeStr
    });

    setScannedLogs(prev => [
      {
        studentId: matched.id,
        nama: matched.nama,
        time: timeStr,
        method
      },
      ...prev.filter(log => log.studentId !== matched.id)
    ]);

    // Invoke parent callback to mark presence in database
    onAttendanceMarked(matched.id, matched.nama);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `✅ Hadir: ${matched.nama}`,
      text: `Presensi berhasil dicatat pukul ${timeStr} WIB`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Camera scanner routine using requestAnimationFrame and jsQR
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        isScanningRef.current = true;
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat menggunakan tab "Simulasi Kartu" atau "Unggah Gambar QR".'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const scanFrame = () => {
    if (!isScanningRef.current) return;

    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleDecodedText(code.data, 'Kamera Live');
            // Pause momentarily before next scan
            isScanningRef.current = false;
            setTimeout(() => {
              isScanningRef.current = true;
              scanFrame();
            }, 2500);
            return;
          }
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (activeSubTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeSubTab]);

  // Handle Image File Upload Decode
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecodedText(code.data, 'Unggah Gambar');
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'QR Code Tidak Terbaca',
            text: 'Pastikan foto QR code siswa jelas dan memiliki pencahayaan cukup.'
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-md space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Pemindai QR Code Presensi Otomatis
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              Kelas: <strong className="text-slate-900 dark:text-white">{classNameTitle}</strong> • Dekode langsung dari Kamera, Foto QR, atau Kartu Pelajar Digital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
            title="Efek Suara Beep"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Suara Aktif' : 'Mute'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              id="btn-close-qr-scanner-header"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-600"
              title="Tutup Pemindai QR & Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali / Batal</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('camera')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'camera'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          Kamera Live Scanner
        </button>

        <button
          onClick={() => setActiveSubTab('simulate')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'simulate'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Uji Coba Scan Cepat (Simulasi)
        </button>

        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'upload'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          Unggah Foto QR Code
        </button>

        <button
          onClick={() => setActiveSubTab('cards')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'cards'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4 text-purple-600" />
          Cetak Kartu QR Siswa
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Viewport (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB 1: REALTIME CAMERA */}
          {activeSubTab === 'camera' && (
            <div className="bg-slate-950 rounded-3xl p-4 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[340px] shadow-inner">
              <video
                ref={videoRef}
                className="w-full max-h-[320px] object-cover rounded-2xl"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>

                    {/* Animated Scanning Line */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#EF4444] animate-bounce"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 mt-4 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs">
                    Arahkan QR Code Kartu Pelajar ke dalam kotak
                  </span>
                </div>
              )}

              {/* Camera Error / Fallback message */}
              {cameraError && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-200">Kamera Tidak Tersedia</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">{cameraError}</p>
                  <button
                    onClick={() => setActiveSubTab('simulate')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Buka Tab Simulasi Scan
                  </button>
                </div>
              )}

              {/* Camera Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 w-full">
                {onClose && (
                  <button
                    type="button"
                    id="btn-batal-kamera-qr"
                    onClick={onClose}
                    className="w-full sm:w-auto py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Batal / Tutup Kamera</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className="w-full sm:w-auto py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cameraActive ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>{cameraActive ? 'Jeda Kamera' : 'Aktifkan Kamera'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UJI COBA SCAN CEPAT (SIMULASI) */}
          {activeSubTab === 'simulate' && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Simulasi Scan Barcode / Kartu Siswa
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                  Klik tombol <strong className="text-slate-900 dark:text-white">"Tap Scan Presensi"</strong> pada salah satu kartu siswa untuk menguji alur pencatatan kehadiran otomatis:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {students.map((std) => (
                  <div
                    key={std.id}
                    className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-500 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        {std.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{std.nama}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-semibold">{std.id}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDecodedText(std.id, 'Simulasi Kartu')}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg shrink-0 transition flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Scan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD GAMBAR QR CODE */}
          {activeSubTab === 'upload' && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Pilih Berkas Foto / Tangkapan Layar QR Code
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto font-medium">
                  Sistem akan mendeteksi dan mendekode data identitas siswa dari gambar secara instan.
                </p>
              </div>

              <label className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition">
                Pilih Berkas Gambar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 4: CETAK KARTU QR SISWA */}
          {activeSubTab === 'cards' && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Kartu QR Pelajar Digital Kelas {classNameTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Kartu resmi yang dapat dibagikan kepada siswa untuk presensi harian di gerbang atau kelas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                {students.map((std) => (
                  <div
                    key={std.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs flex items-center gap-4 relative overflow-hidden"
                  >
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0">
                      {studentQRCodes[std.id] ? (
                        <img
                          src={studentQRCodes[std.id]}
                          alt={`QR ${std.nama}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {classNameTitle}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate mt-1">{std.nama}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-0.5 font-semibold">ID: {std.id}</p>
                      <button
                        type="button"
                        onClick={() => handleDecodedText(std.id, 'Simulasi Kartu')}
                        className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Uji Scan &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Attendance Log & Last Scanned Card (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Scanned Highlight Banner */}
          {lastScannedStudent ? (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-md flex items-center gap-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  Presensi Terakhir Berhasil
                </span>
                <h4 className="text-base font-black truncate">{lastScannedStudent.nama}</h4>
                <div className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pukul {lastScannedStudent.time} WIB • Status Hadir (H)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-2">Menunggu Pemindaian QR</div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                Arahkan kartu ke kamera atau gunakan tab uji coba scan.
              </p>
            </div>
          )}

          {/* Realtime Scan Log Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Log Kehadiran QR Hari Ini
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                {scannedLogs.length} Terpindai
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[260px] overflow-y-auto mt-2">
              {scannedLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Belum ada siswa yang melakukan pemindaian hari ini.
                </div>
              ) : (
                scannedLogs.map((log, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{log.nama}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-slate-800 dark:text-slate-200 font-bold">{log.time}</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">{log.method}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
