'use client';

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';

const renderLatexToHtml = (latex = '', displayMode = false) => {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
    });
  } catch (err) {
    console.error('KaTeX render error:', err);
    return `<span class="font-mono text-xs text-amber-500">${latex}</span>`;
  }
};

const STARTER_PROMPTS = [
  {
    icon: '📉',
    title: 'Strategi Saham Nyangkut',
    prompt: 'Saya punya saham nyangkut di BBRI di harga modal 5.200. Bagaimana menurutmu, apakah sebaiknya average down atau cut loss?'
  },
  {
    icon: '💼',
    title: 'Audit Portofolio Saya',
    prompt: 'Tolong evaluasi portofolio saham saya saat ini. Apakah diversifikasinya sudah sehat dan apa risiko terbesar yang perlu saya antisipasi?'
  },
  {
    icon: '⚖️',
    title: 'Duel Saham (Komparasi)',
    prompt: 'Bandingkan saham BBRI vs BMRI: mana yang lebih menarik dari sisi valuasi PBND, profitabilitas ROE, dan dividen yield untuk 1 tahun ke depan?'
  },
  {
    icon: '💰',
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
            className="my-2.5 py-2 px-3 overflow-x-auto rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 block text-center text-slate-900 dark:text-slate-100 shadow-xs"
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
            className="inline-block px-1 mx-0.5 align-middle text-indigo-700 dark:text-indigo-300 font-medium"
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
                ? 'bg-blue-800/60 text-white'
                : 'bg-slate-200/90 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
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
              isUser ? 'text-white' : 'text-slate-900 dark:text-white'
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
              isUser ? 'text-blue-100' : 'text-slate-800 dark:text-slate-200'
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
      <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  {renderInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {dataLines.map((row, rIdx) => {
              const cells = parseCells(row);
              return (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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
                isUser ? 'text-white' : 'text-slate-800 dark:text-slate-200'
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
                isUser ? 'text-white' : 'text-slate-800 dark:text-slate-200'
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
                  isUser ? 'text-white font-medium' : 'text-slate-800 dark:text-slate-200'
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
            className="my-2.5 p-3 rounded-xl bg-slate-900 text-emerald-400 dark:bg-black/90 font-mono text-xs overflow-x-auto border border-slate-800"
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
              className="my-3 py-2.5 px-4 overflow-x-auto rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex justify-center text-slate-900 dark:text-slate-100 shadow-xs"
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
            className="my-3 py-2.5 px-4 overflow-x-auto rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex justify-center text-slate-900 dark:text-slate-100 shadow-xs"
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
        blocks.push(<hr key={`hr-${i}`} className="my-3 border-t border-slate-200 dark:border-slate-800" />);
        continue;
      }

      // Headers (#, ##, ###, ####)
      if (trimmed.startsWith('# ')) {
        blocks.push(
          <h3
            key={`h1-${i}`}
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-3 mb-1 border-b border-slate-200/80 dark:border-slate-800 pb-1"
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
            className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-3 mb-1 flex items-center gap-1.5"
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
            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1"
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
            className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2 mb-0.5"
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
            className="p-2.5 my-2 rounded-r-xl border-l-4 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs sm:text-sm italic text-slate-700 dark:text-slate-300"
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
            isUser ? 'text-white font-medium' : 'text-slate-800 dark:text-slate-200'
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
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)] min-h-[620px]">
      {/* ── LEFT SIDEBAR: Sessions List (280px) ── */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Header with New Session Button */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Konsultasi AI</h3>
              <p className="text-[10px] text-slate-500">Analisis Kuantitatif IDX</p>
            </div>
          </div>
          <button
            onClick={handleNewSession}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            title="Mulai Sesi Baru"
          >
            <span>+</span> Sesi Baru
          </button>
        </div>

        {/* Sessions Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Memuat riwayat sesi...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-1">
              <p>Belum ada riwayat sesi.</p>
              <p className="text-[10px] text-slate-500">Klik "Sesi Baru" untuk mulai konsultasi.</p>
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
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs truncate font-medium">{s.title || 'Konsultasi Saham'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {dateStr} • {s._count?.messages || 0} pesan
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 transition-opacity"
                    title="Hapus sesi"
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Hardware Status Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CPU Safe (Single-Slot Mutex)
          </span>
          <span className="font-mono">RAM 32GB Ready</span>
        </div>
      </div>

      {/* ── RIGHT MAIN CONVERSATION PANE ── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm shadow-xs font-bold">
              AI
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {activeSessionId
                  ? sessions.find(s => s.id === activeSessionId)?.title || 'Sesi Konsultasi Aktif'
                  : 'Konsultasi Baru'}
              </h2>
              <p className="text-[10px] text-slate-500">
                Persona: Senior Equity Analyst & Risk Manager IDX • Temperature: 0.4
              </p>
            </div>
          </div>

          {/* Toggle Attach Portfolio */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <input
              type="checkbox"
              checked={attachPortfolio}
              onChange={e => setAttachPortfolio(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <span>Sertakan Portofolio Saya</span>
          </label>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Empty State: Starter Prompt Cards */}
          {messages.length === 0 && !loading && (
            <div className="max-w-2xl mx-auto py-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 mx-auto">
                🧠
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Selamat Datang di Konsultasi AI Pasar Modal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Tanyakan posisi saham Anda, konsultasikan strategi averaging down, evaluasi risiko portofolio, atau komparasi emiten berbasis data bursa riil.
                </p>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {STARTER_PROMPTS.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(card.prompt)}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 dark:bg-slate-800/40 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{card.icon}</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0 mt-1">
                    AI
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm shadow-xs ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-medium rounded-tr-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                }`}>
                  {/* Assistant Header Actions: Reasoning Toggle & Copy Button */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        {msg.thinking ? (
                          <button
                            onClick={() => toggleThinking(msg.id || idx)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-colors cursor-pointer"
                          >
                            <span>🧠</span>
                            <span>{expandedThinking[msg.id || idx] ? 'Sembunyikan' : 'Lihat'} Alur Penalaran</span>
                            <span className="text-[10px]">{expandedThinking[msg.id || idx] ? '▲' : '▼'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>🤖</span> Asisten Analisis Saham
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                        title="Salin jawaban AI ke clipboard"
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          copiedId === (msg.id || idx)
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span>{copiedId === (msg.id || idx) ? '✅' : '📋'}</span>
                        <span>{copiedId === (msg.id || idx) ? 'Tersalin!' : 'Salin'}</span>
                      </button>
                    </div>
                  )}

                  {/* Collapsible Reasoning Block for Assistant */}
                  {!isUser && msg.thinking && expandedThinking[msg.id || idx] && (
                    <div className="mb-3 p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {msg.thinking}
                    </div>
                  )}

                  {/* Main Message Content */}
                  <div className="space-y-1">
                    {renderFormattedContent(msg.content, isUser)}
                  </div>

                  {/* Ticker Badges */}
                  {!isUser && msgTickers.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saham Terkait:</span>
                      {msgTickers.map(tk => (
                        <span
                          key={tk}
                          className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black tracking-wider"
                        >
                          📈 {tk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Inferencing Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0 animate-pulse">
                AI
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                <span>AI sedang menganalisis data pasar IDX & menyusun kalkulasi skenario...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
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
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex-shrink-0"
            >
              Kirim
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Tekan <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Enter</kbd> untuk mengirim, <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Shift+Enter</kbd> baris baru.</span>
            <span>Data 100% didasarkan pada laporan resmi BEI & KSEI.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

