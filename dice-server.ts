#!/usr/bin/env node

/**
 * Dedicated dice physics server
 * Run with: tsx dice-server.ts
 */

import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import * as CANNON from 'cannon-es'

const host: string = process.env.HOST || 'localhost'
const port: number = parseInt(process.env.DICE_PORT || '1235', 10)

// Server-side dice physics system
class DicePhysicsWorld {
  public roomId: string
  public world: CANNON.World
  public groundBody: CANNON.Body
  public dice: Map<string, any>
  public diceResults: Map<string, number>
  public isStable: Map<string, boolean>
  public lastStableCheck: Map<string, number>
  public lastPhysicsStep: number
  public lastBroadcastedStates: Record<string, any>
  public onStatesUpdate?: (states: any) => void

  constructor(roomId: string) {
    this.roomId = roomId
    this.world = new CANNON.World()
    this.dice = new Map()
    this.diceResults = new Map()
    this.isStable = new Map()
    this.lastStableCheck = new Map()
    this.lastPhysicsStep = Date.now()
    this.lastBroadcastedStates = {}
    this.world.gravity.set(0, -19.64, 0)
    
    // Use better broadphase and solver for more accurate collision detection
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    ;(this.world.solver as any).iterations = 20 // More solver iterations for better accuracy
    this.world.defaultContactMaterial.friction = 0.4
    this.world.defaultContactMaterial.restitution = 0.3
    
    // Ground plane
    const groundShape = new CANNON.Plane()
    this.groundBody = new CANNON.Body({ mass: 0 })
    this.groundBody.addShape(groundShape)
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.groundBody.position.set(0, -0.1, 0)
    this.world.addBody(this.groundBody)
    
    // 10x10 Playing field boundaries (center origin: -5 to +5)
    const FIELD_SIZE = 5 // Half-size (center to edge)
    const WALL_THICKNESS = 1.0 // Thick walls to prevent tunneling
    const WALL_HEIGHT = 10 // Taller walls
    
    // Left wall (X = -5)
    const leftWall = new CANNON.Body({ mass: 0 })
    leftWall.addShape(new CANNON.Box(new CANNON.Vec3(WALL_THICKNESS, WALL_HEIGHT, FIELD_SIZE + WALL_THICKNESS)))
    leftWall.position.set(-FIELD_SIZE - WALL_THICKNESS, WALL_HEIGHT, 0)
    this.world.addBody(leftWall)
    
    // Right wall (X = +5)  
    const rightWall = new CANNON.Body({ mass: 0 })
    rightWall.addShape(new CANNON.Box(new CANNON.Vec3(WALL_THICKNESS, WALL_HEIGHT, FIELD_SIZE + WALL_THICKNESS)))
    rightWall.position.set(FIELD_SIZE + WALL_THICKNESS, WALL_HEIGHT, 0)
    this.world.addBody(rightWall)
    
    // Front wall (Z = -5)
    const frontWall = new CANNON.Body({ mass: 0 })
    frontWall.addShape(new CANNON.Box(new CANNON.Vec3(FIELD_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS)))
    frontWall.position.set(0, WALL_HEIGHT, -FIELD_SIZE - WALL_THICKNESS)
    this.world.addBody(frontWall)
    
    // Back wall (Z = +5)
    const backWall = new CANNON.Body({ mass: 0 })
    backWall.addShape(new CANNON.Box(new CANNON.Vec3(FIELD_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS)))
    backWall.position.set(0, WALL_HEIGHT, FIELD_SIZE + WALL_THICKNESS)
    this.world.addBody(backWall)
    
    // Dice storage is already initialized in constructor
    
    // Start physics loop
    this.startPhysicsLoop()
    
    // Auto-spawn default dice
    this.addDice('dice-0', [-0.6, 2, 0])
    this.addDice('dice-1', [0.6, 2, 0])
    console.log(`[DEBUG] DicePhysicsWorld - Room ${roomId} initialized with 2 dice`)
  }
  
  addDice(diceId: string, position: [number, number, number] = [0, 2, 0]) {
    const shape = new CANNON.Box(new CANNON.Vec3(0.15, 0.15, 0.15))
    const body = new CANNON.Body({ mass: 1 })
    body.addShape(shape)
    body.position.set(position[0], position[1], position[2])
    
    // Use default material properties
    
    // Enable continuous collision detection for fast-moving dice
    ;(body as any).ccdSpeedThreshold = 1  // Enable CCD when velocity > 1 unit/s
    
    this.world.addBody(body)
    this.dice.set(diceId, {
      body: body,
      lastUpdate: Date.now(),
      result: 1,
      isStable: false
    })
  }
  
