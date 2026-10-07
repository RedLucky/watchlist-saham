import PensionCalculator from '@/components/PensionCalculator';
import Link from 'next/link';

export const metadata = {
  title: 'Kalkulator Saham Pensiun | IDX Watchlist',
  description: 'Kalkulator Alokasi Lot Saham Pensiun Otomatis Berdasarkan Harga Pasar Real-time. Rencanakan kebebasan finansial Anda (FIRE) dengan obligasi dan saham SBN.',
  openGraph: {
    title: 'Kalkulator Saham Pensiun | IDX Watchlist',
    description: 'Rencanakan FIRE dengan Kalkulator Alokasi SBN & Saham berbasis Real-time.',
    url: 'https://watchlist-saham.vercel.app/pensiun',
  }
};

export default function PensionPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-ink hover:text-ink transition-colors bg-sunken px-3 py-2 rounded-sm border border-line"
          >
            ← Kembali ke Dashboard IDX Watchlist
          </Link>

          <div className="text-right">
            <h1 className="label-mono">Modul Alokasi Pensiun</h1>
            <span className="text-[10px] text-text-muted">Kalkulasi Presisi Real-Time</span>
          </div>
        </div>

        {/* Calculator Component */}
        <PensionCalculator />
      </div>
    </div>
  );
}
