import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserX,
  PhoneCall
} from 'lucide-react';
import { StudentCaseItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomCasesProps {
  classId: string;
  className: string;
  cases: StudentCaseItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomCases: React.FC<HomeroomCasesProps> = ({
  classId,
  className,
  cases,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentCaseItem | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [chronology, setChronology] = useState('');
  const [incidentCategory, setIncidentCategory] = useState<StudentCaseItem['incidentCategory']>('Keterlambatan');
  const [severity, setSeverity] = useState<StudentCaseItem['severity']>('Ringan');
  const [penaltyPoints, setPenaltyPoints] = useState(5);
  const [actionTaken, setActionTaken] = useState('');
  const [parentSummoned, setParentSummoned] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<StudentCaseItem['resolutionStatus']>('Selesai');

  const filtered = cases.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.studentName.toLowerCase().includes(q) ||
      c.chronology.toLowerCase().includes(q) ||
      c.incidentCategory.toLowerCase().includes(q) ||
      c.actionTaken.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !chronology) return;

    service.addStudentCase(classId, {
      date,
      studentId: `std_${Date.now()}`,
      studentName,
      chronology,
      incidentCategory,
      severity,
      penaltyPoints: Number(penaltyPoints),
      actionTaken: actionTaken || 'Teguran lisan dan pembinaan karakter oleh wali kelas.',
      parentSummoned,
      resolutionStatus
    });

    setShowAddModal(false);
    setStudentName('');
    setChronology('');
    setActionTaken('');
    setPenaltyPoints(5);
    setParentSummoned(false);
    onRefresh();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    service.updateStudentCase(classId, editingItem);
    setEditingItem(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Catatan Kasus?',
      text: 'Catatan pelanggaran disiplin siswa ini akan dihapus dari buku kasus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteStudentCase(classId, id);
        onRefresh();
      }
    });
  };

  const severityBadge = (sev: StudentCaseItem['severity']) => {
    switch (sev) {
      case 'Ringan':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'Sedang':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'Berat':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-xs font-black">
              MENU 15
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buku Catatan Kasus & Kejadian Khusus ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasi pelanggaran tata tertib, poin pelanggaran, kronologi kejadian, pembinaan wali kelas & panggilan orang tua
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportCasesPDF(className, cases)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Kasus</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-rose-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Kasus Baru</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama siswa, kategori kejadian, atau kronologi pelanggaran..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 hover:border-rose-300 dark:hover:border-rose-800 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">{item.date}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      {item.incidentCategory}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${severityBadge(item.severity)}`}>
                      {item.severity} (+{item.penaltyPoints} Poin)
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.studentName}
                  </h4>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    item.resolutionStatus === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.resolutionStatus === 'Dirujuk ke Guru BK'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {item.resolutionStatus}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                    Kronologi Kejadian / Pelanggaran:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{item.chronology}</p>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tindakan & Pembinaan yang Diberikan:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{item.actionTaken}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <div className="flex items-center gap-1">
                    {item.parentSummoned ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <PhoneCall className="w-3 h-3" />
                        Orang Tua Telah Dipanggil
                      </span>
                    ) : (
                      <span>Pembinaan Internal Wali Kelas</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem({ ...item })}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition"
                >
                  Edit Status
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                  title="Hapus kasus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            Belum ada catatan kasus kedisiplinan yang tercatat.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Kejadian Khusus / Kasus Siswa
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Nama siswa..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    list="cases-student-list"
                    required
                  />
                  <datalist id="cases-student-list">
                    {studentList.map(s => (
                      <option key={s.id} value={s.nama} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kategori</label>
                  <select
                    value={incidentCategory}
                    onChange={e => setIncidentCategory(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Keterlambatan">Keterlambatan</option>
                    <option value="Kerapian / Seragam">Kerapian / Seragam</option>
                    <option value="Bolos / Tidak Masuk">Bolos / Tidak Masuk</option>
                    <option value="HP / Gadget">HP / Gadget</option>
                    <option value="Perkelahian / Konflik">Perkelahian / Konflik</option>
                    <option value="Tindakan Lainnya">Tindakan Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tingkat</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Poin Pelanggaran</label>
                  <input
                    type="number"
                    value={penaltyPoints}
                    onChange={e => setPenaltyPoints(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Kronologi Kejadian
                </label>
                <textarea
                  rows={2}
                  value={chronology}
                  onChange={e => setChronology(e.target.value)}
                  placeholder="Uraian kejadian, saksi, dan situasi..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Tindakan & Bentuk Pembinaan
                </label>
                <textarea
                  rows={2}
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  placeholder="Teguran lisan, tugas mendidik, pembuatan komitmen..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Tindak Lanjut</label>
                  <select
                    value={resolutionStatus}
                    onChange={e => setResolutionStatus(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Dalam Pembinaan">Dalam Pembinaan</option>
                    <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
                    <option value="Surat Peringatan (SP)">Surat Peringatan (SP)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="parentSummoned"
                    checked={parentSummoned}
                    onChange={e => setParentSummoned(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="parentSummoned" className="font-bold text-slate-700 dark:text-slate-300">
                    Panggil Orang Tua
                  </label>
                </div>
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Kasus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Perbarui Kasus ({editingItem.studentName})
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
                <label className="font-bold text-slate-700 dark:text-slate-300">Status Penyelesaian</label>
                <select
                  value={editingItem.resolutionStatus}
                  onChange={e =>
                    setEditingItem({
                      ...editingItem,
                      resolutionStatus: e.target.value as any
                    })
                  }
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="Selesai">Selesai</option>
                  <option value="Dalam Pembinaan">Dalam Pembinaan</option>
                  <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
                  <option value="Surat Peringatan (SP)">Surat Peringatan (SP)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Perkembangan & Tindak Lanjut Terakhir
                </label>
                <textarea
                  rows={3}
                  value={editingItem.actionTaken}
                  onChange={e =>
                    setEditingItem({
                      ...editingItem,
                      actionTaken: e.target.value
                    })
                  }
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editParentSummoned"
                  checked={editingItem.parentSummoned}
                  onChange={e =>
                    setEditingItem({
                      ...editingItem,
                      parentSummoned: e.target.checked
                    })
                  }
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="editParentSummoned" className="font-bold text-slate-700 dark:text-slate-300">
                  Status Pemanggilan Orang Tua
                </label>
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
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
