import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useTheme } from '../utils/useTheme';

Chart.register(...registerables);

interface ChartAttendanceProps {
  data: {
    Hadir: number;
    Izin: number;
    Sakit: number;
    Alpa: number;
  };
  title?: string;
}

export const ChartAttendance: React.FC<ChartAttendanceProps> = ({ data, title = 'Distribusi Kehadiran' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;

    const isDarkMode = typeof document !== 'undefined' 
      ? document.documentElement.classList.contains('dark') 
      : isDark;
    const legendTextColor = isDarkMode ? '#F8FAFC' : '#0F172A';
    const sliceBorderColor = isDarkMode ? '#1E293B' : '#FFFFFF';

    // If chart instance already exists, update data in place for smooth real-time animation
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.datasets[0].data = [data.Hadir, data.Izin, data.Sakit, data.Alpa];
      chartInstanceRef.current.data.datasets[0].borderColor = sliceBorderColor;
      chartInstanceRef.current.options.plugins!.legend!.labels!.color = legendTextColor;
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
                const total = data.Hadir + data.Izin + data.Sakit + data.Alpa;
                const value = Number(context.raw) || 0;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
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
    <div className="w-full h-64 flex flex-col items-center">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
        {title}
      </div>
      <div className="relative w-full h-full">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};
