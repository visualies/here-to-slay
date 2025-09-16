import type { Config } from 'drizzle-kit'

export default {
  schema: './servers/room-server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.NODE_ENV === 'test' ? './test-rooms.db' : './rooms.db',
  },
} satisfies Config


