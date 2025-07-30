// const mongoose = require('mongoose');
import mongoose from 'mongoose';


const gameResultSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
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
  moneyLevel: {
    type: Number,
    required: true
  },
  position: {
    type: Number,
    required: true // 1 for winner, 2+ for others
  },
  prizeMoney: {
    type: Number,
    default: 0
  },
  numbersCalledCount: {
    type: Number,
    required: true
  },
  gameDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

const GameResult = mongoose.model('GameResult', gameResultSchema);
export default GameResult;
