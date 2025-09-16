import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🏁 Internal: Ending move for player ${playerId}`);

  // TODO: Implement move ending logic
  console.log('End move action executed');

  return {
    success: true,
    message: 'Move ended successfully',
    data: { playerId }
  };
}

registerAction('endMove', { run });