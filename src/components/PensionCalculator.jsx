'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PensionTracker from './PensionTracker';
import PensionRebalance from './PensionRebalance';
import AuthModal from './AuthModal';
import { isSyariahStock } from '../lib/sectorUniverse';

export default function PensionCalculator() {
 const DEFAULT_MONTHLY_EXPENSE = 5000000;
 const DEFAULT_TOTAL_BUDGET = 4000000;
 const DEFAULT_TARGET_AGE = 55;
 const DEFAULT_CURRENT_AGE = 30;
 const DEFAULT_EXPECTED_RETURN = 9;
 const DEFAULT_INFLATION_RATE = 4;
 
 // User & Auth State
 const [currentUser, setCurrentUser] = useState(null);
 const [showAuthModal, setShowAuthModal] = useState(false);
 
 // User Financial Inputs
 const [monthlyExpense, setMonthlyExpense] = useState(DEFAULT_MONTHLY_EXPENSE);
 const [totalBudget, setTotalBudget] = useState(DEFAULT_TOTAL_BUDGET);
 const [sbnAvailable, setSbnAvailable] = useState(true);
 
 // Risk Profile (CONSERVATIVE, MODERATE, AGGRESSIVE)
 const [riskProfile, setRiskProfile] = useState('MODERATE');
 
 // Retirement Target Inputs
 const [currentAge, setCurrentAge] = useState(DEFAULT_CURRENT_AGE);
 const [targetAge, setTargetAge] = useState(DEFAULT_TARGET_AGE);
 const [expectedReturn, setExpectedReturn] = useState(DEFAULT_EXPECTED_RETURN);
 const [inflationRate, setInflationRate] = useState(DEFAULT_INFLATION_RATE);
 
 // Active Tab: 'calculator' | 'tracker'
 const [activeSubTab, setActiveSubTab] = useState('calculator');
 const [mobileParamsOpen, setMobileParamsOpen] = useState(false);
 const [customDivYield, setCustomDivYield] = useState(null);
 const [customGrowthRate, setCustomGrowthRate] = useState(null);
 // Dynamic Preset Stock Prices & List
 const [presetStocks, setPresetStocks] = useState([]);
 const [bluechipOptions, setBluechipOptions] = useState(['BBRI', 'BMRI', 'BBCA', 'TLKM', 'ADRO', 'PGAS', 'KLBF', 'ASII']);
 const [stockPrices, setStockPrices] = useState({});
 const [loadingPreset, setLoadingPreset] = useState(false);
 const [lastSyncTime, setLastSyncTime] = useState(null);
 const [copied, setCopied] = useState(false);
 const [customTickerInput, setCustomTickerInput] = useState('');
  const [addingCustomTicker, setAddingCustomTicker] = useState(false);
  const [manualLots, setManualLots] = useState({});
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 30 Candidates Modal State
  const [pensionCandidates, setPensionCandidates] = useState([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateSyariahOnly, setCandidateSyariahOnly] = useState(false);
  const [candidateMinYield, setCandidateMinYield] = useState(0);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Tracker records state
  const [trackerRecords, setTrackerRecords] = useState([]);
  const [paramsSavedMsg, setParamsSavedMsg] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('idx_pension_calculator_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.monthlyExpense) setMonthlyExpense(parsed.monthlyExpense);
        if (parsed.totalBudget) setTotalBudget(parsed.totalBudget);
        if (parsed.sbnAvailable !== undefined) setSbnAvailable(parsed.sbnAvailable);
        if (parsed.riskProfile) setRiskProfile(parsed.riskProfile);
        if (parsed.currentAge) setCurrentAge(parsed.currentAge);
        if (parsed.targetAge) setTargetAge(parsed.targetAge);
        if (parsed.expectedReturn) setExpectedReturn(parsed.expectedReturn);
        if (parsed.inflationRate) setInflationRate(parsed.inflationRate);
        if (parsed.customDivYield !== undefined) setCustomDivYield(parsed.customDivYield);
        if (parsed.customGrowthRate !== undefined) setCustomGrowthRate(parsed.customGrowthRate);
      }
    } catch (e) {
      console.error('Error loading saved pension params:', e);
    }
  }, []);

  const handleSaveParameters = async () => {
    const params = {
      monthlyExpense,
      totalBudget,
      sbnAvailable,
      riskProfile,
      currentAge,
      targetAge,
      expectedReturn,
      inflationRate,
      customDivYield,
      customGrowthRate
    };

    try {
      localStorage.setItem('idx_pension_calculator_params', JSON.stringify(params));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    try {
      await fetch('/api/user/pension-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch (e) {
      console.error('Failed to save pension params to DB:', e);
    }

    setParamsSavedMsg(true);
    setTimeout(() => setParamsSavedMsg(false), 3000);
  };

 // 1. Check current logged in user
 const checkAuth = useCallback(async () => {
 try {
 const res = await fetch('/api/auth/me');
 if (res.ok) {
 const data = await res.json();
 if (data.user) {
 setCurrentUser(data.user);
 if (data.user.riskProfile) {
 setRiskProfile(data.user.riskProfile);
 }
 }
 }
 } catch (e) {
 console.error('Error checking auth:', e);
 }
 }, []);

 // 2. Fetch Dynamic Preset Stocks based on Fundamental/Valuation/Dividend Scoring & Risk Profile
 const fetchDynamicPreset = useCallback(async (profile, forceRefresh = false) => {
    setLoadingPreset(true);
    try {
      const res = await fetch(`/api/pension/preset?riskProfile=${profile}&forceRefresh=${forceRefresh}`);
      if (res.ok) {
        const data = await res.json();
        if (data.presetStocks && data.presetStocks.length > 0) {
          setPresetStocks(data.presetStocks);
          if (data.bluechipOptions && data.bluechipOptions.length > 0) {
            setBluechipOptions(data.bluechipOptions);
          }
          if (data.candidates && data.candidates.length > 0) {
            setPensionCandidates(data.candidates);
          }
          
          const newPrices = {};
          data.presetStocks.forEach((st) => {
            newPrices[st.ticker] = Math.round(st.price || 1000);
          });
          setStockPrices(newPrices);
          setLastSyncTime(new Date(data.updatedAt).toLocaleTimeString('id-ID'));
        }
      }
    } catch (err) {
      console.error('Gagal memuat preset saham dinamis:', err);
    } finally {
      setLoadingPreset(false);
    }
  }, []);

 // 3. Fetch Tracker Records for authenticated user
 const fetchTrackerRecords = useCallback(async () => {
 try {
 const res = await fetch('/api/pension');
 if (res.ok) {
 const data = await res.json();
 setTrackerRecords(data.records || []);
 }
 } catch (err) {
 console.error('Gagal mengambil data tracker:', err);
 }
 }, []);

 useEffect(() => {
 void checkAuth();
 }, [checkAuth]);

 useEffect(() => {
 void fetchDynamicPreset(riskProfile);
 }, [riskProfile, fetchDynamicPreset]);

 useEffect(() => {
 if (currentUser) {
 void fetchTrackerRecords();
 } else {
 setTrackerRecords([]);
 }
 }, [currentUser, fetchTrackerRecords]);

 const handleLogout = async () => {
 try {
 await fetch('/api/auth/logout', { method: 'POST' });
 setCurrentUser(null);
 setTrackerRecords([]);
 } catch (e) {
 console.error(e);
 }
 };

 const handlePriceChange = (ticker, val) => {
 const num = parseFloat(val);
 setStockPrices((prev) => ({
 ...prev,
 [ticker]: isNaN(num) ? 0 : Math.max(0, num),
 }));
 };

  const handleIncrementLot = (ticker) => {
    const stockAllocation = totalBudget * assetRatios.stock;
    const currentStock = calculatedStocks.find(st => st.ticker === ticker);
    if (!currentStock || currentStock.lotCost <= 0) return;

    const totalStockSpent = calculatedStocks.reduce((sum, st) => sum + st.cost, 0);
    const availableCash = stockAllocation - totalStockSpent;

    if (availableCash < currentStock.lotCost) {
      showToast(`⚠️ Sisa anggaran saham (Rp ${Math.max(0, availableCash).toLocaleString('id-ID')}) tidak mencukupi untuk menambah 1 lot ${ticker} (Rp ${currentStock.lotCost.toLocaleString('id-ID')})`, 'warning');
      return;
    }

    const nextLots = currentStock.lots + 1;
    setManualLots((prev) => ({
      ...prev,
      [ticker]: nextLots,
    }));
  };

  const handleDecrementLot = (ticker) => {
    const currentStock = calculatedStocks.find(st => st.ticker === ticker);
    if (!currentStock || currentStock.lots <= 0) return;

    const nextLots = Math.max(0, currentStock.lots - 1);
    setManualLots((prev) => ({
      ...prev,
      [ticker]: nextLots,
    }));
  };

  const handleLotChange = (ticker, val) => {
    const stockAllocation = totalBudget * assetRatios.stock;
    const currentStock = calculatedStocks.find(st => st.ticker === ticker);
    if (!currentStock || currentStock.lotCost <= 0) return;

    if (val === '' || isNaN(parseInt(val, 10))) {
      setManualLots((prev) => ({ ...prev, [ticker]: 0 }));
      return;
    }

    const num = Math.max(0, parseInt(val, 10));
    const otherStocksCost = calculatedStocks
      .filter(st => st.ticker !== ticker)
      .reduce((sum, st) => sum + st.cost, 0);
    
    const maxAffordable = Math.floor(Math.max(0, stockAllocation - otherStocksCost) / currentStock.lotCost);

    if (num > maxAffordable) {
      setManualLots((prev) => ({ ...prev, [ticker]: maxAffordable }));
      showToast(`⚠️ Pembelian ${ticker} dibatasi maksimal ${maxAffordable} lot agar total belanja tidak melebihi anggaran (Rp ${stockAllocation.toLocaleString('id-ID')})`, 'warning');
    } else {
      setManualLots((prev) => ({ ...prev, [ticker]: num }));
    }
  };

  const handleResetAutoLots = () => {
    setManualLots({});
    showToast('✅ Semua alokasi lot dihitung ulang otomatis secara proporsional', 'success');
  };

  const handleRefreshPrices = async () => {
    if (presetStocks.length === 0) return;
    const tickers = presetStocks.map(s => s.ticker).join(',');
    try {
      const res = await fetch(`/api/pension/prices?tickers=${tickers}`);
      if (res.ok) {
        const data = await res.json();
        const newPrices = { ...stockPrices };
        for (const [t, d] of Object.entries(data.prices)) {
          newPrices[t] = d.price;
        }
        setStockPrices(newPrices);
      }
    } catch (e) {
      console.error('Failed to refresh prices:', e);
    }
  };

  const syncCustomPresetToDB = async (newStocksArray) => {
    try {
      await fetch('/api/user/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPreset: newStocksArray.map(st => st.ticker) })
      });
    } catch (e) {
      console.error('Failed to sync custom preset:', e);
    }
  };

  const handleToggleCandidate = (candidateStock) => {
    const ticker = candidateStock.ticker;
    const isAdded = presetStocks.some((st) => st.ticker === ticker);
    if (isAdded) {
      handleRemoveStock(ticker);
      showToast(`Saham ${ticker} dihapus dari tabel belanja saham`, 'info');
    } else {
      const price = Number(candidateStock.price) || 1000;
      const updated = [
        ...presetStocks,
        {
          ticker: candidateStock.ticker,
          name: candidateStock.name,
          sector: candidateStock.sector,
          price,
          dividendYield: candidateStock.dividendYield,
          estimatedGrowth: candidateStock.estimatedGrowth,
          totalEstimatedReturn: candidateStock.totalEstimatedReturn,
          finalPensionScore: candidateStock.finalPensionScore,
          isDividendTrap: candidateStock.isDividendTrap,
          metrics: candidateStock.metrics || {},
        },
      ];
      setPresetStocks(updated);
      setStockPrices((prev) => ({ ...prev, [ticker]: price }));
      syncCustomPresetToDB(updated);
      showToast(`✅ Saham ${ticker} (${candidateStock.name}) berhasil ditambahkan dan disimpan!`, 'success');
    }
  };

  const handleRemoveStock = (ticker) => {
    const updated = presetStocks.filter((st) => st.ticker !== ticker);
    setPresetStocks(updated);
    setManualLots((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    syncCustomPresetToDB(updated);
  };

 const handleAddCustomStockByTicker = async (tickerToAdd) => {
 const ticker = tickerToAdd.toUpperCase();
 if (presetStocks.some(st => st.ticker === ticker)) return;

 setAddingCustomTicker(true);
 try {
 const res = await fetch(`/api/pension/prices?tickers=${ticker}`);
 if (res.ok) {
 const data = await res.json();
 const stockData = data.prices?.[ticker];
 if (stockData) {
 const updated = [...presetStocks, { ticker }];
 await syncCustomPresetToDB(updated);
 await fetchDynamicPreset(riskProfile);
 setCustomTickerInput('');
 showToast(`✅ Saham ${ticker} berhasil ditambahkan!`, 'success');
 } else {
 showToast(`Saham ${ticker} tidak ditemukan di database.`, 'error');
 }
 }
 } catch (e) {
 showToast('Gagal mengambil data saham.', 'error');
 } finally {
 setAddingCustomTicker(false);
 }
 };

 const handleAddCustomStock = async () => {
 if (!customTickerInput.trim()) return;
 await handleAddCustomStockByTicker(customTickerInput.trim());
 };

 // Asset Ratios based on Risk Profile
 const assetRatios = useMemo(() => {
 if (riskProfile === 'CONSERVATIVE') {
 return { sbn: 0.60, stock: 0.20, rdpu: 0.20, label: '🟢 Konservatif (60% SBN / 20% Saham / 20% RDPU)' };
 }
 if (riskProfile === 'AGGRESSIVE') {
 return { sbn: 0.30, stock: 0.60, rdpu: 0.10, label: '🔴 Agresif (30% SBN / 60% Saham / 10% RDPU)' };
 }
 // MODERATE
 return { sbn: 0.50, stock: 0.35, rdpu: 0.15, label: '🟡 Moderat (50% SBN / 35% Saham / 15% RDPU)' };
 }, [riskProfile]);

  // 1. Dynamic Stock Lot & Cost Calculation (Smart Auto-Balancing with Budget Guard)
  const calculatedStocks = useMemo(() => {
    if (!presetStocks || presetStocks.length === 0) return [];
    
    const stockAllocation = totalBudget * assetRatios.stock;
    const isCustomModified = presetStocks.length !== 4;
    const defaultWeights = [0.35, 0.30, 0.25, 0.10];
    
    // 1. Initial mapping of stock items
    const rawItems = presetStocks.map((st, idx) => {
      const price = Number(stockPrices[st.ticker]) || st.price || 0;
      const defaultWeight = isCustomModified ? (1 / presetStocks.length) : (defaultWeights[idx] || (1 / presetStocks.length));
      const lotCost = price * 100;
      const isManual = manualLots[st.ticker] !== undefined;
      const manualLotCount = isManual ? Math.max(0, parseInt(manualLots[st.ticker], 10) || 0) : null;
      
      return {
        ...st,
        price,
        lotCost,
        defaultWeight,
        isManual,
        manualLotCount,
        lots: isManual ? manualLotCount : 0,
        cost: isManual ? (manualLotCount * lotCost) : 0,
      };
    });

    // 2. Compute cost of manual stocks and remaining budget for auto stocks
    let manualSpent = 0;
    rawItems.forEach(st => {
      if (st.isManual) {
        manualSpent += st.cost;
      }
    });

    const remainingBudgetForAuto = Math.max(0, stockAllocation - manualSpent);
    const autoStocks = rawItems.filter(st => !st.isManual);
    const totalAutoWeight = autoStocks.reduce((sum, st) => sum + st.defaultWeight, 0) || 1;

    // 3. First pass for auto stocks
    autoStocks.forEach(st => {
      if (st.lotCost > 0) {
        const normalizedWeight = st.defaultWeight / totalAutoWeight;
        const targetBudget = remainingBudgetForAuto * normalizedWeight;
        st.lots = Math.floor(targetBudget / st.lotCost);
        st.cost = st.lots * st.lotCost;
      } else {
        st.lots = 0;
        st.cost = 0;
      }
    });

    // 4. Calculate total spent so far & leftover cash
    let totalStockSpent = rawItems.reduce((sum, st) => sum + st.cost, 0);
    let stockCashChange = stockAllocation - totalStockSpent;

    // 5. Greedy second pass: Exhaust leftover cash round-robin across auto stocks
    if (stockCashChange > 0 && autoStocks.length > 0) {
      let madePurchase = true;
      while (madePurchase && stockCashChange > 0) {
        madePurchase = false;
        for (let st of autoStocks) {
          if (st.lotCost > 0 && stockCashChange >= st.lotCost) {
            st.lots += 1;
            st.cost += st.lotCost;
            totalStockSpent += st.lotCost;
            stockCashChange -= st.lotCost;
            madePurchase = true;
          }
        }
      }
    }

    // 6. Enrich with maxAffordable lots and canIncrement/canDecrement flags
    return rawItems.map(st => {
      const otherSpent = totalStockSpent - st.cost;
      const maxAffordableLots = st.lotCost > 0 ? Math.floor((stockAllocation - otherSpent) / st.lotCost) : 0;
      const canIncrement = st.lotCost > 0 && stockCashChange >= st.lotCost;
      const canDecrement = st.lots > 0;
      const actualWeightPct = stockAllocation > 0 ? ((st.cost / stockAllocation) * 100).toFixed(0) : '0';

      return {
        ...st,
        weightPct: `${actualWeightPct}%`,
        maxLots: Math.max(st.lots, maxAffordableLots),
        canIncrement,
        canDecrement,
      };
    });
  }, [presetStocks, stockPrices, manualLots, totalBudget, assetRatios.stock]);

  const handleOptimizeLots = async () => {
    setIsOptimizing(true);
    try {
      const payload = {
        budget: totalBudget * assetRatios.stock,
        stocks: calculatedStocks.map(st => ({
          ticker: st.ticker,
          price: st.price,
          yield: st.dividendYield || st.metrics?.dividendYield || st.divYield || 0,
          growth: st.estimatedGrowth || st.growth || 5
        }))
      };

      const res = await fetch('/api/pension/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.optimalLots) {
          setManualLots(data.optimalLots);
          showToast('✅ Alokasi portofolio berhasil dioptimalkan!', 'success');
        }
      } else {
        showToast('Gagal mengambil hasil optimasi dari server.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat memanggil AI Optimizer.', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Automatic average Dividend Yield (Weighted by Capital Allocation / Lots)
  const autoStockDivYield = useMemo(() => {
    if (!calculatedStocks || calculatedStocks.length === 0) return 6.5;
    const totalCost = calculatedStocks.reduce((sum, st) => sum + st.cost, 0);
    if (totalCost === 0) return 6.5;

    const totalWeightedYield = calculatedStocks.reduce((sum, st) => {
      const y = Number(st.dividendYield ?? st.metrics?.dividendYield ?? st.divYield ?? 0);
      return sum + (y * st.cost);
    }, 0);
    
    return Number((totalWeightedYield / totalCost).toFixed(1));
  }, [calculatedStocks]);

 const effectiveDivYield = customDivYield !== null && customDivYield !== undefined ? Number(customDivYield) : autoStockDivYield;

  // Automatic average Growth Rate (Weighted by Capital Allocation / Lots)
  const autoStockGrowthRate = useMemo(() => {
    if (!calculatedStocks || calculatedStocks.length === 0) return 5.5;
    const totalCost = calculatedStocks.reduce((sum, st) => sum + st.cost, 0);
    if (totalCost === 0) return 5.5;

    const totalWeightedGrowth = calculatedStocks.reduce((sum, st) => {
      const g = Number(st.estimatedGrowth ?? 0);
      return sum + (g * st.cost);
    }, 0);
    
    return Number((totalWeightedGrowth / totalCost).toFixed(1));
  }, [calculatedStocks]);

 const effectiveGrowthRate = customGrowthRate !== null && customGrowthRate !== undefined ? Number(customGrowthRate) : autoStockGrowthRate;

 // Total Stock Return = Dividend Yield + Capital Growth
 const estimatedStockReturn = useMemo(() => {
 return Number((effectiveDivYield + effectiveGrowthRate).toFixed(1));
 }, [effectiveDivYield, effectiveGrowthRate]);

 // Calculate Weighted Portfolio Return based on SBN (6.5%), Stock (Dividen + Growth), and RDPU (5.0%)
 const portfolioWeightedReturn = useMemo(() => {
 const sbnRate = 6.5;
 const rdpuRate = 5.0;
 const stockRate = estimatedStockReturn;

 const sbnWeight = sbnAvailable ? assetRatios.sbn : 0;
 const rdpuWeight = sbnAvailable ? assetRatios.rdpu : (assetRatios.rdpu + assetRatios.sbn);
 const stockWeight = assetRatios.stock;

 const weighted = (sbnWeight * sbnRate) + (stockWeight * stockRate) + (rdpuWeight * rdpuRate);
 return Number(weighted.toFixed(1));
 }, [sbnAvailable, assetRatios, estimatedStockReturn]);

 // Auto-sync expectedReturn when riskProfile or sbnAvailable or portfolioWeightedReturn changes
 useEffect(() => {
 setExpectedReturn(portfolioWeightedReturn);
 }, [riskProfile, sbnAvailable, portfolioWeightedReturn]);

 // Accumulated Existing Portfolio from Tracker
 const accumulatedExistingPortfolio = useMemo(() => {
 return trackerRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
 }, [trackerRecords]);

 // Dynamic Financial & Lot Calculations
 const calculations = useMemo(() => {
 const sbnAllocation = sbnAvailable ? totalBudget * assetRatios.sbn : 0;
 const stockAllocation = totalBudget * assetRatios.stock;
 const baseRdpuAllocation = sbnAvailable ? totalBudget * assetRatios.rdpu : totalBudget * (assetRatios.rdpu + assetRatios.sbn);

 if (presetStocks.length === 0) {
 const yearsToRetire = Math.max(1, targetAge - currentAge);
 const annualExpenseNow = monthlyExpense * 12;
 const futureAnnualExpense = annualExpenseNow * Math.pow(1 + inflationRate / 100, yearsToRetire);
 const futureMonthlyExpense = futureAnnualExpense / 12;
 const targetCorpusNominal = futureAnnualExpense * 25;

 return {
 sbnAllocation,
 stockAllocation,
 baseRdpuAllocation,
 totalStockSpent: 0,
 stockCashChange: 0,
 finalRdpuTopup: baseRdpuAllocation,
 grandTotalAllocated: totalBudget,
 calculatedStocks: [],
 investmentRatioPct: ((totalBudget / (totalBudget + monthlyExpense)) * 100).toFixed(1),
 monthsOfSafetyNet: (totalBudget / monthlyExpense).toFixed(1),
 yearsToRetire,
 futureMonthlyExpense,
 targetCorpusNominal,
 projectedFutureCorpus: 0,
 corpusAchievementPct: 0,
 estimatedAchievedYear: new Date().getFullYear() + yearsToRetire,
 estimatedAchievedAge: targetAge,
 monthsToTarget: yearsToRetire * 12,
 };
 }

  // Allocate stock budget among preset stocks (Logic moved to calculatedStocks useMemo above)
  const totalStockSpent = calculatedStocks.reduce((sum, st) => sum + st.cost, 0);
  const stockCashChange = stockAllocation - totalStockSpent;
  const finalRdpuTopup = baseRdpuAllocation + stockCashChange;
  const grandTotalAllocated = totalStockSpent + sbnAllocation + finalRdpuTopup;

 const investmentRatioPct = ((totalBudget / (totalBudget + monthlyExpense)) * 100).toFixed(1);
 const monthsOfSafetyNet = (totalBudget / monthlyExpense).toFixed(1);

 // --- RETIREMENT TARGET COMPUTATIONS ---
 const yearsToRetire = Math.max(1, targetAge - currentAge);

 const annualExpenseNow = monthlyExpense * 12;
 const futureAnnualExpense = annualExpenseNow * Math.pow(1 + inflationRate / 100, yearsToRetire);
 const futureMonthlyExpense = futureAnnualExpense / 12;

 const targetCorpusNominal = futureAnnualExpense * 25; // 4% Rule

 const rMonthly = expectedReturn / 100 / 12;
 const nMonths = yearsToRetire * 12;

 const fvMonthlySavings = totalBudget * ((Math.pow(1 + rMonthly, nMonths) - 1) / rMonthly) * (1 + rMonthly);
 const fvExistingPortfolio = accumulatedExistingPortfolio * Math.pow(1 + rMonthly, nMonths);

 const projectedFutureCorpus = fvMonthlySavings + fvExistingPortfolio;
 const corpusAchievementPct = Math.min(100, (projectedFutureCorpus / targetCorpusNominal) * 100).toFixed(1);

 let monthsToTarget = 0;
 let runningFV = accumulatedExistingPortfolio;
 while (runningFV < targetCorpusNominal && monthsToTarget < 600) {
 monthsToTarget++;
 runningFV = (runningFV + totalBudget) * (1 + rMonthly);
 }

 const estimatedAchievedYear = new Date().getFullYear() + Math.floor(monthsToTarget / 12);
 const estimatedAchievedAge = currentAge + Math.floor(monthsToTarget / 12);

 const projectedStockCorpus = projectedFutureCorpus * assetRatios.stock;
 const annualDividendIncome = projectedStockCorpus * (effectiveDivYield / 100);
 const monthlyDividendIncome = annualDividendIncome / 12;

 const projectedSbnCorpus = projectedFutureCorpus * (sbnAvailable ? assetRatios.sbn : 0);
 const annualSbnIncome = projectedSbnCorpus * 0.065;
 const monthlySbnIncome = annualSbnIncome / 12;

 const totalPassiveMonthlyIncome = monthlyDividendIncome + monthlySbnIncome;

 return {
 sbnAllocation,
 stockAllocation,
 baseRdpuAllocation,
 calculatedStocks,
 totalStockSpent,
 stockCashChange,
 finalRdpuTopup,
 grandTotalAllocated,
 investmentRatioPct,
 monthsOfSafetyNet,
 yearsToRetire,
 futureMonthlyExpense,
 targetCorpusNominal,
 projectedFutureCorpus,
 corpusAchievementPct,
 estimatedAchievedYear,
 estimatedAchievedAge,
 monthsToTarget,
 effectiveDivYield,
 projectedStockCorpus,
 annualDividendIncome,
 monthlyDividendIncome,
 projectedSbnCorpus,
 annualSbnIncome,
 monthlySbnIncome,
 totalPassiveMonthlyIncome,
 };
 }, [
 totalBudget,
 monthlyExpense,
 sbnAvailable,
 assetRatios,
 presetStocks,
 stockPrices,
 currentAge,
 targetAge,
 expectedReturn,
inflationRate,
 accumulatedExistingPortfolio,
 manualLots,
 ]);

  const filteredCandidates = useMemo(() => {
    return pensionCandidates.filter((st) => {
      if (candidateSyariahOnly && !isSyariahStock(st.ticker, st.sector)) return false;
      if (candidateMinYield > 0 && (st.dividendYield || 0) < candidateMinYield) return false;
      if (candidateSearch.trim()) {
        const q = candidateSearch.toLowerCase().trim();
        const matchTicker = st.ticker?.toLowerCase().includes(q);
        const matchName = st.name?.toLowerCase().includes(q);
        const matchSector = st.sector?.toLowerCase().includes(q);
        if (!matchTicker && !matchName && !matchSector) return false;
      }
      return true;
    });
  }, [pensionCandidates, candidateSearch, candidateSyariahOnly, candidateMinYield]);

  const handleCopySummary = () => {
    const stockLines = (calculations.calculatedStocks || [])
      .map((st) => `• ${st.ticker}: ${st.lots} Lot (Rp ${st.cost.toLocaleString('id-ID')})`)
      .join('\n');

    const text = `🛒 ORDER BELANJA SAHAM PENSIUN (${riskProfile}):
${stockLines}
---
Total Belanja Saham: Rp ${calculations.totalStockSpent.toLocaleString('id-ID')}
SBN Ritel (${sbnAvailable ? (assetRatios.sbn * 100) + '%' : 'OFF'}): Rp ${calculations.sbnAllocation.toLocaleString('id-ID')}
Top-Up RDPU: Rp ${calculations.finalRdpuTopup.toLocaleString('id-ID')}
Target Dana Pensiun (${targetAge} Thn): Rp ${calculations.targetCorpusNominal.toLocaleString('id-ID')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

 return (
 <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
 
 {/* Top User Auth Bar */}
 <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-300 dark:border-white/10">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-slate-900 dark:text-white text-xs">
 {currentUser ? currentUser.name.charAt(0).toUpperCase() : '👤'}
 </div>
 <div>
 {currentUser ? (
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-900 dark:text-white">Halo, {currentUser.name}</span>
 <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-500/30">
 {riskProfile}
 </span>
 </div>
 ) : (
 <span className="text-xs text-slate-500 dark:text-slate-400">
 Mode Tamu (Silakan login untuk menyimpan portofolio tracker Anda ke database)
 </span>
 )}
 </div>
 </div>

 <div>
 {currentUser ? (
 <button
 onClick={handleLogout}
 className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
 >
 Logout
 </button>
 ) : (
 <button
 onClick={() => setShowAuthModal(true)}
 className="text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-xl shadow-lg transition-all"
 >
 🔑 Login / Registrasi Akun
 </button>
 )}
 </div>
 </div>

 {/* Header Banner */}
 <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-300 dark:border-white/10 relative overflow-hidden bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-50 dark:to-[#0a0f1a]">
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xl sm:text-2xl">🏖️</span>
 <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
 Kalkulator Alokasi & Target Dana Pensiun
 </h2>
 </div>
 <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
 Rekomendasi preset saham dinamis ter-update dari database (Analisis Fundamental, Valuasi PER/PBV & Dividen Yield/Streak).
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2 sm:gap-3">
 <button
 onClick={() => {
 syncCustomPresetToDB([]); 
 fetchDynamicPreset(riskProfile, true);
 }}
 disabled={loadingPreset}
 className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-[11px] sm:text-xs transition-colors border border-slate-300 dark:border-white/10 flex items-center gap-1.5 disabled:opacity-50"
 title="Generate Ulang Preset Dinamis (Hapus Preset Kustom)"
 >
 <svg className={`w-3.5 h-3.5 ${loadingPreset ? 'animate-spin' : ''}`} viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2">
 <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
 </svg>
 <span>{loadingPreset ? 'Memuat...' : '🔄 Generate Ulang'}</span>
 </button>

 <button
 onClick={handleRefreshPrices}
 className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[11px] sm:text-xs transition-colors border border-blue-500/20 flex items-center gap-1.5"
 >
 <span>⚡ Refresh Harga</span>
 </button>

 <button
 onClick={handleCopySummary}
 className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] sm:text-xs transition-all shadow-lg shadow-emerald-500/20 rounded-xl flex items-center gap-2"
 >
 {copied ? '✓ Tersalin!' : '📋 Salin Order'}
 </button>
 </div>
 </div>
 </div>

 {/* 2-COLUMN DASHBOARD LAYOUT */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 
 {/* LEFT COLUMN: Configuration Panel */}
 <div className="lg:col-span-3 space-y-4 static lg:sticky lg:top-24 z-10">
 <div className="glass-panel p-5 rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/50 shadow-xl">
 <div 
 onClick={() => setMobileParamsOpen(!mobileParamsOpen)}
 className="flex justify-between items-center cursor-pointer lg:cursor-default select-none border-b border-slate-300 dark:border-white/10 pb-3"
 >
 <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
 <span>⚙️</span> Parameter Perhitungan
 </h3>
 <span className="lg:hidden text-xs font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1">
 {mobileParamsOpen ? '▲ Sembunyikan' : '▼ Parameter'}
 </span>
 </div>

 <div className={`${mobileParamsOpen ? 'block' : 'hidden lg:block'} space-y-4 pt-3`}>

 {/* Risk Profile Selector */}
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-indigo-700 dark:text-indigo-400 font-extrabold block">
 🎛️ Profil Risiko Investasi
 </label>
 <select
 value={riskProfile}
 onChange={(e) => setRiskProfile(e.target.value)}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-indigo-400"
 >
 <option value="CONSERVATIVE">🟢 Konservatif (SBN 60%)</option>
 <option value="MODERATE">🟡 Moderat (SBN 50% / Saham 35%)</option>
 <option value="AGGRESSIVE">🔴 Agresif (SBN 30% / Saham 60%)</option>
 </select>
 <div className="text-[9px] text-slate-700 dark:text-slate-300 font-bold bg-indigo-50 dark:bg-indigo-950/30 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
 💡 Return Portofolio: <strong className="text-indigo-700 dark:text-indigo-300">{portfolioWeightedReturn}% / thn</strong>
 <br />
 <span className="text-[8.5px] text-slate-600 dark:text-slate-400 font-medium">
 (SBN 6.5% | Saham {estimatedStockReturn.toFixed(1)}% | RDPU 5.0%)
 </span>
 </div>
 </div>

 {/* Pengeluaran Bulanan */}
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-amber-800 dark:text-amber-400 font-extrabold block">
 💸 Pengeluaran Bulanan
 </label>
 <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400">
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">Rp</span>
 <input
 type="text"
 value={monthlyExpense === 0 ? '' : monthlyExpense.toLocaleString('id-ID')}
 onChange={(e) => {
   const val = e.target.value.replace(/\D/g, '');
   setMonthlyExpense(val ? Number(val) : 0);
 }}
 className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
 />
 </div>
 </div>

 {/* Total Menabung Bulanan */}
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-extrabold block">
 💰 Total Investasi Bulanan
 </label>
 <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-400">
 <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">Rp</span>
 <input
 type="text"
 value={totalBudget === 0 ? '' : totalBudget.toLocaleString('id-ID')}
 onChange={(e) => {
   const val = e.target.value.replace(/\D/g, '');
   setTotalBudget(val ? Number(val) : 0);
 }}
 className="w-full bg-transparent text-sm font-extrabold text-emerald-700 dark:text-emerald-400 focus:outline-none"
 />
 </div>
 </div>

 {/* Usia & Target */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-indigo-700 dark:text-indigo-400 font-extrabold block">Usia Saat Ini</label>
 <input
 type="number"
 value={currentAge}
 onChange={(e) => setCurrentAge(Math.max(18, Number(e.target.value)))}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-400"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-indigo-700 dark:text-indigo-400 font-extrabold block">Usia Pensiun</label>
 <input
 type="number"
 value={targetAge}
 onChange={(e) => setTargetAge(Math.max(currentAge + 1, Number(e.target.value)))}
 className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-indigo-400"
 />
 </div>
 </div>

 {/* Asumsi Return & Inflasi */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <label className="text-[10px] uppercase text-purple-700 dark:text-purple-400 font-extrabold block">Target Return</label>
 <button
 type="button"
 onClick={() => {
 setCustomDivYield(null);
 setCustomGrowthRate(null);
 // Force expectedReturn to the pure auto weighted return
 const sbnWeight = sbnAvailable ? assetRatios.sbn : 0;
 const rdpuWeight = sbnAvailable ? assetRatios.rdpu : (assetRatios.rdpu + assetRatios.sbn);
 const stockWeight = assetRatios.stock;
 const autoStockRet = autoStockDivYield + autoStockGrowthRate;
 const autoWeighted = (sbnWeight * 6.5) + (stockWeight * autoStockRet) + (rdpuWeight * 5.0);
 setExpectedReturn(Number(autoWeighted.toFixed(1)));
 }}
 className="text-[9px] text-purple-700 dark:text-purple-300 font-extrabold hover:underline"
 title="Reset Dividen & Growth ke Auto, lalu samakan dengan bobot portofolio"
 >
 ⚡ Sync All ({portfolioWeightedReturn}%)
 </button>
 </div>
 <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-purple-400">
 <input
 type="number"
 step="0.1"
 value={expectedReturn}
 onChange={(e) => setExpectedReturn(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent text-xs font-bold text-purple-700 dark:text-purple-300 focus:outline-none"
 />
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">%</span>
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] uppercase text-rose-700 dark:text-rose-400 font-extrabold block">Inflasi / Thn</label>
 <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-rose-400">
 <input
 type="number"
 value={inflationRate}
 onChange={(e) => setInflationRate(Math.max(1, Number(e.target.value)))}
 className="w-full bg-transparent text-xs font-bold text-rose-700 dark:text-rose-300 focus:outline-none"
 />
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">%</span>
 </div>
 </div>
 </div>

 {/* Variable Return Saham (Dividen & Growth) */}
 <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-300 dark:border-white/10">
 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <label className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-extrabold block">Dividen Saham</label>
 {customDivYield !== null && (
 <button
 type="button"
 onClick={() => setCustomDivYield(null)}
 className="text-[8px] text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
 title="Reset ke rata-rata preset"
 >
 🔄 Auto
 </button>
 )}
 </div>
 <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-400">
 <input
 type="number"
 step="0.1"
 value={effectiveDivYield}
 onChange={(e) => setCustomDivYield(Math.max(0, Number(e.target.value)))}
 className="w-full bg-transparent text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
 />
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">%</span>
 </div>
 <span className="text-[8.5px] text-slate-600 dark:text-slate-400 block font-medium">
 {customDivYield === null ? `Preset avg: ${autoStockDivYield}%` : 'Manual Custom'}
 </span>
 </div>

 <div className="space-y-1">
 <div className="flex justify-between items-center">
 <label className="text-[10px] uppercase text-indigo-700 dark:text-indigo-400 font-extrabold block">Growth Saham</label>
 {customGrowthRate !== null && (
 <button
 type="button"
 onClick={() => setCustomGrowthRate(null)}
 className="text-[8px] text-indigo-700 dark:text-indigo-300 font-bold hover:underline"
 title="Reset ke rata-rata preset"
 >
 🔄 Auto
 </button>
 )}
 </div>
 <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-400">
 <input
 type="number"
 step="0.1"
 value={effectiveGrowthRate}
 onChange={(e) => setCustomGrowthRate(Math.max(0, Number(e.target.value)))}
 className="w-full bg-transparent text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none"
 />
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">%</span>
 </div>
 <div className="flex justify-between items-center text-[8.5px] text-slate-600 dark:text-slate-400 font-medium">
 <span>{customGrowthRate === null ? `Preset avg: ${autoStockGrowthRate}%` : 'Manual Custom'}</span>
 <span className="font-bold text-emerald-600 dark:text-emerald-400">Total: {estimatedStockReturn}%/thn</span>
 </div>
 </div>
 </div>

 {/* Toggle SBN */}
 <button
 onClick={() => setSbnAvailable(!sbnAvailable)}
 className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border mt-2 ${
 sbnAvailable
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
 : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
 }`}
 >
 {sbnAvailable ? `✅ SBN Tersedia (${(assetRatios.sbn * 100).toFixed(0)}%)` : '⚠️ SBN Kosong (Alihkan ke RDPU)'}
 </button>

 {/* Tombol Simpan Parameter */}
 <button
 onClick={handleSaveParameters}
 className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-3"
 >
 <span>💾 Simpan Parameter</span>
 </button>

 {paramsSavedMsg && (
 <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-center text-xs font-bold animate-fade-in mt-2">
 ✓ Parameter berhasil disimpan!
 </div>
 )}

 </div>
 </div>
 </div>

 {/* RIGHT COLUMN: Results & Output */}
 <div className="lg:col-span-9 space-y-6">
 
 {/* 4 Highlight Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
 {/* Target Dana */}
 <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 dark:from-indigo-950/50 to-white dark:to-[#0a0f1a]">
 <span className="text-[9px] sm:text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1">🎯 Target Dana Pensiun</span>
 <div className="text-sm sm:text-lg font-black text-slate-900 dark:text-white mb-1 sm:mb-2 break-all">
 Rp {calculations.targetCorpusNominal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
 </div>
 <p className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-tight hidden sm:block">
 Mencukupi kebutuhan <strong>Rp {calculations.futureMonthlyExpense.toLocaleString('id-ID', { maximumFractionDigits: 0 })}/bln</strong> di usia {targetAge} (inflasi {inflationRate}%).
 </p>
 </div>

 {/* Estimasi Terkumpul */}
 <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 dark:from-emerald-950/50 to-white dark:to-[#0a0f1a]">
 <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">📅 Kapan Terkumpul?</span>
 <div className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mb-1 sm:mb-2">
 Tahun {calculations.estimatedAchievedYear}
 </div>
 <p className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-tight hidden sm:block">
 Tercapai pada usia <strong>{calculations.estimatedAchievedAge} Thn</strong> ({calculations.monthsToTarget} bulan dari sekarang).
 </p>
 </div>

 {/* Proyeksi Saat Pensiun */}
 <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-50/80 dark:from-purple-950/50 to-white dark:to-[#0a0f1a] flex flex-col justify-between">
 <div>
 <span className="text-[9px] sm:text-[10px] font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider block mb-1">📈 Proyeksi Aset Usia {targetAge}</span>
 <div className="text-sm sm:text-lg font-black text-purple-700 dark:text-purple-300 break-all">
 Rp {calculations.projectedFutureCorpus.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
 </div>
 </div>
 <div className="mt-3">
 <div className="flex justify-between text-[9px] text-slate-700 dark:text-slate-300 mb-1 font-bold">
 <span>Pencapaian Target</span>
 <span className="text-purple-700 dark:text-purple-300 font-extrabold">{calculations.corpusAchievementPct}%</span>
 </div>
 <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
 <div
 className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, calculations.corpusAchievementPct)}%` }}
 ></div>
 </div>
 </div>
 </div>

 {/* Passive Income Pensiun */}
 <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50/80 dark:from-amber-950/50 to-white dark:to-[#0a0f1a] flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between">
 <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1">💵 Passive Income</span>
 <span className="text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30">DRIP</span>
 </div>
 <div className="text-sm sm:text-lg font-black text-amber-800 dark:text-amber-300 break-all">
 Rp {calculations.totalPassiveMonthlyIncome ? calculations.totalPassiveMonthlyIncome.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : 0} <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">/bln</span>
 </div>
 </div>
 <div className="mt-2 space-y-0.5 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium">
 <div className="flex justify-between">
 <span>📈 Dividen Saham ({calculations.effectiveDivYield}%):</span>
 <span className="font-bold text-slate-900 dark:text-white">Rp {Math.round(calculations.monthlyDividendIncome || 0).toLocaleString('id-ID')}/bln</span>
 </div>
 {sbnAvailable && (
 <div className="flex justify-between">
 <span>🏛️ Kupon SBN Ritel (6.5%):</span>
 <span className="font-bold text-slate-900 dark:text-white">Rp {Math.round(calculations.monthlySbnIncome || 0).toLocaleString('id-ID')}/bln</span>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Sub-Tab Navigation Bar */}
 <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-300 dark:border-white/10 w-full sm:w-fit">
 <button
 onClick={() => setActiveSubTab('calculator')}
 className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all ${
 activeSubTab === 'calculator'
 ? 'bg-indigo-600 text-white shadow-lg'
 : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
 }`}
 >
 🧮 Kalkulator Alokasi Aset
 </button>
 <button
 onClick={() => setActiveSubTab('tracker')}
 className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all ${
 activeSubTab === 'tracker'
 ? 'bg-emerald-600 text-white shadow-lg'
 : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
 }`}
 >
 📊 Tracker Eksekusi Pribadi
 </button>
 <button
 onClick={() => setActiveSubTab('rebalance')}
 className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all ${
 activeSubTab === 'rebalance'
 ? 'bg-amber-600 text-white shadow-lg'
 : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
 }`}
 >
 ⚖️ Evaluasi & Rebalancing
 </button>
 </div>

  {/* TAB CONTENTS */}
  {activeSubTab === 'calculator' && (
  <div className="space-y-6 animate-in fade-in duration-300">
  
  {/* Langkah 1: Tabel Belanja Saham Preset Dinamis */}
  <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/20">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-300 dark:border-white/10 mb-4 gap-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-extrabold text-indigo-700 dark:text-indigo-400 text-sm">1</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Langkah 1: Belanja Saham ({(assetRatios.stock * 100).toFixed(0)}%)</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
              Budget: Rp {(totalBudget * assetRatios.stock).toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">Alokasi otomatis & dinamis tanpa melebihi batas belanja</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
        <button
          onClick={() => setShowCandidatesModal(true)}
          className="px-3 py-1.5 text-[11px] font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          title="Buka daftar 30 saham kandidat pensiun terbaik berdasarkan skor fundamental & dividen"
        >
          <span>🏆</span>
          <span>30 Kandidat Saham</span>
          <span className="bg-white/20 text-[9px] px-1.5 py-0.2 rounded-full font-black">Top 30</span>
        </button>

        {Object.keys(manualLots).length > 0 && (
          <button
            onClick={handleResetAutoLots}
            className="px-2.5 py-1.5 text-[10.5px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/60 rounded-lg border border-indigo-300 dark:border-indigo-700 transition-all flex items-center gap-1 shadow-sm"
            title="Reset semua perubahan manual dan hitung ulang lot proporsional"
          >
            🔄 Auto-Hitung ({Object.keys(manualLots).length} kustom)
          </button>
        )}
        {lastSyncTime && (
          <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold px-2 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            Data: {lastSyncTime}
          </span>
        )}
      </div>
    </div>

    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800/30">
        <thead className="bg-slate-100 dark:bg-white/[0.02]">
          <tr className="text-left text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <th className="py-2.5 px-3">Saham</th>
            <th className="py-2.5 px-3 text-right">Harga Beli</th>
            <th className="py-2.5 px-3 text-center">Skor & Yield</th>
            <th className="py-2.5 px-3 text-center" title="Gunakan tombol - / + untuk mengatur jumlah lot tanpa melebihi batas belanja">
              Jml Lot (Atur)
            </th>
            <th className="py-2.5 px-3 text-right">Total Biaya</th>
            <th className="py-2.5 px-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30 bg-white dark:bg-[#0a0f1a]/20">
          {calculations.calculatedStocks.map((st) => (
            <tr key={st.ticker} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.04] transition-colors">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                    {st.ticker}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs">{st.ticker}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">{st.name}</span>
                      {isSyariahStock(st.ticker, st.sector) && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 whitespace-nowrap leading-none" title="Saham Syariah (DES / ISSI)">
                          🌙 Syariah
                        </span>
                      )}
                      {st.isDividendTrap && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 whitespace-nowrap leading-none" title="Peringatan: Ritel masuk jelang/pasca Dividen (Potensi Trap)">
                          ⚠️ Div. Trap
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      value={st.price || ''}
                      onChange={(e) => handlePriceChange(st.ticker, e.target.value)}
                      className="w-16 px-1.5 py-1 text-right bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded font-bold text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-center">
                <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">{st.dividendYield ? st.dividendYield.toFixed(1) + '%' : '-'}</div>
                <div className="text-[9px] text-slate-600 dark:text-slate-400 font-bold">Skor: {st.finalPensionScore}</div>
              </td>
              <td className="py-3 px-3 text-center">
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDecrementLot(st.ticker)}
                      disabled={!st.canDecrement}
                      className="w-6 h-6 rounded-md bg-slate-200 hover:bg-rose-500 hover:text-white dark:bg-white/10 dark:hover:bg-rose-500 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-slate-200 dark:disabled:hover:bg-white/10 disabled:hover:text-inherit"
                      title="Kurangi 1 Lot (-)"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={st.maxLots}
                      value={st.lots === 0 && st.isManual ? 0 : (st.lots || '')}
                      onChange={(e) => handleLotChange(st.ticker, e.target.value)}
                      className={`w-12 px-1 py-1 text-center border rounded-md font-extrabold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        st.isManual
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleIncrementLot(st.ticker)}
                      disabled={!st.canIncrement}
                      className="w-6 h-6 rounded-md bg-slate-200 hover:bg-emerald-500 hover:text-white dark:bg-white/10 dark:hover:bg-emerald-500 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-slate-200 dark:disabled:hover:bg-white/10 disabled:hover:text-inherit"
                      title={st.canIncrement ? "Tambah 1 Lot (+)" : "Sisa anggaran saham tidak mencukupi untuk menambah lot"}
                    >
                      +
                    </button>
                  </div>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${st.isManual ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}>
                    {st.isManual ? 'Kustom' : 'Auto'} ({st.weightPct})
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                <div className="text-[11px] font-extrabold text-slate-900 dark:text-white">Rp {st.cost.toLocaleString('id-ID')}</div>
              </td>
              <td className="py-3 px-3 text-center">
                <button onClick={() => handleRemoveStock(st.ticker)} className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Real-Time Stock Shopping Budget Meter */}
    <div className="mt-3 p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] font-bold text-slate-700 dark:text-slate-300 gap-1">
        <div className="flex items-center gap-2">
          <span>🛒 Total Belanja Saham:</span>
          <span className="font-extrabold text-slate-900 dark:text-white">
            Rp {calculations.totalStockSpent.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            / Rp {calculations.stockAllocation.toLocaleString('id-ID')} ({((calculations.totalStockSpent / (calculations.stockAllocation || 1)) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px]">
          <span className="text-slate-500 dark:text-slate-400">Sisa Kas Saham:</span>
          <span className="font-extrabold text-purple-700 dark:text-purple-300">
            Rp {Math.max(0, calculations.stockCashChange).toLocaleString('id-ID')}
          </span>
          <span className="text-[9px] text-slate-400 font-normal">(dialihkan otomatis ke RDPU)</span>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, (calculations.totalStockSpent / (calculations.stockAllocation || 1)) * 100)}%` }}
        />
      </div>
    </div>

    <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Kode Saham..."
            value={customTickerInput}
            onChange={(e) => setCustomTickerInput(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white font-bold w-32 focus:outline-none focus:border-indigo-400 uppercase"
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStock()}
          />
          <button
            onClick={handleAddCustomStock}
            disabled={addingCustomTicker || !customTickerInput.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all disabled:opacity-50"
          >
            {addingCustomTicker ? 'Menambahkan...' : 'Tambah'}
          </button>
          <button
            onClick={() => setShowCandidatesModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            🏆 30 Kandidat Saham
          </button>
          <button
            onClick={handleOptimizeLots}
            disabled={isOptimizing || calculatedStocks.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            {isOptimizing ? '🔄 Optimizing...' : '✨ AI Optimize Lots'}
          </button>
        </div>

        {/* Quick-Add Favorite Bluechips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold">Bluechip Pensiun (Real-time BEI):</span>
          {(bluechipOptions || ['BBRI', 'BMRI', 'BBCA', 'TLKM', 'ADRO', 'PGAS', 'KLBF', 'ASII']).map((t) => {
            const isAdded = presetStocks.some(st => st.ticker === t);
            return (
              <button
                key={t}
                onClick={() => !isAdded && handleAddCustomStockByTicker(t)}
                disabled={isAdded || addingCustomTicker}
                className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                  isAdded
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 cursor-default font-extrabold'
                    : 'bg-slate-100 hover:bg-indigo-500/20 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-indigo-400'
                }`}
              >
                {isAdded ? `✓ ${t}` : `+ ${t}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-right self-end md:self-auto">
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">Subtotal Belanja Saham</div>
        <div className="text-lg font-black text-slate-900 dark:text-white">Rp {calculations.totalStockSpent.toLocaleString('id-ID')}</div>
      </div>
    </div>
  </div>

  {/* Langkah 2: Alokasi Pendapatan Tetap & Kas */}
 <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-purple-50/60 dark:bg-purple-950/20">
 <div className="flex items-center gap-3 pb-4 border-b border-slate-300 dark:border-white/10 mb-4">
 <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center font-extrabold text-purple-700 dark:text-purple-400 text-sm">2</div>
 <div>
 <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Langkah 2: Instrumen Tetap & RDPU</h3>
 <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">Beli instrumen rendah risiko dengan sisa anggaran</p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* SBN Ritel */}
 <div className={`p-4 rounded-xl border ${sbnAvailable ? 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10' : 'bg-amber-500/5 border-amber-500/20 opacity-60'}`}>
 <div className="flex justify-between items-start mb-2">
 <div className="flex items-center gap-2">
 <span className="text-xl">🏛️</span>
 <div>
 <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">SBN Ritel</h4>
 <div className="text-[9px] text-slate-600 dark:text-slate-400 font-bold">Porsi {sbnAvailable ? (assetRatios.sbn * 100).toFixed(0) + '%' : '0%'}</div>
 </div>
 </div>
 </div>
 <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-2">
 Rp {calculations.sbnAllocation.toLocaleString('id-ID')}
 </div>
 </div>

 {/* RDPU */}
 <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 relative overflow-hidden">
 <div className="flex justify-between items-start mb-2 relative z-10">
 <div className="flex items-center gap-2">
 <span className="text-xl">💵</span>
 <div>
 <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">RDPU Top-up</h4>
 <div className="text-[9px] text-slate-600 dark:text-slate-400 font-bold">Pokok {(assetRatios.rdpu * 100).toFixed(0)}% + Sisa Beli Saham</div>
 </div>
 </div>
 </div>
 <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-2 relative z-10">
 Rp {calculations.finalRdpuTopup.toLocaleString('id-ID')}
 </div>
 
 {/* Background glow for leftover money */}
 {calculations.stockCashChange > 0 && (
 <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
 )}
 </div>
 </div>

 {/* Grand Total Bar */}
 <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 dark:from-emerald-950/40 to-indigo-50 dark:to-indigo-950/40 border border-emerald-500/30 flex justify-between items-center">
 <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Total Alokasi Keseluruhan (100% Pas)</span>
 <span className="text-sm font-black text-slate-900 dark:text-white">Rp {calculations.grandTotalAllocated.toLocaleString('id-ID')}</span>
 </div>
 </div>

 </div>
 )}

 {activeSubTab === 'tracker' && (
 <div className="animate-in fade-in duration-300">
 <PensionTracker
 records={trackerRecords}
 onRefresh={fetchTrackerRecords}
 currentCalculations={calculations}
 stockPrices={stockPrices}
 sbnAvailable={sbnAvailable}
 />
 </div>
 )}

 {activeSubTab === 'rebalance' && (
 <div className="animate-in fade-in duration-300">
 <PensionRebalance
 records={trackerRecords}
 onRefresh={fetchTrackerRecords}
 stockPrices={stockPrices}
 />
 </div>
 )}

 </div>
 </div>

 {/* Disclaimer Box */}
 <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 text-xs mt-6">
 <h4 className="font-extrabold text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5 mb-1">
 <span>⚠️</span> Disclaimer
 </h4>
 <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
 Preset saham dipilih berdasarkan algoritma fundamental dan dividen BEI. Hasil perhitungan murni untuk simulasi edukasi perencanaan keuangan, bukan rekomendasi beli/jual saham. (DYOR)
 </p>
 </div>

  <AuthModal
    isOpen={showAuthModal}
    onClose={() => setShowAuthModal(false)}
    onAuthSuccess={(user) => {
      setCurrentUser(user);
      if (user.riskProfile) setRiskProfile(user.riskProfile);
    }}
  />

  {/* ── MODAL 30 KANDIDAT SAHAM PENSIUN TERBAIK ────────────────────────── */}
  {showCandidatesModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  30 Saham Pilihan Pensiun Terbaik
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Top 30 BEI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Diurutkan berdasarkan <strong>Skor Kualitas Fundamental Pensiun (1-100)</strong> lalu <strong>Dividend Yield</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCandidatesModal(false)}
            className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari kode saham, nama, atau sektor..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCandidateSyariahOnly(!candidateSyariahOnly)}
              className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] border transition-all flex items-center gap-1 cursor-pointer ${
                candidateSyariahOnly
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
              }`}
            >
              🌙 Syariah Saja
            </button>

            <select
              value={candidateMinYield}
              onChange={(e) => setCandidateMinYield(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>Semua Yield</option>
              <option value={4}>Min. Yield ≥ 4%</option>
              <option value={6}>Min. Yield ≥ 6%</option>
              <option value={8}>Min. Yield ≥ 8%</option>
            </select>
          </div>
        </div>

        {/* Candidate List Grid */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-bold">Tidak ada saham yang sesuai dengan filter.</p>
              <button
                onClick={() => { setCandidateSearch(''); setCandidateSyariahOnly(false); setCandidateMinYield(0); }}
                className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCandidates.map((st, idx) => {
                const isAdded = presetStocks.some((p) => p.ticker === st.ticker);
                const isSyariah = isSyariahStock(st.ticker, st.sector);
                return (
                  <div
                    key={st.ticker}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isAdded
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/50 dark:border-emerald-700/40 shadow-sm'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-900 dark:text-white">{st.ticker}</span>
                            {isSyariah && (
                              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 leading-none">
                                🌙 Syariah
                              </span>
                            )}
                            {st.isDividendTrap && (
                              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 leading-none">
                                ⚠️ Div. Trap
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[190px]">
                            {st.name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Rp {Number(st.price || 0).toLocaleString('id-ID')}
                        </span>
                        <div className="text-[9.5px] text-slate-400 font-medium">{st.sector || '-'}</div>
                      </div>
                    </div>

                    {/* Metrics Badge Grid */}
                    <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 rounded-lg bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-center">
                      <div>
                        <div className="text-[8.5px] text-slate-400 font-medium">Skor Pensiun</div>
                        <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                          {st.finalPensionScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8.5px] text-slate-400 font-medium">Div. Yield</div>
                        <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                          {st.dividendYield ? `${Number(st.dividendYield).toFixed(1)}%` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8.5px] text-slate-400 font-medium">ROE</div>
                        <div className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                          {st.metrics?.roe ? `${Number(st.metrics.roe).toFixed(1)}%` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8.5px] text-slate-400 font-medium">DER</div>
                        <div className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                          {st.metrics?.der != null ? `${Number(st.metrics.der).toFixed(2)}x` : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCandidate(st)}
                      className={`w-full py-2 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                        isAdded
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <span>✓ Sudah Terpasang</span>
                          <span className="text-[10px] font-medium opacity-80">(Klik untuk Hapus)</span>
                        </>
                      ) : (
                        <>
                          <span>+ Tambahkan ke Belanja Saham</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium text-[11px]">
            Menampilkan {filteredCandidates.length} dari {pensionCandidates.length} kandidat pensiun teratas.
          </span>
          <button
            onClick={() => setShowCandidatesModal(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ── TOAST NOTIFICATION ──────────────────────────────────────────── */}
 {toast && (
   <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
     <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md ${
       toast.type === 'error'
         ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
         : toast.type === 'warning'
         ? 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
         : 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:emerald-800 text-emerald-800 dark:text-emerald-200'
     }`}>
       <span>{toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}</span>
       <span>{toast.message}</span>
       <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
     </div>
   </div>
 )}
 </div>
 );
}
