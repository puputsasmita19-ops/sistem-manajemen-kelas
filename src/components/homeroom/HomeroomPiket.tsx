import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  Edit3,
  Printer,
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';
import { PiketScheduleItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomPiketProps {
  classId: string;
  className: string;
  piketSchedules: PiketScheduleItem[];
  onRefresh: () => void;
}

export const HomeroomPiket: React.FC<HomeroomPiketProps> = ({
  classId,
  className,
  piketSchedules,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [editingItem, setEditingItem] = useState<PiketScheduleItem | null>(null);
  const [editNames, setEditNames] = useState('');
  const [editZone, setEditZone] = useState('');

  const handleStartEdit = (item: PiketScheduleItem) => {
    setEditingItem(item);
    setEditNames(item.studentNames.join(', '));
    setEditZone(item.zoneDuties);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const namesArray = editNames
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updated = piketSchedules.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          studentNames: namesArray,
          zoneDuties: editZone
        };
      }
      return item;
    });

    service.updatePiketSchedules(classId, updated);
    setEditingItem(null);
    onRefresh();
  };

  const dayBadges: Record<string, { bg: string; text: string; border: string }> = {
    Senin: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    Selasa: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    Rabu: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    Kamis: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    Jumat: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              MENU 2
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Piket Kebersihan ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Jadwal pembagian regu kerja kebersihan ruang kelas, teras, jendela, dan papan tulis
          </p>
        </div>

        <button
          type="button"
          onClick={() => HomeroomPdfExporter.exportPiketPDF(className, piketSchedules)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Jadwal Piket</span>
        </button>
      </div>

      {/* Info Banner Standard Piket */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Standar Operasional Kebersihan Kelas:</span>
          <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
            Regu piket wajib hadir 15 menit sebelum bel masuk pagi (06.45 WIB) dan merapikan kelas 15 menit sesudah pulang sekolah. Memastikan papan tulis terhapus bersih, spidol siap pakai, tempat sampah kosong, dan jendela tertutup rapi.
          </p>
        </div>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {piketSchedules.map((item) => {
          const style = dayBadges[item.day] || {
            bg: 'bg-slate-50',
            text: 'text-slate-700',
            border: 'border-slate-200'
          };

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${style.bg} ${style.border}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${style.text}`} />
                    <h4 className={`text-sm font-black uppercase tracking-wider ${style.text}`}>
                      {item.day}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
                    title="Edit anggota piket hari ini"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Petugas Piket */}
                <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Petugas Piket ({item.studentNames.length} Orang)</span>
                  </div>
                  <ul className="space-y-1.5">
                    {item.studentNames.map((name, i) => (
                      <li
                        key={i}
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-black flex items-center justify-center text-slate-600 dark:text-slate-300">
                          {i + 1}
                        </span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Area Tugas */}
                <div className="bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Zona & Tugas Khusus:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {item.zoneDuties}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Regu Terjadwal
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Aktif</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Ubah Petugas Piket Hari {editingItem.day}
              </h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Daftar Nama Siswa (Pisahkan dengan koma)
                </label>
                <textarea
                  rows={3}
                  value={editNames}
                  onChange={e => setEditNames(e.target.value)}
                  placeholder="Contoh: Ahmad Rizky, Dewi Lestari, Bayu Saputra"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Zona & Pembagian Tugas
                </label>
                <input
                  type="text"
                  value={editZone}
                  onChange={e => setEditZone(e.target.value)}
                  placeholder="Contoh: Menyapu lantai, bersihkan papan tulis & jendela"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
