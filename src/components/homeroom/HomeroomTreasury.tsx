import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  DollarSign,
  Plus,
  Trash2,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  Receipt,
  FileCheck
} from 'lucide-react';
import { ClassTreasuryTransaction } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomTreasuryProps {
  classId: string;
  className: string;
  transactions: ClassTreasuryTransaction[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomTreasury: React.FC<HomeroomTreasuryProps> = ({
  classId,
  className,
  transactions,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ClassTreasuryTransaction['category']>('Iuran Kas Rutin');
  const [type, setType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [amount, setAmount] = useState<number>(20000);
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(`KW-${Date.now().toString().slice(-5)}`);
  const [recordedBy, setRecordedBy] = useState('Bendahara Kelas');

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const filtered = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      t.description.toLowerCase().includes(q) ||
      (t.receiptNumber && t.receiptNumber.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q) ||
      t.recordedBy.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    service.addTreasuryTransaction(classId, {
      date,
      category,
      type,
      amount: Number(amount),
      description,
      receiptNumber: receiptNumber || undefined,
      recordedBy: recordedBy || 'Bendahara Kelas'
    });

    setShowAddModal(false);
    setDescription('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Transaksi Kas?',
      text: 'Catatan mutasi kas ini akan dihapus dari buku administrasi keuangan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteTreasuryTransaction(classId, id);
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
              MENU 12
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rincian Administrasi & Kas Keuangan Kelas ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Buku kas kelas, iuran kas rutin mingguan, infaq sosial, perlengkapan kebersihan, dan transparansi saldo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Kas</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Pemasukan</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            Rp {totalIncome.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">Akumulasi penerimaan kas</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Pengeluaran</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            Rp {totalExpense.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">Biaya KBM & operasional</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sisa Saldo Kas</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white">
            Rp {balance.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-emerald-100">Posisi kas tunai saat ini</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari uraian transaksi, kategori kas, atau nomor kwitansi..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
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
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-4">Uraian / Keterangan</th>
                <th className="py-3 px-3 text-right">Nominal</th>
                <th className="py-3 px-3 text-right">Saldo Akhir</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          item.type === 'Pemasukan'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {item.type === 'Pemasukan' ? '+' : '-'} {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div>{item.description}</div>
                      {item.receiptNumber && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Kwitansi: {item.receiptNumber} • Dicatat: {item.recordedBy}
                        </div>
                      )}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        item.type === 'Pemasukan'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.type === 'Pemasukan' ? '+' : '-'} Rp {item.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rp {item.balanceAfter.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada riwayat transaksi kas kelas.
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
                Catat Transaksi Kas Kelas
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jenis Transaksi</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Pemasukan">Pemasukan (+)</option>
                    <option value="Pengeluaran">Pengeluaran (-)</option>
                  </select>
                </div>
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
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Kategori Kas</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="Iuran Kas Rutin">Iuran Kas Rutin</option>
                  <option value="Infaq Jumat">Infaq Jumat / Sosial</option>
                  <option value="Foto Kopi / Modul">Foto Kopi / Modul Belajar</option>
                  <option value="Kebersihan">Kebersihan & Alat Kelas</option>
                  <option value="Kegiatan Kelas">Kegiatan Kelas & Lomba</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nominal Transaksi (Rp)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="Contoh: 50000"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                  min="500"
                  step="500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian / Keterangan Transaksi
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Contoh: Iuran kas mingguan pekan ke-2..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nomor Bukti / Kwitansi</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Petugas Pencatat</label>
                  <input
                    type="text"
                    value={recordedBy}
                    onChange={e => setRecordedBy(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
