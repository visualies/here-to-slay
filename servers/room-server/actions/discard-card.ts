import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🗑️ Internal: Discarding card for player ${playerId}`);

  // TODO: Implement card discard logic
  console.log('Card discard action executed');

  return {
    success: true,
    message: 'Card discarded successfully',
    data: { playerId }
  };
}

registerAction('discardCard', { run });