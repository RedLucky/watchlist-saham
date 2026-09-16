# AI-Powered Financial Consultation & Advisory System

The **AI Financial Consultation** feature (`Konsultasi AI`) is an institutional-grade, multi-turn conversational advisory system that acts as a **Senior Equity Analyst & Risk Manager** for the Indonesia Stock Exchange (IDX). It connects conversational queries directly to real-time market data, KSEI scriptless ownership, valuation bands, and user portfolio holdings in PostgreSQL, while enforcing zero-hallucination guardrails and CPU concurrency controls.

---

## 1. System Architecture & Context Injection

Traditional general-purpose LLMs frequently hallucinate stock metrics or recall outdated training data. This system resolves that through **Closed-World Strict Grounding & Pre-Calculated Math**:

```
[User Message] ──> [Ticker Extractor] ──> [Database Provider]
                                                │
[User Portfolio] ───────────────────────────────┤
                                                ▼
                                    [Pre-calculated Math]
                                    - Exact PnL % & Nominal
                                    - Averaging Down Scenarios
                                    - Support & Resistance Ticks
                                    - Valuation Bands & KSEI BFI
                                                │
                                                ▼
                              [Strict Anti-Hallucination Prompt]
                                                │
                                                ▼
                              [Single-Slot AI Priority Mutex]
                                                │
                                                ▼
                                    [Local LLM / Qwen 3.8B]
                                                │
                                                ▼
                              [<think> Split & Markdown Parser]
                                                │
                                                ▼
                                    [UI Dual-Pane Consultation]
```

---

## 2. Core Quantitative Principles

### A. Pre-Calculated Arithmetic (Deterministic Offloading)
LLMs are mathematically nondeterministic. The backend executes all critical formulas prior to prompt injection:
1. **Floating PnL**:
   $$\text{PnL}_{\text{pct}} = \frac{P_{\text{market}} - P_{\text{avg}}}{P_{\text{avg}}} \times 100$$
2. **Averaging Down Simulation**:
   $$P_{\text{new\_avg}} = \frac{\text{Invested}_{\text{old}} + (P_{\text{support}} \times \Delta\text{Shares})}{\text{Shares}_{\text{total}} + \Delta\text{Shares}}$$
3. **Breakeven Distance**:
   $$\text{Distance}_{\text{breakeven}} = \frac{P_{\text{new\_avg}} - P_{\text{market}}}{P_{\text{market}}} \times 100$$

### B. Three-Step Constrained Reasoning Protocol (`<think>`)
The model is instructed to reason sequentially within `<think>...</think>` tags before emitting the final advice:
1. **Fact Check**: Cross-check user entry modal against live market price from the verified data block.
2. **Risk Check**: Verify debt burden (DER), dividend trap status (FCF coverage), and institutional distribution flow (KSEI BFI).
3. **Strategy Formulation**: Synthesize actionable options (Hold, Pyramid Averaging at Support, or Cut Loss/Switching).

---

## 3. Hardware Mitigations (Intel i5 CPU & 32GB RAM)

### A. Single-Slot Priority Mutex (`src/lib/ai/aiPriorityMutex.js`)
On CPU-only devices without discrete GPU, concurrent LLM inferences cause OpenMP thread thrashing and memory bus saturation.
* **Tier 1 (`HIGH`)**: Interactive user consultation and screener queries (highest priority).
* **Tier 2 (`LOW`)**: Background queue tasks (`ai-worker.js` / Bloomberg Intelligence dossier).
* **Concurrency Limit**: Exactly 1 active inference at any given time.

### B. Optimal Sampling Parameters
* **`temperature: 0.4`**: Provides strategic versatility and empathetic advisory tone without corrupting factual figures.
* **`top_p: 0.85`**: Eliminates tail probabilities of hallucinations.
* **`enable_thinking: true`**: Unlocks deep Chain of Thought reasoning for multi-scenario financial analysis.
* **Max Context**: Up to **8,192 tokens** leveraging the 32GB RAM footprint (~4.5GB total RAM usage for 4B Q4 model + KV cache).

---

## 4. Database Schema (Prisma)

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
  tickers   String?     // JSON string, e.g. '["BBRI", "BMRI"]'
  createdAt DateTime    @default(now())

  @@index([sessionId])
  @@index([createdAt])
}
```

---

## 5. File Map & Verification
- **Core Engine**: `src/lib/ai/chatAdvisorEngine.js`.
- **Concurrency Mutex**: `src/lib/ai/aiPriorityMutex.js`.
- **Client Wrapper**: `src/lib/ai/client.js`.
- **API Endpoint**: `src/app/api/ai/chat/route.js`.
- **UI Component**: `src/components/AiConsultationPanel.jsx` mounted in `Dashboard.jsx`.
- **Automated Tests**: `tests/aiChatAdvisor.test.js` (5 unit tests, 203/203 suite tests passing).

