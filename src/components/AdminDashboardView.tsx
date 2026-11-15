import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LogOut,
  Palette,
  Printer,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ADMIN_ROLES,
  AdminRole,
  AdminStats,
  AdminUser,
  AppSettings,
  BULLYING_CATEGORIES,
  BullyingCategory,
  CounselingReport,
  DEFAULT_DIPSY_IMAGE,
  DEFAULT_MEADOW_IMAGE,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
  MOOD_OPTIONS,
} from '../types';
import { computeAdminStats } from '../utils/counselingLogic';
import { exportToExcelHtml, exportToWordDoc, printPdfReport } from '../utils/exportReports';
import { DipsyAvatar } from './DipsyAvatar';
import { PrintableReport } from './PrintableReport';

interface AdminDashboardViewProps {
  settings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
}

type AdminTab = 'rekap' | 'users' | 'tampilan';

const TOKEN_STORAGE_KEY = 'dipsi_tamantri_admin_token';

function statusTone(status: FollowUpStatus): string {
  switch (status) {
    case 'Selesai':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'Butuh Bantuan Eksternal':
      return 'bg-rose-50 border-rose-200 text-rose-800';
    default:
      return 'bg-amber-50 border-amber-200 text-amber-800';
  }
}

function categoryTone(category: BullyingCategory): string {
  if (category === 'Aman/Menyenangkan') {
    return 'text-emerald-800 bg-emerald-50 border-emerald-200';
  }
  if (category === 'Indikasi Pelecehan Seksual' || category === 'Perundungan Fisik') {
    return 'text-rose-900 bg-rose-50 border-rose-200';
  }
  return 'text-amber-900 bg-amber-50 border-amber-200';
}

async function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

