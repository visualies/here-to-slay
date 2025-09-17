import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { cards } from '../db/schema';
import type { Card, Turn, Action, ActionContext, ActionResult, ActionParams, Player } from '../../../shared/types';
import { Location, Amount, SelectionMode, ActionState } from '../../../shared/types';
import * as Y from 'yjs';
import { addActionsToQueue, processActionQueue } from './turn-service';
import { addCardToPlayerHand } from '../../../src/lib/players';

/**
 * Helper function to get source cards and update function for a location
 */
function getSourceLocation(
  target: Location,
  playersMap: Y.Map<unknown>,
  gameStateMap: Y.Map<unknown>,
  playerId: string
): { sourceCards: Card[], updateSourceFunction: (cards: Card[]) => void } | null {
  switch (target) {
    case Location.SupportDeck:
      const supportStack = gameStateMap.get('supportStack') as Card[] || [];
      return {
        sourceCards: supportStack,
        updateSourceFunction: (cards) => gameStateMap.set('supportStack', cards)
      };
    case Location.OwnHand:
      const player = playersMap.get(playerId) as Player;
      if (!player) return null;
      return {
        sourceCards: player.hand || [],
        updateSourceFunction: (cards) => {
          const currentPlayer = playersMap.get(playerId) as Player;
          if (currentPlayer) {
            playersMap.set(playerId, { ...currentPlayer, hand: cards });
          }
        }
      };
      case Location.AnyHand:
        const anyHandPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
        if (anyHandPlayers.length === 0) return null;

        // For AnyHand, we need to collect all cards from all other players for selection
        // but the user must select all cards from the same player
        const allOtherHandCards = anyHandPlayers.flatMap(player => 
          (player.hand || []).map(card => ({ ...card, _playerId: player.id }))
        );
        
        return {
          sourceCards: allOtherHandCards,
          updateSourceFunction: (cards) => {
            // Group cards by player and update each player's hand
            const cardsByPlayer = new Map<string, Card[]>();
            for (const card of cards) {
              const playerId = (card as any)._playerId;
              if (!cardsByPlayer.has(playerId)) {
                cardsByPlayer.set(playerId, []);
              }
              cardsByPlayer.get(playerId)!.push(card);
            }
            
            // Update each player's hand
            for (const [pid, playerCards] of cardsByPlayer) {
              const player = anyHandPlayers.find(p => p.id === pid);
              if (player) {
                playersMap.set(pid, { ...player, hand: playerCards });
              }
            }
          }
        };
      case Location.OtherHands:
        const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
        if (otherPlayers.length === 0) return null;

        // For OtherHands, we can take from any combination of players
        // Collect all cards from all other players
        const allCards = otherPlayers.flatMap(player => 
          (player.hand || []).map(card => ({ ...card, _playerId: player.id }))
        );
        
        return {
          sourceCards: allCards,
          updateSourceFunction: (cards) => {
            // Group cards by player and update each player's hand
            const cardsByPlayer = new Map<string, Card[]>();
            for (const card of cards) {
              const playerId = (card as any)._playerId;
              if (!cardsByPlayer.has(playerId)) {
                cardsByPlayer.set(playerId, []);
              }
              cardsByPlayer.get(playerId)!.push(card);
            }
            
            // Update each player's hand
            for (const [pid, playerCards] of cardsByPlayer) {
              const player = otherPlayers.find(p => p.id === pid);
              if (player) {
                playersMap.set(pid, { ...player, hand: playerCards });
              }
            }
          }
        };
    case Location.Cache:
      const cache = gameStateMap.get('cache') as Card[] || [];
      return {
        sourceCards: cache,
        updateSourceFunction: (cards) => gameStateMap.set('cache', cards)
      };
    case Location.DiscardPile:
      const discardPile = gameStateMap.get('discardPile') as Card[] || [];
      return {
        sourceCards: discardPile,
        updateSourceFunction: (cards) => gameStateMap.set('discardPile', cards)
      };
    case Location.OwnParty:
      const ownPlayer = playersMap.get(playerId) as Player;
      if (!ownPlayer) return null;

      // Collect all cards from own party (leader + heroes)
      const ownPartyCards: Card[] = [];
      if (ownPlayer.party.leader) {
        ownPartyCards.push({ ...ownPlayer.party.leader, _partyRole: 'leader' } as Card & { _partyRole: string });
      }
      ownPlayer.party.heroes.forEach((hero, index) => {
        if (hero) {
          ownPartyCards.push({ ...hero, _partyRole: `hero-${index}` } as Card & { _partyRole: string });
        }
      });

      return {
        sourceCards: ownPartyCards,
        updateSourceFunction: (remainingCards) => {
          const currentPlayer = playersMap.get(playerId) as Player;
          if (!currentPlayer) return;

          // Rebuild party structure from remaining cards
          let newLeader: Card | null = null;
          const newHeroes: (Card | null)[] = [null, null, null];

          // Place remaining cards back in their positions
          remainingCards.forEach(card => {
            const role = (card as Card & { _partyRole: string })._partyRole;
            if (role === 'leader') {
              newLeader = card;
            } else if (role.startsWith('hero-')) {
              const heroIndex = parseInt(role.split('-')[1]);
              newHeroes[heroIndex] = card;
            }
          });

          playersMap.set(playerId, {
            ...currentPlayer,
            party: {
              leader: newLeader,
              heroes: newHeroes
            }
          });
        }
      };
    case Location.AnyParty:
      const anyPartyPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (anyPartyPlayers.length === 0) return null;

      // Collect all cards from all other players' parties for selection
      // but the user must select all cards from the same player
      const allOtherPartyCards = anyPartyPlayers.flatMap(player => {
        const partyCards: (Card & { _playerId: string; _partyRole: string })[] = [];
        if (player.party.leader) {
          partyCards.push({ ...player.party.leader, _playerId: player.id, _partyRole: 'leader' });
        }
        player.party.heroes.forEach((hero, index) => {
          if (hero) {
            partyCards.push({ ...hero, _playerId: player.id, _partyRole: `hero-${index}` });
          }
        });
        return partyCards;
      });

      return {
        sourceCards: allOtherPartyCards,
        updateSourceFunction: (cards) => {
          // Group cards by player and update each player's party
          const cardsByPlayer = new Map<string, (Card & { _partyRole: string })[]>();
          for (const card of cards) {
            const pid = (card as Card & { _playerId: string })._playerId;
            if (!cardsByPlayer.has(pid)) {
              cardsByPlayer.set(pid, []);
            }
            cardsByPlayer.get(pid)!.push(card as Card & { _partyRole: string });
          }

          // Update each player's party
          for (const [pid, playerCards] of cardsByPlayer) {
            const player = anyPartyPlayers.find(p => p.id === pid);
            if (player) {
              let newLeader = player.party.leader;
              const newHeroes = [...player.party.heroes];

              // Remove selected cards
              playerCards.forEach(card => {
                if (card._partyRole === 'leader') {
                  newLeader = null;
                } else if (card._partyRole.startsWith('hero-')) {
                  const heroIndex = parseInt(card._partyRole.split('-')[1]);
                  newHeroes[heroIndex] = null;
                }
              });

              playersMap.set(pid, {
                ...player,
                party: {
                  leader: newLeader,
                  heroes: newHeroes
                }
              });
            }
          }
        }
      };
    case Location.OtherParties:
      const otherPartyPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (otherPartyPlayers.length === 0) return null;

      // For OtherParties, we can take from any combination of players
      const allOtherPartiesCards = otherPartyPlayers.flatMap(player => {
        const partyCards: (Card & { _playerId: string; _partyRole: string })[] = [];
        if (player.party.leader) {
          partyCards.push({ ...player.party.leader, _playerId: player.id, _partyRole: 'leader' });
        }
        player.party.heroes.forEach((hero, index) => {
          if (hero) {
            partyCards.push({ ...hero, _playerId: player.id, _partyRole: `hero-${index}` });
          }
        });
        return partyCards;
      });

      return {
        sourceCards: allOtherPartiesCards,
        updateSourceFunction: (cards) => {
          // Group cards by player and update each player's party
          const cardsByPlayer = new Map<string, (Card & { _partyRole: string })[]>();
          for (const card of cards) {
            const pid = (card as Card & { _playerId: string })._playerId;
            if (!cardsByPlayer.has(pid)) {
              cardsByPlayer.set(pid, []);
            }
            cardsByPlayer.get(pid)!.push(card as Card & { _partyRole: string });
          }

          // Update each player's party
          for (const [pid, playerCards] of cardsByPlayer) {
            const player = otherPartyPlayers.find(p => p.id === pid);
            if (player) {
              let newLeader = player.party.leader;
              const newHeroes = [...player.party.heroes];

              // Remove selected cards
              playerCards.forEach(card => {
                if (card._partyRole === 'leader') {
                  newLeader = null;
                } else if (card._partyRole.startsWith('hero-')) {
                  const heroIndex = parseInt(card._partyRole.split('-')[1]);
                  newHeroes[heroIndex] = null;
                }
              });

              playersMap.set(pid, {
                ...player,
                party: {
                  leader: newLeader,
                  heroes: newHeroes
                }
              });
            }
          }
        }
      };
    default:
      return null;
  }
}

