import { PhoneCall, ShieldCheck } from 'lucide-react';
import { AppSettings, MainMenu } from '../types';
import { DipsyAvatar } from './DipsyAvatar';

interface NavbarProps {
  activeMenu: MainMenu;
  onSelectMenu: (menu: MainMenu) => void;
  settings: AppSettings;
}

export function Navbar({ activeMenu, onSelectMenu, settings }: NavbarProps) {
  const navItems: { id: MainMenu; label: string }[] = [
    { id: 'curhat', label: 'Curhat Aman' },
    { id: 'edukasi', label: 'Mengenali Perundungan' },
    { id: 'admin', label: 'Login Admin' },
  ];

  const waNumber = settings.tppkPhone.replace(/^0/, '62').replace(/\D/g, '');

  return (
    <header className="no-print sm:sticky sm:top-0 z-30 bg-white/92 backdrop-blur-md border-b border-emerald-900/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectMenu('curhat')}
            className="text-lg sm:text-xl font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-md cursor-pointer"
          >
            DIPSI Tamantri
          </button>

          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
            <span>TPPK</span>
          </a>
        </div>

        <nav
          aria-label="Navigasi Utama"
          className="flex items-center justify-between sm:justify-center gap-2 sm:gap-7 border-t border-emerald-900/10 pt-1.5 sm:border-t-0 sm:pt-0"
        >
          {navItems.map((item) => {
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMenu(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`py-1.5 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                  active
                    ? 'border-emerald-700 text-emerald-900'
                    : 'border-transparent text-slate-600 hover:text-emerald-900 hover:border-emerald-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center shrink-0">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hubungi TPPK</span>
          </a>
        </div>
      </div>
    </header>
  );
}

interface SchoolIdentityBannerProps {
  settings: AppSettings;
  compact?: boolean;
}

export function SchoolIdentityBanner({ settings, compact = false }: SchoolIdentityBannerProps) {
  const waNumber = settings.tppkPhone.replace(/^0/, '62').replace(/\D/g, '');

  if (compact) {
    return (
      <section className="no-print max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        <div className="bg-white/92 backdrop-blur-sm border border-emerald-900/10 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <DipsyAvatar src={settings.dipsyImageUrl} size="sm" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-emerald-950 leading-tight">
                DIPSI Tamantri — Deteksi Perundungan Sejak Dini
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.schoolName} · Ketua Tim TPPK: {settings.tppkChairName} (HP/WA:{' '}
                <span className="font-mono tabular-nums font-semibold text-emerald-800">
                  {settings.tppkPhone}
                </span>
                )
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 whitespace-nowrap"
          >
            <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
            <span>WhatsApp {settings.tppkChairName}</span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="no-print max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <DipsyAvatar src={settings.dipsyImageUrl} size="lg" />

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-semibold text-emerald-800 mb-2">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{settings.schoolName}</span>
              <span aria-hidden="true">·</span>
              <span>Sahabat Psikologi Anak &amp; Orang Tua</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold text-emerald-950 tracking-tight text-balance leading-tight">
              DIPSI Tamantri — Deteksi Perundungan Sejak Dini
            </h1>

            <p className="mt-2.5 text-sm sm:text-base text-slate-700 max-w-2xl leading-relaxed">
              Hai teman-teman Kelas 1–6 dan Ayah/Bunda! Aku <strong>DIPSI</strong>, teman curhat
              rahasiamu. Semua ceritamu dijamin aman dan didampingi dengan penuh kasih sayang.
            </p>

            <div className="mt-4 pt-4 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-5 text-sm">
              <div className="text-slate-800">
                <span className="text-slate-500">Ketua Tim TPPK:</span>{' '}
                <strong className="font-semibold text-emerald-950">{settings.tppkChairName}</strong>
              </div>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                |
              </span>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono tabular-nums font-semibold text-emerald-800 hover:text-emerald-950 underline decoration-emerald-400 underline-offset-4"
              >
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                <span>HP/WA: {settings.tppkPhone}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
