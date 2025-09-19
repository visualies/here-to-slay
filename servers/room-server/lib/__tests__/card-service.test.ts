import * as Y from 'yjs';
import { moveCard } from '../card-service';
import { Location } from '../../../../shared/types';
import type { ActionContext, Card, Player, ActionResult } from '../../../../shared/types';

// Type for moveCard result data
interface MoveCardResultData {
  cards: Card[];
  amount: number;
}

// Mock card data
const createMockCard = (id: string, name: string = `Card ${id}`): Card => ({
  id,
  name,
  type: 'hero',
  description: `Description for ${name}`,
  imagePath: `image-${id}.jpg`,
  requirements: [],
  actions: []
});

// Mock player data
const createMockPlayer = (id: string, hand: Card[] = [], party: { leader: Card | null; heroes: (Card | null)[] } = { leader: null, heroes: [null, null, null] }): Player => ({
  id,
  name: `Player ${id}`,
  color: 'blue',
  lastSeen: Date.now(),
  joinTime: Date.now(),
  hand,
  deck: [],
  party,
  actionPoints: 0
});

// Helper to create ActionContext
const createActionContext = (
  playerId: string,
  players: Player[] = [],
  gameState: Record<string, unknown> = {}
): ActionContext => {
  const ydoc = new Y.Doc();
  const playersMap = ydoc.getMap('players');
  const gameStateMap = ydoc.getMap('gameState');

  // Populate players
  players.forEach(player => {
    playersMap.set(player.id, player);
  });

  // Populate game state
  Object.entries(gameState).forEach(([key, value]) => {
    gameStateMap.set(key, value);
  });

  return {
    roomId: 'test-room',
    playerId,
    diceResult: 1,
    playersMap,
    gameStateMap
  };
};

