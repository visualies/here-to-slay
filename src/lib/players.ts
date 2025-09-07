import * as Y from 'yjs';
import type { Player, Card } from '../types';
import { createDeck, dealHand } from '../game/deck';

export function addPlayerToRoom(
  playersMap: Y.Map<Player>,
  playerId: string,
  playerName: string,
  playerColor: string
): void {
  const joinTime = Date.now();
  const existingPlayer = playersMap.get(playerId);

  if (existingPlayer) {
    console.log('Player already exists, updating info:', existingPlayer.name);
    const updatedPlayer: Player = {
      ...existingPlayer,
      name: playerName,
      color: playerColor,
      lastSeen: joinTime
    };
    playersMap.set(playerId, updatedPlayer);
  } else {
    console.log('Creating new player');
    const initialPlayer: Player = {
      id: playerId,
      name: playerName,
      color: playerColor,
      lastSeen: joinTime,
      joinTime: joinTime,
      hand: [],
      deck: [],
      party: {
        leader: null,
        heroes: [null, null, null, null, null, null]
      },
      actionPoints: 0
    };
    playersMap.set(playerId, initialPlayer);
  }
}

export function updatePlayerPresence(
  playersMap: Y.Map<Player>,
  playerId: string
): void {
  const currentPlayer = playersMap.get(playerId);
  if (currentPlayer) {
    playersMap.set(playerId, {
      ...currentPlayer,
      lastSeen: Date.now()
    });
  }
}

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

export function dealCardsToPlayer(
  playersMap: Y.Map<Player>,
  playerId: string,
  handSize: number = 5,
  deckSize: number = 10
): void {
  const player = playersMap.get(playerId);
  if (!player) return;

  const deck = createDeck();
  const { hand } = dealHand(deck, handSize);
  const { hand: playerDeck } = dealHand(deck.slice(handSize), deckSize);

  const gamePlayer: Player = {
    ...player,
    hand,
    deck: playerDeck,
    party: { leader: null, heroes: [null, null, null, null, null, null] },
    actionPoints: 0
  };

  playersMap.set(playerId, gamePlayer);
}

export function getCurrentPlayer(players: Player[], playerId: string): Player | null {
  return players.find(p => p.id === playerId) || null;
}

export function getOtherPlayers(players: Player[], playerId: string): Player[] {
  return players.filter(p => p.id !== playerId);
}

export function updatePlayerActionPoints(
  playersMap: Y.Map<Player>,
  playerId: string,
  actionPoints: number
): void {
  const player = playersMap.get(playerId);
  if (player) {
    playersMap.set(playerId, { ...player, actionPoints });
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

export function removeCardFromPlayerHand(
  playersMap: Y.Map<Player>,
  playerId: string,
  cardId: string
): { updatedPlayer: Player | null; cardIndex: number } {
  const player = playersMap.get(playerId);
  if (!player) return { updatedPlayer: null, cardIndex: -1 };

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return { updatedPlayer: null, cardIndex: -1 };

  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  const updatedPlayer: Player = {
    ...player,
    hand: newHand
  };

  playersMap.set(playerId, updatedPlayer);
  return { updatedPlayer, cardIndex };
}

export function addHeroToParty(
  playersMap: Y.Map<Player>,
  playerId: string,
  hero: Card
): boolean {
  const player = playersMap.get(playerId);
  if (!player) return false;

  const partySlotIndex = player.party.heroes.findIndex(h => h === null);
  if (partySlotIndex === -1) return false;

  const newPartyHeroes = [...player.party.heroes];
  newPartyHeroes[partySlotIndex] = hero;

  const updatedPlayer: Player = {
    ...player,
    party: { ...player.party, heroes: newPartyHeroes }
  };

  playersMap.set(playerId, updatedPlayer);
  return true;
}