'use client';

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { PageShell, PageHeader } from './ui/PageShell';

const renderLatexToHtml = (latex = '', displayMode = false) => {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
    });
  } catch (err) {
    console.error('KaTeX render error:', err);
    return `<span class="font-mono text-xs text-warn">${latex}</span>`;
  }
};

const STARTER_PROMPTS = [
  {
    icon: '↘',
    title: 'Strategi Saham Nyangkut',
    prompt: 'Saya punya saham nyangkut di BBRI di harga modal 5.200. Bagaimana menurutmu, apakah sebaiknya average down atau cut loss?'
  },
  {
    icon: '▣',
    title: 'Audit Portofolio Saya',
    prompt: 'Tolong evaluasi portofolio saham saya saat ini. Apakah diversifikasinya sudah sehat dan apa risiko terbesar yang perlu saya antisipasi?'
  },
  {
    icon: '⇄',
    title: 'Duel Saham (Komparasi)',
    prompt: 'Bandingkan saham BBRI vs BMRI: mana yang lebih menarik dari sisi valuasi PBND, profitabilitas ROE, dan dividen yield untuk 1 tahun ke depan?'
  },
  {
    icon: '¤',
    title: 'Strategi Dividen & Pasif',
    prompt: 'Rekomendasikan saham berdividen jumbo yang aman dari jebakan dividend trap dan memiliki kas operasional yang sehat.'
  }
];

