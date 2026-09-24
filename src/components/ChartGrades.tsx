import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { DatabaseService } from '../services/databaseService';
import { User, TimeRangeFilter } from '../types';
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
  CheckCircle2,
  Download,
  FileSpreadsheet,
  PieChart
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

Chart.register(...registerables);

interface ChartGradesProps {
  labels?: string[];
  tugas?: number[];
  uts?: number[];
  uas?: number[];
  finalScores?: number[];
  title?: string;
  classId?: string;
  timeRange?: TimeRangeFilter;
  onTimeRangeChange?: (range: TimeRangeFilter) => void;
}

export const ChartGrades: React.FC<ChartGradesProps> = React.memo(({
  labels: propLabels,
  tugas: propTugas,
  uts: propUts,
  uas: propUas,
  finalScores: propFinalScores,
  title = 'Analisis Capaian & Tren Perkembangan Akademik',
  classId = 'class_10_ipa1',
  timeRange: propTimeRange = 'mingguan',
  onTimeRangeChange
}) => {
  const dbService = DatabaseService.getInstance();
  const subjects = useMemo(() => dbService.getAllSubjects(), [dbService]);
  const students = useMemo(() => dbService.getClassStudents(classId), [dbService, classId]);
  const appSettings = useMemo(() => dbService.getAppSettings(), [dbService]);
  const { isDark } = useTheme();

  // Active Time Range State (synced with parent or local)
  const [activeRange, setActiveRange] = useState<TimeRangeFilter>(propTimeRange);

  useEffect(() => {
    if (propTimeRange) {
      setActiveRange(propTimeRange);
    }
  }, [propTimeRange]);

  const handleRangeChange = (newRange: TimeRangeFilter) => {
    setActiveRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  // Filter States
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<'all' | 'Tugas' | 'UTS' | 'UAS' | 'Final'>('all');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  // Auto-refresh listener for real-time Firebase & local database updates
  useEffect(() => {
    const unsub = dbService.subscribeDataChange(() => {
      setRealtimeVersion(v => v + 1);
    });
    return () => unsub();
  }, [dbService]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const prevChartTypeRef = useRef<string>(chartType);

  // Compute dataset based on selected filters with efficient memoization
  const chartData = useMemo(() => {
    const studentNames = students.map((s: User) => s.nama.split(' ')[0]); // Nickname for chart x-axis
    const rawSnapshot = dbService.getRawSnapshot();
    const allGrades = Object.values(rawSnapshot.grades || {});

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

      // Kalkulasi nilai akhir dinamis sesuai rentang waktu aktif
      let fScore = Math.round(avgT * 0.3 + avgU * 0.3 + avgA * 0.4);
      if (activeRange === 'mingguan') {
        // Rentang mingguan: Bobot penuh pada tugas formatif harian & kuis pekan ini
        fScore = avgT;
      } else if (activeRange === 'bulanan') {
        // Rentang bulanan: Evaluasi tugas bulanan (50%) dan UTS / Ulangan Harian (50%)
        fScore = Math.round(avgT * 0.5 + avgU * 0.5);
      } else {
        // Rentang semester: Evaluasi semester penuh (Tugas 30%, UTS 30%, UAS 40%)
        fScore = Math.round(avgT * 0.3 + avgU * 0.3 + avgA * 0.4);
      }

      tugasList.push(avgT);
      utsList.push(avgU);
      uasList.push(avgA);
      finalList.push(fScore);
    });

    const activeFinals = finalList.length > 0 ? finalList : (propFinalScores || [88, 84, 75, 96, 70]);
    const maxScore = Math.max(...activeFinals);
    const minScore = Math.min(...activeFinals);
    const avgScore = Math.round(activeFinals.reduce((a, b) => a + b, 0) / (activeFinals.length || 1));
    const passingCount = activeFinals.filter(s => s >= 75).length;
    const passingRate = Math.round((passingCount / (activeFinals.length || 1)) * 100);

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
  }, [selectedSubjectId, students, propLabels, propTugas, propUts, propUas, propFinalScores, realtimeVersion, activeRange, dbService]);

  // Memoized datasets definition
  const datasets = useMemo(() => {
    const list: any[] = [];
    const isLineOrArea = chartType === 'line' || chartType === 'area';
    const fillOption = chartType === 'area';

    // Label dinamis sesuai rentang waktu aktif
    const tugasLabel = activeRange === 'mingguan' 
      ? 'Tugas Pekan Ini (100%)' 
      : activeRange === 'bulanan' 
        ? 'Tugas Bulanan (50%)' 
        : 'Tugas (30%)';

    const utsLabel = activeRange === 'bulanan' 
      ? 'UTS / Ulangan Bulanan (50%)' 
      : 'UTS (30%)';

    const finalScoreLabel = activeRange === 'mingguan' 
      ? 'Capaian Rata-Rata Pekan Ini' 
      : activeRange === 'bulanan' 
        ? 'Nilai Akhir Bulan Ini' 
        : 'Nilai Akhir Semester (100%)';

    if (selectedComponent === 'all' || selectedComponent === 'Tugas') {
      list.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: tugasLabel,
        data: chartData.tugas,
        backgroundColor: fillOption ? 'rgba(96, 165, 250, 0.25)' : '#60A5FA',
        borderColor: '#3B82F6',
        borderWidth: isLineOrArea ? 2.5 : 1,
        fill: fillOption,
        tension: 0.35,
        borderRadius: 6
      });
    }

    if ((activeRange !== 'mingguan' || selectedComponent === 'UTS') && (selectedComponent === 'all' || selectedComponent === 'UTS')) {
      list.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: utsLabel,
        data: chartData.uts,
        backgroundColor: fillOption ? 'rgba(245, 158, 11, 0.25)' : '#F59E0B',
        borderColor: '#D97706',
        borderWidth: isLineOrArea ? 2.5 : 1,
        fill: fillOption,
        tension: 0.35,
        borderRadius: 6
      });
    }

    if ((activeRange === 'semester' || selectedComponent === 'UAS') && (selectedComponent === 'all' || selectedComponent === 'UAS')) {
      list.push({
        type: isLineOrArea ? 'line' : 'bar',
        label: 'UAS Semester (40%)',
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
      list.push({
        type: 'line',
        label: finalScoreLabel,
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

    return list;
  }, [chartType, activeRange, selectedComponent, chartData.tugas, chartData.uts, chartData.uas, chartData.finalScores]);

  // Efficient Chart.js Lifecycle Management (In-Place Update without destruction flicker)
  useEffect(() => {
    if (!canvasRef.current) return;

    const isDarkMode = typeof document !== 'undefined' 
      ? document.documentElement.classList.contains('dark') 
      : isDark;
    const yTickColor = isDarkMode ? '#CBD5E1' : '#0F172A';
    const xLabelColor = isDarkMode ? '#F8FAFC' : '#0F172A';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0';
    const legendColor = isDarkMode ? '#F8FAFC' : '#0F172A';

    // If chart instance exists and chartType is unchanged, update datasets in place for smooth performance
    if (chartInstanceRef.current && prevChartTypeRef.current === chartType) {
      chartInstanceRef.current.data.labels = chartData.labels;
      chartInstanceRef.current.data.datasets = datasets;
      if (chartInstanceRef.current.options.plugins?.legend?.labels) {
        chartInstanceRef.current.options.plugins.legend.labels.color = legendColor;
      }
      if (chartInstanceRef.current.options.scales?.y?.ticks) {
        chartInstanceRef.current.options.scales.y.ticks.color = yTickColor;
      }
      if (chartInstanceRef.current.options.scales?.x?.ticks) {
        chartInstanceRef.current.options.scales.x.ticks.color = xLabelColor;
      }
      chartInstanceRef.current.update();
      return;
    }

    prevChartTypeRef.current = chartType;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    Chart.defaults.color = isDarkMode ? '#F8FAFC' : '#0F172A';
    Chart.defaults.borderColor = gridColor;

    chartInstanceRef.current = new Chart(ctx, {
      type: chartType === 'bar' ? 'bar' : 'line',
      data: {
        labels: chartData.labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 350
        },
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
        chartInstanceRef.current = null;
      }
    };
  }, [chartData.labels, datasets, chartType, isDark]);

  const exportVisualAnalysisPDF = () => {
    if (!canvasRef.current) {
      Swal.fire({
        icon: 'warning',
        title: 'Grafik Belum Siap',
        text: 'Silakan tunggu beberapa saat hingga grafik Chart.js selesai dirender.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsExportingPDF(true);

    try {
      const canvas = canvasRef.current;
      const chartImgData = canvas.toDataURL('image/png', 1.0);

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const currentSubjectName =
        selectedSubjectId === 'all'
          ? 'Semua Mata Pelajaran (Rata-rata Komprehensif)'
          : subjects.find((s) => s.id === selectedSubjectId)?.nama_mapel || 'Mata Pelajaran';

      // 1. Header Banner
      doc.setFillColor(30, 58, 138); // Indigo / Blue 900
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(
        `${appSettings.appName.toUpperCase()} — LAPORAN ANALISIS PERFORMA KELAS (CHART.JS)`,
        14,
        11
      );

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${appSettings.appDescription || 'Sistem Informasi Manajemen Kelas'} • Tanggal Terbit: ${today}`,
        14,
        18
      );

      // 2. Metadata Info Strip
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Mata Pelajaran: ${currentSubjectName}`, 14, 32);
      doc.text(
        `Fokus Penilaian: ${
          selectedComponent === 'all'
            ? 'Semua Komponen (Tugas 30%, UTS 30%, UAS 40%)'
            : selectedComponent
        }`,
        150,
        32
      );

      // 3. KPI Statistics Cards in PDF
      const stats = chartData.stats;
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.roundedRect(14, 36, 62, 16, 2, 2, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('RATA-RATA KELAS', 18, 41);
      doc.setFontSize(12);
      doc.text(`${stats.avgScore} / 100`, 18, 48);

      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.roundedRect(82, 36, 62, 16, 2, 2, 'F');
      doc.setTextColor(6, 78, 59);
      doc.setFontSize(8);
      doc.text('NILAI TERTINGGI', 86, 41);
      doc.setFontSize(12);
      doc.text(`${stats.maxScore}`, 86, 48);

      doc.setFillColor(254, 242, 242); // Rose-50
      doc.roundedRect(150, 36, 62, 16, 2, 2, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(8);
      doc.text('NILAI TERENDAH', 154, 41);
      doc.setFontSize(12);
      doc.text(`${stats.minScore}`, 154, 48);

      doc.setFillColor(250, 245, 255); // Purple-50
      doc.roundedRect(218, 36, 65, 16, 2, 2, 'F');
      doc.setTextColor(88, 28, 135);
      doc.setFontSize(8);
      doc.text('KETUNTASAN BELAJAR (≥75)', 222, 41);
      doc.setFontSize(12);
      doc.text(`${stats.passingRate}%`, 222, 48);

      // 4. Render Embedded High-Res Chart.js Image
      doc.addImage(chartImgData, 'PNG', 14, 56, 175, 95);

      // 5. Render Breakdown AutoTable to the right of the chart
      const tableData = chartData.labels.map((name, idx) => {
        const t = chartData.tugas[idx] ?? 0;
        const u = chartData.uts[idx] ?? 0;
        const a = chartData.uas[idx] ?? 0;
        const finalS = chartData.finalScores[idx] ?? 0;
        let pred = 'D';
        if (finalS >= 88) pred = 'A';
        else if (finalS >= 78) pred = 'B';
        else if (finalS >= 68) pred = 'C';
        const status = finalS >= 75 ? 'Tuntas' : 'Remedial';

        return [name, t.toString(), u.toString(), a.toString(), finalS.toString(), pred, status];
      });

      autoTable(doc, {
        head: [['Nama', 'Tugas', 'UTS', 'UAS', 'Akhir', 'Pred', 'Status']],
        body: tableData,
        startY: 56,
        margin: { left: 195, right: 14 },
        tableWidth: 88,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 24 },
          1: { halign: 'center', cellWidth: 10 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 11 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 9 },
          6: { halign: 'center', cellWidth: 14 }
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8
        }
      });

      // 6. Signature Footer Block
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Mengetahui & Mengesahkan,', 220, 168);
      doc.text('Guru Pengampu / Wali Kelas', 220, 173);
      doc.text('( .................................................... )', 220, 192);

      const fileName = `Analisis_Grafik_Nilai_${currentSubjectName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);

      Swal.fire({
        icon: 'success',
        title: 'PDF Analisis Visual Berhasil Diunduh!',
        text: 'Laporan diagram grafik performa kelas Chart.js dan tabel capaian telah disimpan.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Export Visual PDF error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengekspor PDF',
        text: err.message || 'Terjadi kesalahan teknis saat membuat dokumen PDF visual.'
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Interactive Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {title}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              activeRange === 'mingguan' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
              activeRange === 'bulanan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
              'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
            }`}>
              <Calendar className="w-3 h-3" />
              {activeRange === 'mingguan' ? 'Pekan Berjalan' : activeRange === 'bulanan' ? 'Bulan Berjalan' : 'Semester Ganjil 2025/2026'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
            {activeRange === 'mingguan'
              ? 'Memantau capaian tugas dan kuis formatif harian pekan berjalan.'
              : activeRange === 'bulanan'
              ? 'Evaluasi berkala akumulasi tugas bulanan (50%) dan ulangan bulanan/UTS (50%).'
              : 'Rekapitulasi komprehensif semester ganjil (Tugas 30%, UTS 30%, UAS 40%).'}
          </p>
        </div>

        {/* Filter Controls Bar & PDF Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Rentang Waktu (Mingguan, Bulanan, Semester) */}
          <div className="flex items-center gap-1.5 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={activeRange}
              onChange={(e) => handleRangeChange(e.target.value as TimeRangeFilter)}
              className="bg-transparent font-bold text-indigo-950 dark:text-indigo-200 outline-none text-xs cursor-pointer"
            >
              <option value="mingguan" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Rentang: Mingguan</option>
              <option value="bulanan" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Rentang: Bulanan</option>
              <option value="semester" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Rentang: Semester</option>
            </select>
          </div>

          {/* PDF Export Button for Visual Chart */}
          <button
            onClick={exportVisualAnalysisPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Ekspor Diagram Grafis Chart.js dan Analisis Performa ke Dokumen PDF"
          >
            {isExportingPDF ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPDF ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
          </button>

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
              <option value="Tugas" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {activeRange === 'mingguan' ? 'Tugas Saja (100%)' : activeRange === 'bulanan' ? 'Tugas Saja (50%)' : 'Tugas Saja (30%)'}
              </option>
              <option value="UTS" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {activeRange === 'bulanan' ? 'UTS / Bulanan (50%)' : 'UTS Saja (30%)'}
              </option>
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
});

ChartGrades.displayName = 'ChartGrades';

