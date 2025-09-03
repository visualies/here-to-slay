"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import { RealisticDice } from "./RealisticDice";

// Transparent ground plane that shows the game board underneath
function TransparentGround() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.1, 0],
    material: { friction: 0.4, restitution: 0.3 },
  }));

  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Boundary walls to keep dice on screen
function Boundaries() {
  const [leftWall] = usePlane(() => ({
    position: [-25, 0, 0],
    rotation: [0, Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [rightWall] = usePlane(() => ({
    position: [25, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [frontWall] = usePlane(() => ({
    position: [0, 0, -25],
    rotation: [0, 0, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [backWall] = usePlane(() => ({
    position: [0, 0, 25],
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
    camera.position.set(0, 12, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

// Main integrated dice canvas component
export function IntegratedDiceCanvas() {
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [diceCount, setDiceCount] = useState(2);

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

  return (
    <>
      {/* Dice Results Display - positioned in top-left corner */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white p-3 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Dice Results</h3>
        <div className="flex gap-2 mb-3">
          {diceResults.map((result, index) => (
            <div key={index} className="w-8 h-8 bg-white text-black rounded flex items-center justify-center font-bold">
              {result || '?'}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetDice}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Reset
          </button>
          <button
            onClick={() => setDiceCount(prev => Math.min(prev + 1, 6))}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            + Die
          </button>
          <button
            onClick={() => setDiceCount(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            - Die
          </button>
        </div>
      </div>

      {/* Instructions - positioned in bottom-left corner */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-50 text-white p-3 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Dice Controls</h3>
        <p className="text-sm">• Click and drag dice to throw them</p>
        <p className="text-sm">• Drag distance determines throw force</p>
        <p className="text-sm">• Dice will bounce and roll realistically</p>
      </div>

      {/* Three.js Canvas - covers entire game board */}
      <Canvas
        camera={{ position: [0, 12, 0], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
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
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />

        {/* Physics World */}
        <Physics gravity={[0, -9.82, 0]} defaultContactMaterial={{ friction: 0.4, restitution: 0.3 }}>
          <TransparentGround />
          <Boundaries />
          
          {/* Dice - positioned in center area */}
          {Array.from({ length: diceCount }, (_, i) => (
            <RealisticDice
              key={i}
              position={[i * 1.2 - (diceCount - 1) * 0.6, 2, 0]}
              onResult={(value) => handleDiceResult(value, i)}
            />
          ))}
        </Physics>
      </Canvas>
    </>
  );
}
