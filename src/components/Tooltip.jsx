'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const TOOLTIPS = {
 score: 'Skor keseluruhan (0-100) yang menggabungkan fundamental, teknikal, smart money, trending, valuasi, likuiditas, dan dividen.',
 entry: 'Rentang harga yang disarankan untuk membeli saham. Beli dekat harga bawah untuk risiko lebih kecil.',
 target: 'Perkiraan harga yang bisa dicapai saham berdasarkan analisis teknikal.',
 stopLoss: 'Harga di mana kamu harus jual untuk membatasi kerugian. Selalu pasang stop loss!',
 riskReward: 'Perbandingan potensi keuntungan vs kerugian. Semakin tinggi semakin bagus (2:1 artinya untung 2x dari risiko).',
 riskLevel: 'Penilaian risiko keseluruhan berdasarkan rasio risk/reward dan kondisi pasar.',
 fundamental: 'Mengukur kesehatan keuangan perusahaan: profitabilitas (ROE), tingkat utang (DER), dan pertumbuhan laba.',
 technical: 'Menganalisis tren harga dan pola untuk menemukan titik beli yang tepat.',
 smartMoney: 'Mendeteksi apakah investor institusi (pemain besar) sedang mengakumulasi (membeli) saham ini.',
 trending: 'Seberapa aktif saham ini diperdagangkan dibanding biasanya. Aktivitas lebih tinggi = minat pasar lebih besar.',
 valuation: 'Apakah harga saham ini murah atau mahal dibandingkan perusahaan sejenis di sektornya.',
 liquidity: 'Seberapa mudah saham ini bisa dibeli atau dijual tanpa mempengaruhi harga.',
 dividend: 'Pembagian keuntungan perusahaan ke pemegang saham. Yield lebih tinggi = pendapatan pasif lebih besar.',
 roe: 'Return on Equity — seberapa efisien perusahaan menggunakan modal pemegang saham untuk menghasilkan laba. Semakin tinggi semakin baik.',
 der: 'Debt to Equity Ratio — perbandingan utang terhadap modal. Semakin rendah semakin aman.',
 per: 'Price to Earnings Ratio — berapa tahun laba yang kamu bayar untuk saham ini. Lebih rendah biasanya lebih murah.',
 pbv: 'Price to Book Value — harga saham relatif terhadap nilai buku perusahaan. Lebih rendah bisa berarti undervalued.',
 rsi: 'Mengukur apakah saham sudah terlalu banyak dibeli (overbought) atau dijual (oversold). Ideal di 40-60.',
 ma20: 'Rata-rata harga 20 hari terakhir. Berfungsi sebagai support atau resistance jangka pendek.',
 ma50: 'Rata-rata harga 50 hari terakhir. Berfungsi sebagai support atau resistance jangka menengah.',
};

export default function Tooltip({ term, children, className = '' }) {
 const [show, setShow] = useState(false);
 const [position, setPosition] = useState({ top: true, left: false, right: false });
 const triggerRef = useRef(null);
 const tooltipRef = useRef(null);
 const text = TOOLTIPS[term] || term;

 const calculatePosition = useCallback(() => {
 if (!triggerRef.current || !tooltipRef.current) return;

 const trigger = triggerRef.current.getBoundingClientRect();
 const tooltip = tooltipRef.current.getBoundingClientRect();
 const viewport = {
 width: window.innerWidth,
 height: window.innerHeight,
 };

 const newPosition = { top: true, left: false, right: false };

 // If not enough space above, show below
 if (trigger.top < tooltip.height + 16) {
 newPosition.top = false;
 }

 // If tooltip would overflow right, align to right edge
 const tooltipLeft = trigger.left + trigger.width / 2 - tooltip.width / 2;
 if (tooltipLeft + tooltip.width > viewport.width - 12) {
 newPosition.right = true;
 newPosition.left = false;
 }
 // If tooltip would overflow left, align to left edge
 if (tooltipLeft < 12) {
 newPosition.left = true;
 newPosition.right = false;
 }

 setPosition(newPosition);
 }, []);

 useEffect(() => {
 if (show) {
 // Small delay to let the tooltip render before measuring
 requestAnimationFrame(calculatePosition);
 }
 }, [show, calculatePosition]);

 return (
 <span
 ref={triggerRef}
 className={`relative flex items-center ${className}`}
 onMouseEnter={() => setShow(true)}
 onMouseLeave={() => setShow(false)}
 onClick={(e) => {
 e.stopPropagation();
 setShow(!show);
 }}
 style={{ cursor: 'help' }}
 >
 <div className="flex-grow">{children}</div>
 <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity"viewBox="0 0 16 16"fill="currentColor">
 <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1 1 0 110 2 1 1 0 010-2zM6.5 7h1.25v4.5h1.5V7H10.5V5.75H6.5V7z"/>
 </svg>
 {show && (
 <span
 ref={tooltipRef}
 className={`
 absolute z-[100] min-w-[200px] max-w-[min(320px,calc(100vw-24px))]
 bg-[#1e293b] text-[#e2e8f0]
 px-3.5 py-2.5 rounded-xl
 text-[13px] leading-relaxed
 pointer-events-none
 shadow-[0_4px_24px_rgba(0,0,0,0.5)]
 border border-slate-300 dark:border-white/10
 transition-opacity duration-150
 ${position.top ? 'bottom-full mb-2' : 'top-full mt-2'}
 ${position.left ? 'left-0' : position.right ? 'right-0' : 'left-1/2 -translate-x-1/2'}
 `}
 role="tooltip"
 >
 {text}
 {/* Arrow */}
 <span
 className={`
 absolute w-2.5 h-2.5 bg-[#1e293b] border border-slate-300 dark:border-white/10 rotate-45
 ${position.top
 ? 'top-full -mt-[6px] border-t-0 border-l-0'
 : 'bottom-full -mb-[6px] border-b-0 border-r-0'
 }
 ${position.left ? 'left-4' : position.right ? 'right-4' : 'left-1/2 -translate-x-1/2'}
 `}
 />
 </span>
 )}
 </span>
 );
}
