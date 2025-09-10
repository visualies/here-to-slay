import { useGameState } from './use-game-state';
import { useDice } from '../contexts/dice-context';
import { getConnectedPlayersCount } from '../lib/presence';
import { useContext } from 'react';
import { StatusContext } from '../contexts/status-context';

export type GameStatus = 
  | 'waiting-to-start'
  | 'waiting-for-turn'
  | 'your-turn'
  | 'dice-rolling'
  | 'dice-capture'
  | 'dice-results'
  | 'game-ended';

interface StatusReturn {
  status: GameStatus;
  message: any; // current message from StatusContext
  showMessage: (message: string, type?: 'error' | 'warning' | 'success' | 'info', duration?: number) => void;
}

export function useStatus(): StatusReturn {
  const { gamePhase, currentTurn, currentPlayer, players } = useGameState();
  const { enabled: diceEnabled, stable: diceStable, hasRolled, captureStatus } = useDice();
  const statusContext = useContext(StatusContext);
  
  // Get connected players count
  const connectedPlayersCount = getConnectedPlayersCount(players);
  
  let gameStatus: GameStatus;
  
  // Game hasn't started yet
  if (gamePhase === 'waiting') {
    gameStatus = 'waiting-to-start';
  }
  // Game has ended
  else if (gamePhase === 'ended') {
    gameStatus = 'game-ended';
  }
  
  // Game is playing - determine current state
  else if (gamePhase === 'playing') {
    const isMyTurn = currentPlayer?.id === currentTurn;
    
    // Dice are enabled - determine dice state
    if (diceEnabled) {
      // Rolling: dice are not stable
      if (!diceStable) {
        gameStatus = 'dice-rolling';
      }
      // Waiting: hasRolled is false and dice are stable (waiting for user to throw)
      else if (!hasRolled && diceStable) {
        gameStatus = 'dice-capture';
      }
      // Stable: hasRolled is true and dice are stable (dice have been thrown and settled)
      else if (hasRolled && diceStable) {
        gameStatus = 'dice-results';
      } else {
        gameStatus = 'dice-results';
      }
    }
    // It's my turn
    else if (isMyTurn) {
      gameStatus = 'your-turn';
    }
    // It's someone else's turn
    else {
      gameStatus = 'waiting-for-turn';
    }
  }
  // Default fallback - show dice results
  else {
    gameStatus = 'dice-results';
  }

  return {
    status: gameStatus,
    message: statusContext?.currentMessage || null,
    showMessage: statusContext?.showMessage || (() => {})
  };
}
