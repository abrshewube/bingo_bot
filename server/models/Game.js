// const mongoose = require('mongoose');
import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  moneyLevel: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    telegramId: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    cartelaNumber: {
      type: Number,
      required: true
    },
    card: {
      type: [[Number]],
      required: true
    },
    markedNumbers: [{
      type: Number
    }],
    hasWon: {
      type: Boolean,
      default: false
    },
    winPattern: {
      type: String,
      enum: ['row', 'column', 'diagonal', 'corners'],
      default: null
    },
    hasClaimedWin: {
      type: Boolean,
      default: false
    },
    hasJoined: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  calledNumbers: [{
    type: Number
  }],
  currentNumber: {
    type: Number,
    default: null
  },
  startedAt: {
    type: Date
  },
  finishedAt: {
    type: Date
  },
  winner: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    telegramId: String,
    firstName: String,
    prizeMoney: Number
  },
  winners: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    telegramId: String,
    firstName: String,
    prizeMoney: Number,
    winPattern: String
  }],
  minPlayers: {
    type: Number,
    default: 2
  },
  maxPlayers: {
    type: Number,
    default: 10
  },
  gameDuration: {
    numbersToCall: Number,
    delayPerNumber: Number,
    estimatedDuration: Number
  },
  gameStartTime: {
    type: Date
  },
  maxGameTime: {
    type: Number,
    default: 120000 // 2 minutes in milliseconds
  }
}, {
  timestamps: true
});

// Index for efficient queries
gameSchema.index({ roomId: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ 'players.telegramId': 1 });

export default mongoose.model('Game', gameSchema);