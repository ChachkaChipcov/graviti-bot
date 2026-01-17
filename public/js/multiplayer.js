// Multiplayer Socket Handler
const Multiplayer = {
    socket: null,

    init() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || 'localhost:3000';

        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('room_created', ({ roomId, room }) => {
            console.log('Room created:', roomId);
            App.showWaiting(roomId, room);
        });

        // Handler when joining an existing room
        this.socket.on('room_joined', ({ roomId, room }) => {
            console.log('Joined room:', roomId);
            // Set current game type from room
            App.currentGame = room.gameType;

            // Update room title based on game type
            const titles = {
                'rps': '✊ КНБ',
                'tictactoe': '❌⭕ Крестики-Нолики',
                'battleship': '🚢 Морской Бой',
                'durak': '🃏 Дурак',
                'uno': '🎴 UNO',
                'monopoly': '🎲 Монополия'
            };
            document.getElementById('room-title').textContent = titles[room.gameType] || 'Игра';

            App.showWaiting(roomId, room);
        });

        this.socket.on('error', ({ message }) => {
            console.error('Server error:', message);

            // Show user-friendly error message
            if (message.includes('не найдена') || message.includes('not found')) {
                const input = document.getElementById('room-code-input');
                if (input) {
                    input.style.borderColor = '#ff6b6b';
                    input.value = '';
                    input.placeholder = 'Комната не найдена';
                    setTimeout(() => {
                        input.style.borderColor = '';
                        input.placeholder = 'XXXXXXXX';
                    }, 2000);
                }
            } else if (message.includes('заполнена') || message.includes('full')) {
                alert('❌ ' + message);
                App.goBack();
            } else {
                alert('❌ ' + message);
            }
        });

        this.socket.on('game_start', ({ room }) => {
            console.log('Game starting:', room);
            const gameScreens = {
                'rps': 'rps-game',
                'tictactoe': 'ttt-game',
                'battleship': 'bs-game'
            };
            App.startGame(gameScreens[room.gameType], room);
        });

        this.socket.on('player_left', () => {
            alert('Соперник покинул игру');
            App.goBack();
        });

        // RPS Events
        this.socket.on('rps_waiting', () => {
            RPS.showWaiting();
        });

        this.socket.on('rps_result', (data) => {
            RPS.showResult(data);
        });

        this.socket.on('rps_game_over', (data) => {
            RPS.handleGameOver(data);
        });

        // TicTacToe Events
        this.socket.on('ttt_update', (data) => {
            TicTacToe.update(data);
        });

        // Battleship Events
        this.socket.on('bs_waiting_opponent', () => {
            Battleship.showWaitingForOpponent();
        });

        this.socket.on('bs_battle_start', (data) => {
            Battleship.startBattle(data);
        });

        this.socket.on('bs_shot_result', (data) => {
            Battleship.handleShotResult(data);
        });

        // Player joined (for multi-player games)
        this.socket.on('player_joined', (data) => {
            console.log(`Player joined: ${data.playersCount}/${data.maxPlayers}`);
            // Update waiting screen
            const waitingEl = document.querySelector('#waiting-view p');
            if (waitingEl) {
                waitingEl.textContent = `Игроки: ${data.playersCount}/${data.maxPlayers}`;
            }
        });

        // Durak Events
        this.socket.on('durak_start', (data) => {
            App.showScreen('durak-game');
            Durak.handleGameStart(data);
        });

        this.socket.on('durak_turn_update', (data) => {
            Durak.handleTurnUpdate(data);
        });

        this.socket.on('durak_card_played', (data) => {
            Durak.handleCardPlayed(data);
        });

        this.socket.on('durak_round_end', (data) => {
            Durak.handleRoundEnd(data);
        });

        this.socket.on('durak_game_over', (data) => {
            Durak.handleGameOver(data);
        });

        // UNO Events
        this.socket.on('uno_start', (data) => {
            App.showScreen('uno-game');
            UNO.handleGameStart(data);
        });

        this.socket.on('uno_turn_update', (data) => {
            UNO.handleTurnUpdate(data);
        });

        this.socket.on('uno_game_over', (data) => {
            UNO.handleGameOver(data);
        });

        // Monopoly Events
        this.socket.on('monopoly_start', (data) => {
            App.showScreen('monopoly-game');
            Monopoly.handleGameStart(data);
        });

        this.socket.on('monopoly_turn_update', (data) => {
            Monopoly.handleTurnUpdate(data);
        });

        this.socket.on('monopoly_dice_result', (data) => {
            Monopoly.handleDiceResult(data);
        });

        this.socket.on('monopoly_game_over', (data) => {
            Monopoly.handleGameOver(data);
        });
    },

    createRoom(gameType, settings = {}) {
        this.socket.emit('create_room', {
            gameType,
            odId: App.userId,
            userName: App.userName,
            settings
        });
    },

    joinRoom(roomId) {
        this.socket.emit('join_room', {
            roomId,
            odId: App.userId,
            userName: App.userName
        });
    },

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.init(); // Reconnect for next game
        }
    },

    // Game-specific emits
    rpsChoice(choice) {
        this.socket.emit('rps_choice', {
            odId: App.userId,
            choice
        });
    },

    tttMove(index) {
        this.socket.emit('ttt_move', {
            odId: App.userId,
            index
        });
    },

    bsPlaceShips(ships) {
        this.socket.emit('bs_place_ships', {
            odId: App.userId,
            ships
        });
    },

    bsFire(x, y) {
        this.socket.emit('bs_fire', {
            odId: App.userId,
            x,
            y
        });
    }
};
