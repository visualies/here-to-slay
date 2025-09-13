import type { ActionContext, ActionResult } from '../services/action-service';
import { registerAction } from '../services/action-registry';
import type { Card } from '../types';

export function run(context: ActionContext, monsterId: string, diceResult: number): ActionResult {
  const { gameStateMap, playerId } = context;

  console.log(`🎯 Internal: Attacking monster ${monsterId} for player ${playerId} with dice result ${diceResult}`);

  const monsters = gameStateMap.get('monsters') as Card[];
  const monster = monsters?.find(m => m.id === monsterId);

  if (!monster) {
    return { success: false, message: 'Monster not found' };
  }

  const requiredRoll = monster.rollRequirement || 15;
  const attackSuccess = diceResult >= requiredRoll;

  if (attackSuccess) {
    const newMonsters = monsters.filter(m => m.id !== monsterId);
    gameStateMap.set('monsters', newMonsters);

    console.log(`✅ Internal: Successfully defeated ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return {
      success: true,
      message: `Defeated ${monster.name}! (Rolled ${diceResult})`,
      data: { monster, diceResult, requiredRoll }
    };
  } else {
    console.log(`❌ Internal: Failed to defeat ${monster.name} (rolled ${diceResult} vs ${requiredRoll})`);
    return {
      success: false,
      message: `Attack failed! Rolled ${diceResult}, needed ${requiredRoll}`,
      data: { monster, diceResult, requiredRoll }
    };
  }
}

registerAction('attackMonster', { run });