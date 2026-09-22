import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sendFirebaseAuthPasswordReset } from '../services/firebaseClient';
import { DatabaseService } from '../services/databaseService';
import { AppSettings, User } from '../types';
import Swal from 'sweetalert2';
import {
  KeyRound,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  User as UserIcon,
  Phone,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  initialIdentifier?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  appSettings,
  initialIdentifier = ''
}) => {
  const dbService = DatabaseService.getInstance();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial identifier when opened
  useEffect(() => {
    if (isOpen) {
      setIdentifier(initialIdentifier || '');
      setIsSuccess(false);
      setErrorMessage(null);
      setSentEmail('');
    }
  }, [isOpen, initialIdentifier]);

  // Lookup user as the user types (by username or email)
  useEffect(() => {
    const query = identifier.trim().toLowerCase();
    if (!query) {
      setMatchedUser(null);
      return;
    }

    const allUsers = dbService.getAllUsers();
    const found = allUsers.find(
      (u) =>
        u.username.toLowerCase() === query ||
        (u.email && u.email.toLowerCase() === query)
    );

    setMatchedUser(found || null);
  }, [identifier]);

  if (!isOpen) return null;

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const inputVal = identifier.trim();
    if (!inputVal) {
      setErrorMessage('Silakan masukkan username atau alamat email Anda.');
      return;
    }

    // Determine target email
    let targetEmail = inputVal;
    if (!inputVal.includes('@')) {
      if (matchedUser?.email) {
        targetEmail = matchedUser.email;
      } else {
        // Fallback construct school email if user exists but has no email
        targetEmail = `${inputVal}@sekolah.sch.id`;
      }
    }

    setIsLoading(true);

    try {
      const result = await sendFirebaseAuthPasswordReset(targetEmail);

      if (result.success) {
        setIsSuccess(true);
        setSentEmail(targetEmail);

        // Record in activity logs
        dbService.logActivity(
          'password_reset_request',
          'Permintaan Reset Password',
          `Permintaan pemulihan kata sandi dikirim via Firebase Auth ke email ${targetEmail}.`,
          `auth_reset_${Date.now()}`,
          { email: targetEmail, username: matchedUser?.username || inputVal },
          matchedUser ? { id: matchedUser.id, nama: matchedUser.nama, role: matchedUser.role } : undefined
        );

        Swal.fire({
          icon: 'success',
          title: 'Email Pemulihan Terkirim!',
          html: `<div class="text-xs text-slate-600 dark:text-slate-300">Tautan reset kata sandi telah dikirim ke <strong>${targetEmail}</strong> melalui Firebase Auth. Silakan periksa kotak masuk atau folder spam Anda.</div>`,
          confirmButtonColor: '#2563eb'
        });
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kendala saat mengirim email pemulihan.');
    } finally {
      setIsLoading(false);
    }
  };

  const adminUser = dbService.getAllUsers().find((u) => u.role === 'admin');
  const adminName = adminUser?.nama || 'Bambang Wijaya, M.Kom';
  const adminPhone = appSettings.adminPhone || adminUser?.no_wa || '0812-3456-7890';
  const cleanWa = adminPhone.replace(/\D/g, '').replace(/^0/, '62');
  const waUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
    `Halo Admin ${appSettings.appName}, saya membutuhkan bantuan reset kata sandi untuk akun saya.`
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 text-left overflow-hidden"
        >
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Lupa Kata Sandi?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pemulihan akun terintegrasi Firebase Auth
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Masukkan <strong>username</strong> atau <strong>alamat email</strong> yang terdaftar pada sistem{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{appSettings.appName}</span>. Kami akan mengirimkan tautan pemulihan kata sandi langsung ke email Anda.
              </p>

              {/* Form Input */}
              <form onSubmit={handleSendResetEmail} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Username atau Email
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800/80 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: walikelas atau email@sekolah.sch.id"
                      className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Auto-detected Account Pill */}
                {matchedUser && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate font-semibold">{matchedUser.nama}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate">
                        {matchedUser.email || `${matchedUser.username}@sekolah.sch.id`}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 shrink-0">
                      {matchedUser.role}
                    </span>
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-snug">{errorMessage}</div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/20"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim Email Pemulihan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Kirim Tautan Reset Password</span>
                    </>
                  )}
                </button>
              </form>

              {/* Alternative Help Options */}
              <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Bantuan Tambahan:</span>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    <Phone className="w-3 h-3" />
                    <span>WhatsApp Admin ({adminPhone})</span>
                  </a>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 leading-normal flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Anda juga dapat menggunakan tombol <strong>Kredensial Default</strong> di halaman login untuk akun bawaan sistem.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Email Pemulihan Terkirim!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Instruksi dan tautan reset kata sandi telah dikirimkan ke:
                <br />
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg inline-block mt-1">
                  {sentEmail}
                </span>
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                  <span>Periksa kotak masuk (inbox) atau folder <strong>Spam / Junk</strong> email Anda.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                  <span>Klik tautan reset kata sandi dari Firebase Authentication.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                  <span>Buat kata sandi baru dan kembali ke halaman login untuk masuk.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Halaman Login</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
