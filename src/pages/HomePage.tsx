import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gameService } from '../services/gameService';
import MoneyLevelCard from '../components/MoneyLevelCard';
import { Wallet, Trophy, User } from 'lucide-react';

interface GameRoom {
  roomId: string;
  moneyLevel: number;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

const HomePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRoom[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const moneyLevels = [10, 20, 30, 40, 50, 100];

  useEffect(() => {
    loadAvailableGames();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('gameJoined', (data) => {
        navigate(`/game/${data.roomId}`);
      });

      socket.on('error', (error) => {
        alert(error.message);
      });

      return () => {
        socket.off('gameJoined');
        socket.off('error');
      };
    }
  }, [socket, navigate]);

  const loadAvailableGames = async () => {
    try {
      const availableGames = await gameService.getAvailableGames();
      
      // Create game rooms for each money level
      const gameRooms = moneyLevels.map(level => {
        const existingGame = availableGames.find((g: any) => g.moneyLevel === level);
        return {
          roomId: existingGame?.roomId || '',
          moneyLevel: level,
          playerCount: existingGame?.playerCount || 0,
          maxPlayers: 100,
          status: existingGame?.status || 'waiting'
        };
      });

      setGames(gameRooms);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleJoinGame = (moneyLevel: number) => {
    if (!user?.isRegistered) {
      alert('Please complete registration first!');
      return;
    }

    if (socket) {
      socket.emit('joinGame', { moneyLevel });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-white/80">Please open this app through the Telegram bot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {user.firstName}! 🎮
            </h1>
            <p className="text-white/80 mt-1">Choose your game level</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-yellow-400">
              <Wallet size={20} />
              <span className="font-bold">{user.walletBalance} Birr</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <User className="mx-auto mb-2 text-blue-400" size={24} />
          <p className="text-2xl font-bold text-white">{user.gamesPlayed}</p>
          <p className="text-white/60 text-sm">Games Played</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <Trophy className="mx-auto mb-2 text-yellow-400" size={24} />
          <p className="text-2xl font-bold text-white">{user.gamesWon}</p>
          <p className="text-white/60 text-sm">Games Won</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <Wallet className="mx-auto mb-2 text-green-400" size={24} />
          <p className="text-2xl font-bold text-white">{user.totalWinnings}</p>
          <p className="text-white/60 text-sm">Total Winnings</p>
        </div>
      </div>

      {/* Registration Status */}
      {!user.isRegistered && (
        <div className="glass-card p-4 rounded-xl border-yellow-400/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div>
              <p className="text-white font-medium">Complete Registration</p>
              <p className="text-white/70 text-sm">
                Register your phone number in the Telegram bot to play games
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Game Levels */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Available Games</h2>
        {loadingGames ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Loading games...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <MoneyLevelCard
                key={game.moneyLevel}
                moneyLevel={game.moneyLevel}
                playerCount={game.playerCount}
                maxPlayers={game.maxPlayers}
                status={game.status}
                onJoin={() => handleJoinGame(game.moneyLevel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Game Rules */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-3">🎯 How to Play</h3>
        <div className="space-y-2 text-white/80 text-sm">
          <p>• Minimum 10 players, maximum 100 players per game</p>
          <p>• Game starts automatically after 3 minutes or when full</p>
          <p>• Mark numbers on your card as they're called</p>
          <p>• Win with: Horizontal, Vertical, Diagonal, or Four Corners</p>
          <p>• Winner gets 80% of the total prize pool</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;