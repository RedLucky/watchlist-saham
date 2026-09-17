/**
 * Utility to assemble the Comprehensive AI Equity Research Prompt.
 * All prompt instructions are written in English to maximize LLM instruction-following precision,
 * while strictly directing the model to generate the final analytical report in Bahasa Indonesia.
 */

function safeParseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('id-ID');
}

function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toFixed(2) + '%';
}

/**
 * Detects the specific industry sector framework and returns tailored analytical rubrics.
 * Injects macro-relational models such as vehicle sales lag to aftermarket spare parts,
 * ICE vs EV transition, banking CASA franchise, CPO biodiesel B35/B40 mandates, commodity cost curves, etc.
 */
function detectSectorFramework(sector = '', subSector = '', companyName = '') {
  const s = `${sector} ${subSector} ${companyName}`.toLowerCase();

  // 1. Automotive & Spare Parts Components
  if (
    s.includes('auto') ||
    s.includes('komponen') ||
    s.includes('spare part') ||
    s.includes('suku cadang') ||
    s.includes('kendaraan') ||
    s.includes('ban ') ||
    s.includes('tire')
  ) {
    return {
      name: 'Automotive & Component Industry (Spare Parts & Vehicles)',
      rubric: `[AUTOMOTIVE & COMPONENT INDUSTRY MANDATE]:
You MUST apply the following industry-specific relational models:
1. **Historical Sales to Replacement Parts Lag (Aging Vehicle Fleet Model)**:
   - Recognize that national 4W/2W sales from 2 to 5 years ago (GAIKINDO & AISI data) form today's and tomorrow's "aging vehicle fleet" (3-7 year old vehicles).
   - This aging population directly drives non-discretionary replacement part demand (e.g. shock absorbers, brake pads, filters, batteries, tires, suspension parts).
   - Analyze the revenue split: Original Equipment Manufacturer (OEM, tied to cyclical new car factory volume) versus Aftermarket / OES (replacement market via chains like Shop&Drive and independent workshops, which provides resilient counter-cyclical recurring cash flows).
2. **ICE (Internal Combustion Engine) vs EV / Hybrid Powertrain Transition**:
   - Critically evaluate product obsolescence versus product adaptability. Differentiate between:
     a) Powertrain-agnostic parts (suspension, brakes, chassis, lighting, wiring, cabin filters, 12V auxiliary batteries) which remain fully in demand regardless of EV adoption.
     b) Engine-specific parts (fuel injectors, exhaust systems, spark plugs, engine gaskets) vulnerable to long-term EV displacement.
   - Evaluate company initiatives in EV charging infrastructure (e.g., Astra Otopower) and Tier-1 contracts with global/Chinese EV manufacturers.
3. **Competitive Moat & Distribution Hegemony**:
   - Benchmark against peers (SMSM, DRMA, GJTL, Astra group synergy, and low-cost Chinese imports).
   - Evaluate retail footprint, brand trust (e.g., GS Astra, Kayaba, Aspira, Incoe), warranty networks, and export capabilities to international aftermarket hubs.`
    };
  }

  // 2. Banking & Financial Institutions
  if (
    s.includes('bank') ||
    s.includes('financ') ||
    s.includes('keuangan') ||
    s.includes('pembiayaan') ||
    s.includes('asuransi') ||
    s.includes('multifinance')
  ) {
    return {
      name: 'Banking & Financial Institutions (KBMI 1-4)',
      rubric: `[BANKING & FINANCIAL INSTITUTIONS MANDATE]:
You MUST evaluate the following balance-sheet and credit-cycle metrics:
1. **Funding Structure & CASA Franchise**:
   - Analyze Current Account & Savings Account (CASA) ratio versus expensive Time Deposits.
   - Evaluate Cost of Funds (CoF) resilience during high interest rate regimes (BI-Rate) and Net Interest Margin (NIM) trajectory.
2. **Loan Growth Segments & Credit Quality**:
   - Segment exposure: Wholesale/Corporate vs MSME (Kredit Usaha Rakyat) vs Consumer (Mortgage/KPR, Auto Loans).
   - Asset quality: Non-Performing Loans (NPL gross & net), Loan at Risk (LAR), and Loan Loss Provisioning Coverage (coverage ratio > 200%).
3. **Digital Banking Penetration vs Brick-and-Mortar CIR**:
   - Operating efficiency: Cost-to-Income Ratio (CIR) and BOPO ratio.
   - Mobile transaction volume stickiness and digital non-interest fee-based income.
4. **Competitive Moat**:
   - Capital Adequacy Ratio (CAR), transaction ecosystem lock-in, and sovereign backing.`
    };
  }

  // 3. Energy, Thermal Coal & Oil/Gas
  if (
    s.includes('energy') ||
    s.includes('energi') ||
    s.includes('coal') ||
    s.includes('batu bara') ||
    s.includes('batubara') ||
    s.includes('oil') ||
    s.includes('gas') ||
    s.includes('minyak') ||
    s.includes('petroleum')
  ) {
    return {
      name: 'Energy & Natural Resources (Coal, Oil & Gas)',
      rubric: `[ENERGY & COMMODITY RESOURCES MANDATE]:
You MUST evaluate commodity cycle resilience and reserve durability:
1. **Global Cost Curve & Stripping Ratio (SR)**:
   - Cash cost per ton FOB and positioning on the global Newcastle / ICI-4 cost curve (low-cost quartile survival).
   - Average stripping ratio (SR) and operational efficiency in heavy equipment contract management.
2. **Mine Life & Reserve Replenishment**:
   - Remaining proven & probable reserves (P&P) and commercial mine life at current extraction run-rates.
   - Calorie grade (GAR 3400 vs 4200 vs 5800+ kcal/kg) and pricing realization.
3. **Domestic Market Obligation (DMO) & Green Transition Capex**:
   - Compliance with mandatory 25% PLN DMO cap (\$70/ton thermal cap).
   - Strategic redeployment of fossil cash flows into green diversification (renewable energy, aluminium smelters, hydro/solar projects).
4. **Competitive Moat**:
   - Dedicated pit-to-port infrastructure (private haul roads, river barging, deep-sea transshipment terminals).`
    };
  }

  // 4. Critical Minerals & Metals Mining (Nickel, Copper, Gold, Tin)
  if (
    s.includes('metal') ||
    s.includes('mineral') ||
    s.includes('nikel') ||
    s.includes('nickel') ||
    s.includes('gold') ||
    s.includes('emas') ||
    s.includes('copper') ||
    s.includes('tembaga') ||
    s.includes('timah') ||
    s.includes('tin') ||
    s.includes('smelter')
  ) {
    return {
      name: 'Critical Minerals & Downstream Smelting (Nickel, Gold, Copper)',
      rubric: `[CRITICAL MINERALS & SMELTING MANDATE]:
You MUST evaluate downstream value-add and EV battery supply chains:
1. **Smelting Technology & Product Class**:
   - Class 1 Battery Grade: HPAL (High-Pressure Acid Leach) producing MHP (Mixed Hydroxide Precipitate) and Nickel Matte.
   - Class 2 Stainless Steel: RKEF (Rotary Kiln Electric Furnace) producing NPI (Nickel Pig Iron) and Ferronickel.
2. **Ore Reserves & RKAB Quota Approvals**:
   - Government RKAB production quota permits and domestic ore supply security.
   - Cash cost per nickel/copper unit, energy source (coal-fired captive power vs green grid).
3. **Downstream Integration & Global Consortium Moats**:
   - Strategic partnerships with global battery giants (CATL, LG Energy Solution, Tsingshan).`
    };
  }

  // 5. Agribusiness & CPO Plantations
  if (
    s.includes('agri') ||
    s.includes('sawit') ||
    s.includes('cpo') ||
    s.includes('plantation') ||
    s.includes('perkebunan') ||
    s.includes('palma')
  ) {
    return {
      name: 'Agribusiness & CPO Plantations',
      rubric: `[AGRIBUSINESS & CPO PLANTATION MANDATE]:
You MUST evaluate agricultural biological assets and national bio-fuel mandates:
1. **Domestic Biofuel Floor (Mandat Biodiesel B35/B40/B50)**:
   - Domestic market absorption driven by government B35/B40 blending policies insulating domestic CPO producers from global export tariffs and EUDR headwinds.
2. **Plantation Age Profile & Productivity**:
   - Weighted average age of oil palms (Prime Yielding Age 8-18 years vs Young vs Immature vs Senile needing Replanting capex).
   - Fresh Fruit Bunch (FFB) yield per hectare and Oil Extraction Rate (OER > 23%).
3. **Weather Cyclicality & Cost Pass-Through**:
   - El Nino (drought/delayed fruiting) and La Nina (flood logistics) impacts.
   - Fertilizer cost volatility (urea, potash) and cash cost per kg of CPO.`
    };
  }

  // 6. Telecommunications & Digital Infrastructure
  if (
    s.includes('telecom') ||
    s.includes('telko') ||
    s.includes('telekomunikasi') ||
    s.includes('menara') ||
    s.includes('tower') ||
    s.includes('data center') ||
    s.includes('fiber') ||
    s.includes('internet')
  ) {
    return {
      name: 'Telecommunications & Digital Infrastructure',
      rubric: `[TELECOMMUNICATIONS & TECH INFRASTRUCTURE MANDATE]:
You MUST evaluate subscriber economics and digital infrastructure assets:
1. **Data Monetization & ARPU Trajectory**:
   - Growth in payload data consumption (GB/user/month) and price-repair discipline among operators.
   - Blended ARPU (Average Revenue Per User) expansion vs churn rate.
2. **Fixed-Mobile Convergence (FMC) & Fiber/Data Center Assets**:
   - Synergies between fiber-to-the-home (FTTH) broadband and cellular networks.
   - Strategic value of carrier-neutral data centers for AI computing and telecom tower tenancies (tenancy ratio > 1.6x).
3. **Competitive Moat**:
   - Spectrum holdings (800MHz to 2.3GHz), nationwide fiber backbone reach, and Capex-to-Revenue capital intensity.`
    };
  }

  // 7. Construction, Real Estate & Infrastructure
  if (
    s.includes('propert') ||
    s.includes('real estate') ||
    s.includes('construct') ||
    s.includes('konstruksi') ||
    s.includes('infra') ||
    s.includes('infrastruktur') ||
    s.includes('semen') ||
    s.includes('cement') ||
    s.includes('jalan tol')
  ) {
    return {
      name: 'Construction, Infrastructure & Real Estate',
      rubric: `[CONSTRUCTION, PROPERTY & INFRASTRUCTURE MANDATE]:
You MUST evaluate balance-sheet solvency, interest rate sensitivity, and recurring cash flows:
1. **Order Book Backlog & Cash Conversion Cycle**:
   - Burn-rate of existing construction order books and new contract win rates.
   - Working capital debt, receivables turnaround from government/private project owners, and cash flow from operations.
2. **Interest Rate Sensitivity & Mortgage (KPR) Dynamics**:
   - Sensitivity of property marketing sales to Bank Indonesia benchmark rates.
   - Quality and valuation of strategic landbank acquired at historically low cost bases.
3. **Recurring Income Cushion**:
   - Ratio of recurring revenue (toll tariffs, retail shopping malls, hotel hospitality) versus volatile development property sales.`
    };
  }

  // 8. Consumer Staples, Food & Beverage, Healthcare
  if (
    s.includes('consumer') ||
    s.includes('makan') ||
    s.includes('minum') ||
    s.includes('food') ||
    s.includes('beverage') ||
    s.includes('health') ||
    s.includes('kesehatan') ||
    s.includes('farmasi') ||
    s.includes('pharma') ||
    s.includes('rokok') ||
    s.includes('tobacco')
  ) {
    return {
      name: 'Consumer Staples, Food & Beverage & Healthcare',
      rubric: `[CONSUMER STAPLES & HEALTHCARE MANDATE]:
You MUST evaluate brand loyalty, pricing power, and distribution reach:
1. **Purchasing Power & Inflation Pass-Through**:
   - Sensitivity to middle-to-lower class purchasing power and government social assistance disbursements.
   - Pricing power: elasticity of demand and capacity to pass raw material price shocks (wheat, skim milk, sugar, packaging, active pharmaceutical ingredients) to retail consumers.
2. **Distribution Hegemony & Market Share**:
   - Penetration of General Trade (warung, micro-retailers) versus Modern Trade (minimarkets/supermarkets).
   - Brand equity, customer retention, and defensive volume resilience during macro downturns.`
    };
  }

  // 9. General Industrial & Commercial Default
  return {
    name: 'General Commercial & Industrial Sector',
    rubric: `[GENERAL COMMERCIAL & INDUSTRIAL MANDATE]:
You MUST apply rigorous fundamental and industrial logic:
1. **Core Business Unit Mix**: Breakdown of primary revenue segments and product lines.
2. **Industry Demand & Market-Fit**: Macro driver correlation, customer retention, and cyclicality.
3. **Competitive Moat & Competitor Benchmarking**: Structural advantages in distribution, production costs, contracts, and defending market share.
4. **1-2 Year Strategic Capex**: Management execution roadmap and new catalyst drivers.`
  };
}

