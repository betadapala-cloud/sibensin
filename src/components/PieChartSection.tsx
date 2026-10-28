import React, { useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
import {
  BbmItemRow,
  MONTH_NAMES,
  formatRupiah,
  calculateTotals,
} from '../data/bbmData';
import { PieChart as PieChartIcon, Disc, ChevronDown } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartSectionProps {
  data: BbmItemRow[];
  year?: number;
}

type ChartType = 'doughnut' | 'pie';
type ScopeType = 'total' | 'month' | 'quarter';

export const PieChartSection: React.FC<PieChartSectionProps> = ({
  data,
  year = 2026,
}) => {
  const [chartType, setChartType] = useState<ChartType>('doughnut');
  const [scopeType, setScopeType] = useState<ScopeType>('total');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // September default
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1); // Q1 = 1

  const { rowTotals, grandTotal } = calculateTotals(data);

  // Calculate slice values and total for the active scope
  let sliceValues: number[] = [];
  let scopeLabel = '';
  let activeScopeTotal = 0;

  if (scopeType === 'total') {
    sliceValues = rowTotals.map((r) => r.total);
    activeScopeTotal = grandTotal;
    scopeLabel = `Kumulatif 12 Bulan (Tahun ${year})`;
  } else if (scopeType === 'month') {
    sliceValues = data.map((item) => item.values[selectedMonth] ?? 0);
    activeScopeTotal = sliceValues.reduce((a, b) => a + b, 0);
    scopeLabel = `Bulan ${MONTH_NAMES[selectedMonth]} ${year}`;
  } else {
    // Quarter
    const qIndices =
      selectedQuarter === 1
        ? [0, 1, 2]
        : selectedQuarter === 2
        ? [3, 4, 5]
        : selectedQuarter === 3
        ? [6, 7, 8]
        : [9, 10, 11];

    sliceValues = data.map((item) => {
      return qIndices.reduce((acc, idx) => acc + (item.values[idx] ?? 0), 0);
    });
    activeScopeTotal = sliceValues.reduce((a, b) => a + b, 0);

    const qRoman =
      selectedQuarter === 1
        ? 'I'
        : selectedQuarter === 2
        ? 'II'
        : selectedQuarter === 3
        ? 'III'
        : 'IV';
    scopeLabel = `Triwulan ${qRoman} ${year}`;
  }

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: sliceValues,
        backgroundColor: data.map((d) => d.color),
        hoverBackgroundColor: data.map((d) => d.hoverColor),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const commonPlugins = {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleFont: {
        family: "'Plus Jakarta Sans', sans-serif",
        size: 13,
        weight: 700 as const,
      },
      bodyFont: {
        family: "'JetBrains Mono', monospace",
        size: 12,
      },
      padding: 12,
      callbacks: {
        label: function (context: any) {
          const val = context.parsed;
          const pct =
            activeScopeTotal > 0
              ? ((val / activeScopeTotal) * 100).toFixed(2)
              : '0';
          return ` ${context.label}: ${formatRupiah(val)} (${pct}%)`;
        },
      },
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: commonPlugins,
  };

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins,
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Diagram Lingkaran Komposisi BBM {year}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Persentase dan perbandingan alokasi anggaran antar jenis bahan bakar
          </p>
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setChartType('doughnut')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                chartType === 'doughnut'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5" />
                Donat
              </span>
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                chartType === 'pie'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lingkaran Penuh
            </button>
          </div>
        </div>
      </div>

      {/* Scope Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScopeType('total')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              scopeType === 'total'
                ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kumulatif 12 Bulan
          </button>
          <button
            onClick={() => setScopeType('month')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              scopeType === 'month'
                ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per Bulan
          </button>
          <button
            onClick={() => setScopeType('quarter')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              scopeType === 'quarter'
                ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per Triwulan
          </button>
        </div>

        {/* Dynamic Secondary Selectors */}
        <div className="flex items-center gap-2">
          {scopeType === 'month' && (
            <div className="relative inline-flex items-center">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {MONTH_NAMES.map((month, idx) => (
                  <option key={month} value={idx}>
                    Bulan {month}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>
          )}

          {scopeType === 'quarter' && (
            <div className="relative inline-flex items-center">
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="appearance-none bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={1}>Triwulan I (Jan - Mar)</option>
                <option value={2}>Triwulan II (Apr - Jun)</option>
                <option value={3}>Triwulan III (Jul - Sep)</option>
                <option value={4}>Triwulan IV (Okt - Des)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Visual Chart with Center Metric */}
        <div className="md:col-span-5 relative flex items-center justify-center min-h-[220px]" id="pie-chart-canvas-container">
          <div className="w-56 h-56 relative">
            {chartType === 'doughnut' ? (
              <Doughnut data={chartData} options={doughnutOptions} />
            ) : (
              <Pie data={chartData} options={pieOptions} />
            )}
            {chartType === 'doughnut' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Total Alokasi
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {formatRupiah(activeScopeTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Legend & Shares */}
        <div className="md:col-span-7 flex flex-col gap-3">
          <div className="text-xs font-medium text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
            <span>Rincian Komposisi: {scopeLabel}</span>
            <span className="font-mono tabular-nums text-slate-700 font-semibold">
              100.00%
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {data.map((item, idx) => {
              const val = sliceValues[idx] || 0;
              const pct = activeScopeTotal > 0 ? (val / activeScopeTotal) * 100 : 0;
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-white hover:bg-slate-50/50 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-900">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatRupiah(val)}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 text-[11px] w-12 text-right">
                        {pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
