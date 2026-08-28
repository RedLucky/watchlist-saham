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

// Helper: Hitung Rekomendasi Target Beli & Target Jual
export function getRecommendedTargets(stockData) {
  if (!stockData) return { targetBuy: null, targetSell: null, buyLabel: '', sellLabel: '' };

  const price = Number(stockData.price || 0);
  const t = stockData.technicals || {};
  const proj = stockData.projections || {};

  if (!price || price <= 0) return { targetBuy: null, targetSell: null, buyLabel: '', sellLabel: '' };

  // 1. Target Buy (Area Beli Ideal / Support / Margin of Safety)
  let targetBuy = null;
  let buyLabel = 'Support Teknikal';
  if (t.support && Number(t.support) > 0 && Number(t.support) <= price * 0.99) {
    targetBuy = Math.round(Number(t.support));
    const discount = Math.round(((price - targetBuy) / price) * 100);
    buyLabel = `Support (-${discount}%)`;
  } else if (proj.grahamNumber && Number(proj.grahamNumber) < price && Number(proj.grahamNumber) > 0) {
    targetBuy = Math.round(Number(proj.grahamNumber));
    const discount = Math.round(((price - targetBuy) / price) * 100);
    buyLabel = `Graham Fair Value (-${discount}%)`;
  } else {
    targetBuy = Math.round(price * 0.95);
    buyLabel = 'Diskon 5% (Area Sehat)';
  }

  // 2. Target Sell (Target Take Profit / Resistance / Fair Value)
  let targetSell = null;
  let sellLabel = 'Target 12 Bulan';
  if (proj.projectedPrice12m && Number(proj.projectedPrice12m) > price * 1.03) {
    targetSell = Math.round(Number(proj.projectedPrice12m));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Target 12B (+${upside}%)`;
  } else if (t.resistance && Number(t.resistance) > price * 1.02) {
    targetSell = Math.round(Number(t.resistance));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Resistance (+${upside}%)`;
  } else if (proj.fairValue && Number(proj.fairValue) > price * 1.05) {
    targetSell = Math.round(Number(proj.fairValue));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Nilai Wajar DCF (+${upside}%)`;
  } else {
    targetSell = Math.round(price * 1.15);
    sellLabel = 'Target Standar (+15%)';
  }

  return { targetBuy, targetSell, buyLabel, sellLabel };
}

export default function StockExplorer({ user }) {
  // Navigation View State
  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' | 'compare'

  // Search & Stock Data State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTickers, setAllTickers] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetail, setStockDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Multi-Stock Compare State (Max 6 stocks)
  const [compareList, setCompareList] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState('');
  const [compareSuggestions, setCompareSuggestions] = useState([]);

  // Collections State
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionItems, setCollectionItems] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // Modal State: Create / Edit Collection Metadata
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionEmoji, setNewCollectionEmoji] = useState('📁');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [isCollectionPublic, setIsCollectionPublic] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  // Modal State: Save Stock to Collection
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [stockNote, setStockNote] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [saveTargetBuy, setSaveTargetBuy] = useState('');
  const [saveTargetSell, setSaveTargetSell] = useState('');

  // Modal State: Edit Collection Item (Notes, Target Buy, Target Sell)
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editItemTargetBuy, setEditItemTargetBuy] = useState('');
  const [editItemTargetSell, setEditItemTargetSell] = useState('');
  const [savingEditItem, setSavingEditItem] = useState(false);

  // Drag and Drop reordering state for Collection Cards
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [copiedShareCode, setCopiedShareCode] = useState(null);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const compareInputRef = useRef(null);
  const compareDropdownRef = useRef(null);
  const detailSectionRef = useRef(null);

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

  const itemsCacheRef = useRef({});

  // Fetch Collections (stable, no selectedCollection dependency)
  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCollections(list);
        setSelectedCollection(prev => {
          if (!prev) return list.length > 0 ? list[0] : null;
          const found = list.find(c => c.id === prev.id);
          return found || (list.length > 0 ? list[0] : null);
        });
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch Collection Items with instant in-memory cache & silent background refresh support
  const fetchCollectionItems = useCallback(async (collectionId, forceReload = false, isSilent = false) => {
    if (!collectionId) return;

    if (itemsCacheRef.current[collectionId] && !forceReload && !isSilent) {
      setCollectionItems(itemsCacheRef.current[collectionId]);
    } else if (!isSilent) {
      setLoadingItems(true);
    } else {
      setIsSilentRefreshing(true);
    }

    try {
      const res = await fetch(`/api/collections/items?collectionId=${collectionId}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        itemsCacheRef.current[collectionId] = items;
        setCollectionItems(items);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch collection items:', err);
    } finally {
      if (!isSilent) {
        setLoadingItems(false);
      } else {
        setIsSilentRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCollection?.id) {
      fetchCollectionItems(selectedCollection.id);
    } else {
      setCollectionItems([]);
    }
  }, [selectedCollection?.id, fetchCollectionItems]);

  // ── PERIODIC AUTO-REFRESH (POLLING EVERY 30 SECONDS) ───────────────────
  useEffect(() => {
    if (!selectedCollection?.id) return;

    const intervalId = setInterval(() => {
      // Only poll when page tab is actively visible to save network & battery
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCollectionItems(selectedCollection.id, true, true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [selectedCollection?.id, fetchCollectionItems]);

  // Main Autocomplete Filter
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

  // Compare Autocomplete Filter
  useEffect(() => {
    if (!compareSearchQuery.trim()) {
      setCompareSuggestions([]);
      return;
    }
    const q = compareSearchQuery.toUpperCase().trim();
    const filtered = allTickers
      .filter(s => 
        !compareList.includes(s.ticker) &&
        ((s.ticker && s.ticker.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q)))
      )
      .slice(0, 6);
    setCompareSuggestions(filtered);
  }, [compareSearchQuery, allTickers, compareList]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) {
        setSuggestions([]);
      }
      if (
        compareDropdownRef.current && !compareDropdownRef.current.contains(e.target) &&
        compareInputRef.current && !compareInputRef.current.contains(e.target)
      ) {
        setCompareSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch single stock detail & smooth scroll to detail
  const handleSelectStock = async (ticker, shouldScroll = true) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');
    setSelectedStock(cleanTicker);
    setSuggestions([]);
    setSearchQuery(cleanTicker);
    setLoadingDetail(true);
    setDetailError(null);
    setActiveTab('explorer');

    try {
      const res = await fetch(`/api/stocks/${cleanTicker}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat data saham');
      }
      const data = await res.json();
      setStockDetail(data);

      if (shouldScroll) {
        setTimeout(() => {
          if (detailSectionRef.current) {
            detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (err) {
      setDetailError(err.message);
      setStockDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Default initial search if none selected
  useEffect(() => {
    if (!selectedStock && allTickers.length > 0) {
      handleSelectStock('BBCA', false);
    }
  }, [allTickers]);

  // ── MULTI-STOCK COMPARE FUNCTIONS ──────────────────────────────────────
  const fetchCompareStockData = async (ticker) => {
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');
    if (compareData[cleanTicker]) return compareData[cleanTicker];
    try {
      const res = await fetch(`/api/stocks/${cleanTicker}`);
      if (res.ok) {
        const data = await res.json();
        setCompareData(prev => ({ ...prev, [cleanTicker]: data }));
        return data;
      }
    } catch (e) {
      console.error(`Failed to fetch compare data for ${cleanTicker}:`, e);
    }
    return null;
  };

  const handleAddToCompare = async (ticker) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');
    if (compareList.includes(cleanTicker)) {
      alert(`Saham ${cleanTicker} sudah ada dalam daftar komparasi.`);
      return;
    }
    if (compareList.length >= 6) {
      alert('Maksimal 6 saham untuk dikomparasi secara bersamaan.');
      return;
    }

    const newList = [...compareList, cleanTicker];
    setCompareList(newList);
    setCompareSearchQuery('');
    setCompareSuggestions([]);
    
    setLoadingCompare(true);
    await fetchCompareStockData(cleanTicker);
    setLoadingCompare(false);
  };

  const handleRemoveFromCompare = (ticker) => {
    setCompareList(prev => prev.filter(t => t !== ticker));
  };

  const handleClearCompare = () => {
    setCompareList([]);
  };

  // ── COLLECTION CRUD HANDLERS ──────────────────────────────────────────
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
          targetBuy: saveTargetBuy ? parseFloat(saveTargetBuy) : null,
          targetSell: saveTargetSell ? parseFloat(saveTargetSell) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan saham');
        return;
      }

      setShowSaveModal(false);
      setStockNote('');
      setSaveTargetBuy('');
      setSaveTargetSell('');
      alert(`✅ Saham ${selectedStock} berhasil disimpan ke koleksi!`);
      await fetchCollections();
      if (selectedCollection?.id === parseInt(targetCollectionId, 10)) {
        fetchCollectionItems(selectedCollection.id, true);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan saham');
    }
  };

  const handleOpenEditItemModal = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditItemNotes(item.notes || '');
    setEditItemTargetBuy(item.targetBuy != null ? item.targetBuy.toString() : '');
    setEditItemTargetSell(item.targetSell != null ? item.targetSell.toString() : '');
    setShowEditItemModal(true);
  };

  const handleSaveEditItem = async (e) => {
    e.preventDefault();
    if (!editingItem?.id) return;
    setSavingEditItem(true);

    try {
      const res = await fetch('/api/collections/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          notes: editItemNotes.trim() || null,
          targetBuy: editItemTargetBuy ? parseFloat(editItemTargetBuy) : null,
          targetSell: editItemTargetSell ? parseFloat(editItemTargetSell) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal memperbarui item koleksi');
        return;
      }

      setShowEditItemModal(false);
      setEditingItem(null);
      if (selectedCollection?.id) {
        fetchCollectionItems(selectedCollection.id, true);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setSavingEditItem(false);
    }
  };

  const handleRemoveStockFromCollection = async (collectionId, ticker, e) => {
    if (e) e.stopPropagation();
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

      fetchCollectionItems(collectionId, true);
      fetchCollections();
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  // ── DRAG & DROP REORDER HANDLERS ───────────────────────────────────────
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...collectionItems];
    const [moved] = updated.splice(draggedItemIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setCollectionItems(updated);
    if (selectedCollection?.id) {
      itemsCacheRef.current[selectedCollection.id] = updated;
    }
    setDraggedItemIndex(null);
    setDragOverIndex(null);

    // Persist new order to server
    try {
      const orderedIds = updated.map(item => item.id);
      await fetch('/api/collections/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: selectedCollection.id,
          orderedIds,
        }),
      });
    } catch (err) {
      console.error('Failed to persist item order:', err);
    }
  };

  const handleCopyShareLink = (shareCode) => {
    const url = `${window.location.origin}/api/collections?shareCode=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedShareCode(shareCode);
    setTimeout(() => setCopiedShareCode(null), 3000);
  };

  // Stock Detail parsed shortcut values
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
      {/* ── TOP HEADER & MODE NAVIGATION TABS ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧭</span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stock Explorer
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Riset komprehensif fundamental, valuasi, volume teknikal, bandarmologi & komparasi multi-saham
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'explorer'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🔍</span> Eksplorasi Saham
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'compare'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚖️</span> Komparasi Saham
              {compareList.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-600 text-white">
                  {compareList.length}/6
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. KOLEKSI SAYA (PLACED AT THE TOP) ───────────────────────────── */}
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
              Simpan, kelompokkan, dan pantau target harga beli/jual saham favorit Anda (Klik kartu untuk langsung melihat detail analisis)
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                    <div className="flex items-center gap-1">
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
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Edit Nama, Deskripsi & Emoji Koleksi"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(col.id, col.name);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded transition-colors"
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

        {/* Selected Collection Stocks Grid (4 Columns) with Instant Click View & Target Alerts */}
        {selectedCollection && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedCollection.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedCollection.name}</span>
                    {selectedCollection.isPublic && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                        🌐 Publik
                      </span>
                    )}
                  </h3>
                  {selectedCollection.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{selectedCollection.description}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">Belum ada deskripsi koleksi</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                {/* Live Auto-Refresh Indicator */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm"
                  title="Harga & Skor di kartu koleksi otomatis diperbarui setiap 30 detik"
                >
                  <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isSilentRefreshing ? 'animate-ping' : 'animate-pulse'}`}></span>
                  <span>{isSilentRefreshing ? 'Memperbarui...' : 'Auto-Sync 30s'}</span>
                </div>

                <button
                  onClick={() => fetchCollectionItems(selectedCollection.id, true, false)}
                  className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                  title="Refresh data & harga saham koleksi sekarang"
                >
                  🔄
                </button>

                <button
                  onClick={() => {
                    setEditingCollection(selectedCollection);
                    setNewCollectionName(selectedCollection.name);
                    setNewCollectionEmoji(selectedCollection.emoji || '📁');
                    setNewCollectionDesc(selectedCollection.description || '');
                    setIsCollectionPublic(selectedCollection.isPublic || false);
                    setShowEditModal(true);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 transition-colors"
                  title="Edit Nama, Deskripsi & Emoji Koleksi Ini"
                >
                  <span>✏️</span> Edit Koleksi
                </button>

                {selectedCollection.shareCode && (
                  <button
                    onClick={() => handleCopyShareLink(selectedCollection.shareCode)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    🔗 {copiedShareCode === selectedCollection.shareCode ? 'Link Tersalin! ✅' : 'Bagikan'}
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCollection(selectedCollection.id, selectedCollection.name)}
                  className="p-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                  title="Hapus Koleksi Ini"
                >
                  🗑️
                </button>
              </div>
            </div>

            {loadingItems && collectionItems.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="animate-pulse rounded-2xl p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3 h-[175px]">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                      <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                    </div>
                    <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mt-2"></div>
                    <div className="h-8 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : collectionItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Koleksi ini masih kosong. Cari saham di bawah lalu klik &quot;Simpan ke Koleksi&quot;.
              </div>
            ) : (
              /* 4-COLUMN CARDS GRID FOR SAVED STOCKS (DRAGGABLE & REORDERABLE) */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {collectionItems.map((item, index) => {
                  const s = item.stock || {};
                  const price = s.price || 0;
                  const isItemUp = (s.changePercent || 0) >= 0;
                  const itemNominal = getNominalChange(price, s.changePercent);
                  
                  // Keep score 100% in sync with live detail composite score if this stock is currently selected
                  const isCurrentSelected = stockDetail?.ticker === item.ticker;
                  const liveCompScore = (isCurrentSelected && scores?.fundamental != null)
                    ? Math.round(((scores.fundamental ?? 50) * 0.45) + ((scores.technical ?? 50) * 0.35) + ((scores.trending ?? 50) * 0.10) + ((scores.smartMoney ?? 50) * 0.10))
                    : null;
                  const score = liveCompScore ?? s.score;

                  // Target Buy Hit: price <= targetBuy
                  const isTargetBuyHit = item.targetBuy != null && price > 0 && price <= item.targetBuy;
                  // Target Sell Hit: price >= targetSell
                  const isTargetSellHit = item.targetSell != null && price > 0 && price >= item.targetSell;

                  const isDragging = draggedItemIndex === index;
                  const isDragOver = dragOverIndex === index && draggedItemIndex !== index;

                  let cardStyle = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400/60 shadow-sm';
                  if (isTargetBuyHit) {
                    cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md';
                  } else if (isTargetSellHit) {
                    cardStyle = 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30 shadow-md';
                  }

                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => handleSelectStock(item.ticker, true)}
                      className={`cursor-pointer border rounded-xl p-3.5 transition-all flex flex-col justify-between group relative select-none overflow-hidden ${cardStyle} ${
                        isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-500 shadow-none' : ''
                      } ${
                        isDragOver ? 'ring-2 ring-indigo-500 border-indigo-500 scale-[1.02] shadow-lg' : ''
                      }`}
                    >
                      {/* ── BACKGROUND SCORE WATERMARK (DYNAMIC TIER COLOR) ── */}
                      {score != null && (
                        <div className="absolute right-6 bottom-3 pointer-events-none select-none z-0 overflow-hidden opacity-25 dark:opacity-30 group-hover:opacity-40 dark:group-hover:opacity-45 transition-opacity flex flex-col items-end">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest leading-none mr-1 -mb-1 font-mono ${
                              score >= 80
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : score >= 65
                                ? 'text-blue-700 dark:text-blue-400'
                                : score >= 50
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            SKOR
                          </span>
                          <span
                            className={`text-6xl font-black tracking-tighter leading-none font-mono ${
                              score >= 80
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : score >= 65
                                ? 'text-blue-700 dark:text-blue-400'
                                : score >= 50
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {score}
                          </span>
                        </div>
                      )}

                      <div className="relative z-10">
                        {/* Target Alert Badge */}
                        {isTargetBuyHit && (
                          <div className="mb-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-md flex items-center justify-between">
                            <span>🎯 TARGET BUY TERCAPAI!</span>
                            <span>≤ Rp {item.targetBuy.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {isTargetSellHit && (
                          <div className="mb-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-md flex items-center justify-between">
                            <span>🚀 TARGET SELL TERCAPAI!</span>
                            <span>≥ Rp {item.targetSell.toLocaleString('id-ID')}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {/* Drag Grip Handle */}
                            <span
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs px-0.5 select-none transition-colors"
                              title="Tahan & geser untuk atur urutan kartu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⠿
                            </span>
                            <span className="font-black text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                              {item.ticker}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[85px]">
                              {s.sector || ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCompare(item.ticker);
                              }}
                              className="text-xs p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                              title="Tambah ke Komparasi"
                            >
                              ⚖️
                            </button>
                            <button
                              onClick={(e) => handleOpenEditItemModal(item, e)}
                              className="text-xs p-1 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                              title="Edit Catatan & Target Buy/Sell"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => handleRemoveStockFromCollection(selectedCollection.id, item.ticker, e)}
                              className="text-xs p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                              title="Hapus dari Koleksi"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Price & Change */}
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            Rp {price ? price.toLocaleString('id-ID') : '-'}
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                              isItemUp ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}
                          >
                            <span>{isItemUp ? '+' : ''}{itemNominal.toLocaleString('id-ID')}</span>
                            <span>({isItemUp ? '+' : ''}{s.changePercent ? Number(s.changePercent).toFixed(2) : 0}%)</span>
                          </span>
                        </div>

                        {/* Target Buy & Sell Status Tags */}
                        {(item.targetBuy != null || item.targetSell != null) && (
                          <div className="grid grid-cols-2 gap-1 mb-2 text-[10px] font-semibold">
                            <div className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                              Beli: {item.targetBuy != null ? `Rp ${item.targetBuy.toLocaleString('id-ID')}` : '-'}
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                              Jual: {item.targetSell != null ? `Rp ${item.targetSell.toLocaleString('id-ID')}` : '-'}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 line-clamp-2">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Ditambahkan: {new Date(item.addedAt).toLocaleDateString('id-ID')}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline">Buka Riset ➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. VIEW SELECTION: EXPLORER VS COMPARE ──────────────────────── */}
      {activeTab === 'explorer' ? (
        <>
          {/* SEARCH BAR (PLACED BELOW COLLECTIONS) */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div>
                <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white">
                  Pencarian Saham IDX
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Cari kode ticker atau nama perusahaan (misal: BBCA, BBRI, ASII, ADRO, TLKM)
                </p>
              </div>

              {/* Autocomplete Search Input */}
              <div className="relative w-full md:w-96">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    🔍
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim()) {
                        const q = searchQuery.toUpperCase().trim();
                        setSuggestions(allTickers.filter(s => (s.ticker && s.ticker.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q))).slice(0, 8));
                      }
                    }}
                    placeholder="Ketik kode saham atau nama emiten..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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

          {/* ── 3. STOCK DETAIL CONTAINER ─────────────────────────────────── */}
          <div ref={detailSectionRef}>
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

                    {/* Price & Action Buttons */}
                    <div className="flex items-center gap-4 justify-between md:justify-end flex-wrap">
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

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleAddToCompare(stockDetail.ticker)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <span>⚖️</span> Bandingkan
                        </button>
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
                          onClick={() => handleSelectStock(stockDetail.ticker, false)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-white/10 text-center flex items-center justify-center gap-1"
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
                          <span className="font-bold text-slate-900 dark:text-slate-100">{f.per != null ? `${Number(f.per).toFixed(2)}x` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">PBV:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{f.pbv != null ? `${Number(f.pbv).toFixed(2)}x` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">PEG Ratio:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {f.per && proj.cagrPercent && proj.cagrPercent > 0 
                              ? (f.per / proj.cagrPercent).toFixed(2) 
                              : (proj.cagrPercent != null && proj.cagrPercent <= 0 ? 'N/A (CAGR ≤ 0)' : '-')}
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
                            {f.revenueGrowth != null ? `${Number(f.revenueGrowth).toFixed(1)}%` : '-'}
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
                          Yield {f.dividendYield != null ? `${Number(f.dividendYield).toFixed(1)}%` : '0%'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Dividend Yield:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {f.dividendYield != null ? `${Number(f.dividendYield).toFixed(2)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Payout Ratio (DPR):</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {f.payoutRatio != null ? `${Number(f.payoutRatio).toFixed(1)}%` : '-'}
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
                          <span className="text-slate-600 dark:text-slate-400">OPM (Operating Margin):</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{f.opm != null ? `${Number(f.opm).toFixed(1)}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">NPM (Net Margin):</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{f.npm != null ? `${Number(f.npm).toFixed(1)}%` : '-'}</span>
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
                          <span className="text-slate-600 dark:text-slate-400">Pengendali (PSP):</span>
                          <div className="text-right">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {b.controllerPercent != null && b.controllerPercent > 0 ? `${Number(b.controllerPercent).toFixed(1)}%` : '-'}
                            </span>
                            {b.controllerName && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-[130px]" title={b.controllerName}>
                                {b.controllerName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Direksi & Manajemen:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {b.managementTotalPercent != null ? `${Number(b.managementTotalPercent).toFixed(2)}%` : (b.directorsPercent != null ? `${Number(b.directorsPercent).toFixed(2)}%` : '0.00%')}
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
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Smart Money Flow:</span>
                          <span className={`font-bold ${b.smartMoneyStatus?.includes('Inflow') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {b.smartMoneyStatus || 'Netral'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Wyckoff Phase:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{b.wyckoffPhaseName || `Fase ${b.wyckoffPhase || 1}`}</span>
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
          </div>
        </>
      ) : (
        /* ── MULTI-STOCK COMPARE VIEW (MAX 6 STOCKS) ───────────────────────── */
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-6 animate-in fade-in">
          {/* Compare Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                  Komparasi Multi-Saham (Head-to-Head)
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Bandingkan hingga 6 saham sekaligus melintasi metrik Valuasi, Fundamental, Pertumbuhan, Teknikal & Bandarmologi
              </p>
            </div>

            {/* Quick Add To Compare */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <input
                  ref={compareInputRef}
                  type="text"
                  value={compareSearchQuery}
                  onChange={(e) => setCompareSearchQuery(e.target.value)}
                  placeholder={compareList.length >= 6 ? 'Maks 6 saham tercapai' : '+ Tambah saham pembanding...'}
                  disabled={compareList.length >= 6}
                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                {compareSuggestions.length > 0 && (
                  <div
                    ref={compareDropdownRef}
                    className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
                  >
                    {compareSuggestions.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => handleAddToCompare(s.ticker)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{s.ticker}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {compareList.length > 0 && (
                <button
                  onClick={handleClearCompare}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Compare Content */}
          {compareList.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-4">
              <span className="text-4xl block">⚖️</span>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Saham yang Dibandingkan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Pilih hingga 6 saham dari daftar pencarian atau klik tombol &quot;Bandingkan&quot; di kartu koleksi untuk membandingkan matriks secara langsung.
                </p>
              </div>

              {/* Quick Preset Compare Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                <span className="text-xs text-slate-400">Contoh Cepat:</span>
                <button
                  onClick={() => {
                    ['BBCA', 'BBRI', 'BMRI', 'BBNI'].forEach(t => handleAddToCompare(t));
                  }}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800"
                >
                  🏦 4 Bank Terbesar (Big 4)
                </button>
                <button
                  onClick={() => {
                    ['ADRO', 'PTBA', 'ITMG', 'UNTR'].forEach(t => handleAddToCompare(t));
                  }}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  ⛏️ Emiten Batubara & Dividen
                </button>
              </div>
            </div>
          ) : (
            /* ── COMPARISON MATRIX TABLE (UP TO 6 COLUMNS) ────────────────── */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {(() => {
                // Calculate Best in Class Values
                const stockDetailsList = compareList.map(t => compareData[t]).filter(Boolean);
                
                // Best PER: lowest positive PER
                const positivePers = stockDetailsList.map(s => s.fundamentals?.per).filter(p => p != null && p > 0);
                const bestPer = positivePers.length > 0 ? Math.min(...positivePers) : null;

                // Best PBV: lowest positive PBV
                const positivePbvs = stockDetailsList.map(s => s.fundamentals?.pbv).filter(p => p != null && p > 0);
                const bestPbv = positivePbvs.length > 0 ? Math.min(...positivePbvs) : null;

                // Best ROE: highest ROE
                const roes = stockDetailsList.map(s => s.fundamentals?.roe).filter(r => r != null);
                const bestRoe = roes.length > 0 ? Math.max(...roes) : null;

                // Best OPM: highest OPM
                const opms = stockDetailsList.map(s => s.fundamentals?.opm).filter(o => o != null);
                const bestOpm = opms.length > 0 ? Math.max(...opms) : null;

                // Best MoS: highest Margin of Safety
                const moses = stockDetailsList.map(s => s.projections?.marginOfSafety).filter(m => m != null);
                const bestMos = moses.length > 0 ? Math.max(...moses) : null;

                // Best Dividend Yield: highest Yield
                const yields = stockDetailsList.map(s => s.fundamentals?.dividendYield).filter(y => y != null);
                const bestYield = yields.length > 0 ? Math.max(...yields) : null;

                // Best Piotroski Score: highest
                const fScores = stockDetailsList.map(s => s.fundamentals?.piotroskiFScore).filter(f => f != null);
                const bestFScore = fScores.length > 0 ? Math.max(...fScores) : null;

                // Best Composite Score: highest
                const compScores = stockDetailsList.map(s => {
                  const fSc = s.scores?.fundamental ?? 50;
                  const tSc = s.scores?.technical ?? 50;
                  const trSc = s.scores?.trending ?? 50;
                  const smSc = s.scores?.smartMoney ?? 50;
                  return Math.round((fSc * 0.45) + (tSc * 0.35) + (trSc * 0.10) + (smSc * 0.10));
                });
                const bestCompScore = compScores.length > 0 ? Math.max(...compScores) : null;

                return (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3.5 font-black text-slate-700 dark:text-slate-300 w-44 min-w-[170px] sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                          Metrik Analisis
                        </th>
                        {compareList.map((ticker) => {
                          const s = compareData[ticker] || {};
                          const isUpStock = (s.changePercent || 0) >= 0;
                          return (
                            <th key={ticker} className="p-3.5 text-center min-w-[150px] border-l border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-black text-base text-slate-900 dark:text-white">{ticker}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSelectStock(ticker, true)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 text-xs"
                                    title="Lihat Detail Lengkap"
                                  >
                                    🔍
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromCompare(ticker)}
                                    className="p-1 text-slate-400 hover:text-rose-600 text-xs"
                                    title="Hapus dari Komparasi"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mb-1">{s.name || 'Memuat...'}</div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                Rp {s.price ? s.price.toLocaleString('id-ID') : '-'}
                              </div>
                              {s.changePercent != null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isUpStock ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                }`}>
                                  {isUpStock ? '+' : ''}{Number(s.changePercent).toFixed(2)}%
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {/* SECTION 1: RINGKASAN & SKOR */}
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
                          🎯 Ringkasan & Skor Komposit
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Skor Komposit (45/35/10/10)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fSc = s.scores?.fundamental ?? 50;
                          const tSc = s.scores?.technical ?? 50;
                          const trSc = s.scores?.trending ?? 50;
                          const smSc = s.scores?.smartMoney ?? 50;
                          const cScore = Math.round((fSc * 0.45) + (tSc * 0.35) + (trSc * 0.10) + (smSc * 0.10));
                          const isWinner = cScore === bestCompScore && bestCompScore != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : ''}`}>
                              <span className="text-sm">{cScore}/100</span> {isWinner && '🏆'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Rekomendasi Algoritma</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker];
                          const rec = s ? getAlgorithmicRecommendation({ stockDetail: s, scores: s.scores }) : null;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800">
                              {rec ? (
                                <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${rec.bgClass}`}>
                                  {rec.label}
                                </span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Market Cap</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const mc = s.fundamentals?.marketCap;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-medium">
                              {mc ? `Rp ${(mc / 1e12).toFixed(2)} T` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 2: VALUASI & MARGIN OF SAFETY */}
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
                          📊 Valuasi Harga
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">PER (Price to Earning)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.per;
                          const isWinner = val === bestPer && bestPer != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'} {isWinner && '✨'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">PBV (Price to Book)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.pbv;
                          const isWinner = val === bestPbv && bestPbv != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Fair Value (DCF)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fv = s.projections?.fairValue;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-emerald-600 dark:text-emerald-400">
                              {fv ? `Rp ${fv.toLocaleString('id-ID')}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Margin of Safety (MoS)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const mos = s.projections?.marginOfSafety;
                          const isWinner = mos === bestMos && bestMos != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-black ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : (mos || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {mos != null ? `${mos > 0 ? '+' : ''}${mos}%` : '-'} {isWinner && '💎'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 3: FUNDAMENTAL & KUALITAS */}
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
                          🔬 Fundamental & Kualitas Keuangan
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">ROE (Return on Equity)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.roe;
                          const isWinner = val === bestRoe && bestRoe != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'} {isWinner && '👑'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">OPM (Operating Margin)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.opm;
                          const isWinner = val === bestOpm && bestOpm != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'} {isWinner && '👑'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">DER (Rasio Hutang)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.der;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${val != null && val > 2 ? 'text-amber-600' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Piotroski F-Score (0-9)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.piotroskiFScore;
                          const isWinner = val === bestFScore && bestFScore != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : ''}`}>
                              {val != null ? `${val}/9` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Altman Z-Score</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.altmanZScore;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold">
                              {val != null ? `${val} (${val >= 2.99 ? 'Aman' : val < 1.81 ? 'Rawan' : 'Moderat'})` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 4: DIVIDEN & GROWTH */}
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
                          🏛️ Dividen & Pertumbuhan
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Dividend Yield</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.dividendYield;
                          const isWinner = val === bestYield && bestYield != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {val != null ? `${Number(val).toFixed(2)}%` : '0%'} {isWinner && '💰'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Payout Ratio (DPR)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.payoutRatio;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-medium">
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Profit CAGR (3th)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const cagr = s.projections?.cagrPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-emerald-600 dark:text-emerald-400">
                              {cagr != null ? `+${cagr}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 5: TEKNIKAL & BANDARMOLOGI */}
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
                          ⚡ Teknikal, Volume & Bandarmologi
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">RSI 14 (Momentum)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.technicals?.rsi14;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold">
                              {val != null ? `${Number(val).toFixed(1)} (${val >= 70 ? 'Overbought' : val <= 30 ? 'Oversold' : 'Netral'})` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Volume Spike Ratio</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.volumeAnalysis?.volumeSpikeRatio;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                              {val != null ? `${val}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">BFI (Bandar Flow Index)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const bfi = s.bandarmologi?.bfiScore;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold ${(bfi || 0) >= 2 ? 'text-emerald-600' : (bfi || 0) <= -2 ? 'text-rose-600' : ''}`}>
                              {bfi != null ? Number(bfi).toFixed(1) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Smart Money Status</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const status = s.bandarmologi?.smartMoneyStatus;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold">
                              {status || '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Saham Pengendali (PSP)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const cp = s.bandarmologi?.controllerPercent;
                          const name = s.bandarmologi?.controllerName;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                              <div>{cp != null && cp > 0 ? `${Number(cp).toFixed(1)}%` : '-'}</div>
                              {name && <div className="text-[10px] text-slate-500 font-normal truncate max-w-[110px] mx-auto" title={name}>{name}</div>}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Kepemilikan Direksi</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const dp = s.bandarmologi?.managementTotalPercent ?? s.bandarmologi?.directorsPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-medium text-emerald-600 dark:text-emerald-400">
                              {dp != null ? `${Number(dp).toFixed(2)}%` : '0.00%'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Kepemilikan Asing</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fp = s.bandarmologi?.foreignPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-medium">
                              {fp != null ? `${Number(fp).toFixed(1)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10">Kepemilikan Ritel</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const rp = s.bandarmologi?.retailPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-medium">
                              {rp != null ? `${Number(rp).toFixed(1)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </div>
      )}

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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Emoji / Ikon</label>
                <div className="flex items-center gap-2">
                  {['📁', '💎', '🚀', '🏛️', '🛡️', '⚡', '📊', '🔥'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCollectionEmoji(em)}
                      className={`text-xl p-2 rounded-xl border transition-all ${
                        newCollectionEmoji === em ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 scale-110' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan strategi atau fokus portofolio koleksi ini..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  Simpan Koleksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SAVE STOCK TO COLLECTION (WITH TARGET BUY & SELL) ───── */}
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Koleksi Tujuan</label>
                <select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.emoji} {col.name} ({col._count?.items || 0} saham)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Auto-Fill Recommendation Banner */}
              {(() => {
                const rec = getRecommendedTargets(stockDetail);
                if (!rec.targetBuy && !rec.targetSell) return null;
                return (
                  <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                        <span>⚡</span> Rekomendasi Target Algoritma
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) setSaveTargetBuy(rec.targetBuy.toString());
                          if (rec.targetSell) setSaveTargetSell(rec.targetSell.toString());
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-lg shadow-sm transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                      >
                        <span>⚡ Auto-Fill</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => rec.targetBuy && setSaveTargetBuy(rec.targetBuy.toString())}
                        className="text-left p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all group"
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block truncate">Target Beli ({rec.buyLabel}):</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                          Rp {rec.targetBuy?.toLocaleString('id-ID')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => rec.targetSell && setSaveTargetSell(rec.targetSell.toString())}
                        className="text-left p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 transition-all group"
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block truncate">Target Jual ({rec.sellLabel}):</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                          Rp {rec.targetSell?.toLocaleString('id-ID')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Target Buy & Target Sell Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🎯 Target Beli (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 10000"
                    value={saveTargetBuy}
                    onChange={(e) => setSaveTargetBuy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Card hijau jika harga ≤ target</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🚀 Target Jual (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 11500"
                    value={saveTargetSell}
                    onChange={(e) => setSaveTargetSell(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Card merah jika harga ≥ target</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Analisis (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Alasan beli, target harga, catatan fundamental..."
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
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

      {/* ── MODAL: EDIT COLLECTION ITEM (NOTES, TARGET BUY, TARGET SELL) ── */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Edit Saham: {editingItem.ticker}
                </h3>
              </div>
              <button onClick={() => setShowEditItemModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4">
              {/* Quick Auto-Fill Recommendation Banner */}
              {(() => {
                const activeStockData = stockDetail?.ticker === editingItem.ticker ? stockDetail : editingItem.stock;
                const rec = getRecommendedTargets(activeStockData);
                if (!rec.targetBuy && !rec.targetSell) return null;
                return (
                  <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                        <span>⚡</span> Rekomendasi Target Algoritma
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) setEditItemTargetBuy(rec.targetBuy.toString());
                          if (rec.targetSell) setEditItemTargetSell(rec.targetSell.toString());
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-lg shadow-sm transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                      >
                        <span>⚡ Auto-Fill</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => rec.targetBuy && setEditItemTargetBuy(rec.targetBuy.toString())}
                        className="text-left p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all group"
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block truncate">Target Beli ({rec.buyLabel}):</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                          Rp {rec.targetBuy?.toLocaleString('id-ID')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => rec.targetSell && setEditItemTargetSell(rec.targetSell.toString())}
                        className="text-left p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 transition-all group"
                      >
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block truncate">Target Jual ({rec.sellLabel}):</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                          Rp {rec.targetSell?.toLocaleString('id-ID')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🎯 Target Beli (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 10000"
                    value={editItemTargetBuy}
                    onChange={(e) => setEditItemTargetBuy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-semibold">
                    Card Hijau jika harga ≤ target
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🚀 Target Jual (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 11500"
                    value={editItemTargetSell}
                    onChange={(e) => setEditItemTargetSell(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 block font-semibold">
                    Card Merah jika harga ≥ target
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Analisis</label>
                <textarea
                  rows={3}
                  placeholder="Tulis alasan beli, rencana cut loss, atau target valuasi..."
                  value={editItemNotes}
                  onChange={(e) => setEditItemNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {savingEditItem ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT COLLECTION METADATA ────────────────────────────── */}
      {showEditModal && editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{newCollectionEmoji || '📁'}</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">✏️ Edit Koleksi</h3>
                  <p className="text-xs text-slate-500">Ubah nama, deskripsi, atau ikon koleksi</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Koleksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Dividen Blue Chip, Growth Saham, dsb."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pilih Ikon / Emoji</label>
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {['📁', '💎', '🚀', '📈', '🏛️', '🛡️', '⚡', '📊', '🔥', '💰', '🏆', '⭐', '🎯', '🐂', '🏦', '🌾'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCollectionEmoji(em)}
                      className={`text-lg p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                        newCollectionEmoji === em
                          ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-500 scale-110 shadow-sm'
                          : 'border-transparent hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Koleksi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Tulis tujuan koleksi atau strategi investasi di sini..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Koleksi Publik</span>
                  <span className="text-[10px] text-slate-500">Dapat dibagikan kepada orang lain via link</span>
                </div>
                <input
                  type="checkbox"
                  checked={isCollectionPublic}
                  onChange={(e) => setIsCollectionPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
