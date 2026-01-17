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
  try {
    console.log('Received /start command from user:', ctx.from?.id);
    const webAppUrl = process.env.WEBAPP_URL || 'https://your-app.ngrok.io';
    console.log('Using WEBAPP_URL:', webAppUrl);

    // Check for deep link parameter (e.g., /start join_ROOM123)
    const startParam = ctx.message.text.split(' ')[1];
    console.log('Start parameter:', startParam);

    if (startParam && startParam.startsWith('join_')) {
      const roomId = startParam.replace('join_', '');
      console.log('Invite link detected, room ID:', roomId);

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
      '🚢 *Морской Бой* \\- морская битва\n' +
      '🃏 *Дурак* \\- карточная игра \\[БЕТА\\]\n' +
      '🎴 *UNO* \\- цветные карты \\[БЕТА\\]\n' +
      '🎲 *Монополия* \\- бизнес\\-игра \\[БЕТА\\]\n\n' +
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
    console.log('Welcome message sent successfully');
  } catch (error) {
    console.error('Error in /start command:', error);
    try {
      await ctx.reply('🎮 Добро пожаловать! Произошла ошибка, попробуйте ещё раз.');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
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
      creatorName: userName,
      state: null,
      currentTurn: null,
      created: Date.now(),
      settings: {
        maxPlayers,
        mode: settings?.mode || 'podkidnoy',
        isPublic: settings?.isPublic !== false, // Default to public
        password: settings?.password || null // Alphanumeric only
      }
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room_created', { roomId, room });
    console.log(`Room ${roomId} created for ${gameType} (max ${maxPlayers} players, public: ${room.settings.isPublic})`);
  });

  // Get list of available rooms
  socket.on('get_rooms', ({ gameType }) => {
    const availableRooms = [];

    rooms.forEach((room, id) => {
      // Only show public rooms that are not full and match game type
      if (room.settings.isPublic &&
        room.players.length < room.settings.maxPlayers &&
        (!gameType || room.gameType === gameType)) {
        availableRooms.push({
          id: room.id,
          gameType: room.gameType,
          players: room.players.length,
          maxPlayers: room.settings.maxPlayers,
          creatorName: room.creatorName,
          hasPassword: !!room.settings.password
        });
      }
    });

    socket.emit('rooms_list', { rooms: availableRooms });
  });

  // Join existing room
  socket.on('join_room', ({ roomId, odId, userName, password }) => {
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

    // Check if user is already in the room (prevent playing with yourself)
    if (room.players.some(p => p.odId === odId)) {
      socket.emit('error', { message: 'Вы уже в этой комнате' });
      return;
    }

    // Check password if room has one
    if (room.settings.password && room.settings.password !== password) {
      socket.emit('error', { message: 'Неверный пароль' });
      return;
    }

    room.players.push({ id: socket.id, odId: odId, name: userName });
    socket.join(roomId);
    socket.roomId = roomId;

    // Notify the joining player that they successfully joined
    socket.emit('room_joined', { roomId, room });

    // Check if room is full and initialize game
    const isFull = room.players.length >= maxPlayers;

    // Initialize game state based on game type
    if (isFull) {
      if (room.gameType === 'tictactoe') {
        room.state = Array(9).fill(null);
        room.currentTurn = room.players[0].odId;
        io.to(roomId).emit('game_start', { room });
      } else if (room.gameType === 'battleship') {
        room.state = {
          grids: {},
          shots: {},
          phase: 'placement'
        };
        io.to(roomId).emit('game_start', { room });
      } else if (room.gameType === 'rps') {
        room.state = { choices: {}, scores: {} };
        room.players.forEach(p => room.state.scores[p.odId] = 0);
        io.to(roomId).emit('game_start', { room });
      } else if (room.gameType === 'durak') {
        initDurakGame(room);
        // durak_start is emitted inside initDurakGame
      } else if (room.gameType === 'uno') {
        initUnoGame(room);
        // uno_start is emitted inside initUnoGame
      } else if (room.gameType === 'monopoly') {
        initMonopolyGame(room);
        // monopoly_start is emitted inside initMonopolyGame
      }

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

      // Get win limit from settings (default 3)
      const winsToWin = room.settings?.winsToWin || 3;

      io.to(socket.roomId).emit('rps_result', {
        choices: room.state.choices,
        winner,
        scores: room.state.scores,
        winsToWin
      });

      // Check if someone won the game
      if (winner && room.state.scores[winner] >= winsToWin) {
        const winnerPlayer = room.players.find(p => p.odId === winner);
        io.to(socket.roomId).emit('rps_game_over', {
          winner,
          winnerName: winnerPlayer?.name || 'Игрок',
          scores: room.state.scores
        });
        return;
      }

      // Reset for next round
      room.state.choices = {};
    } else {
      socket.emit('rps_waiting');
    }
  });

  // Request rematch - restart the game
  socket.on('request_rematch', ({ odId, roomId }) => {
    const room = rooms.get(roomId || socket.roomId);
    if (!room) return;

    // Mark player as ready for rematch
    if (!room.rematchVotes) room.rematchVotes = new Set();
    room.rematchVotes.add(odId);

    // If all players voted for rematch
    if (room.rematchVotes.size >= room.players.length) {
      room.rematchVotes.clear();

      // Reinitialize game based on type
      if (room.gameType === 'rps') {
        room.state = { choices: {}, scores: {} };
        room.players.forEach(p => room.state.scores[p.odId] = 0);
        io.to(room.id).emit('game_start', { room });
      } else if (room.gameType === 'tictactoe') {
        room.state = Array(9).fill(null);
        room.currentTurn = room.players[0].odId;
        io.to(room.id).emit('game_start', { room });
      } else if (room.gameType === 'battleship') {
        room.state = { grids: {}, shots: {}, phase: 'placement' };
        io.to(room.id).emit('game_start', { room });
      } else if (room.gameType === 'durak') {
        initDurakGame(room);
      } else if (room.gameType === 'uno') {
        initUnoGame(room);
      } else if (room.gameType === 'monopoly') {
        initMonopolyGame(room);
      }

      console.log(`Rematch started in room ${room.id}`);
    } else {
      // Notify others that player wants rematch
      io.to(room.id).emit('rematch_request', {
        playerName: room.players.find(p => p.odId === odId)?.name,
        votesNeeded: room.players.length - room.rematchVotes.size
      });
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

  // ========== DURAK GAME EVENTS ==========

  // Durak: Attack with a card
  socket.on('durak_attack', ({ odId, card }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'durak') return;
    if (room.state.currentAttacker !== odId) return;
    if (room.state.phase !== 'attack') return;

    // Remove card from attacker's hand
    const hand = room.state.hands[odId];
    const cardIndex = hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return;
    hand.splice(cardIndex, 1);

    // Add card to table
    room.state.table.push({ attack: card, defense: null });
    room.state.phase = 'defense';

    // Broadcast update
    io.to(socket.roomId).emit('durak_turn_update', {
      table: room.state.table,
      attacker: room.state.currentAttacker,
      defender: room.state.currentDefender,
      phase: room.state.phase,
      deckCount: room.state.deck.length
    });

    io.to(socket.roomId).emit('durak_card_played', {
      playerId: odId,
      card,
      table: room.state.table
    });
  });

  // Durak: Defend with a card
  socket.on('durak_defend', ({ odId, card, pairIndex }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'durak') return;
    if (room.state.currentDefender !== odId) return;
    if (room.state.phase !== 'defense') return;

    const pair = room.state.table[pairIndex];
    if (!pair || pair.defense) return;

    // Check if card can beat attack card
    const attackCard = pair.attack;
    const canBeat = (card.suit === attackCard.suit &&
      ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(card.value) >
      ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(attackCard.value)) ||
      (card.suit === room.state.trumpSuit && attackCard.suit !== room.state.trumpSuit);

    if (!canBeat) return;

    // Remove card from defender's hand
    const hand = room.state.hands[odId];
    const cardIndex = hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return;
    hand.splice(cardIndex, 1);

    // Add defense to pair
    pair.defense = card;

    // Check if all attacks are defended
    const allDefended = room.state.table.every(p => p.defense !== null);
    if (allDefended) {
      room.state.phase = 'attack'; // Attacker can add more or pass
    }

    io.to(socket.roomId).emit('durak_turn_update', {
      table: room.state.table,
      attacker: room.state.currentAttacker,
      defender: room.state.currentDefender,
      phase: room.state.phase,
      deckCount: room.state.deck.length
    });

    io.to(socket.roomId).emit('durak_card_played', {
      playerId: odId,
      card,
      table: room.state.table
    });
  });

  // Durak: Take cards (defender gives up)
  socket.on('durak_take', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'durak') return;
    if (room.state.currentDefender !== odId) return;

    // Defender takes all cards from table
    const tableCards = room.state.table.flatMap(p => [p.attack, p.defense].filter(Boolean));
    room.state.hands[odId].push(...tableCards);
    room.state.table = [];

    // Draw cards
    drawCardsForPlayers(room);

    // Next round - same attacker, next defender
    const players = room.players;
    const defenderIdx = players.findIndex(p => p.odId === odId);
    const nextDefenderIdx = (defenderIdx + 1) % players.length;

    room.state.currentDefender = players[nextDefenderIdx].odId;
    room.state.phase = 'attack';

    // Check win condition
    checkDurakWinner(room);

    io.to(socket.roomId).emit('durak_round_end', {
      message: 'Защитник забрал карты',
      tookCards: true,
      deckCount: room.state.deck.length
    });

    sendDurakUpdate(room);
  });

  // Durak: Pass (attacker done attacking)
  socket.on('durak_pass', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'durak') return;
    if (room.state.currentAttacker !== odId) return;
    if (room.state.table.length === 0) return;

    // All cards go to discard (beaten off)
    room.state.table = [];

    // Draw cards
    drawCardsForPlayers(room);

    // Next round - roles rotate
    const players = room.players;
    const attackerIdx = players.findIndex(p => p.odId === odId);
    const nextAttackerIdx = (attackerIdx + 1) % players.length;
    const nextDefenderIdx = (nextAttackerIdx + 1) % players.length;

    room.state.currentAttacker = players[nextAttackerIdx].odId;
    room.state.currentDefender = players[nextDefenderIdx].odId;
    room.state.phase = 'attack';

    // Check win condition
    checkDurakWinner(room);

    io.to(socket.roomId).emit('durak_round_end', {
      message: 'Бито!',
      tookCards: false,
      deckCount: room.state.deck.length
    });

    sendDurakUpdate(room);
  });

  // ========== UNO GAME EVENTS ==========

  // UNO: Play a card
  socket.on('uno_play_card', ({ odId, card, chosenColor }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'uno') return;
    if (room.state.currentPlayer !== odId) return;

    const currentCard = room.state.currentCard;

    // Check if card is playable
    const isWild = card.color === 'wild';
    const sameColor = card.color === currentCard.color || card.color === room.state.chosenColor;
    const sameValue = card.value === currentCard.value;

    if (!isWild && !sameColor && !sameValue) return;

    // Remove card from hand
    const hand = room.state.hands[odId];
    const cardIndex = hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return;
    hand.splice(cardIndex, 1);

    // Add to discard pile
    room.state.discardPile.push(card);
    room.state.currentCard = card;
    room.state.chosenColor = isWild ? chosenColor : null;

    // Handle special cards
    const players = room.players;
    let currentIdx = players.findIndex(p => p.odId === odId);
    let skipNext = false;
    let drawCards = 0;

    if (card.value === 'reverse') {
      room.state.direction *= -1;
    } else if (card.value === 'skip') {
      skipNext = true;
    } else if (card.value === 'draw2') {
      drawCards = 2;
      skipNext = true;
    } else if (card.value === 'wild4') {
      drawCards = 4;
      skipNext = true;
    }

    // Next player
    let nextIdx = (currentIdx + room.state.direction + players.length) % players.length;
    if (skipNext) {
      // Give cards to skipped player
      const skippedPlayer = players[nextIdx].odId;
      for (let i = 0; i < drawCards; i++) {
        if (room.state.deck.length > 0) {
          room.state.hands[skippedPlayer].push(room.state.deck.pop());
        }
      }
      nextIdx = (nextIdx + room.state.direction + players.length) % players.length;
    }

    room.state.currentPlayer = players[nextIdx].odId;

    // Check win
    if (hand.length === 0) {
      io.to(socket.roomId).emit('uno_game_over', {
        winner: odId,
        winnerName: players.find(p => p.odId === odId)?.name
      });
      return;
    }

    // Send update to all players
    sendUnoUpdate(room);
  });

  // UNO: Draw a card
  socket.on('uno_draw', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'uno') return;
    if (room.state.currentPlayer !== odId) return;

    if (room.state.deck.length === 0) {
      // Reshuffle discard pile
      const topCard = room.state.discardPile.pop();
      room.state.deck = room.state.discardPile;
      room.state.discardPile = [topCard];
      // Shuffle
      for (let i = room.state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.state.deck[i], room.state.deck[j]] = [room.state.deck[j], room.state.deck[i]];
      }
    }

    if (room.state.deck.length > 0) {
      const drawnCard = room.state.deck.pop();
      room.state.hands[odId].push(drawnCard);
    }

    // Move to next player
    const players = room.players;
    const currentIdx = players.findIndex(p => p.odId === odId);
    const nextIdx = (currentIdx + room.state.direction + players.length) % players.length;
    room.state.currentPlayer = players[nextIdx].odId;

    sendUnoUpdate(room);
  });

  // ========== MONOPOLY GAME EVENTS ==========

  // Monopoly: Roll dice
  socket.on('monopoly_roll', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;
    if (!room.state.canRoll) return;

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    const isDoubles = die1 === die2;

    const playerState = room.state.players[odId];
    const oldPosition = playerState.position;
    playerState.position = (playerState.position + total) % 40;

    // Passed GO
    if (playerState.position < oldPosition) {
      playerState.money += 200;
    }

    room.state.lastDice = [die1, die2];
    room.state.canRoll = isDoubles; // Can roll again if doubles

    if (isDoubles) {
      room.state.doublesCount++;
      if (room.state.doublesCount >= 3) {
        // Go to jail
        playerState.position = 10;
        playerState.inJail = true;
        room.state.canRoll = false;
        room.state.doublesCount = 0;
      }
    } else {
      room.state.doublesCount = 0;
    }

    io.to(socket.roomId).emit('monopoly_dice_result', {
      playerId: odId,
      dice: [die1, die2],
      newPosition: playerState.position,
      money: playerState.money,
      canRollAgain: room.state.canRoll
    });

    sendMonopolyUpdate(room);
  });

  // Monopoly: End turn
  socket.on('monopoly_end_turn', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;

    const players = room.players;
    const currentIdx = players.findIndex(p => p.odId === odId);
    const nextIdx = (currentIdx + 1) % players.length;

    room.state.currentPlayer = players[nextIdx].odId;
    room.state.canRoll = true;
    room.state.doublesCount = 0;

    sendMonopolyUpdate(room);
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

// ========== HELPER FUNCTIONS ==========

// Durak: Draw cards for all players (to 6)
function drawCardsForPlayers(room) {
  const targetCards = 6;

  // Attacker draws first, then others
  const drawOrder = [room.state.currentAttacker, ...room.players
    .filter(p => p.odId !== room.state.currentAttacker)
    .map(p => p.odId)];

  for (const playerId of drawOrder) {
    while (room.state.hands[playerId].length < targetCards && room.state.deck.length > 0) {
      room.state.hands[playerId].push(room.state.deck.pop());
    }
  }
}

// Durak: Check for winner
function checkDurakWinner(room) {
  if (room.state.deck.length > 0) return;

  // Find players with no cards
  const playersWithCards = room.players.filter(p => room.state.hands[p.odId].length > 0);

  if (playersWithCards.length === 1) {
    // One player left with cards - they are the loser (durak)
    const loser = playersWithCards[0];
    io.to(room.id).emit('durak_game_over', {
      loser: loser.odId,
      loserName: loser.name
    });
  } else if (playersWithCards.length === 0) {
    // Draw - everyone got rid of cards at same time
    io.to(room.id).emit('durak_game_over', {
      loser: null,
      loserName: null,
      isDraw: true
    });
  }
}

// Durak: Send turn update to all players
function sendDurakUpdate(room) {
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('durak_turn_update', {
        table: room.state.table,
        attacker: room.state.currentAttacker,
        defender: room.state.currentDefender,
        phase: room.state.phase,
        deckCount: room.state.deck.length,
        hand: room.state.hands[player.odId]
      });
    }
  });
}

// UNO: Send update to all players
function sendUnoUpdate(room) {
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('uno_turn_update', {
        currentCard: room.state.currentCard,
        chosenColor: room.state.chosenColor,
        currentPlayer: room.state.currentPlayer,
        direction: room.state.direction,
        hand: room.state.hands[player.odId],
        players: room.players.map(p => ({
          name: p.name,
          odId: p.odId,
          cardCount: room.state.hands[p.odId].length
        })),
        deckCount: room.state.deck.length
      });
    }
  });
}

// Monopoly: Send update to all players
function sendMonopolyUpdate(room) {
  room.players.forEach(player => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('monopoly_turn_update', {
        currentPlayer: room.state.currentPlayer,
        canRoll: room.state.canRoll,
        lastDice: room.state.lastDice,
        players: room.players.map(p => ({
          name: p.name,
          odId: p.odId,
          ...room.state.players[p.odId]
        })),
        properties: room.state.properties,
        myData: room.state.players[player.odId]
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
