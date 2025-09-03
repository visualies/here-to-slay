"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { useBox } from "@react-three/cannon";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three";

// Configurable randomness strength (0 = no randomness, 1 = full randomness)
const DICE_RANDOMNESS_STRENGTH = 0.3;

interface DiceProps {
  position: [number, number, number];
  onResult: (value: number) => void;
  isDraggingAny: boolean;
  setIsDraggingAny: (dragging: boolean) => void;
  setDragDelta: (delta: THREE.Vector3) => void;
  sharedDragVelocity: THREE.Vector3;
  setSharedDragVelocity: (velocity: THREE.Vector3) => void;
  draggedDicePosition: THREE.Vector3;
  setDraggedDicePosition: (position: THREE.Vector3) => void;
  diceInSync: boolean;
  setDiceInSync: (inSync: boolean) => void;
  showDebug?: boolean;
}

// 3D Dice Model Component
function DiceModel() {
  const materials = useLoader(MTLLoader, '/dice.mtl');
  const obj = useLoader(OBJLoader, '/cube.obj', (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  // Clone the object to avoid issues with multiple instances
  const clonedObj = obj.clone();
  
  // Scale the model appropriately
  clonedObj.scale.set(0.12, 0.12, 0.12);
  
  // Enable shadow casting and set off-white color for all meshes in the object
  clonedObj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      // Set colors based on material name
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat instanceof THREE.Material && (mat as any).color) {
              if (mat.name === 'black') {
                (mat as any).color = new THREE.Color('#000000');
              } else {
                (mat as any).color = new THREE.Color('#f8f8f8');
              }
            }
          });
        } else {
          if ((child.material as any).color) {
            if (child.material.name === 'black') {
              (child.material as any).color = new THREE.Color('#000000');
            } else {
              (child.material as any).color = new THREE.Color('#f8f8f8');
            }
          }
        }
      }
    }
  });
  
  return <primitive object={clonedObj} />;
}

