-- Track IDX index membership (LQ45, IDX30, IDXValue30, HIDV20, ISSI).
CREATE TABLE "IdxIndex" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'scrape',

    CONSTRAINT "IdxIndex_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "IdxConstituent" (
    "id" TEXT NOT NULL,
    "indexCode" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "position" INTEGER,

    CONSTRAINT "IdxConstituent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdxConstituent_indexCode_ticker_key" ON "IdxConstituent"("indexCode", "ticker");
CREATE INDEX "IdxConstituent_ticker_idx" ON "IdxConstituent"("ticker");
CREATE INDEX "IdxIndex_lastSyncedAt_idx" ON "IdxIndex"("lastSyncedAt");

ALTER TABLE "IdxConstituent" ADD CONSTRAINT "IdxConstituent_indexCode_fkey"
    FOREIGN KEY ("indexCode") REFERENCES "IdxIndex"("code") ON DELETE CASCADE ON UPDATE CASCADE;