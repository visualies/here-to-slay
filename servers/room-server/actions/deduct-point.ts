import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`➖ Internal: Deducting point for player ${playerId}`);

  // TODO: Implement point deduction logic
  console.log('Point deduction action executed');

  return {
    success: true,
    message: 'Point deducted successfully',
    data: { playerId }
  };
}

registerAction('deductPoint', { run });