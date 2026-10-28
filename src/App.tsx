/**
 * SiBensin - Rekapitulasi Penggunaan BBM Sekretariat
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  BbmItemRow,
  AppYear,
  YearlyStore,
  DEFAULT_YEARLY_DATA,
  getStoredYearlyData,
  saveStoredYearlyData,
} from './data/bbmData';
import {
  initAuth,
  getAccessToken,
  googleSignIn,
  auth,
} from './services/googleDriveAuth';
import {
  findDatabaseInDrive,
  downloadDatabaseFromDrive,
  uploadDatabaseToDrive,
  DATABASE_FILENAME,
} from './services/googleDriveService';
import {
  testConnection,
  fetchCentralDatabase,
  saveCentralDatabase,
  subscribeToCentralDatabase,
} from './services/firebaseFirestore';
import {
  ActiveSession,
  getActiveSession,
  clearActiveSession,
} from './services/accountAuth';
import { Header } from './components/Header';
import { YearSelector } from './components/YearSelector';
import { KpiCards } from './components/KpiCards';
import { BarChartSection } from './components/BarChartSection';
import { PieChartSection } from './components/PieChartSection';
import { DataTableSection } from './components/DataTableSection';
import { QuarterlyAnalysis } from './components/QuarterlyAnalysis';
import { PdfExportModal } from './components/PdfExportModal';
import { PrintReportView } from './components/PrintReportView';
import { PasswordModal } from './components/PasswordModal';
import { DatabaseModal } from './components/DatabaseModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { PdfExportOptions } from './utils/pdfGenerator';
import {
  ShieldCheck,
  CalendarCheck2,
  Save,
  CheckCircle2,
  Lock,
  Unlock,
  Database,
  RotateCcw,
  Cloud,
  Loader2,
  Layers,
  Globe2,
  Users,
  RefreshCw,
  UserCheck,
  Shield,
} from 'lucide-react';

const STORAGE_AUTOSYNC_KEY = 'sibensin_autosync_drive';

export default function App() {
  const [selectedYear, setSelectedYear] = useState<AppYear>(2026);
  const [yearlyStore, setYearlyStore] = useState<YearlyStore>(() => {
    const { data } = getStoredYearlyData();
    return data || DEFAULT_YEARLY_DATA;
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    const { lastSaved } = getStoredYearlyData();
    return lastSaved;
  });
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Central Database (Cloud Firestore) state
  const [isLoadingCentralDb, setIsLoadingCentralDb] = useState<boolean>(true);
  const [isSavingCentral, setIsSavingCentral] = useState<boolean>(false);
  const [isCentralConnected, setIsCentralConnected] = useState<boolean>(true);

  // Account System & Cloud Firestore Database Lock State
  const [activeAccount, setActiveAccount] = useState<ActiveSession | null>(() => {
    return getActiveSession();
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return !!getActiveSession();
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  // Google Drive Sync State (Personal / Offsite Backup)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_AUTOSYNC_KEY) !== 'false';
  });
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [isImportingFromDrive, setIsImportingFromDrive] = useState<boolean>(false);
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<string | null>(null);

  // Database Import/Export Modal State
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState<boolean>(false);

  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Ref to track latest yearlyStore without re-render triggers
  const yearlyStoreRef = useRef(yearlyStore);
  yearlyStoreRef.current = yearlyStore;

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show transient toast safely
  const triggerToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // 1. Central Cloud Firestore initialization and live real-time subscription
  useEffect(() => {
    let isSubscribed = true;

    // Test Firestore connection on boot
    testConnection();

    // Setup real-time listener for the central database
    const unsubscribeSnapshot = subscribeToCentralDatabase(
      (payload) => {
        if (!isSubscribed) return;
        setYearlyStore(payload.yearlyStore);
        saveStoredYearlyData(payload.yearlyStore);
        setLastSavedTime(payload.lastSaved);
        setLastUpdatedBy(payload.updatedBy);
        setIsLoadingCentralDb(false);
        setIsCentralConnected(true);
      },
      (err) => {
        console.warn('Central database listener notice:', err);
        if (!isSubscribed) return;
        setIsLoadingCentralDb(false);
      }
    );

    // Initial fetch / seed if database document is empty
    fetchCentralDatabase()
      .then(async (payload) => {
        if (!isSubscribed) return;
        if (payload) {
          setYearlyStore(payload.yearlyStore);
          saveStoredYearlyData(payload.yearlyStore);
          setLastSavedTime(payload.lastSaved);
          setLastUpdatedBy(payload.updatedBy);
          setIsLoadingCentralDb(false);
          setIsCentralConnected(true);
        } else {
          try {
            const initialStore = yearlyStoreRef.current;
            const ts = await saveCentralDatabase(initialStore, 'Inisialisasi Sistem SiBensin');
            if (isSubscribed) {
              setLastSavedTime(ts);
              setLastUpdatedBy('Inisialisasi Sistem SiBensin');
              setIsCentralConnected(true);
            }
          } catch (e) {
            console.warn('Could not seed initial Firestore document:', e);
          } finally {
            if (isSubscribed) setIsLoadingCentralDb(false);
          }
        }
      })
      .catch((err) => {
        console.warn('Initial central database fetch warning:', err);
        if (isSubscribed) setIsLoadingCentralDb(false);
      });

    return () => {
      isSubscribed = false;
      unsubscribeSnapshot();
    };
  }, []);

  // 2. Initialize Firebase Auth for optional Google Drive offsite backup
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = initAuth(
      (user) => {
        if (!isSubscribed) return;
        setCurrentUser(user);
      },
      () => {
        if (!isSubscribed) return;
        setCurrentUser(null);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem(STORAGE_AUTOSYNC_KEY, enabled ? 'true' : 'false');
    triggerToast(
      enabled
        ? 'Sinkronisasi cadangan Google Drive diaktifkan.'
        : 'Sinkronisasi cadangan Google Drive dinonaktifkan.'
    );
  };

  // Sync to Google Drive helper (Optional personal backup)
  const syncToDriveIfConnected = useCallback(
    async (storeToUpload: YearlyStore) => {
      if (!autoSyncEnabled) return;
      const token = await getAccessToken();
      if (!token) return;

      setIsSyncingDrive(true);
      try {
        const driveFile = await findDatabaseInDrive(token);
        const res = await uploadDatabaseToDrive(
          token,
          storeToUpload,
          auth.currentUser?.email || undefined,
          driveFile?.id
        );
        setLastDriveSyncTime(res.modifiedTime);
      } catch (err) {
        console.error('Auto sync to Drive failed:', err);
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [autoSyncEnabled]
  );

  // Manual explicit pull from Cloud Firestore
  const handleManualRefreshCentral = async () => {
    setIsLoadingCentralDb(true);
    try {
      const payload = await fetchCentralDatabase();
      if (payload) {
        setYearlyStore(payload.yearlyStore);
        saveStoredYearlyData(payload.yearlyStore);
        setLastSavedTime(payload.lastSaved);
        setLastUpdatedBy(payload.updatedBy);
        triggerToast('✅ Database pusat terbaru dari cloud berhasil dimuat ulang!');
      } else {
        triggerToast('Database pusat belum memiliki catatan tersimpan.');
      }
    } catch (e: any) {
      triggerToast('Gagal memuat ulang database pusat: ' + (e.message || 'Kesalahan jaringan'));
    } finally {
      setIsLoadingCentralDb(false);
    }
  };

  // Active year dataset & budget
  const currentYearObj = yearlyStore[selectedYear] || DEFAULT_YEARLY_DATA[2026];
  const data = currentYearObj.data;
  const totalBudget = currentYearObj.budget;

  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>({
    title: `LAPORAN REKAPITULASI PENGGUNAAN BBM SEKRETARIAT TAHUN ${selectedYear}`,
    agencyName: 'DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN',
    reportDate: `Pasuruan, 18 Oktober ${selectedYear}`,
    signatoryTitle: 'Kuasa Pengguna Anggaran',
    signatoryName: 'H. Syaiful Anwar, S.STP., M.Si.',
    signatoryNip: '19780512 200501 1 008',
    includeCharts: true,
    includeAnalysis: true,
  });

  const isModified =
    JSON.stringify(data) !==
    JSON.stringify(DEFAULT_YEARLY_DATA[selectedYear]?.data);

  const handleSelectYear = (year: AppYear) => {
    setSelectedYear(year);
    setPdfOptions((prev) => ({
      ...prev,
      title: `LAPORAN REKAPITULASI PENGGUNAAN BBM SEKRETARIAT TAHUN ${year}`,
      reportDate: `Pasuruan, 18 Oktober ${year}`,
    }));
  };

  // Update Data (Guarded by Developer Account Lock)
  const handleUpdateData = async (newData: BbmItemRow[]) => {
    if (!isUnlocked) {
      triggerToast('🔒 Database terkunci. Buka kunci dengan akun pengembang untuk mengedit data.');
      setIsPasswordModalOpen(true);
      return;
    }

    const updated: YearlyStore = {
      ...yearlyStoreRef.current,
      [selectedYear]: {
        ...yearlyStoreRef.current[selectedYear],
        data: newData,
      },
    };
    setYearlyStore(updated);
    saveStoredYearlyData(updated);

    const userLabel = activeAccount
      ? `${activeAccount.name} (${activeAccount.username})`
      : 'Administrator DPKP';

    try {
      const ts = await saveCentralDatabase(updated, userLabel);
      setLastSavedTime(ts);
      setLastUpdatedBy(userLabel);
    } catch (e) {
      console.warn('Auto save to central database notice:', e);
    }

    syncToDriveIfConnected(updated);
    setHasUnsavedChanges(false);
  };

  const handleUpdateBudget = async (newBudget: number) => {
    if (!isUnlocked) {
      triggerToast('🔒 Database terkunci. Buka kunci dengan akun pengembang untuk mengubah pagu anggaran.');
      setIsPasswordModalOpen(true);
      return;
    }

    const updated: YearlyStore = {
      ...yearlyStoreRef.current,
      [selectedYear]: {
        ...yearlyStoreRef.current[selectedYear],
        budget: newBudget,
      },
    };
    setYearlyStore(updated);
    saveStoredYearlyData(updated);

    const userLabel = activeAccount
      ? `${activeAccount.name} (${activeAccount.username})`
      : 'Administrator DPKP';

    try {
      const ts = await saveCentralDatabase(updated, userLabel);
      setLastSavedTime(ts);
      setLastUpdatedBy(userLabel);
    } catch (e) {
      console.warn('Auto save budget to central database notice:', e);
    }

    syncToDriveIfConnected(updated);
    setHasUnsavedChanges(false);
  };

  // Manual explicit save action to Central Cloud Firestore + Local + Drive (Guarded by Account Lock)
  const handleManualSave = useCallback(async () => {
    if (!isUnlocked) {
      triggerToast('🔒 Database Cloud Firestore terkunci. Silakan masuk dengan akun yang telah ditetapkan oleh pengembang untuk menyimpan perubahan.');
      setIsPasswordModalOpen(true);
      return;
    }

    setIsSavingCentral(true);
    const currentStore = yearlyStoreRef.current;
    const accountLabel = activeAccount
      ? `${activeAccount.name} (${activeAccount.username})`
      : 'Administrator DPKP';

    // 1. Save to local browser memory
    const ts = saveStoredYearlyData(currentStore);
    setLastSavedTime(ts);
    setHasUnsavedChanges(false);

    // 2. Save to Central Cloud Firestore
    try {
      const cloudTs = await saveCentralDatabase(currentStore, accountLabel);
      setLastSavedTime(cloudTs);
      setLastUpdatedBy(accountLabel);
      setIsCentralConnected(true);
      triggerToast(`✅ Database berhasil disimpan ke Cloud Firestore oleh ${accountLabel}! Pengguna lain dapat langsung mengakses data ini.`);
    } catch (err) {
      console.error('Failed to save to central Firestore:', err);
      triggerToast('Data tersimpan di browser lokal (Koneksi cloud terganggu).');
    } finally {
      setIsSavingCentral(false);
    }

    // 3. If connected to Google Drive, also backup offsite
    let token = await getAccessToken();
    if (token) {
      setIsSyncingDrive(true);
      try {
        const driveFile = await findDatabaseInDrive(token);
        const res = await uploadDatabaseToDrive(
          token,
          currentStore,
          auth.currentUser?.email || undefined,
          driveFile?.id
        );
        setLastDriveSyncTime(res.modifiedTime);
      } catch (e) {
        console.warn('Drive backup notice:', e);
      } finally {
        setIsSyncingDrive(false);
      }
    }
  }, [isUnlocked, activeAccount, triggerToast]);

  // Restore/reload last saved from local storage
  const handleReloadSavedData = () => {
    const { data: loadedData, lastSaved } = getStoredYearlyData();
    if (loadedData) {
      setYearlyStore(loadedData);
      setLastSavedTime(lastSaved);
      triggerToast('Data simpanan lokal terakhir berhasil dimuat ulang.');
    }
  };

  const handleResetCurrentYearData = async () => {
    if (!isUnlocked) {
      triggerToast('🔒 Database terkunci. Buka kunci dengan akun pengembang untuk mereset data.');
      setIsPasswordModalOpen(true);
      return;
    }

    const updated: YearlyStore = {
      ...yearlyStoreRef.current,
      [selectedYear]: {
        ...yearlyStoreRef.current[selectedYear],
        data: DEFAULT_YEARLY_DATA[selectedYear]?.data,
      },
    };
    setYearlyStore(updated);
    saveStoredYearlyData(updated);

    const userLabel = activeAccount
      ? `${activeAccount.name} (${activeAccount.username})`
      : 'Administrator DPKP';

    try {
      const ts = await saveCentralDatabase(updated, userLabel);
      setLastSavedTime(ts);
      setLastUpdatedBy(userLabel);
    } catch (e) {
      console.warn('Reset sync notice:', e);
    }

    syncToDriveIfConnected(updated);
    triggerToast(`Data tahun ${selectedYear} berhasil dikembalikan ke standar awal dokumen.`);
  };

  // Account Lock / Unlock Handler
  const handleToggleLock = () => {
    if (isUnlocked) {
      clearActiveSession();
      setActiveAccount(null);
      setIsUnlocked(false);
      triggerToast('🔒 Database Cloud Firestore dikunci kembali. Akses kini dalam Mode Baca.');
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  const handleUnlockSuccess = (session: ActiveSession) => {
    setActiveAccount(session);
    setIsUnlocked(true);
    triggerToast(`🔓 Kunci database dibuka! Masuk sebagai ${session.username} (${session.name}).`);
  };

  // Database Restore from Import or Cloud
  const handleRestoreStore = async (restored: YearlyStore) => {
    if (!isUnlocked) {
      triggerToast('🔒 Database terkunci. Buka kunci dengan akun pengembang untuk menerapkan cadangan.');
      setIsPasswordModalOpen(true);
      return;
    }

    setYearlyStore(restored);
    const ts = saveStoredYearlyData(restored);
    setLastSavedTime(ts);

    const userLabel = activeAccount
      ? `${activeAccount.name} (${activeAccount.username})`
      : 'Pemulihan Database';

    try {
      await saveCentralDatabase(restored, userLabel);
      setLastUpdatedBy(userLabel);
    } catch (e) {
      console.warn('Restore central sync notice:', e);
    }

    syncToDriveIfConnected(restored);
    triggerToast('Database berhasil diterapkan dan disinkronkan ke Database Pusat.');
  };

  const handlePrintDirect = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Screen App View (Hidden during print) */}
      <div className="no-print flex flex-col flex-1">
        {/* Navigation Top Bar */}
        <Header
          onOpenPdfModal={() => setIsPdfModalOpen(true)}
          onPrintDirect={handlePrintDirect}
          onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
          isUnlocked={isUnlocked}
          onToggleLock={handleToggleLock}
          onManualSave={handleManualSave}
          lastSavedTime={lastSavedTime}
          hasUnsavedChanges={hasUnsavedChanges}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          isDriveConnected={!!currentUser}
          userEmail={currentUser?.email}
          isCentralConnected={isCentralConnected}
          isSavingCentral={isSavingCentral}
          activeAccount={activeAccount}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
          {/* Hero Section */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
                <CalendarCheck2 className="w-4 h-4" />
                <span>LAPORAN RESMI REALISASI OPERASIONAL</span>
                <span aria-hidden="true">•</span>
                <span>TAHUN ANGGARAN {selectedYear}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Rekapitulasi Penggunaan BBM Sekretariat
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Dashboard resmi analisis konsumsi bahan bakar operasional Sekretariat (Pertamax, Dex Kadin, Dex Toilet) dengan database Cloud Firestore yang dikunci oleh sistem akun pengembang.
              </p>
            </div>

            {/* Quick Badges / Meta & Central Cloud Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs text-slate-500">
              {/* Account Lock Pill */}
              <button
                onClick={handleToggleLock}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs ${
                  isUnlocked
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
                title={
                  isUnlocked
                    ? `Terotentikasi sebagai ${activeAccount?.username}. Klik untuk mengunci kembali.`
                    : 'Database terkunci dengan sistem akun pengembang. Klik untuk membuka kunci.'
                }
              >
                {isUnlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Terbuka: {activeAccount?.username || 'Akun Pengembang'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Database Terkunci (Mode Baca)</span>
                  </>
                )}
              </button>

              {/* Central Cloud Database Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                title="Database Cloud Terpusat: Semua pengguna otomatis melihat data ini saat aplikasi dibuka"
              >
                {isLoadingCentralDb ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Firestore Aktif</span>
              </div>

              {/* Data Persistence Status */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  {lastSavedTime
                    ? `Tersimpan: ${new Date(lastSavedTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Tersimpan'}
                </span>
              </div>
            </div>
          </section>

          {/* Central Cloud Database Banner - Multi-User Live Access & Account Lock Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/90 via-blue-50/70 to-slate-50 p-4 rounded-xl border border-emerald-200 text-xs shadow-2xs">
            <div className="flex items-start sm:items-center gap-3 text-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                {isLoadingCentralDb ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  <span>Database Cloud Firestore Terpusat</span>
                  {isUnlocked ? (
                    <span className="text-[11px] text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-600" />
                      Terbuka: {activeAccount?.username} ({activeAccount?.name})
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      Terkunci (Mode Baca Publik)
                    </span>
                  )}
                  {lastUpdatedBy && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      • Terakhir diperbarui oleh: <strong className="text-slate-700">{lastUpdatedBy}</strong>
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                  {isUnlocked
                    ? `Akses edit dan simpan ke Cloud Firestore aktif untuk akun ${activeAccount?.username}. Setiap perubahan yang Anda simpan akan langsung terlihat oleh seluruh pengguna aplikasi.`
                    : 'Database ini terbuka untuk dilihat oleh siapa saja tanpa login Google Drive. Untuk mengubah tabel, pagu anggaran, atau menyimpan data ke Cloud Firestore, silakan buka kunci menggunakan akun yang telah ditetapkan pengembang.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleManualRefreshCentral}
                disabled={isLoadingCentralDb}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                title="Muat ulang data terbaru dari database pusat"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingCentralDb ? 'animate-spin' : ''}`} />
                <span>Muat Ulang</span>
              </button>

              {isUnlocked ? (
                <>
                  <button
                    onClick={handleManualSave}
                    disabled={isSavingCentral}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                    title="Simpan data ke Database Pusat sekarang"
                  >
                    {isSavingCentral ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan ke Pusat</span>
                  </button>
                  <button
                    onClick={handleToggleLock}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    title="Kunci database kembali ke mode baca"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Kunci</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Buka Kunci Akun</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Storage & Optional Drive Backup Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                Akses Database:
              </span>
              <span className="text-slate-500 text-[11px]">
                {isUnlocked
                  ? `Sesi aktif: User ${activeAccount?.username} (${activeAccount?.name}). Siap memperbarui Cloud Firestore.`
                  : 'Mode Baca Aktif. Masuk dengan akun pengembang untuk mengedit & menyimpan.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleManualSave}
                disabled={isSavingCentral}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  isUnlocked
                    ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
                }`}
              >
                {isUnlocked ? (
                  <Save className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Lock className="w-3 h-3 text-slate-500" />
                )}
                {isUnlocked ? 'Simpan Sekarang' : 'Simpan (Terkunci)'}
              </button>
              <button
                onClick={handleReloadSavedData}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                title="Buka atau muat ulang data tersimpan terakhir di memori lokal"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                Muat Lokal
              </button>
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md transition-colors cursor-pointer"
                title="Kelola cadangan offsite Google Drive"
              >
                <Cloud className="w-3 h-3 text-blue-600" />
                Cadangan Drive
              </button>
              <button
                onClick={() => setIsDatabaseModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors cursor-pointer"
              >
                <Database className="w-3 h-3 text-indigo-600" />
                Impor / Ekspor DB
              </button>
            </div>
          </div>

          {/* Year Switcher Buttons: Tahun 2026, 2027, 2028, 2029, 2030 */}
          <YearSelector
            selectedYear={selectedYear}
            onSelectYear={handleSelectYear}
          />

          {/* KPI Metrics Summary Strip */}
          <KpiCards
            data={data}
            totalBudget={totalBudget}
            onUpdateBudget={handleUpdateBudget}
            year={selectedYear}
            isUnlocked={isUnlocked}
            onRequestUnlock={() => setIsPasswordModalOpen(true)}
          />

          {/* Interactive Visual Charts Grid (Bar Chart & Pie Chart) */}
          <div id="diagram-visual" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Interactive Bar Chart (7 Cols) */}
            <div className="lg:col-span-7">
              <BarChartSection data={data} year={selectedYear} />
            </div>

            {/* Interactive Pie & Donut Chart (5 Cols) */}
            <div className="lg:col-span-5">
              <PieChartSection data={data} year={selectedYear} />
            </div>
          </div>

          {/* Official Document Data Table Section */}
          <DataTableSection
            data={data}
            year={selectedYear}
            onUpdateData={handleUpdateData}
            onResetData={handleResetCurrentYearData}
            isModified={isModified}
            isUnlocked={isUnlocked}
            onRequestUnlock={() => setIsPasswordModalOpen(true)}
          />

          {/* Quarterly Progression & Qualitative Notes */}
          <QuarterlyAnalysis data={data} year={selectedYear} />
        </main>

        {/* Quiet Enterprise Footer */}
        <footer className="mt-12 border-t border-slate-200 bg-white py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <span>SiBensin • {selectedYear} • Dinas Perumahan dan Kawasan Permukiman - @joko92m</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                Cadangan Google Drive
              </button>
              <button
                onClick={() => setIsDatabaseModalOpen(true)}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Cadangan Database
              </button>
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                Unduh Dokumen PDF
              </button>
              <button
                onClick={handlePrintDirect}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                Cetak Halaman
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Dedicated Printable View (Visible to print engine @media print) */}
      <div className="print-only">
        <PrintReportView
          data={data}
          options={pdfOptions}
          totalBudget={totalBudget}
          year={selectedYear}
        />
      </div>

      {/* Modal Dialog for PDF Configuration and Download */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        data={data}
        options={pdfOptions}
        onChangeOptions={setPdfOptions}
        totalBudget={totalBudget}
        year={selectedYear}
      />

      {/* Modal Dialog for Account Authentication & Cloud Database Locking */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
        activeAccount={activeAccount}
        onLockDatabase={handleToggleLock}
      />

      {/* Modal Dialog for Database Import / Export / Reset */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        yearlyStore={yearlyStore}
        onRestoreStore={handleRestoreStore}
        isUnlocked={isUnlocked}
        onRequestUnlock={() => setIsPasswordModalOpen(true)}
      />

      {/* Modal Dialog for Google Drive Synchronization (Optional Personal Backup) */}
      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        yearlyStore={yearlyStore}
        onApplyDatabase={handleRestoreStore}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        lastLocalSavedTime={lastSavedTime}
      />
    </div>
  );
}
