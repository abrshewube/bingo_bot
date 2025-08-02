import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import BingoCard from '../components/BingoCard';
import BallDisplay from '../components/BallDisplay';
import CartelaSelector from '../components/CartelaSelector';
import ExitConfirmationModal from '../components/ExitConfirmationModal';
import { ArrowLeft, Users, Clock, Trophy, Crown, X } from 'lucide-react';

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
  takenCartelas?: number[];
}

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentBallNumber, setCurrentBallNumber] = useState<number | null>(null);
  const [showCartelaSelector, setShowCartelaSelector] = useState(true);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [userCard, setUserCard] = useState<number[][] | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameTimeLeft, setGameTimeLeft] = useState<number | null>(null);
  const [takenCartelas, setTakenCartelas] = useState<number[]>([]);
  const [cartelaOwners, setCartelaOwners] = useState<{[key: number]: string}>({});
  
  // Get money level from location state or default
  const moneyLevel = location.state?.moneyLevel || 10;

  useEffect(() => {
    if (roomId && !showCartelaSelector) {
      loadGameData();
      joinRoom();
    }
  }, [roomId, showCartelaSelector]);

  // Game timer effect - 10 minutes countdown
  useEffect(() => {
    if (gameStartTime && gameData?.status === 'playing') {
      const interval = setInterval(() => {
        const elapsed = Date.now() - gameStartTime.getTime();
        const remaining = Math.max(0, 600000 - elapsed); // 10 minutes max
        setGameTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameStartTime, gameData?.status]);

  useEffect(() => {
    if (socket) {
      socket.on('roomJoined', handleRoomJoined);
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('playerLeft', handlePlayerLeft);
      socket.on('gameCountdown', handleGameCountdown);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('numberMarked', handleNumberMarked);
      socket.on('bingoValidated', handleBingoValidated);
      socket.on('bingoRejected', handleBingoRejected);
      socket.on('gameEnded', handleGameEnded);
      socket.on('cartelaSelected', handleCartelaSelected);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('playerJoined');
        socket.off('playerLeft');
        socket.off('gameCountdown');
        socket.off('gameStarted');
        socket.off('numberCalled');
        socket.off('numberMarked');
        socket.off('bingoValidated');
        socket.off('bingoRejected');
        socket.off('gameEnded');
        socket.off('cartelaSelected');
        socket.off('error');
      };
    }
  }, [socket]);

  const checkBingoPattern = (card: number[][], markedNumbers: number[]): boolean => {
    const marked = new Set([...markedNumbers, 0]); // Include FREE space
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      let count = 0;
      for (let col = 0; col < 5; col++) {
        if (marked.has(card[col][row])) count++;
      }
      if (count === 5) return true;
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
      let count = 0;
      for (let row = 0; row < 5; row++) {
        if (marked.has(card[col][row])) count++;
      }
      if (count === 5) return true;
    }
    
    // Check diagonals
    let diagonal1 = 0, diagonal2 = 0;
    for (let i = 0; i < 5; i++) {
      if (marked.has(card[i][i])) diagonal1++;
      if (marked.has(card[i][4-i])) diagonal2++;
    }
    if (diagonal1 === 5 || diagonal2 === 5) return true;
    
    // Check four corners
    const corners = [card[0][0], card[4][0], card[0][4], card[4][4]];
    const markedCorners = corners.filter(corner => marked.has(corner)).length;
    if (markedCorners === 4) return true;
    
    return false;
  };

  const handleCartelaSelect = (cartelaNumber: number, card: number[][]) => {
    setSelectedCartela(cartelaNumber);
    setUserCard(card);
    
    // Emit cartela selection for real-time updates
    if (socket && roomId) {
      socket.emit('selectCartela', {
        roomId,
        cartelaNumber,
        card
      });
    }
  };

  const handleJoinGameWithCartela = () => {
    if (!selectedCartela || !userCard) return;
    
    setIsJoining(true);
    if (socket && roomId) {
      socket.emit('joinGame', { 
        roomId, 
        cartelaNumber: selectedCartela,
        card: userCard 
      });
    }
  };

  const handleBackToHome = () => {
    if (gameData?.status === 'playing') {
      setShowExitModal(true);
    } else {
      navigate('/');
    }
  };

  const handleExitConfirm = () => {
    if (socket && roomId && gameData?.status !== 'playing') {
      socket.emit('leaveGame', { roomId });
    }
    navigate('/');
  };

  const loadGameData = async () => {
    try {
      if (roomId) {
        const data = await gameService.getGameDetails(roomId);
        setGameData(data);
        
        // Set user's card and marked numbers if available
        if (data.userCard) {
          setUserCard(data.userCard);
        }
        if (data.userMarkedNumbers) {
          setGameData(prev => prev ? {
            ...prev,
            userMarkedNumbers: data.userMarkedNumbers
          } : null);
        }
        if (data.userCartelaNumber) {
          setSelectedCartela(data.userCartelaNumber);
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
    if (socket && roomId) {
      console.log('Joining room:', roomId);
      socket.emit('joinRoom', { roomId });
    }
  };

  const handleRoomJoined = (data: any) => {
    console.log('Joined room:', data.roomId);
    setIsJoining(false);
    if (data.gameState) {
      console.log('Received game state:', data.gameState);
      setGameData(prev => prev ? {
        ...prev,
        ...data.gameState
      } : null);
      setTakenCartelas(data.gameState.takenCartelas || []);
      
      // If game is already playing, hide cartela selector
      if (data.gameState.status === 'playing') {
        setShowCartelaSelector(false);
      }
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
    setTakenCartelas(data.takenCartelas || []);
    
    // Update cartela owners from game data
    if (data.players) {
      const owners: {[key: number]: string} = {};
      data.players.forEach((player: any) => {
        if (player.cartelaNumber) {
          owners[player.cartelaNumber] = player.firstName;
        }
      });
      setCartelaOwners(owners);
    }
    
    // If this is the current user joining, hide cartela selector and load their card
    if (data.players.some((p: any) => p.telegramId === user?.telegramId)) {
      setShowCartelaSelector(false);
      // Load user's card data
      loadUserGameData();
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
    setTakenCartelas(data.takenCartelas || []);
  };

  const handleGameCountdown = (data: any) => {
    console.log('Game countdown received:', data);
    setCountdown(data.countdown);
  };

  const handleGameStarted = (data: any) => {
    console.log('Game started:', data);
    setGameStartTime(new Date(data.gameStartTime || Date.now()));
    setGameData(prev => prev ? {
      ...prev,
      status: 'playing',
      calledNumbers: data.calledNumbers,
      totalPot: data.totalPot
    } : null);
    setCountdown(null);
    setShowCartelaSelector(false); // Hide cartela selector when game starts
    
    // Load user's card and marked numbers
    loadUserGameData();
  };

  const loadUserGameData = async () => {
    try {
      if (roomId && user?.telegramId) {
        const data = await gameService.getGameDetails(roomId);
        if (data) {
          // Set user's card and marked numbers
          if (data.userCard) {
            setUserCard(data.userCard);
          }
          if (data.userMarkedNumbers) {
            setGameData(prev => prev ? {
              ...prev,
              userMarkedNumbers: data.userMarkedNumbers
            } : null);
          }
          if (data.userCartelaNumber) {
            setSelectedCartela(data.userCartelaNumber);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user game data:', error);
    }
  };

  const handleNumberCalled = (data: any) => {
    console.log('Number called:', data.number);
    setCurrentBallNumber(data.number);
    setIsAnimating(true);
    
    // Update called numbers immediately
    setGameData(prev => prev ? {
      ...prev,
      calledNumbers: [...prev.calledNumbers, data.number].filter((n, i, arr) => arr.indexOf(n) === i)
    } : null);
    
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
      currentNumber: currentBallNumber
    } : null);
    setCurrentBallNumber(null);
  };

  const handleNumberMarked = (data: any) => {
    console.log('Number marked:', data.number);
    // Update the user's marked numbers when server confirms
    setGameData(prev => prev ? {
      ...prev,
      userMarkedNumbers: [...prev.userMarkedNumbers, data.number].filter((n, i, arr) => arr.indexOf(n) === i)
    } : null);
  };

  const handleBingoClick = () => {
    if (socket && roomId) {
      console.log('Checking bingo with numbers:', gameData?.userMarkedNumbers);
      socket.emit('claimBingo', { 
        roomId, 
        markedNumbers: gameData?.userMarkedNumbers || [] 
      });
    }
  };

  const handleBingoValidated = (data: any) => {
    console.log('Bingo validated:', data);
    // Show success message
    alert('🎉 BINGO! Your claim is being validated...');
    // The game will end automatically from the server
  };

  const handleBingoRejected = (data: any) => {
    alert(`Bingo rejected: ${data.reason}`);
  };

  const handleCartelaSelected = (data: any) => {
    console.log('Cartela selected by another player:', data);
    // Update taken cartelas when another player selects a cartela
    if (data.takenCartelas) {
      setTakenCartelas(data.takenCartelas);
    }
    
    // Update cartela owners
    if (data.telegramId && data.cartelaNumber) {
      setCartelaOwners(prev => ({
        ...prev,
        [data.cartelaNumber]: data.firstName || 'Unknown Player'
      }));
    }
  };

  const handleGameEnded = (data: any) => {
    setGameStartTime(null);
    setGameTimeLeft(null);
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
          const winner = data.winners.find((w: any) => w.telegramId === user?.telegramId);
          alert(`🎉 Congratulations! You won ${winner?.prizeMoney} Birr!`);
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
    setIsJoining(false);
  };

  const handleNumberClick = (number: number) => {
    console.log('Number clicked:', number, {
      roomId,
      gameStatus: gameData?.status,
      calledNumbers: gameData?.calledNumbers,
      isCalled: gameData?.calledNumbers?.includes(number)
    });
    
    if (socket && roomId && gameData?.status === 'playing' && gameData.calledNumbers.includes(number)) {
      console.log('Emitting markNumber for:', number);
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

  // Show cartela selector first (only if game hasn't started and user hasn't joined yet)
  if (showCartelaSelector && gameData?.status !== 'playing') {
    // Always show cartela selector if game hasn't started, regardless of whether user is in game
    return (
      <CartelaSelector
        onCartelaSelect={handleCartelaSelect}
        onJoinGame={handleJoinGameWithCartela}
        onBack={() => navigate('/')}
        moneyLevel={moneyLevel}
        isJoining={isJoining}
        takenCartelas={takenCartelas}
        currentUserCartela={selectedCartela}
        cartelaOwners={cartelaOwners}
      />
    );
  }

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
      <ExitConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleExitConfirm}
        gameStarted={gameData?.status === 'playing'}
        entryFee={moneyLevel}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToHome}
          className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors"
          disabled={gameData.status === 'playing'}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">
            {gameData.moneyLevel} Birr Game
          </h1>
          {selectedCartela && (
            <p className="text-white/60 text-sm">Cartela #{selectedCartela}</p>
          )}
        </div>
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
        
        {/* Game Timer */}
        {gameTimeLeft !== null && gameData.status === 'playing' && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {Math.floor(gameTimeLeft / 60000)}:{((gameTimeLeft % 60000) / 1000).toFixed(0).padStart(2, '0')}
            </div>
            <p className="text-white/60 text-xs">Time Remaining</p>
          </div>
        )}
      </div>

      {/* Cartela Status Display */}
      {gameData.status === 'waiting' && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3">🎯 Cartela Status</h3>
          <div className="grid grid-cols-10 gap-1 mb-3">
            {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => {
              const isTaken = takenCartelas.includes(number);
              const isSelected = selectedCartela === number;
              const owner = cartelaOwners[number];
              
              return (
                <div
                  key={number}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded border transition-all duration-200 relative ${
                    isSelected 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 scale-110 shadow-lg' 
                      : isTaken 
                        ? 'bg-gradient-to-br from-red-500/30 to-red-600/30 text-white/60 border-red-500/50' 
                        : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 text-white border-gray-400/30'
                  }`}
                  title={owner ? `Taken by ${owner}` : isSelected ? 'Your cartela' : 'Available'}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 rounded-full p-0.5">
                      <Crown size={10} className="text-white" />
                    </div>
                  )}
                  {isTaken && !isSelected && (
                    <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 rounded-full p-0.5">
                      <X size={10} className="text-white" />
                    </div>
                  )}
                  <span className="text-xs">{number}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span className="text-white">Your Cartela</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500/50 mr-1"></div>
              <span className="text-white/70">Taken</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-500/30 mr-1"></div>
              <span className="text-white/70">Available</span>
            </div>
          </div>
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
        </div>
      )}

      {/* Bingo Card */}
      {userCard && gameData.status === 'playing' && (
        <div className="flex justify-center">
          <BingoCard
            card={userCard}
            markedNumbers={gameData.userMarkedNumbers}
            onNumberClick={handleNumberClick}
            calledNumbers={gameData.calledNumbers}
            currentNumber={gameData.currentNumber}
            isGameActive={gameData.status === 'playing'}
            showBingoButton={gameData.status === 'playing'}
            onBingoClick={handleBingoClick}
          />
        </div>
      )}

      {/* Game Instructions */}
      {gameData.status === 'waiting' && userCard && (
        <div className="glass-card p-4 rounded-xl text-center">
          <p className="text-white/80">
            Your cartela #{selectedCartela} is ready! The game will start when we have enough players.
          </p>
        </div>
      )}

      {/* Game Instructions for Playing */}
      {gameData.status === 'playing' && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-2">🎯 How to Play</h3>
          <div className="text-white/80 text-sm space-y-1">
            <p>• Watch for called numbers and manually mark them on your card</p>
            <p>• You must remember which numbers were called - they won't be highlighted</p>
            <p>• Complete any line (horizontal, vertical, diagonal) or four corners</p>
            <p>• Click "BINGO!" to check if you have a winning pattern</p>
            <p>• The system will validate your claim and award prizes if correct</p>
          </div>
        </div>
      )}

      {/* Called Numbers History */}
      {gameData.calledNumbers && gameData.calledNumbers.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3">📋 Called Numbers History ({gameData.calledNumbers.length})</h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-10 gap-2">
              {gameData.calledNumbers.map((number) => (
                <div
                  key={number}
                  className="w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold bg-blue-500"
                >
                  {number}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-white/60 text-sm">
              Scroll to see all called numbers.
            </p>
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