function buildResearchPrompt(stockData, searchContext = "") {
  const f = safeParseJson(stockData.fundamentals) || {};
  const t = safeParseJson(stockData.technicals) || {};

  // Formatted Fundamental Metrics
  const roe = formatPercent(f.roe);
  const roa = formatPercent(f.roa);
  const opm = formatPercent(f.opm);
  const npm = formatPercent(f.npm);
  const gpm = formatPercent(f.gpm);
  const der = f.der !== null && f.der !== undefined ? `${Number(f.der).toFixed(2)}x` : 'Data unavailable';
  const eps = f.eps !== null && f.eps !== undefined ? `Rp ${formatRupiah(f.eps)}` : '-';
  const per = f.per !== null && f.per !== undefined ? `${Number(f.per).toFixed(2)}x` : '-';
  const pbv = f.pbv !== null && f.pbv !== undefined ? `${Number(f.pbv).toFixed(2)}x` : '-';
  const peg = f.pegRatio !== null && f.pegRatio !== undefined ? Number(f.pegRatio).toFixed(2) : '-';
  const divYield = formatPercent(f.dividendYield);
  const cr = f.currentRatio !== null && f.currentRatio !== undefined ? `${Number(f.currentRatio).toFixed(2)}x` : '-';
  const revGrowth = formatPercent(f.revenueGrowth);
  const fcf = f.freeCashflow !== null && f.freeCashflow !== undefined ? `Rp ${formatRupiah(f.freeCashflow)}` : '-';

  // Formatted Technical Metrics
  const rsi = t.rsi !== null && t.rsi !== undefined ? Number(t.rsi).toFixed(1) : '-';
  const macdHist = t.macdHistogram !== null && t.macdHistogram !== undefined ? Number(t.macdHistogram).toFixed(2) : '-';
  const ma20 = t.ma20 ? `Rp ${formatRupiah(t.ma20)}` : '-';
  const ma50 = t.ma50 ? `Rp ${formatRupiah(t.ma50)}` : '-';
  const high52 = t.high52w ? `Rp ${formatRupiah(t.high52w)}` : '-';
  const low52 = t.low52w ? `Rp ${formatRupiah(t.low52w)}` : '-';

  // Sector framework detection
  const sectorFramework = detectSectorFramework(stockData.sector, stockData.subSector, stockData.name);

  return `You are a Senior Quantitative Equity Research Analyst and Institutional Value Investor specializing in the Indonesia Stock Exchange (IDX/BEI).
Your objective is to conduct an institutional-grade, rigorous, empirical, and completely objective research analysis for the specified Indonesian equity.
You must synthesize the financial metrics, sector dynamics, technical momentum, and real-time internet news headlines provided below.

======================================================================
1. COMPANY & MARKET OVERVIEW
======================================================================
- Ticker: ${stockData.ticker}
- Company Name: ${stockData.name}
- Sector / Sub-Sector: ${stockData.sector || '-'} / ${stockData.subSector || '-'}
- Industry Framework: ${sectorFramework.name}
- Current Market Price: Rp ${formatRupiah(stockData.price)}
- Daily Change: ${stockData.changePercent ? Number(stockData.changePercent).toFixed(2) + '%' : '0%'}
- 52-Week Range: Low ${low52} — High ${high52}

======================================================================
2. FINANCIAL & VALUATION METRICS (DATABASE RECORD)
======================================================================
[Profitability & Operational Quality]
- Return on Equity (ROE): ${roe}
- Return on Assets (ROA): ${roa}
- Gross Profit Margin (GPM): ${gpm}
- Operating Profit Margin (OPM): ${opm}
- Net Profit Margin (NPM): ${npm}
- Revenue Growth (YoY): ${revGrowth}
- Free Cash Flow (FCF): ${fcf}
- Earnings Per Share (EPS): ${eps}

[Valuation, Solvency & Balance Sheet Health]
- Price-to-Earnings Ratio (PER): ${per}
- Price-to-Book Value (PBV): ${pbv}
- Price/Earnings-to-Growth (PEG Ratio): ${peg}
- Dividend Yield: ${divYield}
- Debt-to-Equity Ratio (DER): ${der}
- Current Ratio: ${cr}

======================================================================
3. TECHNICAL MOMENTUM & PRICE ACTION (DATABASE RECORD)
======================================================================
- Relative Strength Index (RSI 14-Period): ${rsi}
- MACD Histogram: ${macdHist}
- Moving Average 20 (MA20): ${ma20}
- Moving Average 50 (MA50): ${ma50}

======================================================================
4. REAL-TIME INTERNET RESEARCH & NEWS HEADLINES (LIVE WEB CONTEXT)
======================================================================
${searchContext || 'Tidak ada berita terkini dalam 90 hari terakhir. Analisis harus bersandar pada fundamental dan dinamika industri resmi.'}

======================================================================
5. SECTOR-SPECIFIC INDUSTRY DYNAMICS & ANALYTICAL RUBRIC
======================================================================
${sectorFramework.rubric}

======================================================================
MANDATORY RESPONSE FORMAT (YOU MUST WRITE YOUR ENTIRE ANALYSIS IN BAHASA INDONESIA):
======================================================================
You MUST produce your comprehensive report strictly following this 7-section structure:

## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Jelaskan unit bisnis inti emiten, bauran produk/jasa utama, dan kontribusi pendapatan.
- Paparkan rencana aksi korporasi, alokasi belanja modal (capex), rencana ekspansi kapasitas, atau diversifikasi produk yang dicanangkan manajemen untuk menghadapi tahun-tahun mendatang.)

## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Analisis kebutuhan riil pasar saat ini dan sejauh mana produk/jasa emiten memiliki kesesuaian pasar (product-market fit).
- Hubungkan dengan korelasi siklus industri spesifik (misalnya untuk komponen otomotif seperti AUTO: korelasi penjualan mobil/motor lampau terhadap populasi kendaraan berumur 3-7 tahun yang membutuhkan penggantian suku cadang/aftermarket; kesiapan menghadapi transisi kendaraan bensin/ICE ke Hybrid dan mobil listrik/EV).
- Jelaskan pula dampak regulasi pemerintah, siklus komoditas, atau faktor makro yang mempengaruhi industri ini.)

## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Bandingkan secara langsung dengan kompetitor utama di industrinya (sebutkan nama-nama kompetitor relevan).
- Identifikasi parit pertahanan ekonomi (economic moat) yang dimiliki perusahaan: apakah jaringan distribusi, skala ekonomi, efisiensi biaya, sinergi grup induk, atau loyalitas pelanggan.
- Jelaskan bagaimana perusahaan mengantisipasi persaingan, mempertahankan pangsa pasar (defend market share), dan menjaga margin profitabilitas.)

## 4. Analisis Fundamental & Valuasi Saham
(Tulis 2-3 paragraf mendalam dalam Bahasa Indonesia:
- Evaluasi profitabilitas (ROE, ROA, OPM, NPM), ketahanan arus kas, serta struktur solvabilitas neraca (DER, likuiditas).
- Analisis metrik valuasi (PER, PBV, PEG Ratio, dan dividen), proyeksikan estimasi nilai wajar, serta evaluasi apakah terdapat Margin of Safety yang memadai pada harga pasar saat ini.)

## 5. Arah Tren & Momentum Teknikal
(Tulis 1-2 paragraf mendalam dalam Bahasa Indonesia:
- Interpretasi aksi harga terhadap rata-rata pergerakan MA20 dan MA50.
- Evaluasi momentum indikator RSI 14, histogram MACD, serta batas support dan resistance krusial.)

## 6. Analisis Sentimen Berita & Katalis Terkini
(Tulis 1-2 paragraf mendalam dalam Bahasa Indonesia:
- Hubungkan secara langsung berita-berita internet terkini dari konteks di atas dengan prospek bisnis nyata, aksi korporasi, kinerja kuartalan, dan sentimen pasar.)

## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir
(Tulis 1-2 paragraf narasi prospek jangka 1-2 tahun ke depan yang merangkum katalis pemicu pertumbuhan, daya tahan bisnis emiten, serta risiko utama yang wajib diawasi investor.)

SKOR AI: [0-100] (Tuliskan satu angka bulat antara 0 sampai 100 yang merepresentasikan daya tarik investasi secara keseluruhan, contoh: SKOR AI: 85)
KESIMPULAN: [BELI / JUAL / HOLD] (Pilih salah satu secara tegas: KESIMPULAN: BELI, KESIMPULAN: JUAL, atau KESIMPULAN: HOLD)
ALASAN SINGKAT: (Tulis 1-2 kalimat tegas, tajam, dan objektif yang merangkum alasan utama rekomendasi Anda)

======================================================================
CRITICAL COMPLIANCE RULES:
======================================================================
- ENTIRE GENERATED OUTPUT MUST BE STRICTLY WRITTEN IN BAHASA INDONESIA.
- Do NOT hallucinate financial figures. If a metric is marked as unavailable or missing, state it clearly.
- In Section 7, you MUST strictly output "SKOR AI: [0-100]" and exactly one of "KESIMPULAN: BELI", "KESIMPULAN: JUAL", or "KESIMPULAN: HOLD".
- Maintain an objective, institutional, and disciplined equity research tone.`;
}

module.exports = { buildResearchPrompt, detectSectorFramework };
