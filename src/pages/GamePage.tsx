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
  winners?: any[];
  players: any[];
  totalPot: number;
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
  const [currentBallNumber, setCurrentBallNumber] = useState<number | null>(null);

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
      socket.on('gameCountdown', handleGameCountdown);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('numberMarked', handleNumberMarked);
      socket.on('gameEnded', handleGameEnded);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('playerJoined');
        socket.off('gameCountdown');
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
      players: data.players,
      totalPot: data.totalPot
    } : null);
  };

  const handleGameCountdown = (data: any) => {
    setCountdown(data.countdown);
  };

  const handleGameStarted = (data: any) => {
    setGameData(prev => prev ? {
      ...prev,
      status: 'playing',
      calledNumbers: data.calledNumbers,
      totalPot: data.totalPot
    } : null);
    setCountdown(null);
  };

  const handleNumberCalled = (data: any) => {
    setCurrentBallNumber(data.number);
    setIsAnimating(true);
    
    // Play number announcement (text-to-speech)
    if ('speechSynthesis' in window) {
      const letter = getBallLetter(data.number);
      const utterance = new SpeechSynthesisUtterance(`${letter} ${data.number}`);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleBallAnimationComplete = () => {
    setIsAnimating(false);
    setGameData(prev => prev ? {
      ...prev,
      currentNumber: currentBallNumber,
      calledNumbers: [...prev.calledNumbers, currentBallNumber!].filter((n, i, arr) => arr.indexOf(n) === i)
    } : null);
    setCurrentBallNumber(null);
  };

  const handleNumberMarked = (data: any) => {
    console.log('Number marked:', data.number);
  };

  const handleGameEnded = (data: any) => {
    setGameData(prev => prev ? {
      ...prev,
      status: 'finished',
      winner: data.winners?.[0] || data.winner,
      winners: data.winners
    } : null);

    // Show winner announcement
    setTimeout(() => {
      if (data.winners && data.winners.length > 0) {
        const isWinner = data.winners.some((w: any) => w.telegramId === user?.telegramId);
        if (isWinner) {
          alert(`🎉 Congratulations! You won ${data.winners.find((w: any) => w.telegramId === user?.telegramId)?.prizeMoney} Birr!`);
        } else {
          alert(data.message);
        }
      } else {
        alert(data.message);
      }
      navigate('/');
    }, 5000);
  };

  const handleError = (error: any) => {
    alert(error.message);
  };

  const handleNumberClick = (number: number) => {
    if (socket && roomId && gameData?.status === 'playing' && gameData.calledNumbers.includes(number)) {
      socket.emit('markNumber', { roomId, number });
      
      // Optimistically update UI
      setGameData(prev => prev ? {
        ...prev,
        userMarkedNumbers: [...prev.userMarkedNumbers, number].filter((n, i, arr) => arr.indexOf(n) === i)
      } : null);
    }
  };

  const getBallLetter = (number: number) => {
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
    return '';
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
              {Math.floor(gameData.totalPot * 0.8)}
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
      {countdown && countdown > 0 && (
        <div className="glass-card p-6 rounded-xl text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Game Starting In</h2>
          <div className="text-6xl font-bold text-yellow-400 animate-pulse">
            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
          <p className="text-white/80 mt-2">
            Waiting for more players... ({gameData.playerCount}/{gameData.minPlayers} minimum)
          </p>
        </div>
      )}

      {/* Ball Display */}
      {gameData.status === 'playing' && (
        <div className="glass-card p-6 rounded-xl text-center">
          <h3 className="text-lg font-bold text-white mb-4">Current Number</h3>
          <BallDisplay 
            currentNumber={currentBallNumber || gameData.currentNumber} 
            isAnimating={isAnimating}
            onAnimationComplete={handleBallAnimationComplete}
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

      {/* Game Instructions */}
      {gameData.status === 'waiting' && gameData.userCard && (
        <div className="glass-card p-4 rounded-xl text-center">
          <p className="text-white/80">
            Your bingo card is ready! The game will start when we have enough players.
          </p>
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
      {(gameData.winners || gameData.winner) && (
        <div className="glass-card p-6 rounded-xl text-center border-2 border-yellow-400">
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎉 Winner{gameData.winners && gameData.winners.length > 1 ? 's' : ''}!</h2>
          {gameData.winners ? (
            <div className="space-y-2">
              {gameData.winners.map((winner: any, index: number) => (
                <p key={index} className="text-white text-lg">
                  {winner.firstName} wins {winner.prizeMoney} Birr!
                </p>
              ))}
            </div>
          ) : gameData.winner && (
            <p className="text-white text-lg">
              {gameData.winner.firstName} wins {gameData.winner.prizeMoney} Birr!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePage;