import type { ActionContext, ActionResult } from './action-service';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Capturing modifier for player ${playerId}`);

  // TODO: Implement modifier capture logic
  console.log('Modifier capture action executed');

  return {
    success: true,
    message: 'Modifier captured successfully',
    data: { playerId }
  };
}

registerAction('captureModifier', { run });
