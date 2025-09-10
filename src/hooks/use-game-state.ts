"use client";

import { useRoom } from '../contexts/room-context';
import { getConnectedPlayers } from '../lib/presence';

// Hook for game state data
export function useGameState() {
  const { players, gamePhase, currentTurn, supportStack, monsters, currentPlayer, otherPlayers } = useRoom();
  
  return {
    players,
    gamePhase, 
    currentTurn,
    supportStack,
    monsters,
    currentPlayer,
    otherPlayers
  };
}

// Hook for game actions (maintained for backward compatibility)
export function useGameActions() {
  const { initializeGame, addPlayerToGame, isHost, gameActions } = useRoom();
  
  return {
    initializeGame,
    addPlayerToGame,
    isHost,
    ...gameActions
  };
}

// Hook for player presence (maintained for backward compatibility)
export function usePlayerPresence() {
  const { players, isConnected, updateCursor } = useRoom();
  
  const connectedPlayers = getConnectedPlayers(players);
  const connectedPlayersCount = connectedPlayers.length;
  
  return {
    connectedPlayers,
    connectedPlayersCount,
    isConnected,
    updateCursor
  };
}

