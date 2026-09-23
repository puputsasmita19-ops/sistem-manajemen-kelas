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
  Sparkles,
  Upload,
  SwitchCamera,
  HelpCircle,
  FileImage
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
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'pin'>('camera');
  const [pinCode, setPinCode] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    // Stop scanning once detected
    isScanningRef.current = false;

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
      }).then(() => {
        // Resume scan if modal is still open
        if (isOpen && activeTab === 'camera') {
          isScanningRef.current = true;
          scanFrame();
        }
      });
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    handleProcessScan(pinCode.trim(), 'Kode PIN Manual');
  };

  // Helper untuk mendapatkan MediaStream dengan fallback multi-level yang sangat aman
  const acquireCameraStream = async (targetFacing: 'environment' | 'user'): Promise<MediaStream> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('BROWSER_UNSUPPORTED');
    }

    // Attempt 1: Target facing mode with flexible ideal dimensions
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 }
        },
        audio: false
      });
    } catch (err1: any) {
      console.warn('Camera Attempt 1 failed:', err1?.name || err1);
    }

    // Attempt 2: Opposite facing mode with ideal constraint
    try {
      const fallbackFacing = targetFacing === 'environment' ? 'user' : 'environment';
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: fallbackFacing }
        },
        audio: false
      });
    } catch (err2: any) {
      console.warn('Camera Attempt 2 failed:', err2?.name || err2);
    }

    // Attempt 3: Generic unconstrained video
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    } catch (err3: any) {
      console.warn('Camera Attempt 3 failed:', err3?.name || err3);
    }

    // Attempt 4: Enumerate available video inputs and pick the first available
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      if (videoInputs.length > 0) {
        return await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: videoInputs[0].deviceId } },
          audio: false
        });
      }
    } catch (err4: any) {
      console.warn('Camera Attempt 4 failed:', err4?.name || err4);
    }

    throw new Error('ALL_ATTEMPTS_FAILED');
  };

  // Start Camera handler
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    try {
      const stream = await acquireCameraStream(facingMode);
      activeStreamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        // Wait for video metadata to be loaded before attempting to play
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.onloadedmetadata = () => resolve();
            // Fallback timeout in case onloadedmetadata doesn't fire promptly
            setTimeout(resolve, 800);
          }
        });

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }

        setCameraActive(true);
        setCameraLoading(false);
        isScanningRef.current = true;
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraActive(false);
      setCameraLoading(false);

      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Izin kamera diblokir oleh browser. Klik ikon gembok di bilah tautan browser Anda untuk memberikan izin kamera, atau gunakan opsi Input PIN di atas.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError(
          'Perangkat kamera tidak ditemukan pada perangkat ini. Silakan gunakan opsi Kode PIN atau Unggah Gambar.'
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError(
          'Kamera sedang dipakai oleh aplikasi lain (seperti Zoom, Meet, atau aplikasi kamera). Tutup aplikasi lain lalu coba lagi.'
        );
      } else if (err?.message === 'BROWSER_UNSUPPORTED') {
        setCameraError(
          'Browser Anda membatasi akses kamera karena tidak menggunakan protokol HTTPS atau berada di browser tanpa izin kamera. Gunakan Kode PIN presensi.'
        );
      } else {
        setCameraError(
          'Kamera tidak dapat diakses saat ini. Anda dapat mencoba mengganti kamera, mengunggah gambar QR, atau memasukkan Kode PIN 6 digit.'
        );
      }
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const scanFrame = () => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });

            if (code && code.data && code.data.trim().length > 0) {
              isScanningRef.current = false;
              handleProcessScan(code.data.trim(), 'Kamera Live');
              return;
            }
          } catch (e) {
            // Ignore temporary canvas read glitches
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Decode QR code from an uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          handleProcessScan(code.data.trim(), 'Unggah Foto QR');
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'QR Code Tidak Terdeteksi',
            text: 'Pastikan foto QR code terlihat jelas, terang, dan tidak buram. Anda juga dapat menggunakan opsi Input Kode PIN.',
            confirmButtonColor: '#2563eb'
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
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
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto transition-all">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Pindai QR Presensi Guru di Kelas
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Arahkan kamera ke layar proyektor / papan tulis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/80 p-1.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Live</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Kode PIN</span>
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6">
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* VIEWFINDER CONTAINER */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden relative min-h-[280px] sm:min-h-[300px] flex items-center justify-center border border-slate-800 shadow-inner">
                <video
                  ref={videoRef}
                  className={`w-full max-h-[300px] object-cover transition-opacity duration-300 ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* LOADING STATE */}
                {cameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white space-y-3 z-10">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-300">Menghubungkan ke sensor kamera...</span>
                  </div>
                )}

                {/* SCANNER OVERLAY BOX */}
                {cameraActive && !cameraLoading && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-400/90 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#EF4444] animate-bounce"></div>
                    </div>
                    <span className="text-[11px] font-bold text-white mt-3 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 shadow-md">
                      Posisikan QR Proyektor di dalam kotak
                    </span>
                  </div>
                )}

                {/* CAMERA ERROR & RECOVERY VIEW */}
                {cameraError && !cameraLoading && (
                  <div className="p-6 text-center space-y-3 max-w-md mx-auto z-10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-white">Kendala Akses Kamera</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                        <span>Ganti Kamera ({facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('pin')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Gunakan Kode PIN (6 Digit)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION CONTROLS TOOLBAR */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Pastikan masa berlaku QR guru belum habis.</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    title="Ganti Kamera Belakang / Depan"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-blue-500" />
                    <span>{facingMode === 'environment' ? 'Depan' : 'Belakang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-700/60 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cameraActive ? 'text-emerald-500' : 'text-blue-500'}`} />
                    <span>{cameraActive ? 'Jeda' : 'Ulang Kamera'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-3xl p-8 transition cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                  <FileImage className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih atau Ambil Foto QR Code
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Klik di sini untuk memilih screenshot atau foto kode QR proyektor dari galeri/kamera perangkat Anda
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Jelajahi File Gambar
                </button>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-left flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed">
                  Gunakan opsi ini jika browser tidak mengizinkan akses kamera langsung. Ambil foto layar menggunakan aplikasi kamera bawaan ponsel, lalu unggah fotonya ke sini.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Masukkan 6-Digit PIN Sesi Presensi
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Kode PIN 6-digit tertera di bawah kode QR pada layar proyektor kelas guru.
                </p>
              </div>

              <div className="flex justify-center py-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  className="w-52 text-center text-3xl font-mono font-black tracking-widest bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-2xl py-3 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={pinCode.length < 6}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
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
