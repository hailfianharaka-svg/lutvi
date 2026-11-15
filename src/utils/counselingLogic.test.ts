import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackOpening,
  buildFallbackReply,
  classifyBullyingHeuristic,
  computeAdminStats,
  generateSafePseudonym,
  validateProfileInput,
} from './counselingLogic';
import { CounselingReport } from '../types';

test('validateProfileInput accepts valid student grades 1-6 and ages 6-14', () => {
  const result = validateProfileInput({
    identityMode: 'Anonim',
    reporterName: 'Bintang Pagi',
    role: 'Siswa',
    grade: 4,
    age: 10,
    mood: 'Sedih',
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.sanitized?.grade, 4);
  assert.equal(result.sanitized?.age, 10);
});

test('validateProfileInput rejects grade outside 1-6 and age outside 6-14', () => {
  const outOfRange = validateProfileInput({
    identityMode: 'Lengkap',
    reporterName: 'Andi',
    role: 'Siswa',
    grade: 7,
    age: 15,
    mood: 'Takut',
  });
  assert.equal(outOfRange.valid, false);
  assert.equal(outOfRange.errors.length, 2);

  const tooYoung = validateProfileInput({
    identityMode: 'Lengkap',
    reporterName: '',
    role: 'Orang Tua',
    grade: 0,
    age: 5,
    mood: 'Kesal',
  });
  assert.equal(tooYoung.valid, false);
  assert.equal(tooYoung.errors.length, 3);
});

test('classifyBullyingHeuristic classifies all 6 categories accurately', () => {
  assert.equal(
    classifyBullyingHeuristic('Hari ini aku bermain bersama teman dan sangat senang'),
    'Aman/Menyenangkan'
  );
  assert.equal(
    classifyBullyingHeuristic('Aku selalu diejek bodoh dan diberi julukan jelek di kelas'),
    'Perundungan Verbal'
  );
  assert.equal(
    classifyBullyingHeuristic('Teman-teman mengucilkan aku dan tidak diajak main saat istirahat'),
    'Perundungan Sosial'
  );
  assert.equal(
    classifyBullyingHeuristic('Kakak kelas memukul bahuku dan mendorong sampai jatuh'),
    'Perundungan Fisik'
  );
  assert.equal(
    classifyBullyingHeuristic('Ada yang mengirim chat jahat di grup WA dan sebar foto memalukan'),
    'Perundungan Digital (Cyberbullying)'
  );
  assert.equal(
    classifyBullyingHeuristic('Orang itu memaksa menyentuh area pribadi dan suruh rahasia kita berdua'),
    'Indikasi Pelecehan Seksual'
  );
});

test('buildFallbackOpening and buildFallbackReply adapt to mood and category', () => {
  const profile = {
    identityMode: 'Anonim' as const,
    reporterName: 'Kancil Ceria',
    role: 'Siswa' as const,
    grade: 3,
    age: 9,
    mood: 'Takut' as const,
  };
  const opening = buildFallbackOpening(profile);
  assert.match(opening, /DIPSI/);
  assert.match(opening, /aman/i);

  const urgentReply = buildFallbackReply('Indikasi Pelecehan Seksual', profile);
  assert.equal(urgentReply.needsUrgentTppk, true);
  assert.match(urgentReply.reply, /082334660789/);

  const safeReply = buildFallbackReply('Aman/Menyenangkan', profile);
  assert.equal(safeReply.needsUrgentTppk, false);
});

test('generateSafePseudonym produces readable pseudonym', () => {
  const pseudo = generateSafePseudonym(4);
  assert.ok(pseudo.length > 4);
  assert.match(pseudo, /#\d{2}/);
});

test('computeAdminStats aggregates totals, categories, and follow-up statuses', () => {
  const sampleReports: CounselingReport[] = [
    {
      id: 1,
      sessionCode: 'DSP-001',
      identityMode: 'Anonim',
      reporterName: 'Awan Pagi',
      role: 'Siswa',
      grade: 5,
      age: 11,
      mood: 'Sedih',
      detectedCategory: 'Perundungan Verbal',
      psychologicalSummary: 'Ejekan berulang.',
      followUpStatus: 'Diproses',
      tppkNote: '',
      needsUrgentTppk: true,
      createdAt: '2026-11-14T08:00:00Z',
      updatedAt: '2026-11-14T08:00:00Z',
      messages: [],
    },
    {
      id: 2,
      sessionCode: 'DSP-002',
      identityMode: 'Lengkap',
      reporterName: 'Siti Aminah',
      role: 'Orang Tua',
      grade: 2,
      age: 8,
      mood: 'Senang',
      detectedCategory: 'Aman/Menyenangkan',
      psychologicalSummary: 'Kondisi baik.',
      followUpStatus: 'Selesai',
      tppkNote: 'Sudah diapresiasi',
      needsUrgentTppk: false,
      createdAt: '2026-11-14T09:00:00Z',
      updatedAt: '2026-11-14T09:00:00Z',
      messages: [],
    },
  ];

  const stats = computeAdminStats(sampleReports);
  assert.equal(stats.totalReports, 2);
  assert.equal(stats.bullyingDetectedCount, 1);
  assert.equal(stats.statusCounts['Diproses'], 1);
  assert.equal(stats.statusCounts['Selesai'], 1);
  assert.equal(stats.statusCounts['Butuh Bantuan Eksternal'], 0);
  assert.equal(stats.categoryCounts['Perundungan Verbal'], 1);
  assert.equal(stats.categoryCounts['Aman/Menyenangkan'], 1);
});
