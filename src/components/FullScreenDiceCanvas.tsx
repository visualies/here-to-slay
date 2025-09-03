"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RealisticDice } from "./RealisticDice";

// Ground plane
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -10, 0],
    material: { friction: 0.4, restitution: 0.3 },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#f0f0f0" />
    </mesh>
  );
}

// Boundary walls
function Boundaries() {
  const [leftWall] = usePlane(() => ({
    position: [-20, 0, 0],
    rotation: [0, Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [rightWall] = usePlane(() => ({
    position: [20, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [frontWall] = usePlane(() => ({
    position: [0, 0, -20],
    rotation: [0, 0, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [backWall] = usePlane(() => ({
    position: [0, 0, 20],
    rotation: [0, Math.PI, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  return (
    <>
      <mesh ref={leftWall} visible={false} />
      <mesh ref={rightWall} visible={false} />
      <mesh ref={frontWall} visible={false} />
      <mesh ref={backWall} visible={false} />
    </>
  );
}

// Camera controller for top-down view
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 15, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

// Main canvas component
export function FullScreenDiceCanvas({ onClose }: { onClose: () => void }) {
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [diceCount, setDiceCount] = useState(2);
  const [isDragging, setIsDragging] = useState(false);

  const handleDiceResult = useCallback((value: number, index: number) => {
    setDiceResults(prev => {
      const newResults = [...prev];
      newResults[index] = value;
      return newResults;
    });
  }, []);

  const resetDice = useCallback(() => {
    setDiceResults([]);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Dice Results</h2>
        <div className="flex gap-2 mb-4">
          {diceResults.map((result, index) => (
            <div key={index} className="w-8 h-8 bg-white text-black rounded flex items-center justify-center font-bold">
              {result || '?'}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetDice}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Reset
          </button>
          <button
            onClick={() => setDiceCount(prev => Math.min(prev + 1, 6))}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Add Die
          </button>
          <button
            onClick={() => setDiceCount(prev => Math.max(prev - 1, 1))}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Remove Die
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        Close
      </button>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-50 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2">How to Play</h3>
        <p className="text-sm">• Click and drag dice to throw them</p>
        <p className="text-sm">• Drag distance determines throw force</p>
        <p className="text-sm">• Dice will bounce and roll realistically</p>
        <p className="text-sm">• Results appear when dice stop moving</p>
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 15, 0], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <CameraController />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        {/* Physics World */}
        <Physics gravity={[0, -9.82, 0]} defaultContactMaterial={{ friction: 0.4, restitution: 0.3 }}>
          <Ground />
          <Boundaries />
          
          {/* Dice */}
          {Array.from({ length: diceCount }, (_, i) => (
            <RealisticDice
              key={i}
              position={[i * 2 - (diceCount - 1), 5, 0]}
              onResult={(value) => handleDiceResult(value, i)}
            />
          ))}
        </Physics>
      </Canvas>
    </div>
  );
}
