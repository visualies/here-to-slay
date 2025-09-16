import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { cards } from '../db/schema';
import type { Card, Turn, Action, ActionContext, ActionResult, ActionParams, Player } from '../../../shared/types';
import { Location, Amount, SelectionMode } from '../../../shared/types';
import * as Y from 'yjs';
import { addActionsToQueue } from './turn-service';
import { addCardToPlayerHand } from '../../../src/lib/players';

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

/**
 * Move cards between locations with simplified selection mode
 * @param context - Action context containing players and game state
 * @param target - Source location to move cards from
 * @param destination - Destination location to move cards to
 * @param amount - Number of cards to move
 * @returns ActionResult with success status and data
 */
export function moveCard(
  context: ActionContext, 
  target: Location, 
  destination: Location, 
  amount: Amount
): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;

  if (!target || !destination || !amount) {
    return { success: false, message: 'target, destination, and amount parameters are required' };
  }

  // Always use 'first' selection mode for now
  const selectionMode = SelectionMode.First;

  // Only support 'first' selection mode for now
  if (selectionMode !== SelectionMode.First) {
    return { 
      success: false, 
      message: `Selection mode '${selectionMode}' is not yet implemented. Only 'first' is supported.` 
    };
  }

  console.log(`🎯 Card Service: Moving ${amount} card(s) from ${target} to ${destination} for player ${playerId}`);

  // Handle different source locations
  let sourceCards: Card[] = [];
  let updateSourceFunction: (cards: Card[]) => void;

  switch (target) {
    case Location.SupportDeck:
      sourceCards = gameStateMap.get('supportStack') as Card[] || [];
      updateSourceFunction = (cards) => gameStateMap.set('supportStack', cards);
      break;
    case Location.OwnHand:
      const player = playersMap.get(playerId) as Player;
      sourceCards = player?.hand || [];
      updateSourceFunction = (cards) => {
        if (player) {
          playersMap.set(playerId, { ...player, hand: cards });
        }
      };
      break;
    case Location.OtherHands:
      // Get all other players' hands combined
      const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];

      if (otherPlayers.length === 0) {
        return { success: false, message: 'No other players to draw from' };
      }

      // For 'first' selection mode, take from the first other player
      const firstOtherPlayer = otherPlayers[0];
      sourceCards = firstOtherPlayer.hand || [];

      updateSourceFunction = (remainingCards) => {
        playersMap.set(firstOtherPlayer.id, { ...firstOtherPlayer, hand: remainingCards });
      };
      break;
    default:
      return { success: false, message: `Unsupported source location: ${target}` };
  }

  // Check if source has enough cards
  let numAmount: number;
  if (amount === Amount.All) {
    numAmount = sourceCards.length;
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else if (typeof amount === 'string' && !isNaN(Number(amount))) {
    numAmount = Number(amount);
  } else {
    numAmount = 1; // Default fallback
  }

  // Handle special case of drawing 0 cards (no-op)
  if (numAmount === 0) {
    console.log(`✅ Card Service: No-op - moving 0 cards from ${target} to ${destination} for player ${playerId}`);
    return {
      success: true,
      message: `No-op: moved 0 cards from ${target} to ${destination}`,
      data: {
        cards: [],
        target,
        destination,
        amount: 0
      }
    };
  }

  if (sourceCards.length < numAmount) {
    return { success: false, message: `Not enough cards in ${target} (has ${sourceCards.length}, needs ${numAmount})` };
  }

  // Draw cards from source
  const newSourceCards = [...sourceCards];
  const drawnCards: Card[] = [];

  for (let i = 0; i < numAmount; i++) {
    const card = newSourceCards.pop();
    if (card) {
      drawnCards.push(card);
    }
  }

  if (drawnCards.length === 0) {
    return { success: false, message: `Failed to draw cards from ${target}` };
  }

  // Update source
  updateSourceFunction(newSourceCards);

  // Handle different destination locations
  switch (destination) {
    case Location.OwnHand:
      // Add cards to player hand
      drawnCards.forEach(card => {
        addCardToPlayerHand(playersMap, playerId, card);
      });
      break;
    case Location.SupportDeck:
      // Add cards back to support stack
      const currentSupportStack = gameStateMap.get('supportStack') as Card[] || [];
      gameStateMap.set('supportStack', [...currentSupportStack, ...drawnCards]);
      break;
    default:
      return { success: false, message: `Unsupported destination location: ${destination}` };
  }

  const cardNames = drawnCards.map(card => card.name).join(', ');
  console.log(`✅ Card Service: Moved card(s) ${cardNames} from ${target} to ${destination} for player ${playerId}`);

  return {
    success: true,
    message: `Moved ${drawnCards.length} card(s) from ${target} to ${destination}`,
    data: {
      cards: drawnCards,
      target,
      destination,
      amount: drawnCards.length
    }
  };
}
