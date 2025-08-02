import React, { useEffect, useState } from 'react';

// Define the custom keyframe animations for the rolling effect.
// These are included directly in the component for a self-contained example.
const customStyles = `
  @keyframes rollIn {
    0% {
      transform: translateX(-100vw) rotate(-360deg) scale(0);
      opacity: 0;
    }
    70% {
      transform: translateX(0) rotate(0deg) scale(1.1);
      opacity: 1;
    }
    100% {
      transform: translateX(0) rotate(0deg) scale(1);
    }
  }

  @keyframes rollOut {
    0% {
      transform: translateX(0) rotate(0deg) scale(1);
      opacity: 1;
    }
    30% {
      transform: translateX(0) rotate(0deg) scale(1.1);
      opacity: 1;
    }
    100% {
      transform: translateX(100vw) rotate(360deg) scale(0);
      opacity: 0;
    }
  }

  @keyframes bouncePulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;

interface BallDisplayProps {
  currentNumber: number | null;
  isAnimating: boolean;
  onAnimationComplete?: () => void;
}

const BallDisplay: React.FC<BallDisplayProps> = ({ 
  currentNumber, 
  isAnimating, 
  onAnimationComplete 
}) => {
  const [showBall, setShowBall] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'display' | 'exit'>('enter');
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);

  useEffect(() => {
    // Only run this effect if a new ball number is provided
    if (currentNumber !== null) {
      // Set the number to display and start the animation sequence
      setDisplayNumber(currentNumber);
      setShowBall(true);
      setAnimationPhase('enter');
      
      // Timer for the 'display' phase (after the rolling-in animation)
      const displayTimer = setTimeout(() => {
        setAnimationPhase('display');
      }, 1000); // Wait for the 'rollIn' animation to finish (1s)

      // Timer for the 'exit' phase
      const exitTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, 4000); // Display for 3s before rolling out

      // Timer to hide the ball and reset for the next one
      const hideTimer = setTimeout(() => {
        setShowBall(false);
        setAnimationPhase('enter');
        onAnimationComplete?.();
      }, 5000); // Wait for the 'rollOut' animation to finish (1s)

      return () => {
        clearTimeout(displayTimer);
        clearTimeout(exitTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [currentNumber, onAnimationComplete]);

  // If no number is being displayed, show the "waiting" state
  if (!displayNumber || !showBall) {
    return (
      <div className="flex justify-center items-center min-h-[200px] p-4">
        <div className="w-40 h-40 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
          <span className="text-white/50 text-lg">Waiting for next ball...</span>
        </div>
      </div>
    );
  }

  // Helper functions to get the letter and color based on the number
  const getBallLetter = (number: number) => {
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
    return '';
  };

  const getBallColor = (number: number) => {
    if (number >= 1 && number <= 15) return 'from-red-500 to-red-600';
    if (number >= 16 && number <= 30) return 'from-blue-500 to-blue-600';
    if (number >= 31 && number <= 45) return 'from-green-500 to-green-600';
    if (number >= 46 && number <= 60) return 'from-yellow-500 to-yellow-600';
    if (number >= 61 && number <= 75) return 'from-purple-500 to-purple-600';
    return 'from-gray-500 to-gray-600';
  };

  // Function to apply the correct animation class based on the phase
  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'enter':
        return 'animate-[rollIn_1s_ease-out_forwards]';
      case 'display':
        return 'animate-[bouncePulse_3s_ease-in-out_infinite]';
      case 'exit':
        return 'animate-[rollOut_1s_ease-in_forwards]';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Inject custom styles for keyframes */}
      <style>{customStyles}</style>
      <div className="flex justify-center items-center min-h-[200px] relative p-4">
        <div className={`transition-transform duration-1000 ease-in-out ${getAnimationClasses()}`}>
          <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${getBallColor(displayNumber!)} shadow-2xl flex items-center justify-center relative`}>
            {/* Ball highlight effect */}
            <div className="absolute top-4 left-8 w-6 h-6 bg-white/30 rounded-full transform rotate-12"></div>
            
            {/* Ball content: Letter and Number */}
            <div className="text-center z-10">
              <div className="text-white font-bold text-3xl mb-2">
                {getBallLetter(displayNumber!)}
              </div>
              <div className="text-white font-bold text-5xl">
                {displayNumber}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BallDisplay;
