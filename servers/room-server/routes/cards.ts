import { Hono } from 'hono'
import { db } from '../db/client'
import { cards, actions, actionParams } from '../db/schema'
import { eq } from 'drizzle-orm'

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

  // POST endpoint for creating test cards with a single action
  router.post('/test-card', async (c) => {
    try {
      const body = await c.req.json()
      const { action, parameters = [], cardName, cardDescription } = body

      // Validate required fields
      if (!action) {
        return c.json(
          { success: false, message: 'Action is required' },
          400
        )
      }

      // Generate unique test card ID
      const testCardId = `test-${action}-${Date.now()}`
      const finalCardName = cardName || `Test ${action} Card`
      const finalCardDescription = cardDescription || `Test card for ${action} action`

      // Insert the test card
      const cardResult = db.insert(cards).values({
        id: testCardId,
        name: finalCardName,
        type: 'Test',
        description: finalCardDescription,
        imagePath: null,
      }).run()

      // Insert the action
      const actionResult = db.insert(actions).values({
        cardId: testCardId,
        action: action
      }).run()

      const actionId = (actionResult as unknown as { lastInsertRowid: number }).lastInsertRowid as number

      // Insert action parameters if provided
      for (const param of parameters) {
        const { name, type, value } = param
        if (name && type && value !== undefined) {
          db.insert(actionParams).values({
            actionId: actionId,
            name: name,
            type: type,
            value: String(value)
          }).run()
        }
      }

      // Fetch the complete card with relations
      const createdCard = await db.query.cards.findFirst({
        where: (cards, { eq }) => eq(cards.id, testCardId),
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
        message: `Test card created: ${finalCardName}`,
        data: createdCard
      })
    } catch (error) {
      console.error('Error creating test card:', error)
      return c.json(
        { success: false, message: 'Failed to create test card' },
        500
      )
    }
  })

  // DELETE endpoint for cleaning up test cards
  router.delete('/test-card/:cardId', async (c) => {
    try {
      const cardId = c.req.param('cardId')

      // Only allow deletion of test cards
      if (!cardId.startsWith('test-')) {
        return c.json(
          { success: false, message: 'Can only delete test cards' },
          400
        )
      }

      // Delete the card (cascade will handle actions and params)
      const result = db.delete(cards).where(eq(cards.id, cardId)).run()

      if (result.changes === 0) {
        return c.json(
          { success: false, message: `Test card ${cardId} not found` },
          404
        )
      }

      return c.json({
        success: true,
        message: `Test card ${cardId} deleted`
      })
    } catch (error) {
      console.error('Error deleting test card:', error)
      return c.json(
        { success: false, message: 'Failed to delete test card' },
        500
      )
    }
  })

  return router
}