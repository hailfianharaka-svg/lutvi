import {
  AdminStats,
  AppSettings,
  CounselingReport,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
} from '../types';

export const DATABASE_SHEET_TABS = [
  'Laporan_Curhat',
  'Transkrip_Pesan',
  'Statistik_Ringkas',
  'Pengaturan_TPPK',
] as const;

export type DatabaseSheetTab = (typeof DATABASE_SHEET_TABS)[number];

export const LAPORAN_HEADERS = [
  'ID',
  'Kode_Sesi',
  'Waktu_Dibuat',
  'Mode_Identitas',
  'Nama_Pelapor',
  'Peran',
  'Kelas',
  'Usia',
  'Suasana_Hati',
  'Kategori_Deteksi_AI',
  'Urgensi_TPPK',
  'Ringkasan_Psikologis',
  'Progress_Tindak_Lanjut',
  'Catatan_TPPK',
  'Terakhir_Diperbarui',
];

export const TRANSKRIP_HEADERS = [
  'ID_Pesan',
  'ID_Laporan',
  'Kode_Sesi',
  'Pengirim',
  'Kategori_Terdeteksi',
  'Isi_Pesan',
  'Waktu',
];

export const STATISTIK_HEADERS = ['Metrik', 'Nilai', 'Keterangan'];

export const PENGATURAN_HEADERS = ['Kunci', 'Nilai'];

export interface ExtractedSpreadsheetLink {
  ok: true;
  spreadsheetId: string;
  canonicalUrl: string;
}

export interface InvalidSpreadsheetLink {
  ok: false;
  error: string;
}

export function extractSpreadsheetId(
  rawInput: string
): ExtractedSpreadsheetLink | InvalidSpreadsheetLink {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Masukkan link Google Spreadsheet atau ID Spreadsheet terlebih dahulu.',
    };
  }

  // Reject publish-to-web URLs which cannot be edited via Sheets API
  if (/docs\.google\.com\/spreadsheets\/d\/e\//i.test(trimmed)) {
    return {
      ok: false,
      error:
        'Link publikasi (/d/e/...) hanya bersifat baca. Gunakan link edit Google Spreadsheet (/spreadsheets/d/<ID>/edit).',
    };
  }

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (urlMatch?.[1]) {
    const id = urlMatch[1];
    return {
      ok: true,
      spreadsheetId: id,
      canonicalUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    };
  }

  // Allow raw spreadsheet ID if no spaces/slashes
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return {
      ok: true,
      spreadsheetId: trimmed,
      canonicalUrl: `https://docs.google.com/spreadsheets/d/${trimmed}/edit`,
    };
  }

  return {
    ok: false,
    error:
      'Format link tidak dikenali. Contoh: https://docs.google.com/spreadsheets/d/1AbC.../edit',
  };
}

export function reportsToSheetValues(reports: CounselingReport[]): (string | number)[][] {
  const rows = reports.map((r) => [
    r.id,
    r.sessionCode,
    r.createdAt,
    r.identityMode,
    r.reporterName,
    r.role,
    r.grade,
    r.age,
    r.mood,
    r.detectedCategory,
    r.needsUrgentTppk ? 'YA' : 'TIDAK',
    r.psychologicalSummary,
    r.followUpStatus,
    r.tppkNote,
    r.updatedAt,
  ]);
  return [LAPORAN_HEADERS, ...rows];
}

export function messagesToSheetValues(reports: CounselingReport[]): (string | number)[][] {
  const rows: (string | number)[][] = [];
  for (const r of reports) {
    for (const m of r.messages) {
      rows.push([
        m.id,
        r.id,
        r.sessionCode,
        m.sender === 'dipsy' ? 'DIPSI' : r.reporterName,
        m.detectedCategory ?? '-',
        m.content,
        m.createdAt,
      ]);
    }
  }
  return [TRANSKRIP_HEADERS, ...rows];
}

export function statsToSheetValues(
  stats: AdminStats,
  lastSyncAt: string
): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['Total Curhat Masuk', stats.totalReports, 'Seluruh sesi curhat tersimpan'],
    ['Indikasi Perundungan', stats.bullyingDetectedCount, 'Selain kategori Aman/Menyenangkan'],
    ['Status: Diproses', stats.statusCounts['Diproses'] ?? 0, 'Dalam pendampingan TPPK'],
    ['Status: Selesai', stats.statusCounts['Selesai'] ?? 0, 'Tindak lanjut tuntas'],
    [
      'Status: Butuh Bantuan Eksternal',
      stats.statusCounts['Butuh Bantuan Eksternal'] ?? 0,
      'Rujukan ke psikolog/ahli eksternal',
    ],
    ...Object.entries(stats.categoryCounts).map(([cat, count]) => [
      `Kategori: ${cat}`,
      count,
      'Jumlah laporan terdeteksi AI',
    ]),
    ['Terakhir Disinkronkan', lastSyncAt, 'Waktu sinkronisasi otomatis real-time'],
  ];
  return [STATISTIK_HEADERS, ...rows];
}

export function settingsToSheetValues(settings: AppSettings): (string | number)[][] {
  return [
    PENGATURAN_HEADERS,
    ['Sekolah', settings.schoolName],
    ['Ketua Tim TPPK', settings.tppkChairName],
    ['Nomor HP/WA TPPK', settings.tppkPhone],
  ];
}

export interface SheetFollowUpUpdate {
  id: number;
  followUpStatus: FollowUpStatus;
  tppkNote: string;
}

export function parseSheetFollowUpUpdates(
  sheetRows: unknown[][],
  existingReports: CounselingReport[],
  lastSyncAt: string
): SheetFollowUpUpdate[] {
  const byId = new Map(existingReports.map((r) => [r.id, r]));
  const lastSyncMs = lastSyncAt ? Date.parse(lastSyncAt) : 0;
  const updates: SheetFollowUpUpdate[] = [];

  // Skip header row at index 0
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (!Array.isArray(row) || row.length < 13) continue;

    const id = Number(row[0]);
    const rawStatus = String(row[12] ?? '').trim() as FollowUpStatus;
    const rawNote = String(row[13] ?? '').trim();

    if (!Number.isInteger(id) || id <= 0) continue;
    if (!FOLLOW_UP_STATUSES.includes(rawStatus)) continue;

    const existing = byId.get(id);
    if (!existing) continue;

    const existingUpdatedMs = Date.parse(existing.updatedAt);
    // Only pull from Sheet when the app hasn't been modified more recently than the last sync
    const appModifiedMoreRecently =
      Number.isFinite(lastSyncMs) &&
      lastSyncMs > 0 &&
      Number.isFinite(existingUpdatedMs) &&
      existingUpdatedMs > lastSyncMs + 1000;

    if (appModifiedMoreRecently) continue;

    if (rawStatus !== existing.followUpStatus || rawNote !== existing.tppkNote) {
      updates.push({
        id,
        followUpStatus: rawStatus,
        tppkNote: rawNote,
      });
    }
  }

  return updates;
}