/**
 * Select cards from a target location based on selection mode
 * Returns either the selected card IDs or a request for user input
 */
export function selectCards(
  context: ActionContext,
  target: Location,
  amount: Amount,
  selection: SelectionMode
): { selectedCardIds?: string[], needsInput?: ActionResult } {

  // For First selection mode, auto-select cards
  if (selection === SelectionMode.First) {
    const autoSelected = autoSelectCards(context, target, amount);
    if (!autoSelected.success) {
      return { needsInput: autoSelected };
    }
    return { selectedCardIds: (autoSelected.data as any)?.cardIds || [] };
  }

  // For user selection modes, return a generic user input request
  // The specific UI will be determined by the frontend based on target location and selection mode
  return {
    needsInput: {
      success: false,
      waitingForInput: {
        type: 'choice',
        prompt: `Choose cards to ${selection === SelectionMode.TargetOwner ? 'give up' : 'take'}`,
        timeoutMs: 30000,
        // Target owner will be determined by frontend
      }
    }
  };
}

/**
 * Auto-select cards using First selection mode
 */
function autoSelectCards(
  context: ActionContext,
  target: Location,
  amount: Amount
): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;

  // Special case for OtherHands when no other players exist
  if (target === Location.OtherHands) {
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
    if (otherPlayers.length === 0) {
      return { success: false, message: 'No other players to draw from' };
    }
  }

  const sourceLocation = getSourceLocation(target, playersMap, gameStateMap, playerId);
  if (!sourceLocation) {
    return { success: false, message: `Unsupported source location: ${target}` };
  }

  const { sourceCards } = sourceLocation;

  // Calculate how many cards to select
  let numAmount: number;
  if (amount === Amount.All) {
    numAmount = sourceCards.length;
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else if (typeof amount === 'string' && !isNaN(Number(amount))) {
    numAmount = Number(amount);
  } else {
    numAmount = 1;
  }

  // Handle zero amount case (no-op)
  if (numAmount === 0) {
    return {
      success: true,
      message: 'No cards to select (amount is 0)',
      data: { cardIds: [] }
    };
  }

  // All locations should allow requesting more than available - return all available cards
  if (sourceCards.length < numAmount) {
    const actualAmount = sourceCards.length;
    if (actualAmount === 0) {
      return { success: false, message: `No cards available in ${target}` };
    }
    const selectedCardIds = sourceCards.slice(-actualAmount).map(card => card.id);
    return {
      success: true,
      message: `Auto-selected ${selectedCardIds.length} cards (requested ${numAmount}, but only ${actualAmount} available)`,
      data: { cardIds: selectedCardIds }
    };
  }

  if (sourceCards.length === 0) {
    return { success: false, message: `No cards available in ${target}` };
  }

  // Auto-select from the end (First mode)
  const selectedCardIds = sourceCards.slice(-numAmount).map(card => card.id);
  

  return {
    success: true,
    message: `Auto-selected ${selectedCardIds.length} cards`,
    data: { cardIds: selectedCardIds }
  };
}



