"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree, useLoader, ThreeEvent } from "@react-three/fiber";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import * as THREE from "three";
import { ServerDiceManager, ServerDiceState, ServerDiceStates, createCoordinateTransformer } from "../lib/server-dice";
import { playDiceSound } from "../lib/dice-sounds";

interface ServerDiceProps {
  diceId: string;
  initialPosition: [number, number, number];
  onResult: (value: number) => void;
  serverDiceManager: ServerDiceManager;
  serverState: ServerDiceState | null;
  allDiceStates: ServerDiceStates; // Add access to all dice states
  showDebug?: boolean;
}

// 3D Dice Model Component
function DiceModel() {
  const materials = useLoader(MTLLoader, '/dice.mtl');
  const obj = useLoader(OBJLoader, '/cube.obj', (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const clonedObj = obj.clone();
  clonedObj.scale.set(0.12, 0.12, 0.12);
  
  clonedObj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat instanceof THREE.Material && 'color' in mat) {
              if (mat.name === 'black') {
                (mat as THREE.Material & { color: THREE.Color }).color = new THREE.Color('#000000');
              } else {
                (mat as THREE.Material & { color: THREE.Color }).color = new THREE.Color('#f8f8f8');
              }
            }
          });
        } else {
          if ('color' in child.material) {
            if (child.material.name === 'black') {
              (child.material as THREE.Material & { color: THREE.Color }).color = new THREE.Color('#000000');
            } else {
              (child.material as THREE.Material & { color: THREE.Color }).color = new THREE.Color('#f8f8f8');
            }
          }
        }
      }
    }
  });
  
  return <primitive object={clonedObj} />;
}

// Client-side dice grouping logic
function calculateAllDicePositions(
  leadDiceId: string,
  leadTargetPosition: THREE.Vector3,
  allDiceStates: ServerDiceStates,
  transformer: ReturnType<typeof createCoordinateTransformer>
): Record<string, [number, number, number]> {
  const result: Record<string, [number, number, number]> = {};
  
  // Magnetism configuration
  const MAGNETISM_THRESHOLD = 1.5;
  const SYNC_THRESHOLD = 0.8;
  const ATTRACTION_STRENGTH = 0.1;
  
  // Convert lead target position to server coordinates
  const leadServerPos = transformer.clientToServer(leadTargetPosition.x, leadTargetPosition.z);
  const leadPosition: [number, number, number] = [leadServerPos.x, leadTargetPosition.y, leadServerPos.z];
  
  // Always set lead dice position
  result[leadDiceId] = leadPosition;
  
  // Check if we need magnetism for any dice
  let needsMagnetism = false;
  Object.keys(allDiceStates).forEach(diceId => {
    if (diceId === leadDiceId) return;
    
    const diceState = allDiceStates[diceId];
    if (!diceState) return;
    
    const deltaX = leadPosition[0] - diceState.position[0];
    const deltaZ = leadPosition[2] - diceState.position[2];
    const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    
    if (distance > MAGNETISM_THRESHOLD) {
      needsMagnetism = true;
    }
  });
  
  // Calculate positions for other dice
  Object.keys(allDiceStates).forEach(diceId => {
    if (diceId === leadDiceId) return;
    
    const diceState = allDiceStates[diceId];
    if (!diceState) return;
    
    const currentPos = diceState.position;
    const deltaX = leadPosition[0] - currentPos[0];
    const deltaZ = leadPosition[2] - currentPos[2];
    const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    
    if (needsMagnetism && distance > SYNC_THRESHOLD) {
      // Apply magnetism
      const directionX = deltaX / distance;
      const directionZ = deltaZ / distance;
      
      const moveX = directionX * distance * ATTRACTION_STRENGTH;
      const moveZ = directionZ * distance * ATTRACTION_STRENGTH;
      
      result[diceId] = [
        currentPos[0] + moveX,
        leadPosition[1], // Match lead dice Y position
        currentPos[2] + moveZ
      ];
    } else {
      // Synchronized movement: maintain relative position
      const leadDiceState = allDiceStates[leadDiceId];
      if (leadDiceState) {
        const offsetX = leadPosition[0] - leadDiceState.position[0];
        const offsetY = leadPosition[1] - leadDiceState.position[1];
        const offsetZ = leadPosition[2] - leadDiceState.position[2];
        
        result[diceId] = [
          currentPos[0] + offsetX,
          currentPos[1] + offsetY,
          currentPos[2] + offsetZ
        ];
      }
    }
  });
  
  return result;
}

