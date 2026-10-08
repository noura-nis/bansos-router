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
    s.topic = null; // Reset topik agar tidak terkunci
    return {
      reply: 'Halo kak! Nadia dari CS resmi siap membantu untuk:\n1. 🥫 *Refill Gas Portable & Canister* (Banjarmasin, Palangka Raya, Balikpapan)\n2. 🎓 *Bimbingan Skripsi IT Noura Studio* (bersama Ir. Nor Anisa, M.Kom.)\n3. ☕ *Bit & Bean Coffee* (Kopi Siap Minum & Biji Sangrai)\n\nBoleh diinfokan kebutuhan kakak agar langsung Nadia bantu yaa kak 😊🙏',
      topic: null
    };
  }

  // 2. UCAPAN TERIMA KASIH & KONFIRMASI
  if (/^(makasih|terima kasih|terimakasih|thanks|tq|ok|oke|baik|siap|sip|mantap|oke kak|makasih kak)\b/i.test(t) ||
      t === 'ok' || t === 'oke' || t === 'siap' || t === 'makasih' || t === 'terima kasih') {
    return {
      reply: 'Sama-sama kak! Jika ada yang ingin ditanyakan lagi seputar Refill Gas, Bimbingan Skripsi, atau Kopi, silakan kabari yaa kak 😊🙏',
      topic: s.topic
    };
  }

  // Identifikasi Kota
  const isPky = has(t, ['palangka', 'palangkaraya', 'seth adji', 'pky']);
  const isBpn = has(t, ['balikpapan', 'lamaru', 'mulawarman', 'bpn']);
  const city = isPky ? 'pky' : (isBpn ? 'bpn' : 'bjm');

  const branches = {
    pky: '*Cabang Palangka Raya*:\n📍 Toko Karya Perdana, Jl. Seth Adji No. 70 (samping H. Kadap), Palangka Raya.\n🗺️ Google Maps: https://maps.app.goo.gl/5mXcbhgjDztzZLe27\n⏰ Jam Buka: Pagi 07.00–11.00 WIB | Sore 14.00–16.00 WIB.\n📞 WA: 0812-5090-197\n🔥 Refill Rp12.000 & kaleng baru Rp20.000.',
    bpn: '*Cabang Balikpapan*:\n📍 Jl. Mulawarman RT 03 No. 16, Lamaru (dekat Masjid Nurul Iman), Balikpapan.\n🗺️ Google Maps: https://maps.app.goo.gl/gHZk2yU1qHqu3x1M6\n⏰ Jam Buka: Setiap hari 08.00–20.00 WITA.\n📞 WA: 0878-7246-2520\n🔥 Refill Rp12.000/botol (bawa kaleng sendiri).',
    bjm: '*Cabang Banjarmasin*:\n📍 Komplek The Green Rahayu 2 Blok A No. 15, Jl. Simpang Limau, Banjarmasin.\n🗺️ Google Maps: https://maps.app.goo.gl/XpGwbcBdSgavG6XA9\n⏰ Jam Buka: Senin–Jumat 17.00–21.00 WITA | Sabtu–Minggu 08.00–21.00 WITA.\n📞 WA: 0851-5513-3070\n🔥 Refill Rp12.000/botol (bawa kaleng sendiri).'
  };

  // 3. REFILL GAS: LOKASI / ALAMAT / MAPS
  const isLocation = has(t, ['alamat', 'lokasi', 'dimana', 'di mana', 'maps', 'gmap', 'posisi', 'disamperin', 'samperin', 'ke toko', 'bisa datang']);
  if (isLocation) {
    s.topic = 'gas';
    return {
      reply: `Bisa banget kak! Silakan merapat ke ${branches[city]}\n\nDitunggu kedatangannya yaa kak! 😊`,
      topic: 'gas'
    };
  }

  // 4. REFILL GAS: JAM BUKA / OPERASIONAL
  const isOpenHour = has(t, ['buka', 'tutup', 'jam berapa', 'operasional', 'jadwal']);
  if (isOpenHour) {
    s.topic = 'gas';
    return {
      reply: `Halo kak! Untuk jam operasional dan lokasi kami:\n\n${branches[city]}`,
      topic: 'gas'
    };
  }

  // 5. REFILL GAS: HARGA / BIAYA
  const isGasPrice = (has(t, ['harga', 'biaya', 'tarif', 'berapa']) && has(t, ['gas', 'refill', 'canister', 'kaleng', 'botol', 'isi ulang'])) ||
                     (s.topic === 'gas' && has(t, ['harga', 'biaya', 'tarif', 'berapa']));
  if (isGasPrice) {
    s.topic = 'gas';
    return {
      reply: 'Halo kak! Untuk tarif isi ulang gas portable & canister:\n\n🔥 *Refill:* Rp 12.000 / botol (bawa kaleng sendiri yaa kak)\n🥫 *Kaleng Baru:* Rp 20.000 / kaleng (tersedia di Palangka Raya)\n\nPengisian aman, presisi timbangan, dan anti bocor. Tersedia di Banjarmasin, Palangka Raya, dan Balikpapan kak 😊',
      topic: 'gas'
    };
  }

  // 6. PRINT DOKUMEN
  if (has(t, ['print', 'ngeprint', 'cetak', 'jilid'])) {
    return {
      reply: 'Halo kak! Tarif cetak/print dokumen di tempat kami:\n\n📄 *Hitam Putih (BW):* Rp 400 / lembar\n📑 *Warna:* Rp 800 / lembar\n\nKertas HVS berkualitas. File bisa dikirim lewat WhatsApp atau email yaa kak 😊',
      topic: 'print'
    };
  }

  // 7. KOPI (BIT & BEAN)
  const isKopiReady = has(t, ['siap minum', 'kopi susu', 'aren', 'botol', '1 liter', 'liter', 'manual brew', 'cup', 'es kopi', 'dingin', 'americano']);
  const isKopiBeans = has(t, ['biji', 'sangrai', 'beans', 'roast', 'bubuk', 'giling', 'arabica', 'robusta']);
  const isKopiGeneral = has(t, ['kopi', 'coffee', 'roastery', 'bit & bean', 'bit and bean']);

  if (isKopiReady) {
    s.topic = 'kopi';
    return {
      reply: 'Siap kak! Untuk menu *Kopi Siap Minum* di Bit & Bean Coffee:\n\n🥤 *Kopi Susu Aren Fresh Cup:* Rp 15.000 / cup\n🍼 *Kopi Susu Aren Botol 250ml:* Rp 18.000\n🍾 *Kopi Botol 1 Liter (Stok Kulkas):* Rp 65.000\n☕ *Manual Brew / Americano:* Rp 15.000\n\nMenggunakan espresso ramah lambung dan gula aren murni. Kakak ingin pesan berapa cup/botol kak? 😊☕',
      topic: 'kopi'
    };
  }

  if (isKopiBeans) {
    s.topic = 'kopi';
    return {
      reply: 'Siap kak! Pilihan *Fresh Roast Beans (Biji Sangrai)* Bit & Bean:\n\n🌱 *Arabica Specialty:* Rp 75.000 / 200g\n🌱 *Fine Robusta:* Rp 50.000 / 200g\n🌱 *House Blend:* Rp 60.000 / 200g\n\nTersedia dalam bentuk biji utuh atau digiling (halus/sedang/kasar). Kakak butuh yang mana kak? 😊☕',
      topic: 'kopi'
    };
  }

  if (isKopiGeneral) {
    s.topic = 'kopi';
    return {
      reply: 'Selamat datang di *Bit & Bean Coffee*! Kami menyediakan kopi susu aren siap minum (cup/botol 1L) dan biji kopi sangrai segar (Arabica & Robusta).\n\nKakak berminat menu kopi siap minum atau biji kopi sangrai kak? 😊☕',
      topic: 'kopi'
    };
  }

  // 8. SKRIPSI & IT (NOURA STUDIO)
  const isML = has(t, ['machine learning', 'deep learning', 'ai', 'data science', 'nlp', 'cnn', 'svm', 'prediksi', 'klasifikasi', 'python']);
  const isDev = has(t, ['web', 'laravel', 'flutter', 'android', 'mobile', 'iot', 'react', 'sistem informasi', 'aplikasi']);
  const isSkripsi = has(t, ['skripsi', 'tesis', 'tugas akhir', 'bimbingan', 'noura studio', 'judul', 'bab 1', 'bab 2', 'bab 3', 'bab 4', 'bab 5', 'sidang', 'sempro', 'turnitin', 'koding', 'coding']);

  if (isML) {
    s.topic = 'skripsi';
    return {
      reply: 'Wah mantap kak! Topik *Machine Learning / AI* adalah salah satu spesialisasi utama di *Noura Studio* 🎓\n\nKami siap mendampingi:\n✅ Penentuan judul, rumusan masalah & dataset\n✅ Preprocessing & coding Python (TensorFlow, PyTorch, Scikit-Learn)\n✅ Evaluasi model (akurasi, confusion matrix, precision/recall)\n✅ Penulisan laporan Bab 1–5 & cek Turnitin\n✅ Simulasi sidang skripsi langsung bersama: *Ir. Nor Anisa, S.Kom., M.Kom.*\n\nApakah saat ini sudah ada usulan judul atau datasetnya kak? 😊',
      topic: 'skripsi'
    };
  }

  if (isDev) {
    s.topic = 'skripsi';
    return {
      reply: 'Siap kak! Untuk pembuatan aplikasi Web / Mobile / IoT, *Noura Studio* siap mendampingi penuh 🎓\n\nPendampingan mencakup perancangan sistem (UML/ERD), penulisan coding (Laravel, Flutter, React, Python), laporan Bab 1–5, hingga simulasi sidang bersama *Ir. Nor Anisa, S.Kom., M.Kom.*\n\nBoleh tahu apakah judulnya sudah disetujui kampus atau baru pengajuan kak? 😊',
      topic: 'skripsi'
    };
  }

  if (isSkripsi) {
    s.topic = 'skripsi';
    return {
      reply: 'Halo kak! Untuk *Bimbingan Skripsi IT Noura Studio*, kami melayani pendampingan edukatif (bukan joki) untuk konsultasi judul, Bab 1–5, coding aplikasi, dan latihan persiapan sidang bersama akademisi resmi: *Ir. Nor Anisa, S.Kom., M.Kom.* 🎓\n\nBoleh tahu kakak dari jurusan apa dan topik/judul apa yang ingin dibahas kak? 😊',
      topic: 'skripsi'
    };
  }

  // Jika input mengandung kata spesifik gas
  if (has(t, ['gas', 'refill', 'canister', 'kaleng', 'tabung'])) {
    s.topic = 'gas';
    return {
      reply: 'Kami melayani refill gas portable & canister di Banjarmasin, Palangka Raya, dan Balikpapan (Rp12.000/botol bawa kaleng sendiri).\n\nKakak butuh info alamat lokasi, jam buka, atau harga kak? 😊',
      topic: 'gas'
    };
  }

  return null;
}

