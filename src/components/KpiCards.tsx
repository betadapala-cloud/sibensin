import React, { useState } from 'react';
import {
  BbmItemRow,
  calculateTotals,
  formatRupiah,
  formatAngka,
} from '../data/bbmData';
import {
  Wallet,
  TrendingUp,
  Calendar,
  PieChart,
  PiggyBank,
  Pencil,
  Check,
  X,
  Lock,
} from 'lucide-react';

interface KpiCardsProps {
  data: BbmItemRow[];
  totalBudget: number;
  onUpdateBudget: (newBudget: number) => void;
  year?: number;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  data,
  totalBudget,
  onUpdateBudget,
  year = 2026,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(totalBudget.toString());

  const { grandTotal, highestMonth } = calculateTotals(data);

  // Sisa Realisasi BBM
  const sisaRealisasi = totalBudget - grandTotal;
  const serapanPct =
    totalBudget > 0 ? ((grandTotal / totalBudget) * 100).toFixed(1) : '0';
  const sisaPct =
    totalBudget > 0 ? ((sisaRealisasi / totalBudget) * 100).toFixed(1) : '0';

  // Rata-rata per bulan untuk total 1 tahun (12 bulan)
  const average1Tahun = grandTotal / 12;

  const handleOpenEditBudget = () => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    setTempBudget(totalBudget.toString());
    setIsEditingBudget(true);
  };

  const handleSaveBudget = () => {
    const cleaned = tempBudget.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    onUpdateBudget(num);
    setIsEditingBudget(false);
  };

  const handleCancelBudget = () => {
    setTempBudget(totalBudget.toString());
    setIsEditingBudget(false);
  };

  return (
    <>
      <section id="ringkasan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Jumlah Anggaran Keseluruhan (Editable when unlocked) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Anggaran
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenEditBudget}
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title={isUnlocked ? "Input / Ubah Nilai Anggaran Keseluruhan" : "Terkunci: Buka sandi untuk mengubah"}
              >
                {isUnlocked ? (
                  <Pencil className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatRupiah(totalBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
              <span>Pagu Anggaran {year}</span>
              <button
                onClick={handleOpenEditBudget}
                className="text-blue-600 font-semibold hover:underline text-[11px] flex items-center gap-1"
              >
                {!isUnlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                <span>Ubah Nilai</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Total Realisasi BBM */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Realisasi BBM
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatRupiah(grandTotal)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="font-semibold text-indigo-700 font-mono">
                {serapanPct}% Terserap
              </span>
              <span aria-hidden="true">•</span>
              <span>Tahun {year}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Sisa Realisasi BBM */}
        <div
          className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between ${
            sisaRealisasi >= 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sisa Realisasi BBM
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                sisaRealisasi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                sisaRealisasi >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatRupiah(sisaRealisasi)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span
                className={`font-semibold font-mono ${
                  sisaRealisasi >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {sisaPct}% Sisa Pagu
              </span>
              <span aria-hidden="true">•</span>
              <span>{sisaRealisasi >= 0 ? 'Saldo Tersedia' : 'Defisit Anggaran'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rata-Rata Bulanan (Total 1 Tahun) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rata-Rata Bulanan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatRupiah(Math.round(average1Tahun))}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Total 1 Tahun</span>
            </div>
          </div>
        </div>

        {/* Card 5: Realisasi Tertinggi */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Realisasi Tertinggi
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
              {highestMonth ? formatRupiah(highestMonth.total) : '-'}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="font-semibold text-rose-700">
                Bulan {highestMonth?.monthName || '-'}
              </span>
              <span aria-hidden="true">•</span>
              <span>Puncak Operasional</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Input Nilai Anggaran Keseluruhan */}
      {isEditingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Input Anggaran Keseluruhan {year}
                </h3>
              </div>
              <button
                onClick={handleCancelBudget}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Nilai Jumlah Anggaran Pagu BBM (Rp):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  placeholder="Contoh: 350000000"
                  className="w-full pl-10 pr-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  autoFocus
                />
              </div>
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Pilihan Cepat:</span>
                {[280000000, 300000000, 350000000, 400000000, 450000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTempBudget(preset.toString())}
                    className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    {formatAngka(preset)}
                  </button>
                ))}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Total Realisasi Saat Ini:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimasi Sisa Realisasi:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatRupiah(
                      (parseInt(tempBudget.replace(/[^0-9]/g, '') || '0', 10)) - grandTotal
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelBudget}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Simpan Anggaran
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
