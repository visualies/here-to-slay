"use client";

import { useRoom } from '../contexts/room-context';
import { getConnectedPlayers, getConnectedPlayersCount } from '../lib/presence';

export function usePresence() {
  const { players, isConnected, updateCursor } = useRoom();
  
  const connectedPlayers = getConnectedPlayers(players);
  const connectedCount = getConnectedPlayersCount(players);
  
  return {
    connectedPlayers,
    connectedCount,
    totalPlayers: players.length,
    isConnected,
    updateCursor,
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  };
}

export function usePlayerPresence(playerId: string) {
  const { players } = useRoom();
  
  const player = players.find(p => p.id === playerId);
  const isOnline = player ? (Date.now() - player.lastSeen < 30000) : false;
  const lastSeenAt = player?.lastSeen ? new Date(player.lastSeen) : null;
  
  return {
    player,
    isOnline,
    lastSeenAt,
    timeSinceLastSeen: player ? Date.now() - player.lastSeen : null
  };
}