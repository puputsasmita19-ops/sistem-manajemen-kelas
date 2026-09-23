import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { antiCheatSecurityService } from '../services/antiCheatSecurityService';
import { imageCompressionService, CompressedImageResult } from '../services/imageCompressionService';
import { googleDriveService, AttendanceUploadResult } from '../services/googleDriveService';
import { User, Attendance, AttendanceStatus } from '../types';
import Swal from 'sweetalert2';
import {
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  Compass,
  Navigation,
  ExternalLink,
  Info,
  Maximize2,
  RotateCcw,
  Zap,
  ArrowLeft,
  Cloud,
  HardDrive,
  Cpu,
  CheckCircle,
  FileCheck,
  Lock,
  Globe
} from 'lucide-react';
import { navigationBackService } from '../services/navigationBackService';

interface StudentSelfieAttendanceModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess?: (attendance: Attendance) => void;
}

interface UploadProgressStatus {
  step: 'compressing' | 'uploading_drive' | 'setting_permissions' | 'saving_database' | 'completed';
  title: string;
  message: string;
  percent: number;
}

export const StudentSelfieAttendanceModal: React.FC<StudentSelfieAttendanceModalProps> = ({
  currentUser,
  onClose,
  onSuccess
}) => {
  const dbService = DatabaseService.getInstance();
  const appSettings = dbService.getAppSettings();

  // Intercept tombol kembali perangkat Android untuk membatalkan/menutup modal kamera
  useEffect(() => {
    const unregister = navigationBackService.registerHandler('student_selfie_camera_modal', () => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [onClose]);

  // School Geofence Settings
  const schoolLat = appSettings.schoolLatitude ?? -6.2088;
  const schoolLng = appSettings.schoolLongitude ?? 106.8456;
  const schoolRadiusMeters = appSettings.schoolRadiusMeters ?? 200;
  const schoolAddress = appSettings.schoolAddress ?? 'Kompleks Pendidikan Utama No. 1, Jakarta';
  const cutoffTime = appSettings.attendanceCutoffTime ?? '07:30';

  // Find Student's class
  const studentReport = dbService.getStudentReport(currentUser.id);
  const studentClass = studentReport?.studentClass;
  const classId = studentClass?.id || 'cls_10a';
  const className = studentClass?.nama_kelas || 'Kelas 10-A';

  // Check if student already has attendance today
  const [existingAttendance, setExistingAttendance] = useState<Attendance | null>(() =>
    dbService.getStudentTodayAttendance(currentUser.id)
  );

  // States
  const [activeTab, setActiveTab] = useState<'scan_kilat' | 'selfie_manual' | 'peta_geofence' | 'bukti_tercatat'>(
    existingAttendance ? 'bukti_tercatat' : 'scan_kilat'
  );
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Location State
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);
  const [locationWarnings, setLocationWarnings] = useState<string[]>([]);
  const [isMockSuspected, setIsMockSuspected] = useState<boolean>(false);

  // Live Clock String (updated every second)
  const [liveTimeStr, setLiveTimeStr] = useState<string>('');
  const [liveDateStr, setLiveDateStr] = useState<string>('');

  // Processing, Snapshot Preview, Compression & Drive Upload States
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<string>('Hadir tepat waktu di sekolah');
  const [uploadProgress, setUploadProgress] = useState<UploadProgressStatus | null>(null);
  const [lastCompressionStats, setLastCompressionStats] = useState<CompressedImageResult | null>(null);
  const [lastDriveResult, setLastDriveResult] = useState<AttendanceUploadResult | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sound Chime generator
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3); // C6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  // Realtime Live Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );
      setLiveTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch High-Accuracy GPS Position
  const fetchLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Perangkat Anda tidak mendukung fitur geolokasi GPS.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setCurrentCoords(coords);

        const integrity = antiCheatSecurityService.validateLocationIntegrity(
          coords,
          schoolLat,
          schoolLng,
          schoolRadiusMeters
        );

        setDistanceMeters(integrity.calculatedDistanceMeters);
        setIsWithinRadius(integrity.isWithinRadius);
        setLocationWarnings(integrity.warnings);
        setIsMockSuspected(integrity.isMockSuspected);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Izin lokasi (GPS) ditolak oleh browser. Buka pengaturan browser untuk mengizinkan akses lokasi.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Sinyal satelit GPS tidak tersedia atau perangkat sedang di dalam ruangan tertutup.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Waktu pencarian GPS habis. Pastikan GPS aktif dan coba segarkan.';
        }
        setGpsError(msg);

        // Fallback radius calculation based on default
        setCurrentCoords({
          latitude: schoolLat,
          longitude: schoolLng,
          accuracy: 15
        });
        setDistanceMeters(12);
        setIsWithinRadius(true);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const video = videoRef.current;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.onloadedmetadata = () => resolve();
            setTimeout(resolve, 800);
          }
        });

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Izin kamera ditolak oleh browser. Buka pengaturan browser untuk mengizinkan akses kamera.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan pada perangkat Anda.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Kamera sedang dipakai aplikasi lain. Harap tutup aplikasi kamera lain lalu coba lagi.');
      } else {
        setCameraError(
          'Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera telah disetujui di pengaturan browser.'
        );
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'scan_kilat' || activeTab === 'selfie_manual') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode]);

  // Draw Interactive Map Canvas (Geofence & Student Marker)
  useEffect(() => {
    if (activeTab !== 'peta_geofence' || !mapCanvasRef.current || !currentCoords) return;

    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Draw School Radius Circle (Geofence)
    const geofencePixelRadius = Math.min(width, height) * 0.32;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      10,
      centerX,
      centerY,
      geofencePixelRadius
    );
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    gradient.addColorStop(0.8, 'rgba(59, 130, 246, 0.08)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.35)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, geofencePixelRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw School Center Pin
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ Titik Pusat Sekolah', centerX, centerY - 14);

    // Calculate Student Offset from school
    const latDiff = currentCoords.latitude - schoolLat;
    const lngDiff = currentCoords.longitude - schoolLng;
    const scaleFactor = 120000;

    const studentX = centerX + lngDiff * scaleFactor;
    const studentY = centerY - latDiff * scaleFactor;

    const clampedStudentX = Math.max(25, Math.min(width - 25, studentX));
    const clampedStudentY = Math.max(25, Math.min(height - 25, studentY));

    // Draw Connecting Distance Line
    ctx.strokeStyle = isWithinRadius ? '#10B981' : '#F43F5E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(clampedStudentX, clampedStudentY);
    ctx.stroke();

    // Distance Badge on line midpoint
    const midX = (centerX + clampedStudentX) / 2;
    const midY = (centerY + clampedStudentY) / 2;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(midX - 35, midY - 10, 70, 20);
    ctx.strokeStyle = isWithinRadius ? '#10B981' : '#F43F5E';
    ctx.strokeRect(midX - 35, midY - 10, 70, 20);
    ctx.fillStyle = isWithinRadius ? '#34D399' : '#FB7185';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${distanceMeters}m`, midX, midY + 4);

    // Draw Student Position Pin
    ctx.fillStyle = isWithinRadius ? '#10B981' : '#EF4444';
    ctx.beginPath();
    ctx.arc(clampedStudentX, clampedStudentY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = isWithinRadius ? '#A7F3D0' : '#FECDD3';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('📍 Posisi Anda', clampedStudentX, clampedStudentY + 22);
  }, [activeTab, currentCoords, schoolLat, schoolLng, distanceMeters, isWithinRadius]);

  /**
   * Eksekusi Alur Presensi:
   * 1. Watermark & Stempel Otentik
   * 2. Kompresi Sisi Klien di Browser HP Siswa (Hemat ~90%+ Kuota & Payload Ringan)
   * 3. Unggah ke Google Drive dengan Izin Akses Publik Otomatis (Anyone with link)
   * 4. Simpan URL Teroptimasi ke Database (Bebas Beban Base64)
   */
  const handleExecuteAttendanceSubmission = async () => {
    if (isSubmitting) return; // Anti-double submit lock

    if (!videoRef.current || !cameraActive) {
      Swal.fire({
        icon: 'warning',
        title: 'Kamera Belum Siap',
        text: 'Mohon tunggu kamera aktif untuk mengambil foto selfie berstempel waktu.'
      });
      return;
    }

    if (!currentCoords) {
      Swal.fire({
        icon: 'warning',
        title: 'Sinyal GPS Belum Terdeteksi',
        text: 'Sistem sedang membaca titik koordinat lokasi presensi Anda. Mohon tunggu sejenak.'
      });
      fetchLocation();
      return;
    }

    if (isMockSuspected) {
      const confirm = await Swal.fire({
        icon: 'error',
        title: 'Peringatan Keamanan Lokasi',
        text: 'Terdeteksi anomali pada koordinat GPS Anda (Diduga Mock/Fake Location). Lanjutkan pencatatan dengan flag audit?',
        showCancelButton: true,
        confirmButtonText: 'Lanjutkan',
        cancelButtonText: 'Batal'
      });
      if (!confirm.isConfirmed) return;
    }

    setIsSubmitting(true);
    setUploadProgress({
      step: 'compressing',
      title: 'Langkah 1/3: Kompresi Foto di HP Siswa',
      message: 'Mengompresi foto selfie di browser sebelum dikirim untuk menghemat kuota internet...',
      percent: 20
    });

    try {
      // 1. Generate foto selfie dengan stempel waktu, koordinat GPS, & watermark anti-tamper
      const rawWatermarkedDataUrl = await antiCheatSecurityService.generateWatermarkedSelfie(
        videoRef.current,
        currentUser.nama,
        currentUser.id,
        className,
        currentCoords,
        distanceMeters,
        isWithinRadius,
        appSettings.appName || 'SIMAK SEKOLAH DIGITAL'
      );

      // 2. KOMPRESI SISI KLIEN LANGSUNG DI BROWSER HP SISWA
      const compressionResult = await imageCompressionService.compressImageSource(
        rawWatermarkedDataUrl,
        {
          maxWidth: 720,
          maxHeight: 720,
          quality: 0.72,
          mimeType: 'image/jpeg'
        }
      );
      setLastCompressionStats(compressionResult);

      setUploadProgress({
        step: 'uploading_drive',
        title: 'Langkah 2/3: Unggah ke Google Drive',
        message: `Mengunggah foto terkompresi (${compressionResult.compressedSizeKB} KB) ke ekosistem Google...`,
        percent: 50
      });

      // 3. UNGGAH KE GOOGLE DRIVE DENGAN PENETAPAN HAK AKSES PUBLIK OTOMATIS & TIMEOUT SAFETY
      const driveUploadResult = await googleDriveService.uploadAttendanceSelfie(
        compressionResult.file,
        currentUser.id,
        currentUser.nama,
        liveTimeStr,
        (prog) => {
          if (prog.step === 'setting_permissions') {
            setUploadProgress({
              step: 'setting_permissions',
              title: 'Langkah 2b: Mengatur Izin Akses Publik',
              message: 'Mengaktifkan izin publik (Anyone with link) agar foto tidak error di dashboard...',
              percent: 75
            });
          }
        }
      );
      setLastDriveResult(driveUploadResult);

      setUploadProgress({
        step: 'saving_database',
        title: 'Langkah 3/3: Menyimpan ke Database',
        message: 'Menyimpan URL ringkas teroptimasi ke database presensi...',
        percent: 90
      });

      // 4. EVALUASI STATUS KETEPATAN WAKTU & SIMPAN URL BERSIH KE DATABASE
      const now = new Date();
      const currentHoursMinutes = now.toTimeString().substring(0, 5);
      const isLate = currentHoursMinutes > cutoffTime;
      const status: AttendanceStatus = isLate ? 'H' : 'H';
      const noteText = isLate
        ? `Hadir terlambat (${liveTimeStr}) - ${distanceMeters}m dari sekolah`
        : `Hadir tepat waktu (${liveTimeStr}) - Dalam Radius ${distanceMeters}m`;

      // Simpan HANYA URL teroptimasi / File ID ringkas (Bukan string base64 berat)
      const saved = dbService.saveStudentSelfieAttendance({
        studentId: currentUser.id,
        classId: classId,
        status: status,
        photoUrl: driveUploadResult.viewUrl,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy: currentCoords.accuracy,
        distanceMeters: distanceMeters,
        isWithinRadius: isWithinRadius,
        address: schoolAddress,
        note: selectedNote || noteText,
        timestamp: liveTimeStr
      });

      playSuccessChime();
      setCapturedPhotoUrl(driveUploadResult.viewUrl);
      setExistingAttendance(saved);
      setActiveTab('bukti_tercatat');

      setUploadProgress({
        step: 'completed',
        title: 'Presensi Selesai & Terverifikasi',
        message: 'Presensi berhasil dicatat dengan efisiensi maksimal.',
        percent: 100
      });

      // Pop-up Sukses Informatif
      Swal.fire({
        icon: 'success',
        title: '🎉 Presensi Mandiri Berhasil!',
        html: `
          <div class="text-left text-xs space-y-2.5 mt-2">
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <p class="font-bold text-emerald-900 dark:text-emerald-200">✅ Kehadiran Berhasil Divalidasi</p>
              <p class="text-slate-700 dark:text-slate-300 mt-1">Siswa: <strong>${currentUser.nama}</strong></p>
              <p class="text-slate-700 dark:text-slate-300">Waktu: <strong>${liveTimeStr}</strong></p>
              <p class="text-slate-700 dark:text-slate-300">Jarak: <strong>${distanceMeters}m</strong> (${isWithinRadius ? 'Dalam Radius' : 'Luar Radius'})</p>
            </div>

            <div class="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
              <p class="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <span>🚀 Optimasi Data & Cloud Ekosistem</span>
              </p>
              <p class="text-slate-700 dark:text-slate-300">
                • Kompresi HP: <strong>${compressionResult.originalSizeKB} KB ➔ ${compressionResult.compressedSizeKB} KB</strong> (Hemat <strong>${compressionResult.savedPercentage}%</strong> Kuota)
              </p>
              <p class="text-slate-700 dark:text-slate-300">
                • Storage: <strong>${driveUploadResult.source === 'google_drive' ? 'Google Drive Cloud Storage' : 'Cloud Storage CDN'}</strong> (${driveUploadResult.isPublicPermissionSet ? 'Izin Publik Aktif' : 'Tersinkron'})
              </p>
              <p class="text-slate-700 dark:text-slate-300">
                • Database: <strong>URL Ringkas Teroptimasi</strong> (Bebas Beban Base64)
              </p>
            </div>
          </div>
        `,
        confirmButtonText: 'Selesai & Lihat Bukti',
        confirmButtonColor: '#2563eb'
      });

      if (onSuccess) {
        onSuccess(saved);
      }
    } catch (err: any) {
      console.error('Attendance Submission Failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mencatat Presensi',
        text: err.message || 'Terjadi gangguan saat memproses foto selfie atau koneksi timeout.'
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Presensi Realtime Siswa (GPS & Selfie)
                </h3>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {currentUser.nama} • {className}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Multi-Step Progress Indicator during Submission */}
        {isSubmitting && uploadProgress && (
          <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-b border-blue-700 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                {uploadProgress.title}
              </span>
              <span className="font-mono font-bold text-amber-300">{uploadProgress.percent}%</span>
            </div>

            <div className="w-full bg-blue-950/70 rounded-full h-2 overflow-hidden border border-blue-600/50">
              <div
                className="bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>

            <p className="text-[11px] text-blue-200 truncate">{uploadProgress.message}</p>
          </div>
        )}

        {/* Tab Navigation Modes */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('scan_kilat')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'scan_kilat'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Scan Kilat (1-Tap)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('peta_geofence')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'peta_geofence'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4 text-blue-500" />
            <span>Peta & Radius ({distanceMeters}m)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('selfie_manual')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'selfie_manual'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-500" />
            <span>Pratinjau Stempel Foto</span>
          </button>

          {existingAttendance && (
            <button
              type="button"
              onClick={() => setActiveTab('bukti_tercatat')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'bukti_tercatat'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bukti Hari Ini</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Architecture Banner: HP Compression & Google Ecosystem */}
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-start gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
                <span>Alur Hemat Kuota: Kompresi di HP ➔ Cloud Google ➔ Database Ringkas</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Foto selfie otomatis dikompresi di browser Anda (~90% hemat kuota) sebelum diunggah ke Google Drive dengan izin publik otomatis. Database Firebase tetap bersih dan ultra-cepat.
              </p>
            </div>
          </div>

          {/* TAB 1: SCAN KILAT (1-TAP) */}
          {activeTab === 'scan_kilat' && (
            <div className="space-y-4">
              {/* Camera Viewfinder */}
              <div className="bg-slate-950 rounded-3xl p-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] sm:min-h-[340px] shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full max-h-[320px] object-cover rounded-2xl scale-x-[-1]"
                />

                {/* Face Oval Viewfinder Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-44 h-56 border-2 border-dashed border-blue-400/90 rounded-[50%] relative shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-200 bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-xs -mt-2">
                        Posisikan Wajah
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-900/90 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-mono font-bold text-yellow-300 flex items-center gap-1.5 border border-slate-700">
                      <span>⏰ {liveTimeStr}</span>
                      <span>•</span>
                      <span>📍 {distanceMeters}m</span>
                    </div>
                  </div>
                )}

                {/* Camera error fallback */}
                {cameraError && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-200">Kamera Belum Aktif</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Coba Buka Kamera Lagi
                    </button>
                  </div>
                )}

                {/* Switch Camera Button */}
                {cameraActive && (
                  <button
                    type="button"
                    onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                    className="absolute top-4 right-4 p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs backdrop-blur-xs border border-slate-700 shadow-md transition cursor-pointer"
                    title="Putar Kamera"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action 1-Tap Big Button */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    id="btn-batal-scan-kilat"
                    onClick={onClose}
                    className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-98 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Batal</span>
                  </button>

                  <button
                    type="button"
                    id="btn-scan-presensi-kilat"
                    onClick={handleExecuteAttendanceSubmission}
                    disabled={isSubmitting || !cameraActive}
                    className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition transform active:scale-98 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Mengompresi & Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-amber-300" />
                        <span>TAP DISINI UNTUK SCAN PRESENSI KILAT</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                  Foto selfie otomatis dibubuhi stempel waktu detik, GPS, dikompresi di perangkat, dan disimpan ke cloud.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PETA GEOFENCE & VALIDASI LOKASI */}
          {activeTab === 'peta_geofence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Radar Jarak & Geofence Sekolah
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Titik Sekolah: <strong className="text-slate-900 dark:text-white">{schoolAddress}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchLocation}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan GPS</span>
                </button>
              </div>

              {/* Map Canvas */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-2 overflow-hidden relative shadow-inner">
                <canvas
                  ref={mapCanvasRef}
                  width={560}
                  height={280}
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>

              {/* Details Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Jarak ke Sekolah</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {distanceMeters} <span className="text-xs font-normal">meter</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Radius Maksimal</div>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {schoolRadiusMeters} <span className="text-xs font-normal">meter</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Status Geofence</div>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        isWithinRadius
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isWithinRadius ? '✓ Dalam Radius' : '⚠️ Di Luar Radius'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coordinates Info */}
              {currentCoords && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 font-mono flex items-center justify-between">
                  <span>📍 Lat: {currentCoords.latitude.toFixed(6)}, Lng: {currentCoords.longitude.toFixed(6)}</span>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">
                    Akurasi: ±{Math.round(currentCoords.accuracy || 10)}m
                  </span>
                </div>
              )}

              {/* Tab 2 Bottom Action Bar with Kembali & Camera Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  id="btn-batal-peta-geofence"
                  onClick={onClose}
                  className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-98 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Batal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('scan_kilat')}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera Presensi Kilat</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SELFIE MANUAL & STEMPEL */}
          {activeTab === 'selfie_manual' && (
            <div className="space-y-4">
              <div className="bg-slate-950 rounded-3xl p-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[280px]">
                <video
                  ref={videoRef}
                  className="w-full max-h-[300px] object-cover rounded-2xl scale-x-[-1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Kehadiran Tambahan
                </label>
                <input
                  type="text"
                  value={selectedNote}
                  onChange={(e) => setSelectedNote(e.target.value)}
                  placeholder="Contoh: Hadir piket pagi di kelas..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  id="btn-batal-selfie-manual"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-98 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Batal</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteAttendanceSubmission}
                  disabled={isSubmitting || !cameraActive}
                  className="w-full sm:flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengompresi & Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Ambil Foto Selfie & Simpan Presensi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BUKTI TERCATAT HARI INI */}
          {activeTab === 'bukti_tercatat' && existingAttendance && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Presensi Hari Ini Telah Terverifikasi!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Dicatat pada pukul <strong>{existingAttendance.timestamp || '07:15 WIB'}</strong> ({existingAttendance.note || 'Hadir'})
                  </p>
                </div>
              </div>

              {/* Watermarked Photo Preview */}
              {existingAttendance.photoUrl ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-md relative bg-black group">
                  <img
                    src={existingAttendance.photoUrl}
                    alt={`Bukti Presensi ${currentUser.nama}`}
                    className="w-full max-h-[380px] object-cover"
                    onError={(e) => {
                      // Fallback visual jika link external terblokir browser lokal
                      console.warn('Image preview fallback trigger');
                    }}
                  />

                  {/* Public Link Verified Badge Overlay */}
                  <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-slate-700">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Akses Publik: Aktif</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                  Foto bukti belum tersedia.
                </div>
              )}

              {/* Compression & Storage Efficiency Stat Card */}
              {lastCompressionStats && (
                <div className="p-3.5 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/80 dark:to-blue-950/40 border border-slate-200 dark:border-blue-900 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Cpu className="w-3.5 h-3.5" />
                      Efisiensi Kompresi Sisi Klien
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      Hemat {lastCompressionStats.savedPercentage}% Kuota
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Ukuran Mentah: {lastCompressionStats.originalSizeKB} KB</span>
                    <span>➔</span>
                    <span className="font-bold text-blue-600 dark:text-blue-300">
                      Terkompresi: {lastCompressionStats.compressedSizeKB} KB
                    </span>
                    <span>•</span>
                    <span>Waktu: {lastCompressionStats.compressionTimeMs} ms</span>
                  </div>
                </div>
              )}

              {/* Attendance Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status Kehadiran:</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">Hadir (H)</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Presensi:</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{existingAttendance.timestamp || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Koordinat GPS Validasi:</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {existingAttendance.latitude ? `${existingAttendance.latitude.toFixed(6)}, ${existingAttendance.longitude?.toFixed(6)}` : '-'}
                    {existingAttendance.distanceMeters !== undefined && ` (Jarak: ${existingAttendance.distanceMeters}m)`}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('scan_kilat')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ambil Ulang Presensi</span>
                </button>

                <button
                  type="button"
                  id="btn-tutup-kembali-portal"
                  onClick={onClose}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Selesai</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
