/**
 * Comprehensive Sector Intelligence & Relational Industry Rubric Engine
 * Unifies all 35 granular industries from ALPHA_LEGEND_SECTORS (Part 1 - Part 7)
 * into a single, cohesive, keyword-driven analytical engine for AI research and web search.
 *
 * Strictly adheres to Clean Code standards:
 * - NO hardcoded ticker comparisons.
 * - Exact slug matching on subSector + Broadened semantic keyword taxonomy matching sector, subSector, and company activities.
 * - Enriched multi-query thematic search covering: Capex, Industry Demand & Macro Lag, Market Share/Moat, and Regulation/Catalysts.
 * - Deep institutional analytical rubrics integrating Alpha Legend KPIs (SSSG, BOR, Freight Rate, DOC, CASA, FFB, etc.).
 */

const { ALPHA_LEGEND_SECTORS } = require('../../data/alphaLegendSectors.js');

const SECTOR_INTELLIGENCE_CATALOG = [
  // 1. Automotive & Spare Parts Components
  {
    id: 'automotive-parts',
    keywords: [
      'auto part', 'otopart', 'auto component', 'komponen otomotif', 'komponen', 'spare part', 'sparepart',
      'suku cadang', 'ban ', 'tire', 'shock absorber', 'suspensi', 'aki ', 'baterai aki', 'kampas rem',
      'kendaraan', 'automotive', 'aftermarket', 'oem', 'bengkel', 'peralatan otomotif', 'auto cyclicals'
    ],
    searchQueries: [
      {
        category: 'Siklus Industri & Kebutuhan Pasar',
        query: (name) => `${name} suku cadang spare part otomotif mobil listrik EV Gaikindo permintaan kendaraan`
      },
      {
        category: 'Pangsa Pasar & Kompetitor',
        query: (name) => `${name} pangsa pasar persaingan industri aftermarket OEM Shop Drive bengkel distribusi`
      },
      {
        category: 'Ekspansi, Ekspor & Regulasi TKDN',
        query: (name) => `${name} kapasitas pabrik belanja modal capex ekspor komponen otomotif subsidi EV TKDN`
      }
    ],
    mandate: `[ALPHA LEGEND: AUTOMOTIVE PARTS & COMPONENTS MANDATE]:
Key Metrics to evaluate: Jumlah Retailer, GPM (Gross Profit Margin), ITO (Inventory Turnover), ROIC, Capex to Sales.
Mandatory Institutional Analytical Dimensions:
1. Core Business Units & Revenue Split:
   - Delineate Original Equipment Manufacturer (OEM, tied to cyclical domestic new car/motorcycle factory production) vs Aftermarket / OES (replacement market via retail chains like Shop&Drive and independent garage networks, providing resilient counter-cyclical recurring cash flows).
   - Evaluate export contributions to regional automotive assembly hubs (ASEAN, Japan, Middle East).
2. Historical Sales to Replacement Parts Lag (Aging Vehicle Fleet Model):
   - Correlate national 4W/2W sales from 2 to 5 years ago (GAIKINDO & AISI data) with today's and tomorrow's "aging vehicle fleet" (vehicles aged 3-7 years exiting dealer warranty).
   - This aging population directly drives non-discretionary replacement part demand (shock absorbers, brake pads, engine oil filters, batteries, tires, wiper blades, suspension linkages).
3. ICE (Internal Combustion Engine) vs EV / Hybrid Powertrain Transition:
   - Critically evaluate product portfolio vulnerability vs resilience:
     a) Powertrain-agnostic parts (suspension, brakes, chassis, lighting, cabin filtration, wiring harnesses, 12V auxiliary batteries) which remain 100% required regardless of EV/Hybrid market share.
     b) Engine-specific components (fuel injectors, exhaust mufflers, spark plugs, cylinder gaskets) exposed to long-term electrification headwinds.
   - Analyze initiatives in EV charging infrastructure (e.g. Astra Otopower) and Tier-1 supply agreements with emerging Chinese/global EV assemblers in Indonesia.
4. Competitive Moat & Competitor Benchmarking:
   - Benchmark against domestic and regional peers (SMSM, DRMA, GJTL, ASII group synergies, and low-cost Chinese aftermarket imports).
   - Evaluate proprietary dealer distribution networks, warranty enforcement, brand equity, and inventory stocking efficiency (ITO).
5. 1-2 Year Catalysts & Execution Risks:
   - Impact of luxury tax (PPnBM) incentives, raw material inflation (steel, aluminium, natural rubber, lead), FX exposure (USD/IDR & JPY/IDR on imported raw materials), and consumer financing interest rates.`
  },

  // 2. Bank Syariah
  {
    id: 'bank-syariah',
    keywords: [
      'syariah', 'sharia', 'islamic bank', 'bank syariah', 'wadiah', 'mudharabah', 'murabahah',
      'musyarakah', 'sukuk', 'pembiayaan syariah', 'dana murah syariah', 'qardh', 'sharia finance'
    ],
    searchQueries: [
      {
        category: 'Pembiayaan Syariah & Dana Pihak Ketiga',
        query: (name) => `${name} pembiayaan syariah CASA NPF bagi hasil FDR tabungan wadiah haji`
      },
      {
        category: 'Kualitas Aset & Permodalan',
        query: (name) => `${name} perbankan syariah fee based income permodalan CAR provisi CKPN`
      },
      {
        category: 'Pangsa Pasar & Digitalisasi Syariah',
        query: (name) => `${name} pangsa pasar ekosistem halal mobile banking digital efisiensi BOPO`
      }
    ],
    mandate: `[ALPHA LEGEND: BANK SYARIAH MANDATE]:
Key Metrics to evaluate: CASA Ratio (wadiah/mudharabah), Fee-Based Ratio, NPF Gross & Net (< 2.5%), FDR (Financing to Deposit Ratio 80-92%), ROAE, BOPO.
Mandatory Institutional Analytical Dimensions:
1. Funding Structure & Islamic Deposit Stickiness:
   - Analyze proportion of zero/low-cost Wadiah demand deposits and Mudharabah savings vs expensive time deposits.
   - Evaluate monopoly or preferential positioning in sovereign Islamic ecosystems (Hajj & Umrah pilgrimage funds via BPKH, civil servant Sharia payroll, Zakat/Infaq collection).
2. Financing Portfolio Quality & Margin Sharing:
   - Breakdown of financing portfolio: Consumer (Griya/KPR Syariah, Oto, Mitraguna) vs MSME/SME vs Wholesale/Corporate syndication.
   - Yield on financing vs equivalent Net Imbalan / Net Interest Margin benchmarks.
   - Non-Performing Financing (NPF) trajectory and Cash Coverage Ratio against impaired assets.
3. Operating Efficiency & Digitalization:
   - Cost-to-Income Ratio (CIR) and BOPO reduction driven by mobile app transaction volumes and digital gold/sukuk offerings.
4. Competitive Moat vs Conventional Banks & Spin-Off Peers:
   - Benchmark market share against conventional KBMI peers and regional Sharia units. Capital Adequacy Ratio (CAR > 20%) to support double-digit asset growth.`
  },

  // 3. Bank Konvensional
  {
    id: 'bank',
    keywords: [
      'bank', 'perbankan', 'financial institution', 'komersial', 'banks', 'credit', 'kredit',
      'deposito', 'tabungan', 'lending', 'pinjaman', 'bunga kredit', 'commercial bank', 'kbmi'
    ],
    searchQueries: [
      {
        category: 'Kredit, CASA & Kualitas Aset',
        query: (name) => `${name} pertumbuhan kredit dana murah CASA NPL margin bunga NIM LAR`
      },
      {
        category: 'Kompetisi & Transformasi Digital',
        query: (name) => `${name} perbankan digital efisiensi BOPO CIR transaksi mobile fee based income`
      },
      {
        category: 'Rasio Permodalan & Dividen',
        query: (name) => `${name} rasio kecukupan modal CAR dividen payout ratio laba bersih pencadangan CKPN`
      }
    ],
    mandate: `[ALPHA LEGEND: BANKING MANDATE]:
Key Metrics to evaluate: NIM (Net Interest Margin), CASA Ratio (> 60% optimal), NPL Gross (< 2.5%), Loan at Risk (LAR), LDR (80-90%), Cost of Credit (CoC), BOPO, CAR.
Mandatory Institutional Analytical Dimensions:
1. Balance Sheet Architecture & CASA Franchise:
   - Penetration of transaction accounts (Giro & Tabungan) that insulates Cost of Funds (CoF) during high Bank Indonesia (BI-Rate) benchmark interest rate cycles.
   - NIM sensitivity to interest rate cuts vs rate hikes (asset-sensitive vs liability-sensitive balance sheet).
2. Credit Growth Engines & Asset Quality Provisioning:
   - Segmental loan trajectory: Corporate/Wholesale vs Commercial/SME vs Consumer (Mortgage/KPR, Auto, Credit Cards).
   - Quality of assets: Gross NPL, Net NPL, and Loan at Risk (LAR including restructured COVID-19 portfolios).
   - Provisioning coverage ratio (CKPN / NPL > 200% as defensive buffer).
3. Non-Interest Income & Digital Operating Leverage:
   - Fee-based income generation from payment gateway ecosystem, treasury, wealth management, and bancassurance.
   - Branch rationalization vs mobile super-app daily active user (DAU) stickiness driving Cost-to-Income Ratio (CIR) down.
4. Capital Strength & Dividend Payout Capacity:
   - Tier-1 Capital Adequacy Ratio (CAR) safety margin to support sustainable 50-80% dividend payout ratios.`
  },

  // 4. Financing / Multifinance
  {
    id: 'financing',
    keywords: [
      'financing', 'pembiayaan', 'multifinance', 'leasing', 'kredit mobil', 'kredit motor',
      'piutang pembiayaan', 'sewa guna usaha', 'anjak piutang', 'consumer finance'
    ],
    searchQueries: [
      {
        category: 'Penyaluran Pembiayaan & NPF',
        query: (name) => `${name} pembiayaan kredit kendaraan baru bekas NPF piutang pembiayaan`
      },
      {
        category: 'Biaya Dana & Margin Laba',
        query: (name) => `${name} multifinance cost of funds obligasi pinjaman bank margin laba ROAA`
      },
      {
        category: 'Kolektibilitas & Pembiayaan EV',
        query: (name) => `${name} penarikan unit kredit macet pembiayaan mobil motor listrik EV OJK`
      }
    ],
    mandate: `[ALPHA LEGEND: FINANCING & MULTIFINANCE MANDATE]:
Key Metrics to evaluate: NPF (Non-Performing Financing < 2.5%), ROAA (Return on Avg Assets), ROAE, Net Interest Spread, COC (Cost of Credit), Gearing Ratio.
Mandatory Institutional Analytical Dimensions:
1. Financing Mix & Portfolio Yield:
   - Breakdown of receivables: New 4W/2W vs Used vehicles vs Heavy equipment / Industrial machinery vs Multipurpose consumer loans.
   - Effective lending rates vs collection recovery yield across tenor durations (1-4 years).
2. Funding Source Durability & Spread Management:
   - Reliance on bank joint financing (executing vs channeling), syndicated offshore loans, and domestic bond issuance coupons vs Bank Indonesia rate movements.
3. Asset Quality, Down Payment (DP) Discipline & Residual Value Risk:
   - Stringency of underwriting, average Down Payment %, and repossession/auction recovery speed on defaulted collateral.
   - Residual value exposure on battery electric vehicles (EV) financing compared to traditional ICE vehicles.`
  },

  // 5. Insurance (Asuransi)
  {
    id: 'insurance',
    keywords: [
      'asuransi', 'insurance', 'jiwa', 'underwriting', 'reasuransi', 'premi', 'klaim',
      'polis asuransi', 'life insurance', 'general insurance', 'kerugian', 'solvabilitas'
    ],
    searchQueries: [
      {
        category: 'Pendapatan Premi & Klaim',
        query: (name) => `${name} pendapatan premi bruto klaim rasio underwriting margin asuransi`
      },
      {
        category: 'Hasil Investasi & Solvabilitas RBC',
        query: (name) => `${name} hasil investasi portofolio saham obligasi rasio RBC solvabilitas modal`
      },
      {
        category: 'Saluran Distribusi & Regulasi OJK',
        query: (name) => `${name} bancassurance agen asuransi regulasi OJK permodalan minimum ekuitas`
      }
    ],
    mandate: `[ALPHA LEGEND: INSURANCE MANDATE]:
Key Metrics to evaluate: Gross Written Premium (GWP) Growth, Claim Paid Ratio (Loss Ratio), Combined Ratio (< 100%), RBC (Risk-Based Capital >= 120%), RKI (Investment Adequacy).
Mandatory Institutional Analytical Dimensions:
1. Underwriting Profitability & Technical Reserves:
   - Loss ratio and combined ratio discipline across underwriting lines (motor vehicle, property fire, health/hospitalization, credit insurance, marine cargo).
   - Adequacy of technical reserves and reinsurance retrocession security against catastrophic losses.
2. Investment Portfolio Performance:
   - Allocation of investable policyholder float across Government Bonds (SBN), corporate credit, money market, and high-dividend equities.
   - Investment yield resilience against inflation and market volatility.
3. Regulatory Compliance:
   - OJK tier-based minimum equity capital requirements and risk-based capital solvency headroom.`
  },

  // 6. Coal Mining (Batu Bara)
  {
    id: 'coal-mining',
    keywords: [
      'coal', 'batu bara', 'batubara', 'thermal coal', 'coking coal', 'metallurgical coal',
      'tambang batubara', 'stripping ratio', 'dmo', 'newcastle', 'ici', 'gar', 'tambang'
    ],
    searchQueries: [
      {
        category: 'Siklus Komoditas & Regulasi',
        query: (name) => `${name} batubara harga komoditas DMO ekspor royalti Newcastle ICI-4 ESDM`
      },
      {
        category: 'Hilirisasi & Diversifikasi',
        query: (name) => `${name} stripping ratio cadangan tambang cash cost produksi ASP FOB kalori`
      },
      {
        category: 'Transisi Hijau & Energi Baru',
        query: (name) => `${name} diversifikasi energi terbarukan aluminium smelter hilirisasi capex dividen`
      }
    ],
    mandate: `[ALPHA LEGEND: COAL MINING MANDATE]:
Key Metrics to evaluate: Cash Cost per ton (FOB), Stripping Ratio (SR), Proven & Probable Reserves, ASP (Average Selling Price), Free Cash Flow Yield.
Mandatory Institutional Analytical Dimensions:
1. Global Cost Curves & Stripping Ratio:
   - Cash cost per ton FOB placing the company on global Newcastle / ICI-4 cost curves.
   - Overburden stripping ratio (SR) and contractor cost pass-through formulas tied to diesel fuel prices.
2. Calorie Spectrum & Commercial Mine Longevity:
   - Energy density profile: Low-rank (GAR 3400-3800), Medium-rank (GAR 4200-5000), or High-rank/Metallurgical (GAR 5800+).
   - Commercial life-of-mine (LOM) at current annual production run-rates based on JORC/KCMI compliant reserve statements.
3. Regulatory Mandates & Domestic Market Obligation (DMO):
   - Fulfillment of mandatory 25% PLN DMO (Domestic Market Obligation) cap at \$70/ton for power utilities and \$90/ton for cement/fertilizer.
   - Progressive mining royalty rates and BLU (Badan Layanan Umum) coal levy mechanisms.
4. Green Diversification & Free Cash Flow Reallocation:
   - Deployment of windfall thermal coal operating cash flows into renewable energy, clean power, green industrial estates, or metal smelting.
   - Historical dividend payout consistency and net cash balance sheet position.`
  },

  // 7. Oil & Gas (Migas Hulu)
  {
    id: 'oil-gas',
    keywords: [
      'oil & gas', 'minyak bumi', 'gas alam', 'petroleum', 'upstream', 'hulu migas', 'lifting',
      'blok migas', 'psc', 'gross split', 'cost recovery', 'boepd', 'brent', 'wti', 'skk migas'
    ],
    searchQueries: [
      {
        category: 'Produksi Lifting & Harga Migas',
        query: (name) => `${name} produksi minyak gas lifting barel BOEPD target SKK Migas`
      },
      {
        category: 'Cadangan & Belanja Modal Capex',
        query: (name) => `${name} cadangan migas 2P capex pengeboran sumur eksplorasi cash cost ROE`
      },
      {
        category: 'Kontrak PSC & Harga Gas Industri',
        query: (name) => `${name} kontrak PSC perpanjangan blok migas HGBT harga gas industri pipa`
      }
    ],
    mandate: `[ALPHA LEGEND: OIL & GAS MANDATE]:
Key Metrics to evaluate: Cash Cost per barrel equivalent, BOEPD (Barrels of Oil Equivalent per Day), 2P Reserves Replacement Ratio (RRR), ROE, Net Debt to EBITDA.
Mandatory Institutional Analytical Dimensions:
1. Hydrocarbon Production Trajectory & Lifting Realization:
   - Oil vs Natural Gas split in daily production (BOEPD), natural field depletion rates, and secondary/tertiary recovery (EOR) initiatives.
   - Realized pricing against global Brent crude and domestic fixed-price gas purchase agreements (PJBG).
2. Exploration Capex & Reserve Replacement:
   - 2P (Proven & Probable) reserve replenishment, drilling success rate of exploration and development wells, and capital expenditure efficiency.
3. Fiscal Term Framework (Cost Recovery vs Gross Split):
   - Production Sharing Contract (PSC) terms, government split, cost recovery reimbursement velocity, and contract extension visibility with SKK Migas.
4. Gas Commercialization & HGBT Regulations:
   - Exposure to mandatory domestic gas policy (HGBT \$6/MMBTU for designated domestic industrial sectors) vs unconstrained export LNG pricing.`
  },

  // 8. Oil & Gas Mining Services
  {
    id: 'oil-gas-services',
    keywords: [
      'drilling', 'pengeboran', 'jasa migas', 'offshore', 'oil services', 'rig ', 'jack-up',
      'charter', 'sewa rig', 'seismic', 'marine offshore', 'vessel offshore', 'skk migas tender'
    ],
    searchQueries: [
      {
        category: 'Kontrak Pengeboran & Utilisasi Rig',
        query: (name) => `${name} kontrak pengeboran rig utilization dayrate jasa migas offshore onshore`
      },
      {
        category: 'Backlog Tender & Margin Jasa',
        query: (name) => `${name} tender eksplorasi migas backlog kontrak EBITDA margin SKK Migas`
      },
      {
        category: 'Peremajaan Armada & Utang',
        query: (name) => `${name} belanja modal kapal rig baru restrukturisasi utang DER arus kas`
      }
    ],
    mandate: `[ALPHA LEGEND: OIL & GAS SERVICES MANDATE]:
Key Metrics to evaluate: Rig / Vessel Utilization Rate (%), Average Dayrate (USD/day), Firm Contract Backlog, EBITDA Margin (> 35%), Net Debt to EBITDA.
Mandatory Institutional Analytical Dimensions:
1. Fleet Capability & Utilization Dynamics:
   - Active fleet count (Jack-up rigs, drillships, tender rigs, anchor handling tugs/AHTS, seismic vessels) and operational utilization rate.
   - Daily charter rate trends (Dayrates) benchmarked against Southeast Asian and global offshore rig cycles.
2. Backlog Longevity & Client Credit Quality:
   - Total unburned contract order book divided by annual run-rate revenue (backlog coverage duration in years).
   - Counterparty creditworthiness (Pertamina EP, BP, ExxonMobil, ENI, Medco vs speculative junior wildcatters).
3. Financial Gearing & Capex Refinancing:
   - Capital intensity of mandatory 5-year special survey dry-docking and debt service coverage ratio (DSCR).`
  },

  // 9. Nickel Mining & Smelting
  {
    id: 'nickel-mining',
    keywords: [
      'nikel', 'nickel', 'smelter nikel', 'hpal', 'rkef', 'limonit', 'saprolit', 'metals & mining',
      'metal', 'mining', 'tambang nikel', 'mhp', 'npi', 'feronikel', 'baterai ev', 'stainless steel'
    ],
    searchQueries: [
      {
        category: 'Smelter & Rantai Pasok Baterai EV',
        query: (name) => `${name} tambang nikel smelter HPAL baterai EV RKAB kuota produksi ESDM`
      },
      {
        category: 'Pasar & Regulasi Ekspor',
        query: (name) => `${name} bijih nikel saprolit limonit cadangan tambang cash cost produksi ASP`
      },
      {
        category: 'Kemitraan Global & Hilirisasi',
        query: (name) => `${name} konsorsium baterai CATL LG Tsingshan smelter energi hijau ESG`
      }
    ],
    mandate: `[ALPHA LEGEND: NICKEL MINING & SMELTING MANDATE]:
Key Metrics to evaluate: Unit Cash Cost of Sales (USD/ton Ni), Production Volume (limonite vs saprolite), Ore Reserves Grade (% Ni), ASP, EBITDA Margin.
Mandatory Institutional Analytical Dimensions:
1. Smelting Technology & Product Class Economics:
   - Class 1 Battery Chemistry: High-Pressure Acid Leach (HPAL) producing Mixed Hydroxide Precipitate (MHP), nickel sulfate, and cathode precursors.
   - Class 2 Stainless Steel: Rotary Kiln Electric Furnace (RKEF) producing Nickel Pig Iron (NPI) and Ferronickel (FeNi), evaluating vulnerability to Chinese steel market cycles.
2. Resource Concession Quality & RKAB Quota Approvals:
   - High-grade saprolite (> 1.5% Ni) vs low-grade limonite (1.0-1.3% Ni) reserves and strip ratios.
   - Regulatory security: Annual/Triennial RKAB production quotas granted by ESDM ministry and domestic ore domestic pricing index (HPM).
3. Energy Sourcing & Decarbonization Moats:
   - Captive coal power plants vs green hydro/grid power contracts, addressing international EV OEM (Europe/US) ESG compliance and carbon tariffs (CBAM).
4. Strategic Consortium Partnerships:
   - Offtake commitments with global battery giants (CATL, LG Energy Solution, POSCO, Tsingshan).`
  },

  // 10. CPO / Kelapa Sawit
  {
    id: 'cpo',
    keywords: [
      'cpo', 'sawit', 'kelapa sawit', 'palm oil', 'palma', 'plantation', 'perkebunan', 'agricultural',
      'agro', 'tandan buah segar', 'tbs', 'ffb', 'oer', 'biodiesel', 'b35', 'b40', 'b50', 'bpdpks'
    ],
    searchQueries: [
      {
        category: 'Mandat Biodiesel & Harga CPO',
        query: (name) => `${name} kelapa sawit CPO mandat biodiesel B40 B35 ekspor levy BPDPKS`
      },
      {
        category: 'Produktivitas & Tanaman',
        query: (name) => `${name} produksi tandan buah segar yield replanting OER FFB TBS profil usia`
      },
      {
        category: 'Hilirisasi & Sertifikasi Berkelanjutan',
        query: (name) => `${name} minyak goreng refinery hilirisasi margin pupuk ISPO RSPO EUDR`
      }
    ],
    mandate: `[ALPHA LEGEND: CPO & PLANTATIONS MANDATE]:
Key Metrics to evaluate: FFB Yield (ton/ha), OER (Oil Extraction Rate > 23%), Palm Age Profile (Prime 8-18 yrs vs Young vs Senile), Cash Cost per kg CPO, Planted vs Mature Area.
Mandatory Institutional Analytical Dimensions:
1. Biological Asset Productivity & Age Profile:
   - Yield curve analysis: Area of immature palms (< 4 yrs), prime producing palms (8-18 yrs), and old/senile palms (> 25 yrs) demanding replanting capex.
   - Fresh Fruit Bunch (FFB/TBS) yield per hectare and mill extraction efficiency (OER).
2. Domestic Policy Support Floor (Biodiesel B35/B40/B50 Mandates):
   - Domestic market absorption driven by government blending mandates, insulating Indonesian CPO producers from European Union Deforestation Regulation (EUDR) barriers.
   - Export levy and export tax dynamics regulated by BPDPKS.
3. Cost Structure & Climate Resilience:
   - Fertilizer cost volatility (urea, MOP/potash, DAP) representing 30-40% of cash operating costs.
   - Weather vulnerability: Rainfall patterns, El Nino droughts (causing delayed floral abortion) vs La Nina excessive rains (flooding harvesting infrastructure).
4. Downstream Integration:
   - Refining and fractionalization capacity into cooking oil, oleochemicals, and specialty fats generating stable margins.`
  },

  // 11. Poultry (Peternakan Unggas & Pakan)
  {
    id: 'poultry',
    keywords: [
      'poultry', 'unggas', 'ayam', 'pakan', 'feedmill', 'feed', 'broiler', 'day old chick',
      'doc', 'ternak', 'animal feed', 'karkas', 'culling', 'jagung', 'soybean meal', 'sbm'
    ],
    searchQueries: [
      {
        category: 'Harga DOC, Ayam Broiler & Pakan Jagung',
        query: (name) => `${name} harga bibit DOC ayam broiler pakan jagung SBM margin peternakan`
      },
      {
        category: 'Kebijakan Culling & Konsumsi Per Kapita',
        query: (name) => `${name} culling mandatori afkir dini konsumsi daging ayam per kapita Kementan`
      },
      {
        category: 'Hilirisasi Makanan Olahan',
        query: (name) => `${name} nugget sosis processed food hilirisasi ritel modern consumer`
      }
    ],
    mandate: `[ALPHA LEGEND: POULTRY & ANIMAL FEED MANDATE]:
Key Metrics to evaluate: DOC Price (Day Old Chick), Commercial Broiler Livebird Price, Feed Margin (Feed Operating Margin), Raw Material Costs (Local Corn & Imported Soybean Meal), GPM.
Mandatory Institutional Analytical Dimensions:
1. Feedmill Anchor Margin & Cost Pass-Through:
   - Feedmill division functioning as the structural profit stabilizer, absorbing fluctuations in local corn and imported soybean meal (SBM) via pricing adjustments to independent farmers.
2. Breeding & Commercial Broiler Volatility:
   - Livebird farm-gate price fluctuations relative to production cost per kg.
   - Effectiveness of Ministry of Agriculture (Kementan) mandatory culling programs (early hatching egg disposal & parent stock culling) in curbing market oversupply.
3. Downstream Processed Food Integration:
   - Expansion into consumer branded packaged meats (nuggets, sausages, ready-to-eat chicken) providing resilient B2C retail gross margins.
4. Competitive Moat:
   - Oligopolistic market structure dominated by Top-2 integrated players (CPIN, JPFA) possessing nationwide cold-chain logistics and genetics control.`
  },

  // 12. Semen (Cement)
  {
    id: 'semen',
    keywords: [
      'semen', 'cement', 'klinker', 'beton', 'ready mix', 'persemenan', 'industri semen',
      'semen curah', 'semen kantong', 'kapasitas pabrik', 'overcapacity semen'
    ],
    searchQueries: [
      {
        category: 'Permintaan Semen & Utilisasi Pabrik',
        query: (name) => `${name} penjualan semen kapasitas utilisasi pabrik ASP semen kantong curah`
      },
      {
        category: 'Pangsa Pasar & Efisiensi Energi Batubara',
        query: (name) => `${name} pangsa pasar semen infrastruktur IKN biaya energi batubara DMO`
      },
      {
        category: 'Konsolidasi Industri & Ekspor',
        query: (name) => `${name} ekspor klinker konsolidasi pasar semen perang harga EBITDA margin`
      }
    ],
    mandate: `[ALPHA LEGEND: CEMENT INDUSTRY MANDATE]:
Key Metrics to evaluate: Domestic Market Share (%), Production Capacity Utilization (%), Average Selling Price (ASP) per ton/bag, Thermal Coal Cost per ton, EBITDA Margin.
Mandatory Institutional Analytical Dimensions:
1. Industry Capacity Overhang & Price Discipline:
   - National installed capacity vs domestic consumption; operating utilization run-rates.
   - Pricing power discipline among major tier-1 players vs aggressive tier-2 private competitors to avoid debilitating price wars.
2. Sales Mix: Bag (Retail/Housing) vs Bulk (Infrastructure):
   - High-margin retail bag cement (branded consumer choice, residential renovations) vs lower-margin bulk cement (government mega-infrastructure projects, toll roads, Nusantara capital city IKN).
3. Energy Cost Pass-Through & Fuel Substitution:
   - Thermal coal accounting for 30-40% of production cost; benefit of DMO \$90/ton price cap and alternative fuel substitution (Refuse-Derived Fuel / RDF municipal waste).
4. Strategic Logistics Moat:
   - Proximity of integrated cement plants and packing terminals to primary coastal demand centers minimizing overland freight costs.`
  },

  // 13. Pulp & Paper
  {
    id: 'pulp-paper',
    keywords: [
      'pulp', 'paper', 'kertas', 'bubur kertas', 'tissue', 'kemasan karton', 'packaging',
      'industrial paper', 'wood chips', 'hutan tanaman industri', 'hti', 'ekspor pulp'
    ],
    searchQueries: [
      {
        category: 'Harga Global Pulp Kertas & Ekspor',
        query: (name) => `${name} harga global pulp kertas ekspor kapasitas pabrik tissue packaging`
      },
      {
        category: 'Utilisasi Pabrik & Beban Utang',
        query: (name) => `${name} utilisasi mesin kertas laba operasional ICR beban bunga utang USD`
      },
      {
        category: 'Pasokan Kayu HTI & Regulasi Hijau',
        query: (name) => `${name} sertifikasi kayu HTI keberlanjutan FSC PEFC e-commerce box demand`
      }
    ],
    mandate: `[ALPHA LEGEND: PULP & PAPER MANDATE]:
Key Metrics to evaluate: Factory Utilization Rate (%), Global Bleached Hardwood Kraft Pulp (BHKP) Price Index, ROIC, ICR (Interest Coverage Ratio), Net Debt to EBITDA.
Mandatory Institutional Analytical Dimensions:
1. Global Commodity Pulp Price Cycle:
   - Sensitivity of export margins to global benchmark pulp prices in primary export destinations (China, India, US).
2. Product Portfolio Diversification:
   - Commodity market pulp vs high-value-added consumer tissue vs industrial brown paper / corrugated packaging boxes benefiting from e-commerce delivery expansion.
3. Fiber Concession Self-Sufficiency:
   - Sustainable fast-growing plantation concessions (Acacia & Eucalyptus HTI) yielding rapid 5-6 year harvesting cycles, driving global low-cost quartile positioning.
4. FX Exposure & Capital Structure:
   - Natural revenue hedge (USD-denominated export contracts) against substantial USD-denominated debt and equipment capex.`
  },

  // 14. Tower Provider (Menara Telekomunikasi)
  {
    id: 'tower',
    keywords: [
      'tower', 'menara', 'telekomunikasi tower', 'tenancy', 'sewa menara', 'kolokasi',
      'fiberisasi', 'fttt', 'infrastruktur telekomunikasi', 'menara bts', 'tower leasing'
    ],
    searchQueries: [
      {
        category: 'Tenancy Ratio & Sewa Menara Telko',
        query: (name) => `${name} tenancy ratio sewa menara telekomunikasi EBITDA margin kontrak`
      },
      {
        category: 'Fiberisasi Jaringan & Leverage Utang',
        query: (name) => `${name} fiberisasi menara FTTT belanja modal capex utang net debt FCF`
      },
      {
        category: 'Konsolidasi Operator & Data Center',
        query: (name) => `${name} dampak merger telko relokasi bts data center edge computing`
      }
    ],
    mandate: `[ALPHA LEGEND: TOWER PROVIDER MANDATE]:
Key Metrics to evaluate: Tenancy Ratio (> 1.6x), Total Tower Count, Revenue per Tower, EBITDA Margin (> 80%), FCF Yield, Net Debt to EBITDA (< 4.5x).
Mandatory Institutional Analytical Dimensions:
1. Long-Term Annuity Cash Flows:
   - Sticky 10-year non-cancellable lease contracts with major telecom operators (Telkomsel, Indosat, XL Axiata) featuring inflation indexation clauses.
2. Colocation Economics (Operating Leverage):
   - Incremental EBITDA flow-through on adding 2nd and 3rd tenants to existing steel towers with near-zero additional capex.
3. Fiberization (FTTT) & Edge Compute Growth Vectors:
   - Fiber-to-the-tower network deployment supporting high-bandwidth 5G backhaul, and expansion into carrier-neutral edge data centers.
4. Debt Structure & Interest Rate Headwinds:
   - Capital intensity of acquisitions and sensitivity of debt refinancing to interest rate benchmark cycles.`
  },

  // 15. Telco Provider (Operator Seluler)
  {
    id: 'telco-provider',
    keywords: [
      'telco', 'seluler', 'telekomunikasi', 'telecommunication', 'operator seluler', 'broadband',
      'telkom', 'cellular', 'kuota data', 'spektrum frekuensi', 'bts', 'fmc', 'indihome'
    ],
    searchQueries: [
      {
        category: 'Trafik Data & ARPU',
        query: (name) => `${name} trafik data ARPU seluler internet broadband FMC perbaikan harga`
      },
      {
        category: 'Infrastruktur & Kompetisi',
        query: (name) => `${name} churn rate EBITDA margin belanja modal spektrum 5G fiber optik`
      },
      {
        category: 'Layanan B2B & AI Data Center',
        query: (name) => `${name} digital enterprise B2B cloud AI data center pendapatan non seluler`
      }
    ],
    mandate: `[ALPHA LEGEND: TELCO PROVIDER MANDATE]:
Key Metrics to evaluate: Blended ARPU (Average Revenue Per User), Data Payload Traffic (PB), Churn Rate (%), EBITDA Margin (> 45%), Capex to Revenue Ratio.
Mandatory Institutional Analytical Dimensions:
1. Data Monetization & Market Price Repair:
   - Discipline in lifting floor prices per gigabyte among top 3 oligopoly operators (Telkomsel, Indosat Ooredoo Hutchison, XL Axiata), converting surging data payload volume into sustained ARPU growth.
2. Fixed-Mobile Convergence (FMC) Synergy:
   - Bundling of fixed broadband fiber-to-the-home (FTTH) with mobile cellular subscriptions to slash user churn and elevate customer lifetime value (LTV).
3. Capital Intensity & Spectrum Optimization:
   - Annual capex efficiency in expanding 4G capacity and selective 5G rollouts; spectrum holding depth across low, mid, and high bands.
4. B2B Enterprise & AI Data Center Engines:
   - Diversification into cloud infrastructure, cybersecurity, sovereign AI compute hubs, and enterprise digital solutions.`
  },

  // 16. Jalan Tol (Toll Roads)
  {
    id: 'jalan-tol',
    keywords: [
      'jalan tol', 'toll', 'tarif tol', 'konsesi tol', 'lalu lintas harian', 'transaksi tol',
      'bpjt', 'jalan bebas hambatan', 'trans jawa', 'trans sumatera', 'rest area'
    ],
    searchQueries: [
      {
        category: 'Volume Lalu Lintas Transaksi Tol',
        query: (name) => `${name} volume transaksi lalu lintas kendaraan LHR jalan tol pendapatan tol`
      },
      {
        category: 'Penyesuaian Tarif & Beban Bunga Sindikasi',
        query: (name) => `${name} penyesuaian tarif tol berkala BPJT konsesi utang sindikasi bunga ICR`
      },
      {
        category: 'Divestasi Ruas Tol & Recycling Asset',
        query: (name) => `${name} divestasi ruas jalan tol asset recycling INA sovereign wealth fund`
      }
    ],
    mandate: `[ALPHA LEGEND: TOLL ROAD OPERATOR MANDATE]:
Key Metrics to evaluate: Concession Length (operational km), Average Daily Traffic (LHR), Toll Revenue per km, ICR (Interest Coverage Ratio), Debt to Equity (DER).
Mandatory Institutional Analytical Dimensions:
1. Traffic Volume Trends (LHR) & Economic Corridors:
   - Daily vehicle transaction volumes across mature urban commuter arteries (Jabodetabek) vs intercity logistics expressways (Trans Java, Trans Sumatra).
2. Regulatory Biennial Tariff Indexation:
   - Enforcement of statutory 2-year tariff adjustments indexed to regional inflation overseen by BPJT.
3. Balance Sheet Deleveraging & Asset Recycling:
   - Divestment of mature cash-generative expressway sections to sovereign wealth funds (INA) or strategic global infrastructure investors to fund new project construction without diluting leverage.`
  },

  // 17. Shipping & Marine Logistics (Pelayaran)
  {
    id: 'shipping',
    keywords: [
      'shipping', 'pelayaran', 'kapal', 'kargo laut', 'freight', 'vessel', 'marine transportation',
      'tug & barge', 'barge', 'tongkang', 'tanker', 'dry bulk', 'peti kemas kapal', 'asas cabotage'
    ],
    searchQueries: [
      {
        category: 'Tarif Sewa Kapal Freight Rate & Utilisasi',
        query: (name) => `${name} tarif sewa kargo kapal freight rate utilisasi armada Baltic Dry Index`
      },
      {
        category: 'Umur Armada & Kontrak Jangka Panjang',
        query: (name) => `${name} umur kapal fleet age rute pelayaran muatan kontrak COA batubara CPO`
      },
      {
        category: 'Biaya Bahan Bakar & Efisiensi Armada',
        query: (name) => `${name} biaya bahan bakar bunker bbm kapal belanja modal capex kapal baru`
      }
    ],
    mandate: `[ALPHA LEGEND: SHIPPING & MARINE LOGISTICS MANDATE]:
Key Metrics to evaluate: Freight Rate Index, Vessel Utilization Rate (%), Average Fleet Age, Contract of Affreightment (COA) Ratio, Debt to Equity Ratio (DER).
Mandatory Institutional Analytical Dimensions:
1. Fleet Segment Exposure & Charter Rates:
   - Exposure to Dry Bulk (coal, nickel ore, clinker) vs Liquid Tankers (crude, CPO, chemicals, LNG) vs Container Box lines.
   - Spot charter rates vs multi-year long-term Contracts of Affreightment (COA) with prime industrial miners/offtakers.
2. Cabotage Principle Regulatory Shield:
   - Domestic market protection under Indonesian Cabotage law (restricting domestic marine routes exclusively to Indonesian-flagged vessels).
3. Fuel Bunker Costs & Fleet Modernization:
   - Sensitivity to marine fuel bunker prices (MFO/diesel) and contractual bunker adjustment factor (BAF) cost pass-through mechanisms.`
  },

  // 18. Shipping Port (Pelabuhan)
  {
    id: 'shipping-port',
    keywords: [
      'pelabuhan', 'seaport', 'dermaga', 'bongkar muat', 'kontainer terminal', 'terminal peti kemas',
      'peti kemas', 'arus kargo', 'teus', 'quay crane', 'operator pelabuhan', 'jasa kepelabuhanan'
    ],
    searchQueries: [
      {
        category: 'Arus Bongkar Muat Peti Kemas TEUs',
        query: (name) => `${name} bongkar muat arus peti kemas pelabuhan TEUs arus kargo ekspor impor`
      },
      {
        category: 'Kapasitas Dermaga & Konektivitas Logistik',
        query: (name) => `${name} kapasitas dermaga lapangan penumpukan yard occupancy dwell time`
      },
      {
        category: 'Tarif Pelabuhan & Konsesi Pemerintah',
        query: (name) => `${name} tarif jasa kepelabuhanan konsesi Kemenhub EBITDA margin dividen`
      }
    ],
    mandate: `[ALPHA LEGEND: SHIPPING PORT MANDATE]:
Key Metrics to evaluate: Container Throughput (TEUs), Yard Occupancy Rate (YOR %), Berth Occupancy Rate (BOR %), Average Dwell Time (days), EBITDA Margin.
Mandatory Institutional Analytical Dimensions:
1. Natural Geographic Monopoly:
   - Strategic coastal positioning near high-density industrial export-import processing zones.
2. Throughput Growth & Utilization:
   - Domestic transshipment vs international direct calls; berth and yard capacity headroom before requiring heavy capex dredging.
3. Regulated Tariff Setting & Margin Durability:
   - Stevedoring and container handling charges approved by Ministry of Transportation (Kemenhub), yielding stable utility-like operational cash flows.`
  },

  // 19. Courier & Logistics
  {
    id: 'courier-logistics',
    keywords: [
      'kurir', 'courier', 'ekspedisi', 'logistik darat', 'pengiriman paket', 'cargo',
      'last mile', 'pergudangan', 'warehousing', 'freight forwarding', 'e-commerce delivery'
    ],
    searchQueries: [
      {
        category: 'Volume Paket Ekspedisi E-Commerce',
        query: (name) => `${name} volume pengiriman paket ekspedisi logistik e-commerce marketplace`
      },
      {
        category: 'Pendapatan per Paket & Efisiensi Armada',
        query: (name) => `${name} pendapatan per paket yield harga ongkir margin operasi armada OPM`
      },
      {
        category: 'Otomasi Hub & Logistik Rantai Dingin',
        query: (name) => `${name} otomatisasi sorting hub pergudangan rantai dingin cold chain capex`
      }
    ],
    mandate: `[ALPHA LEGEND: COURIER & LOGISTICS MANDATE]:
Key Metrics to evaluate: Daily Shipment Volume (parcels/day), Revenue per Parcel (Yield), Operating Profit Margin (OPM), Cash Conversion Cycle (CCC).
Mandatory Institutional Analytical Dimensions:
1. E-Commerce Platform Volume & Market Price War:
   - Parcel volume trends tied to TikTok Shop, Shopee, Tokopedia, and Lazada; price-per-kg stability vs hyper-competitive tariff discounting.
2. Last-Mile Delivery Network & Fuel Efficiency:
   - Direct-operated drop points vs franchise agent networks, fleet electrification (EV courier vans/bikes) reducing variable fuel costs.
3. Automated Sorting Infrastructure:
   - Investment in automated sorting hubs accelerating parcel processing throughput and lowering labor overhead.`
  },

  // 20. Car Rental (Sewa Kendaraan)
  {
    id: 'car-rental',
    keywords: [
      'rental', 'sewa mobil', 'sewa kendaraan', 'armada mobil', 'car rental',
      'rental korporasi', 'sewa jangka panjang', 'lelang mobil bekas', 'fleet management'
    ],
    searchQueries: [
      {
        category: 'Utilisasi Armada Rental Korporasi',
        query: (name) => `${name} utilisasi armada sewa mobil rental korporasi kontrak jangka panjang`
      },
      {
        category: 'Margin Penjualan Mobil Bekas & Biaya Bunga',
        query: (name) => `${name} penjualan mobil bekas armada lelang keuntungan sekunder margin ICR laba`
      },
      {
        category: 'Pengadaan Kendaraan & Logistik Darat',
        query: (name) => `${name} belanja modal beli mobil armada baru sewa logistik truk komersial`
      }
    ],
    mandate: `[ALPHA LEGEND: CAR RENTAL MANDATE]:
Key Metrics to evaluate: Total Fleet Size, Vehicle Fleet Utilization Rate (> 85%), Gain on Sale of Used Vehicles, Interest Coverage Ratio (ICR).
Mandatory Institutional Analytical Dimensions:
1. Corporate Long-Term Lease Stability:
   - High proportion of 3-5 year full-maintenance operating leases with blue-chip corporate and government clients, ensuring immune recurring cash flow.
2. Secondary Used Car Auction Margins:
   - Profit generated upon de-fleeting and auctioning vehicles after 4-5 years of lease service at prices exceeding depreciated book values.
3. Fleet Financing Costs:
   - Cost of vehicle acquisition financing from parent group / banks, and managing residual value depreciation risks.`
  },

  // 21. Taxi Services
  {
    id: 'taxi-services',
    keywords: [
      'taksi', 'taxi', 'armada taksi', 'taksi reguler', 'taksi eksekutif', 'silver bird',
      'blue bird', 'transportasi darat penumpang', 'ride hailing', 'taksi bandara'
    ],
    searchQueries: [
      {
        category: 'Pendapatan per Taksi ARPV & Okupansi',
        query: (name) => `${name} pendapatan per armada taksi ARPV okupansi penumpang tarif km`
      },
      {
        category: 'Armada Mobil Listrik EV & Taksi Online',
        query: (name) => `${name} armada mobil listrik EV kolaborasi Gojek Grab aplikasi digital NPM`
      },
      {
        category: 'Akses Bandara & Kepercayaan Konsumen',
        query: (name) => `${name} konsesi bandara stasiun loyalitas pelanggan corporate voucher`
      }
    ],
    mandate: `[ALPHA LEGEND: TAXI SERVICES MANDATE]:
Key Metrics to evaluate: ARPV (Average Revenue per Vehicle/Day), Fleet Utilization Rate, Net Profit Margin (NPM), Net Promoter Score (NPS).
Mandatory Institutional Analytical Dimensions:
1. Utilization & Driver Partnership Dynamics:
   - Daily farebox revenue per operating vehicle (ARPV) and driver retention/revenue sharing models.
2. Premium Niche & Airport Concessions:
   - Exclusive queue privileges at international airports, 5-star hotels, and enterprise corporate travel accounts providing defensive volume moats.
3. Fleet Electrification (EV) Operating Savings:
   - Transition to EV fleets delivering substantial daily fuel and maintenance opex savings compared to internal combustion taxis.`
  },

  // 22. Airlines (Penerbangan)
  {
    id: 'airlines',
    keywords: [
      'airline', 'penerbangan', 'maskapai', 'pesawat', 'aviation', 'penumpang pesawat',
      'tiket pesawat', 'seat load factor', 'avtur', 'rute penerbangan', 'sewa pesawat'
    ],
    searchQueries: [
      {
        category: 'Seat Load Factor & Keterisian Penumpang',
        query: (name) => `${name} keterisian penumpang pesawat seat load factor SLF tarif batas atas TBA`
      },
      {
        category: 'Biaya Bahan Bakar Avtur & Rute Domestik',
        query: (name) => `${name} biaya avtur kurs dollar rute penerbangan kapasitas kursi ASK restrukturisasi`
      },
      {
        category: 'Pendapatan Kargo & Ancillary Revenue',
        query: (name) => `${name} pendapatan kargo bagasi berbayar ancillary revenue umrah haji`
      }
    ],
    mandate: `[ALPHA LEGEND: AIRLINES MANDATE]:
Key Metrics to evaluate: Seat Load Factor (SLF %), ASK (Available Seat Kilometer), RPK (Revenue Passenger Kilometer), CASK (Cost per ASK), Fuel Cost to Revenue Ratio (> 35%).
Mandatory Institutional Analytical Dimensions:
1. Route Profitability & Passenger Yield:
   - Domestic monopoly/duopoly trunk routes vs subsidized pioneer routes; pricing realization close to statutory Fare Ceiling (TBA).
2. Cost Rigidity & Jet Fuel (Avtur) Exposure:
   - Jet fuel and USD-denominated aircraft operating leases representing over 60% of total operational costs.
3. Ancillary Revenue & High-Yield Charters:
   - Baggage fees, seat selection, cargo freight, and seasonal Hajj/Umrah charter flights boosting net operating margins.`
  },

  // 23. Rumah Sakit (Hospitals)
  {
    id: 'rumah-sakit',
    keywords: [
      'rumah sakit', 'hospital', 'bed occupancy', 'rawat inap', 'pasien', 'healthcare provider',
      'healthcare', 'karyasehat', 'medika', 'tempat tidur rs', 'bpjs kesehatan', 'dokter spesialis'
    ],
    searchQueries: [
      {
        category: 'Tingkat Keterisian Tempat Tidur BOR',
        query: (name) => `${name} keterisian tempat tidur BOR rumah sakit pasien rawat inap jalan`
      },
      {
        category: 'Ekspansi RS Baru & Bauran Pasien BPJS/Swasta',
        query: (name) => `${name} pembukaan cabang RS baru pendapatan per pasien rawat BPJS asuransi swasta`
      },
      {
        category: 'Center of Excellence & Margin EBITDA',
        query: (name) => `${name} center of excellence spesialis jantung onkologi EBITDA margin ROIC`
      }
    ],
    mandate: `[ALPHA LEGEND: HOSPITAL OPERATOR MANDATE]:
Key Metrics to evaluate: BOR (Bed Occupancy Ratio), 60-75% sweet spot, Operational Bed Count, Average Length of Stay (ALOS), Inpatient / Outpatient Revenue per Visit, EBITDA Margin.
Mandatory Institutional Analytical Dimensions:
1. Patient Mix Economics:
   - Private Commercial Insurance / Out-of-Pocket self-pay patients (high-margin, premium tariffs) vs BPJS Kesehatan patients (regulated INA-CBGs tariff schedule requiring high volume throughput and strict clinical pathways).
2. Maturation Curve of Green-field Hospitals:
   - Time-to-breakeven for newly opened hospitals (typically 12-18 months to reach positive EBITDA) and ROIC progression as operational beds ramp up.
3. Centers of Excellence (CoE) & Physician Retention:
   - High-barrier specialties (cardiology, oncology, neurology, orthopedics) that drive superior case-mix index and international medical repatriation retention.`
  },

  // 24. Healthcare Diagnostic Lab
  {
    id: 'healthcare-lab',
    keywords: [
      'laboratorium', 'diagnostic', 'lab klinik', 'tes lab', 'pemeriksaan darah',
      'tes diagnostik', 'reagen', 'medical check up', 'mcu', 'patologi klinik'
    ],
    searchQueries: [
      {
        category: 'Volume Tes Lab & Kunjungan Pasien',
        query: (name) => `${name} jumlah tes laboratorium klinik kunjungan pasien lab tes darah MCU`
      },
      {
        category: 'Ekspansi Gerai & Margin Reagen',
        query: (name) => `${name} ekspansi outlet lab pendapatan per cabang diagnosis margin kotor reagen`
      },
      {
        category: 'Rujukan Dokter & Kemitraan Digital',
        query: (name) => `${name} rujukan dokter rumah sakit tes genomik digital telemedicine`
      }
    ],
    mandate: `[ALPHA LEGEND: DIAGNOSTIC LAB MANDATE]:
Key Metrics to evaluate: Total Test Volume, Revenue per Test, Routine vs Specialized Test Mix, Number of Clinical Outlets, GPM.
Mandatory Institutional Analytical Dimensions:
1. Test Mix Evolution:
   - Routine wellness tests (cholesterol, blood glucose, liver function) vs specialized high-margin diagnostic testing (molecular diagnostics, genomic profiling, oncology markers).
2. Doctor Referral Ecosystem & Brand Trust:
   - Referral fee dynamics with medical doctors and corporate occupational medical checkup (MCU) contract renewals.
3. Reagent Procurement Scale:
   - Bulk reagent purchasing agreements with global medical equipment suppliers keeping gross profit margins high.`
  },

  // 25. Farmasi (Pharmaceuticals)
  {
    id: 'farmasi',
    keywords: [
      'farmasi', 'pharma', 'obat', 'resep', 'otc', 'jamu', 'herbal', 'bahan baku obat',
      'api farmasi', 'obat generik', 'bpjs obat', 'suplemen kesehatan', 'vitamin'
    ],
    searchQueries: [
      {
        category: 'Penjualan Obat Resep Ethical & OTC',
        query: (name) => `${name} penjualan obat resep ethical OTC bahan baku farmasi margin obat generik`
      },
      {
        category: 'Ketergantungan Bahan Baku Impor API & Margin',
        query: (name) => `${name} bahan baku impor API kurs dollar piutang RS apotek inventori hari`
      },
      {
        category: 'Tender BPJS & Ekspor Obat Herbal',
        query: (name) => `${name} tender e-katalog BPJS suplemen herbal jamu ekspor farmasi`
      }
    ],
    mandate: `[ALPHA LEGEND: PHARMACEUTICALS MANDATE]:
Key Metrics to evaluate: Ethical (Prescription) vs OTC Revenue Split, Gross Profit Margin (GPM), Active Pharmaceutical Ingredient (API) Import Ratio, Receivable Days.
Mandatory Institutional Analytical Dimensions:
1. Product Portfolio Spectrum:
   - Prescription Ethical (unbranded generic vs branded generic) subject to government e-Katalog BPJS price caps vs high-margin Over-the-Counter (OTC) consumer health brands with strong household pricing power.
2. Raw Material Import Exposure (FX Sensitivity):
   - Over 85% of Active Pharmaceutical Ingredients (API) imported from China/India, creating direct vulnerability to USD/IDR currency depreciation.
3. Distribution Reach:
   - In-house pharmaceutical distribution channels servicing thousands of pharmacies, clinics, and hospitals nationwide.`
  },

  // 26. Ritel (Retail Modern Consumer)
  {
    id: 'ritel',
    keywords: [
      'ritel', 'retail', 'supermarket', 'minimarket', 'department store', 'gerai toko',
      'food & staples retailing', 'retailing', 'alfamart', 'indomaret', 'sssg', 'penjualan toko'
    ],
    searchQueries: [
      {
        category: 'Pertumbuhan Gerai & SSSG',
        query: (name) => `${name} pertumbuhan penjualan gerai yang sama SSSG ritel minimarket supermarket`
      },
      {
        category: 'Perputaran Persediaan & Arus Kas',
        query: (name) => `${name} perputaran persediaan barang ITO cash conversion cycle modal kerja`
      },
      {
        category: 'Ekspansi Toko & Private Label',
        query: (name) => `${name} pembukaan gerai baru luar jawa produk private label fee based income`
      }
    ],
    mandate: `[ALPHA LEGEND: RETAIL MANDATE]:
Key Metrics to evaluate: SSSG (Same-Store Sales Growth), Net New Store Additions, Sales per Square Meter, Inventory Turnover (ITO), Cash Conversion Cycle (CCC).
Mandatory Institutional Analytical Dimensions:
1. Same-Store Sales Growth (SSSG) & Foot Traffic:
   - Core organic growth driven by basket size expansion vs customer foot traffic, benchmarked against consumer disposable income and regional inflation.
2. Store Expansion & Logistics Density:
   - Annual net store opening velocity, penetration into second/third-tier cities outside Java, and warehouse distribution center proximity.
3. Working Capital Power (Negative Working Capital Moat):
   - Ability to generate negative working capital by collecting instant cash from shoppers while negotiating 60-90 day payment terms with FMCG suppliers.
4. Private Label & Fee-Based Franchise Income:
   - High-margin private-label merchandise, slotting allowances, and third-party bill payment/financial service commission fees.`
  },

  // 27. Restaurant (F&B Restoran)
  {
    id: 'restaurant',
    keywords: [
      'restaurant', 'restoran', 'kafe', 'fast food', 'kuliner', 'f&b ritel', 'qsr',
      'gerai makan', 'waralaba', 'franchise resto', 'penjualan makanan', 'dine in'
    ],
    searchQueries: [
      {
        category: 'Pertumbuhan Gerai Baru & SSSG Restoran',
        query: (name) => `${name} pembukaan gerai restoran SSSG omzet makanan minuman dine-in takeaway`
      },
      {
        category: 'Volatilitas Bahan Baku Pangan & Delivery',
        query: (name) => `${name} perputaran bahan makanan ITO margin kotor restoran komisi delivery ojol`
      },
      {
        category: 'Waralaba & Inovasi Menu',
        query: (name) => `${name} master franchise royalti menu baru daya beli konsumen F&B`
      }
    ],
    mandate: `[ALPHA LEGEND: RESTAURANT & FOOD SERVICE MANDATE]:
Key Metrics to evaluate: SSSG (Same-Store Sales Growth), Average Ticket Size (Per-Diner Spend), Net Store Count, GPM, Raw Food Ingredient Inflation Pass-Through.
Mandatory Institutional Analytical Dimensions:
1. Quick Service Restaurant (QSR) Unit Economics:
   - Dine-in vs Takeaway vs Online Delivery (GrabFood, GoFood, ShopeeFood) commission margin erosion.
2. Ingredient Sourcing & Margin Protection:
   - Volatility in key raw food inputs (poultry, cooking oil, flour, dairy, beef) and ability to implement incremental menu price hikes without driving traffic away.
3. Master Franchise Terms & Royalty Commitments:
   - Franchise fees and annual royalties paid to global brand licensors vs corporate-owned brand agility.`
  },

  // 28. FMCG (Fast-Moving Consumer Goods)
  {
    id: 'fmcg',
    keywords: [
      'fmcg', 'consumer goods', 'makanan kemasan', 'minuman kemasan', 'sabun', 'personal care',
      'snack', 'food & beverage', 'biskuit', 'mie instan', 'deterjen', 'perawatan tubuh'
    ],
    searchQueries: [
      {
        category: 'Daya Beli & Inovasi Produk',
        query: (name) => `${name} penjualan barang konsumen daya beli masyarakat inflasi bahan baku margin`
      },
      {
        category: 'Distribusi & Pangsa Pasar',
        query: (name) => `${name} perputaran produk ITO margin kotor GPM pangsa pasar pasar tradisional warung`
      },
      {
        category: 'Strategi Harga & Belanja Iklan',
        query: (name) => `${name} penyesuaian harga jual ASP belanja iklan promosi A&P laba bersih`
      }
    ],
    mandate: `[ALPHA LEGEND: FMCG MANDATE]:
Key Metrics to evaluate: Volume Growth (%), Gross Profit Margin (GPM), Advertising & Promotion to Sales (A&P %), ROIC, Market Share in Flagship Categories.
Mandatory Institutional Analytical Dimensions:
1. Pricing Power & Input Cost Pass-Through:
   - Ability to defend gross margins against raw material commodity shocks (CPO, wheat, packaging resin, sugar, skim milk) via pack-size re-engineering (shrinkflation) and direct price increases.
2. Traditional Trade (GT) Distribution Hegemony:
   - Direct distribution depth reaching millions of neighborhood warungs and mom-and-pop shops, creating massive competitive moats against new entrants.
3. Brand Equity & Market Share Defense:
   - Consumer mind-share leadership in staple categories preventing consumer down-trading during inflationary periods.`
  },

  // 29. Properti (Real Estate Residential & Commercial)
  {
    id: 'properti',
    keywords: [
      'properti', 'property', 'perumahan', 'township', 'apartemen', 'real estate',
      'marketing sales', 'pra penjualan', 'land bank', 'cadangan lahan', 'kpr', 'diskon nav'
    ],
    searchQueries: [
      {
        category: 'Pasar Properti & Suku Bunga',
        query: (name) => `${name} pra penjualan marketing sales properti KPR suku bunga BI Rate insentif PPN`
      },
      {
        category: 'Cadangan Lahan Landbank & Diskon NAV',
        query: (name) => `${name} sisa cadangan lahan land bank utang DER NAV diskon township kota mandiri`
      },
      {
        category: 'Pendapatan Berulang Mall & Perhotelan',
        query: (name) => `${name} recurring income pendapatan berulang sewa mall pusat perbelanjaan hotel`
      }
    ],
    mandate: `[ALPHA LEGEND: RESIDENTIAL REAL ESTATE MANDATE]:
Key Metrics to evaluate: Marketing Sales (Pre-sales Achieved vs Target), Remaining Land Bank (Hectares), Discount to RNAV (Revalued Net Asset Value), Recurring Income Ratio, Net Debt to Equity.
Mandatory Institutional Analytical Dimensions:
1. Presales Momentum & Product Segment Fit:
   - Marketing sales performance in landed residential homes (entry-level / millennial housing below Rp 2B) vs high-rise condominiums (oversupplied).
   - Sensitivity to Bank Indonesia mortgage benchmark rates (KPR) and government VAT subsidies (PPN DTP).
2. Historical Land Bank Acquisition Cost Moat:
   - Scale and historical acquisition cost base of mega-township landbanks (e.g. BSD City, Serpong, Cikarang) generating 50-60% gross development margins.
3. Recurring Income Cushion:
   - Percentage of revenue originating from commercial retail shopping malls, office towers, and hotels mitigating the lumpiness of residential handover milestones.`
  },

  // 30. Industrial Estate (Kawasan Industri)
  {
    id: 'industrial-estate',
    keywords: [
      'kawasan industri', 'industrial estate', 'lahan industri', 'pabrik', 'fdi',
      'investasi asing', 'penjualan lahan industri', 'data center lahan', 'ev factory lahan'
    ],
    searchQueries: [
      {
        category: 'Penjualan Lahan Industri & Masuknya FDI',
        query: (name) => `${name} penjualan lahan kawasan industri marketing sales FDI investasi asing pabrik`
      },
      {
        category: 'Pendapatan Berulang Utilitas Air & Listrik',
        query: (name) => `${name} pendapatan berulang utilitas air listrik sewa tenant kawasan industri`
      },
      {
        category: 'Konektivitas Pelabuhan & Klaster Data Center',
        query: (name) => `${name} akses pelabuhan jalan tol lahan data center baterai mobil listrik`
      }
    ],
    mandate: `[ALPHA LEGEND: INDUSTRIAL ESTATE MANDATE]:
Key Metrics to evaluate: Industrial Land Marketing Sales (Hectares sold & ASP/sqm), Land Bank Available, Recurring Income Ratio (% of total revenue), DER.
Mandatory Institutional Analytical Dimensions:
1. Foreign Direct Investment (FDI) Inflows:
   - Land purchase demand driven by multinational manufacturers relocating production to Indonesia (automotive assemblers, electronics, chemicals, solar panels).
2. Emerging Secular Growth Vectors:
   - High-value land parcel sales to hyperscale cloud data center operators and EV battery manufacturing consortiums requiring immense power infrastructure.
3. High-Margin Recurring Utility Moat:
   - Proprietary concessions to provide clean water, treated wastewater, electricity distribution, and estate management fees providing steady recurring operational cash flows.`
  },

  // 31. Konstruksi (Construction Contractor)
  {
    id: 'konstruksi',
    keywords: [
      'konstruksi', 'kontraktor', 'bumn karya', 'infrastruktur sipil', 'proyek gedung',
      'construction', 'tender proyek', 'order book', 'kontrak baru', 'burn rate proyek'
    ],
    searchQueries: [
      {
        category: 'Nilai Kontrak Baru & Burn Rate Order Book',
        query: (name) => `${name} nilai kontrak baru order book tender proyek konstruksi IKN infrastruktur`
      },
      {
        category: 'Kualitas Arus Kas OCF & Pembayaran Termin',
        query: (name) => `${name} arus kas operasional OCF pembayaran termin piutang proyek utang obligasi DER`
      },
      {
        category: 'Restrukturisasi Utang & Penyehatan Keuangan',
        query: (name) => `${name} restrukturisasi utang PKPU BUMN Karya penjaminan pemerintah modal kerja`
      }
    ],
    mandate: `[ALPHA LEGEND: CONSTRUCTION CONTRACTOR MANDATE]:
Key Metrics to evaluate: New Contract Wins (NKB), Total Order Book Backlog, Project Burn Rate (%), Operating Cash Flow (OCF), Net Debt to Equity (DER).
Mandatory Institutional Analytical Dimensions:
1. Cash Flow Reality vs Paper Profits:
   - Critical differentiation between accounting revenue recognition (percentage of completion) and actual Operating Cash Flow (OCF) collections.
   - Age of unbilled receivables and work-in-progress inventories.
2. Order Book Quality (Client Counterparty Risk):
   - Government State Budget (APBN) contracts vs cash-backed private developer contracts vs high-leverage state-assigned turnkey mega-projects.
3. Debt Overhang & Working Capital Turnaround:
   - Short-term banking debt servicing, vendor trade payables turnaround, and debt restructuring progress.`
  },

  // 32. EBT / Clean Energy (Energi Terbarukan)
  {
    id: 'ebt',
    keywords: [
      'ebt', 'energi terbarukan', 'geothermal', 'panas bumi', 'solar', 'plts', 'hydro',
      'plta', 'wind', 'clean energy', 'transisi energi', 'ppa pln', 'carbon credit', 'rupptl'
    ],
    searchQueries: [
      {
        category: 'Kapasitas Terpasang MW & Produksi Listrik GWh',
        query: (name) => `${name} kapasitas terpasang pembangkit EBT MW produksi listrik GWh geothermal hydro`
      },
      {
        category: 'Kontrak PPA PLN & Tarif Feed-in',
        query: (name) => `${name} kontrak PPA PLN margin EBITDA belanja modal per MW tarif listrik`
      },
      {
        category: 'Ekspansi Kapasitas & Sertifikasi Karbon',
        query: (name) => `${name} rencana ekspansi MW pengeboran sumur panas bumi bursa karbon IDXCarbon`
      }
    ],
    mandate: `[ALPHA LEGEND: CLEAN & RENEWABLE ENERGY (EBT) MANDATE]:
Key Metrics to evaluate: Installed Capacity (MW), Net Electricity Generation Output (GWh), Capacity Factor (%), EBITDA Margin (> 75%), Capex per MW.
Mandatory Institutional Analytical Dimensions:
1. Long-Term Power Purchase Agreements (PPA):
   - Take-or-pay 30-year sovereign PPA contracts with state utility PLN containing US-Dollar benchmarked tariff guarantees.
2. Resource Proven Depletion & Enthalpy Risk:
   - Geothermal steam field pressure decline rates, exploration drilling success rates, and hydrological flow reliability for hydro assets.
3. Grid Interconnection & RUPTL Priority:
   - Inclusion in PLN's green RUPTL supply plan, transmission line availability, and carbon credit monetization via domestic/international registries.`
  },

  // 33. Utilities (Utilitas Publik)
  {
    id: 'utilities',
    keywords: [
      'utilitas', 'utility', 'gas distributor', 'distribusi air', 'transmisi listrik',
      'pipa gas', 'niaga gas', 'air bersih', 'pam', 'infrastruktur utilitas'
    ],
    searchQueries: [
      {
        category: 'Volume Distribusi Gas Industri & Pelanggan',
        query: (name) => `${name} volume distribusi transmisi gas industri pelanggan utilitas BBTUD`
      },
      {
        category: 'Availability Factor Jaringan & Margin Regulated',
        query: (name) => `${name} ketersediaan pasokan availability factor arus kas FCF margin niaga gas`
      },
      {
        category: 'Regulasi HGBT & Jaringan Pipa Baru',
        query: (name) => `${name} regulasi harga gas HGBT ESDM jaringan pipa gas bumi jargas rumah tangga`
      }
    ],
    mandate: `[ALPHA LEGEND: UTILITIES MANDATE]:
Key Metrics to evaluate: Volume of Gas Distributed/Transmitted (BBTUD), Network Availability Factor (%), Regulated Distribution Spread ($/MMBTU), FCF Yield.
Mandatory Institutional Analytical Dimensions:
1. Volume Throughput & Industrial Demand:
   - Volume off-take from anchor industrial consumers (fertilizer, chemical, ceramic, glass manufacturers) and power plants.
2. Regulatory Tariff Environment & Policy Spread:
   - Impact of HGBT price caps ($6/MMBTU) on distribution spreads and government compensation mechanisms.
3. High Pipeline Barrier to Entry & Infrastructure Monopoly:
   - Massive capital moat of existing underground pipeline networks preventing direct competitive duplication.`
  },

  // 34. Perhotelan (Hotels & Hospitality)
  {
    id: 'perhotelan',
    keywords: [
      'hotel', 'perhotelan', 'resort', 'hospitality', 'kamar hotel', 'okupansi hotel',
      'revpar', 'adr hotel', 'wisatawan', 'mice', 'banquet', 'pariwisata'
    ],
    searchQueries: [
      {
        category: 'Tingkat Okupansi Hotel & RevPAR Wisata',
        query: (name) => `${name} tingkat keterisian kamar hotel okupansi RevPAR wisata turis asing domestik`
      },
      {
        category: 'MICE vs Wisatawan & Bauran Pendapatan F&B',
        query: (name) => `${name} pendapatan kamar f&b banquet meeting MICE ulasan rating tamu perhotelan`
      },
      {
        category: 'Ekspansi Properti Hotel & Biaya Operasional',
        query: (name) => `${name} penambahan kamar hotel baru belanja modal efisiensi energi EBITDA margin`
      }
    ],
    mandate: `[ALPHA LEGEND: HOTELS & HOSPITALITY MANDATE]:
Key Metrics to evaluate: Occupancy Rate (%), ADR (Average Daily Rate), RevPAR (Revenue per Available Room), Food & Beverage (F&B) Revenue Contribution, EBITDA Margin.
Mandatory Institutional Analytical Dimensions:
1. RevPAR Dynamics & Pricing Elasticity:
   - Balancing Average Daily Rate (ADR) increases against room occupancy percentage across peak holiday seasons and corporate business cycles.
2. Business Mix: Leisure vs Corporate MICE:
   - Exposure to leisure resort destinations (Bali, Yogyakarta) vs corporate/government MICE (Meetings, Incentives, Conferences, Exhibitions in Jakarta, Surabaya).
3. Operating Leverage of Fixed Asset Base:
   - High fixed cost base (staffing, utilities, property depreciation) translating small RevPAR gains into massive percentage improvements in bottom-line EBITDA.`
  },

  // 35. Media & Broadcasting
  {
    id: 'media',
    keywords: [
      'media', 'televisi', 'broadcasting', 'ott', 'iklan digital', 'streaming',
      'fta', 'rating tv', 'audience share', 'konten video', 'belanja iklan', 'ad spending'
    ],
    searchQueries: [
      {
        category: 'Audience Share Prime Time & Iklan TV',
        query: (name) => `${name} pangsa pemirsa audience share prime time sinetron iklan TV belanja iklan`
      },
      {
        category: 'Pelanggan Streaming OTT & Iklan Digital',
        query: (name) => `${name} pelanggan streaming OTT Vidio Vision pendapatan iklan digital OCF`
      },
      {
        category: 'Produksi Konten IP & Margin Laba',
        query: (name) => `${name} rumah produksi film serial konten orisinal hak siar olahraga EBITDA`
      }
    ],
    mandate: `[ALPHA LEGEND: MEDIA & ENTERTAINMENT MANDATE]:
Key Metrics to evaluate: Prime-Time Audience Share (%), Total TV Ad Spending Share, Paying OTT Streaming Subscribers, Digital Revenue Contribution, Free Cash Flow.
Mandatory Institutional Analytical Dimensions:
1. Traditional Free-to-Air (FTA) Advertising Hegemony:
   - Dominance in prime-time drama series (sinetron) and major live sports broadcasting rights driving national television ad spending share.
2. Digital Transition to Over-the-Top (OTT) Platforms:
   - Growth in active monthly paying OTT subscribers (e.g. Vidio, Vision+) and digital advertising revenue counterbalancing secular declines in linear broadcast viewing.
3. Content Intellectual Property (IP) Library:
   - In-house production studios and extensive back-catalog of drama/film IP amortizing production costs across multi-channel distribution.`
  }
];

