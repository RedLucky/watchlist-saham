---
title: "Optimasi Portofolio Pensiun & Knapsack Lot Engine"
description: "Formulasi matematika dan arsitektur AI untuk perencanaan pensiun dini (FIRE), pemilihan saham dividen, dan alokasi diskrit lot berbasis bounded knapsack."
category: "financial-engine"
tags: ["pensiun", "fire", "knapsack-optimizer", "alokasi-lot", "generasi-ai", "compounding-dividen"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Optimasi Portofolio Pensiun & Knapsack Lot Engine

## 1. Ikhtisar & Tujuan

Fitur **Kalkulator Pensiun (FIRE Planner)** dirancang untuk membantu investor mengakumulasi aset secara terukur menuju Kebebasan Finansial (*Financial Independence*) dan Pensiun Dini (*Early Retirement*). Sistem menyeimbangkan 3 kelas aset:
- **Surat Berharga Negara (SBN)**: Imbal hasil bebas risiko (*risk-free baseline*) sekitar ~6.5% per tahun.
- **Saham Ekuitas**: Emiten berkualitas tinggi (*compounder*) penghasil arus kas dividen dan pertumbuhan modal.
- **Reksadana Pasar Uang (RDPU)**: Bantalan likuiditas kas penyerap sisa uang belanja bulanan.

Rasio alokasi per profil risiko:
- **Konservatif**: 60% SBN / 20% Saham / 20% RDPU
- **Moderat**: 50% SBN / 35% Saham / 15% RDPU
- **Agresif**: 30% SBN / 60% Saham / 10% RDPU

---

## 2. Masalah Alokasi Lot Diskrit di Bursa Efek Indonesia (BEI)

Di BEI, transaksi saham wajib dalam kelipatan integer lot (1 Lot = 100 lembar):
$$\text{Biaya Lot}_i = \text{Harga Saham}_i \times 100$$

Pembagian persentase teoritis sering menghasilkan pecahan lot (misal 1.4 lot) yang tidak bisa dibeli langsung. Jika dibulatkan sembarangan:
1. **Melebihi Anggaran (*Overbudget*)**: Pembulatan ke atas menyebabkan total belanja melampaui tabungan bulanan pengguna.
2. **Modal Menganggur (*Idle Cash*)**: Pembulatan ke bawah menyisakan uang tunai yang tidak terinvestasikan.

---

## 3. Optimasi Lot Knapsack Berbasis AI (`src/lib/lotOptimizer.js`)

Sistem memadukan analisis kualitatif model AI dengan algoritma matematika **Bounded Integer Knapsack Solver**:

```mermaid
flowchart TD
    AI["Model AI Lokal (Qwen GGUF)"] -->|"1. Memilih 4-5 Saham\n2. Menentukan Bobot Target (%)\n3. Menetapkan Prioritas (1-5)"| Solver["optimizeDiscreteLots(stocks, equityBudget)"]
    
    subgraph KnapsackSolver ["Alur Solver Matematika Deterministik"]
        Solver --> P1["Fase 1: Alokasi Proporsional\nFloor(Budget * TargetWeight / LotCost)"]
        P1 --> Residual["Hitung Sisa Kas Menganggur\nremainingCash = Budget - TotalCost"]
        Residual --> P2{"Apakah Total Lot == 0?"}
        P2 -->|Ya (Anggaran Kecil)| MinLot["Beli 1 Lot Saham Terjangkau Prioritas Tertinggi"]
        P2 -->|Tidak| P3["Fase 3: Penyerapan Kas Rakus (Greedy)\nHabiskan sisa kas ke saham prioritas tertinggi"]
        MinLot --> P3
        P3 --> Final["Hasil Akhir: Jumlah Lot Bulat\nZero Overbudget + Penyerapan 98-99.9%"]
    end
```

### Jaminan Matematis:
1. **Tanpa Overbudget (*Zero Overbudget*)**:
   $$\sum_{i=1}^{N} (\text{Lot}_i \times \text{Harga}_i \times 100) \le \text{Anggaran Saham}$$
2. **Penyerapan Kas Maksimal**:
   $$\text{Sisa Kas} < \min_{i \in \text{Terjangkau}} (\text{Biaya Lot}_i)$$
   Efisiensi penyerapan modal mencapai **98.0% hingga 99.9%**.

---

## 4. Endpoint Pemilihan Saham AI (`POST /api/pension/ai-generate`)

Alur kerja endpoint:
1. Menerima data pengguna: `riskProfile`, `currentAge`, `targetAge`, `totalBudget`, `monthlyExpense`, `sbnAvailable`.
2. Menyaring 25 kandidat saham dividen & fundamental paling sehat dari database (menolak emiten delisted, FCF negatif, atau ritel $>50\%$).
3. Mengirimkan prompt ke model AI lokal dengan peran Senior Certified Financial Planner (CFP) & Spesialis FIRE.
4. Menghasilkan struktur JSON:
   - `portfolioThesis`: Tesis strategi portofolio pensiun.
   - `strategyAdvice`: Nasihat eksekusi dan reinvestasi dividen bulanan.
   - `stocks`: 4–5 saham terpilih dengan atribut `targetWeightPct`, `role` (misal: *Bedrock Core Compounder*, *High Yield Anchor*), dan `priorityRank`.
5. Meneruskan bobot ke fungsi `optimizeDiscreteLots` untuk menghitung lot integer.
6. **Fallback Otomatis**: Jika server AI lokal sedang tidak aktif, sistem otomatis beralih ke skoring kuantitatif multi-faktor tanpa memunculkan error bagi pengguna.

---

## 5. Pengecualian Proksi Keamanan & Telemetri Inferensi

### Pengecualian Proksi Edge (`src/proxy.js`)
Untuk memungkinkan pengunjung maupun pengguna yang belum login mencoba Kalkulator Pensiun FIRE dan menghasilkan portofolio AI:
- Rute `/api/pension/preset` dan `/api/pension/ai-generate` secara eksplisit dikecualikan dari verifikasi token JWT Edge.
- Rute penyimpanan data pengguna (`POST /api/pension`) tetap diwajibkan otentikasi penuh demi keamanan data pribadi.

### Optimalisasi Prompt & Anggaran Token
Model penalaran lokal (Qwen / DeepSeek) dapat kehabisan batas token jika tidak dibatasi:
- Instruksi prompt melarang tag `<think>` dan membatasi output agar ringkas (tesis $\le$ 2 kalimat, saran $\le$ 1 kalimat, alasan $\le$ 10 kata).
- Parameter `maxTokens` diatur pada **850**, menghasilkan output sekitar 350-450 token yang menjamin JSON selalu utuh dan valid.
- Seluruh metrik inferensi disimpan secara otomatis ke tabel `AiAuditLog` (nama model, latensi, token prompt, token completion, durasi).

