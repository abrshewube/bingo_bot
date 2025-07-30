// const Game = require('../models/Game');
// const User = require('../models/User');
// const GameResult = require('../models/GameResult');
// const { generateBingoCard, checkBingo, generateRoomId } = require('../utils/bingoUtils');
import User from '../models/User.js';
import Game from '../models/Game.js';
import GameResult from '../models/GameResult.js';
import { generateBingoCard, checkBingo, generateRoomId } from '../utils/bingoUtils.js';


class GameService {
  constructor(io) {
    this.io = io;
    this.gameTimers = new Map();
  }

  async createGame(moneyLevel) {
    const roomId = generateRoomId();
    const game = new Game({
      roomId,
      moneyLevel,
      players: [],
      status: 'waiting'
    });
    
    await game.save();
    return game;
  }

  async joinGame(roomId, telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user || !user.isRegistered) {
      throw new Error('User not registered');
    }

    const game = await Game.findOne({ roomId, status: 'waiting' });
    if (!game) {
      throw new Error('Game not found or already started');
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    const existingPlayer = game.players.find(p => p.telegramId === telegramId);
    if (existingPlayer) {
      throw new Error('Already joined this game');
    }

    const card = generateBingoCard();
    game.players.push({
      userId: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      card,
      markedNumbers: [],
      hasWon: false
    });

    await game.save();

    // Notify all players in the room
    this.io.to(roomId).emit('playerJoined', {
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName
      }))
    });

    // Start game if minimum players reached
    if (game.players.length >= game.minPlayers && !this.gameTimers.has(roomId)) {
      this.scheduleGameStart(roomId);
    }

    return game;
  }

  scheduleGameStart(roomId) {
    const timer = setTimeout(async () => {
      await this.startGame(roomId);
    }, 10000); // 10 seconds delay before starting

    this.gameTimers.set(roomId, timer);
    
    this.io.to(roomId).emit('gameStarting', {
      message: 'Game starting in 10 seconds...',
      countdown: 10
    });
  }

  async startGame(roomId) {
    const game = await Game.findOne({ roomId });
    if (!game || game.status !== 'waiting') return;

    game.status = 'playing';
    game.startedAt = new Date();
    await game.save();

    this.io.to(roomId).emit('gameStarted', {
      message: 'Game has started! Good luck!',
      calledNumbers: []
    });

    // Start calling numbers
    this.startNumberCalling(roomId);
  }

  startNumberCalling(roomId) {
    const interval = setInterval(async () => {
      const game = await Game.findOne({ roomId });
      if (!game || game.status !== 'playing') {
        clearInterval(interval);
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
        // All numbers called, end game
        await this.endGame(roomId, null);
        clearInterval(interval);
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

    }, 6000); // Call number every 6 seconds
  }

  async markNumber(roomId, telegramId, number) {
    const game = await Game.findOne({ roomId, status: 'playing' });
    if (!game) {
      throw new Error('Game not found or not in progress');
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

      // Check for bingo
      if (checkBingo(player.card, player.markedNumbers)) {
        player.hasWon = true;
        await game.save();
        await this.endGame(roomId, player);
      }
    }

    return game;
  }

  async endGame(roomId, winner) {
    const game = await Game.findOne({ roomId });
    if (!game) return;

    game.status = 'finished';
    game.finishedAt = new Date();

    if (winner) {
      const prizeMoney = game.moneyLevel * game.players.length * 0.8; // 80% of total pot
      game.winner = {
        userId: winner.userId,
        telegramId: winner.telegramId,
        firstName: winner.firstName,
        prizeMoney
      };

      // Update winner's stats
      await User.findByIdAndUpdate(winner.userId, {
        $inc: {
          gamesWon: 1,
          totalWinnings: prizeMoney,
          walletBalance: prizeMoney
        }
      });
    }

    await game.save();

    // Save game results
    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i];
      const result = new GameResult({
        gameId: game._id,
        userId: player.userId,
        telegramId: player.telegramId,
        firstName: player.firstName,
        moneyLevel: game.moneyLevel,
        position: player.hasWon ? 1 : i + 1,
        prizeMoney: player.hasWon ? game.winner.prizeMoney : 0,
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
    this.io.to(roomId).emit('gameEnded', {
      winner: game.winner,
      message: winner ? `🎉 ${winner.firstName} wins!` : 'Game ended - no winner',
      results: game.players.map(p => ({
        firstName: p.firstName,
        hasWon: p.hasWon,
        markedCount: p.markedNumbers.length
      }))
    });

    // Clean up
    this.gameTimers.delete(roomId);
  }

  async getAvailableGames() {
    const games = await Game.find({ status: 'waiting' })
      .sort({ createdAt: -1 })
      .limit(20);
    
    return games;
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
}

export default GameService;