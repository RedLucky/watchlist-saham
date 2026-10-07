const cron = require('node-cron');
const { exec } = require('child_process');

let isPriceSyncRunning = false;
let isDailyScraperRunning = false;
let isIndexSyncRunning = false;

function runPriceSync() {
  if (isPriceSyncRunning) {
    console.warn(`\n[PRICE-SYNC-SKIP] Sync harga sebelumnya masih berjalan, melewati jadwal ini.`);
    return;
  }
  isPriceSyncRunning = true;
  const proc = exec('node --max-old-space-size=896 src/scripts/sync-prices.js', (err) => {
    isPriceSyncRunning = false;
    if (err) {
      console.error(`[PRICE-SYNC-ERR] Gagal sync harga: ${err.message}`);
    }
  });

  proc.stdout.on('data', (data) => console.log(data.trim()));
  proc.stderr.on('data', (data) => console.error(data.trim()));
}

function runDiscordNotifier() {
  console.log('\n[DISCORD] Memulai pengiriman rekomendasi harian ke Discord...');
  const proc = exec('node --max-old-space-size=896 src/scripts/discord-notifier.js', { maxBuffer: 10 * 1024 * 1024 }, (err) => {
    if (err) {
      console.error(`[DISCORD-ERR] Gagal mengirim notifikasi Discord: ${err.message}`);
    } else {
      console.log(`[DISCORD-SUCCESS] Notifikasi Discord selesai diproses.`);
    }
  });

  proc.stdout.on('data', (data) => console.log(data.trim()));
  proc.stderr.on('data', (data) => console.error(data.trim()));
}

function runDailyScrapers() {
  if (isDailyScraperRunning) {
    console.warn(`\n[SCRAPER-SKIP] Scraping harian sebelumnya masih berjalan.`);
    return;
  }
  isDailyScraperRunning = true;
  console.log('\n[1/2] Memulai Sinkronisasi Otomatis Data ZIP KSEI...');
  const kseiProc = exec('node --max-old-space-size=896 src/scripts/sync-ksei.js', (kseiErr) => {
    if (kseiErr) {
      console.error(`[KSEI-CRASH] Sinkronisasi KSEI gagal: ${kseiErr.message}`);
    } else {
      console.log(`[KSEI-SUCCESS] Sinkronisasi KSEI selesai.`);
    }

    // Lanjutkan ke IDX Ownership Scraper
    console.log('\n[2/2] Memulai Sinkronisasi Ownership & Insider IDX...');
    const ownProc = exec('node --max-old-space-size=896 src/scripts/sync-ownership.js', (ownErr) => {
      isDailyScraperRunning = false;
      if (ownErr) {
        console.error(`[OWNERSHIP-CRASH] Scraping ownership gagal: ${ownErr.message}`);
        return;
      }
      console.log(`[SUCCESS] Semua proses scraping harian selesai!`);
    });

    ownProc.stdout.on('data', (data) => console.log(data.trim()));
    ownProc.stderr.on('data', (data) => console.error(data.trim()));
  });

  kseiProc.stdout.on('data', (data) => console.log(data.trim()));
  kseiProc.stderr.on('data', (data) => console.error(data.trim()));
}

/**
 * Runs the IDX index membership sync (LQ45, IDX30, IDX Value 30, High Dividend 20, ISSI).
 * A guard flag stops overlapping runs if the previous one is still scraping.
 */
function runIndexSync() {
  if (isIndexSyncRunning) {
    console.warn(`\n[IDX-SYNC-SKIP] Sinkronisasi indeks sebelumnya masih berjalan, melewati jadwal ini.`);
    return;
  }
  isIndexSyncRunning = true;
  const proc = exec('node --max-old-space-size=896 src/scripts/sync-indices.js', (err) => {
    isIndexSyncRunning = false;
    if (err) {
      console.error(`[IDX-SYNC-ERR] Gagal sinkronisasi indeks: ${err.message}`);
    } else {
      console.log(`[IDX-SYNC-SUCCESS] Sinkronisasi indeks selesai.`);
    }
  });

  proc.stdout.on('data', (data) => console.log(data.trim()));
  proc.stderr.on('data', (data) => console.error(data.trim()));
}

console.log('🤖 Scraper & Price Sync Cron Scheduler Started (Alpine Minimalist)!');
console.log('Jadwal:');
console.log('  - Sync Harga Saham: Setiap 5 Menit');
console.log('  - Sync KSEI & Ownership: Setiap Hari pukul 10:00 WIB');
console.log('  - Rekomendasi Saham Discord: Setiap Hari pukul 18:00 WIB');
console.log('  - Keanggotaan Indeks BEI: Setiap Senin pukul 09:00 WIB');

// 1. Jalankan sinkronisasi harga pertama kali saat boot
console.log('\n[Boot] Menjalankan initial Price Sync...');
runPriceSync();

// 2. Jalankan initial KSEI & Ownership sync
console.log('[Boot] Menjalankan initial KSEI & Ownership Scraper...');
runDailyScrapers();

// 3. Jalankan initial sinkronisasi indeks agar label indeks tersedia setelah deploy
console.log('[Boot] Menjalankan initial Sinkronisasi Indeks BEI...');
runIndexSync();

// Jadwal Cron: Setiap 5 Menit -> Sync Harga Saham ("*/5 * * * *")
cron.schedule('*/5 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-5MIN] Memulai Sinkronisasi Harga Saham Berkala...`);
  runPriceSync();
});

// Jadwal Cron: Setiap Hari pukul 10:00 WIB ("0 10 * * *")
cron.schedule('0 10 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-DAILY] Jadwal 10:00 WIB Terpicu! Memulai KSEI & Ownership Scraping...`);
  runDailyScrapers();
}, {
  timezone: "Asia/Jakarta",
  missedExecutionTolerance: 300000,
  onMissedExecution: (date) => {
    console.warn(`\n[${new Date().toISOString()}] [CRON-DAILY-MISSED] Jadwal 10:00 WIB terlewat pada ${date}, menjalankan pemulihan...`);
    runDailyScrapers();
  }
});

// Jadwal Cron: Setiap Senin pukul 09:00 WIB -> Sinkronisasi Keanggotaan Indeks BEI ("0 9 * * 1")
// Mingguan sudah cukup: IDX hanya menilai ulang keanggotaan indeks beberapa kali setahun.
cron.schedule('0 9 * * 1', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-INDEX] Jadwal Senin 09:00 WIB Terpicu! Sinkronisasi indeks BEI...`);
  runIndexSync();
}, {
  timezone: "Asia/Jakarta",
  missedExecutionTolerance: 300000,
  onMissedExecution: (date) => {
    console.warn(`\n[${new Date().toISOString()}] [CRON-INDEX-MISSED] Jadwal indeks terlewat pada ${date}, menjalankan pemulihan...`);
    runIndexSync();
  }
});

// Jadwal Cron: Setiap Hari pukul 18:00 WIB -> Kirim Rekomendasi Saham ke Discord ("0 18 * * *")
cron.schedule('0 18 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-DISCORD] Jadwal 18:00 WIB Terpicu! Mengirim Rekomendasi Saham ke Discord...`);
  runDiscordNotifier();
}, {
  timezone: "Asia/Jakarta",
  missedExecutionTolerance: 300000,
  onMissedExecution: (date) => {
    console.warn(`\n[${new Date().toISOString()}] [CRON-DISCORD-MISSED] Jadwal 18:00 WIB terlewat pada ${date}, menjalankan pemulihan...`);
    runDiscordNotifier();
  }
});

console.log('Scheduler is now active and listening in background...');
