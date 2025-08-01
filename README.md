# 🎮 Bingo Bot Game

A real-time multiplayer bingo game with Telegram integration, featuring cartela selection, manual win claiming, and enhanced game mechanics.

## ✨ New Features

### 🎟️ Cartela (Card Selection) System
- **100 Unique Cartelas**: Players select from 100 unique cartela numbers (1-100)
- **Consistent Card Generation**: Each cartela number generates the same bingo card every time
- **Visual Selection Interface**: Grid-based cartela selector with taken/available indicators
- **Flexible Selection**: Players can change cartelas before joining the game

### 🛑 Enhanced Exit Rules
- **Pre-Game Exit**: Players can leave before the game starts with automatic refund
- **No-Refund Warning**: Clear warning when attempting to exit during active gameplay
- **Exit Prevention**: Disabled exit functionality once game begins

### 📏 Smart Game Duration & Player Management
- **2-Minute Maximum**: Games automatically end after 2 minutes
- **Dynamic Timing**: 25-40 numbers called with 1.5-2s delays
- **Guaranteed Winners**: RNG balancing ensures 1-3 winners per game
- **Player Engagement**: All players see partial progress to maintain motivation

### 🔕 Manual Win Claiming System
- **No Auto-Highlighting**: System doesn't automatically highlight winning patterns
- **Manual Marking**: Players must manually click to mark called numbers
- **Visual Indicators**: Marked numbers show clear visual feedback
- **Win Declaration**: Players click "CLAIM BINGO!" to declare wins
- **Server Validation**: Win patterns validated server-side before acceptance

### 🏆 Enhanced Win Conditions
Players can win by completing any of these patterns:
- **Horizontal Line**: Any complete row
- **Vertical Line**: Any complete column  
- **Diagonal Line**: Either diagonal
- **Four Corners**: All four corner squares

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB
- Telegram Bot Token

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd project
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/bingo-bot
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
PORT=3001
```

4. **Start the development server**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

## 🎯 Game Flow

### 1. Cartela Selection
- Player joins a game room
- Selects a unique cartela number (1-100)
- System generates consistent bingo card for that cartela
- Player can change cartela before joining

### 2. Game Joining
- Player clicks "Join Game" to commit
- Entry fee deducted from wallet
- Player locked into game (no refund if leaving)

### 3. Gameplay
- Numbers called every 1.5-2 seconds
- Players manually mark numbers on their cards
- Visual feedback for called and marked numbers
- Game ends when someone claims a win or time expires

### 4. Win Claiming
- Player completes a winning pattern
- Clicks "CLAIM BINGO!" button
- Selects winning pattern type
- Server validates and awards prizes

## 🏗️ Architecture

### Backend (Node.js + Express + Socket.IO)
- **Real-time Communication**: Socket.IO for live game updates
- **Game Logic**: Server-side game state management
- **Cartela System**: Seeded random generation for consistent cards
- **Win Validation**: Server-side pattern verification
- **Timer Management**: Automatic game duration control

### Frontend (React + TypeScript)
- **Cartela Selector**: Interactive grid for cartela selection
- **Bingo Card**: Enhanced card with manual marking
- **Real-time Updates**: Live game state synchronization
- **Win Claiming**: Pattern selection interface
- **Exit Warnings**: Modal dialogs for game exit prevention

### Database (MongoDB)
- **Game State**: Complete game information and player data
- **Cartela Tracking**: Player cartela selections and card data
- **Win Records**: Detailed win patterns and prize information
- **User Statistics**: Game history and performance metrics

## 🎮 Game Features

### Smart Algorithm
- **Guaranteed Winners**: Ensures 1-3 winners per game
- **Balanced RNG**: Players with most marked numbers win if no manual claims
- **Time Management**: Automatic game termination after 2 minutes
- **Player Engagement**: Partial progress tracking for all players

### Enhanced UX
- **Visual Feedback**: Clear indicators for game state
- **Audio Announcements**: Text-to-speech for called numbers
- **Responsive Design**: Works on mobile and desktop
- **Real-time Updates**: Live countdowns and player status

### Security & Fairness
- **Server Validation**: All win claims verified server-side
- **Anti-Cheat**: No client-side win detection
- **Consistent Cards**: Same cartela always generates same card
- **Fair Distribution**: 80% of pot distributed to winners

## 🔧 Development

### Key Components

#### CartelaSelector.tsx
- Grid-based cartela selection interface
- Visual indicators for taken/available cartelas
- Consistent card generation based on cartela number

#### BingoCard.tsx  
- Enhanced bingo card with manual marking
- Win pattern detection and claiming
- Visual feedback for game state

#### GameService.js
- Complete game logic and state management
- Cartela selection and validation
- Win claiming and pattern verification
- Timer and duration management

### Socket Events

#### Client → Server
- `selectCartela`: Choose cartela number
- `joinGame`: Commit to game after cartela selection
- `leaveGame`: Exit before game starts
- `markNumber`: Mark number on card
- `claimWin`: Declare winning pattern

#### Server → Client
- `cartelaSelected`: Confirm cartela selection
- `gameJoined`: Confirm game participation
- `gameLeft`: Confirm exit with refund
- `numberCalled`: New number announcement
- `potentialWinners`: Players with winning patterns
- `gameEnded`: Game completion with results

## 🎯 Future Enhancements

- **Tournament Mode**: Multi-round competitions
- **Achievement System**: Badges and rewards
- **Social Features**: Friend lists and private games
- **Advanced Statistics**: Detailed performance analytics
- **Mobile App**: Native mobile application
- **Voice Chat**: In-game voice communication

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

