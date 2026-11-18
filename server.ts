import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  appendConversationTurn,
  authenticateAdmin,
  clearSheetDbConfig,
  createAdminUser,
  createCounselingSession,
  deleteAdminUser,
  getAdminByToken,
  getReportById,
  getSettings,
  getSheetDbConfig,
  listAdmins,
  listAllReports,
  revokeAdminToken,
  updateReportProgress,
  updateSettings,
  updateSheetDbConfig,
} from './server/db';
import { analyzeAndRespondTurn, generateOpeningPrompt } from './server/ai';
import {
  createNewGoogleSpreadsheet,
  inspectGoogleSpreadsheet,
  provisionGoogleSpreadsheetDatabase,
  SheetsApiError,
  syncGoogleSpreadsheetRealtime,
} from './server/sheets';
import { computeAdminStats, validateProfileInput } from './src/utils/counselingLogic';
import { extractSpreadsheetId } from './src/utils/sheetsParser';
import { ADMIN_ROLES, AdminRole, FOLLOW_UP_STATUSES, FollowUpStatus } from './src/types';

const PORT = 3000;

const adminEventClients = new Set<Response>();

function broadcastAdminEvent(event: string, payload: Record<string, unknown> = {}) {
  const data = JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() });
  for (const client of adminEventClients) {
    try {
      client.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      adminEventClients.delete(client);
    }
  }
}

