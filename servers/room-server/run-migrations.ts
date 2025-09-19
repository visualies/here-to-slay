#!/usr/bin/env tsx

import { ensureSchema, seedButtonsIfMissing, seedDrawCardIfMissing, seedNappingNibblesIfMissing, seedPeanutIfMissing } from './db/migrate'

console.log('🔄 Running database migrations...')

try {
  console.log('📝 Ensuring schema is up to date...')
  ensureSchema()
  console.log('✅ Schema migration completed')

  console.log('🌱 Seeding initial data...')
  seedDrawCardIfMissing()
  seedButtonsIfMissing()
  seedNappingNibblesIfMissing()
  seedPeanutIfMissing()
  console.log('✅ Data seeding completed')

  console.log('🎉 All migrations applied successfully!')
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
}