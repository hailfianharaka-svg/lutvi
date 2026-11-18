import { useEffect, useState } from 'react';
import {
  AppSettings,
  DEFAULT_DIPSY_IMAGE,
  DEFAULT_MEADOW_IMAGE,
  MainMenu,
} from './types';
import { Navbar, SchoolIdentityBanner } from './components/Navbar';
import { CurhatAmanView } from './components/CurhatAmanView';
import { MengenaliPerundunganView } from './components/MengenaliPerundunganView';
import { AdminDashboardView } from './components/AdminDashboardView';

const DEFAULT_SETTINGS: AppSettings = {
  dipsyImageUrl: DEFAULT_DIPSY_IMAGE,
  meadowImageUrl: DEFAULT_MEADOW_IMAGE,
  tppkChairName: 'Bapak Fajar',
  tppkPhone: '082334660789',
  schoolName: 'SDN Kotalama 3',
};

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MainMenu>('curhat');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [bgFailed, setBgFailed] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) {
          setSettings(data.settings);
          setBgFailed(false);
        }
      })
      .catch(() => {
        // Retain default local assets gracefully
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSettingsUpdated(updated: AppSettings) {
    setSettings(updated);
    setBgFailed(false);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Rolling Green Hills Meadow Backdrop */}
      <div className="no-print fixed inset-0 -z-10 pointer-events-none">
        {!bgFailed && settings.meadowImageUrl ? (
          <img
            src={settings.meadowImageUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover object-bottom"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-sky-100 via-emerald-50 to-lime-200" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-white/55 via-emerald-50/40 to-emerald-950/10"
        />
      </div>

      <Navbar
        activeMenu={activeMenu}
        onSelectMenu={setActiveMenu}
        settings={settings}
      />

      <main className="flex-1 pb-12">
        <SchoolIdentityBanner
          settings={settings}
          compact={activeMenu === 'admin' || (activeMenu === 'curhat' && isChatActive)}
        />

        {activeMenu === 'curhat' && (
          <CurhatAmanView
            settings={settings}
            onGoToEducation={() => setActiveMenu('edukasi')}
            onSessionActiveChange={setIsChatActive}
          />
        )}

        {activeMenu === 'edukasi' && (
          <MengenaliPerundunganView
            settings={settings}
            onStartCurhat={() => setActiveMenu('curhat')}
          />
        )}

        {activeMenu === 'admin' && (
          <AdminDashboardView
            settings={settings}
            onSettingsUpdated={handleSettingsUpdated}
          />
        )}
      </main>

      <footer className="no-print bg-white/90 backdrop-blur-sm border-t border-emerald-900/10 py-5 px-4 sm:px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <p className="font-medium text-slate-700">
            DIPSI Tamantri · Deteksi Perundungan Sejak Dini · {settings.schoolName}
          </p>
          <p className="font-medium text-slate-700">
            Created by: <strong className="text-emerald-900">Lutvi Awan Amin</strong>. 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
