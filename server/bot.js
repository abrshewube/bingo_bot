// const TelegramBot = require('node-telegram-bot-api');
// const User = require('./models/User');
import TelegramBot from 'node-telegram-bot-api';
import User from './models/User.js';


class BingoBot {
  constructor() {
    this.bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
    this.setupCommands();
    this.setupCallbacks();
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;

      try {
        let dbUser = await User.findOne({ telegramId: user.id.toString() });
        
        if (!dbUser) {
          dbUser = new User({
            telegramId: user.id.toString(),
            firstName: user.first_name,
            lastName: user.last_name || '',
            username: user.username || ''
          });
          await dbUser.save();
        }

        const welcomeMessage = `🎮 Welcome to Bingo Bot, ${user.first_name}!\n\n` +
          `Get ready for exciting bingo games with real prizes!\n\n` +
          `💰 Money Levels: 10, 20, 30, 50 Birr\n` +
          `🏆 Win up to 80% of the total pot\n` +
          `👥 Minimum 3 players per game\n\n` +
          `Choose an option below:`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '🎮 Play Game', web_app: { url: process.env.WEBAPP_URL } }],
            [{ text: '📱 Register', callback_data: 'register' }],
            [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }],
            [{ text: '💰 Wallet', callback_data: 'wallet' }]
          ]
        };

        await this.bot.sendMessage(chatId, welcomeMessage, {
          reply_markup: keyboard
        });
      } catch (error) {
        console.error('Start command error:', error);
        await this.bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
      }
    });

    // Register command
    this.bot.onText(/\/register/, async (msg) => {
      await this.handleRegistration(msg.chat.id, msg.from);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const helpMessage = `🎮 Bingo Bot Commands:\n\n` +
        `/start - Start the bot and see main menu\n` +
        `/register - Register with your phone number\n` +
        `/help - Show this help message\n\n` +
        `🎯 How to Play:\n` +
        `1. Register with your phone number\n` +
        `2. Choose a money level (10-50 Birr)\n` +
        `3. Join a game room\n` +
        `4. Mark numbers on your bingo card\n` +
        `5. First to get BINGO wins the prize!\n\n` +
        `💰 Prize = 80% of total pot\n` +
        `👥 Minimum 3 players per game`;

      await this.bot.sendMessage(msg.chat.id, helpMessage);
    });
  }

  setupCallbacks() {
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const user = query.from;

      try {
        switch (data) {
          case 'register':
            await this.handleRegistration(chatId, user);
            break;
          case 'leaderboard':
            await this.showLeaderboard(chatId);
            break;
          case 'wallet':
            await this.showWallet(chatId, user);
            break;
        }
        
        await this.bot.answerCallbackQuery(query.id);
      } catch (error) {
        console.error('Callback query error:', error);
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Something went wrong. Please try again.',
          show_alert: true
        });
      }
    });

    // Handle contact sharing
    this.bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      const contact = msg.contact;
      const user = msg.from;

      try {
        if (contact.user_id !== user.id) {
          await this.bot.sendMessage(chatId, 'Please share your own contact information.');
          return;
        }

        const dbUser = await User.findOne({ telegramId: user.id.toString() });
        if (!dbUser) {
          await this.bot.sendMessage(chatId, 'Please start the bot first with /start');
          return;
        }

        dbUser.phoneNumber = contact.phone_number;
        dbUser.isRegistered = true;
        await dbUser.save();

        const keyboard = {
          inline_keyboard: [
            [{ text: '🎮 Play Now', web_app: { url: process.env.WEBAPP_URL } }]
          ]
        };

        await this.bot.sendMessage(chatId, 
          `✅ Registration completed successfully!\n\n` +
          `Phone: ${contact.phone_number}\n\n` +
          `You can now play bingo games!`,
          { reply_markup: keyboard }
        );
      } catch (error) {
        console.error('Contact handler error:', error);
        await this.bot.sendMessage(chatId, 'Registration failed. Please try again.');
      }
    });
  }

  async handleRegistration(chatId, user) {
    try {
      const dbUser = await User.findOne({ telegramId: user.id.toString() });
      
      if (!dbUser) {
        await this.bot.sendMessage(chatId, 'Please start the bot first with /start');
        return;
      }

      if (dbUser.isRegistered) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '🎮 Play Game', web_app: { url: process.env.WEBAPP_URL } }]
          ]
        };
        
        await this.bot.sendMessage(chatId, 
          `✅ You are already registered!\n\nPhone: ${dbUser.phoneNumber}\n\nReady to play?`,
          { reply_markup: keyboard }
        );
        return;
      }

      const keyboard = {
        keyboard: [
          [{ text: '📱 Share Phone Number', request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      };

      await this.bot.sendMessage(chatId,
        `📱 To complete registration, please share your phone number.\n\n` +
        `This is required to:\n` +
        `• Verify your identity\n` +
        `• Secure your winnings\n` +
        `• Contact you if needed\n\n` +
        `Click the button below to share your contact:`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Registration handler error:', error);
      await this.bot.sendMessage(chatId, 'Registration failed. Please try again.');
    }
  }

  async showLeaderboard(chatId) {
    try {
      // This would integrate with your GameService
      const message = `🏆 Leaderboard Coming Soon!\n\n` +
        `Track top winners:\n` +
        `📅 Daily Champions\n` +
        `📊 Weekly Leaders\n` +
        `👑 All-Time Winners\n\n` +
        `Play games to appear on the leaderboard!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎮 Play Game', web_app: { url: process.env.WEBAPP_URL } }]
        ]
      };

      await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      console.error('Leaderboard error:', error);
    }
  }

  async showWallet(chatId, user) {
    try {
      const dbUser = await User.findOne({ telegramId: user.id.toString() });
      
      if (!dbUser) {
        await this.bot.sendMessage(chatId, 'Please start the bot first with /start');
        return;
      }

      const message = `💰 Your Wallet\n\n` +
        `Balance: ${dbUser.walletBalance} Birr\n` +
        `Games Played: ${dbUser.gamesPlayed}\n` +
        `Games Won: ${dbUser.gamesWon}\n` +
        `Total Winnings: ${dbUser.totalWinnings} Birr\n\n` +
        `💡 Deposit feature coming soon!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎮 Play Game', web_app: { url: process.env.WEBAPP_URL } }]
        ]
      };

      await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      console.error('Wallet error:', error);
      await this.bot.sendMessage(chatId, 'Failed to load wallet. Please try again.');
    }
  }

  async sendMessage(chatId, message, options = {}) {
    try {
      return await this.bot.sendMessage(chatId, message, options);
    } catch (error) {
      console.error('Send message error:', error);
    }
  }
}

export default BingoBot;