"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { RoundedBox } from "@react-three/drei";

interface DiceProps {
  position: [number, number, number];
  initialRotation?: [number, number, number];
}

export function Dice({ position, initialRotation = [0, 0, 0] }: DiceProps) {
  const meshRef = useRef<Mesh>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef({
    startRotation: { x: 0, y: 0, z: 0 },
    targetRotation: { x: 0, y: 0, z: 0 },
    progress: 0,
    timeoutId: null as NodeJS.Timeout | null
  });

  // Set initial rotation on mount
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = initialRotation[0];
      meshRef.current.rotation.y = initialRotation[1];
      meshRef.current.rotation.z = initialRotation[2];
    }
  }, [initialRotation]);

  const startNextRotation = () => {
    if (!isRolling || isAnimating) return;
    
    setIsAnimating(true);
    
    // Choose random axis and direction
    const axes = ['x', 'y', 'z'] as const;
    const randomAxis = axes[Math.floor(Math.random() * axes.length)];
    const direction = Math.random() < 0.5 ? 1 : -1;
    
    if (meshRef.current) {
      animationRef.current.startRotation = {
        x: meshRef.current.rotation.x,
        y: meshRef.current.rotation.y,
        z: meshRef.current.rotation.z
      };
      
      animationRef.current.targetRotation = {
        ...animationRef.current.startRotation,
        [randomAxis]: animationRef.current.startRotation[randomAxis] + (Math.PI / 2) * direction
      };
      
      animationRef.current.progress = 0;
    }
  };

  const handleClick = () => {
    if (isRolling) {
      // Stop rolling
      setIsRolling(false);
      if (animationRef.current.timeoutId) {
        clearTimeout(animationRef.current.timeoutId);
      }
    } else {
      // Start rolling
      setIsRolling(true);
      startNextRotation();
    }
  };

  useFrame(() => {
    if (meshRef.current) {
      if (isRolling) {
        // Keep elevated while rolling
        meshRef.current.position.y = position[1] + 1.5;
        
        // Handle discrete rotations
        if (isAnimating) {
          animationRef.current.progress += 0.1;
          
          if (animationRef.current.progress >= 1) {
            // Complete rotation
            meshRef.current.rotation.x = animationRef.current.targetRotation.x;
            meshRef.current.rotation.y = animationRef.current.targetRotation.y;
            meshRef.current.rotation.z = animationRef.current.targetRotation.z;
            setIsAnimating(false);
            
            // Schedule next rotation
            animationRef.current.timeoutId = setTimeout(() => {
              startNextRotation();
            }, 300);
          } else {
            // Interpolate rotation
            const { startRotation, targetRotation, progress } = animationRef.current;
            meshRef.current.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * progress;
            meshRef.current.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * progress;
            meshRef.current.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * progress;
          }
        }
      } else {
        // Settle back down when stopped
        if (meshRef.current.position.y > position[1]) {
          meshRef.current.position.y = Math.max(
            position[1],
            meshRef.current.position.y - 0.05
          );
        }
      }
    }
  });

  return (
    <RoundedBox
      ref={meshRef} 
      position={position}
      args={[1.5, 1.5, 1.5]}
      radius={0.15}
      smoothness={8}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
      }}
    >
      <meshStandardMaterial color="white" />
    </RoundedBox>
  );
}