import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🔚 Internal: Ending turn for player ${playerId}`);

  // TODO: Implement turn ending logic
  console.log('End turn action executed');

  return {
    success: true,
    message: 'Turn ended successfully',
    data: { playerId }
  };
}

registerAction('endTurn', { run });