import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || '17070';

console.log(`[Server] Starting bansos-router-snapdeploy on port ${PORT}...`);

// 1. Jalankan WhatsApp Bridge jika diaktifkan
if (process.env.WA_ENABLED === 'true') {
  console.log('[Server] Starting WhatsApp Bridge supervisor...');
  const startWA = () => {
    const wa = spawn(process.execPath, [path.join(__dirname, 'whatsapp.mjs')], {
      stdio: 'inherit',
      env: process.env
    });
    wa.on('exit', (code) => {
      console.log(`[Server] WhatsApp bridge exited with code ${code}. Restarting in 5s...`);
      setTimeout(startWA, 5000);
    });
  };
  startWA();
}

// 2. Jalankan Telegram Bridge jika token ada
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'disabled') {
  console.log('[Server] Starting Telegram Bridge...');
  const tg = spawn(process.execPath, [path.join(__dirname, 'telegram.mjs')], {
    stdio: 'inherit',
    env: process.env
  });
  tg.on('error', (err) => console.error('[TG Error]', err));
}

// 3. Jalankan Bansos Router utama
console.log(`[Server] Starting Bansos Router daemon on port ${PORT}...`);

function startBansos() {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const args = ['--yes', 'bansos-router@0.3.1', 'start', '--bind', '0.0.0.0', '--port', PORT, '--unsafe-allow-non-loopback'];

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
