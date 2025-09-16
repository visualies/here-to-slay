import type { ActionContext, ActionResult, ActionParams } from '../../../shared/types';
import { Location, Amount, SelectionMode } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam } from './action-utils';
import { moveCard } from '../lib/card-service';

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const target = getParam<Location>(params, 'target');
  const destination = getParam<Location>(params, 'destination');
  const amount = getParam<Amount>(params, 'amount');
  const selection = SelectionMode.First;

  return moveCard(context, target, destination, amount, selection);
}

registerAction('drawCard', { run });