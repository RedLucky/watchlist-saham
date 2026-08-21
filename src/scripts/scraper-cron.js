const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🤖 Scraper Cron Scheduler Started (Alpine Minimalist)!');
console.log('Jadwal: Setiap Hari Rabu pukul 08:30 Pagi (WIB)');

// Jalankan otomatis sekali saat container pertama kali hidup (opsional, untuk memastikan jalan)
console.log('Menjalankan initial scraping boot...');
runScraper();

// "30 8 * * 3" -> Menit 30, Jam 8, Setiap bulan, Setiap hari, Hari ke-3 (Rabu)
cron.schedule('30 8 * * 3', () => {
  console.log(`\n[${new Date().toISOString()}] Jadwal Mingguan Terpicu! Memulai Eksekusi Scraping...`);
  runScraper();
});

function runScraper() {
  const process = exec('node src/scripts/sync-ownership.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`[CRASH] Scraping gagal: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[STDERR]: ${stderr}`);
    }
    console.log(`[SUCCESS] Scraping batch selesai! Menunggu jadwal berikutnya...`);
  });

  process.stdout.on('data', (data) => {
    console.log(data.trim());
  });
}

console.log('Scheduler is now listening in the background...');
