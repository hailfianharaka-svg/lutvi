import { FormEvent, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  FilePlus2,
  Link2,
  LogOut,
  RefreshCw,
  Table2,
  Unlink,
  X,
} from 'lucide-react';
import {
  CounselingReport,
  SheetDbConfig,
  SheetInspectResult,
  SheetSyncResult,
} from '../types';
import {
  DATABASE_SHEET_TABS,
  extractSpreadsheetId,
  LAPORAN_HEADERS,
  PENGATURAN_HEADERS,
  STATISTIK_HEADERS,
  TRANSKRIP_HEADERS,
} from '../utils/sheetsParser';

interface SpreadsheetDatabaseTabProps {
  adminToken: string;
  googleUser: User | null;
  googleToken: string | null;
  isSigningInGoogle: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  sheetConfig: SheetDbConfig;
  isSyncing: boolean;
  lastSyncResult: SheetSyncResult | null;
  sheetsError: string;
  reports: CounselingReport[];
  onProvisionExisting: (urlOrId: string, autoSync: boolean) => Promise<boolean>;
  onCreateNewSpreadsheet: (title: string, autoSync: boolean) => Promise<boolean>;
  onSyncNow: () => Promise<boolean>;
  onToggleAutoSync: (nextAutoSync: boolean) => Promise<void>;
  onUnlinkSpreadsheet: () => Promise<void>;
  onClearError: () => void;
}

type PendingAction =
  | { type: 'provision'; inspection: SheetInspectResult; autoSync: boolean }
  | { type: 'create'; title: string; autoSync: boolean }
  | { type: 'sync' }
  | { type: 'unlink' }
  | null;

const SCHEMA_TABLES = [
  {
    name: DATABASE_SHEET_TABS[0],
    desc: 'Rekap seluruh laporan Curhat Aman beserta kategori AI, urgensi, dan progress tindak lanjut TPPK (bisa diperbarui 2 arah).',
    columns: LAPORAN_HEADERS,
  },
  {
    name: DATABASE_SHEET_TABS[1],
    desc: 'Transkrip lengkap setiap pesan antara siswa/orang tua dan DIPSI untuk audit psikologis.',
    columns: TRANSKRIP_HEADERS,
  },
  {
    name: DATABASE_SHEET_TABS[2],
    desc: 'Ringkasan metrik statistik dan distribusi kategori perundungan secara real-time.',
    columns: STATISTIK_HEADERS,
  },
  {
    name: DATABASE_SHEET_TABS[3],
    desc: 'Identitas sekolah serta kontak Ketua Tim TPPK yang aktif pada aplikasi.',
    columns: PENGATURAN_HEADERS,
  },
];

