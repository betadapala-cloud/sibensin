import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  BbmItemRow,
  MONTH_NAMES,
  formatRupiah,
  formatRupiahCompact,
  calculateTotals,
} from '../data/bbmData';
import { BarChart3, Layers, SlidersHorizontal, Info } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartSectionProps {
  data: BbmItemRow[];
  year?: number;
}

type ViewMode = 'stacked' | 'grouped' | 'total';
type RangeFilter = 'all' | 'q1' | 'q2' | 'q3' | 'q4';

export const BarChartSection: React.FC<BarChartSectionProps> = ({
  data,
  year = 2026,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('stacked');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

  const { highestMonth } = calculateTotals(data);

  // Determine months to display based on rangeFilter (12 months by default)
  let monthIndices: number[] = [];
  if (rangeFilter === 'q1') {
    monthIndices = [0, 1, 2];
  } else if (rangeFilter === 'q2') {
    monthIndices = [3, 4, 5];
  } else if (rangeFilter === 'q3') {
    monthIndices = [6, 7, 8];
  } else if (rangeFilter === 'q4') {
    monthIndices = [9, 10, 11];
  } else {
    // all 12 months (Januari s.d. Desember)
    monthIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  const labels = monthIndices.map((idx) => MONTH_NAMES[idx]);

  // Compute dataset based on viewMode
  let chartData;
  if (viewMode === 'total') {
    const totalValues = monthIndices.map((mIdx) => {
      let sum = 0;
      let hasData = false;
      data.forEach((row) => {
        const val = row.values[mIdx];
        if (val !== null) {
          sum += val;
          hasData = true;
        }
      });
      return hasData ? sum : null;
    });

    chartData = {
      labels,
      datasets: [
        {
          label: 'Total Realisasi BBM Bulanan',
          data: totalValues,
          backgroundColor: '#0284c7',
          hoverBackgroundColor: '#0369a1',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  } else {
    chartData = {
      labels,
      datasets: data.map((item) => ({
        label: item.name,
        data: monthIndices.map((mIdx) => item.values[mIdx] ?? 0),
        backgroundColor: item.color,
        hoverBackgroundColor: item.hoverColor,
        borderRadius: viewMode === 'stacked' ? 0 : 4,
        stack: viewMode === 'stacked' ? 'stack1' : undefined,
      })),
    };
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 14,
          boxHeight: 14,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 12,
            weight: 500,
          },
          color: '#334155',
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: {
          family: "'Plus Jakarta Sans', sans-serif",
          size: 13,
          weight: 700,
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 12,
        },
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            const val = context.parsed.y;
            if (val === null || val === undefined) return '';
            const formatted = formatRupiah(val);
            const label = context.dataset.label || '';
            return ` ${label}: ${formatted}`;
          },
          footer: function (tooltipItems) {
            if (viewMode === 'stacked') {
              const total = tooltipItems.reduce((acc, curr) => acc + (curr.parsed.y || 0), 0);
              return `\nTotal Bulan: ${formatRupiah(total)}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 12,
            weight: 500,
          },
          color: '#475569',
        },
        stacked: viewMode === 'stacked',
      },
      y: {
        border: {
          dash: [4, 4],
        },
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          font: {
            family: "'JetBrains Mono', monospace",
            size: 11,
          },
          color: '#64748b',
          callback: function (value) {
            return formatRupiahCompact(value as number);
          },
        },
        stacked: viewMode === 'stacked',
      },
    },
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
      {/* Header controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Diagram Batang Realisasi BBM {year}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi tren pengeluaran bulanan per pos penggunaan Pertamax, Dex Kadin, dan Dex Toilet
          </p>
        </div>

        {/* Action Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode View */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'stacked'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Komposisi Bertumpuk"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Bertumpuk
              </span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'grouped'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Berdampingan per Jenis BBM"
            >
              Berdampingan
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'total'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Total Bulanan Saja"
            >
              Total Saja
            </button>
          </div>

          {/* Filter Range */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <span className="text-xs text-slate-500 pl-2 pr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              Periode:
            </span>
            <button
              onClick={() => setRangeFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                rangeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 Bulan
            </button>
            <button
              onClick={() => setRangeFilter('q1')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                rangeFilter === 'q1'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q1
            </button>
            <button
              onClick={() => setRangeFilter('q2')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                rangeFilter === 'q2'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q2
            </button>
            <button
              onClick={() => setRangeFilter('q3')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                rangeFilter === 'q3'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q3
            </button>
            <button
              onClick={() => setRangeFilter('q4')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                rangeFilter === 'q4'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q4
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative h-80 w-full" id="bar-chart-canvas-container">
        <Bar data={chartData} options={options} />
      </div>

      {/* Footnote / Contextual Insight */}
      <div className="flex items-start gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Catatan:</strong> Puncak realisasi tertinggi tahun {year} tercatat pada bulan{' '}
          <strong className="text-slate-800">{highestMonth?.monthName || '-'}</strong> sebesar{' '}
          <span className="font-mono text-slate-800 font-semibold">
            {highestMonth && highestMonth.total !== null ? formatRupiah(highestMonth.total) : '-'}
          </span>
          , didorong oleh peningkatan aktivitas armada operasional lapangan.
        </span>
      </div>
    </section>
  );
};
