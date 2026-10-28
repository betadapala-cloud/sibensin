import React from 'react';
import {
  BbmItemRow,
  calculateTotals,
  formatRupiah,
} from '../data/bbmData';
import { LineChart, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuarterlyAnalysisProps {
  data: BbmItemRow[];
  year?: number;
}

export const QuarterlyAnalysis: React.FC<QuarterlyAnalysisProps> = ({
  data,
  year = 2026,
}) => {
  const { quarters, rowTotals } = calculateTotals(data);

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
            Evaluasi laju penyerapan anggaran bahan bakar antar periode tahun {year}
          </p>
        </div>
      </div>

      {/* 3 Quarter Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quarters.slice(0, 3).map((q, idx) => {
          const quarterNumber = idx + 1;
          const isGrowth = idx > 0;
          let growthPct = 0;
          if (idx === 1 && quarters[0].total > 0) {
            growthPct = ((quarters[1].total - quarters[0].total) / quarters[0].total) * 100;
          } else if (idx === 2 && quarters[1].total > 0) {
            growthPct = ((quarters[2].total - quarters[1].total) / quarters[1].total) * 100;
          }

          return (
            <div
              key={q.name}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">
                    Triwulan {quarterNumber === 1 ? 'I' : quarterNumber === 2 ? 'II' : 'III'}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {q.percentage.toFixed(1)}% dari Total
                  </span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatRupiah(q.total)}
                </div>
                <span className="text-xs text-slate-500">
                  {idx === 0
                    ? `Januari - Maret ${year}`
                    : idx === 1
                    ? `April - Juni ${year}`
                    : `Juli - September ${year}`}
                </span>
              </div>

              {/* Growth comparison */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Perubahan Triwulanan:</span>
                {isGrowth ? (
                  <span className="font-mono tabular-nums font-semibold text-amber-700 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +{growthPct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="font-mono text-slate-500 font-medium">
                    Periode Dasar (Baseline)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Bulletins / Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">
              Konsistensi Alokasi Pertamax
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Penggunaan BBM Pertamax menunjukkan stabilitas konsumsi yang tinggi pada kendaraan dinas pimpinan dan operasional harian, berkontribusi signifikan sebesar {formatRupiah(rowTotals[0]?.total || 0)} terhadap serapan anggaran.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">
              Operasional Armada Dex Lapangan
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Pos Dex Kadin ({formatRupiah(rowTotals[1]?.total || 0)}) dan Dex Toilet ({formatRupiah(rowTotals[2]?.total || 0)}) mendukung mobilitas armada truk tangki, armada toilet keliling, dan penugasan lapangan kedinasan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
