import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AdminRole,
  AdminUser,
  AppSettings,
  BullyingCategory,
  ChatMessage,
  CounselingReport,
  CurhatProfile,
  DEFAULT_DIPSY_IMAGE,
  DEFAULT_MEADOW_IMAGE,
  FollowUpStatus,
  SheetDbConfig,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'dipsi_tamantri.sqlite');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_code TEXT NOT NULL UNIQUE,
    identity_mode TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    role TEXT NOT NULL,
    grade INTEGER NOT NULL,
    age INTEGER NOT NULL,
    mood TEXT NOT NULL,
    detected_category TEXT NOT NULL,
    psychological_summary TEXT NOT NULL DEFAULT '',
    follow_up_status TEXT NOT NULL DEFAULT 'Diproses',
    tppk_note TEXT NOT NULL DEFAULT '',
    needs_urgent_tppk INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    detected_category TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  );
`);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const keyBuf = Buffer.from(key, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function seedInitialData() {
  const existingAdmin = db
    .prepare('SELECT id FROM admins WHERE username = ?')
    .get('tamantri') as { id: number } | undefined;

  if (!existingAdmin) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO admins (username, password_hash, full_name, role, is_primary, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      'tamantri',
      hashPassword('kolam3yes'),
      'Bapak Fajar (Ketua Tim TPPK)',
      'Ketua TPPK',
      1,
      now
    );
  }

  const defaultSettings: AppSettings = {
    dipsyImageUrl: DEFAULT_DIPSY_IMAGE,
    meadowImageUrl: DEFAULT_MEADOW_IMAGE,
    tppkChairName: 'Bapak Fajar',
    tppkPhone: '082334660789',
    schoolName: 'SDN Kotalama 3',
  };

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  );
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, String(v));
  }

  const reportCount = db.prepare('SELECT COUNT(*) as cnt FROM reports').get() as {
    cnt: number;
  };

  if (reportCount.cnt === 0) {
    const t1 = new Date(Date.now() - 86400000 * 2).toISOString();
    const t2 = new Date(Date.now() - 86400000).toISOString();
    const t3 = new Date(Date.now() - 3600000 * 5).toISOString();

    const r1 = db
      .prepare(
        `INSERT INTO reports (
          session_code, identity_mode, reporter_name, role, grade, age, mood,
          detected_category, psychological_summary, follow_up_status, tppk_note,
          needs_urgent_tppk, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'DSP-1001',
        'Anonim',
        'Kancil Berani #14',
        'Siswa',
        4,
        10,
        'Sedih',
        'Perundungan Verbal',
        'Siswa melaporkan ejekan berulang terkait nama panggilan yang membuatnya murung saat istirahat.',
        'Diproses',
        'Wali kelas 4 sudah dihubungi untuk observasi interaksi jam istirahat.',
        1,
        t1,
        t1
      );

    const r1Id = Number(r1.lastInsertRowid);
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r1Id,
      'dipsy',
      'Hai Kancil Berani #14, peluk hangat dari DIPSI untukmu. Boleh cerita hal apa yang membuat hatimu sedih hari ini?',
      null,
      t1
    );
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r1Id,
      'user',
      'Beberapa teman di kelas sering mengejekku dengan julukan jelek setiap istirahat sampai aku malas ke kantin.',
      'Perundungan Verbal',
      t1
    );
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r1Id,
      'dipsy',
      'Terima kasih sudah berani cerita. Julukan yang menyakiti hati bukanlah bercanda yang baik. Tim TPPK bersama Bapak Fajar siap membantumu agar suasana kelas kembali nyaman.',
      'Perundungan Verbal',
      t1
    );

    const r2 = db
      .prepare(
        `INSERT INTO reports (
          session_code, identity_mode, reporter_name, role, grade, age, mood,
          detected_category, psychological_summary, follow_up_status, tppk_note,
          needs_urgent_tppk, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'DSP-1002',
        'Lengkap',
        'Ibu Ratna (Wali Ananda Dimas)',
        'Orang Tua',
        5,
        11,
        'Kesal',
        'Perundungan Sosial',
        'Orang tua melaporkan anak sempat dijauhi dalam tugas kelompok karena kesalahpahaman antarteman.',
        'Selesai',
        'Mediasi bersama Guru BK dan kedua siswa berjalan baik; kelompok belajar sudah rukun kembali.',
        1,
        t2,
        t2
      );

    const r2Id = Number(r2.lastInsertRowid);
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r2Id,
      'dipsy',
      'Halo Ayah/Bunda Ibu Ratna, terima kasih sudah berbagi di ruang aman SDN Kotalama 3. Cerita apa yang sedang membuat hati terasa kesal?',
      null,
      t2
    );
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r2Id,
      'user',
      'Anak saya cerita dia sengaja tidak diajak kerja kelompok dan dijauhi teman-temannya minggu ini.',
      'Perundungan Sosial',
      t2
    );

    const r3 = db
      .prepare(
        `INSERT INTO reports (
          session_code, identity_mode, reporter_name, role, grade, age, mood,
          detected_category, psychological_summary, follow_up_status, tppk_note,
          needs_urgent_tppk, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'DSP-1003',
        'Anonim',
        'Pelangi Pagi #22',
        'Siswa',
        2,
        8,
        'Senang',
        'Aman/Menyenangkan',
        'Siswa berbagi pengalaman positif bermain bersama teman saat pelajaran olahraga.',
        'Selesai',
        'Apresiasi lingkungan kelas yang suportif.',
        0,
        t3,
        t3
      );

    const r3Id = Number(r3.lastInsertRowid);
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r3Id,
      'dipsy',
      'Hai Pelangi Pagi #22! DIPSI senang melihat kamu bahagia hari ini. Kejadian seru apa yang ingin kamu ceritakan?',
      null,
      t3
    );
    db.prepare(
      `INSERT INTO messages (report_id, sender, content, detected_category, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(
      r3Id,
      'user',
      'Hari ini aku senang sekali karena teman-teman meminjamkan penghapus dan mengajak bermain lompat tali bersama!',
      'Aman/Menyenangkan',
      t3
    );
  }
}

seedInitialData();

export function getSettings(): AppSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    dipsyImageUrl: map.get('dipsyImageUrl') || DEFAULT_DIPSY_IMAGE,
    meadowImageUrl: map.get('meadowImageUrl') || DEFAULT_MEADOW_IMAGE,
    tppkChairName: map.get('tppkChairName') || 'Bapak Fajar',
    tppkPhone: map.get('tppkPhone') || '082334660789',
    schoolName: map.get('schoolName') || 'SDN Kotalama 3',
  };
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  if (partial.dipsyImageUrl !== undefined) {
    upsert.run('dipsyImageUrl', partial.dipsyImageUrl || DEFAULT_DIPSY_IMAGE);
  }
  if (partial.meadowImageUrl !== undefined) {
    upsert.run('meadowImageUrl', partial.meadowImageUrl || DEFAULT_MEADOW_IMAGE);
  }
  if (partial.tppkChairName !== undefined && partial.tppkChairName.trim()) {
    upsert.run('tppkChairName', partial.tppkChairName.trim());
  }
  if (partial.tppkPhone !== undefined && partial.tppkPhone.trim()) {
    upsert.run('tppkPhone', partial.tppkPhone.trim());
  }
  return getSettings();
}

export function getSheetDbConfig(): SheetDbConfig {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    linkedSpreadsheetId: map.get('linkedSpreadsheetId') || '',
    linkedSpreadsheetUrl: map.get('linkedSpreadsheetUrl') || '',
    linkedSpreadsheetTitle: map.get('linkedSpreadsheetTitle') || '',
    autoSync: map.get('sheetsAutoSync') !== 'false',
    dbInitialized: map.get('sheetsDbInitialized') === 'true',
    lastSyncAt: map.get('sheetsLastSyncAt') || '',
  };
}

export function updateSheetDbConfig(partial: Partial<SheetDbConfig>): SheetDbConfig {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  if (partial.linkedSpreadsheetId !== undefined) {
    upsert.run('linkedSpreadsheetId', partial.linkedSpreadsheetId);
  }
  if (partial.linkedSpreadsheetUrl !== undefined) {
    upsert.run('linkedSpreadsheetUrl', partial.linkedSpreadsheetUrl);
  }
  if (partial.linkedSpreadsheetTitle !== undefined) {
    upsert.run('linkedSpreadsheetTitle', partial.linkedSpreadsheetTitle);
  }
  if (partial.autoSync !== undefined) {
    upsert.run('sheetsAutoSync', partial.autoSync ? 'true' : 'false');
  }
  if (partial.dbInitialized !== undefined) {
    upsert.run('sheetsDbInitialized', partial.dbInitialized ? 'true' : 'false');
  }
  if (partial.lastSyncAt !== undefined) {
    upsert.run('sheetsLastSyncAt', partial.lastSyncAt);
  }
  return getSheetDbConfig();
}

export function clearSheetDbConfig(): SheetDbConfig {
  db.prepare(
    `DELETE FROM settings WHERE key IN (
      'linkedSpreadsheetId',
      'linkedSpreadsheetUrl',
      'linkedSpreadsheetTitle',
      'sheetsAutoSync',
      'sheetsDbInitialized',
      'sheetsLastSyncAt'
    )`
  ).run();
  return getSheetDbConfig();
}

export function createCounselingSession(
  profile: CurhatProfile,
  openingMessage: string
): CounselingReport {
  const now = new Date().toISOString();
  const sessionCode = `DSP-${Math.floor(1000 + Math.random() * 9000)}-${Date.now()
    .toString()
    .slice(-3)}`;

  const res = db
    .prepare(
      `INSERT INTO reports (
        session_code, identity_mode, reporter_name, role, grade, age, mood,
        detected_category, psychological_summary, follow_up_status, tppk_note,
        needs_urgent_tppk, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      sessionCode,
      profile.identityMode,
      profile.reporterName,
      profile.role,
      profile.grade,
      profile.age,
      profile.mood,
      'Aman/Menyenangkan',
      'Sesi curhat dimulai, menunggu cerita pelapor.',
      'Diproses',
      '',
      0,
      now,
      now
    );

  const reportId = Number(res.lastInsertRowid);
  db.prepare(
    `INSERT INTO messages (report_id, sender, content, detected_category, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(reportId, 'dipsy', openingMessage, null, now);

  return getReportById(reportId)!;
}

export function appendConversationTurn(
  reportId: number,
  userContent: string,
  dipsyReply: string,
  category: BullyingCategory,
  summary: string,
  needsUrgentTppk: boolean
): CounselingReport | null {
  const existing = getReportById(reportId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const insertMsg = db.prepare(
    `INSERT INTO messages (report_id, sender, content, detected_category, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  insertMsg.run(reportId, 'user', userContent, category, now);
  insertMsg.run(reportId, 'dipsy', dipsyReply, category, now);

  // Preserve higher-severity risk classification if session already detected one
  const priorityOrder: BullyingCategory[] = [
    'Indikasi Pelecehan Seksual',
    'Perundungan Fisik',
    'Perundungan Digital (Cyberbullying)',
    'Perundungan Sosial',
    'Perundungan Verbal',
    'Aman/Menyenangkan',
  ];
  const prevIdx = priorityOrder.indexOf(existing.detectedCategory);
  const newIdx = priorityOrder.indexOf(category);
  const finalCategory =
    prevIdx !== -1 && prevIdx < newIdx && existing.detectedCategory !== 'Aman/Menyenangkan'
      ? existing.detectedCategory
      : category;

  const finalUrgent = existing.needsUrgentTppk || needsUrgentTppk ? 1 : 0;

  db.prepare(
    `UPDATE reports
     SET detected_category = ?, psychological_summary = ?, needs_urgent_tppk = ?, updated_at = ?
     WHERE id = ?`
  ).run(finalCategory, summary, finalUrgent, now, reportId);

  return getReportById(reportId);
}

export function getReportById(id: number): CounselingReport | null {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;

  const msgRows = db
    .prepare('SELECT * FROM messages WHERE report_id = ? ORDER BY id ASC')
    .all(id) as Record<string, unknown>[];

  return mapReportRow(row, msgRows);
}

export function listAllReports(): CounselingReport[] {
  const rows = db
    .prepare('SELECT * FROM reports ORDER BY id DESC')
    .all() as Record<string, unknown>[];

  const allMsgs = db
    .prepare('SELECT * FROM messages ORDER BY id ASC')
    .all() as Record<string, unknown>[];

  const msgMap = new Map<number, Record<string, unknown>[]>();
  for (const m of allMsgs) {
    const rid = Number(m.report_id);
    if (!msgMap.has(rid)) msgMap.set(rid, []);
    msgMap.get(rid)!.push(m);
  }

  return rows.map((row) => mapReportRow(row, msgMap.get(Number(row.id)) ?? []));
}

function mapReportRow(
  row: Record<string, unknown>,
  msgRows: Record<string, unknown>[]
): CounselingReport {
  const messages: ChatMessage[] = msgRows.map((m) => ({
    id: Number(m.id),
    sender: m.sender === 'user' ? 'user' : 'dipsy',
    content: String(m.content),
    detectedCategory: m.detected_category
      ? (String(m.detected_category) as BullyingCategory)
      : undefined,
    createdAt: String(m.created_at),
  }));

  return {
    id: Number(row.id),
    sessionCode: String(row.session_code),
    identityMode: row.identity_mode === 'Anonim' ? 'Anonim' : 'Lengkap',
    reporterName: String(row.reporter_name),
    role: row.role === 'Orang Tua' ? 'Orang Tua' : 'Siswa',
    grade: Number(row.grade),
    age: Number(row.age),
    mood: String(row.mood) as CounselingReport['mood'],
    detectedCategory: String(row.detected_category) as BullyingCategory,
    psychologicalSummary: String(row.psychological_summary || ''),
    followUpStatus: String(row.follow_up_status) as FollowUpStatus,
    tppkNote: String(row.tppk_note || ''),
    needsUrgentTppk: Boolean(row.needs_urgent_tppk),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    messages,
  };
}

export function updateReportProgress(
  id: number,
  followUpStatus: FollowUpStatus,
  tppkNote: string
): CounselingReport | null {
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `UPDATE reports SET follow_up_status = ?, tppk_note = ?, updated_at = ? WHERE id = ?`
    )
    .run(followUpStatus, tppkNote, now, id);
  if (res.changes === 0) return null;
  return getReportById(id);
}

export function authenticateAdmin(
  username: string,
  password: string
): { token: string; user: AdminUser } | null {
  const row = db
    .prepare('SELECT * FROM admins WHERE username = ?')
    .get(username.trim()) as Record<string, unknown> | undefined;

  if (!row) return null;
  if (!verifyPassword(password, String(row.password_hash))) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  db.prepare(
    `INSERT INTO admin_sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(token, Number(row.id), now.toISOString(), expires.toISOString());

  return {
    token,
    user: {
      id: Number(row.id),
      username: String(row.username),
      fullName: String(row.full_name),
      role: String(row.role) as AdminRole,
      createdAt: String(row.created_at),
    },
  };
}

export function getAdminByToken(token: string): AdminUser | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT a.id, a.username, a.full_name, a.role, a.created_at, s.expires_at
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token = ?`
    )
    .get(token) as Record<string, unknown> | undefined;

  if (!row) return null;
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: Number(row.id),
    username: String(row.username),
    fullName: String(row.full_name),
    role: String(row.role) as AdminRole,
    createdAt: String(row.created_at),
  };
}