describe('moveCard', () => {
  let card1: Card, card2: Card, card3: Card, card4: Card, card5: Card, card6: Card, card7: Card, card8: Card;
  let player1: Player, player2: Player, player3: Player;

  beforeEach(() => {
    card1 = createMockCard('card-1', 'Test Card 1');
    card2 = createMockCard('card-2', 'Test Card 2');
    card3 = createMockCard('card-3', 'Test Card 3');
    card4 = createMockCard('card-4', 'Test Card 4');
    card5 = createMockCard('card-5', 'Test Card 5');
    card6 = createMockCard('card-6', 'Test Card 6');
    card7 = createMockCard('card-7', 'Test Card 7');
    card8 = createMockCard('card-8', 'Test Card 8');

    player1 = createMockPlayer('player-1', [card1, card2], {
      leader: card5,
      heroes: [card6, null, null]
    });
    player2 = createMockPlayer('player-2', [card3], {
      leader: card7,
      heroes: [card8, null, null]
    });
    player3 = createMockPlayer('player-3', [card4], {
      leader: null,
      heroes: [null, null, null]
    });
  });

  describe('Input validation', () => {
    it('should fail when target is null or undefined', () => {
      const context = createActionContext('player-1');

      const result = moveCard(context, null as unknown as Location, Location.OwnHand, ['card-1']);
      expect(result.success).toBe(false);
      expect(result.message).toBe('target and destination are required');
    });

    it('should fail when destination is null or undefined', () => {
      const context = createActionContext('player-1');

      const result = moveCard(context, Location.OwnHand, null as unknown as Location, ['card-1']);
      expect(result.success).toBe(false);
      expect(result.message).toBe('target and destination are required');
    });

    it('should fail when selectedCardIds is empty', () => {
      const context = createActionContext('player-1');

      const result = moveCard(context, Location.OwnHand, Location.Cache, []);
      expect(result.success).toBe(false);
      expect(result.message).toBe('selectedCardIds is required and must not be empty');
    });

    it('should fail when selectedCardIds is null or undefined', () => {
      const context = createActionContext('player-1');

      const result = moveCard(context, Location.OwnHand, Location.Cache, null as unknown as string[]);
      expect(result.success).toBe(false);
      expect(result.message).toBe('selectedCardIds is required and must not be empty');
    });
  });

  describe('Move from OwnHand', () => {
    it('should successfully move cards from own hand to cache', () => {
      const context = createActionContext('player-1', [player1], { cache: [] });

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['card-1']);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Moved 1 card(s) from own-hand to cache');
      expect((result.data as MoveCardResultData)?.cards).toHaveLength(1);
      expect((result.data as MoveCardResultData)?.cards[0].id).toBe('card-1');

      // Check that card was removed from hand
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.hand).toHaveLength(1);
      expect(updatedPlayer.hand[0].id).toBe('card-2');

      // Check that card was added to cache
      const cache = context.gameStateMap.get('cache') as Card[];
      expect(cache).toHaveLength(1);
      expect(cache[0].id).toBe('card-1');
    });

    it('should successfully move multiple cards from own hand to discard pile', () => {
      const context = createActionContext('player-1', [player1], { discardPile: [] });

      const result = moveCard(context, Location.OwnHand, Location.DiscardPile, ['card-1', 'card-2']);

      expect(result.success).toBe(true);
      expect((result.data as MoveCardResultData)?.cards).toHaveLength(2);

      // Check that both cards were removed from hand
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.hand).toHaveLength(0);

      // Check that both cards were added to discard pile
      const discardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(discardPile).toHaveLength(2);
    });

    it('should fail when card is not found in own hand', () => {
      const context = createActionContext('player-1', [player1]);

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['nonexistent-card']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Card nonexistent-card not found in own-hand');
    });

    it('should move cards to own party', () => {
      const context = createActionContext('player-1', [player1]);

      const result = moveCard(context, Location.OwnHand, Location.OwnParty, ['card-1']);

      expect(result.success).toBe(true);

      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card1);
    });
  });

  describe('Move from SupportDeck', () => {
    it('should successfully move cards from support deck to own hand', () => {
      const supportStack = [card3, card4];
      const context = createActionContext('player-1', [player1], { supportStack });

      const result = moveCard(context, Location.SupportDeck, Location.OwnHand, ['card-3']);

      expect(result.success).toBe(true);

      // Check that card was removed from support deck
      const updatedSupportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(updatedSupportStack).toHaveLength(1);
      expect(updatedSupportStack[0].id).toBe('card-4');

      // Check that card was added to hand
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.hand).toHaveLength(3); // originally had 2 cards
      expect(updatedPlayer.hand.some(card => card.id === 'card-3')).toBe(true);
    });

    it('should fail when card is not found in support deck', () => {
      const context = createActionContext('player-1', [player1], { supportStack: [card3] });

      const result = moveCard(context, Location.SupportDeck, Location.OwnHand, ['card-4']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Card card-4 not found in support-deck');
    });
  });

  describe('Move from AnyHand', () => {
    it('should successfully move cards from another player\'s hand when all cards are from same player', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyHand, Location.OwnHand, ['card-3']);

      expect(result.success).toBe(true);
      expect((result.data as MoveCardResultData)?.cards[0].id).toBe('card-3');

      // Check that card was removed from player2's hand
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.hand).toHaveLength(0);

      // Check that card was added to player1's hand
      const updatedPlayer1 = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer1.hand).toHaveLength(3);
      expect(updatedPlayer1.hand.some(card => card.id === 'card-3')).toBe(true);
    });

    it('should fail when cards are from different players', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyHand, Location.OwnHand, ['card-3', 'card-4']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('For AnyHand, all selected cards must come from the same player\'s hand');
    });

    it('should fail when card is not found in any other player\'s hand', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.AnyHand, Location.OwnHand, ['card-1']); // card-1 is in player1's own hand

      expect(result.success).toBe(false);
      expect(result.message).toBe('Card card-1 not found in any other player\'s hand');
    });
  });

  describe('Move from OtherHands', () => {
    it('should successfully move cards from other players\' hands', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherHands, Location.OwnHand, ['card-3', 'card-4']);

      expect(result.success).toBe(true);
      expect((result.data as MoveCardResultData)?.cards).toHaveLength(2);

      // Check that cards were removed from respective players
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      const updatedPlayer3 = context.playersMap.get('player-3') as Player;
      expect(updatedPlayer2.hand).toHaveLength(0);
      expect(updatedPlayer3.hand).toHaveLength(0);

      // Check that cards were added to player1's hand
      const updatedPlayer1 = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer1.hand).toHaveLength(4);
    });

    it('should fail when card is not found in any other player\'s hand', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.OtherHands, Location.OwnHand, ['nonexistent-card']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Card nonexistent-card not found in any other player\'s hand');
    });
  });

  describe('Move from Cache', () => {
    it('should successfully move cards from cache to own hand', () => {
      const cache = [card3, card4];
      const context = createActionContext('player-1', [player1], { cache });

      const result = moveCard(context, Location.Cache, Location.OwnHand, ['card-3']);

      expect(result.success).toBe(true);

      // Check that card was removed from cache
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('card-4');
    });
  });

  describe('Move from DiscardPile', () => {
    it('should successfully move cards from discard pile to support deck', () => {
      const discardPile = [card3, card4];
      const supportStack = [card1];
      const context = createActionContext('player-1', [player1], { discardPile, supportStack });

      const result = moveCard(context, Location.DiscardPile, Location.SupportDeck, ['card-3']);

      expect(result.success).toBe(true);

      // Check that card was removed from discard pile
      const updatedDiscardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(updatedDiscardPile).toHaveLength(1);
      expect(updatedDiscardPile[0].id).toBe('card-4');

      // Check that card was added to support stack
      const updatedSupportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(updatedSupportStack).toHaveLength(2);
      expect(updatedSupportStack[1].id).toBe('card-3');
    });
  });

  describe('Destination handling', () => {
    it('should handle moving to SupportDeck', () => {
      const context = createActionContext('player-1', [player1], { supportStack: [] });

      const result = moveCard(context, Location.OwnHand, Location.SupportDeck, ['card-1']);

      expect(result.success).toBe(true);
      const supportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(supportStack).toHaveLength(1);
      expect(supportStack[0].id).toBe('card-1');
    });

    it('should handle moving to Cache', () => {
      const context = createActionContext('player-1', [player1], { cache: [] });

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['card-1']);

      expect(result.success).toBe(true);
      const cache = context.gameStateMap.get('cache') as Card[];
      expect(cache).toHaveLength(1);
      expect(cache[0].id).toBe('card-1');
    });

    it('should handle moving to DiscardPile', () => {
      const context = createActionContext('player-1', [player1], { discardPile: [] });

      const result = moveCard(context, Location.OwnHand, Location.DiscardPile, ['card-1']);

      expect(result.success).toBe(true);
      const discardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(discardPile).toHaveLength(1);
      expect(discardPile[0].id).toBe('card-1');
    });

    it('should handle moving to OwnParty with empty slots', () => {
      const context = createActionContext('player-1', [player1]);

      const result = moveCard(context, Location.OwnHand, Location.OwnParty, ['card-1']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card1);
    });

    it('should handle moving to OwnParty when all slots are filled', () => {
      const fullParty = { leader: null, heroes: [card3, card4, createMockCard('card-5')] };
      const playerWithFullParty = createMockPlayer('player-1', [card1, card2], fullParty);
      const context = createActionContext('player-1', [playerWithFullParty]);

      const result = moveCard(context, Location.OwnHand, Location.OwnParty, ['card-1']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes).toHaveLength(4); // Added to the end
      expect(updatedPlayer.party.heroes[3]).toEqual(card1);
    });

    it('should fail for unsupported destination location', () => {
      const context = createActionContext('player-1', [player1]);

      const result = moveCard(context, Location.OwnHand, 'unsupported-location' as Location, ['card-1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unsupported destination location: unsupported-location');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should fail for unsupported source location', () => {
      const context = createActionContext('player-1', [player1]);

      const result = moveCard(context, 'unsupported-location' as Location, Location.OwnHand, ['card-1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unsupported source location: unsupported-location');
    });

    it('should handle empty game state collections gracefully', () => {
      const context = createActionContext('player-1', [player1], {});

      const result = moveCard(context, Location.SupportDeck, Location.OwnHand, ['card-1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Card card-1 not found in support-deck');
    });

    it('should handle case when no cards are actually moved', () => {
      const context = createActionContext('player-1', [player1]);

      // This should theoretically not happen due to validation, but test the safety check
      const result = moveCard(context, Location.OwnHand, Location.Cache, ['nonexistent-card']);

      expect(result.success).toBe(false);
    });

    it('should preserve existing cards when adding to collections', () => {
      const existingCache = [card3];
      const context = createActionContext('player-1', [player1], { cache: existingCache });

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['card-1']);

      expect(result.success).toBe(true);
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(2);
      expect(updatedCache[0]).toEqual(card3); // Original card preserved
      expect(updatedCache[1]).toEqual(card1); // New card added
    });
  });

  describe('Return value structure', () => {
    it('should return correct data structure on success', () => {
      const context = createActionContext('player-1', [player1], { cache: [] });

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['card-1']);

      expect(result).toMatchObject({
        success: true,
        message: 'Moved 1 card(s) from own-hand to cache',
        data: {
          cards: [card1],
          target: Location.OwnHand,
          destination: Location.Cache,
          amount: 1
        }
      });
    });

    it('should include all moved cards in data', () => {
      const context = createActionContext('player-1', [player1], { cache: [] });

      const result = moveCard(context, Location.OwnHand, Location.Cache, ['card-1', 'card-2']);

      expect((result.data as MoveCardResultData)?.cards).toHaveLength(2);
      expect((result.data as MoveCardResultData)?.cards.map((c: Card) => c.id)).toEqual(['card-1', 'card-2']);
      expect((result.data as MoveCardResultData)?.amount).toBe(2);
    });
  });

  describe('Additional cross-combinations not previously covered', () => {
    it('should move from SupportDeck to Cache', () => {
      const supportStack = [card3, card4];
      const context = createActionContext('player-1', [player1], { supportStack, cache: [] });

      const result = moveCard(context, Location.SupportDeck, Location.Cache, ['card-3']);

      expect(result.success).toBe(true);
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('card-3');
    });

    it('should move from SupportDeck to DiscardPile', () => {
      const supportStack = [card3];
      const context = createActionContext('player-1', [player1], { supportStack, discardPile: [] });

      const result = moveCard(context, Location.SupportDeck, Location.DiscardPile, ['card-3']);

      expect(result.success).toBe(true);
      const updatedDiscardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(updatedDiscardPile).toHaveLength(1);
      expect(updatedDiscardPile[0].id).toBe('card-3');
    });

    it('should move from SupportDeck to OwnParty', () => {
      const supportStack = [card3];
      const context = createActionContext('player-1', [player1], { supportStack });

      const result = moveCard(context, Location.SupportDeck, Location.OwnParty, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card3);
    });

    it('should move from AnyHand to Cache', () => {
      const context = createActionContext('player-1', [player1, player2], { cache: [] });

      const result = moveCard(context, Location.AnyHand, Location.Cache, ['card-3']);

      expect(result.success).toBe(true);
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('card-3');
    });

    it('should move from AnyHand to DiscardPile', () => {
      const context = createActionContext('player-1', [player1, player2], { discardPile: [] });

      const result = moveCard(context, Location.AnyHand, Location.DiscardPile, ['card-3']);

      expect(result.success).toBe(true);
      const updatedDiscardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(updatedDiscardPile).toHaveLength(1);
      expect(updatedDiscardPile[0].id).toBe('card-3');
    });

    it('should move from AnyHand to SupportDeck', () => {
      const context = createActionContext('player-1', [player1, player2], { supportStack: [] });

      const result = moveCard(context, Location.AnyHand, Location.SupportDeck, ['card-3']);

      expect(result.success).toBe(true);
      const updatedSupportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(updatedSupportStack).toHaveLength(1);
      expect(updatedSupportStack[0].id).toBe('card-3');
    });

    it('should move from AnyHand to OwnParty', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.AnyHand, Location.OwnParty, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card3);
    });

    it('should move from OtherHands to Cache', () => {
      const context = createActionContext('player-1', [player1, player2, player3], { cache: [] });

      const result = moveCard(context, Location.OtherHands, Location.Cache, ['card-3']);

      expect(result.success).toBe(true);
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('card-3');
    });

    it('should move from OtherHands to DiscardPile', () => {
      const context = createActionContext('player-1', [player1, player2, player3], { discardPile: [] });

      const result = moveCard(context, Location.OtherHands, Location.DiscardPile, ['card-3']);

      expect(result.success).toBe(true);
      const updatedDiscardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(updatedDiscardPile).toHaveLength(1);
      expect(updatedDiscardPile[0].id).toBe('card-3');
    });

    it('should move from OtherHands to SupportDeck', () => {
      const context = createActionContext('player-1', [player1, player2, player3], { supportStack: [] });

      const result = moveCard(context, Location.OtherHands, Location.SupportDeck, ['card-3']);

      expect(result.success).toBe(true);
      const updatedSupportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(updatedSupportStack).toHaveLength(1);
      expect(updatedSupportStack[0].id).toBe('card-3');
    });

    it('should move from OtherHands to OwnParty', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherHands, Location.OwnParty, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card3);
    });

    it('should move from Cache to SupportDeck', () => {
      const cache = [card3];
      const context = createActionContext('player-1', [player1], { cache, supportStack: [] });

      const result = moveCard(context, Location.Cache, Location.SupportDeck, ['card-3']);

      expect(result.success).toBe(true);
      const updatedSupportStack = context.gameStateMap.get('supportStack') as Card[];
      expect(updatedSupportStack).toHaveLength(1);
      expect(updatedSupportStack[0].id).toBe('card-3');
    });

    it('should move from Cache to DiscardPile', () => {
      const cache = [card3];
      const context = createActionContext('player-1', [player1], { cache, discardPile: [] });

      const result = moveCard(context, Location.Cache, Location.DiscardPile, ['card-3']);

      expect(result.success).toBe(true);
      const updatedDiscardPile = context.gameStateMap.get('discardPile') as Card[];
      expect(updatedDiscardPile).toHaveLength(1);
      expect(updatedDiscardPile[0].id).toBe('card-3');
    });

    it('should move from Cache to OwnParty', () => {
      const cache = [card3];
      const context = createActionContext('player-1', [player1], { cache });

      const result = moveCard(context, Location.Cache, Location.OwnParty, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card3);
    });

    it('should move from DiscardPile to Cache', () => {
      const discardPile = [card3];
      const context = createActionContext('player-1', [player1], { discardPile, cache: [] });

      const result = moveCard(context, Location.DiscardPile, Location.Cache, ['card-3']);

      expect(result.success).toBe(true);
      const updatedCache = context.gameStateMap.get('cache') as Card[];
      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('card-3');
    });

    it('should move from DiscardPile to OwnHand', () => {
      const discardPile = [card3];
      const context = createActionContext('player-1', [player1], { discardPile });

      const result = moveCard(context, Location.DiscardPile, Location.OwnHand, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.hand).toHaveLength(3); // originally had 2 cards
      expect(updatedPlayer.hand.some(card => card.id === 'card-3')).toBe(true);
    });

    it('should move from DiscardPile to OwnParty', () => {
      const discardPile = [card3];
      const context = createActionContext('player-1', [player1], { discardPile });

      const result = moveCard(context, Location.DiscardPile, Location.OwnParty, ['card-3']);

      expect(result.success).toBe(true);
      const updatedPlayer = context.playersMap.get('player-1') as Player;
      expect(updatedPlayer.party.heroes[0]).toEqual(card3);
    });
  });

  describe('NEW SOURCES: Party locations', () => {
    describe('Move from OwnParty', () => {
      it('should successfully move leader from own party to cache', () => {
        const context = createActionContext('player-1', [player1], { cache: [] });

        const result = moveCard(context, Location.OwnParty, Location.Cache, ['card-5']);

        expect(result.success).toBe(true);
        const updatedPlayer = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer.party.leader).toBeNull();

        const cache = context.gameStateMap.get('cache') as Card[];
        expect(cache).toHaveLength(1);
        expect(cache[0].id).toBe('card-5');
      });

      it('should successfully move hero from own party to cache', () => {
        const context = createActionContext('player-1', [player1], { cache: [] });

        const result = moveCard(context, Location.OwnParty, Location.Cache, ['card-6']);

        expect(result.success).toBe(true);
        const updatedPlayer = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer.party.heroes[0]).toBeNull();

        const cache = context.gameStateMap.get('cache') as Card[];
        expect(cache).toHaveLength(1);
        expect(cache[0].id).toBe('card-6');
      });

      it('should fail when card is not found in own party', () => {
        const context = createActionContext('player-1', [player1]);

        const result = moveCard(context, Location.OwnParty, Location.Cache, ['nonexistent-card']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Card nonexistent-card not found in own-party');
      });
    });

    describe('Move from AnyParty', () => {
      it('should successfully move cards from another player\'s party when all cards are from same player', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.AnyParty, Location.OwnHand, ['card-7']);

        expect(result.success).toBe(true);
        expect((result.data as MoveCardResultData)?.cards[0].id).toBe('card-7');

        // Check that card was removed from player2's party
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        expect(updatedPlayer2.party.leader).toBeNull();

        // Check that card was added to player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(3);
        expect(updatedPlayer1.hand.some(card => card.id === 'card-7')).toBe(true);
      });

      it('should fail when cards are from different players\' parties', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.AnyParty, Location.OwnHand, ['card-7', 'card-6']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('For AnyParty, all selected cards must come from the same player\'s party');
      });

      it('should fail when card is not found in any other player\'s party', () => {
        const context = createActionContext('player-1', [player1, player2]);

        const result = moveCard(context, Location.AnyParty, Location.OwnHand, ['card-5']); // card-5 is in player1's own party

        expect(result.success).toBe(false);
        expect(result.message).toBe('Card card-5 not found in any other player\'s party');
      });
    });

    describe('Move from OtherParties', () => {
      it('should successfully move cards from other players\' parties', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.OtherParties, Location.OwnHand, ['card-7', 'card-8']);

        expect(result.success).toBe(true);
        expect((result.data as MoveCardResultData)?.cards).toHaveLength(2);

        // Check that cards were removed from player2's party
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        expect(updatedPlayer2.party.leader).toBeNull();
        expect(updatedPlayer2.party.heroes[0]).toBeNull();

        // Check that cards were added to player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(4);
      });

      it('should fail when card is not found in any other player\'s party', () => {
        const context = createActionContext('player-1', [player1, player2]);

        const result = moveCard(context, Location.OtherParties, Location.OwnHand, ['nonexistent-card']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Card nonexistent-card not found in any other player\'s party');
      });
    });
  });

  describe('NEW DESTINATIONS: Hand and Party locations', () => {
    describe('Move to AnyHand', () => {
      it('should successfully move cards to any other player\'s hand', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.OwnHand, Location.AnyHand, ['card-1']);

        expect(result.success).toBe(true);

        // Check that card was removed from player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(1);
        expect(updatedPlayer1.hand[0].id).toBe('card-2');

        // Check that card was added to another player's hand (should be player2, the first available)
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        expect(updatedPlayer2.hand).toHaveLength(2);
        expect(updatedPlayer2.hand.some(card => card.id === 'card-1')).toBe(true);
      });

      it('should fail when no other players available', () => {
        const context = createActionContext('player-1', [player1]); // Only one player

        const result = moveCard(context, Location.OwnHand, Location.AnyHand, ['card-1']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('No other players available to receive cards in hand');
      });
    });

    describe('Move to OtherHands', () => {
      it('should successfully distribute cards to other players\' hands', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.OwnHand, Location.OtherHands, ['card-1', 'card-2']);

        expect(result.success).toBe(true);

        // Check that cards were removed from player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(0);

        // Check that cards were distributed to other players
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        const updatedPlayer3 = context.playersMap.get('player-3') as Player;

        const totalCardsInOtherHands = updatedPlayer2.hand.length + updatedPlayer3.hand.length;
        expect(totalCardsInOtherHands).toBe(4); // 2 original + 2 distributed
      });

      it('should fail when no other players available', () => {
        const context = createActionContext('player-1', [player1]); // Only one player

        const result = moveCard(context, Location.OwnHand, Location.OtherHands, ['card-1']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('No other players available to receive cards in hand');
      });
    });

    describe('Move to AnyParty', () => {
      it('should successfully move cards to any other player\'s party', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.OwnHand, Location.AnyParty, ['card-1']);

        expect(result.success).toBe(true);

        // Check that card was removed from player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(1);

        // Check that card was added to another player's party (should be player2, the first available)
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        expect(updatedPlayer2.party.heroes[1]).toEqual(card1); // Should fill first empty slot
      });

      it('should fail when no other players available', () => {
        const context = createActionContext('player-1', [player1]); // Only one player

        const result = moveCard(context, Location.OwnHand, Location.AnyParty, ['card-1']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('No other players available to receive cards in party');
      });
    });

    describe('Move to OtherParties', () => {
      it('should successfully distribute cards to other players\' parties', () => {
        const context = createActionContext('player-1', [player1, player2, player3]);

        const result = moveCard(context, Location.OwnHand, Location.OtherParties, ['card-1', 'card-2']);

        expect(result.success).toBe(true);

        // Check that cards were removed from player1's hand
        const updatedPlayer1 = context.playersMap.get('player-1') as Player;
        expect(updatedPlayer1.hand).toHaveLength(0);

        // Check that cards were distributed to other players' parties
        const updatedPlayer2 = context.playersMap.get('player-2') as Player;
        const updatedPlayer3 = context.playersMap.get('player-3') as Player;

        // Player2 should have card-1 in second hero slot, Player3 should have card-2 in first hero slot
        expect(updatedPlayer2.party.heroes[1]).toEqual(card1);
        expect(updatedPlayer3.party.heroes[0]).toEqual(card2);
      });

      it('should fail when no other players available', () => {
        const context = createActionContext('player-1', [player1]); // Only one player

        const result = moveCard(context, Location.OwnHand, Location.OtherParties, ['card-1']);

        expect(result.success).toBe(false);
        expect(result.message).toBe('No other players available to receive cards in party');
      });
    });
  });

  describe('ALL NEW COMBINATIONS: Party sources to all destinations', () => {
    it('should move from OwnParty to AnyHand', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.OwnParty, Location.AnyHand, ['card-5']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.hand.some(card => card.id === 'card-5')).toBe(true);
    });

    it('should move from OwnParty to OtherHands', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.OwnParty, Location.OtherHands, ['card-5']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.hand.some(card => card.id === 'card-5')).toBe(true);
    });

    it('should move from OwnParty to AnyParty', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.OwnParty, Location.AnyParty, ['card-5']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.heroes[1]).toEqual(card5);
    });

    it('should move from OwnParty to OtherParties', () => {
      const context = createActionContext('player-1', [player1, player2]);

      const result = moveCard(context, Location.OwnParty, Location.OtherParties, ['card-5']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.heroes[1]).toEqual(card5);
    });

    it('should move from AnyParty to AnyHand', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyParty, Location.AnyHand, ['card-7']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.hand.some(card => card.id === 'card-7')).toBe(true);
    });

    it('should move from AnyParty to OtherHands', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyParty, Location.OtherHands, ['card-7']);

      expect(result.success).toBe(true);
      // Card should be distributed to other players' hands
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      const updatedPlayer3 = context.playersMap.get('player-3') as Player;
      const cardFound = updatedPlayer2.hand.some(card => card.id === 'card-7') ||
                       updatedPlayer3.hand.some(card => card.id === 'card-7');
      expect(cardFound).toBe(true);
    });

    it('should move from AnyParty to AnyParty', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyParty, Location.AnyParty, ['card-7']);

      expect(result.success).toBe(true);
      // Card should move from one player's party to another's
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.leader).toBeNull(); // Removed from player2
      expect(updatedPlayer2.party.heroes[1]).toEqual(card7); // Added back to player2 (first available)
    });

    it('should move from AnyParty to OtherParties', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.AnyParty, Location.OtherParties, ['card-7']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.leader).toBeNull(); // Removed from leader position
    });

    it('should move from OtherParties to AnyHand', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherParties, Location.AnyHand, ['card-7']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.hand.some(card => card.id === 'card-7')).toBe(true);
    });

    it('should move from OtherParties to OtherHands', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherParties, Location.OtherHands, ['card-7']);

      expect(result.success).toBe(true);
      // Card should be distributed among other players' hands
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      const updatedPlayer3 = context.playersMap.get('player-3') as Player;
      const cardFound = updatedPlayer2.hand.some(card => card.id === 'card-7') ||
                       updatedPlayer3.hand.some(card => card.id === 'card-7');
      expect(cardFound).toBe(true);
    });

    it('should move from OtherParties to AnyParty', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherParties, Location.AnyParty, ['card-7']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.leader).toBeNull(); // Removed from leader position
      expect(updatedPlayer2.party.heroes[1]).toEqual(card7); // Added back to heroes
    });

    it('should move from OtherParties to OtherParties', () => {
      const context = createActionContext('player-1', [player1, player2, player3]);

      const result = moveCard(context, Location.OtherParties, Location.OtherParties, ['card-7']);

      expect(result.success).toBe(true);
      const updatedPlayer2 = context.playersMap.get('player-2') as Player;
      expect(updatedPlayer2.party.leader).toBeNull(); // Removed from leader position
    });
  });
});