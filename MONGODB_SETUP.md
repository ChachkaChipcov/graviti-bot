# 🗄️ Настройка MongoDB для Game Zone

## Что добавлено:

✅ **База данных MongoDB** для хранения:
- Профилей игроков (ник, аватарка из Telegram)
- Статистики по всем играм
- Таблицы лидеров
- Истории игр

## 📋 API Endpoints:

### 1. Получить профиль игрока
```
GET /api/player/:tgId
```

### 2. Получить таблицу лидеров для игры
```
GET /api/leaderboard/:gameType?limit=10
```
Пример: `/api/leaderboard/rps?limit=10`

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
  "score": "3-1"
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

## 🚀 Настройка MongoDB Atlas (бесплатно):

1. **Создайте аккаунт** на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Создайте кластер**:
   - Нажмите "Build a Database"
   - Выберите "FREE" тариф (M0)
   - Выберите регион (ближайший к вам)
   - Нажмите "Create"

3. **Настройте доступ**:
   - В разделе "Database Access" создайте пользователя
   - Запомните логин и пароль

4. **Настройте Network Access**:
   - В разделе "Network Access" нажмите "Add IP Address"
   - Выберите "Allow Access from Anywhere" (0.0.0.0/0)
   - Или добавьте IP вашего сервера Render

5. **Получите connection string**:
   - Нажмите "Connect" на кластере
   - Выберите "Connect your application"
   - Скопируйте connection string
   - Замените `<password>` на ваш пароль

6. **Добавьте в Render**:
   - Зайдите в dashboard вашего сервиса
   - Environment → Add Environment Variable
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://username:password@cluster.mongodb.net/telegram-games?retryWrites=true&w=majority`

## 📊 Структура данных:

```javascript
{
  tgId: "123456789",           // Telegram ID
  username: "@username",        // Юзернейм
  firstName: "Имя",            // Имя
  avatarUrl: "https://...",    // Аватарка
  
  stats: {
    totalGames: 100,           // Всего игр
    totalWins: 60,             // Побед
    totalLosses: 35,           // Поражений
    totalDraws: 5,             // Ничьих
    winRate: 60                // Процент побед
  },
  
  games: {
    rps: {
      played: 20,
      wins: 15,
      losses: 5,
      draws: 0,
      bestStreak: 7
    },
    tictactoe: { ... },
    battleship: { ... },
    // ... другие игры
  },
  
  recentGames: [
    {
      gameType: "rps",
      result: "win",
      date: "2025-02-18T12:00:00Z",
      opponent: "Имя",
      score: "3-1"
    }
  ]
}
```

## 🔌 Подключение в коде:

```javascript
const { mongoose, Player } = require('./database');

// Получить игрока
const player = await Player.getPlayerProfile(tgId);

// Обновить статистику
await player.updateGameStats('rps', 'win', {
  opponent: 'Имя',
  score: '3-1'
});

// Получить топ игроков
const leaderboard = await Player.getLeaderboard('rps', 10);
```

## 🎮 Поддерживаемые игры:

- `rps` - Камень-Ножницы-Бумага
- `tictactoe` - Крестики-Нолики
- `battleship` - Морской Бой
- `chess` - Шахматы
- `checkers` - Шашки
- `durak` - Дурак
- `uno` - UNO
- `monopoly` - Монополия
- `minesweeper` - Сапёр
- `snake` - Змейка
- `match3` - 3 в ряд
