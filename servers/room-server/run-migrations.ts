#!/usr/bin/env tsx

import { ensureSchema, seedButtonsIfMissing } from './db/migrate'

console.log('🔄 Running database migrations...')

try {
  console.log('📝 Ensuring schema is up to date...')
  ensureSchema()
  console.log('✅ Schema migration completed')

  console.log('🌱 Seeding initial data...')
  seedButtonsIfMissing()
  console.log('✅ Data seeding completed')

  console.log('🎉 All migrations applied successfully!')
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
}