import React from 'react';
import {
  Users,
  PieChart,
  BarChart3,
  Heart,
  TrendingUp,
  Award,
  Wallet,
  Compass,
  Bus,
  School,
  Printer
} from 'lucide-react';
import { StudentIdentityItem } from '../../types/homeroom';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomStatisticsProps {
  className: string;
  identities: StudentIdentityItem[];
}

export const HomeroomStatistics: React.FC<HomeroomStatisticsProps> = ({
  className,
  identities = []
}) => {
  const safeList = identities || [];
  const total = safeList.length;

  // Gender
  const maleCount = safeList.filter(i => i.gender === 'L').length;
  const femaleCount = safeList.filter(i => i.gender === 'P').length;
  const malePct = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((femaleCount / total) * 100) : 0;

  // Economic status
  const kipCount = safeList.filter(i => (i.economicStatus || '').includes('KIP') || (i.economicStatus || '').includes('PIP')).length;
  const mampuCount = safeList.filter(i => (i.economicStatus || '') === 'Mampu').length;

  // Distance average
  const totalKm = safeList.reduce((acc, i) => acc + (i.distanceToSchoolKm || 0), 0);
  const avgKm = total > 0 ? (totalKm / total).toFixed(1) : '0';

  // Transportation breakdown
  const transportCounts: Record<string, number> = {};
  safeList.forEach(i => {
    const tr = i.transportation || 'Lainnya';
    transportCounts[tr] = (transportCounts[tr] || 0) + 1;
  });

  // Blood types
  const bloodCounts: Record<string, number> = {};
  safeList.forEach(i => {
    const bt = i.bloodType || 'Tidak Tahu';
    bloodCounts[bt] = (bloodCounts[bt] || 0) + 1;
  });

  // Religions
  const religionCounts: Record<string, number> = {};
  safeList.forEach(i => {
    const rel = i.religion || 'Lainnya';
    religionCounts[rel] = (religionCounts[rel] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-black">
              MENU 5
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Statistik & Demografi Siswa ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analisis data demografis, latar belakang sosial-ekonomi, dan profil kesehatan peserta didik
          </p>
        </div>

        <button
          type="button"
          onClick={() => HomeroomPdfExporter.exportStatisticsPDF(className, { studentIdentities: safeList })}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Laporan Statistik</span>
        </button>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Siswa</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {total} <span className="text-xs font-normal text-slate-400">Orang</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            100% terdata dalam buku induk
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gender (L / P)</span>
            <PieChart className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {maleCount} <span className="text-sm font-bold text-blue-600">L</span> : {femaleCount}{' '}
            <span className="text-sm font-bold text-rose-500">P</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {malePct}% Laki-laki, {femalePct}% Perempuan
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Penerima KIP / PIP</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {kipCount} <span className="text-xs font-normal text-slate-400">Siswa</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Bantuan Program Indonesia Pintar
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rata-rata Jarak</span>
            <Compass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {avgKm} <span className="text-xs font-normal text-slate-400">Km</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Jarak tempuh rumah ke sekolah
          </p>
        </div>
      </div>

      {/* Visual Detailed Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gender Breakdown Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Komposisi Jenis Kelamin</span>
          </h4>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${malePct}%` }}
              className="bg-blue-600 h-full flex items-center justify-center text-[9px] font-bold text-white"
            >
              {malePct > 15 ? `${malePct}% L` : ''}
            </div>
            <div
              style={{ width: `${femalePct}%` }}
              className="bg-rose-500 h-full flex items-center justify-center text-[9px] font-bold text-white"
            >
              {femalePct > 15 ? `${femalePct}% P` : ''}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Laki-laki: <strong>{maleCount} ({malePct}%)</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Perempuan: <strong>{femaleCount} ({femalePct}%)</strong></span>
            </div>
          </div>
        </div>

        {/* Transportation Distribution */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Moda Transportasi ke Sekolah</span>
          </h4>
          <div className="space-y-2">
            {Object.entries(transportCounts).map(([mode, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={mode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{mode}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{count} siswa ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-indigo-500 h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blood Types */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Distribusi Golongan Darah</span>
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {['A', 'B', 'AB', 'O'].map(bt => {
              const count = bloodCounts[bt] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={bt} className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60">
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">Gol. {bt}</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {count}
                  </div>
                  <span className="text-[10px] text-slate-400">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Ekonomi & Bantuan */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Status Sosial Ekonomi Peserta Didik</span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Keluarga Mampu</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{mampuCount} Siswa</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Penerima KIP / PIP / Afirmasi</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{kipCount} Siswa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
