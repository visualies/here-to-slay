import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import * as schema from './schema'

const dbFile = process.env.NODE_ENV === 'test' ? 'test-rooms.db' : 'rooms.db'
const dbPath = path.join(process.cwd(), dbFile)

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })



