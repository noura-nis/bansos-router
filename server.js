import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || '17070';

console.log(`[Server] Starting bansos-router-snapdeploy on port ${PORT}...`);

// 1. Jalankan WhatsApp Bridge jika diaktifkan
if (process.env.WA_ENABLED === 'true') {
  console.log('[Server] Starting WhatsApp Bridge...');
  const wa = spawn('node', [path.join(__dirname, 'whatsapp.mjs')], {
    stdio: 'inherit',
    env: process.env
  });
  wa.on('error', (err) => console.error('[WA Error]', err));
}

// 2. Jalankan Telegram Bridge jika token ada
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log('[Server] Starting Telegram Bridge...');
  const tg = spawn('node', [path.join(__dirname, 'telegram.mjs')], {
    stdio: 'inherit',
    env: process.env
  });
  tg.on('error', (err) => console.error('[TG Error]', err));
}

// 3. Jalankan Bansos Router utama
console.log(`[Server] Starting Bansos Router daemon on port ${PORT}...`);
// Cek apakah perintah 'bansos' sudah ada global, jika belum gunakan npx
const bansosCmd = 'bansos';
const bansosArgs = ['start', '--bind', '0.0.0.0', '--port', PORT, '--unsafe-allow-non-loopback'];

const bansos = spawn(bansosCmd, bansosArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

bansos.on('error', (err) => {
  console.warn('[Server] Direct bansos failed, falling back to npx bansos-router...', err.message);
  const fallback = spawn('npx', ['--yes', 'bansos-router@0.3.1', 'start', '--bind', '0.0.0.0', '--port', PORT, '--unsafe-allow-non-loopback'], {
    stdio: 'inherit',
    env: process.env,
    shell: true
  });
  fallback.on('exit', (code) => process.exit(code || 0));
});

bansos.on('exit', (code) => {
  console.log(`[Bansos] Process exited with code ${code}`);
  process.exit(code || 0);
});
