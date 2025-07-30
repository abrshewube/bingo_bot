import React, { useEffect, useState } from 'react';

interface BallDisplayProps {
  currentNumber: number | null;
  isAnimating: boolean;
}

const BallDisplay: React.FC<BallDisplayProps> = ({ currentNumber, isAnimating }) => {
  const [showBall, setShowBall] = useState(false);

  useEffect(() => {
    if (currentNumber && isAnimating) {
      setShowBall(true);
      
      // Hide ball after animation
      const timer = setTimeout(() => {
        setShowBall(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentNumber, isAnimating]);

  if (!currentNumber || !showBall) {
    return (
      <div className="ball-container">
        <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
          <span className="text-white/50 text-sm">Next Ball</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ball-container">
      <div className={`ball ${isAnimating ? 'ball-animation' : ''}`}>
        {currentNumber}
      </div>
    </div>
  );
};

export default BallDisplay;