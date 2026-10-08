import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
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

// 4. HTTP Reverse Proxy on public PORT (Fixes "forbidden host" & serves Web UI + API)
const proxyServer = http.createServer((clientReq, clientRes) => {
  if (clientReq.url === '/healthz') {
    clientRes.writeHead(200, { 'Content-Type': 'text/plain' });
    clientRes.end('ok');
    return;
  }

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
