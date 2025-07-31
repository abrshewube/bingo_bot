// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');

// const BingoBot = require('./bot');
// const GameService = require('./services/gameService');
// const authRoutes = require('./routes/auth');
// const gameRoutes = require('./routes/games');
// const { authenticateToken } = require('./middleware/auth');
// const User = require('./models/User');

import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';

import BingoBot from './bot.js'
import GameService from './services/gameService.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.WEBAPP_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use __dirname as you normally would
app.use(express.static(join(__dirname, '../dist')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bingo-bot')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize services
const gameService = new GameService(io);
app.set('gameService', gameService);

// Initialize Telegram Bot
const bot = new BingoBot();
app.set('bot', bot);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.telegramId = user.telegramId;
    socket.firstName = user.firstName;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.firstName} (${socket.telegramId})`);

  // Join game room
  socket.on('joinGame', async (data) => {
    try {
      const { moneyLevel } = data;
      
      // Check if user is registered
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || !user.isRegistered) {
        socket.emit('error', { message: 'Please complete registration first' });
        return;
      }

      // Find available game or create new one
      let game = await gameService.getAvailableGames();
      game = game.find(g => g.moneyLevel === moneyLevel);
      
      if (!game) {
        game = await gameService.createGame(moneyLevel);
      }

      // Join the game
      await gameService.joinGame(game.roomId, socket.telegramId);
      socket.join(game.roomId);
      socket.currentRoom = game.roomId;

      socket.emit('gameJoined', {
        roomId: game.roomId,
        moneyLevel: game.moneyLevel
      });

    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Start game for a money level
  socket.on('startGame', async (data, callback) => {
    try {
      console.log('[SOCKET] startGame event received:', data, 'from', socket.telegramId);
      const { moneyLevel } = data;
      // Check if user is registered
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || !user.isRegistered) {
        console.log('[SOCKET] startGame: user not registered:', socket.telegramId);
        callback({ error: 'Please complete registration first' });
        return;
      }
      // Check if a game already exists for this money level
      let game = await gameService.getAvailableGames();
      game = game.find(g => g.moneyLevel === moneyLevel);
      if (game) {
        console.log('[SOCKET] startGame: game already exists for moneyLevel', moneyLevel);
        callback({ error: 'Game already exists for this money level' });
        return;
      }
      // Create the game
      game = await gameService.createGame(moneyLevel);
      console.log('[SOCKET] startGame: created game', game.roomId);
      // Add the user as the first player
      await gameService.joinGame(game.roomId, socket.telegramId);
      console.log('[SOCKET] startGame: user joined game', game.roomId);
      socket.join(game.roomId);
      socket.currentRoom = game.roomId;
      // Respond with the new roomId
      callback({ roomId: game.roomId });
      // Notify all clients about the new game/player count
      io.emit('gameListUpdated');
      console.log('[SOCKET] startGame: emitted gameListUpdated');
    } catch (error) {
      console.error('[SOCKET] startGame error:', error);
      callback({ error: error.message });
    }
  });

  // Join specific room
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId } = data;
      
      await gameService.joinGame(roomId, socket.telegramId);
      socket.join(roomId);
      socket.currentRoom = roomId;

      socket.emit('roomJoined', { roomId });
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Mark number on bingo card
  socket.on('markNumber', async (data) => {
    try {
      const { roomId, number } = data;
      
      await gameService.markNumber(roomId, socket.telegramId, number);
      
      socket.emit('numberMarked', { number });
    } catch (error) {
      console.error('Mark number error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.firstName} (${socket.telegramId})`);
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
    }
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});