import React from 'react';
import {
  BbmItemRow,
  calculateTotals,
  formatRupiah,
} from '../data/bbmData';
import {
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface QuarterlyAnalysisProps {
  data: BbmItemRow[];
  year?: number;
}

export const QuarterlyAnalysis: React.FC<QuarterlyAnalysisProps> = ({
  data,
  year = 2026,
}) => {
  const { quarters, rowTotals, grandTotal } = calculateTotals(data);

  const quarterDateRanges = [
    `Januari - Maret ${year}`,
    `April - Juni ${year}`,
    `Juli - September ${year}`,
    `Oktober - Desember ${year}`,
  ];

  const romanNumerals = ['I', 'II', 'III', 'IV'];

  return (
    <section id="analisis-tren" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Analisis Perkembangan per Triwulan {year}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluasi laju penyerapan anggaran bahan bakar secara komprehensif untuk Triwulan I, II, III, dan IV tahun {year}
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-center gap-1.5 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span>Total Serapan 4 Triwulan: <strong className="font-mono text-slate-900">{formatRupiah(grandTotal)}</strong></span>
        </div>
      </div>

      {/* 4 Quarter Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map((q, idx) => {
          const roman = romanNumerals[idx] || `${idx + 1}`;
          let growthPct: number | null = null;
          let isPositive = true;

          if (idx > 0) {
            const prevTotal = quarters[idx - 1].total;
            if (prevTotal > 0 && q.total > 0) {
              growthPct = ((q.total - prevTotal) / prevTotal) * 100;
              isPositive = growthPct >= 0;
            } else if (prevTotal === 0 && q.total > 0) {
              growthPct = 100;
              isPositive = true;
            } else if (prevTotal > 0 && q.total === 0) {
              growthPct = -100;
              isPositive = false;
            }
          }

          return (
            <div
              key={q.name}
              className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span className="font-bold text-slate-800 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                    Triwulan {roman}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 font-medium">
                    {q.percentage.toFixed(1)}% prosentase dari total
                  </span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                  {formatRupiah(q.total)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {quarterDateRanges[idx]}
                </span>
              </div>

              {/* Growth comparison */}
              <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  {idx === 0 ? 'Status Triwulan:' : `vs TW ${romanNumerals[idx - 1]}:`}
                </span>
                {idx === 0 ? (
                  <span className="font-mono text-slate-500 font-medium text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                    Periode Baseline
                  </span>
                ) : growthPct !== null ? (
                  <span
                    className={`font-mono tabular-nums font-semibold flex items-center text-[11px] px-1.5 py-0.5 rounded ${
                      isPositive
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-rose-700 bg-rose-50'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                    )}
                    {isPositive ? `+${growthPct.toFixed(1)}%` : `${growthPct.toFixed(1)}%`}
                  </span>
                ) : (
                  <span className="font-mono text-slate-400 text-[11px]">
                    Belum Realisasi
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Bulletins / Findings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">
              Konsistensi Alokasi Pertamax
            </h3>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Penggunaan BBM Pertamax menunjukkan stabilitas konsumsi yang tinggi pada kendaraan dinas pimpinan dan operasional harian, berkontribusi sebesar {formatRupiah(rowTotals[0]?.total || 0)} terhadap serapan anggaran.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">
              Operasional Armada Dex Lapangan
            </h3>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Pos Dex Kadin ({formatRupiah(rowTotals[1]?.total || 0)}) dan Dex Toilet ({formatRupiah(rowTotals[2]?.total || 0)}) mendukung mobilitas armada truk tangki dan armada toilet keliling penugasan dinas.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-3 shadow-2xs">
          <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">
              Pola Penyerapan 4 Triwulan
            </h3>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Pemantauan berkelanjutan pada Triwulan I, II, III, dan IV memastikan realisasi anggaran belanja BBM tidak melampaui pagu tahun {year} serta tetap efisien sesuai kebutuhan operasional.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
