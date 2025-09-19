import type { ActionContext, ActionResult } from '../../../shared/types';
import { StatusKey } from '../../../shared/types';
import { registerAction } from './action-registry';
import { setStatus } from '../lib/status-service';
import { createGameContext } from '../lib/game-context';

// Challenge timeout from environment or 7 seconds default
const CHALLENGE_TIMEOUT_MS = parseInt(process.env.CHALLENGE_TIMEOUT_MS || '7000');

export function run(context: ActionContext): ActionResult {
  const { playerId, roomId } = context;

  // Create game context for service calls
  const gameContext = createGameContext(roomId, playerId);

  // Set status when action starts
  setStatus(gameContext, StatusKey.CAPTURE_CHALLENGE, 'Anyone challenging?', true, CHALLENGE_TIMEOUT_MS);

  console.log(`🎯 Internal: Capturing challenge for player ${playerId}`);
  console.log('capturing challenges');

  return {
    success: false,
    message: 'Waiting for user to select challenge',
    waitingForInput: {
      type: 'choice',
      prompt: 'Anyone challenging?',
      timeoutMs: CHALLENGE_TIMEOUT_MS,
      requiredPlayerId: playerId
    }
  };
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  const { playerId, roomId } = context;

  console.log(`🎯 Internal: Challenge callback for player ${playerId}`);
  console.log('Challenge cards received:', userInput);

  // Process the list of challenge cards (empty array means no challenges)
  return {
    success: true,
    message: userInput.length > 0 ? 'Challenge captured successfully' : 'No challenges received, continuing...',
    data: {
      playerId,
      challengeCards: userInput
    }
  };
}

registerAction('captureChallenge', { run, callback });
