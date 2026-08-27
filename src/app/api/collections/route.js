import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get('shareCode');

    if (shareCode) {
      const collection = await prisma.collection.findUnique({
        where: { shareCode },
        include: {
          items: {
            take: 4,
            select: { ticker: true }
          },
          _count: {
            select: { items: true }
          }
        }
      });

      if (!collection || !collection.isPublic) {
        return NextResponse.json({ error: 'Koleksi tidak ditemukan atau privat' }, { status: 404 });
      }

      return NextResponse.json(collection);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        items: {
          take: 4,
          select: { ticker: true }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const count = await prisma.collection.count({ where: { userId } });
    if (count >= 50) {
      return NextResponse.json({ error: 'Maksimal 50 koleksi per user' }, { status: 400 });
    }

    const body = await request.json();
    const { name, emoji = '📁', description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nama koleksi harus diisi' }, { status: 400 });
    }

    const shareCode = crypto.randomUUID();

    const collection = await prisma.collection.create({
      data: {
        userId,
        name,
        emoji,
        description,
        shareCode
      }
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, emoji, description, isPublic } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID koleksi diperlukan' }, { status: 400 });
    }

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tidak ditemukan atau tidak ada akses' }, { status: 404 });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        emoji: emoji !== undefined ? emoji : existing.emoji,
        description: description !== undefined ? description : existing.description,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Tidak ada akses' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID koleksi diperlukan' }, { status: 400 });
    }

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Koleksi tidak ditemukan atau tidak ada akses' }, { status: 404 });
    }

    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
