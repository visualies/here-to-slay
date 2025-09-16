import type { InferSelectModel } from 'drizzle-orm'
import type { cards, requirements, actions, actionParams } from '../../servers/room-server/db/schema'

// Use Drizzle's inferred types as source of truth
export type Card = InferSelectModel<typeof cards> & {
  requirements: InferSelectModel<typeof requirements>[]
  actions: (InferSelectModel<typeof actions> & {
    params: InferSelectModel<typeof actionParams>[]
  })[]
}