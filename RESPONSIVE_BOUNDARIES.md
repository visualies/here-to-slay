# Responsive Server-Boundary System Implementation

## Overview
This system implements a truly responsive dice playing field where the server maintains a fixed 10x10 coordinate system while clients independently scale X and Y dimensions to fully utilize their viewport.

## Core Concept
- **Server**: Fixed 10x10 playing field centered at origin (-5 to +5 on both X and Z axes)
- **Clients**: Independent X/Y scaling to fully utilize viewport dimensions without letterboxing

## Server-Side Implementation

### Playing Field Specifications
- **Dimensions**: 10x10 units
- **Origin**: Center (0, 0)
- **X Range**: -5 to +5
- **Z Range**: -5 to +5
- **Boundaries**: 4 invisible walls in CANNON.js physics world

### Physics Boundaries
```javascript
// Add boundary walls to CANNON.js world
const FIELD_SIZE = 5; // Half-size (center to edge)

// Left wall (X = -5)
const leftWall = new CANNON.Body({ mass: 0 });
leftWall.addShape(new CANNON.Box(new CANNON.Vec3(0.1, 5, FIELD_SIZE)));
leftWall.position.set(-FIELD_SIZE, 0, 0);

// Right wall (X = +5)
const rightWall = new CANNON.Body({ mass: 0 });
rightWall.addShape(new CANNON.Box(new CANNON.Vec3(0.1, 5, FIELD_SIZE)));
rightWall.position.set(FIELD_SIZE, 0, 0);

// Front wall (Z = -5)
const frontWall = new CANNON.Body({ mass: 0 });
frontWall.addShape(new CANNON.Box(new CANNON.Vec3(FIELD_SIZE, 5, 0.1)));
frontWall.position.set(0, 0, -FIELD_SIZE);

// Back wall (Z = +5)
const backWall = new CANNON.Body({ mass: 0 });
backWall.addShape(new CANNON.Box(new CANNON.Vec3(FIELD_SIZE, 5, 0.1)));
backWall.position.set(0, 0, FIELD_SIZE);
```

## Client-Side Implementation

### Coordinate Transformation System

#### Forward Transform (Server → Client Display)
```javascript
// Transform server coordinates to client viewport coordinates
function serverToClient(serverX, serverZ, viewportWidth, viewportHeight) {
  const clientX = (serverX / 5) * (viewportWidth / 2);
  const clientZ = (serverZ / 5) * (viewportHeight / 2);
  return { x: clientX, z: clientZ };
}
```

#### Reverse Transform (Client Input → Server Coordinates)
```javascript
// Transform client viewport coordinates to server coordinates
function clientToServer(clientX, clientZ, viewportWidth, viewportHeight) {
  const serverX = (clientX / (viewportWidth / 2)) * 5;
  const serverZ = (clientZ / (viewportHeight / 2)) * 5;
  return { x: serverX, z: serverZ };
}
```

### Visual Boundary System
- **Red boundary lines** showing field edges
- **Padding**: 20px from browser window edges
- **Dynamic positioning** based on viewport dimensions

```javascript
// Calculate boundary positions with padding
const PADDING = 20;
const boundaryLeft = -viewportWidth/2 + PADDING;
const boundaryRight = viewportWidth/2 - PADDING;
const boundaryTop = -viewportHeight/2 + PADDING;
const boundaryBottom = viewportHeight/2 - PADDING;
```

## Implementation Benefits

### True Responsiveness
- **Wide screens**: Field stretches horizontally for more "room" feel
- **Tall screens**: Field stretches vertically for more "room" feel
- **Maximum utilization**: Every client uses full screen real estate
- **Consistent relative positions**: All players see dice at same relative screen positions

### Examples

#### Wide Screen (1920x1080)
- Server dice at (2.5, 0) → Client sees dice 50% to right of screen center
- Field appears wide and stretched horizontally

#### Tall Screen (768x1024)  
- Same server dice at (2.5, 0) → Still 50% to right of screen center
- Field appears tall and stretched vertically

#### Square Screen (1000x1000)
- Same server dice at (2.5, 0) → Still 50% to right of screen center
- Field appears square and proportional

## Implementation Tasks

1. **Server-Side**:
   - Add boundary walls to dice-server.js physics world
   - Ensure dice spawn within -5 to +5 range

2. **Client-Side**:
   - Implement coordinate transformation functions
   - Update dice position rendering with transforms
   - Handle input transformation for dragging
   - Add red boundary line visualization with padding

3. **Integration**:
   - Test coordinate accuracy across different viewport sizes
   - Verify dice remain visible on all screen aspect ratios
   - Ensure smooth dragging with coordinate conversion

## File Modifications Required

- `dice-server.js`: Add boundary walls to physics world
- `src/components/server-dice-canvas.tsx`: Add boundary visualization
- `src/components/server-dice.tsx`: Implement coordinate transformations
- `src/lib/server-dice.ts`: Add transformation utility functions