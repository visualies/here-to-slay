"use client";

import { useRoom } from '../contexts/room-context';
import { getConnectedPlayers } from '../lib/presence';

// Hook for player presence
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
