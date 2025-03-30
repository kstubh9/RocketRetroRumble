import * as THREE from "three";
import { TRACK, HAZARD_TYPES, POWERUP_TYPES } from "./constants";
import { TrackSegment, Hazard, PowerUp } from "./stores/useRocketGame";

// Generate a series of track segments
export function generateTrackSegments(
  startPoint: THREE.Vector3,
  initialDirection: THREE.Vector3,
  numSegments: number
): TrackSegment[] {
  const segments: TrackSegment[] = [];
  
  let currentPoint = startPoint.clone();
  let currentDirection = initialDirection.clone();
  
  for (let i = 0; i < numSegments; i++) {
    // Apply some random curvature and pitch for variety
    // First two segments are straight for easier start
    const curvature = i < 2 ? 0 : (Math.random() - 0.5) * TRACK.CURVATURE_MAX;
    const pitch = i < 2 ? 0 : (Math.random() - 0.5) * TRACK.PITCH_MAX;
    
    // Apply rotation to direction
    const rotationY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), 
      curvature
    );
    
    const rotationX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0), 
      pitch
    );
    
    currentDirection.applyQuaternion(rotationY);
    currentDirection.applyQuaternion(rotationX);
    currentDirection.normalize();
    
    // Calculate next point
    const nextPoint = currentPoint.clone().add(
      currentDirection.clone().multiplyScalar(TRACK.SEGMENT_LENGTH)
    );
    
    // Create segment
    segments.push({
      start: currentPoint.clone(),
      end: nextPoint.clone(),
      direction: currentDirection.clone(),
      width: TRACK.WIDTH,
      curvature,
      pitch,
      isCheckpoint: i % TRACK.CHECKPOINT_INTERVAL === 0,
      id: i
    });
    
    // Update for next segment
    currentPoint = nextPoint;
  }
  
  return segments;
}

// Generate hazards for a track segment
export function generateHazardsForSegment(
  segment: TrackSegment,
  density: number = 0.7 // 0-1, chance of generating a hazard
): Hazard[] {
  const hazards: Hazard[] = [];
  
  // Skip hazards for first few segments to give player a chance
  if (segment.id < 2) return hazards;
  
  // Decide whether to place hazards
  if (Math.random() > density) return hazards;
  
  // Number of hazards to place (1-3)
  const numHazards = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numHazards; i++) {
    // Random position along segment (avoid very start/end)
    const t = Math.random() * 0.8 + 0.1; // 10-90% along segment
    const position = new THREE.Vector3().lerpVectors(
      segment.start, 
      segment.end, 
      t
    );
    
    // Random offset from track center line
    const offsetDir = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize();
    
    const offsetDistance = Math.random() * (segment.width * 0.4);
    position.add(offsetDir.multiplyScalar(offsetDistance));
    
    // Add some height variation
    position.y += Math.random() * 2 - 1;
    
    // Random hazard type
    const hazardTypes = Object.values(HAZARD_TYPES);
    const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    
    // Create the hazard
    hazards.push({
      type: hazardType,
      position,
      size: 3 + Math.random() * 2,
      id: segment.id * 100 + i,
      active: true
    });
  }
  
  return hazards;
}

// Generate power-ups for a track segment
export function generatePowerUpsForSegment(
  segment: TrackSegment,
  density: number = 0.3 // 0-1, chance of generating power-ups
): PowerUp[] {
  const powerUps: PowerUp[] = [];
  
  // Skip power-ups for first segment
  if (segment.id < 1) return powerUps;
  
  // Decide whether to place power-ups
  if (Math.random() > density) return powerUps;
  
  // Number of power-ups to place (1-2)
  const numPowerUps = Math.floor(Math.random() * 2) + 1;
  
  for (let i = 0; i < numPowerUps; i++) {
    // Random position along segment (avoid very start/end)
    const t = Math.random() * 0.7 + 0.15; // 15-85% along segment
    const position = new THREE.Vector3().lerpVectors(
      segment.start, 
      segment.end, 
      t
    );
    
    // Random offset from track center line
    const offsetDir = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize();
    
    const offsetDistance = Math.random() * (segment.width * 0.3);
    position.add(offsetDir.multiplyScalar(offsetDistance));
    
    // Raise power-ups above track level
    position.y += 3 + Math.random();
    
    // Random power-up type
    const powerUpTypes = Object.values(POWERUP_TYPES);
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    // Create the power-up
    powerUps.push({
      type: powerUpType,
      position,
      size: 2,
      id: segment.id * 100 + i + 50, // Offset IDs to avoid overlap with hazards
      active: true
    });
  }
  
  return powerUps;
}

// Get a point on the track at a specific distance
export function getPointOnTrack(
  segments: TrackSegment[],
  distance: number
): { position: THREE.Vector3, direction: THREE.Vector3, segmentIndex: number } {
  if (segments.length === 0) {
    return {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      segmentIndex: -1
    };
  }
  
  let remainingDistance = distance;
  let currentSegmentIndex = 0;
  
  // Find which segment contains the point
  while (currentSegmentIndex < segments.length) {
    const segment = segments[currentSegmentIndex];
    const segmentLength = segment.start.distanceTo(segment.end);
    
    if (remainingDistance <= segmentLength) {
      // Found segment, calculate position
      const t = remainingDistance / segmentLength;
      const position = new THREE.Vector3().lerpVectors(
        segment.start, 
        segment.end,
        t
      );
      
      return {
        position,
        direction: segment.direction.clone(),
        segmentIndex: currentSegmentIndex
      };
    }
    
    // Move to next segment
    remainingDistance -= segmentLength;
    currentSegmentIndex++;
  }
  
  // If beyond all segments, return the end of the last segment
  const lastSegment = segments[segments.length - 1];
  return {
    position: lastSegment.end.clone(),
    direction: lastSegment.direction.clone(),
    segmentIndex: segments.length - 1
  };
}

// Get closest point on track to a given position
export function getClosestPointOnTrack(
  segments: TrackSegment[],
  position: THREE.Vector3
): { point: THREE.Vector3, distance: number, segmentIndex: number } {
  let closestPoint = new THREE.Vector3();
  let closestDistance = Infinity;
  let closestSegmentIndex = -1;
  
  segments.forEach((segment, index) => {
    // Create line representing segment
    const line = new THREE.Line3(segment.start, segment.end);
    
    // Find closest point on the line
    const point = new THREE.Vector3();
    line.closestPointToPoint(position, true, point);
    
    // Calculate distance
    const distance = position.distanceTo(point);
    
    // Update if this is the closest point found
    if (distance < closestDistance) {
      closestPoint = point;
      closestDistance = distance;
      closestSegmentIndex = index;
    }
  });
  
  return {
    point: closestPoint,
    distance: closestDistance,
    segmentIndex: closestSegmentIndex
  };
}

// Check if position is within the track bounds
export function isWithinTrackBounds(
  position: THREE.Vector3,
  segments: TrackSegment[],
  bufferPercentage: number = 0.9 // How much of track width to use (0.9 = 90%)
): boolean {
  // Find closest point on track
  const { point, distance, segmentIndex } = getClosestPointOnTrack(segments, position);
  
  if (segmentIndex < 0) return false;
  
  // Get width of track at this segment
  const trackWidth = segments[segmentIndex].width * bufferPercentage / 2;
  
  // Check if within track width
  return distance <= trackWidth;
}
