import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';
import type { Card } from '../../../shared/types';

export function run(context: ActionContext, monsterId: string, diceResult: number): ActionResult {
  const { gameStateMap, playerId } = context;

  console.log(`🎯 Internal: Attacking monster ${monsterId} for player ${playerId} with dice result ${diceResult}`);

  const monsters = gameStateMap.get('monsters') as Card[];
  const monster = monsters?.find(m => m.id === monsterId);

  if (!monster) {
    return { success: false, message: 'Monster not found' };
  }

  // Get the required roll from the Requirement object
  const requiredRoll = monster.requirement?.value || 15;
  const attackSuccess = diceResult >= requiredRoll;

  if (attackSuccess) {
    const newMonsters = monsters.filter(m => m.id !== monsterId);
    gameStateMap.set('monsters', newMonsters);

    console.log(`✅ Internal: Successfully defeated ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return {
      success: true,
      message: `Successfully defeated ${monster.name}! (rolled ${diceResult} vs ${requiredRoll})`
    };
  } else {
    console.log(`❌ Internal: Failed to defeat ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return {
      success: false,
      message: `Failed to defeat ${monster.name}. (rolled ${diceResult} vs ${requiredRoll})`
    };
  }
}

// Register the action
registerAction('attackMonster', { run });