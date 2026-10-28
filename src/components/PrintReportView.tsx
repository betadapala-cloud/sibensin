import React from 'react';
import {
  BbmItemRow,
  MONTH_NAMES,
  calculateTotals,
  formatRupiah,
  formatRupiahCompact,
} from '../data/bbmData';
import { PdfExportOptions } from '../utils/pdfGenerator';

interface PrintReportViewProps {
  data: BbmItemRow[];
  options: PdfExportOptions;
  totalBudget?: number;
  year?: number;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  data,
  options,
  totalBudget = 350000000,
  year = 2026,
}) => {
  const { rowTotals, monthlyTotals, grandTotal, quarters, highestMonth } =
    calculateTotals(data);
  const sisaRealisasi = totalBudget - grandTotal;
  const average1Tahun = grandTotal / 12;

  // Maximum monthly total for scaling the SVG bar chart
  const monthlySums = monthlyTotals.map((m) => m.total || 0);
  const maxMonthVal = Math.max(...monthlySums, 45000000);
  const ceilMax = Math.ceil(maxMonthVal / 10000000) * 10000000;

  // SVG Bar Chart Dimensions
  const svgWidth = 840;
  const svgHeight = 220;
  const chartPadLeft = 75;
  const chartPadRight = 20;
  const chartPadTop = 32;
  const chartPadBottom = 38;
  const plotWidth = svgWidth - chartPadLeft - chartPadRight;
  const plotHeight = svgHeight - chartPadTop - chartPadBottom;
  const slotWidth = plotWidth / 12;
  const barWidth = slotWidth * 0.58;

  // Donut Chart Geometry
  const donutSize = 180;
  const donutCenter = donutSize / 2;
  const donutRadius = 72;
  const donutHole = 42;

  // Compute donut slices
  let cumulativeAngle = -90; // Start at top
  const donutSlices = data.map((item, idx) => {
    const total = rowTotals[idx]?.total || 0;
    const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
    const angle = (pct / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // Convert polar to cartesian
    const radStart = (startAngle * Math.PI) / 180;
    const radEnd = (endAngle * Math.PI) / 180;

    const x1 = donutCenter + donutRadius * Math.cos(radStart);
    const y1 = donutCenter + donutRadius * Math.sin(radStart);
    const x2 = donutCenter + donutRadius * Math.cos(radEnd);
    const y2 = donutCenter + donutRadius * Math.sin(radEnd);

    const x3 = donutCenter + donutHole * Math.cos(radEnd);
    const y3 = donutCenter + donutHole * Math.sin(radEnd);
    const x4 = donutCenter + donutHole * Math.cos(radStart);
    const y4 = donutCenter + donutHole * Math.sin(radStart);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${donutRadius} ${donutRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${donutHole} ${donutHole} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return {
      id: item.id,
      name: item.name,
      color: item.color,
      total,
      percentage: pct,
      pathData,
    };
  });

  return (
    <div
      id="pdf-report-content"
      className="bg-white text-slate-900 p-8 w-[1120px] mx-auto text-xs leading-normal"
      style={{ boxSizing: 'border-box' }}
    >
      {/* ============================================================ */}
      {/* HALAMAN 1: KOP SURAT, KPI EKSEKUTIF, TABEL RESMI, TANDA TANGAN */}
      {/* ============================================================ */}
      <div className="print-page-1">
        {/* Kop Surat / Document Header */}
        <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-600">
            PEMERINTAH DAERAH
          </h3>
          <h1 className="text-base font-bold uppercase tracking-tight text-slate-900">
            {options.agencyName || 'DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN'}
          </h1>
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 mt-1">
            {options.title || `LAPORAN REKAPITULASI PENGGUNAAN BBM SEKRETARIAT TAHUN ${year}`}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tahun Anggaran {year} • Dokumen Resmi Pelaporan Realisasi Operasional
          </p>
        </div>

        {/* KPI Summary Strip - Dynamic Highest Realization */}
        <div className="grid grid-cols-5 gap-3 mb-6 bg-slate-50 p-3 rounded border border-slate-200">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Jumlah Anggaran
            </span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {formatRupiah(totalBudget)}
            </span>
            <span className="text-[8px] text-slate-400 block">Pagu {year}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Total Realisasi BBM
            </span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {formatRupiah(grandTotal)}
            </span>
            <span className="text-[8px] text-slate-400 block">Kumulatif 12 Bulan</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Sisa Realisasi BBM
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                sisaRealisasi >= 0 ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {formatRupiah(sisaRealisasi)}
            </span>
            <span className="text-[8px] text-slate-400 block">
              {sisaRealisasi >= 0 ? 'Saldo Tersedia' : 'Defisit Anggaran'}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Rata-Rata Bulanan
            </span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {formatRupiah(Math.round(average1Tahun))}
            </span>
            <span className="text-[8px] text-slate-400 block">Total 1 Tahun</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Realisasi Tertinggi
            </span>
            <span className="text-xs font-mono font-bold text-amber-800">
              {highestMonth && highestMonth.total !== null
                ? `${highestMonth.monthName} (${formatRupiah(highestMonth.total)})`
                : '-'}
            </span>
            <span className="text-[8px] text-slate-400 block">
              {highestMonth ? `Puncak Bulan ${highestMonth.monthName}` : 'Puncak Operasional'}
            </span>
          </div>
        </div>

        {/* Official Table */}
        <div className="mb-6">
          <div className="font-bold text-xs text-slate-900 mb-2 uppercase flex items-center justify-between">
            <span>Tabel Rekapitulasi Penggunaan BBM Tahun {year}</span>
            <span className="text-[10px] text-slate-500 font-normal">Satuan: Rupiah (Rp)</span>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                <th className="border border-slate-800 p-1.5 text-left min-w-[90px]">
                  JENIS BBM
                </th>
                {MONTH_NAMES.map((m) => (
                  <th
                    key={m}
                    className="border border-slate-800 p-1.5 text-right font-semibold"
                  >
                    {m}
                  </th>
                ))}
                <th className="border border-slate-800 p-1.5 text-right bg-slate-200 font-bold">
                  JUMLAH KESELURUHAN
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const rTotal = rowTotals[idx].total;
                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="border border-slate-800 p-1.5 font-bold text-slate-900 bg-slate-50 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </td>
                    {item.values.map((val, mIdx) => (
                      <td
                        key={mIdx}
                        className="border border-slate-800 p-1.5 text-right font-mono tabular-nums text-slate-800"
                      >
                        {val !== null ? formatRupiah(val) : '-'}
                      </td>
                    ))}
                    <td className="border border-slate-800 p-1.5 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-100">
                      {formatRupiah(rTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* JUMLAH ROW */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-900">
                <td className="border border-slate-800 p-1.5 uppercase tracking-wide">
                  JUMLAH
                </td>
                {monthlyTotals.map((m) => (
                  <td
                    key={m.monthIndex}
                    className="border border-slate-800 p-1.5 text-right font-mono tabular-nums text-slate-900"
                  >
                    {m.total !== null ? formatRupiah(m.total) : '-'}
                  </td>
                ))}
                <td className="border border-slate-800 p-1.5 text-right font-mono tabular-nums font-extrabold text-blue-900 bg-blue-100">
                  {formatRupiah(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ringkasan Realisasi Triwulan */}
        <div className="mb-6 p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-[10px]">
          <span className="font-bold text-slate-800 uppercase">
            Ringkasan Serapan Triwulan:
          </span>
          <div className="flex items-center gap-4 text-slate-700">
            {quarters.slice(0, 3).map((q) => (
              <span key={q.name}>
                <strong>{q.name}:</strong>{' '}
                <span className="font-mono">{formatRupiah(q.total)}</span> ({q.percentage.toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>

        {/* Signature Section on Page 1 */}
        <div className="flex justify-between items-end pt-4 pb-2 border-t border-slate-200">
          <div className="text-[9px] text-slate-400">
            <p>Dokumen Resmi SiBensin • Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            <p>Halaman 1 {options.includeCharts || options.includeAnalysis ? 'dari 2' : ''}</p>
          </div>
          <div className="w-64 text-center text-[11px]">
            <p className="text-slate-600 mb-1">
              {options.reportDate || `Pasuruan, 18 Oktober ${year}`}
            </p>
            <p className="font-semibold text-slate-900">
              {options.signatoryTitle || 'Kuasa Pengguna Anggaran'}
            </p>
            <div className="h-14 flex items-end justify-center">
              <span className="border-b border-slate-900 font-bold text-slate-900 block pb-0.5">
                {options.signatoryName || 'H. Syaiful Anwar, S.STP., M.Si.'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              NIP. {options.signatoryNip || '19780512 200501 1 008'}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HALAMAN 2: LAMPIRAN DIAGRAM GRAFIK VISUAL DAN CATATAN ANALISIS */}
      {/* ============================================================ */}
      {(options.includeCharts || options.includeAnalysis) && (
        <div className="print-break-before mt-8 pt-6 border-t-2 border-slate-900">
          {/* Header Lampiran */}
          <div className="text-center pb-3 border-b border-slate-300 mb-5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              LAMPIRAN DOKUMEN LAPORAN RESMI
            </h4>
            <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900 mt-0.5">
              VISUALISASI DIAGRAM GRAFIK DAN EVALUASI OPERASIONAL BBM TAHUN {year}
            </h2>
            <p className="text-[10px] text-slate-500">
              Pemerintah Daerah • {options.agencyName || 'Dinas Perumahan dan Kawasan Permukiman'}
            </p>
          </div>

          {/* Visual Charts Display */}
          {options.includeCharts && (
            <div className="space-y-5 mb-6">
              {/* 1. DIAGRAM BATANG BULANAN */}
              <div className="border border-slate-300 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-xs text-blue-900 uppercase">
                      1. Diagram Batang: Tren Realisasi Bulanan (Tahun {year})
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Distribusi serapan per bulan dengan penanda puncak realisasi tertinggi
                    </p>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[10px]">
                    {data.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-sm inline-block"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                    ))}
                    {highestMonth && highestMonth.total !== null && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[9px] font-bold">
                        <span>★ Puncak: {highestMonth.monthName} ({formatRupiah(highestMonth.total)})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vector SVG Bar Chart */}
                <div className="w-full flex justify-center overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full max-h-[220px]"
                    style={{ fontFeatureSettings: '"tnum"' }}
                  >
                    {/* Y Axis Gridlines and Labels */}
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const stepVal = (ceilMax / 5) * i;
                      const yPos = chartPadTop + plotHeight - (i / 5) * plotHeight;
                      return (
                        <g key={i}>
                          <line
                            x1={chartPadLeft}
                            y1={yPos}
                            x2={chartPadLeft + plotWidth}
                            y2={yPos}
                            stroke={i === 0 ? '#64748b' : '#f1f5f9'}
                            strokeWidth={i === 0 ? '1.5' : '1'}
                          />
                          <text
                            x={chartPadLeft - 8}
                            y={yPos + 3.5}
                            textAnchor="end"
                            fontSize="9"
                            fill="#64748b"
                            fontFamily="monospace"
                          >
                            {formatRupiahCompact(stepVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars for 12 months */}
                    {MONTH_NAMES.map((mName, idx) => {
                      const xPos = chartPadLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                      const isPeak =
                        highestMonth &&
                        highestMonth.monthIndex === idx &&
                        highestMonth.total !== null &&
                        highestMonth.total > 0;

                      let currentY = chartPadTop + plotHeight;
                      let stackSum = 0;

                      return (
                        <g key={mName}>
                          {/* Segments per fuel type */}
                          {data.map((row) => {
                            const val = row.values[idx];
                            if (val === null || val <= 0) return null;
                            stackSum += val;
                            const segmentH = (val / ceilMax) * plotHeight;
                            currentY -= segmentH;

                            return (
                              <rect
                                key={row.id}
                                x={xPos}
                                y={currentY}
                                width={barWidth}
                                height={segmentH}
                                fill={row.color}
                              />
                            );
                          })}

                          {/* Highlight outline & Peak Badge if highest month */}
                          {isPeak ? (
                            <g>
                              <rect
                                x={xPos - 1}
                                y={chartPadTop + plotHeight - (stackSum / ceilMax) * plotHeight - 1}
                                width={barWidth + 2}
                                height={(stackSum / ceilMax) * plotHeight + 2}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                              />
                              <rect
                                x={xPos - 12}
                                y={chartPadTop + plotHeight - (stackSum / ceilMax) * plotHeight - 22}
                                width={barWidth + 24}
                                height="16"
                                rx="3"
                                fill="#fef3c7"
                                stroke="#d97706"
                                strokeWidth="1"
                              />
                              <text
                                x={xPos + barWidth / 2}
                                y={chartPadTop + plotHeight - (stackSum / ceilMax) * plotHeight - 11}
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="bold"
                                fill="#92400e"
                              >
                                PUNCAK
                              </text>
                            </g>
                          ) : stackSum > 0 ? (
                            <text
                              x={xPos + barWidth / 2}
                              y={currentY - 4}
                              textAnchor="middle"
                              fontSize="8"
                              fill="#475569"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {formatRupiahCompact(stackSum)}
                            </text>
                          ) : null}

                          {/* Month Label on X Axis */}
                          <text
                            x={xPos + barWidth / 2}
                            y={chartPadTop + plotHeight + 15}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight={isPeak ? 'bold' : 'normal'}
                            fill={isPeak ? '#b45309' : '#334155'}
                          >
                            {mName.slice(0, 3)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* 2. DIAGRAM LINGKARAN & PROPORSI BAHAN BAKAR */}
              <div className="grid grid-cols-12 gap-4 border border-slate-300 rounded-lg p-4 bg-white">
                {/* Donut Chart Visual */}
                <div className="col-span-5 flex flex-col items-center justify-center p-2 border-r border-slate-200">
                  <h4 className="font-bold text-xs text-amber-900 uppercase mb-2">
                    2. Diagram Lingkaran Proporsi BBM
                  </h4>
                  <div className="relative">
                    <svg
                      width={donutSize}
                      height={donutSize}
                      viewBox={`0 0 ${donutSize} ${donutSize}`}
                    >
                      {donutSlices.map((slice) => (
                        <path
                          key={slice.id}
                          d={slice.pathData}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>
                    {/* Centered Donut label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[8px] uppercase font-bold text-slate-400">
                        TOTAL REALISASI
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatRupiahCompact(grandTotal)}
                      </span>
                      <span className="text-[8px] text-slate-500">Tahun {year}</span>
                    </div>
                  </div>
                </div>

                {/* Composition Breakdown & Quarterly Details */}
                <div className="col-span-7 flex flex-col justify-between py-1">
                  <div>
                    <h5 className="font-bold text-[11px] text-slate-900 mb-2 uppercase">
                      Rincian Alokasi per Jenis Bahan Bakar:
                    </h5>
                    <div className="space-y-2 mb-3">
                      {donutSlices.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-[10px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-bold text-slate-900">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">
                              {formatRupiah(item.total)}
                            </span>
                            <span className="font-mono font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {item.percentage.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quarterly breakdown inside chart card */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1.5 uppercase">
                      Realisasi Kumulatif per Triwulan:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[9px]">
                      {quarters.slice(0, 3).map((q) => (
                        <div key={q.name} className="p-1.5 rounded bg-blue-50/60 border border-blue-100">
                          <span className="font-semibold text-slate-700 block truncate">{q.name}</span>
                          <span className="font-mono font-bold text-blue-900 block mt-0.5">
                            {formatRupiah(q.total)}
                          </span>
                          <span className="text-slate-500 text-[8px] block">
                            {q.percentage.toFixed(1)}% serapan
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytical notes (if included) - DYNAMIC HIGHEST REALIZATION */}
          {options.includeAnalysis && (
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded text-[10px] leading-relaxed mb-6">
              <div className="font-bold text-slate-900 mb-1.5 uppercase flex items-center justify-between">
                <span>Catatan Evaluasi dan Analisis Operasional Tahun {year}:</span>
                <span className="text-slate-500 font-normal">Kajian Realisasi Anggaran</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>
                  Total serapan anggaran bahan bakar operasional periode {year} mencapai{' '}
                  <strong className="font-mono text-slate-900">{formatRupiah(grandTotal)}</strong> dari pagu anggaran{' '}
                  <strong className="font-mono text-slate-900">{formatRupiah(totalBudget)}</strong>, menyisakan sisa realisasi sebesar{' '}
                  <strong className="font-mono text-emerald-800">{formatRupiah(sisaRealisasi)}</strong> dengan rerata bulanan{' '}
                  <strong className="font-mono text-slate-900">{formatRupiah(Math.round(average1Tahun))}</strong> (total 1 tahun).
                </li>
                <li>
                  Bahan bakar <strong>Pertamax</strong> menyerap porsi terbesar sebesar{' '}
                  <strong className="font-mono">{formatRupiah(rowTotals[0]?.total || 0)}</strong> dengan tingkat konsumsi bulanan yang relatif stabil untuk operasional kendaraan dinas.
                </li>
                <li>
                  Pos <strong>Dex Kadin</strong> membukukan realisasi{' '}
                  <strong className="font-mono">{formatRupiah(rowTotals[1]?.total || 0)}</strong> dan pos{' '}
                  <strong>Dex Toilet</strong> membukukan{' '}
                  <strong className="font-mono">{formatRupiah(rowTotals[2]?.total || 0)}</strong> untuk operasional armada dinas luar.
                </li>
                <li>
                  {highestMonth && highestMonth.total !== null ? (
                    <>
                      Puncak realisasi tertinggi tahun {year} tercatat pada bulan{' '}
                      <strong className="text-amber-900">{highestMonth.monthName}</strong> yang mencapai{' '}
                      <strong className="font-mono text-amber-900">{formatRupiah(highestMonth.total)}</strong>, dipicu oleh penambahan mobilitas dan eskalasi armada operasional lapangan.
                    </>
                  ) : (
                    <>Pola serapan bulanan berjalan stabil dan proporsional sesuai rencana penarikan dana.</>
                  )}
                </li>
              </ol>
            </div>
          )}

          {/* Page 2 Confirmation Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-[9px] text-slate-500">
            <span>
              Lampiran resmi Laporan Penggunaan BBM Sekretariat Tahun {year} • Sistem Informasi SiBensin
            </span>
            <span className="font-mono">
              Halaman 2 dari 2
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
