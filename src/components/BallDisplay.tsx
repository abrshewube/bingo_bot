import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (currentNumber && isAnimating) {
      setShowBall(true);
      setAnimationPhase('enter');
      
      // Animation sequence
      const enterTimer = setTimeout(() => {
        setAnimationPhase('display');
      }, 1000);

      const exitTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, 3000);

      const hideTimer = setTimeout(() => {
        setShowBall(false);
        setAnimationPhase('enter');
        onAnimationComplete?.();
      }, 4000);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [currentNumber, isAnimating, onAnimationComplete]);

  if (!currentNumber || !showBall) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
          <span className="text-white/50 text-lg">Next Ball</span>
        </div>
      </div>
    );
  }

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

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'enter':
        return 'scale-0 rotate-0 opacity-0';
      case 'display':
        return 'scale-100 rotate-360 opacity-100 animate-bounce';
      case 'exit':
        return 'scale-80 rotate-720 opacity-0';
      default:
        return '';
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[200px] relative">
      <div className={`transition-all duration-500 ease-in-out ${getAnimationClasses()}`}>
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getBallColor(currentNumber)} shadow-2xl flex items-center justify-center relative animate-spin`}>
          {/* Ball highlight */}
          <div className="absolute top-3 left-6 w-5 h-5 bg-white/30 rounded-full"></div>
          
          {/* Ball content */}
          <div className="text-center z-10">
            <div className="text-white font-bold text-2xl mb-1">
              {getBallLetter(currentNumber)}
            </div>
            <div className="text-white font-bold text-4xl">
              {currentNumber}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BallDisplay;