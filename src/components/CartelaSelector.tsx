import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface CartelaSelectorProps {
  onCartelaSelect: (cartelaNumber: number) => void;
  onCancel: () => void;
  selectedCartela?: number | null;
  takenCartelas: number[];
  isLoading?: boolean;
}

const CartelaSelector: React.FC<CartelaSelectorProps> = ({
  onCartelaSelect,
  onCancel,
  selectedCartela,
  takenCartelas,
  isLoading = false
}) => {
  const [hoveredCartela, setHoveredCartela] = useState<number | null>(null);

  const isCartelaTaken = (cartelaNumber: number) => {
    return takenCartelas.includes(cartelaNumber);
  };

  const isCartelaSelected = (cartelaNumber: number) => {
    return selectedCartela === cartelaNumber;
  };

  const handleCartelaClick = (cartelaNumber: number) => {
    if (!isCartelaTaken(cartelaNumber) && !isLoading) {
      onCartelaSelect(cartelaNumber);
    }
  };

  const renderCartelaButton = (cartelaNumber: number) => {
    const taken = isCartelaTaken(cartelaNumber);
    const selected = isCartelaSelected(cartelaNumber);
    const hovered = hoveredCartela === cartelaNumber;

    let buttonClasses = 'w-12 h-12 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-center';
    
    if (taken) {
      buttonClasses += ' bg-red-500 text-white cursor-not-allowed';
    } else if (selected) {
      buttonClasses += ' bg-green-500 text-white cursor-pointer shadow-lg scale-105';
    } else if (hovered) {
      buttonClasses += ' bg-blue-400 text-white cursor-pointer shadow-md scale-105';
    } else {
      buttonClasses += ' bg-gray-700 text-white hover:bg-gray-600 cursor-pointer';
    }

    return (
      <button
        key={cartelaNumber}
        className={buttonClasses}
        onClick={() => handleCartelaClick(cartelaNumber)}
        onMouseEnter={() => setHoveredCartela(cartelaNumber)}
        onMouseLeave={() => setHoveredCartela(null)}
        disabled={taken || isLoading}
      >
        {taken ? (
          <X size={16} />
        ) : selected ? (
          <Check size={16} />
        ) : (
          cartelaNumber
        )}
      </button>
    );
  };

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎟️ Select Your Cartela</h2>
        <p className="text-white/80 text-sm">
          Choose a unique cartela number (1-100) to generate your bingo card
        </p>
      </div>

      {/* Cartela Grid */}
      <div className="grid grid-cols-10 gap-2 mb-6 max-h-96 overflow-y-auto">
        {Array.from({ length: 100 }, (_, i) => i + 1).map(renderCartelaButton)}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-700 rounded"></div>
          <span className="text-white/80">Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-white/80">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-white/80">Taken</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-6">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        {selectedCartela && (
          <button
            onClick={() => onCartelaSelect(selectedCartela)}
            disabled={isLoading}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Selecting...' : `Select Cartela ${selectedCartela}`}
          </button>
        )}
      </div>

      {selectedCartela && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
          <p className="text-green-400 text-sm">
            🎯 You selected Cartela #{selectedCartela}
          </p>
        </div>
      )}
    </div>
  );
};

export default CartelaSelector; 