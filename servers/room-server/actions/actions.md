# Action Files Documentation

This document provides detailed information about all action files in the game.

## Client-Side Actions (`src/actions/`)

### `room-actions.ts`
**Purpose:** Server actions for room management in the Next.js frontend
**Functions:**

#### `createRoomAction(prevState: ActionState, formData: FormData): Promise<ActionState>`
**Purpose:** Create a new game room
**Parameters:**
- `prevState: ActionState` - Previous form state
- `formData: FormData` - Form data containing:
  - `playerName: string` - Name of the player creating the room
  - `playerId: string` - Optional player ID
  - `turnDuration: number` - Turn duration in seconds (default: 30)
  - `selectedDeck: string` - Deck selection (default: 'standard')
**Returns:** `ActionState` with success/error status
**Notes:**
- Validates player name (required, max 20 characters)
- Creates room with max 4 players
- Automatically joins the created room
- Redirects to room page on success

#### `joinRoomAction(prevState: ActionState, formData: FormData): Promise<ActionState>`
**Purpose:** Join an existing game room
**Parameters:**
- `prevState: ActionState` - Previous form state
- `formData: FormData` - Form data containing:
  - `roomId: string` - 6-character room ID
  - `playerName: string` - Player name for joining
**Returns:** `ActionState` with success/error status
**Notes:**
- Validates room ID (required, exactly 6 characters)
- Redirects to room page, actual joining handled by RoomProvider

#### `ActionState`
**Type definition for action state:**
```typescript
type ActionState = {
  error?: string;
  success?: boolean;
}
```

## Server-Side Actions (`servers/room-server/actions/`)

### Core Actions (Common to All Heroes)

#### `capture-challenge.ts`
**Purpose:** Handle challenge capture mechanics
**Notes:**

#### `capture-dice.ts`
**Purpose:** Handle dice capture mechanics
**Notes:**

#### `capture-modifier.ts`
**Purpose:** Apply modifier effects during capture
**Notes:**

#### `deduct-point.ts`
**Purpose:** Deduct points from player for hero requirements
**Notes:**

#### `end-move.ts`
**Purpose:** Finalize player move and transition to next player
**Notes:**

#### `place-card.ts`
**Purpose:** Place a card on the game field
**Notes:**

### Card Management Actions

#### `destroy-card.ts`
**Purpose:** Remove a card from play permanently
**Notes:**

#### `discard-card.ts`
**Purpose:** Move card from hand to discard pile
**Notes:**
with this action the source must pick which card

#### `draw-card.ts`
**Purpose:** Draw cards from deck to hand
**Notes:**
draw is used for face down cards only
if you need to draw a face up card use pick-card (former search)

#### `play-card.ts`
**Purpose:** Play a card from hand
**Notes:**

#### `pick-card.ts`
**Purpose:** Pick any card from a source
**Notes:**
Pick cards reveals the cards to the current player.


#### `sacrifice-card.ts`
**Purpose:** Sacrifice own card for benefit
**Notes:**
with the sacrifice action the target picks the card

#### `steal-card.ts`
**Purpose:** Take a card from another player
**Notes:**

#### `trade-hands.ts`
**Purpose:** Exchange entire hands between players
**Notes:**

### Turn Management Actions

#### `end-turn.ts`
**Purpose:** End current player's turn
**Notes:**

### System Files

#### `action-registry.ts`
**Purpose:** Central registry for all actions
**Notes:**

#### `action-service.ts`
**Purpose:** Service layer for action execution
**Notes:**

#### `index.ts`
**Purpose:** Auto-import and export all actions
**Notes:**