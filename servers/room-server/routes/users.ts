import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'

export function createUsersRouter() {
  const router = new Hono()

  // Generate a unique player ID
  function generatePlayerId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Get or create player data from cookie
  router.get('/@me', async (c) => {
    try {
      // Get player ID from cookie
      const playerId = getCookie(c, 'player_id')
      
      if (playerId) {
        // Return existing player data from cookie
        return c.json({
          success: true,
          data: {
            playerId: playerId,
            playerName: 'Player', // Default name, can be updated
            playerColor: '#FF6B6B', // Default color, can be updated
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        })
      }

      // No valid cookie - create new player
      const newPlayerId = generatePlayerId()

      // Set cookie with 1 year expiration
      setCookie(c, 'player_id', newPlayerId, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      })

      return c.json({
        success: true,
        data: {
          playerId: newPlayerId,
          playerName: 'Player', // Default name
          playerColor: '#FF6B6B', // Default color
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error in /users/@me:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Update player data
  router.put('/@me', async (c) => {
    try {
      const playerId = getCookie(c, 'player_id')
      
      if (!playerId) {
        return c.json({ error: 'No player ID found in cookie' }, 400)
      }

      const body = await c.req.json()
      const { playerName, playerColor } = body

      if (!playerName) {
        return c.json({ error: 'Player name is required' }, 400)
      }

      // Since we don't have a database, just return the updated data
      // The actual player data will be stored in the Yjs document when they join a room
      return c.json({
        success: true,
        data: {
          playerId: playerId,
          playerName: playerName,
          playerColor: playerColor || '#FF6B6B',
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error updating player:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Get recent rooms for a player
  router.get('/@me/rooms', async (c) => {
    try {
      const playerId = getCookie(c, 'player_id')
      
      if (!playerId) {
        return c.json({ error: 'No player ID found in cookie' }, 400)
      }

      // Since we removed recent rooms functionality, return empty array
      return c.json({
        success: true,
        data: {
          playerId,
          recentRooms: []
        }
      })
    } catch (error) {
      console.error('Error getting recent rooms:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  return router
}
