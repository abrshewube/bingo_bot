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
      <div className="ball-container">
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

  return (
    <div className="ball-container relative">
      <div className={`ball-wrapper ${animationPhase}`}>
        <div className="ball">
          <div className="ball-content">
            <div className="ball-letter">{getBallLetter(currentNumber)}</div>
            <div className="ball-number">{currentNumber}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BallDisplay;