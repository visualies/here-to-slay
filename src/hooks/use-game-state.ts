"use client";

import { useRoom } from '../contexts/room-context';

// Hook for game state data
export function useGameState() {
  const { players, gamePhase, currentTurn, supportStack, currentPlayer, otherPlayers } = useRoom();
  
  return {
    players,
    gamePhase, 
    currentTurn,
    supportStack,
    currentPlayer,
    otherPlayers
  };
}

// Hook for game actions
export function useGameActions() {
  const { initializeGame, addPlayerToGame, isHost, gameActions } = useRoom();
  
  return {
    initializeGame,
    addPlayerToGame,
    isHost,
    ...gameActions
  };
}

// Hook for player presence
export function usePlayerPresence() {
  const { players, isConnected, updateCursor } = useRoom();
  
  // Filter active players (connected within last 30 seconds)
  const connectedPlayers = players.filter(p => Date.now() - p.lastSeen < 30000);
  const connectedPlayersCount = connectedPlayers.length;
  
  return {
    connectedPlayers,
    connectedPlayersCount,
    isConnected,
    updateCursor
  };
}

// Hook for server dice manager
export function useServerDice() {
  const { serverDiceManager } = useRoom();
  
  return {
    serverDiceManager
  };
}