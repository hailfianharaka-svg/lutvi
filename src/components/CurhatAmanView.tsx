import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  Lock,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldAlert,
  Smile,
  Sparkles,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  AppSettings,
  BullyingCategory,
  CounselingReport,
  IdentityMode,
  MOOD_OPTIONS,
  MoodType,
  UserRole,
} from '../types';
import { generateSafePseudonym, validateProfileInput } from '../utils/counselingLogic';
import { DipsyAvatar } from './DipsyAvatar';

interface CurhatAmanViewProps {
  settings: AppSettings;
  onGoToEducation: () => void;
  onSessionActiveChange?: (active: boolean) => void;
}

const STARTER_SUGGESTIONS: Record<MoodType, string[]> = {
  Senang: [
    'Hari ini aku senang karena bermain bersama teman di halaman sekolah.',
    'Aku mendapat pujian dari guru dan teman-teman ikut memberi semangat.',
  ],
  Sedih: [
    'Aku sedih karena ada teman yang mengejek dan memberi julukan jelek kepadaku.',
    'Aku merasa sedih karena tidak diajak bermain saat jam istirahat.',
  ],
  Takut: [
    'Aku takut berangkat ke sekolah karena sering didorong dan diancam kakak kelas.',
    'Ada pesan jahat di grup WhatsApp yang membuatku takut dan cemas.',
  ],
  Kesal: [
    'Aku kesal karena tas dan alat tulisku disembunyikan oleh teman di kelas.',
    'Teman-teman menyebarkan gosip yang tidak benar tentang diriku.',
  ],
  'Sakit/Tidak Nyaman': [
    'Badanku terasa sakit karena tadi didorong dan dijegal sampai terjatuh.',
    'Aku merasa sangat tidak nyaman karena ada yang menyentuh area tubuh pribadiku.',
  ],
};

function getCategoryStyle(category: BullyingCategory) {
  switch (category) {
    case 'Aman/Menyenangkan':
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        label: 'Kondisi Aman / Menyenangkan',
        icon: CheckCircle2,
      };
    case 'Indikasi Pelecehan Seksual':
      return {
        bg: 'bg-rose-50 border-rose-300 text-rose-950',
        label: 'Terdeteksi: Indikasi Pelecehan Seksual (Prioritas Perlindungan)',
        icon: ShieldAlert,
      };
    default:
      return {
        bg: 'bg-amber-50 border-amber-300 text-amber-950',
        label: `Terdeteksi: ${category}`,
        icon: AlertTriangle,
      };
  }
}

