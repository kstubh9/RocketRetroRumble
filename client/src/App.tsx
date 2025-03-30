import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { Perf } from "r3f-perf";
import Game from "./components/game/Game";
import GameUI from "./components/ui/GameUI";
import { Controls } from "./lib/constants";
import { useRocketGame } from "./lib/stores/useRocketGame";
import "@fontsource/inter";

// Define control keys for the game
const keyMap = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.pitchUp, keys: ["KeyI"] },
  { name: Controls.pitchDown, keys: ["KeyK"] },
  { name: Controls.boost, keys: ["ShiftLeft"] },
  { name: Controls.restart, keys: ["KeyR"] },
];

// Sound file paths
const SOUND_PATHS = {
  background: "/sounds/background.mp3",
  hit: "/sounds/hit.mp3",
  success: "/sounds/success.mp3",
};

// Main App component
function App() {
  const { phase, startGame } = useRocketGame();
  const { 
    setBackgroundMusic, 
    setHitSound, 
    setSuccessSound, 
    toggleMute 
  } = useAudio();
  const [showCanvas, setShowCanvas] = useState(false);
  const [isDebug, setIsDebug] = useState(false);

  // Setup sounds
  useEffect(() => {
    const backgroundMusic = new Audio(SOUND_PATHS.background);
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
    setBackgroundMusic(backgroundMusic);

    const hitSound = new Audio(SOUND_PATHS.hit);
    setHitSound(hitSound);

    const successSound = new Audio(SOUND_PATHS.success);
    setSuccessSound(successSound);

    // Initialize audio to muted
    toggleMute();

    // Show the canvas once everything is loaded
    setShowCanvas(true);

    // Debug mode toggle with 'D' key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        setIsDebug(prev => !prev);
        console.log("Debug mode:", !isDebug);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebug]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={keyMap}>
          <Canvas
            shadows
            camera={{
              position: [0, 10, 30],
              fov: 60,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "default"
            }}
          >
            {isDebug && <Perf position="top-left" />}
            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>
          <GameUI />
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
