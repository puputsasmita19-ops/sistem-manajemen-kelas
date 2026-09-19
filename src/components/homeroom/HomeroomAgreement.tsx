import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  FileCheck,
  Award,
  Sparkles,
  Plus,
  Trash2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake
} from 'lucide-react';
import { ClassAgreementDoc, ClassAgreementItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomAgreementProps {
  classId: string;
  className: string;
  agreement: ClassAgreementDoc;
  onRefresh: () => void;
}

export const HomeroomAgreement: React.FC<HomeroomAgreementProps> = ({
  classId,
  className,
  agreement,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [showAddModal, setShowAddModal] = useState(false);

  const safeAgreement: ClassAgreementDoc = agreement || {
    id: `agree_${classId}`,
    class_id: classId,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    motto: 'Belajar dengan Giat, Berkarakter Kuat, Bergotong Royong dengan Tulus.',
    rules: [],
    signedDate: '2026-07-20',
    homeroomTeacher: 'Budi Santoso, S.Pd',
    classPresident: 'Ahmad Fauzi'
  };

  // Form state
  const [ruleTitle, setRuleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ClassAgreementItem['category']>('Kedisiplinan');
  const [consequence, setConsequence] = useState('');

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle || !description) return;

    const newRule: ClassAgreementItem = {
      id: `rule_${Date.now()}`,
      class_id: classId,
      ruleTitle,
      description,
      category,
      consequence
    };

    const currentRules = safeAgreement.rules || [];
    const updatedDoc = {
      ...safeAgreement,
      rules: [...currentRules, newRule]
    };

    service.updateClassAgreement(classId, updatedDoc);
    setShowAddModal(false);
    setRuleTitle('');
    setDescription('');
    setConsequence('');
    onRefresh();
  };

  const handleDeleteRule = (ruleId: string) => {
    Swal.fire({
      title: 'Hapus Butir Kesepakatan?',
      text: 'Aturan atau kesepakatan ini akan dihapus dari piagam kelas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#9333ea',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        const currentRules = safeAgreement.rules || [];
        const updatedRules = currentRules.filter(r => r.id !== ruleId);
        service.updateClassAgreement(classId, { ...safeAgreement, rules: updatedRules });
        onRefresh();
      }
    });
  };

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Kedisiplinan: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
    Kebersihan: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
    'Etika & Sopan Santun': { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300' },
    Akademik: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
    Kerjasama: { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300' }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-xs font-black">
              MENU 3
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kesepakatan Kelas ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Piagam kesepakatan dan budaya belajar positif yang disepakati bersama oleh seluruh warga kelas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportAgreementPDF(className, safeAgreement)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Piagam</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-purple-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kesepakatan</span>
          </button>
        </div>
      </div>

      {/* Piagam Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-6 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
        <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none">
          <HeartHandshake className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase tracking-widest">
          <Award className="w-4 h-4" />
          <span>KOMITMEN BERSAMA KELAS</span>
        </div>
        <h2 className="text-lg md:text-xl font-black">{safeAgreement.title}</h2>
        <blockquote className="italic text-sm text-purple-200 border-l-2 border-purple-400 pl-3">
          {safeAgreement.motto}
        </blockquote>
        <div className="flex flex-wrap items-center gap-4 text-xs text-purple-300/90 pt-2 border-t border-purple-800/60">
          <span>📅 Tanggal Pengesahan: <strong>{safeAgreement.signedDate}</strong></span>
          <span>•</span>
          <span>🎓 Wali Kelas: <strong>{safeAgreement.homeroomTeacher}</strong></span>
          <span>•</span>
          <span>👑 Ketua Kelas: <strong>{safeAgreement.classPresident}</strong></span>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(safeAgreement.rules || []).map((rule, idx) => {
          const catStyle = categoryColors[rule.category] || {
            bg: 'bg-slate-100 text-slate-700',
            text: ''
          };

          return (
            <div
              key={rule.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rule.ruleTitle}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${catStyle.bg}`}>
                    {rule.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Hapus butir kesepakatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {rule.description}
              </p>

              {rule.consequence && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-xl text-xs space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Konsekuensi Logis & Restitusi:
                  </span>
                  <p className="text-[11px] text-amber-900 dark:text-amber-200">
                    {rule.consequence}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Kesepakatan Kelas
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Judul Kesepakatan / Norma
                </label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={e => setRuleTitle(e.target.value)}
                  placeholder="Contoh: Menjaga Kerapian Seragam Sekolah"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Kategori</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="Kedisiplinan">Kedisiplinan</option>
                  <option value="Kebersihan">Kebersihan</option>
                  <option value="Etika & Sopan Santun">Etika & Sopan Santun</option>
                  <option value="Akademik">Akademik</option>
                  <option value="Kerjasama">Kerjasama</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian & Pelaksanaan
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Jelaskan detail norma yang disepakati bersama..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Konsekuensi Logis / Restitusi Pembinaan
                </label>
                <input
                  type="text"
                  value={consequence}
                  onChange={e => setConsequence(e.target.value)}
                  placeholder="Tindakan pembinaan atau perbaikan jika melanggar..."
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Kesepakatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
