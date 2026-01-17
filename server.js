require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Telegraf } = require('telegraf');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const bot = new Telegraf(process.env.BOT_TOKEN);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game rooms storage
const rooms = new Map();

// ========== BOT COMMANDS ==========

bot.command('start', async (ctx) => {
  const webAppUrl = process.env.WEBAPP_URL || 'https://your-app.ngrok.io';

  // Check for deep link parameter (e.g., /start join_ROOM123)
  const startParam = ctx.message.text.split(' ')[1];

  if (startParam && startParam.startsWith('join_')) {
    const roomId = startParam.replace('join_', '');

    // Always open Mini App with room parameter
    // Room existence will be checked when connecting via WebSocket
    await ctx.reply(
      '🎮 *Вас пригласили в игру\\!*\n\n' +
      'Нажмите кнопку ниже чтобы присоединиться\\.',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Присоединиться к игре', web_app: { url: `${webAppUrl}?room=${roomId}` } }]
          ]
        }
      }
    );
    return;
  }

  // Default welcome message
  await ctx.reply(
    '🎮 *Добро пожаловать в Game Zone\\!*\n\n' +
    'Выберите игру для игры с друзьями:\n\n' +
    '✊ *Камень\\-Ножницы\\-Бумага* \\- классика\\!\n' +
    '❌⭕ *Крестики\\-Нолики* \\- стратегия\n' +
    '🚢 *Морской Бой* \\- морская битва\n\n' +
    'Нажмите кнопку ниже, чтобы начать\\!',
    {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Открыть игры', web_app: { url: webAppUrl } }]
        ]
      }
    }
  );
});

// Handle game invites via deep linking
bot.command('join', async (ctx) => {
  const roomId = ctx.message.text.split(' ')[1];
  if (roomId && rooms.has(roomId)) {
    const webAppUrl = process.env.WEBAPP_URL || 'https://your-app.ngrok.io';
    await ctx.reply(
      '🎮 Вас пригласили в игру!',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Присоединиться', web_app: { url: `${webAppUrl}?room=${roomId}` } }]
          ]
        }
      }
    );
  } else {
    await ctx.reply('❌ Комната не найдена или игра уже закончилась');
  }
});

