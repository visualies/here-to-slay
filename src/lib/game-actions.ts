import * as Y from 'yjs';
import type { Player, Card } from '../types';
import { 
  removeCardFromPlayerHand, 
  addHeroToParty, 
  updatePlayerActionPoints,
  addCardToPlayerHand,
  getActivePlayers,
  getSortedPlayersByJoinTime,
  dealCardsToPlayer,
  assignRandomPartyLeadersToAllPlayers,
  assignPartyLeaderToPlayer
} from './players';
import { createSupportStack } from '../game/deck';
import { getAllMonsters } from '../game/monsters';

export function playCard(
  playersMap: Y.Map<Player>,
  players: Player[],
  playerId: string,
  cardId: string,
  onTurnAdvance: () => void
): boolean {
  const currentPlayer = playersMap.get(playerId);
  if (!currentPlayer || currentPlayer.actionPoints <= 0) return false;

  const { updatedPlayer, cardIndex } = removeCardFromPlayerHand(playersMap, playerId, cardId);
  if (!updatedPlayer || cardIndex === -1) return false;

  const card = currentPlayer.hand[cardIndex];
  if (card.type !== 'Hero') return false;

  const heroAdded = addHeroToParty(playersMap, playerId, card);
  if (!heroAdded) {
    // Restore card to hand if party is full
    addCardToPlayerHand(playersMap, playerId, card);
    return false;
  }

  const newActionPoints = updatedPlayer.actionPoints - 1;
  updatePlayerActionPoints(playersMap, playerId, newActionPoints);

  console.log('Card played - remaining action points:', newActionPoints);
  if (newActionPoints === 0) {
    console.log('No action points left, advancing turn...');
    onTurnAdvance();
  }

  return true;
}

export function drawCard(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  playerId: string,
  onTurnAdvance: () => void
): boolean {
  const currentPlayer = playersMap.get(playerId);
  if (!currentPlayer || currentPlayer.actionPoints <= 0) return false;

  const currentSupportStack = gameStateMap.get('supportStack') as Card[];
  if (!currentSupportStack || currentSupportStack.length === 0) return false;

  const newSupportStack = [...currentSupportStack];
  const drawnCard = newSupportStack.pop();
  if (!drawnCard) return false;

  addCardToPlayerHand(playersMap, playerId, drawnCard);
  
  const newActionPoints = currentPlayer.actionPoints - 1;
  updatePlayerActionPoints(playersMap, playerId, newActionPoints);

  gameStateMap.set('supportStack', newSupportStack);

  if (newActionPoints === 0) {
    onTurnAdvance();
  }

  return true;
}

export function advanceTurn(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  players: Player[],
  currentTurn: string
): void {
  console.log('=== ADVANCE TURN DEBUG ===');
  console.log('currentTurn:', currentTurn);
  console.log('players:', players.map(p => ({ id: p.id, name: p.name, actionPoints: p.actionPoints })));
  
  const currentPlayerIndex = players.findIndex(p => p.id === currentTurn);
  console.log('currentPlayerIndex:', currentPlayerIndex);
  
  if (currentPlayerIndex === -1) {
    console.warn('Current player not found in players array:', {
      currentTurn,
      playerIds: players.map(p => p.id)
    });
    return;
  }
  
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];
  
  console.log('Turn advance calculation:', {
    currentPlayerIndex,
    nextPlayerIndex,
    currentPlayerId: currentTurn,
    nextPlayerId: nextPlayer?.id,
    totalPlayers: players.length
  });
  
  const currentPlayerFromState = players[currentPlayerIndex];
  console.log('currentPlayerFromState:', currentPlayerFromState);
  
  if (currentPlayerFromState) {
    console.log('Setting current player action points to 0');
    updatePlayerActionPoints(playersMap, currentPlayerFromState.id, 0);
  }

  if (nextPlayer) {
    console.log('Setting next player action points to 3 and updating currentTurn');
    updatePlayerActionPoints(playersMap, nextPlayer.id, 3);
    gameStateMap.set('currentTurn', nextPlayer.id);
    console.log('Turn advanced to:', nextPlayer.name);
  } else {
    console.error('No next player found!');
  }
  console.log('=== END ADVANCE TURN DEBUG ===');
}

export function initializeGame(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  players: Player[]
): void {
  console.log('initializeGame: Starting game initialization');
  
  if (players.length < 1) {
    console.log('initializeGame: Not enough players', { players: players.length });
    return;
  }
  
  const activePlayers = getActivePlayers(players);
  console.log('initializeGame: Starting game with', activePlayers.length, 'active players out of', players.length, 'total');
  
  if (activePlayers.length < 1) {
    console.log('initializeGame: Not enough active players', { activePlayers: activePlayers.length });
    return;
  }
  
  const sortedPlayers = getSortedPlayersByJoinTime(activePlayers);
  console.log('initializeGame: Sorted active players:', sortedPlayers.map(p => ({ id: p.id, name: p.name, joinTime: p.joinTime })));
  
  // Deal cards to all active players
  sortedPlayers.forEach((player) => {
    console.log('Dealing cards to', player.name);
    dealCardsToPlayer(playersMap, player.id, 5, 10);
  });
  
  // Assign random party leaders to all players
  console.log('initializeGame: Assigning party leaders to all players');
  assignRandomPartyLeadersToAllPlayers(playersMap);
  
  // Assign 3 random monsters to the game
  const allMonsters = getAllMonsters();
  const selectedMonsters = [...allMonsters].sort(() => 0.5 - Math.random()).slice(0, 3);
  console.log('initializeGame: Assigning monsters:', selectedMonsters.map(m => m.name));
  
  // Set game metadata
  const firstPlayerId = sortedPlayers[0].id;
  updatePlayerActionPoints(playersMap, firstPlayerId, 3);
  gameStateMap.set('currentTurn', firstPlayerId);
  gameStateMap.set('supportStack', createSupportStack());
  gameStateMap.set('monsters', selectedMonsters);
  gameStateMap.set('phase', 'playing');
  
  console.log('initializeGame: Game metadata set:', {
    currentTurn: firstPlayerId,
    phase: 'playing',
    supportStackLength: createSupportStack().length
  });
  console.log('initializeGame: Game initialized successfully');
}

export function addPlayerToGame(
  playersMap: Y.Map<Player>,
  players: Player[],
  playerIdToAdd: string
): void {
  console.log('addPlayerToGame: Adding player to existing game');
  
  const existingPlayer = playersMap.get(playerIdToAdd);
  if (existingPlayer && existingPlayer.hand && existingPlayer.hand.length > 0) {
    console.log('addPlayerToGame: Player already has game data');
    return;
  }

  const playerPresence = players.find(p => p.id === playerIdToAdd);
  if (!playerPresence) {
    console.log('addPlayerToGame: Player not found in players');
    return;
  }

  dealCardsToPlayer(playersMap, playerIdToAdd, 5, 10);
  assignPartyLeaderToPlayer(playersMap, playerIdToAdd);
  console.log('addPlayerToGame: Added player to existing game', playerPresence.name);
}