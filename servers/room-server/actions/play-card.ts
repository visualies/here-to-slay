import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🃏 Internal: Playing card for player ${playerId}`);

  // TODO: Implement card play logic
  console.log('Card play action executed');

  return {
    success: true,
    message: 'Card played successfully',
    data: { playerId }
  };
}

registerAction('playCard', { run });