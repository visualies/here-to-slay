import { db } from '../db/client'
import { cards } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { Card } from '../../../shared/types'
import { getCardImageUrl } from '../../../shared/card-images'

/**
 * Convert database card to game Card format
 */
function convertDbCardToGameCard(dbCard: any): Card {
  return {
    id: dbCard.id,
    name: dbCard.name,
    type: dbCard.type,
    heroClass: dbCard.heroClass,
    description: dbCard.description,
    imagePath: dbCard.image_path,
    requirements: dbCard.requirements || [],
    effect: dbCard.actions || []
  }
}

/**
 * Get all cards from database
 */
export function getAllCardsFromDatabase(): Card[] {
  try {
    const dbCards = db.select().from(cards).all()
    return dbCards.map(convertDbCardToGameCard)
  } catch (error) {
    console.error('Error fetching cards from database:', error)
    return []
  }
}

/**
 * Get hero cards from database
 */
export function getHeroCardsFromDatabase(): Card[] {
  try {
    const dbCards = db.select().from(cards).where(eq(cards.type, 'Hero')).all()
    return dbCards.map(convertDbCardToGameCard)
  } catch (error) {
    console.error('Error fetching hero cards from database:', error)
    return []
  }
}

/**
 * Get non-hero cards from database (for support stack)
 */
export function getSupportCardsFromDatabase(): Card[] {
  try {
    // Get all cards that are not heroes (System cards, etc.)
    const dbCards = db.select().from(cards).where(eq(cards.type, 'System')).all()
    return dbCards.map(convertDbCardToGameCard)
  } catch (error) {
    console.error('Error fetching support cards from database:', error)
    return []
  }
}

/**
 * Create a shuffled deck from database cards
 */
export function createDeckFromDatabase(): Card[] {
  const allCards = getAllCardsFromDatabase()

  // For now, just use the original cards without creating copies
  // Each card should exist in the database with its actual ID
  const deck: Card[] = [...allCards]

  return shuffleDeck(deck)
}

/**
 * Create support stack from database cards
 */
export function createSupportStackFromDatabase(): Card[] {
  const supportCards = getSupportCardsFromDatabase()
  const heroCards = getHeroCardsFromDatabase()

  // Combine support and hero cards for the support stack
  const allAvailableCards = [...supportCards, ...heroCards]

  if (allAvailableCards.length === 0) {
    console.warn('No cards found in database for support stack')
    return []
  }

  // Create support stack with available cards, each with unique instance ID
  const supportStack: Card[] = []
  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * allAvailableCards.length)
    const selectedCard = allAvailableCards[randomIndex]
    // Create a unique instance of the card with an instance ID
    const cardInstance: Card = {
      ...selectedCard,
      instanceId: `${selectedCard.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    supportStack.push(cardInstance)
  }

  return supportStack
}

/**
 * Deal cards from database to a player
 */
export function dealCardsFromDatabase(handSize: number = 5): Card[] {
  const deck = createDeckFromDatabase()
  return deck.slice(0, handSize)
}

/**
 * Shuffle an array of cards
 */
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
