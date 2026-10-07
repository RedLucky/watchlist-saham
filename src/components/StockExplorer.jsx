'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import StockChart from './StockChart';
import RelativeValuationPeers from './RelativeValuationPeers';
import ValuationBandsPanel from './ValuationBandsPanel';
import EconomicValuePanel from './EconomicValuePanel';
import ScenarioForecaster from './ScenarioForecaster';
import DividendTrapPanel from './DividendTrapPanel';
import CorporateActionsPanel from './CorporateActionsPanel';
import AutoRejectionLadderPanel from './AutoRejectionLadderPanel';
import SmartMoneyLiquidityPanel from './SmartMoneyLiquidityPanel';
import BloombergIntelligencePanel from './BloombergIntelligencePanel';
import MonthlySeasonalityPanel from './MonthlySeasonalityPanel';
import FinancialMatrixPanel from './FinancialMatrixPanel';
import CollectionSortDropdown from './CollectionSortDropdown';
import {
  roundToIDXTick,
  calculateMonitorMetrics,
  calculateTargetSellFromPercent,
  calculateTargetPercentFromPrices,
} from '@/lib/tradeSetup';
import {
  getCompositeScore,
  getScoreTone,
  getTargetStatus,
  getTargetProgress,
  summarizeCollection,
} from '@/lib/collectionCardUtils';
import { PageShell, PageHeader, PageToolbar } from './ui/PageShell';

/** Tailwind classes for each score band returned by getScoreTone (collection cards). */
const SCORE_TONE_CLASSES = {
  excellent: 'bg-up-soft text-up  ',
  good: 'bg-sunken text-ink  ',
  fair: 'bg-warn-soft text-warn  ',
  poor: 'bg-down-soft text-down  ',
};

/** Shared look for the square icon buttons in the Koleksi toolbar. */
const TOOLBAR_BUTTON_CLASS = 'w-9 h-9 flex items-center justify-center text-sm rounded-sm border border-line  bg-sunken  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const TOOLBAR_BUTTON_HOVER = 'hover:bg-sunken  hover:border-line-strong ';

function getNominalChange(price, changePercent) {
  if (!price || changePercent == null || !Number.isFinite(price) || !Number.isFinite(changePercent)) return 0;
  const prevClose = price / (1 + changePercent / 100);
  return Math.round(price - prevClose);
}

function getAlgorithmicRecommendation({ stockDetail, scores }) {
  if (!stockDetail) return { label: 'Analisis Data...', desc: 'Sedang memuat data emiten', bgClass: 'bg-sunken  text-ink ' };
  
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
      label: 'Strong Accumulate ↑',
      desc: 'Sinergi fundamental solid, akumulasi smart money, dan tren teknikal prima.',
      bgClass: 'bg-up-soft text-up   border border-up '
    };
  }

  // 2. Value Buy / Undervalued Gems
  if ((proj.marginOfSafety || 0) >= 20 && (f.piotroskiFScore || 0) >= 5 && (f.der || 0) <= 2) {
    return {
      label: 'Value Buy (Undervalued) ◆',
      desc: `Diskon MoS +${proj.marginOfSafety}% di bawah Nilai Wajar (Fair Value Rp ${proj.fairValue?.toLocaleString('id-ID') || '-'}) dengan neraca aman.`,
      bgClass: 'bg-sunken text-ink   border border-line '
    };
  }

  // 3. Breakout / Momentum Speculative
  if (tScore >= 70 && (vol.isBreakoutVolume || (vol.volumeSpikeRatio || 0) >= 1.5)) {
    return {
      label: 'Breakout / Momentum Buy »',
      desc: `Konfirmasi breakout dengan lonjakan volume ${vol.volumeSpikeRatio || 1.5}x di atas rata-rata.`,
      bgClass: 'bg-sunken text-ink   border border-line '
    };
  }

  // 4. Dividend Play / Income
  if ((f.dividendYield || 0) >= 4.5 && (f.payoutRatio || 0) <= 85) {
    return {
      label: 'Dividend Aristocrat ▥',
      desc: `Yield dividen tinggi ${f.dividendYield.toFixed(1)}% dengan payout ratio sehat dan konsisten.`,
      bgClass: 'bg-warn-soft text-warn   border border-warn '
    };
  }

  // 5. Buy on Weakness / Pullback
  if (composite >= 55 && (t.rsi14 || 50) <= 45 && !b.smartMoneyStatus?.includes('Outflow')) {
    return {
      label: 'Buy on Weakness (Pullback) ◎',
      desc: 'Harga sedang terkoreksi sehat mendekati area support MA20/MA50 untuk entry bertahap.',
      bgClass: 'bg-up-soft text-up   border border-up '
    };
  }

  // 6. Take Profit / Overbought
  if ((t.rsi14 || 50) >= 75 || (proj.marginOfSafety || 0) < -35) {
    return {
      label: 'Take Profit / Overbought ¤',
      desc: `RSI jenuh beli (${t.rsi14 ? t.rsi14.toFixed(1) : 75}) atau valuasi telah melampaui harga wajar.`,
      bgClass: 'bg-warn-soft text-warn   border border-warn '
    };
  }

  // 7. Waspada Distribusi
  if (b.smartMoneyStatus?.includes('Outflow') || (b.bfiScore || 0) <= -2.5) {
    return {
      label: 'Waspada Distribusi ▲',
      desc: 'Terdeteksi pelepasan posisi (net outflow) oleh institusi / smart money.',
      bgClass: 'bg-down-soft text-down   border border-down '
    };
  }

  // 8. Avoid / Sell
  if (composite < 40 || ((f.altmanZScore || 3) < 1.5 && (f.der || 0) > 3)) {
    return {
      label: 'Avoid / High Risk ●',
      desc: 'Fundamental dan teknikal berisiko tinggi dengan rasio utang/kesehatan keuangan rawan.',
      bgClass: 'bg-down-soft text-down   border border-down '
    };
  }

  // 9. Default Watchlist / Neutral
  return {
    label: 'Watchlist / Hold ⌕',
    desc: 'Metrik dalam rentang netral. Pantau perkembangan volume dan sinyal teknikal lanjutan.',
    bgClass: 'bg-sunken text-ink   border border-line '
  };
}

// ==========================================
// KONSTANTA REKOMENDASI TARGET HARGA (EXPLORER)
// ==========================================
const DEFAULT_BUY_DISCOUNT_RATIO = 0.95;  // Diskon default 5% untuk area akumulasi sehat
const DEFAULT_SELL_TARGET_RATIO = 1.15;   // Target keuntungan standar 15%
const MIN_SUPPORT_DISCOUNT_RATIO = 0.99;  // Minimal diskon 1% di bawah harga saat ini
const MIN_PROJECTED_PREMIUM_RATIO = 1.03; // Minimal proyeksi 12 bulan di atas harga +3%
const MIN_RESISTANCE_PREMIUM_RATIO = 1.02;// Minimal resisten di atas harga +2%
const MIN_FAIR_VALUE_PREMIUM_RATIO = 1.05;// Minimal DCF fair value di atas harga +5%

// Helper: Hitung Rekomendasi Target Beli & Target Jual
export function getRecommendedTargets(stockData) {
  if (!stockData) return { targetBuy: null, targetSell: null, buyLabel: '', sellLabel: '', diff: null, gainPct: null };

  const price = Number(stockData.price || 0);
  const t = stockData.technicals || {};
  const proj = stockData.projections || {};

  if (!price || price <= 0) return { targetBuy: null, targetSell: null, buyLabel: '', sellLabel: '', diff: null, gainPct: null };

  // 1. Target Buy (Area Beli Ideal / Support / Margin of Safety)
  let targetBuy = null;
  let buyLabel = 'Support Teknikal';
  if (t.support && Number(t.support) > 0 && Number(t.support) <= price * MIN_SUPPORT_DISCOUNT_RATIO) {
    targetBuy = Math.round(Number(t.support));
    const discount = Math.round(((price - targetBuy) / price) * 100);
    buyLabel = `Support (-${discount}%)`;
  } else if (proj.grahamNumber && Number(proj.grahamNumber) < price && Number(proj.grahamNumber) > 0) {
    targetBuy = Math.round(Number(proj.grahamNumber));
    const discount = Math.round(((price - targetBuy) / price) * 100);
    buyLabel = `Graham Fair Value (-${discount}%)`;
  } else {
    targetBuy = Math.round(price * DEFAULT_BUY_DISCOUNT_RATIO);
    buyLabel = 'Diskon 5% (Area Sehat)';
  }

  // 2. Target Sell (Target Take Profit / Resistance / Fair Value)
  let targetSell = null;
  let sellLabel = 'Target 12 Bulan';
  if (proj.projectedPrice12m && Number(proj.projectedPrice12m) > price * MIN_PROJECTED_PREMIUM_RATIO) {
    targetSell = Math.round(Number(proj.projectedPrice12m));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Target 12B (+${upside}%)`;
  } else if (t.resistance && Number(t.resistance) > price * MIN_RESISTANCE_PREMIUM_RATIO) {
    targetSell = Math.round(Number(t.resistance));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Resistance (+${upside}%)`;
  } else if (proj.fairValue && Number(proj.fairValue) > price * MIN_FAIR_VALUE_PREMIUM_RATIO) {
    targetSell = Math.round(Number(proj.fairValue));
    const upside = Math.round(((targetSell - price) / price) * 100);
    sellLabel = `Nilai Wajar DCF (+${upside}%)`;
  } else {
    targetSell = Math.round(price * DEFAULT_SELL_TARGET_RATIO);
    sellLabel = 'Target Standar (+15%)';
  }

  // Bulatkan harga sesuai fraksi resmi BEI
  if (targetBuy != null) targetBuy = roundToIDXTick(targetBuy);
  if (targetSell != null) targetSell = roundToIDXTick(targetSell);

  const diff = (targetBuy != null && targetSell != null) ? (targetSell - targetBuy) : null;
  const gainPct = (targetBuy != null && targetSell != null && targetBuy > 0) ? ((diff / targetBuy) * 100) : null;

  return { targetBuy, targetSell, buyLabel, sellLabel, diff, gainPct };
}

