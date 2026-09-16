# Bloomberg RRG / SECT: Mesin Rotasi Sektoral Relatif (Relative Rotation Graph)

## 1. Ikhtisar & Fondasi Teoretis
Modul **Relative Rotation Graph (RRG)** (terinspirasi dari fitur Bloomberg `RRG` dan metodologi rotasi siklis Julius de Kempenaer) memetakan kekuatan relatif dan momentum seluruh sektor BEI (IDX-IC) terhadap indeks komposit (IHSG).

Pasar modal bergerak dalam gelombang siklis makroekonomi. RRG mengklasifikasikan sektor ke dalam 4 kuadran kanonikal berpusat pada koordinat `(100, 100)`:
1. **Leading (🟢 Memimpin)**: $RS > 100$, $Momentum \ge 100$. Sektor yang mengungguli IHSG dengan akselerasi tren bullish kuat.
2. **Weakening (🟡 Melemah)**: $RS \ge 100$, $Momentum < 100$. Sektor dengan kekuatan relatif historis tinggi namun laju momentum mulai melambat (fase topping/distribusi).
3. **Lagging (🔴 Tertinggal)**: $RS < 100$, $Momentum < 100$. Sektor yang kinerjanya tertinggal di bawah indeks dengan momentum negatif.
4. **Improving (🔵 Membaik)**: $RS < 100$, $Momentum \ge 100$. Sektor yang mulai bangkit dari penurunan dengan perputaran momentum positif (fase bottoming / akumulasi awal).

---

## 2. Formulasi Matematis

### 2.1. Relative Strength Ratio (RS-Ratio)
RS-Ratio mengukur excess return sektor terhadap indeks acuan dalam jendela 5 hari bursa:

$$\text{Excess Return} = \text{Return}_{5d} - \text{Return}_{\text{acuan}}$$

$$\text{RS-Ratio} = 100 + (\text{Excess Return} \times 5)$$

### 2.2. Relative Strength Momentum (RS-Momentum)
RS-Momentum menangkap akselerasi volume perdagangan dan rasio emiten yang menguat (breadth) di dalam sektor:

$$\Delta_{\text{momentum}} = (\text{Volume Growth} - 1.0) \times 10 + (\text{Winners Ratio} - 0.5) \times 20$$

$$\text{RS-Momentum} = 100 + \Delta_{\text{momentum}}$$

---

## 3. Detail Implementasi
- **Mesin Komputasi**: `src/lib/sectorRrgEngine.js`.
- **Rute API**: Terintegrasi pada `GET /api/sectors` sebagai properti `rrg`.
- **Komponen UI**: `src/components/SectorRrgPanel.jsx` dengan tombol filter kuadran interaktif, tertaut pada bilah navigasi sektor `SectorBar.jsx`.
