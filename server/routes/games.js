import express from 'express';
import Game from '../models/Game.js';
import GameResult from '../models/GameResult.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get available games grouped by money level
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const GameService = req.app.get('gameService');
    const gamesByLevel = await GameService.getGamesByMoneyLevel();
    
    res.json(gamesByLevel);
  } catch (error) {
    console.error('Get available games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Create new game
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { moneyLevel } = req.body;
    const GameService = req.app.get('gameService');
    
    if (![10, 20, 30, 40, 50, 100].includes(moneyLevel)) {
      return res.status(400).json({ error: 'Invalid money level' });
    }

    const game = await GameService.createGame(moneyLevel);
    
    res.json({
      roomId: game.roomId,
      moneyLevel: game.moneyLevel,
      status: game.status,
      playerCount: game.players.length
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game details
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const userPlayer = game.players.find(p => p.telegramId === req.user.telegramId);
    
    res.json({
      roomId: game.roomId,
      moneyLevel: game.moneyLevel,
      status: game.status,
      playerCount: game.players.length,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      calledNumbers: game.calledNumbers,
      currentNumber: game.currentNumber,
      totalPot: game.moneyLevel * game.players.length,
      players: game.players.map(p => ({
        telegramId: p.telegramId,
        firstName: p.firstName,
        hasWon: p.hasWon
      })),
      userCard: userPlayer ? userPlayer.card : null,
      userMarkedNumbers: userPlayer ? userPlayer.markedNumbers : [],
      winner: game.winner,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt
    });
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

// Get user's game history
router.get('/history/user', authenticateToken, async (req, res) => {
  try {
    const GameService = req.app.get('gameService');
    const history = await GameService.getUserGameHistory(req.user.telegramId);
    
    res.json(history);
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

// Get leaderboard
router.get('/leaderboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const GameService = req.app.get('gameService');
    
    const leaderboard = await GameService.getLeaderboard(period);
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;