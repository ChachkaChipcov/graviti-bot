# 🗄️ SQL База Данных (SQLite)

## Что добавлено:

✅ **SQLite база данных** для хранения:
- Профилей игроков (ник, аватарка из Telegram)
- Статистики по всем играм
- Таблицы лидеров
- Истории игр
- Рекордов для одиночных игр

## 📊 Структура БД:

### Таблица `players`
```sql
CREATE TABLE players (
  tg_id TEXT PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  avatar_url TEXT,
  created_at DATETIME,
  updated_at DATETIME
)
```

### Таблица `game_stats`
```sql
CREATE TABLE game_stats (
  id INTEGER PRIMARY KEY,
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
  UNIQUE(tg_id, game_type)
)
```

### Таблица `game_history`
```sql
CREATE TABLE game_history (
  id INTEGER PRIMARY KEY,
  tg_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  result TEXT NOT NULL,
  opponent TEXT,
  score TEXT,
  streak INTEGER,
  difficulty TEXT,
  time_ms INTEGER,
  created_at DATETIME
)
```

### Таблица `minesweeper_records`
```sql
CREATE TABLE minesweeper_records (
  id INTEGER PRIMARY KEY,
  tg_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  created_at DATETIME
)
```

## 📋 API Endpoints:

### 1. Получить профиль игрока
```
GET /api/player/:tgId
```

### 2. Получить таблицу лидеров для игры
```
GET /api/leaderboard/:gameType?limit=10
```
Примеры:
- `/api/leaderboard/rps?limit=10` - топ по КНБ
- `/api/leaderboard/snake?limit=10` - топ по Змейке
- `/api/leaderboard/minesweeper?limit=10` - топ по Сапёру

### 3. Получить топ игроков по общим победам
```
GET /api/top-players?limit=10
```

### 4. Обновить статистику игрока
```
POST /api/player/:tgId/update-stats
Body: {
  "gameType": "rps",
  "result": "win",
  "opponent": "Имя соперника",
  "score": "3-1",
  "firstName": "Имя",
  "username": "username",
  "avatarUrl": "https://..."
}
```

### 5. Синхронизировать данные из Telegram
```
POST /api/player/sync
Body: {
  "tgId": "123456789",
  "username": "username",
  "firstName": "Имя",
  "lastName": "Фамилия",
  "avatarUrl": "https://..."
}
```

## 🚀 Преимущества SQLite:

✅ **Не требует настройки** - база данных хранится в файле `game_stats.db`
✅ **Работает из коробки** - никаких внешних подключений
✅ **Автосохранение** - каждые 30 секунд + после каждой операции
✅ **Быстрые запросы** - индексы для ускорения поиска
✅ **Бесплатно** - не нужен MongoDB Atlas

## 📁 Файл БД:

База данных сохраняется в файле:
```
/game_stats.db
```

**Важно:** Добавьте `game_stats.db` в `.gitignore` чтобы не коммитить базу данных!

## 🔌 Использование в коде:

```javascript
const { Player } = require('./database');

// Синхронизация игрока
Player.sync(tgId, {
  firstName: 'Иван',
  username: 'ivan',
  avatarUrl: 'https://...'
});

// Получить профиль
const profile = Player.getProfile(tgId);

// Обновить статистику
await Player.updateGameStats(tgId, 'rps', 'win', {
  opponent: 'Петр',
  score: '3-1'
});

// Получить топ игроков
const leaderboard = Player.getLeaderboard('rps', 10);
const topPlayers = Player.getTopPlayers(10);
```

## 🎮 Поддерживаемые игры:

| Игра | Тип | Статистика |
|------|-----|------------|
| `rps` | Мультиплеер | Победы, Поражения, Ничьи, Серия побед |
| `tictactoe` | Мультиплеер | Победы, Поражения, Ничьи |
| `battleship` | Мультиплеер | Победы, Поражения |
| `chess` | Мультиплеер | Победы, Поражения, Ничьи, Рейтинг |
| `checkers` | Мультиплеер | Победы, Поражения, Ничьи |
| `durak` | Мультиплеер | Победы, Поражения |
| `uno` | Мультиплеер | Победы, Поражения |
| `monopoly` | Мультиплеер | Победы, Поражения |
| `minesweeper` | Соло | Лучшее время (лёгкий, средний, сложный) |
| `snake` | Соло | Лучший счёт |
| `match3` | Соло | Лучший счёт |

## 📈 Пример ответа API:

```json
{
  "success": true,
  "player": {
    "tg_id": "123456789",
    "username": "username",
    "first_name": "Имя",
    "avatar_url": "https://...",
    "stats": {
      "totalGames": 100,
      "totalWins": 60,
      "totalLosses": 35,
      "totalDraws": 5,
      "winRate": 60
    },
    "games": {
      "rps": {
        "played": 20,
        "wins": 15,
        "losses": 5,
        "draws": 0,
        "best_streak": 7
      },
      "snake": {
        "played": 10,
        "best_score": 500
      }
    },
    "recentGames": [
      {
        "game_type": "rps",
        "result": "win",
        "opponent": "Имя",
        "score": "3-1",
        "created_at": "2025-02-18T12:00:00Z"
      }
    ]
  }
}
```

## 🎯 Таблица лидеров пример:

```json
{
  "success": true,
  "players": [
    {
      "tg_id": "111111111",
      "username": "progamer",
      "first_name": "Про",
      "wins": 150,
      "played": 200
    },
    {
      "tg_id": "222222222",
      "username": "gamer",
      "first_name": "Геймер",
      "wins": 120,
      "played": 180
    }
  ]
}
```