export function revokeAdminToken(token: string) {
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

export function listAdmins(): AdminUser[] {
  const rows = db
    .prepare('SELECT id, username, full_name, role, created_at FROM admins ORDER BY id ASC')
    .all() as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    username: String(r.username),
    fullName: String(r.full_name),
    role: String(r.role) as AdminRole,
    createdAt: String(r.created_at),
  }));
}

export function createAdminUser(
  username: string,
  password: string,
  fullName: string,
  role: AdminRole
): { ok: true; user: AdminUser } | { ok: false; error: string } {
  const cleanUser = username.trim().toLowerCase();
  if (cleanUser.length < 3) {
    return { ok: false, error: 'Username minimal 3 karakter.' };
  }
  if (password.length < 5) {
    return { ok: false, error: 'Password minimal 5 karakter.' };
  }
  if (fullName.trim().length < 2) {
    return { ok: false, error: 'Nama lengkap wajib diisi.' };
  }

  const existing = db
    .prepare('SELECT id FROM admins WHERE LOWER(username) = ?')
    .get(cleanUser);
  if (existing) {
    return { ok: false, error: 'Username sudah terdaftar.' };
  }

  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO admins (username, password_hash, full_name, role, is_primary, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(cleanUser, hashPassword(password), fullName.trim(), role, now);

  const id = Number(res.lastInsertRowid);
  return {
    ok: true,
    user: {
      id,
      username: cleanUser,
      fullName: fullName.trim(),
      role,
      createdAt: now,
    },
  };
}

export function deleteAdminUser(id: number): { ok: boolean; error?: string } {
  const target = db
    .prepare('SELECT is_primary FROM admins WHERE id = ?')
    .get(id) as { is_primary: number } | undefined;

  if (!target) return { ok: false, error: 'Akun admin tidak ditemukan.' };
  if (target.is_primary === 1) {
    return { ok: false, error: 'Akun utama Tim TPPK tidak dapat dihapus.' };
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(id);
  return { ok: true };
}
