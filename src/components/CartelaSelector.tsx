import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Play } from 'lucide-react';

interface CartelaSelectorProps {
  onCartelaSelect: (cartelaNumber: number, card: number[][]) => void;
  onJoinGame: () => void;
  onBack: () => void;
  moneyLevel: number;
  isJoining: boolean;
}

const CartelaSelector: React.FC<CartelaSelectorProps> = ({
  onCartelaSelect,
  onJoinGame,
  onBack,
  moneyLevel,
  isJoining
}) => {
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [previewCard, setPreviewCard] = useState<number[][] | null>(null);

  const generateBingoCard = (): number[][] => {
    const card = [];
    const ranges = [
      [1, 15],   // B column
      [16, 30],  // I column
      [31, 45],  // N column
      [46, 60],  // G column
      [61, 75]   // O column
    ];

    for (let col = 0; col < 5; col++) {
      const column = [];
      const [min, max] = ranges[col];
      const usedNumbers = new Set();
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          // Center is FREE space
          column.push(0);
        } else {
          let num;
          do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
          } while (usedNumbers.has(num));
          usedNumbers.add(num);
          column.push(num);
        }
      }
      card.push(column);
    }

    return card;
  };

  const handleCartelaClick = (cartelaNumber: number) => {
    const newCard = generateBingoCard();
    setSelectedCartela(cartelaNumber);
    setPreviewCard(newCard);
    onCartelaSelect(cartelaNumber, newCard);
  };

  const handleRegenerateCard = () => {
    if (selectedCartela) {
      handleCartelaClick(selectedCartela);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors"
          disabled={isJoining}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold text-white">
          Select Your Cartela - {moneyLevel} Birr
        </h1>
      </div>

      {/* Instructions */}
      <div className="glass-card p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-2">📋 How to Select</h3>
        <div className="text-white/80 text-sm space-y-1">
          <p>• Choose any cartela number (1-100) to generate your unique bingo card</p>
          <p>• You can regenerate the same cartela for a different card layout</p>
          <p>• Once you join the game, you cannot change your cartela</p>
        </div>
      </div>

      {/* Cartela Grid */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Choose Your Cartela (1-100)</h3>
        <div className="grid grid-cols-10 gap-2 mb-6">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => handleCartelaClick(number)}
              disabled={isJoining}
              className={`aspect-square flex items-center justify-center text-sm font-bold rounded-lg border-2 transition-all duration-200 ${
                selectedCartela === number
                  ? 'bg-blue-500 text-white border-blue-400 scale-110'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105'
              } ${isJoining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {number}
            </button>
          ))}
        </div>
      </div>

      {/* Card Preview */}
      {previewCard && (
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              Cartela #{selectedCartela} Preview
            </h3>
            <button
              onClick={handleRegenerateCard}
              disabled={isJoining}
              className="flex items-center space-x-2 bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} />
              <span>Regenerate</span>
            </button>
          </div>

          {/* Mini Bingo Card Preview */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <div className="grid grid-cols-5 gap-1">
              {/* Headers */}
              {['B', 'I', 'N', 'G', 'O'].map((header) => (
                <div
                  key={header}
                  className="aspect-square flex items-center justify-center text-sm font-bold text-gray-800 bg-yellow-400 rounded border"
                >
                  {header}
                </div>
              ))}
              
              {/* Card cells */}
              {Array.from({ length: 5 }, (_, row) =>
                Array.from({ length: 5 }, (_, col) => {
                  const number = previewCard[col][row];
                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`aspect-square flex items-center justify-center text-xs font-bold rounded border ${
                        number === 0
                          ? 'bg-yellow-200 text-gray-800'
                          : 'bg-gray-50 text-gray-800'
                      }`}
                    >
                      {number === 0 ? 'FREE' : number}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Join Game Button */}
          <button
            onClick={onJoinGame}
            disabled={isJoining}
            className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 ${
              isJoining
                ? 'bg-gray-500 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700 hover:scale-105'
            }`}
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Joining Game...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Join Game with Cartela #{selectedCartela}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Warning */}
      {selectedCartela && (
        <div className="glass-card p-4 rounded-xl border-yellow-400/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div>
              <p className="text-white font-medium">⚠️ Important Notice</p>
              <p className="text-white/70 text-sm">
                Once you join the game, you cannot change your cartela or leave without losing your entry fee.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartelaSelector;