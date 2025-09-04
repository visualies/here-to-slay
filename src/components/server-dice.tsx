"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree, useLoader, ThreeEvent } from "@react-three/fiber";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import * as THREE from "three";
import { ServerDiceManager, ServerDiceState } from "../lib/server-dice";

interface ServerDiceProps {
  diceId: string;
  initialPosition: [number, number, number];
  onResult: (value: number) => void;
  serverDiceManager: ServerDiceManager;
  serverState: ServerDiceState | null;
  showDebug?: boolean;
}

// 3D Dice Model Component (reused from realistic-dice)
function DiceModel({ showDebugHandles = false }: { showDebugHandles?: boolean }) {
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

export function ServerDice({ diceId, initialPosition, onResult, serverDiceManager, serverState, showDebug = false }: ServerDiceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number>(1);
  const [diceAdded, setDiceAdded] = useState(false);
  const { camera, raycaster, pointer } = useThree();

  // Dice are automatically spawned by the server, no need to add them
  useEffect(() => {
    console.log(`[DEBUG] ServerDice - Component mounted for dice ${diceId}, waiting for server state`);
    setDiceAdded(true); // Mark as ready since server handles dice creation
  }, [diceId]);

  // Update dice visual state when server state changes
  useEffect(() => {
    if (serverState && groupRef.current && !isDragging) {
      // Update position
      groupRef.current.position.set(
        serverState.position[0],
        serverState.position[1],
        serverState.position[2]
      );
      
      // Update rotation
      groupRef.current.quaternion.set(
        serverState.rotation[0],
        serverState.rotation[1],
        serverState.rotation[2],
        serverState.rotation[3]
      );

      // Update result
      if (serverState.result !== lastResult) {
        setLastResult(serverState.result);
        onResult(serverState.result);
        // Server result received
      }
    }
  }, [serverState, isDragging, lastResult, onResult, diceId]);

  // Handle drag start
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    // Starting drag
    setIsDragging(true);
    
    const intersection = event.intersections[0];
    if (intersection && meshRef.current) {
      const worldPosition = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPosition);
      setDragOffset(worldPosition.clone().sub(intersection.point));
    }
  }, [diceId]);

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      // Ending drag
      setIsDragging(false);
      // TODO: Calculate throw velocity and send to server
      // For now, just release as kinematic
      if (groupRef.current) {
        const pos = groupRef.current.position;
        serverDiceManager.moveDice(diceId, [pos.x, pos.y, pos.z], false); // Release to physics
      }
    }
  }, [isDragging, diceId, serverDiceManager]);

  // Handle dragging movement
  useFrame(() => {
    if (isDragging && meshRef.current) {
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
        
        // Send position to server
        serverDiceManager.moveDice(diceId, [newPosition.x, newPosition.y, newPosition.z], true);
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
export function useServerDiceStates(roomId: string, onStatesUpdate?: (states: any) => void) {
  const [diceManager, setDiceManager] = useState<ServerDiceManager | null>(null);
  const [diceStates, setDiceStates] = useState<any>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    console.log(`[DEBUG] useServerDiceStates - Setting up for room ${roomId}`);

    // Import the multiplayer game to get the integrated dice manager
    import('../lib/multiplayer').then(({ getMultiplayerGame }) => {
      const multiplayerGame = getMultiplayerGame(roomId);
      
      // Set up WebSocket connection callbacks
      multiplayerGame.onWebSocketConnected = () => {
        console.log(`[DEBUG] useServerDiceStates - WebSocket connected for room ${roomId}`);
        setIsConnected(true);
      };
      
      multiplayerGame.onWebSocketDisconnected = () => {
        console.log(`[DEBUG] useServerDiceStates - WebSocket disconnected for room ${roomId}`);
        setIsConnected(false);
      };
      
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait time
      
      // Wait for the server dice manager to be available
      const checkForManager = () => {
        attempts++;
        const manager = multiplayerGame.getServerDiceManager();
        if (manager) {
          console.log(`[DEBUG] useServerDiceStates - Found dice manager for room ${roomId} after ${attempts} attempts`);
          setDiceManager(manager);
          
          // Set up state update handler that updates both local state and calls callback
          const originalOnStatesUpdate = manager['onStatesUpdate'];
          manager['onStatesUpdate'] = (states: any) => {
            console.log(`[DEBUG] useServerDiceStates - Received dice states:`, states);
            setDiceStates(states);
            setLastUpdate(Date.now());
            onStatesUpdate?.(states);
            // Don't call originalOnStatesUpdate to avoid duplicate processing
          };
        } else if (attempts < maxAttempts) {
          console.log(`[DEBUG] useServerDiceStates - Dice manager not ready yet, checking again... (attempt ${attempts}/${maxAttempts})`);
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
    console.log(`[DEBUG] useServerDiceStates - Updating dice ${diceId} state:`, state);
    setState(state);
  }, [diceStates]);

  return { diceManager, diceStates, updateDiceState, isConnected, lastUpdate };
}