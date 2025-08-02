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
    origin: "http://localhost:5173",
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

  // Create new game
  socket.on('createGame', async (data) => {
    try {
      const { moneyLevel } = data;
      
      // Check if user is registered
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || !user.isRegistered) {
        socket.emit('error', { message: 'Please complete registration first' });
        return;
      }

      // Create new game and add creator as first player
      const game = await gameService.createGame(moneyLevel, socket.telegramId);
      socket.join(game.roomId);
      socket.currentRoom = game.roomId;

      socket.emit('gameCreated', {
        roomId: game.roomId,
        moneyLevel: game.moneyLevel
      });

    } catch (error) {
      console.error('Create game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Join existing game
  socket.on('joinGame', async (data) => {
    try {
      const { roomId, cartelaNumber, card } = data;
      
      // Check if user is registered
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || !user.isRegistered) {
        socket.emit('error', { message: 'Please complete registration first' });
        return;
      }

      // Join the game
      if (cartelaNumber && card) {
        await gameService.joinGameWithCartela(roomId, socket.telegramId, cartelaNumber, card);
      } else {
        await gameService.joinGame(roomId, socket.telegramId);
      }
      socket.join(roomId);
      socket.currentRoom = roomId;

      socket.emit('gameJoined', {
        roomId: roomId
      });

    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Select cartela (for real-time updates)
  socket.on('selectCartela', async (data) => {
    try {
      const { roomId, cartelaNumber, card } = data;
      
      // Check if user is registered
      const user = await User.findOne({ telegramId: socket.telegramId });
      if (!user || !user.isRegistered) {
        socket.emit('error', { message: 'Please complete registration first' });
        return;
      }

      // Update cartela selection in real-time
      await gameService.updateCartelaSelection(roomId, socket.telegramId, cartelaNumber, card);
      
              // Notify all players in the room about the cartela selection
        const game = await gameService.getGameByRoomId(roomId);
        if (game) {
          socket.to(roomId).emit('cartelaSelected', {
            roomId: roomId,
            telegramId: socket.telegramId,
            firstName: socket.firstName,
            cartelaNumber: cartelaNumber,
            takenCartelas: game.takenCartelas
          });
        }

    } catch (error) {
      console.error('Select cartela error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Leave game
  socket.on('leaveGame', async (data) => {
    try {
      const { roomId } = data;
      
      await gameService.leaveGame(roomId, socket.telegramId);
      socket.leave(roomId);
      socket.currentRoom = null;

      socket.emit('gameLeft', { roomId });

    } catch (error) {
      console.error('Leave game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Join room for spectating or rejoining
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId } = data;
      
      console.log(`User ${socket.firstName} joining room ${roomId}`);
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Get current game state and send it to the user
      const game = await gameService.getGameByRoomId(roomId);
      if (game) {
        socket.emit('roomJoined', { 
          roomId,
          gameState: {
            status: game.status,
            playerCount: game.players.length,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            totalPot: game.moneyLevel * game.players.length,
            players: game.players.map(p => ({
              telegramId: p.telegramId,
              firstName: p.firstName
            })),
            takenCartelas: game.takenCartelas
          }
        });
      } else {
        socket.emit('roomJoined', { roomId });
      }
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Claim bingo
  socket.on('claimBingo', async (data) => {
    try {
      const { roomId, markedNumbers } = data;
      
      await gameService.validateBingo(roomId, socket.telegramId, markedNumbers);
      
      socket.emit('bingoValidated', { roomId });
      
      // End the game with this winner
      const game = await gameService.getGameByRoomId(roomId);
      if (game) {
        const winner = game.players.find(p => p.telegramId === socket.telegramId);
        if (winner) {
          // Clear any running intervals
          if (gameService.numberCallingIntervals.has(roomId)) {
            clearInterval(gameService.numberCallingIntervals.get(roomId));
            gameService.numberCallingIntervals.delete(roomId);
          }
          
          await gameService.endGame(roomId, [winner]);
        }
      }
      
    } catch (error) {
      console.error('Claim bingo error:', error);
      socket.emit('bingoRejected', { 
        roomId: data.roomId, 
        reason: error.message 
      });
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