import type { InferSelectModel } from 'drizzle-orm'
import type { cards, requirements, actions, actionParams } from '../../servers/room-server/db/schema'

// Database requirement type
export type DatabaseRequirement = InferSelectModel<typeof requirements>

// Simple requirement type for game data
export type SimpleRequirement = {
  type: 'point' | 'hero' | 'roll' | 'duplicate' | 'class' | 'hand'
  value?: number
  description?: string
}

// Flexible Card type that can handle both database and game data
export type Card = Omit<InferSelectModel<typeof cards>, 'heroClass' | 'imagePath'> & {
  heroClass?: string | null
  imagePath?: string | null
  requirements?: (DatabaseRequirement | SimpleRequirement)[]
  actions?: (InferSelectModel<typeof actions> & {
    params: InferSelectModel<typeof actionParams>[]
  })[]
  effect?: any[] // For game data compatibility
}