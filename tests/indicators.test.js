/**
 * Unit Test Suite: Technical Indicators (Standar Analisis Teknikal Pasar Modal)
 *
 * Menguji:
 * 1. Simple Moving Average (SMA) & Exponential Moving Average (EMA)
 * 2. Wilder's RSI (Relative Strength Index): smoothing, overbought (>70), oversold (<30)
 * 3. Moving Average Convergence Divergence (MACD 12, 26, 9)
 * 4. Bollinger Bands (20, 2): Upper, Middle, Lower, Bandwidth
 * 5. Double Exponential Moving Average (DEMA 20): Pemangkasan lag vs SMA
 * 6. Supertrend (10, 3): ATR Trailing Stop, Bullish vs Bearish Trend Detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateVolumeMA,
  calculateSupertrend,
  calculateDEMA,
  calculateDEMASeries
} from '../src/lib/indicators.js';

describe('1. Moving Averages (SMA & EMA)', () => {
  test('calculateMA menghitung rata-rata sederhana periode N', () => {
    const prices = [10, 20, 30, 40, 50];
    const ma3 = calculateMA(prices, 3); // (30 + 40 + 50) / 3 = 40
    assert.equal(ma3, 40);
  });

  test('calculateEMA memberikan bobot lebih besar pada data terkini', () => {
    // Array harga naik tajam di akhir
    const prices = [10, 10, 10, 10, 10, 50];
    const sma = calculateMA(prices, 5);
    const ema = calculateEMA(prices, 5);
    assert.ok(ema > sma, 'EMA harus lebih responsif terhadap lonjakan harga terkini dibanding SMA');
  });
});

describe('2. Wilder\'s RSI 14 (calculateRSI & calculateRSISeries)', () => {
  test('Harga konstan menghasilkan RSI netral 50', () => {
    const flatPrices = Array(30).fill(1000);
    const rsi = calculateRSI(flatPrices, 14);
    assert.equal(rsi, 50);
  });

  test('Tren naik konsisten menghasilkan RSI Overbought (RSI > 70)', () => {
    const upPrices = [];
    for (let i = 0; i < 40; i++) upPrices.push(1000 + i * 25);
    const rsi = calculateRSI(upPrices, 14);
    assert.ok(rsi >= 70, `RSI tren naik konsisten harus >= 70, didapat ${rsi}`);
  });

  test('Tren turun konsisten menghasilkan RSI Oversold (RSI < 30)', () => {
    const downPrices = [];
    for (let i = 0; i < 40; i++) downPrices.push(2000 - i * 30);
    const rsi = calculateRSI(downPrices, 14);
    assert.ok(rsi <= 30, `RSI tren turun konsisten harus <= 30, didapat ${rsi}`);
  });

  test('calculateVolumeMA menghitung rata-rata volume perdagangan', () => {
    const volumes = [1000000, 2000000, 3000000];
    const avgVol = calculateVolumeMA(volumes, 3);
    assert.equal(avgVol, 2000000);
  });
});

describe('3. MACD (calculateMACD)', () => {
  test('Menghitung MACD Line, Signal Line, dan Histogram', () => {
    const prices = [];
    for (let i = 0; i < 60; i++) prices.push(5000 + Math.sin(i * 0.2) * 500 + i * 20);
    const macd = calculateMACD(prices, 12, 26, 9);

    assert.ok(typeof macd.macdLine === 'number');
    assert.ok(typeof macd.signalLine === 'number');
    assert.ok(typeof macd.histogram === 'number');
    // Verifikasi identitas matematika: Histogram = macdLine - signalLine
    const diff = Math.abs(macd.histogram - (macd.macdLine - macd.signalLine));
    assert.ok(diff < 0.0001, 'Histogram harus sama dengan macdLine - signalLine');
  });

  test('Data tidak mencukupi menghasilkan nilai fallback aman', () => {
    const shortPrices = [1000, 1050];
    const macd = calculateMACD(shortPrices, 12, 26, 9);
    assert.equal(macd.macdLine, 0);
    assert.equal(macd.signalLine, 0);
  });
});

describe('4. Bollinger Bands (calculateBollingerBands)', () => {
  test('Upper Band > Middle Band (SMA 20) > Lower Band', () => {
    const prices = [];
    for (let i = 0; i < 35; i++) prices.push(3000 + (i % 5) * 50);
    const bb = calculateBollingerBands(prices, 20, 2);

    assert.ok(bb.upper > bb.middle, 'Upper Band harus di atas Middle Band');
    assert.ok(bb.middle > bb.lower, 'Middle Band harus di atas Lower Band');
    // Simetri 2 Standar Deviasi: (Upper - Middle) harus sama dengan (Middle - Lower)
    const upperDiff = Number((bb.upper - bb.middle).toFixed(2));
    const lowerDiff = Number((bb.middle - bb.lower).toFixed(2));
    assert.equal(upperDiff, lowerDiff, 'Bollinger Bands harus simetris terhadap rata-rata');
  });
});

describe('5. Double Exponential Moving Average (DEMA)', () => {
  test('DEMA 20 memangkas lag lebih cepat dibanding SMA saat terjadi breakout', () => {
    // Harga datar lalu melonjak drastis
    const prices = Array(25).fill(1000);
    prices.push(1200, 1300, 1400, 1500, 1600);

    const dema = calculateDEMA(prices, 20);
    const sma = calculateMA(prices, 20);

    assert.ok(dema > sma, 'DEMA harus bereaksi jauh lebih cepat dari SMA pada reli harga');
  });

  test('calculateDEMASeries mengembalikan array dengan panjang sesuai input', () => {
    const prices = [100, 110, 105, 115, 120, 118, 125, 130, 128, 135];
    const series = calculateDEMASeries(prices, 5);
    assert.equal(series.length, prices.length);
  });
});

describe('6. Supertrend & ATR (calculateSupertrend)', () => {
  test('Mendeteksi sinyal Bullish (+1) saat harga konsisten di atas trailing band', () => {
    const candles = [];
    for (let i = 0; i < 30; i++) {
      const p = 5000 + i * 50;
      candles.push({
        high: p + 30,
        low: p - 20,
        close: p + 20,
        volume: 1000000
      });
    }

    const st = calculateSupertrend(candles, 10, 3);
    assert.equal(st.direction, 1, 'Tren bullish harus menghasilkan direction = 1');
    assert.ok(st.value < candles[candles.length - 1].close, 'Supertrend line harus berada di bawah harga close saat Bullish');
  });

  test('Mendeteksi sinyal Bearish (-1) saat harga jatuh menembus trailing band', () => {
    const candles = [];
    for (let i = 0; i < 30; i++) {
      const p = 8000 - i * 60;
      candles.push({
        high: p + 20,
        low: p - 40,
        close: p - 30,
        volume: 1000000
      });
    }

    const st = calculateSupertrend(candles, 10, 3);
    assert.equal(st.direction, -1, 'Tren bearish harus menghasilkan direction = -1');
    assert.ok(st.value > candles[candles.length - 1].close, 'Supertrend line harus berada di atas harga close saat Bearish');
  });
});