export default function AiConsultationPanel({ user = null, stocks = [] }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachPortfolio, setAttachPortfolio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedThinking, setExpandedThinking] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleCopyMessage = (msgId, text) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(msgId);
        setTimeout(() => setCopiedId(null), 2000);
      }).catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  };

  // 1. Fetch all user sessions on mount
  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch('/api/ai/chat');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSessionId) {
          selectSession(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 2. Fetch specific session messages
  const selectSession = async (sessionId) => {
    try {
      setActiveSessionId(sessionId);
      setError(null);
      const res = await fetch(`/api/ai/chat?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.session) {
        setMessages(data.session.messages || []);
      }
    } catch (err) {
      setError('Gagal memuat pesan sesi: ' + err.message);
    }
  };

  // 3. Create a new consultation session
  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 4. Delete a session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm('Hapus riwayat sesi konsultasi ini?')) return;

    try {
      await fetch(`/api/ai/chat?sessionId=${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewSession();
      }
    } catch (err) {
      alert('Gagal menghapus sesi: ' + err.message);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // 5. Send message
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    setError(null);
    setLoading(true);

    // Optimistic UI for user message
    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: text,
          attachPortfolio
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses jawaban AI.');
      }

      // Update activeSessionId if it was a new session
      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId);
        fetchSessions();
      }

      // Replace messages with updated assistant response
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        data.userMessage,
        data.message
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleThinking = (msgId) => {
    setExpandedThinking(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const renderInlineMarkdown = (text = '', isUser = false) => {
    if (!text) return null;

    // Pattern matches:
    // 1. Display math: $$...$$
    // 2. Inline math: $...$ or \(...\)
    // 3. Inline code: `...`
    // 4. Bold: **...**
    // 5. Italic: *...*
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\([\s\S]+?\\\)|\`[^\`]+\`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Display math ($$...$$)
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        const formula = part.slice(2, -2).trim();
        return (
          <span
            key={i}
            className="my-2.5 py-2 px-3 overflow-x-auto rounded-sm bg-sunken border border-line block text-center text-ink shadow-xs"
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, true) }}
          />
        );
      }

      // Inline math ($...$ or \(...\))
      if (
        (part.startsWith('$') && part.endsWith('$') && part.length >= 2 && !part.startsWith('$$')) ||
        (part.startsWith('\\(') && part.endsWith('\\)'))
      ) {
        const formula = part.startsWith('$') ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
        return (
          <span
            key={i}
            className="inline-block px-1 mx-0.5 align-middle text-ink font-medium"
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, false) }}
          />
        );
      }

      // Inline code (`code`)
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded font-mono text-[11px] sm:text-xs font-semibold ${
 isUser
 ? 'bg-accent text-on-accent'
 : 'bg-sunken text-ink '
 }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold (**bold**)
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong
            key={i}
            className={`font-extrabold ${
 isUser ? 'text-on-accent' : 'text-ink '
 }`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic (*italic*)
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        return (
          <em
            key={i}
            className={`italic ${
 isUser ? 'text-ink' : 'text-ink '
 }`}
          >
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  const renderTableBlock = (tableLines, key) => {
    if (!tableLines || tableLines.length < 2) return null;

    const parseCells = (line) => {
      const parts = line.split('|');
      if (line.startsWith('|')) parts.shift();
      if (line.endsWith('|')) parts.pop();
      return parts.map(s => s.trim());
    };

    const headerLine = tableLines[0];
    const headers = parseCells(headerLine);
    // Skip separator lines like |---|---| or |:---|---:|
    const dataLines = tableLines.slice(1).filter(line => !/^\|?[\s\-:|]+\|?$/.test(line.trim()));

    return (
      <div key={key} className="my-3 overflow-x-auto rounded-sm border border-line shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-sunken text-ink font-bold">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="px-3 py-2 border-b border-line ">
                  {renderInlineMarkdown(h)}
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
                      {renderInlineMarkdown(c)}
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

  // Robust Markdown Formatter (Headers, Lists, Blockquotes, Tables, Code)
  const renderFormattedContent = (content = '', isUser = false) => {
    if (!content) return null;

    const lines = content.split('\n');
    const blocks = [];
    let currentList = null; // { type: 'ul' | 'ol', items: [] }
    let currentTable = null; // string[]
    let currentCode = null; // { lang: string, lines: [] }
    let currentMath = null; // string[]

    const flushList = () => {
      if (currentList) {
        if (currentList.type === 'ul') {
          blocks.push(
            <ul
              key={`ul-${blocks.length}`}
              className={`my-2 space-y-1.5 ml-5 list-disc ${
 isUser ? 'text-on-accent' : 'text-ink '
 }`}
            >
              {currentList.items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderInlineMarkdown(item, isUser)}
                </li>
              ))}
            </ul>
          );
        } else {
          blocks.push(
            <ol
              key={`ol-${blocks.length}`}
              className={`my-2 space-y-1.5 ml-5 list-decimal ${
 isUser ? 'text-on-accent' : 'text-ink '
 }`}
            >
              {currentList.items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderInlineMarkdown(item, isUser)}
                </li>
              ))}
            </ol>
          );
        }
        currentList = null;
      }
    };

    const flushTable = () => {
      if (currentTable) {
        if (currentTable.length >= 2) {
          blocks.push(renderTableBlock(currentTable, `tbl-${blocks.length}`));
        } else {
          currentTable.forEach((tblLine, idx) => {
            blocks.push(
              <p
                key={`tbl-p-${blocks.length}-${idx}`}
                className={`my-1.5 leading-relaxed ${
 isUser ? 'text-on-accent font-medium' : 'text-ink '
 }`}
              >
                {renderInlineMarkdown(tblLine, isUser)}
              </p>
            );
          });
        }
        currentTable = null;
      }
    };

    const flushCode = () => {
      if (currentCode) {
        blocks.push(
          <pre
            key={`code-${blocks.length}`}
            className="my-2.5 p-3 rounded-sm bg-ink text-up font-mono text-xs overflow-x-auto border border-line"
          >
            <code>{currentCode.lines.join('\n')}</code>
          </pre>
        );
        currentCode = null;
      }
    };

    const flushMath = () => {
      if (currentMath) {
        const formula = currentMath.join('\n').trim();
        if (formula) {
          blocks.push(
            <div
              key={`math-${blocks.length}`}
              className="my-3 py-2.5 px-4 overflow-x-auto rounded-sm bg-sunken border border-line flex justify-center text-ink shadow-xs"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, true) }}
            />
          );
        }
        currentMath = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Check code fence (```)
      if (trimmed.startsWith('```')) {
        if (currentCode) {
          flushCode();
        } else {
          flushList();
          flushTable();
          flushMath();
          currentCode = { lang: trimmed.slice(3).trim(), lines: [] };
        }
        continue;
      }
      if (currentCode) {
        currentCode.lines.push(rawLine);
        continue;
      }

      // Check multi-line or standalone display math ($$)
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
        flushList();
        flushTable();
        flushMath();
        const formula = trimmed.slice(2, -2).trim();
        blocks.push(
          <div
            key={`math-${blocks.length}`}
            className="my-3 py-2.5 px-4 overflow-x-auto rounded-sm bg-sunken border border-line flex justify-center text-ink shadow-xs"
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, true) }}
          />
        );
        continue;
      }
      if (trimmed === '$$') {
        if (currentMath) {
          flushMath();
        } else {
          flushList();
          flushTable();
          currentMath = [];
        }
        continue;
      }
      if (trimmed.startsWith('$$') && !trimmed.endsWith('$$')) {
        flushList();
        flushTable();
        currentMath = [trimmed.slice(2)];
        continue;
      }
      if (currentMath) {
        if (trimmed.endsWith('$$')) {
          currentMath.push(trimmed.slice(0, -2));
          flushMath();
        } else {
          currentMath.push(rawLine);
        }
        continue;
      }

      // Check table lines (starts with |)
      if (trimmed.startsWith('|')) {
        flushList();
        if (!currentTable) currentTable = [];
        currentTable.push(trimmed);
        continue;
      } else if (currentTable) {
        flushTable();
      }

      // Check bullet list items (- or * followed by space)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.substring(2).trim();
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(itemText);
        continue;
      }

      // Check numbered list items (e.g. 1. 2.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const itemText = numMatch[2].trim();
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(itemText);
        continue;
      }

      // Not list item -> flush active list
      flushList();

      // Empty line spacer
      if (!trimmed) {
        blocks.push(<div key={`sp-${i}`} className="h-2" />);
        continue;
      }

      // Horizontal separator
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        blocks.push(<hr key={`hr-${i}`} className="my-3 border-t border-line " />);
        continue;
      }

      // Headers (#, ##, ###, ####)
      if (trimmed.startsWith('# ')) {
        blocks.push(
          <h3
            key={`h1-${i}`}
            className="text-base sm:text-lg font-black text-ink mt-3 mb-1 border-b border-line pb-1"
          >
            {renderInlineMarkdown(trimmed.substring(2), isUser)}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith('## ')) {
        blocks.push(
          <h4
            key={`h2-${i}`}
            className="text-sm sm:text-base font-extrabold text-ink mt-3 mb-1 flex items-center gap-1.5"
          >
            {renderInlineMarkdown(trimmed.substring(3), isUser)}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith('### ')) {
        blocks.push(
          <h5
            key={`h3-${i}`}
            className="text-xs sm:text-sm font-bold text-ink mt-2.5 mb-1"
          >
            {renderInlineMarkdown(trimmed.substring(4), isUser)}
          </h5>
        );
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        blocks.push(
          <h6
            key={`h4-${i}`}
            className="text-xs font-bold uppercase tracking-wider text-muted mt-2 mb-0.5"
          >
            {renderInlineMarkdown(trimmed.substring(5), isUser)}
          </h6>
        );
        continue;
      }

      // Blockquotes (> ...)
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        blocks.push(
          <blockquote
            key={`bq-${i}`}
            className="p-2.5 my-2 rounded-r-sm border-l-4 border-accent bg-sunken text-xs sm:text-sm italic text-ink "
          >
            {renderInlineMarkdown(quoteText, isUser)}
          </blockquote>
        );
        continue;
      }

      // Standard paragraph
      blocks.push(
        <p
          key={`p-${i}`}
          className={`my-1.5 leading-relaxed ${
 isUser ? 'text-on-accent font-medium' : 'text-ink '
 }`}
        >
          {renderInlineMarkdown(trimmed, isUser)}
        </p>
      );
    }

    flushList();
    flushTable();
    flushCode();
    flushMath();

    return blocks;
  };

  return (
    <PageShell className="pb-6">
      <PageHeader
        title="Konsultasi AI"
        subtitle="Tanyakan analitik soal saham BEI — jawaban dihitung dari data lokal, bukan dugaan"
        badge={<span className="badge badge-outline">Lokal · llama.cpp</span>}
      />

    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-190px)] min-h-[560px]">
      {/* ── LEFT SIDEBAR: Sessions List ── */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col card overflow-hidden">
        {/* Header with New Session Button */}
        <div className="p-3 border-b border-line flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink ">Riwayat Percakapan</h3>
              <p className="text-[10px] text-muted">Analisis Kuantitatif IDX</p>
            </div>
          </div>
          <button
            onClick={handleNewSession}
            className="btn-primary min-h-8 px-2.5 text-xs flex items-center gap-1"
            title="Mulai Sesi Baru"
          >
            <span>+</span> Sesi Baru
          </button>
        </div>

        {/* Sessions Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="p-4 text-center text-xs text-muted">Memuat riwayat sesi...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted space-y-1">
              <p>Belum ada riwayat sesi.</p>
              <p className="text-[10px] text-muted">Klik "Sesi Baru" untuk mulai konsultasi.</p>
            </div>
          ) : (
            sessions.map(s => {
              const isSelected = activeSessionId === s.id;
              const dateStr = new Date(s.updatedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short'
              });

              return (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-sm cursor-pointer transition-all ${
 isSelected
 ? 'bg-sunken border border-line text-ink font-bold'
 : 'hover:bg-sunken text-ink '
 }`}
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs truncate font-medium">{s.title || 'Konsultasi Saham'}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {dateStr} • {s._count?.messages || 0} pesan
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-down-soft text-down transition-opacity"
                    title="Hapus sesi"
                  >
                    ⌫
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Hardware Status Footer */}
        <div className="p-3 bg-sunken border-t border-line text-[10px] text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-up animate-pulse"></span>
            CPU Safe (Single-Slot Mutex)
          </span>
          <span className="font-mono">RAM 32GB Ready</span>
        </div>
      </div>

      {/* ── RIGHT MAIN CONVERSATION PANE ── */}
      <div className="flex-1 flex flex-col bg-surface border border-line rounded-md shadow-xs overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between bg-sunken ">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-ink text-on-accent text-sm font-bold">
              AI
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-ink ">
                {activeSessionId
                  ? sessions.find(s => s.id === activeSessionId)?.title || 'Sesi Konsultasi Aktif'
                  : 'Konsultasi Baru'}
              </h2>
              <p className="text-[10px] text-muted">
                Persona: Senior Equity Analyst & Risk Manager IDX • Temperature: 0.4
              </p>
            </div>
          </div>

          {/* Toggle Attach Portfolio */}
          <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer bg-surface px-3 py-1.5 rounded-sm border border-line shadow-xs">
            <input
              type="checkbox"
              checked={attachPortfolio}
              onChange={e => setAttachPortfolio(e.target.checked)}
              className="rounded text-ink focus:ring-accent cursor-pointer"
            />
            <span>Sertakan Portofolio Saya</span>
          </label>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-sm bg-down-soft border border-down text-down text-xs font-semibold">
              ▲ {error}
            </div>
          )}

          {/* Empty State: Starter Prompt Cards */}
          {messages.length === 0 && !loading && (
            <div className="max-w-2xl mx-auto py-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-md border border-line bg-sunken text-ink flex items-center justify-center text-3xl mx-auto">
                ◈
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-ink ">
                  Selamat Datang di Konsultasi AI Pasar Modal
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Tanyakan posisi saham Anda, konsultasikan strategi averaging down, evaluasi risiko portofolio, atau komparasi emiten berbasis data bursa riil.
                </p>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {STARTER_PROMPTS.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(card.prompt)}
                    className="p-3.5 rounded-sm bg-sunken hover:bg-sunken border border-line hover:border-line transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{card.icon}</span>
                      <span className="text-xs font-extrabold text-ink group-hover:text-ink ">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                      {card.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const msgTickers = msg.tickers ? (() => {
              try { return JSON.parse(msg.tickers); } catch(_) { return []; }
            })() : [];

            return (
              <div
                key={msg.id || idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-sm bg-ink text-on-accent flex items-center justify-center text-xs font-black flex-shrink-0 mt-1">
                    AI
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] rounded-md p-4 text-xs sm:text-sm shadow-xs ${
 isUser
 ? 'bg-accent text-on-accent font-medium rounded-tr-xs'
 : 'bg-sunken border border-line text-ink rounded-tl-xs'
 }`}>
                  {/* Assistant Header Actions: Reasoning Toggle & Copy Button */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-line ">
                      <div className="flex items-center gap-2">
                        {msg.thinking ? (
                          <button
                            onClick={() => toggleThinking(msg.id || idx)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-ink hover:text-ink bg-sunken px-2.5 py-1 rounded-sm border border-line transition-colors cursor-pointer"
                          >
                            <span>◈</span>
                            <span>{expandedThinking[msg.id || idx] ? 'Sembunyikan' : 'Lihat'} Alur Penalaran</span>
                            <span className="text-[10px]">{expandedThinking[msg.id || idx] ? '▲' : '▼'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-muted flex items-center gap-1">
                            <span>◈</span> Asisten Analisis Saham
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                        title="Salin jawaban AI ke clipboard"
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-sm border transition-all cursor-pointer ${
 copiedId === (msg.id || idx)
 ? 'bg-up-soft border-up text-up font-bold shadow-xs'
 : 'bg-surface hover:bg-sunken border-line text-muted '
 }`}
                      >
                        <span>{copiedId === (msg.id || idx) ? '✓' : '▤'}</span>
                        <span>{copiedId === (msg.id || idx) ? 'Tersalin!' : 'Salin'}</span>
                      </button>
                    </div>
                  )}

                  {/* Collapsible Reasoning Block for Assistant */}
                  {!isUser && msg.thinking && expandedThinking[msg.id || idx] && (
                    <div className="mb-3 p-3 rounded-sm bg-sunken border border-line text-[11px] font-mono text-muted whitespace-pre-wrap leading-relaxed">
                      {msg.thinking}
                    </div>
                  )}

                  {/* Main Message Content */}
                  <div className="space-y-1">
                    {renderFormattedContent(msg.content, isUser)}
                  </div>

                  {/* Ticker Badges */}
                  {!isUser && msgTickers.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-line flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Saham Terkait:</span>
                      {msgTickers.map(tk => (
                        <span
                          key={tk}
                          className="px-2 py-0.5 rounded-md bg-sunken text-ink border border-line text-[10px] font-black tracking-wider"
                        >
                          ↗ {tk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-sm bg-sunken text-ink flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    ◯
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Inferencing Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-sm bg-ink text-on-accent flex items-center justify-center text-xs font-black flex-shrink-0 animate-pulse">
                AI
              </div>
              <div className="p-3.5 rounded-md bg-sunken border border-line text-xs text-muted flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping"></span>
                <span>AI sedang menganalisis data pasar IDX & menyusun kalkulasi skenario...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-line bg-sunken ">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Tanyakan analisis saham (misal: 'Saya punya BBRI di 5.200, bagaimana solusinya?')..."
              className="flex-1 resize-none rounded-sm px-4 py-2.5 text-xs sm:text-sm bg-surface border border-line text-ink placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="btn-primary disabled:opacity-50 text-xs sm:text-sm cursor-pointer flex-shrink-0"
            >
              Kirim
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-muted mt-2 px-1">
            <span>Tekan <kbd className="px-1 py-0.5 bg-sunken rounded font-mono">Enter</kbd> untuk mengirim, <kbd className="px-1 py-0.5 bg-sunken rounded font-mono">Shift+Enter</kbd> baris baru.</span>
            <span>Data 100% didasarkan pada laporan resmi BEI & KSEI.</span>
          </div>
        </div>
      </div>
    </div>
    </PageShell>
  );
}

