import type { ActionParams } from '../../../shared/types';
import {
  Location,
  Amount,
  CardType
} from '../../../shared/types';

// Type-specific getParam overloads for built-in enum types
export function getParam<T extends Location>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends Amount>(params: ActionParams | undefined, name: string): T;
export function getParam<T extends CardType>(params: ActionParams | undefined, name: string): T;
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

