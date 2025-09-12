import { Hono } from 'hono'

export function createHealthRouter() {
  const router = new Hono()

  // Health check endpoint
  router.get('/test', async (c) => {
    return c.json({ 
      status: 'ok', 
      timestamp: Date.now(),
      server: 'Here-to-Slay Room Server'
    })
  })

  return router
}