/**
 * Direct card move without user input - renamed from original moveCard logic
 */
/**
 * Card service for retrieving card data and handling card actions
 */

export async function getCard(cardId: string): Promise<Card | null> {
  const result = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: {
      requirements: true,
      actions: {
        with: {
          params: true,
        },
      },
    },
  })

  return result ?? null
}

export async function playCard(
  playerId: string,
  roomId: string,
  cardId: string,
  ydoc: Y.Doc
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Get the card data first
    const card = await getCard(cardId)
    if (!card) {
      return {
        success: false,
        message: `Card ${cardId} not found`
      }
    }

    // Get current turn from Yjs document
    const gameStateMap = ydoc.getMap('gameState')
    const currentTurn = gameStateMap.get('currentTurn') as Turn | null

    if (!currentTurn) {
      return {
        success: false,
        message: 'No active turn found'
      }
    }

    // Check if it's the player's turn
    if (currentTurn.player_id !== playerId) {
      return {
        success: false,
        message: `It's not your turn. Current turn belongs to player ${currentTurn.player_id}`
      }
    }

    // Get players map from the Yjs document
    const playersMap = ydoc.getMap('players')
    const player = playersMap.get(playerId) as Player

    if (!player) {
      return {
        success: false,
        message: 'Player not found'
      }
    }

    // Cards can be played from anywhere (hand, playing field, etc.)
    // No need to check if card is in hand

    console.log(`🎮 Playing card: ${card.name} (${card.type}) by player ${playerId}`)
    console.log(`🎮 Card has ${card.actions?.length || 0} actions`)

    // Convert card actions to Action format for the turn queue
    const cardActions: Action[] = (card.actions || []).map(action => ({
      id: `${cardId}-${action.action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: action.action,
      parameters: action.params || [],
      cardId: cardId,
      state: ActionState.Pending
    }))

    if (cardActions.length === 0) {
      console.log(`🎮 Card ${card.name} has no actions to execute`)
      return {
        success: true,
        message: `Card ${card.name} played successfully (no actions)`,
        data: {
          playerId,
          roomId,
          cardId,
          cardName: card.name,
          cardType: card.type,
          actionsProcessed: 0
        }
      }
    }

    // Add actions to turn queue and process them
    const result = addActionsToQueue(playersMap, gameStateMap, playerId, roomId, cardActions)

    if (!result.success) {
      return {
        success: false,
        message: `Failed to play card ${card.name}: ${result.message}`
      }
    }

    console.log(`🎮 Card ${card.name} played successfully. Processed ${result.actionsProcessed} actions`)

    return {
      success: true,
      message: `Card ${card.name} played successfully`,
      data: {
        playerId,
        roomId,
        cardId,
        cardName: card.name,
        cardType: card.type,
        actionsProcessed: result.actionsProcessed,
        turnServiceResult: result
      }
    }
  } catch (error) {
    console.error('Error playing card:', error)
    return {
      success: false,
      message: 'Failed to play card due to server error'
    }
  }
}

/**
 * Move cards between locations with configurable selection mode
 * @param context - Action context containing players and game state
 * @param target - Source location to move cards from
 * @param destination - Destination location to move cards to
 * @param amount - Number of cards to move
 * @param selection - Selection mode for choosing cards when multiple targets available
 * @param specificCardId - Optional specific card ID to move (overrides selection mode)
 * @returns ActionResult with success status and data
 */
/**
 * Move specific cards from target to destination
 * This function only handles the actual movement - card selection should be done beforehand
 */
export function moveCard(
  context: ActionContext,
  target: Location,
  destination: Location,
  selectedCardIds: string[]
): ActionResult {
  const { playersMap, gameStateMap, playerId } = context;

  if (!target || !destination) {
    return { success: false, message: 'target and destination are required' };
  }

  if (!selectedCardIds || selectedCardIds.length === 0) {
    return { success: false, message: 'selectedCardIds is required and must not be empty' };
  }

  // Special validation for AnyHand: all selected cards must come from the same player
  if (target === Location.AnyHand) {
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
    const playerCardMap = new Map<string, string[]>();

    // Group selected cards by player
    for (const cardId of selectedCardIds) {
      let found = false;
      for (const player of otherPlayers) {
        const card = (player.hand || []).find(c => c.id === cardId);
        if (card) {
          if (!playerCardMap.has(player.id)) {
            playerCardMap.set(player.id, []);
          }
          playerCardMap.get(player.id)!.push(cardId);
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, message: `Card ${cardId} not found in any other player's hand` };
      }
    }

    // Check if all cards come from the same player
    if (playerCardMap.size > 1) {
      return {
        success: false,
        message: 'For AnyHand, all selected cards must come from the same player\'s hand'
      };
    }
  }

  // Special validation for AnyParty: all selected cards must come from the same player
  if (target === Location.AnyParty) {
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
    const playerCardMap = new Map<string, string[]>();

    // Group selected cards by player
    for (const cardId of selectedCardIds) {
      let found = false;
      for (const player of otherPlayers) {
        // Check leader
        if (player.party.leader && player.party.leader.id === cardId) {
          if (!playerCardMap.has(player.id)) {
            playerCardMap.set(player.id, []);
          }
          playerCardMap.get(player.id)!.push(cardId);
          found = true;
          break;
        }
        // Check heroes
        const heroCard = player.party.heroes.find(hero => hero && hero.id === cardId);
        if (heroCard) {
          if (!playerCardMap.has(player.id)) {
            playerCardMap.set(player.id, []);
          }
          playerCardMap.get(player.id)!.push(cardId);
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, message: `Card ${cardId} not found in any other player's party` };
      }
    }

    // Check if all cards come from the same player
    if (playerCardMap.size > 1) {
      return {
        success: false,
        message: 'For AnyParty, all selected cards must come from the same player\'s party'
      };
    }
  }

  const drawnCards: Card[] = [];

  // Handle card movement based on target location
  if (target === Location.AnyHand || target === Location.OtherHands) {
    // For AnyHand and OtherHands, find cards across all other players
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];

    for (const cardId of selectedCardIds) {
      let found = false;
      // Get fresh player data from the map for each card
      const currentOtherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];

      for (const otherPlayer of currentOtherPlayers) {
        const cardIndex = (otherPlayer.hand || []).findIndex(card => card.id === cardId);
        if (cardIndex !== -1) {
          const newHand = [...(otherPlayer.hand || [])];
          const [removedCard] = newHand.splice(cardIndex, 1);
          drawnCards.push(removedCard);

          // Update the player's hand
          playersMap.set(otherPlayer.id, { ...otherPlayer, hand: newHand });
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, message: `Card ${cardId} not found in any other player's hand` };
      }
    }
  } else if (target === Location.AnyParty || target === Location.OtherParties) {
    // For AnyParty and OtherParties, find cards across all other players' parties
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];

    for (const cardId of selectedCardIds) {
      let found = false;
      // Get fresh player data from the map for each card
      const currentOtherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];

      for (const otherPlayer of currentOtherPlayers) {
        let removedCard: Card | null = null;
        let newLeader = otherPlayer.party.leader;
        const newHeroes = [...otherPlayer.party.heroes];

        // Check if card is the leader
        if (otherPlayer.party.leader && otherPlayer.party.leader.id === cardId) {
          removedCard = otherPlayer.party.leader;
          newLeader = null;
          found = true;
        } else {
          // Check if card is in heroes
          const heroIndex = otherPlayer.party.heroes.findIndex(hero => hero && hero.id === cardId);
          if (heroIndex !== -1) {
            removedCard = otherPlayer.party.heroes[heroIndex];
            newHeroes[heroIndex] = null;
            found = true;
          }
        }

        if (found && removedCard) {
          drawnCards.push(removedCard);
          // Update the player's party
          playersMap.set(otherPlayer.id, {
            ...otherPlayer,
            party: {
              leader: newLeader,
              heroes: newHeroes
            }
          });
          break;
        }
      }
      if (!found) {
        return { success: false, message: `Card ${cardId} not found in any other player's party` };
      }
    }
  } else {
    // For other locations, handle normally
    const sourceLocation = getSourceLocation(target, playersMap, gameStateMap, playerId);
    if (!sourceLocation) {
      return { success: false, message: `Unsupported source location: ${target}` };
    }

    const { sourceCards, updateSourceFunction } = sourceLocation;
    const newSourceCards = [...sourceCards];

    for (const cardId of selectedCardIds) {
      const cardIndex = newSourceCards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        return { success: false, message: `Card ${cardId} not found in ${target}` };
      }
      const [removedCard] = newSourceCards.splice(cardIndex, 1);
      drawnCards.push(removedCard);
    }
    updateSourceFunction(newSourceCards);
  }

  if (drawnCards.length === 0) {
    return { success: false, message: `Failed to move cards from ${target}` };
  }

  // Handle different destination locations
  switch (destination) {
    case Location.OwnHand:
      // Add cards to player hand
      drawnCards.forEach(card => {
        addCardToPlayerHand(playersMap, playerId, card);
      });
      break;
    case Location.OwnParty:
      // Add cards to player party (heroes array)
      const player = playersMap.get(playerId) as Player;
      if (player) {
        const currentParty = player.party;
        const newHeroes = [...currentParty.heroes];
        
        // Add cards to the first available hero slot
        drawnCards.forEach(card => {
          const emptySlotIndex = newHeroes.findIndex(hero => hero === null);
          if (emptySlotIndex !== -1) {
            newHeroes[emptySlotIndex] = card;
          } else {
            // If no empty slots, add to the end (this might need game logic validation)
            newHeroes.push(card);
          }
        });
        
        playersMap.set(playerId, {
          ...player,
          party: {
            ...currentParty,
            heroes: newHeroes
          }
        });
      }
      break;
    case Location.SupportDeck:
      // Add cards back to support stack
      const currentSupportStack = gameStateMap.get('supportStack') as Card[] || [];
      gameStateMap.set('supportStack', [...currentSupportStack, ...drawnCards]);
      break;
    case Location.Cache:
      // Add cards to cache
      const currentCache = gameStateMap.get('cache') as Card[] || [];
      gameStateMap.set('cache', [...currentCache, ...drawnCards]);
      break;
    case Location.DiscardPile:
      // Add cards to discard pile
      const currentDiscardPile = gameStateMap.get('discardPile') as Card[] || [];
      gameStateMap.set('discardPile', [...currentDiscardPile, ...drawnCards]);
      break;
    case Location.AnyHand:
      // Add cards to any other player's hand (for simplicity, add to first available player)
      const availablePlayersForHand = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (availablePlayersForHand.length === 0) {
        return { success: false, message: 'No other players available to receive cards in hand' };
      }
      // Add all cards to the first available player's hand
      const targetHandPlayer = availablePlayersForHand[0];
      drawnCards.forEach(card => {
        addCardToPlayerHand(playersMap, targetHandPlayer.id, card);
      });
      break;
    case Location.OtherHands:
      // Add cards to other players' hands (distribute evenly)
      const otherPlayersForHand = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (otherPlayersForHand.length === 0) {
        return { success: false, message: 'No other players available to receive cards in hand' };
      }
      // Distribute cards evenly among other players
      drawnCards.forEach((card, index) => {
        const targetPlayer = otherPlayersForHand[index % otherPlayersForHand.length];
        addCardToPlayerHand(playersMap, targetPlayer.id, card);
      });
      break;
    case Location.AnyParty:
      // Add cards to any other player's party (for simplicity, add to first available player)
      const availablePlayersForParty = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (availablePlayersForParty.length === 0) {
        return { success: false, message: 'No other players available to receive cards in party' };
      }
      // Add all cards to the first available player's party
      const targetPartyPlayer = availablePlayersForParty[0];
      const targetPlayer = playersMap.get(targetPartyPlayer.id) as Player;
      if (targetPlayer) {
        const currentParty = targetPlayer.party;
        const newHeroes = [...currentParty.heroes];

        drawnCards.forEach(card => {
          const emptySlotIndex = newHeroes.findIndex(hero => hero === null);
          if (emptySlotIndex !== -1) {
            newHeroes[emptySlotIndex] = card;
          } else {
            // If no empty slots, add to the end
            newHeroes.push(card);
          }
        });

        playersMap.set(targetPartyPlayer.id, {
          ...targetPlayer,
          party: {
            ...currentParty,
            heroes: newHeroes
          }
        });
      }
      break;
    case Location.OtherParties:
      // Add cards to other players' parties (distribute evenly)
      const otherPlayersForParty = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      if (otherPlayersForParty.length === 0) {
        return { success: false, message: 'No other players available to receive cards in party' };
      }
      // Distribute cards evenly among other players' parties
      drawnCards.forEach((card, index) => {
        const targetOtherPlayer = otherPlayersForParty[index % otherPlayersForParty.length];
        const currentPlayer = playersMap.get(targetOtherPlayer.id) as Player;
        if (currentPlayer) {
          const currentParty = currentPlayer.party;
          const newHeroes = [...currentParty.heroes];

          const emptySlotIndex = newHeroes.findIndex(hero => hero === null);
          if (emptySlotIndex !== -1) {
            newHeroes[emptySlotIndex] = card;
          } else {
            // If no empty slots, add to the end
            newHeroes.push(card);
          }

          playersMap.set(targetOtherPlayer.id, {
            ...currentPlayer,
            party: {
              ...currentParty,
              heroes: newHeroes
            }
          });
        }
      });
      break;
    default:
      return { success: false, message: `Unsupported destination location: ${destination}` };
  }

  const cardNames = drawnCards.map(card => card.name).join(', ');
  console.log(`✅ Card Service: Moved card(s) ${cardNames} from ${target} to ${destination} for player ${playerId}`);

  return {
    success: true,
    message: `Moved ${drawnCards.length} card(s) from ${target} to ${destination}`,
    data: {
      cards: drawnCards,
      target,
      destination,
      amount: drawnCards.length
    }
  };
}