// ========== SOCKET.IO GAME LOGIC ==========

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create new game room
  socket.on('create_room', ({ gameType, odId, userName, settings }) => {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const maxPlayers = settings?.maxPlayers || (gameType === 'durak' || gameType === 'uno' ? 7 : gameType === 'monopoly' ? 6 : 2);

    const room = {
      id: roomId,
      gameType,
      players: [{ id: socket.id, odId: odId, name: userName }],
      creator: odId,
      state: null,
      currentTurn: null,
      created: Date.now(),
      settings: {
        maxPlayers,
        mode: settings?.mode || 'podkidnoy' // For Durak
      }
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room_created', { roomId, room });
    console.log(`Room ${roomId} created for ${gameType} (max ${maxPlayers} players)`);
  });

  // Join existing room
  socket.on('join_room', ({ roomId, odId, userName }) => {
    const room = rooms.get(roomId.toUpperCase());

    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    const maxPlayers = room.settings?.maxPlayers || 2;
    if (room.players.length >= maxPlayers) {
      socket.emit('error', { message: 'Комната уже заполнена' });
      return;
    }

    room.players.push({ id: socket.id, odId: odId, name: userName });
    socket.join(roomId);
    socket.roomId = roomId;

    // Check if room is full and initialize game
    const isFull = room.players.length >= maxPlayers;

    // Initialize game state based on game type
    if (isFull) {
      if (room.gameType === 'tictactoe') {
        room.state = Array(9).fill(null);
        room.currentTurn = room.players[0].odId;
      } else if (room.gameType === 'battleship') {
        room.state = {
          grids: {},
          shots: {},
          phase: 'placement'
        };
      } else if (room.gameType === 'rps') {
        room.state = { choices: {}, scores: {} };
        room.players.forEach(p => room.state.scores[p.odId] = 0);
      } else if (room.gameType === 'durak') {
        initDurakGame(room);
      } else if (room.gameType === 'uno') {
        initUnoGame(room);
      } else if (room.gameType === 'monopoly') {
        initMonopolyGame(room);
      }

      io.to(roomId).emit('game_start', { room });
      console.log(`Game started in room ${roomId}`);
    } else {
      // Notify that a player joined but waiting for more
      io.to(roomId).emit('player_joined', {
        playersCount: room.players.length,
        maxPlayers,
        players: room.players.map(p => ({ name: p.name, odId: p.odId }))
      });
      console.log(`Player joined room ${roomId} (${room.players.length}/${maxPlayers})`);
    }
  });

  // RPS: Make choice
  socket.on('rps_choice', ({ odId, choice }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'rps') return;

    room.state.choices[odId] = choice;

    // Check if both players made choices
    if (Object.keys(room.state.choices).length === 2) {
      const [p1, p2] = room.players;
      const c1 = room.state.choices[p1.odId];
      const c2 = room.state.choices[p2.odId];

      let winner = null;
      if (c1 !== c2) {
        const wins = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
        winner = wins[c1] === c2 ? p1.odId : p2.odId;
        room.state.scores[winner]++;
      }

      io.to(socket.roomId).emit('rps_result', {
        choices: room.state.choices,
        winner,
        scores: room.state.scores
      });

      // Reset for next round
      room.state.choices = {};
    } else {
      socket.emit('rps_waiting');
    }
  });

  // TicTacToe: Make move
  socket.on('ttt_move', ({ odId, index }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'tictactoe') return;
    if (room.currentTurn !== odId) return;
    if (room.state[index] !== null) return;

    const playerIndex = room.players.findIndex(p => p.odId === odId);
    const symbol = playerIndex === 0 ? 'X' : 'O';
    room.state[index] = symbol;

    // Check winner
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    let winner = null;
    let winLine = null;

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (room.state[a] && room.state[a] === room.state[b] && room.state[a] === room.state[c]) {
        winner = odId;
        winLine = pattern;
        break;
      }
    }

    const isDraw = !winner && room.state.every(cell => cell !== null);

    // Switch turn
    room.currentTurn = room.players.find(p => p.odId !== odId).odId;

    io.to(socket.roomId).emit('ttt_update', {
      state: room.state,
      currentTurn: room.currentTurn,
      winner,
      winLine,
      isDraw
    });
  });

  // Battleship: Place ships
  socket.on('bs_place_ships', ({ odId, ships }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'battleship') return;

    room.state.grids[odId] = ships;
    room.state.shots[odId] = [];

    // Check if both players placed ships
    if (Object.keys(room.state.grids).length === 2) {
      room.state.phase = 'battle';
      room.currentTurn = room.players[0].odId;
      io.to(socket.roomId).emit('bs_battle_start', { currentTurn: room.currentTurn });
    } else {
      socket.emit('bs_waiting_opponent');
    }
  });

  // Battleship: Fire shot
  socket.on('bs_fire', ({ odId, x, y }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'battleship') return;
    if (room.currentTurn !== odId) return;

    const opponent = room.players.find(p => p.odId !== odId);
    const opponentGrid = room.state.grids[opponent.odId];

    const hit = opponentGrid.some(ship =>
      ship.cells.some(cell => cell.x === x && cell.y === y)
    );

    room.state.shots[odId].push({ x, y, hit });

    // Check if ship is sunk
    let sunkShip = null;
    if (hit) {
      for (const ship of opponentGrid) {
        const allHit = ship.cells.every(cell =>
          room.state.shots[odId].some(s => s.x === cell.x && s.y === cell.y && s.hit)
        );
        if (allHit && !ship.sunk) {
          ship.sunk = true;
          sunkShip = ship;
          break;
        }
      }
    }

    // Check win condition
    const allShipsSunk = opponentGrid.every(ship => ship.sunk);

    // Switch turn (unless hit, keep turn)
    if (!hit) {
      room.currentTurn = opponent.odId;
    }

    io.to(socket.roomId).emit('bs_shot_result', {
      shooter: odId,
      x, y, hit,
      sunkShip,
      winner: allShipsSunk ? odId : null,
      currentTurn: room.currentTurn
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && rooms.has(roomId)) {
      io.to(roomId).emit('player_left');
      rooms.delete(roomId);
    }
    console.log('Player disconnected:', socket.id);
  });
});

