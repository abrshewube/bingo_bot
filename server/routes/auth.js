// const express = require('express');
// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
// import { generateToken } from '../utils/jwt.js';


const router = express.Router();

// Middleware to verify Telegram data
const verifyTelegramAuth = (req, res, next) => {
  const { telegramId, firstName, lastName, username } = req.body;
  
  if (!telegramId || !firstName) {
    return res.status(400).json({ error: 'Invalid telegram data' });
  }
  
  req.telegramData = { telegramId, firstName, lastName, username };
  next();
};

// Login/Register user
router.post('/login', verifyTelegramAuth, async (req, res) => {
  try {
    const { telegramId, firstName, lastName, username } = req.telegramData;
    
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = new User({
        telegramId,
        firstName,
        lastName: lastName || '',
        username: username || '',
        isRegistered: false
      });
      await user.save();
    } else {
      // Update user info
      user.firstName = firstName;
      user.lastName = lastName || '';
      user.username = username || '';
      user.lastActive = new Date();
      await user.save();
    }
    
    const token = jwt.sign(
      { userId: user._id, telegramId: user.telegramId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        isRegistered: user.isRegistered,
        walletBalance: user.walletBalance,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        totalWinnings: user.totalWinnings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register phone number
router.post('/register-phone', verifyTelegramAuth, async (req, res) => {
  try {
    const { telegramId } = req.telegramData;
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.phoneNumber = phoneNumber;
    user.isRegistered = true;
    await user.save();
    
    res.json({
      message: 'Registration completed successfully!',
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        isRegistered: user.isRegistered,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;