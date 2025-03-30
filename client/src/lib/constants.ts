// Control keys enum
export enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  pitchUp = 'pitchUp',
  pitchDown = 'pitchDown',
  boost = 'boost',
  restart = 'restart',
}

// Game phases
export enum GamePhase {
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished',
  GAME_OVER = 'game_over',
}

// Rocket constants
export const ROCKET = {
  MAX_SPEED: 2.0,
  ACCELERATION: 0.02,
  ROTATION_SPEED: 0.03,
  PITCH_SPEED: 0.02,
  DRAG: 0.98,
  BOOST_MULTIPLIER: 2.0,
  BOOST_DURATION: 2000, // ms
  BOOST_COOLDOWN: 5000, // ms
  COLLISION_DAMAGE: 10,
};

// Track constants
export const TRACK = {
  SEGMENT_LENGTH: 100,
  WIDTH: 30,
  BORDER_HEIGHT: 5,
  MAX_SEGMENTS: 12,
  CURVATURE_MAX: 0.3,
  PITCH_MAX: 0.2,
  CHECKPOINT_INTERVAL: 3, // Every 3 segments
};

// Hazard types
export const HAZARD_TYPES = {
  ASTEROID: 'asteroid',
  TURBULENCE: 'turbulence',
  GRAVITY_ANOMALY: 'gravity_anomaly',
};

// Power-up types
export const POWERUP_TYPES = {
  BOOST: 'boost',
  SHIELD: 'shield',
};

// Physics constants
export const PHYSICS = {
  GRAVITY: 0.05,
};

// Camera constants
export const CAMERA = {
  FOLLOW_DISTANCE: 15,
  HEIGHT_OFFSET: 5,
  SMOOTHING: 0.05,
};

// Colors
export const COLORS = {
  ROCKET_PRIMARY: '#ff4a4a',
  ROCKET_SECONDARY: '#ffffff',
  TRACK_BASE: '#333333',
  TRACK_LINES: '#ffffff',
  ASTEROID: '#777777',
  TURBULENCE: '#55ccff',
  GRAVITY_ANOMALY: '#aa44cc',
  BOOST_POWERUP: '#ffaa00',
  SHIELD_POWERUP: '#00ccff',
  BOOST_TRAIL: '#ff9900',
  NORMAL_TRAIL: '#aaffff',
};
