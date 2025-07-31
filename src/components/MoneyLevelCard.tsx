import React from 'react';
import { Users, Clock, Play, Timer } from 'lucide-react';

interface MoneyLevelCardProps {
  moneyLevel: number;
  games: any[];
  onCreateGame?: () => void;
  onJoinGame?: (roomId: string) => void;
  countdown?: number;
}

const MoneyLevelCard: React.FC<MoneyLevelCardProps> = ({
  moneyLevel,
  games,
  onCreateGame,
  onJoinGame,
  countdown
}) => {
  // Find the most suitable game to display
  const waitingGame = games.find(g => g.status === 'waiting');
  const playingGame = games.find(g => g.status === 'playing');
  const displayGame = waitingGame || playingGame;

  const hasWaitingGame = !!waitingGame;
  const hasPlayingGame = !!playingGame;
  const playerCount = displayGame?.players?.length || 0;
  const maxPlayers = displayGame?.maxPlayers || 100;
  const totalPot = displayGame ? moneyLevel * playerCount : 0;

  const getStatus = () => {
    if (hasPlayingGame) return 'playing';
    if (hasWaitingGame) return 'waiting';
    return 'none';
  };

  const getStatusText = () => {
    if (hasPlayingGame) return 'Playing';
    if (hasWaitingGame) return 'Waiting';
    return 'No Game';
  };

  const getStatusColor = () => {
    if (hasPlayingGame) return 'bg-green-100 text-green-800';
    if (hasWaitingGame) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  };

  const canJoin = hasWaitingGame && playerCount < maxPlayers;
  const canCreate = !hasWaitingGame && !hasPlayingGame;

  return (
    <div className={`money-level-card ${hasPlayingGame ? 'active' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{moneyLevel} Birr</h3>
          <p className="text-sm text-gray-600">Entry Fee</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">Players</span>
          </div>
          <span className="font-medium text-gray-800">
            {playerCount}/{maxPlayers}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">Prize Pool</span>
          </div>
          <span className="font-medium text-gray-800">
            {Math.floor(totalPot * 0.8)} Birr
          </span>
        </div>

        {countdown && countdown > 0 && hasWaitingGame && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer size={16} className="text-orange-500" />
              <span className="text-sm text-gray-600">Starting in</span>
            </div>
            <span className="font-medium text-orange-600">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(playerCount / maxPlayers) * 100}%` }}
        />
      </div>

      <button
        onClick={() => {
          if (canCreate && onCreateGame) {
            onCreateGame();
          } else if (canJoin && onJoinGame && displayGame) {
            onJoinGame(displayGame.roomId);
          }
        }}
        disabled={!canCreate && !canJoin}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
          canCreate || canJoin
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Play size={16} />
        <span>
          {canCreate 
            ? 'Start New Game' 
            : canJoin 
            ? 'Join Game' 
            : hasPlayingGame 
            ? 'Game in Progress' 
            : 'Full'}
        </span>
      </button>
    </div>
  );
};

export default MoneyLevelCard;