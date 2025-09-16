import { Action } from '@/types';
import { CardType } from './card-type';
import { HeroClass } from './hero-class';
import { Requirement } from './requirement';


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