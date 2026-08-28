const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🤖 Scraper Cron Scheduler Started (Alpine Minimalist)!');
console.log('Jadwal: Setiap Hari Rabu pukul 08:30 Pagi (WIB)');

// Jalankan otomatis sekali saat container pertama kali hidup
console.log('Menjalankan initial scraping boot (KSEI Zip + IDX Ownership)...');
runAllScrapers();

// "30 8 * * 3" -> Menit 30, Jam 8, Setiap bulan, Setiap hari, Hari ke-3 (Rabu)
cron.schedule('30 8 * * 3', () => {
  console.log(`\n[${new Date().toISOString()}] Jadwal Mingguan Terpicu! Memulai Eksekusi Scraping...`);
  runAllScrapers();
});

function runAllScrapers() {
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
      console.log(`[SUCCESS] Semua proses scraping selesai! Menunggu jadwal berikutnya...`);
    });

    ownProc.stdout.on('data', (data) => {
      console.log(data.trim());
    });
    ownProc.stderr.on('data', (data) => {
      console.error(data.trim());
    });
  });

  kseiProc.stdout.on('data', (data) => {
    console.log(data.trim());
  });
  kseiProc.stderr.on('data', (data) => {
    console.error(data.trim());
  });
}

console.log('Scheduler is now listening in the background...');
