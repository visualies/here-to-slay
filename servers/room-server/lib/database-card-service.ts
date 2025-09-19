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

  // Create multiple copies of cards for a proper deck
  const deck: Card[] = []

  allCards.forEach((card, index) => {
    // Add original
    deck.push(card)

    // Add 2 copies with unique IDs
    deck.push({ ...card, id: `${card.id}-copy1-${index}` })
    deck.push({ ...card, id: `${card.id}-copy2-${index}` })
  })

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

  // Create support stack with 20 random cards from database
  const supportStack: Card[] = []
  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * allAvailableCards.length)
    const selectedCard = allAvailableCards[randomIndex]
    // Create a unique copy with a new ID to avoid conflicts
    supportStack.push({
      ...selectedCard,
      id: `support-${selectedCard.id}-${i}`
    })
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
