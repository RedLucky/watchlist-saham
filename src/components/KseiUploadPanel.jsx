'use client';

import { useState, useEffect } from 'react';

export default function KseiUploadPanel() {
  const [activeInputMode, setActiveInputMode] = useState('paste'); // 'paste' | 'file'
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [storedPeriods, setStoredPeriods] = useState([]);
  const [totalStocksWithKsei, setTotalStocksWithKsei] = useState(0);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

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

  // Declared after fetchStoredPeriods so the call below is never a temporal-dead-zone access.
  useEffect(() => {
    void fetchStoredPeriods();
  }, []);

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

      setPastedText('');
      setFile(null);
      setPreviewData(null);
      fetchStoredPeriods();
    } catch (err) {
      console.error(err);
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ink flex items-center gap-2.5">
            ▥ Upload Data Kepemilikan KSEI
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Input snapshot bulanan KSEI untuk menghitung Market Cap resmi dan pergerakan kepemilikan saham (&Delta; + / -)
          </p>
        </div>
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
                  <h3 className="font-extrabold text-sm sm:text-base text-warn ">
                    Perhatian: Data KSEI Bulan Lalu ({prevMonthName} {prevYear}) Belum Diunggah!
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-warn text-warn">
                    Perlu Tindakan
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-warn leading-relaxed">
                  Data kepemilikan efek untuk akhir periode <strong>{prevMonthName} {prevYear}</strong> belum terdaftar di database. Harap unduh data resmi dari portal KSEI lalu unggah melalui formulir di bawah ini agar pergerakan akumulasi bandarmologi &amp; kepemilikan ritel tetap mutakhir.
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
                <h3 className="font-bold text-xs sm:text-sm text-up ">
                  Data KSEI Periode Terakhir ({prevMonthName} {prevYear}) Sudah Terunggah
                </h3>
                <p className="text-[11px] text-up ">
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

      {/* Info Card */}
      <div className="p-4 rounded-md bg-sunken border border-line text-xs sm:text-sm text-ink flex items-start gap-3 shadow-sm">
        <span className="text-xl">✦</span>
        <div className="space-y-1">
          <p className="font-bold text-ink ">Panduan Input Bulanan:</p>
          <p className="text-muted text-xs leading-relaxed">
            Format yang didukung adalah teks pemisah pipa (<code className="bg-sunken px-1 py-0.5 rounded text-ink font-mono">Date|Code|Type|Sec. Num|Price|...</code>). 
            Sistem secara otomatis menghitung selisih pergerakan kepemilikan ($+ / -$) terhadap bulan sebelumnya dan menyimpannya ke riwayat time-series tanpa menimpa data masa lalu.
          </p>
        </div>
      </div>

      {/* Main Upload Box */}
      <div className="bg-surface border border-line rounded-md p-5 sm:p-6 space-y-5 shadow-xl">
        
        {/* Mode Switcher */}
        <div className="flex bg-sunken p-1 rounded-sm border border-line w-max">
          <button
            onClick={() => setActiveInputMode('paste')}
            className={`px-4 py-2 text-xs font-bold rounded-sm transition-all ${
 activeInputMode === 'paste' ? 'bg-accent text-on-accent shadow-md' : 'text-muted hover:text-ink '
 }`}
          >
            ▤ Paste Teks Mentah
          </button>
          <button
            onClick={() => setActiveInputMode('file')}
            className={`px-4 py-2 text-xs font-bold rounded-sm transition-all ${
 activeInputMode === 'file' ? 'bg-accent text-on-accent shadow-md' : 'text-muted hover:text-ink '
 }`}
          >
            ▤ Upload File (.txt / .csv)
          </button>
        </div>

        {/* Paste Mode */}
        {activeInputMode === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink ">Tempelkan Data KSEI di Bawah Ini:</label>
            <textarea
              value={pastedText}
              onChange={handleTextChange}
              placeholder="Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|...&#10;31-JUL-2026|AADI|EQUITY|7786891760|9225|127413578|...&#10;31-JUL-2026|AALI|EQUITY|1924688333|6875|72828116|..."
              rows={8}
              className="w-full bg-sunken border border-line focus:border-accent rounded-sm p-3.5 text-xs font-mono text-ink placeholder:text-muted focus:outline-none transition-all resize-y"
            />
          </div>
        )}

        {/* File Upload Mode */}
        {activeInputMode === 'file' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink ">Pilih File Teks KSEI:</label>
            <div className="border-2 border-dashed border-line hover:border-accent rounded-md p-8 text-center transition-all bg-sunken ">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="ksei-file-input-panel"
              />
              <label htmlFor="ksei-file-input-panel" className="cursor-pointer space-y-2 block">
                <div className="text-4xl">▤</div>
                <div className="text-sm font-bold text-ink ">
                  {file ? file.name : 'Klik untuk memilih file teks atau seret ke sini'}
                </div>
                <p className="text-xs text-muted">Mendukung file teks .txt atau .csv</p>
              </label>
            </div>
          </div>
        )}

        {/* Live Preview */}
        {previewData && (
          <div className="bg-sunken border border-line rounded-sm p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-up inline-block animate-ping"></span>
                Hasil Deteksi Preview:
              </span>
              <div className="flex items-center gap-3 font-semibold text-muted ">
                <span>Periode: <strong className="text-ink ">{previewData.detectedDate}</strong></span>
                <span>Total Emiten: <strong className="text-up ">{previewData.validCount.toLocaleString('id-ID')} saham</strong></span>
              </div>
            </div>

            {/* Sample Table */}
            <div className="overflow-x-auto rounded-sm border border-line text-[11px]">
              <table className="min-w-full divide-y divide-line ">
                <thead className="bg-sunken text-muted ">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Ticker</th>
                    <th className="px-3 py-2 text-right font-bold">Harga</th>
                    <th className="px-3 py-2 text-right font-bold">Listed Shares</th>
                    <th className="px-3 py-2 text-right font-bold">Ritel (Local ID)</th>
                    <th className="px-3 py-2 text-right font-bold">Foreign Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-ink ">
                  {previewData.sampleRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-sunken ">
                      <td className="px-3 py-1.5 font-bold text-ink ">{r.ticker}</td>
                      <td className="px-3 py-1.5 text-right">Rp {r.price.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right">{r.secNum.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-up ">{r.localId.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-ink ">{r.foreignTotal.toLocaleString()}</td>
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
 statusMessage.type === 'success' ? 'bg-up-soft border-up text-up ' :
 statusMessage.type === 'error' ? 'bg-down-soft border-down text-down ' :
 'bg-sunken border-line text-ink '
 }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Submit Button */}
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

      {/* Stored Periods History */}
      <div className="bg-surface border border-line rounded-md p-5 sm:p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              ▦ Riwayat Periode KSEI Tersimpan
            </h3>
            <p className="text-xs text-muted ">Daftar snapshot bulanan yang telah terdaftar di database</p>
          </div>
          <div className="text-xs font-bold text-ink bg-sunken px-3 py-1.5 rounded-sm border border-line ">
            Total Saham Ter-cover: <strong className="text-up font-black">{totalStocksWithKsei} saham</strong>
          </div>
        </div>

        {loadingPeriods ? (
          <div className="py-8 text-center text-xs text-muted">Memuat riwayat periode...</div>
        ) : storedPeriods.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted bg-sunken rounded-sm border border-line ">
            Belum ada snapshot bulanan KSEI yang tersimpan di database. Silakan lakukan upload di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {storedPeriods.map((period, idx) => (
              <div key={period || idx} className="p-3.5 bg-sunken border border-line rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-ink ">{period}</div>
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
  );
}