// Renderer Markdown komprehensif untuk hasil riset AI
// Mendukung H1-H5, divider (---, ***, ___), blockquote, table, code block, inline code, bold, italic, strikethrough, links, nested lists, dan callouts (SKOR AI, KESIMPULAN, ALASAN SINGKAT)
function renderAiMarkdown(content) {
  if (!content) return null;

  const renderInline = (text) => {
    if (!text) return null;

    // Tokenize inline markdown:
    // 1. Links: [label](url)
    // 2. Inline code: `code`
    // 3. Inline math: $...$ or \(...\)
    // 4. Bold-italic: ***text*** or ___text___
    // 5. Bold: **text** or __text__
    // 6. Italic: *text* or _text_ (CommonMark: non-whitespace boundary prevents breaking on multiplication 500 * 22.5)
    // 7. Strikethrough: ~~text~~
    const inlineRegex = /(\[[^\]]+\]\([^\)]+\)|`[^`]+`|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|(?:\*\*\*|___)(?!\s)[^*\n]+?(?<!\s)(?:\*\*\*|___)|(?:\*\*|__)(?!\s)[^*\n]+?(?<!\s)(?:\*\*|__)|(?<!\*)\*(?!\s)[^*\n]+?(?<!\s)\*(?!\*)|(?<!_)_(?!\s)[^_\n]+?(?<!\s)_(?!_)|~~[^~\n]+?~~)/g;
    const parts = text.split(inlineRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // 1. Links: [Text](URL)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <span className="text-[10px]">↗</span>
          </a>
        );
      }

      // 2. Inline code: `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold bg-sunken text-ink border border-line "
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 3. Inline math ($...$ or \(...\))
      const mathMatch = part.match(/^\$([^$\n]+)\$$/) || part.match(/^\\\(([\s\S]+)\\\)$/);
      if (mathMatch) {
        return (
          <span
            key={i}
            className="font-mono px-1 py-0.5 rounded bg-sunken text-ink text-[11px] font-medium"
          >
            {mathMatch[1]}
          </span>
        );
      }

      // 4. Bold-Italic: ***text*** or ___text___
      if (
        (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
        (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
      ) {
        return (
          <strong key={i} className="font-black italic text-ink ">
            {part.slice(3, -3)}
          </strong>
        );
      }

      // 5. Bold: **text** or __text__
      if (
        (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
      ) {
        return (
          <strong key={i} className="font-bold text-ink ">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // 6. Italic: *text* or _text_
      if (
        (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
      ) {
        return (
          <em key={i} className="italic text-ink ">
            {part.slice(1, -1)}
          </em>
        );
      }

      // 7. Strikethrough: ~~text~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={i} className="line-through text-muted ">
            {part.slice(2, -2)}
          </del>
        );
      }

      // 8. Defensive unclosed bold at end of text
      if (part.startsWith('**') && !part.endsWith('**') && part.length > 2) {
        return (
          <strong key={i} className="font-bold text-ink ">
            {part.slice(2)}
          </strong>
        );
      }

      return part;
    });
  };

  const lines = content.split('\n');
  const elements = [];
  let currentCode = null;
  let currentTable = null;

  const flushTable = () => {
    if (!currentTable || currentTable.length === 0) return;
    const tableLines = currentTable;
    currentTable = null;

    const parseCells = (line) => {
      const parts = line.split('|');
      if (line.startsWith('|')) parts.shift();
      if (line.endsWith('|')) parts.pop();
      return parts.map((s) => s.trim());
    };

    const headerLine = tableLines[0];
    const headers = parseCells(headerLine);
    const dataLines = tableLines.slice(1).filter((l) => !/^\|?[\s\-:|]+\|?$/.test(l.trim()));

    elements.push(
      <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-sm border border-line shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-sunken text-ink font-bold">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 border-b border-line ">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink ">
            {dataLines.map((row, rIdx) => {
              const cells = parseCells(row);
              return (
                <tr key={rIdx} className="hover:bg-sunken transition-colors">
                  {cells.map((c, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 font-medium">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const flushCode = () => {
    if (!currentCode) return;
    const codeObj = currentCode;
    currentCode = null;
    elements.push(
      <pre
        key={`code-${elements.length}`}
        className="my-3 p-3 rounded-sm bg-sunken text-ink font-mono text-xs overflow-x-auto border border-line"
      >
        <code>{codeObj.lines.join('\n')}</code>
      </pre>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Fence (```)
    if (trimmed.startsWith('```')) {
      if (currentCode) {
        flushCode();
      } else {
        flushTable();
        currentCode = { lang: trimmed.slice(3).trim(), lines: [] };
      }
      continue;
    }
    if (currentCode) {
      currentCode.lines.push(rawLine);
      continue;
    }

    // 2. Table rows (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!currentTable) currentTable = [];
      currentTable.push(trimmed);
      continue;
    } else if (currentTable) {
      flushTable();
    }

    // 3. Empty line spacer
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // 4. Horizontal Separators (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-3.5 border-t border-line " />);
      continue;
    }

    // 5. Normalisasi untuk memeriksa callout khusus (meskipun terbungkus **bold**)
    const unbolded = trimmed.replace(/^\*+|\*+$/g, '').trim();
    const upperLead = unbolded.toUpperCase();

    // SKOR AI Callout
    if (upperLead.startsWith('SKOR AI:')) {
      elements.push(
        <div
          key={`skor-${i}`}
          className="p-3 my-2.5 rounded-md border border-line flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">★</span>
            <span className="text-xs font-bold text-ink ">Rating Konsensus AI</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-ink font-mono tracking-wide">
            {renderInline(unbolded)}
          </div>
        </div>
      );
      continue;
    }

    // KESIMPULAN Callout
    if (upperLead.startsWith('KESIMPULAN:')) {
      const isBuy = upperLead.includes('BELI') || upperLead.includes('BUY');
      const isSell = upperLead.includes('JUAL') || upperLead.includes('SELL');
      elements.push(
        <div
          key={`kesimpulan-${i}`}
          className={`p-3.5 my-2.5 rounded-md border flex items-center gap-2.5 shadow-sm ${
 isBuy
 ? 'bg-up-soft border-up text-up '
 : isSell
 ? 'bg-down-soft border-down text-down '
 : 'bg-warn-soft border-warn text-warn '
 }`}
        >
          <span className="text-base">{isBuy ? '↑' : isSell ? '▲' : '⇄'}</span>
          <div className="text-xs sm:text-sm font-extrabold tracking-wide">
            {renderInline(unbolded)}
          </div>
        </div>
      );
      continue;
    }

    // ALASAN SINGKAT Callout
    if (upperLead.startsWith('ALASAN SINGKAT:')) {
      elements.push(
        <div
          key={`alasan-${i}`}
          className="p-3 my-1.5 rounded-md bg-sunken border border-line text-xs leading-relaxed text-ink font-medium"
        >
          {renderInline(unbolded)}
        </div>
      );
      continue;
    }

    // 6. Headers (# H1, ## H2, ### H3, #### H4, ##### H5)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <div key={`h1-${i}`} className="pt-2 pb-2 mb-2 border-b-2 border-line">
          <h3 className="text-sm sm:text-base font-black text-ink flex items-center gap-2 tracking-tight">
            <span>▤</span>
            <span>{renderInline(trimmed.replace(/^#\s+/, ''))}</span>
          </h3>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const title = trimmed.replace(/^##\s+/, '');
      const lower = title.toLowerCase();
      let icon = '•';
      if (lower.includes('unit bisnis') || lower.includes('strategis')) icon = '▥';
      else if (lower.includes('pasar') || lower.includes('siklus') || lower.includes('market-fit')) icon = '↻';
      else if (lower.includes('moat') || lower.includes('kompetitor') || lower.includes('keunggulan')) icon = '◇';
      else if (lower.includes('valuasi') || lower.includes('fundamental') || lower.includes('harga wajar')) icon = '▤';
      else if (lower.includes('tren') || lower.includes('teknikal') || lower.includes('momentum')) icon = '↗';
      else if (lower.includes('berita') || lower.includes('sentimen') || lower.includes('katalis')) icon = '▤';
      else if (lower.includes('prospek') || lower.includes('rekomendasi') || lower.includes('kesimpulan')) icon = '◎';

      elements.push(
        <div key={`h2-${i}`} className="pt-4 pb-1.5 border-b border-line ">
          <h4 className="text-xs sm:text-sm font-black text-ink flex items-center gap-2 uppercase tracking-wide">
            <span className="text-sm">{icon}</span>
            <span>{renderInline(title)}</span>
          </h4>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h5 key={`h3-${i}`} className="text-xs font-bold text-ink pt-2 pb-0.5">
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h5>
      );
      continue;
    }

    if (trimmed.startsWith('#### ') || trimmed.startsWith('##### ')) {
      elements.push(
        <h6 key={`h4-${i}`} className="text-[11px] font-bold uppercase tracking-wider text-muted pt-1.5 pb-0.5">
          {renderInline(trimmed.replace(/^#+\s+/, ''))}
        </h6>
      );
      continue;
    }

    // 7. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="p-2.5 my-2 rounded-r-sm border-l-4 border-accent bg-sunken text-xs italic text-ink "
        >
          {renderInline(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // 8. Numbered / Ordered List Items (1. item, 2. item, a) item, (1) item)
    const numMatch = trimmed.match(/^(\d+[\.\)]|[a-zA-Z][\.\)]|\(\d+\))\s+(.*)/);
    if (numMatch) {
      const indent = rawLine.search(/\S/);
      const isSub = indent >= 2;
      elements.push(
        <div key={`num-${i}`} className={`flex items-start gap-2 my-0.5 ${isSub ? 'pl-6' : 'pl-2'}`}>
          <span className="text-ink font-bold text-xs mt-0.5 min-w-[16px]">
            {numMatch[1]}
          </span>
          <span className="flex-1 text-xs text-ink leading-relaxed">
            {renderInline(numMatch[2])}
          </span>
        </div>
      );
      continue;
    }

    // 9. Bullet List Items (- item, * item, • item)
    const bulletMatch = trimmed.match(/^([-*•])\s+(.*)/);
    if (bulletMatch) {
      const indent = rawLine.search(/\S/);
      const isSub = indent >= 2;
      elements.push(
        <div key={`bullet-${i}`} className={`flex items-start gap-2 my-0.5 ${isSub ? 'pl-6' : 'pl-2'}`}>
          <span className={`text-xs mt-0.5 font-bold ${isSub ? 'text-muted ' : 'text-ink '}`}>
            {isSub ? '◦' : '•'}
          </span>
          <span className="flex-1 text-xs text-ink leading-relaxed">
            {renderInline(bulletMatch[2])}
          </span>
        </div>
      );
      continue;
    }

    // 10. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-ink leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  // Flush any pending multi-line blocks at end
  flushCode();
  flushTable();

  return elements;
}

export default function StockExplorer({ user }) {
  // Navigation View State
  const [activeTab, setActiveTab] = useState('collections'); // 'collections' | 'explorer' | 'compare'
  // Collection the user came from when opening a stock via the Koleksi tab (shows a "back" button), or null.
  const [backToCollection, setBackToCollection] = useState(null);
  const [cockpitTab, setCockpitTab] = useState('valuation'); // 'valuation' | 'seasonality' | 'smartmoney' | 'ai'

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


  // AI Research State
  const [aiStatus, setAiStatus] = useState(null); // PENDING, PROCESSING, COMPLETED
  const [aiResearch, setAiResearch] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Modal State: Save Stock to Collection
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [stockNote, setStockNote] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [saveTargetBuy, setSaveTargetBuy] = useState('');
  const [saveTargetSell, setSaveTargetSell] = useState('');
  const [saveTargetPercent, setSaveTargetPercent] = useState('');

  // Modal State: Edit Collection Item (Notes, Target Buy, Target Sell)
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editItemTargetBuy, setEditItemTargetBuy] = useState('');
  const [editItemTargetSell, setEditItemTargetSell] = useState('');
  const [editItemTargetPercent, setEditItemTargetPercent] = useState('');
  const [savingEditItem, setSavingEditItem] = useState(false);

  // Sinkronisasi Interaktif Mode Input Sendiri (Modal Simpan)
  const handleSaveBuyChange = (val) => {
    setSaveTargetBuy(val);
    if (saveTargetPercent) {
      const newSell = calculateTargetSellFromPercent(val, saveTargetPercent);
      if (newSell) setSaveTargetSell(newSell);
    } else if (saveTargetSell) {
      const newPct = calculateTargetPercentFromPrices(val, saveTargetSell);
      if (newPct) setSaveTargetPercent(newPct);
    }
  };

  const handleSaveSellChange = (val) => {
    setSaveTargetSell(val);
    const newPct = calculateTargetPercentFromPrices(saveTargetBuy, val);
    setSaveTargetPercent(newPct);
  };

  const handleSavePercentChange = (pctStr) => {
    setSaveTargetPercent(pctStr);
    const newSell = calculateTargetSellFromPercent(saveTargetBuy, pctStr);
    if (newSell) setSaveTargetSell(newSell);
  };

  // Sinkronisasi Interaktif Mode Input Sendiri (Modal Edit)
  const handleEditBuyChange = (val) => {
    setEditItemTargetBuy(val);
    if (editItemTargetPercent) {
      const newSell = calculateTargetSellFromPercent(val, editItemTargetPercent);
      if (newSell) setEditItemTargetSell(newSell);
    } else if (editItemTargetSell) {
      const newPct = calculateTargetPercentFromPrices(val, editItemTargetSell);
      if (newPct) setEditItemTargetPercent(newPct);
    }
  };

  const handleEditSellChange = (val) => {
    setEditItemTargetSell(val);
    const newPct = calculateTargetPercentFromPrices(editItemTargetBuy, val);
    setEditItemTargetPercent(newPct);
  };

  const handleEditPercentChange = (pctStr) => {
    setEditItemTargetPercent(pctStr);
    const newSell = calculateTargetSellFromPercent(editItemTargetBuy, pctStr);
    if (newSell) setEditItemTargetSell(newSell);
  };

  // Move Stock Between Collections State
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingItem, setMovingItem] = useState(null);
  const [moveTargetCollectionId, setMoveTargetCollectionId] = useState('');
  const [movingStockLoading, setMovingStockLoading] = useState(false);

  // Custom Duplicate / Confirmation Modal State (No browser alert)
  const [duplicateModal, setDuplicateModal] = useState(null);
  // Custom Confirmation Dialog (for delete actions)
  const [confirmDialog, setConfirmDialog] = useState(null);
  // Win Rate Monitor Modal State
  const [monitorModal, setMonitorModal] = useState(null);
  const [monitorEntryPrice, setMonitorEntryPrice] = useState('');
  const [monitorTargetPrice, setMonitorTargetPrice] = useState('');
  const [monitorStopLoss, setMonitorStopLoss] = useState('');
  const [monitorStyle, setMonitorStyle] = useState('swing');
  const [monitorAlreadyBought, setMonitorAlreadyBought] = useState(false);
  const [savingMonitor, setSavingMonitor] = useState(false);
  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Keyboard Accessibility: Close active modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAiModal) setShowAiModal(false);
        else if (monitorModal) setMonitorModal(null);
        else if (confirmDialog) setConfirmDialog(null);
        else if (duplicateModal) setDuplicateModal(null);
        else if (showMoveModal) setShowMoveModal(false);
        else if (showEditItemModal) setShowEditItemModal(false);
        else if (showSaveModal) setShowSaveModal(false);
        else if (showCreateModal) setShowCreateModal(false);
        else if (showEditModal) setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showAiModal, monitorModal, confirmDialog, duplicateModal,
    showMoveModal, showEditItemModal, showSaveModal, showCreateModal, showEditModal
  ]);

  // Drag and Drop reordering state for Collection Cards
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [copiedShareCode, setCopiedShareCode] = useState(null);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Summary numbers (count, target hits, average change) for the Koleksi page.
  const collectionSummary = useMemo(() => summarizeCollection(collectionItems), [collectionItems]);

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

  /**
   * Loads the full detail of one stock into the Pencarian Saham IDX tab.
   * @param {string} ticker - IDX ticker, with or without the ".JK" suffix.
   * @param {boolean} [shouldScroll=true] - Smoothly scroll to the detail section once loaded.
   * @param {boolean} [switchTab=true] - Switch to the Pencarian tab. False for the silent default load.
   */
  const handleSelectStock = async (ticker, shouldScroll = true, switchTab = true) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, '');
    setSelectedStock(cleanTicker);
    setSuggestions([]);
    setSearchQuery(cleanTicker);
    setLoadingDetail(true);
    setDetailError(null);
    if (switchTab) setActiveTab('explorer');
    setAiResearch(null);
    setAiStatus(null);

    try {
      const res = await fetch(`/api/stocks/${cleanTicker}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat data saham');
      }
      const data = await res.json();
      setStockDetail(data);

      // Fetch AI Status
      try {
        const aiRes = await fetch(`/api/ai/research/${cleanTicker}`);
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiResearch(aiData.research || null);
          setAiStatus(aiData.queue?.status || (aiData.research ? 'COMPLETED' : null));
        } else {
          setAiResearch(null);
          setAiStatus(null);
        }
      } catch(e) { 
        console.error('AI fetch err', e); 
      }

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
      // Preload silently so the Pencarian tab is ready, without leaving the Koleksi tab.
      handleSelectStock('BBCA', false, false);
    }
  }, [allTickers]);

  /**
   * Opens a stock clicked in the Koleksi tab: same detail load as before, then the
   * Pencarian tab shows a "back to collection" button for the current collection.
   * @param {string} ticker - Ticker of the clicked collection item.
   */
  const handleOpenFromCollection = (ticker) => {
    setBackToCollection(selectedCollection);
    handleSelectStock(ticker, true);
  };

  /**
   * Opens a stock picked from the search suggestions. Clears the "back to collection"
   * context because the user is no longer browsing a collection.
   * @param {string} ticker - Ticker of the chosen suggestion.
   */
  const handlePickSuggestion = (ticker) => {
    setBackToCollection(null);
    handleSelectStock(ticker);
  };

  // Auto-polling AI queue status if pending or processing
  useEffect(() => {
    if (!selectedStock || (aiStatus !== 'PENDING' && aiStatus !== 'PROCESSING')) return;

    const pollInterval = setInterval(async () => {
      try {
        const aiRes = await fetch(`/api/ai/research/${selectedStock}`);
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.research) {
            setAiResearch(aiData.research);
            setAiStatus('COMPLETED');
            showToast(`✦ Riset AI untuk ${selectedStock} telah selesai!`, 'success');
          } else if (aiData.queue?.status) {
            setAiStatus(aiData.queue.status);
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [selectedStock, aiStatus]);

  const handleAnalyzeAi = async (force = false) => {
    if (!stockDetail || !stockDetail.ticker) return;
    const isForce = typeof force === 'boolean' ? force : false;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: stockDetail.ticker, force: isForce })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAiStatus(data.queue?.status || 'PENDING');
        showToast('✓ Berhasil ditambahkan ke antrian AI', 'success');
      } else {
        if (data.research) {
          setAiResearch(data.research);
          setAiStatus('COMPLETED');
        }
        if (res.status === 401) {
          showToast('⊘ Sesi telah kedaluwarsa atau Anda belum login. Silakan login terlebih dahulu.', 'error');
        } else if (res.status === 429) {
          showToast('ⓘ ' + (data.error || 'Riset AI masih valid (< 30 hari)'), 'info');
        } else {
          showToast('× ' + (data.error || `Gagal antri AI (Status HTTP ${res.status})`), 'error');
        }
      }
    } catch (err) {
      console.error('AI Research trigger error:', err);
      const msg = err.message?.toLowerCase() || '';
      const isNetworkError = msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed');
      showToast(
        isNetworkError
          ? '× Gagal menghubungi server web. Pastikan server lokal (port 3050) atau container Docker (port 3010) aktif.'
          : `× Terjadi kesalahan: ${err.message}`,
        'error'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

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
      showToast(`Saham ${cleanTicker} sudah ada dalam daftar komparasi.`, 'warning');
      return;
    }
    if (compareList.length >= 6) {
      showToast('Maksimal 6 saham untuk dikomparasi secara bersamaan.', 'warning');
      return;
    }

    setCompareList(prev => prev.includes(cleanTicker) ? prev : [...prev, cleanTicker].slice(0, 6));
    setCompareSearchQuery('');
    setCompareSuggestions([]);
    
    setLoadingCompare(true);
    await fetchCompareStockData(cleanTicker);
    setLoadingCompare(false);
  };

  const handleAddMultipleToCompare = async (tickers) => {
    if (!Array.isArray(tickers) || tickers.length === 0) return;
    const cleanTickers = tickers
      .map(t => t.toUpperCase().replace(/\.JK$/, ''))
      .filter(t => !compareList.includes(t));

    if (cleanTickers.length === 0) return;

    const availableSlots = Math.max(0, 6 - compareList.length);
    const tickersToAdd = cleanTickers.slice(0, availableSlots);

    if (tickersToAdd.length === 0) {
      showToast('Maksimal 6 saham untuk dikomparasi secara bersamaan.', 'warning');
      return;
    }

    setCompareList(prev => {
      const merged = [...prev];
      for (const t of tickersToAdd) {
        if (!merged.includes(t)) merged.push(t);
      }
      return merged.slice(0, 6);
    });

    setCompareSearchQuery('');
    setCompareSuggestions([]);

    setLoadingCompare(true);
    await Promise.all(tickersToAdd.map(t => fetchCompareStockData(t)));
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
        showToast(err.error || 'Gagal membuat koleksi', 'error');
        return;
      }

      const created = await res.json();
      setShowCreateModal(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setNewCollectionEmoji('📁');
      await fetchCollections();
      setSelectedCollection(created);
      showToast(`✓ Koleksi "${created.name}" berhasil dibuat!`, 'success');
    } catch (err) {
      showToast('Terjadi kesalahan saat membuat koleksi', 'error');
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
        showToast(err.error || 'Gagal memperbarui koleksi', 'error');
        return;
      }

      const updated = await res.json();
      setShowEditModal(false);
      setEditingCollection(null);
      await fetchCollections();
      setSelectedCollection(updated);
      showToast(`✓ Koleksi "${updated.name}" berhasil diperbarui!`, 'success');
    } catch (err) {
      showToast('Terjadi kesalahan saat memperbarui koleksi', 'error');
    }
  };

  const handleDeleteCollection = (collectionId, name) => {
    setConfirmDialog({
      isOpen: true,
      title: '⌫ Hapus Koleksi?',
      message: `Apakah Anda yakin ingin menghapus koleksi "${name}"? Semua saham dan catatan di dalamnya akan ikut terhapus.`,
      confirmLabel: 'Ya, Hapus Koleksi',
      cancelLabel: 'Batal',
      confirmStyle: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/collections', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: collectionId }),
          });

          if (!res.ok) {
            const err = await res.json();
            showToast(err.error || 'Gagal menghapus koleksi', 'error');
            return;
          }

          setSelectedCollection(null);
          await fetchCollections();
          showToast(`Koleksi "${name}" berhasil dihapus`, 'success');
        } catch (err) {
          showToast('Terjadi kesalahan saat menghapus koleksi', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleSaveStockToCollection = async (e, forceOverwrite = false) => {
    if (e && e.preventDefault) e.preventDefault();
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
          forceOverwrite,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        const targetCol = collections.find(c => c.id.toString() === targetCollectionId.toString());
        setDuplicateModal({
          isOpen: true,
          title: '▲ Saham Sudah Terdaftar di Koleksi',
          ticker: selectedStock,
          targetName: targetCol?.name || 'Koleksi Terpilih',
          message: `Saham ${selectedStock} sudah terdaftar di koleksi "${targetCol?.name || 'Koleksi'}". Apakah Anda ingin tetap memperbarui catatan dan target harga untuk saham ini?`,
          confirmLabel: 'Ya, Perbarui Data',
          cancelLabel: 'Batalkan',
          onConfirm: () => {
            setDuplicateModal(null);
            handleSaveStockToCollection(null, true);
          },
          onCancel: () => {
            setDuplicateModal(null);
          }
        });
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'Gagal menyimpan saham', 'error');
        return;
      }

      setShowSaveModal(false);
      setStockNote('');
      setSaveTargetBuy('');
      setSaveTargetSell('');
      setSaveTargetPercent('');
      showToast(data.updated ? `✓ Catatan saham ${selectedStock} berhasil diperbarui!` : `✓ Saham ${selectedStock} berhasil disimpan ke koleksi!`, 'success');
      await fetchCollections();
      if (selectedCollection?.id === parseInt(targetCollectionId, 10)) {
        fetchCollectionItems(selectedCollection.id, true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan saham', 'error');
    }
  };

  const handleOpenMoveModal = (item, e) => {
    if (e) e.stopPropagation();
    setMovingItem(item);
    const otherCols = collections.filter(c => c.id !== selectedCollection?.id);
    setMoveTargetCollectionId(otherCols[0]?.id?.toString() || '');
    setShowMoveModal(true);
  };

  const handleExecuteMove = async (e, forceOverwrite = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!movingItem || !moveTargetCollectionId || !selectedCollection) return;

    setMovingStockLoading(true);
    try {
      const res = await fetch('/api/collections/items/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCollectionId: selectedCollection.id,
          targetCollectionId: parseInt(moveTargetCollectionId, 10),
          ticker: movingItem.ticker,
          forceOverwrite,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        // Stock already exists in target collection -> Show custom confirmation modal!
        setDuplicateModal({
          isOpen: true,
          title: '▲ Saham Sudah Ada di Koleksi Tujuan',
          ticker: movingItem.ticker,
          targetName: data.targetCollectionName || 'Koleksi Tujuan',
          message: `Saham ${movingItem.ticker} sudah terdaftar di koleksi "${data.targetCollectionName}". Jika Anda memindahkan, data di koleksi asal akan dihapus dan catatan di koleksi tujuan akan disinkronkan. Apakah Anda ingin tetap melanjutkan?`,
          confirmLabel: 'Ya, Tetap Pindahkan',
          cancelLabel: 'Batalkan',
          onConfirm: () => {
            setDuplicateModal(null);
            handleExecuteMove(null, true);
          },
          onCancel: () => {
            setDuplicateModal(null);
          }
        });
        setMovingStockLoading(false);
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'Gagal memindahkan saham', 'error');
        setMovingStockLoading(false);
        return;
      }

      setShowMoveModal(false);
      setMovingItem(null);
      showToast(data.message || `✓ Saham ${movingItem.ticker} berhasil dipindahkan!`, 'success');
      await fetchCollections();
      fetchCollectionItems(selectedCollection.id, true);
    } catch (err) {
      showToast('Terjadi kesalahan saat memindahkan saham', 'error');
    } finally {
      setMovingStockLoading(false);
    }
  };

  const handleOpenMonitorModal = (stockData, tickerFallback, e) => {
    if (e) e.stopPropagation();
    const ticker = stockData?.ticker || tickerFallback || selectedStock;
    if (!ticker) return;
    const name = stockData?.name || stockDetail?.name || ticker;
    const price = stockData?.price || stockDetail?.price || 0;
    const target = stockData?.target || (price > 0 ? Math.round(price * 1.05) : '');
    const stopLoss = stockData?.stopLoss || (price > 0 ? Math.round(price * 0.95) : '');
    const score = stockData?.score || 70;

    setMonitorModal({
      ticker,
      name,
      price,
      score,
    });
    setMonitorEntryPrice(price ? price.toString() : '');
    setMonitorTargetPrice(target ? target.toString() : '');
    setMonitorStopLoss(stopLoss ? stopLoss.toString() : '');
    setMonitorStyle('swing');
    setMonitorAlreadyBought(false);
  };

  const handleExecuteSaveMonitor = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!monitorModal) return;

    const entryPrice = parseFloat((monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
    if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
      showToast('Harga entry harus berupa angka lebih dari 0', 'error');
      return;
    }

    const targetPrice = monitorTargetPrice ? parseFloat(monitorTargetPrice) : Math.round(entryPrice * 1.05);
    const stopLossPrice = monitorStopLoss ? parseFloat(monitorStopLoss) : Math.round(entryPrice * 0.95);
    const risk = entryPrice - stopLossPrice;
    const reward = targetPrice - entryPrice;
    const riskReward = (risk > 0 && reward > 0) ? Number((reward / risk).toFixed(2)) : 1.5;

    setSavingMonitor(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: {
            ticker: monitorModal.ticker,
            name: monitorModal.name,
            price: entryPrice,
            score: monitorModal.score || 70,
            entry: {
              low: entryPrice,
              high: entryPrice,
            },
            target: targetPrice,
            stopLoss: stopLossPrice,
            riskReward,
          },
          style: monitorStyle,
          mode: 'explorer',
          isAlreadyBought: monitorAlreadyBought,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Gagal menambahkan saham ke pemantauan', 'error');
        return;
      }

      if (data.message === 'Already saved today') {
        showToast(`▲ Saham ${monitorModal.ticker} (${monitorStyle}) sudah dipantau hari ini`, 'warning');
      } else {
        const statusText = monitorAlreadyBought ? 'Posisi Aktif' : 'Antri Beli';
        showToast(`◎ Saham ${monitorModal.ticker} mulai dipantau (${statusText}) di Win Rate Dashboard pada harga Rp ${entryPrice.toLocaleString('id-ID')}!`, 'success');
      }

      setMonitorModal(null);
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan ke Win Rate Dashboard', 'error');
    } finally {
      setSavingMonitor(false);
    }
  };

  const handleOpenEditItemModal = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditItemNotes(item.notes || '');
    setEditItemTargetBuy(item.targetBuy != null ? item.targetBuy.toString() : '');
    setEditItemTargetSell(item.targetSell != null ? item.targetSell.toString() : '');
    const pct = calculateTargetPercentFromPrices(item.targetBuy, item.targetSell);
    setEditItemTargetPercent(pct);
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
        showToast(err.error || 'Gagal memperbarui item koleksi', 'error');
        return;
      }

      setShowEditItemModal(false);
      setEditingItem(null);
      showToast('Catatan & target harga berhasil diperbarui', 'success');
      if (selectedCollection?.id) {
        fetchCollectionItems(selectedCollection.id, true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan perubahan', 'error');
    } finally {
      setSavingEditItem(false);
    }
  };

  const handleRemoveStockFromCollection = (collectionId, ticker, e) => {
    if (e) e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: '⌫ Hapus Saham dari Koleksi?',
      message: `Hapus saham ${ticker} dari koleksi ini?`,
      confirmLabel: 'Ya, Hapus Saham',
      cancelLabel: 'Batal',
      confirmStyle: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/collections/items', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId, ticker }),
          });

          if (!res.ok) {
            const err = await res.json();
            showToast(err.error || 'Gagal menghapus saham dari koleksi', 'error');
            return;
          }

          fetchCollectionItems(collectionId, true);
          fetchCollections();
          showToast(`Saham ${ticker} dihapus dari koleksi`, 'success');
        } catch (err) {
          showToast('Terjadi kesalahan saat menghapus saham', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
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

  const handleApplySort = async (sortedItems, option) => {
    if (!sortedItems || !selectedCollection?.id) return;

    // Optimistic UI update
    setCollectionItems(sortedItems);
    if (selectedCollection?.id) {
      itemsCacheRef.current[selectedCollection.id] = sortedItems;
    }

    // Persist new order to server
    try {
      const orderedIds = sortedItems.map(item => item.id);
      await fetch('/api/collections/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: selectedCollection.id,
          orderedIds,
        }),
      });
    } catch (err) {
      console.error('Failed to persist sorted items order:', err);
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

  // Yield Obligasi SUN 10-Tahun Dinamis (Acuan Graham Intrinsic Value & MoS)
  const [customBondYield, setCustomBondYield] = useState(6.5);

  // Kalkulasi Realtime Benjamin Graham Fair Value & MoS berdasarkan Yield SUN Dinamis
  const dynamicFairValue = useMemo(() => {
    const eps = Number(f.eps) || 0;
    const cagr = Math.max(0, Math.min(25, Number(proj.cagrPercent) || 0));
    const y = Number(customBondYield) > 0 ? Number(customBondYield) : 6.5;
    if (eps <= 0) return proj.fairValue || null;
    return Math.round(eps * (8.5 + 2 * cagr) * (4.4 / y));
  }, [f.eps, proj.cagrPercent, proj.fairValue, customBondYield]);

  const dynamicMoS = useMemo(() => {
    const price = Number(stockDetail?.price) || 0;
    if (!dynamicFairValue || dynamicFairValue <= 0 || price <= 0) return proj.marginOfSafety ?? null;
    return Number((((dynamicFairValue - price) / dynamicFairValue) * 100).toFixed(1));
  }, [dynamicFairValue, stockDetail?.price, proj.marginOfSafety]);

  return (
    <PageShell className="pb-12">
      <PageHeader
        title="Stock Explorer"
        subtitle="Riset fundamental, valuasi, volume teknikal, bandarmologi & komparasi multi-saham"
      />

      {/* Page tabs stay reachable while scrolling a long analysis */}
      <PageToolbar>
        <div role="tablist" aria-label="Halaman Stock Explorer" className="tabs w-full md:w-auto">
          {[
            { id: 'collections', icon: '▤', label: 'Koleksi', badge: collections.length > 0 ? collections.length : null },
            { id: 'explorer', icon: '⌕', label: 'Pencarian', badge: null },
            { id: 'compare', icon: '⇄', label: 'Komparasi', badge: compareList.length > 0 ? `${compareList.length}/6` : null },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="tab"
            >
              <span className="font-mono" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className="font-mono text-[10px] text-muted">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </PageToolbar>

      {/* ── 2. PAGE: KOLEKSI SAHAM ───────────────────────────────────────── */}
      {activeTab === 'collections' && (
        <section className="w-full space-y-5 animate-in fade-in duration-300">
          {/* Page header + collection picker chips */}
          <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-black text-ink flex items-center gap-2">
                  <span aria-hidden="true">▤</span>
                  <span>Koleksi Saham</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-sunken text-ink font-mono">
                    {collections.length}
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-muted mt-1">
                  Kelompokkan saham favorit, pantau target beli & jual secara live, lalu klik kartu untuk analisis lengkap.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewCollectionName('');
                  setNewCollectionDesc('');
                  setNewCollectionEmoji('📁');
                  setShowCreateModal(true);
                }}
                className="shrink-0 px-4 py-2.5 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm shadow-sm transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 "
              >
                <span aria-hidden="true">+</span> Buat Koleksi
              </button>
            </div>

            {loadingCollections && collections.length === 0 ? (
              <div className="flex gap-2" aria-busy="true" aria-label="Memuat koleksi">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="h-10 w-36 rounded-sm bg-sunken animate-pulse" />
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-line rounded-md px-4">
                <span className="text-4xl block mb-2" aria-hidden="true">▤</span>
                <p className="text-sm font-bold text-ink ">Belum ada koleksi</p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Klik &quot;+ Buat Koleksi&quot; untuk mengelompokkan saham favorit Anda, misalnya &quot;Dividen&quot; atau &quot;Swing Minggu Ini&quot;.
                </p>
              </div>
            ) : (
              <div role="tablist" aria-label="Pilih koleksi" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {collections.map((col) => {
                  const isActive = selectedCollection?.id === col.id;
                  return (
                    <button
                      key={col.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedCollection(col)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-sm border text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
 isActive
 ? 'bg-accent border-accent text-on-accent shadow-sm'
 : 'bg-sunken border-line text-ink hover:border-line-strong '
 }`}
                    >
                      <span aria-hidden="true">{col.emoji || '📁'}</span>
                      <span className="max-w-[160px] truncate">{col.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] leading-none rounded-full font-mono ${
 isActive ? 'border border-on-accent/40 text-on-accent' : 'bg-surface text-muted '
 }`}
                      >
                        {col._count?.items ?? col.items?.length ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected collection workspace */}
          {selectedCollection && (
            <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-5">
              {/* Collection toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-black text-ink flex items-center gap-2 flex-wrap">
                    <span aria-hidden="true">{selectedCollection.emoji || '📁'}</span>
                    <span className="truncate">{selectedCollection.name}</span>
                    {selectedCollection.isPublic && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sunken text-ink font-bold">
                        Publik
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">
                    {selectedCollection.description || `${collectionItems.length} saham tersimpan`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-up-soft border border-up text-[11px] font-bold text-up "
                    title={lastRefreshedAt ? `Terakhir diperbarui ${lastRefreshedAt.toLocaleTimeString('id-ID')}` : 'Harga diperbarui otomatis setiap 30 detik'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full bg-up ${isSilentRefreshing ? 'animate-ping' : 'animate-pulse'}`} aria-hidden="true"></span>
                    <span>{isSilentRefreshing ? 'Sinkronisasi...' : 'Live 30s'}</span>
                  </span>
                  <button
                    onClick={() => fetchCollectionItems(selectedCollection.id, true, false)}
                    aria-label="Refresh harga saham koleksi"
                    title="Refresh harga saham koleksi"
                    className={`${TOOLBAR_BUTTON_CLASS} ${TOOLBAR_BUTTON_HOVER}`}
                  >
                    <span aria-hidden="true">↻</span>
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
                    aria-label="Edit nama, emoji & status publik"
                    title="Edit nama, emoji & status publik"
                    className={`${TOOLBAR_BUTTON_CLASS} ${TOOLBAR_BUTTON_HOVER}`}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  {selectedCollection.shareCode && (
                    <button
                      onClick={() => handleCopyShareLink(selectedCollection.shareCode)}
                      aria-label="Salin link bagikan"
                      title="Salin link bagikan"
                      className={`${TOOLBAR_BUTTON_CLASS} ${TOOLBAR_BUTTON_HOVER}`}
                    >
                      <span aria-hidden="true">{copiedShareCode === selectedCollection.shareCode ? '✓' : '⧉'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCollection(selectedCollection.id, selectedCollection.name)}
                    aria-label="Hapus koleksi ini"
                    title="Hapus koleksi ini"
                    className={`${TOOLBAR_BUTTON_CLASS} hover:bg-down-soft hover:border-down `}
                  >
                    <span aria-hidden="true">⌫</span>
                  </button>
                </div>
              </div>

              {/* Summary stats */}
              {collectionItems.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-sm border border-line bg-sunken p-3">
                    <p className="text-[11px] font-semibold text-muted ">Jumlah Emiten</p>
                    <p className="text-xl font-black text-ink tabular-nums">{collectionSummary.count}</p>
                    <p className="text-[11px] text-muted tabular-nums">
                      <span className="text-up font-bold">{collectionSummary.gainers} naik</span>
                      {' · '}
                      <span className="text-down font-bold">{collectionSummary.losers} turun</span>
                    </p>
                  </div>
                  <div className="rounded-sm border border-line bg-sunken p-3">
                    <p className="text-[11px] font-semibold text-muted ">Rata-rata Perubahan Hari Ini</p>
                    <p
                      className={`text-xl font-black tabular-nums ${
 collectionSummary.avgChange == null
 ? 'text-muted'
 : collectionSummary.avgChange >= 0
 ? 'text-up '
 : 'text-down '
 }`}
                    >
                      {collectionSummary.avgChange == null
                        ? '-'
                        : `${collectionSummary.avgChange >= 0 ? '+' : ''}${collectionSummary.avgChange.toFixed(2)}%`}
                    </p>
                    <p className="text-[11px] text-muted ">Rata-rata sederhana semua emiten</p>
                  </div>
                  <div className={`rounded-sm border p-3 ${collectionSummary.buyHits > 0 ? 'border-up bg-up-soft ' : 'border-line bg-sunken '}`}>
                    <p className="text-[11px] font-semibold text-muted ">◎ Target Beli Tercapai</p>
                    <p className="text-xl font-black text-up tabular-nums">{collectionSummary.buyHits}</p>
                    <p className="text-[11px] text-muted ">Harga ≤ target beli</p>
                  </div>
                  <div className={`rounded-sm border p-3 ${collectionSummary.sellHits > 0 ? 'border-down bg-down-soft ' : 'border-line bg-sunken '}`}>
                    <p className="text-[11px] font-semibold text-muted ">↑ Target Jual Tercapai</p>
                    <p className="text-xl font-black text-down tabular-nums">{collectionSummary.sellHits}</p>
                    <p className="text-[11px] text-muted ">Harga ≥ target jual</p>
                  </div>
                </div>
              )}

              {/* Sort toolbar */}
              {collectionItems.length > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line pt-4">
                  <div className="w-full sm:w-72">
                    <CollectionSortDropdown items={collectionItems} onApplySort={handleApplySort} />
                  </div>
                  <span className="text-[11px] text-muted ">
                    <span aria-hidden="true">⠿</span> Tahan & geser kartu untuk mengatur urutan manual
                  </span>
                </div>
              )}

              {/* Card grid */}
              {loadingItems && collectionItems.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" aria-busy="true" aria-label="Memuat saham koleksi">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="animate-pulse rounded-md p-4 bg-sunken border border-line space-y-3 h-44">
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-20 bg-sunken rounded"></div>
                        <div className="h-5 w-14 bg-sunken rounded"></div>
                      </div>
                      <div className="h-3 w-32 bg-sunken rounded"></div>
                      <div className="h-7 w-28 bg-sunken rounded"></div>
                      <div className="h-2 w-full bg-sunken rounded"></div>
                    </div>
                  ))}
                </div>
              ) : collectionItems.length === 0 ? (
                <div className="text-center py-10 bg-sunken rounded-md border border-dashed border-line px-4">
                  <span className="text-3xl block mb-2" aria-hidden="true">⌕</span>
                  <p className="text-sm font-bold text-ink ">Koleksi ini masih kosong</p>
                  <p className="text-xs text-muted mt-1">
                    Cari saham di tab Pencarian Saham IDX, lalu klik &quot;Simpan ke Koleksi&quot;.
                  </p>
                  <button
                    onClick={() => setActiveTab('explorer')}
                    className="mt-4 px-4 py-2 text-xs font-bold rounded-sm bg-accent hover:bg-accent text-on-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Buka Pencarian Saham
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {collectionItems.map((item, index) => {
                    const s = item.stock || {};
                    const price = s.price || 0;
                    const changePct = Number(s.changePercent || 0);
                    const isItemUp = changePct >= 0;

                    const isCurrentSelected = stockDetail?.ticker === item.ticker;
                    // Use the freshly loaded detail scores for the stock currently open in Pencarian.
                    const liveCompScore = (isCurrentSelected && scores?.fundamental != null) ? getCompositeScore(scores) : null;
                    const score = liveCompScore ?? s.score;
                    const scoreTone = getScoreTone(score);

                    const { isBuyHit: isTargetBuyHit, isSellHit: isTargetSellHit } = getTargetStatus(price, item.targetBuy, item.targetSell);
                    const targetProgress = getTargetProgress(price, item.targetBuy, item.targetSell);

                    const isDragging = draggedItemIndex === index;
                    const isDragOver = dragOverIndex === index && draggedItemIndex !== index;

                    let cardBorder = isCurrentSelected
                      ? 'border-accent  ring-2 ring-accent'
                      : 'border-line  hover:border-line-strong ';
                    if (isTargetBuyHit) {
                      cardBorder = 'border-up  ring-1 ring-up';
                    } else if (isTargetSellHit) {
                      cardBorder = 'border-down  ring-1 ring-down';
                    }

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Buka analisis lengkap ${item.ticker}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => handleOpenFromCollection(item.ticker)}
                        onKeyDown={(e) => {
                          // Only react when the card itself is focused, not one of its action buttons.
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenFromCollection(item.ticker);
                          }
                        }}
                        className={`group relative flex flex-col rounded-md border bg-surface p-4 cursor-pointer select-none transition-[border-color,box-shadow,opacity] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cardBorder} ${
 isDragging ? 'opacity-40 border-dashed border-accent' : ''
 } ${isDragOver ? 'ring-2 ring-accent' : ''}`}
                      >
                        {/* Header: drag handle, ticker, score, daily change */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing text-muted hover:text-ink text-sm px-0.5"
                              title="Tahan & geser untuk atur urutan"
                              aria-hidden="true"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⠿
                            </span>
                            <span className="font-black text-base text-ink group-hover:text-ink transition-colors">
                              {item.ticker}
                            </span>
                            {scoreTone && (
                              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${SCORE_TONE_CLASSES[scoreTone]}`} title={`Skor Komposit: ${score}`}>
                                {score}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
 isItemUp
 ? 'bg-up-soft text-up '
 : 'bg-down-soft text-down '
 }`}
                          >
                            {isItemUp ? '▲ +' : '▼ '}{changePct.toFixed(2)}%
                          </span>
                        </div>

                        {(s.name || s.sector) && (
                          <p className="mt-0.5 pl-5 text-[11px] text-muted truncate">
                            {s.name}{s.name && s.sector ? ' · ' : ''}{s.sector}
                          </p>
                        )}

                        {/* Price */}
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-xl font-black text-ink tabular-nums">
                            Rp {price ? price.toLocaleString('id-ID') : '-'}
                          </span>
                          {price > 0 && s.changePercent != null && (
                            <span className={`text-[11px] font-bold tabular-nums ${isItemUp ? 'text-up ' : 'text-down '}`}>
                              {isItemUp ? '+' : ''}{getNominalChange(price, changePct).toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>

                        {/* Target hit banners */}
                        {isTargetBuyHit && (
                          <div className="mt-3 px-2 py-1 bg-up text-on-accent text-[10px] font-black rounded-sm flex items-center justify-between">
                            <span>◎ TARGET BELI TERCAPAI</span>
                            <span className="tabular-nums">≤ Rp {item.targetBuy.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {isTargetSellHit && (
                          <div className="mt-3 px-2 py-1 bg-down text-on-accent text-[10px] font-black rounded-sm flex items-center justify-between">
                            <span>↑ TARGET JUAL TERCAPAI</span>
                            <span className="tabular-nums">≥ Rp {item.targetSell.toLocaleString('id-ID')}</span>
                          </div>
                        )}

                        {/* Target buy / sell with progress between them */}
                        {(item.targetBuy != null || item.targetSell != null) && !isTargetBuyHit && !isTargetSellHit && (
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="text-muted ">
                                Beli <span className="font-bold text-up ">{item.targetBuy ? `Rp ${item.targetBuy.toLocaleString('id-ID')}` : '-'}</span>
                              </span>
                              <span className="text-muted ">
                                Jual <span className="font-bold text-down ">{item.targetSell ? `Rp ${item.targetSell.toLocaleString('id-ID')}` : '-'}</span>
                              </span>
                            </div>
                            {targetProgress != null && (
                              <div
                                className="relative h-1.5 rounded-full target-track "
                                role="img"
                                aria-label={`Posisi harga ${Math.round(targetProgress)}% di antara target beli dan target jual`}
                              >
                                <span
                                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-ink ring-2 ring-surface "
                                  style={{ left: `${targetProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <p className="mt-3 text-[11px] text-muted line-clamp-2 bg-sunken px-2 py-1 rounded-sm">
                            <span aria-hidden="true">✎ </span>{item.notes}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-auto pt-3">
                          <div className="flex items-center justify-between gap-1 border-t border-line pt-2">
                            {[
                              { key: 'monitor', icon: '◎', label: `Pantau ${item.ticker} di Win Rate`, hover: 'hover:bg-up-soft ', onClick: (e) => handleOpenMonitorModal(s, item.ticker, e) },
                              { key: 'compare', icon: '⇄', label: `Tambah ${item.ticker} ke Komparasi`, hover: 'hover:bg-sunken ', onClick: (e) => { e.stopPropagation(); handleAddToCompare(item.ticker); } },
                              { key: 'move', icon: '⇢', label: `Pindahkan ${item.ticker} ke koleksi lain`, hover: 'hover:bg-sunken ', onClick: (e) => handleOpenMoveModal(item, e) },
                              { key: 'edit', icon: '✎', label: `Edit catatan & target ${item.ticker}`, hover: 'hover:bg-warn-soft ', onClick: (e) => handleOpenEditItemModal(item, e) },
                              { key: 'remove', icon: '✕', label: `Hapus ${item.ticker} dari koleksi`, hover: 'hover:bg-down-soft  hover:text-down', onClick: (e) => handleRemoveStockFromCollection(selectedCollection.id, item.ticker, e) },
                            ].map((action) => (
                              <button
                                key={action.key}
                                onClick={action.onClick}
                                aria-label={action.label}
                                title={action.label}
                                className={`flex-1 h-8 flex items-center justify-center text-xs text-muted rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${action.hover}`}
                              >
                                <span aria-hidden="true">{action.icon}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── 3. PAGE: PENCARIAN SAHAM IDX & ANALYTICAL WORKSPACE ─────────── */}
      {activeTab === 'explorer' && (
          <main className="w-full min-w-0 space-y-6 animate-in fade-in duration-300">
            {/* SEARCH BAR */}
            <div className="relative bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm">

              {/* Back to the collection the stock was opened from */}
              {backToCollection && (
                <button
                  onClick={() => setActiveTab('collections')}
                  className="mb-4 px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors inline-flex items-center gap-1.5 bg-sunken hover:bg-sunken text-ink border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={`Kembali ke koleksi ${backToCollection.name}`}
                >
                  <span aria-hidden="true">←</span>
                  <span>Kembali ke Koleksi</span>
                  <span className="max-w-[160px] truncate font-semibold opacity-80">
                    · {backToCollection.emoji || '📁'} {backToCollection.name}
                  </span>
                </button>
              )}

              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-sm bg-sunken border border-line flex items-center justify-center text-xl" aria-hidden="true">
                    ⌕
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-black text-base md:text-lg text-ink ">
                      Pencarian Saham IDX
                    </h2>
                    <p className="text-xs md:text-sm text-muted ">
                      Cari kode ticker atau nama perusahaan, misal BBCA, BBRI, ASII, ADRO, TLKM
                    </p>
                  </div>
                </div>

                {/* Autocomplete Search Input */}
                <div className="relative w-full lg:w-[28rem]">
                  <label htmlFor="idx-stock-search" className="sr-only">Cari saham IDX</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted" aria-hidden="true">
                      ⌕
                    </span>
                    <input
                      id="idx-stock-search"
                      ref={searchInputRef}
                      type="text"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchQuery.trim()) {
                          const q = searchQuery.toUpperCase().trim();
                          setSuggestions(allTickers.filter(s => (s.ticker && s.ticker.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q))).slice(0, 8));
                        }
                      }}
                      placeholder="Ketik kode saham atau nama emiten..."
                      className="w-full pl-11 pr-11 py-3 bg-sunken border border-line rounded-sm text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); setSuggestions([]); searchInputRef.current?.focus(); }}
                        aria-label="Hapus pencarian"
                        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-r-sm"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div
                      ref={searchDropdownRef}
                      className="absolute z-50 left-0 right-0 mt-2 bg-surface border border-line rounded-sm shadow-2xl overflow-hidden"
                    >
                      <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted bg-sunken border-b border-line ">
                        {suggestions.length} hasil teratas
                      </p>
                      <div className="max-h-80 overflow-y-auto">
                        {suggestions.map((s) => {
                          const suggChange = getNominalChange(s.price, s.changePercent);
                          const isSuggUp = (s.changePercent || 0) >= 0;
                          return (
                            <button
                              key={s.ticker}
                              onClick={() => handlePickSuggestion(s.ticker)}
                              className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-sunken focus:outline-none focus-visible:bg-sunken border-b border-line last:border-0 transition-colors"
                            >
                              <span className="w-14 shrink-0 text-center py-1 rounded-sm bg-sunken text-xs font-black text-ink ">
                                {s.ticker}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold text-ink truncate">{s.name}</span>
                                {s.sector && (
                                  <span className="block text-[10px] text-muted truncate">{s.sector}</span>
                                )}
                              </span>
                              <span className="text-right shrink-0 tabular-nums">
                                <span className="block text-xs font-black text-ink ">
                                  Rp {s.price?.toLocaleString('id-ID') || '-'}
                                </span>
                                {s.changePercent != null && (
                                  <span className={`block text-[10px] font-bold ${isSuggUp ? 'text-up ' : 'text-down '}`}>
                                    {isSuggUp ? '+' : ''}{suggChange.toLocaleString('id-ID')} ({isSuggUp ? '+' : ''}{Number(s.changePercent).toFixed(2)}%)
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* ── 3. STOCK DETAIL CONTAINER ─────────────────────────────────── */}
          <div ref={detailSectionRef}>
            {loadingDetail ? (
              <div className="bg-surface border border-line rounded-md p-12 text-center shadow-sm">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-accent border-t-transparent mb-4"></div>
                <p className="text-sm font-semibold text-muted ">
                  Mengambil data lengkap untuk <span className="text-ink font-bold">{selectedStock}</span>...
                </p>
                <p className="text-xs text-muted mt-1">Fundamental, valuasi, volume teknikal, bandarmologi & proyeksi</p>
              </div>
            ) : detailError ? (
              <div className="bg-down-soft border border-down rounded-md p-6 text-center">
                <p className="text-down font-semibold">{detailError}</p>
                <button
                  onClick={() => handleSelectStock(selectedStock)}
                  className="mt-3 px-4 py-1.5 bg-down text-on-accent text-xs font-bold rounded-sm hover:bg-down"
                >
                  Coba Lagi
                </button>
              </div>
            ) : stockDetail ? (
              <div className="space-y-6">
                {/* Stock Main Banner */}
                <div className="bg-surface rounded-md p-5 md:p-6 shadow-sm border border-line ">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-2xl md:text-3xl font-black tracking-tight text-ink ">
                          {stockDetail.ticker}
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sunken text-ink border border-line ">
                          {stockDetail.sector || 'IDX'}
                        </span>
                        {stockDetail.subSector && (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sunken text-ink border border-line ">
                            {stockDetail.subSector}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm md:text-base text-ink font-semibold">
                        {stockDetail.name}
                      </h2>
                      <div className="text-xs text-muted flex items-center gap-2 pt-1 font-medium">
                        <span>Market Cap: {f.marketCap ? `Rp ${(f.marketCap / 1e12).toFixed(2)} T` : '-'}</span>
                        <span>•</span>
                        <span>Saham Beredar: {f.sharesOutstanding ? `${(f.sharesOutstanding / 1e9).toFixed(2)} M lembar` : '-'}</span>
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="flex items-center gap-4 justify-between md:justify-end flex-wrap">
                      <div className="text-right">
                        <div className="text-2xl md:text-3xl font-black text-ink ">
                          Rp {stockDetail.price?.toLocaleString('id-ID')}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {(() => {
                            const nominal = getNominalChange(stockDetail.price, stockDetail.changePercent);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
 isUp 
 ? 'bg-up-soft text-up border border-up ' 
 : 'bg-down-soft text-down border border-down '
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

                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        <button
                          onClick={() => handleOpenMonitorModal(stockDetail)}
                          className="btn-secondary whitespace-nowrap"
                          title="Pantau pergerakan saham ini dan catat ke Win Rate Dashboard"
                        >
                          <span>◎</span> Pantau Win Rate
                        </button>
                        <button
                          onClick={() => handleAddToCompare(stockDetail.ticker)}
                          className="btn-secondary whitespace-nowrap"
                        >
                          <span>⇄</span> Bandingkan
                        </button>

                        {aiStatus === 'COMPLETED' || aiResearch ? (
                          <button
                            onClick={() => setShowAiModal(true)}
                            className="btn-secondary whitespace-nowrap"
                          >
                            <span aria-hidden="true">✦</span> Lihat Riset AI
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeAi(false)}
                            disabled={isAiLoading || aiStatus === 'PENDING' || aiStatus === 'PROCESSING'}
                            className="btn-secondary whitespace-nowrap"
                          >
                            <span aria-hidden="true">◈</span> {isAiLoading ? 'Loading...' : aiStatus === 'PENDING' ? 'Antri AI...' : aiStatus === 'PROCESSING' ? 'AI Menganalisis...' : 'Analyze with AI'}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (collections.length === 0) {
                              setShowCreateModal(true);
                            } else {
                              setTargetCollectionId(collections[0].id.toString());
                              setShowSaveModal(true);
                            }
                          }}
                          className="btn-primary whitespace-nowrap"
                        >
                          <span aria-hidden="true">⇩</span> Simpan ke Koleksi
                        </button>
                        <button
                          onClick={() => handleSelectStock(stockDetail.ticker, false)}
                          className="btn-ghost justify-center"
                          title="Refresh data & sinkronisasi"
                        >
                          <span className="font-mono" aria-hidden="true">↻</span> Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 8-CARD ANALYSIS GRID (4 COLUMNS × 2 ROWS) ────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CARD 1: VALUASI */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">▤</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Valuasi Harga
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 (dynamicMoS || 0) > 15 
 ? 'bg-up-soft text-up ' 
 : (dynamicMoS || 0) < -15 
 ? 'bg-down-soft text-down ' 
 : 'bg-warn-soft text-warn '
 }`}>
                          {(dynamicMoS || 0) > 15 ? 'Undervalued ✓' : (dynamicMoS || 0) < -15 ? 'Overvalued ●' : 'Wajar ▲'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted ">EPS (Laba / Lembar):</span>
                          <span className="font-bold text-up ">{f.eps != null ? `Rp ${Number(f.eps).toLocaleString('id-ID')}` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">PER (TTM) / Fwd PE:</span>
                          <span className="font-bold text-ink ">
                            {f.per != null ? `${Number(f.per).toFixed(1)}x` : '-'} {f.forwardPE != null ? ` / ${Number(f.forwardPE).toFixed(1)}x` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">PBV / Book Value:</span>
                          <span className="font-bold text-ink ">
                            {f.pbv != null ? `${Number(f.pbv).toFixed(2)}x` : '-'} {f.bookValue != null ? ` (Rp ${Math.round(f.bookValue).toLocaleString('id-ID')})` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">PEG Ratio:</span>
                          <span className="font-bold text-ink ">
                            {f.pegRatio != null 
                              ? Number(f.pegRatio).toFixed(2)
                              : (f.per && proj.cagrPercent && proj.cagrPercent > 0 
                                  ? (f.per / proj.cagrPercent).toFixed(2) 
                                  : (proj.cagrPercent != null && proj.cagrPercent <= 0 ? 'N/A (CAGR ≤ 0)' : '-'))}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line ">
                          <span className="text-muted ">Graham Number:</span>
                          <span className="font-bold text-ink ">
                            {proj.grahamNumber ? `Rp ${proj.grahamNumber.toLocaleString('id-ID')}` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Fair Value (Graham):</span>
                          <span className="font-bold text-up ">
                            {dynamicFairValue ? `Rp ${dynamicFairValue.toLocaleString('id-ID')}` : '-'}
                          </span>
                        </div>

                        {/* Interactive Dynamic SUN 10-Yr Yield Input */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-line ">
                          <span className="text-[11px] text-muted flex items-center gap-1" title="Imbal hasil obligasi negara acuan formula Graham (dapat diubah dinamis)">
                            <span>▥</span> SUN 10-Yr Yield:
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="4.0"
                              max="12.0"
                              value={customBondYield}
                              onChange={(e) => setCustomBondYield(parseFloat(e.target.value) || 6.5)}
                              className="w-14 px-1.5 py-0.5 text-right text-xs font-bold bg-sunken border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            <span className="text-xs text-muted font-semibold">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted flex items-center justify-between">
                      <span>Margin of Safety:</span>
                      <span className={`font-bold ${
 (dynamicMoS || 0) > 15 
 ? 'text-up ' 
 : (dynamicMoS || 0) < -15 
 ? 'text-down ' 
 : 'text-ink '
 }`}>
                        {dynamicMoS != null ? `${dynamicMoS}%` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 2: GROWTH & PROYEKSI */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">↗</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Growth & Proyeksi
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sunken text-ink ">
                          12 Bulan
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted ">Revenue Growth:</span>
                          <span className={`font-bold ${f.revenueGrowth > 0 ? 'text-up ' : 'text-ink '}`}>
                            {f.revenueGrowth != null ? `${Number(f.revenueGrowth).toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Profit CAGR (3th):</span>
                          <span className="font-bold text-up ">
                            {proj.cagrPercent != null ? `+${proj.cagrPercent}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line ">
                          <span className="text-muted ">Target Harga 12M:</span>
                          <span className="font-bold text-ink text-sm">
                            {proj.projectedPrice12m ? `Rp ${proj.projectedPrice12m.toLocaleString('id-ID')}` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Potensi Upside:</span>
                          <span className={`font-bold ${proj.projectedUpside >= 0 ? 'text-up ' : 'text-down '}`}>
                            {proj.projectedUpside != null ? `${proj.projectedUpside >= 0 ? '+' : ''}${proj.projectedUpside}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted flex items-center justify-between">
                      <span>Tren Laba:</span>
                      <span className="font-bold text-ink ">
                        {Array.isArray(f.netProfit) && f.netProfit.length >= 2 && f.netProfit[f.netProfit.length - 1] > f.netProfit[0] ? 'Bertumbuh ↑' : 'Fluktuatif ⇄'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 3: DIVIDEN */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">▥</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Dividen
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-up-soft text-up ">
                          Yield {f.dividendYield != null ? `${Number(f.dividendYield).toFixed(1)}%` : '0%'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted ">Dividend Yield:</span>
                          <span className="font-bold text-up ">
                            {f.dividendYield != null ? `${Number(f.dividendYield).toFixed(2)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Payout Ratio (DPR):</span>
                          <span className="font-bold text-ink ">
                            {f.payoutRatio != null ? `${Number(f.payoutRatio).toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Streak Dividen:</span>
                          <span className="font-bold text-ink ">
                            {f.dividendStreakYears ? `${f.dividendStreakYears} Tahun Beruntun` : 'Tidak rutin'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line ">
                          <span className="text-muted ">Dividen Terakhir:</span>
                          <span className="font-bold text-ink font-mono">
                            {stockDetail.dividendSchedule?.dps > 0
                              ? `Rp ${Number(stockDetail.dividendSchedule.dps).toLocaleString('id-ID')} (${stockDetail.dividendSchedule.type?.includes('Interim') ? 'Interim' : 'Final'})`
                              : (stockDetail.historicalDividends?.[0]?.dps > 0
                                ? `Rp ${Number(stockDetail.historicalDividends[0].dps).toLocaleString('id-ID')}`
                                : (f.dividendRate > 0 ? `Rp ${Number(f.dividendRate).toLocaleString('id-ID')}` : '-'))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted ">
                      Status: <span className="font-semibold text-ink ">{f.dividendYield >= 5 ? 'High Dividend Aristocrat ◆' : f.dividendYield > 0 ? 'Membagikan Dividen ✓' : 'Tanpa Dividen'}</span>
                    </div>
                  </div>

                  {/* CARD 4: ORDER BOOK & SPREAD */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">▤</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Order Book & Spread
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 rt.spreadPercent != null && rt.spreadPercent < 0.5 
 ? 'bg-up-soft text-up ' 
 : 'bg-warn-soft text-warn '
 }`}>
                          {rt.spreadPercent != null && rt.spreadPercent < 0.5 ? 'Sangat Likuid »' : 'Likuiditas Normal'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 bg-sunken p-2.5 rounded-sm border border-line ">
                          <div className="text-center border-r border-line pr-1">
                            <span className="text-[10px] text-up font-bold block">BEST BID</span>
                            <span className="text-sm font-black text-ink ">
                              {rt.bid ? `Rp ${rt.bid.toLocaleString('id-ID')}` : '-'}
                            </span>
                            {rt.bidSize && <span className="text-[10px] text-muted block">{rt.bidSize} lot</span>}
                          </div>
                          <div className="text-center pl-1">
                            <span className="text-[10px] text-down font-bold block">BEST ASK</span>
                            <span className="text-sm font-black text-ink ">
                              {rt.ask ? `Rp ${rt.ask.toLocaleString('id-ID')}` : '-'}
                            </span>
                            {rt.askSize && <span className="text-[10px] text-muted block">{rt.askSize} lot</span>}
                          </div>
                        </div>

                        <div className="flex justify-between pt-1">
                          <span className="text-muted ">Spread:</span>
                          <span className="font-bold text-ink ">
                            {rt.spread != null ? `Rp ${rt.spread} (${rt.spreadPercent}%)` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Turnover Hari Ini:</span>
                          <span className="font-bold text-ink ">
                            {vol.turnover ? `Rp ${(vol.turnover / 1e9).toFixed(2)} M` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted ">
                      Frekuensi: <span className="font-semibold text-ink ">{vol.frequency ? `${vol.frequency.toLocaleString('id-ID')}x transaksi` : '-'}</span>
                    </div>
                  </div>

                  {/* CARD 5: FUNDAMENTAL & KUALITAS */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">◉</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Fundamental & Kualitas
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 f.roe != null && f.roe >= 15 ? 'bg-up-soft text-up ' : 'bg-sunken text-ink '
 }`}>
                          ROE {f.roe != null ? `${Number(f.roe).toFixed(1)}%` : '-'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted ">ROE / ROA:</span>
                          <span className="font-bold text-up ">
                            {f.roe != null ? `${Number(f.roe).toFixed(1)}%` : '-'} {f.roa != null ? ` / ${Number(f.roa).toFixed(1)}%` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">OPM / NPM:</span>
                          <span className="font-bold text-ink ">
                            {f.opm != null ? `${Number(f.opm).toFixed(1)}%` : '-'} {f.npm != null ? ` / ${Number(f.npm).toFixed(1)}%` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Total Revenue:</span>
                          <span className="font-bold text-ink ">
                            {f.totalRevenue != null 
                              ? (Math.abs(Number(f.totalRevenue)) >= 1e12 
                                  ? `Rp ${(Number(f.totalRevenue) / 1e12).toFixed(2)} T` 
                                  : `Rp ${(Number(f.totalRevenue) / 1e9).toFixed(1)} M`) 
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">DER / Current Ratio:</span>
                          <span className="font-bold text-ink ">
                            {f.der != null ? `${Number(f.der).toFixed(2)}x` : '-'} {f.currentRatio != null ? ` / ${Number(f.currentRatio).toFixed(2)}x` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Free Cash Flow:</span>
                          <span className="font-bold text-ink ">
                            {f.freeCashflow != null ? `Rp ${(Number(f.freeCashflow) / 1e9).toFixed(1)} M` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line ">
                          <span className="text-muted flex items-center gap-1 cursor-help" title="Estimasi heuristik multi-faktor adaptif berdasarkan kinerja profitabilitas, leverage & likuiditas BEI">
                            Piotroski F-Score <span className="text-[10px] text-muted">ⓘ</span>:
                          </span>
                          <span className={`font-bold ${
 f.piotroskiFScore != null && f.piotroskiFScore >= 7 ? 'text-up ' : f.piotroskiFScore != null && f.piotroskiFScore <= 3 ? 'text-down ' : 'text-ink '
 }`}>
                            {f.piotroskiFScore != null ? `${f.piotroskiFScore}/9` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted flex items-center gap-1 cursor-help" title="Estimasi heuristik rasio kesehatan modal kerja & solvabilitas adaptif untuk emiten IDX">
                            Altman Z-Score <span className="text-[10px] text-muted">ⓘ</span>:
                          </span>
                          <span className={`font-bold ${
 f.altmanZScore != null && f.altmanZScore >= 2.99 ? 'text-up ' : f.altmanZScore != null && f.altmanZScore < 1.81 ? 'text-down ' : 'text-warn '
 }`}>
                            {f.altmanZScore != null ? `${f.altmanZScore} (${f.altmanZScore >= 2.99 ? 'Aman' : f.altmanZScore < 1.81 ? 'Distress' : 'Abu-abu'})` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted flex items-center justify-between">
                      <span>Kesehatan Neraca:</span>
                      <span className="font-bold text-up ">
                        {f.altmanZScore != null && f.altmanZScore >= 2.99 ? 'Sangat Sehat ◇' : f.altmanZScore != null && f.altmanZScore < 1.81 ? 'Rawan ▲' : 'Moderat ⇄'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 6: TEKNIKAL & VOLUME */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">»</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Teknikal & Market
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 vol.volumeSpikeRatio != null && vol.volumeSpikeRatio >= 1.5 
 ? 'bg-warn-soft text-warn ' 
 : 'bg-sunken text-ink '
 }`}>
                          {vol.volumeStatus || 'Normal'}
                        </span>
                      </div>

                      {(() => {
                        const low52 = f.fiftyTwoWeekLow ?? r?.fiftyTwoWeekLow ?? t.support ?? (t.prices?.length ? Math.min(...t.prices.filter(p => p > 0)) : null);
                        const high52 = f.fiftyTwoWeekHigh ?? r?.fiftyTwoWeekHigh ?? t.resistance ?? (t.prices?.length ? Math.max(...t.prices) : null);
                        const curPrice = stockDetail.price || 0;
                        const pct52 = (low52 && high52 && high52 > low52 && curPrice >= low52) 
                          ? Math.min(100, Math.max(0, ((curPrice - low52) / (high52 - low52)) * 100))
                          : null;

                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-muted ">52-Week Range:</span>
                                <span className="font-bold text-ink ">
                                  {(low52 != null && high52 != null) 
                                    ? `Rp ${Math.round(low52).toLocaleString('id-ID')} - ${Math.round(high52).toLocaleString('id-ID')}` 
                                    : '-'}
                                </span>
                              </div>
                              {pct52 != null && (
                                <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden flex items-center">
                                  <div 
                                    className="bg-accent h-full rounded-full transition-all" 
                                    style={{ width: `${pct52}%` }} 
                                    title={`Posisi harga: ${pct52.toFixed(0)}% dari 52W range`}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted ">Beta (Volatilitas):</span>
                              <span className="font-bold text-ink ">
                                {f.beta != null ? `${Number(f.beta).toFixed(2)}x IHSG` : '-'}
                              </span>
                            </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">RSI 14 (Momentum):</span>
                          <span className={`font-bold ${
 t.rsi14 != null && t.rsi14 >= 70 ? 'text-down ' : t.rsi14 != null && t.rsi14 <= 30 ? 'text-up ' : 'text-ink '
 }`}>
                            {t.rsi14 != null ? `${Number(t.rsi14).toFixed(1)} (${Number(t.rsi14) >= 70 ? 'Overbought' : Number(t.rsi14) <= 30 ? 'Oversold' : 'Netral'})` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Support / Resist:</span>
                          <span className="font-bold text-ink ">
                            {t.support != null ? `Rp ${Math.round(t.support).toLocaleString('id-ID')}` : '-'} / {t.resistance != null ? `Rp ${Math.round(t.resistance).toLocaleString('id-ID')}` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">MA20 / MA50:</span>
                          <span className="font-bold text-ink ">
                            {t.ma20 != null ? `${Math.round(t.ma20).toLocaleString('id-ID')}` : '-'} / {t.ma50 != null ? `${Math.round(t.ma50).toLocaleString('id-ID')}` : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted flex items-center justify-between">
                      <span>Konfirmasi Volume:</span>
                      <span className="font-bold text-ink ">
                        {vol.isBreakoutVolume ? 'Breakout Volume ↑' : 'Volume Stabil'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 7: BANDARMOLOGI & FLOW */}
                  <div className="bg-surface border border-line rounded-md p-4 shadow-sm hover:border-accent transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">◫</span>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                            Bandarmologi & KSEI
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 (b.bfiScore || 0) >= 3 
 ? 'bg-up-soft text-up ' 
 : (b.bfiScore || 0) <= -3 
 ? 'bg-down-soft text-down ' 
 : 'bg-sunken text-ink '
 }`}>
                          BFI {b.bfiScore != null ? Number(b.bfiScore).toFixed(1) : '0.0'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted ">Pengendali (PSP):</span>
                          <div className="text-right">
                            <span className="font-bold text-ink ">
                              {b.controllerPercent != null && b.controllerPercent > 0 ? `${Number(b.controllerPercent).toFixed(1)}%` : '-'}
                            </span>
                            {b.controllerName && (
                              <span className="text-[10px] text-muted block truncate max-w-[130px]" title={b.controllerName}>
                                {b.controllerName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Direksi & Manajemen:</span>
                          <span className="font-bold text-up ">
                            {b.managementTotalPercent != null ? `${Number(b.managementTotalPercent).toFixed(2)}%` : (b.directorsPercent != null ? `${Number(b.directorsPercent).toFixed(2)}%` : '0.00%')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Asing (Foreign):</span>
                          <span className="font-bold text-ink ">
                            {b.foreignPercent != null ? `${Number(b.foreignPercent).toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Ritel (Domestic):</span>
                          <span className="font-bold text-ink ">
                            {b.retailPercent != null ? `${Number(b.retailPercent).toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted ">Smart Money Flow:</span>
                          <span className={`font-bold ${b.smartMoneyStatus?.includes('Inflow') ? 'text-up ' : 'text-down '}`}>
                            {b.smartMoneyStatus || 'Netral'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-muted flex items-center justify-between">
                      <span>Wyckoff Phase:</span>
                      <span className="font-semibold text-ink ">{b.wyckoffPhaseName || `Fase ${b.wyckoffPhase || 1}`}</span>
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
                      <div className="border border-line rounded-md p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">◎</span>
                              <div>
                                <h3 className="font-bold text-xs uppercase tracking-wider text-ink ">
                                  Skor Komposit
                                </h3>
                              </div>
                            </div>
                            <span className="text-sm font-black text-ink ">
                              {compScore}/100
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-muted ">Fundamental <span className="text-[10px] text-up font-bold">(45% — Utama)</span>:</span>
                                <span className="font-bold text-ink ">{fScore}</span>
                              </div>
                              <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                                <div className="bg-up h-1.5 rounded-full" style={{ width: `${fScore}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-muted ">Teknikal & Volume <span className="text-[10px] text-ink font-bold">(35% — Kedua)</span>:</span>
                                <span className="font-bold text-ink ">{tScore}</span>
                              </div>
                              <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                                <div className="bg-accent h-1.5 rounded-full" style={{ width: `${tScore}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-muted ">Momentum / Tren <span className="text-[10px] text-muted">(10%)</span>:</span>
                                <span className="font-bold text-ink ">{trendScore}</span>
                              </div>
                              <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                                <div className="bg-warn h-1.5 rounded-full" style={{ width: `${trendScore}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-muted ">Bandarmologi / KSEI <span className="text-[10px] text-ink font-semibold">(10%)</span>:</span>
                                <span className="font-bold text-ink ">{smartMoneyScore}</span>
                              </div>
                              <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                                <div className="bg-accent h-1.5 rounded-full" style={{ width: `${smartMoneyScore}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-muted flex items-center gap-1">
                                  <span>◈</span> Analisis AI {aiResearch ? (
                                    <span className={`text-[10px] font-bold ${
 (aiResearch.buyHoldSell === 'BELI' || aiResearch.buyHoldSell === 'BUY') ? 'text-up ' :
 (aiResearch.buyHoldSell === 'JUAL' || aiResearch.buyHoldSell === 'SELL') ? 'text-down ' :
 'text-warn '
 }`}>({aiResearch.buyHoldSell === 'BUY' ? 'BELI' : aiResearch.buyHoldSell})</span>
                                  ) : (
                                    <span className="text-[10px] text-muted">(On-Demand)</span>
                                  )}:
                                </span>
                                <span className={`font-bold ${aiResearch ? 'text-ink ' : 'text-muted text-[10px] italic'}`}>
                                  {aiResearch
                                    ? `${aiResearch.score ?? ((aiResearch.buyHoldSell === 'BELI' || aiResearch.buyHoldSell === 'BUY') ? 85 : (aiResearch.buyHoldSell === 'JUAL' || aiResearch.buyHoldSell === 'SELL') ? 30 : 50)}/100`
                                    : 'Belum Dianalisis'}
                                </span>
                              </div>
                              <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={aiResearch ? "   h-1.5 rounded-full transition-all duration-500" : "bg-sunken  h-1.5 rounded-full"}
                                  style={{
                                    width: aiResearch
                                      ? `${aiResearch.score ?? ((aiResearch.buyHoldSell === 'BELI' || aiResearch.buyHoldSell === 'BUY') ? 85 : (aiResearch.buyHoldSell === 'JUAL' || aiResearch.buyHoldSell === 'SELL') ? 30 : 50)}%`
                                      : '0%'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-line space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted font-medium">Rekomendasi Algoritma:</span>
                            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${rec.bgClass}`}>
                              {rec.label}
                            </span>
                          </div>
                          {aiResearch && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <span className="text-muted font-medium flex items-center gap-1">
                                <span>◈</span> Rekomendasi AI:
                              </span>
                              <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
 (aiResearch.buyHoldSell === 'BELI' || aiResearch.buyHoldSell === 'BUY')
 ? 'bg-up-soft text-up '
 : (aiResearch.buyHoldSell === 'JUAL' || aiResearch.buyHoldSell === 'SELL')
 ? 'bg-down-soft text-down '
 : 'bg-warn-soft text-warn '
 }`}>
                                {aiResearch.buyHoldSell === 'BUY' ? 'BELI' : aiResearch.buyHoldSell}
                              </span>
                            </div>
                          )}
                          <p className="text-[10px] text-muted leading-tight">
                            {rec.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ── INTERACTIVE CANDLESTICK CHART ────────────────────────────── */}
                <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">▤</span>
                      <div>
                        <h3 className="font-bold text-ink text-sm md:text-base">
                          Grafik Interaktif — {stockDetail.ticker}
                        </h3>
                        <p className="text-xs text-muted ">TradingView Pro: Candlestick, Volume, MA (20/50/200), Bollinger Bands, RSI (14), MACD & Deteksi Pola</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full">
                    <StockChart key={stockDetail.ticker} ticker={stockDetail.ticker} />
                  </div>
                </div>

                {/* ── ANALYTICAL COCKPIT CATEGORY TABS (OPSI 4) ──────────────── */}
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="tabs grid grid-cols-2 md:grid-cols-4" role="tablist" aria-label="Kategori analisis">
                      {[
                        {
                          id: 'valuation',
                          label: 'Valuasi & Finansial',
                          icon: '∠',
                          count: (stockDetail.valuationBands ? 1 : 0) + (stockDetail.wacc ? 1 : 0) + 2 + (stockDetail.peers?.length > 0 ? 1 : 0),
                        },
                        {
                          id: 'seasonality',
                          label: 'Musim & Dividen',
                          icon: '▦',
                          count: (stockDetail.monthlySeasonality ? 1 : 0) + (stockDetail.dividendTrap ? 1 : 0) + ((stockDetail.corporateActions?.length > 0 || stockDetail.dividendSchedule || stockDetail.historicalDividends?.length > 0) ? 1 : 0),
                        },
                        {
                          id: 'smartmoney',
                          label: 'Smart Money & Aliran',
                          icon: '≈',
                          count: ((stockDetail.kseiShift || stockDetail.brokerConcentration || stockDetail.volumeProfile) ? 1 : 0) + (stockDetail.executionLimits ? 1 : 0),
                        },
                        {
                          id: 'ai',
                          label: 'Riset AI & Sentimen',
                          icon: '◈',
                          count: ((stockDetail.aiResearch || stockDetail.newsSentiment) ? 1 : 0),
                        },
                      ].map((tab) => {
                        const isActive = cockpitTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setCockpitTab(tab.id)}
                            role="tab"
                            aria-selected={isActive}
                            className="tab min-w-0"
                          >
                            <span className="font-mono" aria-hidden="true">{tab.icon}</span>
                            <span className="truncate">{tab.label}</span>
                            {tab.count > 0 && (
                              <span className="font-mono text-[10px] text-muted">{tab.count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TAB 1: VALUASI & FINANSIAL */}
                  {cockpitTab === 'valuation' && (
                    <div className="space-y-6 animate-in fade-in">
                      {/* BLOOMBERG RV: RELATIVE VALUATION & PEER COMPARISON MATRIX */}
                      {stockDetail?.peers && stockDetail.peers.length > 0 && (
                        <RelativeValuationPeers
                          currentStock={stockDetail}
                          peers={stockDetail.peers}
                          onSelectTicker={(ticker) => handleSelectStock(ticker)}
                          onAddAllToCompare={(tickers) => {
                            tickers.forEach(t => handleAddToCompare(t));
                            setActiveTab('compare');
                          }}
                        />
                      )}

                      {/* BLOOMBERG PBND: HISTORICAL VALUATION BANDS */}
                      {stockDetail?.valuationBands && (
                        <ValuationBandsPanel
                          valuationBands={stockDetail.valuationBands}
                          currentPrice={stockDetail.price}
                        />
                      )}

                      {/* BLOOMBERG WACC & EVA: ECONOMIC VALUE ADDED */}
                      {stockDetail?.wacc && (
                        <EconomicValuePanel waccData={stockDetail.wacc} />
                      )}

                      {/* BLOOMBERG SCEN: INTERACTIVE WHAT-IF FORECASTER */}
                      <ScenarioForecaster stockDetail={stockDetail} />

                      {/* BLOOMBERG FA: MULTI-YEAR FINANCIAL STATEMENT MATRIX */}
                      <FinancialMatrixPanel stockDetail={stockDetail} />
                    </div>
                  )}

                  {/* TAB 2: MUSIM & DIVIDEN */}
                  {cockpitTab === 'seasonality' && (
                    <div className="space-y-6 animate-in fade-in">
                      {/* 5-YEAR MONTHLY SEASONALITY & PERFORMANCE HEATMAP */}
                      {stockDetail?.monthlySeasonality && (
                        <MonthlySeasonalityPanel
                          data={stockDetail.monthlySeasonality}
                          ticker={stockDetail.ticker}
                        />
                      )}

                      {/* BLOOMBERG DTRP & DVD: DIVIDEND TRAP & RUN-RATE */}
                      {stockDetail?.dividendTrap && (
                        <DividendTrapPanel dividendTrap={stockDetail.dividendTrap} />
                      )}

                      {/* BLOOMBERG CA: CORPORATE ACTIONS & CATALYST TIMELINE */}
                      {(stockDetail?.corporateActions?.length > 0 || stockDetail?.dividendSchedule || stockDetail?.historicalDividends?.length > 0) && (
                        <CorporateActionsPanel
                          corporateActions={stockDetail.corporateActions || []}
                          dividendSchedule={stockDetail.dividendSchedule}
                          historicalDividends={stockDetail.historicalDividends || []}
                          dividendSummary={stockDetail.dividendSummary}
                          ticker={stockDetail.ticker}
                          price={stockDetail.price}
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 3: SMART MONEY & ALIRAN */}
                  {cockpitTab === 'smartmoney' && (
                    <div className="space-y-6 animate-in fade-in">
                      {/* BLOOMBERG OWN, BRKR, & GP: SMART MONEY & LIQUIDITY */}
                      {(stockDetail?.kseiShift || stockDetail?.brokerConcentration || stockDetail?.volumeProfile) && (
                        <SmartMoneyLiquidityPanel
                          kseiShift={stockDetail.kseiShift}
                          brokerConcentration={stockDetail.brokerConcentration}
                          volumeProfile={stockDetail.volumeProfile}
                          ticker={stockDetail.ticker}
                        />
                      )}

                      {/* BLOOMBERG ARA / ARB & ALRT: EXECUTION LIMITS & ALERTS */}
                      {stockDetail?.executionLimits && (
                        <AutoRejectionLadderPanel
                          executionLimits={stockDetail.executionLimits}
                          smartAlerts={stockDetail.smartAlerts || []}
                          ticker={stockDetail.ticker}
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 4: RISET AI & SENTIMEN */}
                  {cockpitTab === 'ai' && (
                    <div className="space-y-6 animate-in fade-in">
                      {/* BLOOMBERG BI & NSENT: AI INTELLIGENCE DOSSIER & NEWS SENTIMENT */}
                      {(stockDetail?.aiResearch || stockDetail?.newsSentiment) && (
                        <BloombergIntelligencePanel
                          aiResearch={stockDetail.aiResearch}
                          newsSentiment={stockDetail.newsSentiment}
                          ticker={stockDetail.ticker}
                          onOpenFullResearch={() => setShowAiModal(true)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : !loadingDetail && !detailError ? (
              <div className="bg-surface border border-line rounded-md p-10 text-center shadow-sm space-y-3">
                <div className="w-14 h-14 mx-auto rounded-md bg-sunken border border-line flex items-center justify-center text-2xl">
                  ⌕
                </div>
                <h3 className="text-base font-bold text-ink ">
                  Pilih Saham untuk Memulai Analisis
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  Gunakan kolom pencarian di atas atau klik salah satu saham di tab Koleksi Saham untuk melihat chart interaktif, valuasi Graham, seasonality 5 tahun, dan smart money flow.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => searchInputRef.current?.focus()}
                    className="px-4 py-2 text-xs font-bold rounded-sm bg-accent hover:bg-accent text-on-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Mulai Mencari
                  </button>
                  <button
                    onClick={() => setActiveTab('collections')}
                    className="px-4 py-2 text-xs font-bold rounded-sm border border-line text-ink hover:bg-sunken transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Buka Koleksi
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      )}

      {/* ── 4. PAGE: MULTI-STOCK COMPARE VIEW (MAX 6 STOCKS) ─────────────── */}
      {activeTab === 'compare' && (
        <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-6 animate-in fade-in">
          {/* Compare Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⇄</span>
                <h2 className="text-lg md:text-xl font-black text-ink ">
                  Komparasi Multi-Saham (Head-to-Head)
                </h2>
              </div>
              <p className="text-xs md:text-sm text-muted mt-0.5">
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
                  className="w-full pl-3 pr-8 py-1.5 bg-sunken border border-line rounded-sm text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                />
                {compareSuggestions.length > 0 && (
                  <div
                    ref={compareDropdownRef}
                    className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-line rounded-sm shadow-xl overflow-hidden max-h-56 overflow-y-auto"
                  >
                    {compareSuggestions.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => handleAddToCompare(s.ticker)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-sunken text-xs border-b border-line last:border-0"
                      >
                        <span className="font-bold text-ink ">{s.ticker}</span>
                        <span className="text-[11px] text-muted truncate max-w-[120px]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {compareList.length > 0 && (
                <button
                  onClick={handleClearCompare}
                  className="px-3 py-1.5 bg-sunken hover:bg-sunken text-muted text-xs font-bold rounded-sm transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Loading Indicator */}
          {loadingCompare && (
            <div className="flex items-center gap-2 p-3 bg-sunken border border-line rounded-sm text-xs text-ink animate-pulse font-medium">
              <span>…</span> Sedang memuat data perbandingan saham...
            </div>
          )}

          {/* Compare Content */}
          {compareList.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-line rounded-md p-8 space-y-4">
              <span className="text-4xl block">⇄</span>
              <div>
                <h3 className="text-base font-bold text-ink ">Belum Ada Saham yang Dibandingkan</h3>
                <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                  Pilih hingga 6 saham dari daftar pencarian atau klik tombol &quot;Bandingkan&quot; di kartu koleksi untuk membandingkan matriks secara langsung.
                </p>
              </div>

              {/* Quick Preset Compare Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                <span className="text-xs text-muted">Contoh Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleAddMultipleToCompare(['BBCA', 'BBRI', 'BMRI', 'BBNI'])}
                  className="px-3 py-1 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm border border-line transition-colors"
                >
                  ▥ 4 Bank Terbesar (Big 4)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMultipleToCompare(['ADRO', 'PTBA', 'ITMG', 'UNTR'])}
                  className="px-3 py-1 bg-warn-soft hover:bg-warn-soft text-warn text-xs font-bold rounded-sm border border-warn transition-colors"
                >
                  ⚒ Emiten Batubara & Dividen
                </button>
              </div>
            </div>
          ) : (
            /* ── COMPARISON MATRIX TABLE (UP TO 6 COLUMNS) ────────────────── */
            <div className="overflow-x-auto rounded-sm border border-line ">
              {(() => {
                // Ambil data detail seluruh saham yang sedang dikomparasi
                const stockDetailsList = compareList.map(ticker => compareData[ticker] || {});

                // Calculate Best in Class Values
                // Best EPS: highest EPS
                const epsList = stockDetailsList.map(s => s.fundamentals?.eps).filter(e => e != null && e > 0);
                const bestEps = epsList.length > 0 ? Math.max(...epsList) : null;

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
                const compScores = stockDetailsList
                  .filter(s => s && s.scores)
                  .map(s => {
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
                      <tr className="bg-sunken border-b border-line ">
                        <th className="p-3.5 font-black text-ink w-44 min-w-[170px] sticky left-0 bg-sunken z-10">
                          Metrik Analisis
                        </th>
                        {compareList.map((ticker) => {
                          const s = compareData[ticker] || {};
                          const isUpStock = (s.changePercent || 0) >= 0;
                          return (
                            <th key={ticker} className="p-3.5 text-center min-w-[150px] border-l border-line ">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-black text-base text-ink ">{ticker}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSelectStock(ticker, true)}
                                    className="p-1 text-muted hover:text-ink text-xs"
                                    title="Lihat Detail Lengkap"
                                  >
                                    ⌕
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromCompare(ticker)}
                                    className="p-1 text-muted hover:text-down text-xs"
                                    title="Hapus dari Komparasi"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <div className="text-[10px] text-muted truncate mb-1">{s.name || 'Memuat...'}</div>
                              <div className="font-bold text-ink ">
                                Rp {s.price ? s.price.toLocaleString('id-ID') : '-'}
                              </div>
                              {s.changePercent != null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
 isUpStock ? 'bg-up-soft text-up ' : 'bg-down-soft text-down '
 }`}>
                                  {isUpStock ? '+' : ''}{Number(s.changePercent).toFixed(2)}%
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink ">
                      {/* SECTION 1: RINGKASAN & SKOR */}
                      <tr className="bg-sunken font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-ink text-[11px] uppercase tracking-wider">
                          ◎ Ringkasan & Skor Komposit
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Skor Komposit (45/35/10/10)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fSc = s.scores?.fundamental ?? 50;
                          const tSc = s.scores?.technical ?? 50;
                          const trSc = s.scores?.trending ?? 50;
                          const smSc = s.scores?.smartMoney ?? 50;
                          const cScore = Math.round((fSc * 0.45) + (tSc * 0.35) + (trSc * 0.10) + (smSc * 0.10));
                          const isWinner = Boolean(s.scores && cScore === bestCompScore && bestCompScore != null);
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : ''}`}>
                              <span className="text-sm">{cScore}/100</span> {isWinner && '★'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Rekomendasi Algoritma</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker];
                          const rec = s ? getAlgorithmicRecommendation({ stockDetail: s, scores: s.scores }) : null;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line ">
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
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Market Cap</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const mc = s.fundamentals?.marketCap;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-medium">
                              {mc ? `Rp ${(mc / 1e12).toFixed(2)} T` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 2: VALUASI & MARGIN OF SAFETY */}
                      <tr className="bg-sunken font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-ink text-[11px] uppercase tracking-wider">
                          ▤ Valuasi Harga
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">EPS (Laba Bersih / Lembar)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.eps;
                          const isWinner = val === bestEps && bestEps != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : 'text-up '}`}>
                              {val != null ? `Rp ${Number(val).toLocaleString('id-ID')}` : '-'} {isWinner && '★'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">PER (Price to Earning)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.per;
                          const isWinner = val === bestPer && bestPer != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'} {isWinner && '✦'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">PBV (Price to Book)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.pbv;
                          const isWinner = val === bestPbv && bestPbv != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Fair Value (DCF)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fv = s.projections?.fairValue;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold text-up ">
                              {fv ? `Rp ${fv.toLocaleString('id-ID')}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Margin of Safety (MoS)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const mos = s.projections?.marginOfSafety;
                          const isWinner = mos === bestMos && bestMos != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-black ${isWinner ? 'bg-up-soft text-up ' : (mos || 0) > 0 ? 'text-up ' : 'text-down '}`}>
                              {mos != null ? `${mos > 0 ? '+' : ''}${mos}%` : '-'} {isWinner && '◆'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 3: FUNDAMENTAL & KUALITAS */}
                      <tr className="bg-sunken font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-ink text-[11px] uppercase tracking-wider">
                          ◉ Fundamental & Kualitas Keuangan
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">ROE (Return on Equity)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.roe;
                          const isWinner = val === bestRoe && bestRoe != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : 'text-up '}`}>
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'} {isWinner && '★'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">OPM (Operating Margin)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.opm;
                          const isWinner = val === bestOpm && bestOpm != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-sunken text-ink ' : 'text-ink '}`}>
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'} {isWinner && '★'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">DER (Rasio Hutang)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.der;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${val != null && val > 2 ? 'text-warn' : ''}`}>
                              {val != null ? `${Number(val).toFixed(2)}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Piotroski F-Score (0-9)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.piotroskiFScore;
                          const isWinner = val === bestFScore && bestFScore != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : ''}`}>
                              {val != null ? `${val}/9` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Altman Z-Score</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.altmanZScore;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold">
                              {val != null ? `${val} (${val >= 2.99 ? 'Aman' : val < 1.81 ? 'Rawan' : 'Moderat'})` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 4: DIVIDEN & GROWTH */}
                      <tr className="bg-sunken font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-ink text-[11px] uppercase tracking-wider">
                          ▥ Dividen & Pertumbuhan
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Dividend Yield</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.dividendYield;
                          const isWinner = val === bestYield && bestYield != null;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${isWinner ? 'bg-up-soft text-up ' : 'text-up '}`}>
                              {val != null ? `${Number(val).toFixed(2)}%` : '0%'} {isWinner && '¤'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Payout Ratio (DPR)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.fundamentals?.payoutRatio;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-medium">
                              {val != null ? `${Number(val).toFixed(1)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Profit CAGR (3th)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const cagr = s.projections?.cagrPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold text-up ">
                              {cagr != null ? `+${cagr}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* SECTION 5: TEKNIKAL & BANDARMOLOGI */}
                      <tr className="bg-sunken font-bold">
                        <td colSpan={compareList.length + 1} className="p-2 text-ink text-[11px] uppercase tracking-wider">
                          » Teknikal, Volume & Bandarmologi
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">RSI 14 (Momentum)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.technicals?.rsi14;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold">
                              {val != null ? `${Number(val).toFixed(1)} (${val >= 70 ? 'Overbought' : val <= 30 ? 'Oversold' : 'Netral'})` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Volume Spike Ratio</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const val = s.volumeAnalysis?.volumeSpikeRatio;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold text-ink ">
                              {val != null ? `${val}x` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">BFI (Bandar Flow Index)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const bfi = s.bandarmologi?.bfiScore;
                          return (
                            <td key={ticker} className={`p-3 text-center border-l border-line font-bold ${(bfi || 0) >= 2 ? 'text-up' : (bfi || 0) <= -2 ? 'text-down' : ''}`}>
                              {bfi != null ? Number(bfi).toFixed(1) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Smart Money Status</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const status = s.bandarmologi?.smartMoneyStatus;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold">
                              {status || '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Saham Pengendali (PSP)</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const cp = s.bandarmologi?.controllerPercent;
                          const name = s.bandarmologi?.controllerName;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-bold text-ink ">
                              <div>{cp != null && cp > 0 ? `${Number(cp).toFixed(1)}%` : '-'}</div>
                              {name && <div className="text-[10px] text-muted font-normal truncate max-w-[110px] mx-auto" title={name}>{name}</div>}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Kepemilikan Direksi</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const dp = s.bandarmologi?.managementTotalPercent ?? s.bandarmologi?.directorsPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-medium text-up ">
                              {dp != null ? `${Number(dp).toFixed(2)}%` : '0.00%'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Kepemilikan Asing</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const fp = s.bandarmologi?.foreignPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-medium">
                              {fp != null ? `${Number(fp).toFixed(1)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold sticky left-0 bg-surface z-10">Kepemilikan Ritel</td>
                        {compareList.map(ticker => {
                          const s = compareData[ticker] || {};
                          const rp = s.bandarmologi?.retailPercent;
                          return (
                            <td key={ticker} className="p-3 text-center border-l border-line font-medium">
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
        <div
          className="modal-backdrop animate-in fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-collection-title"
            className="modal-panel p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="create-collection-title" className="text-base font-black text-ink ">▤ Buat Koleksi Baru</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Nama Koleksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Saham Dividen Aristokrat, Blue Chip 2026..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Emoji / Ikon</label>
                <div className="flex items-center gap-2">
                  {['▤', '◆', '↑', '▥', '◇', '»', '▤', '↑'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCollectionEmoji(em)}
                      className={`text-xl p-2 rounded-sm border transition-all ${
 newCollectionEmoji === em ? 'bg-sunken border-accent scale-110' : 'border-line '
 }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan strategi atau fokus portofolio koleksi ini..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-sunken text-muted text-xs font-bold rounded-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm"
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
        <div
          className="modal-backdrop animate-in fade-in"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-to-collection-title"
            className="modal-panel p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="save-to-collection-title" className="text-base font-black text-ink ">
                ⇩ Simpan {selectedStock} ke Koleksi
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleSaveStockToCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Pilih Koleksi Tujuan</label>
                <select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.emoji} {col.name} ({col._count?.items || 0} saham)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Auto-Fill Recommendation Banner (Versi Otomatis) */}
              {(() => {
                const rec = getRecommendedTargets(stockDetail);
                if (!rec.targetBuy && !rec.targetSell) return null;
                const autoDiff = (rec.targetBuy && rec.targetSell) ? (rec.targetSell - rec.targetBuy) : null;
                const autoPct = (rec.targetBuy && rec.targetSell && rec.targetBuy > 0) ? (((rec.targetSell - rec.targetBuy) / rec.targetBuy) * 100) : null;

                return (
                  <div className="bg-sunken border border-line rounded-sm p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-ink flex items-center gap-1">
                          <span>»</span> Rekomendasi Target Algoritma (Otomatis)
                        </span>
                        {autoDiff != null && (
                          <span className="text-[11px] font-bold text-up block mt-0.5">
                            Potensi Gain: +Rp {autoDiff.toLocaleString('id-ID')} (+{autoPct.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) setSaveTargetBuy(rec.targetBuy.toString());
                          if (rec.targetSell) setSaveTargetSell(rec.targetSell.toString());
                          if (autoPct != null) setSaveTargetPercent(autoPct.toFixed(2));
                        }}
                        className="px-2.5 py-1.5 bg-accent hover:bg-accent text-on-accent text-[11px] font-black rounded-sm shadow-sm transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                      >
                        <span>» Terapkan Otomatis</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) handleSaveBuyChange(rec.targetBuy.toString());
                        }}
                        className="text-left p-2 rounded-sm bg-surface border border-line hover:border-up transition-all group"
                      >
                        <span className="text-muted text-[10px] block truncate">Target Beli ({rec.buyLabel}):</span>
                        <span className="font-bold text-up group-hover:underline">
                          Rp {rec.targetBuy?.toLocaleString('id-ID')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetSell) handleSaveSellChange(rec.targetSell.toString());
                        }}
                        className="text-left p-2 rounded-sm bg-surface border border-line hover:border-down transition-all group"
                      >
                        <span className="text-muted text-[10px] block truncate">Target Jual ({rec.sellLabel}):</span>
                        <span className="font-bold text-down group-hover:underline">
                          Rp {rec.targetSell?.toLocaleString('id-ID')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Mode Input Target Beli & Jual Sendiri (Manual) */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ◎ Target Beli (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 10000"
                      value={saveTargetBuy}
                      onChange={(e) => handleSaveBuyChange(e.target.value)}
                      className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-[10px] text-muted mt-0.5 block">Harga entry ideal</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ↑ Target Jual (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 11500"
                      value={saveTargetSell}
                      onChange={(e) => handleSaveSellChange(e.target.value)}
                      className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-[10px] text-muted mt-0.5 block">Target Take Profit</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ▤ Target Gain (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 15"
                        value={saveTargetPercent}
                        onChange={(e) => handleSavePercentChange(e.target.value)}
                        className="w-full px-3 py-2 pr-7 bg-sunken border border-line rounded-sm text-sm font-semibold text-ink focus:ring-2 focus:ring-accent"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">%</span>
                    </div>
                    <span className="text-[10px] text-muted mt-0.5 block">Kalkulasi otomatis</span>
                  </div>
                </div>

                {/* Preset Persentase Keuntungan Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-muted mr-0.5">Preset Gain:</span>
                  {[3, 5, 7, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSavePercentChange(pct.toString())}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-all ${
 parseFloat(saveTargetPercent) === pct
 ? 'bg-accent border-accent text-on-accent shadow-xs'
 : 'bg-surface border-line text-ink hover:border-accent hover:text-ink '
 }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Dinamis Selisih Keuntungan / Kerugian */}
              {(() => {
                const buy = parseFloat(saveTargetBuy);
                const sell = parseFloat(saveTargetSell);
                if (!isNaN(buy) && buy > 0 && !isNaN(sell) && sell > 0) {
                  const diff = sell - buy;
                  const pct = ((sell - buy) / buy) * 100;
                  const isProfit = diff > 0;
                  const isLoss = diff < 0;
                  return (
                    <div className={`p-2.5 rounded-sm border flex items-center justify-between text-xs transition-all duration-200 ${
 isProfit 
 ? 'bg-up-soft border-up text-up ' 
 : isLoss 
 ? 'bg-down-soft border-down text-down ' 
 : 'bg-sunken border-line text-ink '
 }`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{isProfit ? '↗ Potensi Keuntungan:' : isLoss ? '↘ Potensi Kerugian:' : '⇄ Impas (BEP):'}</span>
                      </div>
                      <div className="font-bold font-mono text-right flex items-center gap-1.5">
                        <span>
                          {isProfit ? '+' : isLoss ? '-' : ''}Rp {Math.abs(diff).toLocaleString('id-ID')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
 isProfit 
 ? 'bg-up-soft text-up ' 
 : isLoss 
 ? 'bg-down-soft text-down ' 
 : 'bg-sunken text-ink '
 }`}>
                          {isProfit ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Catatan Analisis (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Alasan beli, target harga, catatan fundamental..."
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-sunken text-muted text-xs font-bold rounded-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm"
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
        <div
          className="modal-backdrop animate-in fade-in"
          onClick={() => setShowEditItemModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-title"
            className="modal-panel p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✎</span>
                <h3 id="edit-item-title" className="text-base font-black text-ink ">
                  Edit Saham: {editingItem.ticker}
                </h3>
              </div>
              <button onClick={() => setShowEditItemModal(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4">
              {/* Quick Auto-Fill Recommendation Banner (Versi Otomatis) */}
              {(() => {
                const activeStockData = stockDetail?.ticker === editingItem.ticker ? stockDetail : editingItem.stock;
                const rec = getRecommendedTargets(activeStockData);
                if (!rec.targetBuy && !rec.targetSell) return null;
                const autoDiff = (rec.targetBuy && rec.targetSell) ? (rec.targetSell - rec.targetBuy) : null;
                const autoPct = (rec.targetBuy && rec.targetSell && rec.targetBuy > 0) ? (((rec.targetSell - rec.targetBuy) / rec.targetBuy) * 100) : null;

                return (
                  <div className="bg-sunken border border-line rounded-sm p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-ink flex items-center gap-1">
                          <span>»</span> Rekomendasi Target Algoritma (Otomatis)
                        </span>
                        {autoDiff != null && (
                          <span className="text-[11px] font-bold text-up block mt-0.5">
                            Potensi Gain: +Rp {autoDiff.toLocaleString('id-ID')} (+{autoPct.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) setEditItemTargetBuy(rec.targetBuy.toString());
                          if (rec.targetSell) setEditItemTargetSell(rec.targetSell.toString());
                          if (autoPct != null) setEditItemTargetPercent(autoPct.toFixed(2));
                        }}
                        className="px-2.5 py-1.5 bg-accent hover:bg-accent text-on-accent text-[11px] font-black rounded-sm shadow-sm transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                      >
                        <span>» Terapkan Otomatis</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetBuy) handleEditBuyChange(rec.targetBuy.toString());
                        }}
                        className="text-left p-2 rounded-sm bg-surface border border-line hover:border-up transition-all group"
                      >
                        <span className="text-muted text-[10px] block truncate">Target Beli ({rec.buyLabel}):</span>
                        <span className="font-bold text-up group-hover:underline">
                          Rp {rec.targetBuy?.toLocaleString('id-ID')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (rec.targetSell) handleEditSellChange(rec.targetSell.toString());
                        }}
                        className="text-left p-2 rounded-sm bg-surface border border-line hover:border-down transition-all group"
                      >
                        <span className="text-muted text-[10px] block truncate">Target Jual ({rec.sellLabel}):</span>
                        <span className="font-bold text-down group-hover:underline">
                          Rp {rec.targetSell?.toLocaleString('id-ID')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Mode Input Target Beli & Jual Sendiri (Manual) */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ◎ Target Beli (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 10000"
                      value={editItemTargetBuy}
                      onChange={(e) => handleEditBuyChange(e.target.value)}
                      className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-[10px] text-up mt-0.5 block font-semibold">
                      Harga entry ideal
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ↑ Target Jual (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 11500"
                      value={editItemTargetSell}
                      onChange={(e) => handleEditSellChange(e.target.value)}
                      className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-[10px] text-down mt-0.5 block font-semibold">
                      Target Take Profit
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      ▤ Target Gain (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 15"
                        value={editItemTargetPercent}
                        onChange={(e) => handleEditPercentChange(e.target.value)}
                        className="w-full px-3 py-2 pr-7 bg-sunken border border-line rounded-sm text-sm font-semibold text-ink focus:ring-2 focus:ring-accent"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">%</span>
                    </div>
                    <span className="text-[10px] text-muted mt-0.5 block">Kalkulasi otomatis</span>
                  </div>
                </div>

                {/* Preset Persentase Keuntungan Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-muted mr-0.5">Preset Gain:</span>
                  {[3, 5, 7, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleEditPercentChange(pct.toString())}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-all ${
 parseFloat(editItemTargetPercent) === pct
 ? 'bg-accent border-accent text-on-accent shadow-xs'
 : 'bg-surface border-line text-ink hover:border-accent hover:text-ink '
 }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Dinamis Selisih Keuntungan / Kerugian */}
              {(() => {
                const buy = parseFloat(editItemTargetBuy);
                const sell = parseFloat(editItemTargetSell);
                if (!isNaN(buy) && buy > 0 && !isNaN(sell) && sell > 0) {
                  const diff = sell - buy;
                  const pct = ((sell - buy) / buy) * 100;
                  const isProfit = diff > 0;
                  const isLoss = diff < 0;
                  return (
                    <div className={`p-2.5 rounded-sm border flex items-center justify-between text-xs transition-all duration-200 ${
 isProfit 
 ? 'bg-up-soft border-up text-up ' 
 : isLoss 
 ? 'bg-down-soft border-down text-down ' 
 : 'bg-sunken border-line text-ink '
 }`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{isProfit ? '↗ Potensi Keuntungan:' : isLoss ? '↘ Potensi Kerugian:' : '⇄ Impas (BEP):'}</span>
                      </div>
                      <div className="font-bold font-mono text-right flex items-center gap-1.5">
                        <span>
                          {isProfit ? '+' : isLoss ? '-' : ''}Rp {Math.abs(diff).toLocaleString('id-ID')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
 isProfit 
 ? 'bg-up-soft text-up ' 
 : isLoss 
 ? 'bg-down-soft text-down ' 
 : 'bg-sunken text-ink '
 }`}>
                          {isProfit ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Catatan Analisis</label>
                <textarea
                  rows={3}
                  placeholder="Tulis alasan beli, rencana cut loss, atau target valuasi..."
                  value={editItemNotes}
                  onChange={(e) => setEditItemNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-sunken border border-line rounded-sm text-sm text-ink focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="px-4 py-2 bg-sunken text-muted text-xs font-bold rounded-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditItem}
                  className="px-4 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm disabled:opacity-50"
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
        <div className="modal-backdrop animate-in fade-in">
          <div className="modal-panel p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{newCollectionEmoji || '📁'}</span>
                <div>
                  <h3 className="text-base font-black text-ink ">✎ Edit Koleksi</h3>
                  <p className="text-xs text-muted">Ubah nama, deskripsi, atau ikon koleksi</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleUpdateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Nama Koleksi <span className="text-down">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Dividen Blue Chip, Growth Saham, dsb."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-sunken border border-line rounded-sm text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Pilih Ikon / Emoji</label>
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-sunken rounded-sm border border-line ">
                  {['▤', '◆', '↑', '↗', '▥', '◇', '»', '▤', '↑', '¤', '★', '★', '◎', '↑', '▥', '≋'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCollectionEmoji(em)}
                      className={`text-lg p-1.5 rounded-sm border transition-all flex items-center justify-center ${
 newCollectionEmoji === em
 ? 'bg-sunken border-accent scale-110 shadow-sm'
 : 'border-transparent hover:bg-surface '
 }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Deskripsi Koleksi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Tulis tujuan koleksi atau strategi investasi di sini..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-sunken border border-line rounded-sm text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-sunken rounded-sm border border-line ">
                <div>
                  <span className="text-xs font-bold text-ink block">Koleksi Publik</span>
                  <span className="text-[10px] text-muted">Dapat dibagikan kepada orang lain via link</span>
                </div>
                <input
                  type="checkbox"
                  checked={isCollectionPublic}
                  onChange={(e) => setIsCollectionPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-ink focus:ring-accent cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line ">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-sunken hover:bg-sunken text-muted text-xs font-bold rounded-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm shadow-md transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showMoveModal && movingItem && (
        <div
          className="modal-backdrop animate-in fade-in"
          onClick={() => setShowMoveModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-stock-title"
            className="modal-panel p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⇢</span>
                <div>
                  <h3 id="move-stock-title" className="text-base font-black text-ink ">Pindahkan Saham</h3>
                  <p className="text-xs text-muted">Pindahkan {movingItem.ticker} dari koleksi saat ini ke koleksi lain</p>
                </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleExecuteMove} className="space-y-4">
              <div className="p-3 bg-sunken rounded-sm border border-line flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">Koleksi Asal:</span>
                  <span className="text-xs font-bold text-ink ">
                    {selectedCollection?.emoji || '📁'} {selectedCollection?.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted block">Saham:</span>
                  <span className="text-sm font-black text-ink ">
                    {movingItem.ticker}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Pilih Koleksi Tujuan <span className="text-down">*</span>
                </label>
                {collections.filter(c => c.id !== selectedCollection?.id).length === 0 ? (
                  <div className="p-3 bg-warn-soft border border-warn rounded-sm text-xs text-warn ">
                    ▲ Anda belum memiliki koleksi lain untuk memindahkan saham. Silakan buat koleksi baru terlebih dahulu.
                  </div>
                ) : (
                  <select
                    required
                    value={moveTargetCollectionId}
                    onChange={(e) => setMoveTargetCollectionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-accent"
                  >
                    {collections
                      .filter(c => c.id !== selectedCollection?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji || '📁'} {c.name} ({c._count?.items ?? 0} saham)
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {movingItem.notes && (
                <div className="text-xs text-muted bg-sunken p-2.5 rounded-sm border border-line ">
                  <span className="font-semibold block text-[10px] uppercase text-muted mb-0.5">Catatan Bawaan:</span>
                  ✎ {movingItem.notes}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-line ">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 bg-sunken hover:bg-sunken text-muted text-xs font-bold rounded-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={movingStockLoading || collections.filter(c => c.id !== selectedCollection?.id).length === 0}
                  className="px-5 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {movingStockLoading ? 'Memindahkan...' : '⇢ Pindahkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOM POPUP DUPLICATE CONFIRMATION (NO BROWSER ALERT) ── */}
      {duplicateModal && duplicateModal.isOpen && (
        <div
          className="modal-backdrop z-[60] animate-in fade-in"
          onClick={duplicateModal.onCancel}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-modal-title"
            className="modal-panel p-4 sm:p-6 space-y-4 border-warn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-sm bg-warn-soft text-warn flex items-center justify-center text-xl shrink-0">
                ▲
              </div>
              <div className="space-y-1">
                <h3 id="duplicate-modal-title" className="text-base font-black text-ink ">
                  {duplicateModal.title || 'Saham Sudah Ada di Koleksi'}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {duplicateModal.message}
                </p>
              </div>
            </div>

            <div className="p-3 bg-warn-soft border border-warn rounded-sm text-[11px] text-warn font-medium">
              ✦ <span className="font-bold">Konfirmasi Tindakan:</span> Memilih lanjut akan menyinkronkan catatan dan target beli/jual ke koleksi tujuan.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line ">
              <button
                type="button"
                onClick={duplicateModal.onCancel}
                className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors"
              >
                {duplicateModal.cancelLabel || 'Batalkan'}
              </button>
              <button
                type="button"
                onClick={duplicateModal.onConfirm}
                className="px-5 py-2 bg-warn hover:bg-warn text-on-accent text-xs font-bold rounded-sm shadow-md transition-all flex items-center gap-1"
              >
                {duplicateModal.confirmLabel || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMATION DIALOG (DELETE ACTIONS) ───────────────── */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          className="modal-backdrop z-[60] animate-in fade-in"
          onClick={confirmDialog.onCancel}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="modal-panel p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-sm flex items-center justify-center text-xl shrink-0 ${
 confirmDialog.confirmStyle === 'danger'
 ? 'bg-down-soft text-down '
 : 'bg-sunken text-ink '
 }`}>
                {confirmDialog.confirmStyle === 'danger' ? '⌫' : '?'}
              </div>
              <div className="space-y-1">
                <h3 id="confirm-dialog-title" className="text-base font-black text-ink ">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line ">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors"
              >
                {confirmDialog.cancelLabel || 'Batalkan'}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 text-on-accent text-xs font-bold rounded-sm shadow-md transition-all flex items-center gap-1 ${
 confirmDialog.confirmStyle === 'danger'
 ? 'bg-down hover:bg-down'
 : 'bg-accent hover:bg-accent'
 }`}
              >
                {confirmDialog.confirmLabel || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PANTAU SAHAM & CATAT KE WIN RATE DASHBOARD ────────────── */}
      {monitorModal && (
        <div
          className="modal-backdrop z-[60] animate-in fade-in"
          onClick={() => setMonitorModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="monitor-modal-title"
            className="modal-panel p-4 sm:p-6 space-y-4 border-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-up-soft text-up flex items-center justify-center text-xl shrink-0">
                  ◎
                </div>
                <div>
                  <h3 id="monitor-modal-title" className="text-base font-black text-ink ">
                    Pantau {monitorModal.ticker}
                  </h3>
                  <p className="text-xs text-muted line-clamp-1">
                    {monitorModal.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMonitorModal(null)}
                className="text-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteSaveMonitor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Harga Entry / Beli (Rp) <span className="text-down">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={monitorEntryPrice}
                  onChange={(e) => setMonitorEntryPrice(e.target.value)}
                  placeholder="Misal: 10825"
                  className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Target Harga / TP (Rp)
                  </label>
                  <input
                    type="number"
                    value={monitorTargetPrice}
                    onChange={(e) => setMonitorTargetPrice(e.target.value)}
                    placeholder="Auto: +5%"
                    className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                  />
                  {/* Preset TP Cepat */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-muted font-medium">Preset TP:</span>
                    {[3, 5, 7, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const entry = parseFloat(String(monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
                          if (entry > 0) {
                            setMonitorTargetPrice(roundToIDXTick(entry * (1 + pct / 100)).toString());
                          }
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sunken hover:bg-up-soft text-ink hover:text-up transition-colors"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Stop Loss / SL (Rp)
                  </label>
                  <input
                    type="number"
                    value={monitorStopLoss}
                    onChange={(e) => setMonitorStopLoss(e.target.value)}
                    placeholder="Auto: -5%"
                    className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                  />
                  {/* Preset SL Cepat */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-muted font-medium">Preset SL:</span>
                    {[2, 3, 5, 7].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const entry = parseFloat(String(monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
                          if (entry > 0) {
                            setMonitorStopLoss(roundToIDXTick(entry * (1 - pct / 100)).toString());
                          }
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sunken hover:bg-down-soft text-ink hover:text-down transition-colors"
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Kalkulasi Real-Time Potensi Untung & Risiko Rugi */}
              {(() => {
                const calc = calculateMonitorMetrics(monitorEntryPrice, monitorTargetPrice, monitorStopLoss);
                if (!calc.validEntry) {
                  return (
                    <div className="p-2.5 rounded-sm bg-sunken border border-line text-[11px] text-muted text-center">
                      ✦ Masukkan harga entry untuk melihat kalkulasi keuntungan & risiko kerugian secara real-time
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 p-3 rounded-sm bg-sunken border border-line text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted border-b border-line pb-1.5">
                      <span>Kalkulasi Rencana Pantauan:</span>
                      {calc.rrRatio != null && (
                        <span className="px-1.5 py-0.5 rounded bg-sunken text-ink border border-line font-bold">
                          Risk/Reward: 1 : {calc.rrRatio}x
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Potensi Untung */}
                      <div className={`p-2 rounded-sm border transition-all ${
 calc.hasProfit && calc.profitNominal > 0
 ? 'bg-up-soft border-up text-up '
 : calc.hasProfit && calc.profitNominal < 0
 ? 'bg-down-soft border-down text-down '
 : 'bg-surface border-line text-muted '
 }`}>
                        <div className="text-[10px] font-medium opacity-80 mb-0.5">Potensi Untung (TP)</div>
                        <div className="font-mono font-black text-xs flex flex-col">
                          <span>
                            {calc.hasProfit ? (calc.profitNominal >= 0 ? '+' : '') + `Rp ${calc.profitNominal.toLocaleString('id-ID')}` : '-'}
                          </span>
                          <span className="text-[10px] font-bold">
                            {calc.hasProfit ? `(${calc.profitNominal >= 0 ? '+' : ''}${calc.profitPercent.toFixed(2)}%)` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Risiko Kerugian */}
                      <div className={`p-2 rounded-sm border transition-all ${
 calc.hasLoss && calc.lossNominal > 0
 ? 'bg-down-soft border-down text-down '
 : calc.hasLoss && calc.lossNominal < 0
 ? 'bg-up-soft border-up text-up '
 : 'bg-surface border-line text-muted '
 }`}>
                        <div className="text-[10px] font-medium opacity-80 mb-0.5">Risiko Rugi (SL)</div>
                        <div className="font-mono font-black text-xs flex flex-col">
                          <span>
                            {calc.hasLoss ? `-Rp ${Math.abs(calc.lossNominal).toLocaleString('id-ID')}` : '-'}
                          </span>
                          <span className="text-[10px] font-bold">
                            {calc.hasLoss ? `(-${Math.abs(calc.lossPercent).toFixed(2)}%)` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Gaya Trading (Style)
                </label>
                <select
                  value={monitorStyle}
                  onChange={(e) => setMonitorStyle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                >
                  <option value="swing">≈ Swing Trading (Beberapa Hari - Minggu)</option>
                  <option value="day">» Day Trading (Harian)</option>
                  <option value="invest">◆ Investing (Jangka Panjang)</option>
                  <option value="scalp">↑ Scalping (Menit - Jam)</option>
                </select>
              </div>

              {/* Checkbox Sudah Beli */}
              <label className="flex items-start gap-2.5 p-3 rounded-sm border border-line bg-sunken cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={monitorAlreadyBought}
                  onChange={(e) => setMonitorAlreadyBought(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-up focus:ring-up border-line cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-ink ">
                    Sudah Beli di Harga Ini (Bukan Antri)
                  </div>
                  <p className="text-[10px] text-muted leading-tight">
                    {monitorAlreadyBought 
                      ? '✓ Posisi langsung aktif (OPEN) & mulai pantau Target TP/SL.' 
                      : '… Default: Antri Beli. Sistem akan menunggu harga pasar turun ke level beli sebelum memantau Win/Loss.'}
                  </p>
                </div>
              </label>

              <div className="p-3 bg-sunken border border-line rounded-sm text-[11px] font-medium flex items-center justify-between">
                <span className="font-bold text-ink ">
                  {monitorAlreadyBought ? '↗ Status Awal: OPEN (Posisi Aktif)' : '… Status Awal: WAITING_BUY (Antri Beli)'}
                </span>
                <span className="text-muted font-medium">
                  {monitorAlreadyBought ? '★ Langsung pantau TP/SL' : '◎ Aktif saat antrean match'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line ">
                <button
                  type="button"
                  onClick={() => setMonitorModal(null)}
                  className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMonitor}
                  className="px-5 py-2 bg-up hover:bg-up text-on-accent text-xs font-bold rounded-sm shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingMonitor ? 'Menyimpan...' : '◎ Mulai Pantau'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAiModal && aiResearch && (
        <div className="modal-backdrop z-[60] animate-in fade-in" onClick={() => setShowAiModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ai-research-title" className="modal-panel sm:max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-line ">
              <div className="flex items-center gap-2.5">
                <h3 id="ai-research-title" className="text-sm font-bold text-ink flex items-center gap-2">
                  <span>✦</span> Riset AI — {aiResearch.ticker}
                </h3>
                {(() => {
                  const v = (aiResearch.buyHoldSell || '').toUpperCase();
                  const isBuy = v === 'BELI' || v === 'BUY';
                  const isSell = v === 'JUAL' || v === 'SELL';
                  return (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
 isBuy ? 'bg-up-soft text-up border border-up ' :
 isSell ? 'bg-down-soft text-down border border-down ' :
 'bg-warn-soft text-warn border border-warn '
 }`}>
                      {isBuy ? 'BELI' : isSell ? 'JUAL' : 'HOLD'}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleAnalyzeAi(true);
                    setShowAiModal(false);
                  }}
                  disabled={isAiLoading || aiStatus === 'PENDING' || aiStatus === 'PROCESSING'}
                  className="px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-sunken rounded-sm border border-line transition-colors flex items-center gap-1"
                  title="Paksa AI menganalisis ulang saham ini dengan data dan berita paling baru"
                >
                  <span>↻</span> Perbarui Riset
                </button>
                <button onClick={() => setShowAiModal(false)} className="text-muted hover:text-ink text-lg leading-none p-1">✕</button>
              </div>
            </div>
            <div className="px-6 py-5 overflow-y-auto text-xs leading-relaxed text-ink space-y-2">
              {renderAiMarkdown(aiResearch.content)}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION BANNER ───────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-md shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
 toast.type === 'error'
 ? 'bg-down-soft border-down text-down '
 : toast.type === 'warning'
 ? 'bg-warn-soft border-warn text-warn '
 : 'bg-up-soft border-up text-up '
 }`}>
            <span>{toast.type === 'error' ? '×' : toast.type === 'warning' ? '▲' : '✓'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted hover:text-ink text-xs">✕</button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
