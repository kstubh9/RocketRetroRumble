import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useRocketGame } from "@/lib/stores/useRocketGame";
import { CAMERA, GamePhase } from "@/lib/constants";
import * as THREE from "three";

// Camera component that follows the rocket
export default function GameCamera() {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  const { rocket, cameraTarget, phase } = useRocketGame();
  
  // Save initial camera position for reset
  const initialCameraPosition = useRef(new THREE.Vector3(0, 10, 30));
  const initialCameraLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  // Set up camera on mount
  useEffect(() => {
    // Save initial position and target
    initialCameraPosition.current.copy(camera.position);
    
    // Set up camera properties
    camera.near = 0.1;
    camera.far = 1000;
    
    // Save camera reference
    cameraRef.current = camera;
    
    return () => {
      // Reset camera position on unmount
      camera.position.copy(initialCameraPosition.current);
      camera.lookAt(initialCameraLookAt.current);
    };
  }, [camera]);
  
  // Handle camera following logic
  useFrame(() => {
    if (phase !== GamePhase.PLAYING) {
      // When not playing, use a cinematic view of the track
      const time = Date.now() * 0.0001;
      const radius = 40;
      const height = 15;
      
      camera.position.x = Math.cos(time) * radius;
      camera.position.z = Math.sin(time) * radius;
      camera.position.y = height;
      
      camera.lookAt(0, 0, 0);
      return;
    }
    
    // Get direction from rocket rotation
    const direction = new THREE.Vector3(0, 0, -1).applyEuler(rocket.rotation);
    
    // Calculate desired camera position behind the rocket
    const targetCameraPosition = new THREE.Vector3().copy(rocket.position)
      .sub(direction.clone().multiplyScalar(CAMERA.FOLLOW_DISTANCE))
      .add(new THREE.Vector3(0, CAMERA.HEIGHT_OFFSET, 0));
    
    // Smoothly interpolate camera position
    camera.position.lerp(targetCameraPosition, CAMERA.SMOOTHING);
    
    // Look at a point ahead of the rocket in the direction of travel
    const lookAheadPoint = new THREE.Vector3().copy(rocket.position)
      .add(direction.clone().multiplyScalar(10));
    
    // Create a temporary vector for the camera target
    const tempTarget = new THREE.Vector3();
    
    // Smoothly interpolate look target
    if (cameraTarget) {
      tempTarget.copy(cameraTarget);
    } else {
      tempTarget.copy(lookAheadPoint);
    }
    
    camera.lookAt(tempTarget);
  });
  
  return null;
}
