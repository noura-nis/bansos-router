export const sessions = new Map();

const has = (t, terms) => terms.some(x => t.includes(x));

export function businessFAQ(input, jid) {
  const t = input.toLowerCase().trim();
  const now = Date.now();
  const old = sessions.get(jid);
  const s = old && (now - old.at < 30 * 60 * 1000) ? old : { topic: null, at: now };
  s.at = now;
  sessions.set(jid, s);

  // 1. SALAM & SAPAAN AWAL (Prioritas Tertinggi)
  if (/^(halo|hai|hallo|helo|hei|hi|pagi|siang|sore|malam|assalamualaikum|samlikum|permisi|tes|test|ping)\b/i.test(t) ||
      t === 'halo' || t === 'hai' || t === 'hallo' || t === 'hi' || t === 'menu') {
    s.topic = null;
    return {
      reply: 'Halo kak! Nadia dari CS resmi siap membantu untuk:\n1. 🥫 *Refill Gas Portable & Canister* (Banjarmasin, Palangka Raya, Balikpapan)\n2. 🎓 *Bimbingan Skripsi IT Noura Studio* (bersama Ir. Nor Anisa, M.Kom.)\n3. ☕ *Bit & Bean Coffee* (Kopi Siap Minum & Biji Sangrai)\n\nSilakan balas dengan angka *1*, *2*, atau *3*, atau tanyakan langsung kebutuhan kakak yaa 😊🙏',
      topic: null
    };
  }

  // 2. PILIHAN MENU ANGKA (1, 2, 3)
  if (/^(1|nomor 1|menu 1|pilihan 1|satu)$/i.test(t)) {
    s.topic = 'gas';
    return {
      reply: 'Siap kak! Kami melayani *Refill Gas Portable & Canister* seharga Rp 12.000 / botol (bawa kaleng sendiri).\n\nKami ada di 3 cabang:\n• *Banjarmasin* (The Green Rahayu 2)\n• *Palangka Raya* (Jl. Seth Adji No. 70)\n• *Balikpapan* (Lamaru)\n\nKakak butuh info alamat & Google Maps, jam buka, atau harga di kota mana kak? 😊',
      topic: 'gas'
    };
  }

  if (/^(2|nomor 2|menu 2|pilihan 2|dua)$/i.test(t)) {
    s.topic = 'skripsi';
    return {
      reply: 'Halo kak! Untuk *Bimbingan Skripsi IT Noura Studio*, kami melayani pendampingan edukatif (bukan joki) untuk konsultasi judul, Bab 1–5, coding aplikasi (Web/Mobile/AI), dan persiapan sidang bersama akademisi resmi: *Ir. Nor Anisa, S.Kom., M.Kom.* 🎓\n\nBoleh tahu kakak dari jurusan apa dan topik apa yang ingin dibahas kak? 😊',
      topic: 'skripsi'
    };
  }

  if (/^(3|nomor 3|menu 3|pilihan 3|tiga)$/i.test(t)) {
    s.topic = 'kopi';
    return {
      reply: 'Selamat datang di *Bit & Bean Coffee*! Kami menyediakan kopi susu aren siap minum (cup Rp 15k / botol 250ml Rp 18k / botol 1 Liter Rp 65k) dan biji kopi sangrai segar (Arabica Specialty, Robusta, House Blend).\n\nKakak ingin memesan kopi siap minum atau biji kopi sangrai kak? 😊☕',
      topic: 'kopi'
    };
  }

  // 3. UCAPAN TERIMA KASIH & KONFIRMASI
  if (/^(makasih|terima kasih|terimakasih|thanks|tq|ok|oke|baik|siap|sip|mantap|oke kak|makasih kak|siap kak)\b/i.test(t) ||
      t === 'ok' || t === 'oke' || t === 'siap' || t === 'makasih' || t === 'terima kasih') {
    return {
      reply: 'Sama-sama kak! Jika ada yang ingin ditanyakan lagi seputar Refill Gas, Bimbingan Skripsi, atau Kopi, silakan hubungi Nadia kapan saja yaa kak 😊🙏',
      topic: s.topic
    };
  }

  // 4. PENANGANAN KOTA CABANG SPESIFIK (JIKA USER MENYEBUT KOTA ATAU SAAT DALAM TOPIK GAS)
  const isPky = has(t, ['palangka', 'palangkaraya', 'seth adji', 'pky']);
  const isBpn = has(t, ['balikpapan', 'lamaru', 'mulawarman', 'bpn']);
  const isBjm = has(t, ['banjarmasin', 'bjm', 'green rahayu', 'simpang limau']);

  const branches = {
    pky: '*Cabang Palangka Raya*:\n📍 Toko Karya Perdana, Jl. Seth Adji No. 70 (samping H. Kadap), Palangka Raya.\n🗺️ Google Maps: https://maps.app.goo.gl/5mXcbhgjDztzZLe27\n⏰ Jam Buka:\n• Pagi: 07.00–11.00 WIB\n• Sore: 14.00–16.00 WIB\n📞 WA: 0812-5090-197\n🔥 Biaya refill Rp 12.000/botol & kaleng baru Rp 20.000. Ditunggu kedatangannya yaa kak! 😊',
    bpn: '*Cabang Balikpapan*:\n📍 Jl. Mulawarman RT 03 No. 16, Lamaru (dekat Masjid Nurul Iman), Balikpapan.\n🗺️ Google Maps: https://maps.app.goo.gl/gHZk2yU1qHqu3x1M6\n⏰ Jam Buka: Setiap hari 08.00–20.00 WITA.\n📞 WA: 0878-7246-2520\n🔥 Biaya refill Rp 12.000/botol (bawa kaleng sendiri). Silakan konfirmasi via WA sebelum meluncur ya kak 😊',
    bjm: '*Cabang Banjarmasin*:\n📍 Komplek The Green Rahayu 2 Blok A No. 15, Jl. Simpang Limau, Banjarmasin.\n🗺️ Google Maps: https://maps.app.goo.gl/XpGwbcBdSgavG6XA9\n⏰ Jam Buka:\n• Senin–Jumat: 17.00–21.00 WITA (5 sore - 9 malam)\n• Sabtu–Minggu: 08.00–21.00 WITA (8 pagi - 9 malam)\n📞 WA: 0851-5513-3070\n🔥 Biaya refill Rp 12.000/botol (bawa kaleng sendiri). Ditunggu mampirnya kak! 😊'
  };

  // Jika user hanya mengetik nama kota (misal: "palangka", "banjarmasin", "balikpapan")
  if (isPky || isBpn || isBjm) {
    s.topic = 'gas';
    const city = isPky ? 'pky' : (isBpn ? 'bpn' : 'bjm');
    return {
      reply: branches[city],
      topic: 'gas'
    };
  }

  // 5. REFILL GAS: LOKASI / ALAMAT / MAPS
  const isLocation = has(t, ['alamat', 'lokasi', 'dimana', 'di mana', 'maps', 'gmap', 'posisi', 'disamperin', 'samperin', 'ke toko', 'bisa datang']);
  if (isLocation) {
    s.topic = 'gas';
    return {
      reply: `Bisa banget kak! Untuk lokasi refill gas kami:\n\n${branches.bjm}\n\n(Tersedia juga cabang Palangka Raya & Balikpapan jika kakak di luar kota 😊)`,
      topic: 'gas'
    };
  }

  // 6. REFILL GAS: JAM BUKA / OPERASIONAL
  const isOpenHour = has(t, ['buka', 'tutup', 'jam berapa', 'operasional', 'jadwal']);
  if (isOpenHour) {
    s.topic = 'gas';
    return {
      reply: `Halo kak! Jam operasional cabang Banjarmasin:\n⏰ Senin–Jumat: 17.00–21.00 WITA\n⏰ Sabtu–Minggu: 08.00–21.00 WITA\n🗺️ Maps: https://maps.app.goo.gl/XpGwbcBdSgavG6XA9\n\n(Untuk Palangka Raya buka 07.00–11.00 & 14.00–16.00 WIB; Balikpapan buka setiap hari 08.00–20.00 WITA kak 😊)`,
      topic: 'gas'
    };
  }

  // 7. REFILL GAS: HARGA / BIAYA
  const isGasPrice = (has(t, ['harga', 'biaya', 'tarif', 'berapa']) && has(t, ['gas', 'refill', 'canister', 'kaleng', 'botol', 'isi ulang'])) ||
                     (s.topic === 'gas' && has(t, ['harga', 'biaya', 'tarif', 'berapa']));
  if (isGasPrice) {
    s.topic = 'gas';
    return {
      reply: 'Halo kak! Tarif isi ulang gas portable & canister kami:\n\n🔥 *Refill:* Rp 12.000 / botol (bawa kaleng sendiri yaa kak)\n🥫 *Kaleng Baru:* Rp 20.000 / kaleng (tersedia di Palangka Raya)\n\nPengisian aman, presisi timbangan, dan anti bocor. Tersedia di cabang Banjarmasin, Palangka Raya, dan Balikpapan kak 😊',
      topic: 'gas'
    };
  }

  // 8. PRINT DOKUMEN
  if (has(t, ['print', 'ngeprint', 'cetak', 'jilid'])) {
    return {
      reply: 'Halo kak! Tarif cetak/print dokumen di Noura Studio:\n\n📄 *Hitam Putih (BW):* Rp 400 / lembar\n📑 *Warna:* Rp 800 / lembar\n\nKertas HVS berkualitas. File bisa dikirim lewat WhatsApp atau email yaa kak 😊',
      topic: 'print'
    };
  }

  // 9. KOPI (BIT & BEAN)
  const isKopiReady = has(t, ['siap minum', 'kopi susu', 'aren', 'botol', '1 liter', 'liter', 'manual brew', 'cup', 'es kopi', 'dingin', 'americano']);
  const isKopiBeans = has(t, ['biji', 'sangrai', 'beans', 'roast', 'bubuk', 'giling', 'arabica', 'robusta']);
  const isKopiGeneral = has(t, ['kopi', 'coffee', 'roastery', 'bit & bean', 'bit and bean']);

  if (isKopiReady) {
    s.topic = 'kopi';
    return {
      reply: 'Siap kak! Menu *Kopi Siap Minum* di Bit & Bean Coffee:\n\n🥤 *Kopi Susu Aren Fresh Cup:* Rp 15.000 / cup\n🍼 *Kopi Susu Aren Botol 250ml:* Rp 18.000\n🍾 *Kopi Botol 1 Liter (Stok Kulkas):* Rp 65.000\n☕ *Manual Brew / Americano:* Rp 15.000\n\nMenggunakan espresso ramah lambung dan gula aren murni. Kakak ingin pesan varian yang mana dan berapa cup/botol kak? 😊☕',
      topic: 'kopi'
    };
  }

  if (isKopiBeans) {
    s.topic = 'kopi';
    return {
      reply: 'Siap kak! Pilihan *Fresh Roast Beans* Bit & Bean:\n\n🌱 *Arabica Specialty:* Rp 75.000 / 200g\n🌱 *Fine Robusta:* Rp 50.000 / 200g\n🌱 *House Blend:* Rp 60.000 / 200g\n\nTersedia biji utuh atau bubuk giling (halus/sedang/kasar). Kakak butuh yang mana kak? 😊☕',
      topic: 'kopi'
    };
  }

  if (isKopiGeneral) {
    s.topic = 'kopi';
    return {
      reply: 'Selamat datang di *Bit & Bean Coffee*! Kami menyediakan kopi susu aren siap minum dan biji kopi sangrai segar (Arabica & Robusta).\n\nKakak berminat menu kopi siap minum atau biji kopi sangrai kak? 😊☕',
      topic: 'kopi'
    };
  }

  // 10. SKRIPSI & IT (NOURA STUDIO)
  const isML = has(t, ['machine learning', 'deep learning', 'ai', 'data science', 'nlp', 'cnn', 'svm', 'prediksi', 'klasifikasi', 'python']);
  const isDev = has(t, ['web', 'laravel', 'flutter', 'android', 'mobile', 'iot', 'react', 'sistem informasi', 'aplikasi']);
  const isSkripsi = has(t, ['skripsi', 'tesis', 'tugas akhir', 'bimbingan', 'noura studio', 'judul', 'bab 1', 'bab 2', 'bab 3', 'bab 4', 'bab 5', 'sidang', 'sempro', 'turnitin', 'koding', 'coding']);

  if (isML) {
    s.topic = 'skripsi';
    return {
      reply: 'Wah mantap kak! Riset *Machine Learning / AI* adalah salah satu spesialisasi utama di *Noura Studio* 🎓\n\nKami siap mendampingi:\n✅ Penentuan judul, rumusan masalah & dataset\n✅ Preprocessing & coding Python (TensorFlow, PyTorch, Scikit-Learn)\n✅ Evaluasi model (akurasi, confusion matrix, precision/recall)\n✅ Penulisan laporan Bab 1–5 & cek Turnitin\n✅ Simulasi sidang skripsi langsung bersama: *Ir. Nor Anisa, S.Kom., M.Kom.*\n\nApakah saat ini sudah ada judul atau datasetnya kak? 😊',
      topic: 'skripsi'
    };
  }

  if (isDev) {
    s.topic = 'skripsi';
    return {
      reply: 'Siap kak! Untuk pembuatan aplikasi Web / Mobile / IoT, *Noura Studio* siap mendampingi penuh 🎓\n\nPendampingan mencakup perancangan sistem (UML/ERD), penulisan coding (Laravel, Flutter, React, Python), laporan Bab 1–5, hingga simulasi sidang bersama *Ir. Nor Anisa, S.Kom., M.Kom.*\n\nBoleh tahu apakah judulnya sudah disetujui kampus atau baru mau diajukan kak? 😊',
      topic: 'skripsi'
    };
  }

  if (isSkripsi) {
    s.topic = 'skripsi';
    return {
      reply: 'Halo kak! Untuk *Bimbingan Skripsi IT Noura Studio*, kami melayani pendampingan edukatif (bukan joki) untuk konsultasi judul, Bab 1–5, coding aplikasi, dan latihan persiapan sidang bersama akademisi resmi: *Ir. Nor Anisa, S.Kom., M.Kom.* 🎓\n\nBoleh tahu kakak dari jurusan apa dan topik/rencana judul yang ingin dibahas kak? 😊',
      topic: 'skripsi'
    };
  }

  // Jika input mengandung kata umum gas
  if (has(t, ['gas', 'refill', 'canister', 'kaleng', 'tabung'])) {
    s.topic = 'gas';
    return {
      reply: 'Kami melayani refill gas portable & canister di Banjarmasin, Palangka Raya, dan Balikpapan (Rp12.000/botol bawa kaleng sendiri).\n\nKakak butuh info alamat lokasi, jam buka, atau harga kak? 😊',
      topic: 'gas'
    };
  }

  return null;
}

