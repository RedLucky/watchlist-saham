import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { getActiveProvider } from '@/lib/dataService';
import { fetchAiCompletion, AI_PRIORITY } from '@/lib/ai/client';
import {
  extractTickersFromText,
  buildPrecalculatedFinancialContext,
  buildAdvisorPromptMessages,
  parseThinkingAndResponse
} from '@/lib/ai/chatAdvisorEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/ai/chat
 * Retrieves session list or messages for a specific session
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = await getUserIdFromRequest(request);

    // If specific session requested, return session with messages
    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!session) {
        return NextResponse.json({ error: 'Sesi konsultasi tidak ditemukan.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, session });
    }

    // Otherwise, return recent sessions list
    const sessions = await prisma.chatSession.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true }
        }
      }
    });

    return NextResponse.json({ success: true, sessions });
  } catch (err) {
    console.error('[API AI Chat GET Error]:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil riwayat sesi konsultasi: ' + err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/chat
 * Sends a message, builds verified IDX financial context, and returns AI advisory response
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const message = (body?.message || '').trim();
    let sessionId = body?.sessionId || null;
    const attachPortfolio = Boolean(body?.attachPortfolio);
    const userId = await getUserIdFromRequest(request);

    if (!message) {
      return NextResponse.json(
        { error: 'Pesan pertanyaan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // 1. Create or verify ChatSession
    let session = null;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      });
    }

    if (!session) {
      // Auto-generate concise title from message
      const titleCandidate = message.length > 35 ? message.substring(0, 32) + '...' : message;
      session = await prisma.chatSession.create({
        data: {
          title: titleCandidate || 'Konsultasi Baru',
          userId: userId || null
        },
        include: { messages: true }
      });
      sessionId = session.id;
    }

    // 2. Save user message to database
    const userMessageRecord = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message
      }
    });

    // 3. Extract tickers mentioned in current message & recent conversation turns
    const historyMessages = session.messages || [];
    const conversationText = [
      ...historyMessages.map(m => m.content),
      message
    ].join(' ');

    const detectedTickers = extractTickersFromText(conversationText);

    // 4. Fetch market data for identified tickers
    const provider = getActiveProvider();
    const allStocks = await provider.getStocks();
    const stockMap = {};
    for (const s of allStocks) {
      if (s && s.ticker) {
        stockMap[s.ticker.toUpperCase().replace('.JK', '')] = s;
      }
    }

    // 5. Fetch user portfolio if available
    let userPortfolios = [];
    if (userId) {
      userPortfolios = await prisma.portfolio.findMany({
        where: { userId }
      });
    }

    // 6. Pre-calculate deterministic financial context (anti-hallucination math)
    const financialContext = buildPrecalculatedFinancialContext({
      tickers: detectedTickers,
      userPortfolios,
      stockMap
    });

    // 7. Build prompt messages with strict grounding & 3-step reasoning
    const promptMessages = buildAdvisorPromptMessages({
      history: historyMessages,
      userMessage: message,
      financialContext,
      userPortfolios,
      attachPortfolio,
      maxHistoryTurns: 8
    });

    // 8. Fetch AI completion with high priority & thinking mode
    let aiResponse = null;
    try {
      aiResponse = await fetchAiCompletion(promptMessages, {
        enableThinking: true,
        temperature: 0.4,
        topP: 0.85,
        maxTokens: 2500,
        priority: AI_PRIORITY.HIGH,
        taskName: `chat-session-${sessionId}`
      });
    } catch (aiErr) {
      console.error('[API AI Chat Inference Error]:', aiErr);
      return NextResponse.json(
        {
          error: 'Layanan AI lokal sedang offline atau sibuk. Detail: ' + aiErr.message,
          userMessage: userMessageRecord
        },
        { status: 503 }
      );
    }

    // 9. Separate <think> reasoning from final markdown content
    const { thinking, content } = parseThinkingAndResponse(aiResponse?.content || '');

    // 10. Save assistant message to database
    const assistantMessageRecord = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: content || 'Maaf, model tidak dapat memberikan respons saat ini.',
        thinking: thinking || null,
        tickers: JSON.stringify(detectedTickers)
      }
    });

    // 11. Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      sessionId,
      userMessage: userMessageRecord,
      message: assistantMessageRecord,
      modelName: aiResponse.modelName,
      serverTps: aiResponse.serverTps,
      detectedTickers
    });
  } catch (err) {
    console.error('[API AI Chat POST Error]:', err);
    return NextResponse.json(
      { error: 'Gagal memproses konsultasi AI: ' + err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/chat
 * Deletes a consultation session
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Parameter sessionId diperlukan.' },
        { status: 400 }
      );
    }

    await prisma.chatSession.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({ success: true, deletedSessionId: sessionId });
  } catch (err) {
    console.error('[API AI Chat DELETE Error]:', err);
    return NextResponse.json(
      { error: 'Gagal menghapus sesi konsultasi: ' + err.message },
      { status: 500 }
    );
  }
}