export function RealisticDice({ position, onResult, isDraggingAny, setIsDraggingAny, setDragDelta, sharedDragVelocity, setSharedDragVelocity, draggedDicePosition, setDraggedDicePosition, diceInSync, setDiceInSync, showDebug = false }: DiceProps) {
  // Use simple box physics
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [0.3, 0.3, 0.3],
    material: { friction: 0.3, restitution: 0.7 },
  }));

  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [dragStart, setDragStart] = useState<THREE.Vector3>(new THREE.Vector3());
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const [, setDragVelocity] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastDragPosition, setLastDragPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [velocityHistory, setVelocityHistory] = useState<THREE.Vector3[]>([]);
  const [totalDragDistance, setTotalDragDistance] = useState<number>(0);
  const [lastGoodVelocity, setLastGoodVelocity] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastGoodVelocityTime, setLastGoodVelocityTime] = useState<number>(0);
  const { camera, raycaster, pointer } = useThree();

  // Handle drag start
  const handlePointerDown = useCallback((event: THREE.Event) => {
    event.stopPropagation();
    console.log('Pointer down - starting drag');
    setIsDragging(true);
    setIsDraggingAny(true);
    setIsStable(false);
    
    // Calculate offset from dice center to mouse position
    const intersection = event.intersections[0];
    if (intersection && meshRef.current) {
      const worldPosition = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPosition);
      setDragOffset(worldPosition.clone().sub(intersection.point));
      setDragStart(intersection.point.clone());
      setDragStartTime(performance.now());
      setLastDragPosition(intersection.point.clone());
      setDragVelocity(new THREE.Vector3());
      setVelocityHistory([]);
      setTotalDragDistance(0);
      setLastGoodVelocity(new THREE.Vector3());
      setLastGoodVelocityTime(0);
      
      // Lift the dice up slightly and store drag start position
      api.position.set(worldPosition.x, worldPosition.y + 0.5, worldPosition.z);
      
      // Reset drag delta when starting new drag
      setDragDelta(new THREE.Vector3());
    }
  }, [api, setIsDraggingAny, setDragDelta]);

  // Apply throw velocity when any dice drag ends
  useEffect(() => {
    console.log('Effect triggered - isDraggingAny:', isDraggingAny, 'isDragging:', isDragging, 'sharedVelocity length:', sharedDragVelocity.length(), 'totalDragDistance:', totalDragDistance);
    if (!isDraggingAny && (totalDragDistance > 0 || sharedDragVelocity.length() > 0)) {
      console.log('Inside effect - will calculate throw velocity');
      // Use shared velocity for both dice to ensure consistency
      let throwVelocity = new THREE.Vector3();
      
      if (sharedDragVelocity.length() > 0.01) {
        // Use shared velocity - this ensures both dice get the same direction and speed
        throwVelocity = sharedDragVelocity.clone();
        console.log('Using shared velocity for dice:', throwVelocity);
        
        // If this is a very short drag/tap, extend the velocity for better physics
        if (sharedDragVelocity.length() <= 0.05) {
          console.log('Short tap detected, extending shared velocity');
          // Create a random upward arc for short drags/taps
          const randomAngle = (Math.random() - 0.5) * Math.PI; // Random angle -90° to +90°
          const minDistance = 0.5; // Minimum effective distance for taps
          
          // Create an extended path with stronger upward component
          const horizontalDistance = Math.cos(randomAngle) * minDistance;
          const upwardDistance = Math.abs(Math.sin(randomAngle)) * minDistance + 0.3; // Stronger upward arc + minimum
          
          // If shared velocity had some direction, use it, otherwise random horizontal
          if (throwVelocity.length() > 0.001) {
            throwVelocity.normalize();
            throwVelocity.multiplyScalar(horizontalDistance);
          } else {
            // Pure tap - random horizontal direction
            const randomHorizontal = Math.random() * Math.PI * 2;
            throwVelocity.set(
              Math.cos(randomHorizontal) * horizontalDistance,
              0,
              Math.sin(randomHorizontal) * horizontalDistance
            );
          }
          
          // Add upward component for arc
          throwVelocity.y = upwardDistance;
          console.log('Extended shared velocity with upward:', throwVelocity);
        }
      } else {
        // Fallback: create a minimal random throw to avoid complete inactivity
        throwVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          0.05, // Small upward component
          (Math.random() - 0.5) * 0.1
        );
        console.log('Using fallback minimal velocity:', throwVelocity);
      }
      
      // Scale up the velocity for throwing force (now includes Y component from path extension)
      const baseThrowForce = new THREE.Vector3(
        throwVelocity.x * 15, // X movement multiplier
        throwVelocity.y * 15 + 4, // Y movement from path extension + base upward force
        throwVelocity.z * 15  // Z movement multiplier
      );
      
      // Add small random variations for uniqueness (simplified since path extension handles taps)
      const randomVariation = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * DICE_RANDOMNESS_STRENGTH, // Random X force
        Math.random() * 1.5 * DICE_RANDOMNESS_STRENGTH,       // Random upward force
        (Math.random() - 0.5) * 2 * DICE_RANDOMNESS_STRENGTH  // Random Z force
      );
      
      const finalThrowForce = baseThrowForce.clone().add(randomVariation);
      
      api.velocity.set(finalThrowForce.x, finalThrowForce.y, finalThrowForce.z);
      
      // Add rotation based on throw direction with moderate intensity
      const baseRotationForce = new THREE.Vector3(
        -throwVelocity.z * 8, // Reduced roll around X axis
        throwVelocity.x * 8,  // Reduced roll around Y axis
        throwVelocity.x * 5   // Reduced spin around Z axis
      );
      
      // Add random rotation variations to make each dice unique
      const randomRotation = new THREE.Vector3(
        (Math.random() - 0.5) * 25 * DICE_RANDOMNESS_STRENGTH, // Random X rotation
        (Math.random() - 0.5) * 25 * DICE_RANDOMNESS_STRENGTH, // Random Y rotation
        (Math.random() - 0.5) * 20 * DICE_RANDOMNESS_STRENGTH  // Random Z rotation
      );
      
      // Combine base rotation with random variation
      const finalRotationForce = baseRotationForce.clone().add(randomRotation);
      
      api.angularVelocity.set(finalRotationForce.x, finalRotationForce.y, finalRotationForce.z);
    }
  }, [isDraggingAny, isDragging, api, sharedDragVelocity, dragStart, lastDragPosition, totalDragDistance]);

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    console.log('Pointer up - isDragging:', isDragging);
    if (isDragging) {
      console.log('Ending drag with totalDragDistance:', totalDragDistance);
      setIsDragging(false);
      // Set isDraggingAny to false in a separate effect to allow throw calculation
      setTimeout(() => setIsDraggingAny(false), 0);
      // Velocity application is now handled by useEffect above
    }
  }, [isDragging, setIsDraggingAny, totalDragDistance]);

  const [, setInitialPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [syncOffset, setSyncOffset] = useState<THREE.Vector3>(new THREE.Vector3());

  // Make all dice kinematic when any is dragged, and lift them up
  useEffect(() => {
    if (isDraggingAny) {
      api.mass.set(0); // Make all dice kinematic
      
      // Store initial position and lift up - all dice get same lift height
      if (meshRef.current) {
        const worldPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(worldPos);
        setInitialPosition(worldPos.clone());
        api.position.set(worldPos.x, worldPos.y + 0.5, worldPos.z); // Same height for all
      }
    } else {
      // Re-enable physics when not dragging and reset sync state
      api.mass.set(1);
      setDiceInSync(false);
      setSyncOffset(new THREE.Vector3()); // Reset the locked offset
    }
  }, [isDraggingAny, api, setDiceInSync]);

  // Handle global pointer events using useFrame for continuous tracking
  useFrame(() => {
    if (isDragging && meshRef.current) {
      // Update raycaster with current pointer position
      raycaster.setFromCamera(pointer, camera);
      
      // Cast ray onto an invisible plane at ground level for smooth dragging
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Ground level plane
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      if (intersectPoint) {
        // Keep dice at a reasonable height while dragging
        const newPosition = intersectPoint.clone().add(dragOffset);
        newPosition.y = Math.max(newPosition.y, 1.5); // Keep elevated while dragging
        api.position.set(newPosition.x, newPosition.y, newPosition.z);
        
        // Calculate velocity based on movement (only XZ plane for horizontal movement)
        const currentPos2D = new THREE.Vector3(intersectPoint.x, 0, intersectPoint.z);
        const lastPos2D = new THREE.Vector3(lastDragPosition.x, 0, lastDragPosition.z);
        const frameVelocity = currentPos2D.clone().sub(lastPos2D);
        setDragVelocity(frameVelocity);
        
        // Track total distance moved
        const frameDistance = frameVelocity.length();
        setTotalDragDistance(prev => prev + frameDistance);
        
        // Update shared data for other dice using path-based velocity
        const totalDelta = intersectPoint.clone().sub(dragStart);
        setDragDelta(totalDelta);
        
        // Calculate velocity based on recent movement instead of total path for better end direction
        const recentMovement = currentPos2D.clone().sub(lastPos2D);
        const recentDirection = recentMovement.length() > 0.001 ? recentMovement.clone() : totalDelta.clone();
        recentDirection.y = 0; // Only horizontal movement initially
        
        // Only update shared velocity if we have meaningful movement to avoid erratic behavior
        if (recentDirection.length() > 0.01 || totalDragDistance > 0.02) {
          let sharedVelocity = new THREE.Vector3();
          
          if (recentDirection.length() > 0.001) {
            // Calculate based on recent movement direction for more responsive end direction
            let dragDirection = recentDirection.clone();
            
            // Handle short drags the same way as in the throw effect
            if (totalDragDistance <= 0.05) {
              // For very short drags, we'll let the throw effect handle the extension
              // Just store the basic direction here
              dragDirection.normalize();
              const speed = Math.max(totalDragDistance * 0.08, 0.15);
              sharedVelocity = dragDirection.multiplyScalar(Math.min(speed, 0.4));
            } else {
              // Normal drag - calculate direction and speed
              dragDirection.normalize();
              const speed = Math.max(totalDragDistance * 0.08, 0.15);
              sharedVelocity = dragDirection.multiplyScalar(Math.min(speed, 0.4));
            }
          }
          
          setSharedDragVelocity(sharedVelocity);
        }
        // If movement is too small, keep the previous shared velocity (don't update to zero)
        setDraggedDicePosition(newPosition.clone());
        
        // Store velocity history for smoother throwing (shorter window for better end direction)
        setVelocityHistory(prev => {
          const newHistory = [...prev, frameVelocity.clone()];
          return newHistory.slice(-3); // Keep only last 3 samples for more responsive end direction
        });
        
        setLastDragPosition(intersectPoint);
      }
    } else if (isDraggingAny && !isDragging) {
      // This dice is not being dragged - should follow the dragged dice
      if (draggedDicePosition.length() > 0 && meshRef.current) {
        const currentPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(currentPos);
        
        // Calculate target position with offset
        const direction = draggedDicePosition.clone().sub(currentPos);
        direction.y = 0; // Only consider horizontal distance
        const distance = direction.length();
        const targetDistance = 0.8; // Desired separation distance
        
        // Calculate target position
        let targetPosition;
        if (distance > 0.001) {
          direction.normalize();
          targetPosition = draggedDicePosition.clone().sub(direction.multiplyScalar(targetDistance));
        } else {
          // If exactly on top, offset to the side
          targetPosition = draggedDicePosition.clone().add(new THREE.Vector3(targetDistance, 0, 0));
        }
        
        // Determine movement speed based on distance to target
        const distanceToTarget = currentPos.distanceTo(targetPosition);
        let moveSpeed;
        
        if (diceInSync && syncOffset.length() > 0) {
          // Locked in sync - maintain exact relative position
          const finalPosition = draggedDicePosition.clone().add(syncOffset);
          finalPosition.y = Math.max(finalPosition.y, 1.5); // Keep elevated
          api.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
        } else {
          // Not locked yet - approach with variable speed
          if (distanceToTarget <= 0.15) {
            // Very close - lock the relative position
            const currentOffset = currentPos.clone().sub(draggedDicePosition);
            currentOffset.y = 0; // Keep only horizontal offset
            setSyncOffset(currentOffset);
            setDiceInSync(true);
            moveSpeed = 1.0; // Effectively instant
          } else if (distanceToTarget <= 0.5) {
            // Getting close - increase speed significantly
            moveSpeed = 0.3;
          } else {
            // Far away - normal approach speed
            moveSpeed = 0.08;
          }
          
          // Move towards target position
          const moveDirection = targetPosition.clone().sub(currentPos);
          const moveDistance = Math.min(moveDirection.length(), moveSpeed);
          
          if (moveDistance > 0.001) {
            moveDirection.normalize();
            const finalPosition = currentPos.clone().add(moveDirection.multiplyScalar(moveDistance));
            finalPosition.y = Math.max(finalPosition.y, 1.5); // Keep elevated
            api.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
          }
        }
      }
    }
  });

  // Detect dice result and stability
  useFrame(() => {
    if (meshRef.current && !isDragging) {
      const rotation = meshRef.current.rotation;
      const up = new THREE.Vector3(0, 1, 0);
      const worldUp = up.clone().applyEuler(rotation);
      
      // Check if dice is stable (not moving much)
      // Use a simple approach to check if dice is moving
      const isMoving = !isStable; // Assume moving if not stable
      
      if (!isMoving && !isStable) {
        setIsStable(true);
        
        // Determine which face is pointing up based on rotation
        const absX = Math.abs(worldUp.x);
        const absY = Math.abs(worldUp.y);
        const absZ = Math.abs(worldUp.z);
        
        let result: number;
        if (absY > absX && absY > absZ) {
          // Top or bottom face
          result = worldUp.y > 0 ? 6 : 1;
        } else if (absX > absZ) {
          // Left or right face
          result = worldUp.x > 0 ? 4 : 3;
        } else {
          // Front or back face
          result = worldUp.z > 0 ? 2 : 5;
        }
        
        if (result !== lastResult) {
          setLastResult(result);
          onResult(result);
        }
      } else if (isMoving && isStable) {
        setIsStable(false);
      }
    }
  });

  // Add global event listeners for pointer up to handle cases where pointer leaves the dice
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
    <group ref={ref}>
      {/* 3D Dice Model with physics */}
      {/* Collision box - visible only in debug mode */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        castShadow
        receiveShadow
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
      
      {/* 3D Dice Model - visual only */}
      <group castShadow receiveShadow>
        <DiceModel />
      </group>
    </group>
  );
}
