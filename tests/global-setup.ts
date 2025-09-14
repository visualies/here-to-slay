import { FullConfig } from '@playwright/test'
import { createApp } from '../servers/room-server/app.js'
import RoomDatabase from '../src/lib/database.js'
import * as Y from 'yjs'
import fs from 'fs'
import path from 'path'
import http from 'http'

async function globalSetup(_config: FullConfig) {
  // Set test environment variable
  (process.env as any).NODE_ENV = 'test'

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

  // Create HTTP server that can handle Hono requests
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
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }))
    }
  })

  // Start the server on a test port
  return new Promise<void>((resolve) => {
    server.listen(8234, 'localhost', () => {
      // Store server reference for cleanup
      (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_SERVER__ = server;
      (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_DB__ = db;
      
      resolve()
    })
  })
}

export default globalSetup