// Re-export shared types for backward compatibility
export type { Player, Card, Action, ActionParams, GameState, Room, DicePosition, ServerDiceState, ServerDiceStates, CoordinateTransformer, ActionContext, ActionResult, Turn } from '../../shared/types';
export { CardType, HeroClass, FIELD_SIZE } from '../../shared/types';

// Export local types
export type { SimpleRequirement } from '../../shared/types/card';

// Legacy re-exports
export type { Room as MultiplayerRoom } from '../../shared/types';

// Frontend-specific types that don't need sharing
export type GameActions = Record<string, unknown>; // Define this type here if it's frontend-specific
