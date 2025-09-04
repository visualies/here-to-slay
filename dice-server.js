#!/usr/bin/env node

/**
 * Dedicated dice physics server
 * Run with: node dice-server.js
 */

const WebSocket = require('ws')
const http = require('http')
const CANNON = require('cannon')

const host = process.env.HOST || 'localhost'
const port = process.env.DICE_PORT || 1235

// Server-side dice physics system
class DicePhysicsWorld {
  constructor(roomId) {
    this.roomId = roomId
    this.world = new CANNON.World()
    this.world.gravity.set(0, -19.64, 0)
    this.world.broadphase = new CANNON.NaiveBroadphase()
    
    // Ground plane
    const groundShape = new CANNON.Plane()
    this.groundBody = new CANNON.Body({ mass: 0 })
    this.groundBody.addShape(groundShape)
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.groundBody.position.set(0, -0.1, 0)
    this.world.add(this.groundBody)
    
    // Dice storage
    this.dice = new Map() // diceId -> { body, lastUpdate, result }
    this.lastPhysicsStep = Date.now()
    
    // Start physics loop
    this.startPhysicsLoop()
    
    // Auto-spawn default dice
    this.addDice('dice-0', [-0.6, 2, 0])
    this.addDice('dice-1', [0.6, 2, 0])
    console.log(`[DEBUG] DicePhysicsWorld - Room ${roomId} initialized with 2 dice`)
  }
  
  addDice(diceId, position = [0, 2, 0]) {
    const shape = new CANNON.Box(new CANNON.Vec3(0.15, 0.15, 0.15))
    const body = new CANNON.Body({ mass: 1 })
    body.addShape(shape)
    body.position.set(position[0], position[1], position[2])
    body.material = new CANNON.Material({ friction: 0.3, restitution: 0.7 })
    
    this.world.add(body)
    this.dice.set(diceId, {
      body: body,
      lastUpdate: Date.now(),
      result: 1,
      isStable: false
    })
    
    console.log(`[DEBUG] DicePhysicsWorld - Dice ${diceId} added at position:`, position)
  }
  
  moveDice(diceId, position, isKinematic = true) {
    const dice = this.dice.get(diceId)
    if (!dice) return
    
    if (isKinematic) {
      dice.body.type = CANNON.Body.KINEMATIC
      dice.body.position.set(position[0], position[1], position[2])
      dice.body.velocity.set(0, 0, 0)
      dice.body.angularVelocity.set(0, 0, 0)
    } else {
      dice.body.type = CANNON.Body.DYNAMIC
    }
    
    dice.lastUpdate = Date.now()
  }
  
  throwDice(diceId, velocity, angularVelocity) {
    const dice = this.dice.get(diceId)
    if (!dice) return
    
    dice.body.type = CANNON.Body.DYNAMIC
    dice.body.velocity.set(velocity[0], velocity[1], velocity[2])
    dice.body.angularVelocity.set(angularVelocity[0], angularVelocity[1], angularVelocity[2])
    dice.lastUpdate = Date.now()
    dice.isStable = false
    
    console.log(`[DEBUG] DicePhysicsWorld - Dice ${diceId} thrown`)
  }
  
  startPhysicsLoop() {
    const step = () => {
      const now = Date.now()
      const deltaTime = (now - this.lastPhysicsStep) / 1000
      this.lastPhysicsStep = now
      
      // Step physics
      this.world.step(Math.min(deltaTime, 1/60))
      
      // Update dice results and check stability
      this.dice.forEach((dice, diceId) => {
        const linearVel = dice.body.velocity.length()
        const angularVel = dice.body.angularVelocity.length()
        const wasStable = dice.isStable
        dice.isStable = linearVel < 0.1 && angularVel < 0.5
        
        // Calculate dice result based on face up
        const result = this.calculateDiceResult(dice.body)
        if (result !== dice.result || (!wasStable && dice.isStable)) {
          dice.result = result
          dice.lastUpdate = now
        }
      })
      
      setTimeout(step, 16) // 60 FPS
    }
    step()
  }
  
  calculateDiceResult(body) {
    const upVector = new CANNON.Vec3(0, 1, 0)
    
    // Face normals in local space
    const faceNormals = [
      { normal: new CANNON.Vec3(0, 1, 0), value: 3 },   // Top
      { normal: new CANNON.Vec3(0, -1, 0), value: 4 },  // Bottom
      { normal: new CANNON.Vec3(1, 0, 0), value: 1 },   // Right
      { normal: new CANNON.Vec3(-1, 0, 0), value: 6 },  // Left
      { normal: new CANNON.Vec3(0, 0, 1), value: 2 },   // Front
      { normal: new CANNON.Vec3(0, 0, -1), value: 5 }   // Back
    ]
    
    let maxDot = -1
    let result = 1
    
    for (const face of faceNormals) {
      // Transform normal to world space
      const worldNormal = body.quaternion.vmult(face.normal)
      const dot = worldNormal.dot(upVector)
      
      if (dot > maxDot) {
        maxDot = dot
        result = face.value
      }
    }
    
    return result
  }
  
  getDiceStates() {
    const states = {}
    this.dice.forEach((dice, diceId) => {
      states[diceId] = {
        position: [dice.body.position.x, dice.body.position.y, dice.body.position.z],
        rotation: [dice.body.quaternion.x, dice.body.quaternion.y, dice.body.quaternion.z, dice.body.quaternion.w],
        result: dice.result,
        isStable: dice.isStable,
        lastUpdate: dice.lastUpdate
      }
    })
    return states
  }
  
