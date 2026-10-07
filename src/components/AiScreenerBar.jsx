'use client';

import React, { useState } from 'react';

const PRESET_PROMPTS = [
  {
    label: '◆ Deep Value + Dividen',
    prompt: 'Saham bervaluasi murah PER di bawah 12, PBV di bawah 1.5, dan dividen yield di atas 5%'
  },
  {
    label: '↑ Akumulasi Asing + Momentum',
    prompt: 'Saham dengan akumulasi smart money asing dan pertumbuhan laba positif'
  },
  {
    label: '▥ Perbankan ROE Tinggi',
    prompt: 'Saham sektor perbankan dengan ROE minimal 15% dan dividen yield menarik'
  },
  {
    label: '◇ Defensive Super Moat',
    prompt: 'Saham dengan operating profit margin di atas 15%, laba bertumbuh, dan utang DER di bawah 1.0'
  },
  {
    label: '◩ Syariah Dividen Tinggi',
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
    <div className="bg-surface border border-line rounded-md p-4 md:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-ink text-on-accent text-base">
            ✦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-ink text-sm md:text-base">
                Natural Language AI Stock Screener
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sunken text-ink border border-line uppercase tracking-wider">
                Local AI
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Ketik kriteria investasi Anda dalam bahasa alami. AI akan menerjemahkannya ke dalam formula kuantitatif presisi.
            </p>
          </div>
        </div>

        {aiResult && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 text-xs font-bold text-muted hover:text-ink border border-line rounded-sm hover:bg-sunken transition-colors self-start sm:self-auto"
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
            className="w-full pl-3.5 pr-10 py-2.5 bg-sunken border border-line rounded-sm text-xs md:text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            disabled={loading}
          />
          {promptText && (
            <button
              type="button"
              onClick={() => setPromptText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!promptText.trim() || loading}
          className="btn-primary whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-line border-t-on-accent rounded-full animate-spin" />
              <span>Memproses AI...</span>
            </>
          ) : (
            <>
              <span>✦</span>
              <span>Filter dengan AI</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompt Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
          Preset Kueri Cepat:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset.prompt)}
              disabled={loading}
              className="px-2.5 py-1 text-xs font-semibold rounded-sm bg-sunken hover:bg-sunken text-ink border border-line transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extracted Criteria Box (Visible when AI results are returned) */}
      {criteria && (
        <div className="p-3.5 rounded-sm bg-sunken border border-line space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>◈</span> Hasil Ekstraksi Kriteria Kuantitatif:
            </span>
            <span className="text-[11px] font-mono text-ink font-bold">
              {aiResult?.totalMatched || 0} Saham Terpilih
            </span>
          </div>

          <p className="text-xs text-ink leading-relaxed">
            {criteria.explanation}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line text-[11px] font-mono">
            {criteria.sector && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-ink border border-line font-bold">
                Sektor: {criteria.sector}
              </span>
            )}
            {criteria.minDividendYield !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-up border border-up font-bold">
                Yield &ge; {criteria.minDividendYield}%
              </span>
            )}
            {criteria.minRoe !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-ink border border-line font-bold">
                ROE &ge; {criteria.minRoe}%
              </span>
            )}
            {criteria.minOpm !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-ink border border-line font-bold">
                OPM &ge; {criteria.minOpm}%
              </span>
            )}
            {criteria.maxPer !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-warn border border-warn font-bold">
                PER &le; {criteria.maxPer}x
              </span>
            )}
            {criteria.maxPbv !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-warn border border-warn font-bold">
                PBV &le; {criteria.maxPbv}x
              </span>
            )}
            {criteria.maxDer !== null && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-ink border border-line font-bold">
                DER &le; {criteria.maxDer}x
              </span>
            )}
            {criteria.smartMoneyOnly && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-up border border-up font-bold">
                Akumulasi Bandar/Asing ✓
              </span>
            )}
            {criteria.syariahOnly && (
              <span className="px-2 py-0.5 rounded-md bg-surface text-up border border-up font-bold">
                Syariah / ISSI ✓
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

