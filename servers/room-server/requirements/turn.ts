import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext): ActionResult {
  const { gameStateMap, playerId } = context;

  console.log(`🎯 Requirement: Checking if it's player ${playerId}'s turn`);

  const currentPlayerId = gameStateMap.get('currentPlayerId') as string;

  if (currentPlayerId === playerId) {
    console.log(`✅ Requirement: It is player ${playerId}'s turn`);
    return { success: true, message: 'Turn requirement met' };
  } else {
    console.log(`❌ Requirement: It is not player ${playerId}'s turn (current: ${currentPlayerId})`);
    return { success: false, message: 'Not your turn' };
  }
}

registerRequirement('turn', { run });