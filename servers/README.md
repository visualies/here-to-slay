# Servers

This directory contains the backend servers for the Here to Slay multiplayer card game.

## Architecture

### Room Server (`room-server/`)
- **Port**: 1234
- **Purpose**: Room management, Yjs document synchronization, and WebSocket connections
- **Entry Point**: `server.ts`
- **Features**:
  - SQLite database for room persistence
  - Yjs collaborative document management
  - Player presence tracking
  - HTTP API for room operations
  - WebSocket connections for real-time sync

### Dice Server (`dice-server/`)
- **Port**: 1235  
- **Purpose**: Server-authoritative 3D dice physics simulation
- **Entry Point**: `dice-server.ts`
- **Features**:
  - CANNON-ES physics engine
  - 60fps physics simulation broadcasting
  - Server-side collision detection
  - 10x10 coordinate system with client scaling

## Development

Run both servers with:
```bash
npm run dev
```

Run individually:
```bash
npm run server      # Room server only
npm run dice-server # Dice server only
```