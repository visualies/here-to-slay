import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`💥 Internal: Destroying card for player ${playerId}`);

  // TODO: Implement card destruction logic
  console.log('Card destroy action executed');

  return {
    success: true,
    message: 'Card destroyed successfully',
    data: { playerId }
  };
}

registerAction('destroyCard', { run });