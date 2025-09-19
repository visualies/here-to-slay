import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';
import { setStatus, clearStatus } from '../lib/status-service';
import { createGameContext } from '../lib/game-context';

export function run(context: ActionContext): ActionResult {
  const { gameStateMap, playerId, roomId } = context;

  // Create game context for service calls
  const gameContext = createGameContext(roomId, playerId);

  // Set status when action starts
  setStatus(gameContext, 'captureDice', 'Waiting for dice to be thrown...');

  console.log(`🎯 Internal: Capturing dice for player ${playerId}`);

  // TODO: Implement dice capture logic
  console.log('Dice capture action executed');

  // Clear status when action completes successfully
  clearStatus(gameContext);

  return {
    success: true,
    message: 'Dice captured successfully',
    data: { playerId }
  };
}

registerAction('captureDice', { run });
