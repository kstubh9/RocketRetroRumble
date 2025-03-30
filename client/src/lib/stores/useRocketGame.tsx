import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { GamePhase, ROCKET, TRACK } from "../constants";
import * as THREE from "three";

interface RocketState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  speed: number;
  health: number;
  isShielded: boolean;
  isBoosting: boolean;
  boostCooldown: boolean;
  boostTimeRemaining: number;
  shieldTimeRemaining: number;
}

export type TrackSegment = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  width: number;
  curvature: number;
  pitch: number;
  isCheckpoint: boolean;
  id: number;
};

export type Hazard = {
  type: string;
  position: THREE.Vector3;
  size: number;
  id: number;
  active: boolean;
};

export type PowerUp = {
  type: string;
  position: THREE.Vector3;
  size: number;
  id: number;
  active: boolean;
};

interface GameState {
  phase: GamePhase;
  time: number;
  score: number;
  lap: number;
  lapTimes: number[];
  bestLapTime: number | null;
  lastCheckpointId: number;
  
  rocket: RocketState;
  track: TrackSegment[];
  hazards: Hazard[];
  powerUps: PowerUp[];
  
  // Camera state
  cameraTarget: THREE.Vector3;
  
  // Actions
  startGame: () => void;
  restartGame: () => void;
  endGame: (won: boolean) => void;
  updateRocket: (
    deltaTime: number, 
    controls: { [key: string]: boolean },
    collisionObjects: THREE.Object3D[]
  ) => void;
  activatePowerUp: (type: string) => void;
  updateGameState: (deltaTime: number) => void;
  generateNewTrackSegment: () => void;
  removeOldTrackSegment: () => void;
  checkpointPassed: (checkpointId: number) => void;
  updateTime: (deltaTime: number) => void;
  
  // Track generation
  initializeTrack: () => void;
  
  // Status getters
  getBoostStatus: () => { cooldown: boolean, remaining: number };
  getShieldStatus: () => { active: boolean, remaining: number };
}

