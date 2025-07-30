import React from 'react';

interface BingoCardProps {
  card: number[][];
  markedNumbers: number[];
  onNumberClick: (number: number) => void;
  calledNumbers: number[];
}

const BingoCard: React.FC<BingoCardProps> = ({
  card,
  markedNumbers,
  onNumberClick,
  calledNumbers
}) => {
  const headers = ['B', 'I', 'N', 'G', 'O'];

  const isMarked = (number: number) => markedNumbers.includes(number);
  const isCalled = (number: number) => calledNumbers.includes(number);
  const isFree = (number: number) => number === 0;

  return (
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

          return (
            <div
              key={`${col}-${row}`}
              className={`bingo-cell ${
                free
                  ? 'free'
                  : marked
                  ? 'marked'
                  : 'unmarked'
              } ${called && !marked ? 'ring-4 ring-green-400' : ''}`}
              onClick={() => !free && called && onNumberClick(number)}
            >
              {free ? 'FREE' : number}
            </div>
          );
        })
      )}
    </div>
  );
};

export default BingoCard;