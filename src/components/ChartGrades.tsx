import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { DatabaseService } from '../services/databaseService';
import { User } from '../types';
import { useTheme } from '../utils/useTheme';
import {
  TrendingUp,
  Filter,
  BookOpen,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  Award,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

Chart.register(...registerables);

interface ChartGradesProps {
  labels?: string[];
  tugas?: number[];
  uts?: number[];
  uas?: number[];
  finalScores?: number[];
  title?: string;
  classId?: string;
}

export const ChartGrades: React.FC<ChartGradesProps> = ({
  labels: propLabels,
  tugas: propTugas,
  uts: propUts,
  uas: propUas,
  finalScores: propFinalScores,
  title = 'Analisis Capaian & Tren Perkembangan Akademik',
  classId = 'class_10_ipa1'
}) => {
  const dbService = DatabaseService.getInstance();
  const subjects = dbService.getAllSubjects();
  const students = dbService.getClassStudents(classId);
  const { isDark } = useTheme();

  // Filter States
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<'all' | 'Tugas' | 'UTS' | 'UAS' | 'Final'>('all');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Compute dataset based on selected filters
  const chartData = useMemo(() => {
    // If props are provided and filter is 'all', we can use props or construct from database
    const studentNames = students.map((s: User) => s.nama.split(' ')[0]); // Nickname for chart x-axis
    const rawSnapshot = dbService.getRawSnapshot();
    const allGrades = Object.values(rawSnapshot.grades);

    const tugasList: number[] = [];
    const utsList: number[] = [];
    const uasList: number[] = [];
    const finalList: number[] = [];

    students.forEach((student: User) => {
      let filteredGrades = allGrades.filter(g => g.student_id === student.id);
      if (selectedSubjectId !== 'all') {
        filteredGrades = filteredGrades.filter(g => g.subject_id === selectedSubjectId);
      }

      const tItems = filteredGrades.filter(g => g.type === 'Tugas');
      const uItems = filteredGrades.filter(g => g.type === 'UTS');
      const aItems = filteredGrades.filter(g => g.type === 'UAS');

      const avgT = tItems.length > 0 ? Math.round(tItems.reduce((a, b) => a + b.score, 0) / tItems.length) : (propTugas?.[0] || 75);
      const avgU = uItems.length > 0 ? Math.round(uItems.reduce((a, b) => a + b.score, 0) / uItems.length) : (propUts?.[0] || 80);
      const avgA = aItems.length > 0 ? Math.round(aItems.reduce((a, b) => a + b.score, 0) / aItems.length) : (propUas?.[0] || 82);

      const fScore = Math.round(avgT * 0.3 + avgU * 0.3 + avgA * 0.4);

      tugasList.push(avgT);
      utsList.push(avgU);
      uasList.push(avgA);
      finalList.push(fScore);
    });

    const activeFinals = finalList.length > 0 ? finalList : (propFinalScores || [88, 84, 75, 96, 70]);
    const maxScore = Math.max(...activeFinals);
    const minScore = Math.min(...activeFinals);
    const avgScore = Math.round(activeFinals.reduce((a, b) => a + b, 0) / activeFinals.length);
    const passingCount = activeFinals.filter(s => s >= 75).length;
    const passingRate = Math.round((passingCount / activeFinals.length) * 100);

    return {
      labels: studentNames.length > 0 ? studentNames : (propLabels || ['Ahmad', 'Dewi', 'Fahri', 'Nabila', 'Reza']),
      tugas: tugasList.length > 0 ? tugasList : (propTugas || [88, 78, 70, 95, 65]),
      uts: utsList.length > 0 ? utsList : (propUts || [92, 84, 75, 96, 70]),
      uas: uasList.length > 0 ? uasList : (propUas || [90, 86, 78, 98, 72]),
      finalScores: activeFinals,
      stats: {
        maxScore,
        minScore,
        avgScore,
        passingRate
      }
    };
  }, [selectedSubjectId, selectedComponent, students, propLabels, propTugas, propUts, propUas, propFinalScores]);

  // Render Chart.js
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const isDarkMode = typeof document !== 'undefined' 
      ? document.documentElement.classList.contains('dark') 
      : isDark;
    const yTickColor = isDarkMode ? '#CBD5E1' : '#0F172A';
    const xLabelColor = isDarkMode ? '#F8FAFC' : '#0F172A';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0';
    const legendColor = isDarkMode ? '#F8FAFC' : '#0F172A';

    Chart.defaults.color = isDarkMode ? '#F8FAFC' : '#0F172A';
    Chart.defaults.borderColor = gridColor;

    const datasets: any[] = [];
    const isLineOrArea = chartType === 'line' || chartType === 'area';
    const fillOption = chartType === 'area';

    if (selectedComponent === 'all' || selectedComponent === 'Tugas') {
      datasets.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: 'Tugas (30%)',
        data: chartData.tugas,
        backgroundColor: fillOption ? 'rgba(96, 165, 250, 0.25)' : '#60A5FA',
        borderColor: '#3B82F6',
        borderWidth: isLineOrArea ? 2.5 : 1,
        fill: fillOption,
        tension: 0.35,
        borderRadius: 6
      });
    }

    if (selectedComponent === 'all' || selectedComponent === 'UTS') {
      datasets.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: 'UTS (30%)',
        data: chartData.uts,
        backgroundColor: fillOption ? 'rgba(245, 158, 11, 0.25)' : '#F59E0B',
        borderColor: '#D97706',
        borderWidth: isLineOrArea ? 2.5 : 1,
        fill: fillOption,
        tension: 0.35,
        borderRadius: 6
      });
    }

    if (selectedComponent === 'all' || selectedComponent === 'UAS') {
      datasets.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: 'UAS (40%)',
        data: chartData.uas,
        backgroundColor: fillOption ? 'rgba(139, 92, 246, 0.25)' : '#8B5CF6',
        borderColor: '#7C3AED',
        borderWidth: isLineOrArea ? 2.5 : 1,
        fill: fillOption,
        tension: 0.35,
        borderRadius: 6
      });
    }

    if (selectedComponent === 'all' || selectedComponent === 'Final') {
      datasets.push({
        type: 'line',
        label: 'Nilai Akhir',
        data: chartData.finalScores,
        borderColor: '#10B981',
        backgroundColor: fillOption ? 'rgba(16, 185, 129, 0.3)' : '#10B981',
        borderWidth: 3.5,
        fill: fillOption && selectedComponent === 'Final',
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#10B981',
        pointBorderWidth: 3
      });
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: chartType === 'bar' ? 'bar' : 'line',
      data: {
        labels: chartData.labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              font: { family: 'sans-serif', size: 11, weight: 'bold' },
              color: yTickColor
            },
            grid: {
              color: gridColor
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: 'sans-serif', size: 11, weight: 'bold' },
              color: xLabelColor
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 12, weight: 'bold' },
              padding: 16,
              color: legendColor
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#0F172A' : '#1E293B',
            titleColor: '#FFFFFF',
            bodyColor: '#F8FAFC',
            padding: 12,
            cornerRadius: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData, selectedComponent, chartType, isDark]);

  return (
    <div className="space-y-4">
      {/* Header & Interactive Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
            Gunakan filter di samping untuk memantau performa per mata pelajaran atau per komponen penilaian.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Mapel */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Semua Mapel (Rata-rata)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  {s.nama_mapel}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Komponen Penilaian */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
            <Filter className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <select
              value={selectedComponent}
              onChange={(e: any) => setSelectedComponent(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Semua Komponen</option>
              <option value="Tugas" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Tugas Saja (30%)</option>
              <option value="UTS" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">UTS Saja (30%)</option>
              <option value="UAS" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">UAS Saja (40%)</option>
              <option value="Final" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Nilai Akhir</option>
            </select>
          </div>

          {/* Chart View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                chartType === 'bar' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Diagram Batang"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                chartType === 'line' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grafik Garis Tren"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Garis</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                chartType === 'area' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grafik Area Terisi"
            >
              <span className="text-[11px] hidden sm:inline">Area</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl p-3 transition">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Rata-Rata Kelas</div>
          <div className="text-xl font-black text-blue-950 dark:text-blue-100 mt-0.5">{chartData.stats.avgScore} / 100</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-300 mt-0.5 font-semibold">Standar KKM: 75</div>
        </div>

        <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3 transition">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Nilai Tertinggi</div>
          <div className="text-xl font-black text-emerald-950 dark:text-emerald-100 mt-0.5">{chartData.stats.maxScore}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-300 mt-0.5 font-semibold">Predikat A (Sangat Baik)</div>
        </div>

        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-3 transition">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Nilai Terendah</div>
          <div className="text-xl font-black text-amber-950 dark:text-amber-100 mt-0.5">{chartData.stats.minScore}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-300 mt-0.5 font-semibold">Evaluasi Remedial</div>
        </div>

        <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-3 transition">
          <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Ketuntasan (≥75)</div>
          <div className="text-xl font-black text-purple-950 dark:text-purple-100 mt-0.5">{chartData.stats.passingRate}%</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-300 mt-0.5 font-semibold">Target Sekolah: 85%</div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="h-72 w-full pt-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
