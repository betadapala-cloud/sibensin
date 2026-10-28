import React, { useState } from 'react';
import {
  BbmItemRow,
  MONTH_NAMES,
  formatRupiah,
  formatRupiahCompact,
  formatAngka,
  calculateTotals,
} from '../data/bbmData';
import { Table, Download, RotateCcw, Edit3, Check, Lock, Unlock } from 'lucide-react';

interface DataTableSectionProps {
  data: BbmItemRow[];
  year?: number;
  onUpdateData: (newData: BbmItemRow[]) => void;
  onResetData: () => void;
  isModified: boolean;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
}

type NumberFormat = 'rupiah' | 'compact' | 'angka';

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  data,
  year = 2026,
  onUpdateData,
  onResetData,
  isModified,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [format, setFormat] = useState<NumberFormat>('rupiah');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const { rowTotals, monthlyTotals, grandTotal } = calculateTotals(data);

  const renderCellContent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    if (format === 'compact') return formatRupiahCompact(val);
    if (format === 'angka') return formatAngka(val);
    return formatRupiah(val);
  };

  const handleToggleEdit = () => {
    if (!isEditing && !isUnlocked) {
      onRequestUnlock();
      return;
    }
    setIsEditing(!isEditing);
  };

  const handleResetWithLock = () => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    onResetData();
  };

  const handleCellChange = (rowIndex: number, monthIndex: number, rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? null : parseInt(cleaned, 10);
    const updated = data.map((item, rIdx) => {
      if (rIdx !== rowIndex) return item;
      const newVals = [...item.values];
      newVals[monthIndex] = num;
      return { ...item, values: newVals };
    });
    onUpdateData(updated);
  };

  const exportToCsv = () => {
    const headers = ['Kategori BBM', ...MONTH_NAMES, 'Jumlah Keseluruhan'];
    const rows = data.map((item, idx) => {
      const vals = item.values.map((v) => (v !== null ? v : ''));
      return [item.name, ...vals, rowTotals[idx].total];
    });
    const totalRow = [
      'JUMLAH',
      ...monthlyTotals.map((m) => (m.total !== null ? m.total : '')),
      grandTotal,
    ];

    const csvContent = [
      [`Tabel Penggunaan BBM Tahun ${year}`],
      [],
      headers,
      ...rows,
      totalRow,
    ]
      .map((e) => e.join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tabel_Penggunaan_BBM_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="tabel-rekap" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
      {/* Table Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Tabel Penggunaan BBM Tahun {year}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi resmi pengeluaran operasional bahan bakar per bulan (Pertamax, Dex Kadin, Dex Toilet)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFormat('rupiah')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                format === 'rupiah'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rp Lengkap
            </button>
            <button
              onClick={() => setFormat('compact')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                format === 'compact'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Juta (Singkat)
            </button>
            <button
              onClick={() => setFormat('angka')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                format === 'angka'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Angka
            </button>
          </div>

          {/* Mode Edit Toggle with Password Protection */}
          <button
            onClick={handleToggleEdit}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              isEditing
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={!isUnlocked ? "Klik untuk memasukkan password dan membuka mode edit" : "Aktifkan pengeditan nilai"}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" /> Selesai Edit
              </>
            ) : (
              <>
                {isUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Edit / Simulasi Nilai</span>
              </>
            )}
          </button>

          {isModified && (
            <button
              onClick={handleResetWithLock}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Kembalikan nilai ke data asli dokumen"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Asli
            </button>
          )}

          <button
            onClick={exportToCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Download spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>
              <strong>Mode Edit Aktif:</strong> Anda dapat mengubah nilai bulan berjalan atau memasukkan estimasi Oktober-Desember. Grafik dan total akan menyesuaikan secara langsung.
            </span>
          </div>
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs font-semibold text-blue-700 hover:underline shrink-0 ml-3"
          >
            Tutup Mode Edit
          </button>
        </div>
      )}

      {/* Main Table Container (Responsive Horizontal Scroll) */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <th className="py-3 px-3 min-w-[130px] border-r border-slate-200 uppercase tracking-wider text-[11px] sticky left-0 bg-slate-50 z-10">
                BULAN
              </th>
              {MONTH_NAMES.map((month) => (
                <th
                  key={month}
                  className="py-3 px-2.5 min-w-[105px] text-right border-r border-slate-200 font-medium"
                >
                  {month}
                </th>
              ))}
              <th className="py-3 px-3 min-w-[145px] text-right font-bold text-slate-900 bg-slate-100/70 uppercase tracking-wider text-[11px]">
                JUMLAH KESELURUHAN
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((item, rowIdx) => {
              const rowTotal = rowTotals[rowIdx].total;
              const pctOfGrand = grandTotal > 0 ? ((rowTotal / grandTotal) * 100).toFixed(1) : '0';

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Category Name Cell */}
                  <td className="py-3 px-3 font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                  </td>

                  {/* Monthly Values */}
                  {item.values.map((val, mIdx) => (
                    <td
                      key={mIdx}
                      className={`py-2 px-2 text-right font-mono tabular-nums border-r border-slate-200 text-slate-700 ${
                        val === null ? 'text-slate-400 bg-slate-50/30' : ''
                      }`}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={val !== null ? val : ''}
                          placeholder="-"
                          onChange={(e) =>
                            handleCellChange(rowIdx, mIdx, e.target.value)
                          }
                          className="w-full text-right py-1 px-1.5 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span>{renderCellContent(val)}</span>
                      )}
                    </td>
                  ))}

                  {/* Row Total */}
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/50">
                    <div className="flex flex-col items-end">
                      <span>{renderCellContent(rowTotal)}</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {pctOfGrand}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Total Footer Row (JUMLAH) */}
            <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <td className="py-3 px-3 border-r border-slate-300 uppercase tracking-wider text-[11px] sticky left-0 bg-slate-100 z-10">
                JUMLAH
              </td>
              {monthlyTotals.map((m) => (
                <td
                  key={m.monthIndex}
                  className="py-3 px-2 text-right font-mono tabular-nums border-r border-slate-300 text-slate-900"
                >
                  {renderCellContent(m.total)}
                </td>
              ))}
              <td className="py-3 px-3 text-right font-mono tabular-nums text-sm font-extrabold text-blue-900 bg-blue-50/70">
                {renderCellContent(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>* Nilai (-) menandakan belum ada realisasi / alokasi pada bulan tersebut.</span>
        <span className="font-mono tabular-nums">Total Akumulasi: {formatRupiah(grandTotal)}</span>
      </div>
    </section>
  );
};
