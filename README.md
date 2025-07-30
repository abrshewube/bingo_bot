# Bingo Bot - Telegram Mini Web App

A full-featured Telegram Bingo Bot mini web app with real-time gameplay, user registration, and leaderboards.

## Features

- 🎮 **Real-time Bingo Games** - Socket.IO powered multiplayer gameplay
- 📱 **Phone Registration** - Secure user verification via Telegram contact sharing
- 💰 **Multiple Money Levels** - 10, 20, 30, 50 Birr entry levels
- 🏆 **Leaderboards** - Daily, weekly, and all-time rankings
- 👥 **Game Rooms** - Join existing games or create new ones
- 🃏 **Auto Bingo Cards** - Unique card generation for each player
- 🎯 **Winner Detection** - Automatic bingo verification and prize distribution
- 💳 **Wallet System** - Track winnings and balances

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + MongoDB + Socket.IO
- **Bot**: Telegram Bot API with node-telegram-bot-api
- **Real-time**: Socket.IO for live game updates
- **Database**: MongoDB with Mongoose ODM

## Quick Start

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your bot token and MongoDB URI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

## Environment Variables

```
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=mongodb://localhost:27017/bingo-bot
JWT_SECRET=your_jwt_secret
PORT=3001
WEBAPP_URL=http://localhost:5173
```

## Game Flow

1. **Registration**: Users share phone number via Telegram
2. **Money Level**: Choose entry level (10-50 Birr)
3. **Game Selection**: Join existing or create new games
4. **Gameplay**: Real-time number calling and card marking
5. **Winner**: First to get BINGO wins 80% of the pot

## Bot Commands

- `/start` - Initialize bot and show main menu
- `/register` - Complete phone registration
- `/help` - Show help information

## API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register-phone` - Phone registration
- `GET /api/games/available` - List available games
- `GET /api/games/:roomId` - Game details
- `GET /api/games/leaderboard/:period` - Leaderboard data

## Socket Events

- `joinGame` - Join/create game by money level
- `joinRoom` - Join specific game room
- `markNumber` - Mark number on bingo card
- `numberCalled` - Server broadcasts called numbers
- `gameEnded` - Game completion notification

## Database Schema

### Users
- `telegramId` - Unique Telegram user ID
- `firstName`, `lastName`, `username` - User info
- `phoneNumber` - Registered phone
- `isRegistered` - Registration status
- `walletBalance` - Virtual wallet balance
- `gamesPlayed`, `gamesWon`, `totalWinnings` - Stats

### Games
- `roomId` - Unique game room identifier
- `moneyLevel` - Entry fee (10, 20, 30, 50)
- `players` - Array of game participants
- `status` - waiting, playing, finished
- `calledNumbers` - Numbers called during game
- `winner` - Game winner information

### GameResults
- `gameId`, `userId` - Reference IDs
- `position` - Player ranking (1 = winner)
- `prizeMoney` - Amount won
- `gameDate` - When game was played

## Deployment

The app is designed to work as a Telegram Mini Web App. Set up your bot with BotFather and configure the web app URL.

## License

MIT License - see LICENSE file for details