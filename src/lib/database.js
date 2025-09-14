import Database from 'better-sqlite3';
import path from 'path';
import * as Y from 'yjs';

class RoomDatabase {
  constructor() {
    const dbPath = path.join(process.cwd(), 'rooms.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  initializeTables() {
    // Create rooms table - stores Yjs document state for persistence
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        state BLOB
      )
    `);

    // Create players table - stores global player data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create player_rooms table - tracks which rooms a player has been in
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_rooms (
        player_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, room_id),
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms (last_activity);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players (last_seen);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_player_rooms_last_active ON player_rooms (last_active);
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

  // Create a new room - only stores minimal metadata
  createRoom() {
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
      INSERT INTO rooms (id) VALUES (?)
    `);

    try {
      stmt.run(roomId);
      console.log(`🏠 Created room: ${roomId}`);
      return { roomId };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Get room by ID - minimal metadata only
  getRoomById(roomId) {
    const stmt = this.db.prepare(`
      SELECT * FROM rooms WHERE id = ?
    `);
    return stmt.get(roomId);
  }

  // Join a room (updates Yjs doc and persists)
  joinRoom(roomId, playerId, playerName, playerColor, ydoc) {
    const room = this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Update room activity
    this.updateRoomActivity(roomId);

    // Save updated Yjs state if provided
    if (ydoc) {
      this.saveRoomState(roomId, ydoc);
    }

    console.log(`👤 Player ${playerName} (${playerId}) joined room ${roomId}`);
    return { success: true, room };
  }

  // Leave a room (updates Yjs doc and persists)
  leaveRoom(roomId, playerId, ydoc) {
    const room = this.getRoomById(roomId);
    if (!room) {
      return; // Room might have been deleted
    }

    // Update room activity
    this.updateRoomActivity(roomId);

    // Save updated Yjs state if provided
    if (ydoc) {
      this.saveRoomState(roomId, ydoc);
    }

    console.log(`👤 Player ${playerId} left room ${roomId}`);
  }

  // Update room activity timestamp
  updateRoomActivity(roomId) {
    const stmt = this.db.prepare(`
      UPDATE rooms
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(roomId);
  }

  // Save Yjs document state to database
  saveRoomState(roomId, ydoc) {
    const stateBuffer = Y.encodeStateAsUpdate(ydoc);

    const stmt = this.db.prepare(`
      UPDATE rooms SET state = ?, last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    try {
      const result = stmt.run(stateBuffer, roomId);

      if (result.changes === 0) {
        throw new Error(`Room ${roomId} not found - no rows updated`);
      }

      console.log(`💾 Saved room state for ${roomId} (${stateBuffer.length} bytes)`);
      return { success: true, stateSize: stateBuffer.length };
    } catch (error) {
      console.error('Error saving room state:', error);
      throw error;
    }
  }

  // Load Yjs document state from database
  loadRoomState(roomId, ydoc) {
    const stmt = this.db.prepare(`
      SELECT state FROM rooms WHERE id = ?
    `);

    try {
      const result = stmt.get(roomId);
      if (result?.state) {
        Y.applyUpdate(ydoc, result.state);
        console.log(`📁 Loaded room state for ${roomId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading room state:', error);
      return false;
    }
  }




  // Clean up old empty rooms (Yjs docs handle player cleanup)
  cleanup() {
    // Delete rooms older than 1 hour with no recent activity
    const cleanupRooms = this.db.prepare(`
      DELETE FROM rooms
      WHERE datetime(last_activity, '+1 hour') < datetime('now')
    `);

    try {
      const roomsDeleted = cleanupRooms.run().changes;

      if (roomsDeleted > 0) {
        console.log(`🧹 Cleanup: ${roomsDeleted} old rooms deleted`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Get room metadata (data comes from Yjs doc)
  getRoomMetadata(roomId) {
    const room = this.getRoomById(roomId);
    if (!room) return null;
    return room;
  }

  // List all active rooms (basic metadata only)
  getActiveRooms() {
    const stmt = this.db.prepare(`
      SELECT *
      FROM rooms
      WHERE datetime(last_activity, '+1 hour') > datetime('now')
      ORDER BY last_activity DESC
      LIMIT 50
    `);
    return stmt.all();
  }



  // Player management methods

  // Generate a unique player ID
  generatePlayerId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Create a new player
  createPlayer(playerId, playerName = null, playerColor = null) {
    // Generate random name and color if not provided
    if (!playerName) {
      const heroNames = [
        'Bad Axe', 'Bear Claw', 'Beary Wise', 'Fury Knuckle', 'Heavy Bear', 'Pan Chucks', 'Qi Bear', 'Tough Teddy',
        'Dodgy Dealer', 'Fuzzy Cheeks', 'Greedy Cheeks', 'Lucky Bucky', 'Mellow Dee', 'Napping Nibbles', 'Peanut', 'Tipsy Tootie',
        'Calming Voice', 'Guiding Light', 'Holy Curselifter', 'Iron Resolve', 'Mighty Blade', 'Radiant Horn', 'Vibrant Glow', 'Wise Shield',
        'Bullseye', 'Hook', 'Lookie Rookie', 'Quick Draw', 'Serious Grey', 'Sharp Fox', 'Wildshot', 'Wily Red',
        'Kit Napper', 'Meowzio', 'Plundering Puma', 'Shurikitty', 'Silent Shadow', 'Slippery Paws', 'Sly Pickings', 'Smooth Mimimeow',
        'Bun Bun', 'Buttons', 'Fluffy', 'Hopper', 'Snowball', 'Spooky', 'Whiskers', 'Wiggles'
      ];
      playerName = heroNames[Math.floor(Math.random() * heroNames.length)];
    }

    if (!playerColor) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
        '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FADBD8'
      ];
      playerColor = colors[Math.floor(Math.random() * colors.length)];
    }

    const stmt = this.db.prepare(`
      INSERT INTO players (id, name, color) VALUES (?, ?, ?)
    `);

    try {
      stmt.run(playerId, playerName, playerColor);
      console.log(`👤 Created player: ${playerId} (${playerName})`);
      return { id: playerId, name: playerName, color: playerColor, created_at: new Date().toISOString(), last_seen: new Date().toISOString() };
    } catch (error) {
      console.error('Error creating player:', error);
      throw error;
    }
  }

  // Get player by ID
  getPlayerById(playerId) {
    const stmt = this.db.prepare(`
      SELECT * FROM players WHERE id = ?
    `);
    return stmt.get(playerId);
  }

  // Update player data
  updatePlayer(playerId, playerName, playerColor = null) {
    let query = 'UPDATE players SET name = ?, last_seen = CURRENT_TIMESTAMP';
    let params = [playerName];

    if (playerColor) {
      query += ', color = ?';
      params.push(playerColor);
    }

    query += ' WHERE id = ?';
    params.push(playerId);

    const stmt = this.db.prepare(query);

    try {
      const result = stmt.run(...params);
      if (result.changes === 0) {
        return null; // Player not found
      }

      // Return updated player data
      return this.getPlayerById(playerId);
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  // Update player last seen timestamp
  updatePlayerLastSeen(playerId) {
    const stmt = this.db.prepare(`
      UPDATE players SET last_seen = CURRENT_TIMESTAMP WHERE id = ?
    `);

    try {
      stmt.run(playerId);
    } catch (error) {
      console.error('Error updating player last seen:', error);
    }
  }

  // Track player joining a room
  trackPlayerRoom(playerId, roomId) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO player_rooms (player_id, room_id, last_active)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    try {
      stmt.run(playerId, roomId);
    } catch (error) {
      console.error('Error tracking player room:', error);
    }
  }

  // Get recent rooms for a player (last 3 days)
  getPlayerRecentRooms(playerId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT 
        pr.room_id,
        pr.joined_at,
        pr.last_active,
        r.created_at as room_created_at
      FROM player_rooms pr
      JOIN rooms r ON pr.room_id = r.id
      WHERE pr.player_id = ? 
        AND datetime(pr.last_active) > datetime('now', '-3 days')
      ORDER BY pr.last_active DESC
      LIMIT ?
    `);

    try {
      return stmt.all(playerId, limit);
    } catch (error) {
      console.error('Error getting player recent rooms:', error);
      return [];
    }
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

export default RoomDatabase;