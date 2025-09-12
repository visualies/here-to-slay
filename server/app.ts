import { Hono } from 'hono'
import { createRoomsRouter } from './routes/rooms.js'
import { createGameRouter } from './routes/game.js'
import { createHealthRouter } from './routes/health.js'
import { corsMiddleware } from './middleware/cors.js'
import type RoomDatabase from '../src/lib/database.js'
import type * as Y from 'yjs'

export function createApp(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const app = new Hono()

  // Add CORS middleware
  app.use('*', corsMiddleware)

  // Mount route modules
  app.route('/api', createRoomsRouter(db))
  app.route('/api', createGameRouter(db, docs))
  app.route('/api', createHealthRouter())

  // Default route with API documentation
  app.get('/', (c) => {
    return c.text(`Here-to-Slay Room-based WebSocket Server

API Endpoints:
- POST /api/create-room
- POST /api/join-room
- GET /api/room-info?id=ROOMID
- GET /api/active-rooms
- POST /api/game/save
- GET /api/test`)
  })

  return app
}