export function getContextualFallback(jid) {
  const s = sessions.get(jid);
  const topic = s?.topic;
  if (topic === 'gas') {
    return 'Untuk isi ulang gas portable & canister kami buka di Banjarmasin (The Green Rahayu 2), Palangka Raya (Jl. Seth Adji), dan Balikpapan (Lamaru) seharga Rp 12.000 / botol.\n\nAda yang ingin ditanyakan terkait alamat Maps atau jam bukanya kak? 😊';
  }
  if (topic === 'kopi') {
    return 'Di Bit & Bean Coffee kami menyediakan Kopi Susu Aren siap minum (cup/botol) dan biji kopi sangrai segar (Arabica & Robusta).\n\nKakak berminat memesan yang mana kak? 😊☕';
  }
  if (topic === 'skripsi') {
    return 'Bimbingan Skripsi IT Noura Studio bersama Ir. Nor Anisa, S.Kom., M.Kom. mencakup konsultasi judul, Bab 1-5, coding Web/Mobile/AI, hingga persiapan sidang 🎓 Boleh diinfokan jurusan dan topik skripsi kakak? 😊';
  }
  return 'Halo kak! Nadia dari CS resmi siap membantu untuk Refill Gas Portable, Bimbingan Skripsi IT Noura Studio, dan Bit & Bean Coffee. Boleh diinfokan kebutuhan kakak agar langsung Nadia bantu yaa kak 😊🙏';
}

