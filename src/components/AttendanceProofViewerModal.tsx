import React from 'react';
import { Attendance, User } from '../types';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  UserCheck,
  ExternalLink,
  Maximize2
} from 'lucide-react';

interface AttendanceProofViewerModalProps {
  attendance: Attendance;
  studentName: string;
  classNameTitle?: string;
  onClose: () => void;
}

export const AttendanceProofViewerModal: React.FC<AttendanceProofViewerModalProps> = ({
  attendance,
  studentName,
  classNameTitle,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">Bukti Otentik Presensi Realtime</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {studentName} {classNameTitle ? `• ${classNameTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Stamped Photo */}
          {attendance.photoUrl ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg bg-black">
              <img
                src={attendance.photoUrl}
                alt={`Bukti Presensi ${studentName}`}
                className="w-full max-h-[360px] object-cover"
              />
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed text-xs text-slate-500">
              Presensi dicatat secara manual oleh Guru/Wali Kelas (tanpa foto selfie).
            </div>
          )}

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">Status Kehadiran</span>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                {attendance.status === 'H' ? 'Hadir (H)' : attendance.status === 'I' ? 'Izin (I)' : attendance.status === 'S' ? 'Sakit (S)' : 'Alpa (A)'}
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
              <span className="text-blue-800 dark:text-blue-300 font-medium">Waktu Masuk</span>
              <p className="text-sm font-black text-blue-900 dark:text-blue-100 mt-0.5">
                {attendance.timestamp || '07:15 WIB'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl col-span-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Koordinat & Validasi Radius GPS</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {attendance.latitude && attendance.longitude
                    ? `${attendance.latitude.toFixed(6)}, ${attendance.longitude.toFixed(6)}`
                    : 'Koordinat Sekolah Standar'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    attendance.isWithinRadius !== false
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                  }`}
                >
                  {attendance.distanceMeters !== undefined
                    ? `${attendance.distanceMeters}m (${attendance.isWithinRadius !== false ? 'Dalam Radius' : 'Luar Radius'})`
                    : 'Valid'}
                </span>
              </div>
            </div>

            {attendance.note && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl col-span-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Catatan Presensi</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{attendance.note}</p>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
