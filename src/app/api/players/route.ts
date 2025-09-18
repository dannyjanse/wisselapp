import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: [
        { active: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, number } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if number is already taken (if provided)
    if (number !== null && number !== undefined) {
      const existingPlayer = await prisma.player.findFirst({
        where: { number: number, active: true }
      });

      if (existingPlayer) {
        return NextResponse.json(
          { error: `Rugnummer ${number} is al in gebruik` },
          { status: 400 }
        );
      }
    }

    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        number: number || null,
      }
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}