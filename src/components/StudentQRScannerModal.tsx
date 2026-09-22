import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { DynamicQRAttendanceService } from '../services/dynamicQRAttendanceService';
import { User } from '../types';
import Swal from 'sweetalert2';
import {
  Camera,
  QrCode,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { navigationBackService } from '../services/navigationBackService';

interface StudentQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
}

export const StudentQRScannerModal: React.FC<StudentQRScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const qrService = DynamicQRAttendanceService.getInstance();
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  const [pinCode, setPinCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Intercept tombol kembali perangkat Android untuk menutup modal pemindai siswa
  useEffect(() => {
    if (!isOpen) return;
    const unregister = navigationBackService.registerHandler('student_qr_scanner_modal', () => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [isOpen, onClose]);

  const handleProcessScan = (scannedText: string, method: string) => {
    const res = qrService.verifyAndRecordAttendance({
      scannedTextOrOtp: scannedText,
      studentId: currentUser.id,
      studentName: currentUser.nama,
      method: `Siswa (${method})`
    });

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Presensi Sukses!',
        text: res.message,
        timer: 3000,
        showConfirmButton: true,
        confirmButtonText: 'Bagus, Mengerti',
        confirmButtonColor: '#2563eb'
      });
      onSuccess();
      onClose();
    } else {
      Swal.fire({
        icon: res.isExpired ? 'warning' : 'error',
        title: res.isExpired ? 'QR Code Kadaluarsa' : 'Presensi Gagal',
        text: res.message,
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    handleProcessScan(pinCode.trim(), 'Kode PIN Manual');
  };

  // Camera stream handlers
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
    } catch (err) {
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan opsi Kode PIN.');
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
      stream.getTracks().forEach((track) => track.stop());
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
            isScanningRef.current = false;
            handleProcessScan(code.data, 'Kamera Live');
            return;
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Pindai QR Presensi Guru di Kelas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arahkan kamera ke layar proyektor / papan tulis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Pemindai</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Input Kode PIN</span>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          {activeTab === 'camera' ? (
            <div className="space-y-4">
              <div className="bg-black rounded-2xl overflow-hidden relative min-h-[260px] flex items-center justify-center">
                <video ref={videoRef} className="w-full max-h-[280px] object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400 rounded-2xl relative shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_6px_#EF4444] animate-bounce"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 mt-3 bg-slate-950/80 px-2.5 py-0.5 rounded-full">
                      Posisikan QR Proyektor di dalam kotak
                    </span>
                  </div>
                )}

                {cameraError && (
                  <div className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <div className="text-xs text-slate-300">{cameraError}</div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pin')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Beralih ke Input PIN
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Pastikan masa berlaku QR guru belum habis.</span>
                </span>
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{cameraActive ? 'Jeda' : 'Ulang Kamera'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Masukkan 6-Digit PIN Sesi Presensi
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kode PIN tertera di bawah kode QR pada layar proyektor kelas guru.
                </p>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  className="w-48 text-center text-2xl font-mono font-black tracking-widest bg-slate-50 dark:bg-slate-800 border-2 border-blue-500 rounded-2xl py-3 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={pinCode.length < 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verifikasi Presensi Sekarang</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
