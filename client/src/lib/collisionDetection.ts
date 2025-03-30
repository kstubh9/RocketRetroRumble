import * as THREE from "three";
import { TrackSegment, Hazard, PowerUp } from "./stores/useRocketGame";
import { TRACK } from "./constants";

// Check if rocket collides with a hazard
export function checkHazardCollision(
  rocketPosition: THREE.Vector3,
  rocketSize: THREE.Vector3,
  hazard: Hazard
): boolean {
  // Create bounding box for rocket
  const rocketBox = new THREE.Box3().setFromCenterAndSize(
    rocketPosition,
    rocketSize
  );
  
  // Create bounding box for hazard
  const hazardSize = new THREE.Vector3(
    hazard.size,
    hazard.size,
    hazard.size
  );
  const hazardBox = new THREE.Box3().setFromCenterAndSize(
    hazard.position,
    hazardSize
  );
  
  // Check if the boxes intersect
  return rocketBox.intersectsBox(hazardBox);
}

// Check if rocket collides with a power-up
export function checkPowerUpCollision(
  rocketPosition: THREE.Vector3,
  rocketSize: THREE.Vector3,
  powerUp: PowerUp
): boolean {
  // Skip inactive power-ups
  if (!powerUp.active) return false;
  
  // Create bounding box for rocket
  const rocketBox = new THREE.Box3().setFromCenterAndSize(
    rocketPosition,
    rocketSize
  );
  
  // Create bounding box for power-up
  const powerUpSize = new THREE.Vector3(
    powerUp.size,
    powerUp.size,
    powerUp.size
  );
  const powerUpBox = new THREE.Box3().setFromCenterAndSize(
    powerUp.position,
    powerUpSize
  );
  
  // Check if the boxes intersect
  return rocketBox.intersectsBox(powerUpBox);
}

// Check if rocket collides with track bounds
export function checkTrackBoundaryCollision(
  rocketPosition: THREE.Vector3,
  rocketSize: THREE.Vector3,
  trackSegments: TrackSegment[]
): boolean {
  // Find closest segment to the rocket
  let closestSegment: TrackSegment | null = null;
  let minDistance = Infinity;
  
  trackSegments.forEach(segment => {
    // Create a line representing the track segment
    const line = new THREE.Line3(segment.start, segment.end);
    
    // Get closest point on the line to the rocket
    const closestPoint = new THREE.Vector3();
    line.closestPointToPoint(rocketPosition, true, closestPoint);
    
    // Calculate distance to the closest point
    const distance = rocketPosition.distanceTo(closestPoint);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestSegment = segment;
    }
  });
  
  if (!closestSegment) return false;
  
  // Calculate half-width of the rocket for comparison
  const rocketHalfWidth = Math.max(rocketSize.x, rocketSize.z) / 2;
  
  // Check if the rocket is outside the track boundary
  // Adding a small buffer to prevent false positives
  return minDistance > (closestSegment.width / 2 - rocketHalfWidth - 0.2);
}

// Check if rocket passes through a checkpoint
export function checkCheckpointCollision(
  rocketPosition: THREE.Vector3,
  rocketPrevPosition: THREE.Vector3,
  segment: TrackSegment
): boolean {
  if (!segment.isCheckpoint) return false;
  
  // Create a plane at the end of the segment, perpendicular to direction
  const planeNormal = segment.direction.clone();
  const planeConstant = -planeNormal.dot(segment.end);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    segment.end
  );
  
  // Check if rocket moved from one side of the plane to the other
  const prevSide = plane.distanceToPoint(rocketPrevPosition) > 0;
  const currentSide = plane.distanceToPoint(rocketPosition) > 0;
  
  // If sides changed, the rocket crossed the plane
  if (prevSide !== currentSide) {
    // Also check if within track width bounds
    const offset = new THREE.Vector3().subVectors(rocketPosition, segment.end);
    offset.projectOnPlane(planeNormal);
    const distanceFromCenter = offset.length();
    
    return distanceFromCenter < segment.width / 2;
  }
  
  return false;
}

// Detect collisions and return results
export interface CollisionResult {
  trackBoundary: boolean;
  hazards: Hazard[];
  powerUps: PowerUp[];
  checkpoint: {
    collided: boolean;
    id: number;
  };
}

export function detectCollisions(
  rocketPosition: THREE.Vector3,
  rocketPrevPosition: THREE.Vector3,
  rocketSize: THREE.Vector3,
  trackSegments: TrackSegment[],
  hazards: Hazard[],
  powerUps: PowerUp[]
): CollisionResult {
  const result: CollisionResult = {
    trackBoundary: false,
    hazards: [],
    powerUps: [],
    checkpoint: {
      collided: false,
      id: -1
    }
  };
  
  // Check track boundary collision
  result.trackBoundary = checkTrackBoundaryCollision(
    rocketPosition,
    rocketSize,
    trackSegments
  );
  
  // Check hazard collisions
  hazards.forEach(hazard => {
    if (hazard.active && checkHazardCollision(rocketPosition, rocketSize, hazard)) {
      result.hazards.push(hazard);
    }
  });
  
  // Check power-up collisions
  powerUps.forEach(powerUp => {
    if (powerUp.active && checkPowerUpCollision(rocketPosition, rocketSize, powerUp)) {
      result.powerUps.push(powerUp);
    }
  });
  
  // Check checkpoint collisions
  trackSegments.forEach(segment => {
    if (segment.isCheckpoint && 
        checkCheckpointCollision(rocketPosition, rocketPrevPosition, segment)) {
      result.checkpoint = {
        collided: true,
        id: segment.id
      };
    }
  });
  
  return result;
}
