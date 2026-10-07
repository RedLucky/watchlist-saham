'use client';

import { useEffect, useState } from 'react';
import { PageShell, PageHeader, SectionTitle } from './ui/PageShell';
import { AutoGrid } from './ui/AutoGrid';
import { StatCard } from './ui/StatCard';
import { IndexBadgeList } from './IndexBadges';
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
      .catch((err) => {
        if (!cancelled) setError(err.message);
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

        {stale && (
          <p className="text-xs text-warn mb-3" role="status">
            Data anggota lebih tua dari {STALE_AFTER_DAYS} hari. Keanggotaan indeks diperbarui IDX
            beberapa kali setahun, jadi daftar ini mungkin sudah usang.
          </p>
        )}

        {loading || detailLoading ? (
          <p className="text-muted text-sm">Memuat anggota indeks…</p>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="section-title">Belum ada data anggota</h3>
            <p className="section-subtitle mt-1">
              Jalankan skrip sinkronisasi indeks, atau admin dapat mengunggah daftar ticker secara
              manual sebagai cadangan.
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
                  <th className="num">Skor</th>
                  <th>Indeks</th>
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
                    <td className="num">
                      {member.score != null ? member.score.toFixed(1) : '-'}
                    </td>
                    <td>
                      <IndexBadgeList tickers={[member.ticker]} />
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