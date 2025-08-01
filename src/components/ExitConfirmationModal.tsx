import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gameStarted: boolean;
  entryFee: number;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  gameStarted,
  entryFee
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 rounded-xl max-w-md w-full border-2 border-red-400/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-red-400" size={24} />
            <h3 className="text-lg font-bold text-white">
              {gameStarted ? 'Cannot Leave Game' : 'Leave Game?'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {gameStarted ? (
            <>
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4">
                <p className="text-white font-medium mb-2">⚠️ Game Already Started</p>
                <p className="text-white/80 text-sm">
                  Once you move out of the game, there is no refund. Your {entryFee} Birr entry fee will be lost.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Stay in Game
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Leave Anyway
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                <p className="text-white font-medium mb-2">✅ Refund Available</p>
                <p className="text-white/80 text-sm">
                  Since the game hasn't started yet, your {entryFee} Birr entry fee will be refunded.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Leave & Refund
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationModal;