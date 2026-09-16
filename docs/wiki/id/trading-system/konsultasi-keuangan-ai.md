# Sistem Konsultasi & Penasihat Investasi Saham Bertenaga AI

Fitur **Konsultasi AI** (`Konsultasi AI`) adalah sistem penasihat percakapan multi-sesi institusional yang bertindak sebagai **Senior Equity Analyst & Risk Manager** untuk pasar modal Indonesia (Bursa Efek Indonesia / BEI). Fitur ini menghubungkan pertanyaan pengguna secara langsung ke data harga riil, kepemilikan efek KSEI, pita valuasi statistik (PBND), serta portofolio pengguna di PostgreSQL, dengan proteksi anti-halusinasi ketat dan manajemen antrean CPU.

---

## 1. Arsitektur Sistem & Injeksi Konteks Data Riil

Model LLM generik sering berhalusinasi atau mengingat data bursa yang usang. Sistem ini mengatasi kelemahan tersebut melalui **Strict Grounding (Asumsi Dunia Tertutup) & Matematika Terkalkulasi**:

```
[Pesan Pengguna] ──> [Ekstraktor Ticker] ──> [Database Provider]
                                                    │
[Portofolio Pengguna] ──────────────────────────────┤
                                                    ▼
                                        [Kalkulasi Matematika Pasti]
                                        - Persentase & Nominal PnL
                                        - Simulasi Skenario Average Down
                                        - Jarak Level Support & Resistance
                                        - Valuasi PBND & Arus KSEI (BFI)
                                                    │
                                                    ▼
                                  [Prompt Tertutup Anti-Halusinasi]
                                                    │
                                                    ▼
                                  [Single-Slot AI Priority Mutex]
                                                    │
                                                    ▼
                                        [LLM Lokal / Qwen 3.8B]
                                                    │
                                                    ▼
                                  [Pemisah <think> & Parser Markdown]
                                                    │
                                                    ▼
                                        [UI Konsultasi 2-Kolom]
```

---

## 2. Prinsip Kuantitatif & Anti-Halusinasi

### A. Komputasi Matematika di Backend (Bukan di AI)
Model LLM tidak boleh menghitung aritmatika di dalam kepala karena rentan salah hitung (*arithmetic hallucination*). Backend Node.js menghitung seluruh metrik sebelum disuapkan ke prompt:
1. **Floating PnL**:
   $$\text{PnL}_{\text{pct}} = \frac{P_{\text{pasar}} - P_{\text{modal}}}{P_{\text{modal}}} \times 100$$
2. **Simulasi Averaging Down**:
   $$P_{\text{avg\_baru}} = \frac{\text{Modal}_{\text{lama}} + (P_{\text{support}} \times \Delta\text{Lembar})}{\text{Lembar}_{\text{total}} + \Delta\text{Lembar}}$$
3. **Jarak Menuju Breakeven**:
   $$\text{Jarak}_{\text{BEP}} = \frac{P_{\text{avg\_baru}} - P_{\text{pasar}}}{P_{\text{pasar}}} \times 100$$

### B. Protokol Penalaran 3-Tahap (`<think>`)
Model diwajibkan melakukan proses penalaran terstruktur di dalam tag `<think>...</think>` sebelum menyajikan jawaban akhir:
1. **Audit Fakta**: Mencocokkan modal beli pengguna dengan harga pasar bursa saat ini.
2. **Audit Risiko**: Mengevaluasi beban utang (DER), jebakan dividen (*Dividend Trap*), dan status arus akumulasi bandar (KSEI BFI).
3. **Formulasi Strategi**: Merumuskan rekomendasi aksi konkret (Tahan, Averaging Bertahap di Support, atau Cut Loss/Pindah Sektor).

---

## 3. Mitigasi Performa Hardware (Intel i5 CPU & RAM 32GB)

### A. Single-Slot Priority Mutex (`src/lib/ai/aiPriorityMutex.js`)
Pada komputer tanpa GPU diskret, inferensi paralel menyebabkan *CPU thrashing* dan saturasi memori.
* **Tier 1 (`HIGH`)**: Konsultasi interaktif chat dan pencarian AI Screener (prioritas tertinggi).
* **Tier 2 (`LOW`)**: Antrean tugas latar belakang (`ai-worker.js` / riset Bloomberg Intelligence).
* **Batas Konkurensi**: Tepat 1 inferensi aktif dalam satu waktu.

### B. Parameter Sampling Optimal
* **`temperature: 0.4`**: Memberikan keluwesan strategi dan nada bicara empatik tanpa merusak kepatuhan angka faktual.
* **`top_p: 0.85`**: Memotong probabilitas kata-kata halusinasi di ekor distribusi.
* **`enable_thinking: true`**: Mengaktifkan alur penalaran mendalam (*Chain of Thought*) yang ditampilkan transparan dalam akordeon UI.
* **Kapasitas Konteks**: Hingga **8.192 token** memanfaatkan kapasitas RAM 32GB yang lega (~4.5GB total RAM yang digunakan).

---

## 4. Skema Database (Prisma)

```prisma
model ChatSession {
  id        String        @id @default(cuid())
  userId    Int?
  user      User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String        @default("Konsultasi Baru")
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  messages  ChatMessage[]

  @@index([userId])
  @@index([createdAt])
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String      // "user" | "assistant"
  content   String      @db.Text
  thinking  String?     @db.Text
  tickers   String?     // JSON array, misal: '["BBRI", "BMRI"]'
  createdAt DateTime    @default(now())

  @@index([sessionId])
  @@index([createdAt])
}
```

---

## 5. Peta Berkas & Verifikasi
- **Mesin Utama**: `src/lib/ai/chatAdvisorEngine.js`.
- **Mutex Konkurensi**: `src/lib/ai/aiPriorityMutex.js`.
- **Wrapper Klien**: `src/lib/ai/client.js`.
- **Endpoint API**: `src/app/api/ai/chat/route.js`.
- **Komponen UI**: `src/components/AiConsultationPanel.jsx` yang terpasang di `Dashboard.jsx`.
- **Pengujian Unit**: `tests/aiChatAdvisor.test.js` (5 pengujian unit, 203/203 pengujian lulus 100%).
