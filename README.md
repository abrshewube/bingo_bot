## Now continue from this.

## 🚀 Game Flow Overview

1. **Play Game Entry**
   - User taps “Play Game” inside the Telegram bot.
   - Bot passes `telegramId` to the web app for authentication.
   - Authenticated users are shown a list of available money levels:
     - 10, 20, 30, 40, 50, 100 Birr

2. **Room Status Display**
   - For each money level:
     - **Status**: `active` (if game is ongoing) or `start` (if no players yet)
     - Countdown starts when first player joins
     - Minimum players: 10  
     - Maximum players: 100  
     - Game auto-starts after 3 minutes or once 100 players join

3. **Joining a Room**
   - User joins a room and receives a **beautifully designed Bingo card**
   - Gameplay begins with **animated ball roll effect** and **voice-calling number draws**

4. **Number Calling**
   - Each number is drawn with a rolling animation + sound
   - Drawn ball visually vanishes, then the next draw begins

5. **Winning Rules**
   - The following Bingo patterns are considered wins:
     - Horizontal
     - Vertical
     - Diagonal
     - Four Corners

6. **Winner Announcement**
   - Winners are announced in real-time
   - Winnings distributed based on game pot
   - Leaderboard updated with stats

7. **Wallet System**
   - Authenticated users have a wallet
   - Winnings added automatically
   - Withdrawals decrease wallet balance (payment integration coming soon)

8. **Game History**
   - Users can view past games, outcomes, and earnings

---

## 🎯 Features

- 🔒 Telegram Phone Authentication
- 💰 Multiple Money Levels (10–100 Birr)
- 🧩 Auto-Generated Bingo Cards
- 🌀 Beautiful Animated Ball Rolls
- 🔊 Voice-Based Number Calling
- 🧠 Smart Winner Selection Algorithm (not rigid/random)
- 🏅 Real-Time Leaderboard and Player Stats
- 💳 Wallet Tracking & Simple Withdrawal System

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Real-Time**: Socket.IO for gameplay updates
- **Bot**: Telegram Bot API using `node-telegram-bot-api`

