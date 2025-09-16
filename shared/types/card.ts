// Forward declaration to avoid circular import
export type Action = {
  action: string;
  amount?: number;
  cardType?: CardType;
  location?: 'deck' | 'discard';
  duration?: 'turn' | 'permanent';
};

/**
 * Card requirement system that supports different types of conditions for playing cards
 * - 'point': Requires action points (use value for amount)
 * - 'hero': Requires heroes in party (use value for count)
 * - 'roll': Requires dice roll (use value for minimum roll needed)
 * - 'duplicate': Cannot be played if already played this turn
 * - 'class': Requires specific hero class in party (use class field)
 * - 'hand': Requires specific number of cards in hand (use value for count)
 */

export type Requirement = {
  type: 'point' | 'hero' | 'roll' | 'duplicate' | 'class' | 'hand';
  value?: number;
  class?: HeroClass;
  description?: string;
};

export type Card = {
  id: string;
  name: string;
  type: CardType;
  class?: HeroClass;
  description: string;
  requirement?: Requirement;
  effect: Action[];
  imagePath?: string;
};

export enum CardType {
  Hero = 'Hero',
  Item = 'Item',
  Magic = 'Magic',
  Monster = 'Monster',
  Modifier = 'Modifier',
  PartyLeader = 'PartyLeader',
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