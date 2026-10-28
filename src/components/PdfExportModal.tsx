import React, { useState } from 'react';
import { PdfExportOptions, generateOfficialPdf } from '../utils/pdfGenerator';
import { BbmItemRow } from '../data/bbmData';
import { X, FileDown, Printer, Check, Loader2 } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BbmItemRow[];
  options: PdfExportOptions;
  onChangeOptions: (updated: PdfExportOptions) => void;
  totalBudget?: number;
  year?: number;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  data,
  options,
  onChangeOptions,
  totalBudget = 350000000,
  year = 2026,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      // Small timeout to allow UI loading state to paint
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Capture direct canvas elements
      const barCanvas = document.querySelector(
        '#bar-chart-canvas-container canvas'
      ) as HTMLCanvasElement | null;
      const pieCanvas = document.querySelector(
        '#pie-chart-canvas-container canvas'
      ) as HTMLCanvasElement | null;

      const barBase64 = barCanvas ? barCanvas.toDataURL('image/png') : null;
      const pieBase64 = pieCanvas ? pieCanvas.toDataURL('image/png') : null;

      const success = generateOfficialPdf(
        data,
        options,
        barBase64,
        pieBase64,
        totalBudget,
        year
      );

      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Unduh / Cetak Laporan PDF
              </h3>
              <p className="text-xs text-slate-500">
                Kustomisasi rincian dokumen sebelum diunduh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Laporan
            </label>
            <input
              type="text"
              value={options.title}
              onChange={(e) =>
                onChangeOptions({ ...options, title: e.target.value })
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Instansi / Dinas
            </label>
            <input
              type="text"
              value={options.agencyName}
              onChange={(e) =>
                onChangeOptions({ ...options, agencyName: e.target.value })
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat & Tanggal Laporan
              </label>
              <input
                type="text"
                value={options.reportDate}
                onChange={(e) =>
                  onChangeOptions({ ...options, reportDate: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan Penandatangan
              </label>
              <input
                type="text"
                value={options.signatoryTitle}
                onChange={(e) =>
                  onChangeOptions({ ...options, signatoryTitle: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pejabat / Pengguna Anggaran
              </label>
              <input
                type="text"
                value={options.signatoryName}
                onChange={(e) =>
                  onChangeOptions({ ...options, signatoryName: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Penandatangan
              </label>
              <input
                type="text"
                value={options.signatoryNip}
                onChange={(e) =>
                  onChangeOptions({ ...options, signatoryNip: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options Toggles */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Elemen Lampiran Laporan
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCharts}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    includeCharts: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>Sertakan Ringkasan Diagram Visual (Batang & Lingkaran)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeAnalysis}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    includeAnalysis: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>Sertakan Catatan Analisis & Evaluasi Triwulan</span>
            </label>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dokumen PDF berhasil diunduh ke perangkat Anda!</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Pratinjau Cetak
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Unduh File PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
