import { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';

interface UseIdleAutoLogoutOptions {
  timeoutMinutes?: number; // default: 15 minutes
  warningSeconds?: number; // default: 60 seconds before logout
  enabled?: boolean;
  onLogout: () => void;
}

const STORAGE_KEY = 'SIMAK_LAST_USER_ACTIVITY';

export const useIdleAutoLogout = ({
  timeoutMinutes = 15,
  warningSeconds = 60,
  enabled = true,
  onLogout
}: UseIdleAutoLogoutOptions) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;
  const lastActiveRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const [remainingTimeFormatted, setRemainingTimeFormatted] = useState<string>('15:00');

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, now.toString());
    } catch (e) {}
    warningShownRef.current = false;
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!enabled) return;

    // Initialize with current time
    updateActivity();

    // Throttled event listener (only update at most once every 2.5 seconds to save CPU)
    let lastEventTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 2500) {
        lastEventTime = now;
        updateActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    events.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Cross-tab synchronization via localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed) && parsed > lastActiveRef.current) {
          lastActiveRef.current = parsed;
          warningShownRef.current = false;
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic check interval
    const interval = setInterval(() => {
      // Check latest from storage in case another tab updated it
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const storedTime = parseInt(stored, 10);
          if (!isNaN(storedTime) && storedTime > lastActiveRef.current) {
            lastActiveRef.current = storedTime;
          }
        }
      } catch (e) {}

      const now = Date.now();
      const elapsed = now - lastActiveRef.current;
      const timeLeft = Math.max(0, timeoutMs - elapsed);
      const secondsLeft = Math.ceil(timeLeft / 1000);

      setRemainingTimeFormatted(formatTime(secondsLeft));

      // 1. Trigger Auto-Logout if 15 minutes of inactivity exceeded
      if (elapsed >= timeoutMs) {
        clearInterval(interval);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        // Close any active Swal
        Swal.close();

        // Notify user about automatic session expiration
        Swal.fire({
          icon: 'warning',
          title: 'Sesi Berakhir Otomatis',
          html: `
            <div class="text-left text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Aplikasi tidak mendeteksi aktivitas selama <strong>${timeoutMinutes} menit</strong>.</p>
              <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-medium">
                🛡️ <strong>Proteksi Keamanan:</strong> Anda telah dikeluarkan secara otomatis untuk mencegah akses tidak sah ke data sekolah.
              </div>
              <p class="text-slate-500 dark:text-slate-400">Silakan masuk kembali untuk melanjutkan pekerjaan Anda.</p>
            </div>
          `,
          confirmButtonText: 'Masuk Kembali',
          confirmButtonColor: '#2563EB',
          allowOutsideClick: false,
          allowEscapeKey: false
        });

        onLogout();
        return;
      }

      // 2. Warning dialog when less than warningSeconds remain (e.g. 1 minute left)
      if (elapsed >= timeoutMs - warningMs && !warningShownRef.current) {
        warningShownRef.current = true;
        Swal.fire({
          title: 'Peringatan Sesi Idle',
          html: `
            <div class="text-center text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Aplikasi akan logout otomatis dalam <strong class="text-rose-600 dark:text-rose-400 font-mono text-sm">${Math.ceil((timeoutMs - elapsed) / 1000)} detik</strong> karena tidak ada aktivitas.</p>
              <p class="text-slate-500">Klik tombol di bawah untuk tetap melanjutkan sesi aktif Anda.</p>
            </div>
          `,
          icon: 'info',
          timer: timeLeft,
          timerProgressBar: true,
          showCancelButton: false,
          confirmButtonText: 'Tetap Masuk & Lanjutkan Sesi',
          confirmButtonColor: '#2563EB'
        }).then((result) => {
          if (result.isConfirmed) {
            updateActivity();
          }
        });
      }
    }, 1000);

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [enabled, timeoutMs, warningMs, onLogout, updateActivity]);

  return {
    remainingTimeFormatted,
    resetTimer: updateActivity
  };
};
