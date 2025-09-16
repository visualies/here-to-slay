/**
 * Location enum for action parameters
 * Defines where actions can target or place cards
 */
export enum Location {
  // Hand locations
  AnyHand = 'any-hand',
  OtherHands = 'other-hands',
  OwnHand = 'own-hand',

  // Party locations
  AnyParty = 'any-party',
  OtherParties = 'other-parties',
  OwnParty = 'own-party',

  // Conditional party locations
  OtherPartiesWithFighter = 'other-parties-with-fighter',
  OtherPartiesWithThief = 'other-parties-with-thief',

  // Game areas
  Cache = 'cache',
  DiscardPile = 'discard-pile',
  SupportDeck = 'support-deck',

  // Dynamic references
  LastTarget = 'last-target',
}