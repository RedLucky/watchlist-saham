'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageShell, PageHeader, SectionTitle } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { StatCard } from './ui/StatCard';
import { IndexBadgeList, invalidateIndexCache } from './IndexBadges';
import { TRACKED_INDICES, isStaleSync, STALE_AFTER_DAYS } from '@/lib/idxIndices';

/** Formats a timestamp as a short Indonesian date, e.g. "7 Okt 2026". */
function formatTanggal(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Indeks BEI — reference list of the five tracked IDX indices and their members.
 *
 * Data comes from /api/indices (summary) and /api/indices/[code] (members). If the membership
 * is older than STALE_AFTER_DAYS the page says so, because IDX only reviews indices a few
 * times a year and a stale list should never look authoritative.
 *
 * @returns {JSX.Element}
 */
export default function IndexDirectory() {
  const [indices, setIndices] = useState([]);
  const [activeCode, setActiveCode] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [newTicker, setNewTicker] = useState('');
  const [saving, setSaving] = useState(false);

  /** Refetches the member list of the selected index without changing the selection. */
  const reloadDetail = useCallback(async () => {
    if (!activeCode) return;
    const res = await fetch(`/api/indices/${activeCode}`);
    if (!res.ok) return;
    setDetail(await res.json());
  }, [activeCode]);

  /** Refetches the summary cards. */
  const reloadIndices = useCallback(async () => {
    const res = await fetch('/api/indices');
    if (res.ok) setIndices((await res.json()).indices || []);
  }, []);

  /**
   * Adds one ticker to the selected index. Admin-only on the server; a 401 here simply means the
   * logged-in user is not an admin, so we show the server's message instead of guessing.
   */
  const handleAdd = async (event) => {
    event.preventDefault();
    if (!activeCode || !newTicker.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/indices/${activeCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: newTicker.trim() }),
      });
      const json = await res.json();
      setNotice(res.ok ? { ok: true, message: json.message } : { ok: false, message: json.error });
      if (res.ok) {
        setNewTicker('');
        invalidateIndexCache();
        await Promise.all([reloadDetail(), reloadIndices()]);
      }
    } catch (err) {
      setNotice({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  /** Removes one ticker from the selected index. */
  const handleRemove = async (ticker) => {
    if (!activeCode) return;
    setNotice(null);
    const res = await fetch(`/api/indices/${activeCode}?ticker=${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    setNotice(res.ok ? { ok: true, message: json.message } : { ok: false, message: json.error });
    if (res.ok) {
      invalidateIndexCache();
      await Promise.all([reloadDetail(), reloadIndices()]);
    }
  };

  /** Loads the index summaries and opens the first index so the page is never empty. */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/indices')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Gagal memuat daftar indeks'))))
      .then((data) => {
        if (cancelled) return;
        const list = data.indices || [];
        setIndices(list);
        setError('');
        setActiveCode((prev) => prev || list[0]?.code || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Loads the member list of the selected index. */
  useEffect(() => {
    if (!activeCode) return;
    let cancelled = false;
    fetch(`/api/indices/${activeCode}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Gagal memuat anggota indeks'))))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setError('');
      })
      // An index nobody has filled in yet is normal, not an error worth shouting about.
      .catch((err) => {
        if (cancelled || !/tidak ditemukan/i.test(err.message)) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCode]);

  const activeMeta = TRACKED_INDICES.find((i) => i.code === activeCode);
  // Loading is derived from which index the detail belongs to, so no effect has to set it.
  const detailLoading = Boolean(activeCode) && detail?.code !== activeCode;
  const stale = detail ? isStaleSync(detail.lastSyncedAt) : false;
  const members = detail?.code === activeCode ? detail.members : [];
  const tracked = members.filter((m) => m.tracked).length;

  return (
    <PageShell className="animate-fade-in">
      <PageHeader
        title="Indeks BEI"
        subtitle="Anggota indeks LQ45, IDX30, IDX Value 30, High Dividend 20, dan ISSI (Syariah)"
        badge={
          <span className="badge badge-outline">
            {indices.length > 0 ? `${indices.length} indeks terlacak` : 'Belum ada data'}
          </span>
        }
        actions={
          <Link href="/admin/indeks" className="btn-secondary">
            Unggah daftar lengkap
          </Link>
        }
      />

      {error && (
        <div className="alert alert-warn" role="alert">
          {error}
        </div>
      )}

      <AutoGrid minWidth="200px">
        {TRACKED_INDICES.map((meta) => {
          const stored = indices.find((i) => i.code === meta.code);
          const isStale = stored ? isStaleSync(stored.lastSyncedAt) : true;
          return (
            <StatCard
              key={meta.code}
              label={meta.name}
              value={stored ? `${stored.memberCount} saham` : 'Belum ada data'}
              hint={stored ? `Diperbarui ${formatTanggal(stored.lastSyncedAt)}` : meta.description}
              tone={activeCode === meta.code ? 'accent' : isStale ? 'warn' : 'neutral'}
              onClick={() => setActiveCode(meta.code)}
            />
          );
        })}
      </AutoGrid>

      <section>
        <SectionTitle note={detail ? `${tracked} dari ${members.length} ada di database` : ''}>
          {activeMeta?.name || 'Anggota Indeks'}
        </SectionTitle>

        {stale && members.length > 0 && (
          <p className="text-xs text-warn mb-3" role="status">
            Data anggota lebih tua dari {STALE_AFTER_DAYS} hari. Keanggotaan indeks diperbarui IDX
            beberapa kali setahun, jadi daftar ini mungkin sudah usang.
          </p>
        )}

        <form onSubmit={handleAdd} className="card p-3 mb-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="new-ticker" className="label-mono block mb-1">
              Tambah saham ke {activeMeta?.name || 'indeks ini'}
            </label>
            <input
              id="new-ticker"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              className="input w-full font-mono"
              placeholder="BBCA"
            />
          </div>
          <button type="submit" disabled={saving || !newTicker.trim()} className="btn-primary">
            {saving ? 'Menyimpan…' : 'Tambah'}
          </button>
        </form>

        {notice && (
          <p
            role="status"
            className={`mb-3 text-sm ${notice.ok ? 'text-up' : 'text-down'}`}
          >
            {notice.message}
          </p>
        )}

        {loading || detailLoading ? (
          <p className="text-muted text-sm">Memuat anggota indeks…</p>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="section-title">Belum ada data anggota</h3>
            <p className="section-subtitle mt-1">
              Tambahkan saham satu per satu di atas, atau admin dapat mengunggah daftar ticker
              lengkap sekaligus.
            </p>
          </div>
        ) : (
          <div className="scroll-area">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Saham</th>
                  <th>Sektor</th>
                  <th className="num">Harga</th>
                  <th className="num">Perubahan</th>
                  <th>Indeks</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.ticker}>
                    <td className="num text-muted">{member.position ?? '-'}</td>
                    <td>
                      <div className="font-semibold text-ink">{member.ticker}</div>
                      <div className="text-xs text-muted truncate max-w-[240px]">{member.name}</div>
                    </td>
                    <td className="text-muted text-sm">{member.sector}</td>
                    <td className="num">
                      {member.price != null ? member.price.toLocaleString('id-ID') : '-'}
                    </td>
                    <td
                      className={`num font-semibold ${
                        member.changePercent > 0
                          ? 'text-up'
                          : member.changePercent < 0
                            ? 'text-down'
                            : 'text-muted'
                      }`}
                    >
                      {member.changePercent != null
                        ? `${member.changePercent >= 0 ? '+' : ''}${member.changePercent.toFixed(2)}%`
                        : '-'}
                    </td>
                    <td>
                      <IndexBadgeList tickers={[member.ticker]} />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(member.ticker)}
                        aria-label={`Hapus ${member.ticker} dari ${activeMeta?.name || 'indeks'}`}
                        className="btn-secondary !min-h-8 !px-2.5 text-down"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}