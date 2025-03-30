import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useRocketGame } from "@/lib/stores/useRocketGame";
import { GamePhase, COLORS } from "@/lib/constants";
import * as THREE from "three";
import Particles from "./Particles";

// Voxel rocket model made from cubes
export default function Rocket() {
  const rocketRef = useRef<THREE.Group>(null);
  const { phase, rocket, cameraTarget } = useRocketGame();
  const [engineIntensity, setEngineIntensity] = useState(0.5);
  
  // Update rocket position and rotation
  useFrame((_, delta) => {
    if (!rocketRef.current) return;
    
    // Sync position and rotation with game state
    rocketRef.current.position.copy(rocket.position);
    rocketRef.current.rotation.copy(rocket.rotation);
    
    // Update engine glow intensity based on speed
    setEngineIntensity(0.5 + Math.min(rocket.speed * 2, 1.5));
  });
  
  return (
    <group ref={rocketRef}>
      {/* Main rocket body */}
      <VoxelRocket />
      
      {/* Engine particles */}
      <Particles 
        position={[0, 0, 2]} // Behind the rocket
        color={rocket.isBoosting ? COLORS.BOOST_TRAIL : COLORS.NORMAL_TRAIL}
        count={rocket.isBoosting ? 100 : 40}
        size={0.5}
        speed={2}
        spread={0.5}
        lifetime={0.7}
        active={phase === GamePhase.PLAYING}
      />
      
      {/* Shield effect when active */}
      {rocket.isShielded && (
        <mesh>
          <sphereGeometry args={[3, 16, 16]} />
          <meshBasicMaterial 
            color="#00aaff" 
            transparent={true} 
            opacity={0.3} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Volumetric pixel rocket built from cubes
function VoxelRocket() {
  const mainBodyRef = useRef<THREE.Group>(null);
  const { rocket } = useRocketGame();
  
  // Pulse effect for engine
  useFrame((_, delta) => {
    if (!mainBodyRef.current) return;
    
    const engineGlowMaterial = mainBodyRef.current.children
      .find(child => child.name === "engineGlow")?.material as THREE.MeshBasicMaterial;
    
    if (engineGlowMaterial) {
      // Pulsate engine glow based on speed and boost
      const pulseSpeed = rocket.isBoosting ? 15 : 8;
      const baseIntensity = rocket.isBoosting ? 0.8 : 0.5;
      const pulseAmount = Math.sin(Date.now() / 100 * pulseSpeed) * 0.2 + baseIntensity;
      
      engineGlowMaterial.color.setRGB(
        1.0, 
        0.5 + pulseAmount * 0.5, 
        0.2 + pulseAmount * 0.3
      );
    }
  });
  
  return (
    <group ref={mainBodyRef}>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color={COLORS.ROCKET_PRIMARY} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 0, -2]}>
        <boxGeometry args={[1.5, 0.8, 1]} />
        <meshStandardMaterial color={COLORS.ROCKET_PRIMARY} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -2.5]}>
        <boxGeometry args={[1, 0.6, 1]} />
        <meshStandardMaterial color={COLORS.ROCKET_PRIMARY} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[0, 0.6, -1]}>
        <boxGeometry args={[1.2, 0.4, 1.5]} />
        <meshStandardMaterial color="#5599ff" metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[1, 0.3, 3]} />
        <meshStandardMaterial color={COLORS.ROCKET_SECONDARY} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[-1.2, 0, 0]}>
        <boxGeometry args={[1, 0.3, 3]} />
        <meshStandardMaterial color={COLORS.ROCKET_SECONDARY} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Wing tips */}
      <mesh position={[1.7, 0, 0.5]}>
        <boxGeometry args={[0.3, 0.5, 1.5]} />
        <meshStandardMaterial color={COLORS.ROCKET_PRIMARY} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[-1.7, 0, 0.5]}>
        <boxGeometry args={[0.3, 0.5, 1.5]} />
        <meshStandardMaterial color={COLORS.ROCKET_PRIMARY} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Tail fins */}
      <mesh position={[0.8, 0.5, 1.5]}>
        <boxGeometry args={[0.3, 1, 1]} />
        <meshStandardMaterial color={COLORS.ROCKET_SECONDARY} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[-0.8, 0.5, 1.5]}>
        <boxGeometry args={[0.3, 1, 1]} />
        <meshStandardMaterial color={COLORS.ROCKET_SECONDARY} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Engine */}
      <mesh position={[0, 0, 2]}>
        <cylinderGeometry args={[0.7, 0.9, 1, 16]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Engine glow */}
      <mesh position={[0, 0, 2.5]} name="engineGlow">
        <cylinderGeometry args={[0.6, 0.4, 0.5, 16]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
    </group>
  );
}
