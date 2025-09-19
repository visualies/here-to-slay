import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Capturing challenge for player ${playerId}`);
  console.log('capturing challenges');

  return {
    success: false,
    message: 'Waiting for user to select challenge',
    waitingForInput: {
      type: 'choice',
      prompt: 'Anyone challenging?',
      timeoutMs: 30000,
      requiredPlayerId: playerId
    }
  };
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Challenge callback for player ${playerId}`);
  console.log('Challenge cards received:', userInput);

  // Process the list of challenge cards
  return {
    success: true,
    message: 'Challenge captured successfully',
    data: {
      playerId,
      challengeCards: userInput
    }
  };
}

registerAction('captureChallenge', { run, callback });
