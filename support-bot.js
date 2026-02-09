// =========================================
// Game Zone Support Bot
// =========================================

const TelegramBot = require('node-telegram-bot-api');

// Bot token from @BotFather
const BOT_TOKEN = '7713888286:AAEqAezUVp_DDx1NCSkvH1UuZ9VOXW9_RNY';

// Admin user ID (get it by sending /start and checking console)
const ADMIN_ID = null; // Will be set on first message from admin

// Store for user-message mapping (to reply back)
const userMessages = new Map();

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Game Zone Support Bot started!');

// /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Друг';

    console.log(`New user started: ${msg.from.username || msg.from.id}`);

    const welcomeMessage = `👋 Здравствуйте, ${userName}!

🎮 Добро пожаловать в поддержку **Game Zone**!

📝 С чем вам нужна помощь?
Отправьте вашу проблему **текстом**, **фото** или **видео** и вам обязательно помогут!

⏳ Ожидайте ответ технической поддержки.`;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Handle all messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'Пользователь';
    const username = msg.from.username ? `@${msg.from.username}` : 'нет username';

    // Skip /start command
    if (msg.text && msg.text.startsWith('/')) return;

    // If this is admin replying to forwarded message
    if (msg.reply_to_message && msg.reply_to_message.forward_from) {
        const originalUserId = msg.reply_to_message.forward_from.id;

        // Send admin's reply to the user
        if (msg.text) {
            bot.sendMessage(originalUserId, `💬 **Ответ поддержки:**\n\n${msg.text}`, { parse_mode: 'Markdown' });
        } else if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1];
            bot.sendPhoto(originalUserId, photo.file_id, { caption: '💬 Ответ поддержки' });
        } else if (msg.document) {
            bot.sendDocument(originalUserId, msg.document.file_id, { caption: '💬 Ответ поддержки' });
        }

        bot.sendMessage(chatId, '✅ Ответ отправлен пользователю!');
        return;
    }

    // Forward user message to admin
    const ADMIN_CHAT_ID = 1177236734; // @Chachka_Chipcov Telegram ID

    // Store message for reply tracking
    userMessages.set(msg.message_id, userId);

    // Forward the message
    bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id)
        .then(() => {
            // Send notification with user info
            bot.sendMessage(ADMIN_CHAT_ID, `📩 Сообщение от: ${userName} (${username})\nID: ${userId}\n\n💡 Ответьте на пересланное сообщение, чтобы ответить пользователю.`);
        })
        .catch((err) => {
            console.error('Error forwarding message:', err);
        });

    // Confirm to user
    bot.sendMessage(chatId, '✅ Ваше сообщение получено! Ожидайте ответа поддержки.');
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
});

console.log('Bot is running. Send /start to test!');
