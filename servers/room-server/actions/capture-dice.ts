import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Capturing dice for player ${playerId}`);

  // TODO: Implement dice capture logic
  console.log('Dice capture action executed');

  return {
    success: true,
    message: 'Dice captured successfully',
    data: { playerId }
  };
}

registerAction('captureDice', { run });
