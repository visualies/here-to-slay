import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`⚡ Internal: Sacrificing card for player ${playerId}`);

  // TODO: Implement card sacrifice logic
  console.log('Card sacrifice action executed');

  return {
    success: true,
    message: 'Card sacrificed successfully',
    data: { playerId }
  };
}

registerAction('sacrificeCard', { run });