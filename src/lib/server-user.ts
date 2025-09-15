import { cookies } from 'next/headers'
import { env } from './env-validation'

export interface ServerUser {
  playerId: string
  playerName: string
  playerColor: string
  recentRooms: RecentRoom[]
}

export interface RecentRoom {
  roomId: string
  roomName: string
  lastJoined: string
  playerCount: number
}

export async function getServerUserData(): Promise<ServerUser> {
  try {
    // Get the room server URL from environment
    const { gameServerApiUrl: roomServerUrl } = env()
    
    // Forward the cookie to the room server to get or create user
    const cookieStore = await cookies()
    const cookieId = cookieStore.get('player_id')?.value || ''
    
    const response = await fetch(`${roomServerUrl}/users/@me`, {
      method: 'GET',
      headers: {
        'Cookie': cookieId ? `player_id=${cookieId}` : '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Room server responded with ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      // Extract the Set-Cookie header to set the cookie in the response
      const setCookieHeader = response.headers.get('set-cookie')
      
      return {
        playerId: result.data.playerId,
        playerName: result.data.playerName,
        playerColor: result.data.playerColor,
        recentRooms: []
      }
    }
    
    throw new Error('Invalid response from room server')
  } catch (error) {
    console.error('Error fetching user data from room server:', error)
    
    // Fallback: return a user with a generated ID if room server is unavailable
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      playerId: fallbackId,
      playerName: 'Player',
      playerColor: '#FF6B6B',
      recentRooms: []
    }
  }
}
