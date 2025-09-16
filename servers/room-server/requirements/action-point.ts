import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext, ...args: unknown[]): ActionResult {
  const { playersMap, playerId } = context;
  const requiredPoints = (args[0] as number) || 1;

  console.log(`🎯 Requirement: Checking if player ${playerId} has ${requiredPoints} action points`);

  const player = playersMap.get(playerId) as any;
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const currentActionPoints = player.actionPoints || 0;

  if (currentActionPoints >= requiredPoints) {
    console.log(`✅ Requirement: Player ${playerId} has ${currentActionPoints} action points (need ${requiredPoints})`);
    return { success: true, message: `Action point requirement met (${currentActionPoints}/${requiredPoints})` };
  } else {
    console.log(`❌ Requirement: Player ${playerId} has only ${currentActionPoints} action points (need ${requiredPoints})`);
    return { success: false, message: `Need ${requiredPoints} action points, have ${currentActionPoints}` };
  }
}

registerRequirement('actionPoint', { run });