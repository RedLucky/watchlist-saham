---
title: "Bloomberg BRKR: Konsentrasi Broker & Indeks Aliran Bandarmologi"
description: "Rasio konsentrasi broker institusi (CR1, CR3, CR5), Bandarmologi Flow Index (BFI), dan deteksi akumulasi bandar."
category: "trading-system"
tags: ["bloomberg", "brkr", "broker-summary", "bandarmologi", "rasio-konsentrasi", "smart-money"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg BRKR: Konsentrasi Broker & Indeks Aliran Bandarmologi

## 1. Ikhtisar & Rasional Institusional

Pada pasar saham Indonesia, pergerakan tren harga sering dipandu oleh transaksi terkoordinasi sekuritas institusi besar. Modul **Bloomberg BRKR (`BRKR <GO>`)** mengukur tingkat konsentrasi broker:
1. **Rasio Konsentrasi (CR1, CR3, CR5)**: Porsi persentase perputaran transaksi yang dikuasai oleh 1 broker terbesar, 3 broker teratas, dan 5 broker teratas.
2. **Ambang Batas Konsentrasi Tinggi ($\text{CR3} \ge 55\%$)**: Menandai bahwa perdagangan dikendalikan oleh segelintir pelaku besar (*smart money*), bukan transaksi ritel acak.
3. **Bandarmologi Flow Index (BFI)**: Mengukur dominasi tekanan beli vs tekanan jual pemodal besar.
4. **Klasifikasi Aliran**: Menghasilkan vonis *Akumulasi Masif*, *Akumulasi Normal*, *Netral*, *Distribusi Normal*, dan *Distribusi Masif*.

---

## 2. Formulasi Matematika & Kriteria Sinyal

$$\text{CR}_k = \sum_{j=1}^{k} \frac{\text{Nilai Transaksi}_j}{\text{Total Nilai Transaksi}} \times 100\%$$

- $\text{CR3} \ge 60\% \land \text{BFI} > 15 \implies$ **Akumulasi Masif (Big Accumulation) 🐋**
- $\text{CR3} \ge 60\% \land \text{BFI} < -15 \implies$ **Distribusi Masif (Big Distribution) 🚨**

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/brokerConcentrationEngine.js`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.brokerConcentration`.
- Komponen visual: Panel terpadu pada `src/components/SmartMoneyLiquidityPanel.jsx`.
- Pengujian otomatis: `tests/brokerConcentration.test.js`.

