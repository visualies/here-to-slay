import type { Player, Card } from '../types';
import * as Y from 'yjs';
import { createDeck, dealHand } from '../game/deck';
import { getRandomPartyLeader, getAllPartyLeaders } from '../game/party-leaders';

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

export function updatePlayerPresence(playersMap: Y.Map<Player>, playerId: string): void {
  const currentPlayer = playersMap.get(playerId);
  if (currentPlayer) {
    playersMap.set(playerId, {
      ...currentPlayer,
      lastSeen: Date.now(),
      // Keep original joinTime unchanged
      joinTime: currentPlayer.joinTime
    });
  }
}

export function addCardToPlayerHand(
  playersMap: Y.Map<Player>,
  playerId: string,
  card: Card
): void {
  const player = playersMap.get(playerId);
  if (player) {
    playersMap.set(playerId, {
      ...player,
      hand: [...player.hand, card]
    });
  }
}

export function dealCardsToPlayer(
  playersMap: Y.Map<Player>,
  playerId: string,
  handSize: number = 5
): void {
  const player = playersMap.get(playerId);
  if (!player) return;

  const deck = createDeck();
  const { hand } = dealHand(deck, handSize);

  const gamePlayer: Player = {
    ...player,
    hand,
    deck: deck.slice(handSize),
    party: player.party || { leader: null, heroes: [] },
    actionPoints: player.actionPoints || 0
  };

  playersMap.set(playerId, gamePlayer);
}

export function assignPartyLeaderToPlayer(
  playersMap: Y.Map<Player>,
  playerId: string,
  partyLeader?: Card
): void {
  const player = playersMap.get(playerId);
  if (!player) return;

  const leader = partyLeader || getRandomPartyLeader();
  
  const updatedPlayer: Player = {
    ...player,
    party: {
      heroes: [],
      ...(player.party || {}),
      leader
    }
  };

  playersMap.set(playerId, updatedPlayer);
}

export function assignRandomPartyLeadersToAllPlayers(playersMap: Y.Map<Player>): void {
  const players = Array.from(playersMap.keys());
  
  const allPartyLeaders = getAllPartyLeaders();
  const shuffledLeaders = [...allPartyLeaders].sort(() => 0.5 - Math.random());
  
  if (players.length > shuffledLeaders.length) {
    console.warn(`Not enough party leaders for all players.`);
  }
  
  players.forEach((playerId, index) => {
    if (index < shuffledLeaders.length) {
      const partyLeader = shuffledLeaders[index];
      assignPartyLeaderToPlayer(playersMap, playerId, partyLeader);
    }
  });
}