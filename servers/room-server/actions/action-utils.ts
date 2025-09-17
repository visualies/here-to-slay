import type { ActionParams, ActionContext, Player, Card } from '../../../shared/types';
import {
  Location,
  Amount,
  CardType,
  SelectionMode
} from '../../../shared/types';

// Type-specific getParam overloads for built-in enum types
export function getParam<T extends Location>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends Amount>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends CardType>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends SelectionMode>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends string>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends number>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends boolean>(params: ActionParams | undefined, name: string): T;

/**
 * Generic utility function to extract required type-safe parameter values from ActionParams
 * @param params - The ActionParams object containing parameter array
 * @param name - The parameter name to look for
 * @returns The parameter value, typed as T
 * @throws Error if parameter is missing or invalid
 */
export function getParam<T>(
  params: ActionParams | undefined,
  name: string
): T {
  if (!params) {
    throw new Error(`Parameter '${name}' is required but no parameters provided`);
  }

  const param = params.parameters.find(p => p.name === name);
  if (!param) {
    throw new Error(`Required parameter '${name}' not found`);
  }

  // Validate based on known enum types
  const value = param.value;

  // Check if it's a Location enum
  if (isLocation(value)) return value as T;
  if (isAmount(value)) return value as T;
  if (isCardType(value)) return value as T;
  if (isSelectionMode(value)) return value as T;

  // For primitive types, just return as-is (TypeScript will catch type mismatches at compile time)
  return value as T;
}

// Enum validators (kept private for internal use)
function isLocation(value: unknown): value is Location {
  return typeof value === 'string' && Object.values(Location).includes(value as Location);
}

function isAmount(value: unknown): value is Amount {
  if (value === Amount.All || value === 'all') return true;
  if (typeof value === 'number' && value >= 0 && value <= 5) return true;
  if (typeof value === 'string' && !isNaN(Number(value))) {
    const num = Number(value);
    return num >= 0 && num <= 5;
  }
  return Object.values(Amount).includes(value as Amount);
}

function isCardType(value: unknown): value is CardType {
  return typeof value === 'string' && Object.values(CardType).includes(value as CardType);
}

function isSelectionMode(value: unknown): value is SelectionMode {
  return typeof value === 'string' && Object.values(SelectionMode).includes(value as SelectionMode);
}

/**
 * Determine the appropriate selection mode based on available cards vs needed amount
 * @param context - Action context with game state
 * @param target - Location to draw cards from
 * @param amount - Amount of cards needed
 * @returns SelectionMode.First for auto-selection, DestinationOwner for user choice
 */
export function determineSelectionMode(context: ActionContext, target: Location, amount: Amount): SelectionMode {
  const { playersMap, gameStateMap, playerId } = context;

  // Get available cards from the target location
  let totalAvailableCards = 0;

  switch (target) {
    case Location.SupportDeck:
      const supportStack = gameStateMap.get('supportStack') as Card[] || [];
      totalAvailableCards = supportStack.length;
      break;
    case Location.OwnHand:
      const player = playersMap.get(playerId) as Player;
      totalAvailableCards = player?.hand?.length || 0;
      break;
    case Location.AnyHand:
    case Location.OtherHands:
      const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
      totalAvailableCards = otherPlayers.reduce((total, player) => {
        return total + (player.hand?.length || 0);
      }, 0);
      break;
    case Location.OwnParty:
      const ownPlayer = playersMap.get(playerId) as Player;
      totalAvailableCards = ownPlayer?.party?.heroes?.filter(hero => hero !== null).length || 0;
      break;
    // Add more cases as needed for other locations like discard pile, cache, etc.
    default:
      // For unknown locations, default to First mode
      return SelectionMode.First;
  }

  // Convert amount to number
  let numAmount: number;
  if (amount === Amount.All) {
    numAmount = totalAvailableCards;
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else if (typeof amount === 'string' && !isNaN(Number(amount))) {
    numAmount = Number(amount);
  } else {
    numAmount = 1; // Default fallback
  }

  // Special case: For support deck, always use First mode (auto-select) for draw card actions
  //TODO make this differentiate between location types (stack, fan)
  if (target === Location.SupportDeck) {
    return SelectionMode.First;
  }

  // If we need more cards than available, or equal, use First mode (auto-select all)
  if (numAmount >= totalAvailableCards) {
    return SelectionMode.First;
  } else {
    // More cards available than needed - destination owner (current player) should choose
    return SelectionMode.DestinationOwner;
  }
}

