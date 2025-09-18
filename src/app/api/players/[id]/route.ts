import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { active, name, number } = body;

    const updateData: { active?: boolean; name?: string; number?: number | null } = {};
    if (active !== undefined) updateData.active = active;
    if (name !== undefined) updateData.name = name.trim();
    if (number !== undefined) updateData.number = number;

    // Check if number is already taken by another player (if updating number)
    if (number !== undefined && number !== null) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          number: number,
          active: true,
          id: { not: params.id }
        }
      });

      if (existingPlayer) {
        return NextResponse.json(
          { error: `Rugnummer ${number} is al in gebruik` },
          { status: 400 }
        );
      }
    }

    const player = await prisma.player.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if player is used in any games
    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: { playerId: params.id }
    });

    if (gamePlayer) {
      return NextResponse.json(
        { error: 'Kan speler niet verwijderen: speler is gebruikt in wedstrijden' },
        { status: 400 }
      );
    }

    await prisma.player.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}