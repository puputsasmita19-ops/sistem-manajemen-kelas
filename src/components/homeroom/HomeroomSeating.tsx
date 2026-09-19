import React, { useState } from 'react';
import {
  Grid,
  Users,
  Printer,
  Edit3,
  RotateCcw,
  Sparkles,
  ArrowDownUp,
  Check,
  UserCheck
} from 'lucide-react';
import { SeatingLayout, DeskPosition } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomSeatingProps {
  classId: string;
  className: string;
  layout: SeatingLayout;
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomSeating: React.FC<HomeroomSeatingProps> = ({
  classId,
  className,
  layout,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [selectedDesk, setSelectedDesk] = useState<DeskPosition | null>(null);
  const [student1, setStudent1] = useState('');
  const [student2, setStudent2] = useState('');

  const handleEditDesk = (desk: DeskPosition) => {
    setSelectedDesk(desk);
    setStudent1(desk.student1Name || '');
    setStudent2(desk.student2Name || '');
  };

  const handleSaveDesk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesk) return;

    const updatedDesks = layout.desks.map(d => {
      if (d.deskNumber === selectedDesk.deskNumber) {
        return {
          ...d,
          student1Name: student1,
          student2Name: student2
        };
      }
      return d;
    });

    const newLayout: SeatingLayout = {
      ...layout,
      desks: updatedDesks,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    service.updateSeatingLayout(classId, newLayout);
    setSelectedDesk(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 text-xs font-black">
              MENU 4
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Denah Tempat Duduk Ruang ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Peta visual formasi meja siswa berpasangan dan meja pendidik di depan kelas
          </p>
        </div>

        <button
          type="button"
          onClick={() => HomeroomPdfExporter.exportSeatingPDF(className, layout)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Denah</span>
        </button>
      </div>

      {/* Classroom Canvas Representation */}
      <div className="bg-slate-50 dark:bg-slate-900/70 border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-3xl space-y-6">
        {/* FRONT OF CLASS: Whiteboard & Teacher Desk */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-slate-200 dark:border-slate-800 pb-5">
          {/* Teacher Desk */}
          <div className="w-full md:w-56 p-3 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl text-center shadow-xs">
            <span className="text-[10px] font-black tracking-wider uppercase text-amber-800 dark:text-amber-300 block">
              MEJA GURU / WALI KELAS
            </span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              Budi Santoso, S.Pd
            </p>
            <span className="text-[9px] text-amber-700 dark:text-amber-400">Posisi: Kiri Depan Kelas</span>
          </div>

          {/* Whiteboard / Papan Tulis */}
          <div className="flex-1 w-full max-w-lg py-3 px-6 bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded-2xl text-center shadow-xs">
            <span className="text-xs font-black tracking-widest uppercase text-slate-700 dark:text-slate-300 block">
              PAPAN TULIS UTAMA (WHITEBOARD) & LAYAR PROYEKTOR
            </span>
            <span className="text-[10px] text-slate-400 font-mono">ARAH PANDANG SISWA ⬆️</span>
          </div>

          {/* Pintu Masuk */}
          <div className="w-full md:w-36 py-2 px-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-slate-400">
            🚪 Pintu Masuk
          </div>
        </div>

        {/* Student Desk Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {layout.desks.map((desk) => (
            <div
              key={desk.deskNumber}
              className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black">
                  MEJA #{desk.deskNumber} (Baris {desk.row})
                </span>
                <button
                  type="button"
                  onClick={() => handleEditDesk(desk)}
                  className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Ubah Siswa</span>
                </button>
              </div>

              {/* Pair of Student Chairs */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Chair 1 */}
                <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center min-h-[70px] ${
                  desk.student1Name
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                    : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Kursi Kiri
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {desk.student1Name || '(Kosong)'}
                  </p>
                </div>

                {/* Chair 2 */}
                <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center min-h-[70px] ${
                  desk.student2Name
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Kursi Kanan
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {desk.student2Name || '(Kosong)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back of Classroom */}
        <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-medium">
          ⬇️ AREA BELAKANG KELAS • MADING KELAS & LEMARI ALAT KEBERSIHAN ⬇️
        </div>
      </div>

      {/* Edit Desk Modal */}
      {selectedDesk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Atur Siswa di Meja #{selectedDesk.deskNumber}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedDesk(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveDesk} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nama Siswa 1 (Kursi Kiri)
                </label>
                <input
                  type="text"
                  value={student1}
                  onChange={e => setStudent1(e.target.value)}
                  placeholder="Ketik nama siswa atau pilih..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  list="students-datalist"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nama Siswa 2 (Kursi Kanan)
                </label>
                <input
                  type="text"
                  value={student2}
                  onChange={e => setStudent2(e.target.value)}
                  placeholder="Ketik nama siswa rekan sebangku..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  list="students-datalist"
                />
              </div>

              <datalist id="students-datalist">
                {studentList.map(s => (
                  <option key={s.id} value={s.nama} />
                ))}
              </datalist>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDesk(null)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Denah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
