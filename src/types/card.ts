
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
