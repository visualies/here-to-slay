import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext): ActionResult {
  const { gameStateMap, playerId } = context;

  console.log(`🎯 Requirement: Checking if action queue is empty for player ${playerId}`);

  const actionQueue = gameStateMap.get('actionQueue') as unknown[];
  const isEmpty = !actionQueue || actionQueue.length === 0;

  if (isEmpty) {
    console.log(`✅ Requirement: Action queue is empty for player ${playerId}`);
    return { success: true, message: 'Empty queue requirement met' };
  } else {
    console.log(`❌ Requirement: Action queue is not empty for player ${playerId} (${actionQueue.length} items)`);
    return { success: false, message: 'Action queue must be empty' };
  }
}

registerRequirement('emptyQueue', { run });