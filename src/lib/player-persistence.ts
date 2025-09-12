/**
 * Player persistence utilities for multi-room reconnection handling
 */

export interface RoomPlayerData {
  playerId: string;
  playerName: string;
  playerColor: string;
  lastActive: number;
  joinTime: number;
}

export interface PlayerRoomStorage {
  [roomId: string]: RoomPlayerData;
}

const STORAGE_KEY = 'here-to-slay-rooms';
const PLAYER_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)

/**
 * Generate a persistent player ID
 */
export function generatePersistentPlayerId(): string {
  return Math.random().toString(36).substr(2, 12); // Longer ID for better uniqueness
}

/**
 * Get all stored room-player data
 */
function getAllStoredRooms(): PlayerRoomStorage {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return {};
    
    const roomData: PlayerRoomStorage = JSON.parse(storedData);
    
    // Clean up expired entries
    const now = Date.now();
    const cleanedData: PlayerRoomStorage = {};
    let hasExpiredEntries = false;
    
    for (const [roomId, playerData] of Object.entries(roomData)) {
      if (now - playerData.lastActive <= PLAYER_SESSION_TIMEOUT) {
        cleanedData[roomId] = playerData;
      } else {
        hasExpiredEntries = true;
        console.log(`🔒 Expired room data for ${roomId} (${now - playerData.lastActive}ms old)`);
      }
    }
    
    // Save cleaned data if we removed expired entries
    if (hasExpiredEntries) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData));
    }
    
    return cleanedData;
  } catch (error) {
    console.warn('Failed to retrieve stored room data:', error);
    return {};
  }
}

/**
 * Store player data for a specific room
 */
export function storePlayerData(roomId: string, playerId: string, playerName: string, playerColor: string): void {
  try {
    const allRooms = getAllStoredRooms();
    
    allRooms[roomId] = {
      playerId,
      playerName,
      playerColor,
      lastActive: Date.now(),
      joinTime: allRooms[roomId]?.joinTime || Date.now() // Preserve original join time
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRooms));
    console.log(`🔒 Stored player data for room ${roomId}:`, { playerId, playerName });
  } catch (error) {
    console.warn('Failed to store player data:', error);
  }
}

/**
 * Get stored player data for a specific room
 */
export function getStoredPlayerData(roomId: string): RoomPlayerData | null {
  try {
    const allRooms = getAllStoredRooms();
    const roomData = allRooms[roomId];
    
    if (!roomData) {
      console.log(`🔒 No stored player data found for room ${roomId}`);
      return null;
    }
    
    console.log(`🔒 Found stored player data for room ${roomId}:`, { 
      playerId: roomData.playerId, 
      playerName: roomData.playerName
    });
    return roomData;
  } catch (error) {
    console.warn('Failed to retrieve stored player data:', error);
    return null;
  }
}

/**
 * Get all rooms the player has joined (for UI display)
 */
export function getAllPlayerRooms(): Array<{ roomId: string; playerData: RoomPlayerData }> {
  try {
    const allRooms = getAllStoredRooms();
    return Object.entries(allRooms)
      .map(([roomId, playerData]) => ({ roomId, playerData }))
      .sort((a, b) => b.playerData.lastActive - a.playerData.lastActive); // Sort by most recent
  } catch (error) {
    console.warn('Failed to get all player rooms:', error);
    return [];
  }
}

/**
 * Update last active timestamp for a specific room
 */
export function updateLastActive(roomId: string): void {
  try {
    const allRooms = getAllStoredRooms();
    if (allRooms[roomId]) {
      allRooms[roomId].lastActive = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRooms));
    }
  } catch (error) {
    console.warn('Failed to update last active:', error);
  }
}

/**
 * Remove a specific room from storage (leave room permanently)
 */
export function clearRoomData(roomId: string): void {
  try {
    const allRooms = getAllStoredRooms();
    delete allRooms[roomId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRooms));
    console.log(`🔒 Cleared player data for room ${roomId}`);
  } catch (error) {
    console.warn('Failed to clear room data:', error);
  }
}

/**
 * Clear all stored room data (complete reset)
 */
export function clearAllStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log(`🔒 Cleared all stored room data`);
  } catch (error) {
    console.warn('Failed to clear all stored data:', error);
  }
}

/**
 * Check if a player slot can be reclaimed by comparing stored vs game state
 * ALWAYS returns true if we have a stored session for this room
 */
export function canReclaimPlayerSlot(
  storedPlayerId: string, 
  gameStatePlayers: Array<{ id: string; name: string; lastSeen: number }>
): boolean {
  const existingPlayer = gameStatePlayers.find(p => p.id === storedPlayerId);
  
  if (!existingPlayer) {
    console.log(`🔒 Player slot ${storedPlayerId} not found in game state - will be added back`);
    return true; // Player will be re-added to game state
  }
  
  // ALWAYS reclaim if we have a stored session - no time restrictions
  console.log(`🔒 Player slot ${storedPlayerId} found in game state - reclaiming session`);
  return true;
}