// Forward declaration to avoid circular import
export type Action = {
  action: string;
  amount?: number;
  cardType?: CardType;
  location?: 'deck' | 'discard';
  duration?: 'turn' | 'permanent';
};

export type Card = {
  id: string;
  name: string;
  type: CardType;
  class?: HeroClass;
  description: string;
  requirement?: number;
  effect: Action[];
};

export enum CardType {
  Hero = 'Hero',
  Item = 'Item',
  Magic = 'Magic',
  Monster = 'Monster',
  Modifier = 'Modifier',
}

export enum HeroClass {
  Fighter = 'Fighter',
  Bard = 'Bard',
  Guardian = 'Guardian',
  Ranger = 'Ranger',
  Thief = 'Thief',
  Wizard = 'Wizard',
  Warrior = 'Warrior',
  Druid = 'Druid',
  Berserker = 'Berserker',
  Necromancer = 'Necromancer',
  Sorcerer = 'Sorcerer',
}
