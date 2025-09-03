"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBox } from "@react-three/cannon";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface DiceProps {
  position: [number, number, number];
  onResult: (value: number) => void;
  isDraggingAny: boolean;
  setIsDraggingAny: (dragging: boolean) => void;
  diceIndex: number;
  dragDelta: THREE.Vector3;
  setDragDelta: (delta: THREE.Vector3) => void;
  sharedDragVelocity: THREE.Vector3;
  setSharedDragVelocity: (velocity: THREE.Vector3) => void;
}

// Dice face component with dots
function DiceFace({ 
  position, 
  rotation, 
  value, 
  color = "white" 
}: { 
  position: [number, number, number]; 
  rotation: [number, number, number]; 
  value: number; 
  color?: string;
}) {
  const dotPositions = {
    1: [[0, 0, 0.01]],
    2: [[-0.15, 0.15, 0.01], [0.15, -0.15, 0.01]],
    3: [[-0.15, 0.15, 0.01], [0, 0, 0.01], [0.15, -0.15, 0.01]],
    4: [[-0.15, 0.15, 0.01], [0.15, 0.15, 0.01], [-0.15, -0.15, 0.01], [0.15, -0.15, 0.01]],
    5: [[-0.15, 0.15, 0.01], [0.15, 0.15, 0.01], [0, 0, 0.01], [-0.15, -0.15, 0.01], [0.15, -0.15, 0.01]],
    6: [[-0.15, 0.15, 0.01], [0.15, 0.15, 0.01], [-0.15, 0, 0.01], [0.15, 0, 0.01], [-0.15, -0.15, 0.01], [0.15, -0.15, 0.01]]
  };

  const dots = dotPositions[value as keyof typeof dotPositions] || [];

  return (
    <group position={position} rotation={rotation}>
      {/* Face background */}
      <mesh>
        <planeGeometry args={[0.54, 0.54]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Dots */}
      {dots.map((dotPos, index) => (
        <mesh key={index} position={dotPos as [number, number, number]}>
          <circleGeometry args={[0.05, 8]} />
          <meshStandardMaterial color="black" />
        </mesh>
      ))}
    </group>
  );
}

export function RealisticDice({ position, onResult, isDraggingAny, setIsDraggingAny, diceIndex, dragDelta, setDragDelta, sharedDragVelocity, setSharedDragVelocity }: DiceProps) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [0.6, 0.6, 0.6],
    material: { friction: 0.3, restitution: 0.7 },
  }));

  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [dragStart, setDragStart] = useState<THREE.Vector3>(new THREE.Vector3());
  const [dragVelocity, setDragVelocity] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastDragPosition, setLastDragPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [velocityHistory, setVelocityHistory] = useState<THREE.Vector3[]>([]);
  const { camera, raycaster, pointer } = useThree();

  // Handle drag start
  const handlePointerDown = useCallback((event: any) => {
    event.stopPropagation();
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
      setLastDragPosition(intersection.point.clone());
      setDragVelocity(new THREE.Vector3());
      setVelocityHistory([]);
      
      // Lift the dice up slightly and store drag start position
      api.position.set(worldPosition.x, worldPosition.y + 0.5, worldPosition.z);
      api.velocity.set(0, 0, 0); // Stop any current movement
      api.angularVelocity.set(0, 0, 0); // Stop any rotation
      
      // Reset drag delta when starting new drag
      setDragDelta(new THREE.Vector3());
    }
  }, [api, setIsDraggingAny, diceIndex]);

  // Apply throw velocity when any dice drag ends
  useEffect(() => {
    if (!isDraggingAny && (isDragging || sharedDragVelocity.length() > 0)) {
      // Calculate average velocity for throwing
      let avgVelocity = new THREE.Vector3();
      if (velocityHistory.length > 0) {
        // Use the last few velocity samples to get a smooth average
        const recentSamples = velocityHistory.slice(-3); // Last 3 frames
        for (const vel of recentSamples) {
          avgVelocity.add(vel);
        }
        avgVelocity.divideScalar(recentSamples.length);
      } else {
        // Use shared velocity for non-dragged dice  
        avgVelocity = sharedDragVelocity.clone();
      }
      
      // Scale up the velocity for throwing force (only horizontal movement)
      const throwForce = new THREE.Vector3(
        avgVelocity.x * 40, // Increased X movement multiplier
        8, // Increased upward force
        avgVelocity.z * 40  // Increased Z movement multiplier
      );
      
      api.velocity.set(throwForce.x, throwForce.y, throwForce.z);
      
      // Add rotation based on drag direction with increased intensity
      const rotationForce = new THREE.Vector3(
        -avgVelocity.z * 15, // Increased roll around X axis
        avgVelocity.x * 15,  // Increased roll around Y axis
        avgVelocity.x * 10   // Increased spin around Z axis
      );
      
      api.angularVelocity.set(rotationForce.x, rotationForce.y, rotationForce.z);
    }
  }, [isDraggingAny, api, velocityHistory, sharedDragVelocity]);

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setIsDraggingAny(false);
      // Velocity application is now handled by useEffect above
    }
  }, [isDragging, setIsDraggingAny]);

  const [initialPosition, setInitialPosition] = useState<THREE.Vector3>(new THREE.Vector3());

  // Make all dice kinematic when any is dragged, and lift them up
  useEffect(() => {
    if (isDraggingAny) {
      api.mass.set(0); // Make all dice kinematic
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      
      // Store initial position and lift up
      if (meshRef.current) {
        const worldPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(worldPos);
        setInitialPosition(worldPos.clone());
        api.position.set(worldPos.x, worldPos.y + (isDragging ? 0.5 : 0.3), worldPos.z);
      }
    } else {
      // Re-enable physics when not dragging
      api.mass.set(1);
    }
  }, [isDraggingAny, isDragging, api]);

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
        const velocity = currentPos2D.clone().sub(lastPos2D);
        setDragVelocity(velocity);
        
        // Update shared drag delta for other dice (cumulative movement from start)
        const totalDelta = intersectPoint.clone().sub(dragStart);
        setDragDelta(totalDelta);
        setSharedDragVelocity(velocity);
        
        // Store velocity history for smoother throwing
        setVelocityHistory(prev => {
          const newHistory = [...prev, velocity.clone()];
          return newHistory.slice(-10); // Keep last 10 samples
        });
        
        setLastDragPosition(intersectPoint);
      }
    } else if (isDraggingAny && !isDragging && dragDelta.length() > 0) {
      // This dice is not being dragged but should follow the drag movement
      const newPosition = initialPosition.clone().add(dragDelta);
      newPosition.y = Math.max(newPosition.y, 1.3); // Keep elevated
      api.position.set(newPosition.x, newPosition.y, newPosition.z);
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
      {/* Main dice body */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Dice faces with dots */}
      <DiceFace position={[0, 0, 0.31]} rotation={[0, 0, 0]} value={1} />
      <DiceFace position={[0, 0, -0.31]} rotation={[0, Math.PI, 0]} value={6} />
      <DiceFace position={[0.31, 0, 0]} rotation={[0, -Math.PI / 2, 0]} value={2} />
      <DiceFace position={[-0.31, 0, 0]} rotation={[0, Math.PI / 2, 0]} value={5} />
      <DiceFace position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} value={3} />
      <DiceFace position={[0, -0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} value={4} />
    </group>
  );
}
