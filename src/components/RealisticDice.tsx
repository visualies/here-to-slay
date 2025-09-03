"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBox } from "@react-three/cannon";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface DiceProps {
  position: [number, number, number];
  onResult: (value: number) => void;
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

export function RealisticDice({ position, onResult }: DiceProps) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [0.6, 0.6, 0.6],
    material: { friction: 0.3, restitution: 0.4 },
  }));

  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [dragStart, setDragStart] = useState<THREE.Vector3>(new THREE.Vector3());
  const [dragVelocity, setDragVelocity] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastDragPosition, setLastDragPosition] = useState<THREE.Vector3>(new THREE.Vector3());

  // Handle drag start
  const handlePointerDown = useCallback((event: any) => {
    event.stopPropagation();
    setIsDragging(true);
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
    }
  }, []);

  // Handle drag end
  const handlePointerUp = useCallback((event: any) => {
    if (isDragging) {
      setIsDragging(false);
      
      // Apply throw force based on actual drag velocity and direction
      const throwForce = dragVelocity.clone().multiplyScalar(20); // Scale up the velocity
      throwForce.y += 5; // Add some upward force
      
      api.velocity.set(throwForce.x, throwForce.y, throwForce.z);
      
      // Add rotation based on drag direction
      const rotationForce = new THREE.Vector3(
        dragVelocity.z * 10, // Roll around X axis based on Z movement
        dragVelocity.x * 10, // Roll around Y axis based on X movement
        dragVelocity.x * 5   // Some spin around Z axis
      );
      
      api.angularVelocity.set(rotationForce.x, rotationForce.y, rotationForce.z);
    }
  }, [isDragging, api, dragVelocity]);

  // Handle drag move
  const handlePointerMove = useCallback((event: any) => {
    if (isDragging && meshRef.current) {
      const intersection = event.intersections[0];
      if (intersection) {
        const newPosition = intersection.point.clone().add(dragOffset);
        api.position.set(newPosition.x, newPosition.y, newPosition.z);
        
        // Calculate velocity based on movement
        const currentPosition = intersection.point.clone();
        const velocity = currentPosition.clone().sub(lastDragPosition);
        setDragVelocity(velocity);
        setLastDragPosition(currentPosition);
      }
    }
  }, [isDragging, dragOffset, api, lastDragPosition]);

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

  return (
    <group ref={ref}>
      {/* Main dice body */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
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
