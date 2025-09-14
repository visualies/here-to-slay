import { FullConfig } from '@playwright/test'
import { createApp } from '../servers/room-server/app.js'
import RoomDatabase from '../src/lib/database.js'
import { serve } from '@hono/node-server'
import * as Y from 'yjs'
import fs from 'fs'
import path from 'path'

async function globalSetup(_config: FullConfig) {
  // Set test environment variable
  process.env.NODE_ENV = 'test'

  // Clean up any existing test database
  const testDbPath = path.join(process.cwd(), 'test-rooms.db')
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }

  // Temporarily modify the database path for testing
  const originalDbPath = path.join(process.cwd(), 'rooms.db')
  if (fs.existsSync(originalDbPath)) {
    fs.renameSync(originalDbPath, `${originalDbPath}.backup`)
  }

  // Create test database and Yjs docs map
  const db = new RoomDatabase()
  const docs = new Map<string, Y.Doc>()

  // Create the Hono app
  const app = createApp(db, docs)

  // Start the server on a test port
  const server = serve({
    fetch: app.fetch,
    port: 8234, // Use a different port for testing
  })

  // Store server reference for cleanup
  (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_SERVER__ = server
  (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_DB__ = db

  console.log('🧪 Test server started on port 8234')

  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000))
}

export default globalSetup