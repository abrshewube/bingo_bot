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

    const game = await GameService.createGame(moneyLevel, req.user.telegramId);
    
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

// Select cartela
router.post('/:roomId/cartela', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { cartelaNumber } = req.body;
    const GameService = req.app.get('gameService');
    
    if (!cartelaNumber || cartelaNumber < 1 || cartelaNumber > 100) {
      return res.status(400).json({ error: 'Invalid cartela number. Must be between 1 and 100.' });
    }

    const game = await GameService.selectCartela(roomId, req.user.telegramId, cartelaNumber);
    
    // Find the user's card
    const userPlayer = game.players.find(p => p.telegramId === req.user.telegramId);
    
    res.json({
      roomId: game.roomId,
      cartelaNumber: cartelaNumber,
      card: userPlayer ? userPlayer.card : null,
      message: 'Cartela selected successfully'
    });
  } catch (error) {
    console.error('Select cartela error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join game (after cartela selection)
router.post('/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const GameService = req.app.get('gameService');
    
    const game = await GameService.joinGame(roomId, req.user.telegramId);
    
    res.json({
      roomId: game.roomId,
      message: 'Joined game successfully'
    });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leave game (before it starts)
router.post('/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const GameService = req.app.get('gameService');
    
    const game = await GameService.leaveGame(roomId, req.user.telegramId);
    
    res.json({
      roomId: game.roomId,
      message: 'Left game successfully. Entry fee refunded.'
    });
  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark number on bingo card
router.post('/:roomId/mark', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { number } = req.body;
    const GameService = req.app.get('gameService');
    
    if (!number || number < 1 || number > 75) {
      return res.status(400).json({ error: 'Invalid number. Must be between 1 and 75.' });
    }

    const game = await GameService.markNumber(roomId, req.user.telegramId, number);
    
    res.json({
      roomId: game.roomId,
      number: number,
      message: 'Number marked successfully'
    });
  } catch (error) {
    console.error('Mark number error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim win
router.post('/:roomId/claim-win', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { winPattern } = req.body;
    const GameService = req.app.get('gameService');
    
    if (!winPattern || !['row', 'column', 'diagonal', 'corners'].includes(winPattern)) {
      return res.status(400).json({ error: 'Invalid win pattern.' });
    }

    await GameService.claimWin(roomId, req.user.telegramId, winPattern);
    
    res.json({
      roomId: roomId,
      winPattern: winPattern,
      message: 'Win claimed successfully'
    });
  } catch (error) {
    console.error('Claim win error:', error);
    res.status(500).json({ error: error.message });
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
        cartelaNumber: p.cartelaNumber,
        hasWon: p.hasWon
      })),
      userCard: userPlayer ? userPlayer.card : null,
      userMarkedNumbers: userPlayer ? userPlayer.markedNumbers : [],
      userCartelaNumber: userPlayer ? userPlayer.cartelaNumber : null,
      userHasJoined: userPlayer ? userPlayer.hasJoined : false,
      winner: game.winner,
      winners: game.winners,
      gameDuration: game.gameDuration,
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