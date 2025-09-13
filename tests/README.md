# Testing Structure

This project uses **Playwright** for testing with a organized structure separating UI and API tests by feature.

## Structure

```
tests/
├── api/           # API endpoint tests
│   └── rooms/     # Room-related API tests
└── ui/            # UI component and integration tests
    └── components/# Component tests
```

## Test Categories

### API Tests
- Located in `tests/api/`
- Test server endpoints directly
- Use Playwright's request API for HTTP calls
- Server runs on `http://192.168.178.61:1234`

### UI Tests
- Located in `tests/ui/`
- Test browser interactions and components
- Use Playwright's browser automation
- Client runs on `http://localhost:3000`

## Running Tests

```bash
# Run all tests
npm test

# Run only API tests
npm run test:api

# Run only UI tests
npm run test:ui

# Run tests with browser UI visible
npm run test:headed

# Debug tests step by step
npm run test:debug

# Run tests in report mode (list format, no web server)
npm test -- --reporter=list

# Run API tests in report mode
npm run test:api -- --reporter=list
```

## Current Tests

### API - Rooms (`tests/api/rooms/rooms.test.ts`)
- Room creation with default and custom parameters
- Player joining rooms
- Room capacity limits
- Room information retrieval
- Active rooms listing
- Full integration workflow

### API - Game Start (`tests/api/rooms/game-start.test.ts`)
- Game initialization with proper state setup
- Player hand card distribution (5 cards)
- Party leader assignment (1 per player)
- Monster assignment (3 per game)
- Game phase and turn management
- Error handling for edge cases

Tests cover the complete game start API including state verification via the room endpoint.

## Testing Principles

### State Mutation Verification
**CRITICAL**: All tests that mutate game state must verify that BOTH data stores are properly updated:

1. **Database** - SQLite persistence layer
2. **Yjs Document** - Real-time collaborative state

#### Why Both Matter:
- **Database**: Persists room/player data across server restarts
- **Yjs Document**: Enables real-time multiplayer synchronization

#### Testing Pattern:
For any API that mutates state:
```typescript
// 1. Perform the action
const response = await request.post('/api/some-action', { data })

// 2. Verify HTTP response
expect(response.status()).toBe(200)

// 3. Verify room state (via API)
const room = await request.get(`/api/room/${roomId}`)
expect(room.json()).toMatchObject(expectedData)

// 4. Verify Yjs document state is accessible via room endpoint
const roomStateResponse = await request.get(`/api/room/${roomId}`)
const roomStateData = await roomStateResponse.json()
expect(roomStateData.id).toBe(roomId)
```

#### Required for:
- ✅ Room creation
- ✅ Player joining/leaving
- ✅ Game state changes (turns, cards, dice)
- ✅ Action chains
- ✅ Player presence updates

### Game State Verification via Room Endpoint

**IMPORTANT**: Never rely on server logs for test verification. Always use API endpoints to verify state.

#### Room Concept:

**Room = Yjs Document**: In this architecture, a "room" is synonymous with its Yjs document. The room endpoint returns the live collaborative state (players, game state) as the primary content.

#### Room Endpoint Available:

**`GET /api/room/{roomId}`** - Returns the room (Yjs document + minimal metadata)

#### Game State Verification Pattern:

```typescript
// After performing game actions, verify room state (Yjs document)
const roomResponse = await request.get(`/api/room/${roomId}`)
expect(roomResponse.status()).toBe(200)

const room = await roomResponse.json()

// The room IS the Yjs document - verify player state
const player = room.players[playerId]
expect(player.hand).toHaveLength(5)                    // Hand cards
expect(player.party.leader.type).toBe('PartyLeader')   // Party leader
expect(Array.isArray(player.party.heroes)).toBe(true) // Heroes array

// Verify game state
expect(room.gameState.monsters).toHaveLength(3)     // Monsters
expect(room.gameState.phase).toBe('playing')        // Game phase
expect(room.gameState.currentTurn).toBe(playerId)   // Current turn

// Basic room metadata
expect(room.id).toBe(roomId)                        // Room ID
expect(room.name).toBeDefined()                     // Room name
```

#### Data Structure Reference:

```typescript
// Room response from GET /api/room/{roomId} (Room = Yjs Document)
{
  // Basic metadata
  id: string,
  name: string,
  maxPlayers: number,
  createdAt: string,

  // Core room content (Yjs document)
  gameState: {
    phase: 'waiting' | 'playing' | 'ended',
    currentTurn: string,    // Player ID whose turn it is
    monsters: Monster[],    // Array of 3 active monsters
    supportStack: Card[],   // Support cards deck
    // ... other game state
  } | null,

  players: {
    [playerId: string]: {
      id: string,
      name: string,
      color: string,
      hand: Card[],           // Array of cards in hand
      party: {
        leader: PartyLeader,  // Assigned party leader
        heroes: Hero[]        // Heroes in party
      },
      actionPoints: number,   // Current action points
      joinTime: number,       // Timestamp of join
      lastSeen: number        // Last activity timestamp
    }
  } | null
}
```

This ensures complete data integrity across both persistence and real-time layers.