import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerRequirement } from './requirement-registry';

export function run(context: ActionContext, requiredClass: string): ActionResult {
  const { playersMap, playerId } = context;

  console.log(`🎯 Requirement: Checking hero class ${requiredClass} for player ${playerId}`);

  const player = playersMap.get(playerId);
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  // Check if player has a hero of the required class
  const hasRequiredClass = player.party.some(card =>
    card.type === 'hero' && card.heroClass === requiredClass
  );

  if (hasRequiredClass) {
    console.log(`✅ Requirement: Player ${playerId} has hero of class ${requiredClass}`);
    return { success: true, message: `Hero class ${requiredClass} requirement met` };
  } else {
    console.log(`❌ Requirement: Player ${playerId} missing hero of class ${requiredClass}`);
    return { success: false, message: `Missing hero of class ${requiredClass}` };
  }
}

registerRequirement('heroClass', { run });