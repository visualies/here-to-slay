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
  const { initializeGame, addPlayerToGame, isHost } = useRoom();
  
  return {
    initializeGame,
    addPlayerToGame,
    isHost
  };
}

// Hook for player presence
export function usePlayerPresence() {
  const { connectedPlayers, connectedPlayersCount, isConnected, updateCursor } = useRoom();
  
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