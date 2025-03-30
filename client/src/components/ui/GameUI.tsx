import { useState, useEffect } from "react";
import { useRocketGame } from "@/lib/stores/useRocketGame";
import { GamePhase, ROCKET } from "@/lib/constants";
import { useAudio } from "@/lib/stores/useAudio";
import { startBackgroundMusic } from "@/lib/soundManager";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import cuboid from "@/assets/cuboid.svg";

export default function GameUI() {
  const { 
    phase, 
    time,
    score,
    lap,
    bestLapTime,
    rocket: { health, isBoosting, isShielded },
    getBoostStatus,
    getShieldStatus,
    startGame,
    restartGame 
  } = useRocketGame();
  
  const { isMuted, toggleMute } = useAudio();
  
  // Format time display (milliseconds to seconds)
  const formatTime = (timeMs: number) => {
    const seconds = Math.floor(timeMs / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  // Format best lap time or show default
  const formattedBestLap = bestLapTime !== null 
    ? formatTime(bestLapTime) 
    : '--.-';
  
  // Handle control instructions
  const [showControls, setShowControls] = useState(false);
  const toggleControls = () => setShowControls(!showControls);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Game HUD - only show when playing */}
      {phase === GamePhase.PLAYING && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
          {/* Left side - Score, Time, Lap */}
          <div className="bg-black/70 rounded-md p-3 text-white">
            <div className="text-xl font-bold mb-1">Score: {score}</div>
            <div>Lap: {lap}</div>
            <div>Time: {formatTime(time)}</div>
            <div>Best: {formattedBestLap}</div>
          </div>
          
          {/* Right side - Health, Boost, Shield */}
          <div className="bg-black/70 rounded-md p-3 text-white">
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span>Health</span>
                <span>{health}%</span>
              </div>
              <Progress value={health} className="h-2 w-32" />
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span>Boost</span>
                <span>{getBoostStatus().cooldown ? "Cooldown" : (isBoosting ? "ACTIVE" : "Ready")}</span>
              </div>
              <Progress 
                value={isBoosting ? (getBoostStatus().remaining / ROCKET.BOOST_DURATION) * 100 : 100} 
                className={cn("h-2 w-32", isBoosting ? "bg-orange-700" : (getBoostStatus().cooldown ? "bg-gray-700" : "bg-blue-700"))}
              />
            </div>
            
            <div className="mb-1">
              <div className="flex justify-between mb-1">
                <span>Shield</span>
                <span>{isShielded ? "ACTIVE" : "None"}</span>
              </div>
              {isShielded && (
                <Progress 
                  value={(getShieldStatus().remaining / 5000) * 100} 
                  className="h-2 w-32 bg-cyan-700"
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Start Screen */}
      {phase === GamePhase.READY && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-purple-500 mb-2">
              ROCKET RETRO RUMBLE
            </h1>
            <p className="text-white text-xl mb-6">
              A high-speed 3D rocket racing game
            </p>
            
            <img src={cuboid} alt="Rocket" className="w-24 h-24 mx-auto mb-4" />
            
            <div className="flex gap-4 justify-center mt-6">
              <Button 
                onClick={() => {
                  startGame();
                  startBackgroundMusic();
                }}
                className="pointer-events-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-3 text-lg"
              >
                Start Game
              </Button>
              
              <Button 
                onClick={toggleControls}
                variant="outline"
                className="pointer-events-auto text-white border-white hover:bg-white/10"
              >
                {showControls ? "Hide Controls" : "Show Controls"}
              </Button>
              
              <Button 
                onClick={toggleMute}
                variant="outline"
                className="pointer-events-auto text-white border-white hover:bg-white/10"
              >
                {isMuted ? "Unmute 🔇" : "Mute 🔊"}
              </Button>
            </div>
          </div>
          
          {showControls && (
            <Card className="bg-black/80 border-gray-700 text-white p-4 max-w-md">
              <h2 className="text-xl font-bold mb-3">Controls</h2>
              <ul className="space-y-2">
                <li>W / ↑ - Accelerate</li>
                <li>S / ↓ - Brake/Reverse</li>
                <li>A / ← - Turn Left</li>
                <li>D / → - Turn Right</li>
                <li>I - Pitch Up</li>
                <li>K - Pitch Down</li>
                <li>Shift - Boost (when available)</li>
                <li>R - Restart Game</li>
                <li>P - Toggle Debug Mode</li>
              </ul>
            </Card>
          )}
        </div>
      )}
      
      {/* Game Over Screen */}
      {phase === GamePhase.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Card className="bg-black/80 border-gray-700 text-white p-6 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-500">Game Over</h2>
            <p className="mb-4">Your rocket was destroyed!</p>
            <p className="mb-6">Final Score: {score}</p>
            <Button 
              onClick={restartGame}
              className="pointer-events-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 px-6 py-2"
            >
              Try Again
            </Button>
          </Card>
        </div>
      )}
      
      {/* Finished Screen */}
      {phase === GamePhase.FINISHED && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Card className="bg-black/80 border-gray-700 text-white p-6 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4 text-green-500">Race Complete!</h2>
            <p className="mb-6">Final Score: {score}</p>
            <p className="mb-2">Best Lap Time: {formattedBestLap}</p>
            <Button 
              onClick={restartGame}
              className="pointer-events-auto bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 px-6 py-2 mt-4"
            >
              Play Again
            </Button>
          </Card>
        </div>
      )}
      
      {/* Persistent Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button 
          onClick={toggleMute}
          variant="outline"
          className="pointer-events-auto text-white bg-black/50 border-white/30 hover:bg-white/10"
          size="sm"
        >
          {isMuted ? "🔇" : "🔊"}
        </Button>
        
        {phase === GamePhase.PLAYING && (
          <Button 
            onClick={restartGame}
            variant="outline"
            className="pointer-events-auto text-white bg-black/50 border-white/30 hover:bg-white/10"
            size="sm"
          >
            Restart
          </Button>
        )}
      </div>
    </div>
  );
}
