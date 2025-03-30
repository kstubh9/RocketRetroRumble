import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Lights component for illuminating the scene
export default function Lights() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  // Animate lights
  useFrame((_, delta) => {
    if (directionalRef.current) {
      // Slowly move the directional light for dynamic shadows
      directionalRef.current.position.x = Math.sin(Date.now() / 10000) * 10;
    }
  });
  
  return (
    <>
      {/* Main directional light */}
      <directionalLight
        ref={directionalRef}
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Ambient light for overall illumination */}
      <ambientLight ref={ambientRef} intensity={0.4} />
      
      {/* Hemisphere light for better outdoor lighting */}
      <hemisphereLight 
        args={['#9eafcc', '#080820', 0.6]} 
        position={[0, 50, 0]} 
      />
      
      {/* Add some point lights for interest */}
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#5555ff" />
      <pointLight position={[10, 5, -10]} intensity={0.3} color="#ff5555" />
    </>
  );
}
