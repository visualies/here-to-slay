import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`📍 Internal: Placing card for player ${playerId}`);

  // TODO: Implement card placement logic
  console.log('Card place action executed');

  return {
    success: true,
    message: 'Card placed successfully',
    data: { playerId }
  };
}

registerAction('placeCard', { run });