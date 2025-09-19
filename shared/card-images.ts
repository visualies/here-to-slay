const CARD_IMAGE_MAP: Record<string, string> = {
  // Heroes
  'hero-001': 'heroes/bard_greedy_cheeks.png',
  'hero-002': 'heroes/bard_dogy_dealer.png',
  'hero-003': 'heroes/bard_mellow_dee.png',
  'hero-004': 'heroes/bard_tipsy_tootie.png',
  'hero-005': 'heroes/wizard_buttons.png',
  'hero-008': 'heroes/wizard_snowball.png',
  'hero-009': 'heroes/wizard_spooky.png',
  'hero-010': 'heroes/wizard_whiskers.png',

  // Party leaders
  'party-leader-001': 'party-leaders/partyleader_figher.png',
  'party-leader-002': 'party-leaders/partyleader_bard.png',
  'party-leader-003': 'party-leaders/partyleader_ranger.png',
  'party-leader-004': 'party-leaders/partyleader_thief.png',

  // Monsters
  'monster-001': 'monsters/monster_anuran_cauldron.png',
  'monster-002': 'monsters/monster_crowned_serpent.png',
  'monster-003': 'monsters/monster_mega_slime.png',

  // Modifiers
  'modifier-001': 'modifiers/modifier-001.png',
  'modifier-plus-3': 'modifiers/modifier-plus-3.png',
  'modifier-minus-3': 'modifiers/modifier-minus-3.png',
  'modifier-plus-4': 'modifiers/modifier-plus-4.png',
};

export function resolveCardImagePath(id: string): string | null {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return null;
  }

  const baseId = normalizedId.replace(/\.(png|jpg|jpeg|webp)$/i, '');

  if (CARD_IMAGE_MAP[baseId]) {
    return CARD_IMAGE_MAP[baseId];
  }

  return CARD_IMAGE_MAP[normalizedId] ?? null;
}

export function getCardImageUrl(cardId: string): string | null {
  const relative = resolveCardImagePath(cardId);
  if (!relative) {
    return null;
  }
  return `/api/images/card/${cardId}`;
}

export function cardImageExists(cardId: string): boolean {
  return resolveCardImagePath(cardId) !== null;
}
