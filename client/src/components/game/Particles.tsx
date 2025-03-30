import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleProps {
  position: [number, number, number];
  color: string;
  count: number;
  size: number;
  speed: number;
  spread: number;
  lifetime: number;
  active: boolean;
}

// Particle system for visual effects like engine trails
export default function Particles({
  position,
  color,
  count = 50,
  size = 0.5,
  speed = 1,
  spread = 0.5,
  lifetime = 1,
  active = true
}: ParticleProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<{
    positions: Float32Array;
    velocities: Float32Array;
    lifetimes: Float32Array;
    maxLifetimes: Float32Array;
  } | null>(null);
  
  // Initialize particles
  useEffect(() => {
    if (!particlesRef.current) return;
    
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const maxLifetimes = new Float32Array(count);
    
    // Initialize particles with random positions and velocities
    for (let i = 0; i < count; i++) {
      // Start at the emitter position with small random offset
      positions[i * 3] = position[0] + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = position[1] + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = position[2] + (Math.random() - 0.5) * spread;
      
      // Random velocity - mainly backward for rocket trail
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = Math.random() * speed; // Mainly backward
      
      // Random lifetime for each particle
      maxLifetimes[i] = lifetime * (0.5 + Math.random() * 0.5);
      lifetimes[i] = maxLifetimes[i] * Math.random(); // Start at different points in lifecycle
    }
    
    setParticles({ positions, velocities, lifetimes, maxLifetimes });
    
    // Update geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: size,
      transparent: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    
    // Apply to mesh
    particlesRef.current.geometry = geometry;
    particlesRef.current.material = material;
  }, [count, position, color, size, speed, spread, lifetime]);
  
  // Update particles
  useFrame((_, delta) => {
    if (!particlesRef.current || !particles || !active) return;
    
    const { positions, velocities, lifetimes, maxLifetimes } = particles;
    
    // Get current positions attribute
    const positionAttribute = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    
    // Update each particle
    for (let i = 0; i < count; i++) {
      // Update lifetime
      lifetimes[i] -= delta;
      
      // Reset particle if lifetime expired
      if (lifetimes[i] <= 0) {
        // Reset position to emitter
        positions[i * 3] = position[0] + (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = position[1] + (Math.random() - 0.5) * spread;
        positions[i * 3 + 2] = position[2] + (Math.random() - 0.5) * spread;
        
        // Reset velocity
        velocities[i * 3] = (Math.random() - 0.5) * speed;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
        velocities[i * 3 + 2] = Math.random() * speed;
        
        // Reset lifetime
        lifetimes[i] = maxLifetimes[i];
      } else {
        // Update position based on velocity
        positions[i * 3] += velocities[i * 3] * delta * speed;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * speed;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * speed;
        
        // Add some gravity effect
        velocities[i * 3 + 1] -= 0.05 * delta; // Gravity pull
      }
      
      // Apply to buffer
      positionAttribute.setXYZ(i, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    }
    
    // Update material opacity based on particle lifetime
    const material = particlesRef.current.material as THREE.PointsMaterial;
    
    // Mark attributes as needing update
    positionAttribute.needsUpdate = true;
  });
  
  return <points ref={particlesRef} />;
}
