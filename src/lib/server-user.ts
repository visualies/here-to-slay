import { gameServerAPI } from './game-server-api'

export interface ServerUser {
  playerId: string
  playerName: string
  playerColor: string
}

export async function getServerUserData(): Promise<ServerUser | null> {
  try {
    const response = await gameServerAPI.getCurrentPlayer()
    
    if (response.success && response.data) {
      return {
        playerId: response.data.playerId,
        playerName: response.data.playerName,
        playerColor: response.data.playerColor
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to fetch user data on server:', error)
    return null
  }
}
