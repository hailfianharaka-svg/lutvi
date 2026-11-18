import {
  AdminStats,
  AppSettings,
  CounselingReport,
  FollowUpStatus,
  SheetInspectResult,
  SheetSyncResult,
} from '../src/types';
import {
  DATABASE_SHEET_TABS,
  messagesToSheetValues,
  parseSheetFollowUpUpdates,
  reportsToSheetValues,
  settingsToSheetValues,
  statsToSheetValues,
} from '../src/utils/sheetsParser';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface GoogleSpreadsheetMetadata {
  spreadsheetId: string;
  properties?: {
    title?: string;
  };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

export class SheetsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function callSheetsApi<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok) {
    const apiErr = (parsed.error as { message?: string; status?: string } | undefined) ?? {};
    if (res.status === 401) {
      throw new SheetsApiError(
        401,
        'Sesi izin Google Sheets telah berakhir. Silakan klik "Sign in with Google" kembali.'
      );
    }
    if (res.status === 403) {
      throw new SheetsApiError(
        403,
        'Akun Google Anda belum memiliki izin edit pada Spreadsheet ini. Pastikan Spreadsheet dapat diedit oleh akun yang masuk.'
      );
    }
    if (res.status === 404) {
      throw new SheetsApiError(
        404,
        'Google Spreadsheet tidak ditemukan. Periksa kembali link atau ID Spreadsheet.'
      );
    }
    throw new SheetsApiError(
      res.status,
      apiErr.message || `Gagal berkomunikasi dengan Google Sheets (HTTP ${res.status}).`
    );
  }

  return parsed as unknown as T;
}

