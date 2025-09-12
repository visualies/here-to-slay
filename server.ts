#!/usr/bin/env node

/**
 * Room-based WebSocket server for Yjs multiplayer synchronization
 * Run with: tsx server.ts
 */

import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import { serve } from '@hono/node-server'
import { setupWSConnection, docs } from '@y/websocket-server/utils'
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

// Track WebSocket connections (docs handled by y-websocket-server)
const roomConnections = new Map<string, Set<WebSocket>>()
// docs is imported from @y/websocket-server

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
    roomConnections.get(roomId).add(ws)
    
    // Update room activity
    db.updateRoomActivity(roomId)
    
    // Use official y-websocket-server setup - it handles document creation
    console.log(`[DEBUG] Setting up official y-websocket connection for room ${roomId}`)
    // The y-websocket-server will extract the room ID from the URL path automatically
    setupWSConnection(ws, req)
    
    console.log(`[DEBUG] Current docs after setup: [${Array.from(docs.keys()).join(', ')}]`)
    console.log(`[DEBUG] Total docs in memory: ${docs.size}`)
    
    // y-websocket-server handles all message processing automatically
    console.log(`[DEBUG] Official y-websocket connection ready for room ${roomId}`)
    
    ws.on('close', () => {
      if (roomConnections.has(roomId)) {
        roomConnections.get(roomId).delete(ws)
        if (roomConnections.get(roomId).size === 0) {
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