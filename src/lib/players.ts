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

export function updatePlayerPresence(playersMap: Y.Map<unknown>, playerId: string): void {
  const currentPlayer = playersMap.get(playerId) as Player | undefined;
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
  playersMap: Y.Map<unknown>,
  playerId: string,
  card: Card
): void {
  const player = playersMap.get(playerId) as Player | undefined;
  if (player) {
    const updatedPlayer = {
      ...player,
      hand: [...player.hand, card]
    };

    playersMap.set(playerId, updatedPlayer);
  }
}

export function removeCardFromPlayerHand(
  playersMap: Y.Map<unknown>,
  playerId: string,
  cardId: string
): { updatedPlayer: Player | undefined; cardIndex: number } {
  const player = playersMap.get(playerId) as Player | undefined;
  if (!player) {
    return { updatedPlayer: undefined, cardIndex: -1 };
  }

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    return { updatedPlayer: player, cardIndex: -1 };
  }

  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  const updatedPlayer = {
    ...player,
    hand: newHand
  };

  playersMap.set(playerId, updatedPlayer);
  return { updatedPlayer, cardIndex };
}

export function addHeroToParty(
  playersMap: Y.Map<unknown>,
  playerId: string,
  heroCard: Card
): boolean {
  const player = playersMap.get(playerId) as Player | undefined;
  if (!player || !player.party) {
    return false;
  }

  // Assuming a party size limit, e.g., 3 heroes
  if (player.party.heroes.length >= 3) {
    return false;
  }

  const updatedPlayer = {
    ...player,
    party: {
      ...player.party,
      heroes: [...player.party.heroes, heroCard]
    }
  };

  playersMap.set(playerId, updatedPlayer);
  return true;
}

export function dealCardsToPlayer(
  playersMap: Y.Map<unknown>,
  playerId: string,
  handSize: number = 5
): void {
  const player = playersMap.get(playerId) as Player | undefined;
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
  playersMap: Y.Map<unknown>,
  playerId: string,
  partyLeader?: Card
): void {
  const player = playersMap.get(playerId) as Player | undefined;
  if (!player) return;

  const leader = partyLeader || getRandomPartyLeader();
  
  const updatedPlayer: Player = {
    ...player,
    party: {
      ...(player.party || {}),
      heroes: player.party?.heroes || [],
      leader
    }
  };

  playersMap.set(playerId, updatedPlayer);
}

export function assignRandomPartyLeadersToAllPlayers(playersMap: Y.Map<unknown>): void {
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