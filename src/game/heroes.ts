import type { Card } from '../types';
import { CardType, HeroClass } from '../types';

export const heroRegistry: Card[] = [
  {
    id: 'hero-001',
    name: 'Greedy Cheeks',
    type: CardType.Hero,
    class: HeroClass.Bard,
    description: 'Draw 2 cards.',
    requirement: 6,
    effect: [{
      action: 'DRAW',
      amount: 2,
    }],
  },
  {
    id: 'hero-002',
    name: 'Bad Axe',
    type: CardType.Hero,
    class: HeroClass.Fighter,
    description: 'Destroy a Hero card.',
    requirement: 8,
    effect: [{
      action: 'DESTROY',
      amount: 1,
      cardType: CardType.Hero,
    }],
  },
  {
    id: 'hero-003',
    name: 'Kit Napper',
    type: CardType.Hero,
    class: HeroClass.Thief,
    description: 'Steal a Hero card.',
    requirement: 7,
    effect: [{
      action: 'STEAL',
      amount: 1,
      cardType: CardType.Hero,
    }],
  },
];
