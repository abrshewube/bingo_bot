import User from '../models/User.js';
import Game from '../models/Game.js';
import GameResult from '../models/GameResult.js';
import { generateBingoCard, checkBingo, generateRoomId } from '../utils/bingoUtils.js';

class GameService {
  constructor(io) {
    this.io = io;
    this.gameTimers = new Map();
    this.numberCallingIntervals = new Map();
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

    const card = generateBingoCard();
    const game = new Game({
      roomId,
      moneyLevel,
      players: [{
        userId: creator._id,
        telegramId: creator.telegramId,
        firstName: creator.firstName,
        card,
        markedNumbers: [],
        hasWon: false
      }],
      status: 'waiting'
    });
    
    await game.save();

    // Notify all players in the room about the new player
    this.io.to(roomId).emit('playerJoined', {
      roomId: roomId,
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      totalPot: game.moneyLevel * game.players.length,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName
      }))
    });

    return game;
  }

  async joinGame(roomId, telegramId) {
    return this.joinGame(roomId, telegramId, null, null);
  }

  async joinGameWithCartela(roomId, telegramId, cartelaNumber, card) {
    const user = await User.findOne({ telegramId });
    if (!user || !user.isRegistered) {
      throw new Error('User not registered');
    }

    // Check if user has enough balance
    if (user.walletBalance < 0) {
      throw new Error('Insufficient balance');
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
    if (existingPlayer) {
      throw new Error('Already joined this game');
    }

    // Deduct entry fee from user's wallet
    user.walletBalance -= game.moneyLevel;
    await user.save();

    const bingoCard = card || generateBingoCard();
    game.players.push({
      userId: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      card: bingoCard,
      cartelaNumber: cartelaNumber || Math.floor(Math.random() * 100) + 1,
      markedNumbers: [],
      hasWon: false
    });

    await game.save();

    // Notify all players in the room
    this.io.to(roomId).emit('playerJoined', {
      roomId: roomId,
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      totalPot: game.moneyLevel * game.players.length,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName
      }))
    });

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
    const game = await Game.findOne({ roomId });
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'playing') {
      throw new Error('Cannot leave game after it has started');
    }

    const playerIndex = game.players.findIndex(p => p.telegramId === telegramId);
    if (playerIndex === -1) {
      throw new Error('Player not in this game');
    }

    // Remove player and refund entry fee
    const player = game.players[playerIndex];
    game.players.splice(playerIndex, 1);
    await game.save();

    // Refund entry fee
    await User.findByIdAndUpdate(player.userId, {
      $inc: { walletBalance: game.moneyLevel }
    });

    // If no players left, delete the game
    if (game.players.length === 0) {
      await Game.findByIdAndDelete(game._id);
    }

    return game;
  }

  scheduleGameStart(roomId) {
    let countdown = 30; // 30 seconds for faster testing
    
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

    game.status = 'playing';
    game.startedAt = new Date();
    await game.save();

    // Clear countdown timer
    this.clearGameTimer(roomId);

    this.io.to(roomId).emit('gameStarted', {
      roomId: roomId,
      message: 'Game has started! Good luck!',
      calledNumbers: [],
      totalPot: game.moneyLevel * game.players.length
    });

    // Start calling numbers
    this.startNumberCalling(roomId);
  }

  startNumberCalling(roomId) {
    let numbersDrawn = 0;
    const maxNumbers = Math.floor(Math.random() * 16) + 25; // 25-40 numbers
    const gameStartTime = Date.now();
    const maxGameTime = 120000; // 2 minutes
    
    const interval = setInterval(async () => {
      const game = await Game.findOne({ roomId });
      if (!game || game.status !== 'playing') {
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        return;
      }
      
      numbersDrawn++;
      const gameElapsed = Date.now() - gameStartTime;
      
      // Force end game after 2 minutes or max numbers
      if (gameElapsed >= maxGameTime || numbersDrawn >= maxNumbers) {
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        
        // Force at least one winner if no winners yet
        const winners = await this.checkForWinners(game);
        if (winners.length === 0) {
          const forcedWinners = await this.forceWinners(game);
          await this.endGame(roomId, forcedWinners);
        } else {
          await this.endGame(roomId, winners);
        }
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

      // Check for winners after each number (with smart algorithm)
      const winners = await this.checkForWinners(game);
      if (winners.length > 0) {
        clearInterval(interval);
        this.numberCallingIntervals.delete(roomId);
        await this.endGame(roomId, winners);
      }

    }, 2000); // Call number every 2 seconds

    this.numberCallingIntervals.set(roomId, interval);
  }

  async forceWinners(game) {
    const winners = [];
    const numWinners = Math.min(3, Math.floor(Math.random() * 3) + 1); // 1-3 winners
    const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numWinners && i < shuffledPlayers.length; i++) {
      const player = shuffledPlayers[i];
      
      // Force a winning pattern by marking strategic numbers
      const missingForWin = this.findMissingNumbersForWin(player.card, player.markedNumbers, game.calledNumbers);
      if (missingForWin.length > 0) {
        player.markedNumbers.push(...missingForWin);
        winners.push(player);
      }
    }
    
    if (winners.length > 0) {
      await game.save();
    }
    
    return winners;
  }

  async checkForWinners(game) {
    const winners = [];
    
    for (const player of game.players) {
      if (this.checkBingoPattern(player.card, player.markedNumbers)) {
        winners.push(player);
      }
    }

    return winners;
  }

  checkBingoPattern(card, markedNumbers) {
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
  }

  findMissingNumbersForWin(card, markedNumbers, calledNumbers) {
    const marked = new Set([...markedNumbers, 0]); // Include FREE space
    const called = new Set(calledNumbers);
    
    // Check each possible winning pattern
    const patterns = [
      // Rows
      ...Array.from({ length: 5 }, (_, row) => 
        Array.from({ length: 5 }, (_, col) => card[col][row])
      ),
      // Columns
      ...Array.from({ length: 5 }, (_, col) => 
        Array.from({ length: 5 }, (_, row) => card[col][row])
      ),
      // Diagonals
      Array.from({ length: 5 }, (_, i) => card[i][i]),
      Array.from({ length: 5 }, (_, i) => card[i][4-i])
    ];

    for (const pattern of patterns) {
      const missing = pattern.filter(num => !marked.has(num) && called.has(num));
      if (missing.length <= 2 && missing.length > 0) { // Only need 1-2 more numbers
        return missing;
      }
    }

    return [];
  }

  async validateBingo(roomId, telegramId, markedNumbers) {
    const game = await Game.findOne({ roomId, status: 'playing' });
    if (!game) {
      throw new Error('Game not found or not in progress');
    }

    const player = game.players.find(p => p.telegramId === telegramId);
    if (!player) {
      throw new Error('Player not in this game');
    }

    // Verify all marked numbers were actually called
    const invalidNumbers = markedNumbers.filter(num => 
      num !== 0 && !game.calledNumbers.includes(num)
    );
    
    if (invalidNumbers.length > 0) {
      throw new Error(`Invalid numbers marked: ${invalidNumbers.join(', ')}`);
    }

    // Check if the pattern is valid
    const isValidBingo = this.checkBingoPattern(player.card, markedNumbers);
    if (!isValidBingo) {
      throw new Error('No valid bingo pattern found');
    }

    // Update player's marked numbers and win status
    player.markedNumbers = markedNumbers;
    player.hasWon = true;
    await game.save();

    return true;
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
          prizeMoney: prizePerWinner
        })),
        totalPrize: prizePerWinner * winners.length
      };

      game.winner = winnerData.winners[0]; // For backward compatibility

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