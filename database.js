// ==================== DATABASE MODELS ====================
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-games';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Player Schema - профиль игрока
const playerSchema = new mongoose.Schema({
  tgId: { type: String, required: true, unique: true }, // Telegram ID
  username: { type: String, default: null }, // @username
  firstName: { type: String, required: true }, // Имя
  lastName: { type: String, default: null }, // Фамилия
  avatarUrl: { type: String, default: null }, // Ссылка на аватарку
  
  // Общая статистика
  stats: {
    totalGames: { type: Number, default: 0 }, // Всего игр сыграно
    totalWins: { type: Number, default: 0 }, // Всего побед
    totalLosses: { type: Number, default: 0 }, // Всего поражений
    totalDraws: { type: Number, default: 0 }, // Всего ничьих
    winRate: { type: Number, default: 0 } // Процент побед
  },
  
  // Статистика по играм
  games: {
    rps: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 } // Лучшая серия побед
    },
    tictactoe: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 }
    },
    battleship: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    chess: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      rating: { type: Number, default: 1000 } // Рейтинг Эло
    },
    checkers: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 }
    },
    durak: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    uno: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    monopoly: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    minesweeper: {
      played: { type: Number, default: 0 },
      bestTimeEasy: { type: Number, default: null }, // Лучшее время на лёгком
      bestTimeMedium: { type: Number, default: null }, // Лучшее время на среднем
      bestTimeHard: { type: Number, default: null } // Лучшее время на сложном
    },
    snake: {
      played: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 } // Лучший счёт
    },
    match3: {
      played: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 } // Лучший счёт
    }
  },
  
  // История последних игр
  recentGames: [{
    gameType: String,
    result: String, // 'win', 'loss', 'draw'
    date: { type: Date, default: Date.now },
    opponent: String, // Имя соперника
    score: String // Счёт (например, "3-1")
  }],
  
  // Даты создания и обновления
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Обновляем updatedAt перед сохранением
playerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Пересчитываем общую статистику
  let totalPlayed = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  
  Object.values(this.games).forEach(game => {
    if (game.played) totalPlayed += game.played;
    if (game.wins) totalWins += game.wins;
    if (game.losses) totalLosses += game.losses;
    if (game.draws) totalDraws += game.draws;
  });
  
  this.stats.totalGames = totalPlayed;
  this.stats.totalWins = totalWins;
  this.stats.totalLosses = totalLosses;
  this.stats.totalDraws = totalDraws;
  this.stats.winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
  
  next();
});

// Методы для обновления статистики
playerSchema.methods.updateGameStats = function(gameType, result, extraData = {}) {
  if (!this.games[gameType]) {
    this.games[gameType] = { played: 0, wins: 0, losses: 0, draws: 0 };
  }
  
  const game = this.games[gameType];
  game.played++;
  
  if (result === 'win') {
    game.wins++;
    // Обновляем серию побед для RPS
    if (gameType === 'rps') {
      const currentStreak = extraData.streak || 1;
      if (currentStreak > (game.bestStreak || 0)) {
        game.bestStreak = currentStreak;
      }
    }
  } else if (result === 'loss') {
    game.losses++;
  } else if (result === 'draw') {
    game.draws++;
  }
  
  // Обновляем рекорды для одиночных игр
  if (gameType === 'minesweeper' && extraData.time) {
    const difficulty = extraData.difficulty;
    if (difficulty === 'easy' && (game.bestTimeEasy === null || extraData.time < game.bestTimeEasy)) {
      game.bestTimeEasy = extraData.time;
    }
    if (difficulty === 'medium' && (game.bestTimeMedium === null || extraData.time < game.bestTimeMedium)) {
      game.bestTimeMedium = extraData.time;
    }
    if (difficulty === 'hard' && (game.bestTimeHard === null || extraData.time < game.bestTimeHard)) {
      game.bestTimeHard = extraData.time;
    }
  }
  
  if (gameType === 'snake' && extraData.score && (!game.bestScore || extraData.score > game.bestScore)) {
    game.bestScore = extraData.score;
  }
  
  if (gameType === 'match3' && extraData.score && (!game.bestScore || extraData.score > game.bestScore)) {
    game.bestScore = extraData.score;
  }
  
  // Добавляем в историю
  this.recentGames.unshift({
    gameType,
    result,
    opponent: extraData.opponent || 'Бот',
    score: extraData.score || ''
  });
  
  // Оставляем только последние 10 игр
  if (this.recentGames.length > 10) {
    this.recentGames = this.recentGames.slice(0, 10);
  }
  
  return this.save();
};

// Статический метод для получения топ игроков
playerSchema.statics.getLeaderboard = function(gameType, limit = 10) {
  const sortField = gameType === 'minesweeper' || gameType === 'snake' || gameType === 'match3' 
    ? `games.${gameType}.bestScore` 
    : `games.${gameType}.wins`;
  
  return this.find({ [`games.${gameType}.played`]: { $gt: 0 } })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .select('tgId username firstName avatarUrl games stats');
};

// Статический метод для получения профиля игрока
playerSchema.statics.getPlayerProfile = function(tgId) {
  return this.findOne({ tgId });
};

// Создаем модель
const Player = mongoose.model('Player', playerSchema);

module.exports = { mongoose, Player };
