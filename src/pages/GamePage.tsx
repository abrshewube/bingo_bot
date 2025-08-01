import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import BingoCard from '../components/BingoCard';
import CartelaSelector from '../components/CartelaSelector';
import BallDisplay from '../components/BallDisplay';
import { ArrowLeft, Users, Clock, Trophy, AlertTriangle, LogOut, Eye, Check } from 'lucide-react';

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
  userCartelaNumber?: number;
  userHasJoined?: boolean;
  winner: any;
  winners?: any[];
  players: any[];
  totalPot: number;
  gameDuration?: any;
}

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentBallNumber, setCurrentBallNumber] = useState<number | null>(null);
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [showCartelaPreview, setShowCartelaPreview] = useState(false);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [previewCard, setPreviewCard] = useState<number[][] | null>(null);
  const [takenCartelas, setTakenCartelas] = useState<number[]>([]);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [isSelectingCartela, setIsSelectingCartela] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadGameData();
    }
  }, [roomId]);

  useEffect(() => {
    if (isConnected && socket && roomId) {
      joinRoom();
    }
  }, [isConnected, socket, roomId]);

  useEffect(() => {
    if (socket) {
      socket.on('roomJoined', handleRoomJoined);
      socket.on('cartelaSelected', handleCartelaSelected);
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('playerLeft', handlePlayerLeft);
      socket.on('gameCountdown', handleGameCountdown);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('numberMarked', handleNumberMarked);
      socket.on('potentialWinners', handlePotentialWinners);
      socket.on('winClaimed', handleWinClaimed);
      socket.on('gameEnded', handleGameEnded);
      socket.on('gameLeft', handleGameLeft);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('cartelaSelected');
        socket.off('playerJoined');
        socket.off('playerLeft');
        socket.off('gameCountdown');
        socket.off('gameStarted');
        socket.off('numberCalled');
        socket.off('numberMarked');
        socket.off('potentialWinners');
        socket.off('winClaimed');
        socket.off('gameEnded');
        socket.off('gameLeft');
        socket.off('error');
      };
    }
  }, [socket]);

  // Game timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameData?.status === 'playing') {
      interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameData?.status]);

  const loadGameData = async () => {
    try {
      if (roomId) {
        const data = await gameService.getGameDetails(roomId);
        setGameData(data);
        
        // Check if user needs to select cartela
        if (data.status === 'waiting' && !data.userCard) {
          setShowCartelaSelector(true);
        }
        
        // Update taken cartelas
        if (data.players) {
          const taken = data.players.map((p: any) => p.cartelaNumber).filter((num: any) => num != null);
          setTakenCartelas(taken);
        }
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (socket && roomId && isConnected) {
      console.log('Joining room:', roomId);
      socket.emit('joinRoom', { roomId });
    }
  };

  const handleRoomJoined = (data: any) => {
    console.log('Joined room:', data.roomId);
    if (data.gameState) {
      console.log('Received game state:', data.gameState);
      setGameData(prev => prev ? {
        ...prev,
        ...data.gameState
      } : null);
    }
  };

  const handleCartelaSelected = (data: any) => {
    console.log('Cartela selected:', data);
    setIsSelectingCartela(false);
    
    // Update taken cartelas
    if (data.players) {
      const taken = data.players.map((p: any) => p.cartelaNumber).filter((num: any) => num != null);
      setTakenCartelas(taken);
    }
  };

  const handlePlayerJoined = (data: any) => {
    console.log('Player joined:', data);
    setGameData(prev => prev ? {
      ...prev,
      playerCount: data.playerCount,
      players: data.players,
      totalPot: data.totalPot
    } : null);
    
    // Update taken cartelas
    if (data.players) {
      const taken = data.players.map((p: any) => p.cartelaNumber).filter((num: any) => num != null);
      setTakenCartelas(taken);
    }
  };

  const handlePlayerLeft = (data: any) => {
    console.log('Player left:', data);
    setGameData(prev => prev ? {
      ...prev,
      playerCount: data.playerCount,
      players: data.players,
      totalPot: data.totalPot
    } : null);
    
    // Update taken cartelas
    if (data.players) {
      const taken = data.players.map((p: any) => p.cartelaNumber).filter((num: any) => num != null);
      setTakenCartelas(taken);
    }
  };

  const handleGameCountdown = (data: any) => {
    console.log('Game countdown received:', data);
    setCountdown(data.countdown);
  };

  const handleGameStarted = (data: any) => {
    console.log('Game started:', data);
    setGameData(prev => prev ? {
      ...prev,
      status: 'playing',
      calledNumbers: data.calledNumbers,
      totalPot: data.totalPot,
      gameDuration: data.gameDuration
    } : null);
    setCountdown(null);
    setGameTime(0);
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

  const handlePotentialWinners = (data: any) => {
    console.log('Potential winners:', data);
  };

  const handleWinClaimed = (data: any) => {
    console.log('Win claimed:', data);
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

  const handleGameLeft = (data: any) => {
    alert(data.message);
    navigate('/');
  };

  const handleError = (error: any) => {
    alert(error.message);
  };

  const handleCartelaSelect = async (cartelaNumber: number) => {
    if (!socket || !roomId || !isConnected) {
      alert('Connection error. Please refresh the page.');
      return;
    }

    setIsSelectingCartela(true);
    try {
      // First, get a preview of the card
      const response = await gameService.selectCartela(roomId, cartelaNumber);
      setPreviewCard(response.card);
      setSelectedCartela(cartelaNumber);
      setShowCartelaSelector(false);
      setShowCartelaPreview(true);
    } catch (error: any) {
      alert(error.message || 'Failed to select cartela');
    } finally {
      setIsSelectingCartela(false);
    }
  };

  const handleConfirmCartela = () => {
    if (socket && roomId && selectedCartela && isConnected) {
      socket.emit('selectCartela', { roomId, cartelaNumber: selectedCartela });
      setShowCartelaPreview(false);
    }
  };

  const handleJoinGame = () => {
    if (socket && roomId && gameData?.userCard && isConnected) {
      socket.emit('joinGame', { roomId });
    }
  };

  const handleLeaveGame = () => {
    if (socket && roomId && gameData?.status === 'waiting' && isConnected) {
      socket.emit('leaveGame', { roomId });
    }
  };

  const handleNumberClick = (number: number) => {
    if (socket && roomId && gameData?.status === 'playing' && gameData.calledNumbers.includes(number) && isConnected) {
      socket.emit('markNumber', { roomId, number });
      
      // Optimistically update UI
      setGameData(prev => prev ? {
        ...prev,
        userMarkedNumbers: [...prev.userMarkedNumbers, number].filter((n, i, arr) => arr.indexOf(n) === i)
      } : null);
    }
  };

  const handleClaimWin = (pattern: string) => {
    if (socket && roomId && gameData?.status === 'playing' && isConnected) {
      socket.emit('claimWin', { roomId, winPattern: pattern });
    }
  };

  const handleBackClick = () => {
    if (gameData?.status === 'playing') {
      setShowExitWarning(true);
    } else {
      navigate('/');
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-card p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
          <p className="text-white/80 mb-4">Unable to connect to game server</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Retry Connection
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
          onClick={handleBackClick}
          className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold text-white">
          {gameData.moneyLevel} Birr Game
        </h1>
        {gameData.status === 'waiting' && (
          <button
            onClick={handleLeaveGame}
            className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            <span>Leave Game</span>
          </button>
        )}
      </div>

      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-xl max-w-md mx-4">
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">⚠️ Warning</h3>
              <p className="text-white/80 mb-6">
                Once you move out of the game, there is no refund.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Stay in Game
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Leave Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cartela Selector */}
      {showCartelaSelector && (
        <CartelaSelector
          onCartelaSelect={handleCartelaSelect}
          onCancel={() => navigate('/')}
          selectedCartela={selectedCartela}
          takenCartelas={takenCartelas}
          isLoading={isSelectingCartela}
        />
      )}

      {/* Cartela Preview */}
      {showCartelaPreview && previewCard && (
        <div className="glass-card p-6 rounded-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🎯 Your Cartela #{selectedCartela}</h2>
            <p className="text-white/80 text-sm">
              Preview your bingo card before confirming
            </p>
          </div>

          {/* Preview Card */}
          <div className="flex justify-center mb-6">
            <BingoCard
              card={previewCard}
              markedNumbers={[]}
              onNumberClick={() => {}}
              calledNumbers={[]}
              gameStatus="waiting"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowCartelaPreview(false);
                setShowCartelaSelector(true);
                setSelectedCartela(null);
                setPreviewCard(null);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Change Cartela
            </button>
            <button
              onClick={handleConfirmCartela}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              <Check size={16} />
              <span>Confirm & Join</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Status */}
      <div className="glass-card p-4 rounded-xl">
        <div className="grid grid-cols-4 gap-4 text-center">
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
               gameData.status === 'playing' ? formatTime(gameTime) : 'Finished'}
            </p>
            <p className="text-white/60 text-xs">Status</p>
          </div>
          <div>
            <div className="mx-auto mb-1 text-purple-400" style={{ width: '20px', height: '20px' }}>
              🎟️
            </div>
            <p className="text-white font-bold">
              {gameData.userCartelaNumber || '-'}
            </p>
            <p className="text-white/60 text-xs">Cartela</p>
          </div>
        </div>
      </div>

      {/* Join Game Button */}
      {gameData.status === 'waiting' && gameData.userCard && !showCartelaSelector && !showCartelaPreview && !gameData.userHasJoined && (
        <div className="glass-card p-4 rounded-xl text-center">
          <button
            onClick={handleJoinGame}
            className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-lg"
          >
            🎮 Join Game ({gameData.moneyLevel} Birr)
          </button>
          <p className="text-white/60 text-sm mt-2">
            ⚠️ Once you join, you cannot leave without losing your entry fee
          </p>
        </div>
      )}

      {/* Waiting for Game to Start */}
      {gameData.status === 'waiting' && gameData.userCard && gameData.userHasJoined && !showCartelaSelector && !showCartelaPreview && (
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-green-400 mb-2">
            <Check size={24} className="mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">✅ Joined Successfully!</h3>
          <p className="text-white/80 text-sm">
            Waiting for the game to start. You cannot leave now.
          </p>
        </div>
      )}

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
          {gameData.gameDuration && (
            <p className="text-white/60 text-xs mt-1">
              Game Time: {formatTime(gameTime)} / ~{Math.round(gameData.gameDuration.estimatedDuration / 1000)}s
            </p>
          )}
        </div>
      )}

      {/* Bingo Card */}
      {gameData.userCard && !showCartelaSelector && !showCartelaPreview && (
        <div className="flex justify-center">
          <BingoCard
            card={gameData.userCard}
            markedNumbers={gameData.userMarkedNumbers}
            onNumberClick={handleNumberClick}
            calledNumbers={gameData.calledNumbers}
            onClaimWin={handleClaimWin}
            gameStatus={gameData.status}
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
      {(gameData.winners || gameData.winner) && (
        <div className="glass-card p-6 rounded-xl text-center border-2 border-yellow-400">
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎉 Winner{gameData.winners && gameData.winners.length > 1 ? 's' : ''}!</h2>
          {gameData.winners ? (
            <div className="space-y-2">
              {gameData.winners.map((winner: any, index: number) => (
                <p key={index} className="text-white text-lg">
                  {winner.firstName} wins {winner.prizeMoney} Birr! ({winner.winPattern})
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