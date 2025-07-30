import React, { useState, useEffect } from 'react';
import { gameService } from '../services/gameService';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

interface LeaderboardEntry {
  _id: string;
  firstName: string;
  wins: number;
  totalPrize: number;
  lastWin: string;
}

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await gameService.getLeaderboard(period);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={24} />;
      case 2:
        return <Trophy className="text-gray-300" size={24} />;
      case 3:
        return <Medal className="text-orange-400" size={24} />;
      default:
        return <Award className="text-blue-400" size={24} />;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-yellow-400/50';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-500/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-orange-400/50';
      default:
        return 'bg-white/10 border-white/20';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">🏆 Leaderboard</h1>
        <p className="text-white/80">Top players and their achievements</p>
      </div>

      {/* Period Selector */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex space-x-2">
          {(['daily', 'weekly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => (
            <div
              key={entry._id}
              className={`glass-card p-4 rounded-xl border ${getRankBg(index + 1)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRankIcon(index + 1)}
                    <span className="text-2xl font-bold text-white">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {entry.firstName}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {entry.wins} wins • {entry.totalPrize} Birr earned
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-yellow-400">
                    {entry.totalPrize} Birr
                  </p>
                  <p className="text-white/60 text-sm">Total Prize</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-8 rounded-xl text-center">
            <Trophy className="mx-auto mb-4 text-white/40" size={64} />
            <h3 className="text-xl font-bold text-white mb-2">No Data Yet</h3>
            <p className="text-white/60">
              {period === 'daily' 
                ? 'No games won today' 
                : period === 'weekly' 
                ? 'No games won this week' 
                : 'No games won yet'}
            </p>
            <p className="text-white/40 text-sm mt-2">
              Play games to appear on the leaderboard!
            </p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">
            {period.charAt(0).toUpperCase() + period.slice(1)} Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {leaderboard.reduce((sum, entry) => sum + entry.wins, 0)}
              </p>
              <p className="text-white/60 text-sm">Total Games Won</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {leaderboard.reduce((sum, entry) => sum + entry.totalPrize, 0)}
              </p>
              <p className="text-white/60 text-sm">Total Prizes (Birr)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;