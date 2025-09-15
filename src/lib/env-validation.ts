/**
 * Environment variable validation utilities
 * Ensures required environment variables are set and throws meaningful errors if not
 */

export interface EnvConfig {
  gameServerWsUrl: string;
  gameServerApiUrl: string;
  diceServerWsUrl: string;
  diceServerApiUrl: string;
  gameServerHost: string;
  gameServerPort: string;
}

/**
 * Validates and returns required environment variables for client-side use
 * Throws an error if any required variables are missing
 */
export function env(): EnvConfig {
  const gameServerWsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_WS_URL;
  const gameServerApiUrl = process.env.NEXT_PUBLIC_GAME_SERVER_API_URL;
  const diceServerWsUrl = process.env.NEXT_PUBLIC_DICE_SERVER_WS_URL;
  const diceServerApiUrl = process.env.NEXT_PUBLIC_DICE_SERVER_API_URL;

  if (!gameServerWsUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_GAME_SERVER_WS_URL');
  }

  if (!gameServerApiUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_GAME_SERVER_API_URL');
  }

  if (!diceServerWsUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_DICE_SERVER_WS_URL');
  }

  if (!diceServerApiUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_DICE_SERVER_API_URL');
  }

  return {
    gameServerWsUrl,
    gameServerApiUrl,
    diceServerWsUrl,
    diceServerApiUrl,
    gameServerHost: process.env.GAME_SERVER_HOST || 'localhost',
    gameServerPort: process.env.GAME_SERVER_PORT || '8234'
  };
}

/**
 * Validates server-side environment variables
 * Throws an error if any required variables are missing
 */
export function validateServerEnv() {
  const host = process.env.HOST;
  const port = process.env.PORT;

  if (!host) {
    throw new Error('Missing required environment variable: HOST');
  }

  if (!port) {
    throw new Error('Missing required environment variable: PORT');
  }

  return { host, port };
}

/**
 * Helper to get environment variable or throw error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}