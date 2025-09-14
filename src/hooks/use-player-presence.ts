"use client";

import { useRoom } from './use-room';
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
