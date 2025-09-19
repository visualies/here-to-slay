import { CardType, Card } from '../types';

export const modifierRegistry: Card[] = [
  {
    id: 'modifier-001',
    name: 'Sample Modifier',
    type: CardType.Modifier,
    description: 'A sample modifier card',
    requirements: [{ type: 'point', value: 0 }],
    effect: [],
    imagePath: '/api/images/card/modifier-001',
  },
  {
    id: 'modifier-plus-3',
    name: '+3 Modifier',
    type: CardType.Modifier,
    description: 'Adds +3 to dice roll',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'MODIFY_ROLL',
      amount: 3,
    }],
    imagePath: '/api/images/card/modifier-plus-3',
  },
  {
    id: 'modifier-minus-3',
    name: '-3 Modifier',
    type: CardType.Modifier,
    description: 'Subtracts 3 from dice roll',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'MODIFY_ROLL',
      amount: -3,
    }],
    imagePath: '/api/images/card/modifier-minus-3',
  },
  {
    id: 'modifier-plus-4',
    name: '+4 Modifier',
    type: CardType.Modifier,
    description: 'Adds +4 to dice roll',
    requirements: [{ type: 'point', value: 0 }],
    effect: [{
      action: 'MODIFY_ROLL',
      amount: 4,
    }],
    imagePath: '/api/images/card/modifier-plus-4',
  },
];

export const getModifierById = (id: string): Card | undefined => {
  return modifierRegistry.find(modifier => modifier.id === id);
};

export const getAllModifiers = (): Card[] => {
  return modifierRegistry;
};