export function CurhatAmanView({
  settings,
  onGoToEducation,
  onSessionActiveChange,
}: CurhatAmanViewProps) {
  const [identityMode, setIdentityMode] = useState<IdentityMode>('Anonim');
  const [reporterName, setReporterName] = useState<string>(() => generateSafePseudonym());
  const [role, setRole] = useState<UserRole>('Siswa');
  const [grade, setGrade] = useState<number>(4);
  const [age, setAge] = useState<number>(10);
  const [mood, setMood] = useState<MoodType>('Sedih');

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const [activeReport, setActiveReport] = useState<CounselingReport | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeReport?.messages.length]);

  useEffect(() => {
    onSessionActiveChange?.(Boolean(activeReport));
  }, [activeReport, onSessionActiveChange]);

  function handleIdentityModeChange(mode: IdentityMode) {
    setIdentityMode(mode);
    setFormErrors([]);
    if (mode === 'Anonim') {
      setReporterName(generateSafePseudonym());
    } else {
      setReporterName('');
    }
  }

  async function handleStartCurhat(e: FormEvent) {
    e.preventDefault();
    setChatError('');

    const check = validateProfileInput({
      identityMode,
      reporterName,
      role,
      grade,
      age,
      mood,
    });

    if (!check.valid || !check.sanitized) {
      setFormErrors(check.errors);
      return;
    }

    setFormErrors([]);
    setIsStarting(true);

    try {
      const res = await fetch('/api/curhat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.sanitized),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErrors([data.error || 'Gagal memulai sesi Curhat Aman.']);
        return;
      }
      setActiveReport(data.report);
    } catch {
      setFormErrors(['Terjadi kendala jaringan. Silakan coba lagi sebentar.']);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!activeReport || isSending) return;
    const trimmed = messageInput.trim();
    if (trimmed.length < 2) {
      setChatError('Tuliskan ceritamu minimal 2 huruf ya.');
      return;
    }

    setChatError('');
    setIsSending(true);
    setMessageInput('');

    try {
      const res = await fetch('/api/curhat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: activeReport.id,
          message: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.error || 'Gagal mengirim pesan.');
        setMessageInput(trimmed);
        return;
      }
      setActiveReport(data.report);
    } catch {
      setChatError('Koneksi terganggu. Pesanmu belum terkirim, silakan coba lagi.');
      setMessageInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleResetSession() {
    setActiveReport(null);
    setMessageInput('');
    setChatError('');
    if (identityMode === 'Anonim') {
      setReporterName(generateSafePseudonym());
    }
  }

  const waNumber = settings.tppkPhone.replace(/^0/, '62').replace(/\D/g, '');

  if (activeReport) {
    const catStyle = getCategoryStyle(activeReport.detectedCategory);
    const CatIcon = catStyle.icon;
    const hasUserMessages = activeReport.messages.some((m) => m.sender === 'user');
    const suggestions = STARTER_SUGGESTIONS[activeReport.mood] || [];

    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Companion Summary Column */}
          <aside className="lg:col-span-4 bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <DipsyAvatar src={settings.dipsyImageUrl} size="md" />
              <div>
                <h2 className="text-lg font-bold text-emerald-950">DIPSI Mendengarkan</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kode Sesi:{' '}
                  <span className="font-mono tabular-nums font-semibold text-emerald-800">
                    {activeReport.sessionCode}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Pelapor</span>
                <span className="font-semibold text-right text-slate-900">
                  {activeReport.reporterName} ({activeReport.identityMode})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Peran</span>
                <span className="font-semibold text-slate-900">{activeReport.role}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Kelas &amp; Usia</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  Kelas {activeReport.grade} · {activeReport.age} Tahun
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Suasana Hati</span>
                <span className="font-semibold text-slate-900">{activeReport.mood}</span>
              </div>
            </div>

            {/* Live AI Detection Indicator */}
            <div className={`p-3.5 rounded-2xl border ${catStyle.bg}`}>
              <div className="flex items-start gap-2.5">
                <CatIcon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold leading-snug">{catStyle.label}</p>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    {hasUserMessages
                      ? activeReport.psychologicalSummary
                      : 'Transkrip percakapan tersimpan aman ke database sekolah untuk perlindunganmu.'}
                  </p>
                </div>
              </div>
            </div>

            {activeReport.needsUrgentTppk && (
              <div className="p-4 rounded-2xl bg-emerald-900 text-white space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <HeartHandshake className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Pendampingan Tim TPPK</span>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  Laporanmu sudah tercatat otomatis untuk ditindaklanjuti secara rahasia oleh{' '}
                  <strong>{settings.tppkChairName}</strong>. Kamu juga bisa langsung menghubungi:
                </p>
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white text-emerald-950 font-semibold text-xs hover:bg-emerald-50 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>WA {settings.tppkChairName} ({settings.tppkPhone})</span>
                </a>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResetSession}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Mulai Sesi Curhat Baru</span>
              </button>
              <button
                type="button"
                onClick={onGoToEducation}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-emerald-900 underline underline-offset-4 cursor-pointer"
              >
                Pelajari Cara Mengenali Perundungan
              </button>
            </div>
          </aside>

          {/* Right Chat Workspace */}
          <div className="lg:col-span-8 bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl shadow-sm flex flex-col min-h-[540px] max-h-[720px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4 bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span className="text-sm font-semibold text-emerald-950">
                  Ruang Curhat Aman &amp; Rahasia — DIPSI Tamantri
                </span>
              </div>
              <span className="text-xs text-slate-500">Tersimpan Otomatis</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-gradient-to-b from-white to-emerald-50/25">
              {activeReport.messages.map((msg) => {
                const isDipsy = msg.sender === 'dipsy';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-3 ${isDipsy ? 'justify-start' : 'justify-end'}`}
                  >
                    {isDipsy && <DipsyAvatar src={settings.dipsyImageUrl} size="sm" />}
                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isDipsy
                          ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-950 rounded-bl-sm'
                          : 'bg-emerald-700 text-white rounded-br-sm shadow-xs'
                      }`}
                    >
                      <div className="text-[11px] font-semibold opacity-75 mb-1">
                        {isDipsy ? 'DIPSI (Sahabat Psikologi)' : activeReport.reporterName}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-end gap-3 justify-start">
                  <DipsyAvatar src={settings.dipsyImageUrl} size="sm" />
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-emerald-800">
                    DIPSI sedang mendengarkan dan menyiapkan jawaban terbaik untukmu...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Starter suggestions for kids before first message */}
            {!hasUserMessages && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200/80">
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Bingung mulai dari mana? Kamu bisa klik contoh cerita ini lalu ubah sesuai ceritamu:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMessageInput(s)}
                      className="text-left text-xs px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      “{s}”
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={handleStartOrSendPrevent(handleSendMessage)}
              className="p-4 sm:p-5 border-t border-slate-200/80 bg-white space-y-2"
            >
              {chatError && (
                <p role="alert" className="text-xs font-medium text-rose-700">
                  {chatError}
                </p>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="curhat-message-input" className="sr-only">
                    Tulis ceritamu untuk DIPSI
                  </label>
                  <textarea
                    id="curhat-message-input"
                    rows={2}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage(e);
                      }
                    }}
                    placeholder="Ceritakan apa yang kamu rasakan atau alami hari ini kepada DIPSI..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>{isSending ? 'Mengirim...' : 'Kirim Cerita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-950">
            Mulai Curhat Aman Bersama DIPSI
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Pilih identitas yang membuatmu paling nyaman, ceritakan suasana hatimu, lalu tekan tombol
            di bawah untuk berbicara secara rahasia dengan DIPSI.
          </p>
        </div>

        <form onSubmit={handleStartCurhat} className="space-y-6" noValidate>
          {/* Identity Mode Segmented Control */}
          <div>
            <span className="block text-sm font-semibold text-slate-800 mb-2">
              1. Pilihan Privasi Identitas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleIdentityModeChange('Anonim')}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                  identityMode === 'Anonim'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                <UserX className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold">Nama Samaran / Anonim</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Identitas aslimu dirahasiakan menggunakan nama samaran unik.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleIdentityModeChange('Lengkap')}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                  identityMode === 'Lengkap'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                <UserCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold">Identitas Lengkap</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Memudahkan Guru BK / Bapak Fajar TPPK menghubungi langsung jika perlu.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Name Input + Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="reporter-name"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                {identityMode === 'Anonim' ? '2. Nama Samaran' : '2. Nama Lengkap Pelapor'}
              </label>
              <div className="flex gap-2">
                <input
                  id="reporter-name"
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder={
                    identityMode === 'Anonim'
                      ? 'Contoh: Bintang Ceria #12'
                      : 'Contoh: Andi Pratama atau Ibu Sari'
                  }
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
                {identityMode === 'Anonim' && (
                  <button
                    type="button"
                    onClick={() => setReporterName(generateSafePseudonym())}
                    className="px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Acak Nama
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-800 mb-1.5">
                3. Peran Pelapor
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(['Siswa', 'Orang Tua'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                      role === r
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bounded Grade 1-6 and Age 6-14 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="student-grade"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                4. Kelas (Khusus Kelas 1–6 SD)
              </label>
              <select
                id="student-grade"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    Kelas {g} SD
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="student-age"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                5. Usia Anak (Rentang 6–14 Tahun)
              </label>
              <select
                id="student-age"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((a) => (
                  <option key={a} value={a}>
                    {a} Tahun
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <span className="block text-sm font-semibold text-slate-800 mb-2">
              6. Bagaimana Suasana Hatimu Hari Ini?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MOOD_OPTIONS.map((option) => {
                const selected = mood === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(option.value)}
                    aria-pressed={selected}
                    className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Smile
                        className={`w-4 h-4 shrink-0 ${
                          selected ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{option.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{option.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {formErrors.length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm space-y-1"
            >
              {formErrors.map((err) => (
                <p key={err}>{err}</p>
              ))}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>Percakapanmu aman dan hanya dapat ditinjau oleh Tim TPPK SDN Kotalama 3.</span>
            </p>
            <button
              type="submit"
              disabled={isStarting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm sm:text-base shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{isStarting ? 'Menyiapkan DIPSI...' : 'Mulai Curhat Aman'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function handleStartOrSendPrevent(handler: (e: FormEvent) => Promise<void>) {
  return (e: FormEvent) => {
    void handler(e);
  };
}
