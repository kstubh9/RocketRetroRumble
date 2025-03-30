import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { Controls, GamePhase } from "@/lib/constants";
import { useRocketGame } from "@/lib/stores/useRocketGame";
import { startBackgroundMusic, stopBackgroundMusic, playHitSound, playSuccessSound } from "@/lib/soundManager";
import { detectCollisions } from "@/lib/collisionDetection";
import * as THREE from "three";

// Import game components
import Rocket from "./Rocket";
import Track from "./Track";
import Hazards from "./Hazards";
import PowerUps from "./PowerUps";
import GameCamera from "./Camera";
import Lights from "./Lights";

export default function Game() {
  const { camera } = useThree();
  const collisionObjects = useRef<THREE.Object3D[]>([]);
  
  // Get game state from store
  const { 
    phase, 
    rocket, 
    track, 
    hazards, 
    powerUps,
    updateRocket, 
    updateGameState,
    activatePowerUp,
    checkpointPassed,
    startGame,
    restartGame
  } = useRocketGame();
  
  // Get keyboard controls for game loop
  const [, getKeys] = useKeyboardControls<Controls>();
  
  // Track rocket's previous position for collision detection
  const prevPosition = useRef(new THREE.Vector3());
  
  // Setup collision objects collection
  useEffect(() => {
    collisionObjects.current = [];
    
    return () => {
      collisionObjects.current = [];
    };
  }, []);
  
  // Start background music when game starts
  useEffect(() => {
    if (phase === GamePhase.PLAYING) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
    
    return () => {
      stopBackgroundMusic();
    };
  }, [phase]);

  // Handle restart key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        restartGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restartGame]);
  
  // Game loop
  useFrame((_, deltaTime) => {
    // Clamp deltaTime to avoid large jumps
    const clampedDelta = Math.min(deltaTime, 0.1) * 1000;
    
    // Handle different game phases
    if (phase === GamePhase.PLAYING) {
      // Save previous position for collision detection
      prevPosition.current.copy(rocket.position);
      
      // Get current controls state
      const controls = getKeys();
      
      // Update rocket physics
      updateRocket(clampedDelta, controls, collisionObjects.current);
      
      // Update game state (time, track generation)
      updateGameState(clampedDelta);
      
      // Detect collisions
      const collisionResult = detectCollisions(
        rocket.position,
        prevPosition.current,
        new THREE.Vector3(2, 2, 4), // Rocket size
        track,
        hazards,
        powerUps
      );
      
      // Handle collision results
      if (collisionResult.trackBoundary) {
        // Rocket hit track boundary
        playHitSound();
      }
      
      // Handle hazard collisions
      collisionResult.hazards.forEach(hazard => {
        playHitSound();
      });
      
      // Handle power-up collisions
      collisionResult.powerUps.forEach(powerUp => {
        playSuccessSound();
        activatePowerUp(powerUp.type);
      });
      
      // Handle checkpoint collisions
      if (collisionResult.checkpoint.collided) {
        playSuccessSound();
        checkpointPassed(collisionResult.checkpoint.id);
      }
    }
  });
  
  return (
    <>
      <Lights />
      <GameCamera />
      <Rocket />
      <Track collisionObjectsRef={collisionObjects} />
      <Hazards collisionObjectsRef={collisionObjects} />
      <PowerUps collisionObjectsRef={collisionObjects} />
      
      {/* Skybox */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#050530" side={THREE.BackSide} />
      </mesh>
      
      {/* Stars */}
      <Stars />
    </>
  );
}

// Simple star field component
function Stars() {
  const starsRef = useRef<THREE.Points>(null);
  
  useEffect(() => {
    if (!starsRef.current) return;
    
    // Create stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });
    
    // Generate random star positions
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2000;
      positions[i + 1] = (Math.random() - 0.5) * 2000;
      positions[i + 2] = (Math.random() - 0.5) * 2000;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Apply to mesh
    starsRef.current.geometry = starsGeometry;
    starsRef.current.material = starsMaterial;
  }, []);
  
  // Slowly rotate stars
  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.01;
    }
  });
  
  return <points ref={starsRef} />;
}
