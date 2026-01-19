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
  socket.on('create_room', ({ gameType, odId, userName, settings, password, isPublic }) => {
    const roomId = uuidv4().slice(0, 8).toUpperCase();

    // Get maxPlayers from settings, or use default based on game type
    let maxPlayers = 2; // default
    if (settings && settings.maxPlayers && settings.maxPlayers >= 2) {
      maxPlayers = settings.maxPlayers;
    } else if (gameType === 'durak' || gameType === 'uno') {
      maxPlayers = 2; // default for card games
    } else if (gameType === 'monopoly') {
      maxPlayers = 2; // default for monopoly
    }

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
        isPublic: isPublic !== false && settings?.isPublic !== false, // Check both
        password: password || settings?.password || null
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
      // Show all rooms that are not full and match game type
      if (room.players.length < room.settings.maxPlayers &&
        (!gameType || room.gameType === gameType)) {
        availableRooms.push({
          id: room.id,
          gameType: room.gameType,
          players: room.players.length,
          maxPlayers: room.settings.maxPlayers,
          creatorName: room.creatorName,
          hasPassword: !!room.settings.password,
          isPublic: room.settings.isPublic
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

  // Durak: Transfer attack (perevodnoy mode)
  socket.on('durak_transfer', ({ odId, card }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'durak') return;
    if (room.state.currentDefender !== odId) return;

    // Only allow transfer in perevodnoy or combined mode
    const mode = room.settings?.mode || 'podkidnoy';
    if (mode !== 'perevodnoy' && mode !== 'combined') return;

    // Check if card value matches any attack card on table
    const attackValues = room.state.table.map(p => p.attack.value);
    if (!attackValues.includes(card.value)) return;

    // Remove card from defender's hand
    const hand = room.state.hands[odId];
    const cardIndex = hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return;
    hand.splice(cardIndex, 1);

    // Add to table as new attack
    room.state.table.push({ attack: card, defense: null });

    // Transfer: current defender becomes attacker, next player becomes defender
    const players = room.players;
    const currentDefenderIdx = players.findIndex(p => p.odId === room.state.currentDefender);
    const nextDefenderIdx = (currentDefenderIdx + 1) % players.length;

    // Skip if next player would be original attacker with no cards
    const newDefender = players[nextDefenderIdx].odId;

    room.state.currentAttacker = room.state.currentDefender;
    room.state.currentDefender = newDefender;
    room.state.phase = 'defense';

    io.to(socket.roomId).emit('durak_transfer', {
      transferredBy: odId,
      card,
      newAttacker: room.state.currentAttacker,
      newDefender: room.state.currentDefender,
      table: room.state.table
    });

    sendDurakUpdate(room);
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

  // Monopoly board data (for server-side calculations)
  const monopolyBoard = [
    { id: 0, type: 'corner', action: 'go' },
    { id: 1, type: 'property', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250] },
    { id: 2, type: 'chest' },
    { id: 3, type: 'property', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450] },
    { id: 4, type: 'tax', amount: 200 },
    { id: 5, type: 'railroad', price: 200 },
    { id: 6, type: 'property', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
    { id: 7, type: 'chance' },
    { id: 8, type: 'property', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
    { id: 9, type: 'property', group: 'lightBlue', price: 120, rent: [8, 40, 100, 300, 450, 600] },
    { id: 10, type: 'corner', action: 'jail' },
    { id: 11, type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
    { id: 12, type: 'utility', price: 150 },
    { id: 13, type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
    { id: 14, type: 'property', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900] },
    { id: 15, type: 'railroad', price: 200 },
    { id: 16, type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
    { id: 17, type: 'chest' },
    { id: 18, type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
    { id: 19, type: 'property', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000] },
    { id: 20, type: 'corner', action: 'parking' },
    { id: 21, type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 22, type: 'chance' },
    { id: 23, type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 24, type: 'property', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100] },
    { id: 25, type: 'railroad', price: 200 },
    { id: 26, type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 27, type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 28, type: 'utility', price: 150 },
    { id: 29, type: 'property', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200] },
    { id: 30, type: 'corner', action: 'gotoJail' },
    { id: 31, type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 32, type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 33, type: 'chest' },
    { id: 34, type: 'property', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400] },
    { id: 35, type: 'railroad', price: 200 },
    { id: 36, type: 'chance' },
    { id: 37, type: 'property', group: 'darkBlue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500] },
    { id: 38, type: 'tax', amount: 100 },
    { id: 39, type: 'property', group: 'darkBlue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000] }
  ];

  const propertyGroups = {
    brown: [1, 3],
    lightBlue: [6, 8, 9],
    pink: [11, 13, 14],
    orange: [16, 18, 19],
    red: [21, 23, 24],
    yellow: [26, 27, 29],
    green: [31, 32, 34],
    darkBlue: [37, 39]
  };

  const railroads = [5, 15, 25, 35];
  const utilities = [12, 28];

  // Monopoly: Roll dice
  socket.on('monopoly_roll', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;
    if (!room.state.canRoll) return;

    const playerState = room.state.players[odId];

    // Handle jail roll
    if (playerState.inJail) {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      room.state.lastDice = [die1, die2];

      if (die1 === die2) {
        // Got doubles - escape jail!
        playerState.inJail = false;
        playerState.jailTurns = 0;
        const total = die1 + die2;
        playerState.position = (10 + total) % 40;
        room.state.canRoll = false;

        io.to(socket.roomId).emit('monopoly_dice_result', {
          playerId: odId,
          dice: [die1, die2],
          newPosition: playerState.position,
          money: playerState.money,
          isDoubles: true,
          escapedJail: true,
          canRollAgain: false
        });

        // Process landing
        processMonopolyLanding(room, odId);
      } else {
        playerState.jailTurns++;
        if (playerState.jailTurns >= 3) {
          // Must pay and get out
          playerState.money -= 50;
          playerState.inJail = false;
          playerState.jailTurns = 0;
          const total = die1 + die2;
          playerState.position = (10 + total) % 40;

          io.to(socket.roomId).emit('monopoly_dice_result', {
            playerId: odId,
            dice: [die1, die2],
            newPosition: playerState.position,
            money: playerState.money,
            forcedJailPayment: true,
            canRollAgain: false
          });

          processMonopolyLanding(room, odId);
        } else {
          io.to(socket.roomId).emit('monopoly_dice_result', {
            playerId: odId,
            dice: [die1, die2],
            newPosition: 10,
            money: playerState.money,
            stayInJail: true,
            canRollAgain: false
          });
        }
        room.state.canRoll = false;
      }
      sendMonopolyUpdate(room);
      return;
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    const isDoubles = die1 === die2;

    const oldPosition = playerState.position;
    let wentToJail = false;

    if (isDoubles) {
      room.state.doublesCount++;
      if (room.state.doublesCount >= 3) {
        // Go to jail for 3 doubles
        playerState.position = 10;
        playerState.inJail = true;
        room.state.canRoll = false;
        room.state.doublesCount = 0;
        wentToJail = true;
      } else {
        playerState.position = (oldPosition + total) % 40;
        room.state.canRoll = true; // Can roll again
      }
    } else {
      playerState.position = (oldPosition + total) % 40;
      room.state.canRoll = false;
      room.state.doublesCount = 0;
    }

    // Passed GO (not if went to jail)
    if (!wentToJail && playerState.position < oldPosition && playerState.position !== 0) {
      playerState.money += 200;
    }
    // Landed exactly on GO
    if (!wentToJail && playerState.position === 0 && oldPosition !== 0) {
      playerState.money += 200;
    }

    room.state.lastDice = [die1, die2];

    io.to(socket.roomId).emit('monopoly_dice_result', {
      playerId: odId,
      dice: [die1, die2],
      newPosition: playerState.position,
      money: playerState.money,
      isDoubles,
      doublesCount: room.state.doublesCount,
      wentToJail,
      canRollAgain: room.state.canRoll && !wentToJail
    });

    if (!wentToJail) {
      processMonopolyLanding(room, odId);
    }

    sendMonopolyUpdate(room);
  });

  // Process landing on a cell
  function processMonopolyLanding(room, playerId) {
    const playerState = room.state.players[playerId];
    const position = playerState.position;
    const cell = monopolyBoard[position];

    if (!cell) return;

    // Handle Go To Jail
    if (cell.type === 'corner' && cell.action === 'gotoJail') {
      playerState.position = 10;
      playerState.inJail = true;
      room.state.canRoll = false;

      io.to(room.id).emit('monopoly_jail', {
        playerId,
        message: 'Отправляйтесь в тюрьму!'
      });
      return;
    }

    // Handle tax
    if (cell.type === 'tax') {
      playerState.money -= cell.amount;
      io.to(room.id).emit('monopoly_tax_paid', {
        playerId,
        amount: cell.amount,
        newMoney: playerState.money
      });
      checkMonopolyBankruptcy(room, playerId);
      return;
    }

    // Handle Chance
    if (cell.type === 'chance') {
      processChanceCard(room, playerId);
      return;
    }

    // Handle Community Chest
    if (cell.type === 'chest') {
      processChestCard(room, playerId);
      return;
    }

    // Handle property/railroad/utility landing
    if (cell.type === 'property' || cell.type === 'railroad' || cell.type === 'utility') {
      const propData = room.state.properties[position];

      if (propData && propData.owner !== playerId) {
        // Pay rent
        const rent = calculateRent(room, position);
        playerState.money -= rent;
        room.state.players[propData.owner].money += rent;

        io.to(room.id).emit('monopoly_rent_paid', {
          payerId: playerId,
          ownerId: propData.owner,
          propertyIndex: position,
          amount: rent,
          payerMoney: playerState.money,
          ownerMoney: room.state.players[propData.owner].money
        });

        checkMonopolyBankruptcy(room, playerId);
      }
    }
  }

  // Calculate rent for a property
  function calculateRent(room, position) {
    const cell = monopolyBoard[position];
    const propData = room.state.properties[position];

    if (!cell || !propData) return 0;

    if (cell.type === 'railroad') {
      // Count owner's railroads
      const ownedRailroads = railroads.filter(r =>
        room.state.properties[r]?.owner === propData.owner
      ).length;
      return [25, 50, 100, 200][ownedRailroads - 1] || 25;
    }

    if (cell.type === 'utility') {
      // Count owner's utilities
      const ownedUtilities = utilities.filter(u =>
        room.state.properties[u]?.owner === propData.owner
      ).length;
      const diceSum = room.state.lastDice[0] + room.state.lastDice[1];
      return ownedUtilities === 2 ? diceSum * 10 : diceSum * 4;
    }

    if (cell.type === 'property') {
      const houses = propData.houses || 0;
      let baseRent = cell.rent[houses];

      // Double rent if owner has monopoly and no houses
      if (houses === 0) {
        const group = propertyGroups[cell.group];
        const hasMonopoly = group.every(idx =>
          room.state.properties[idx]?.owner === propData.owner
        );
        if (hasMonopoly) baseRent *= 2;
      }

      return baseRent;
    }

    return 0;
  }

  // Process Chance card
  function processChanceCard(room, playerId) {
    const playerState = room.state.players[playerId];
    const cards = [
      {
        text: 'Проезд до СТАРТА. Получите $200', action: () => {
          const oldPos = playerState.position;
          playerState.position = 0;
          playerState.money += 200;
        }
      },
      {
        text: 'Отправляйтесь в тюрьму', action: () => {
          playerState.position = 10;
          playerState.inJail = true;
          room.state.canRoll = false;
        }
      },
      {
        text: 'Банк выплачивает дивиденды $50', action: () => {
          playerState.money += 50;
        }
      },
      {
        text: 'Штраф за превышение скорости $15', action: () => {
          playerState.money -= 15;
        }
      },
      {
        text: 'Кредит на строительство: получите $150', action: () => {
          playerState.money += 150;
        }
      },
      {
        text: 'Вы выиграли в лотерею! Получите $100', action: () => {
          playerState.money += 100;
        }
      },
      {
        text: 'Отступите на 3 клетки назад', action: () => {
          playerState.position = (playerState.position - 3 + 40) % 40;
        }
      }
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();

    io.to(room.id).emit('monopoly_card', {
      playerId,
      type: 'chance',
      text: card.text
    });

    sendMonopolyUpdate(room);
  }

  // Process Community Chest card
  function processChestCard(room, playerId) {
    const playerState = room.state.players[playerId];
    const cards = [
      {
        text: 'Банковская ошибка в вашу пользу. Получите $200', action: () => {
          playerState.money += 200;
        }
      },
      {
        text: 'Оплата услуг доктора $50', action: () => {
          playerState.money -= 50;
        }
      },
      {
        text: 'Продажа акций: получите $50', action: () => {
          playerState.money += 50;
        }
      },
      {
        text: 'Получите наследство $100', action: () => {
          playerState.money += 100;
        }
      },
      {
        text: 'Плата за обучение $50', action: () => {
          playerState.money -= 50;
        }
      },
      {
        text: 'Подоходный налог: получите $20 возврат', action: () => {
          playerState.money += 20;
        }
      },
      {
        text: 'Проезд до СТАРТА. Получите $200', action: () => {
          playerState.position = 0;
          playerState.money += 200;
        }
      }
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();

    io.to(room.id).emit('monopoly_card', {
      playerId,
      type: 'chest',
      text: card.text
    });

    sendMonopolyUpdate(room);
  }

  // Monopoly: Buy property
  socket.on('monopoly_buy', ({ odId, propertyIndex }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;

    const cell = monopolyBoard[propertyIndex];
    const playerState = room.state.players[odId];

    if (!cell || !cell.price) return;
    if (room.state.properties[propertyIndex]) return; // Already owned
    if (playerState.money < cell.price) return; // Can't afford

    playerState.money -= cell.price;
    room.state.properties[propertyIndex] = {
      owner: odId,
      houses: 0,
      mortgaged: false
    };

    io.to(socket.roomId).emit('monopoly_property_purchased', {
      playerId: odId,
      propertyIndex,
      newMoney: playerState.money
    });

    sendMonopolyUpdate(room);
  });

  // Monopoly: Build house
  socket.on('monopoly_build', ({ odId, propertyIndex }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;

    const cell = monopolyBoard[propertyIndex];
    const propData = room.state.properties[propertyIndex];
    const playerState = room.state.players[odId];

    if (!cell || !cell.group || !propData) return;
    if (propData.owner !== odId) return;
    if (propData.houses >= 5) return; // Max houses/hotel

    // Check monopoly ownership
    const group = propertyGroups[cell.group];
    if (!group.every(idx => room.state.properties[idx]?.owner === odId)) return;

    // Check even building rule
    const minHouses = Math.min(...group.map(idx => room.state.properties[idx]?.houses || 0));
    if (propData.houses > minHouses) return;

    // Get house cost (approximate based on group)
    const houseCost = cell.price <= 120 ? 50 : cell.price <= 200 ? 100 : cell.price <= 280 ? 150 : 200;

    if (playerState.money < houseCost) return;

    playerState.money -= houseCost;
    propData.houses++;

    io.to(socket.roomId).emit('monopoly_build_result', {
      playerId: odId,
      propertyIndex,
      houses: propData.houses,
      newMoney: playerState.money,
      success: true
    });

    sendMonopolyUpdate(room);
  });

  // Monopoly: Pay jail fine
  socket.on('monopoly_pay_jail', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;

    const playerState = room.state.players[odId];
    if (!playerState.inJail) return;
    if (playerState.money < 50) return;

    playerState.money -= 50;
    playerState.inJail = false;
    playerState.jailTurns = 0;
    room.state.canRoll = true;

    io.to(socket.roomId).emit('monopoly_jail_paid', {
      playerId: odId,
      newMoney: playerState.money
    });

    sendMonopolyUpdate(room);
  });

  // Monopoly: End turn
  socket.on('monopoly_end_turn', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;
    if (room.state.currentPlayer !== odId) return;

    // Find next non-bankrupt player
    const activePlayers = room.players.filter(p => !room.state.players[p.odId]?.bankrupt);
    if (activePlayers.length <= 1) {
      // Game over
      const winner = activePlayers[0];
      io.to(socket.roomId).emit('monopoly_game_over', {
        winner: winner?.odId,
        winnerName: winner?.name,
        finalMoney: room.state.players[winner?.odId]?.money || 0,
        propertiesCount: Object.values(room.state.properties).filter(p => p.owner === winner?.odId).length
      });
      return;
    }

    const currentIdx = room.players.findIndex(p => p.odId === odId);
    let nextIdx = (currentIdx + 1) % room.players.length;

    // Skip bankrupt players
    while (room.state.players[room.players[nextIdx].odId]?.bankrupt) {
      nextIdx = (nextIdx + 1) % room.players.length;
    }

    room.state.currentPlayer = room.players[nextIdx].odId;
    room.state.canRoll = true;
    room.state.doublesCount = 0;

    sendMonopolyUpdate(room);
  });

  // Check bankruptcy
  function checkMonopolyBankruptcy(room, playerId) {
    const playerState = room.state.players[playerId];
    if (playerState.money < 0) {
      playerState.bankrupt = true;
      playerState.money = 0;

      // Return properties to bank
      Object.keys(room.state.properties).forEach(idx => {
        if (room.state.properties[idx].owner === playerId) {
          delete room.state.properties[idx];
        }
      });

      io.to(room.id).emit('monopoly_bankruptcy', {
        playerId,
        playerName: room.players.find(p => p.odId === playerId)?.name
      });

      // Check if game over
      const activePlayers = room.players.filter(p => !room.state.players[p.odId]?.bankrupt);
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        io.to(room.id).emit('monopoly_game_over', {
          winner: winner.odId,
          winnerName: winner.name,
          finalMoney: room.state.players[winner.odId].money,
          propertiesCount: Object.values(room.state.properties).filter(p => p.owner === winner.odId).length
        });
      }
    }
  }

  // ========== MONOPOLY AUCTION SYSTEM ==========

  // Decline purchase - start auction
  socket.on('monopoly_decline_buy', ({ odId, propertyIndex }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;

    const cell = monopolyBoard[propertyIndex];
    if (!cell || !cell.price) return;
    if (room.state.properties[propertyIndex]) return;

    // Start auction
    room.state.auction = {
      propertyIndex,
      currentBid: 10,
      highestBidder: null,
      passedPlayers: new Set()
    };

    io.to(socket.roomId).emit('monopoly_auction_start', {
      propertyIndex,
      currentBid: 10,
      highestBidder: null
    });
  });

  // Place auction bid
  socket.on('monopoly_auction_bid', ({ odId, amount }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly' || !room.state.auction) return;

    const playerState = room.state.players[odId];
    if (!playerState || playerState.bankrupt) return;

    const newBid = room.state.auction.currentBid + amount;
    if (playerState.money < newBid) return;

    room.state.auction.currentBid = newBid;
    room.state.auction.highestBidder = odId;

    io.to(socket.roomId).emit('monopoly_auction_update', {
      currentBid: newBid,
      highestBidder: odId
    });
  });

  // Pass on auction
  socket.on('monopoly_auction_pass', ({ odId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly' || !room.state.auction) return;

    room.state.auction.passedPlayers.add(odId);

    // Check if auction is over
    const activePlayers = room.players.filter(p => !room.state.players[p.odId]?.bankrupt);
    const allPassed = activePlayers.every(p =>
      room.state.auction.passedPlayers.has(p.odId) || p.odId === room.state.auction.highestBidder
    );

    if (allPassed && room.state.auction.highestBidder) {
      // Winner
      const winner = room.state.auction.highestBidder;
      const bid = room.state.auction.currentBid;
      const propIndex = room.state.auction.propertyIndex;

      room.state.players[winner].money -= bid;
      room.state.properties[propIndex] = { owner: winner, houses: 0, mortgaged: false };

      io.to(socket.roomId).emit('monopoly_auction_end', {
        winner,
        winningBid: bid,
        propertyIndex: propIndex,
        newMoney: room.state.players[winner].money
      });

      room.state.auction = null;
      sendMonopolyUpdate(room);
    } else if (allPassed && !room.state.auction.highestBidder) {
      // No winner
      io.to(socket.roomId).emit('monopoly_auction_end', {
        winner: null,
        propertyIndex: room.state.auction.propertyIndex
      });
      room.state.auction = null;
    }
  });

  // ========== MONOPOLY TRADE SYSTEM ==========

  // Send trade offer
  socket.on('monopoly_trade_offer', ({ odId, targetId, offerProps, requestProps, offerMoney, requestMoney }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly') return;

    const targetSocket = [...io.sockets.sockets.values()].find(s =>
      s.roomId === socket.roomId && room.players.find(p => p.odId === targetId && p.id === s.id)
    );

    if (targetSocket) {
      const tradeId = Date.now().toString();
      room.state.pendingTrade = {
        tradeId,
        senderId: odId,
        targetId,
        offerProps,
        requestProps,
        offerMoney,
        requestMoney
      };

      targetSocket.emit('monopoly_trade_offer', {
        tradeId,
        senderId: odId,
        offerProps,
        requestProps,
        offerMoney,
        requestMoney
      });
    }
  });

  // Respond to trade offer
  socket.on('monopoly_trade_response', ({ odId, accept, tradeId }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.gameType !== 'monopoly' || !room.state.pendingTrade) return;
    if (room.state.pendingTrade.tradeId !== tradeId) return;

    const trade = room.state.pendingTrade;

    if (accept) {
      const sender = room.state.players[trade.senderId];
      const target = room.state.players[trade.targetId];

      // Validate trade
      if (sender.money < trade.offerMoney) { accept = false; }
      if (target.money < trade.requestMoney) { accept = false; }

      if (accept) {
        // Execute trade
        sender.money -= trade.offerMoney;
        sender.money += trade.requestMoney;
        target.money += trade.offerMoney;
        target.money -= trade.requestMoney;

        // Transfer properties
        trade.offerProps.forEach(idx => {
          if (room.state.properties[idx]?.owner === trade.senderId) {
            room.state.properties[idx].owner = trade.targetId;
          }
        });
        trade.requestProps.forEach(idx => {
          if (room.state.properties[idx]?.owner === trade.targetId) {
            room.state.properties[idx].owner = trade.senderId;
          }
        });

        io.to(socket.roomId).emit('monopoly_trade_complete', { success: true, tradeId });
        sendMonopolyUpdate(room);
      }
    } else {
      io.to(socket.roomId).emit('monopoly_trade_complete', { success: false, tradeId });
    }

    room.state.pendingTrade = null;
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

// ========== MONOPOLY INITIALIZATION ==========
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
      bankrupt: false
    };
  });

  room.state = {
    players,
    currentPlayer: room.players[0].odId,
    properties: {},
    canRoll: true,
    lastDice: [0, 0],
    doublesCount: 0
  };

  // Send initial state to all players
  room.players.forEach((player, index) => {
    const playerSocket = [...io.sockets.sockets.values()].find(s => s.id === player.id);
    if (playerSocket) {
      playerSocket.emit('monopoly_start', {
        players: room.players.map((p, idx) => ({
          name: p.name,
          odId: p.odId,
          position: 0,
          money: startMoney
        })),
        currentPlayer: room.state.currentPlayer,
        myData: players[player.odId],
        properties: {}
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
