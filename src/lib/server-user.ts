import { cookies } from 'next/headers'

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
  // Prefer cookie from the same host (shared across ports) to avoid SSR drift
  const cookieId = cookies().get('player_id')?.value || ''
  if (cookieId) {
    return {
      playerId: cookieId,
      playerName: 'Player',
      playerColor: '#FF6B6B',
      recentRooms: []
    }
  }
  // No cookie yet; let client bootstrap via @me
  return {
    playerId: '',
    playerName: '',
    playerColor: '',
    recentRooms: []
  }
}
