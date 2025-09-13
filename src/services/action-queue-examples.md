# Action Queue System Examples

## Simple Single-Input Action

### Hero: "Steal a Hero from Another Player"

```typescript
// 1. Client plays hero with stealing effect
const response = await fetch('/api/action-chains/start-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-123',
    roomId: 'room-abc',
    triggerType: 'hero_played',
    triggerData: { heroCard: 'Assassin' },
    actions: [
      {
        type: 'steal_hero',
        requiresInput: true  // Needs user to choose which hero to steal
      }
    ]
  })
});

// Server response:
{
  "success": false,
  "chainId": "chain-room-abc-1234567890-xyz123",
  "requiresInput": {
    "type": "select_hero",
    "prompt": "Choose a hero to steal from an opponent",
    "options": [
      { "playerId": "player-456", "heroId": "hero-789", "heroName": "Fighter" },
      { "playerId": "player-789", "heroId": "hero-012", "heroName": "Mage" }
    ],
    "constraints": { "excludePlayerId": "player-123" }
  }
}
```

```typescript
// 2. Client shows hero selection UI, then continues
const continueResponse = await fetch('/api/action-chains/continue-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chainId: 'chain-room-abc-1234567890-xyz123',
    input: {
      targetPlayerId: 'player-456',
      heroId: 'hero-789'
    }
  })
});

// Server response:
{
  "success": true,
  "chainId": "chain-room-abc-1234567890-xyz123",
  "completed": true,
  "message": "Action chain completed"
}
```

## Multi-Step Action Chain

### Hero: "Steal a Hero, Then Draw 2 Cards"

```typescript
// 1. Start multi-step chain
const response = await fetch('/api/action-chains/start-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-123',
    roomId: 'room-abc', 
    triggerType: 'hero_played',
    triggerData: { heroCard: 'Master Thief' },
    actions: [
      {
        type: 'steal_hero',
        requiresInput: true   // Step 1: Choose hero to steal
      },
      {
        type: 'draw_card',
        requiresInput: false  // Step 2: Auto-draw card
      },
      {
        type: 'draw_card', 
        requiresInput: false  // Step 3: Auto-draw card
      }
    ]
  })
});

// Server responds with input request for step 1
{
  "success": false,
  "chainId": "chain-room-abc-1234567890-abc456",
  "requiresInput": {
    "type": "select_hero",
    "prompt": "Choose a hero to steal from an opponent"
    // ...options
  }
}
```

```typescript
// 2. Client continues with user choice
const continueResponse = await fetch('/api/action-chains/continue-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chainId: 'chain-room-abc-1234567890-abc456',
    input: { targetPlayerId: 'player-456', heroId: 'hero-789' }
  })
});

// Server executes steal, then auto-executes both draw_card actions
{
  "success": true,
  "chainId": "chain-room-abc-1234567890-abc456", 
  "completed": true,
  "message": "Action chain completed"
}
```

## Complex Choice Action

### Hero: "Choose 2 of 3 Effects"

```typescript
// 1. Start choice-based chain
const response = await fetch('/api/action-chains/start-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-123',
    roomId: 'room-abc',
    triggerType: 'hero_played',
    triggerData: { heroCard: 'Versatile Mage' },
    actions: [
      {
        type: 'choose_effects',
        requiresInput: true,
        data: {
          availableEffects: [
            { id: 'draw_2', name: 'Draw 2 Cards', actions: [
              { type: 'draw_card', requiresInput: false },
              { type: 'draw_card', requiresInput: false }
            ]},
            { id: 'attack_free', name: 'Attack Monster for Free', actions: [
              { type: 'attack_monster', requiresInput: true }
            ]},
            { id: 'steal_card', name: 'Steal Hand Card', actions: [
              { type: 'steal_hand_card', requiresInput: true }
            ]}
          ],
          chooseCount: 2
        }
      }
    ]
  })
});

// Server response:
{
  "success": false,
  "chainId": "chain-room-abc-1234567890-def789",
  "requiresInput": {
    "type": "choose_option",
    "prompt": "Choose which effects to activate",
    "options": [
      { "id": "draw_2", "name": "Draw 2 Cards" },
      { "id": "attack_free", "name": "Attack Monster for Free" },
      { "id": "steal_card", "name": "Steal Hand Card" }
    ],
    "constraints": { "minChoices": 2, "maxChoices": 2 }
  }
}
```

```typescript
// 2. Client continues with user choices
const continueResponse = await fetch('/api/action-chains/continue-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chainId: 'chain-room-abc-1234567890-def789',
    input: {
      chosenEffects: ['draw_2', 'attack_free']
    }
  })
});

// Server would then create a new chain with the selected effects:
// - draw_card (auto)
// - draw_card (auto) 
// - attack_monster (requires monster selection + dice)
```

## Error Handling & Reconnection

### Get Pending Chains (for reconnection)

```typescript
// When player reconnects, check for pending chains
const response = await fetch('/api/action-chains/pending-chains?playerId=player-123&roomId=room-abc');

// Response:
{
  "success": true,
  "chains": [
    {
      "id": "chain-room-abc-1234567890-xyz123",
      "triggerType": "hero_played",
      "triggerData": { "heroCard": "Assassin" },
      "totalActions": 3,
      "currentIndex": 1,
      "awaitingInput": true,
      "inputRequired": {
        "type": "select_hero",
        "prompt": "Choose a hero to steal from an opponent"
      },
      "createdAt": 1640995200000
    }
  ]
}
```

### Chain Timeout/Cleanup

- Chains automatically expire after **5 minutes** of inactivity
- Expired chains are cleaned up every minute
- When room closes, all chains for that room are cleaned up
- Server provides debug endpoint: `GET /api/action-chains/debug`

## Integration with Internal Action Services

The action queue system is designed to integrate with your internal action services:

```typescript
// In action-queue.ts executeAction method:
private executeAction(action: ActionQueueItem, chain: ActionChain): { success: boolean; message?: string } {
  switch (action.type) {
    case 'draw_card':
      // Call your internal drawCard service
      const context = this.buildActionContext(chain);
      const result = drawCard(context);
      return { success: result.success, message: result.message };

    case 'steal_hero':
      // Call your internal stealHero service
      const stealResult = stealHero(context, action.data?.userInput);
      return { success: stealResult.success, message: stealResult.message };
      
    // ... other action types
  }
}
```

This gives you a flexible system that can handle simple single-input hero effects all the way up to complex multi-step chains with multiple user interaction points!