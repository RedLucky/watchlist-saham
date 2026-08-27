'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import StockChart from './StockChart';

function getNominalChange(price, changePercent) {
  if (!price || changePercent == null || !Number.isFinite(price) || !Number.isFinite(changePercent)) return 0;
  const prevClose = price / (1 + changePercent / 100);
  return Math.round(price - prevClose);
}

function getAlgorithmicRecommendation({ stockDetail, scores }) {
  if (!stockDetail) return { label: 'Analisis Data...', desc: 'Sedang memuat data emiten', bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' };
  
  const f = stockDetail.fundamentals || {};
  const t = stockDetail.technicals || {};
  const proj = stockDetail.projections || {};
  const vol = stockDetail.volumeAnalysis || {};
  const b = stockDetail.bandarmologi || {};
  
  const fScore = scores?.fundamental ?? 50;
  const tScore = scores?.technical ?? 50;
  const trendScore = scores?.trending ?? 50;
  const smartMoneyScore = scores?.smartMoney ?? 50;
  // Bobot Terkalibrasi: Fundamental 45% (Utama), Teknikal 35% (Kedua), Tren 10%, Bandarmologi (KSEI bulanan) 10%
  const composite = Math.round((fScore * 0.45) + (tScore * 0.35) + (trendScore * 0.10) + (smartMoneyScore * 0.10));

  // 1. Strong Accumulate
  if (composite >= 75 || (composite >= 70 && ((b.bfiScore || 0) >= 2 || b.smartMoneyStatus?.includes('Inflow')))) {
    return {
      label: 'Strong Accumulate 🚀',
      desc: 'Sinergi fundamental solid, akumulasi smart money, dan tren teknikal prima.',
      bgClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
    };
  }

  // 2. Value Buy / Undervalued Gems
  if ((proj.marginOfSafety || 0) >= 20 && (f.piotroskiFScore || 0) >= 5 && (f.der || 0) <= 2) {
    return {
      label: 'Value Buy (Undervalued) 💎',
      desc: `Diskon MoS +${proj.marginOfSafety}% di bawah Nilai Wajar (Fair Value Rp ${proj.fairValue?.toLocaleString('id-ID') || '-'}) dengan neraca aman.`,
      bgClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/60'
    };
  }

  // 3. Breakout / Momentum Speculative
  if (tScore >= 70 && (vol.isBreakoutVolume || (vol.volumeSpikeRatio || 0) >= 1.5)) {
    return {
      label: 'Breakout / Momentum Buy ⚡',
      desc: `Konfirmasi breakout dengan lonjakan volume ${vol.volumeSpikeRatio || 1.5}x di atas rata-rata.`,
      bgClass: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60'
    };
  }

  // 4. Dividend Play / Income
  if ((f.dividendYield || 0) >= 4.5 && (f.payoutRatio || 0) <= 85) {
    return {
      label: 'Dividend Aristocrat 🏛️',
      desc: `Yield dividen tinggi ${f.dividendYield.toFixed(1)}% dengan payout ratio sehat dan konsisten.`,
      bgClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
    };
  }

  // 5. Buy on Weakness / Pullback
  if (composite >= 55 && (t.rsi14 || 50) <= 45 && !b.smartMoneyStatus?.includes('Outflow')) {
    return {
      label: 'Buy on Weakness (Pullback) 🎯',
      desc: 'Harga sedang terkoreksi sehat mendekati area support MA20/MA50 untuk entry bertahap.',
      bgClass: 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60'
    };
  }

  // 6. Take Profit / Overbought
  if ((t.rsi14 || 50) >= 75 || (proj.marginOfSafety || 0) < -35) {
    return {
      label: 'Take Profit / Overbought 💰',
      desc: `RSI jenuh beli (${t.rsi14 ? t.rsi14.toFixed(1) : 75}) atau valuasi telah melampaui harga wajar.`,
      bgClass: 'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-700/60'
    };
  }

  // 7. Waspada Distribusi
  if (b.smartMoneyStatus?.includes('Outflow') || (b.bfiScore || 0) <= -2.5) {
    return {
      label: 'Waspada Distribusi ⚠️',
      desc: 'Terdeteksi pelepasan posisi (net outflow) oleh institusi / smart money.',
      bgClass: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60'
    };
  }

  // 8. Avoid / Sell
  if (composite < 40 || ((f.altmanZScore || 3) < 1.5 && (f.der || 0) > 3)) {
    return {
      label: 'Avoid / High Risk 🔴',
      desc: 'Fundamental dan teknikal berisiko tinggi dengan rasio utang/kesehatan keuangan rawan.',
      bgClass: 'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-700/60'
    };
  }

  // 9. Default Watchlist / Neutral
  return {
    label: 'Watchlist / Hold 🔍',
    desc: 'Metrik dalam rentang netral. Pantau perkembangan volume dan sinyal teknikal lanjutan.',
    bgClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800/90 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
  };
}

export default function StockExplorer({ user }) {
  // Search & Stock Data State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTickers, setAllTickers] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetail, setStockDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Collections State
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionItems, setCollectionItems] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionEmoji, setNewCollectionEmoji] = useState('📁');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [isCollectionPublic, setIsCollectionPublic] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [stockNote, setStockNote] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [copiedShareCode, setCopiedShareCode] = useState(null);

  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Load all stock tickers for quick autocomplete
  useEffect(() => {
    async function loadTickers() {
      try {
        const res = await fetch('/api/stocks?all=true');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAllTickers(data);
          } else if (data?.stocks && Array.isArray(data.stocks)) {
            setAllTickers(data.stocks);
          }
        }
      } catch (err) {
        console.error('Failed to load tickers for search:', err);
      }
    }
    loadTickers();
  }, []);

  // Fetch Collections
  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedCollection) {
          setSelectedCollection(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  }, [selectedCollection]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch Collection Items when collection changes
  const fetchCollectionItems = useCallback(async (collectionId) => {
    if (!collectionId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/collections/items?collectionId=${collectionId}`);
      if (res.ok) {
        const data = await res.json();
        setCollectionItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch collection items:', err);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCollection?.id) {
      fetchCollectionItems(selectedCollection.id);
    } else {
      setCollectionItems([]);
    }
  }, [selectedCollection, fetchCollectionItems]);

  // Autocomplete Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const q = searchQuery.toUpperCase().trim();
    const filtered = allTickers
      .filter(s => (s.ticker && s.ticker.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q)))
      .slice(0, 8);
    setSuggestions(filtered);
  }, [searchQuery, allTickers]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch single stock detail
  const handleSelectStock = async (ticker) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');
    setSelectedStock(cleanTicker);
    setSuggestions([]);
    setSearchQuery(cleanTicker);
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await fetch(`/api/stocks/${cleanTicker}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat data saham');
      }
      const data = await res.json();
      setStockDetail(data);
    } catch (err) {
      setDetailError(err.message);
      setStockDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create Collection
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          emoji: newCollectionEmoji || '📁',
          description: newCollectionDesc.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal membuat koleksi');
        return;
      }

      const created = await res.json();
      setShowCreateModal(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setNewCollectionEmoji('📁');
      await fetchCollections();
      setSelectedCollection(created);
    } catch (err) {
      alert('Terjadi kesalahan saat membuat koleksi');
    }
  };

  // Update Collection
  const handleUpdateCollection = async (e) => {
    e.preventDefault();
    if (!editingCollection?.id || !newCollectionName.trim()) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCollection.id,
          name: newCollectionName.trim(),
          emoji: newCollectionEmoji || '📁',
          description: newCollectionDesc.trim() || null,
          isPublic: isCollectionPublic,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal memperbarui koleksi');
        return;
      }

      const updated = await res.json();
      setShowEditModal(false);
      setEditingCollection(null);
      await fetchCollections();
      setSelectedCollection(updated);
    } catch (err) {
      alert('Terjadi kesalahan saat memperbarui koleksi');
    }
  };

  // Delete Collection
  const handleDeleteCollection = async (collectionId, name) => {
    if (!confirm(`Hapus koleksi "${name}"? Semua saham di dalamnya akan ikut terhapus.`)) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: collectionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus koleksi');
        return;
      }

      setSelectedCollection(null);
      await fetchCollections();
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus koleksi');
    }
  };

  // Save Stock to Collection
  const handleSaveStockToCollection = async (e) => {
    e.preventDefault();
    if (!targetCollectionId || !selectedStock) return;

    try {
      const res = await fetch('/api/collections/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: parseInt(targetCollectionId, 10),
          ticker: selectedStock,
          notes: stockNote.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan saham');
        return;
      }

      setShowSaveModal(false);
      setStockNote('');
      alert(`✅ Saham ${selectedStock} berhasil disimpan ke koleksi!`);
      await fetchCollections();
      if (selectedCollection?.id === parseInt(targetCollectionId, 10)) {
        fetchCollectionItems(selectedCollection.id);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan saham');
    }
  };

  // Remove Stock from Collection
  const handleRemoveStockFromCollection = async (collectionId, ticker) => {
    if (!confirm(`Hapus ${ticker} dari koleksi?`)) return;

    try {
      const res = await fetch('/api/collections/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, ticker }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus saham dari koleksi');
        return;
      }

      fetchCollectionItems(collectionId);
      fetchCollections();
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  // Copy share link
  const handleCopyShareLink = (shareCode) => {
    const url = `${window.location.origin}/api/collections?shareCode=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedShareCode(shareCode);
    setTimeout(() => setCopiedShareCode(null), 3000);
  };

  // Default initial search if none selected
  useEffect(() => {
    if (!selectedStock && allTickers.length > 0) {
      handleSelectStock('BBCA');
    }
  }, [allTickers]);

  const f = stockDetail?.fundamentals || {};
  const t = stockDetail?.technicals || {};
  const proj = stockDetail?.projections || {};
  const vol = stockDetail?.volumeAnalysis || {};
  const rt = stockDetail?.realTimeData || {};
  const scores = stockDetail?.scores || {};
  const b = stockDetail?.bandarmologi || {};
  const isUp = (stockDetail?.changePercent || 0) >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP SEARCH & HEADER BAR ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧭</span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stock Explorer
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Riset lengkap fundamental, valuasi, volume teknikal, bandarmologi, order book & koleksi saham
            </p>
          </div>

          {/* Search Box with Autocomplete */}
          <div className="relative flex-1 max-w-md">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    const q = searchQuery.toUpperCase().trim();
                    setSuggestions(
                      allTickers
                        .filter(s => (s.ticker && s.ticker.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q)))
                        .slice(0, 8)
                    );
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestions.length > 0) {
                    handleSelectStock(suggestions[0].ticker);
                  }
                }}
                placeholder="Cari emiten (contoh: BBCA, BBRI, TLKM)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div
                ref={searchDropdownRef}
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
              >
                {suggestions.map((s) => {
                  const suggChange = getNominalChange(s.price, s.changePercent);
                  const isSuggUp = (s.changePercent || 0) >= 0;
                  return (
                    <button
                      key={s.ticker}
                      onClick={() => handleSelectStock(s.ticker)}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white mr-2">{s.ticker}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{s.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Rp {s.price?.toLocaleString('id-ID') || '-'}
                        </div>
                        {s.changePercent != null && (
                          <div className={`text-[10px] font-bold ${isSuggUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isSuggUp ? '+' : ''}{suggChange.toLocaleString('id-ID')} ({isSuggUp ? '+' : ''}{Number(s.changePercent).toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STOCK DETAIL CONTAINER ────────────────────────────────────── */}
      {loadingDetail ? (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Mengambil data lengkap untuk <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedStock}</span>...
          </p>
          <p className="text-xs text-slate-400 mt-1">Fundamental, valuasi, volume teknikal, bandarmologi & proyeksi</p>
        </div>
      ) : detailError ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-semibold">{detailError}</p>
          <button
            onClick={() => handleSelectStock(selectedStock)}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
          >
            Coba Lagi
          </button>
        </div>
      ) : stockDetail ? (
        <div className="space-y-6">
          {/* Stock Main Banner */}
          <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 rounded-2xl p-5 md:p-6 shadow-sm dark:shadow-xl border border-slate-200 dark:border-indigo-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {stockDetail.ticker}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    {stockDetail.sector || 'IDX'}
                  </span>
                  {stockDetail.subSector && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {stockDetail.subSector}
                    </span>
                  )}
                </div>
                <h2 className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-semibold">
                  {stockDetail.name}
                </h2>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 pt-1 font-medium">
                  <span>Market Cap: {f.marketCap ? `Rp ${(f.marketCap / 1e12).toFixed(2)} T` : '-'}</span>
                  <span>•</span>
                  <span>Saham Beredar: {f.sharesOutstanding ? `${(f.sharesOutstanding / 1e9).toFixed(2)} M lembar` : '-'}</span>
                </div>
              </div>

              {/* Price & Action */}
              <div className="flex items-center gap-4 justify-between md:justify-end">
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                    Rp {stockDetail.price?.toLocaleString('id-ID')}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    {(() => {
                      const nominal = getNominalChange(stockDetail.price, stockDetail.changePercent);
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            isUp 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' 
                              : 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                          }`}
                        >
                          <span>{isUp ? '▲' : '▼'}</span>
                          <span>{isUp ? '+' : ''}{nominal.toLocaleString('id-ID')}</span>
                          <span>({isUp ? '+' : ''}{stockDetail.changePercent ? Number(stockDetail.changePercent).toFixed(2) : 0}%)</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (collections.length === 0) {
                        setShowCreateModal(true);
                      } else {
                        setTargetCollectionId(collections[0].id.toString());
                        setShowSaveModal(true);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>💾</span> Simpan ke Koleksi
                  </button>
                  <button
                    onClick={() => handleSelectStock(stockDetail.ticker)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-white/10 text-center flex items-center justify-center gap-1"
                    title="Refresh data & sinkronisasi"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 8-CARD ANALYSIS GRID (4 COLUMNS × 2 ROWS) ────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: VALUASI */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Valuasi Harga
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (proj.marginOfSafety || 0) > 15 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : (proj.marginOfSafety || 0) < -15 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}>
                    {(proj.marginOfSafety || 0) > 15 ? 'Undervalued ✅' : (proj.marginOfSafety || 0) < -15 ? 'Overvalued 🔴' : 'Wajar ⚠️'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">PER (TTM):</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{f.per ? `${f.per.toFixed(2)}x` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">PBV:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{f.pbv ? `${f.pbv.toFixed(2)}x` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">PEG Ratio:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {f.per && proj.cagrPercent && proj.cagrPercent > 0 
                        ? (f.per / proj.cagrPercent).toFixed(2) 
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Graham Number:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {proj.grahamNumber ? `Rp ${proj.grahamNumber.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Fair Value (DCF):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {proj.fairValue ? `Rp ${proj.fairValue.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Margin of Safety:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{proj.marginOfSafety != null ? `${proj.marginOfSafety}%` : '-'}</span>
              </div>
            </div>

            {/* CARD 2: GROWTH & PROYEKSI */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📈</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Growth & Proyeksi
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    12 Bulan
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Revenue Growth:</span>
                    <span className={`font-bold ${f.revenueGrowth > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {f.revenueGrowth != null ? `${f.revenueGrowth.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Profit CAGR (3th):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {proj.cagrPercent != null ? `+${proj.cagrPercent}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Target Harga 12M:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      {proj.projectedPrice12m ? `Rp ${proj.projectedPrice12m.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Potensi Upside:</span>
                    <span className={`font-bold ${proj.projectedUpside >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {proj.projectedUpside != null ? `${proj.projectedUpside >= 0 ? '+' : ''}${proj.projectedUpside}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Tren Laba:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {Array.isArray(f.netProfit) && f.netProfit.length >= 2 && f.netProfit[f.netProfit.length - 1] > f.netProfit[0] ? 'Bertumbuh 🚀' : 'Fluktuatif ⚖️'}
                </span>
              </div>
            </div>

            {/* CARD 3: DIVIDEN */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏛️</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Dividen
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    Yield {f.dividendYield ? `${f.dividendYield.toFixed(1)}%` : '0%'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Dividend Yield:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {f.dividendYield ? `${f.dividendYield.toFixed(2)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Payout Ratio (DPR):</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {f.payoutRatio ? `${f.payoutRatio.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Streak Dividen:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {f.dividendStreakYears ? `${f.dividendStreakYears} Tahun Beruntun` : 'Tidak rutin'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Dividen Terakhir:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {Array.isArray(stockDetail.dividendHistory) && stockDetail.dividendHistory.length > 0 
                        ? `Rp ${stockDetail.dividendHistory[0].amount || stockDetail.dividendHistory[0].dividend || '-'}` 
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Status: <span className="font-semibold text-slate-900 dark:text-slate-200">{f.dividendYield >= 5 ? 'High Dividend Aristocrat 💎' : f.dividendYield > 0 ? 'Membagikan Dividen ✅' : 'Tanpa Dividen'}</span>
              </div>
            </div>

            {/* CARD 4: ORDER BOOK & SPREAD */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Order Book & Spread
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rt.spreadPercent != null && rt.spreadPercent < 0.5 
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}>
                    {rt.spreadPercent != null && rt.spreadPercent < 0.5 ? 'Sangat Likuid ⚡' : 'Likuiditas Normal'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-center border-r border-slate-200 dark:border-slate-700 pr-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">BEST BID</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {rt.bid ? `Rp ${rt.bid.toLocaleString('id-ID')}` : '-'}
                      </span>
                      {rt.bidSize && <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{rt.bidSize} lot</span>}
                    </div>
                    <div className="text-center pl-1">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">BEST ASK</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {rt.ask ? `Rp ${rt.ask.toLocaleString('id-ID')}` : '-'}
                      </span>
                      {rt.askSize && <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{rt.askSize} lot</span>}
                    </div>
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Spread:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {rt.spread != null ? `Rp ${rt.spread} (${rt.spreadPercent}%)` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Turnover Hari Ini:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {vol.turnover ? `Rp ${(vol.turnover / 1e9).toFixed(2)} M` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Frekuensi: <span className="font-semibold text-slate-900 dark:text-slate-100">{vol.frequency ? `${vol.frequency.toLocaleString('id-ID')}x transaksi` : '-'}</span>
              </div>
            </div>

            {/* CARD 5: FUNDAMENTAL & KUALITAS */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔬</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Fundamental & Kualitas
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    f.roe != null && f.roe >= 15 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    ROE {f.roe != null ? `${Number(f.roe).toFixed(1)}%` : '-'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">ROE:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{f.roe != null ? `${Number(f.roe).toFixed(1)}%` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">DER (Hutang):</span>
                    <span className={`font-bold ${f.der != null && f.der > 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {f.der != null ? `${Number(f.der).toFixed(2)}x` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Current Ratio:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{f.currentRatio != null ? `${Number(f.currentRatio).toFixed(2)}x` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Free Cash Flow:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {f.freeCashflow != null ? `Rp ${(Number(f.freeCashflow) / 1e9).toFixed(1)} M` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Piotroski F-Score:</span>
                    <span className={`font-bold ${
                      f.piotroskiFScore != null && f.piotroskiFScore >= 7 ? 'text-emerald-600 dark:text-emerald-400' : f.piotroskiFScore != null && f.piotroskiFScore <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {f.piotroskiFScore != null ? `${f.piotroskiFScore}/9` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Altman Z-Score:</span>
                    <span className={`font-bold ${
                      f.altmanZScore != null && f.altmanZScore >= 2.99 ? 'text-emerald-600 dark:text-emerald-400' : f.altmanZScore != null && f.altmanZScore < 1.81 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {f.altmanZScore != null ? `${f.altmanZScore} (${f.altmanZScore >= 2.99 ? 'Aman' : f.altmanZScore < 1.81 ? 'Distress' : 'Abu-abu'})` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Kesehatan Neraca:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {f.altmanZScore != null && f.altmanZScore >= 2.99 ? 'Sangat Sehat 🛡️' : f.altmanZScore != null && f.altmanZScore < 1.81 ? 'Rawan ⚠️' : 'Moderat ⚖️'}
                </span>
              </div>
            </div>

            {/* CARD 6: TEKNIKAL & VOLUME */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Teknikal & Volume
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    vol.volumeSpikeRatio != null && vol.volumeSpikeRatio >= 1.5 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {vol.volumeStatus || 'Normal'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Volume Spike Ratio:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {vol.volumeSpikeRatio != null ? `${vol.volumeSpikeRatio}x rata-rata` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">RSI 14 (Momentum):</span>
                    <span className={`font-bold ${
                      t.rsi14 != null && t.rsi14 >= 70 ? 'text-rose-600 dark:text-rose-400' : t.rsi14 != null && t.rsi14 <= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {t.rsi14 != null ? `${Number(t.rsi14).toFixed(1)} (${Number(t.rsi14) >= 70 ? 'Overbought' : Number(t.rsi14) <= 30 ? 'Oversold' : 'Netral'})` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Support / Resist:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {t.support != null ? `Rp ${Math.round(t.support).toLocaleString('id-ID')}` : '-'} / {t.resistance != null ? `Rp ${Math.round(t.resistance).toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">MA20 / MA50:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {t.ma20 != null ? `${Math.round(t.ma20).toLocaleString('id-ID')}` : '-'} / {t.ma50 != null ? `${Math.round(t.ma50).toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Konfirmasi Volume:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {vol.isBreakoutVolume ? 'Breakout Volume 🔥' : 'Volume Stabil'}
                </span>
              </div>
            </div>

            {/* CARD 7: BANDARMOLOGI & FLOW */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Bandarmologi & KSEI
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (b.bfiScore || 0) >= 3 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : (b.bfiScore || 0) <= -3 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    BFI {b.bfiScore != null ? Number(b.bfiScore).toFixed(1) : '0.0'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Wyckoff Phase:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {b.wyckoffPhaseName || `Fase ${b.wyckoffPhase || 1}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Smart Money:</span>
                    <span className={`font-bold ${b.smartMoneyStatus?.includes('Inflow') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {b.smartMoneyStatus || 'Netral'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Asing (Foreign):</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {b.foreignPercent != null ? `${Number(b.foreignPercent).toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Ritel (Domestic):</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {b.retailPercent != null ? `${Number(b.retailPercent).toFixed(1)}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Dominasi: <span className="font-semibold text-slate-900 dark:text-slate-100">{(b.foreignPercent || 0) > 50 ? 'Asing (Foreign Heavy)' : 'Domestik'}</span>
              </div>
            </div>

            {/* CARD 8: SKOR KOMPOSIT & REKOMENDASI ALGORITMA */}
            {(() => {
              const rec = getAlgorithmicRecommendation({ stockDetail, scores });
              const fScore = scores.fundamental ?? 50;
              const tScore = scores.technical ?? 50;
              const trendScore = scores.trending ?? 50;
              const smartMoneyScore = scores.smartMoney ?? 50;
              // Bobot Terkalibrasi: Fundamental 45% (Utama), Teknikal 35% (Kedua), Tren 10%, Bandarmologi (KSEI bulanan) 10%
              const compScore = Math.round((fScore * 0.45) + (tScore * 0.35) + (trendScore * 0.10) + (smartMoneyScore * 0.10));
              return (
                <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎯</span>
                        <div>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-950 dark:text-indigo-300">
                            Skor Komposit
                          </h3>
                        </div>
                      </div>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {compScore}/100
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-600 dark:text-slate-400">Fundamental <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">(45% — Utama)</span>:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{fScore}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${fScore}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-600 dark:text-slate-400">Teknikal & Volume <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">(35% — Kedua)</span>:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{tScore}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${tScore}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-600 dark:text-slate-400">Momentum / Tren <span className="text-[10px] text-slate-400">(10%)</span>:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{trendScore}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${trendScore}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-600 dark:text-slate-400">Bandarmologi / KSEI <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">(10%)</span>:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{smartMoneyScore}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${smartMoneyScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-indigo-200/80 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Rekomendasi Algoritma:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${rec.bgClass}`}>
                        {rec.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                      {rec.desc}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── INTERACTIVE CANDLESTICK CHART ────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                    Grafik Interaktif — {stockDetail.ticker}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Candlestick, Volume, Moving Averages (MA20/50) & Support/Resistance</p>
                </div>
              </div>
            </div>
            <div className="w-full">
              <StockChart key={stockDetail.ticker} ticker={stockDetail.ticker} />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── KOLEKSI SAYA (COLLECTIONS MANAGEMENT) ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📂</span>
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                Koleksi Saham Saya
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Simpan dan kelompokkan saham hasil riset ke dalam koleksi pribadi (maks 50 koleksi)
            </p>
          </div>

          <button
            onClick={() => {
              setNewCollectionName('');
              setNewCollectionDesc('');
              setNewCollectionEmoji('📁');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <span>+</span> Buat Koleksi Baru
          </button>
        </div>

        {/* Collections List Pills/Cards */}
        {loadingCollections ? (
          <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">Memuat koleksi...</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <span className="text-3xl block mb-2">📁</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Belum ada koleksi yang dibuat</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Klik &quot;Buat Koleksi Baru&quot; untuk mulai mengelompokkan saham favorit Anda, misalnya &quot;Blue Chip Dividen&quot; atau &quot;Growth Watchlist&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {collections.map((col) => {
              const isSelected = selectedCollection?.id === col.id;
              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollection(col)}
                  className={`cursor-pointer rounded-xl p-3.5 border transition-all relative group text-left ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{col.emoji || '📁'}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCollection(col);
                          setNewCollectionName(col.name);
                          setNewCollectionEmoji(col.emoji || '📁');
                          setNewCollectionDesc(col.description || '');
                          setIsCollectionPublic(col.isPublic || false);
                          setShowEditModal(true);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                        title="Edit Koleksi"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(col.id, col.name);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded"
                        title="Hapus Koleksi"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white mt-2 line-clamp-1">
                    {col.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    <span>{col._count?.items || 0} Saham</span>
                    {col.isPublic && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">🌐 Publik</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Collection Stocks Table / 4-Column Cards */}
        {selectedCollection && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedCollection.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                    Isi Koleksi: {selectedCollection.name}
                  </h3>
                  {selectedCollection.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{selectedCollection.description}</p>
                  )}
                </div>
              </div>

              {selectedCollection.shareCode && (
                <button
                  onClick={() => handleCopyShareLink(selectedCollection.shareCode)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  🔗 {copiedShareCode === selectedCollection.shareCode ? 'Link Tersalin! ✅' : 'Bagikan Koleksi'}
                </button>
              )}
            </div>

            {loadingItems ? (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">Memuat saham dalam koleksi...</div>
            ) : collectionItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                Koleksi ini masih kosong. Cari saham di atas lalu klik &quot;Simpan ke Koleksi&quot;.
              </div>
            ) : (
              /* 4-COLUMN CARDS GRID FOR SAVED STOCKS */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {collectionItems.map((item) => {
                  const s = item.stock || {};
                  const isItemUp = (s.changePercent || 0) >= 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 hover:border-indigo-400/60 shadow-sm transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-900 dark:text-white">{item.ticker}</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[90px]">{s.sector || ''}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSelectStock(item.ticker)}
                              className="text-xs p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                              title="Lihat Detail Saham"
                            >
                              🔍
                            </button>
                            <button
                              onClick={() => handleRemoveStockFromCollection(selectedCollection.id, item.ticker)}
                              className="text-xs p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                              title="Hapus dari Koleksi"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            Rp {s.price ? s.price.toLocaleString('id-ID') : '-'}
                          </span>
                          {(() => {
                            const itemNominal = getNominalChange(s.price, s.changePercent);
                            return (
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                  isItemUp ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                }`}
                              >
                                <span>{isItemUp ? '+' : ''}{itemNominal.toLocaleString('id-ID')}</span>
                                <span>({isItemUp ? '+' : ''}{s.changePercent ? Number(s.changePercent).toFixed(2) : 0}%)</span>
                              </span>
                            );
                          })()}
                        </div>

                        {item.notes && (
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 line-clamp-2">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Ditambahkan: {new Date(item.addedAt).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: CREATE COLLECTION ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">📁 Buat Koleksi Baru</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Koleksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Saham Dividen Aristokrat, Blue Chip 2026..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Emoji</label>
                  <select
                    value={newCollectionEmoji}
                    onChange={(e) => setNewCollectionEmoji(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg text-center"
                  >
                    <option value="📁">📁</option>
                    <option value="⭐">⭐</option>
                    <option value="💰">💰</option>
                    <option value="🚀">🚀</option>
                    <option value="🏦">🏦</option>
                    <option value="💎">💎</option>
                    <option value="👑">👑</option>
                    <option value="🔥">🔥</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan ringkas tujuan koleksi..."
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  Buat Koleksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SAVE STOCK TO COLLECTION ──────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                💾 Simpan {selectedStock} ke Koleksi
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveStockToCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Koleksi</label>
                <select
                  required
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.emoji} {col.name} ({col._count?.items || 0} saham)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Saham (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Rencana beli di support Rp 9.800, target dividen yield 4%..."
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  Simpan Saham
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT COLLECTION ───────────────────────────────────── */}
      {showEditModal && editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">✏️ Edit Koleksi</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Koleksi</label>
                <input
                  type="text"
                  required
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Emoji</label>
                  <select
                    value={newCollectionEmoji}
                    onChange={(e) => setNewCollectionEmoji(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg text-center"
                  >
                    <option value="📁">📁</option>
                    <option value="⭐">⭐</option>
                    <option value="💰">💰</option>
                    <option value="🚀">🚀</option>
                    <option value="🏦">🏦</option>
                    <option value="💎">💎</option>
                    <option value="👑">👑</option>
                    <option value="🔥">🔥</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPublicToggle"
                  checked={isCollectionPublic}
                  onChange={(e) => setIsCollectionPublic(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isPublicToggle" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Publikasikan koleksi (bisa dibagikan dengan link)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  Perbarui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

