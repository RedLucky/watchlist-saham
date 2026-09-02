const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🤖 Scraper & Price Sync Cron Scheduler Started (Alpine Minimalist)!');
console.log('Jadwal:');
console.log('  - Sync Harga Saham: Setiap 5 Menit');
console.log('  - Sync KSEI & Ownership: Setiap Hari pukul 10:00 WIB');
console.log('  - Rekomendasi Saham Discord: Setiap Hari pukul 18:00 WIB');

// 1. Jalankan sinkronisasi harga pertama kali saat boot
console.log('\n[Boot] Menjalankan initial Price Sync...');
runPriceSync();

// 2. Jalankan initial KSEI & Ownership sync
console.log('[Boot] Menjalankan initial KSEI & Ownership Scraper...');
runDailyScrapers();

// Jadwal Cron: Setiap 5 Menit -> Sync Harga Saham ("*/5 * * * *")
cron.schedule('*/5 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-5MIN] Memulai Sinkronisasi Harga Saham Berkala...`);
  runPriceSync();
});

// Jadwal Cron: Setiap Hari pukul 10:00 WIB ("0 10 * * *")
cron.schedule('0 10 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-DAILY] Jadwal Harian Terpicu! Memulai KSEI & Ownership Scraping...`);
  runDailyScrapers();
});

// Jadwal Cron: Setiap Hari pukul 18:00 WIB -> Kirim Rekomendasi Saham ke Discord ("0 18 * * *")
cron.schedule('0 18 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] [CRON-DISCORD] Jadwal 18:00 WIB Terpicu! Mengirim Rekomendasi Saham ke Discord...`);
  runDiscordNotifier();
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

function runDiscordNotifier() {
  console.log('\n[DISCORD] Memulai pengiriman rekomendasi harian ke Discord...');
  const proc = exec('node src/scripts/discord-notifier.js', (err) => {
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
      console.log(`[SUCCESS] Semua proses scraping harian selesai!`);
    });

    ownProc.stdout.on('data', (data) => console.log(data.trim()));
    ownProc.stderr.on('data', (data) => console.error(data.trim()));
  });

  kseiProc.stdout.on('data', (data) => console.log(data.trim()));
  kseiProc.stderr.on('data', (data) => console.error(data.trim()));
}

console.log('Scheduler is now active and listening in background...');
