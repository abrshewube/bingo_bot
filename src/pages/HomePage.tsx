import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gameService } from '../services/gameService';
import MoneyLevelCard from '../components/MoneyLevelCard';
import { Wallet, Trophy, User, AlertCircle } from 'lucide-react';

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
  const [isJoining, setIsJoining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const moneyLevels = [10, 20, 30, 40, 50, 100];

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    loadAvailableGames();
  }, []);

  useEffect(() => {
    if (socket) {
      addLog('Socket connected, setting up listeners');

      socket.on('gameJoined', (data) => {
        addLog(`Game joined successfully, redirecting to room ${data.roomId}`);
        navigate(`/game/${data.roomId}`);
      });

      socket.on('error', (error) => {
        addLog(`Socket error: ${error.message}`);
        setError(error.message);
      });

      socket.on('gameListUpdated', () => {
        addLog('Game list updated, reloading available games');
        loadAvailableGames();
      });

      return () => {
        addLog('Cleaning up socket listeners');
        socket.off('gameJoined');
        socket.off('error');
        socket.off('gameListUpdated');
      };
    }
  }, [socket, navigate]);

  const loadAvailableGames = async () => {
    try {
      addLog('Loading available games...');
      setLoadingGames(true);
      const availableGames = await gameService.getAvailableGames();
      
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
      addLog(`Successfully loaded ${availableGames.length} active games`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to load games';
      addLog(`Error loading games: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleJoinGame = (moneyLevel: number) => {
    addLog(`Attempting to join game with money level ${moneyLevel}`);
    
    if (!user?.isRegistered) {
      const msg = 'Please complete registration first!';
      addLog(msg);
      setError(msg);
      return;
    }

    if (!socket) {
      const msg = 'Connection error. Please refresh the page.';
      addLog(msg);
      setError(msg);
      return;
    }

    if (isJoining) {
      addLog('Already attempting to join a game');
      return;
    }

    setIsJoining(true);
    setError(null);

    const errorHandler = (error: { message: string }) => {
      addLog(`Join game error: ${error.message}`);
      setError(error.message);
      setIsJoining(false);
    };

    const timeout = setTimeout(() => {
      const msg = 'Join game timeout - server not responding';
      addLog(msg);
      setError(msg);
      socket.off('error', errorHandler);
      setIsJoining(false);
    }, 10000);

    socket.on('error', errorHandler);

    socket.emit('joinGame', { moneyLevel }, (response: { error?: string }) => {
      clearTimeout(timeout);
      
      if (response?.error) {
        addLog(`Server error: ${response.error}`);
        setError(response.error);
        setIsJoining(false);
        return;
      }
      
      addLog('Join game request sent successfully, waiting for confirmation...');
    });
  };

  const handleStartGame = async (moneyLevel: number) => {
    addLog(`Attempting to start new game with level ${moneyLevel}`);
    
    if (!user?.isRegistered) {
      const msg = 'Please complete registration first!';
      addLog(msg);
      setError(msg);
      return;
    }

    if (!socket) {
      const msg = 'Connection error. Please refresh the page.';
      addLog(msg);
      setError(msg);
      return;
    }

    if (isJoining) {
      addLog('Already attempting to start a game');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      addLog('Checking wallet balance...');
      
      // Check if user has enough balance
      if (user.walletBalance < moneyLevel) {
        const msg = `You need at least ${moneyLevel} Birr to start this game`;
        addLog(msg);
        setError(msg);
        setIsJoining(false);
        return;
      }

      addLog('Emitting startGame event...');
      
      socket.emit('startGame', { moneyLevel }, (response: { error?: string, roomId?: string }) => {
        setIsJoining(false);
        
        if (response?.error) {
          addLog(`Start game error: ${response.error}`);
          setError(response.error);
          return;
        }

        if (response?.roomId) {
          addLog(`Game started successfully, redirecting to room ${response.roomId}`);
          navigate(`/game/${response.roomId}`);
        }
      });

      // Add timeout for start game
      const timeout = setTimeout(() => {
        const msg = 'Start game timeout - server not responding';
        addLog(msg);
        setError(msg);
        setIsJoining(false);
      }, 10000);

      return () => clearTimeout(timeout);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start game';
      addLog(`Error: ${errMsg}`);
      setError(errMsg);
      setIsJoining(false);
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

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 rounded-xl bg-red-500/20 border-red-500/50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-white">{error}</p>
          </div>
        </div>
      )}

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
            {moneyLevels.map((level) => {
              const game = games.find((g) => g.moneyLevel === level);
              const hasGame = !!game && !!game.roomId;
              return (
                <MoneyLevelCard
                  key={level}
                  moneyLevel={level}
                  playerCount={game?.playerCount || 0}
                  maxPlayers={game?.maxPlayers || 100}
                  status={game?.status || 'waiting'}
                  hasGame={hasGame}
                  // isJoining={isJoining}
                  onStart={hasGame ? undefined : () => handleStartGame(level)}
                  onJoin={hasGame ? () => handleJoinGame(level) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Debug Logs */}
      <div className="glass-card p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-2">Debug Logs</h3>
        <div className="max-h-40 overflow-y-auto text-xs space-y-1">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="text-white/70 font-mono">{log}</p>
            ))
          ) : (
            <p className="text-white/50">No logs yet</p>
          )}
        </div>
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