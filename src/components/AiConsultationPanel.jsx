'use client';

import React, { useState, useEffect, useRef } from 'react';

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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Simple Markdown & Table Formatter
  const renderFormattedContent = (content = '') => {
    if (!content) return null;

    // Check for markdown tables
    if (content.includes('|') && content.includes('\n')) {
      const lines = content.split('\n');
      const elements = [];
      let tableLines = [];
      let inTable = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          inTable = true;
          tableLines.push(line);
        } else {
          if (inTable && tableLines.length >= 2) {
            elements.push(renderTableBlock(tableLines, `tbl-${i}`));
            tableLines = [];
            inTable = false;
          }
          if (line) elements.push(<p key={`p-${i}`} className="my-1.5 leading-relaxed">{renderInlineMarkdown(line)}</p>);
        }
      }

      if (inTable && tableLines.length >= 2) {
        elements.push(renderTableBlock(tableLines, `tbl-end`));
      }

      return elements;
    }

    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-1 leading-relaxed">
            {renderInlineMarkdown(trimmed.substring(2))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li key={idx} className="ml-4 list-decimal my-1 leading-relaxed">
            {renderInlineMarkdown(trimmed.replace(/^\d+\.\s*/, ''))}
          </li>
        );
      }
      return <p key={idx} className="my-1.5 leading-relaxed">{renderInlineMarkdown(trimmed)}</p>;
    });
  };

  const renderInlineMarkdown = (text = '') => {
    // Bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderTableBlock = (tableLines, key) => {
    const headerLine = tableLines[0];
    const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
    const bodyLines = tableLines.slice(2); // skip separator

    return (
      <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {bodyLines.map((row, rIdx) => {
              const cells = row.split('|').map(s => s.trim()).filter(Boolean);
              return (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  {cells.map((c, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 font-medium">{renderInlineMarkdown(c)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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
                  {/* Collapsible Reasoning Block for Assistant */}
                  {!isUser && msg.thinking && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleThinking(msg.id || idx)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-colors cursor-pointer"
                      >
                        <span>🧠</span>
                        <span>{expandedThinking[msg.id || idx] ? 'Sembunyikan' : 'Lihat'} Alur Penalaran & Analisis Risiko</span>
                        <span className="text-[10px]">{expandedThinking[msg.id || idx] ? '▲' : '▼'}</span>
                      </button>

                      {expandedThinking[msg.id || idx] && (
                        <div className="mt-2 p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {msg.thinking}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Message Content */}
                  <div className="space-y-1">
                    {renderFormattedContent(msg.content)}
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

