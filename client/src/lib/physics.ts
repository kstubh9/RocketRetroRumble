import * as THREE from "three";
import { ROCKET, PHYSICS } from "./constants";

// Apply physics forces to a moving object
export function applyPhysics(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  acceleration: THREE.Vector3,
  deltaTime: number
): void {
  // Apply acceleration to velocity
  velocity.add(acceleration.clone().multiplyScalar(deltaTime));
  
  // Apply velocity to position
  position.add(velocity.clone().multiplyScalar(deltaTime));
  
  // Apply gravity
  velocity.y -= PHYSICS.GRAVITY * deltaTime;
  
  // Apply drag
  velocity.multiplyScalar(1 - (0.01 * deltaTime));
}

// Calculate velocity required to hit a target
export function calculateInterceptVelocity(
  source: THREE.Vector3,
  target: THREE.Vector3,
  speed: number
): THREE.Vector3 {
  const direction = new THREE.Vector3().subVectors(target, source).normalize();
  return direction.multiplyScalar(speed);
}

// Check if two bounding boxes intersect
export function checkCollision(
  box1: THREE.Box3,
  box2: THREE.Box3
): boolean {
  return box1.intersectsBox(box2);
}

// Create a simple bounding box for an object
export function createBoundingBox(
  position: THREE.Vector3,
  size: THREE.Vector3
): THREE.Box3 {
  return new THREE.Box3().setFromCenterAndSize(position, size);
}

// Apply force in a direction
export function applyForce(
  velocity: THREE.Vector3,
  force: THREE.Vector3,
  mass: number = 1.0
): void {
  const acceleration = force.clone().divideScalar(mass);
  velocity.add(acceleration);
}

// Bounce off a surface with a bounce factor
export function bounce(
  velocity: THREE.Vector3,
  normal: THREE.Vector3,
  bounceFactor: number = 0.5
): void {
  // Reflect velocity based on the normal
  velocity.reflect(normal);
  
  // Apply bounce factor to reduce energy
  velocity.multiplyScalar(bounceFactor);
}

// Apply turbulence effect to velocity
export function applyTurbulence(
  velocity: THREE.Vector3,
  turbulenceStrength: number = 0.2,
  deltaTime: number
): void {
  // Apply random fluctuations
  velocity.x += (Math.random() - 0.5) * turbulenceStrength * deltaTime;
  velocity.y += (Math.random() - 0.5) * turbulenceStrength * deltaTime;
  velocity.z += (Math.random() - 0.5) * turbulenceStrength * deltaTime;
}

// Apply gravity anomaly force - pulls or pushes object
export function applyGravityAnomaly(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  anomalyPosition: THREE.Vector3,
  strength: number = 0.5,
  isPull: boolean = true,
  deltaTime: number
): void {
  // Vector from object to anomaly
  const forceDirection = new THREE.Vector3().subVectors(anomalyPosition, position);
  
  // Distance to anomaly
  const distance = forceDirection.length();
  
  // If too far, no effect
  if (distance > 20) return;
  
  // Normalize direction
  forceDirection.normalize();
  
  // Calculate force strength based on distance (inverse square law)
  const forceMagnitude = strength / Math.max(1, distance * distance) * deltaTime;
  
  // Apply force in correct direction
  if (!isPull) forceDirection.negate();
  
  // Add to velocity
  velocity.addScaledVector(forceDirection, forceMagnitude);
}
