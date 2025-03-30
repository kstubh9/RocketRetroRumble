// Sound Manager for handling game audio
import { useAudio } from "./stores/useAudio";

// Play a sound when hitting obstacles
export function playHitSound(): void {
  useAudio.getState().playHit();
}

// Play success sound when reaching checkpoints or collecting power-ups
export function playSuccessSound(): void {
  useAudio.getState().playSuccess();
}

// Start the background music
export function startBackgroundMusic(): void {
  const { backgroundMusic, isMuted } = useAudio.getState();
  if (!backgroundMusic) return;
  
  // Only start if not muted
  if (!isMuted) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(error => {
      console.log("Background music play prevented:", error);
    });
  }
}

// Stop the background music
export function stopBackgroundMusic(): void {
  const { backgroundMusic } = useAudio.getState();
  if (!backgroundMusic) return;
  
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

// Toggle mute state and update all audio
export function toggleMute(): void {
  const { toggleMute, backgroundMusic, isMuted } = useAudio.getState();
  
  // Toggle state
  toggleMute();
  
  // Update background music if it exists
  if (backgroundMusic) {
    // Check the state after toggling
    const newMutedState = !isMuted;
    
    if (newMutedState) {
      backgroundMusic.pause();
    } else {
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
  }
}

// Set volume for a specific sound type
export function setVolume(volume: number): void {
  const { backgroundMusic } = useAudio.getState();
  
  // Clamp volume between 0 and 1
  const clampedVolume = Math.max(0, Math.min(1, volume));
  
  // Set volume for background music
  if (backgroundMusic) {
    backgroundMusic.volume = clampedVolume;
  }
}
