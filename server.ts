import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  appendConversationTurn,
  authenticateAdmin,
  createAdminUser,
  createCounselingSession,
  deleteAdminUser,
  getAdminByToken,
  getReportById,
  getSettings,
  listAdmins,
  listAllReports,
  revokeAdminToken,
  updateReportProgress,
  updateSettings,
} from './server/db';
import { analyzeAndRespondTurn, generateOpeningPrompt } from './server/ai';
import { computeAdminStats, validateProfileInput } from './src/utils/counselingLogic';
import { ADMIN_ROLES, AdminRole, FOLLOW_UP_STATUSES, FollowUpStatus } from './src/types';

const PORT = 3000;

function extractToken(req: Request): string {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
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
    res.json({ settings: updated });
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
