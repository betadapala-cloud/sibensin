import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileJson,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  YearlyStore,
  DEFAULT_YEARLY_DATA,
  saveStoredYearlyData,
  AVAILABLE_YEARS,
} from '../data/bbmData';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearlyStore: YearlyStore;
  onRestoreStore: (restored: YearlyStore) => void;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  yearlyStore,
  onRestoreStore,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [importPreview, setImportPreview] = useState<{
    file: File | null;
    years: number[];
    meta: any;
    data: YearlyStore | null;
    error: string | null;
  }>({
    file: null,
    years: [],
    meta: null,
    data: null,
    error: null,
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Database Export
  const handleExportJson = () => {
    try {
      const now = new Date();
      const exportObject = {
        app: 'SiBensin - Rekapitulasi Penggunaan BBM Sekretariat',
        version: '2.0.0',
        exportedAt: now.toISOString(),
        exportedBy: 'Sekretariat Dinas',
        yearsIncluded: Object.keys(yearlyStore).map(Number),
        yearlyStore,
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.download = `Database_BBM_Sekretariat_${dateTag}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: 'File Database JSON berhasil diunduh ke komputer Anda!',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (e) {
      console.error('Export error:', e);
      setNotification({
        type: 'error',
        message: 'Gagal mengekspor database.',
      });
    }
  };

  // Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let dataToLoad: YearlyStore | null = null;
        let metaObj = {};

        if (parsed && typeof parsed === 'object') {
          if (parsed.yearlyStore && typeof parsed.yearlyStore === 'object') {
            dataToLoad = parsed.yearlyStore;
            metaObj = {
              app: parsed.app || 'SiBensin Backup',
              version: parsed.version || '1.0',
              exportedAt: parsed.exportedAt || 'Tidak diketahui',
            };
          } else if (parsed[2026] || parsed['2026']) {
            dataToLoad = parsed;
            metaObj = {
              app: 'SiBensin Direct Store',
              exportedAt: 'Manual / Standar',
            };
          }
        }

        if (!dataToLoad) {
          throw new Error('Format file tidak sesuai standar database SiBensin.');
        }

        const yearsFound = Object.keys(dataToLoad).map(Number);
        if (yearsFound.length === 0) {
          throw new Error('Tidak ada data tahun yang ditemukan di dalam file.');
        }

        setImportPreview({
          file,
          years: yearsFound,
          meta: metaObj,
          data: dataToLoad,
          error: null,
        });
      } catch (err: any) {
        setImportPreview({
          file: null,
          years: [],
          meta: null,
          data: null,
          error: err.message || 'File JSON rusak atau tidak valid.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Commit Import
  const handleApplyImport = () => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }

    if (!importPreview.data) return;

    try {
      const merged: YearlyStore = {
        ...DEFAULT_YEARLY_DATA,
        ...importPreview.data,
      };

      onRestoreStore(merged);
      saveStoredYearlyData(merged);

      setNotification({
        type: 'success',
        message: `Database berhasil diimpor! Total ${importPreview.years.length} tahun anggaran dimuat dan disimpan.`,
      });
      setImportPreview({ file: null, years: [], meta: null, data: null, error: null });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Apply import error:', e);
      setNotification({
        type: 'error',
        message: 'Terjadi kesalahan saat menerapkan database.',
      });
    }
  };

  // Factory Reset
  const handleFactoryReset = () => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }

    if (window.confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke data default bawaan? Seluruh perubahan lokal akan ditimpa.')) {
      onRestoreStore(DEFAULT_YEARLY_DATA);
      saveStoredYearlyData(DEFAULT_YEARLY_DATA);
      setNotification({
        type: 'success',
        message: 'Seluruh database telah dikembalikan ke data awal bawaan dokumen!',
      });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pusat Manajemen Database Aplikasi
              </h3>
              <p className="text-[11px] text-slate-500">
                Ekspor cadangan, impor file database JSON, dan pemulihan data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-2.5 transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ekspor Database
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-2.5 transition-colors ${
              activeTab === 'import'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Impor Database
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`py-2.5 transition-colors ${
              activeTab === 'reset'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Reset Awal
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {notification && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  <span>Cadangan Lengkap SiBensin (.JSON)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Fitur ini akan menyusun seluruh data rekapitulasi 12 bulan untuk seluruh tahun anggaran (2026 s.d. 2030), pagu anggaran per tahun, serta nilai realisasi yang telah Anda simpan ke dalam 1 berkas JSON aman.
                </p>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Cakupan Tahun: <strong>{AVAILABLE_YEARS.join(', ')}</strong></span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Siap Diekspor
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Unduh File Cadangan Database (.json)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {!isUnlocked && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Mode Edit Terkunci. Buka kunci keamanan terlebih dahulu untuk mengimpor file.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestUnlock}
                    className="font-bold underline ml-2 shrink-0 hover:text-amber-900"
                  >
                    Buka Kunci
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Klik untuk Memilih File Cadangan Database (.JSON)
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mendukung format cadangan database resmi SiBensin
                </p>
              </div>

              {importPreview.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importPreview.error}</span>
                </div>
              )}

              {importPreview.data && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-blue-950">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Pratinjau File Valid: {importPreview.file?.name}
                    </span>
                    <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {importPreview.years.length} Tahun Anggaran
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-blue-200/60">
                    <div>
                      Tahun terdeteksi: <strong>{importPreview.years.join(', ')}</strong>
                    </div>
                    <div>
                      Tanggal Ekspor: <strong>{importPreview.meta?.exportedAt ? new Date(importPreview.meta.exportedAt).toLocaleDateString('id-ID') : '-'}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={!importPreview.data}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Terapkan Database Sekarang
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FACTORY RESET */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              {!isUnlocked && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Mode Edit Terkunci. Buka kunci keamanan terlebih dahulu untuk melakukan reset.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestUnlock}
                    className="font-bold underline ml-2 shrink-0 hover:text-amber-900"
                  >
                    Buka Kunci
                  </button>
                </div>
              )}

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pulihkan ke Data Awal Bawaan</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tindakan ini akan menghapus seluruh data yang telah diubah di penyimpanan browser Anda dan mengembalikan nilai tabel, pagu anggaran, serta rincian BBM ke standar dokumen asli (Pertamax, Dex Kadin, dan Dex Toilet).
                </p>
                <p className="text-slate-500 text-[10px] italic">
                  * Disarankan untuk mengekspor cadangan database terlebih dahulu sebelum melakukan reset.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleFactoryReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pulihkan ke Data Asli Bawaan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
