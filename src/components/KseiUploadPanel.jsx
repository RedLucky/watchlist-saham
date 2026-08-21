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

  useEffect(() => {
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
      setStatusMessage({ type: 'error', text: err.message || 'Terjadi kesalahan saat memproses data.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            🏛️ Upload Data Kepemilikan KSEI
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Input snapshot bulanan KSEI untuk menghitung Market Cap resmi dan pergerakan kepemilikan saham ($\Delta + / -$)
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 flex items-start gap-3 shadow-sm">
        <span className="text-xl">💡</span>
        <div className="space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">Panduan Input Bulanan:</p>
          <p className="text-slate-600 dark:text-indigo-200/90 text-xs leading-relaxed">
            Format yang didukung adalah teks pemisah pipa (<code className="bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-mono">Date|Code|Type|Sec. Num|Price|...</code>). 
            Sistem secara otomatis menghitung selisih pergerakan kepemilikan ($+ / -$) terhadap bulan sebelumnya dan menyimpannya ke riwayat time-series tanpa menimpa data masa lalu.
          </p>
        </div>
      </div>

      {/* Main Upload Box */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        
        {/* Mode Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 w-max">
          <button
            onClick={() => setActiveInputMode('paste')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeInputMode === 'paste' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📋 Paste Teks Mentah
          </button>
          <button
            onClick={() => setActiveInputMode('file')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeInputMode === 'file' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📁 Upload File (.txt / .csv)
          </button>
        </div>

        {/* Paste Mode */}
        {activeInputMode === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempelkan Data KSEI di Bawah Ini:</label>
            <textarea
              value={pastedText}
              onChange={handleTextChange}
              placeholder="Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|...&#10;31-JUL-2026|AADI|EQUITY|7786891760|9225|127413578|...&#10;31-JUL-2026|AALI|EQUITY|1924688333|6875|72828116|..."
              rows={8}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-all resize-y"
            />
          </div>
        )}

        {/* File Upload Mode */}
        {activeInputMode === 'file' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih File Teks KSEI:</label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 dark:bg-slate-950/50">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="ksei-file-input-panel"
              />
              <label htmlFor="ksei-file-input-panel" className="cursor-pointer space-y-2 block">
                <div className="text-4xl">📄</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  {file ? file.name : 'Klik untuk memilih file teks atau seret ke sini'}
                </div>
                <p className="text-xs text-slate-400">Mendukung file teks .txt atau .csv</p>
              </label>
            </div>
          </div>
        )}

        {/* Live Preview */}
        {previewData && (
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Hasil Deteksi Preview:
              </span>
              <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-400">
                <span>Periode: <strong className="text-indigo-600 dark:text-indigo-400">{previewData.detectedDate}</strong></span>
                <span>Total Emiten: <strong className="text-emerald-600 dark:text-emerald-400">{previewData.validCount.toLocaleString('id-ID')} saham</strong></span>
              </div>
            </div>

            {/* Sample Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Ticker</th>
                    <th className="px-3 py-2 text-right font-bold">Harga</th>
                    <th className="px-3 py-2 text-right font-bold">Listed Shares</th>
                    <th className="px-3 py-2 text-right font-bold">Ritel (Local ID)</th>
                    <th className="px-3 py-2 text-right font-bold">Foreign Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono text-slate-700 dark:text-slate-300">
                  {previewData.sampleRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                      <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white">{r.ticker}</td>
                      <td className="px-3 py-1.5 text-right">Rp {r.price.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right">{r.secNum.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{r.localId.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-purple-600 dark:text-purple-400">{r.foreignTotal.toLocaleString()}</td>
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
            statusMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300' :
            statusMessage.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300' :
            'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-300'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleUploadSubmit}
            disabled={isProcessing || !pastedText}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
              isProcessing || !pastedText
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
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

      {/* Stored Periods History */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              📅 Riwayat Periode KSEI Tersimpan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daftar snapshot bulanan yang telah terdaftar di database</p>
          </div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            Total Saham Ter-cover: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{totalStocksWithKsei} saham</strong>
          </div>
        </div>

        {loadingPeriods ? (
          <div className="py-8 text-center text-xs text-slate-400">Memuat riwayat periode...</div>
        ) : storedPeriods.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/50">
            Belum ada snapshot bulanan KSEI yang tersimpan di database. Silakan lakukan upload di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {storedPeriods.map((period, idx) => (
              <div key={period || idx} className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">{period}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Snapshot Bulanan Aktif</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
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

