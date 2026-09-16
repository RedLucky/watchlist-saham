'use client';

import React, { useState } from 'react';

const PRESET_PROMPTS = [
  {
    label: '💎 Deep Value + Dividen',
    prompt: 'Saham bervaluasi murah PER di bawah 12, PBV di bawah 1.5, dan dividen yield di atas 5%'
  },
  {
    label: '🚀 Akumulasi Asing + Momentum',
    prompt: 'Saham dengan akumulasi smart money asing dan pertumbuhan laba positif'
  },
  {
    label: '🏦 Perbankan ROE Tinggi',
    prompt: 'Saham sektor perbankan dengan ROE minimal 15% dan dividen yield menarik'
  },
  {
    label: '🛡️ Defensive Super Moat',
    prompt: 'Saham dengan operating profit margin di atas 15%, laba bertumbuh, dan utang DER di bawah 1.0'
  },
  {
    label: '🕌 Syariah Dividen Tinggi',
    prompt: 'Saham syariah dengan dividen yield di atas 5% dan neraca keuangan sehat'
  }
];

export default function AiScreenerBar({ onSearch, loading, aiResult, onClear }) {
  const [promptText, setPromptText] = useState('');

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!promptText.trim() || loading) return;
    onSearch(promptText.trim());
  };

  const handleSelectPreset = (presetPrompt) => {
    setPromptText(presetPrompt);
    onSearch(presetPrompt);
  };

  const handleReset = () => {
    setPromptText('');
    if (onClear) onClear();
  };

  const criteria = aiResult?.criteria;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-base shadow-xs">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                Natural Language AI Stock Screener
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                Local AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ketik kriteria investasi Anda dalam bahasa alami. AI akan menerjemahkannya ke dalam formula kuantitatif presisi.
            </p>
          </div>
        </div>

        {aiResult && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
          >
            Reset Filter AI ✕
          </button>
        )}
      </div>

      {/* Natural Language Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Misal: Cari saham bank dengan dividen yield > 5%, ROE > 15%, dan akumulasi asing..."
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            disabled={loading}
          />
          {promptText && (
            <button
              type="button"
              onClick={() => setPromptText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!promptText.trim() || loading}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses AI...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Filter dengan AI</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompt Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Preset Kueri Cepat:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset.prompt)}
              disabled={loading}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extracted Criteria Box (Visible when AI results are returned) */}
      {criteria && (
        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <span>🤖</span> Hasil Ekstraksi Kriteria Kuantitatif:
            </span>
            <span className="text-[11px] font-mono text-purple-700 dark:text-purple-400 font-bold">
              {aiResult?.totalMatched || 0} Saham Terpilih
            </span>
          </div>

          <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
            {criteria.explanation}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-purple-200/60 dark:border-purple-800/40 text-[11px] font-mono">
            {criteria.sector && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 font-bold">
                Sektor: {criteria.sector}
              </span>
            )}
            {criteria.minDividendYield !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                Yield &ge; {criteria.minDividendYield}%
              </span>
            )}
            {criteria.minRoe !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                ROE &ge; {criteria.minRoe}%
              </span>
            )}
            {criteria.minOpm !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                OPM &ge; {criteria.minOpm}%
              </span>
            )}
            {criteria.maxPer !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                PER &le; {criteria.maxPer}x
              </span>
            )}
            {criteria.maxPbv !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                PBV &le; {criteria.maxPbv}x
              </span>
            )}
            {criteria.maxDer !== null && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                DER &le; {criteria.maxDer}x
              </span>
            )}
            {criteria.smartMoneyOnly && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                Akumulasi Bandar/Asing ✓
              </span>
            )}
            {criteria.syariahOnly && (
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-bold">
                Syariah / ISSI ✓
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

