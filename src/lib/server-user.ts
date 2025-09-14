import { gameServerAPI } from './game-server-api'

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
    const [userResponse, roomsResponse] = await Promise.all([
      gameServerAPI.getCurrentPlayer(),
      gameServerAPI.getRecentRooms()
    ])
    
    if (userResponse.success && userResponse.data) {
      return {
        playerId: userResponse.data.playerId,
        playerName: userResponse.data.playerName,
        playerColor: userResponse.data.playerColor,
        recentRooms: roomsResponse.success && roomsResponse.data ? roomsResponse.data.recentRooms.map((room: any) => ({
          roomId: room.room_id,
          roomName: `Room ${room.room_id}`,
          lastJoined: room.joined_at,
          playerCount: 0 // This would need to be fetched separately
        })) : []
      }
    }
    
    return {
      playerId: '',
      playerName: '',
      playerColor: '',
      recentRooms: []
    }
  } catch (error) {
    // Just return empty list for any error
    return {
      playerId: '',
      playerName: '',
      playerColor: '',
      recentRooms: []
    }
  }
}
