import * as Y from 'yjs';
import type { Player, Card } from '../types';
import { addCardToPlayerHand, updatePlayerActionPoints, removeCardFromPlayerHand, addHeroToParty } from '../lib/players';

/**
 * Internal Action Service
 * 
 * Pure game logic functions that can be called by:
 * - API endpoints (with validation)
 * - Hero effects (without action point costs)
 * - Game events (triggered actions)
 */

export interface ActionServiceContext {
  roomId: string;
  playerId: string;
  playersMap: Y.Map<Player>;
  gameStateMap: Y.Map<unknown>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  // For user input requirements
  requiresInput?: {
    type: 'select_card' | 'select_player' | 'dice_roll' | 'choose_option';
    prompt: string;
    options?: unknown[];
    actionId: string; // To continue the action later
  };
}

/**
 * Draw a card from the support stack
 * Pure function - no action point validation (done by API endpoint)
 */
export function drawCard(context: ActionServiceContext): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;
  
  console.log(`🎯 Internal: Drawing card for player ${playerId}`);

  const currentSupportStack = gameStateMap.get('supportStack') as Card[];
  if (!currentSupportStack || currentSupportStack.length === 0) {
    return { success: false, message: 'Support stack is empty' };
  }

  const newSupportStack = [...currentSupportStack];
  const drawnCard = newSupportStack.pop();
  if (!drawnCard) {
    return { success: false, message: 'Failed to draw card from support stack' };
  }

  addCardToPlayerHand(playersMap, playerId, drawnCard);
  gameStateMap.set('supportStack', newSupportStack);

  console.log(`✅ Internal: Drew card ${drawnCard.name} for player ${playerId}`);
  return { 
    success: true, 
    message: `Drew card: ${drawnCard.name}`,
    data: { card: drawnCard }
  };
}

/**
 * Play a hero card to party
 * Pure function - no action point validation
 */
export function playHeroToParty(context: ActionServiceContext, cardId: string): ActionResult {
  const { playersMap, playerId } = context;
  
  console.log(`🎯 Internal: Playing hero to party for player ${playerId} - card ${cardId}`);

  const player = playersMap.get(playerId);
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const { updatedPlayer, cardIndex } = removeCardFromPlayerHand(playersMap, playerId, cardId);
  if (!updatedPlayer || cardIndex === -1) {
    return { success: false, message: 'Card not found in hand' };
  }

  const card = player.hand[cardIndex];
  if (card.type !== 'Hero') {
    // Restore card to hand
    playersMap.set(playerId, { ...updatedPlayer, hand: [...updatedPlayer.hand, card] });
    return { success: false, message: 'Only hero cards can be played to party' };
  }

  const heroAdded = addHeroToParty(playersMap, playerId, card);
  if (!heroAdded) {
    // Restore card to hand
    playersMap.set(playerId, { ...updatedPlayer, hand: [...updatedPlayer.hand, card] });
    return { success: false, message: 'Party is full' };
  }

  console.log(`✅ Internal: Played hero ${card.name} to party for player ${playerId}`);
  return { 
    success: true, 
    message: `Played hero: ${card.name}`,
    data: { card }
  };
}

/**
 * Attack a monster - requires dice roll to be provided
 * Client should send diceResult in the common payload
 */
export function attackMonster(
  context: ActionServiceContext, 
  monsterId: string, 
  diceResult: number
): ActionResult {
  const { gameStateMap, playerId } = context;
  
  console.log(`🎯 Internal: Attacking monster ${monsterId} for player ${playerId} with dice result ${diceResult}`);

  const monsters = gameStateMap.get('monsters') as Card[];
  const monster = monsters?.find(m => m.id === monsterId);
  
  if (!monster) {
    return { success: false, message: 'Monster not found' };
  }

  // Process attack with dice result
  const requiredRoll = monster.rollRequirement || 15;
  const attackSuccess = diceResult >= requiredRoll;
  
  if (attackSuccess) {
    // Remove monster from game
    const newMonsters = monsters.filter(m => m.id !== monsterId);
    gameStateMap.set('monsters', newMonsters);
    
    console.log(`✅ Internal: Successfully defeated ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return { 
      success: true, 
      message: `Defeated ${monster.name}! (Rolled ${diceResult})`,
      data: { monster, diceResult, requiredRoll }
    };
  } else {
    console.log(`❌ Internal: Failed to defeat ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return { 
      success: false, 
      message: `Attack failed! Rolled ${diceResult}, needed ${requiredRoll}`,
      data: { monster, diceResult, requiredRoll }
    };
  }
}

/**
 * Discard all cards and redraw 5 new ones
 */
export function discardAllAndRedraw(context: ActionServiceContext): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;
  
  console.log(`🎯 Internal: Discarding all cards and redrawing for player ${playerId}`);

  const player = playersMap.get(playerId);
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const currentSupportStack = gameStateMap.get('supportStack') as Card[];
  if (!currentSupportStack || currentSupportStack.length < 5) {
    return { success: false, message: 'Not enough cards in support stack to redraw 5' };
  }

  // Discard current hand back to support stack
  const newSupportStack = [...currentSupportStack, ...player.hand];
  
  // Draw 5 new cards
  const newHand: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const drawnCard = newSupportStack.pop();
    if (drawnCard) {
      newHand.push(drawnCard);
    }
  }

  // Update player and game state
  playersMap.set(playerId, { ...player, hand: newHand });
  gameStateMap.set('supportStack', newSupportStack);

  console.log(`✅ Internal: Discarded and redrew 5 cards for player ${playerId}`);
  return { 
    success: true, 
    message: 'Discarded all cards and drew 5 new ones',
    data: { newHand }
  };
}