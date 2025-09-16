import type { ActionContext, ActionResult, ActionParams } from '../../../shared/types';
import { Location, Amount } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam } from './action-utils';
import { moveCard } from '../lib/card-service';

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  // Get parameters using the existing utility
  const target = getParam<Location>(params, 'target');
  const destination = getParam<Location>(params, 'destination');
  const amount = getParam<Amount>(params, 'amount');

  // Delegate to the moveCard method in card-service with simplified parameters
  return moveCard(context, target, destination, amount);
}

registerAction('drawCard', { run });