export const systemPrompt = `Anda adalah Nadia, customer service resmi berbahasa Indonesia untuk 3 unit usaha Ir. Nor Anisa, S.Kom., M.Kom. (+62 851-5513-3070).
Karakter: Ramah, santun, hangat, profesional, seperti admin WhatsApp asli.

DATA RESMI WAJIB:
1. REFILL GAS PORTABLE & CANISTER (Refill Rp 12.000 / kaleng bawa sendiri):
   - Banjarmasin: Komplek The Green Rahayu 2 Blok A No. 15, Jln. Simpang Limau. Buka Senin-Jumat 17.00 - 21.00 WITA | Sabtu-Minggu 08.00 - 21.00 WITA. Maps: https://maps.app.goo.gl/XpGwbcBdSgavG6XA9. WA: 0851-5513-3070.
   - Palangka Raya: Toko Karya Perdana, Jl. Seth Adji No. 70 (samping H. Kadap). Buka 07.00 - 11.00 & 14.00 - 16.00 WIB. Maps: https://maps.app.goo.gl/5mXcbhgjDztzZLe27. WA: 0812-5090-197. Ada kaleng baru Rp 20.000.
   - Balikpapan: Jln. Mulawarman RT 03 No. 16, Lamaru (dekat Masjid Nurul Iman). Buka 08.00 - 20.00 WITA. Maps: https://maps.app.goo.gl/gHZk2yU1qHqu3x1M6. WA: 0878-7246-2520.
   - Jika menanyakan lokasi/alamat, SELALU sertakan link Google Maps!
2. BIMBINGAN SKRIPSI IT (NOURA STUDIO): Bimbingan skripsi/tesis Informatika bersama Ir. Nor Anisa, S.Kom., M.Kom., coding Laravel/React/Python/AI, persiapan sidang, cek Turnitin, Print (BW 400/lbr, Warna 800/lbr). Dilarang pakai kata 'joki' (sistem edukatif).
3. BIT & BEAN COFFEE: Kopi susu aren cup Rp 15k, botol 250ml Rp 18k, 1 liter Rp 65k, manual brew Rp 15k, biji sangrai segar Arabica Rp 75k/200g, Robusta Rp 50k/200g, House Blend Rp 60k/200g.
4. PEMBAYARAN: QRIS Bit & Bean & Transfer Bank (BNI: 1048491406, SeaBank: 901187631820, BTN: 1001501017745 a.n. Nor Anisa).

ATURAN JAWABAN:
- Jawab dengan ramah, santun, dan natural (maksimal 2 sampai 4 kalimat).
- Langsung to the point menjawab inti pesan pelanggan.
- DILARANG KERAS membuat tag <think>, langsung berikan jawaban percakapan WhatsApp kepada pelanggan!`;
