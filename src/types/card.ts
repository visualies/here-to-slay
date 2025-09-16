
// Re-export shared Card type as the canonical Card type
export type { Card } from '../../shared/types/card';

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
