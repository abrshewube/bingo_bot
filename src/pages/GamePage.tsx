import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import BingoCard from '../components/BingoCard';
import BallDisplay from '../components/BallDisplay';
import { ArrowLeft, Users, Clock, Trophy } from 'lucide-react';

interface GameData {
  roomId: string;
  moneyLevel: number;
  status: 'waiting' | 'playing' | 'finished';
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
  calledNumbers: number[];
  currentNumber: number | null;
  userCard: number[][] | null;
  userMarkedNumbers: number[];
  winner: any;
  players: any[];
}

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadGameData();
      joinRoom();
    }
  }, [roomId]);

  useEffect(() => {
    if (socket) {
      socket.on('roomJoined', handleRoomJoined);
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('gameStarting', handleGameStarting);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('numberMarked', handleNumberMarked);
      socket.on('gameEnded', handleGameEnded);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('playerJoined');
        socket.off('gameStarting');
        socket.off('gameStarted');
        socket.off('numberCalled');
        socket.off('numberMarked');
        socket.off('gameEnded');
        socket.off('error');
      };
    }
  }, [socket]);

  const loadGameData = async () => {
    try {
      if (roomId) {
        const data = await gameService.getGameDetails(roomId);
        setGameData(data);
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (socket && roomId) {
      socket.emit('joinRoom', { roomId });
    }
  };

  const handleRoomJoined = (data: any) => {
    console.log('Joined room:', data.roomId);
  };

  const handlePlayerJoined = (data: any) => {
    setGameData(prev => prev ? {
      ...prev,
      playerCount: data.playerCount,
      players: data.players
    } : null);
  };

  const handleGameStarting = (data: any) => {
    setCountdown(data.countdown);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev > 1) {
          return prev - 1;
        } else {
          clearInterval(timer);
          return null;
        }
      });
    }, 1000);
  };

  const handleGameStarted = (data: any) => {
    setGameData(prev => prev ? {
      ...prev,
      status: 'playing',
      calledNumbers: data.calledNumbers
    } : null);
    setCountdown(null);
  };

  const handleNumberCalled = (data: any) => {
    setIsAnimating(true);
    setGameData(prev => prev ? {
      ...prev,
      currentNumber: data.number,
      calledNumbers: data.calledNumbers
    } : null);

    // Play number announcement (text-to-speech)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`${data.number}`);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      speechSynthesis.speak(utterance);
    }

    setTimeout(() => setIsAnimating(false), 2000);
  };

  const handleNumberMarked = (data: any) => {
    console.log('Number marked:', data.number);
  };

  const handleGameEnded = (data: any) => {
    setGameData(prev => prev ? {
      ...prev,
      status: 'finished',
      winner: data.winner
    } : null);

    // Show winner announcement
    setTimeout(() => {
      alert(data.message);
      navigate('/');
    }, 3000);
  };

  const handleError = (error: any) => {
    alert(error.message);
  };

  const handleNumberClick = (number: number) => {
    if (socket && roomId && gameData?.status === 'playing') {
      socket.emit('markNumber', { roomId, number });
      
      // Optimistically update UI
      setGameData(prev => prev ? {
        ...prev,
        userMarkedNumbers: [...prev.userMarkedNumbers, number]
      } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Game Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold text-white">
          {gameData.moneyLevel} Birr Game
        </h1>
      </div>

      {/* Game Status */}
      <div className="glass-card p-4 rounded-xl">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Users className="mx-auto mb-1 text-blue-400" size={20} />
            <p className="text-white font-bold">{gameData.playerCount}</p>
            <p className="text-white/60 text-xs">Players</p>
          </div>
          <div>
            <Trophy className="mx-auto mb-1 text-yellow-400" size={20} />
            <p className="text-white font-bold">
              {Math.floor(gameData.moneyLevel * gameData.playerCount * 0.8)}
            </p>
            <p className="text-white/60 text-xs">Prize Pool</p>
          </div>
          <div>
            <Clock className="mx-auto mb-1 text-green-400" size={20} />
            <p className="text-white font-bold">
              {gameData.status === 'waiting' ? 'Waiting' : 
               gameData.status === 'playing' ? 'Playing' : 'Finished'}
            </p>
            <p className="text-white/60 text-xs">Status</p>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {countdown && (
        <div className="glass-card p-6 rounded-xl text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Game Starting In</h2>
          <div className="text-6xl font-bold text-yellow-400 animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Ball Display */}
      {gameData.status === 'playing' && (
        <div className="glass-card p-6 rounded-xl text-center">
          <h3 className="text-lg font-bold text-white mb-4">Current Number</h3>
          <BallDisplay 
            currentNumber={gameData.currentNumber} 
            isAnimating={isAnimating}
          />
          <p className="text-white/80 text-sm mt-2">
            Numbers Called: {gameData.calledNumbers.length}
          </p>
        </div>
      )}

      {/* Bingo Card */}
      {gameData.userCard && (
        <div className="flex justify-center">
          <BingoCard
            card={gameData.userCard}
            markedNumbers={gameData.userMarkedNumbers}
            onNumberClick={handleNumberClick}
            calledNumbers={gameData.calledNumbers}
          />
        </div>
      )}

      {/* Called Numbers */}
      {gameData.calledNumbers.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3">Called Numbers</h3>
          <div className="grid grid-cols-10 gap-2">
            {gameData.calledNumbers.map((number) => (
              <div
                key={number}
                className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
              >
                {number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Winner Announcement */}
      {gameData.winner && (
        <div className="glass-card p-6 rounded-xl text-center border-2 border-yellow-400">
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎉 Winner!</h2>
          <p className="text-white text-lg">
            {gameData.winner.firstName} wins {gameData.winner.prizeMoney} Birr!
          </p>
        </div>
      )}
    </div>
  );
};

export default GamePage;