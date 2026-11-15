import { AdminStats, AppSettings, CounselingReport } from '../types';

interface PrintableReportProps {
  reports: CounselingReport[];
  stats: AdminStats;
  settings: AppSettings;
}

export function PrintableReport({ reports, stats, settings }: PrintableReportProps) {
  return (
    <div className="hidden print-only p-6 text-black bg-white">
      <div className="border-b-2 border-black pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase">
          Laporan Rekapitulasi Deteksi Perundungan Sejak Dini — DIPSI Tamantri
        </h1>
        <p className="text-sm mt-1">
          {settings.schoolName} | Ketua Tim TPPK: {settings.tppkChairName} (HP/WA:{' '}
          {settings.tppkPhone})
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Tanggal Cetak: {new Date().toLocaleString('id-ID')}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5 text-sm">
        <div className="border border-gray-400 p-2.5">
          <div className="text-xs text-gray-600">Total Sesi Curhat</div>
          <div className="text-lg font-bold tabular-nums">{stats.totalReports}</div>
        </div>
        <div className="border border-gray-400 p-2.5">
          <div className="text-xs text-gray-600">Terindikasi Perundungan</div>
          <div className="text-lg font-bold tabular-nums">{stats.bullyingDetectedCount}</div>
        </div>
        <div className="border border-gray-400 p-2.5">
          <div className="text-xs text-gray-600">Sedang Diproses</div>
          <div className="text-lg font-bold tabular-nums">{stats.statusCounts['Diproses']}</div>
        </div>
        <div className="border border-gray-400 p-2.5">
          <div className="text-xs text-gray-600">Selesai / Bantuan Eksternal</div>
          <div className="text-lg font-bold tabular-nums">
            {stats.statusCounts['Selesai']} / {stats.statusCounts['Butuh Bantuan Eksternal']}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left">Kode &amp; Tanggal</th>
            <th className="border border-gray-400 p-2 text-left">Pelapor</th>
            <th className="border border-gray-400 p-2 text-left">Kelas/Usia</th>
            <th className="border border-gray-400 p-2 text-left">Suasana Hati</th>
            <th className="border border-gray-400 p-2 text-left">Deteksi AI</th>
            <th className="border border-gray-400 p-2 text-left">Status &amp; Catatan TPPK</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td className="border border-gray-400 p-2 align-top">
                <div className="font-semibold">{r.sessionCode}</div>
                <div>{new Date(r.createdAt).toLocaleDateString('id-ID')}</div>
              </td>
              <td className="border border-gray-400 p-2 align-top">
                <div className="font-semibold">{r.reporterName}</div>
                <div>
                  {r.identityMode} · {r.role}
                </div>
              </td>
              <td className="border border-gray-400 p-2 align-top">
                Kelas {r.grade} / {r.age} Thn
              </td>
              <td className="border border-gray-400 p-2 align-top">{r.mood}</td>
              <td className="border border-gray-400 p-2 align-top">
                <div className="font-semibold">{r.detectedCategory}</div>
                <div className="text-[11px] mt-1">{r.psychologicalSummary}</div>
              </td>
              <td className="border border-gray-400 p-2 align-top">
                <div className="font-semibold">{r.followUpStatus}</div>
                <div className="text-[11px] mt-1">{r.tppkNote || '-'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
