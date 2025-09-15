#!/usr/bin/env node

/**
 * Room-based WebSocket server for Yjs multiplayer synchronization
 * Run with: tsx server.ts
 */

import dotenv from 'dotenv'
import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import type { Server as NodeHttpServer } from 'http'
import { setupWSConnection, docs } from '@y/websocket-server/utils'
import RoomDatabase from '../../src/lib/database.js'
import { createApp } from './app.js'
import { createAdaptorServer } from '@hono/node-server'

// Load environment variables
dotenv.config({ path: '.env.local', quiet: true })
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', quiet: true })
}
dotenv.config({ quiet: true }) // .env

// Validate required environment variables
const host = process.env.HOST
const port = process.env.PORT

if (!host) {
  throw new Error('Missing required environment variable: HOST')
}
if (!port) {
  throw new Error('Missing required environment variable: PORT')
}

const portNumber = parseInt(port, 10)
if (isNaN(portNumber)) {
  throw new Error('PORT environment variable must be a valid number')
}

// Initialize database
const db = new RoomDatabase()

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  db.cleanup()
}, 5 * 60 * 1000)

// Track WebSocket connections (docs handled by y-websocket-server)
const roomConnections = new Map<string, Set<WebSocket>>()
// docs is imported from @y/websocket-server

// Helper function to restore game state for a room if it exists in database
function restoreGameStateIfExists(roomId: string) {
  if (!docs.has(roomId)) {
    console.log(`[DEBUG] No document found for room ${roomId}, cannot restore state`)
    return
  }

  const ydoc = docs.get(roomId)!

  try {
    const loaded = db.loadRoomState(roomId, ydoc)
    if (loaded) {
      console.log(`🔄 Restored game state for room ${roomId} during WebSocket connection`)
    } else {
      console.log(`[DEBUG] No saved game state found for room ${roomId}`)
    }
  } catch (error) {
    console.error(`❌ Error restoring game state for room ${roomId}:`, error)
  }
}

// Create Hono app
const app = createApp(db, docs)

// Use Hono's Node adapter to create an HTTP server and handle requests
const server = createAdaptorServer({ fetch: app.fetch }) as unknown as NodeHttpServer

// Create WebSocket server  
const wss = new WebSocketServer({ server })

// y-websocket-server handles document creation automatically
// We can still access docs via the imported docs Map


wss.on('connection', (ws, req) => {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host}`)
    const roomId = urlObj.pathname.slice(1) || 'default' // Remove leading slash from /ROOMID
    
    console.log(`[DEBUG] GameServer - WebSocket connection for room ${roomId}`)
    console.log(`[DEBUG] Current docs before connection: [${Array.from(docs.keys()).join(', ')}]`)
    
    // Track room connections
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set())
    }
    roomConnections.get(roomId)?.add(ws)
    
    // Update room activity
    db.updateRoomActivity(roomId)

    // Check for a read-only flag in the URL, e.g., ws://localhost:1234/ROOMID?readOnly=true
    const readOnly = urlObj.searchParams.get('readOnly') === 'true'

    // Use official y-websocket-server setup - it handles document creation
    console.log(`[DEBUG] Setting up official y-websocket connection for room ${roomId}`)
    // The y-websocket-server will extract the room ID from the URL path automatically
    setupWSConnection(ws, req, {
      // With this flag, the server will not apply any document updates
      // that are received from this client.
      readOnly,
    })

    console.log(`[DEBUG] Current docs after setup: [${Array.from(docs.keys()).join(', ')}]`)
    console.log(`[DEBUG] Total docs in memory: ${docs.size}`)
    
    // After document creation, try to restore saved game state
    // We need to wait a bit for y-websocket-server to create the document
    setTimeout(() => {
      restoreGameStateIfExists(roomId)
    }, 100)
    
    // y-websocket-server handles all message processing automatically
    console.log(`[DEBUG] Official y-websocket connection ready for room ${roomId}`)
    
    ws.on('close', () => {
      if (roomConnections.has(roomId)) {
        roomConnections.get(roomId)?.delete(ws)
        if (roomConnections.get(roomId)?.size === 0) {
          roomConnections.delete(roomId)
          // y-websocket-server manages Y.Doc cleanup automatically
          console.log(`[DEBUG] GameServer - Cleaned up room connections for ${roomId}`)
        }
      }
    })
    
    ws.on('error', (error) => {
      console.error(`[DEBUG] GameServer - WebSocket error for room ${roomId}:`, error)
    })
    
  } catch (error) {
    console.error('[DEBUG] GameServer - Error setting up WebSocket connection:', error)
    ws.close()
  }
})

server.listen(portNumber, host, () => {
  console.log(`🎲 Here-to-Slay Room-based WebSocket server running at http://${host}:${portNumber}`)
  console.log('Players can create and join rooms for multiplayer dice games!')
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  db.close()
  wss.close()
  server.close()
  process.exit(0)
})