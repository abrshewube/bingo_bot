import React from 'react';

interface BingoCardProps {
  card: number[][];
  markedNumbers: number[];
  onNumberClick?: (number: number) => void;
  calledNumbers: number[];
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
  isGameActive = false,
  showBingoButton = false,
  onBingoClick,
  canClaimBingo = false
}) => {
  const headers = ['B', 'I', 'N', 'G', 'O'];

  const isMarked = (number: number) => markedNumbers.includes(number);
  const isCalled = (number: number) => calledNumbers.includes(number);
  const isFree = (number: number) => number === 0;
  const canMark = (number: number) => isGameActive && isCalled(number) && !isMarked(number) && !isFree(number);

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
            const called = isCalled(number);
            const free = isFree(number);
            const clickable = canMark(number);

            return (
              <div
                key={`${col}-${row}`}
                className={`bingo-cell ${
                  free
                    ? 'free'
                    : marked
                    ? 'marked'
                    : 'unmarked'
                } ${called && !marked && !free ? 'ring-4 ring-green-400 animate-pulse' : ''} ${
                  clickable ? 'cursor-pointer hover:scale-110' : ''
                }`}
                onClick={() => clickable && onNumberClick && onNumberClick(number)}
              >
                {free ? 'FREE' : number}
                {called && !marked && !free && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bingo Button */}
      {showBingoButton && (
        <button
          onClick={onBingoClick}
          disabled={!canClaimBingo}
          className={`w-full py-4 px-6 rounded-xl font-bold text-xl transition-all duration-300 ${
            canClaimBingo
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 hover:scale-105 animate-pulse shadow-lg'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          {canClaimBingo ? '🎉 BINGO! 🎉' : 'Complete a Pattern to Win'}
        </button>
      )}
    </div>
  );
};

export default BingoCard;