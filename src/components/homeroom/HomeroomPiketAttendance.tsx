import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Calendar,
  Award
} from 'lucide-react';
import { PiketAttendanceRecord } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomPiketAttendanceProps {
  classId: string;
  className: string;
  piketAttendanceLogs: PiketAttendanceRecord[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomPiketAttendance: React.FC<HomeroomPiketAttendanceProps> = ({
  classId,
  className,
  piketAttendanceLogs,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [day, setDay] = useState('Senin');
  const [cleanlinessScore, setCleanlinessScore] = useState(90);
  const [inspectorName, setInspectorName] = useState('Budi Santoso, S.Pd (Wali Kelas)');
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [student1, setStudent1] = useState('');
  const [student2, setStudent2] = useState('');
  const [status1, setStatus1] = useState<'Melaksanakan' | 'Tidak Melaksanakan' | 'Izin'>('Melaksanakan');
  const [status2, setStatus2] = useState<'Melaksanakan' | 'Tidak Melaksanakan' | 'Izin'>('Melaksanakan');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student1) return;

    const attendees: PiketAttendanceRecord['attendanceList'] = [
      {
        studentId: 'pstd_1',
        studentName: student1,
        status: status1
      }
    ];

    if (student2) {
      attendees.push({
        studentId: 'pstd_2',
        studentName: student2,
        status: status2
      });
    }

    service.addPiketAttendance(classId, {
      date,
      day,
      cleanlinessScore: Number(cleanlinessScore),
      inspectorName,
      attendanceList: attendees,
      evaluationNotes: evaluationNotes || 'Kelas dalam kondisi bersih dan terawat.'
    });

    setShowAddModal(false);
    setEvaluationNotes('');
    setStudent1('');
    setStudent2('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Rekap Absensi Piket?',
      text: 'Catatan presensi piket ini akan dihapus dari riwayat.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#65a30d',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deletePiketAttendance(classId, id);
        onRefresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-100 dark:bg-lime-950/70 text-lime-800 dark:text-lime-300 text-xs font-black">
              MENU 10
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Absensi & Jurnal Piket Harian ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan realisasi kehadiran regu kerja piket kebersihan dan penilaian skor kebersihan ruang
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportPiketAttendancePDF(className, piketAttendanceLogs)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-lime-700 hover:bg-lime-800 rounded-xl flex items-center gap-1.5 shadow-xs shadow-lime-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Absensi Piket</span>
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-3">
        {piketAttendanceLogs.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-lime-100 dark:bg-lime-950 text-lime-800 dark:text-lime-300 text-xs font-black">
                  {item.day}, {item.date}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Pemeriksa: <strong>{item.inspectorName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Skor Kebersihan: <strong>{item.cleanlinessScore}/100</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                  title="Hapus rekaman"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of Attendees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {item.attendanceList.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {att.studentName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black ${
                      att.status === 'Melaksanakan'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : att.status === 'Izin'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {att.status === 'Melaksanakan' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>{att.status}</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl italic">
              "{item.evaluationNotes}"
            </p>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Kehadiran Regu Piket
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Hari</label>
                  <select
                    value={day}
                    onChange={e => setDay(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                  </select>
                </div>
              </div>

              {/* Student 1 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Petugas Piket 1</label>
                  <input
                    type="text"
                    value={student1}
                    onChange={e => setStudent1(e.target.value)}
                    placeholder="Nama siswa..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    list="piket-students"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status1}
                    onChange={e => setStatus1(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Melaksanakan">Melaksanakan</option>
                    <option value="Tidak Melaksanakan">Tidak Melaksanakan</option>
                    <option value="Izin">Izin</option>
                  </select>
                </div>
              </div>

              {/* Student 2 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Petugas Piket 2</label>
                  <input
                    type="text"
                    value={student2}
                    onChange={e => setStudent2(e.target.value)}
                    placeholder="Nama siswa (opsional)..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    list="piket-students"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status2}
                    onChange={e => setStatus2(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Melaksanakan">Melaksanakan</option>
                    <option value="Tidak Melaksanakan">Tidak Melaksanakan</option>
                    <option value="Izin">Izin</option>
                  </select>
                </div>
              </div>

              <datalist id="piket-students">
                {studentList.map(s => (
                  <option key={s.id} value={s.nama} />
                ))}
              </datalist>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Skor Kebersihan (1-100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={cleanlinessScore}
                    onChange={e => setCleanlinessScore(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Pemeriksa</label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Catatan Evaluasi</label>
                <input
                  type="text"
                  value={evaluationNotes}
                  onChange={e => setEvaluationNotes(e.target.value)}
                  placeholder="Kondisi papan tulis, jendela, aroma ruangan..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-lime-700 hover:bg-lime-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