export function ServerDice({ diceId, initialPosition, onResult, serverDiceManager, serverState, allDiceStates, showDebug = false }: ServerDiceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false); // Immediate reference for useFrame
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number>(1);
  const { camera, raycaster, pointer, viewport } = useThree();
  
  // Create coordinate transformer for responsive boundaries
  const transformer = createCoordinateTransformer(viewport.width, viewport.height);
  
  // Movement tracking for throw velocity calculation
  const positionHistory = useRef<Array<{position: THREE.Vector3, time: number}>>([]);
  const lastPosition = useRef<THREE.Vector3>(new THREE.Vector3());
  const velocityBufferSize = 5; // Number of recent positions to track

  // Dice are automatically spawned by the server, no need to add them
  useEffect(() => {
  }, [diceId]);

  // Optimized dice visual state updates using useFrame for smoother rendering
  const lastServerState = useRef<ServerDiceState | null>(null);
  
  useFrame(() => {
    if (serverState && groupRef.current && !isDragging) {
      // Only update if state has actually changed to avoid unnecessary re-renders
      if (!lastServerState.current || 
          serverState.position[0] !== lastServerState.current.position[0] ||
          serverState.position[1] !== lastServerState.current.position[1] ||
          serverState.position[2] !== lastServerState.current.position[2] ||
          serverState.rotation[0] !== lastServerState.current.rotation[0] ||
          serverState.rotation[1] !== lastServerState.current.rotation[1] ||
          serverState.rotation[2] !== lastServerState.current.rotation[2] ||
          serverState.rotation[3] !== lastServerState.current.rotation[3]) {
        
        // Transform server coordinates to client coordinates for rendering
        const clientPos = transformer.serverToClient(serverState.position[0], serverState.position[2]);
        
        // Update position with transformed coordinates
        groupRef.current.position.set(
          clientPos.x,
          serverState.position[1], // Y remains unchanged (height)
          clientPos.z
        );
        
        // Update rotation
        groupRef.current.quaternion.set(
          serverState.rotation[0],
          serverState.rotation[1],
          serverState.rotation[2],
          serverState.rotation[3]
        );
        
        lastServerState.current = { ...serverState };
      }

      // Update result and play sound
      if (serverState.result !== lastResult) {
        setLastResult(serverState.result);
        onResult(serverState.result);
        
        // Play dice sound when result changes
        playDiceSound().catch(error => {
          console.warn('Failed to play dice sound:', error);
        });
      }
    }
  });

  // Handle drag start
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    isDraggingRef.current = true; // Immediate update for useFrame
    
    const intersection = event.intersections[0];
    if (intersection && meshRef.current) {
      const worldPosition = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPosition);
      setDragOffset(worldPosition.clone().sub(intersection.point));
      
      // Initialize movement tracking
      lastPosition.current.copy(worldPosition);
      positionHistory.current = [{
        position: worldPosition.clone(),
        time: performance.now()
      }];
    }
  }, []);

  // Calculate throw velocity based on recent movement
  const calculateThrowVelocity = useCallback((): [number, number, number] => {
    if (positionHistory.current.length < 2) {
      return [0, 0, 0]; // No movement to calculate
    }
    
    const currentTime = performance.now();
    const recentHistory = positionHistory.current.filter(
      entry => currentTime - entry.time < 100 // Only use last 100ms of movement
    );
    
    if (recentHistory.length < 2) {
      return [0, 0, 0];
    }
    
    // Calculate average velocity from recent positions
    const totalDelta = new THREE.Vector3();
    let totalTime = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const current = recentHistory[i];
      const previous = recentHistory[i - 1];
      const deltaPos = current.position.clone().sub(previous.position);
      const deltaTime = (current.time - previous.time) / 1000; // Convert to seconds
      
      if (deltaTime > 0) {
        totalDelta.add(deltaPos);
        totalTime += deltaTime;
      }
    }
    
    if (totalTime === 0) {
      return [0, 0, 0];
    }
    
    // Average velocity in client coordinates
    const clientVelocity = totalDelta.divideScalar(totalTime);
    
    // Transform velocity from client coordinates to server coordinates
    // For velocity, we need to scale by the coordinate transformation ratios
    const serverVelX = (clientVelocity.x / (viewport.width / 2)) * 5;
    const serverVelZ = (clientVelocity.z / (viewport.height / 2)) * 5;
    
    // Use transformed velocity for server physics
    return [
      serverVelX,
      clientVelocity.y, // Y velocity remains unchanged
      serverVelZ
    ];
  }, [viewport.width, viewport.height]);

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      isDraggingRef.current = false; // IMMEDIATELY stop useFrame from sending updates
      setIsDragging(false);
      
      if (groupRef.current) {
        const throwVelocity = calculateThrowVelocity();
        
        // Add some random angular velocity for realistic tumbling
        const angularVelocity: [number, number, number] = [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ];
        
        
        // Use throwAllDice instead of throwDice for physics-based throwing of all dice
        serverDiceManager.throwAllDice(throwVelocity, angularVelocity);
      }
      
      // Clear position history
      positionHistory.current = [];
    }
  }, [isDragging, diceId, serverDiceManager, calculateThrowVelocity]);

  // Optimized drag handling with throttled server updates
  const lastServerUpdate = useRef<number>(0);
  const SERVER_UPDATE_THROTTLE = 16; // Update server every 16ms (60fps) instead of every frame
  
  useFrame(() => {
    if (isDraggingRef.current && meshRef.current) {
      // Update raycaster with current pointer position
      raycaster.setFromCamera(pointer, camera);
      
      // Cast ray onto ground plane
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      if (intersectPoint && groupRef.current) {
        const newPosition = intersectPoint.clone().add(dragOffset);
        newPosition.y = Math.max(newPosition.y, 1.5); // Keep elevated while dragging
        
        // Update local position immediately for smooth dragging
        groupRef.current.position.copy(newPosition);
        
        // Track position for velocity calculation
        const currentTime = performance.now();
        positionHistory.current.push({
          position: newPosition.clone(),
          time: currentTime
        });
        
        // Keep only recent positions
        if (positionHistory.current.length > velocityBufferSize) {
          positionHistory.current.shift();
        }
        
        // Update last position
        lastPosition.current.copy(newPosition);
        
        // Throttle server updates for better performance
        if (currentTime - lastServerUpdate.current >= SERVER_UPDATE_THROTTLE) {
          // Calculate positions for all dice using client-side logic
          const allPositions = calculateAllDicePositions(diceId, newPosition, allDiceStates, transformer);
          
          // Send all positions to server at once
          serverDiceManager.moveMultipleDice(allPositions, true);
          lastServerUpdate.current = currentTime;
        }
      }
    }
  });

  // Global pointer up handler
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handlePointerUp();
      }
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    return () => document.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDragging, handlePointerUp]);

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* Collision box for interaction */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        visible={showDebug}
      >
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial 
          color="white" 
          transparent 
          opacity={0.3} 
          wireframe={false}
        />
      </mesh>
      
      {/* Visual dice model */}
      <group castShadow receiveShadow>
        <DiceModel />
      </group>
    </group>
  );
}

