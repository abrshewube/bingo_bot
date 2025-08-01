import User from '../models/User.js';
import Game from '../models/Game.js';
import GameResult from '../models/GameResult.js';
import { generateBingoCard, generateCartela, checkBingo, checkWinPattern, generateRoomId, calculateGameDuration } from '../utils/bingoUtils.js';

class GameService {
  constructor(io) {
    this.io = io;
    this.gameTimers = new Map();
    this.numberCallingIntervals = new Map();
    this.gameDurationTimers = new Map();
  }

  async createGame(moneyLevel, creatorTelegramId) {
    const roomId = generateRoomId();
    
    // Get creator user
    const creator = await User.findOne({ telegramId: creatorTelegramId });
    if (!creator || !creator.isRegistered) {
      throw new Error('Creator not registered');
    }

    // Check if creator has enough balance
    if (creator.walletBalance < moneyLevel) {
      throw new Error('Insufficient balance');
    }

    // Deduct entry fee from creator's wallet
    creator.walletBalance -= moneyLevel;
    await creator.save();

    const game = new Game({
      roomId,
      moneyLevel,
      players: [],
      status: 'waiting'
    });
    
    await game.save();

    return game;
  }

  async selectCartela(roomId, telegramId, cartelaNumber) {
    const user = await User.findOne({ telegramId });
    if (!user || !user.isRegistered) {
      throw new Error('User not registered');
    }

    let game = await Game.findOne({ roomId });
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game already started');
    }

    // Check if user has enough balance
    if (user.walletBalance < game.moneyLevel) {
      throw new Error('Insufficient balance');
    }

    // Check if cartela number is valid (1-100)
    if (cartelaNumber < 1 || cartelaNumber > 100) {
      throw new Error('Invalid cartela number. Must be between 1 and 100.');
    }

    // Check if cartela is already taken
    const existingPlayer = game.players.find(p => p.cartelaNumber === cartelaNumber);
    if (existingPlayer) {
      throw new Error('Cartela already taken');
    }

    // Check if user already has a cartela
    const existingUser = game.players.find(p => p.telegramId === telegramId);
    if (existingUser) {
      // Remove existing player entry
      game.players = game.players.filter(p => p.telegramId !== telegramId);
    }

    // Generate card based on cartela number
    const card = generateCartela(cartelaNumber);

    // Add player with selected cartela (but not joined yet)
    game.players.push({
      userId: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      cartelaNumber,
      card,
      markedNumbers: [],
      hasWon: false,
      hasClaimedWin: false,
      hasJoined: false
    });

    await game.save();

