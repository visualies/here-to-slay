import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🥷 Internal: Stealing card for player ${playerId}`);

  // TODO: Implement card stealing logic
  console.log('Card steal action executed');

  return {
    success: true,
    message: 'Card stolen successfully',
    data: { playerId }
  };
}

registerAction('stealCard', { run });