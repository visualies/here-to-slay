# Internal Action System

A clean separation between **API endpoints** (with validation) and **internal action services** (pure game logic).

## Architecture

```
┌─── API Endpoints ────┐    ┌─── Internal Services ───┐
│                      │    │                         │
│ POST /game/draw-card │───▶│ drawCard()              │
│ ✅ Turn validation   │    │ ✅ Pure game logic      │
│ ✅ Action points     │    │ ✅ No validation        │
│ ✅ Common payload    │    │ ✅ Reusable everywhere  │
│ ✅ Dice handling     │    │ ✅ No API concerns      │
│                      │    │                         │
└──────────────────────┘    └─────────────────────────┘
```

## The 4 Player Actions

### 1. **Draw Card** - `/api/game/draw-card`
- **Payload**: `{ playerId, roomId }`
- **Validation**: Requires 1 action point, player's turn
- **Internal**: `drawCard(context)` - draws from support stack

### 2. **Play Hero to Party** - `/api/game/play-hero-to-party`
- **Payload**: `{ playerId, roomId, cardId }`
- **Validation**: Requires 1 action point, player's turn, valid card ID
- **Internal**: `playHeroToParty(context, cardId)` - moves hero from hand to party

### 3. **Attack Monster** - `/api/game/attack-monster`
- **Payload**: `{ playerId, roomId, monsterId, diceResult }`
- **Validation**: Requires 1 action point, player's turn, dice result
- **Internal**: `attackMonster(context, monsterId, diceResult)` - processes attack
- **Note**: Client must include dice result in payload

### 4. **Discard Hand & Redraw** - `/api/game/discard-hand-redraw`
- **Payload**: `{ playerId, roomId }`
- **Validation**: Requires 1 action point, player's turn
- **Internal**: `discardAllAndRedraw(context)` - discards all, draws 5 new

## Common Payload Structure

All game actions use this consistent payload format:

```typescript
interface GameActionRequest {
  playerId: string;         // Required - player making the action
  roomId: string;           // Required - room ID
  cardId?: string;          // Optional - for play-hero-to-party
  monsterId?: string;       // Optional - for attack-monster
  diceResult?: number;      // Required for attack-monster
}
```

## Internal Action Service

### Core Functions

```typescript
// All internal actions are pure functions with no API validation
function drawCard(context: ActionServiceContext): ActionResult
function playHeroToParty(context: ActionServiceContext, cardId: string): ActionResult
function attackMonster(context: ActionServiceContext, monsterId: string, diceResult: number): ActionResult
function discardAllAndRedraw(context: ActionServiceContext): ActionResult
```

### ActionResult Format

```typescript
interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;  // Contains action-specific data (cards drawn, monsters defeated, etc.)
}
```

## Benefits of This System

### ✅ **Clean Separation**
- API endpoints handle validation & turn logic
- Internal services contain pure game logic
- Future hero effects can reuse internal actions

### ✅ **Common Payload**
- All actions use the same request structure
- Client can include `diceResult` for actions that need it
- Consistent interface across all game actions

### ✅ **Flexible Action Points**
- Normal actions cost 1 action point (validated by API)
- Future hero effects can call internal actions with different rules
- Server controls when turns advance

### ✅ **Simple Dice Handling**
- Client includes dice result in payload
- No complex multi-step API flows
- Server processes dice result immediately

### ✅ **Type Safety**
- All actions have proper TypeScript interfaces
- Input/output types are consistent
- No guessing what parameters are needed

## Usage Example

```typescript
// Client makes request with dice result included
const response = await fetch('/api/game/attack-monster', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-123',
    roomId: 'room-abc',
    monsterId: 'monster-456',
    diceResult: 18  // Client handles dice roll, includes result
  })
});

const result = await response.json();
// { success: true, message: "Defeated Dragon! (Rolled 18)", data: {...} }
```

This system provides a clean foundation for the 4 core player actions with room for future expansion!