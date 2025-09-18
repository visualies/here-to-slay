/**
 * Player name utility for generating random names from the Here to Slay universe
 */

// Hero names from the game - perfect for player names
export const PLAYER_NAMES = [
  // Bards
  'Greedy Cheeks',
  'Dogy Dealer',
  'Mellow Dee',
  'Tipsy Tootie',

  // Wizards
  'Buttons',
  'Fluffy',
  'Hopper',
  'Snowball',
  'Spooky',
  'Whiskers',

  // Fighters & Thieves
  'Bad Axe',
  'Kit Napper',

  // Additional themed names to expand the pool
  'Sparkles',
  'Nibbles',
  'Patches',
  'Muddy Paws',
  'Sir Fluffington',
  'Luna',
  'Biscuit',
  'Midnight',
  'Clover',
  'Pumpkin',
  'Shadow',
  'Sunny',
  'Storm',
  'River',
  'Sage',
  'Ember',
  'Frost',
  'Thorn',
  'Willow',
  'Aspen'
] as const;

/**
 * Generates a random player name from the Here to Slay universe
 * In test mode, returns a predictable name for consistent testing
 */
export function generateRandomPlayerName(): string {
  // In test mode, use predictable names for consistent testing
  if (process.env.NODE_ENV === 'test') {
    return 'Player'; // Consistent test name
  }

  const randomIndex = Math.floor(Math.random() * PLAYER_NAMES.length);
  return PLAYER_NAMES[randomIndex];
}

/**
 * Generates a unique player name that's not in the provided list of used names
 * Falls back to numbered variants if all base names are taken
 */
export function generateUniquePlayerName(usedNames: string[] = []): string {
  const availableNames = PLAYER_NAMES.filter(name => !usedNames.includes(name));

  if (availableNames.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    return availableNames[randomIndex];
  }

  // If all base names are taken, generate numbered variants
  let attempt = 1;
  let candidateName: string;

  do {
    const baseName = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
    candidateName = `${baseName} ${attempt}`;
    attempt++;
  } while (usedNames.includes(candidateName) && attempt < 100);

  return candidateName;
}

/**
 * Get all available player names (useful for testing or UI)
 */
export function getAllPlayerNames(): readonly string[] {
  return PLAYER_NAMES;
}