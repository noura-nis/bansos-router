import { getSession, addMessage, resetSession, cleanResponse } from './nadia-session.mjs';
import { businessFAQ, getContextualFallback, systemPrompt } from './nadia-business.mjs';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enabled = process.env.WA_ENABLED === 'true';
if (!enabled) {
  console.log('[WA] Disabled. Set WA_ENABLED=true after configuring access.');
  process.exit(0);
}

const authDir = process.env.WA_AUTH_DIR || '/home/node/.wa_auth';
const baseURL = process.env.WA_AI_BASE_URL || ('http://127.0.0.1:' + (process.env.PORT || '17070') + '/v1');
const apiURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
const apiKey = process.env.WA_AI_API_KEY || '';
const configuredModel = (process.env.WA_MODEL || 'auto').trim();
let modelCache = { ids: [], expires: 0 };

const AUTH_SYNC_URL = process.env.WA_AUTH_SYNC_URL || 'https://nourastudio.co-id.id/sync_wa_auth.php';
const AUTH_SYNC_TOKEN = process.env.WA_AUTH_SYNC_TOKEN || 'noranisa_content_secret_2026';

// Helper status sync untuk web dashboard /wa
async function updateStatus(data) {
  try {
    const statusFile = path.join(__dirname, 'wa-status.json');
    await fs.writeFile(statusFile, JSON.stringify({
      ...data,
      phone: process.env.WA_PHONE_NUMBER || '6285155133070',
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch {}
}

// 1. AUTO-RESTORE SESI DARI CLOUD HOSTING (nourastudio.co-id.id)
async function restoreSessionFromCloud() {
  try {
    const credsPath = path.join(authDir, 'creds.json');
    try {
      const raw = await fs.readFile(credsPath, 'utf8');
      const creds = JSON.parse(raw);
      if (creds && creds.registered) {
        console.log('[WA Auth] Sesi lokal valid sudah ada di disk.');
        return true;
      }
    } catch {}

    console.log('[WA Auth] 🔄 Memeriksa backup sesi WhatsApp di Cloud Hosting (nourastudio.co-id.id)...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(`${AUTH_SYNC_URL}?token=${AUTH_SYNC_TOKEN}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'X-Token': AUTH_SYNC_TOKEN },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.ok) {
      const data = await res.json();
      if (data && data.files && data.files['creds.json']) {
        let creds = null;
        try {
          creds = JSON.parse(Buffer.from(data.files['creds.json'], 'base64').toString('utf8'));
        } catch {}

        if (!creds || !creds.registered) {
          console.log('[WA Auth] Sesi di Cloud Hosting belum registered. Melewati restore agar direktori auth bersih.');
          return false;
        }

        await fs.mkdir(authDir, { recursive: true });
        let count = 0;
        for (const [fname, b64] of Object.entries(data.files)) {
          // JANGAN restore file session-*.json yang sudah kadaluarsa (penyebab MessageCounterError)
          if (fname.startsWith('session-')) continue;
          if (fname.endsWith('.json')) {
            await fs.writeFile(path.join(authDir, fname), Buffer.from(b64, 'base64'));
            count++;
          }
        }
        console.log(`[WA Auth] ✅ Berhasil restore ${count} file sesi valid dari Cloud Hosting!`);
        return true;
      }
    }
  } catch (e) {
    console.warn('[WA Auth] Belum ada backup sesi terdaftar di Cloud:', e.message);
  }
  return false;
}

// 2. AUTO-BACKUP SESI KE CLOUD HOSTING (nourastudio.co-id.id)
let backupDebounce = null;
function backupSessionToCloud() {
  clearTimeout(backupDebounce);
  backupDebounce = setTimeout(async () => {
    try {
      const credsPath = path.join(authDir, 'creds.json');
      let creds = null;
      try {
        const raw = await fs.readFile(credsPath, 'utf8');
        creds = JSON.parse(raw);
        if (!creds || !creds.registered) {
          console.log('[WA Auth] Sesi belum registered, melewati backup ke Cloud.');
          return;
        }
      } catch {
        return;
      }

      const fileList = await fs.readdir(authDir);
      const files = {};
      for (const fname of fileList) {
        // Jangan simpan file session-*.json ke backup cloud agar backup tetap ramping & bebas dari MessageCounterError
        if (fname.startsWith('session-')) continue;
        if (fname.endsWith('.json')) {
          const full = path.join(authDir, fname);
          const buf = await fs.readFile(full);
          files[fname] = buf.toString('base64');
        }
      }

      console.log(`[WA Auth] 💾 Menyimpan ${Object.keys(files).length} file sesi ke nourastudio.co-id.id...`);
      await fetch(AUTH_SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'X-Token': AUTH_SYNC_TOKEN
        },
        body: JSON.stringify({ token: AUTH_SYNC_TOKEN, files })
      });
      console.log('[WA Auth] ✅ Sesi WhatsApp berhasil disimpan PERMANEN di Cloud Hosting!');
    } catch (e) {
      console.warn('[WA Auth] Gagal backup sesi ke Cloud:', e.message);
    }
  }, 4000);
}

async function chooseModels() {
  if (configuredModel && configuredModel.toLowerCase() !== 'auto' && !configuredModel.startsWith('ID model')) {
    return [configuredModel];
  }
  if (Date.now() < modelCache.expires && modelCache.ids.length > 0) return modelCache.ids;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let response;
    try {
      response = await fetch(apiURL + '/models', {
        headers: apiKey ? { Authorization: 'Bearer ' + apiKey } : {},
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error('Models HTTP ' + response.status);
    const data = await response.json();
    let ids = [...new Set((Array.isArray(data.data) ? data.data : []).map(m => m?.id).filter(id => typeof id === 'string' && id.length < 200))];

    // Filter out models known to return 400
    ids = ids.filter(id => !id.includes('ling-3.0'));

    // Prioritize fast, reliable models
    const priority = ['mimo', 'nemotron', 'deepseek', 'codestral', 'fast', 'default'];
    ids.sort((a, b) => {
      const pa = priority.findIndex(p => a.toLowerCase().includes(p));
      const pb = priority.findIndex(p => b.toLowerCase().includes(p));
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });

    modelCache = { ids, expires: Date.now() + (ids.length ? 10 * 60_000 : 60_000) };
    console.log('[WA] Auto model catalog:', ids.length, 'model IDs cached');
    return ids;
  } catch (error) {
    console.warn('[WA] Auto model lookup unavailable:', error.message);
    modelCache.expires = Date.now() + 60_000;
    return modelCache.ids;
  }
}

const localFAQ = new Map([
  ['halo', 'Halo! Ada yang bisa saya bantu?'],
  ['hai', 'Halo! Ada yang bisa saya bantu?'],
  ['menu', 'Silakan balas angka 1 (Refill Gas), 2 (Bimbingan Skripsi IT Noura Studio), atau 3 (Bit & Bean Coffee) yaa kak.']
]);

const logger = pino({ level: 'silent' });
const messageSeen = new Map();
const userLast = new Map();
let globalRequests = [];
let reconnectCount = 0;
let socket = null;
let reconnectTimer = null;
const botSentIds = new Set();

const minUserInterval = Math.max(500, Number(process.env.WA_USER_COOLDOWN_MS || 1000));
const maxPerMinute = Math.min(60, Math.max(1, Number(process.env.WA_AI_MAX_PER_MINUTE || 30)));

function cleanup(now) {
  for (const [id, when] of messageSeen) if (now - when > 10 * 60_000) messageSeen.delete(id);
  globalRequests = globalRequests.filter(t => now - t < 60_000);
  for (const [id, when] of userLast) if (now - when > 60 * 60_000) userLast.delete(id);
  if (botSentIds.size > 2000) botSentIds.clear();
}

async function answerAI(text, jid) {
  const models = await chooseModels();
  for (let attempt = 0; attempt < Math.min(models.length, 3); attempt++) {
    const selectedModel = models[attempt];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      let response;
      try {
        response = await fetch(apiURL + '/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}) },
          body: JSON.stringify({
            model: selectedModel,
            stream: false,
            max_tokens: 800,
            messages: [
              { role: 'system', content: process.env.WA_SYSTEM_PROMPT || systemPrompt },
              ...getSession(jid).history.slice(-6),
              { role: 'user', content: text }
            ]
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }
      if (response.ok) {
        const data = await response.json();
        const rawContent = String(data.choices?.[0]?.message?.content || '');
        const answer = cleanResponse(rawContent).slice(0, 3500);
        if (answer) return answer;
      }
      console.warn('[WA] Model fallback:', selectedModel, 'status', response?.status);
    } catch (err) {
      console.warn('[WA] AI attempt error:', err.message);
    }
  }
  return getContextualFallback(jid);
}

async function start() {
  if (socket) {
    try {
      socket.ev?.removeAllListeners();
      socket.ws?.close();
    } catch {}
    socket = null;
  }

  // 1. Cek sesi lokal vs cloud
  let hasValidSession = false;
  try {
    const credsPath = path.join(authDir, 'creds.json');
    const raw = await fs.readFile(credsPath, 'utf8');
    const creds = JSON.parse(raw);
    if (creds && creds.registered) hasValidSession = true;
  } catch {}

  if (!hasValidSession) {
    hasValidSession = await restoreSessionFromCloud();
  }

  // Jika belum ada sesi valid yang terdaftar, bersihkan authDir agar pairing baru tidak crash
  if (!hasValidSession) {
    console.log('[WA Auth] Membersihkan direktori auth untuk request pairing code bersih...');
    try {
      await fs.rm(authDir, { recursive: true, force: true });
    } catch {}
    await updateStatus({ status: 'initializing' });
  }

  await fs.mkdir(authDir, { recursive: true });

  // Hapus file session-*.json kadaluarsa agar libsignal selalu membuat ratchet session yang sinkron (mencegah MessageCounterError)
  try {
    const localFiles = await fs.readdir(authDir);
    for (const f of localFiles) {
      if (f.startsWith('session-')) {
        await fs.unlink(path.join(authDir, f)).catch(() => {});
      }
    }
  } catch {}

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  
  socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    fireInitQueries: false,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });

  socket.ev.on('creds.update', async () => {
    await saveCreds();
    if (state.creds?.registered) {
      backupSessionToCloud();
    }
  });

  const phone = String(process.env.WA_PHONE_NUMBER || '').replace(/[^0-9]/g, '');
  if (!state.creds?.registered && phone) {
    setTimeout(async () => {
      try {
        const rawCode = await socket.requestPairingCode(phone);
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
        console.log('\n============================================================');
        console.log(`[WA] 🔥 KODE PAIRING WHATSAPP: ${code}`);
        console.log(`[WA] Buka WhatsApp di HP (${phone}) -> Perangkat Tertaut -> Tautkan dengan nomor telepon`);
        console.log(`[WA] Masukkan kode pairing di atas!`);
        console.log('============================================================\n');
        await updateStatus({ status: 'pairing', code });
      } catch (err) {
        console.warn('[WA] Request pairing code gagal:', err.message);
      }
    }, 3000);
  }

  socket.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) console.log('[WA] QR pairing tersedia.');
    if (connection === 'open') {
      reconnectCount = 0;
      console.log('\n============================================================');
      console.log('[WA] 🎉 WHATSAPP BERHASIL TERHUBUNG & SIAP MENERIMA PESAN!');
      console.log('============================================================\n');
      await updateStatus({ status: 'connected' });
      backupSessionToCloud();
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.error('[WA] Sesi WhatsApp logged out (401). Membersihkan sesi lokal...');
        try {
          await fs.rm(authDir, { recursive: true, force: true });
        } catch {}
        await updateStatus({ status: 'logged_out' });
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(start, 3000);
        return;
      }
      reconnectCount++;
      const backoff = Math.min(60000, 3000 * Math.pow(2, Math.min(reconnectCount, 4)));
      console.warn('[WA] Koneksi terputus (' + reason + '); menghubungkan kembali dalam ' + backoff + 'ms...');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(start, backoff);
    }
  });

function extractMessageText(msg) {
  let m = msg.message;
  if (!m) return '';
  if (m.deviceSentMessage?.message) m = m.deviceSentMessage.message;
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
  if (m.editedMessage?.message) m = m.editedMessage.message;

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  ).trim();
}

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages || []) {
      try {
        const jid = msg.key?.remoteJid || '';
        if (!jid) continue;

        // Skip status broadcast & newsletter channels
        if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) continue;

        // Jangan balas pesan yang dikirim oleh bot sendiri
        if (msg.key?.id && botSentIds.has(msg.key.id)) continue;

        const rawText = extractMessageText(msg);
        if (!rawText) continue;
        const safeText = rawText.slice(0, 1500);

        const myPhone = String(process.env.WA_PHONE_NUMBER || '').replace(/[^0-9]/g, '');
        const myJidNum = socket.user?.id ? socket.user.id.split('@')[0].split(':')[0] : myPhone;
        const myLidNum = socket.user?.lid ? socket.user.lid.split('@')[0].split(':')[0] : '';
        const jidNum = jid.split('@')[0].split(':')[0];

        // Self-chat: jika user chatting ke nomor sendiri, atau di chat @lid pribadi (Message Yourself / tes bot)
        const isSelfChat = Boolean(
          jid.endsWith('@lid') ||
          (myPhone && jidNum === myPhone) ||
          (myJidNum && jidNum === myJidNum) ||
          (myLidNum && jidNum === myLidNum)
        );

        // Jika fromMe tapi bukan chat ke diri sendiri (misal owner chat manual ke kontak lain di HP), jangan nimbrung
        if (msg.key?.fromMe && !isSelfChat) continue;

        const id = jid + ':' + (msg.key?.id || '');
        const now = Date.now();
        cleanup(now);
        if (!msg.key?.id || messageSeen.has(id)) continue;
        messageSeen.set(id, now);

        console.log(`[WA Chat] Pesan diterima dari ${jid} (fromMe=${Boolean(msg.key?.fromMe)}): "${safeText}"`);

        // Selalu kirim balasan ke pengirim asli (baik JID nomor HP maupun Privacy LID)
        const targetJid = jid;

        // Handler perintah reset
        if (/^\/(reset|hapus|mulaiulang)$/i.test(safeText)) {
          resetSession(jid);
          const sent = await socket.sendMessage(targetJid, { text: 'Riwayat percakapan Nadia sudah direset, kak.' }, { quoted: msg });
          if (sent?.key?.id) botSentIds.add(sent.key.id);
          continue;
        }

        // Handler QRIS
        if (/^(\/qris|qris|qr code|barcode pembayaran|bayar qris)$/i.test(safeText) || /(?:minta|kirim|lihat|mau|bayar).*qris/i.test(safeText)) {
          const qrURL = process.env.WA_QRIS_IMAGE_URL || 'https://raw.githubusercontent.com/NourAnisa/bansos-router-snapdeploy/main/qris_bit_bean.png';
          try {
            const sent = await socket.sendMessage(targetJid, {
              image: { url: qrURL },
              caption: 'QRIS Bit & Bean (NMID: ID1025428743757). Setelah membayar, kirim bukti transfer/pembayaran agar admin dapat memverifikasi yaa kak 😊'
            }, { quoted: msg });
            if (sent?.key?.id) botSentIds.add(sent.key.id);
          } catch (err) {
            console.warn('[WA] QRIS image failed:', err.message);
            const sent = await socket.sendMessage(targetJid, {
              text: 'QRIS Bit & Bean: ' + qrURL + '\nSilakan kirim bukti pembayaran kepada admin yaa kak.'
            }, { quoted: msg });
            if (sent?.key?.id) botSentIds.add(sent.key.id);
          }
          continue;
        }

        // Handler Rekening
        if (/^\/rekening$|\b(rekening|norek|nomor rekening|transfer bank)\b/i.test(safeText)) {
          const sent = await socket.sendMessage(targetJid, {
            text: 'Pembayaran transfer bank untuk tiga unit usaha:\n- BNI: 1048491406\n- SeaBank: 901187631820\n- BTN: 1001501017745\na.n. Nor Anisa.\n\nHarap kirimkan bukti transfer ke sini untuk konfirmasi admin ya kak 😊'
          }, { quoted: msg });
          if (sent?.key?.id) botSentIds.add(sent.key.id);
          continue;
        }

        const business = businessFAQ(safeText, jid);
        const faq = business?.reply || localFAQ.get(safeText.toLowerCase());
        let reply = faq;

        if (!reply) {
          if (now - (userLast.get(jid) || 0) < minUserInterval) {
            console.log(`[WA] Cooldown singkat untuk ${jid}`);
            continue;
          }
          if (globalRequests.length >= maxPerMinute) {
            reply = 'Pesan sedang ramai. Silakan tunggu sebentar dan kirim kembali nanti yaa kak.';
          } else {
            userLast.set(jid, now);
            globalRequests.push(now);
            reply = await answerAI(safeText, jid);
          }
        }

        if (reply) {
          addMessage(jid, 'user', safeText);
          addMessage(jid, 'assistant', reply);
          console.log(`[WA Chat] Balasan dikirim ke ${targetJid}: "${reply.slice(0, 60)}..."`);
          const sent = await socket.sendMessage(targetJid, { text: reply }, { quoted: msg });
          if (sent?.key?.id) botSentIds.add(sent.key.id);
        }
      } catch (err) {
        console.warn('[WA] Message handler error:', err.message);
      }
    }
  });
}

start().catch(err => {
  console.error('[WA] Startup failed:', err.message);
  process.exitCode = 1;
});
