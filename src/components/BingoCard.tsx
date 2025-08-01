import React, { useState } from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';

interface BingoCardProps {
  card: number[][];
  markedNumbers: number[];
  onNumberClick: (number: number) => void;
  calledNumbers: number[];
  onClaimWin?: (pattern: string) => void;
  gameStatus: 'waiting' | 'playing' | 'finished';
}

const BingoCard: React.FC<BingoCardProps> = ({
  card,
  markedNumbers,
  onNumberClick,
  calledNumbers,
  onClaimWin,
  gameStatus
}) => {
  const headers = ['B', 'I', 'N', 'G', 'O'];
  const [showWinOptions, setShowWinOptions] = useState(false);

  const isMarked = (number: number) => markedNumbers.includes(number);
  const isCalled = (number: number) => calledNumbers.includes(number);
  const isFree = (number: number) => number === 0;

  // Check for win patterns
  const checkWinPatterns = () => {
    const patterns = [];
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      let count = 0;
      for (let col = 0; col < 5; col++) {
        const number = card[col][row];
        if (isMarked(number) || isFree(number)) count++;
      }
      if (count === 5) patterns.push('row');
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      let count = 0;
      for (let row = 0; row < 5; row++) {
        const number = card[col][row];
        if (isMarked(number) || isFree(number)) count++;
      }
      if (count === 5) patterns.push('column');
    }

    // Check diagonals
    let diagonal1 = 0, diagonal2 = 0;
    for (let i = 0; i < 5; i++) {
      const number1 = card[i][i];
      const number2 = card[i][4-i];
      if (isMarked(number1) || isFree(number1)) diagonal1++;
      if (isMarked(number2) || isFree(number2)) diagonal2++;
    }
    if (diagonal1 === 5) patterns.push('diagonal');
    if (diagonal2 === 5) patterns.push('diagonal');

    // Check four corners
    const corners = [
      card[0][0], card[0][4], card[4][0], card[4][4]
    ];
    if (corners.every(corner => isMarked(corner) || isFree(corner))) {
      patterns.push('corners');
    }

    return patterns;
  };

  const winPatterns = checkWinPatterns();
  const hasWinningPattern = winPatterns.length > 0;

  const handleNumberClick = (number: number) => {
    if (gameStatus === 'playing' && isCalled(number) && !isMarked(number) && !isFree(number)) {
      onNumberClick(number);
    }
  };

  const handleClaimWin = (pattern: string) => {
    if (onClaimWin) {
      onClaimWin(pattern);
      setShowWinOptions(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bingo Card */}
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
            const clickable = gameStatus === 'playing' && called && !marked && !free;

            let cellClasses = 'bingo-cell';
            if (free) {
              cellClasses += ' free';
            } else if (marked) {
              cellClasses += ' marked';
            } else {
              cellClasses += ' unmarked';
            }

            if (clickable) {
              cellClasses += ' ring-4 ring-green-400 cursor-pointer hover:ring-green-300';
            }

            return (
              <div
                key={`${col}-${row}`}
                className={cellClasses}
                onClick={() => handleNumberClick(number)}
              >
                {free ? 'FREE' : number}
              </div>
            );
          })
        )}
      </div>

      {/* Win Claim Button */}
      {gameStatus === 'playing' && hasWinningPattern && (
        <div className="text-center">
          <button
            onClick={() => setShowWinOptions(!showWinOptions)}
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-bold text-lg flex items-center justify-center mx-auto space-x-2"
          >
            <Trophy size={20} />
            <span>🎉 CLAIM BINGO! 🎉</span>
          </button>
        </div>
      )}

      {/* Win Pattern Options */}
      {showWinOptions && hasWinningPattern && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3 text-center">
            Select Your Winning Pattern:
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {winPatterns.map((pattern, index) => (
              <button
                key={index}
                onClick={() => handleClaimWin(pattern)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold"
              >
                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Instructions */}
      {gameStatus === 'playing' && (
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="text-yellow-400" size={16} />
            <h3 className="text-white font-bold">How to Play:</h3>
          </div>
          <ul className="text-white/80 text-sm space-y-1">
            <li>• Click on called numbers to mark them on your card</li>
            <li>• Complete a row, column, diagonal, or four corners to win</li>
            <li>• Click "CLAIM BINGO!" when you have a winning pattern</li>
            <li>• ⚠️ Once you move out of the game, there is no refund</li>
          </ul>
        </div>
      )}

      {/* Marked Numbers Count */}
      <div className="text-center">
        <p className="text-white/80 text-sm">
          Marked: {markedNumbers.length}/24 numbers
        </p>
      </div>
    </div>
  );
};

export default BingoCard;