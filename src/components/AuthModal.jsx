'use client';

import React, { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
 const [isRegister, setIsRegister] = useState(false);
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [riskProfile, setRiskProfile] = useState('MODERATE');
 const [agreeTnc, setAgreeTnc] = useState(false);
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

 if (onAuthSuccess) {
 onAuthSuccess(data.user);
 }
 onClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0a0f1a]/70 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-slate-950/90 shadow-2xl space-y-5">
 
 {/* Modal Header */}
 <div className="flex justify-between items-center pb-3 border-b border-slate-300 dark:border-white/10">
 <div>
 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
 <span>{isRegister ? '📝 Buat Akun Baru' : '🔑 Login Pengguna'}</span>
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400">
 {isRegister ? 'Daftar untuk mengakses seluruh fitur dashboard IDX Watchlist.' : 'Masuk untuk membuka dashboard IDX Watchlist.'}
 </p>
 </div>
 {onClose && (
 <button
 onClick={onClose}
 className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white p-1 text-sm"
 >
 ✕
 </button>
 )}
 </div>

 {error && (
 <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
 ⚠️ {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 
 {isRegister && (
 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Nama Lengkap</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Nama Anda"
 className="w-full bg-white border border-slate-200 dark:bg-slate-50 dark:bg-[#0a0f1a]/40 dark:border-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-400"
 required={isRegister}
 />
 </div>
 )}

 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="nama@email.com"
 className="w-full bg-white border border-slate-200 dark:bg-slate-50 dark:bg-[#0a0f1a]/40 dark:border-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-400"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Password</label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full bg-white border border-slate-200 dark:bg-slate-50 dark:bg-[#0a0f1a]/40 dark:border-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-400"
 required
 />
 </div>

 {isRegister && (
 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Profil Risiko Investasi</label>
 <select
 value={riskProfile}
 onChange={(e) => setRiskProfile(e.target.value)}
 className="w-full bg-white border border-slate-200 dark:bg-slate-50 dark:bg-[#0a0f1a]/40 dark:border-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 focus:outline-none focus:border-indigo-400"
 >
 <option value="CONSERVATIVE">🟢 Konservatif (Prioritas Keamanan SBN 60%)</option>
 <option value="MODERATE">🟡 Moderat (Seimbang 50% SBN / 35% Saham)</option>
 <option value="AGGRESSIVE">🔴 Agresif (Prioritas Growth Saham 60%)</option>
 </select>
 </div>
 )}

 {isRegister && (
 <div className="space-y-2 mt-4 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
 <label className="flex items-start gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={agreeTnc}
 onChange={(e) => setAgreeTnc(e.target.checked)}
 className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
 />
 <span className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
 Saya mengerti bahwa aplikasi ini hanya sebagai alat bantu analisis dan <strong>Bukan Nasihat Keuangan (Not Financial Advice)</strong>. Segala risiko kerugian di pasar modal adalah tanggung jawab pribadi. Saya juga setuju data portofolio saya diolah secara anonim.
 </span>
 </label>
 </div>
 )}

 <button
 type="submit"
 disabled={loading || (isRegister && !agreeTnc)}
 className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 mt-2"
 >
 {loading ? 'Memproses...' : isRegister ? 'Daftar Akun Sekarang' : 'Masuk ke Dashboard'}
 </button>
 </form>

 {/* Toggle Login/Register */}
 <div className="text-center pt-2 border-t border-slate-300 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
 {isRegister ? (
 <span>
 Sudah punya akun?{' '}
 <button
 type="button"
 onClick={() => { setIsRegister(false); setError(''); }}
 className="text-indigo-400 font-bold hover:underline"
 >
 Login di sini
 </button>
 </span>
 ) : (
 <span>
 Belum memiliki akun?{' '}
 <button
 type="button"
 onClick={() => { setIsRegister(true); setError(''); }}
 className="text-indigo-400 font-bold hover:underline"
 >
 Daftar sekarang
 </button>
 </span>
 )}
 </div>

 </div>
 </div>
 );
}
