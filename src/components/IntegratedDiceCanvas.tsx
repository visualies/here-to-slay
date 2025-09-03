"use client";

import { useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import { RealisticDice } from "./RealisticDice";

// Ground plane with visible grid
function GridGround() {
  const { viewport } = useThree();
  
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.1, 0],
    material: { friction: 0.4, restitution: 0.3 },
  }));

  // Create a grid texture
  const gridSize = Math.max(viewport.width, viewport.height) + 10;
  
  return (
    <>
      {/* Physics ground plane (invisible) */}
      <mesh ref={ref} visible={false}>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Shadow receiving plane - transparent with visible shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
      
      {/* Visible grid */}
      {DEBUG_SHOW_BOUNDARIES && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[gridSize, gridSize]} />
          <meshStandardMaterial 
            color="#f0f0f0" 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Grid lines */}
      {DEBUG_SHOW_BOUNDARIES && (
        <gridHelper 
          args={[gridSize, Math.floor(gridSize / 2), '#cccccc', '#dddddd']} 
          position={[0, -0.08, 0]} 
        />
      )}
    </>
  );
}

// Responsive boundary walls to keep dice on screen
function Boundaries() {
  const { viewport } = useThree();

  // Create grid texture
  const createGridTexture = useCallback((width: number, height: number, color: string) => {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    
    // Fill background
    context.fillStyle = color;
    context.fillRect(0, 0, size, size);
    
    // Draw grid lines
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 2;
    
    // Vertical lines
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * size;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size);
      context.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * size;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.repeat.set(width / 2, height / 2);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  
  // Calculate world boundaries based on viewport size
  const inset = 0.5; // Move walls slightly inward to make them visible
  const leftBound = -viewport.width / 2 + inset;
  const rightBound = viewport.width / 2 - inset;
  const topBound = viewport.height / 2 - inset;
  const bottomBound = -viewport.height / 2 + inset;

  const [leftWall, leftWallApi] = usePlane(() => ({
    position: [leftBound, 0, 0],
    rotation: [0, Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [rightWall, rightWallApi] = usePlane(() => ({
    position: [rightBound, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [topWall, topWallApi] = usePlane(() => ({
    position: [0, 0, topBound],
    rotation: [0, Math.PI, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  const [bottomWall, bottomWallApi] = usePlane(() => ({
    position: [0, 0, bottomBound],
    rotation: [0, 0, 0],
    material: { friction: 0.4, restitution: 0.6 },
  }));

  // Update both visual and physics positions when viewport changes
  useEffect(() => {
    const newLeftBound = -viewport.width / 2 + inset;
    const newRightBound = viewport.width / 2 - inset;
    const newTopBound = viewport.height / 2 - inset;
    const newBottomBound = -viewport.height / 2 + inset;

    // Update physics positions
    leftWallApi.position.set(newLeftBound, 0, 0);
    rightWallApi.position.set(newRightBound, 0, 0);
    topWallApi.position.set(0, 0, newTopBound);
    bottomWallApi.position.set(0, 0, newBottomBound);

    // Update visual positions
    if (leftWall.current) leftWall.current.position.set(newLeftBound, 0, 0);
    if (rightWall.current) rightWall.current.position.set(newRightBound, 0, 0);
    if (topWall.current) topWall.current.position.set(0, 0, newTopBound);
    if (bottomWall.current) bottomWall.current.position.set(0, 0, newBottomBound);
  }, [viewport.width, viewport.height, leftWallApi, rightWallApi, topWallApi, bottomWallApi, leftWall, rightWall, topWall, bottomWall]);

  const redGridTexture = createGridTexture(viewport.height + 4, 10, 'rgba(255, 0, 0, 0.3)');
  const blueGridTexture = createGridTexture(viewport.width + 4, 10, 'rgba(0, 0, 255, 0.3)');

  return (
    <>
      <mesh ref={leftWall} visible={DEBUG_SHOW_BOUNDARIES}>
        <boxGeometry args={[viewport.height + 4, 10, 0.2]} />
        <meshStandardMaterial map={redGridTexture} transparent opacity={0.8} />
      </mesh>
      <mesh ref={rightWall} visible={DEBUG_SHOW_BOUNDARIES}>
        <boxGeometry args={[viewport.height + 4, 10, 0.2]} />
        <meshStandardMaterial map={redGridTexture} transparent opacity={0.8} />
      </mesh>
      <mesh ref={topWall} visible={DEBUG_SHOW_BOUNDARIES}>
        <boxGeometry args={[viewport.width + 4, 10, 0.2]} />
        <meshStandardMaterial map={blueGridTexture} transparent opacity={0.8} />
      </mesh>
      <mesh ref={bottomWall} visible={DEBUG_SHOW_BOUNDARIES}>
        <boxGeometry args={[viewport.width + 4, 10, 0.2]} />
        <meshStandardMaterial map={blueGridTexture} transparent opacity={0.8} />
      </mesh>
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

// Debug flag to show/hide visual elements
const DEBUG_SHOW_BOUNDARIES = false;

// Main integrated dice canvas component  
export function IntegratedDiceCanvas() {
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [diceCount, setDiceCount] = useState(2);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [, setDragDelta] = useState<THREE.Vector3>(new THREE.Vector3());
  const [dragVelocity, setDragVelocity] = useState<THREE.Vector3>(new THREE.Vector3());
  const [draggedDicePosition, setDraggedDicePosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const [diceInSync, setDiceInSync] = useState(false);

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
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={20}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-radius={3}
          shadow-bias={-0.0001}
        />

        {/* Physics World */}
        <Physics gravity={[0, -19.64, 0]} defaultContactMaterial={{ friction: 0.4, restitution: 0.6 }}>
          <GridGround />
          <Boundaries />
          
          {/* Dice - positioned in center area */}
          {Array.from({ length: diceCount }, (_, i) => (
            <RealisticDice
              key={i}
              position={[i * 1.2 - (diceCount - 1) * 0.6, 2, 0]}
              onResult={(value) => handleDiceResult(value, i)}
              isDraggingAny={isDraggingAny}
              setIsDraggingAny={setIsDraggingAny}
              setDragDelta={setDragDelta}
              sharedDragVelocity={dragVelocity}
              setSharedDragVelocity={setDragVelocity}
              draggedDicePosition={draggedDicePosition}
              setDraggedDicePosition={setDraggedDicePosition}
              diceInSync={diceInSync}
              setDiceInSync={setDiceInSync}
              showDebug={DEBUG_SHOW_BOUNDARIES}
            />
          ))}
        </Physics>
      </Canvas>
    </>
  );
}
