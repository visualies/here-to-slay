export interface Player {
  id: string;
  name: string;
  color: string;
  position: 'top' | 'right' | 'bottom' | 'left';
  hand: Card[];
  deck: Card[];
  isActive: boolean;
}

export interface Card {
  // Placeholder for card properties
  id: string;
  name: string;
  type: CardType;
  class?: HeroClass;
  description: string;
  requirement?: string;
  effect: Action[];
}

export enum CardType {
  Hero = 'Hero',
  Item = 'Item',
  Magic = 'Magic',
  Monster = 'Monster',
}

export interface Action {
  action: string;
  amount?: number;
  cardType?: CardType;
  location?: 'deck' | 'discard';
  duration?: 'turn' | 'permanent';
}

export interface ActionParams {
  player: Player;
  target?: Player;
  effect: Action;
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

export interface GameState {
  players: Player[];
  currentTurn: string;
  supportStack: Card[];
  phase: 'waiting' | 'playing' | 'ended';
}