export const systemPrompt = `Anda adalah Nadia, customer service resmi untuk 3 unit usaha Ir. Nor Anisa, S.Kom., M.Kom. (+62 851-5513-3070).
Karakter: Ramah, santun, hangat, profesional, seperti admin WhatsApp Indonesia asli.

DATA RESMI WAJIB:
1. REFILL GAS PORTABLE & CANISTER (Refill Rp 12.000 / kaleng bawa sendiri):
   - Banjarmasin: Komplek The Green Rahayu 2 Blok A No. 15, Jln. Simpang Limau. Buka Senin-Jumat 17.00 - 21.00 WITA | Sabtu-Minggu 08.00 - 21.00 WITA. Maps: https://maps.app.goo.gl/XpGwbcBdSgavG6XA9. WA: 0851-5513-3070.
   - Palangka Raya: Toko Karya Perdana, Jl. Seth Adji No. 70 (samping H. Kadap). Buka 07.00 - 11.00 & 14.00 - 16.00 WIB. Maps: https://maps.app.goo.gl/5mXcbhgjDztzZLe27. WA: 0812-5090-197. Ada kaleng baru Rp 20.000.
   - Balikpapan: Jln. Mulawarman RT 03 No. 16, Lamaru (dekat Masjid Nurul Iman). Buka 08.00 - 20.00 WITA. Maps: https://maps.app.goo.gl/gHZk2yU1qHqu3x1M6. WA: 0878-7246-2520.
   - Jika pelanggan menanyakan alamat atau mau datang langsung, SELALU sertakan link Google Maps resminya!
2. BIMBINGAN SKRIPSI IT (NOURA STUDIO): Bimbingan skripsi/tesis Informatika bersama Ir. Nor Anisa, S.Kom., M.Kom., coding Laravel/React/Python/AI, persiapan sidang, cek Turnitin, Print (BW 400/lbr, Warna 800/lbr). Dilarang pakai kata 'joki' (sistem edukatif).
3. BIT & BEAN COFFEE: Kopi susu aren cup Rp 15k, botol 250ml Rp 18k, 1 liter Rp 65k, manual brew Rp 15k, biji sangrai segar Arabica Rp 75k/200g, Robusta Rp 50k/200g, House Blend Rp 60k/200g.
4. PEMBAYARAN: QRIS Bit & Bean & Transfer Bank (BNI: 1048491406, SeaBank: 901187631820, BTN: 1001501017745 a.n. Nor Anisa).

ATURAN JAWABAN:
- Jawab dengan ramah, santun, dan natural (maksimal 2 sampai 4 kalimat).
- Langsung to the point menjawab inti pesan pelanggan.
- Wajib 100% berbahasa Indonesia yang baik.`;
