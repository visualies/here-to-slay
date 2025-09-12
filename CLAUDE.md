# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

NEVER RUN THE NPM RUN DEV COMMAND, always promt the user to do so

**Build & Deploy:**
- `npm run build` - Builds the Next.js application for production

**Code Quality:**
- `npm run lint` - Runs ESLint to check for code issues

## Architecture Overview

This is a **multiplayer card game** called "Here to Slay" built with a **multi-server architecture**:

### Core Architecture
- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Multiplayer Sync**: Two dedicated Node.js servers handling different concerns
- **Real-time Communication**: WebSocket connections with Yjs for collaborative state
- **Physics**: Server-side 3D dice physics using CANNON-ES

### Server Architecture (Dual-Server Setup)

**1. Room/Game Server (`servers/room-server/` - Port 1234)**
- Room creation and management with SQLite database
- Player joining/presence tracking  
- Yjs document synchronization for game state
- HTTP API endpoints for room operations
- WebSocket connections for real-time multiplayer sync

**2. Dice Physics Server (`servers/dice-server/` - Port 1235)**  
- Dedicated 3D physics simulation using CANNON-ES
- Server-authoritative dice throwing and collision detection
- Real-time physics state broadcasting (60fps)
- HTTP API for dice control action
- 10x10 playing field with responsive client scaling

### Key Components

**Game State Management:**
- `src/contexts/room-context.tsx` - Central multiplayer state management
- `src/hooks/use-game-state.ts` - Game-specific state hooks
- `src/game/types.ts` - TypeScript interfaces for game entities

**Multiplayer System:**
- Yjs for collaborative editing and real-time sync
- WebSocket connections managed per room
- Player presence and cursor tracking
- Automatic cleanup of inactive rooms

**3D Dice System:**
- `src/components/server-dice-canvas.tsx` - 3D rendering with React Three Fiber
- `src/lib/server-dice.ts` - Client-side dice management
- Server-authoritative physics simulation
- Coordinate transformation between server (10x10) and client viewports

**Responsive Boundary System:**
- Server maintains fixed 10x10 coordinate system (-5 to +5)
- Clients scale independently to utilize full viewport
- No letterboxing - field stretches to match screen aspect ratio
- See `RESPONSIVE_BOUNDARIES.md` for implementation details

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19 with hooks and context
- TypeScript with strict mode
- Tailwind CSS v4 for styling
- shadcn/ui components with Radix UI
- Lucide React icons

**3D Graphics:**
- React Three Fiber for 3D scene management
- @react-three/drei for utilities
- @react-three/cannon for client-side physics helpers
- Three.js for 3D rendering

**Multiplayer & Physics:**
- Yjs for collaborative real-time editing
- y-websocket for WebSocket provider
- CANNON-ES for server-side 3D physics
- better-sqlite3 for room persistence

### File Structure Patterns
- `src/app/` - Next.js app router pages and layouts
- `src/components/` - React components (game UI, 3D elements)
- `src/components/ui/` - shadcn/ui component library
- `src/lib/` - Utility functions and client-side managers
- `src/contexts/` - React context providers for state
- `src/hooks/` - Custom React hooks
- `src/game/` - Game logic, types, and card data
- `servers/room-server/` - Yjs websocket server and room management
- `servers/dice-server/` - Dedicated 3D dice physics server

### Development Notes

**Server Communication:**
- Room server: `ws://localhost:1234` and `http://localhost:1234/api/*`
- Dice server: `ws://localhost:1235` and `http://localhost:1235/api/dice/*`
- Both servers auto-create rooms on demand

**Code Conventions:**
- Use TypeScript interfaces for all data structures
- React functional components with hooks
- Tailwind CSS for styling (no CSS modules)
- Client components marked with "use client" directive
- Server-side physics is authoritative over client rendering

**Testing the Application:**
1. Run `npm run dev` to start all servers
2. Open multiple browser windows to test multiplayer
3. Create/join rooms to test real-time synchronization
4. Dice throwing demonstrates server-client coordination

**Important Implementation Details:**
- The dual-server architecture separates concerns cleanly
- Physics calculations are server-authoritative to prevent cheating
- Responsive boundaries allow proper scaling across device sizes
- Room persistence survives server restarts via SQLite