import React from 'react';
import { Users, Clock, Play } from 'lucide-react';

interface MoneyLevelCardProps {
  moneyLevel: number;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  onJoin: () => void;
}

const MoneyLevelCard: React.FC<MoneyLevelCardProps> = ({
  moneyLevel,
  playerCount,
  maxPlayers,
  status,
  onJoin
}) => {
  const isActive = status === 'playing';
  const canJoin = status === 'waiting' && playerCount < maxPlayers;

  return (
    <div className={`money-level-card ${isActive ? 'active' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{moneyLevel} Birr</h3>
          <p className="text-sm text-gray-600">Entry Fee</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isActive ? 'Active' : 'Waiting'}
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
            {Math.floor(moneyLevel * playerCount * 0.8)} Birr
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(playerCount / maxPlayers) * 100}%` }}
        />
      </div>

      <button
        onClick={onJoin}
        disabled={!canJoin}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
          canJoin
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Play size={16} />
        <span>{canJoin ? 'Join Game' : isActive ? 'Game Started' : 'Full'}</span>
      </button>
    </div>
  );
};

export default MoneyLevelCard;