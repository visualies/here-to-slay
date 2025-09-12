#!/usr/bin/env node

/**
 * Room-based WebSocket server for Yjs multiplayer synchronization
 * Run with: tsx server.ts
 */

import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import * as Y from 'yjs'
import { serve } from '@hono/node-server'
import RoomDatabase from './src/lib/database.js'
import { createApp } from './server/app.js'

const host: string = process.env.HOST || 'localhost'
const port: number = parseInt(process.env.PORT || '1234', 10)

// Initialize database
const db = new RoomDatabase()

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  db.cleanup()
}, 5 * 60 * 1000)

// Track Yjs documents and WebSocket connections
const docs = new Map<string, Y.Doc>()
const roomConnections = new Map<string, Set<WebSocket>>()

// Create Hono app
const app = createApp(db, docs)

// Create HTTP server that can handle both Hono requests and WebSocket upgrades
const server = http.createServer()

// Handle HTTP requests with Hono
server.on('request', async (req, res) => {
  try {
    // Create a proper Request object for Hono
    const url = `http://${req.headers.host}${req.url}`
    const method = req.method || 'GET'
    
    // Get request body if it exists
    let body: string | undefined
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks).toString()
    }
    
    // Create Request object
    const request = new Request(url, {
      method,
      headers: req.headers as HeadersInit,
      body: body
    })
    
    const response = await app.fetch(request)
    
    res.writeHead(response.status, Object.fromEntries(response.headers))
    
    if (response.body) {
      const reader = response.body.getReader()
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read()
        if (done) {
          res.end()
          return
        }
        res.write(value)
        return pump()
      }
      await pump()
    } else {
      res.end()
    }
  } catch (err) {
    console.error('Error handling request:', err)
    res.writeHead(500)
    res.end('Internal Server Error')
  }
})

// Create WebSocket server  
const wss = new WebSocketServer({ server })

function getYDoc(roomId: string) {
  if (!docs.has(roomId)) {
    const ydoc = new Y.Doc()
    
    // Try to restore saved game state
    const savedState = db.getGameState(roomId)
    if (savedState) {
      try {
        const uint8Array = new Uint8Array(savedState)
        Y.applyUpdate(ydoc, uint8Array)
        console.log(`🔄 Restored game state for room ${roomId}`)
      } catch (error) {
        console.error(`Error restoring game state for room ${roomId}:`, error)
      }
    }
    
    docs.set(roomId, ydoc)
  }
  return docs.get(roomId)
}


wss.on('connection', (ws, req) => {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host}`)
    const roomId = urlObj.searchParams.get('room') || 'default'
    
    console.log(`[DEBUG] GameServer - WebSocket connection for room ${roomId}`)
    
    // Track room connections
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set())
    }
    roomConnections.get(roomId).add(ws)
    
    // Update room activity
    db.updateRoomActivity(roomId)
    
    // Get or create Y.Doc for this room
    const ydoc = getYDoc(roomId)
    
    // Handle WebSocket messages (Yjs sync only)
    const messageHandler = (message: any) => {
      try {
        // Relay all messages to other connections (Yjs handles its own protocol)
        if (roomConnections.has(roomId)) {
          roomConnections.get(roomId)?.forEach((client: any) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message)
            }
          })
        }
      } catch (error) {
        console.error('Error handling message:', error)
      }
    }
    
    ws.on('message', messageHandler)
    
    ws.on('close', () => {
      if (roomConnections.has(roomId)) {
        roomConnections.get(roomId).delete(ws)
        if (roomConnections.get(roomId).size === 0) {
          roomConnections.delete(roomId)
          // Clean up Y.Doc if no connections
          docs.delete(roomId)
          console.log(`[DEBUG] GameServer - Cleaned up room ${roomId}`)
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

server.listen(port, host, () => {
  console.log(`🎲 Here-to-Slay Room-based WebSocket server running at http://${host}:${port}`)
  console.log('Players can create and join rooms for multiplayer dice games!')
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  db.close()
  wss.close()
  server.close()
  process.exit(0)
})