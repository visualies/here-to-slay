import { Hono } from 'hono'
import { db } from '../db/client'
import { cards } from '../db/schema'

export function createCardsRouter() {
  const router = new Hono()

  // Get all cards with their requirements and actions
  router.get('/', async (c) => {
    try {
      const allCards = await db.query.cards.findMany({
        with: {
          requirements: true,
          actions: {
            with: {
              params: true,
            },
          },
        },
      })

      return c.json({
        success: true,
        data: allCards,
        count: allCards.length
      })
    } catch (error) {
      console.error('Error fetching cards:', error)
      return c.json(
        { success: false, message: 'Failed to fetch cards' },
        500
      )
    }
  })

  // Get a single card by ID
  router.get('/:cardId', async (c) => {
    try {
      const cardId = c.req.param('cardId')

      const card = await db.query.cards.findFirst({
        where: (cards, { eq }) => eq(cards.id, cardId),
        with: {
          requirements: true,
          actions: {
            with: {
              params: true,
            },
          },
        },
      })

      if (!card) {
        return c.json(
          { success: false, message: `Card ${cardId} not found` },
          404
        )
      }

      return c.json({
        success: true,
        data: card
      })
    } catch (error) {
      console.error('Error fetching card:', error)
      return c.json(
        { success: false, message: 'Failed to fetch card' },
        500
      )
    }
  })

  return router
}