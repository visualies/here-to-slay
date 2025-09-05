"use client";

import { useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ServerDice, useServerDiceStates } from "./server-dice";
import { DebugPanel } from "./debug-panel";
import { createCoordinateTransformer, FIELD_SIZE } from "../lib/server-dice";

// Ground plane with visible grid
function GridGround() {
  const { viewport } = useThree();
  
  const gridSize = Math.max(viewport.width, viewport.height) + 10;
  
  return (
    <>
      {/* Shadow receiving plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
      
    </>
  );
}

// Responsive boundary visualization with red lines and padding
function BoundaryLines() {
  const { viewport } = useThree();
  
  // Calculate boundary positions with coordinate transformation
  const transformer = createCoordinateTransformer(viewport.width, viewport.height);
  
  // Server boundary coordinates (-5 to +5)
  const serverBounds = {
    left: -FIELD_SIZE,
    right: FIELD_SIZE, 
    front: -FIELD_SIZE,
    back: FIELD_SIZE
  };
  
  // Transform to client coordinates and add padding
  const PADDING_RATIO = 0.05; // 5% padding from viewport edges
  const paddingX = viewport.width * PADDING_RATIO;
  const paddingZ = viewport.height * PADDING_RATIO;
  
  const clientBounds = {
    left: transformer.serverToClient(serverBounds.left, 0).x + paddingX,
    right: transformer.serverToClient(serverBounds.right, 0).x - paddingX,
    front: transformer.serverToClient(0, serverBounds.front).z + paddingZ,
    back: transformer.serverToClient(0, serverBounds.back).z - paddingZ
  };
  
  // Create boundary lines using mesh with thin boxes (more reliable than line geometry)
  const lineThickness = 0.05;
  const lineHeight = 0.1;
  
  return (
    <group>
      {/* Left boundary line */}
      <mesh position={[clientBounds.left, lineHeight / 2, (clientBounds.front + clientBounds.back) / 2]}>
        <boxGeometry args={[lineThickness, lineHeight, Math.abs(clientBounds.back - clientBounds.front)]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Right boundary line */}
      <mesh position={[clientBounds.right, lineHeight / 2, (clientBounds.front + clientBounds.back) / 2]}>
        <boxGeometry args={[lineThickness, lineHeight, Math.abs(clientBounds.back - clientBounds.front)]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Front boundary line */}
      <mesh position={[(clientBounds.left + clientBounds.right) / 2, lineHeight / 2, clientBounds.front]}>
        <boxGeometry args={[Math.abs(clientBounds.right - clientBounds.left), lineHeight, lineThickness]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Back boundary line */}
      <mesh position={[(clientBounds.left + clientBounds.right) / 2, lineHeight / 2, clientBounds.back]}>
        <boxGeometry args={[Math.abs(clientBounds.right - clientBounds.left), lineHeight, lineThickness]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </group>
  );
}

// Camera controller for top-down view
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 12, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}


// Camera perspective toggle
const USE_ORTHOGRAPHIC_CAMERA = true;

// Main server dice canvas component  
export function ServerDiceCanvas({ onDiceResults, roomId }: { 
  onDiceResults?: (results: number[]) => void;
  roomId: string;
}) {
  const [diceCount] = useState(2);
  const [diceResults, setDiceResults] = useState<number[]>(Array(2).fill(0));

  // Use server dice manager
  const { diceManager, diceStates, isConnected, lastUpdate } = useServerDiceStates(roomId, () => {
    // Received dice states
  });

  const handleDiceResult = useCallback((value: number, index: number) => {
    setDiceResults(prev => {
      const newResults = [...prev];
      newResults[index] = value;
      return newResults;
    });
  }, []);

  // Notify parent component when dice results change
  useEffect(() => {
    onDiceResults?.(diceResults);
  }, [diceResults, onDiceResults]);

  // Don't render until we have a dice manager
  if (!diceManager) {
    return <div>Connecting to server...</div>;
  }

  return (
    <>
      {/* Debug Panel */}
      <DebugPanel
        roomId={roomId}
        serverDiceStates={diceStates}
        clientDiceStates={diceStates} // For now, same as server states
        isConnected={isConnected}
        lastUpdate={lastUpdate}
      />
      
      {/* Canvas */}
    <Canvas
      {...(USE_ORTHOGRAPHIC_CAMERA && { orthographic: true })}
      camera={{ 
        position: [0, 12, 0], 
        ...(USE_ORTHOGRAPHIC_CAMERA ? { zoom: 150 } : { fov: 50 })
      }}
      shadows
      gl={{ 
        antialias: true, 
        alpha: true,
        stencil: false,
        depth: true
      }}
      frameloop="always"
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        background: 'transparent'
      }}
    >
      <CameraController />
      
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[2, 15, 2]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={8192}
        shadow-mapSize-height={8192}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-radius={0}
        shadow-bias={-0.0001}
      />

      <GridGround />
      <BoundaryLines />
      
      {/* Server-controlled dice */}
      {Array.from({ length: diceCount }, (_, i) => {
        const diceId = `dice-${i}`;
        return (
          <ServerDice
            key={`server-dice-${i}`}
            diceId={diceId}
            initialPosition={[i * 1.2 - (diceCount - 1) * 0.6, 2, 0]}
            onResult={(value) => handleDiceResult(value, i)}
            serverDiceManager={diceManager}
            serverState={diceStates[diceId] || null}
            showDebug={false}
          />
        );
      })}
    </Canvas>
    </>
  );
}