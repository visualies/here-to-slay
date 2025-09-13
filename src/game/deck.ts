import type { Card } from '../types';
import { CardType, HeroClass } from '../types';
import { heroRegistry } from './heroes';
import { modifierRegistry } from './modifiers';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  // Add all hero cards to the deck
  deck.push(...heroRegistry);
  
  // Add more hero cards to make it a proper deck
  // For now, we'll add multiple copies of existing heroes
  heroRegistry.forEach(hero => {
    deck.push({ ...hero, id: `${hero.id}-copy1` });
    deck.push({ ...hero, id: `${hero.id}-copy2` });
  });
  
  // Add placeholder item/magic/monster cards to reach proper deck size
  for (let i = 0; i < 15; i++) {
    deck.push({
      id: `item-${i}`,
      name: `Item Card ${i + 1}`,
      type: CardType.Item,
      description: 'A mysterious item.',
      requirement: 4,
      effect: []
    });
  }
  
  // Add placeholder modifier cards
  for (let i = 0; i < 5; i++) {
    deck.push({
      id: `modifier-${i}`,
      name: `Modifier Card ${i + 1}`,
      type: CardType.Modifier,
      description: 'A card that modifies game rules or effects.',
      requirement: 3,
      effect: []
    });
  }
  
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealHand(deck: Card[], handSize: number = 5): { hand: Card[], remainingDeck: Card[] } {
  const hand = deck.slice(0, handSize);
  const remainingDeck = deck.slice(handSize);
  return { hand, remainingDeck };
}

export function createSupportStack(): Card[] {
  // Combine all available cards from registries (excluding party leaders)
  const allAvailableCards = [...heroRegistry, ...modifierRegistry];
  
  // Create support stack with 20 random cards from registries
  const supportCards: Card[] = [];
  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * allAvailableCards.length);
    const selectedCard = allAvailableCards[randomIndex];
    // Create a unique copy with a new ID to avoid conflicts
    supportCards.push({
      ...selectedCard,
      id: `support-${selectedCard.id}-${i}`
    });
  }
  
  return supportCards;
}