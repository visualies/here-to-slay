import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Capturing challenge for player ${playerId}`);

  // TODO: Implement challenge capture logic
  console.log('Challenge capture action executed');

  return {
    success: true,
    message: 'Challenge captured successfully',
    data: { playerId }
  };
}

registerAction('captureChallenge', { run });