export function AdminDashboardView({
  settings,
  onSettingsUpdated,
}: AdminDashboardViewProps) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(Boolean(token));

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin workspace state
  const [activeTab, setActiveTab] = useState<AdminTab>('rekap');
  const [reports, setReports] = useState<CounselingReport[]>([]);
  const [stats, setStats] = useState<AdminStats>(() => computeAdminStats([]));
  const [loadingData, setLoadingData] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Detail & Follow-up modal
  const [selectedReport, setSelectedReport] = useState<CounselingReport | null>(null);
  const [editStatus, setEditStatus] = useState<FollowUpStatus>('Diproses');
  const [editNote, setEditNote] = useState('');
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressFeedback, setProgressFeedback] = useState('');

  // Admin users state
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('Guru BK');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Appearance settings state
  const [dipsyInput, setDipsyInput] = useState(settings.dipsyImageUrl);
  const [meadowInput, setMeadowInput] = useState(settings.meadowImageUrl);
  const [tppkNameInput, setTppkNameInput] = useState(settings.tppkChairName);
  const [tppkPhoneInput, setTppkPhoneInput] = useState(settings.tppkPhone);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setDipsyInput(settings.dipsyImageUrl);
    setMeadowInput(settings.meadowImageUrl);
    setTppkNameInput(settings.tppkChairName);
    setTppkPhoneInput(settings.tppkPhone);
  }, [settings]);

  const fetchDashboardData = useCallback(async (authToken: string) => {
    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [repRes, userRes] = await Promise.all([
        fetch('/api/admin/reports', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);
      if (repRes.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken('');
        setAdminUser(null);
        return;
      }
      if (repRes.ok) {
        const repData = await repRes.json();
        setReports(repData.reports || []);
        setStats(repData.stats || computeAdminStats(repData.reports || []));
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setAdminList(userData.users || []);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setToken('');
            setAdminUser(null);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setAdminUser(data.user);
          await fetchDashboardData(token);
        }
      } catch {
        // Keep current state on transient network glitch
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, fetchDashboardData]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError('Masukkan username dan password admin.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Username atau password salah.');
        return;
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setAdminUser(data.user);
      setUsername('');
      setPassword('');
      await fetchDashboardData(data.token);
    } catch {
      setLoginError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken('');
      setAdminUser(null);
      setReports([]);
    }
  }

  function openReportDetail(report: CounselingReport) {
    setSelectedReport(report);
    setEditStatus(report.followUpStatus);
    setEditNote(report.tppkNote);
    setProgressFeedback('');
  }

  async function handleSaveProgress(e: FormEvent) {
    e.preventDefault();
    if (!selectedReport || !token) return;
    setIsSavingProgress(true);
    setProgressFeedback('');

    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpStatus: editStatus,
          tppkNote: editNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProgressFeedback(data.error || 'Gagal menyimpan pembaruan.');
        return;
      }

      setReports((prev) => prev.map((r) => (r.id === data.report.id ? data.report : r)));
      if (data.stats) setStats(data.stats);
      setSelectedReport(data.report);
      setProgressFeedback('Progress tindak lanjut dan catatan TPPK berhasil disimpan.');
    } catch {
      setProgressFeedback('Gagal menghubungi server.');
    } finally {
      setIsSavingProgress(false);
    }
  }

  async function handleAddAdmin(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setUserActionMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newFullName,
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionMsg({ type: 'err', text: data.error || 'Gagal menambahkan akun admin.' });
        return;
      }

      setAdminList((prev) => [...prev, data.user]);
      setNewFullName('');
      setNewUsername('');
      setNewPassword('');
      setUserActionMsg({
        type: 'ok',
        text: `Akun ${data.user.fullName} (${data.user.role}) berhasil ditambahkan.`,
      });
    } catch {
      setUserActionMsg({ type: 'err', text: 'Gagal menghubungi server.' });
    }
  }

  async function handleDeleteAdmin(id: number) {
    if (!token) return;
    setUserActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionMsg({ type: 'err', text: data.error || 'Gagal menghapus akun.' });
        return;
      }
      setAdminList((prev) => prev.filter((u) => u.id !== id));
      setUserActionMsg({ type: 'ok', text: 'Akun admin berhasil dihapus.' });
    } catch {
      setUserActionMsg({ type: 'err', text: 'Gagal menghubungi server.' });
    }
  }

  async function handleFileSelect(
    e: ChangeEvent<HTMLInputElement>,
    target: 'dipsy' | 'meadow'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setSettingsMsg('Ukuran file gambar maksimal 4 MB.');
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      if (target === 'dipsy') setDipsyInput(dataUrl);
      else setMeadowInput(dataUrl);
      setSettingsMsg('Pratinjau gambar diperbarui. Klik "Simpan Tampilan" untuk menerapkan.');
    } catch {
      setSettingsMsg('Gagal membaca file gambar.');
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsSavingSettings(true);
    setSettingsMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dipsyImageUrl: dipsyInput.trim() || DEFAULT_DIPSY_IMAGE,
          meadowImageUrl: meadowInput.trim() || DEFAULT_MEADOW_IMAGE,
          tppkChairName: tppkNameInput.trim(),
          tppkPhone: tppkPhoneInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMsg(data.error || 'Gagal menyimpan pengaturan.');
        return;
      }
      onSettingsUpdated(data.settings);
      setSettingsMsg('Pengaturan tampilan dan identitas TPPK berhasil disimpan.');
    } catch {
      setSettingsMsg('Gagal menghubungi server.');
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleResetDefaultImages() {
    if (!token) return;
    setDipsyInput(DEFAULT_DIPSY_IMAGE);
    setMeadowInput(DEFAULT_MEADOW_IMAGE);
    setIsSavingSettings(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dipsyImageUrl: DEFAULT_DIPSY_IMAGE,
          meadowImageUrl: DEFAULT_MEADOW_IMAGE,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSettingsUpdated(data.settings);
        setSettingsMsg('Gambar tokoh DIPSI dan padang rumput dikembalikan ke default.');
      }
    } finally {
      setIsSavingSettings(false);
    }
  }

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (categoryFilter !== 'Semua' && r.detectedCategory !== categoryFilter) return false;
      if (statusFilter !== 'Semua' && r.followUpStatus !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${r.sessionCode} ${r.reporterName} ${r.psychologicalSummary} ${
        r.tppkNote
      } ${r.messages.map((m) => m.content).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [reports, searchQuery, categoryFilter, statusFilter]);

  if (authChecking) {
    return (
      <section className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-950">Memeriksa sesi admin...</p>
        </div>
      </section>
    );
  }

  if (!adminUser) {
    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-800" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-950">Login Admin TPPK</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Khusus Tim TPPK, Kepala Sekolah, Guru BK, &amp; Psikolog
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <p
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800"
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk ke Dasbor Admin'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="no-print max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Admin Header Bar */}
        <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              Panel Pengelolaan TPPK · {settings.schoolName}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 mt-0.5">
              Selamat datang, {adminUser.fullName}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Peran: {adminUser.role} · Username: <span className="font-mono">{adminUser.username}</span>
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('rekap')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'rekap'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Statistik &amp; Rekap</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Manajemen Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tampilan')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'tampilan'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pengaturan Tampilan</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-slate-700 hover:text-rose-800 whitespace-nowrap transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {activeTab === 'rekap' && (
          <div className="space-y-6">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/95 border border-emerald-900/10 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">Total Curhat Masuk</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-950 tabular-nums mt-1">
                  {stats.totalReports}
                </p>
                <p className="text-xs text-slate-600 mt-1">Seluruh sesi tersimpan</p>
              </div>

              <div className="bg-white/95 border border-rose-200 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-semibold text-rose-700">Indikasi Perundungan</p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-900 tabular-nums mt-1">
                  {stats.bullyingDetectedCount}
                </p>
                <p className="text-xs text-slate-600 mt-1">Butuh perhatian TPPK</p>
              </div>

              <div className="bg-white/95 border border-amber-200 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-semibold text-amber-800">Sedang Diproses</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-950 tabular-nums mt-1">
                  {stats.statusCounts['Diproses']}
                </p>
                <p className="text-xs text-slate-600 mt-1">Dalam pendampingan</p>
              </div>

              <div className="bg-white/95 border border-emerald-200 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-semibold text-emerald-800">
                  Selesai / Eksternal
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-950 tabular-nums mt-1">
                  {stats.statusCounts['Selesai']} /{' '}
                  {stats.statusCounts['Butuh Bantuan Eksternal']}
                </p>
                <p className="text-xs text-slate-600 mt-1">Tuntas · Rujukan ahli</p>
              </div>
            </div>

            {/* Category & Mood Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-emerald-950 mb-4">
                  Distribusi Kategori Deteksi AI
                </h3>
                <div className="space-y-3">
                  {BULLYING_CATEGORIES.map((cat) => {
                    const count = stats.categoryCounts[cat] || 0;
                    const pct =
                      stats.totalReports > 0 ? Math.round((count / stats.totalReports) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span>{cat}</span>
                          <span className="font-mono tabular-nums font-semibold">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cat === 'Aman/Menyenangkan'
                                ? 'bg-emerald-600'
                                : cat === 'Indikasi Pelecehan Seksual'
                                ? 'bg-rose-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-emerald-950 mb-4">
                  Distribusi Suasana Hati Awal Pelapor
                </h3>
                <div className="space-y-3">
                  {MOOD_OPTIONS.map((m) => {
                    const count = stats.moodCounts[m.value] || 0;
                    const pct =
                      stats.totalReports > 0 ? Math.round((count / stats.totalReports) * 100) : 0;
                    return (
                      <div key={m.value} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span>{m.label}</span>
                          <span className="font-mono tabular-nums font-semibold">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rekap Table + Exports */}
            <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-emerald-950">
                    Tabel Rekap Hasil Curhat Aman
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Klik “Detail &amp; Tindak Lanjut” untuk membaca transkrip lengkap dan memperbarui
                    status TPPK.
                  </p>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={printPdfReport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
                    <span>Ekspor PDF / Cetak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportToWordDoc(filteredReports, stats, settings)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                    <span>Ekspor Word (.DOC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportToExcelHtml(filteredReports, settings)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Ekspor Excel (.XLS)</span>
                  </button>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, kode sesi, atau isi curhat..."
                    aria-label="Cari laporan curhat"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <select
                  aria-label="Filter kategori deteksi"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Semua">Semua Kategori Deteksi</option>
                  {BULLYING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter progress tindak lanjut"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Semua">Semua Status Tindak Lanjut</option>
                  {FOLLOW_UP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="py-3 px-4 font-semibold">Kode &amp; Waktu</th>
                      <th className="py-3 px-4 font-semibold">Pelapor</th>
                      <th className="py-3 px-4 font-semibold">Kelas / Usia</th>
                      <th className="py-3 px-4 font-semibold">Suasana Hati</th>
                      <th className="py-3 px-4 font-semibold">Deteksi AI</th>
                      <th className="py-3 px-4 font-semibold">Progress Tindak Lanjut</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingData ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Memuat data rekap curhat...
                        </td>
                      </tr>
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Belum ada laporan yang sesuai dengan filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((r) => (
                        <tr key={r.id} className="hover:bg-emerald-50/35 transition-colors">
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <div className="font-mono tabular-nums font-semibold text-emerald-950">
                              {r.sessionCode}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {new Date(r.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900">{r.reporterName}</div>
                            <div className="text-[11px] text-slate-500">
                              {r.identityMode} · {r.role}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top whitespace-nowrap tabular-nums text-slate-700">
                            Kelas {r.grade} · {r.age} Thn
                          </td>
                          <td className="py-3 px-4 align-top whitespace-nowrap text-slate-700">
                            {r.mood}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${categoryTone(
                                r.detectedCategory
                              )}`}
                            >
                              {r.detectedCategory !== 'Aman/Menyenangkan' ? (
                                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                              )}
                              <span>{r.detectedCategory}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusTone(
                                r.followUpStatus
                              )}`}
                            >
                              {r.followUpStatus}
                            </span>
                            {r.tppkNote && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-[200px]">
                                {r.tppkNote}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openReportDetail(r)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Detail &amp; Tindak Lanjut
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Add Admin Form */}
            <div className="lg:col-span-5 bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <UserPlus className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <h3 className="text-lg font-bold text-emerald-950">Tambah Akun Admin Baru</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Tambahkan akses masuk bagi Kepala Sekolah, Guru BK, atau Ahli Psikologi mitra
                {` ${settings.schoolName}`}.
              </p>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-admin-fullname"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nama Lengkap &amp; Gelar
                  </label>
                  <input
                    id="new-admin-fullname"
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Contoh: Ibu Siti Nurhaliza, S.Pd"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-admin-role"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Jabatan / Peran
                  </label>
                  <select
                    id="new-admin-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-admin-username"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Username Login
                  </label>
                  <input
                    id="new-admin-username"
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: gurubk_kotalama3"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-admin-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password (minimal 5 karakter)
                  </label>
                  <input
                    id="new-admin-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Buat password aman"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {userActionMsg && (
                  <p
                    role="status"
                    className={`p-3 rounded-xl border text-xs font-semibold ${
                      userActionMsg.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {userActionMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  Simpan Akun Admin
                </button>
              </form>
            </div>

            {/* Admin List */}
            <div className="lg:col-span-7 bg-white/95 border border-emerald-900/10 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-950 mb-4">
                Daftar Akun Pengelola Aktif
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="py-3 px-4 font-semibold">Nama Lengkap</th>
                      <th className="py-3 px-4 font-semibold">Username</th>
                      <th className="py-3 px-4 font-semibold">Peran</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {adminList.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{u.username}</td>
                        <td className="py-3 px-4 text-slate-700">{u.role}</td>
                        <td className="py-3 px-4 text-right">
                          {u.username === 'tamantri' ? (
                            <span className="text-xs text-slate-400">Akun Utama</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(u.id)}
                              aria-label={`Hapus akun ${u.fullName}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tampilan' && (
          <div className="bg-white/95 border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Pengaturan Tampilan &amp; Identitas TPPK
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Ganti gambar tokoh DIPSI dan latar belakang padang rumput secara langsung dengan
                  mengunggah file atau menempelkan URL gambar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaultImages}
                disabled={isSavingSettings}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kembalikan Gambar Default</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dipsy Image Control */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex items-center gap-4">
                    <DipsyAvatar src={dipsyInput} size="md" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Gambar Tokoh DIPSI</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Tampil di beranda dan ruang obrolan Curhat Aman.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="dipsy-url-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      URL / Data Gambar Tokoh DIPSI
                    </label>
                    <input
                      id="dipsy-url-input"
                      type="text"
                      value={dipsyInput}
                      onChange={(e) => setDipsyInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dipsy-file-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold text-emerald-900 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unggah Gambar Tokoh DIPSI</span>
                    </label>
                    <input
                      id="dipsy-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'dipsy')}
                      className="sr-only"
                    />
                  </div>
                </div>

                {/* Meadow Background Control */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-100 shrink-0">
                      <img
                        src={meadowInput}
                        alt="Pratinjau latar padang rumput"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Background Padang Rumput
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Latar belakang perbukitan hijau khas Teletubbies.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="meadow-url-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      URL / Data Background Padang Rumput
                    </label>
                    <input
                      id="meadow-url-input"
                      type="text"
                      value={meadowInput}
                      onChange={(e) => setMeadowInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="meadow-file-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold text-emerald-900 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unggah Gambar Padang Rumput</span>
                    </label>
                    <input
                      id="meadow-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'meadow')}
                      className="sr-only"
                    />
                  </div>
                </div>
              </div>

              {/* TPPK Contact settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label
                    htmlFor="tppk-chair-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nama Ketua Tim TPPK
                  </label>
                  <input
                    id="tppk-chair-input"
                    type="text"
                    value={tppkNameInput}
                    onChange={(e) => setTppkNameInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tppk-phone-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nomor HP/WA TPPK
                  </label>
                  <input
                    id="tppk-phone-input"
                    type="text"
                    value={tppkPhoneInput}
                    onChange={(e) => setTppkPhoneInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900"
                  />
                </div>
              </div>

              {settingsMsg && (
                <p
                  role="status"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900"
                >
                  {settingsMsg}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  {isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Tampilan'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Detail & Progress Modal */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-report-title"
          className="no-print fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 id="modal-report-title" className="text-lg font-bold text-emerald-950">
                  Detail Curhat &amp; Tindak Lanjut ({selectedReport.sessionCode})
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedReport.reporterName} ({selectedReport.identityMode}) ·{' '}
                  {selectedReport.role} · Kelas {selectedReport.grade} · {selectedReport.age} Tahun
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Tutup detail laporan"
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Summary & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">Deteksi Kategori AI</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {selectedReport.detectedCategory}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">Suasana Hati Awal</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedReport.mood}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-xs font-bold text-emerald-900">Ringkasan Psikologis AI</p>
                <p className="text-sm text-emerald-950 mt-1 leading-relaxed">
                  {selectedReport.psychologicalSummary}
                </p>
              </div>

              {/* Full Transcript */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">
                  Transkrip Percakapan Lengkap
                </h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  {selectedReport.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl text-xs sm:text-sm ${
                        m.sender === 'dipsy'
                          ? 'bg-white border border-emerald-200 text-slate-800'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-80 mb-0.5">
                        {m.sender === 'dipsy' ? 'DIPSI' : selectedReport.reporterName}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Progress Form */}
              <form
                onSubmit={handleSaveProgress}
                className="pt-4 border-t border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="progress-status-select"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Update Progress Tindak Lanjut
                    </label>
                    <select
                      id="progress-status-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as FollowUpStatus)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {FOLLOW_UP_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="tppk-note-input"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Catatan Tim TPPK / Guru BK
                    </label>
                    <textarea
                      id="tppk-note-input"
                      rows={2}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Tuliskan langkah mediasi, konseling, atau rujukan yang dilakukan..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {progressFeedback && (
                  <p
                    role="status"
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900"
                  >
                    {progressFeedback}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProgress}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    {isSavingProgress ? 'Menyimpan...' : 'Simpan Progress Tindak Lanjut'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable PDF Layout */}
      <PrintableReport reports={filteredReports} stats={stats} settings={settings} />
    </>
  );
}
