import { useGameState } from './use-game-state';
import { useRoom } from './use-room';
import { useDice } from './use-dice';
import { useContext } from 'react';
import { StatusContext } from '../contexts/status-context';
import * as Y from 'yjs';

export interface GameStatus {
  key: string;            // Action name or status key (e.g., 'placeCard', 'waiting-to-start')
  message: string;        // Display message for center game board
  timeout?: number;       // Duration in milliseconds, optional
  timeoutAt?: number;     // Timestamp when status expires (ms since epoch)
  timeRemaining?: number; // Calculated time remaining in milliseconds
}

interface StatusReturn {
  status: GameStatus;
  message: {
    id: string;
    message: string;
    type: 'error' | 'warning' | 'success' | 'info';
  } | null;
  showMessage: (message: string, type?: 'error' | 'warning' | 'success' | 'info', duration?: number) => void;
}

export function useStatus(): StatusReturn {
  const { phase, currentTurn, currentPlayer } = useGameState();
  const { gameStateRef } = useRoom();
  const { enabled: diceEnabled } = useDice();
  const statusContext = useContext(StatusContext);

  let gameStatus: GameStatus;

  // Get status from gameStateRef (set by actions via status service)
  const serverStatus = (gameStateRef as Y.Map<unknown>)?.get('gameStatus') as GameStatus | undefined;

  if (serverStatus) {
    // Calculate time remaining if there's a timeout
    const timeRemaining = serverStatus.timeoutAt
      ? Math.max(0, serverStatus.timeoutAt - Date.now())
      : undefined;

    gameStatus = {
      ...serverStatus,
      timeRemaining
    };
  }
  // Fallback to basic game states when no action is running
  else if (phase === 'waiting') {
    gameStatus = {
      key: 'waiting-to-start',
      message: 'Waiting for players to join...'
    };
  }
  else if (phase === 'ended') {
    gameStatus = {
      key: 'game-ended',
      message: 'Game has ended'
    };
  }
  // Simplified dice handling - just show capture when enabled
  else if (diceEnabled) {
    gameStatus = {
      key: 'capture-dice',
      message: 'Click and drag to throw dice'
    };
  }
  // Default playing state
  else if (phase === 'playing') {
    const isMyTurn = currentPlayer?.id === currentTurn;

    if (isMyTurn) {
      gameStatus = {
        key: 'your-turn',
        message: 'Your turn - choose an action'
      };
    } else {
      gameStatus = {
        key: 'waiting-for-turn',
        message: 'Waiting for other players...'
      };
    }
  }
  // Default fallback
  else {
    gameStatus = {
      key: 'waiting',
      message: 'Loading...'
    };
  }

  return {
    status: gameStatus,
    message: statusContext?.currentMessage || null,
    showMessage: statusContext?.showMessage || (() => {})
  };
}
