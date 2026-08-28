const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🤖 Scraper & Price Sync Cron Scheduler Started (Alpine Minimalist)!');
console.log('Jadwal:');
console.log('  - Sync Harga Saham: Setiap 5 Menit');
console.log('  - Sync KSEI & Ownership: Setiap Hari Rabu pukul 08:30 WIB');

// 1. Jalankan sinkronisasi harga pertama kali saat boot
console.log('\n[Boot] Menjalankan initial Price Sync...');
runPriceSync();

// 2. Jalankan initial KSEI & Ownership sync
console.log('[Boot] Menjalankan initial KSEI & Ownership Scraper...');
runWeeklyScrapers();

// Jadwal Cron: Setiap 5 Menit -> Sync Harga Saham ("*/5 * * * *")
cron.schedule('*/5 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-5MIN] Memulai Sinkronisasi Harga Saham Berkala...`);
  runPriceSync();
});

// Jadwal Cron: Setiap Hari Rabu pukul 08:30 WIB ("30 8 * * 3")
cron.schedule('30 8 * * 3', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-WEEKLY] Jadwal Mingguan Terpicu! Memulai KSEI & Ownership Scraping...`);
  runWeeklyScrapers();
});

function runPriceSync() {
  const proc = exec('node src/scripts/sync-prices.js', (err) => {
    if (err) {
      console.error(`[PRICE-SYNC-ERR] Gagal sync harga: ${err.message}`);
    }
  });

  proc.stdout.on('data', (data) => console.log(data.trim()));
  proc.stderr.on('data', (data) => console.error(data.trim()));
}

function runWeeklyScrapers() {
  console.log('\n[1/2] Memulai Sinkronisasi Otomatis Data ZIP KSEI...');
  const kseiProc = exec('node src/scripts/sync-ksei.js', (kseiErr) => {
    if (kseiErr) {
      console.error(`[KSEI-CRASH] Sinkronisasi KSEI gagal: ${kseiErr.message}`);
    } else {
      console.log(`[KSEI-SUCCESS] Sinkronisasi KSEI selesai.`);
    }

    // Lanjutkan ke IDX Ownership Scraper
    console.log('\n[2/2] Memulai Sinkronisasi Ownership & Insider IDX...');
    const ownProc = exec('node src/scripts/sync-ownership.js', (ownErr) => {
      if (ownErr) {
        console.error(`[OWNERSHIP-CRASH] Scraping ownership gagal: ${ownErr.message}`);
        return;
      }
      console.log(`[SUCCESS] Semua proses scraping mingguan selesai!`);
    });

    ownProc.stdout.on('data', (data) => console.log(data.trim()));
    ownProc.stderr.on('data', (data) => console.error(data.trim()));
  });

  kseiProc.stdout.on('data', (data) => console.log(data.trim()));
  kseiProc.stderr.on('data', (data) => console.error(data.trim()));
}

console.log('Scheduler is now active and listening in background...');
