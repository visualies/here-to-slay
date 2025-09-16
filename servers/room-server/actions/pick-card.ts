import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Picking card for player ${playerId}`);

  // TODO: Implement card picking logic
  console.log('Card pick action executed');

  return {
    success: true,
    message: 'Card picked successfully',
    data: { playerId }
  };
}

registerAction('pickCard', { run });