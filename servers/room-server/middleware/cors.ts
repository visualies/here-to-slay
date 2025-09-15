import { cors } from 'hono/cors'

// Explicit allowlist of frontend origins for credentialed requests
const allowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.178.61:3000',
])

export const corsMiddleware = cors({
  origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
  credentials: true,
  maxAge: 86400,
})