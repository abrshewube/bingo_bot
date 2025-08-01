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
    required: true,
    enum: [10, 20, 30, 40, 50, 100]
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
      default: null
    },
    card: {
      type: [[Number]],
      required: true
    },
    markedNumbers: {
      type: [Number],
      default: []
    },
    hasWon: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  minPlayers: {
    type: Number,
    default: 2
  },
  maxPlayers: {
    type: Number,
    default: 100
  },
  calledNumbers: {
    type: [Number],
    default: []
  },
  currentNumber: {
    type: Number,
    default: null
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
  startedAt: {
    type: Date,
    default: null
  },
  finishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Game = mongoose.model('Game', gameSchema);
export default Game;