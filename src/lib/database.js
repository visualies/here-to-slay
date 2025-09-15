import Database from 'better-sqlite3';
import path from 'path';
import * as Y from 'yjs';

class RoomDatabase {
  constructor() {
    // Use test database in test environment
    const dbName = process.env.NODE_ENV === 'test' ? 'test-rooms.db' : 'rooms.db';
    const dbPath = path.join(process.cwd(), dbName);
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

    // Create indexes for better performance
    this.db.exec(`
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
      LIMIT 100
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







  // Close database connection
  close() {
    this.db.close();
  }
}

export default RoomDatabase;