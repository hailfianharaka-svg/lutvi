import { AdminStats, AppSettings, CounselingReport } from '../types';

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateId(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcelHtml(reports: CounselingReport[], settings: AppSettings) {
  const rows = reports
    .map(
      (r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.sessionCode)}</td>
        <td>${escapeHtml(formatDateId(r.createdAt))}</td>
        <td>${escapeHtml(r.reporterName)} (${escapeHtml(r.identityMode)})</td>
        <td>${escapeHtml(r.role)}</td>
        <td>Kelas ${r.grade}</td>
        <td>${r.age} Tahun</td>
        <td>${escapeHtml(r.mood)}</td>
        <td>${escapeHtml(r.detectedCategory)}</td>
        <td>${escapeHtml(r.psychologicalSummary)}</td>
        <td>${escapeHtml(r.followUpStatus)}</td>
        <td>${escapeHtml(r.tppkNote || '-')}</td>
      </tr>`
    )
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
          th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background-color: #166534; color: #ffffff; font-weight: bold; }
          .title { font-size: 14pt; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="12" class="title">REKAP HASIL CURHAT AMAN - DIPSI TAMANTRI (${escapeHtml(settings.schoolName)})</td></tr>
          <tr><td colspan="12">Ketua Tim TPPK: ${escapeHtml(settings.tppkChairName)} (HP/WA: ${escapeHtml(settings.tppkPhone)}) | Tanggal Ekspor: ${escapeHtml(formatDateId(new Date().toISOString()))}</td></tr>
          <tr>
            <th>No</th>
            <th>Kode Sesi</th>
            <th>Waktu</th>
            <th>Pelapor</th>
            <th>Peran</th>
            <th>Kelas</th>
            <th>Usia</th>
            <th>Suasana Hati</th>
            <th>Deteksi Kategori AI</th>
            <th>Ringkasan Psikologis</th>
            <th>Progress Tindak Lanjut</th>
            <th>Catatan TPPK</th>
          </tr>
          ${rows}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  triggerDownload(blob, `Rekap_DIPSI_Tamantri_${new Date().toISOString().slice(0, 10)}.xls`);
}

export function exportToWordDoc(
  reports: CounselingReport[],
  stats: AdminStats,
  settings: AppSettings
) {
  const reportBlocks = reports
    .map(
      (r, idx) => `
      <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; padding: 12px;">
        <p style="margin: 0 0 6px 0;"><strong>${idx + 1}. [${escapeHtml(r.sessionCode)}] ${escapeHtml(r.reporterName)}</strong> (${escapeHtml(r.identityMode)} · ${escapeHtml(r.role)} · Kelas ${r.grade} · ${r.age} Tahun)</p>
        <p style="margin: 0 0 6px 0;">Suasana Hati: <strong>${escapeHtml(r.mood)}</strong> | Kategori Deteksi: <strong>${escapeHtml(r.detectedCategory)}</strong> | Status: <strong>${escapeHtml(r.followUpStatus)}</strong></p>
        <p style="margin: 0 0 6px 0;"><em>Ringkasan Psikologis:</em> ${escapeHtml(r.psychologicalSummary)}</p>
        <p style="margin: 0 0 8px 0;"><em>Catatan TPPK:</em> ${escapeHtml(r.tppkNote || 'Belum ada catatan')}</p>
        <div style="background: #f8fafc; padding: 8px; border-top: 1px solid #e2e8f0;">
          <strong>Transkrip Percakapan:</strong>
          ${r.messages
            .map(
              (m) =>
                `<p style="margin: 4px 0;"><strong>${m.sender === 'dipsy' ? 'DIPSI' : escapeHtml(r.reporterName)}:</strong> ${escapeHtml(m.content)}</p>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
          h1 { color: #14532d; margin-bottom: 4px; font-size: 16pt; }
          .meta { color: #475569; margin-bottom: 14px; font-size: 10pt; }
          .summary-table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          .summary-table td, .summary-table th { border: 1px solid #94a3b8; padding: 6px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>LAPORAN DETEKSI PERUNDUNGAN SEJAK DINI — DIPSI TAMANTRI</h1>
        <div class="meta">
          ${escapeHtml(settings.schoolName)} | Ketua Tim TPPK: ${escapeHtml(settings.tppkChairName)} (HP/WA: ${escapeHtml(settings.tppkPhone)})<br/>
          Dicetak pada: ${escapeHtml(formatDateId(new Date().toISOString()))}
        </div>
        <table class="summary-table">
          <tr>
            <th>Total Sesi Curhat</th>
            <th>Terindikasi Perundungan/Risiko</th>
            <th>Diproses</th>
            <th>Selesai</th>
            <th>Butuh Bantuan Eksternal</th>
          </tr>
          <tr>
            <td>${stats.totalReports}</td>
            <td>${stats.bullyingDetectedCount}</td>
            <td>${stats.statusCounts['Diproses']}</td>
            <td>${stats.statusCounts['Selesai']}</td>
            <td>${stats.statusCounts['Butuh Bantuan Eksternal']}</td>
          </tr>
        </table>
        <h2>Rincian Transkrip & Tindak Lanjut</h2>
        ${reportBlocks}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, `Laporan_DIPSI_Tamantri_${new Date().toISOString().slice(0, 10)}.doc`);
}

export function printPdfReport() {
  window.print();
}
