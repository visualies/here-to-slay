import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { cards } from '../db/schema';
import type { Card, Turn } from '../../../shared/types';
import * as Y from 'yjs';

/**
 * Card service for retrieving card data and handling card actions
 */

export async function getCard(cardId: string): Promise<Card | null> {
  const result = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: {
      requirements: true,
      actions: {
        with: {
          params: true,
        },
      },
    },
  })

  return result ?? null
}

export async function playCard(
  playerId: string,
  roomId: string,
  cardId: string,
  ydoc: Y.Doc
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Get the card data first
    const card = await getCard(cardId)
    if (!card) {
      return {
        success: false,
        message: `Card ${cardId} not found`
      }
    }

    // Get current turn from Yjs document
    const gameStateMap = ydoc.getMap('gameState')
    const currentTurn = gameStateMap.get('currentTurn') as Turn | null

    if (!currentTurn) {
      return {
        success: false,
        message: 'No active turn found'
      }
    }

    // Check if it's the player's turn
    if (currentTurn.player_id !== playerId) {
      return {
        success: false,
        message: `It's not your turn. Current turn belongs to player ${currentTurn.player_id}`
      }
    }

    console.log(`🎮 Playing card: ${card.name} (${card.type}) by player ${playerId}`)

    // TODO: Implement additional game logic
    // - Verify player has the card in hand
    // - Validate card requirements
    // - Execute card actions based on card.actions
    // - Remove card from player's hand
    // - Add card to appropriate game area

    return {
      success: true,
      message: `Card ${card.name} played successfully`,
      data: {
        playerId,
        roomId,
        cardId,
        cardName: card.name,
        cardType: card.type
      }
    }
  } catch (error) {
    console.error('Error playing card:', error)
    return {
      success: false,
      message: 'Failed to play card due to server error'
    }
  }
}
