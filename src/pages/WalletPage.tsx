import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, TrendingUp, TrendingDown, History } from 'lucide-react';

const WalletPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-white/80">Please login to view your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">My Wallet</h1>
        <p className="text-white/80">Manage your earnings and balance</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-8 rounded-xl text-center">
        <Wallet className="mx-auto mb-4 text-yellow-400" size={48} />
        <h2 className="text-4xl font-bold text-white mb-2">
          {user.walletBalance} Birr
        </h2>
        <p className="text-white/80">Current Balance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6 rounded-xl text-center">
          <TrendingUp className="mx-auto mb-3 text-green-400" size={32} />
          <h3 className="text-2xl font-bold text-white">{user.totalWinnings}</h3>
          <p className="text-white/60 text-sm">Total Winnings</p>
        </div>
        <div className="glass-card p-6 rounded-xl text-center">
          <History className="mx-auto mb-3 text-blue-400" size={32} />
          <h3 className="text-2xl font-bold text-white">{user.gamesPlayed}</h3>
          <p className="text-white/60 text-sm">Games Played</p>
        </div>
      </div>

      {/* Win Rate */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/80">Win Rate</span>
            <span className="text-white font-bold">
              {user.gamesPlayed > 0 
                ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${user.gamesPlayed > 0 
                  ? (user.gamesWon / user.gamesPlayed) * 100 
                  : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {user.gamesWon > 0 ? (
            <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Game Win</p>
                  <p className="text-white/60 text-sm">Recent game victory</p>
                </div>
              </div>
              <span className="text-green-400 font-bold">+{Math.floor(user.totalWinnings / user.gamesWon)} Birr</span>
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="mx-auto mb-3 text-white/40" size={48} />
              <p className="text-white/60">No transactions yet</p>
              <p className="text-white/40 text-sm">Play games to see your transaction history</p>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">Withdrawal</h3>
        <div className="text-center py-6">
          <TrendingDown className="mx-auto mb-3 text-white/40" size={48} />
          <p className="text-white/60 mb-2">Withdrawal Feature</p>
          <p className="text-white/40 text-sm">Coming soon! Payment integration in progress.</p>
        </div>
      </div>

      {/* Registration Reminder */}
      {!user.isRegistered && (
        <div className="glass-card p-4 rounded-xl border-yellow-400/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div>
              <p className="text-white font-medium">Complete Registration</p>
              <p className="text-white/70 text-sm">
                Register your phone number in the Telegram bot to enable withdrawals
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;