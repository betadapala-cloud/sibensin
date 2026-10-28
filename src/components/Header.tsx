import React from 'react';
import {
  FileDown,
  Printer,
  Save,
  Lock,
  Unlock,
  Database,
  CheckCircle2,
  Cloud,
  Layers,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { ActiveSession } from '../services/accountAuth';

interface HeaderProps {
  onOpenPdfModal: () => void;
  onPrintDirect: () => void;
  onOpenDatabaseModal: () => void;
  isUnlocked: boolean;
  onToggleLock: () => void;
  onManualSave: () => void;
  lastSavedTime: string | null;
  hasUnsavedChanges: boolean;
  onOpenDriveModal: () => void;
  isDriveConnected: boolean;
  userEmail?: string | null;
  isCentralConnected?: boolean;
  isSavingCentral?: boolean;
  activeAccount?: ActiveSession | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPdfModal,
  onPrintDirect,
  onOpenDatabaseModal,
  isUnlocked,
  onToggleLock,
  onManualSave,
  lastSavedTime,
  hasUnsavedChanges,
  onOpenDriveModal,
  isDriveConnected,
  userEmail,
  isCentralConnected = true,
  isSavingCentral = false,
  activeAccount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand title */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              ⛽
            </div>
            <div>
              <span className="font-extrabold text-slate-900">SiBensin</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                BBM Sekretariat
              </span>
            </div>
          </a>

          {/* Central Cloud Database Status Pill */}
          <div
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
            title="Database terpusat Cloud Firestore: Terkunci dan aman dengan otentikasi akun pengembang"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>Database Pusat (Cloud)</span>
          </div>

          {/* Active Account Pill if Unlocked */}
          {isUnlocked && activeAccount && (
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200"
              title={`Masuk sebagai ${activeAccount.name}`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>User: {activeAccount.username}</span>
            </div>
          )}
        </div>

        {/* Action Controls & Protection */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Optional Google Drive Backup Button */}
          <button
            onClick={onOpenDriveModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
              isDriveConnected
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title={
              isDriveConnected
                ? `Cadangan Google Drive aktif (${userEmail || ''})`
                : 'Cadangkan data ke Google Drive pribadi (Opsional)'
            }
          >
            <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-blue-600' : 'text-slate-500'}`} />
            {isDriveConnected ? (
              <span className="hidden md:inline">Drive Terhubung</span>
            ) : (
              <span className="hidden sm:inline">Cadangan Drive</span>
            )}
            <span className="sm:hidden">Drive</span>
          </button>

          {/* Account System Lock / Unlock Button */}
          <button
            onClick={onToggleLock}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
              isUnlocked
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={
              isUnlocked
                ? `Database terbuka oleh ${activeAccount?.username || 'Akun Pengembang'}. Klik untuk mengunci kembali.`
                : 'Database terkunci dengan sistem akun pengembang. Klik untuk membuka kunci.'
            }
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden lg:inline">
                  {activeAccount ? activeAccount.username : 'Terbuka (Edit)'}
                </span>
                <span className="lg:hidden">Terbuka</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">Terkunci (Mode Baca)</span>
                <span className="lg:hidden">Kunci</span>
              </>
            )}
          </button>

          {/* Save Data Button (Protected by lock) */}
          <button
            onClick={onManualSave}
            disabled={isSavingCentral}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
              !isUnlocked
                ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                : hasUnsavedChanges
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title={
              !isUnlocked
                ? 'Database Cloud terkunci. Buka kunci dengan akun pengembang untuk menyimpan perubahan.'
                : lastSavedTime
                ? `Terakhir disimpan ke cloud: ${new Date(lastSavedTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                : 'Klik untuk menyimpan data ke database pusat'
            }
          >
            {isSavingCentral ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : !isUnlocked ? (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5 text-white" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">
              {!isUnlocked ? 'Simpan (Terkunci)' : 'Simpan ke Pusat'}
            </span>
            <span className="sm:hidden">Simpan</span>
          </button>

          {/* Database Import/Export Modal Trigger */}
          <button
            onClick={onOpenDatabaseModal}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
            title="Impor atau Ekspor Database JSON"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Database</span>
          </button>

          {/* Quick Print */}
          <button
            onClick={onPrintDirect}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap border border-slate-300 shadow-2xs cursor-pointer"
            title="Cetak cepat dokumen"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak</span>
          </button>

          {/* PDF Download Button */}
          <button
            onClick={onOpenPdfModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Laporan PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
