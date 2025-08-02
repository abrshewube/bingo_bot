import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import BingoCard from '../components/BingoCard';
import BallDisplay from '../components/BallDisplay';
import CartelaSelector from '../components/CartelaSelector';
import ExitConfirmationModal from '../components/ExitConfirmationModal';
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
  const [joinCountdown, setJoinCountdown] = useState<number | null>(null);
  
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  // Get money level from location state or default
  const moneyLevel = location.state?.moneyLevel || 10;

  useEffect(() => {
    if (roomId) {
      loadGameData();
      joinRoom();
    }
  }, [roomId]);

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

  // Join countdown effect
  useEffect(() => {
    if (joinCountdown && joinCountdown > 0) {
      const interval = setInterval(() => {
        setJoinCountdown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            return null;
          }
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [joinCountdown]);

  useEffect(() => {
    if (socket) {
      socket.on('roomJoined', handleRoomJoined);
      socket.on('gameJoined', handleGameJoined);
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('playerLeft', handlePlayerLeft);
      socket.on('cartelaSelected', handleCartelaSelected);
      socket.on('gameCountdown', handleGameCountdown);
      socket.on('gameStarted', handleGameStarted);
      socket.on('numberCalled', handleNumberCalled);
      socket.on('numberMarked', handleNumberMarked);
      socket.on('bingoValidated', handleBingoValidated);
      socket.on('bingoRejected', handleBingoRejected);
      socket.on('gameEnded', handleGameEnded);
      socket.on('gameMessage', handleGameMessage);
      socket.on('error', handleError);

      return () => {
        socket.off('roomJoined');
        socket.off('gameJoined');
        socket.off('playerJoined');
        socket.off('playerLeft');
        socket.off('cartelaSelected');
        socket.off('gameCountdown');
        socket.off('gameStarted');
        socket.off('numberCalled');
        socket.off('numberMarked');
        socket.off('bingoValidated');
        socket.off('bingoRejected');
        socket.off('gameEnded');
        socket.off('gameMessage');
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
    // Don't join automatically - user must click join button
  };

  const handleJoinGameWithCartela = () => {
    if (!selectedCartela || !userCard) return;
    
    // Check if the selected cartela is already taken by someone else
    if (takenCartelas.includes(selectedCartela)) {
      // Check if it's the current user's cartela
      const isCurrentUserCartela = gameData?.players?.some(p => 
        p.telegramId === user?.telegramId && p.cartelaNumber === selectedCartela
      );
      
      if (!isCurrentUserCartela) {
        alert(`Cartela number ${selectedCartela} is already taken by another player. Please select a different cartela.`);
        return;
      }
    }
    
    setIsJoining(true);
    if (socket && roomId) {
      socket.emit('joinGame', { 
        roomId, 
        cartelaNumber: selectedCartela,
        card: userCard 
      });
    }
  };

  const handleGameJoined = (data: any) => {
    console.log('Game joined:', data);
    setIsJoining(false);
    setShowCartelaSelector(false);
  };

  const handleBackToHome = () => {
    if (gameData?.status === 'playing' || (gameData?.status === 'waiting' && !showCartelaSelector)) {
      setShowExitModal(true);
    } else {
      // If in cartela selection, go back to home
      // If in waiting room, go back to cartela selection
      if (showCartelaSelector) {
        navigate('/');
      } else {
        setShowCartelaSelector(true);
      }
    }
  };

  const handleExitConfirm = () => {
    if (socket && roomId && gameData?.status === 'waiting' && !showCartelaSelector) {
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
      
      // Start join countdown if game is waiting and we have enough players
      if (data.gameState.status === 'waiting' && data.gameState.playerCount >= data.gameState.minPlayers) {
        setJoinCountdown(15); // 15 seconds to join
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
    
    // If this is the current user joining, hide cartela selector and load their card
    if (data.players.some((p: any) => p.telegramId === user?.telegramId)) {
      setShowCartelaSelector(false);
      // Load user's card data
      loadUserGameData();
    }
    
    // Start join countdown if we have enough players and game is waiting
    if (data.playerCount >= (gameData?.minPlayers || 10) && gameData?.status === 'waiting') {
      setJoinCountdown(15); // 15 seconds to join
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

  const handleCartelaSelected = (data: any) => {
    console.log('Cartela selected:', data);
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
    setJoinCountdown(null);
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
    console.log('Number called:', data);
    setCurrentBallNumber(data.number);
    setIsAnimating(true);
    
    // Update called numbers immediately
    setGameData(prev => prev ? {
      ...prev,
      calledNumbers: [...prev.calledNumbers, data.number].filter((n, i, arr) => arr.indexOf(n) === i),
      gameProgress: data.gameProgress || 0
    } : null);
    
    // Play number announcement (text-to-speech)
    if ('speechSynthesis' in window) {
      const letter = data.letter || getBallLetter(data.number);
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

  const handleGameMessage = (data: any) => {
    setGameMessage(data.message);
    // Clear message after 3 seconds
    setTimeout(() => {
      setGameMessage(null);
    }, 3000);
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

  // Show cartela selector if game hasn't started and user hasn't joined yet
  if (showCartelaSelector && gameData?.status !== 'playing') {
    return (
      <CartelaSelector
        onCartelaSelect={handleCartelaSelect}
        onJoinGame={handleJoinGameWithCartela}
        onBack={() => navigate('/')}
        moneyLevel={moneyLevel}
        isJoining={isJoining}
        takenCartelas={takenCartelas}
        currentUserCartela={selectedCartela}
        roomId={roomId}
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

      {/* Join Countdown */}
      {joinCountdown && joinCountdown > 0 && (
        <div className="glass-card p-6 rounded-xl text-center border-2 border-blue-400">
          <h2 className="text-2xl font-bold text-white mb-2">⏰ Time Left to Join</h2>
          <div className="text-6xl font-bold text-blue-400 animate-pulse">
            {joinCountdown.toString().padStart(2, '0')}
          </div>
          <p className="text-white/80 mt-2">
            Game will start automatically when countdown reaches zero
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
          <div className="mt-4 space-y-2">
            <p className="text-white/80 text-sm">
              Numbers Called: {gameData.calledNumbers.length}/75
            </p>
            {gameData.gameProgress && (
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${gameData.gameProgress}%` }}
                />
              </div>
            )}
          </div>
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
        <>
          {/* Game Message */}
          {gameMessage && (
            <div className="glass-card p-4 rounded-xl text-center border-2 border-yellow-400 animate-pulse">
              <p className="text-yellow-400 font-bold text-lg">{gameMessage}</p>
            </div>
          )}
          
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-2">🎯 How to Play</h3>
          <div className="text-white/80 text-sm space-y-1">
            <p>• Watch for called numbers and manually mark them on your card</p>
            <p>• Called numbers are displayed with B/I/N/G/O prefixes (e.g., B12, I19, N35)</p>
            <p>• Complete any line (horizontal, vertical, diagonal) or four corners</p>
            <p>• Click "BINGO!" to check if you have a winning pattern</p>
            <p>• The system will validate your claim and award prizes if correct</p>
          </div>
        </div>
        </>
      )}

      {/* Called Numbers History */}
      {gameData.calledNumbers && gameData.calledNumbers.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3">
            📋 Called Numbers ({gameData.calledNumbers.length}/75)
          </h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-10 gap-1">
              {gameData.calledNumbers.slice().reverse().map((number, index) => {
                const letter = getBallLetter(number);
                const getBallColor = (num: number) => {
                  if (num >= 1 && num <= 15) return 'bg-red-500';
                  if (num >= 16 && num <= 30) return 'bg-blue-500';
                  if (num >= 31 && num <= 45) return 'bg-green-500';
                  if (num >= 46 && num <= 60) return 'bg-yellow-500';
                  if (num >= 61 && num <= 75) return 'bg-purple-500';
                  return 'bg-gray-500';
                };
                
                return (
                  <div
                    key={`${number}-${index}`}
                    className={`w-10 h-10 text-white rounded-full flex flex-col items-center justify-center text-xs font-bold ${getBallColor(number)} ${
                      index === 0 ? 'ring-2 ring-white animate-pulse' : ''
                    }`}
                  >
                    <div className="text-xs leading-none">{letter}</div>
                    <div className="text-xs leading-none font-bold">{number}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {gameData.calledNumbers.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-white/60 text-sm">
                Latest numbers shown first • {gameData.calledNumbers.length} total called
              </p>
            </div>
          )}
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