export function SpreadsheetDatabaseTab({
  adminToken,
  googleUser,
  googleToken,
  isSigningInGoogle,
  onGoogleSignIn,
  onGoogleSignOut,
  sheetConfig,
  isSyncing,
  lastSyncResult,
  sheetsError,
  reports,
  onProvisionExisting,
  onCreateNewSpreadsheet,
  onSyncNow,
  onToggleAutoSync,
  onUnlinkSpreadsheet,
  onClearError,
}: SpreadsheetDatabaseTabProps) {
  const [linkInput, setLinkInput] = useState(sheetConfig.linkedSpreadsheetUrl || '');
  const [newSheetTitle, setNewSheetTitle] = useState(
    'Database DIPSI Tamantri - SDN Kotalama 3'
  );
  const [autoSyncChoice, setAutoSyncChoice] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localStatus, setLocalStatus] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [executingConfirm, setExecutingConfirm] = useState(false);

  const totalMessages = useMemo(
    () => reports.reduce((acc, r) => acc + r.messages.length, 0),
    [reports]
  );

  const linkPreviewValidation = useMemo(() => {
    if (!linkInput.trim()) return null;
    return extractSpreadsheetId(linkInput);
  }, [linkInput]);

  async function handleInspectAndConfirm(e: FormEvent) {
    e.preventDefault();
    setLocalError('');
    setLocalStatus('');
    onClearError();

    const parsed = extractSpreadsheetId(linkInput);
    if (!parsed.ok) {
      setLocalError((parsed as { ok: false; error: string }).error);
      return;
    }

    if (!googleToken) {
      setLocalError(
        'Silakan klik "Sign in with Google" terlebih dahulu agar aplikasi mendapat izin membuat database pada Spreadsheet Anda.'
      );
      return;
    }

    setInspecting(true);
    try {
      const res = await fetch('/api/admin/sheets/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'X-Google-Access-Token': googleToken,
        },
        body: JSON.stringify({ urlOrId: linkInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || 'Gagal memeriksa Google Spreadsheet.');
        return;
      }

      setPendingAction({
        type: 'provision',
        inspection: data.inspection as SheetInspectResult,
        autoSync: autoSyncChoice,
      });
    } catch {
      setLocalError('Tidak dapat terhubung ke server saat memeriksa Spreadsheet.');
    } finally {
      setInspecting(false);
    }
  }

  function handleRequestCreateNew(e: FormEvent) {
    e.preventDefault();
    setLocalError('');
    setLocalStatus('');
    onClearError();

    if (!googleToken) {
      setLocalError(
        'Silakan klik "Sign in with Google" terlebih dahulu untuk membuat Spreadsheet baru di akun Google Anda.'
      );
      return;
    }

    setPendingAction({
      type: 'create',
      title: newSheetTitle.trim() || 'Database DIPSI Tamantri - SDN Kotalama 3',
      autoSync: autoSyncChoice,
    });
  }

  async function handleConfirmPendingAction() {
    if (!pendingAction) return;
    setExecutingConfirm(true);
    setLocalError('');
    setLocalStatus('');

    try {
      if (pendingAction.type === 'provision') {
        const ok = await onProvisionExisting(
          pendingAction.inspection.spreadsheetId,
          pendingAction.autoSync
        );
        if (ok) {
          setLinkInput(pendingAction.inspection.spreadsheetUrl);
          setLocalStatus(
            `Database otomatis berhasil dibuat dan disinkronkan ke "${pendingAction.inspection.title}".`
          );
        }
      } else if (pendingAction.type === 'create') {
        const ok = await onCreateNewSpreadsheet(
          pendingAction.title,
          pendingAction.autoSync
        );
        if (ok) {
          setLocalStatus(
            `Spreadsheet "${pendingAction.title}" berhasil dibuat, ditautkan, dan disinkronkan secara real-time.`
          );
        }
      } else if (pendingAction.type === 'sync') {
        const ok = await onSyncNow();
        if (ok) {
          setLocalStatus('Sinkronisasi data terbaru dengan Google Spreadsheet berhasil.');
        }
      } else if (pendingAction.type === 'unlink') {
        await onUnlinkSpreadsheet();
        setLocalStatus('Tautan Google Spreadsheet diputuskan dari aplikasi.');
      }
    } finally {
      setExecutingConfirm(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Google Auth Card */}
      <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-emerald-800" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                Database Google Spreadsheet (Real-Time)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Tautkan link Google Spreadsheet atau buat file baru otomatis. Aplikasi akan langsung
                membuat struktur tab database (<span className="font-mono">Laporan_Curhat</span>,{' '}
                <span className="font-mono">Transkrip_Pesan</span>,{' '}
                <span className="font-mono">Statistik_Ringkas</span>,{' '}
                <span className="font-mono">Pengaturan_TPPK</span>) dan menjaga data tersinkron
                secara real-time.
              </p>
            </div>
          </div>

          {/* Official Google Sign-In Button or Connected Account */}
          <div className="shrink-0">
            {googleUser && googleToken ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950 truncate">
                    {googleUser.displayName || 'Akun Google Terhubung'}
                  </p>
                  <p className="text-[11px] text-emerald-800 truncate">{googleUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-slate-700 hover:text-rose-800 whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Keluar Google</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isSigningInGoogle}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isSigningInGoogle ? 'Menghubungkan...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Active Connection Banner */}
        {sheetConfig.linkedSpreadsheetId ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>
                  Spreadsheet Tertaut:{' '}
                  {sheetConfig.linkedSpreadsheetTitle || sheetConfig.linkedSpreadsheetId}
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Status:{' '}
                <strong className="text-emerald-950">
                  {!googleToken
                    ? 'Menunggu Sign in with Google untuk melanjutkan sinkronisasi sesi ini'
                    : sheetConfig.autoSync
                    ? 'Terkoneksi Real-Time (sinkron otomatis tiap pembaruan & interval 12 detik)'
                    : 'Tertaut (sinkronisasi otomatis dijeda)'}
                </strong>
              </p>
              <p className="text-[11px] text-slate-600 tabular-nums">
                Sinkronisasi terakhir:{' '}
                {sheetConfig.lastSyncAt
                  ? new Date(sheetConfig.lastSyncAt).toLocaleString('id-ID')
                  : 'Belum pernah'}
                {lastSyncResult
                  ? ` · ${lastSyncResult.syncedReportsCount} laporan & ${lastSyncResult.syncedMessagesCount} pesan`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={sheetConfig.linkedSpreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-xs font-semibold text-emerald-900 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Buka Spreadsheet</span>
              </a>

              <button
                type="button"
                disabled={!googleToken || isSyncing}
                onClick={() => setPendingAction({ type: 'sync' })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleAutoSync(!sheetConfig.autoSync)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
              >
                <span>
                  {sheetConfig.autoSync ? 'Jeda Auto-Sync' : 'Aktifkan Auto-Sync'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPendingAction({ type: 'unlink' })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-800 whitespace-nowrap cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Putuskan Tautan</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            Belum ada Google Spreadsheet yang ditautkan. Masuk dengan Google lalu tempel link
            Spreadsheet Anda di bawah untuk membuat database otomatis.
          </div>
        )}

        {(localError || sheetsError) && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" aria-hidden="true" />
            <span>{localError || sheetsError}</span>
          </div>
        )}

        {localStatus && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-start gap-2"
          >
            <CheckCircle2
              className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700"
              aria-hidden="true"
            />
            <span>{localStatus}</span>
          </div>
        )}
      </div>

      {/* Two Action Cards: Link Existing URL vs Create New Spreadsheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <form
          onSubmit={handleInspectAndConfirm}
          className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <h4 className="text-base font-bold text-emerald-950">
              Tautkan Link Google Spreadsheet
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tempelkan URL Google Spreadsheet kosong atau yang sudah ada. Sistem akan memeriksa
            Spreadsheet lalu otomatis membuat tab &amp; kolom database setelah Anda mengonfirmasi.
          </p>

          <div>
            <label
              htmlFor="spreadsheet-link-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Link / URL Google Spreadsheet
            </label>
            <input
              id="spreadsheet-link-input"
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1AbC.../edit"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {linkPreviewValidation && !linkPreviewValidation.ok && (
              <p className="text-[11px] text-rose-700 mt-1.5 font-medium">
                {(linkPreviewValidation as { ok: false; error: string }).error}
              </p>
            )}
            {linkPreviewValidation && linkPreviewValidation.ok && (
              <p className="text-[11px] text-emerald-800 mt-1.5 font-mono">
                ID terdeteksi: {linkPreviewValidation.spreadsheetId}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncChoice}
              onChange={(e) => setAutoSyncChoice(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              Aktifkan sinkronisasi otomatis real-time setiap ada laporan Curhat Aman baru atau
              perubahan tindak lanjut TPPK.
            </span>
          </label>

          <button
            type="submit"
            disabled={inspecting || isSyncing}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            {inspecting ? 'Memeriksa Spreadsheet...' : 'Periksa & Buat Database Otomatis'}
          </button>
        </form>

        <form
          onSubmit={handleRequestCreateNew}
          className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <FilePlus2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <h4 className="text-base font-bold text-emerald-950">
              Buat Spreadsheet Database Baru
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Belum menyiapkan file Spreadsheet? Aplikasi dapat langsung membuatkan Google Spreadsheet
            baru lengkap dengan 4 tabel database dan menyinkronkan {reports.length} laporan yang ada.
          </p>

          <div>
            <label
              htmlFor="new-spreadsheet-title-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Judul Spreadsheet Baru
            </label>
            <input
              id="new-spreadsheet-title-input"
              type="text"
              value={newSheetTitle}
              onChange={(e) => setNewSheetTitle(e.target.value)}
              placeholder="Database DIPSI Tamantri - SDN Kotalama 3"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Data yang akan otomatis dimasukkan: <strong>{reports.length}</strong> laporan curhat dan{' '}
            <strong>{totalMessages}</strong> pesan transkrip percakapan.
          </div>

          <button
            type="submit"
            disabled={isSyncing}
            className="w-full py-2.5 px-4 rounded-xl border border-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-60 text-emerald-900 text-sm font-bold transition-colors cursor-pointer"
          >
            Buat &amp; Hubungkan Spreadsheet Baru
          </button>
        </form>
      </div>

      {/* Automatic Database Schema Overview */}
      <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Table2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h4 className="text-base font-bold text-emerald-950">
              Struktur Database Otomatis di Google Spreadsheet
            </h4>
            <p className="text-xs text-slate-600">
              Keempat tab berikut dibuat dan diformat otomatis saat penautan dikonfirmasi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCHEMA_TABLES.map((tbl) => (
            <div
              key={tbl.name}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-sm font-bold font-mono text-emerald-950">{tbl.name}</h5>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {tbl.columns.length} kolom
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{tbl.desc}</p>
              <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
                {tbl.columns.join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Confirmation Dialog before mutating Google Sheets */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheets-confirm-title"
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden="true" />
                </div>
                <h4 id="sheets-confirm-title" className="text-base font-bold text-emerald-950">
                  {pendingAction.type === 'provision' && 'Konfirmasi Pembuatan Database Spreadsheet'}
                  {pendingAction.type === 'create' && 'Konfirmasi Buat Spreadsheet Baru'}
                  {pendingAction.type === 'sync' && 'Konfirmasi Sinkronisasi Google Spreadsheet'}
                  {pendingAction.type === 'unlink' && 'Konfirmasi Putuskan Tautan Spreadsheet'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={executingConfirm}
                aria-label="Tutup dialog konfirmasi"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {pendingAction.type === 'provision' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  Aplikasi akan memperbarui Google Spreadsheet{' '}
                  <strong className="text-emerald-950">
                    “{pendingAction.inspection.title}”
                  </strong>
                  :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    {pendingAction.inspection.missingTabs.length > 0 ? (
                      <>
                        Membuat otomatis {pendingAction.inspection.missingTabs.length} tab baru:{' '}
                        <span className="font-mono font-semibold">
                          {pendingAction.inspection.missingTabs.join(', ')}
                        </span>
                      </>
                    ) : (
                      'Semua 4 tab database sudah tersedia dan akan diformat ulang.'
                    )}
                  </li>
                  <li>
                    Menulis ulang isi tab <span className="font-mono">Laporan_Curhat</span> (
                    {reports.length} laporan), <span className="font-mono">Transkrip_Pesan</span> (
                    {totalMessages} pesan), <span className="font-mono">Statistik_Ringkas</span>,
                    dan <span className="font-mono">Pengaturan_TPPK</span>.
                  </li>
                  <li>
                    Sinkronisasi otomatis real-time:{' '}
                    <strong>{pendingAction.autoSync ? 'Aktif' : 'Nonaktif'}</strong>.
                  </li>
                </ul>
              </div>
            )}

            {pendingAction.type === 'create' && (
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  Aplikasi akan membuat Google Spreadsheet baru berjudul{' '}
                  <strong className="text-emerald-950">“{pendingAction.title}”</strong> di akun
                  Google Anda.
                </p>
                <p className="text-xs text-slate-600">
                  Spreadsheet akan langsung berisi 4 tab database dengan {reports.length} laporan
                  dan {totalMessages} pesan transkrip, serta{' '}
                  {pendingAction.autoSync
                    ? 'sinkronisasi otomatis real-time diaktifkan.'
                    : 'mode sinkronisasi manual.'}
                </p>
              </div>
            )}

            {pendingAction.type === 'sync' && (
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  Aplikasi akan menyinkronkan data antara DIPSI Tamantri dan Spreadsheet{' '}
                  <strong className="text-emerald-950">
                    “{sheetConfig.linkedSpreadsheetTitle || sheetConfig.linkedSpreadsheetId}”
                  </strong>
                  .
                </p>
                <p className="text-xs text-slate-600">
                  Pembaruan status tindak lanjut pada kolom{' '}
                  <span className="font-mono">Progress_Tindak_Lanjut</span> &amp;{' '}
                  <span className="font-mono">Catatan_TPPK</span> akan ditarik ke aplikasi, lalu{' '}
                  {reports.length} laporan dan {totalMessages} pesan akan diperbarui ke keempat tab
                  Spreadsheet.
                </p>
              </div>
            )}

            {pendingAction.type === 'unlink' && (
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Menonaktifkan tautan akan menghentikan sinkronisasi real-time dari DIPSI Tamantri.
                File Google Spreadsheet Anda di Google Drive tidak akan dihapus.
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={executingConfirm}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPendingAction}
                disabled={executingConfirm}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white cursor-pointer disabled:opacity-60 ${
                  pendingAction.type === 'unlink'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {executingConfirm
                  ? 'Memproses...'
                  : pendingAction.type === 'unlink'
                  ? 'Ya, Putuskan Tautan'
                  : 'Konfirmasi & Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
