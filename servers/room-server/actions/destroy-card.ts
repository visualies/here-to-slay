import type { ActionContext, ActionResult, ActionParams } from '../../../shared/types';
import { Location, Amount } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam } from './action-utils';

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const { playerId } = context;

  const target = getParam<Location>(params, 'target');
  const amount = getParam<Amount>(params, 'amount');


  console.log(`💥 Internal: Destroying ${amount} cards from ${target} for player ${playerId}`);

  // TODO: Implement card destruction logic based on target and amount
  console.log('Card destroy action executed');

  return {
    success: true,
    message: `Destroyed ${amount} card(s) from ${target}`,
    data: { playerId, target, amount }
  };
}

registerAction('destroyCard', { run });