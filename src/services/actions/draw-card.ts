import type { ActionServiceContext, ActionResult } from '../action-service';
import { registerAction } from '../action-registry';
import { addCardToPlayerHand } from '../../lib/players';
import type { Card } from '../../types';

export function run(context: ActionServiceContext): ActionResult {
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

registerAction('drawCard', { run });