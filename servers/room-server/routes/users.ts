import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import { generateRandomPlayerName } from '../lib/player-names.js'

export function createUsersRouter() {
  const router = new Hono()

  // In-memory store for player names (keyed by player ID)
  // In a production app, this would be in a database
  const playerNames = new Map<string, string>()

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
      let playerId = getCookie(c, 'player_id')
      console.log('🍪 /users/@me - Found player ID in cookie:', playerId)

      if (playerId) {
        // Return existing player data from cookie
        console.log('✅ Returning existing player:', playerId)

        // Get or generate player name for this player ID
        let playerName = playerNames.get(playerId)
        if (!playerName) {
          playerName = generateRandomPlayerName()
          playerNames.set(playerId, playerName)
          console.log(`🎲 Generated new name "${playerName}" for existing player ${playerId}`)
        }

        return c.json({
          success: true,
          data: {
            playerId: playerId,
            playerName: playerName,
            playerColor: '#FF6B6B', // Default color, can be updated
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        })
      }

      // No valid cookie - create new player and set cookie now
      console.log('🆕 Creating new player - no cookie found')
      const newPlayerId = generatePlayerId()
      console.log('🎲 Generated new player ID:', newPlayerId)

      // Generate random player name
      const newPlayerName = generateRandomPlayerName()
      playerNames.set(newPlayerId, newPlayerName)
      console.log(`🎲 Assigned name "${newPlayerName}" to new player ${newPlayerId}`)

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
          playerName: newPlayerName,
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
      let playerId = getCookie(c, 'player_id')

      // If no player cookie, create one now (mirror GET /@me behavior)
      if (!playerId) {
        const newPlayerId = generatePlayerId()
        setCookie(c, 'player_id', newPlayerId, {
          maxAge: 365 * 24 * 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax'
        })
        playerId = newPlayerId
      }

      const body = await c.req.json()
      const { playerName, playerColor } = body

      if (!playerName) {
        return c.json({ error: 'Player name is required' }, 400)
      }

      // Store the updated player name
      playerNames.set(playerId, playerName)
      console.log(`✏️ Updated name for player ${playerId} to "${playerName}"`)

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
      
      // Always return empty array, even if no player ID
      return c.json({
        success: true,
        data: {
          playerId: playerId || '',
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
