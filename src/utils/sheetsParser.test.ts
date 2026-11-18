import assert from 'node:assert/strict';
import test from 'node:test';
import { CounselingReport } from '../types';
import {
  DATABASE_SHEET_TABS,
  extractSpreadsheetId,
  messagesToSheetValues,
  parseSheetFollowUpUpdates,
  reportsToSheetValues,
} from './sheetsParser';

const SAMPLE_REPORT: CounselingReport = {
  id: 12,
  sessionCode: 'DSP-1012',
  identityMode: 'Anonim',
  reporterName: 'Bintang Kecil #12',
  role: 'Siswa',
  grade: 4,
  age: 10,
  mood: 'Sedih',
  detectedCategory: 'Perundungan Verbal',
  psychologicalSummary: 'Siswa melaporkan ejekan nama panggilan.',
  followUpStatus: 'Diproses',
  tppkNote: 'Observasi awal oleh wali kelas.',
  needsUrgentTppk: true,
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T08:05:00.000Z',
  messages: [
    {
      id: 1,
      sender: 'dipsy',
      content: 'Halo, cerita yuk?',
      createdAt: '2026-04-01T08:00:00.000Z',
    },
    {
      id: 2,
      sender: 'user',
      content: 'Aku diejek teman.',
      detectedCategory: 'Perundungan Verbal',
      createdAt: '2026-04-01T08:02:00.000Z',
    },
  ],
};

test('extractSpreadsheetId extracts ID from standard Google Sheets edit URL', () => {
  const res = extractSpreadsheetId(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    assert.equal(
      res.canonicalUrl,
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    );
  }
});

test('extractSpreadsheetId accepts raw spreadsheet ID and rejects /d/e/ publish URLs', () => {
  const raw = extractSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(raw.ok, true);

  const pub = extractSpreadsheetId(
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSomePublishedKey/pubhtml'
  );
  assert.equal(pub.ok, false);
});

test('reportsToSheetValues and messagesToSheetValues preserve headers and columns', () => {
  assert.equal(DATABASE_SHEET_TABS.length, 4);
  const reportGrid = reportsToSheetValues([SAMPLE_REPORT]);
  assert.equal(reportGrid.length, 2);
  assert.equal(reportGrid[0][0], 'ID');
  assert.equal(reportGrid[1][1], 'DSP-1012');
  assert.equal(reportGrid[1][10], 'YA');

  const msgGrid = messagesToSheetValues([SAMPLE_REPORT]);
  assert.equal(msgGrid.length, 3);
  assert.equal(msgGrid[1][3], 'DIPSI');
  assert.equal(msgGrid[2][3], 'Bintang Kecil #12');
});

test('parseSheetFollowUpUpdates detects valid status and note edits from Google Sheet', () => {
  const grid = reportsToSheetValues([SAMPLE_REPORT]);
  grid[1][12] = 'Selesai';
  grid[1][13] = 'Mediasi selesai dengan baik.';

  const updates = parseSheetFollowUpUpdates(
    grid,
    [SAMPLE_REPORT],
    '2026-04-01T08:10:00.000Z'
  );
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    id: 12,
    followUpStatus: 'Selesai',
    tppkNote: 'Mediasi selesai dengan baik.',
  });
});

test('parseSheetFollowUpUpdates skips invalid status or when app is newer than last sync', () => {
  const grid = reportsToSheetValues([SAMPLE_REPORT]);
  grid[1][12] = 'StatusTidakValid';

  const invalidRes = parseSheetFollowUpUpdates(
    grid,
    [SAMPLE_REPORT],
    '2026-04-01T08:10:00.000Z'
  );
  assert.equal(invalidRes.length, 0);

  grid[1][12] = 'Selesai';
  const staleRes = parseSheetFollowUpUpdates(
    grid,
    [SAMPLE_REPORT],
    '2026-04-01T08:01:00.000Z'
  );
  assert.equal(staleRes.length, 0);
});
