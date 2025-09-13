import type { Player } from '../types';

export function getActivePlayers(players: Player[]): Player[] {
  return players.filter(p => Date.now() - p.lastSeen < 30000);
}

export function getSortedPlayersByJoinTime(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.joinTime - b.joinTime);
}

export function isHost(players: Player[], playerId: string): boolean {
  if (players.length === 0) return false;
  const sortedPlayers = getSortedPlayersByJoinTime(players);
  return sortedPlayers[0]?.id === playerId;
}

export function getCurrentPlayer(players: Player[], playerId: string): Player | null {
  return players.find(p => p.id === playerId) || null;
}

export function getOtherPlayers(players: Player[], playerId: string): Player[] {
  return players.filter(p => p.id !== playerId);
}