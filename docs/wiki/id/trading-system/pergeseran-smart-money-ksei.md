---
title: "Bloomberg OWN / HDS: Peta Kepemilikan Smart Money KSEI & Pergeseran Bulanan"
description: "Delta kepemilikan institusi Month-over-Month (MoM), deteksi divergensi ritel vs institusi, dan analitik registri KSEI."
category: "trading-system"
tags: ["bloomberg", "own", "hds", "ksei", "smart-money", "aliran-institusi", "pemegang-saham"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg OWN / HDS: Peta Kepemilikan Smart Money KSEI & Pergeseran Bulanan

## 1. Ikhtisar & Rasional Institusional

Data *broker summary* harian sering terdistorsi oleh transaksi *wash trading* dan aktivitas *scalping* berfrekuensi tinggi. Bukti kepemilikan riil pemodal institusi di bursa Indonesia tercatat resmi secara bulanan pada kustodian sentral **KSEI (Kustodian Sentral Efek Indonesia)**.

Modul **Bloomberg OWN (`OWN <GO>`) & HDS (`HDS <GO>`)** menyediakan:
1. **Pergeseran Bulanan Institusi (MoM Shift)**: Mengukur delta akumulasi neto atau distribusi oleh investor institusional.
2. **Divergensi Ritel vs Institusi**: Mendeteksi pola akumulasi *smart money* di mana porsi institusi bertambah saat porsi ritel berkurang (*transfer of ownership* dari tangan lemah ke tangan kuat).
3. **Rincian Sub-Kategori Domestik**: Membedakan kepemilikan Dana Pensiun (`PF`), Reksa Dana (`MF`), Asuransi (`IS`), Perbankan (`IB`), dan Sekuritas (`SC`).
4. **Pengendali vs Free Float Publik**: Memisahkan kepemilikan pengendali jangka panjang (*corporate controller*) dari saham likuid yang beredar bebas di publik.

---

## 2. Formulasi Matematika & Klasifikasi Aliran

$$\Delta\text{Institusi} = \text{Institusi}\%_T - \text{Institusi}\%_{T-1}$$

$$\Delta\text{Ritel} = \text{Ritel}\%_T - \text{Ritel}\%_{T-1}$$

### 2.1 Logika Keputusan Sinyal

- **Smart Money Akumulasi Masif 🐋**: $\Delta\text{Institusi} > +0.30\% \land \Delta\text{Ritel} < -0.20\%$.
- **Akumulasi Institusi Ringan 🟢**: $\Delta\text{Institusi} > +0.05\%$.
- **Smart Money Distribusi ke Ritel 🚨**: $\Delta\text{Institusi} < -0.30\% \land \Delta\text{Ritel} > +0.20\%$.
- **Distribusi Institusi Ringan 🔴**: $\Delta\text{Institusi} < -0.05\%$.
- **Netral / Stabil ⚖️**: Fluktuasi di bawah $\pm 0.05\%$.

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/kseiShiftEngine.js`.
- Integrasi API: Disematkan pada respons `GET /api/stocks/[ticker]` sebagai `stockDetail.kseiShift`.
- Komponen visual: Panel terpadu pada `src/components/SmartMoneyLiquidityPanel.jsx`.
- Pengujian otomatis: `tests/kseiShift.test.js`.