  moveDice(diceId: string, position: [number, number, number], isKinematic = true) {
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
  
  throwDice(diceId: string, velocity: [number, number, number], angularVelocity: [number, number, number]) {
    const dice = this.dice.get(diceId)
    if (!dice) return
    
    // Limit maximum velocity to prevent tunneling
    const MAX_VELOCITY = 15 // Maximum velocity in units/second
    const MAX_ANGULAR_VELOCITY = 20 // Maximum angular velocity
    
    // Clamp linear velocity
    const velMagnitude = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
    if (velMagnitude > MAX_VELOCITY) {
      const scale = MAX_VELOCITY / velMagnitude
      velocity[0] *= scale
      velocity[1] *= scale  
      velocity[2] *= scale
    }
    
    // Clamp angular velocity  
    const angularMagnitude = Math.sqrt(angularVelocity[0]**2 + angularVelocity[1]**2 + angularVelocity[2]**2)
    if (angularMagnitude > MAX_ANGULAR_VELOCITY) {
      const scale = MAX_ANGULAR_VELOCITY / angularMagnitude
      angularVelocity[0] *= scale
      angularVelocity[1] *= scale
      angularVelocity[2] *= scale
    }
    
    dice.body.type = CANNON.Body.DYNAMIC
    dice.body.velocity.set(velocity[0], velocity[1], velocity[2])
    dice.body.angularVelocity.set(angularVelocity[0], angularVelocity[1], angularVelocity[2])
    dice.lastUpdate = Date.now()
    dice.isStable = false
  }

  // Throw all dice with the same velocity and angular velocity
  throwAllDice(velocity: [number, number, number], angularVelocity: [number, number, number]) {
    this.dice.forEach((dice, diceId) => {
      this.throwDice(diceId, velocity, angularVelocity)
    })
  }

  // Move all dice maintaining their relative positions during dragging
  moveAllDice(leadDiceId: string, leadPosition: [number, number, number], isKinematic = true) {
    const leadDice = this.dice.get(leadDiceId)
    if (!leadDice) return
    
    // Get the current position of the lead dice to calculate offset
    const currentLeadPos = leadDice.body.position
    const offsetX = leadPosition[0] - currentLeadPos.x
    const offsetY = leadPosition[1] - currentLeadPos.y
    const offsetZ = leadPosition[2] - currentLeadPos.z
    
    // Move all dice by the same offset
    this.dice.forEach((dice, diceId) => {
      const currentPos = dice.body.position
      const newPosition: [number, number, number] = [
        currentPos.x + offsetX,
        currentPos.y + offsetY,
        currentPos.z + offsetZ
      ]
      this.moveDice(diceId, newPosition, isKinematic)
    })
  }

  
  startPhysicsLoop() {
    const step = () => {
      const now = Date.now()
      const deltaTime = (now - this.lastPhysicsStep) / 1000
      this.lastPhysicsStep = now
      
      // Step physics with smaller time steps for better collision detection
      const fixedTimeStep = 1/120 // 120 FPS physics for better accuracy
      const maxSubSteps = 5
      this.world.step(fixedTimeStep, deltaTime, maxSubSteps)
      
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
      
      setTimeout(step, 8) // 120 FPS
    }
    step()
  }
  
  calculateDiceResult(body: CANNON.Body) {
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
    const states: Record<string, any> = {}
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
      this.world.removeBody(dice.body)
    })
    this.dice.clear()
  }
}

// Track physics worlds and connections by room
const physicsWorlds = new Map<string, DicePhysicsWorld>()
const roomConnections = new Map<string, Set<WebSocket>>()

// Create HTTP server for REST API
const server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
  const parsedUrl = new URL(request.url || '', `http://${request.headers.host}`)
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
        
        if (!world) {
          response.writeHead(500, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ error: 'Failed to create physics world' }))
          return
        }
        
        switch (action) {
          case 'move':
            world.moveDice(data.diceId, data.position, data.isKinematic !== false)
            break
            
          case 'move-all':
            world.moveAllDice(data.leadDiceId, data.leadPosition, data.isKinematic !== false)
            break
            
          case 'throw':
            world.throwDice(data.diceId, data.velocity, data.angularVelocity)
            break
            
          case 'throw-all':
            world.throwAllDice(data.velocity, data.angularVelocity)
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
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
      }
    })
    return
  }

  // Default response
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Dice Physics Server\n\nWebSocket: ws://localhost:1235\nAPI: /api/dice/move, /api/dice/throw, /api/dice/state')
})

// WebSocket server for real-time dice state updates
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host}`)
    const roomId = urlObj.searchParams.get('room') || 'default'
    
    console.log(`[DEBUG] DiceServer - WebSocket connection for room ${roomId}`)
    
    // Track room connections
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set())
    }
    roomConnections.get(roomId)?.add(ws)
    
    // Create physics world for room if needed
    if (!physicsWorlds.has(roomId)) {
      physicsWorlds.set(roomId, new DicePhysicsWorld(roomId))
    }
    
    // Send current dice states immediately
    const world = physicsWorlds.get(roomId)
    if (world) {
      const states = world.getDiceStates()
      if (Object.keys(states).length > 0) {
        ws.send(JSON.stringify({
          type: 'dice-states',
          data: states
        }))
      }
    }
    
    ws.on('close', () => {
      if (roomConnections.has(roomId)) {
        roomConnections.get(roomId)?.delete(ws)
        if (roomConnections.get(roomId)?.size === 0) {
          roomConnections.delete(roomId)
          // Clean up physics world if no connections
          if (physicsWorlds.has(roomId)) {
            physicsWorlds.get(roomId)?.cleanup()
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
function broadcastDiceStates(roomId: string) {
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