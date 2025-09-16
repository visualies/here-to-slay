import { db } from './client'
import { cards, requirements, actions, actionParams } from './schema'
import { sql, eq, and } from 'drizzle-orm'

export function ensureSchema() {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      hero_class TEXT,
      description TEXT NOT NULL,
      image_path TEXT
    );
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      type TEXT NOT NULL,
      value INTEGER,
      description TEXT,
      FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      action TEXT NOT NULL,
      FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS action_params (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY(action_id) REFERENCES actions(id) ON DELETE CASCADE
    );
  `)
}

export function seedButtonsIfMissing() {
  const exists = db.select({ id: cards.id }).from(cards).where(eq(cards.id, 'hero-042')).all()[0]
  if (exists) return

  db.insert(cards).values({
    id: 'hero-042',
    name: 'Buttons',
    type: 'Hero',
    heroClass: 'Thief',
    description: "Pull a card from another player's hand. If it is a Magic card, you may play it immediately.",
    imagePath: '/api/images/heroes/thief_buttons.png',
  }).run()

  db.insert(requirements).values({
    cardId: 'hero-042',
    type: 'point',
    value: 6,
  }).run()

  const effects = [
    { action: 'deduct-point', params: [ { name: 'amount', type: 'NUMBER', value: '6' } ] },
    { action: 'place-card', params: [ { name: 'target', type: 'LOCATION', value: 'own-hand' } ] },
    { action: 'capture-challenge', params: [] },
    { action: 'capture-dice', params: [ { name: 'target', type: 'NUMBER', value: '1' } ] },
    { action: 'capture-modifier', params: [] },
    { action: 'end-move', params: [ { name: 'requirement', type: 'NUMBER', value: '1' } ] },
    { action: 'draw-card', params: [ { name: 'target', type: 'LOCATION', value: 'any-hand' }, { name: 'destination', type: 'STRING', value: 'cache' }, { name: 'amount', type: 'AMOUNT', value: '1' } ] },
    { action: 'play-card', params: [ { name: 'target', type: 'STRING', value: 'cache' }, { name: 'type', type: 'CARD_TYPE', value: 'Magic' } ] },
    { action: 'draw-card', params: [ { name: 'target', type: 'STRING', value: 'cache' }, { name: 'destination', type: 'LOCATION', value: 'own-hand' }, { name: 'amount', type: 'AMOUNT', value: 'all' } ] },
  ] as const

  for (const e of effects) {
    const inserted = db.insert(actions).values({ cardId: 'hero-042', action: e.action }).run()
    const actionId = (inserted as unknown as { lastInsertRowid: number }).lastInsertRowid as number
    for (const p of e.params) {
      db.insert(actionParams).values({ actionId, name: p.name, type: p.type, value: p.value }).run()
    }
  }
}


