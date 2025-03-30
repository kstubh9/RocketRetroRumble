import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRocketGame, Hazard } from "@/lib/stores/useRocketGame";
import { HAZARD_TYPES, COLORS } from "@/lib/constants";
import * as THREE from "three";

// Hazards component renders all hazards in the game
export default function Hazards({ collisionObjectsRef }: { collisionObjectsRef: React.RefObject<THREE.Object3D[]> }) {
  const { hazards } = useRocketGame();
  const hazardGroupRef = useRef<THREE.Group>(null);
  const hazardRefs = useRef<Map<number, THREE.Object3D>>(new Map());
  
  // Create materials for different hazard types
  const materials = useMemo(() => ({
    [HAZARD_TYPES.ASTEROID]: new THREE.MeshStandardMaterial({
      color: COLORS.ASTEROID,
      roughness: 0.7,
      metalness: 0.1,
    }),
    [HAZARD_TYPES.TURBULENCE]: new THREE.MeshStandardMaterial({
      color: COLORS.TURBULENCE,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.7,
    }),
    [HAZARD_TYPES.GRAVITY_ANOMALY]: new THREE.MeshStandardMaterial({
      color: COLORS.GRAVITY_ANOMALY,
      roughness: 0.5,
      metalness: 0.7,
      emissive: COLORS.GRAVITY_ANOMALY,
      emissiveIntensity: 0.3,
    }),
  }), []);
  
  // Update hazards when they change
  useEffect(() => {
    if (!hazardGroupRef.current) return;
    
    // Clear old collision objects
    if (collisionObjectsRef.current) {
      collisionObjectsRef.current = collisionObjectsRef.current.filter(
        obj => obj.userData.type !== 'hazard'
      );
    }
    
    // Remove old hazards that are no longer in the list
    const currentIds = new Set(hazards.map(h => h.id));
    const oldIds = Array.from(hazardRefs.current.keys());
    
    oldIds.forEach(id => {
      if (!currentIds.has(id)) {
        const hazardMesh = hazardRefs.current.get(id);
        if (hazardMesh && hazardGroupRef.current) {
          hazardGroupRef.current.remove(hazardMesh);
          hazardRefs.current.delete(id);
        }
      }
    });
    
    // Add or update hazards
    hazards.forEach(hazard => {
      // Skip creating if already exists
      if (hazardRefs.current.has(hazard.id)) {
        const existingHazard = hazardRefs.current.get(hazard.id);
        if (existingHazard) {
          // Update position if needed
          existingHazard.position.copy(hazard.position);
          
          // Update active state
          existingHazard.userData.data.active = hazard.active;
          existingHazard.visible = hazard.active;
        }
        return;
      }
      
      // Create new hazard
      let hazardMesh: THREE.Object3D;
      
      switch(hazard.type) {
        case HAZARD_TYPES.ASTEROID:
          hazardMesh = createAsteroid(hazard);
          break;
        case HAZARD_TYPES.TURBULENCE:
          hazardMesh = createTurbulence(hazard);
          break;
        case HAZARD_TYPES.GRAVITY_ANOMALY:
          hazardMesh = createGravityAnomaly(hazard);
          break;
        default:
          // Default to asteroid
          hazardMesh = createAsteroid(hazard);
      }
      
      // Set user data for collision detection
      hazardMesh.userData = {
        type: 'hazard',
        collidable: true,
        hazardType: hazard.type,
        data: hazard
      };
      
      // Add to refs and scene
      hazardRefs.current.set(hazard.id, hazardMesh);
      hazardGroupRef.current?.add(hazardMesh);
      
      // Add to collision objects
      if (collisionObjectsRef.current) {
        collisionObjectsRef.current.push(hazardMesh);
      }
    });
  }, [hazards, materials]);
  
  // Create asteroid hazard
  const createAsteroid = (hazard: Hazard): THREE.Mesh => {
    // Use an irregular geometry for asteroids
    const geometry = new THREE.DodecahedronGeometry(hazard.size / 2, 1);
    
    // Add some noise to vertices for more irregular shape
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Add random noise to each vertex
      vertex.x += (Math.random() - 0.5) * 0.5;
      vertex.y += (Math.random() - 0.5) * 0.5;
      vertex.z += (Math.random() - 0.5) * 0.5;
      
      // Write back
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    
    const mesh = new THREE.Mesh(geometry, materials[HAZARD_TYPES.ASTEROID]);
    mesh.position.copy(hazard.position);
    
    // Add random rotation
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    return mesh;
  };
  
  // Create turbulence hazard
  const createTurbulence = (hazard: Hazard): THREE.Mesh => {
    // Use a toroidal shape for turbulence zones
    const geometry = new THREE.TorusGeometry(hazard.size / 1.5, hazard.size / 4, 16, 24);
    const mesh = new THREE.Mesh(geometry, materials[HAZARD_TYPES.TURBULENCE]);
    mesh.position.copy(hazard.position);
    
    return mesh;
  };
  
  // Create gravity anomaly hazard
  const createGravityAnomaly = (hazard: Hazard): THREE.Mesh => {
    // Use a sphere for gravity anomaly
    const geometry = new THREE.SphereGeometry(hazard.size / 2, 32, 32);
    const mesh = new THREE.Mesh(geometry, materials[HAZARD_TYPES.GRAVITY_ANOMALY]);
    mesh.position.copy(hazard.position);
    
    return mesh;
  };
  
  // Animate hazards
  useFrame((_, delta) => {
    if (!hazardGroupRef.current) return;
    
    // Animate each hazard based on type
    hazardRefs.current.forEach((hazardMesh, id) => {
      if (!hazardMesh.visible) return;
      
      const hazardType = hazardMesh.userData.hazardType;
      
      switch(hazardType) {
        case HAZARD_TYPES.ASTEROID:
          // Rotate asteroids slowly
          hazardMesh.rotation.x += delta * 0.2;
          hazardMesh.rotation.y += delta * 0.3;
          break;
        
        case HAZARD_TYPES.TURBULENCE:
          // Rotate and pulse turbulence
          hazardMesh.rotation.z += delta * 0.5;
          
          // Pulse opacity
          const turbMaterial = hazardMesh.material as THREE.MeshStandardMaterial;
          turbMaterial.opacity = 0.4 + Math.sin(Date.now() / 500) * 0.3;
          break;
        
        case HAZARD_TYPES.GRAVITY_ANOMALY:
          // Pulse the gravity anomaly
          const gravMaterial = hazardMesh.material as THREE.MeshStandardMaterial;
          gravMaterial.emissiveIntensity = 0.3 + Math.sin(Date.now() / 300) * 0.2;
          
          // Rotate around y-axis
          hazardMesh.rotation.y += delta;
          break;
      }
    });
  });
  
  return <group ref={hazardGroupRef} />;
}
