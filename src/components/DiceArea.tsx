"use client";

import { Canvas } from "@react-three/fiber";
import { Dice } from "./Dice";

export function DiceArea() {
  return (
    <div className="w-40 h-32">
      <Canvas
        camera={{ position: [0, 8, 0], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[0, 10, 0]} intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.3} />
        
        <Dice position={[-1.3, 0, -0.5]} initialRotation={[0, 1.2, 0]} />
        <Dice position={[1.1, 0, 0.6]} initialRotation={[0, -0.8, 0]} />
      </Canvas>
    </div>
  );
}