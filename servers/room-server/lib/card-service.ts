import type { Card } from '../../../shared/types';
import { CardType, HeroClass, Location, Amount } from '../../../shared/types';

/**
 * Card service for retrieving card data by ID
 */

export function getCard(cardId: string): Card | null {
  // For now, return hardcoded Buttons card
  if (cardId === 'hero-042') {
    return {
      id: 'hero-042',
      name: 'Buttons',
      type: CardType.Hero,
      class: HeroClass.Thief,
      description: 'Pull a card from another player\'s hand. If it is a Magic card, you may play it immediately.',
      requirement: { type: 'point', value: 6 },
      effect: [
        {
          action: 'deduct-point'
        },
        {
          action: 'place-card'
        },
        {
          action: 'capture-challenge'
        },
        {
          action: 'capture-dice'
        },
        {
          action: 'capture-modifier'
        },
        {
          action: 'end-move'
        },
        {
          action: 'draw-card',
          parameters: [
            { name: 'target', type: 'LOCATION', value: Location.AnyHand },
            { name: 'destination', type: 'STRING', value: 'cache' },
            { name: 'amount', type: 'AMOUNT', value: Amount.One }
          ]
        },
        {
          action: 'play-card',
          parameters: [
            { name: 'target', type: 'STRING', value: 'cache' },
            { name: 'type', type: 'CARD_TYPE', value: CardType.Magic }
          ]
        },
        {
          action: 'draw-card',
          parameters: [
            { name: 'target', type: 'STRING', value: 'cache' },
            { name: 'destination', type: 'LOCATION', value: Location.OwnHand },
            { name: 'amount', type: 'AMOUNT', value: Amount.All }
          ]
        }
      ],
      imagePath: '/api/images/heroes/thief_buttons.png',
    };
  }

  // Card not found
  return null;
}