async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<GoogleSpreadsheetMetadata> {
  const fields = 'spreadsheetId,properties.title,sheets(properties(sheetId,title))';
  return callSheetsApi<GoogleSpreadsheetMetadata>(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(fields)}`,
    accessToken
  );
}

export async function inspectGoogleSpreadsheet(
  spreadsheetId: string,
  spreadsheetUrl: string,
  accessToken: string
): Promise<SheetInspectResult> {
  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const existingTabs = (meta.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const missingTabs = DATABASE_SHEET_TABS.filter((tab) => !existingTabs.includes(tab));

  return {
    spreadsheetId: meta.spreadsheetId || spreadsheetId,
    spreadsheetUrl,
    title: meta.properties?.title || 'Google Spreadsheet Tanpa Judul',
    existingTabs,
    requiredTabs: [...DATABASE_SHEET_TABS],
    missingTabs: [...missingTabs],
  };
}

export async function createNewGoogleSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const created = await callSheetsApi<GoogleSpreadsheetMetadata>(
    SHEETS_API_BASE,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: title.trim() || 'Database DIPSI Tamantri - SDN Kotalama 3',
        },
        sheets: DATABASE_SHEET_TABS.map((tabTitle) => ({
          properties: {
            title: tabTitle,
            gridProperties: { frozenRowCount: 1 },
          },
        })),
      }),
    }
  );

  const id = created.spreadsheetId;
  return {
    spreadsheetId: id,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    title: created.properties?.title || title,
  };
}

async function writeAllDatabaseValues(
  spreadsheetId: string,
  accessToken: string,
  reports: CounselingReport[],
  stats: AdminStats,
  settings: AppSettings,
  syncTimestamp: string
): Promise<void> {
  const rangesToClear = DATABASE_SHEET_TABS.map((t) => `${t}!A:Z`);
  await callSheetsApi(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ ranges: rangesToClear }),
    }
  );

  const reportValues = reportsToSheetValues(reports);
  const messageValues = messagesToSheetValues(reports);
  const statValues = statsToSheetValues(stats, syncTimestamp);
  const settingValues = settingsToSheetValues(settings);

  await callSheetsApi(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Laporan_Curhat!A1', values: reportValues },
          { range: 'Transkrip_Pesan!A1', values: messageValues },
          { range: 'Statistik_Ringkas!A1', values: statValues },
          { range: 'Pengaturan_TPPK!A1', values: settingValues },
        ],
      }),
    }
  );
}

async function applyHeaderFormatting(
  spreadsheetId: string,
  accessToken: string,
  sheetIdsByTitle: Map<string, number>
): Promise<void> {
  const requests: Record<string, unknown>[] = [];
  const columnCountByTab: Record<string, number> = {
    Laporan_Curhat: 15,
    Transkrip_Pesan: 7,
    Statistik_Ringkas: 3,
    Pengaturan_TPPK: 2,
  };

  for (const tab of DATABASE_SHEET_TABS) {
    const sheetId = sheetIdsByTitle.get(tab);
    if (sheetId === undefined) continue;
    const endCol = columnCountByTab[tab] ?? 6;

    requests.push(
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: endCol,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.024, green: 0.373, blue: 0.275 },
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true,
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      }
    );
  }

  if (requests.length > 0) {
    await callSheetsApi(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }
}

export async function provisionGoogleSpreadsheetDatabase(
  spreadsheetId: string,
  accessToken: string,
  reports: CounselingReport[],
  stats: AdminStats,
  settings: AppSettings
): Promise<SheetSyncResult> {
  let meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const existingTitles = new Set(
    (meta.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t))
  );

  const missingTabs = DATABASE_SHEET_TABS.filter((tab) => !existingTitles.has(tab));
  if (missingTabs.length > 0) {
    await callSheetsApi(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: missingTabs.map((title) => ({
            addSheet: {
              properties: {
                title,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          })),
        }),
      }
    );
    meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  }

  const sheetIdsByTitle = new Map<string, number>();
  for (const s of meta.sheets ?? []) {
    if (s.properties?.title && typeof s.properties.sheetId === 'number') {
      sheetIdsByTitle.set(s.properties.title, s.properties.sheetId);
    }
  }

  await applyHeaderFormatting(spreadsheetId, accessToken, sheetIdsByTitle);

  const syncTimestamp = new Date().toISOString();
  await writeAllDatabaseValues(spreadsheetId, accessToken, reports, stats, settings, syncTimestamp);

  const syncedMessagesCount = reports.reduce((sum, r) => sum + r.messages.length, 0);

  return {
    spreadsheetId,
    spreadsheetTitle: meta.properties?.title || 'Database DIPSI Tamantri',
    createdTabs: [...missingTabs],
    syncedReportsCount: reports.length,
    syncedMessagesCount,
    pulledUpdatesCount: 0,
    lastSyncAt: syncTimestamp,
  };
}

export async function syncGoogleSpreadsheetRealtime(params: {
  spreadsheetId: string;
  accessToken: string;
  lastSyncAt: string;
  settings: AppSettings;
  listReports: () => CounselingReport[];
  computeStats: (reports: CounselingReport[]) => AdminStats;
  applyFollowUpUpdate: (id: number, status: FollowUpStatus, note: string) => void;
  allowPullFromSheet: boolean;
}): Promise<SheetSyncResult> {
  const {
    spreadsheetId,
    accessToken,
    lastSyncAt,
    settings,
    listReports,
    computeStats,
    applyFollowUpUpdate,
    allowPullFromSheet,
  } = params;

  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const existingTitles = new Set(
    (meta.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t))
  );

  // Ensure tabs still exist (auto-heal if a user removed a tab)
  const missingTabs = DATABASE_SHEET_TABS.filter((tab) => !existingTitles.has(tab));
  if (missingTabs.length > 0) {
    await callSheetsApi(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: missingTabs.map((title) => ({
            addSheet: {
              properties: { title, gridProperties: { frozenRowCount: 1 } },
            },
          })),
        }),
      }
    );
  }

  let pulledUpdatesCount = 0;
  if (allowPullFromSheet && !missingTabs.includes('Laporan_Curhat')) {
    const readRes = await callSheetsApi<{ values?: unknown[][] }>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
        'Laporan_Curhat!A1:O'
      )}`,
      accessToken
    );

    const currentReports = listReports();
    const updates = parseSheetFollowUpUpdates(
      readRes.values ?? [],
      currentReports,
      lastSyncAt
    );

    for (const upd of updates) {
      applyFollowUpUpdate(upd.id, upd.followUpStatus, upd.tppkNote);
      pulledUpdatesCount += 1;
    }
  }

  const latestReports = listReports();
  const latestStats = computeStats(latestReports);
  const syncTimestamp = new Date().toISOString();

  await writeAllDatabaseValues(
    spreadsheetId,
    accessToken,
    latestReports,
    latestStats,
    settings,
    syncTimestamp
  );

  const syncedMessagesCount = latestReports.reduce((sum, r) => sum + r.messages.length, 0);

  return {
    spreadsheetId,
    spreadsheetTitle: meta.properties?.title || 'Database DIPSI Tamantri',
    createdTabs: [...missingTabs],
    syncedReportsCount: latestReports.length,
    syncedMessagesCount,
    pulledUpdatesCount,
    lastSyncAt: syncTimestamp,
  };
}
