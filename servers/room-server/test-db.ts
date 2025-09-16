#!/usr/bin/env tsx

import { db } from './db/client'

async function testDatabase() {
  console.log('🔍 Testing database setup...')

  try {
    // Test querying all cards
    const allCards = await db.query.cards.findMany({
      with: {
        requirements: true,
        actions: {
          with: {
            params: true,
          },
        },
      },
    })

    console.log(`\n📊 Database contains ${allCards.length} card(s)`)

    if (allCards.length > 0) {
      const buttonsCard = allCards.find(card => card.id === 'hero-042')
      if (buttonsCard) {
        console.log(`\n🃏 Found Buttons card:`)
        console.log(`   - Name: ${buttonsCard.name}`)
        console.log(`   - Type: ${buttonsCard.type}`)
        console.log(`   - Class: ${buttonsCard.heroClass}`)
        console.log(`   - Requirements: ${buttonsCard.requirements.length}`)
        console.log(`   - Actions: ${buttonsCard.actions.length}`)

        // Show requirements
        buttonsCard.requirements.forEach((req, i) => {
          console.log(`   - Requirement ${i + 1}: ${req.type} = ${req.value}`)
        })

        // Show first few actions
        buttonsCard.actions.slice(0, 3).forEach((action, i) => {
          console.log(`   - Action ${i + 1}: ${action.action} (${action.params.length} params)`)
        })
      }
    }

    console.log('\n✅ Database test completed successfully!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()