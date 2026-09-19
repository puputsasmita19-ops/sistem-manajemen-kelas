import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit3,
  Printer,
  Phone,
  MapPin,
  Heart,
  FileText,
  Building,
  Calendar,
  Wallet
} from 'lucide-react';
import { StudentIdentityItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomIdentitiesProps {
  classId: string;
  className: string;
  identities: StudentIdentityItem[];
  onRefresh: () => void;
}

export const HomeroomIdentities: React.FC<HomeroomIdentitiesProps> = ({
  classId,
  className,
  identities,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentIdentityItem | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentIdentityItem | null>(null);

  const filtered = identities.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.nis.includes(q) ||
      s.nisn.includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    service.saveStudentIdentity(classId, editingStudent);
    setEditingStudent(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 text-xs font-black">
              MENU 6
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Identitas Siswa / Buku Induk ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar lengkap NIS, NISN, biodata pribadi, riwayat kesehatan, dan kontak orang tua siswa
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Buku Induk</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari berdasarkan nama siswa, NIS, NISN, atau alamat..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">NIS / NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-2 text-center">L/P</th>
                <th className="py-3 px-3">TTL</th>
                <th className="py-3 px-3">Nama Orang Tua</th>
                <th className="py-3 px-3">No HP / WA Ortu</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div>NIS: <strong className="text-slate-800 dark:text-slate-200">{item.nis}</strong></div>
                      <div className="text-[10px] text-slate-400">NISN: {item.nisn}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{item.fullName}</div>
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                        Panggilan: "{item.nickname}" • Gol. {item.bloodType}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        item.gender === 'L'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {item.gender}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      <div>{item.birthPlace}</div>
                      <div className="text-[10px] text-slate-400">{item.birthDate}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <div>A: {item.fatherName}</div>
                      <div className="text-[10px] text-slate-400">I: {item.motherName}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Phone className="w-3 h-3" />
                        <span>{item.parentPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950 transition cursor-pointer"
                          title="Lihat profil detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStudent({ ...item })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                          title="Edit biodata siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ditemukan data identitas siswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  BUKU INDUK SISWA
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStudent.fullName}
                </h4>
                <p className="text-xs text-slate-400">
                  NIS: {selectedStudent.nis} • NISN: {selectedStudent.nisn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tempat, Tgl Lahir</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStudent.birthPlace}, {selectedStudent.birthDate}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Agama & Gol. Darah</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStudent.religion} • Gol: {selectedStudent.bloodType}
                </p>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Alamat Lengkap</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStudent.address}
                </p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Jarak ke sekolah: {selectedStudent.distanceToSchoolKm} km ({selectedStudent.transportation})
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Orang Tua / Wali</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Ayah: {selectedStudent.fatherName}<br />
                  Ibu: {selectedStudent.motherName}
                </p>
                <span className="text-[10px] text-slate-400">Pekerjaan: {selectedStudent.parentOccupation}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Status Sosial & HP</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedStudent.economicStatus}
                </p>
                <p className="text-slate-700 dark:text-slate-300 font-mono">
                  WA: {selectedStudent.parentPhone}
                </p>
              </div>
              <div className="col-span-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1">
                <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase">
                  Catatan Medis / Riwayat Kesehatan
                </span>
                <p className="text-rose-900 dark:text-rose-200">
                  {selectedStudent.healthNotes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Biodata {editingStudent.fullName}
              </h4>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">NIS</label>
                  <input
                    type="text"
                    value={editingStudent.nis}
                    onChange={e => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">NISN</label>
                  <input
                    type="text"
                    value={editingStudent.nisn}
                    onChange={e => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={editingStudent.fullName}
                  onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Alamat Rumah</label>
                <input
                  type="text"
                  value={editingStudent.address}
                  onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">No HP / WA Ortu</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone}
                    onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Ekonomi</label>
                  <select
                    value={editingStudent.economicStatus}
                    onChange={e => setEditingStudent({ ...editingStudent, economicStatus: e.target.value as any })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Mampu">Mampu</option>
                    <option value="KIP / PIP">KIP / PIP</option>
                    <option value="Prasejahtera">Prasejahtera</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Catatan Kesehatan</label>
                <input
                  type="text"
                  value={editingStudent.healthNotes}
                  onChange={e => setEditingStudent({ ...editingStudent, healthNotes: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
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
