import type { Card } from '../types';
import { CardType } from '../types';

export const modifierRegistry: Card[] = [
  {
    id: 'modifier-001',
    name: 'Sample Modifier',
    type: CardType.Modifier,
    description: 'A sample modifier card',
    requirement: 0,
    effect: [],
    imagePath: '/api/images/modifiers/modifier-001.png',
  },
  {
    id: 'modifier-plus-3',
    name: '+3 Modifier',
    type: CardType.Modifier,
    description: 'Adds +3 to dice roll',
    requirement: 0,
    effect: [{
      action: 'MODIFY_ROLL',
      amount: 3,
    }],
    imagePath: '/api/images/modifiers/modifier-plus-3.png',
  },
  {
    id: 'modifier-minus-3',
    name: '-3 Modifier',
    type: CardType.Modifier,
    description: 'Subtracts 3 from dice roll',
    requirement: 0,
    effect: [{
      action: 'MODIFY_ROLL',
      amount: -3,
    }],
    imagePath: '/api/images/modifiers/modifier-minus-3.png',
  },
  {
    id: 'modifier-plus-4',
    name: '+4 Modifier',
    type: CardType.Modifier,
    description: 'Adds +4 to dice roll',
    requirement: 0,
    effect: [{
      action: 'MODIFY_ROLL',
      amount: 4,
    }],
    imagePath: '/api/images/modifiers/modifier-plus-4.png',
  },
];

export const getModifierById = (id: string): Card | undefined => {
  return modifierRegistry.find(modifier => modifier.id === id);
};

export const getAllModifiers = (): Card[] => {
  return modifierRegistry;
};