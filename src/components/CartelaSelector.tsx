import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Play, Check, X, Crown } from 'lucide-react';

interface CartelaSelectorProps {
  onCartelaSelect: (cartelaNumber: number, card: number[][]) => void;
  onJoinGame: () => void;
  onBack: () => void;
  moneyLevel: number;
  isJoining: boolean;
  takenCartelas?: number[]; // Array of already taken cartela numbers
  currentUserCartela?: number | null; // Current user's selected cartela number
  cartelaOwners?: { [key: number]: string }; // Map of cartela number to player name
}

const CartelaSelector: React.FC<CartelaSelectorProps> = ({
  onCartelaSelect,
  onJoinGame,
  onBack,
  moneyLevel,
  isJoining,
  takenCartelas = [],
  currentUserCartela = null,
  cartelaOwners = {}
}) => {
  const [selectedCartela, setSelectedCartela] = useState<number | null>(currentUserCartela);
  const [previewCard, setPreviewCard] = useState<number[][] | null>(null);
  const [isCartelaTaken, setIsCartelaTaken] = useState<{[key: number]: boolean}>({});
  const [hoveredCartela, setHoveredCartela] = useState<number | null>(null);

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
    // Don't allow selecting already taken cartelas (except if it's the current user's cartela)
    if (isCartelaTaken[cartelaNumber] && cartelaNumber !== currentUserCartela) {
      return;
    }
    
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

  const getCartelaStatus = (number: number) => {
    if (selectedCartela === number) return 'selected';
    if (isCartelaTaken[number] && number !== currentUserCartela) return 'taken';
    return 'available';
  };

  const getCartelaStyles = (number: number) => {
    const status = getCartelaStatus(number);
    const isHovered = hoveredCartela === number;
    
    const baseStyles = 'aspect-square flex items-center justify-center text-sm font-bold rounded-lg border-2 transition-all duration-300 relative overflow-hidden';
    
    switch (status) {
      case 'selected':
        return `${baseStyles} bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 scale-110 shadow-2xl z-20 transform rotate-3 hover:rotate-0 hover:scale-115 cartela-selected glow-green`;
      case 'taken':
        return `${baseStyles} bg-gradient-to-br from-red-500/30 to-red-600/30 text-white/60 border-red-500/50 cursor-not-allowed opacity-60 hover:opacity-80 cartela-taken`;
      case 'available':
        const hoverStyles = isHovered 
          ? 'bg-gradient-to-br from-blue-400/40 to-purple-500/40 text-white border-blue-400/60 scale-105 shadow-lg cartela-hover glow-blue' 
          : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 text-white border-gray-400/30 hover:bg-gradient-to-br hover:from-blue-400/40 hover:to-purple-500/40 hover:border-blue-400/60 hover:scale-105 hover:shadow-lg cursor-pointer';
        return `${baseStyles} ${hoverStyles}`;
      default:
        return baseStyles;
    }
  };

  const getCartelaIcon = (number: number) => {
    const status = getCartelaStatus(number);
    
    switch (status) {
      case 'selected':
        return (
          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full p-1 shadow-lg animate-pulse">
            <Crown size={14} className="text-white" />
          </div>
        );
      case 'taken':
        return (
          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full p-1 shadow-lg">
            <X size={14} className="text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const getCartelaTooltip = (number: number) => {
    const owner = cartelaOwners[number];
    if (owner) {
      return `Taken by ${owner}`;
    }
    return null;
  };

  const getCartelaGlow = (number: number) => {
    const status = getCartelaStatus(number);
    
    switch (status) {
      case 'selected':
        return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-400/20 before:to-green-600/20 before:rounded-lg before:animate-pulse before:z-0';
      case 'taken':
        return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-400/10 before:to-red-600/10 before:rounded-lg before:z-0';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Choose Your Cartela</h1>
            <p className="text-gray-300">Money Level: {moneyLevel} Birr</p>
          </div>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Cartela Grid */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Select Your Cartela (1-100)</h3>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 mr-2 animate-pulse"></div>
              <span className="text-white">Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500/50 to-red-600/50 mr-2"></div>
              <span className="text-white/70">Taken</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-500/30 to-gray-600/30 mr-2"></div>
              <span className="text-white/70">Available</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-10 gap-2 mb-6">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => handleCartelaClick(number)}
              onMouseEnter={() => setHoveredCartela(number)}
              onMouseLeave={() => setHoveredCartela(null)}
              disabled={isJoining || (isCartelaTaken[number] && number !== currentUserCartela)}
              className={`${getCartelaStyles(number)} ${getCartelaGlow(number)} ${
                isJoining ? 'opacity-50' : ''
              }`}
              title={getCartelaTooltip(number) || undefined}
            >
              {getCartelaIcon(number)}
              <span className="relative z-10">{number}</span>
              {cartelaOwners[number] && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {cartelaOwners[number]}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card Preview */}
      {previewCard && (
        <div className="glass-card p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Your Bingo Card Preview</h3>
            <button
              onClick={handleRegenerateCard}
              disabled={isJoining}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} />
              <span>Regenerate</span>
            </button>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-5 gap-1">
              {previewCard.map((column, colIndex) => (
                <div key={colIndex} className="space-y-1">
                  {column.map((number, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={`aspect-square flex items-center justify-center text-sm font-bold rounded border ${
                        number === 0 
                          ? 'bg-yellow-500 text-black' 
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {number === 0 ? 'FREE' : number}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={onJoinGame}
            disabled={!selectedCartela || isJoining}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Join Game with Cartela {selectedCartela}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CartelaSelector;