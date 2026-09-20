import React, { useEffect } from 'react';
import { LogOut, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { navigationBackService } from '../services/navigationBackService';

interface ExitAppConfirmModalProps {
  isOpen: boolean;
  onStayInApp: () => void;
  onConfirmExit: () => void;
  appName: string;
}

export const ExitAppConfirmModal: React.FC<ExitAppConfirmModalProps> = ({
  isOpen,
  onStayInApp,
  onConfirmExit,
  appName
}) => {
  // Jika modal konfirmasi keluar sedang terbuka, menekan tombol kembali akan membatalkan keluar (tetap di aplikasi)
  useEffect(() => {
    if (!isOpen) return;
    const unregister = navigationBackService.registerHandler('exit_app_modal', () => {
      onStayInApp();
      return true;
    });
    return () => unregister();
  }, [isOpen, onStayInApp]);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onStayInApp}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 overflow-hidden z-10 space-y-4"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <LogOut className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Ingin Keluar dari Aplikasi?
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Anda menekan tombol kembali di halaman utama <strong className="text-slate-900 dark:text-white">{appName}</strong>.
                </p>
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Seluruh data presensi dan input Anda tersimpan aman.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-500" />
                <span>Pilih "Batal / Tetap di Aplikasi" untuk melanjutkan penggunaan.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              {/* Primary Action: Stay In App (Batal keluar) */}
              <button
                type="button"
                id="btn-stay-in-app"
                onClick={onStayInApp}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Batal (Tetap di Aplikasi)</span>
              </button>

              {/* Secondary Action: Confirm Exit */}
              <button
                type="button"
                id="btn-confirm-exit-app"
                onClick={onConfirmExit}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-2xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Aplikasi</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
