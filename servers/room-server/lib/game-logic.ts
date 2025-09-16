import * as Y from 'yjs';
import type { Player, Turn } from '../../../shared/types';
import {
  dealCardsToPlayer,
  assignRandomPartyLeadersToAllPlayers,
  assignPartyLeaderToPlayer,
} from '../../../src/lib/players';
import { getActivePlayers, getSortedPlayersByJoinTime } from '../../../src/lib/players';
import { createSupportStack } from '../../../src/game/deck';
import { getAllMonsters } from '../../../src/game/monsters';

export function initializeGame(
  playersMap: Y.Map<unknown>,
  gameStateMap: Y.Map<unknown>,
  players: Player[]
): void {
  const activePlayers = getActivePlayers(players);
  if (activePlayers.length === 0) {
    return;
  }

  const sortedPlayers = getSortedPlayersByJoinTime(activePlayers);

  sortedPlayers.forEach((player) => {
    dealCardsToPlayer(playersMap, player.id, 5);
  });

  assignRandomPartyLeadersToAllPlayers(playersMap);

  const allMonsters = getAllMonsters();
  const selectedMonsters = [...allMonsters].sort(() => 0.5 - Math.random()).slice(0, 3);

  const firstPlayerId = sortedPlayers[0].id;
  const firstPlayer = playersMap.get(firstPlayerId);
  if (firstPlayer) {
    playersMap.set(firstPlayerId, { ...firstPlayer, actionPoints: 3 });
  }

  // Create the initial turn object
  const initialTurn: Turn = {
    player_id: firstPlayerId,
    action_points: 3,
    played_cards: [],
    modifiers: [],
    action_queue: []
  };

  gameStateMap.set('currentTurn', initialTurn);
  gameStateMap.set('supportStack', createSupportStack());
  gameStateMap.set('monsters', selectedMonsters);
  gameStateMap.set('phase', 'playing');
}

export function advanceTurn(
  playersMap: Y.Map<unknown>,
  gameStateMap: Y.Map<unknown>,
  players: Player[],
  currentTurn: Turn
): void {
  const activePlayers = getActivePlayers(players);
  const sortedPlayers = getSortedPlayersByJoinTime(activePlayers);
  const currentPlayerIndex = sortedPlayers.findIndex(p => p.id === currentTurn.player_id);
  const nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
  const nextPlayer = sortedPlayers[nextPlayerIndex];

  const currentPlayer = playersMap.get(currentTurn.player_id);
  if (currentPlayer) {
    playersMap.set(currentTurn.player_id, { ...currentPlayer, actionPoints: 0 });
  }

  if (nextPlayer) {
    const nextPlayerDoc = playersMap.get(nextPlayer.id);
    if (nextPlayerDoc) {
      playersMap.set(nextPlayer.id, { ...nextPlayerDoc, actionPoints: 3 });
    }

    // Create new turn object for the next player
    const nextTurn: Turn = {
      player_id: nextPlayer.id,
      action_points: 3,
      played_cards: [],
      modifiers: [],
      action_queue: []
    };

    gameStateMap.set('currentTurn', nextTurn);
  }
}

export function addPlayerToGame(
  playersMap: Y.Map<unknown>,
  players: Player[],
  playerIdToAdd: string
): void {
  const existingPlayer = playersMap.get(playerIdToAdd) as Player;
  if (existingPlayer && existingPlayer.hand && existingPlayer.hand.length > 0) {
    return;
  }

  dealCardsToPlayer(playersMap, playerIdToAdd, 5);
  assignPartyLeaderToPlayer(playersMap, playerIdToAdd);
}
