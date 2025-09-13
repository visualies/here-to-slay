import * as Y from 'yjs';
import type { Player } from '../../../src/types';
import {
  dealCardsToPlayer,
  assignRandomPartyLeadersToAllPlayers,
  assignPartyLeaderToPlayer,
} from '../../../src/lib/players';
import { getActivePlayers, getSortedPlayersByJoinTime } from '../../../src/lib/players';
import { createSupportStack } from '../../../src/game/deck';
import { getAllMonsters } from '../../../src/game/monsters';
import { gameServerAPI } from '../../../src/lib/game-server-api';

export function initializeGame(
  playersMap: Y.Map<Player>,
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

  gameStateMap.set('currentTurn', firstPlayerId);
  gameStateMap.set('supportStack', createSupportStack());
  gameStateMap.set('monsters', selectedMonsters);
  gameStateMap.set('phase', 'playing');
}

export function advanceTurn(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  players: Player[],
  currentTurn: string,
  roomId: string
): void {
  const activePlayers = getActivePlayers(players);
  const sortedPlayers = getSortedPlayersByJoinTime(activePlayers);
  const currentPlayerIndex = sortedPlayers.findIndex(p => p.id === currentTurn);
  const nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
  const nextPlayer = sortedPlayers[nextPlayerIndex];

  const currentPlayer = playersMap.get(currentTurn);
  if (currentPlayer) {
    playersMap.set(currentTurn, { ...currentPlayer, actionPoints: 0 });
  }

  if (nextPlayer) {
    const nextPlayerDoc = playersMap.get(nextPlayer.id);
    if (nextPlayerDoc) {
      playersMap.set(nextPlayer.id, { ...nextPlayerDoc, actionPoints: 3 });
    }
    gameStateMap.set('currentTurn', nextPlayer.id);
    gameServerAPI.saveGame(roomId);
  }
}

export function addPlayerToGame(
  playersMap: Y.Map<Player>,
  players: Player[],
  playerIdToAdd: string
): void {
  const existingPlayer = playersMap.get(playerIdToAdd);
  if (existingPlayer && existingPlayer.hand && existingPlayer.hand.length > 0) {
    return;
  }

  dealCardsToPlayer(playersMap, playerIdToAdd, 5);
  assignPartyLeaderToPlayer(playersMap, playerIdToAdd);
}
