import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Play } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface CartelaSelectorProps {
  onCartelaSelect: (cartelaNumber: number, card: number[][]) => void;
  onJoinGame: () => void;
  onBack: () => void;
  moneyLevel: number;
  isJoining: boolean;
  takenCartelas: number[];
  currentUserCartela: number | null;
  roomId?: string;
  isSelectionEnabled?: boolean;
}

const CartelaSelector: React.FC<CartelaSelectorProps> = ({
  onCartelaSelect,
  onJoinGame,
  onBack,
  moneyLevel,
  isJoining,
  takenCartelas,
  currentUserCartela,
  roomId,
  isSelectionEnabled = true
}) => {
  const [selectedCartela, setSelectedCartela] = useState<number | null>(currentUserCartela);
  const [previewCard, setPreviewCard] = useState<number[][] | null>(null);
  const [isCartelaTaken, setIsCartelaTaken] = useState<{[key: number]: boolean}>({});
  const { socket } = useSocket();

  // Initialize taken cartelas
  useEffect(() => {
    const takenMap = takenCartelas.reduce((acc, num) => ({
      ...acc,
      [num]: true
    }), {});
    setIsCartelaTaken(takenMap);
  }, [takenCartelas]);

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
    if (!isSelectionEnabled) return;
    if (isCartelaTaken[cartelaNumber] && cartelaNumber !== currentUserCartela) {
      return;
    }
    
    const newCard = generateBingoCard();
    setSelectedCartela(cartelaNumber);
    setPreviewCard(newCard);
    onCartelaSelect(cartelaNumber, newCard);

    // Emit selectCartela event to backend to free previous cartela and reserve new one
    if (socket && roomId) {
      socket.emit('selectCartela', {
        roomId,
        cartelaNumber,
      });
    }
  };

  const getCartelaStatus = (number: number) => {
    if (selectedCartela === number) return 'selected';
    if (isCartelaTaken[number] && number !== currentUserCartela) return 'taken';
    return 'available';
  };

  const getCartelaStyles = (number: number) => {
    const status = getCartelaStatus(number);
    
    switch (status) {
      case 'selected':
        return 'bg-green-500 text-white border-green-400 scale-105 shadow-lg z-10';
      case 'taken':
        return 'bg-red-500 text-white border-red-400 cursor-not-allowed';
      case 'available':
        return 'bg-blue-500 text-white border-blue-400 hover:bg-blue-600 hover:scale-105 cursor-pointer';
      default:
        return '';
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
          <p>• Choose any available cartela number (1-100) to generate your unique bingo card</p>
          <p>• Click "Join Game" to enter the game room</p>
          <p>• You can change your cartela before joining the game</p>
        </div>
      </div>

      {/* Cartela Grid */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Choose Your Cartela (1-100)</h3>
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span>Taken</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Available</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-10 gap-2 mb-6">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => handleCartelaClick(number)}
              disabled={isJoining || (isCartelaTaken[number] && number !== currentUserCartela) || !isSelectionEnabled}
              className={`aspect-square flex items-center justify-center text-sm font-bold rounded-lg border-2 transition-all duration-200 relative ${
                getCartelaStyles(number)
              } ${isJoining ? 'opacity-50' : ''} ${!isSelectionEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {selectedCartela === number && (
                <Check className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 rounded-full p-0.5" size={16} />
              )}
              {isCartelaTaken[number] && number !== currentUserCartela ? (
                <X className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 rounded-full p-0.5" size={16} />
              ) : null}
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
            disabled={isJoining || selectedCartela === null}
            className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 ${
              isJoining || selectedCartela === null
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
                <span>
                  {selectedCartela 
                    ? `Join Game with Cartela #${selectedCartela}`
                    : 'Please select a cartela'}
                </span>
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