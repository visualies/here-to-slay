"use client";

import { useRoom } from './use-room';

// Hook for game state data
export function useGameState() {
  const { 
    players, 
    gamePhase, 
    currentTurn, 
    supportStack, 
    monsters, 
    currentPlayer, 
    otherPlayers,
    initializeGame,
    isHost 
  } = useRoom();
  
  return {
    players,
    gamePhase, 
    currentTurn,
    supportStack,
    monsters,
    currentPlayer,
    otherPlayers,
    initializeGame,
    isHost
  };
}

