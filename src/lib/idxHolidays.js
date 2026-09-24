/**
 * Kalender Hari Libur Resmi Bursa Efek Indonesia (BEI / IDX) & SKB 3 Menteri
 * Menampung daftar hari libur nasional dan cuti bersama perdagangan bursa.
 */

export const IDX_HOLIDAYS_SET = new Set([
  // ── 2024 ──
  '2024-01-01', // Tahun Baru 2024 Masehi
  '2024-02-08', // Isra Mi'raj Nabi Muhammad SAW
  '2024-02-09', // Cuti Bersama Tahun Baru Imlek
  '2024-02-14', // Pemilu Serentak 2024
  '2024-03-11', // Hari Suci Nyepi Tahun Baru Saka 1946
  '2024-03-12', // Cuti Bersama Nyepi
  '2024-03-29', // Wafat Isa Almasih
  '2024-04-08', '2024-04-09', '2024-04-10', '2024-04-11', '2024-04-12', '2024-04-15', // Idul Fitri 1445 H & Cuti Bersama
  '2024-05-01', // Hari Buruh Internasional
  '2024-05-09', // Kenaikan Isa Almasih
  '2024-05-10', // Cuti Bersama Kenaikan Isa Almasih
  '2024-05-23', // Hari Raya Waisak 2568 BE
  '2024-05-24', // Cuti Bersama Waisak
  '2024-06-01', // Hari Lahir Pancasila
  '2024-06-17', // Hari Raya Idul Adha 1445 H
  '2024-06-18', // Cuti Bersama Idul Adha
  '2024-07-07', // Tahun Baru Islam 1446 H
  '2024-08-17', // Hari Kemerdekaan RI
  '2024-09-16', // Maulid Nabi Muhammad SAW
  '2024-12-25', // Hari Raya Natal
  '2024-12-26', // Cuti Bersama Natal
  '2024-12-31', // Libur Akhir Tahun Bursa

  // ── 2025 ──
  '2025-01-01', // Tahun Baru 2025 Masehi
  '2025-01-27', // Isra Mi'raj Nabi Muhammad SAW
  '2025-01-28', // Cuti Bersama Tahun Baru Imlek
  '2025-01-29', // Tahun Baru Imlek 2576 Kongzili
  '2025-03-28', // Cuti Bersama Nyepi
  '2025-03-29', // Hari Suci Nyepi
  '2025-03-31', '2025-04-01', '2025-04-02', '2025-04-03', '2025-04-04', '2025-04-07', // Idul Fitri 1446 H & Cuti Bersama
  '2025-04-18', // Wafat Yesus Kristus
  '2025-05-01', // Hari Buruh Internasional
  '2025-05-12', // Hari Raya Waisak 2569 BE
  '2025-05-13', // Cuti Bersama Waisak
  '2025-05-29', // Kenaikan Yesus Kristus
  '2025-05-30', // Cuti Bersama Kenaikan
  '2025-06-01', // Hari Lahir Pancasila
  '2025-06-06', // Hari Raya Idul Adha 1446 H
  '2025-06-09', // Cuti Bersama Idul Adha
  '2025-06-27', // 1 Muharram / Tahun Baru Islam 1447 H
  '2025-08-17', // Hari Kemerdekaan RI
  '2025-09-05', // Maulid Nabi Muhammad SAW
  '2025-12-25', // Hari Raya Natal
  '2025-12-26', // Cuti Bersama Natal
  '2025-12-31', // Libur Akhir Tahun Bursa

  // ── 2026 ──
  '2026-01-01', // Tahun Baru 2026 Masehi
  '2026-01-16', // Isra Mi'raj Nabi Muhammad SAW
  '2026-02-17', // Tahun Baru Imlek 2577 Kongzili
  '2026-02-18', // Cuti Bersama Imlek
  '2026-03-19', '2026-03-20', '2026-03-23', '2026-03-24', // Idul Fitri 1447 H & Cuti Bersama
  '2026-03-25', // Hari Suci Nyepi Saka 1948
  '2026-04-03', // Wafat Yesus Kristus
  '2026-05-01', // Hari Buruh Internasional
  '2026-05-14', // Kenaikan Yesus Kristus
  '2026-05-15', // Cuti Bersama Kenaikan
  '2026-05-27', // Hari Raya Idul Adha 1447 H
  '2026-05-31', // Hari Raya Waisak 2570 BE
  '2026-06-01', // Hari Lahir Pancasila
  '2026-06-16', // Tahun Baru Islam 1448 H
  '2026-08-17', // Hari Proklamasi Kemerdekaan RI
  '2026-08-25', // Maulid Nabi Muhammad SAW
  '2026-12-25', // Hari Raya Natal
  '2026-12-28', // Cuti Bersama Natal
  '2026-12-31', // Libur Akhir Tahun Bursa

  // ── 2027 ──
  '2027-01-01', // Tahun Baru 2027 Masehi
  '2027-02-06', // Tahun Baru Imlek 2578
  '2027-03-09', '2027-03-10', '2027-03-11', '2027-03-12', // Idul Fitri 1448 H
  '2027-03-26', // Wafat Yesus Kristus
  '2027-05-01', // Hari Buruh
  '2027-05-06', // Kenaikan Yesus Kristus
  '2027-05-16', // Idul Adha 1448 H
  '2027-05-20', // Hari Raya Waisak
  '2027-06-01', // Hari Lahir Pancasila
  '2027-08-17', // HUT RI ke-82
  '2027-12-25', // Hari Raya Natal
  '2027-12-31', // Libur Akhir Tahun Bursa
]);

/**
 * Format objek Date ke string YYYY-MM-DD zona waktu Indonesia (WIB / UTC+7)
 * @param {Date} date 
 * @returns {string} e.g. "2026-09-24"
 */
export function formatDateWIBString(date) {
  const d = new Date(date);
  const wibTime = new Date(d.getTime() + 7 * 3600 * 1000);
  return wibTime.toISOString().split('T')[0];
}

/**
 * Mengecek apakah tanggal tertentu merupakan hari libur bursa resmi BEI.
 * @param {Date|string} date 
 * @returns {boolean}
 */
export function isIDXHoliday(date) {
  const dateStr = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) 
    ? date 
    : formatDateWIBString(new Date(date));
  return IDX_HOLIDAYS_SET.has(dateStr);
}

/**
 * Mengecek apakah tanggal tertentu merupakan hari bursa aktif (bukan Sabtu/Minggu dan bukan Libur Bursa).
 * @param {Date|string} date 
 * @returns {boolean}
 */
export function isIDXTradingDay(date) {
  const d = new Date(date);
  const day = d.getDay();
  // 0 = Minggu, 6 = Sabtu
  if (day === 0 || day === 6) return false;
  return !isIDXHoliday(d);
}
