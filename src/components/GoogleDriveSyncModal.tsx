import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  TARGET_EMAIL,
} from '../services/googleDriveAuth';
import {
  findDatabaseInDrive,
  downloadDatabaseFromDrive,
  uploadDatabaseToDrive,
  DriveFileInfo,
  DATABASE_FILENAME,
} from '../services/googleDriveService';
import { YearlyStore, saveStoredYearlyData } from '../data/bbmData';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  LogOut,
  RefreshCw,
  HardDrive,
  Check,
  ShieldAlert,
  Mail,
  UserCheck,
} from 'lucide-react';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearlyStore: YearlyStore;
  onApplyDatabase: (store: YearlyStore) => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  lastLocalSavedTime: string | null;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  yearlyStore,
  onApplyDatabase,
  currentUser,
  onUserChange,
  autoSyncEnabled,
  onToggleAutoSync,
  lastLocalSavedTime,
}) => {
  const [driveFile, setDriveFile] = useState<DriveFileInfo | null>(null);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState<'upload' | 'download' | 'login' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'upload' | 'download' | null>(null);

  // Check Drive file when modal opens and user is logged in
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      checkDriveStatus();
    }
  }, [isOpen, currentUser?.uid]);

  const checkDriveStatus = async () => {
    setIsLoadingDrive(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const file = await findDatabaseInDrive(token);
      setDriveFile(file);
    } catch (err: any) {
      console.error('Error checking Drive file:', err);
      setMessage({
        type: 'error',
        text: 'Tidak dapat memeriksa file di Google Drive: ' + (err.message || 'Error koneksi'),
      });
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleLogin = async () => {
    setIsProcessing(true);
    setProcessType('login');
    setMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
        setMessage({
          type: 'success',
          text: `Berhasil terhubung dengan Google Drive (${res.user.email}).`,
        });
        const file = await findDatabaseInDrive(res.accessToken);
        setDriveFile(file);
      } else {
        setMessage({
          type: 'info',
          text: 'Jendela masuk akun Google ditutup. Silakan klik tombol lagi jika ingin menghubungkan Google Drive.',
        });
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Login error:', err);
      }
      setMessage({
        type: 'error',
        text: 'Gagal menghubungkan Google: ' + (err.message || 'Proses otorisasi dibatalkan'),
      });
    } finally {
      setIsProcessing(false);
      setProcessType(null);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    onUserChange(null);
    setDriveFile(null);
    setMessage({
      type: 'info',
      text: 'Anda telah keluar dari akun Google.',
    });
  };

  // Upload/Save to Drive
  const executeUploadToDrive = async () => {
    setIsProcessing(true);
    setProcessType('upload');
    setMessage(null);
    setConfirmAction(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setMessage({
            type: 'info',
            text: 'Login dibatalkan. Tidak ada data yang diunggah ke Google Drive.',
          });
          return;
        }
        token = loginRes.accessToken;
        onUserChange(loginRes.user);
      }

      const res = await uploadDatabaseToDrive(
        token,
        yearlyStore,
        currentUser?.email || undefined,
        driveFile?.id
      );

      setDriveFile({
        id: res.fileId,
        name: DATABASE_FILENAME,
        modifiedTime: res.modifiedTime,
      });

      setMessage({
        type: 'success',
        text: `Database berhasil disimpan dan disinkronkan ke Google Drive (${currentUser?.email || TARGET_EMAIL})!`,
      });
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Upload error:', err);
      }
      setMessage({
        type: 'error',
        text: 'Gagal mengunggah ke Google Drive: ' + (err.message || 'Kesalahan jaringan'),
      });
    } finally {
      setIsProcessing(false);
      setProcessType(null);
    }
  };

  // Download/Load from Drive
  const executeDownloadFromDrive = async () => {
    if (!driveFile) return;

    setIsProcessing(true);
    setProcessType('download');
    setMessage(null);
    setConfirmAction(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setMessage({
            type: 'info',
            text: 'Login dibatalkan. Tidak ada data yang diunduh dari Google Drive.',
          });
          return;
        }
        token = loginRes.accessToken;
        onUserChange(loginRes.user);
      }

      const driveData = await downloadDatabaseFromDrive(token, driveFile.id);
      onApplyDatabase(driveData.yearlyStore);
      saveStoredYearlyData(driveData.yearlyStore);

      setMessage({
        type: 'success',
        text: `Data versi terakhir dari Google Drive (${new Date(driveData.lastSaved).toLocaleString('id-ID')}) berhasil diterapkan ke browser ini!`,
      });
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Download error:', err);
      }
      setMessage({
        type: 'error',
        text: 'Gagal mengunduh dari Google Drive: ' + (err.message || 'Kesalahan jaringan'),
      });
    } finally {
      setIsProcessing(false);
      setProcessType(null);
    }
  };

  if (!isOpen) return null;

  const isTargetAccount = currentUser?.email?.toLowerCase() === TARGET_EMAIL.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Integrasi Google Drive SiBensin
              </h3>
              <p className="text-[11px] text-slate-500">
                Penyimpanan & sinkronisasi database rekapitulasi BBM di Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Multi-user central notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
            <span className="font-bold">ℹ️ Info Database Terpusat:</span> Seluruh pengguna dapat langsung mengakses dan melihat data terbaru aplikasi tanpa wajib menghubungkan Google Drive. Fitur Google Drive ini disediakan sebagai <strong>cadangan berkas berkala (offsite backup)</strong> ke akun Google Anda.
          </div>

          {/* Target Account Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Akun Drive Target:</span>
              <strong className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                {TARGET_EMAIL}
              </strong>
            </div>
            {isTargetAccount && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Cocok
              </span>
            )}
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-blue-50 border border-blue-200 text-blue-900'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* User Sign-In Section */}
          {!currentUser ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Hubungkan Google Drive
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Hubungkan akun Google Drive <strong className="text-slate-800">{TARGET_EMAIL}</strong> agar setiap perubahan rekapitulasi BBM tersimpan aman di cloud dan dapat diakses bersama atau dibuka di komputer lain.
                </p>
              </div>

              {/* Official Google Sign In Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing && processType === 'login' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>Hubungkan Akun Google ({TARGET_EMAIL})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Strip */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-9 h-9 rounded-full border border-blue-300"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{currentUser.displayName || 'Pengguna Google'}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Terhubung
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Keluar dari akun Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {!isTargetAccount && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Perhatian akun Google:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Anda sedang terhubung sebagai <strong>{currentUser.email}</strong>. Jika Anda ingin menghubungkan dengan <strong>{TARGET_EMAIL}</strong>, silakan keluar lalu masuk kembali dengan memilih akun tersebut.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Comparison Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    Status Berkas Google Drive:
                  </span>
                  <button
                    onClick={checkDriveStatus}
                    disabled={isLoadingDrive}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    Perbarui Status
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-400 font-semibold uppercase text-[10px] flex items-center gap-1 mb-1">
                      <HardDrive className="w-3 h-3 text-slate-600" />
                      Browser Ini (Lokal)
                    </div>
                    <div className="text-slate-800 font-medium">
                      {lastLocalSavedTime
                        ? new Date(lastLocalSavedTime).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Belum disimpan'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-400 font-semibold uppercase text-[10px] flex items-center gap-1 mb-1">
                      <Cloud className="w-3 h-3 text-blue-600" />
                      Google Drive (Cloud)
                    </div>
                    <div className="text-slate-800 font-medium">
                      {isLoadingDrive ? (
                        <span className="text-slate-400">Memeriksa...</span>
                      ) : driveFile ? (
                        new Date(driveFile.modifiedTime).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      ) : (
                        <span className="text-amber-700 font-medium">Belum ada berkas di Drive</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Auto Sync Toggle & Auto-Import on Reload Info */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-xs">
                      Sinkronisasi & Impor Otomatis saat Dimuat
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Otomatis memuat berkas '{DATABASE_FILENAME}' dari Drive saat aplikasi dibuka & memperbarui cloud saat simpan data
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAutoSync(!autoSyncEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoSyncEnabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Confirmation Dialogs for Workspace API safety */}
              {confirmAction === 'upload' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Konfirmasi Simpan ke Google Drive</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Apakah Anda ingin menyimpan seluruh data tabel dan anggaran saat ini ke Google Drive Anda ({currentUser.email})? Berkas cadangan yang ada di cloud akan diperbarui.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1 text-slate-600 hover:text-slate-800 text-[11px]"
                    >
                      Batal
                    </button>
                    <button
                      onClick={executeUploadToDrive}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-[11px] font-semibold hover:bg-blue-700"
                    >
                      Ya, Simpan ke Drive
                    </button>
                  </div>
                </div>
              )}

              {confirmAction === 'download' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Konfirmasi Mengambil Data dari Drive</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Apakah Anda ingin mengganti data di browser ini dengan data terakhir yang tersimpan di Google Drive ({new Date(driveFile?.modifiedTime || '').toLocaleString('id-ID')})?
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1 text-slate-600 hover:text-slate-800 text-[11px]"
                    >
                      Batal
                    </button>
                    <button
                      onClick={executeDownloadFromDrive}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-semibold hover:bg-emerald-700"
                    >
                      Ya, Terapkan Data Drive
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmAction('upload')}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing && processType === 'upload' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>Simpan ke Google Drive</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmAction('download')}
                  disabled={isProcessing || !driveFile}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing && processType === 'download' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengimpor dari Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudDownload className="w-4 h-4 text-emerald-600" />
                      <span>Impor dari Drive ({DATABASE_FILENAME})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Berkas: <code className="font-mono text-slate-700 font-semibold">{DATABASE_FILENAME}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
