import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { cards } from '../db/schema';
import type { Card, Turn, Action } from '../../../shared/types';
import * as Y from 'yjs';
import { addActionsToQueue } from './turn-service';

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
    console.log(`🎮 Card has ${card.actions?.length || 0} actions`)

    // Get players map from the Yjs document
    const playersMap = ydoc.getMap('players')

    // Convert card actions to Action format for the turn queue
    const cardActions: Action[] = (card.actions || []).map(action => ({
      action: action.action,
      parameters: action.params || []
    }))

    if (cardActions.length === 0) {
      console.log(`🎮 Card ${card.name} has no actions to execute`)
      return {
        success: true,
        message: `Card ${card.name} played successfully (no actions)`,
        data: {
          playerId,
          roomId,
          cardId,
          cardName: card.name,
          cardType: card.type,
          actionsProcessed: 0
        }
      }
    }

    // Add actions to turn queue and process them
    const result = addActionsToQueue(playersMap, gameStateMap, playerId, roomId, cardActions)

    if (!result.success) {
      return {
        success: false,
        message: `Failed to play card ${card.name}: ${result.message}`
      }
    }

    console.log(`🎮 Card ${card.name} played successfully. Processed ${result.actionsProcessed} actions`)

    // TODO: Implement additional game logic
    // - Verify player has the card in hand
    // - Validate card requirements
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
        cardType: card.type,
        actionsProcessed: result.actionsProcessed,
        turnServiceResult: result
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
