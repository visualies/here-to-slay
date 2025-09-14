import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import type RoomDatabase from '../../../src/lib/database.js'

export function createUsersRouter(db: RoomDatabase) {
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
        // Try to get existing player data
        const player = db.getPlayerById(playerId)
        if (player) {
          // Update last seen timestamp
          db.updatePlayerLastSeen(playerId)
          return c.json({
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            lastSeen: player.last_seen,
            createdAt: player.created_at
          })
        }
      }

      // No valid cookie or player not found - create new player
      const newPlayerId = generatePlayerId()
      const newPlayer = db.createPlayer(newPlayerId)

      // Set cookie with 1 year expiration
      setCookie(c, 'player_id', newPlayerId, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      })

      return c.json({
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        playerColor: newPlayer.color,
        lastSeen: newPlayer.last_seen,
        createdAt: newPlayer.created_at
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

      const updatedPlayer = db.updatePlayer(playerId, playerName, playerColor)
      
      if (!updatedPlayer) {
        return c.json({ error: 'Player not found' }, 404)
      }

      return c.json({
        playerId: updatedPlayer.id,
        playerName: updatedPlayer.name,
        playerColor: updatedPlayer.color,
        lastSeen: updatedPlayer.last_seen,
        createdAt: updatedPlayer.created_at
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

      const recentRooms = db.getPlayerRecentRooms(playerId)
      
      return c.json({
        playerId,
        recentRooms
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
