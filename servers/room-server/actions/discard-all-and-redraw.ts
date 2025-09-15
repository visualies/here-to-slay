import type { ActionContext, ActionResult } from './action-service';
import { registerAction } from './action-registry';
import type { Card, Player } from '../../../src/types';

export function run(context: ActionContext): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;

  console.log(`🎯 Internal: Discarding all cards and redrawing for player ${playerId}`);

  const player = playersMap.get(playerId) as Player;
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const currentSupportStack = gameStateMap.get('supportStack') as Card[];
  if (!currentSupportStack || currentSupportStack.length < 5) {
    return { success: false, message: 'Not enough cards in support stack to redraw 5' };
  }

  const newSupportStack = [...currentSupportStack, ...player.hand];

  const newHand: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const drawnCard = newSupportStack.pop();
    if (drawnCard) {
      newHand.push(drawnCard);
    }
  }

  playersMap.set(playerId, { ...player, hand: newHand });
  gameStateMap.set('supportStack', newSupportStack);

  console.log(`✅ Internal: Discarded and redrew 5 cards for player ${playerId}`);
  return {
    success: true,
    message: 'Discarded all cards and drew 5 new ones',
    data: { newHand }
  };
}

registerAction('discardAllAndRedraw', { run });