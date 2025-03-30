import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useRocketGame, TrackSegment } from "@/lib/stores/useRocketGame";
import { TRACK, COLORS } from "@/lib/constants";
import * as THREE from "three";

// Track component renders the procedurally generated racing track
export default function Track({ collisionObjectsRef }: { collisionObjectsRef: React.RefObject<THREE.Object3D[]> }) {
  const { track } = useRocketGame();
  const trackGroupRef = useRef<THREE.Group>(null);
  const segmentRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const boundaryRefs = useRef<Map<number, THREE.Mesh[]>>(new Map());
  const checkpointRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  
  // Create the material for the track
  const trackMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: COLORS.TRACK_BASE,
      roughness: 0.8,
      metalness: 0.2,
    });
  }, []);
  
  // Create a material for the track lines
  const trackLineMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: COLORS.TRACK_LINES,
      roughness: 0.5,
      metalness: 0.1,
      emissive: COLORS.TRACK_LINES,
      emissiveIntensity: 0.2,
    });
  }, []);
  
  // Create checkpoint material
  const checkpointMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#00ff00",
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  }, []);
  
  // Generate track meshes when track segments change
  useEffect(() => {
    if (!trackGroupRef.current) return;
    
    // Clear existing track meshes
    segmentRefs.current.clear();
    boundaryRefs.current.clear();
    checkpointRefs.current.clear();
    
    // Clear track group
    while (trackGroupRef.current.children.length > 0) {
      trackGroupRef.current.remove(trackGroupRef.current.children[0]);
    }
    
    // Clear collision objects
    if (collisionObjectsRef.current) {
      collisionObjectsRef.current = collisionObjectsRef.current.filter(
        obj => obj.userData.type !== 'track_boundary' && obj.userData.type !== 'checkpoint'
      );
    }
    
    // Generate new track meshes
    track.forEach(segment => {
      createTrackSegment(segment);
    });
  }, [track, trackMaterial, trackLineMaterial, checkpointMaterial]);
  
  // Create a single track segment with its meshes
  const createTrackSegment = (segment: TrackSegment) => {
    if (!trackGroupRef.current || !collisionObjectsRef.current) return;
    
    // Calculate direction perpendicular to track direction
    const perpDirection = new THREE.Vector3(segment.direction.z, 0, -segment.direction.x).normalize();
    
    // Create points for the track segment shape
    const halfWidth = segment.width / 2;
    const leftStart = new THREE.Vector3().copy(segment.start).add(perpDirection.clone().multiplyScalar(halfWidth));
    const rightStart = new THREE.Vector3().copy(segment.start).add(perpDirection.clone().multiplyScalar(-halfWidth));
    const leftEnd = new THREE.Vector3().copy(segment.end).add(perpDirection.clone().multiplyScalar(halfWidth));
    const rightEnd = new THREE.Vector3().copy(segment.end).add(perpDirection.clone().multiplyScalar(-halfWidth));
    
    // Create track geometry
    const segmentShape = new THREE.Shape();
    segmentShape.moveTo(leftStart.x, leftStart.z);
    segmentShape.lineTo(rightStart.x, rightStart.z);
    segmentShape.lineTo(rightEnd.x, rightEnd.z);
    segmentShape.lineTo(leftEnd.x, leftEnd.z);
    segmentShape.closePath();
    
    const extrudeSettings = {
      steps: 1,
      depth: 0.2,
      bevelEnabled: false,
    };
    
    // Create the main track mesh
    const segmentGeometry = new THREE.ExtrudeGeometry(segmentShape, extrudeSettings);
    const segmentMesh = new THREE.Mesh(segmentGeometry, trackMaterial);
    
    // Adjust position and rotation
    segmentMesh.position.y = -0.1; // Slightly below 0 to avoid z-fighting
    segmentMesh.rotation.x = Math.PI / 2; // Rotate to lay flat
    
    // Add to track group
    trackGroupRef.current.add(segmentMesh);
    segmentRefs.current.set(segment.id, segmentMesh);
    
    // Create track boundaries (walls)
    const boundaries: THREE.Mesh[] = [];
    
    // Left boundary
    const leftWallGeometry = new THREE.BoxGeometry(1, TRACK.BORDER_HEIGHT, segment.start.distanceTo(segment.end));
    const leftWall = new THREE.Mesh(leftWallGeometry, trackLineMaterial);
    
    // Position the wall along the segment
    const leftWallPos = new THREE.Vector3().lerpVectors(leftStart, leftEnd, 0.5);
    leftWallPos.y = TRACK.BORDER_HEIGHT / 2;
    leftWall.position.copy(leftWallPos);
    
    // Rotate to align with segment direction
    const leftWallDirection = new THREE.Vector3().subVectors(leftEnd, leftStart).normalize();
    const leftWallQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      leftWallDirection
    );
    leftWall.quaternion.copy(leftWallQuaternion);
    
    // Add to group and track boundaries
    trackGroupRef.current.add(leftWall);
    boundaries.push(leftWall);
    
    // Set up collision detection
    leftWall.userData = {
      type: 'track_boundary',
      collidable: true,
      segmentId: segment.id
    };
    collisionObjectsRef.current.push(leftWall);
    
    // Right boundary
    const rightWallGeometry = new THREE.BoxGeometry(1, TRACK.BORDER_HEIGHT, segment.start.distanceTo(segment.end));
    const rightWall = new THREE.Mesh(rightWallGeometry, trackLineMaterial);
    
    // Position the wall along the segment
    const rightWallPos = new THREE.Vector3().lerpVectors(rightStart, rightEnd, 0.5);
    rightWallPos.y = TRACK.BORDER_HEIGHT / 2;
    rightWall.position.copy(rightWallPos);
    
    // Rotate to align with segment direction
    const rightWallDirection = new THREE.Vector3().subVectors(rightEnd, rightStart).normalize();
    const rightWallQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      rightWallDirection
    );
    rightWall.quaternion.copy(rightWallQuaternion);
    
    // Add to group and track boundaries
    trackGroupRef.current.add(rightWall);
    boundaries.push(rightWall);
    
    // Set up collision detection
    rightWall.userData = {
      type: 'track_boundary',
      collidable: true,
      segmentId: segment.id
    };
    collisionObjectsRef.current.push(rightWall);
    
    // Store boundaries
    boundaryRefs.current.set(segment.id, boundaries);
    
    // Add checkpoint if this is a checkpoint segment
    if (segment.isCheckpoint) {
      // Create a checkpoint gate
      const checkpointGeometry = new THREE.PlaneGeometry(segment.width, TRACK.BORDER_HEIGHT * 1.5);
      const checkpoint = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
      
      // Position at the end of the segment
      checkpoint.position.copy(segment.end);
      checkpoint.position.y = TRACK.BORDER_HEIGHT / 2;
      
      // Rotate to face perpendicular to segment direction
      const checkpointQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        segment.direction
      );
      checkpoint.quaternion.copy(checkpointQuaternion);
      
      // Add to group
      trackGroupRef.current.add(checkpoint);
      checkpointRefs.current.set(segment.id, checkpoint);
      
      // Set up collision detection
      checkpoint.userData = {
        type: 'checkpoint',
        collidable: true,
        checkpointId: segment.id
      };
      collisionObjectsRef.current.push(checkpoint);
    }
  };
  
  return <group ref={trackGroupRef} />;
}
