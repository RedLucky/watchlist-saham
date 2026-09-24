'use client';

import React, { useState } from 'react';

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
 className="w-full px-3 py-2 rounded-lg text-xs font-bold border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 dark:bg-[#0a0f1a]/60 dark:border-slate-700 dark:text-white"
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
 className="w-full px-3 py-2 rounded-lg text-xs font-bold border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 dark:bg-[#0a0f1a]/60 dark:border-slate-700 dark:text-white"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Password</label>
 <div className="relative">
 <input
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full px-3 py-2 pr-10 rounded-lg text-xs font-bold border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 dark:bg-[#0a0f1a]/60 dark:border-slate-700 dark:text-white"
 required
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white focus:outline-none"
 >
 {showPassword ? (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
 </svg>
 ) : (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
 </svg>
 )}
 </button>
 </div>
 </div>

 {isRegister && (
 <div className="space-y-1">
 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Profil Risiko Investasi</label>
 <select
 value={riskProfile}
 onChange={(e) => setRiskProfile(e.target.value)}
 className="w-full px-3 py-2 rounded-lg text-xs font-bold border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-indigo-700 dark:bg-[#0a0f1a]/60 dark:border-slate-700 dark:text-indigo-400"
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