function extractToken(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function extractGoogleAccessToken(req: Request): string {
  const headerToken = req.headers['x-google-access-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  return '';
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const admin = getAdminByToken(token);
  if (!admin) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
    return;
  }
  (req as Request & { adminUser: typeof admin }).adminUser = admin;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/settings', (_req, res) => {
    res.json({ settings: getSettings() });
  });

  app.post('/api/curhat/start', async (req, res) => {
    try {
      const validation = validateProfileInput(req.body);
      if (!validation.valid || !validation.sanitized) {
        res.status(400).json({ error: validation.errors.join(' ') });
        return;
      }

      const opening = await generateOpeningPrompt(validation.sanitized);
      const report = createCounselingSession(validation.sanitized, opening);
      broadcastAdminEvent('reports_updated', { reportId: report.id });
      res.status(201).json({ report });
    } catch (err) {
      console.error('Error starting curhat session:', err);
      res.status(500).json({ error: 'Gagal memulai sesi Curhat Aman. Silakan coba lagi.' });
    }
  });

  app.post('/api/curhat/message', async (req, res) => {
    try {
      const reportId = Number(req.body?.reportId);
      const message = String(req.body?.message ?? '').trim();

      if (!Number.isInteger(reportId) || reportId <= 0) {
        res.status(400).json({ error: 'ID sesi curhat tidak valid.' });
        return;
      }
      if (!message || message.length < 2) {
        res.status(400).json({ error: 'Pesan curhat tidak boleh kosong.' });
        return;
      }

      const existing = getReportById(reportId);
      if (!existing) {
        res.status(404).json({ error: 'Sesi curhat tidak ditemukan.' });
        return;
      }

      const profile = {
        identityMode: existing.identityMode,
        reporterName: existing.reporterName,
        role: existing.role,
        grade: existing.grade,
        age: existing.age,
        mood: existing.mood,
      };

      const analysis = await analyzeAndRespondTurn(profile, existing.messages, message);
      const updated = appendConversationTurn(
        reportId,
        message,
        analysis.reply,
        analysis.category,
        analysis.psychologicalSummary,
        analysis.needsUrgentTppk
      );

      broadcastAdminEvent('reports_updated', { reportId });

      res.json({
        report: updated,
        latestAnalysis: analysis,
      });
    } catch (err) {
      console.error('Error processing curhat message:', err);
      res.status(500).json({ error: 'Gagal memproses pesan curhat. Silakan coba lagi.' });
    }
  });

  app.post('/api/admin/login', (req, res) => {
    const username = String(req.body?.username ?? '');
    const password = String(req.body?.password ?? '');
    const result = authenticateAdmin(username, password);
    if (!result) {
      res.status(401).json({ error: 'Username atau password admin salah.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractToken(req);
    if (token) revokeAdminToken(token);
    res.json({ ok: true });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const adminUser = (req as Request & { adminUser: ReturnType<typeof getAdminByToken> }).adminUser;
    res.json({ user: adminUser });
  });

  app.get('/api/admin/events', requireAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    adminEventClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        adminEventClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      adminEventClients.delete(res);
    });
  });

  app.get('/api/admin/reports', requireAdmin, (_req, res) => {
    const reports = listAllReports();
    const stats = computeAdminStats(reports);
    res.json({ reports, stats });
  });

  app.patch('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const followUpStatus = String(req.body?.followUpStatus ?? '') as FollowUpStatus;
    const tppkNote = String(req.body?.tppkNote ?? '');

    if (!FOLLOW_UP_STATUSES.includes(followUpStatus)) {
      res.status(400).json({ error: 'Status tindak lanjut tidak valid.' });
      return;
    }

    const updated = updateReportProgress(id, followUpStatus, tppkNote);
    if (!updated) {
      res.status(404).json({ error: 'Laporan tidak ditemukan.' });
      return;
    }

    const reports = listAllReports();
    const stats = computeAdminStats(reports);
    broadcastAdminEvent('reports_updated', { reportId: id });
    res.json({ report: updated, stats });
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    res.json({ users: listAdmins() });
  });

  app.post('/api/admin/users', requireAdmin, (req, res) => {
    const username = String(req.body?.username ?? '');
    const password = String(req.body?.password ?? '');
    const fullName = String(req.body?.fullName ?? '');
    const role = String(req.body?.role ?? '') as AdminRole;

    if (!ADMIN_ROLES.includes(role)) {
      res.status(400).json({ error: 'Pilihan peran admin tidak valid.' });
      return;
    }

    const created = createAdminUser(username, password, fullName, role);
    if (!created.ok) {
      res.status(400).json({ error: (created as { ok: false; error: string }).error });
      return;
    }

    res.status(201).json({ user: created.user });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const result = deleteAdminUser(id);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const updated = updateSettings({
      dipsyImageUrl: req.body?.dipsyImageUrl,
      meadowImageUrl: req.body?.meadowImageUrl,
      tppkChairName: req.body?.tppkChairName,
      tppkPhone: req.body?.tppkPhone,
    });
    broadcastAdminEvent('settings_updated');
    res.json({ settings: updated });
  });

  // Google Spreadsheet Real-Time Database Endpoints
  app.get('/api/admin/sheets/config', requireAdmin, (_req, res) => {
    res.json({ config: getSheetDbConfig() });
  });

  app.patch('/api/admin/sheets/config', requireAdmin, (req, res) => {
    const autoSync = req.body?.autoSync;
    if (typeof autoSync !== 'boolean') {
      res.status(400).json({ error: 'Parameter autoSync tidak valid.' });
      return;
    }
    const config = updateSheetDbConfig({ autoSync });
    res.json({ config });
  });

  app.post('/api/admin/sheets/unlink', requireAdmin, (_req, res) => {
    const config = clearSheetDbConfig();
    res.json({ config });
  });

  app.post('/api/admin/sheets/inspect', requireAdmin, async (req, res) => {
    const googleToken = extractGoogleAccessToken(req);
    if (!googleToken) {
      res.status(401).json({ error: 'Silakan masuk dengan akun Google terlebih dahulu.' });
      return;
    }

    const parsed = extractSpreadsheetId(String(req.body?.urlOrId ?? ''));
    if (!parsed.ok) {
      res.status(400).json({ error: (parsed as { ok: false; error: string }).error });
      return;
    }

    try {
      const inspection = await inspectGoogleSpreadsheet(
        parsed.spreadsheetId,
        parsed.canonicalUrl,
        googleToken
      );
      res.json({ inspection });
    } catch (err) {
      if (err instanceof SheetsApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('Error inspecting Google Spreadsheet:', err);
      res.status(500).json({ error: 'Gagal memeriksa Google Spreadsheet.' });
    }
  });

  app.post('/api/admin/sheets/create', requireAdmin, async (req, res) => {
    const googleToken = extractGoogleAccessToken(req);
    if (!googleToken) {
      res.status(401).json({ error: 'Silakan masuk dengan akun Google terlebih dahulu.' });
      return;
    }

    const title = String(req.body?.title ?? 'Database DIPSI Tamantri - SDN Kotalama 3');
    const autoSync = req.body?.autoSync !== false;

    try {
      const created = await createNewGoogleSpreadsheet(title, googleToken);
      const reports = listAllReports();
      const stats = computeAdminStats(reports);
      const settings = getSettings();

      const result = await provisionGoogleSpreadsheetDatabase(
        created.spreadsheetId,
        googleToken,
        reports,
        stats,
        settings
      );

      const config = updateSheetDbConfig({
        linkedSpreadsheetId: created.spreadsheetId,
        linkedSpreadsheetUrl: created.spreadsheetUrl,
        linkedSpreadsheetTitle: result.spreadsheetTitle,
        autoSync,
        dbInitialized: true,
        lastSyncAt: result.lastSyncAt,
      });

      res.status(201).json({ config, result });
    } catch (err) {
      if (err instanceof SheetsApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('Error creating Google Spreadsheet database:', err);
      res.status(500).json({ error: 'Gagal membuat database Google Spreadsheet baru.' });
    }
  });

  app.post('/api/admin/sheets/provision', requireAdmin, async (req, res) => {
    const googleToken = extractGoogleAccessToken(req);
    if (!googleToken) {
      res.status(401).json({ error: 'Silakan masuk dengan akun Google terlebih dahulu.' });
      return;
    }

    const parsed = extractSpreadsheetId(String(req.body?.urlOrId ?? ''));
    if (!parsed.ok) {
      res.status(400).json({ error: (parsed as { ok: false; error: string }).error });
      return;
    }

    const autoSync = req.body?.autoSync !== false;

    try {
      const reports = listAllReports();
      const stats = computeAdminStats(reports);
      const settings = getSettings();

      const result = await provisionGoogleSpreadsheetDatabase(
        parsed.spreadsheetId,
        googleToken,
        reports,
        stats,
        settings
      );

      const config = updateSheetDbConfig({
        linkedSpreadsheetId: parsed.spreadsheetId,
        linkedSpreadsheetUrl: parsed.canonicalUrl,
        linkedSpreadsheetTitle: result.spreadsheetTitle,
        autoSync,
        dbInitialized: true,
        lastSyncAt: result.lastSyncAt,
      });

      res.json({ config, result });
    } catch (err) {
      if (err instanceof SheetsApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('Error provisioning Google Spreadsheet database:', err);
      res.status(500).json({ error: 'Gagal membuat struktur database di Google Spreadsheet.' });
    }
  });

  app.post('/api/admin/sheets/sync', requireAdmin, async (req, res) => {
    const googleToken = extractGoogleAccessToken(req);
    if (!googleToken) {
      res.status(401).json({ error: 'Silakan masuk dengan akun Google terlebih dahulu.' });
      return;
    }

    const currentConfig = getSheetDbConfig();
    if (!currentConfig.linkedSpreadsheetId) {
      res.status(400).json({ error: 'Belum ada Google Spreadsheet yang ditautkan.' });
      return;
    }

    const allowPullFromSheet = req.body?.allowPullFromSheet !== false;

    try {
      const result = await syncGoogleSpreadsheetRealtime({
        spreadsheetId: currentConfig.linkedSpreadsheetId,
        accessToken: googleToken,
        lastSyncAt: currentConfig.lastSyncAt,
        settings: getSettings(),
        listReports: listAllReports,
        computeStats: computeAdminStats,
        applyFollowUpUpdate: (id, status, note) => {
          updateReportProgress(id, status, note);
        },
        allowPullFromSheet,
      });

      const config = updateSheetDbConfig({
        linkedSpreadsheetTitle: result.spreadsheetTitle,
        dbInitialized: true,
        lastSyncAt: result.lastSyncAt,
      });

      const reports = listAllReports();
      const stats = computeAdminStats(reports);

      res.json({ config, result, reports, stats });
    } catch (err) {
      if (err instanceof SheetsApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('Error syncing Google Spreadsheet:', err);
      res.status(500).json({ error: 'Gagal menyinkronkan data dengan Google Spreadsheet.' });
    }
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DIPSI Tamantri server running at http://localhost:${PORT}`);
  });
}

startServer();
