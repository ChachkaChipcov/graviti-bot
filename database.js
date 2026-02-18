// ==================== SQL DATABASE (SQLite) ====================
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'game_stats.db');

let db = null;

// Инициализация базы данных
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Загружаем существующую БД или создаём новую
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Создаём таблицы
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      tg_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      best_score INTEGER,
      best_time INTEGER,
      best_streak INTEGER,
      rating INTEGER DEFAULT 1000,
      FOREIGN KEY (tg_id) REFERENCES players(tg_id),
      UNIQUE(tg_id, game_type)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      result TEXT NOT NULL,
      opponent TEXT,
      score TEXT,
      streak INTEGER,
      difficulty TEXT,
      time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tg_id) REFERENCES players(tg_id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS minesweeper_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      time_ms INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tg_id) REFERENCES players(tg_id)
    )
  `);
  
  // Индексы для ускорения поиска
  db.run(`CREATE INDEX IF NOT EXISTS idx_game_stats_tg ON game_stats(tg_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_game_stats_wins ON game_stats(wins DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_game_history_tg ON game_history(tg_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_minesweeper_time ON minesweeper_records(time_ms)`);
  
  saveDatabase();
  console.log('✅ SQLite database initialized');
}

// Сохранение БД на диск
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// ==================== PLAYER MODEL ====================
const Player = {
  // Создать или обновить игрока
  async sync(tgId, data) {
    const { username, firstName, lastName, avatarUrl } = data;
    
    const existing = db.exec(`SELECT * FROM players WHERE tg_id = '${tgId}'`);
    
    if (existing.length === 0) {
      db.run(`
        INSERT INTO players (tg_id, username, first_name, last_name, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `, [tgId, username, firstName, lastName, avatarUrl]);
    } else {
      db.run(`
        UPDATE players 
        SET username = COALESCE(?, username),
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE tg_id = ?
      `, [username, firstName, lastName, avatarUrl, tgId]);
    }
    
    // Создаём записи статистики для всех игр если их нет
    const games = ['rps', 'tictactoe', 'battleship', 'chess', 'checkers', 'durak', 'uno', 'monopoly', 'minesweeper', 'snake', 'match3'];
    games.forEach(gameType => {
      const stats = db.exec(`SELECT * FROM game_stats WHERE tg_id = '${tgId}' AND game_type = '${gameType}'`);
      if (stats.length === 0) {
        db.run(`INSERT INTO game_stats (tg_id, game_type) VALUES (?, ?)`, [tgId, gameType]);
      }
    });
    
    saveDatabase();
    return this.getProfile(tgId);
  },
  
  // Получить профиль игрока
  getProfile(tgId) {
    const playerResult = db.exec(`SELECT * FROM players WHERE tg_id = '${tgId}'`);
    if (playerResult.length === 0) return null;
    
    const player = playerResult[0].values[0];
    const columns = playerResult[0].columns;
    const playerObj = {};
    columns.forEach((col, i) => playerObj[col] = player[i]);
    
    // Получаем статистику по играм
    const statsResult = db.exec(`SELECT * FROM game_stats WHERE tg_id = '${tgId}'`);
    const games = {};
    
    if (statsResult.length > 0) {
      const statColumns = statsResult[0].columns;
      statsResult[0].values.forEach(row => {
        const statObj = {};
        statColumns.forEach((col, i) => statObj[col] = row[i]);
        games[statObj.game_type] = statObj;
      });
    }
    
    // Общая статистика
    const totalStats = db.exec(`
      SELECT 
        SUM(played) as totalGames,
        SUM(wins) as totalWins,
        SUM(losses) as totalLosses,
        SUM(draws) as totalDraws
      FROM game_stats 
      WHERE tg_id = '${tgId}'
    `);
    
    let totalGames = 0, totalWins = 0, totalLosses = 0, totalDraws = 0;
    if (totalStats.length > 0 && totalStats[0].values[0]) {
      [totalGames, totalWins, totalLosses, totalDraws] = totalStats[0].values[0];
    }
    
    // Последние игры
    const historyResult = db.exec(`
      SELECT * FROM game_history 
      WHERE tg_id = '${tgId}' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    const recentGames = [];
    if (historyResult.length > 0) {
      const histColumns = historyResult[0].columns;
      historyResult[0].values.forEach(row => {
        const histObj = {};
        histColumns.forEach((col, i) => histObj[col] = row[i]);
        recentGames.push(histObj);
      });
    }
    
    return {
      ...playerObj,
      stats: {
        totalGames: totalGames || 0,
        totalWins: totalWins || 0,
        totalLosses: totalLosses || 0,
        totalDraws: totalDraws || 0,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
      },
      games,
      recentGames
    };
  },
  
  // Обновить статистику игры
  async updateGameStats(tgId, gameType, result, extraData = {}) {
    // Обновляем game_stats
    if (result === 'win') {
      db.run(`
        UPDATE game_stats 
        SET played = played + 1, wins = wins + 1,
            best_streak = CASE WHEN ? > best_streak THEN ? ELSE best_streak END
        WHERE tg_id = ? AND game_type = ?
      `, [extraData.streak || 0, extraData.streak || 0, tgId, gameType]);
    } else if (result === 'loss') {
      db.run(`
        UPDATE game_stats 
        SET played = played + 1, losses = losses + 1, best_streak = 0
        WHERE tg_id = ? AND game_type = ?
      `, [tgId, gameType]);
    } else if (result === 'draw') {
      db.run(`
        UPDATE game_stats 
        SET played = played + 1, draws = draws + 1
        WHERE tg_id = ? AND game_type = ?
      `, [tgId, gameType]);
    }
    
    // Обновляем рекорды для одиночных игр
    if (gameType === 'minesweeper' && extraData.time && extraData.difficulty) {
      db.run(`
        UPDATE game_stats 
        SET best_time = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_time END
        WHERE tg_id = ? AND game_type = ?
      `, [extraData.time, extraData.time, tgId, gameType]);
      
      // Сохраняем в таблицу рекордов
      db.run(`
        INSERT INTO minesweeper_records (tg_id, difficulty, time_ms)
        SELECT ?, ?, ? WHERE NOT EXISTS (
          SELECT 1 FROM minesweeper_records WHERE tg_id = ? AND difficulty = ? AND time_ms <= ?
        )
      `, [tgId, extraData.difficulty, extraData.time, tgId, extraData.difficulty, extraData.time]);
    }
    
    if (gameType === 'snake' && extraData.score) {
      db.run(`
        UPDATE game_stats 
        SET best_score = CASE WHEN ? > best_score OR best_score IS NULL THEN ? ELSE best_score END
        WHERE tg_id = ? AND game_type = ?
      `, [extraData.score, extraData.score, tgId, gameType]);
    }
    
    if (gameType === 'match3' && extraData.score) {
      db.run(`
        UPDATE game_stats 
        SET best_score = CASE WHEN ? > best_score OR best_score IS NULL THEN ? ELSE best_score END
        WHERE tg_id = ? AND game_type = ?
      `, [extraData.score, extraData.score, tgId, gameType]);
    }
    
    // Добавляем в историю
    db.run(`
      INSERT INTO game_history (tg_id, game_type, result, opponent, score, streak, difficulty, time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tgId,
      gameType,
      result,
      extraData.opponent || 'Бот',
      extraData.score || '',
      extraData.streak || null,
      extraData.difficulty || null,
      extraData.time || null
    ]);
    
    saveDatabase();
    return this.getProfile(tgId);
  },
  
  // Получить топ игроков
  getLeaderboard(gameType, limit = 10) {
    let query;
    
    if (gameType === 'minesweeper') {
      query = `
        SELECT p.tg_id, p.username, p.first_name, p.avatar_url, gs.best_time
        FROM game_stats gs
        JOIN players p ON gs.tg_id = p.tg_id
        WHERE gs.game_type = '${gameType}' AND gs.best_time IS NOT NULL
        ORDER BY gs.best_time ASC
        LIMIT ${limit}
      `;
    } else if (gameType === 'snake' || gameType === 'match3') {
      query = `
        SELECT p.tg_id, p.username, p.first_name, p.avatar_url, gs.best_score
        FROM game_stats gs
        JOIN players p ON gs.tg_id = p.tg_id
        WHERE gs.game_type = '${gameType}' AND gs.best_score IS NOT NULL
        ORDER BY gs.best_score DESC
        LIMIT ${limit}
      `;
    } else {
      query = `
        SELECT p.tg_id, p.username, p.first_name, p.avatar_url, gs.wins, gs.played
        FROM game_stats gs
        JOIN players p ON gs.tg_id = p.tg_id
        WHERE gs.game_type = '${gameType}'
        ORDER BY gs.wins DESC
        LIMIT ${limit}
      `;
    }
    
    const result = db.exec(query);
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  },
  
  // Получить топ по общим победам
  getTopPlayers(limit = 10) {
    const query = `
      SELECT p.tg_id, p.username, p.first_name, p.avatar_url,
             SUM(gs.wins) as total_wins,
             SUM(gs.played) as total_played
      FROM game_stats gs
      JOIN players p ON gs.tg_id = p.tg_id
      GROUP BY p.tg_id
      HAVING SUM(gs.wins) > 0
      ORDER BY total_wins DESC
      LIMIT ${limit}
    `;
    
    const result = db.exec(query);
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }
};

// Инициализируем БД при загрузке
initDatabase();

// Автосохранение каждые 30 секунд
setInterval(saveDatabase, 30000);

module.exports = { db, Player, saveDatabase };
