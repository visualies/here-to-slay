/**
 * Card type enum
 * Defines the different types of cards in the game
 */
export enum CardType {
  Hero = 'Hero',
  Item = 'Item',
  Magic = 'Magic',
  Monster = 'Monster',
  Modifier = 'Modifier',
  PartyLeader = 'PartyLeader',

  // Action-specific selectors for parameter system
  All = 'all',       // Select from all card types
  Any = 'any',       // Any single card type
  Challenge = 'challenge', // Challenge cards
}