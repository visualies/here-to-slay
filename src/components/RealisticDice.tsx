"use client";

import { useRef, useState, useCallback, useEffect } from "react";
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
  const [velocityHistory, setVelocityHistory] = useState<THREE.Vector3[]>([]);
  const { camera, raycaster, pointer } = useThree();

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
      setVelocityHistory([]);
    }
  }, []);

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Calculate average velocity from recent history for smoother throwing
      let avgVelocity = new THREE.Vector3();
      if (velocityHistory.length > 0) {
        // Use the last few velocity samples to get a smooth average
        const recentSamples = velocityHistory.slice(-3); // Last 3 frames
        for (const vel of recentSamples) {
          avgVelocity.add(vel);
        }
        avgVelocity.divideScalar(recentSamples.length);
      }
      
      // Scale up the velocity for throwing force (only horizontal movement)
      const throwForce = new THREE.Vector3(
        avgVelocity.x * 25, // X movement
        5, // Fixed upward force
        avgVelocity.z * 25  // Z movement
      );
      
      api.velocity.set(throwForce.x, throwForce.y, throwForce.z);
      
      // Add rotation based on drag direction
      const rotationForce = new THREE.Vector3(
        -avgVelocity.z * 10, // Roll around X axis based on Z movement
        avgVelocity.x * 10,  // Roll around Y axis based on X movement
        avgVelocity.x * 5    // Some spin around Z axis
      );
      
      api.angularVelocity.set(rotationForce.x, rotationForce.y, rotationForce.z);
    }
  }, [isDragging, api, velocityHistory]);

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
        newPosition.y = Math.max(newPosition.y, 1); // Don't go below height 1
        api.position.set(newPosition.x, newPosition.y, newPosition.z);
        
        // Calculate velocity based on movement (only XZ plane for horizontal movement)
        const currentPos2D = new THREE.Vector3(intersectPoint.x, 0, intersectPoint.z);
        const lastPos2D = new THREE.Vector3(lastDragPosition.x, 0, lastDragPosition.z);
        const velocity = currentPos2D.clone().sub(lastPos2D);
        setDragVelocity(velocity);
        
        // Store velocity history for smoother throwing
        setVelocityHistory(prev => {
          const newHistory = [...prev, velocity.clone()];
          return newHistory.slice(-10); // Keep last 10 samples
        });
        
        setLastDragPosition(intersectPoint);
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
