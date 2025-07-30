import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { History, Trophy, Calendar, Coins } from 'lucide-react';

const HistoryPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-white/80">Please login to view your game history.</p>
        </div>
      </div>
    );
  }

  // Mock game history data (in real app, this would come from API)
  const gameHistory = user.gamesPlayed > 0 ? [
    {
      id: '1',
      date: new Date().toISOString(),
      moneyLevel: 50,
      result: user.gamesWon > 0 ? 'won' : 'lost',
      prize: user.gamesWon > 0 ? Math.floor(user.totalWinnings / user.gamesWon) : 0,
      players: 15,
      numbersCalledCount: 42
    }
  ] : [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Game History</h1>
        <p className="text-white/80">Your past games and results</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6 rounded-xl text-center">
          <Calendar className="mx-auto mb-3 text-blue-400" size={32} />
          <h3 className="text-2xl font-bold text-white">{user.gamesPlayed}</h3>
          <p className="text-white/60 text-sm">Total Games</p>
        </div>
        <div className="glass-card p-6 rounded-xl text-center">
          <Trophy className="mx-auto mb-3 text-yellow-400" size={32} />
          <h3 className="text-2xl font-bold text-white">{user.gamesWon}</h3>
          <p className="text-white/60 text-sm">Games Won</p>
        </div>
      </div>

      {/* Win Rate */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Performance Overview</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/80">Win Rate</span>
            <span className="text-white font-bold">
              {user.gamesPlayed > 0 
                ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${user.gamesPlayed > 0 
                  ? (user.gamesWon / user.gamesPlayed) * 100 
                  : 0}%` 
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Average Earnings per Game</span>
            <span className="text-white font-bold">
              {user.gamesPlayed > 0 
                ? Math.round(user.totalWinnings / user.gamesPlayed)
                : 0} Birr
            </span>
          </div>
        </div>
      </div>

      {/* Game History List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Recent Games</h3>
        
        {gameHistory.length > 0 ? (
          gameHistory.map((game) => (
            <div key={game.id} className="glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    game.result === 'won' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}>
                    {game.result === 'won' ? (
                      <Trophy size={20} className="text-white" />
                    ) : (
                      <History size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {game.moneyLevel} Birr Game
                    </p>
                    <p className="text-white/60 text-sm">
                      {new Date(game.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    game.result === 'won' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {game.result === 'won' ? `+${game.prize}` : `-${game.moneyLevel}`} Birr
                  </p>
                  <p className="text-white/60 text-sm">
                    {game.result === 'won' ? 'Won' : 'Lost'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-white/60">Players:</span>
                  <span className="text-white">{game.players}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-white/60">Numbers Called:</span>
                  <span className="text-white">{game.numbersCalledCount}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-8 rounded-xl text-center">
            <History className="mx-auto mb-4 text-white/40" size={64} />
            <h3 className="text-xl font-bold text-white mb-2">No Games Yet</h3>
            <p className="text-white/60 mb-4">
              You haven't played any games yet.
            </p>
            <p className="text-white/40 text-sm">
              Start playing to build your game history!
            </p>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">🏅 Achievements</h3>
        <div className="space-y-3">
          {user.gamesPlayed >= 1 && (
            <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">First Game</p>
                <p className="text-white/60 text-sm">Played your first bingo game</p>
              </div>
            </div>
          )}
          
          {user.gamesWon >= 1 && (
            <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <Coins size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">First Win</p>
                <p className="text-white/60 text-sm">Won your first bingo game</p>
              </div>
            </div>
          )}
          
          {user.gamesPlayed === 0 && (
            <div className="text-center py-4">
              <p className="text-white/60">Play games to unlock achievements!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;