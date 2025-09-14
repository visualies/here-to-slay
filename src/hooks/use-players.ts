"use client";

import { useRoom } from '../contexts/room-context';
import { getActivePlayers } from '../lib/players';
import { getConnectedPlayers } from '../lib/presence';

export function usePlayers() {
  const { players } = useRoom();
  
  return {
    players,
    activePlayers: getActivePlayers(players),
    connectedPlayers: getConnectedPlayers(players)
  };
}

export function useCurrentPlayer() {
  const { players, currentPlayer } = useRoom();
  
  return {
    currentPlayer,
    otherPlayers: players.filter(p => p.id !== currentPlayer?.id)
  };
}

export function useHostStatus() {
  const room = useRoom();
  const { players } = room;
  
  return {
    isHost: room.isHost,
    hostPlayer: players.length > 0 ? players.sort((a, b) => a.joinTime - b.joinTime)[0] : null
  };
}