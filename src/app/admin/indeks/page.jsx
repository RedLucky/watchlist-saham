'use client';

import { useEffect, useState } from 'react';
import { PageShell, PageHeader, SectionTitle } from '@/components/ui/PageShell';
import { TRACKED_INDICES, isStaleSync, STALE_AFTER_DAYS } from '@/lib/idxIndices';

/** Fetches the stored index summaries. Returns data instead of setting state, so effects
   that call it never setState synchronously. */
async function fetchStoredIndices() {
  const res = await fetch('/api/indices');
  if (!res.ok) throw new Error('Gagal memuat data indeks');
  return (await res.json()).indices || [];
}

/**
 * Admin page for manually uploading IDX index membership.
 *
 * This is the backup path when `node src/scripts/sync-indices.js` cannot reach IDX (site
 * layout changed, scraper container unavailable). The admin pastes a ticker list per index;
 * the API replaces the stored membership and marks the source as "upload".
 *
 * @returns {JSX.Element}
 */
export default function IndexUploadAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(TRACKED_INDICES[0].code);
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stored, setStored] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStoredIndices()
      .then((indices) => {
        if (!cancelled) setStored(indices);
      })
      .catch((error) => {
        console.error('Gagal memuat data indeks:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Sends the pasted tickers to the API and reports the result. */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/indices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey.trim() ? { 'x-admin-key': adminKey.trim() } : {}),
        },
        body: JSON.stringify({ defaultIndex: selectedIndex, text }),
      });
      const json = await res.json();
      setStatus(
        res.ok
          ? { ok: true, message: json.message }
          : { ok: false, message: json.error || 'Gagal menyimpan data indeks' },
      );
      if (res.ok) {
        setText('');
        fetchStoredIndices()
          .then(setStored)
          .catch((error) => console.error('Gagal memuat data indeks:', error));
      }
    } catch (error) {
      setStatus({ ok: false, message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Unggah Data Indeks"
        subtitle="Cadangan manual untukanggota indeks BEI ketika scraper tidak dapat dijalankan"
      />

      <section>
        <SectionTitle note={`Data dianggap basi setelah ${STALE_AFTER_DAYS} hari`}>
          Keanggotaan Saat Ini
        </SectionTitle>
        <ul className="text-sm text-muted space-y-1">
          {TRACKED_INDICES.map((meta) => {
            const row = stored.find((i) => i.code === meta.code);
            return (
              <li key={meta.code} className="font-mono text-xs">
                {meta.code.padEnd(11)} {row ? `${row.memberCount} saham` : 'belum ada data'}
                {row && ` · ${row.source} · ${isStaleSync(row.lastSyncedAt) ? 'BASI' : 'segar'}`}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle>Unggah Anggota</SectionTitle>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
          <div>
            <label htmlFor="admin-key" className="label-mono block mb-1">
              Admin Key
            </label>
            <input
              id="admin-key"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="input w-full"
              placeholder="x-admin-key"
            />
          </div>

          <div>
            <label htmlFor="index-code" className="label-mono block mb-1">
              Indeks
            </label>
            <select
              id="index-code"
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(e.target.value)}
              className="input w-full"
            >
              {TRACKED_INDICES.map((meta) => (
                <option key={meta.code} value={meta.code}>
                  {meta.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="membership" className="label-mono block mb-1">
              Ticker (satu per baris)
            </label>
            <textarea
              id="membership"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input w-full font-mono text-xs"
              placeholder={'BBCA\nBBRI\nTLKM'}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Menyimpan…' : 'Simpan Keanggotaan'}
          </button>

          {status && (
            <p role="status" className={status.ok ? 'text-up text-sm' : 'text-down text-sm'}>
              {status.message}
            </p>
          )}
        </form>
      </section>
    </PageShell>
  );
}