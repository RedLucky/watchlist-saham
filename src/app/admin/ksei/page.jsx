'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function KseiAdminPage() {
  const [activeInputMode, setActiveInputMode] = useState('paste'); // 'paste' | 'file'
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [storedPeriods, setStoredPeriods] = useState([]);
  const [totalStocksWithKsei, setTotalStocksWithKsei] = useState(0);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [availablePubs, setAvailablePubs] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [autoSyncingZip, setAutoSyncingZip] = useState(null); // zipUrl | 'ALL' | null

  // Fetch existing stored periods & available publications from KSEI
  useEffect(() => {
    fetchStoredPeriods();
    fetchAvailablePubs();
  }, []);

  const fetchStoredPeriods = async () => {
    try {
      setLoadingPeriods(true);
      const res = await fetch('/api/ksei/periods');
      if (res.ok) {
        const data = await res.json();
        setStoredPeriods(data.periods || []);
        setTotalStocksWithKsei(data.totalStocksWithKsei || 0);
      }
    } catch (e) {
      console.error('Error fetching periods:', e);
    } finally {
      setLoadingPeriods(false);
    }
  };

  const fetchAvailablePubs = async () => {
    try {
      setLoadingPubs(true);
      const res = await fetch('/api/ksei/auto-sync');
      if (res.ok) {
        const data = await res.json();
        setAvailablePubs(data.publications || []);
      }
    } catch (e) {
      console.error('Error fetching publications:', e);
    } finally {
      setLoadingPubs(false);
    }
  };

  const handleAutoSync = async (specificZipUrl = null, title = '') => {
    try {
      const syncKey = specificZipUrl || 'ALL';
      setAutoSyncingZip(syncKey);
      setStatusMessage({
        type: 'info',
        text: `Sedang mengunduh file ZIP dari portal resmi KSEI dan mengekstrak data ${title ? `(${title})` : ''}... Harap tunggu sejenak.`
      });

      const res = await fetch('/api/ksei/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specificZipUrl })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal melakukan sinkronisasi otomatis KSEI.');
      }

      if (data.syncedCount === 0) {
        setStatusMessage({
          type: 'info',
          text: data.message || 'Semua data periode KSEI sudah sinkron dengan database.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Sukses! Berhasil mengunduh & menyinkronkan ${data.syncedCount} periode KSEI (${data.totalUpdatedStocks?.toLocaleString('id-ID') || 0} pembaruan emiten saham). Analisa delta bandarmologi telah diperbarui.`
        });
      }

      // Refresh both periods and publications list
      await Promise.all([fetchStoredPeriods(), fetchAvailablePubs()]);
    } catch (err) {
      console.error('Auto sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat mengunduh/menyinkronkan data KSEI.'
      });
    } finally {
      setAutoSyncingZip(null);
    }
  };

  // Preview parser
  const handleParsePreview = (text) => {
    if (!text || text.trim().length === 0) {
      setPreviewData(null);
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const validRows = [];
    let detectedDate = null;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('date|')) continue;
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 25 && parts[1] && parts[3]) {
        validRows.push({
          date: parts[0],
          ticker: parts[1],
          secNum: Number(parts[3]) || 0,
          price: Number(parts[4]) || 0,
          localId: Number(parts[9]) || 0,
          foreignTotal: Number(parts[24]) || 0,
        });
        if (!detectedDate) detectedDate = parts[0];
      }
    }

    setPreviewData({
      totalLines: lines.length,
      validCount: validRows.length,
      detectedDate: detectedDate || 'Tidak Terdeteksi',
      sampleRows: validRows.slice(0, 5),
    });
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setPastedText(val);
    handleParsePreview(val);
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setPastedText(content);
      handleParsePreview(content);
    };
    reader.readAsText(uploadedFile);
  };

  const handleUploadSubmit = async () => {
    if (!pastedText || pastedText.trim().length === 0) {
      setStatusMessage({ type: 'error', text: 'Silakan masukkan teks atau upload file KSEI terlebih dahulu.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: 'Sedang memproses dan menyimpan data time-series ke database...' });

    try {
      const res = await fetch('/api/ksei/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: pastedText,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan data KSEI.');
      }

      setStatusMessage({
        type: 'success',
        text: `Sukses! Berhasil memproses ${json.result?.updatedCount || 0} saham untuk periode ${json.result?.snapshotDate}. Pergerakan delta (+/-) telah diperbarui otomatis.`,
      });

      // Clear input and refresh periods
      setPastedText('');
      setFile(null);
      setPreviewData(null);
      await Promise.all([fetchStoredPeriods(), fetchAvailablePubs()]);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Terjadi kesalahan saat memproses data.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Month names in Indonesian and English for previous month calculation
  const idMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const enShortMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const now = new Date();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthName = idMonths[prevDate.getMonth()];
  const prevYear = prevDate.getFullYear();
  const prevMonthNumStr = String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevEngShort = enShortMonths[prevDate.getMonth()];

  // Check if previous month's data exists in stored snapshot periods
  const hasLastMonthData = storedPeriods.some(p => {
    if (!p) return false;
    const str = String(p).toUpperCase();
    return str.includes(`${prevYear}-${prevMonthNumStr}`) || 
           str.includes(`${prevEngShort}-${prevYear}`) || 
           str.includes(`${prevEngShort} ${prevYear}`);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Breadcrumb & Title */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-200">Admin</span>
              <span>/</span>
              <span className="text-indigo-400 font-bold">KSEI Ingestion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              🏛️ Upload Data Kepemilikan KSEI
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manajemen Data Time-Series, Struktur Saham & Bandarmologi Bulanan
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-md"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>

        {/* Previous Month Upload Requirement Alert Banner */}
        {!loadingPeriods && (
          !hasLastMonthData ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <span className="text-2xl sm:text-3xl p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 flex-shrink-0">
                  ⚠️
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-sm sm:text-base text-amber-100">
                      Perhatian: Data KSEI Bulan Lalu ({prevMonthName} {prevYear}) Belum Diunggah!
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-amber-500 text-amber-950">
                      Perlu Tindakan
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-200/85 leading-relaxed">
                    Data kepemilikan efek untuk akhir periode <strong>{prevMonthName} {prevYear}</strong> belum terdaftar di database. Anda dapat menggunakan tombol <strong>Sync Otomatis</strong> di bawah untuk mengunduh dan mengekstrak file ZIP secara langsung tanpa perlu unduh manual.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-shrink-0">
                <button
                  onClick={() => handleAutoSync(null, `${prevMonthName} ${prevYear}`)}
                  disabled={isProcessing || !!autoSyncingZip}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
                  title="Unduh dan ekstrak otomatis file ZIP dari KSEI"
                >
                  {autoSyncingZip ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                      <span>Sedang Mengunduh ZIP...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Unduh & Sync Otomatis</span>
                    </>
                  )}
                </button>

                <a
                  href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-amber-200 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
                  title="Buka portal publikasi KSEI"
                >
                  <span>🌐 Portal KSEI</span>
                  <span className="text-xs">↗</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="text-xl p-1.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  ✅
                </span>
                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-emerald-100">
                    Data KSEI Periode Terakhir ({prevMonthName} {prevYear}) Sudah Terunggah
                  </h2>
                  <p className="text-[11px] text-emerald-300/80">
                    Sistem telah memiliki snapshot kepemilikan efek mutakhir untuk analisis time-series bandarmologi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleAutoSync(null, 'Semua')}
                  disabled={isProcessing || !!autoSyncingZip}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Cek apakah ada snapshot baru di portal KSEI"
                >
                  {autoSyncingZip ? (
                    <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></span>
                  ) : (
                    <span>🔄</span>
                  )}
                  <span>Cek Pembaruan KSEI</span>
                </button>
                <a
                  href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline whitespace-nowrap"
                >
                  <span>Portal KSEI ↗</span>
                </a>
              </div>
            </div>
          )
        )}

        {/* 1-CLICK AUTOMATED KSEI DOWNLOAD MANAGER */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Unduh & Ekstraksi Otomatis dari Portal KSEI
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sistem mengunduh file ZIP dari <a href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-white">ksei.co.id</a>, mengekstrak data teks di memori, dan menyimpannya langsung ke database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAvailablePubs()}
                disabled={loadingPubs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
                title="Muat ulang daftar publikasi dari KSEI"
              >
                <span className={loadingPubs ? 'animate-spin' : ''}>🔄</span>
                <span>Refresh Daftar</span>
              </button>
              
              <button
                onClick={() => handleAutoSync(null, 'Semua')}
                disabled={isProcessing || !!autoSyncingZip}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {autoSyncingZip === 'ALL' ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Menyinkronkan...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Sync Semua Bulan yang Belum Ada</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {loadingPubs && availablePubs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <span className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></span>
              <span>Memeriksa publikasi bulanan di portal resmi KSEI...</span>
            </div>
          ) : availablePubs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              Tidak dapat memuat daftar publikasi KSEI secara langsung. Anda tetap dapat menggunakan form upload manual di bawah.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {availablePubs.map((pub, idx) => {
                const isCurrentSyncing = autoSyncingZip === pub.zipUrl;
                return (
                  <div
                    key={pub.zipUrl || idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      pub.isSynced
                        ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        : 'bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-black text-white truncate">
                          {pub.day} {pub.month} {pub.dateFormatted?.split('-')[0] || ''}
                        </span>
                        {pub.isSynced ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            ✓ Ter-sync
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap animate-pulse">
                            ⚠️ Belum Ada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{pub.title}</p>
                      <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
                        📦 {pub.zipUrl.split('/').pop()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleAutoSync(pub.zipUrl, pub.title)}
                        disabled={isProcessing || !!autoSyncingZip}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          pub.isSynced
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20'
                        } disabled:opacity-50`}
                      >
                        {isCurrentSyncing ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Proses...</span>
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>{pub.isSynced ? 'Sync Ulang' : 'Auto Sync'}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={pub.zipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700"
                        title="Unduh file ZIP langsung ke komputer"
                      >
                        💾
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Banner with Direct Download Guide */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs sm:text-sm text-indigo-200 flex items-start gap-3 shadow-lg">
          <span className="text-xl flex-shrink-0">💡</span>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-bold text-white">Panduan & Sumber Data Resmi KSEI:</p>
              <a
                href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-colors"
              >
                <span>🌐 Buka Portal KSEI (Data & Statistik)</span>
                <span>↗</span>
              </a>
            </div>
            <p className="text-indigo-200/90 text-xs leading-relaxed">
              1. Gunakan tombol <strong>⚡ Auto Sync</strong> di atas untuk proses otomatis tanpa unduh manual.<br />
              2. Atau buka tautan <a href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1" target="_blank" rel="noopener noreferrer" className="text-indigo-300 font-bold underline hover:text-white">Portal Publikasi KSEI</a> dan unduh file <strong>Data Kepemilikan Efek (Saham)</strong>.<br />
              3. Format pemisah pipa (<code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-300 font-mono">Date|Code|Type|Sec. Num|Price|...</code>) akan diurai secara otomatis dan menghitung perubahan delta kepemilikan ($+/-$).
            </p>
          </div>
        </div>

        {/* Manual Upload Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>📋</span> Alternatif: Unggah File / Paste Teks Manual
              </h3>
              <p className="text-xs text-slate-400">Gunakan jika Anda ingin menempelkan potongan data teks atau file lokal</p>
            </div>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 w-max">
            <button
              onClick={() => setActiveInputMode('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeInputMode === 'paste' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Paste Teks Mentah
            </button>
            <button
              onClick={() => setActiveInputMode('file')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeInputMode === 'file' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📁 Upload File (.txt / .csv)
            </button>
          </div>

          {/* Paste Mode */}
          {activeInputMode === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Tempelkan Data KSEI di Bawah Ini:</label>
              <textarea
                value={pastedText}
                onChange={handleTextChange}
                placeholder="Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|...&#10;31-JUL-2026|AADI|EQUITY|7786891760|9225|127413578|...&#10;31-JUL-2026|AALI|EQUITY|1924688333|6875|72828116|..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all resize-y"
              />
            </div>
          )}

          {/* File Upload Mode */}
          {activeInputMode === 'file' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Pilih File Teks KSEI:</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-slate-950/50">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="ksei-file-input"
                />
                <label htmlFor="ksei-file-input" className="cursor-pointer space-y-2 block">
                  <div className="text-4xl">📄</div>
                  <div className="text-sm font-bold text-white">
                    {file ? file.name : 'Klik untuk memilih file teks atau seret ke sini'}
                  </div>
                  <p className="text-xs text-slate-500">Mendukung format .txt atau .csv dari KSEI</p>
                </label>
              </div>
            </div>
          )}

          {/* Live Preview & Stats */}
          {previewData && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                  Hasil Deteksi Preview:
                </span>
                <div className="flex items-center gap-3 font-semibold text-slate-400">
                  <span>Periode: <strong className="text-indigo-400">{previewData.detectedDate}</strong></span>
                  <span>Total Emiten: <strong className="text-emerald-400">{previewData.validCount.toLocaleString('id-ID')} saham</strong></span>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800 text-[11px]">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-800/60 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Ticker</th>
                      <th className="px-3 py-2 text-right font-bold">Harga</th>
                      <th className="px-3 py-2 text-right font-bold">Listed Shares</th>
                      <th className="px-3 py-2 text-right font-bold">Ritel (Local ID)</th>
                      <th className="px-3 py-2 text-right font-bold">Foreign Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                    {previewData.sampleRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="px-3 py-1.5 font-bold text-white">{r.ticker}</td>
                        <td className="px-3 py-1.5 text-right">Rp {r.price.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right">{r.secNum.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right text-emerald-400">{r.localId.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right text-purple-400">{r.foreignTotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium ${
              statusMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
              statusMessage.type === 'error' ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' :
              'bg-blue-950/40 border-blue-500/40 text-blue-300'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUploadSubmit}
              disabled={isProcessing || !pastedText}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                isProcessing || !pastedText
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Menyimpan ke Database...
                </>
              ) : (
                <>
                  🚀 Proses & Simpan ke Database
                </>
              )}
            </button>
          </div>

        </div>

        {/* Upload History & Stored Periods Card */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                📅 Riwayat Periode KSEI Tersimpan
              </h2>
              <p className="text-xs text-slate-400">Daftar snapshot bulanan yang telah terdaftar di database</p>
            </div>
            <div className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              Total Saham Ter-cover: <strong className="text-emerald-400 font-black">{totalStocksWithKsei} saham</strong>
            </div>
          </div>

          {loadingPeriods ? (
            <div className="py-8 text-center text-xs text-slate-500">Memuat riwayat periode...</div>
          ) : storedPeriods.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
              Belum ada snapshot bulanan KSEI yang tersimpan di database. Silakan lakukan upload di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {storedPeriods.map((period, idx) => (
                <div key={period || idx} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">{period}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Snapshot Bulanan Aktif</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    ✓ Tersimpan
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

