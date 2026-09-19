import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Home,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Calendar,
  HeartHandshake,
  PhoneCall
} from 'lucide-react';
import { HomeVisitItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomHomeVisitsProps {
  classId: string;
  className: string;
  homeVisits: HomeVisitItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomHomeVisits: React.FC<HomeroomHomeVisitsProps> = ({
  classId,
  className,
  homeVisits,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<HomeVisitItem | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [parentOrGuardianMet, setParentOrGuardianMet] = useState('');
  const [address, setAddress] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState<HomeVisitItem['reasonForVisit']>('Silaturahmi Rutin');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [parentCommitment, setParentCommitment] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [visitingTeachers, setVisitingTeachers] = useState('Budi Santoso, S.Pd (Wali Kelas)');
  const [status, setStatus] = useState<HomeVisitItem['status']>('Selesai');

  const filtered = homeVisits.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      v.studentName.toLowerCase().includes(q) ||
      v.parentOrGuardianMet.toLowerCase().includes(q) ||
      v.reasonForVisit.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q) ||
      v.discussionSummary.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !parentOrGuardianMet) return;

    service.addHomeVisit(classId, {
      date,
      studentId: `std_${Date.now()}`,
      studentName,
      address: address || 'Alamat domisili tempat tinggal siswa',
      parentOrGuardianMet,
      reasonForVisit,
      discussionSummary: discussionSummary || 'Silaturahmi dan koordinasi perkembangan belajar siswa di kelas.',
      parentCommitment: parentCommitment || 'Orang tua berkomitmen mendampingi belajar anak di rumah.',
      followUpPlan: followUpPlan || 'Pemantauan berkala kehadiran di kelas oleh wali kelas.',
      visitingTeachers: visitingTeachers || 'Wali Kelas',
      status
    });

    setShowAddModal(false);
    setStudentName('');
    setParentOrGuardianMet('');
    setAddress('');
    setDiscussionSummary('');
    setParentCommitment('');
    setFollowUpPlan('');
    onRefresh();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    service.updateHomeVisit(classId, editingItem);
    setEditingItem(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Laporan Home Visit?',
      text: 'Dokumentasi kunjungan rumah siswa ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#047857',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteHomeVisit(classId, id);
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
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-black">
              MENU 17
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buku Kunjungan Rumah / Home Visit ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasi silaturahmi ke rumah siswa, temuan kondisi keluarga, komitmen orang tua, dan rencana tindak lanjut kolaboratif
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportHomeVisitsPDF(className, homeVisits)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Home Visit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Kunjungan</span>
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
          placeholder="Cari nama siswa, orang tua, alasan kunjungan, atau alamat..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Home Visit Cards */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                    {item.date}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.studentName}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    (Bertemu: <strong>{item.parentOrGuardianMet}</strong>)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {item.reasonForVisit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      item.status === 'Selesai'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.status === 'Perlu Kunjungan Lanjutan'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {item.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...item })}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                    title="Edit laporan"
                  >
                    <HeartHandshake className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Hapus laporan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{item.address}</span>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Hasil Diskusi & Temuan Masalah:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{item.discussionSummary}</p>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Komitmen / Kesepakatan Orang Tua:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{item.parentCommitment}</p>
                </div>

                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                    Rencana Tindak Lanjut Sekolah:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{item.followUpPlan}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Guru yang Berkunjung: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.visitingTeachers}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada catatan kunjungan rumah (home visit).
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Kunjungan Rumah (Home Visit)
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
                    list="hv-students"
                    required
                  />
                  <datalist id="hv-students">
                    {studentList.map(s => (
                      <option key={s.id} value={s.nama} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Orang Tua / Wali yang Ditemui</label>
                  <input
                    type="text"
                    value={parentOrGuardianMet}
                    onChange={e => setParentOrGuardianMet(e.target.value)}
                    placeholder="Contoh: Ibu Siti (Ibu Kandung)"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Alasan Kunjungan</label>
                  <select
                    value={reasonForVisit}
                    onChange={e => setReasonForVisit(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Silaturahmi Rutin">Silaturahmi Rutin</option>
                    <option value="Ketidakhadiran Berturut-turut">Ketidakhadiran Berturut-turut</option>
                    <option value="Kesehatan / Sakit Lama">Kesehatan / Sakit Lama</option>
                    <option value="Prestasi & Bimbingan Khusus">Prestasi & Bimbingan Khusus</option>
                    <option value="Masalah Disiplin">Masalah Disiplin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Alamat Tempat Tinggal</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Alamat lengkap rumah siswa..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian Hasil Diskusi & Masalah
                </label>
                <textarea
                  rows={2}
                  value={discussionSummary}
                  onChange={e => setDiscussionSummary(e.target.value)}
                  placeholder="Temuan suasana keluarga, kendala belajar di rumah..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Komitmen & Kesepakatan Orang Tua
                </label>
                <textarea
                  rows={2}
                  value={parentCommitment}
                  onChange={e => setParentCommitment(e.target.value)}
                  placeholder="Pernyataan dan komitmen orang tua..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Rencana Tindak Lanjut
                </label>
                <input
                  type="text"
                  value={followUpPlan}
                  onChange={e => setFollowUpPlan(e.target.value)}
                  placeholder="Pendampingan guru BK, cek presensi mingguan..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Guru yang Berkunjung</label>
                  <input
                    type="text"
                    value={visitingTeachers}
                    onChange={e => setVisitingTeachers(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Tindak Lanjut</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Perlu Kunjungan Lanjutan">Perlu Kunjungan Lanjutan</option>
                    <option value="Dalam Pantauan">Dalam Pantauan</option>
                  </select>
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Kunjungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Perbarui Catatan ({editingItem.studentName})
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
                <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={editingItem.status}
                  onChange={e =>
                    setEditingItem({
                      ...editingItem,
                      status: e.target.value as any
                    })
                  }
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="Selesai">Selesai</option>
                  <option value="Perlu Kunjungan Lanjutan">Perlu Kunjungan Lanjutan</option>
                  <option value="Dalam Pantauan">Dalam Pantauan</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Rencana Tindak Lanjut Terbaru
                </label>
                <textarea
                  rows={3}
                  value={editingItem.followUpPlan}
                  onChange={e =>
                    setEditingItem({
                      ...editingItem,
                      followUpPlan: e.target.value
                    })
                  }
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
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