// ========== NEW GAMES INITIALIZATION ==========

// Durak card game initialization
function initDurakGame(room) {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  // Create and shuffle deck
  let deck = [];
  let id = 0;
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, id: id++ });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Trump card (last card in deck)
  const trump = deck[deck.length - 1];

  // Deal 6 cards to each player
  const hands = {};
  room.players.forEach(player => {
    hands[player.odId] = deck.splice(0, 6);
  });

  room.state = {
    deck,
    trump,
    trumpSuit: trump.suit,
    hands,
    table: [],
    currentAttacker: room.players[0].odId,
    currentDefender: room.players[1].odId,
    phase: 'attack',
    mode: room.settings?.mode || 'podkidnoy'
  };

  // Send individual hands to each player
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('durak_start', {
        hand: hands[player.odId],
        trump,
        deckCount: deck.length,
        players: room.players.map(p => ({ name: p.name, odId: p.odId })),
        isAttacker: player.odId === room.state.currentAttacker,
        isDefender: player.odId === room.state.currentDefender,
        mode: room.state.mode
      });
    }
  });
}

// UNO game initialization
function initUnoGame(room) {
  const colors = ['red', 'green', 'blue', 'yellow'];
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const actions = ['skip', 'reverse', 'draw2'];

  let deck = [];
  let id = 0;

  // Build UNO deck (108 cards)
  for (const color of colors) {
    deck.push({ color, value: '0', id: id++ });
    for (const num of numbers.slice(1)) {
      deck.push({ color, value: num, id: id++ });
      deck.push({ color, value: num, id: id++ });
    }
    for (const action of actions) {
      deck.push({ color, value: action, id: id++ });
      deck.push({ color, value: action, id: id++ });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild', id: id++ });
    deck.push({ color: 'wild', value: 'wild4', id: id++ });
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal 7 cards to each player
  const hands = {};
  room.players.forEach(player => {
    hands[player.odId] = deck.splice(0, 7);
  });

  // First card on pile (must be a number card)
  let firstCard;
  do {
    firstCard = deck.shift();
    if (firstCard.color === 'wild' || ['skip', 'reverse', 'draw2'].includes(firstCard.value)) {
      deck.push(firstCard);
    } else {
      break;
    }
  } while (true);

  room.state = {
    deck,
    discardPile: [firstCard],
    hands,
    currentCard: firstCard,
    currentPlayer: room.players[0].odId,
    direction: 1,
    calledUno: {}
  };

  // Send individual hands to each player
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('uno_start', {
        hand: hands[player.odId],
        currentCard: firstCard,
        players: room.players.map(p => ({ name: p.name, odId: p.odId, cardCount: hands[p.odId].length })),
        currentPlayer: room.state.currentPlayer,
        direction: room.state.direction
      });
    }
  });
}

// Monopoly game initialization
function initMonopolyGame(room) {
  const startMoney = 1500;
  const players = {};

  room.players.forEach((player, index) => {
    players[player.odId] = {
      position: 0,
      money: startMoney,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0
    };
  });

  room.state = {
    players,
    currentPlayer: room.players[0].odId,
    properties: {}, // propertyIndex -> { owner, houses, mortgaged }
    canRoll: true,
    lastDice: [0, 0],
    doublesCount: 0
  };

  // Send initial state to all players
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('monopoly_start', {
        players: room.players.map(p => ({
          name: p.name,
          odId: p.odId,
          position: 0,
          money: startMoney
        })),
        currentPlayer: room.state.currentPlayer,
        myData: players[player.odId]
      });
    }
  });
}

// Clean up old rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.created > 3600000) { // 1 hour
      rooms.delete(id);
    }
  }
}, 60000);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  bot.launch().then(() => {
    console.log('🤖 Bot started!');
  });
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
