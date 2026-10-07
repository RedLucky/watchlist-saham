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
  const [currentUser, setCurrentUser] = useState(null);
  const [adminKey, setAdminKey] = useState('');

  // Fetch auth & existing stored periods
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchStoredPeriods();
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
        headers: {
          'Content-Type': 'text/plain',
          ...(adminKey.trim() ? { 'x-admin-key': adminKey.trim() } : {}),
        },
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
      fetchStoredPeriods();
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
    <div className="min-h-screen bg-canvas text-ink p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Breadcrumb & Title */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-muted">Admin</span>
              <span>/</span>
              <span className="text-ink font-bold">KSEI Ingestion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink flex items-center gap-3">
              ▥ Upload Data Kepemilikan KSEI
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Manajemen Data Time-Series, Struktur Saham & Bandarmologi Bulanan
            </p>
          </div>

          <Link
            href="/"
            className="btn-secondary"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>

        {/* Admin Authorization Box */}
        <div className="p-4 rounded-md bg-surface border border-line shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⊘</span>
            <div>
              <span className="text-xs font-bold text-ink block">Status Akses Administratif</span>
              <span className="text-[11px] text-muted">
                {currentUser 
                  ? `Terotentikasi sebagai ${currentUser.name} (${currentUser.email})`
                  : 'Memerlukan sesi login atau Admin Secret Key untuk ingest data.'}
              </span>
            </div>
          </div>
          {!currentUser && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="admin-key" className="sr-only">Admin Key</label>
              <input
                id="admin-key"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Masukkan Admin Key..."
                autoComplete="off"
                className="input font-mono min-h-9 py-1.5 text-xs w-full sm:w-48"
              />
            </div>
          )}
        </div>

        {/* Previous Month Upload Requirement Alert Banner */}
        {!loadingPeriods && (
          !hasLastMonthData ? (
            <div className="p-4 sm:p-5 rounded-md bg-warn-soft border border-warn text-warn shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <span className="text-2xl sm:text-3xl p-2 bg-warn-soft rounded-sm border border-warn flex-shrink-0">
                  ▲
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-sm sm:text-base text-warn">
                      Perhatian: Data KSEI Bulan Lalu ({prevMonthName} {prevYear}) Belum Diunggah!
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-warn text-warn">
                      Perlu Tindakan
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-warn leading-relaxed">
                    Data kepemilikan efek untuk akhir periode <strong>{prevMonthName} {prevYear}</strong> belum terdaftar di database. Harap unduh data resmi dari portal KSEI lalu unggah melalui formulir di bawah ini agar pergerakan akumulasi bandarmologi & kepemilikan ritel tetap mutakhir.
                  </p>
                </div>
              </div>

              <a
                href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full sm:w-auto whitespace-nowrap flex-shrink-0"
              >
                <span>⇩</span>
                <span>Unduh Data di Portal KSEI</span>
                <span className="text-xs">↗</span>
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-up-soft border border-up text-up shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="text-xl p-1.5 bg-up-soft rounded-sm border border-up">
                  ✓
                </span>
                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-up">
                    Data KSEI Periode Terakhir ({prevMonthName} {prevYear}) Sudah Terunggah
                  </h2>
                  <p className="text-[11px] text-up">
                    Sistem telah memiliki snapshot kepemilikan efek mutakhir untuk analisis time-series bandarmologi.
                  </p>
                </div>
              </div>

              <a
                href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-up hover:text-up font-bold flex items-center gap-1 hover:underline whitespace-nowrap self-end sm:self-center"
              >
                <span>Portal Publikasi KSEI ↗</span>
              </a>
            </div>
          )
        )}

        {/* Info Banner with Direct Download Guide */}
        <div className="p-4 rounded-md bg-sunken border border-line text-xs sm:text-sm text-ink flex items-start gap-3 shadow-lg">
          <span className="text-xl flex-shrink-0">✦</span>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-bold text-ink">Panduan & Sumber Data Resmi KSEI:</p>
              <a
                href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-sunken hover:bg-accent text-ink hover:text-ink border border-line text-xs font-bold transition-colors"
              >
                <span>◎ Buka Portal KSEI (Data & Statistik)</span>
                <span>↗</span>
              </a>
            </div>
            <p className="text-ink text-xs leading-relaxed">
              1. Buka tautan <a href="https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1" target="_blank" rel="noopener noreferrer" className="text-ink font-bold underline hover:text-ink">Portal Publikasi KSEI</a> dan pilih dokumen <strong>Data Kepemilikan Efek (Saham)</strong> pada tanggal akhir bulan.<br />
              2. Buka file hasil unduhan (.txt atau .csv), lalu salin seluruh isinya atau langsung unggah filenya di bawah ini.<br />
              3. Format pemisah pipa (<code className="bg-sunken px-1 py-0.5 rounded text-ink font-mono">Date|Code|Type|Sec. Num|Price|...</code>) akan diurai secara otomatis dan menghitung perubahan delta kepemilikan ($+/-$).
            </p>
          </div>
        </div>

        {/* Upload Container */}
        <div className="bg-surface border border-line rounded-md p-5 sm:p-6 space-y-5 shadow-2xl">
          
          {/* Mode Switcher */}
          <div className="flex bg-surface p-1 rounded-sm border border-line w-max">
            <button
              onClick={() => setActiveInputMode('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-all ${
 activeInputMode === 'paste' ? 'bg-accent text-ink shadow-md' : 'text-muted hover:text-ink'
 }`}
            >
              ▤ Paste Teks Mentah
            </button>
            <button
              onClick={() => setActiveInputMode('file')}
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-all ${
 activeInputMode === 'file' ? 'bg-accent text-ink shadow-md' : 'text-muted hover:text-ink'
 }`}
            >
              ▤ Upload File (.txt / .csv)
            </button>
          </div>

          {/* Paste Mode */}
          {activeInputMode === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted">Tempelkan Data KSEI di Bawah Ini:</label>
              <label htmlFor="ksei-paste" className="sr-only">Teks data KSEI</label>
              <textarea
                id="ksei-paste"
                value={pastedText}
                onChange={handleTextChange}
                placeholder="Date|Code|Type|Sec. Num|Price|...&#10;31-JUL-2026|AADI|EQUITY|7786891760|9225|..."
                rows={8}
                className="input font-mono text-xs resize-y min-h-[160px]"
              />
            </div>
          )}

          {/* File Upload Mode */}
          {activeInputMode === 'file' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted">Pilih File Teks KSEI:</label>
              <div className="border-2 border-dashed border-line hover:border-accent rounded-md p-8 text-center transition-all bg-surface">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="ksei-file-input"
                />
                <label htmlFor="ksei-file-input" className="cursor-pointer space-y-2 block">
                  <div className="text-4xl">▤</div>
                  <div className="text-sm font-bold text-ink">
                    {file ? file.name : 'Klik untuk memilih file teks atau seret ke sini'}
                  </div>
                  <p className="text-xs text-muted">Mendukung format .txt atau .csv dari KSEI</p>
                </label>
              </div>
            </div>
          )}

          {/* Live Preview & Stats */}
          {previewData && (
            <div className="bg-surface border border-line rounded-sm p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-up inline-block animate-ping"></span>
                  Hasil Deteksi Preview:
                </span>
                <div className="flex items-center gap-3 font-semibold text-muted">
                  <span>Periode: <strong className="text-ink">{previewData.detectedDate}</strong></span>
                  <span>Total Emiten: <strong className="text-up">{previewData.validCount.toLocaleString('id-ID')} saham</strong></span>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="overflow-x-auto rounded-sm border border-line text-[11px]">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-sunken text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Ticker</th>
                      <th className="px-3 py-2 text-right font-bold">Harga</th>
                      <th className="px-3 py-2 text-right font-bold">Listed Shares</th>
                      <th className="px-3 py-2 text-right font-bold">Ritel (Local ID)</th>
                      <th className="px-3 py-2 text-right font-bold">Foreign Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono text-muted">
                    {previewData.sampleRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-surface">
                        <td className="px-3 py-1.5 font-bold text-ink">{r.ticker}</td>
                        <td className="px-3 py-1.5 text-right">Rp {r.price.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right">{r.secNum.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right text-up">{r.localId.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-right text-ink">{r.foreignTotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3.5 rounded-sm border text-xs sm:text-sm font-medium ${
 statusMessage.type === 'success' ? 'bg-up-soft border-up text-up' :
 statusMessage.type === 'error' ? 'bg-down-soft border-down text-down' :
 'bg-sunken border-accent text-ink'
 }`}>
              {statusMessage.text}
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUploadSubmit}
              disabled={isProcessing || !pastedText}
              className="btn-primary min-h-11 text-sm"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-line border-t-on-accent rounded-full animate-spin"></span>
                  Menyimpan ke Database...
                </>
              ) : (
                <>
                  ↑ Proses & Simpan ke Database
                </>
              )}
            </button>
          </div>

        </div>

        {/* Upload History & Stored Periods Card */}
        <div className="bg-surface border border-line rounded-md p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                ▦ Riwayat Periode KSEI Tersimpan
              </h2>
              <p className="text-xs text-muted">Daftar snapshot bulanan yang telah terdaftar di database</p>
            </div>
            <div className="text-xs font-bold text-muted bg-surface px-3 py-1.5 rounded-sm border border-line">
              Total Saham Ter-cover: <strong className="text-up font-black">{totalStocksWithKsei} saham</strong>
            </div>
          </div>

          {loadingPeriods ? (
            <div className="py-8 text-center text-xs text-muted">Memuat riwayat periode...</div>
          ) : storedPeriods.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted bg-surface rounded-sm border border-line">
              Belum ada snapshot bulanan KSEI yang tersimpan di database. Silakan lakukan upload di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {storedPeriods.map((period, idx) => (
                <div key={period || idx} className="p-3.5 bg-surface border border-line rounded-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-ink">{period}</div>
                    <div className="text-[10px] text-muted mt-0.5">Snapshot Bulanan Aktif</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-up-soft text-up font-bold border border-up">
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
