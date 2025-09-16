import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // CardType enum as TEXT
  heroClass: text('hero_class'), // HeroClass enum as TEXT, nullable
  description: text('description').notNull(),
  imagePath: text('image_path'),
})

export const requirements = sqliteTable('requirements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'point' | 'hero' | 'roll' | 'duplicate' | 'class' | 'hand'
  value: integer('value'),
  description: text('description'),
})

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
})

export const actionParams = sqliteTable('action_params', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionId: integer('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // parameter type name as TEXT
  value: text('value'), // store as TEXT for portability; encode enums as string; numbers as decimal strings
})

// Define relations
export const cardsRelations = relations(cards, ({ many }) => ({
  requirements: many(requirements),
  actions: many(actions),
}))

export const requirementsRelations = relations(requirements, ({ one }) => ({
  card: one(cards, {
    fields: [requirements.cardId],
    references: [cards.id],
  }),
}))

export const actionsRelations = relations(actions, ({ one, many }) => ({
  card: one(cards, {
    fields: [actions.cardId],
    references: [cards.id],
  }),
  params: many(actionParams),
}))

export const actionParamsRelations = relations(actionParams, ({ one }) => ({
  action: one(actions, {
    fields: [actionParams.actionId],
    references: [actions.id],
  }),
}))

// Optional convenience raw SQL for indexes
export const createIndexes = sql`
  CREATE INDEX IF NOT EXISTS idx_requirements_card ON requirements(card_id);
  CREATE INDEX IF NOT EXISTS idx_actions_card ON actions(card_id);
  CREATE INDEX IF NOT EXISTS idx_action_params_action ON action_params(action_id);
`


