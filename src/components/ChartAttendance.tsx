import React, { useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { useTheme } from '../utils/useTheme';
import { TimeRangeFilter } from '../types';
import { Calendar } from 'lucide-react';

Chart.register(...registerables);

interface ChartAttendanceProps {
  data: {
    Hadir: number;
    Izin: number;
    Sakit: number;
    Alpa: number;
  };
  title?: string;
  timeRange?: TimeRangeFilter;
  periodLabel?: string;
}

export const ChartAttendance: React.FC<ChartAttendanceProps> = React.memo(({
  data,
  title = 'Distribusi Kehadiran',
  timeRange = 'mingguan',
  periodLabel
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const prevDataRef = useRef<{ h: number; i: number; s: number; a: number; isDark: boolean } | null>(null);
  const { isDark } = useTheme();

  // 1. Memoized Calculations for Totals & Attendance Percentage
  const { total, attendanceRate } = useMemo(() => {
    const totalCount = data.Hadir + data.Izin + data.Sakit + data.Alpa;
    const rate = totalCount > 0 ? Math.round((data.Hadir / totalCount) * 100) : 0;
    return { total: totalCount, attendanceRate: rate };
  }, [data.Hadir, data.Izin, data.Sakit, data.Alpa]);

  // 2. Memoized Range Badge Configuration
  const badge = useMemo(() => {
    switch (timeRange) {
      case 'mingguan':
        return { label: 'Pekan Berjalan', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' };
      case 'bulanan':
        return { label: 'Bulan Ini', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
      case 'semester':
        return { label: 'Semester Berjalan', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' };
      default:
        return { label: 'Semua Waktu', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    }
  }, [timeRange]);

  // 3. Stable Chart Initialization & In-Place Updates (Zero Flicker during Firebase Sync)
  useEffect(() => {
    if (!canvasRef.current) return;

    const isDarkMode = typeof document !== 'undefined' 
      ? document.documentElement.classList.contains('dark') 
      : isDark;
    const legendTextColor = isDarkMode ? '#F8FAFC' : '#0F172A';
    const sliceBorderColor = isDarkMode ? '#1E293B' : '#FFFFFF';

    const currentSnapshot = {
      h: data.Hadir,
      i: data.Izin,
      s: data.Sakit,
      a: data.Alpa,
      isDark: isDarkMode
    };

    // Check if data or theme actually changed before calling Chart.js updates
    const hasDataChanged = !prevDataRef.current ||
      prevDataRef.current.h !== currentSnapshot.h ||
      prevDataRef.current.i !== currentSnapshot.i ||
      prevDataRef.current.s !== currentSnapshot.s ||
      prevDataRef.current.a !== currentSnapshot.a ||
      prevDataRef.current.isDark !== currentSnapshot.isDark;

    if (!hasDataChanged && chartInstanceRef.current) {
      return;
    }

    prevDataRef.current = currentSnapshot;

    // If chart instance already exists, update data in place smoothly without destroying canvas
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.datasets[0].data = [data.Hadir, data.Izin, data.Sakit, data.Alpa];
      chartInstanceRef.current.data.datasets[0].borderColor = sliceBorderColor;
      if (chartInstanceRef.current.options.plugins?.legend?.labels) {
        chartInstanceRef.current.options.plugins.legend.labels.color = legendTextColor;
      }
      chartInstanceRef.current.update();
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    Chart.defaults.color = legendTextColor;
    Chart.defaults.borderColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0';

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Hadir (H)', 'Izin (I)', 'Sakit (S)', 'Alpa (A)'],
        datasets: [
          {
            data: [data.Hadir, data.Izin, data.Sakit, data.Alpa],
            backgroundColor: [
              '#10B981', // green-500
              '#3B82F6', // blue-500
              '#F59E0B', // amber-500
              '#EF4444'  // red-500
            ],
            borderWidth: 2,
            borderColor: sliceBorderColor,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 14,
              font: { size: 12, weight: 'bold' },
              color: legendTextColor,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#0F172A' : '#1E293B',
            titleColor: '#FFFFFF',
            bodyColor: '#F1F5F9',
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function (context) {
                const totalCount = data.Hadir + data.Izin + data.Sakit + data.Alpa;
                const value = Number(context.raw) || 0;
                const pct = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : '0';
                return ` ${context.label}: ${value} (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data.Hadir, data.Izin, data.Sakit, data.Alpa, isDark]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>{title}</span>
          </div>
          {periodLabel && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {periodLabel}
            </div>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge.color}`}>
          <Calendar className="w-3 h-3" />
          {badge.label}
        </span>
      </div>

      <div className="relative w-full h-52">
        <canvas ref={canvasRef}></canvas>
      </div>

      {/* Mini metric breakdown */}
      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-center text-xs">
        <div className="p-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Hadir</div>
          <div className="text-sm font-black text-emerald-800 dark:text-emerald-200">{data.Hadir}</div>
        </div>
        <div className="p-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60">
          <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Izin</div>
          <div className="text-sm font-black text-blue-800 dark:text-blue-200">{data.Izin}</div>
        </div>
        <div className="p-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Sakit</div>
          <div className="text-sm font-black text-amber-800 dark:text-amber-200">{data.Sakit}</div>
        </div>
        <div className="p-1.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">Alpa</div>
          <div className="text-sm font-black text-rose-800 dark:text-rose-200">{data.Alpa}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
        <span>Total Log: <strong className="text-slate-700 dark:text-slate-200">{total} Sesi</strong></span>
        <span>Tingkat Kehadiran: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{attendanceRate}%</strong></span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.Hadir === nextProps.data.Hadir &&
    prevProps.data.Izin === nextProps.data.Izin &&
    prevProps.data.Sakit === nextProps.data.Sakit &&
    prevProps.data.Alpa === nextProps.data.Alpa &&
    prevProps.title === nextProps.title &&
    prevProps.timeRange === nextProps.timeRange &&
    prevProps.periodLabel === nextProps.periodLabel
  );
});

ChartAttendance.displayName = 'ChartAttendance';

