import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  Printer,
  Search,
  UserPlus,
  UserMinus,
  FileText,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { StudentMutationItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomMutationProps {
  classId: string;
  className: string;
  mutations: StudentMutationItem[];
  onRefresh: () => void;
}

export const HomeroomMutation: React.FC<HomeroomMutationProps> = ({
  classId,
  className,
  mutations,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [nisn, setNisn] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [type, setType] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [schoolDestinationOrOrigin, setSchoolDestinationOrOrigin] = useState('');
  const [reason, setReason] = useState('');
  const [letterNumber, setLetterNumber] = useState('');
  const [statusDocument, setStatusDocument] = useState<StudentMutationItem['statusDocument']>('Lengkap');

  const masukCount = mutations.filter(m => m.type === 'Masuk').length;
  const keluarCount = mutations.filter(m => m.type === 'Keluar').length;

  const filtered = mutations.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      m.studentName.toLowerCase().includes(q) ||
      m.nisn.includes(q) ||
      m.schoolDestinationOrOrigin.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      m.letterNumber.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !schoolDestinationOrOrigin) return;

    service.addStudentMutation(classId, {
      date,
      studentName,
      nisn: nisn || `008${Math.floor(1000000 + Math.random() * 9000000)}`,
      gender,
      type,
      schoolDestinationOrOrigin,
      reason: reason || 'Mengikuti kepindahan domisili orang tua.',
      letterNumber: letterNumber || `421.3/${Math.floor(100 + Math.random() * 900)}/DISDIK/2026`,
      statusDocument
    });

    setShowAddModal(false);
    setStudentName('');
    setNisn('');
    setSchoolDestinationOrOrigin('');
    setReason('');
    setLetterNumber('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Data Mutasi?',
      text: 'Catatan mutasi siswa ini akan dihapus dari buku mutasi.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteStudentMutation(classId, id);
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
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-xs font-black">
              MENU 14
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buku Mutasi Siswa ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar siswa pindahan masuk maupun pindah keluar, asal/tujuan sekolah, dan arsip nomor surat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Mutasi</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Mutasi</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Mutasi Masuk
            </div>
            <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
              +{masukCount} <span className="text-xs font-normal">Siswa</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              Mutasi Keluar
            </div>
            <div className="text-xl font-black text-rose-900 dark:text-rose-100 mt-0.5">
              -{keluarCount} <span className="text-xs font-normal">Siswa</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
            <UserMinus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Total Mutasi Terdata
            </div>
            <div className="text-xl font-black text-sky-900 dark:text-sky-100 mt-0.5">
              {mutations.length} <span className="text-xs font-normal">Berkas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-700 dark:text-sky-300">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama siswa, NISN, sekolah asal/tujuan, atau nomor surat..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3 text-center">Jenis</th>
                <th className="py-3 px-4">Nama Siswa & NISN</th>
                <th className="py-3 px-3 text-center">L/P</th>
                <th className="py-3 px-4">Sekolah Asal / Tujuan</th>
                <th className="py-3 px-4">Alasan Kepindahan</th>
                <th className="py-3 px-3">No. Surat</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-sky-50/20 dark:hover:bg-sky-950/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        item.type === 'Masuk'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {item.type === 'Masuk' ? <UserPlus className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                        <span>Mutasi {item.type}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{item.studentName}</div>
                      <div className="text-[10px] font-normal text-slate-400">NISN: {item.nisn}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{item.gender}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.schoolDestinationOrOrigin}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.reason}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div>{item.letterNumber}</div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{item.statusDocument}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus data mutasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada data mutasi siswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Mutasi Siswa
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jenis Mutasi</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Masuk">Masuk (Pindahan Masuk)</option>
                    <option value="Keluar">Keluar (Pindah ke Sekolah Lain)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal Mutasi</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Nama lengkap siswa..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">NISN</label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={e => setNisn(e.target.value)}
                    placeholder="NISN (10 Digit)..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {type === 'Masuk' ? 'Sekolah Asal Pindahan' : 'Sekolah Tujuan Kepindahan'}
                </label>
                <input
                  type="text"
                  value={schoolDestinationOrOrigin}
                  onChange={e => setSchoolDestinationOrOrigin(e.target.value)}
                  placeholder="Nama sekolah asal / tujuan..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Alasan Mutasi</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Alasan mutasi..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nomor Surat Izin Mutasi
                  </label>
                  <input
                    type="text"
                    value={letterNumber}
                    onChange={e => setLetterNumber(e.target.value)}
                    placeholder="Nomor surat resmi..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Status Berkas
                  </label>
                  <select
                    value={statusDocument}
                    onChange={e => setStatusDocument(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Lengkap">Lengkap</option>
                    <option value="Menunggu Berkas">Menunggu Berkas</option>
                    <option value="Diverifikasi Dinas">Diverifikasi Dinas</option>
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
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
