import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Crown,
  Shield,
  BookOpen,
  DollarSign,
  Sparkles,
  Printer,
  Edit3,
  Flame,
  Volume2
} from 'lucide-react';
import { ClassStructure } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomStructureProps {
  classId: string;
  className: string;
  structure: ClassStructure;
  onRefresh: () => void;
}

export const HomeroomStructure: React.FC<HomeroomStructureProps> = ({
  classId,
  className,
  structure,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClassStructure>({ ...structure });

  useEffect(() => {
    if (structure) {
      setFormData({ ...structure });
    }
  }, [structure]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    service.updateClassStructure(classId, formData);
    setIsEditing(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-xs font-black">
              MENU 7
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Struktur Organisasi Kepengurusan ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bagan hierarki kepemimpinan, sekretaris, bendahara, dan penanggung jawab seksi kelas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportStructurePDF(className, structure)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Bagan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-500/20 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Ubah Struktur</span>
          </button>
        </div>
      </div>

      {/* Visual Organizational Hierarchy Chart */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6">
        {/* Tier 1: Wali Kelas (Top) */}
        <div className="flex justify-center">
          <div className="w-72 bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-md text-center border-2 border-blue-400/50 space-y-1">
            <span className="text-[10px] font-black tracking-widest uppercase text-blue-200">
              PEMBINA / WALI KELAS
            </span>
            <h4 className="text-sm font-black">{structure.homeroomTeacher}</h4>
            <p className="text-[10px] text-blue-100">Penanggung Jawab Akademik & Karakter</p>
          </div>
        </div>

        {/* Connector line */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 mx-auto" />

        {/* Tier 2: Ketua & Wakil Ketua Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Ketua */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-amber-400 dark:border-amber-500 text-center shadow-xs space-y-1">
            <div className="inline-flex p-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 mb-1">
              <Crown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              KETUA KELAS
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {structure.president}
            </h4>
            <p className="text-[10px] text-slate-400">Koordinator Utama Kelas</p>
          </div>

          {/* Wakil Ketua */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 text-center shadow-xs space-y-1">
            <div className="inline-flex p-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 mb-1">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              WAKIL KETUA KELAS
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {structure.vicePresident}
            </h4>
            <p className="text-[10px] text-slate-400">Pendamping & Pelaksana Harian</p>
          </div>
        </div>

        {/* Connector line */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 mx-auto" />

        {/* Tier 3: Sekretaris & Bendahara */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Sekretaris */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">SEKRETARIS KELAS</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Sekretaris 1:</span>
                <span className="font-bold text-slate-900 dark:text-white">{structure.secretary1}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Sekretaris 2:</span>
                <span className="font-bold text-slate-900 dark:text-white">{structure.secretary2}</span>
              </div>
            </div>
          </div>

          {/* Bendahara */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">BENDAHARA KELAS</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Bendahara 1:</span>
                <span className="font-bold text-slate-900 dark:text-white">{structure.treasurer1}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Bendahara 2:</span>
                <span className="font-bold text-slate-900 dark:text-white">{structure.treasurer2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connector line */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 mx-auto" />

        {/* Tier 4: Seksi-Seksi Operasional */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              SEKSI-SEKSI BIDANG KHUSUS
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Kebersihan</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionCleaning.join(', ')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Shield className="w-3.5 h-3.5 text-blue-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Keamanan</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionSecurity.join(', ')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Award className="w-3.5 h-3.5 text-indigo-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Keagamaan</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionReligious.join(', ')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Flame className="w-3.5 h-3.5 text-rose-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Olahraga</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionSports.join(', ')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Humas</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionPublicRelations.join(', ')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Users className="w-3.5 h-3.5 text-purple-500 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block">Perlengkapan</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {structure.sectionEquipment.join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Ubah Struktur Pengurus Kelas
              </h4>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Ketua Kelas</label>
                  <input
                    type="text"
                    value={formData.president}
                    onChange={e => setFormData({ ...formData, president: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Wakil Ketua</label>
                  <input
                    type="text"
                    value={formData.vicePresident}
                    onChange={e => setFormData({ ...formData, vicePresident: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sekretaris 1</label>
                  <input
                    type="text"
                    value={formData.secretary1}
                    onChange={e => setFormData({ ...formData, secretary1: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sekretaris 2</label>
                  <input
                    type="text"
                    value={formData.secretary2}
                    onChange={e => setFormData({ ...formData, secretary2: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bendahara 1</label>
                  <input
                    type="text"
                    value={formData.treasurer1}
                    onChange={e => setFormData({ ...formData, treasurer1: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bendahara 2</label>
                  <input
                    type="text"
                    value={formData.treasurer2}
                    onChange={e => setFormData({ ...formData, treasurer2: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Struktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
