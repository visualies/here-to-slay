#!/usr/bin/env node

/**
 * Room-based WebSocket server for Yjs multiplayer synchronization
 * Run with: node server.js
 */

const WebSocket = require('ws')
const http = require('http')
const url = require('url')
const Y = require('yjs')
const { WebsocketProvider } = require('y-websocket')
const RoomDatabase = require('./src/lib/database.js')

const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 1234

// Initialize database
const db = new RoomDatabase()

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  db.cleanup()
}, 5 * 60 * 1000)

const server = http.createServer((request, response) => {
  const parsedUrl = url.parse(request.url, true)
  const pathname = parsedUrl.pathname
  
  // Enable CORS for all origins and methods
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  response.setHeader('Access-Control-Max-Age', '86400')
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    response.writeHead(200)
    response.end()
    return
  }

  // API Routes
  if (pathname === '/api/create-room' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => body += chunk.toString())
    request.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        const name = data.name || 'Here to Slay Game'
        const room = db.createRoom(name)
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(room))
      } catch (error) {
        console.error('Error creating room:', error)
        response.writeHead(500, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: error.message }))
      }
    })
    request.on('error', (error) => {
      console.error('Request error:', error)
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Invalid request' }))
    })
    return
  }

  if (pathname === '/api/join-room' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => body += chunk.toString())
    request.on('end', () => {
      try {
        const { roomId, playerId, playerName, playerColor } = JSON.parse(body)
        const result = db.joinRoom(roomId, playerId, playerName, playerColor)
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(result))
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: error.message }))
      }
    })
    return
  }

  if (pathname === '/api/room-info' && request.method === 'GET') {
    const roomId = parsedUrl.query.id
    if (!roomId) {
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Room ID required' }))
      return
    }

    try {
      const roomInfo = db.getRoomStats(roomId)
      if (!roomInfo) {
        response.writeHead(404, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Room not found' }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(roomInfo))
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: error.message }))
    }
    return
  }

  if (pathname === '/api/active-rooms' && request.method === 'GET') {
    try {
      const rooms = db.getActiveRooms()
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(rooms))
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: error.message }))
    }
    return
  }

  // Test endpoint
  if (pathname === '/api/test' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
    return
  }


  // Default response
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Here-to-Slay Room-based WebSocket Server\n\nAPI Endpoints:\n- POST /api/create-room\n- POST /api/join-room\n- GET /api/room-info?id=ROOMID\n- GET /api/active-rooms\n')
})

const wss = new WebSocket.Server({ server })

// Track connections by room
const roomConnections = new Map()

// Simple WebSocket message relay for Yjs sync
const docs = new Map()

function getYDoc(roomId) {
  if (!docs.has(roomId)) {
    docs.set(roomId, new Y.Doc())
  }
  return docs.get(roomId)
}


wss.on('connection', (ws, req) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`)
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
    const messageHandler = (message) => {
      try {
        // Relay all messages to other connections (Yjs handles its own protocol)
        if (roomConnections.has(roomId)) {
          roomConnections.get(roomId).forEach(client => {
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