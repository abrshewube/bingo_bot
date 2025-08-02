import React, { useState, useEffect } from 'react';

interface BingoCardProps {
  card: number[][];
  markedNumbers: number[];
  onNumberClick?: (number: number) => void;
  calledNumbers: number[];
  currentNumber?: number | null;
  isGameActive?: boolean;
  showBingoButton?: boolean;
  onBingoClick?: () => void;
  canClaimBingo?: boolean;
}

const BingoCard: React.FC<BingoCardProps> = ({
  card,
  markedNumbers,
  onNumberClick,
  calledNumbers,
  currentNumber,
  isGameActive = false,
  showBingoButton = false,
  onBingoClick,
  canClaimBingo = false
}) => {
  const headers = ['B', 'I', 'N', 'G', 'O'];
  const [glowingNumbers, setGlowingNumbers] = useState<Set<number>>(new Set());

  const isMarked = (number: number) => markedNumbers.includes(number);
  const isCalled = (number: number) => calledNumbers.includes(number);
  const isFree = (number: number) => number === 0;
  const canMark = (number: number) => isGameActive && isCalled(number) && !isMarked(number) && !isFree(number);
  const isGlowing = (number: number) => glowingNumbers.has(number);

  // Check for current called number and add glow effect only for that number
  useEffect(() => {
    if (currentNumber && !isFree(currentNumber)) {
      // Check if current number is on the card
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
          const number = card[col][row];
          if (number === currentNumber) {
            setGlowingNumbers(new Set([currentNumber]));
            
            // Remove glow after 2 seconds
            setTimeout(() => {
              setGlowingNumbers(new Set());
            }, 2000);
            return;
          }
        }
      }
    }
  }, [currentNumber, card, markedNumbers]);

  return (
    <div className="space-y-4">
      <div className="bingo-card">
        {/* Headers */}
        {headers.map((header, index) => (
          <div
            key={header}
            className="flex items-center justify-center text-2xl font-bold text-gray-800 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg border-2 border-yellow-600 shadow-lg"
            style={{ minHeight: '50px' }}
          >
            {header}
          </div>
        ))}
        
        {/* Bingo cells */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => {
            const number = card[col][row];
            const marked = isMarked(number);
            const free = isFree(number);
            const clickable = canMark(number);
            const glowing = isGlowing(number);

            return (
              <div
                key={`${col}-${row}`}
                className={`bingo-cell ${
                  free
                    ? 'free'
                    : marked
                    ? 'marked'
                    : 'unmarked'
                } ${
                  clickable ? 'cursor-pointer hover:scale-110' : ''
                } ${
                  glowing ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse shadow-lg shadow-yellow-400/50' : ''
                }`}
                onClick={() => clickable && onNumberClick && onNumberClick(number)}
              >
                {free ? 'FREE' : number}
                {glowing && !free && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bingo Button - Always enabled */}
      {showBingoButton && (
        <div className="mt-6">
          <button
            onClick={onBingoClick}
            className="w-full py-4 px-6 rounded-xl font-bold text-xl transition-all duration-300 bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 hover:scale-105 animate-pulse shadow-lg border-2 border-yellow-300"
          >
            🎉 BINGO! 🎉
          </button>
          <p className="text-center text-white/80 text-sm mt-2">
            Click to check if you have a winning pattern!
          </p>
        </div>
      )}
    </div>
  );
};

export default BingoCard;