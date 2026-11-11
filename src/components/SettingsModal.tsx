import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Settings,
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
  Unlock,
  Cloud,
  Layers,
  Save,
  Loader2,
  HardDrive,
  UserCheck,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  YearlyStore,
  DEFAULT_YEARLY_DATA,
  saveStoredYearlyData,
  AVAILABLE_YEARS,
  formatRupiah,
} from '../data/bbmData';
import { ActiveSession } from '../services/accountAuth';
import {
  findDatabaseInDrive,
  downloadDatabaseFromDrive,
  uploadDatabaseToDrive,
  DATABASE_FILENAME,
} from '../services/googleDriveService';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
} from '../services/googleDriveAuth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearlyStore: YearlyStore;
  onRestoreStore: (restored: YearlyStore) => void;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
  onManualSave: () => void;
  isSavingCentral: boolean;
  lastSavedTime: string | null;
  activeAccount: ActiveSession | null;
  onLockDatabase: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

type TabType = 'database' | 'drive' | 'reset' | 'account';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  yearlyStore,
  onRestoreStore,
  isUnlocked,
  onRequestUnlock,
  onManualSave,
  isSavingCentral,
  lastSavedTime,
  activeAccount,
  onLockDatabase,
  currentUser,
  onUserChange,
  autoSyncEnabled,
  onToggleAutoSync,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('database');

  // Import State
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

  // Google Drive State
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveLastSync, setDriveLastSync] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Export Database
  const handleExportJson = () => {
    try {
      const now = new Date();
      const exportObject = {
        app: 'SiBensin - Rekapitulasi Penggunaan BBM Sekretariat',
        version: '2.0.0',
        exportedAt: now.toISOString(),
        exportedBy: activeAccount ? activeAccount.username : 'Sekretariat Dinas',
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

      showToast('File Database JSON cadangan berhasil diunduh ke komputer Anda!');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Gagal mengekspor database.', 'error');
    }
  };

  // File Change for Import
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

  // Apply Import
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

      showToast(`Database berhasil diimpor! Total ${importPreview.years.length} tahun anggaran dimuat dan disimpan.`);
      setImportPreview({ file: null, years: [], meta: null, data: null, error: null });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Apply import error:', e);
      showToast('Terjadi kesalahan saat menerapkan database.', 'error');
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
      showToast('Seluruh database telah dikembalikan ke data awal bawaan dokumen!');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  // Google Drive Connect
  const handleConnectDrive = async () => {
    setIsDriveLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
        showToast(`Google Drive berhasil terhubung: ${res.user.email}`);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Gagal menghubungkan Google Drive: ' + (err.message || 'Error'), 'error');
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Google Drive Disconnect
  const handleDisconnectDrive = async () => {
    setIsDriveLoading(true);
    try {
      await googleLogout();
      onUserChange(null);
      showToast('Tautan Google Drive diputuskan.');
    } catch (e) {
      showToast('Gagal memutuskan tautan Drive.', 'error');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Manual Upload to Drive
  const handleManualUploadDrive = async () => {
    setIsDriveLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesi Google Drive kedaluwarsa.');
      const existing = await findDatabaseInDrive(token);
      const res = await uploadDatabaseToDrive(
        token,
        yearlyStore,
        currentUser?.email || undefined,
        existing?.id
      );
      setDriveLastSync(res.modifiedTime);
      showToast('Cadangan berhasil diunggah ke Google Drive Anda!');
    } catch (err: any) {
      showToast('Gagal mengunggah ke Drive: ' + err.message, 'error');
    } finally {
      setIsDriveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pengaturan Sistem & Database</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Pusat kendali database, ekspor/impor cadangan, dan integrasi cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 text-xs font-semibold text-center bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-3 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Ekspor / Impor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`py-3 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'drive'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-3 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'account'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci & Akun</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`py-3 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'reset'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {notification && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
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

          {/* TAB 1: EKSPOR & IMPOR DATABASE */}
          {activeTab === 'database' && (
            <div className="space-y-5">
              {/* Cloud Database Status Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-blue-50/60 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Database Terpusat (Cloud Firestore)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {lastSavedTime
                        ? `Terakhir disimpan: ${new Date(lastSavedTime).toLocaleString('id-ID')}`
                        : 'Tersimpan otomatis di cloud'}
                    </span>
                  </div>
                </div>
                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={onManualSave}
                    disabled={isSavingCentral}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSavingCentral ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan ke Cloud</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md font-medium">
                    Mode Baca (Terkunci)
                  </span>
                )}
              </div>

              {/* Ekspor Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <FileJson className="w-4 h-4 text-indigo-600" />
                    <span>Ekspor Cadangan Database (.JSON)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tahun {AVAILABLE_YEARS.join(', ')}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Unduh seluruh data rekapitulasi 12 bulan dan pagu anggaran untuk tahun 2026 s.d. 2030 ke dalam berkas cadangan JSON yang aman.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan JSON</span>
                  </button>
                </div>
              </div>

              {/* Impor Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Impor Cadangan Database</span>
                  </div>
                  {!isUnlocked && (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                      Perlu Buka Kunci
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-800">
                    Klik untuk Memilih File Cadangan Database (.JSON)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Memuat kembali struktur data SiBensin yang tersimpan
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
                        Pratinjau File: {importPreview.file?.name}
                      </span>
                      <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {importPreview.years.length} Tahun Anggaran
                      </span>
                    </div>
                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleApplyImport}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Terapkan Database</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE BACKUP */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <span>Cadangan Offsite Google Drive (Opsional)</span>
                  </div>
                  {currentUser ? (
                    <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                      Terhubung
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      Belum Terhubung
                    </span>
                  )}
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Simpan salinan cadangan database berkala ke akun Google Drive pribadi Anda untuk perlindungan ganda di luar database cloud utama.
                </p>

                {currentUser ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt="Avatar"
                            className="w-7 h-7 rounded-full"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                            {currentUser.email?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {currentUser.displayName || 'Akun Google'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {currentUser.email}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleDisconnectDrive}
                        disabled={isDriveLoading}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Putuskan
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSyncEnabled}
                          onChange={(e) => onToggleAutoSync(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Sinkronisasi otomatis saat menyimpan</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleManualUploadDrive}
                        disabled={isDriveLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {isDriveLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Unggah Sekarang</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={handleConnectDrive}
                      disabled={isDriveLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-blue-600" />
                      <span>Hubungkan Akun Google Drive</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: KUNCI & AKUN KEAMANAN */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Status Hak Akses Database</span>
                  </div>
                  {isUnlocked ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      Terbuka (Hak Edit Aktif)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      Terkunci (Mode Baca)
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">User Resmi Aplikasi:</span>
                      <strong className="text-slate-900 font-mono">admin</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Status Sesi Saat Ini:</span>
                      <strong className="text-slate-900">
                        {isUnlocked
                          ? `${activeAccount?.username || 'admin'} (Terotentikasi)`
                          : 'Belum Masuk'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Buka kunci untuk mengedit tabel, mengubah anggaran, dan menyimpan data.
                  </p>
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        onLockDatabase();
                        showToast('Database berhasil dikunci kembali.');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Database</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestUnlock();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Akun</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESET STANDAR */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pulihkan ke Data Awal Bawaan Dokumen</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tindakan ini akan mengembalikan seluruh nilai tabel rekapitulasi, pagu anggaran, serta rincian jenis BBM ke standar dokumen asli (Pertamax, Dex Kadin, dan Dex Toilet).
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleFactoryReset}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Pulihkan ke Data Asli Bawaan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {activeAccount
              ? `Login: ${activeAccount.username} (${activeAccount.name})`
              : 'Akses: Mode Baca (Terkunci)'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
