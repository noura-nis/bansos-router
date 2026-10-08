import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 10000);
const BANSOS_PORT = 17070;

console.log(`[Server] Starting bansos-router on public port ${PORT}, internal bansosd on ${BANSOS_PORT}...`);

// 1. WhatsApp Bridge Supervisor
if (process.env.WA_ENABLED === 'true') {
  console.log('[Server] Starting WhatsApp Bridge supervisor...');
  const startWA = () => {
    const wa = spawn(process.execPath, [path.join(__dirname, 'whatsapp.mjs')], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(BANSOS_PORT),
        WA_AI_BASE_URL: `http://127.0.0.1:${BANSOS_PORT}/v1`
      }
    });
    wa.on('exit', (code) => {
      console.log(`[Server] WhatsApp bridge exited with code ${code}. Restarting in 5s...`);
      setTimeout(startWA, 5000);
    });
  };
  startWA();
}

// 2. Telegram Bridge jika ada token valid
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'disabled') {
  console.log('[Server] Starting Telegram Bridge...');
  const tg = spawn(process.execPath, [path.join(__dirname, 'telegram.mjs')], {
    stdio: 'inherit',
    env: process.env
  });
  tg.on('error', (err) => console.error('[TG Error]', err));
}

// 3. Bansos Router Daemon (Internal port 17070)
function startBansos() {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'bansos';
  const args = isWin
    ? ['--yes', 'bansos-router@0.3.1', 'start', '--bind', '127.0.0.1', '--port', String(BANSOS_PORT), '--unsafe-allow-non-loopback']
    : ['start', '--bind', '127.0.0.1', '--port', String(BANSOS_PORT), '--unsafe-allow-non-loopback'];

  const bansos = spawn(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: isWin
  });

  bansos.on('error', (err) => {
    console.error('[Server] Failed to launch bansos-router:', err.message);
  });

  bansos.on('exit', (code) => {
    console.log(`[Server] Bansos router exited with code ${code}. Restarting in 3s...`);
    setTimeout(startBansos, 3000);
  });
}
startBansos();

// 4. HTTP Reverse Proxy on public PORT (Fixes "forbidden host", serves Web UI, API, and WA Pairing Dashboard)
const proxyServer = http.createServer(async (clientReq, clientRes) => {
  if (clientReq.url === '/healthz') {
    clientRes.writeHead(200, { 'Content-Type': 'text/plain' });
    clientRes.end('ok');
    return;
  }

  // Route JSON status WhatsApp
  if (clientReq.url === '/wa-status') {
    try {
      const statusFile = path.join(__dirname, 'wa-status.json');
      const data = await fs.promises.readFile(statusFile, 'utf8');
      clientRes.writeHead(200, { 'Content-Type': 'application/json' });
      clientRes.end(data);
      return;
    } catch {
      clientRes.writeHead(200, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ status: 'initializing' }));
      return;
    }
  }

  // Dashboard status & live pairing code WhatsApp
  if (clientReq.url === '/wa' || clientReq.url === '/wa/') {
    try {
      const statusFile = path.join(__dirname, 'wa-status.json');
      let st = { status: 'initializing' };
      try {
        st = JSON.parse(await fs.promises.readFile(statusFile, 'utf8'));
      } catch {}

      clientRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      clientRes.end(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>WhatsApp Bot Status - Nadia CS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="5">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #1e293b; border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #38bdf8; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .badge-success { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid #22c55e; }
    .badge-warning { background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid #f59e0b; }
    .code-box { background: #020617; border: 2px dashed #38bdf8; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .code-title { font-size: 13px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .pairing-code { font-size: 38px; font-weight: 800; letter-spacing: 6px; color: #4ade80; font-family: monospace; }
    .steps { text-align: left; background: #0f172a; border-radius: 12px; padding: 16px 20px; margin-top: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.8; }
    .steps ol { padding-left: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>WhatsApp Bot CS Nadia</h1>
    <p>Refill Gas • Noura Studio IT • Bit & Bean Coffee</p>
    
    ${st.status === 'connected' ? `
      <div class="badge badge-success">● TERHUBUNG & AKTIF 24/7</div>
      <p style="color:#f8fafc; font-weight:600; margin-bottom: 12px;">Nomor: ${st.phone || '0851-5513-3070'}</p>
      <p>Bot Nadia saat ini aktif melayani chat pelanggan 24 jam nonstop di cloud Render Singapura.</p>
    ` : ''}

    ${st.status === 'pairing' ? `
      <div class="badge badge-warning">● MENUNGGU PAIRING WHATSAPP</div>
      <div class="code-box">
        <div class="code-title">KODE PAIRING WHATSAPP</div>
        <div class="pairing-code">${st.code || '...'}</div>
      </div>
      <div class="steps">
        <b>Cara Menghubungkan di HP:</b>
        <ol>
          <li>Buka WhatsApp di HP nomor <b>${st.phone || '0851-5513-3070'}</b></li>
          <li>Ketuk <b>Titik Tiga (⋮)</b> atau <b>Pengaturan</b></li>
          <li>Pilih <b>Perangkat Tertaut</b></li>
          <li>Pilih <b>Tautkan dengan nomor telepon saja</b></li>
          <li>Masukkan kode 8 karakter di atas</li>
        </ol>
      </div>
      <p class="footer">Halaman refresh otomatis tiap 5 detik.</p>
    ` : ''}

    ${st.status !== 'connected' && st.status !== 'pairing' ? `
      <div class="badge badge-warning">● MEMULAI SISTEM...</div>
      <p>Sedang menghubungkan ke server WhatsApp. Tunggu beberapa detik...</p>
      <p class="footer">Halaman refresh otomatis tiap 5 detik.</p>
    ` : ''}
  </div>
</body>
</html>`);
      return;
    } catch (e) {
      clientRes.writeHead(500, { 'Content-Type': 'text/plain' });
      clientRes.end('Error loading status: ' + e.message);
      return;
    }
  }

  // Reverse proxy ke bansos router 17070
  const options = {
    hostname: '127.0.0.1',
    port: BANSOS_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `127.0.0.1:${BANSOS_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', () => {
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ error: { message: 'Bansos router initializing, please retry in 5s...' } }));
  });

  clientReq.pipe(proxyReq, { end: true });
});

proxyServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Public proxy listening on http://0.0.0.0:${PORT}`);
});
