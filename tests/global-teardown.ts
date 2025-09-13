import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  // Clean up server
  const server = (global as any).__TEST_SERVER__
  const db = (global as any).__TEST_DB__

  if (db) {
    db.close()
  }

  if (server) {
    server.close()
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