  cleanup() {
    this.dice.forEach((dice, diceId) => {
      this.world.remove(dice.body)
    })
    this.dice.clear()
  }
}

// Track physics worlds and connections by room
const physicsWorlds = new Map()
const roomConnections = new Map()

// Create HTTP server for REST API
const server = http.createServer((request, response) => {
  const url = require('url')
  const parsedUrl = url.parse(request.url, true)
  const pathname = parsedUrl.pathname
  
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  
  if (request.method === 'OPTIONS') {
    response.writeHead(200)
    response.end()
    return
  }

  // Test endpoint
  if (pathname === '/api/test' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok', service: 'dice-physics', timestamp: Date.now() }))
    return
  }

  // Dice API endpoints
  if (pathname.startsWith('/api/dice/') && request.method === 'POST') {
    const action = pathname.split('/api/dice/')[1]
    
    let body = ''
    request.on('data', chunk => body += chunk.toString())
    request.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { roomId } = data
        
        if (!roomId) {
          response.writeHead(400, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ error: 'Room ID required' }))
          return
        }
        
        // Get or create physics world for room
        if (!physicsWorlds.has(roomId)) {
          physicsWorlds.set(roomId, new DicePhysicsWorld(roomId))
        }
        const world = physicsWorlds.get(roomId)
        
        switch (action) {
          case 'move':
            world.moveDice(data.diceId, data.position, data.isKinematic !== false)
            break
            
          case 'throw':
            world.throwDice(data.diceId, data.velocity, data.angularVelocity)
            break
            
          case 'state':
            const states = world.getDiceStates()
            response.writeHead(200, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify(states))
            return
            
          default:
            response.writeHead(400, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify({ error: 'Invalid dice action' }))
            return
        }
        
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ success: true }))
        
      } catch (error) {
        console.error('Error handling dice API:', error)
        response.writeHead(500, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: error.message }))
      }
    })
    return
  }

  // Default response
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Dice Physics Server\n\nWebSocket: ws://localhost:1235\nAPI: /api/dice/move, /api/dice/throw, /api/dice/state')
})

// WebSocket server for real-time dice state updates
const wss = new WebSocket.Server({ server })

wss.on('connection', (ws, req) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`)
    const roomId = urlObj.searchParams.get('room') || 'default'
    
    console.log(`[DEBUG] DiceServer - WebSocket connection for room ${roomId}`)
    
    // Track room connections
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set())
    }
    roomConnections.get(roomId).add(ws)
    
    // Create physics world for room if needed
    if (!physicsWorlds.has(roomId)) {
      physicsWorlds.set(roomId, new DicePhysicsWorld(roomId))
    }
    
    // Send current dice states immediately
    const world = physicsWorlds.get(roomId)
    const states = world.getDiceStates()
    if (Object.keys(states).length > 0) {
      ws.send(JSON.stringify({
        type: 'dice-states',
        data: states
      }))
    }
    
    ws.on('close', () => {
      if (roomConnections.has(roomId)) {
        roomConnections.get(roomId).delete(ws)
        if (roomConnections.get(roomId).size === 0) {
          roomConnections.delete(roomId)
          // Clean up physics world if no connections
          if (physicsWorlds.has(roomId)) {
            physicsWorlds.get(roomId).cleanup()
            physicsWorlds.delete(roomId)
            console.log(`[DEBUG] DiceServer - Cleaned up physics world for room ${roomId}`)
          }
        }
      }
    })
    
    ws.on('error', (error) => {
      console.error(`[DEBUG] DiceServer - WebSocket error for room ${roomId}:`, error)
    })
    
  } catch (error) {
    console.error('[DEBUG] DiceServer - Error setting up WebSocket connection:', error)
    ws.close()
  }
})

// Broadcast dice states to all clients in room
function broadcastDiceStates(roomId) {
  const world = physicsWorlds.get(roomId)
  if (!world || !roomConnections.has(roomId)) {
    return
  }
  
  const states = world.getDiceStates()
  
  // Only broadcast if there are dice
  if (Object.keys(states).length === 0) {
    return
  }
  
  // Check if states have changed since last broadcast
  const lastStates = world.lastBroadcastedStates || {}
  const hasChanged = Object.keys(states).some(diceId => {
    const current = states[diceId]
    const last = lastStates[diceId]
    if (!last) {
      return true
    }
    
    // Check if position, rotation, result, or stability changed
    return (
      current.position[0] !== last.position[0] ||
      current.position[1] !== last.position[1] ||
      current.position[2] !== last.position[2] ||
      current.rotation[0] !== last.rotation[0] ||
      current.rotation[1] !== last.rotation[1] ||
      current.rotation[2] !== last.rotation[2] ||
      current.rotation[3] !== last.rotation[3] ||
      current.result !== last.result ||
      current.isStable !== last.isStable
    )
  })
  
  if (!hasChanged) {
    return
  }
  
  // Store current states for next comparison
  world.lastBroadcastedStates = JSON.parse(JSON.stringify(states))
  
  // Broadcast dice states to all clients in the room
  const message = JSON.stringify({
    type: 'dice-states',
    data: states
  })
  
  const clients = roomConnections.get(roomId)
  if (clients && clients.size > 0) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
}

// Start broadcasting dice states every 16ms (60fps)
setInterval(() => {
  physicsWorlds.forEach((world, roomId) => {
    broadcastDiceStates(roomId)
  })
}, 16)

server.listen(port, host, () => {
  console.log(`🎲 Dice Physics Server running at http://${host}:${port}`)
  console.log(`🔌 WebSocket endpoint: ws://${host}:${port}`)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dice physics server...')
  wss.close()
  server.close()
  process.exit(0)
})