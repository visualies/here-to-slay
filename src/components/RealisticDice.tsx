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
    1: [[0, 0, 0.51]],
    2: [[-0.25, 0.25, 0.51], [0.25, -0.25, 0.51]],
    3: [[-0.25, 0.25, 0.51], [0, 0, 0.51], [0.25, -0.25, 0.51]],
    4: [[-0.25, 0.25, 0.51], [0.25, 0.25, 0.51], [-0.25, -0.25, 0.51], [0.25, -0.25, 0.51]],
    5: [[-0.25, 0.25, 0.51], [0.25, 0.25, 0.51], [0, 0, 0.51], [-0.25, -0.25, 0.51], [0.25, -0.25, 0.51]],
    6: [[-0.25, 0.25, 0.51], [0.25, 0.25, 0.51], [-0.25, 0, 0.51], [0.25, 0, 0.51], [-0.25, -0.25, 0.51], [0.25, -0.25, 0.51]]
  };

  const dots = dotPositions[value as keyof typeof dotPositions] || [];

  return (
    <group position={position} rotation={rotation}>
      {/* Face background */}
      <mesh>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Dots */}
      {dots.map((dotPos, index) => (
        <mesh key={index} position={dotPos as [number, number, number]}>
          <circleGeometry args={[0.08, 8]} />
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
    args: [1, 1, 1],
    material: { friction: 0.3, restitution: 0.4 },
  }));

  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3>(new THREE.Vector3());
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);

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
    }
  }, []);

  // Handle drag end
  const handlePointerUp = useCallback((event: any) => {
    if (isDragging) {
      setIsDragging(false);
      
      // Apply throw force based on drag distance and direction
      const velocity = event.velocity || new THREE.Vector3(0, 0, 0);
      const force = new THREE.Vector3(
        velocity.x * 15,
        velocity.y * 15 + 8, // Add upward force
        velocity.z * 15
      );
      
      api.velocity.set(force.x, force.y, force.z);
      
      // Add some random rotation
      api.angularVelocity.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
    }
  }, [isDragging, api]);

  // Handle drag move
  const handlePointerMove = useCallback((event: any) => {
    if (isDragging && meshRef.current) {
      const intersection = event.intersections[0];
      if (intersection) {
        const newPosition = intersection.point.clone().add(dragOffset);
        api.position.set(newPosition.x, newPosition.y, newPosition.z);
      }
    }
  }, [isDragging, dragOffset, api]);

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
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Dice faces with dots */}
      <DiceFace position={[0, 0, 0.5]} rotation={[0, 0, 0]} value={1} />
      <DiceFace position={[0, 0, -0.5]} rotation={[0, Math.PI, 0]} value={6} />
      <DiceFace position={[0.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} value={2} />
      <DiceFace position={[-0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} value={5} />
      <DiceFace position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} value={3} />
      <DiceFace position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} value={4} />
    </group>
  );
}