/**
 * Matches an emiten against the 35 Alpha Legend sectors using:
 * 1. Exact subSector ID/slug match (e.g. 'automotive-parts', 'poultry', 'cpo')
 * 2. Broadened semantic keyword taxonomy on `${sector} ${subSector} ${companyName}`
 */
function matchAlphaLegendSector(sector = '', subSector = '', companyName = '') {
  const cleanSub = (subSector || '').trim().toLowerCase();
  const metaText = `${sector} ${subSector} ${companyName}`.toLowerCase();

  // 1. Direct Slug / ID Matching
  if (cleanSub) {
    const directMatch = SECTOR_INTELLIGENCE_CATALOG.find(entry => entry.id === cleanSub);
    if (directMatch) {
      const officialSector = ALPHA_LEGEND_SECTORS.find(s => s.id === directMatch.id);
      return {
        id: directMatch.id,
        name: officialSector ? `${officialSector.icon} ${officialSector.name} (${officialSector.category})` : directMatch.id,
        rubric: directMatch.mandate,
        searchQueries: directMatch.searchQueries,
        metrics: officialSector?.metrics || []
      };
    }
  }

  // 2. Semantic Keyword Matching across Catalog
  for (const entry of SECTOR_INTELLIGENCE_CATALOG) {
    for (const kw of entry.keywords) {
      if (metaText.includes(kw)) {
        const officialSector = ALPHA_LEGEND_SECTORS.find(s => s.id === entry.id);
        return {
          id: entry.id,
          name: officialSector ? `${officialSector.icon} ${officialSector.name} (${officialSector.category})` : entry.id,
          rubric: entry.mandate,
          searchQueries: entry.searchQueries,
          metrics: officialSector?.metrics || []
        };
      }
    }
  }

  // 3. Fallback if no specific niche matched: General Commercial & Industrial framework
  return {
    id: 'general',
    name: '🏢 General Commercial & Industrial Sector',
    rubric: `[GENERAL COMMERCIAL & INDUSTRIAL MANDATE]:
You MUST apply rigorous fundamental and industrial logic:
1. Core Business Unit Mix: Detailed breakdown of primary revenue segments and product lines.
2. Industry Demand & Market-Fit: Macro driver correlation, customer retention, and cyclicality.
3. Competitive Moat & Competitor Benchmarking: Structural advantages in distribution, production costs, contracts, and defending market share.
4. 1-2 Year Strategic Capex: Management execution roadmap and new catalyst drivers.`,
    searchQueries: [
      {
        category: 'Dinamika Industri & Pasar',
        query: (name) => `${name} prospek industri permintaan pasar produk jasa`
      },
      {
        category: 'Pangsa Pasar & Posisi Kompetitif',
        query: (name) => `${name} pangsa pasar posisi kompetitor keunggulan bisnis`
      },
      {
        category: 'Rencana Ekspansi & Belanja Modal',
        query: (name) => `${name} rencana ekspansi bisnis belanja modal capex target pertumbuhan`
      }
    ],
    metrics: []
  };
}

module.exports = {
  ALPHA_LEGEND_SECTORS,
  SECTOR_INTELLIGENCE_CATALOG,
  matchAlphaLegendSector
};
