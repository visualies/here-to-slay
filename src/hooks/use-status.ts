import { useGameState } from './use-game-state';
import { useDice } from '../contexts/dice-context';
import { getConnectedPlayersCount } from '../lib/presence';

export type GameStatus = 
  | 'waiting-to-start'
  | 'waiting-for-turn'
  | 'your-turn'
  | 'dice-rolling'
  | 'dice-capture'
  | 'dice-results'
  | 'game-ended';

export function useStatus(): GameStatus {
  const { gamePhase, currentTurn, currentPlayer, players } = useGameState();
  const { enabled: diceEnabled, stable: diceStable, hasRolled } = useDice();
  
  // Get connected players count
  const connectedPlayersCount = getConnectedPlayersCount(players);
  
  // Game hasn't started yet
  if (gamePhase === 'waiting') {
    return 'waiting-to-start';
  }
  
  // Game has ended
  if (gamePhase === 'ended') {
    return 'game-ended';
  }
  
  // Game is playing - determine current state
  if (gamePhase === 'playing') {
    const isMyTurn = currentPlayer?.id === currentTurn;
    
    // Dice are enabled - determine dice state
    if (diceEnabled) {
      // Rolling: dice are not stable
      if (!diceStable) {
        return 'dice-rolling';
      }
      
      // Waiting: hasRolled is false and dice are stable (waiting for user to throw)
      if (!hasRolled && diceStable) {
        return 'dice-capture';
      }
      
      // Stable: hasRolled is true and dice are stable (dice have been thrown and settled)
      if (hasRolled && diceStable) {
        return 'dice-results';
      }
    }
    
    // It's my turn
    if (isMyTurn) {
      return 'your-turn';
    }
    
    // It's someone else's turn
    return 'waiting-for-turn';
  }
  
  // Default fallback - show dice results
  return 'dice-results';
}
