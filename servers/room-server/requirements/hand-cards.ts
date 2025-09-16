import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext, minCards = 1, maxCards?: number): ActionResult {
  const { playersMap, playerId } = context;

  console.log(`🎯 Requirement: Checking hand cards for player ${playerId} (min: ${minCards}, max: ${maxCards || 'unlimited'})`);

  const player = playersMap.get(playerId);
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const handSize = player.hand?.length || 0;

  // Check minimum requirement
  if (handSize < minCards) {
    console.log(`❌ Requirement: Player ${playerId} has ${handSize} cards (need at least ${minCards})`);
    return { success: false, message: `Need at least ${minCards} cards in hand, have ${handSize}` };
  }

  // Check maximum requirement if specified
  if (maxCards !== undefined && handSize > maxCards) {
    console.log(`❌ Requirement: Player ${playerId} has ${handSize} cards (max allowed: ${maxCards})`);
    return { success: false, message: `Cannot have more than ${maxCards} cards in hand, have ${handSize}` };
  }

  console.log(`✅ Requirement: Player ${playerId} has ${handSize} cards (requirement: ${minCards}${maxCards ? `-${maxCards}` : '+'})`);
  return { success: true, message: `Hand cards requirement met (${handSize} cards)` };
}

registerRequirement('handCards', { run });