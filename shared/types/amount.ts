/**
 * Amount enum for action parameters
 * Defines how many cards/items an action affects
 */
export enum Amount {
  // Specific numbers (0-5 cards)
  Zero = 0,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,

  // Special amount
  All = 'all',  // All available cards/items
}