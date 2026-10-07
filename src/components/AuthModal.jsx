'use client';

import React, { useState } from 'react';

/**
 * Login / registration dialog. When `onClose` is null the dialog cannot be dismissed
 * (used as the mandatory login gate in Dashboard).
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Show the dialog.
 * @param {(() => void)|null} props.onClose - Close handler, or null for a mandatory dialog.
 * @param {(user: object) => void} props.onAuthSuccess - Called with the logged-in user.
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [riskProfile, setRiskProfile] = useState('MODERATE');
  const [agreeTnc, setAgreeTnc] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name, email, password, riskProfile, agreeTnc }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      if (onAuthSuccess) onAuthSuccess(data.user);
      // onClose is null for the mandatory login gate.
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (register) => {
    setIsRegister(register);
    setError('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="modal-header">
          <div>
            <p className="label-mono mb-1">IDX Watchlist</p>
            <h2 id="auth-title" className="section-title text-lg">
              {isRegister ? 'Buat Akun Baru' : 'Masuk'}
            </h2>
            <p className="section-subtitle mt-0.5">
              {isRegister ? 'Daftar untuk mengakses seluruh fitur dashboard.' : 'Masuk untuk membuka dashboard analisis saham.'}
            </p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Tutup" className="btn-icon shrink-0">
              <span className="font-mono" aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          {error && (
            <div role="alert" className="alert alert-down">
              <span aria-hidden="true" className="text-down">▲</span>
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label htmlFor="auth-name" className="field-label">Nama Lengkap</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                autoComplete="name"
                className="input"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="field-label">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="field-label">Password</label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="input pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
                className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 min-h-8 px-2 text-[11px]"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label htmlFor="auth-risk" className="field-label">Profil Risiko Investasi</label>
              <select
                id="auth-risk"
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value)}
                className="select"
              >
                <option value="CONSERVATIVE">Konservatif — prioritas keamanan (SBN 60%)</option>
                <option value="MODERATE">Moderat — seimbang (50% SBN / 35% saham)</option>
                <option value="AGGRESSIVE">Agresif — prioritas growth (saham 60%)</option>
              </select>
            </div>
          )}

          {isRegister && (
            <label className="flex items-start gap-2.5 p-3 rounded-sm bg-sunken border border-line cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTnc}
                onChange={(e) => setAgreeTnc(e.target.checked)}
                className="checkbox mt-0.5 shrink-0"
              />
              <span className="text-[11px] text-muted leading-relaxed">
                Saya mengerti bahwa aplikasi ini hanya alat bantu analisis dan <strong className="text-ink">bukan nasihat keuangan</strong>. Segala risiko kerugian di pasar modal adalah tanggung jawab pribadi. Saya juga setuju data portofolio saya diolah secara anonim.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (isRegister && !agreeTnc)}
            className="btn-primary w-full min-h-10 text-sm"
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Akun' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <div className="modal-footer justify-center text-xs text-muted">
          {isRegister ? (
            <span>
              Sudah punya akun?{' '}
              <button type="button" onClick={() => switchMode(false)} className="font-semibold text-ink underline underline-offset-2 focus-ring">
                Masuk di sini
              </button>
            </span>
          ) : (
            <span>
              Belum memiliki akun?{' '}
              <button type="button" onClick={() => switchMode(true)} className="font-semibold text-ink underline underline-offset-2 focus-ring">
                Daftar sekarang
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
