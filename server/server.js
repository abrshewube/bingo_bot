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