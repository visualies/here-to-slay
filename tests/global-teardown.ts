import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(_config: FullConfig) {
  // Clean up server
  const server = (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_SERVER__
  const db = (global as typeof globalThis & { __TEST_SERVER__: unknown; __TEST_DB__: unknown }).__TEST_DB__

  if (db) {
    (db as any).close()
  }

  if (server) {
    (server as any).close()
  }

  // Clean up test database
  const testDbPath = path.join(process.cwd(), 'rooms.db')
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }

  // Restore original database if it exists
  const backupDbPath = path.join(process.cwd(), 'rooms.db.backup')
  if (fs.existsSync(backupDbPath)) {
    fs.renameSync(backupDbPath, testDbPath)
  }

  console.log('🧪 Test server stopped and cleaned up')
}

export default globalTeardown