/**
 * Provide user input for an action that's waiting for feedback
 */
export async function provideActionInput(
  playerId: string,
  roomId: string,
  actionId: string,
  input: any,
  ydoc: Y.Doc
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    console.log(`🎮 Providing input for action ${actionId} from player ${playerId}: ${JSON.stringify(input)}`);

    // Get current turn from Yjs document
    const gameStateMap = ydoc.getMap('gameState');
    const currentTurn = gameStateMap.get('currentTurn') as Turn | null;

    if (!currentTurn) {
      return {
        success: false,
        message: 'No active turn found'
      };
    }

    // For normal actions, check if it's the player's turn
    // For target owner selection, allow the target player to respond even if it's not their turn
    const action = currentTurn.action_queue.find(a => a.id === actionId);
    if (!action) {
      return {
        success: false,
        message: `Action ${actionId} not found in queue`
      };
    }

    // Check player authorization
    const isPlayersTurn = currentTurn.player_id === playerId;

    if (!isPlayersTurn) {
      return {
        success: false,
        message: `Only player ${currentTurn.player_id} can provide input for this action`
      };
    }

    // Find the action index in the queue
    const actionIndex = currentTurn.action_queue.findIndex(a => a.id === actionId);

    // Check if action is waiting for input
    if (action.state !== ActionState.WaitingForInput) {
      return {
        success: false,
        message: `Action ${actionId} is not waiting for input (current state: ${action.state})`
      };
    }

    // Check if action has timed out
    if (action.timeoutAt && Date.now() > action.timeoutAt) {
      return {
        success: false,
        message: `Action ${actionId} has timed out`
      };
    }

    console.log(`🎮 Applying input ${JSON.stringify(input)} to action ${action.action}`);

    // Add the input to action parameters
    const updatedAction: Action = {
      ...action,
      state: ActionState.Pending, // Reset to pending so it can be processed
      parameters: [
        ...action.parameters,
        {
          name: 'user_input',
          type: 'string',
          value: input
        }
      ],
      // Clear waiting state
      timeoutAt: undefined,
      awaitingInput: undefined
    };

    // Update the action in the queue
    const updatedQueue = [...currentTurn.action_queue];
    updatedQueue[actionIndex] = updatedAction;

    const updatedTurn: Turn = {
      ...currentTurn,
      action_queue: updatedQueue
    };

    // Update the turn
    gameStateMap.set('currentTurn', updatedTurn);

    // Clear waiting status from game state
    const waitingAction = gameStateMap.get('waitingForAction');
    if (waitingAction && (waitingAction as any).actionId === actionId) {
      console.log(`🎮 Clearing waiting status for action ${actionId}`);
      gameStateMap.delete('waitingForAction');
    }

    // Get players map for processing
    const playersMap = ydoc.getMap('players');

    // Resume processing the action queue
    const result = processActionQueue(playersMap, gameStateMap, playerId, roomId);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to process action after input: ${result.message}`
      };
    }

    console.log(`🎮 Successfully provided input for action ${actionId} and resumed processing`);

    return {
      success: true,
      message: `Input provided for action ${actionId}`,
      data: {
        actionId,
        input,
        turnServiceResult: result
      }
    };
  } catch (error) {
    console.error('Error providing action input:', error);
    return {
      success: false,
      message: 'Failed to provide action input due to server error'
    };
  }
}
