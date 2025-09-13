import { Hono } from 'hono'
import { createRoomsRouter } from './routes/rooms.js'
import { createGameRouter } from './routes/game.js'
import { createActionChainsRouter } from './routes/action-chains.js'
import { createHealthRouter } from './routes/health.js'
import { corsMiddleware } from './middleware/cors.js'
import type RoomDatabase from '../../src/lib/database.js'
import type * as Y from 'yjs'

export function createApp(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const app = new Hono()

  // Add CORS middleware
  app.use('*', corsMiddleware)

  // Mount route modules
  app.route('/api', createRoomsRouter(db, docs))
  app.route('/api/game', createGameRouter(db, docs))
  app.route('/api/action-chains', createActionChainsRouter(db, docs))
  app.route('/api', createHealthRouter())

  // Default route with API documentation
  app.get('/', (c) => {
    return c.text(`Here-to-Slay Room-based WebSocket Server

API Endpoints:
- POST /api/create-room
- POST /api/join-room
- GET /api/room/ROOMID
- GET /api/active-rooms
- POST /api/game/start
- POST /api/game/update-player-presence
- POST /api/game/save
- POST /api/game/draw-card
- POST /api/game/play-hero-to-party
- POST /api/game/attack-monster
- POST /api/game/discard-hand-redraw
- POST /api/action-chains/start-chain
- POST /api/action-chains/continue-chain
- GET /api/action-chains/pending-chains
- GET /api/test`)
  })

  return app
}