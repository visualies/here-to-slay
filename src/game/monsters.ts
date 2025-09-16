import type { Card } from '../types';
import { CardType } from '../types';

export const monsterRegistry: Card[] = [
  {
    id: 'monster-001',
    name: 'Anuran Cauldron',
    type: CardType.Monster,
    description: 'A mystical amphibian creature brewing dark magic.',
    requirement: { type: 'roll', value: 8 },
    effect: [{
      action: 'POISON',
      amount: 2,
    }],
    imagePath: '/api/images/monsters/monster_anuran_cauldron.png',
  },
  {
    id: 'monster-002',
    name: 'Crowned Serpent',
    type: CardType.Monster,
    description: 'A regal serpent with venomous fangs and ancient wisdom.',
    requirement: { type: 'roll', value: 10 },
    effect: [{
      action: 'HYPNOSIS',
      amount: 1,
    }],
    imagePath: '/api/images/monsters/monster_crowned_serpent.png',
  },
  {
    id: 'monster-003',
    name: 'Mega Slime',
    type: CardType.Monster,
    description: 'A massive gelatinous creature that absorbs everything in its path.',
    requirement: { type: 'roll', value: 12 },
    effect: [{
      action: 'ABSORB',
      amount: 3,
    }],
    imagePath: '/api/images/monsters/monster_mega_slime.png',
  },
];

export const getMonsterById = (id: string): Card | undefined => {
  return monsterRegistry.find(monster => monster.id === id);
};

export const getAllMonsters = (): Card[] => {
  return monsterRegistry;
};

export const getRandomMonster = (): Card => {
  const randomIndex = Math.floor(Math.random() * monsterRegistry.length);
  return monsterRegistry[randomIndex];
};