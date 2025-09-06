import Database from 'better-sqlite3';
import path from 'path';

class RoomDatabase {
  constructor() {
    const dbPath = path.join(process.cwd(), 'rooms.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  initializeTables() {
    // Create rooms table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        player_count INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 6
      )
    `);

    // Create players table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        room_id TEXT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);

    // Create index for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_players_room_id ON players (room_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms (last_activity);
    `);
  }

  // Generate a unique room ID
  generateRoomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Create a new room
  createRoom(name = 'Here to Slay Game', maxPlayers = 4) {
    let roomId;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure unique room ID
    do {
      roomId = this.generateRoomId();
      attempts++;
    } while (this.getRoomById(roomId) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique room ID');
    }

    const stmt = this.db.prepare(`
      INSERT INTO rooms (id, name, max_players) VALUES (?, ?, ?)
    `);

    try {
      stmt.run(roomId, name, maxPlayers);
      console.log(`🏠 Created room: ${roomId} - "${name}"`);
      return { roomId, name };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Get room by ID
  getRoomById(roomId) {
    const stmt = this.db.prepare(`
      SELECT * FROM rooms WHERE id = ?
    `);
    return stmt.get(roomId);
  }

  // Join a room
  joinRoom(roomId, playerId, playerName, playerColor) {
    const room = this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if room is full
    const currentPlayers = this.getRoomPlayers(roomId).length;
    if (currentPlayers >= room.max_players) {
      throw new Error('Room is full');
    }

    // Add or update player
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO players (id, room_id, name, color, last_seen, is_active)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
    `);

    try {
      stmt.run(playerId, roomId, playerName, playerColor);
      
      // Update room activity and player count
      this.updateRoomActivity(roomId);
      
      console.log(`👤 Player ${playerName} (${playerId}) joined room ${roomId}`);
      return { success: true, room };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Leave a room
  leaveRoom(roomId, playerId) {
    const stmt = this.db.prepare(`
      UPDATE players SET is_active = 0, last_seen = CURRENT_TIMESTAMP
      WHERE id = ? AND room_id = ?
    `);

    try {
      stmt.run(playerId, roomId);
      this.updateRoomActivity(roomId);
      console.log(`👤 Player ${playerId} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  // Get all players in a room
  getRoomPlayers(roomId) {
    const stmt = this.db.prepare(`
      SELECT * FROM players 
      WHERE room_id = ? AND is_active = 1
      ORDER BY joined_at ASC
    `);
    return stmt.all(roomId);
  }

  // Update room activity timestamp
  updateRoomActivity(roomId) {
    const playerCount = this.getRoomPlayers(roomId).length;
    const stmt = this.db.prepare(`
      UPDATE rooms 
      SET last_activity = CURRENT_TIMESTAMP, player_count = ?
      WHERE id = ?
    `);
    stmt.run(playerCount, roomId);
  }

  // Update player activity
  updatePlayerActivity(playerId) {
    const stmt = this.db.prepare(`
      UPDATE players SET last_seen = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(playerId);
  }

  // Clean up inactive players and empty rooms
  cleanup() {

    // Mark players as inactive if not seen for 5 minutes
    const cleanupPlayers = this.db.prepare(`
      UPDATE players 
      SET is_active = 0 
      WHERE is_active = 1 
      AND datetime(last_seen, '+5 minutes') < datetime('now')
    `);

    // Delete empty rooms older than 1 hour
    const cleanupRooms = this.db.prepare(`
      DELETE FROM rooms 
      WHERE player_count = 0 
      AND datetime(last_activity, '+1 hour') < datetime('now')
    `);

    try {
      const playersUpdated = cleanupPlayers.run().changes;
      const roomsDeleted = cleanupRooms.run().changes;
      
      if (playersUpdated > 0 || roomsDeleted > 0) {
        console.log(`🧹 Cleanup: ${playersUpdated} players marked inactive, ${roomsDeleted} empty rooms deleted`);
      }

      // Update room player counts after cleanup
      const updateCounts = this.db.prepare(`
        UPDATE rooms 
        SET player_count = (
          SELECT COUNT(*) FROM players 
          WHERE players.room_id = rooms.id AND players.is_active = 1
        )
      `);
      updateCounts.run();

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Get room statistics
  getRoomStats(roomId) {
    const room = this.getRoomById(roomId);
    if (!room) return null;

    const players = this.getRoomPlayers(roomId);
    return {
      ...room,
      activePlayers: players.length,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        joinedAt: p.joined_at,
        lastSeen: p.last_seen
      }))
    };
  }

  // List all active rooms
  getActiveRooms() {
    const stmt = this.db.prepare(`
      SELECT r.*, 
             COUNT(p.id) as active_players
      FROM rooms r
      LEFT JOIN players p ON r.id = p.room_id AND p.is_active = 1
      WHERE datetime(r.last_activity, '+1 hour') > datetime('now')
      GROUP BY r.id
      ORDER BY r.last_activity DESC
      LIMIT 50
    `);
    return stmt.all();
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

export default RoomDatabase;