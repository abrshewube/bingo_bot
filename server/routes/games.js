// const express = require('express');
// const Game = require('../models/Game');
// const { authenticateToken } = require('../middleware/auth');
import express from 'express';
import Game from '../models/Game.js';
import { authenticateToken } from '../middleware/auth.js';


const router = express.Router();

// Get available games
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .select('roomId moneyLevel players.firstName createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const formattedGames = games.map(game => ({
      roomId: game.roomId,
      moneyLevel: game.moneyLevel,
      playerCount: game.players.length,
      maxPlayers: 10,
      createdAt: game.createdAt
    }));
    
    res.json(formattedGames);
  } catch (error) {
    console.error('Get available games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
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