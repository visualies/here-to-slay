import type { ActionServiceContext, ActionResult } from '../action-service';
import { registerAction } from '../action-registry';
import { removeCardFromPlayerHand, addHeroToParty } from '../../lib/players';

export function run(context: ActionServiceContext, cardId: string): ActionResult {
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

registerAction('playHeroToParty', { run });