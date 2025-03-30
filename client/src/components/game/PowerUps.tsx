import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRocketGame, PowerUp } from "@/lib/stores/useRocketGame";
import { POWERUP_TYPES, COLORS } from "@/lib/constants";
import * as THREE from "three";

// PowerUps component renders all power-ups in the game
export default function PowerUps({ collisionObjectsRef }: { collisionObjectsRef: React.RefObject<THREE.Object3D[]> }) {
  const { powerUps } = useRocketGame();
  const powerUpGroupRef = useRef<THREE.Group>(null);
  const powerUpRefs = useRef<Map<number, THREE.Object3D>>(new Map());
  
  // Create materials for different power-up types
  const materials = useMemo(() => ({
    [POWERUP_TYPES.BOOST]: new THREE.MeshStandardMaterial({
      color: COLORS.BOOST_POWERUP,
      roughness: 0.3,
      metalness: 0.7,
      emissive: COLORS.BOOST_POWERUP,
      emissiveIntensity: 0.5,
    }),
    [POWERUP_TYPES.SHIELD]: new THREE.MeshStandardMaterial({
      color: COLORS.SHIELD_POWERUP,
      roughness: 0.3,
      metalness: 0.7,
      emissive: COLORS.SHIELD_POWERUP,
      emissiveIntensity: 0.5,
    }),
  }), []);
  
  // Update power-ups when they change
  useEffect(() => {
    if (!powerUpGroupRef.current) return;
    
    // Clear old collision objects
    if (collisionObjectsRef.current) {
      collisionObjectsRef.current = collisionObjectsRef.current.filter(
        obj => obj.userData.type !== 'powerup'
      );
    }
    
    // Remove old power-ups that are no longer in the list
    const currentIds = new Set(powerUps.map(p => p.id));
    const oldIds = Array.from(powerUpRefs.current.keys());
    
    oldIds.forEach(id => {
      if (!currentIds.has(id)) {
        const powerUpMesh = powerUpRefs.current.get(id);
        if (powerUpMesh && powerUpGroupRef.current) {
          powerUpGroupRef.current.remove(powerUpMesh);
          powerUpRefs.current.delete(id);
        }
      }
    });
    
    // Add or update power-ups
    powerUps.forEach(powerUp => {
      // Skip if already exists
      if (powerUpRefs.current.has(powerUp.id)) {
        const existingPowerUp = powerUpRefs.current.get(powerUp.id);
        if (existingPowerUp) {
          // Update position if needed
          existingPowerUp.position.copy(powerUp.position);
          
          // Update active state
          existingPowerUp.userData.data.active = powerUp.active;
          existingPowerUp.visible = powerUp.active;
        }
        return;
      }
      
      // Create new power-up
      let powerUpMesh: THREE.Object3D;
      
      switch(powerUp.type) {
        case POWERUP_TYPES.BOOST:
          powerUpMesh = createBoostPowerUp(powerUp);
          break;
        case POWERUP_TYPES.SHIELD:
          powerUpMesh = createShieldPowerUp(powerUp);
          break;
        default:
          // Default to boost power-up
          powerUpMesh = createBoostPowerUp(powerUp);
      }
      
      // Set user data for collision detection
      powerUpMesh.userData = {
        type: 'powerup',
        collidable: true,
        powerUpType: powerUp.type,
        data: powerUp
      };
      
      // Add to refs and scene
      powerUpRefs.current.set(powerUp.id, powerUpMesh);
      powerUpGroupRef.current?.add(powerUpMesh);
      
      // Add to collision objects
      if (collisionObjectsRef.current) {
        collisionObjectsRef.current.push(powerUpMesh);
      }
    });
  }, [powerUps, materials]);
  
  // Create boost power-up
  const createBoostPowerUp = (powerUp: PowerUp): THREE.Group => {
    const group = new THREE.Group();
    
    // Main body - octahedron
    const bodyGeometry = new THREE.OctahedronGeometry(powerUp.size / 2);
    const bodyMesh = new THREE.Mesh(bodyGeometry, materials[POWERUP_TYPES.BOOST]);
    group.add(bodyMesh);
    
    // Add a glow effect
    const glowGeometry = new THREE.SphereGeometry(powerUp.size / 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.BOOST_POWERUP,
      transparent: true,
      opacity: 0.3,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glowMesh);
    
    // Position
    group.position.copy(powerUp.position);
    
    return group;
  };
  
  // Create shield power-up
  const createShieldPowerUp = (powerUp: PowerUp): THREE.Group => {
    const group = new THREE.Group();
    
    // Main body - icosahedron
    const bodyGeometry = new THREE.IcosahedronGeometry(powerUp.size / 2);
    const bodyMesh = new THREE.Mesh(bodyGeometry, materials[POWERUP_TYPES.SHIELD]);
    group.add(bodyMesh);
    
    // Add a shield-like outer ring
    const ringGeometry = new THREE.TorusGeometry(powerUp.size / 1.2, powerUp.size / 10, 16, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.SHIELD_POWERUP,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);
    
    // Position
    group.position.copy(powerUp.position);
    
    return group;
  };
  
  // Animate power-ups
  useFrame((_, delta) => {
    if (!powerUpGroupRef.current) return;
    
    // Animate each power-up
    powerUpRefs.current.forEach((powerUpMesh, id) => {
      if (!powerUpMesh.visible) return;
      
      // Rotate power-ups to make them more noticeable
      powerUpMesh.rotation.y += delta * 2;
      
      // Hover effect - move up and down slightly
      const hoverOffset = Math.sin(Date.now() / 500) * 0.3;
      powerUpMesh.position.y = powerUps.find(p => p.id === id)?.position.y! + hoverOffset;
      
      // Pulse the glow for boost power-ups
      if (powerUpMesh.userData.powerUpType === POWERUP_TYPES.BOOST) {
        const glowMesh = powerUpMesh.children[1];
        if (glowMesh) {
          const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
          glowMaterial.opacity = 0.2 + Math.sin(Date.now() / 300) * 0.2;
        }
      }
      
      // Rotate shield ring for shield power-ups
      if (powerUpMesh.userData.powerUpType === POWERUP_TYPES.SHIELD) {
        const ringMesh = powerUpMesh.children[1];
        if (ringMesh) {
          ringMesh.rotation.z += delta * 1.5;
        }
      }
    });
  });
  
  return <group ref={powerUpGroupRef} />;
}
