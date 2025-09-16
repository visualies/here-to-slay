import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext, ...args: unknown[]): ActionResult {
  const { gameStateMap, playerId } = context;
  const actionName = args[0] as string;

  console.log(`🎯 Requirement: Checking if player ${playerId} is doing ${actionName} for the first time this turn`);

  const turnActions = gameStateMap.get(`turnActions_${playerId}`) as string[] || [];
  const hasPerformedAction = turnActions.includes(actionName);

  if (!hasPerformedAction) {
    console.log(`✅ Requirement: Player ${playerId} has not performed ${actionName} this turn`);
    return { success: true, message: `First time ${actionName} requirement met` };
  } else {
    console.log(`❌ Requirement: Player ${playerId} has already performed ${actionName} this turn`);
    return { success: false, message: `Can only perform ${actionName} once per turn` };
  }
}

registerRequirement('firstTime', { run });