import { HeroClass } from './hero-class';

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