    // Notify all players in the room
    this.io.to(roomId).emit('cartelaSelected', {
      roomId: roomId,
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      totalPot: game.moneyLevel * game.players.length,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName,
        cartelaNumber: p.cartelaNumber
      }))
    });

    return game;
  }

  async joinGame(roomId, telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user || !user.isRegistered) {
      throw new Error('User not registered');
    }

    let game = await Game.findOne({ roomId });
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'playing') {
      throw new Error('Game already started');
    }

    if (game.status === 'finished') {
      throw new Error('Game already finished');
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    const existingPlayer = game.players.find(p => p.telegramId === telegramId);
    if (!existingPlayer) {
      throw new Error('Must select a cartela first');
    }

    // Check if user has already paid (has a cartela but hasn't joined yet)
    if (!existingPlayer.hasJoined) {
      // Deduct entry fee from user's wallet
      user.walletBalance -= game.moneyLevel;
      await user.save();

      // Mark player as joined
      existingPlayer.hasJoined = true;
      await game.save();
    }

    // Start countdown if minimum players reached and no timer exists
    if (game.players.length >= game.minPlayers && !this.gameTimers.has(roomId)) {
      this.scheduleGameStart(roomId);
    }

    // Auto-start if max players reached
    if (game.players.length >= game.maxPlayers) {
      this.clearGameTimer(roomId);
      await this.startGame(roomId);
    }

    return game;
  }

  async leaveGame(roomId, telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user) {
      throw new Error('User not found');
    }

    let game = await Game.findOne({ roomId });
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'playing') {
      throw new Error('Cannot leave game after it has started');
    }

    const player = game.players.find(p => p.telegramId === telegramId);
    if (!player) {
      throw new Error('Player not in this game');
    }

    // Remove player from game
    game.players = game.players.filter(p => p.telegramId !== telegramId);

    // Only refund if player had already joined (paid)
    if (player.hasJoined) {
      user.walletBalance += game.moneyLevel;
      await user.save();
    }

    await game.save();

    // Notify all players in the room
    this.io.to(roomId).emit('playerLeft', {
      roomId: roomId,
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      totalPot: game.moneyLevel * game.players.length,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName,
        cartelaNumber: p.cartelaNumber
      }))
    });

    // Cancel countdown if not enough players
    if (game.players.length < game.minPlayers) {
      this.clearGameTimer(roomId);
    }

    return game;
  }

  scheduleGameStart(roomId) {
    let countdown = 60; // 1 minute
    
    // Clear any existing timer
    this.clearGameTimer(roomId);
    
    const countdownInterval = setInterval(() => {
      countdown--;
      console.log(`Countdown for room ${roomId}: ${countdown}s`);
      this.io.to(roomId).emit('gameCountdown', {
        roomId: roomId,
        countdown,
        message: `Game starting in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
      });

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.gameTimers.delete(roomId);
        this.startGame(roomId);
      }
    }, 1000);

    this.gameTimers.set(roomId, countdownInterval);
    
    console.log(`Emitting countdown for room ${roomId}: ${countdown}s`);
    this.io.to(roomId).emit('gameCountdown', {
      roomId: roomId,
      countdown,
      message: `Game starting in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
    });
  }

  clearGameTimer(roomId) {
    if (this.gameTimers.has(roomId)) {
      clearInterval(this.gameTimers.get(roomId));
      this.gameTimers.delete(roomId);
    }
  }

  async startGame(roomId) {
    console.log(`Starting game for room ${roomId}`);
    const game = await Game.findOne({ roomId });
    if (!game || game.status !== 'waiting') return;

    if (game.players.length < game.minPlayers) {
      // Refund players if not enough players
      for (const player of game.players) {
        await User.findByIdAndUpdate(player.userId, {
          $inc: { walletBalance: game.moneyLevel }
        });
      }
      
      this.io.to(roomId).emit('gameEnded', {
        message: 'Game cancelled - not enough players. Entry fees refunded.',
        cancelled: true
      });
      
      await Game.findByIdAndDelete(game._id);
      return;
    }

    // Calculate game duration
    const duration = calculateGameDuration(game.players.length);
    game.gameDuration = duration;
    game.status = 'playing';
    game.startedAt = new Date();
    game.gameStartTime = new Date();
    await game.save();

    // Clear countdown timer
    this.clearGameTimer(roomId);

    // Set maximum game time (2 minutes)
    const maxGameTimer = setTimeout(() => {
      this.forceEndGame(roomId);
    }, game.maxGameTime);
    this.gameDurationTimers.set(roomId, maxGameTimer);

    this.io.to(roomId).emit('gameStarted', {
      roomId: roomId,
      message: 'Game has started! Good luck!',
      calledNumbers: [],
      totalPot: game.moneyLevel * game.players.length,
      gameDuration: duration
    });

    // Start calling numbers
    this.startNumberCalling(roomId);
  }

  startNumberCalling(roomId) {
    const interval = setInterval(async () => {
      const game = await Game.findOne({ roomId });
      if (!game || game.status !== 'playing') {
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        return;
      }

      // Check if game has exceeded maximum time
      const gameTime = Date.now() - game.gameStartTime.getTime();
      if (gameTime >= game.maxGameTime) {
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        await this.forceEndGame(roomId);
        return;
      }

      // Generate next number
      const availableNumbers = [];
      for (let i = 1; i <= 75; i++) {
        if (!game.calledNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length === 0) {
        // All numbers called, end game with no winner
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        await this.endGame(roomId, []);
        return;
      }

      const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      game.calledNumbers.push(nextNumber);
      game.currentNumber = nextNumber;
      await game.save();

      this.io.to(roomId).emit('numberCalled', {
        number: nextNumber,
        calledNumbers: game.calledNumbers,
        totalCalled: game.calledNumbers.length
      });

      // Check for potential winners after each number (but don't auto-win)
      const potentialWinners = await this.checkForPotentialWinners(game);
      if (potentialWinners.length > 0) {
        this.io.to(roomId).emit('potentialWinners', {
          potentialWinners: potentialWinners.map(p => ({
            telegramId: p.telegramId,
            firstName: p.firstName
          }))
        });
      }

    }, game.gameDuration.delayPerNumber);

    this.numberCallingIntervals.set(roomId, interval);
  }

  async checkForPotentialWinners(game) {
    const potentialWinners = [];
    
    for (const player of game.players) {
      if (!player.hasClaimedWin) {
        const winResult = checkBingo(player.card, player.markedNumbers);
        if (winResult) {
          potentialWinners.push(player);
        }
      }
    }

    return potentialWinners;
  }

  async claimWin(roomId, telegramId, winPattern) {
    const game = await Game.findOne({ roomId, status: 'playing' });
    if (!game) {
      throw new Error('Game not found or not in progress');
    }

    const player = game.players.find(p => p.telegramId === telegramId);
    if (!player) {
      throw new Error('Player not in this game');
    }

    if (player.hasClaimedWin) {
      throw new Error('Win already claimed');
    }

    // Validate the claimed win pattern
    if (!checkWinPattern(player.card, player.markedNumbers, winPattern)) {
      throw new Error('Invalid win pattern');
    }

    // Mark player as winner
    player.hasWon = true;
    player.hasClaimedWin = true;
    player.winPattern = winPattern;
    await game.save();

    // End game with this winner
    this.clearGameTimer(roomId);
    if (this.numberCallingIntervals.has(roomId)) {
      clearInterval(this.numberCallingIntervals.get(roomId));
      this.numberCallingIntervals.delete(roomId);
    }
    if (this.gameDurationTimers.has(roomId)) {
      clearTimeout(this.gameDurationTimers.get(roomId));
      this.gameDurationTimers.delete(roomId);
    }
    
    await this.endGame(roomId, [player]);
  }

  async forceEndGame(roomId) {
    const game = await Game.findOne({ roomId });
    if (!game || game.status !== 'playing') return;

    // Find players with the most marked numbers
    const sortedPlayers = [...game.players].sort((a, b) => 
      b.markedNumbers.length - a.markedNumbers.length
    );

    // Select 1-3 winners based on most marked numbers
    const numWinners = Math.min(3, Math.max(1, Math.floor(game.players.length * 0.3)));
    const winners = sortedPlayers.slice(0, numWinners);

    // Mark them as winners
    for (const winner of winners) {
      winner.hasWon = true;
      winner.hasClaimedWin = true;
      winner.winPattern = 'forced';
    }

    await game.save();
    await this.endGame(roomId, winners);
  }

  async markNumber(roomId, telegramId, number) {
    const game = await Game.findOne({ roomId, status: 'playing' });
    if (!game) {
      throw new Error('Game not found or not in progress');
    }

    if (!game.calledNumbers.includes(number)) {
      throw new Error('Number has not been called yet');
    }

    const player = game.players.find(p => p.telegramId === telegramId);
    if (!player) {
      throw new Error('Player not in this game');
    }

    // Check if number is on player's card
    const isOnCard = player.card.some(column => column.includes(number));
    if (!isOnCard) {
      throw new Error('Number not on your card');
    }

    if (!player.markedNumbers.includes(number)) {
      player.markedNumbers.push(number);
      await game.save();
    }
    
    return game;
  }

  async endGame(roomId, winners) {
    const game = await Game.findOne({ roomId });
    if (!game) return;

    game.status = 'finished';
    game.finishedAt = new Date();

    const totalPot = game.moneyLevel * game.players.length;
    let winnerData = null;

    if (winners.length > 0) {
      const prizePerWinner = Math.floor((totalPot * 0.8) / winners.length);
      
      winnerData = {
        winners: winners.map(winner => ({
          userId: winner.userId,
          telegramId: winner.telegramId,
          firstName: winner.firstName,
          prizeMoney: prizePerWinner,
          winPattern: winner.winPattern
        })),
        totalPrize: prizePerWinner * winners.length
      };

      game.winner = winnerData.winners[0]; // For backward compatibility
      game.winners = winnerData.winners;

      // Update winners' stats and wallet
      for (const winner of winners) {
        await User.findByIdAndUpdate(winner.userId, {
          $inc: {
            gamesWon: 1,
            totalWinnings: prizePerWinner,
            walletBalance: prizePerWinner
          }
        });
      }
    }

    await game.save();

    // Save game results for all players
    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i];
      const isWinner = winners.some(w => w.telegramId === player.telegramId);
      
      const result = new GameResult({
        gameId: game._id,
        userId: player.userId,
        telegramId: player.telegramId,
        firstName: player.firstName,
        moneyLevel: game.moneyLevel,
        position: isWinner ? 1 : i + 2,
        prizeMoney: isWinner ? Math.floor((totalPot * 0.8) / winners.length) : 0,
        numbersCalledCount: game.calledNumbers.length,
        gameDate: game.finishedAt
      });
      await result.save();

      // Update player stats
      await User.findByIdAndUpdate(player.userId, {
        $inc: { gamesPlayed: 1 }
      });
    }

    // Notify all players
    const message = winners.length > 0 
      ? winners.length === 1 
        ? `🎉 ${winners[0].firstName} wins ${Math.floor((totalPot * 0.8))} Birr!`
        : `🎉 ${winners.length} winners! Each wins ${Math.floor((totalPot * 0.8) / winners.length)} Birr!`
      : 'Game ended - no winner';

    this.io.to(roomId).emit('gameEnded', {
      winners: winnerData?.winners || [],
      message,
      totalPrize: winnerData?.totalPrize || 0,
      results: game.players.map(p => ({
        firstName: p.firstName,
        hasWon: winners.some(w => w.telegramId === p.telegramId),
        markedCount: p.markedNumbers.length
      }))
    });

    // Clean up
    this.clearGameTimer(roomId);
    if (this.numberCallingIntervals.has(roomId)) {
      clearInterval(this.numberCallingIntervals.get(roomId));
      this.numberCallingIntervals.delete(roomId);
    }
    if (this.gameDurationTimers.has(roomId)) {
      clearTimeout(this.gameDurationTimers.get(roomId));
      this.gameDurationTimers.delete(roomId);
    }
  }

  async getAvailableGames() {
    const games = await Game.find({ 
      status: { $in: ['waiting', 'playing'] }
    }).sort({ createdAt: -1 });
    
    return games;
  }

  async getGameByRoomId(roomId) {
    const game = await Game.findOne({ roomId });
    return game;
  }

  async getGamesByMoneyLevel() {
    const games = await Game.find({ 
      status: { $in: ['waiting', 'playing'] }
    }).sort({ createdAt: -1 });
    
    const gamesByLevel = {};
    games.forEach(game => {
      if (!gamesByLevel[game.moneyLevel]) {
        gamesByLevel[game.moneyLevel] = [];
      }
      gamesByLevel[game.moneyLevel].push(game);
    });
    
    return gamesByLevel;
  }

  async getLeaderboard(period = 'all') {
    let dateFilter = {};
    
    if (period === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = { gameDate: { $gte: today } };
    } else if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { gameDate: { $gte: weekAgo } };
    }

    const results = await GameResult.aggregate([
      { $match: { position: 1, ...dateFilter } },
      {
        $group: {
          _id: '$telegramId',
          firstName: { $first: '$firstName' },
          wins: { $sum: 1 },
          totalPrize: { $sum: '$prizeMoney' },
          lastWin: { $max: '$gameDate' }
        }
      },
      { $sort: { wins: -1, totalPrize: -1 } },
      { $limit: 10 }
    ]);

    return results;
  }

  async getUserGameHistory(telegramId) {
    const results = await GameResult.find({ telegramId })
      .sort({ gameDate: -1 })
      .limit(20);
    
    return results;
  }
}

export default GameService;