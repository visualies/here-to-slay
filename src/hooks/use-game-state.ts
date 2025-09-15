"use client";

import { useRoom } from './use-room';

// Hook for game state data
export function useGameState() {
  const { 
    players, 
    phase, 
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
    phase, 
    currentTurn,
    supportStack,
    monsters,
    currentPlayer,
    otherPlayers,
    initializeGame,
    isHost
  };
}