// Hook to manage server dice states
export function useServerDiceStates(roomId: string, onStatesUpdate?: (states: ServerDiceStates) => void) {
  const [diceManager, setDiceManager] = useState<ServerDiceManager | null>(null);
  const [diceStates, setDiceStates] = useState<ServerDiceStates>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    if (!roomId) return;


    // Import the multiplayer game to get the integrated dice manager
    import('../lib/multiplayer').then(({ getMultiplayerGame }) => {
      const multiplayerGame = getMultiplayerGame(roomId);
      
      // Set up WebSocket connection callbacks
      multiplayerGame.onWebSocketConnected = () => {
        setIsConnected(true);
      };
      
      multiplayerGame.onWebSocketDisconnected = () => {
        setIsConnected(false);
      };
      
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait time
      
      // Wait for the server dice manager to be available
      const checkForManager = () => {
        attempts++;
        const manager = multiplayerGame.getServerDiceManager();
        if (manager) {
          setDiceManager(manager);
          
          // Set up state update handler that updates both local state and calls callback
          manager['onStatesUpdate'] = (states: ServerDiceStates) => {
            setDiceStates(states);
            setLastUpdate(Date.now());
            onStatesUpdate?.(states);
            // Don't call originalOnStatesUpdate to avoid duplicate processing
          };
        } else if (attempts < maxAttempts) {
          // Check again in 100ms
          setTimeout(checkForManager, 100);
        } else {
          console.error(`[DEBUG] useServerDiceStates - Failed to get dice manager after ${maxAttempts} attempts`);
        }
      };
      
      checkForManager();
    });

    return () => {
      // Cleanup is handled by the multiplayer game
    };
  }, [roomId, onStatesUpdate]);

  // Update server dice states for individual dice components
  const updateDiceState = useCallback((diceId: string, setState: (state: ServerDiceState | null) => void) => {
    const state = diceStates[diceId] || null;
    setState(state);
  }, [diceStates]);

  return { diceManager, diceStates, updateDiceState, isConnected, lastUpdate };
}