export const useRocketGame = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial game state
    phase: GamePhase.READY,
    time: 0,
    score: 0,
    lap: 1,
    lapTimes: [],
    bestLapTime: null,
    lastCheckpointId: 0,
    
    // Initial rocket state
    rocket: {
      position: new THREE.Vector3(0, 2, 0),
      rotation: new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 0,
      health: 100,
      isShielded: false,
      isBoosting: false,
      boostCooldown: false,
      boostTimeRemaining: 0,
      shieldTimeRemaining: 0,
    },
    
    // Track, hazards, power-ups
    track: [],
    hazards: [],
    powerUps: [],
    
    // Camera
    cameraTarget: new THREE.Vector3(0, 0, 0),
    
    // Start game action
    startGame: () => {
      set((state) => {
        if (state.phase === GamePhase.READY) {
          // Initialize track when game starts
          state.initializeTrack();
          return { 
            phase: GamePhase.PLAYING,
            time: 0,
            score: 0,
            lap: 1,
            lapTimes: [],
            rocket: {
              ...state.rocket,
              position: new THREE.Vector3(0, 2, 0),
              rotation: new THREE.Euler(0, 0, 0),
              velocity: new THREE.Vector3(0, 0, 0),
              speed: 0,
              health: 100,
              isShielded: false,
              isBoosting: false,
              boostCooldown: false,
              boostTimeRemaining: 0,
              shieldTimeRemaining: 0,
            }
          };
        }
        return {};
      });
    },
    
    // Restart game action
    restartGame: () => {
      set((state) => {
        // Re-initialize track for restart
        state.initializeTrack();
        return { 
          phase: GamePhase.READY,
          time: 0,
          score: 0,
          lap: 1,
          lapTimes: [],
          rocket: {
            ...state.rocket,
            position: new THREE.Vector3(0, 2, 0),
            rotation: new THREE.Euler(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            speed: 0,
            health: 100,
            isShielded: false,
            isBoosting: false,
            boostCooldown: false,
            boostTimeRemaining: 0,
            shieldTimeRemaining: 0,
          }
        };
      });
    },
    
    // End game action
    endGame: (won) => {
      set((state) => {
        const newPhase = won ? GamePhase.FINISHED : GamePhase.GAME_OVER;
        return { phase: newPhase };
      });
    },
    
    // Update rocket physics based on controls and time
    updateRocket: (deltaTime, controls, collisionObjects) => {
      set((state) => {
        const rocket = {...state.rocket};
        
        // Handle boosting
        if (rocket.isBoosting) {
          rocket.boostTimeRemaining -= deltaTime;
          if (rocket.boostTimeRemaining <= 0) {
            rocket.isBoosting = false;
            rocket.boostCooldown = true;
            
            // Set cooldown timer
            setTimeout(() => {
              set((state) => {
                return {
                  rocket: {
                    ...state.rocket,
                    boostCooldown: false
                  }
                };
              });
            }, ROCKET.BOOST_COOLDOWN);
          }
        }
        
        // Handle shield
        if (rocket.isShielded) {
          rocket.shieldTimeRemaining -= deltaTime;
          if (rocket.shieldTimeRemaining <= 0) {
            rocket.isShielded = false;
          }
        }

        // Apply controls to rocket
        let acceleration = 0;
        if (controls[Controls.forward]) {
          acceleration = ROCKET.ACCELERATION;
        } else if (controls[Controls.backward]) {
          acceleration = -ROCKET.ACCELERATION;
        }
        
        if (controls[Controls.boost] && !rocket.boostCooldown && !rocket.isBoosting) {
          rocket.isBoosting = true;
          rocket.boostTimeRemaining = ROCKET.BOOST_DURATION;
        }
        
        // Apply rotation based on controls
        const rotationY = new THREE.Quaternion();
        if (controls[Controls.leftward]) {
          rotationY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ROCKET.ROTATION_SPEED);
        } else if (controls[Controls.rightward]) {
          rotationY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ROCKET.ROTATION_SPEED);
        }
        
        // Apply pitch based on controls
        const rotationX = new THREE.Quaternion();
        if (controls[Controls.pitchUp]) {
          rotationX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ROCKET.PITCH_SPEED);
        } else if (controls[Controls.pitchDown]) {
          rotationX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), ROCKET.PITCH_SPEED);
        }
        
        // Apply rotations to current rotation
        const currentRotation = new THREE.Quaternion().setFromEuler(rocket.rotation);
        currentRotation.multiply(rotationY).multiply(rotationX);
        rocket.rotation = new THREE.Euler().setFromQuaternion(currentRotation);
        
        // Get direction from rotation
        const direction = new THREE.Vector3(0, 0, -1).applyEuler(rocket.rotation);
        
        // Apply acceleration in direction of rocket
        let speedMultiplier = rocket.isBoosting ? ROCKET.BOOST_MULTIPLIER : 1;
        rocket.velocity.addScaledVector(direction, acceleration * speedMultiplier);
        
        // Apply drag
        rocket.velocity.multiplyScalar(ROCKET.DRAG);
        
        // Clamp velocity to max speed
        let maxSpeed = ROCKET.MAX_SPEED * (rocket.isBoosting ? ROCKET.BOOST_MULTIPLIER : 1);
        if (rocket.velocity.length() > maxSpeed) {
          rocket.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Update position based on velocity
        rocket.position.add(rocket.velocity);
        
        // Update current speed
        rocket.speed = rocket.velocity.length();
        
        // Basic collision detection with objects (track boundaries, hazards, etc.)
        let hasCollided = false;
        if (collisionObjects && collisionObjects.length > 0) {
          const rocketBox = new THREE.Box3().setFromCenterAndSize(
            rocket.position,
            new THREE.Vector3(2, 2, 4) // Approximate rocket size
          );
          
          for (const obj of collisionObjects) {
            if (!obj.userData.collidable) continue;
            
            // Get bounding box of collision object
            const objBox = new THREE.Box3().setFromObject(obj);
            
            // Check for collision
            if (rocketBox.intersectsBox(objBox)) {
              hasCollided = true;
              
              // Handle different types of collisions based on object type
              if (obj.userData.type === 'hazard') {
                // Take damage if not shielded
                if (!rocket.isShielded) {
                  rocket.health -= ROCKET.COLLISION_DAMAGE;
                  // End game if health depleted
                  if (rocket.health <= 0) {
                    setTimeout(() => get().endGame(false), 100);
                  }
                }
              } else if (obj.userData.type === 'powerup') {
                const powerUp = obj.userData.data as PowerUp;
                if (powerUp.active) {
                  get().activatePowerUp(powerUp.type);
                  // Deactivate power-up to prevent multiple activations
                  obj.userData.data.active = false;
                  
                  // Update power-ups array
                  const updatedPowerUps = [...state.powerUps];
                  const index = updatedPowerUps.findIndex(p => p.id === powerUp.id);
                  if (index !== -1) {
                    updatedPowerUps[index].active = false;
                  }
                  
                  return {
                    ...state,
                    rocket,
                    powerUps: updatedPowerUps
                  };
                }
              } else if (obj.userData.type === 'checkpoint') {
                const checkpointId = obj.userData.checkpointId;
                get().checkpointPassed(checkpointId);
              } else if (obj.userData.type === 'track_boundary') {
                // Bounce off track boundaries
                if (!rocket.isShielded) {
                  // Reduce velocity and apply rebound
                  rocket.velocity.multiplyScalar(-0.5);
                  // Take small damage
                  rocket.health -= 5;
                  // End game if health depleted
                  if (rocket.health <= 0) {
                    setTimeout(() => get().endGame(false), 100);
                  }
                }
              }
            }
          }
        }
        
        // Update camera target
        const lookAhead = new THREE.Vector3().copy(direction).multiplyScalar(10);
        const cameraTarget = new THREE.Vector3().copy(rocket.position).add(lookAhead);
        
        return {
          rocket,
          cameraTarget
        };
      });
    },
    
    // Activate power-up effect
    activatePowerUp: (type) => {
      set((state) => {
        const rocket = {...state.rocket};
        
        if (type === 'boost') {
          rocket.isBoosting = true;
          rocket.boostTimeRemaining = ROCKET.BOOST_DURATION;
        } else if (type === 'shield') {
          rocket.isShielded = true;
          rocket.shieldTimeRemaining = 5000; // 5 seconds shield
        }
        
        return { rocket };
      });
    },
    
    // Update overall game state
    updateGameState: (deltaTime) => {
      if (get().phase !== GamePhase.PLAYING) return;
      
      const currentPosition = get().rocket.position;
      
      // Check if we need to generate new track segments
      const lastSegment = get().track[get().track.length - 1];
      if (lastSegment) {
        const distanceToEnd = currentPosition.distanceTo(lastSegment.end);
        if (distanceToEnd < TRACK.SEGMENT_LENGTH * 2) {
          get().generateNewTrackSegment();
        }
      }
      
      // Remove old track segments
      const firstSegment = get().track[0];
      if (firstSegment) {
        const distanceToStart = currentPosition.distanceTo(firstSegment.start);
        if (distanceToStart > TRACK.SEGMENT_LENGTH * 3) {
          get().removeOldTrackSegment();
        }
      }
      
      // Update game time
      get().updateTime(deltaTime);
    },
    
    // Update game time
    updateTime: (deltaTime) => {
      set((state) => {
        return { time: state.time + deltaTime };
      });
    },
    
    // Track checkpoint passed
    checkpointPassed: (checkpointId) => {
      set((state) => {
        // Only process if this is a new checkpoint
        if (checkpointId <= state.lastCheckpointId) return {};
        
        // Give points for passing checkpoint
        const newScore = state.score + 100;
        
        // Check if completed a lap
        let newLap = state.lap;
        let newLapTimes = [...state.lapTimes];
        let newBestLapTime = state.bestLapTime;
        
        if (checkpointId % (TRACK.CHECKPOINT_INTERVAL * 4) === 0 && checkpointId > 0) {
          // Completed a lap
          newLap++;
          
          // Record lap time
          const lapTime = state.time;
          newLapTimes.push(lapTime);
          
          // Check if this is a new best lap
          if (newBestLapTime === null || lapTime < newBestLapTime) {
            newBestLapTime = lapTime;
          }
          
          // Reset time for next lap
          return {
            lap: newLap,
            lapTimes: newLapTimes,
            bestLapTime: newBestLapTime,
            score: newScore + 500, // Bonus for completing lap
            lastCheckpointId: checkpointId,
            time: 0, // Reset time for new lap
          };
        }
        
        return {
          score: newScore,
          lastCheckpointId: checkpointId
        };
      });
    },
    
    // Initialize track with first segments
    initializeTrack: () => {
      set(() => {
        const initialTrack: TrackSegment[] = [];
        const initialHazards: Hazard[] = [];
        const initialPowerUps: PowerUp[] = [];
        
        // Create straight initial track segment
        const startSegment: TrackSegment = {
          start: new THREE.Vector3(0, 0, 0),
          end: new THREE.Vector3(0, 0, -TRACK.SEGMENT_LENGTH),
          direction: new THREE.Vector3(0, 0, -1),
          width: TRACK.WIDTH,
          curvature: 0,
          pitch: 0,
          isCheckpoint: true,
          id: 0
        };
        
        initialTrack.push(startSegment);
        
        // Generate more initial segments
        let lastSegment = startSegment;
        for (let i = 1; i < 6; i++) {
          const newDirection = new THREE.Vector3().copy(lastSegment.direction);
          
          // Apply some curvature for non-first segments
          const curvature = i > 2 ? (Math.random() - 0.5) * TRACK.CURVATURE_MAX : 0;
          const pitch = i > 2 ? (Math.random() - 0.5) * TRACK.PITCH_MAX : 0;
          
          // Apply rotation based on curvature
          const rotationY = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            curvature
          );
          
          // Apply pitch rotation
          const rotationX = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            pitch
          );
          
          newDirection.applyQuaternion(rotationY);
          newDirection.applyQuaternion(rotationX);
          newDirection.normalize();
          
          // Calculate new end point
          const newEnd = new THREE.Vector3().copy(lastSegment.end)
            .add(newDirection.clone().multiplyScalar(TRACK.SEGMENT_LENGTH));
          
          // Create new segment
          const newSegment: TrackSegment = {
            start: lastSegment.end.clone(),
            end: newEnd,
            direction: newDirection,
            width: TRACK.WIDTH,
            curvature,
            pitch,
            isCheckpoint: i % TRACK.CHECKPOINT_INTERVAL === 0,
            id: i
          };
          
          initialTrack.push(newSegment);
          
          // Add hazards for non-starting segments
          if (i > 2 && Math.random() < 0.7) {
            // Random position within segment
            const t = Math.random() * 0.8 + 0.1; // 10-90% along segment
            const hazardPos = new THREE.Vector3().lerpVectors(
              newSegment.start, 
              newSegment.end, 
              t
            );
            
            // Random offset from center of track
            const offsetDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            const offset = offsetDir.multiplyScalar(Math.random() * (TRACK.WIDTH * 0.4));
            hazardPos.add(offset);
            
            // Random hazard type
            const hazardTypes = Object.values(HAZARD_TYPES);
            const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
            
            initialHazards.push({
              type: hazardType,
              position: hazardPos,
              size: 3 + Math.random() * 2,
              id: i * 100 + initialHazards.length,
              active: true
            });
          }
          
          // Add power-ups occasionally
          if (i > 1 && Math.random() < 0.3) {
            // Random position within segment
            const t = Math.random() * 0.8 + 0.1; // 10-90% along segment
            const powerUpPos = new THREE.Vector3().lerpVectors(
              newSegment.start, 
              newSegment.end, 
              t
            );
            
            // Random offset from center of track
            const offsetDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            const offset = offsetDir.multiplyScalar(Math.random() * (TRACK.WIDTH * 0.3));
            powerUpPos.add(offset);
            
            // Raise slightly above track
            powerUpPos.y += 3;
            
            // Random power-up type
            const powerUpTypes = Object.values(POWERUP_TYPES);
            const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            
            initialPowerUps.push({
              type: powerUpType,
              position: powerUpPos,
              size: 2,
              id: i * 100 + initialPowerUps.length,
              active: true
            });
          }
          
          // Update last segment for next iteration
          lastSegment = newSegment;
        }
        
        return { 
          track: initialTrack,
          hazards: initialHazards,
          powerUps: initialPowerUps
        };
      });
    },
    
    // Generate new track segment
    generateNewTrackSegment: () => {
      set((state) => {
        // Get last segment
        const lastSegment = state.track[state.track.length - 1];
        if (!lastSegment) return {};
        
        // Generate direction with some random curvature and pitch
        const newDirection = new THREE.Vector3().copy(lastSegment.direction);
        const curvature = (Math.random() - 0.5) * TRACK.CURVATURE_MAX;
        const pitch = (Math.random() - 0.5) * TRACK.PITCH_MAX;
        
        // Apply rotation based on curvature
        const rotationY = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          curvature
        );
        
        // Apply pitch rotation
        const rotationX = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0), 
          pitch
        );
        
        newDirection.applyQuaternion(rotationY);
        newDirection.applyQuaternion(rotationX);
        newDirection.normalize();
        
        // Calculate new end point
        const newEnd = new THREE.Vector3().copy(lastSegment.end)
          .add(newDirection.clone().multiplyScalar(TRACK.SEGMENT_LENGTH));
        
        // Create new segment
        const newSegmentId = lastSegment.id + 1;
        const newSegment: TrackSegment = {
          start: lastSegment.end.clone(),
          end: newEnd,
          direction: newDirection,
          width: TRACK.WIDTH,
          curvature,
          pitch,
          isCheckpoint: newSegmentId % TRACK.CHECKPOINT_INTERVAL === 0,
          id: newSegmentId
        };
        
        // Create new hazards and power-ups
        const newHazards = [...state.hazards];
        const newPowerUps = [...state.powerUps];
        
        // Add hazards with some probability
        if (Math.random() < 0.7) {
          // Random position within segment
          const t = Math.random() * 0.8 + 0.1; // 10-90% along segment
          const hazardPos = new THREE.Vector3().lerpVectors(
            newSegment.start, 
            newSegment.end, 
            t
          );
          
          // Random offset from center of track
          const offsetDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          const offset = offsetDir.multiplyScalar(Math.random() * (TRACK.WIDTH * 0.4));
          hazardPos.add(offset);
          
          // Random hazard type
          const hazardTypes = Object.values(HAZARD_TYPES);
          const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
          
          newHazards.push({
            type: hazardType,
            position: hazardPos,
            size: 3 + Math.random() * 2,
            id: newSegmentId * 100 + Math.floor(Math.random() * 1000),
            active: true
          });
        }
        
        // Add power-ups occasionally
        if (Math.random() < 0.3) {
          // Random position within segment
          const t = Math.random() * 0.8 + 0.1; // 10-90% along segment
          const powerUpPos = new THREE.Vector3().lerpVectors(
            newSegment.start, 
            newSegment.end, 
            t
          );
          
          // Random offset from center of track
          const offsetDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          const offset = offsetDir.multiplyScalar(Math.random() * (TRACK.WIDTH * 0.3));
          powerUpPos.add(offset);
          
          // Raise slightly above track
          powerUpPos.y += 3;
          
          // Random power-up type
          const powerUpTypes = Object.values(POWERUP_TYPES);
          const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          
          newPowerUps.push({
            type: powerUpType,
            position: powerUpPos,
            size: 2,
            id: newSegmentId * 100 + Math.floor(Math.random() * 1000),
            active: true
          });
        }
        
        return {
          track: [...state.track, newSegment],
          hazards: newHazards,
          powerUps: newPowerUps
        };
      });
    },
    
    // Remove the oldest track segment
    removeOldTrackSegment: () => {
      set((state) => {
        if (state.track.length <= 1) return {};
        
        // Remove first segment
        const newTrack = [...state.track.slice(1)];
        
        // Also remove old hazards and power-ups
        const oldSegmentId = state.track[0].id;
        const newHazards = state.hazards.filter(h => 
          Math.floor(h.id / 100) !== oldSegmentId
        );
        const newPowerUps = state.powerUps.filter(p => 
          Math.floor(p.id / 100) !== oldSegmentId
        );
        
        return {
          track: newTrack,
          hazards: newHazards,
          powerUps: newPowerUps
        };
      });
    },
    
    // Status getters
    getBoostStatus: () => {
      const state = get();
      return {
        cooldown: state.rocket.boostCooldown,
        remaining: state.rocket.boostTimeRemaining
      };
    },
    
    getShieldStatus: () => {
      const state = get();
      return {
        active: state.rocket.isShielded,
        remaining: state.rocket.shieldTimeRemaining
      };
    }
  }))
);
