// Main App Controller
const App = {
    currentScreen: 'lobby',
    currentGame: null,
    userId: null,
    userName: null,
    roomId: null,
    tg: null,

    init() {
        // Initialize Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();

            // Get user info
            if (this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
                this.userId = this.tg.initDataUnsafe.user.id;
                this.userName = this.tg.initDataUnsafe.user.first_name || 'Игрок';
            }

            // Apply Telegram theme
            document.body.style.setProperty('--tg-theme-bg-color', this.tg.backgroundColor);

            // Back button handler
            this.tg.BackButton.onClick(() => this.goBack());
        }

        // Fallback for testing outside Telegram
        if (!this.userId) {
            this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
            this.userName = 'Тестовый Игрок';
        }

        // Check for room in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get('room');
        if (roomFromUrl) {
            this.joinRoomFromUrl(roomFromUrl);
        }

        // Initialize multiplayer connection
        Multiplayer.init();

        console.log('App initialized. User:', this.userName, this.userId);
    },

    selectGame(gameType) {
        this.currentGame = gameType;

        const titles = {
            'rps': '✊ Камень-Ножницы-Бумага',
            'tictactoe': '❌⭕ Крестики-Нолики',
            'battleship': '🚢 Морской Бой',
            'durak': '🃏 Дурак',
            'uno': '🎴 UNO',
            'monopoly': '🎲 Монополия',
            'mafia': '🎭 Мафия',
            'chess': '♟️ Шахматы',
            'checkers': '🏁 Шашки'
        };

        // Games with setup screens
        if (gameType === 'durak') {
            this.showScreen('durak-setup');
            return;
        }
        if (gameType === 'uno') {
            this.showScreen('uno-setup');
            return;
        }
        if (gameType === 'monopoly') {
            this.showScreen('monopoly-setup');
            return;
        }
        if (gameType === 'mafia') {
            this.showScreen('mafia-screen');
            return;
        }
        if (gameType === 'rps') {
            this.showScreen('rps-setup');
            return;
        }
        if (gameType === 'chess') {
            this.showScreen('chess-setup');
            return;
        }
        if (gameType === 'checkers') {
            this.showScreen('checkers-setup');
            return;
        }

        // For simple games - show room screen with room browser
        this.showScreen('room');
        document.getElementById('room-title').textContent = titles[gameType];

        // Show room browser by default, hide waiting
        document.getElementById('waiting-view').classList.add('hidden');
        document.getElementById('join-view').classList.remove('hidden');
        document.querySelector('.room-actions').classList.remove('hidden');

        // Switch to room browser tab and load rooms
        showRoomBrowser();
        Multiplayer.getRooms(gameType);
    },

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });

        // Show target screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;

            // Show/hide Telegram back button
            if (this.tg) {
                if (screenId === 'lobby') {
                    this.tg.BackButton.hide();
                } else {
                    this.tg.BackButton.show();
                }
            }
        }
    },

    goBack() {
        if (this.currentScreen === 'room') {
            // From room screen - go back to lobby or setup screen
            Multiplayer.disconnect();
            if (this.currentGame === 'durak') {
                this.showScreen('durak-setup');
            } else if (this.currentGame === 'uno') {
                this.showScreen('uno-setup');
            } else if (this.currentGame === 'monopoly') {
                this.showScreen('monopoly-setup');
            } else {
                this.showScreen('lobby');
                this.currentGame = null;
            }
            this.roomId = null;
        } else if (this.currentScreen.includes('-setup')) {
            // From setup screens - go to lobby
            this.showScreen('lobby');
            this.currentGame = null;
        } else if (this.currentScreen === 'minesweeper-game' || this.currentScreen === 'snake-game' || this.currentScreen === 'match3-game') {
            // Solo games - back to lobby
            if (this.currentScreen === 'snake-game' && typeof SnakeGame !== 'undefined') {
                SnakeGame.running = false;
                clearInterval(SnakeGame.gameLoop);
            }
            if (this.currentScreen === 'minesweeper-game' && typeof Minesweeper !== 'undefined') {
                clearInterval(Minesweeper.timerInterval);
            }
            this.showScreen('lobby');
            this.currentGame = null;
        } else if (this.currentScreen === 'mafia-screen') {
            this.showScreen('lobby');
            this.currentGame = null;
        } else if (this.currentScreen.includes('-game')) {
            // Leave game room - go to lobby
            Multiplayer.disconnect();
            this.showScreen('lobby');
            this.roomId = null;
            this.currentGame = null;
        }
    },


    showWaiting(roomId, room) {
        this.roomId = roomId;
        this.room = room;
        document.querySelector('.room-actions').classList.add('hidden');
        document.getElementById('waiting-view').classList.remove('hidden');
        document.getElementById('join-view').classList.add('hidden');

        // Display room code
        const roomCodeText = document.getElementById('room-code-text');
        if (roomCodeText) {
            roomCodeText.textContent = roomId.toUpperCase();
        }

        // Display correct player count
        const waitingEl = document.querySelector('#waiting-view p');
        if (waitingEl && room?.settings?.maxPlayers) {
            waitingEl.textContent = `Игроки: 1/${room.settings.maxPlayers}`;
        }
    },

    showJoinView() {
        // If we're on a setup screen, switch to room screen first
        if (this.currentScreen.includes('-setup')) {
            // Determine which game based on current setup screen
            if (this.currentScreen === 'durak-setup') {
                this.currentGame = 'durak';
                document.getElementById('room-title').textContent = '🃏 Дурак';
            } else if (this.currentScreen === 'uno-setup') {
                this.currentGame = 'uno';
                document.getElementById('room-title').textContent = '🎴 UNO';
            } else if (this.currentScreen === 'monopoly-setup') {
                this.currentGame = 'monopoly';
                document.getElementById('room-title').textContent = '🎲 Монополия';
            }
            this.showScreen('room');
        }

        document.querySelector('.room-actions').classList.add('hidden');
        document.getElementById('waiting-view').classList.add('hidden');
        document.getElementById('join-view').classList.remove('hidden');
    },

    joinRoomFromUrl(roomId) {
        // Show room screen with loading state
        this.showScreen('room');
        document.getElementById('room-title').textContent = '🎮 Присоединение...';

        // Hide room actions, show waiting view with message
        document.querySelector('.room-actions').classList.add('hidden');
        document.getElementById('join-view').classList.add('hidden');
        const waitingView = document.getElementById('waiting-view');
        waitingView.classList.remove('hidden');

        // Update waiting message
        const waitingText = waitingView.querySelector('p');
        if (waitingText) {
            waitingText.textContent = 'Подключение к комнате...';
        }

        // Hide room code display initially
        const roomCodeDisplay = waitingView.querySelector('.room-code-display');
        if (roomCodeDisplay) {
            roomCodeDisplay.style.display = 'none';
        }
        const inviteSection = waitingView.querySelector('.invite-section');
        if (inviteSection) {
            inviteSection.style.display = 'none';
        }

        // Auto-join room from URL parameter
        setTimeout(() => {
            Multiplayer.joinRoom(roomId);
        }, 500);
    },

    shareInvite() {
        if (!this.roomId) return;

        // Game names for invite message
        const gameNames = {
            'rps': 'Камень-Ножницы-Бумага',
            'tictactoe': 'Крестики-Нолики',
            'battleship': 'Морской Бой',
            'durak': 'Дурак',
            'uno': 'UNO',
            'monopoly': 'Монополия'
        };

        const gameName = gameNames[this.currentGame] || 'игру';
        const botUsername = 'modulletgbot';
        const inviteText = encodeURIComponent(`🎮 Давай сыграем в ${gameName}! Присоединяйся:`);
        const inviteUrl = encodeURIComponent(`https://t.me/${botUsername}?start=join_${this.roomId}`);
        const shareUrl = `https://t.me/share/url?url=${inviteUrl}&text=${inviteText}`;

        if (this.tg && this.tg.openTelegramLink) {
            this.tg.openTelegramLink(shareUrl);
        } else if (this.tg && this.tg.openLink) {
            this.tg.openLink(shareUrl);
        } else {
            navigator.clipboard.writeText(`https://t.me/${botUsername}?start=join_${this.roomId}`).then(() => {
                alert('Ссылка скопирована в буфер обмена!');
            });
        }
    },

    startGame(gameScreen, room) {
        this.showScreen(gameScreen);

        // Initialize the specific game
        if (gameScreen === 'rps-game') {
            RPS.init(room);
        } else if (gameScreen === 'ttt-game') {
            TicTacToe.init(room);
        } else if (gameScreen === 'bs-game') {
            Battleship.init(room);
        }
    },

    showVictory(isWinner) {
        // Create confetti
        if (isWinner) {
            this.createConfetti();
            if (this.tg) {
                this.tg.HapticFeedback.notificationOccurred('success');
            }
        } else {
            if (this.tg) {
                this.tg.HapticFeedback.notificationOccurred('error');
            }
        }
    },

    createConfetti() {
        const confettiEmojis = ['🎉', '🎊', '✨', '🌟', '💫', '⭐'];
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }
    },

    haptic(type = 'light') {
        if (this.tg && this.tg.HapticFeedback) {
            if (type === 'light') {
                this.tg.HapticFeedback.impactOccurred('light');
            } else if (type === 'medium') {
                this.tg.HapticFeedback.impactOccurred('medium');
            } else if (type === 'heavy') {
                this.tg.HapticFeedback.impactOccurred('heavy');
            }
        }
    }
};

// Global functions for onclick handlers
function selectGame(gameType) {
    App.selectGame(gameType);
}

function goBack() {
    App.goBack();
}

function showCreateRoomForm() {
    document.getElementById('room-create-form').classList.remove('hidden');
    document.getElementById('room-buttons').classList.add('hidden');
}

function cancelCreateRoom() {
    document.getElementById('room-create-form').classList.add('hidden');
    document.getElementById('room-buttons').classList.remove('hidden');
    document.getElementById('room-private-toggle').checked = false;
    document.getElementById('room-password-row').classList.add('hidden');
    document.getElementById('create-room-password').value = '';
}

function toggleRoomPassword() {
    const isPrivate = document.getElementById('room-private-toggle').checked;
    const passwordRow = document.getElementById('room-password-row');
    if (isPrivate) {
        passwordRow.classList.remove('hidden');
    } else {
        passwordRow.classList.add('hidden');
        document.getElementById('create-room-password').value = '';
    }
}

function confirmCreateRoom() {
    const isPrivate = document.getElementById('room-private-toggle').checked;
    const password = document.getElementById('create-room-password').value.trim();

    if (isPrivate && !password) {
        document.getElementById('create-room-password').style.borderColor = '#ff6b6b';
        setTimeout(() => {
            document.getElementById('create-room-password').style.borderColor = '';
        }, 2000);
        return;
    }

    Multiplayer.createRoom(App.currentGame, password || null, !isPrivate);
    cancelCreateRoom();
}

function createRoom() {
    showCreateRoomForm();
}

function showJoinView() {
    App.showJoinView();
}

// Room browser state
let availableRooms = [];
let currentFilter = 'all';

function joinRoom() {
    const input = document.getElementById('room-code-input');
    const passwordInput = document.getElementById('room-password-input');
    const code = input.value.trim().toUpperCase();
    const password = passwordInput?.value?.trim() || null;

    if (code.length < 6) {
        input.style.borderColor = '#ff6b6b';
        input.placeholder = 'Мин. 6 символов';
        setTimeout(() => {
            input.style.borderColor = '';
            input.placeholder = 'XXXXXXXX';
        }, 2000);
        return;
    }

    Multiplayer.joinRoom(code, password);
}

function showJoinByCode() {
    showJoinMethod('code');
}

function showRoomBrowser() {
    showJoinMethod('rooms');
}

function showJoinMethod(method) {
    // Update method buttons
    document.querySelectorAll('.join-method').forEach(m => m.classList.remove('active'));
    document.querySelector(`.join-method[data-method="${method}"]`)?.classList.add('active');

    // Hide all sections
    document.getElementById('join-by-code').classList.add('hidden');
    document.getElementById('join-by-link')?.classList.add('hidden');
    document.getElementById('room-browser').classList.add('hidden');

    // Show selected section
    if (method === 'code') {
        document.getElementById('join-by-code').classList.remove('hidden');
    } else if (method === 'link') {
        document.getElementById('join-by-link')?.classList.remove('hidden');
    } else if (method === 'rooms') {
        document.getElementById('room-browser').classList.remove('hidden');
        Multiplayer.getRooms(App.currentGame);
    }
}

function joinByLink() {
    const input = document.getElementById('room-link-input');
    const link = input.value.trim();

    // Extract room code from link (format: ...?startapp=ROOMCODE)
    const match = link.match(/[?&]startapp=([A-Z0-9]+)/i);
    if (match) {
        const code = match[1].toUpperCase();
        Multiplayer.joinRoom(code);
    } else if (link.length >= 6) {
        // Maybe they just pasted the code
        Multiplayer.joinRoom(link.toUpperCase());
    } else {
        input.style.borderColor = '#ff6b6b';
        setTimeout(() => input.style.borderColor = '', 2000);
    }
}

function refreshRoomList() {
    App.haptic('light');
    Multiplayer.getRooms(App.currentGame);
}

function filterRooms(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-filter="${filter}"]`).classList.add('active');
    renderRoomsList();
}

function renderRoomsList() {
    const listEl = document.getElementById('rooms-list');
    if (!listEl) return;

    const gameNames = {
        'rps': '✊ КНБ',
        'tictactoe': '❌⭕ Крестики-Нолики',
        'battleship': '🚢 Морской Бой',
        'durak': '🃏 Дурак',
        'uno': '🎴 UNO',
        'monopoly': '🎲 Монополия'
    };

    let filtered = availableRooms;
    if (currentFilter === 'open') {
        filtered = availableRooms.filter(r => !r.hasPassword);
    } else if (currentFilter === 'locked') {
        filtered = availableRooms.filter(r => r.hasPassword);
    }

    if (filtered.length === 0) {
        listEl.innerHTML = '<p class="rooms-empty">🔍 Нет доступных комнат</p>';
        return;
    }

    listEl.innerHTML = filtered.map(room => `
        <div class="room-card" onclick="joinRoomFromList('${room.id}', ${room.hasPassword})">
            <div class="room-card-info">
                <div class="room-card-game">${gameNames[room.gameType] || room.gameType}</div>
                <div class="room-card-creator">👤 ${room.creatorName}</div>
            </div>
            <div class="room-card-players">${room.players}/${room.maxPlayers}</div>
            <div class="room-card-lock">${room.hasPassword ? '🔒' : '🔓'}</div>
        </div>
    `).join('');
}

function joinRoomFromList(roomId, hasPassword) {
    if (hasPassword) {
        const password = prompt('🔐 Введите пароль:');
        if (password === null) return;
        Multiplayer.joinRoom(roomId, password);
    } else {
        Multiplayer.joinRoom(roomId);
    }
}

function shareInvite() {
    App.shareInvite();
}

function copyRoomCode() {
    const roomCodeText = document.getElementById('room-code-text');
    if (roomCodeText && roomCodeText.textContent) {
        const code = roomCodeText.textContent;

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                showCopyFeedback();
            }).catch(() => {
                // Fallback for older browsers
                fallbackCopyTextToClipboard(code);
            });
        } else {
            fallbackCopyTextToClipboard(code);
        }
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showCopyFeedback();
    } catch (err) {
        console.error('Failed to copy:', err);
    }
    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    const btn = document.querySelector('.copy-code-btn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = 'linear-gradient(135deg, #00d9a0 0%, #00b386 100%)';

        if (App.tg) {
            App.tg.HapticFeedback.notificationOccurred('success');
        }

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
    }
}

// Global game over functions
function playAgain() {
    // Remove game over overlay
    const overlay = document.querySelector('.game-over-overlay');
    if (overlay) overlay.remove();

    // Request rematch from server
    if (Multiplayer.socket) {
        Multiplayer.socket.emit('request_rematch', {
            odId: App.userId,
            roomId: App.roomId
        });
    }
    App.haptic('medium');
}

function exitToMenu() {
    // Remove game over overlay
    const overlay = document.querySelector('.game-over-overlay');
    if (overlay) overlay.remove();

    // Disconnect and go back
    Multiplayer.disconnect();
    App.goBack();
}

// Drag and drop for cards - supports both tap and drag
let isDragging = false;
let dragCardEl = null;
let dragCardIndex = null;
let dragGame = null;
let dragStartX = 0;
let dragStartY = 0;
let dragMoved = false;

function startDrag(e, index, game) {
    e.preventDefault();

    const touch = e.touches[0];
    dragCardEl = e.currentTarget;
    dragCardIndex = index;
    dragGame = game;
    isDragging = true;
    dragMoved = false;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;

    App.haptic('light');
}

function onDrag(e) {
    if (!isDragging || !dragCardEl) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - dragStartX;
    const dy = touch.clientY - dragStartY;

    // Only start visual drag if moved more than 10px
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        dragMoved = true;

        if (!dragCardEl.style.position) {
            const rect = dragCardEl.getBoundingClientRect();
            dragCardEl.style.position = 'fixed';
            dragCardEl.style.zIndex = '1000';
            dragCardEl.style.transition = 'none';
            dragCardEl.style.left = rect.left + 'px';
            dragCardEl.style.top = rect.top + 'px';
            dragCardEl.style.transform = 'scale(1.1)';
        }

        dragCardEl.style.left = (parseFloat(dragCardEl.style.left) + dx) + 'px';
        dragCardEl.style.top = (parseFloat(dragCardEl.style.top) + dy) + 'px';
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
    }
}

function endDrag(e, game) {
    if (!isDragging) return;

    const touch = e.changedTouches[0];
    const cardIndex = dragCardIndex;

    // Reset card style
    if (dragCardEl) {
        dragCardEl.style.position = '';
        dragCardEl.style.zIndex = '';
        dragCardEl.style.left = '';
        dragCardEl.style.top = '';
        dragCardEl.style.transform = '';
        dragCardEl.style.transition = '';
    }

    // If didn't move much, treat as tap (click)
    if (!dragMoved) {
        isDragging = false;
        dragCardEl = null;
        if (game === 'uno') {
            UNO.playCard(cardIndex);
        } else if (game === 'durak') {
            Durak.playCard(cardIndex);
        }
        return;
    }

    // Check drop zone for drag
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const validDrop = dropEl?.closest('#uno-pile, #durak-table, .u-pile-card, .d-pair, .uno-discard, .durak-table');

    if (validDrop && cardIndex !== null) {
        App.haptic('medium');
        if (game === 'uno') {
            UNO.playCard(cardIndex);
        } else if (game === 'durak') {
            Durak.playCard(cardIndex);
        }
    }

    isDragging = false;
    dragCardEl = null;
    dragCardIndex = null;
    dragGame = null;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    initSettings();
});

// ========== SETTINGS & LOCALIZATION ==========

// Translations
const translations = {
    ru: {
        // Main
        subtitle: 'Играй с друзьями!',
        settings: 'Настройки',
        language: 'Язык',
        theme: 'Тема',
        dark: 'Тёмная',
        light: 'Светлая',
        beta: 'БЕТА',

        // Games
        rps_title: 'Камень-Ножницы-Бумага',
        rps_desc: 'Классическая игра на удачу',
        ttt_title: 'Крестики-Нолики',
        ttt_desc: 'Стратегическая дуэль 3x3',
        chess_title: 'Шахматы',
        chess_desc: 'Классическая стратегия',
        checkers_title: 'Шашки',
        checkers_desc: 'Русские шашки 8×8',
        bs_title: 'Морской Бой',
        bs_desc: 'Потопи флот противника!',
        durak_title: 'Дурак',
        durak_desc: 'Карточная игра 2-7 игроков',
        uno_title: 'UNO',
        uno_desc: 'Цветные карты 2-7 игроков',
        monopoly_title: 'Монополия',
        monopoly_desc: 'Классическая настольная игра',
        mafia_title: 'Мафия',
        mafia_desc: 'Социальная игра 5-12 игроков',
        ms_title: 'Сапёр',
        ms_desc: 'Найди все мины!',
        snake_title: 'Змейка',
        snake_desc: 'Классическая аркада',
        m3_title: '3 в ряд',
        m3_desc: 'Собирай кристаллы!',

        // Tabs
        tab_friends: 'С друзьями',
        tab_solo: 'Одному',

        // Common UI
        create_room: 'Создать комнату',
        join_room: 'Присоединиться',
        waiting: 'Ожидание...',
        your_turn: 'Ваш ход!',
        opponent_turn: 'Ход соперника...',
        you_win: '🎉 Вы победили!',
        you_lose: '😢 Вы проиграли',
        draw: '🤝 Ничья!',
        play_again: 'Играть снова',
        exit: 'Выход',
        ready: 'Готово',
        start: 'Начать',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        invite_friend: 'Пригласить друга',
        room_code: 'Код комнаты',
        players: 'Игроки',
        password: 'Пароль',
        private_room: 'Приватная комната',

        // Support
        support_dev: 'Поддержка разработчика',
        donate: 'Поддержать',
        developer: 'Разработчик',
        version: 'Версия',

        // Info
        information: 'Информация',
        about_project: 'О проекте',
        info_text_1: '🚀 Разработка Game Zone началась <strong>20 ноября 2025 года</strong>.',
        info_text_2: '📈 Проект активно развивается и будет продолжать расти!',
        info_text_3: '🎮 Впереди новые игры, улучшения и функции.',
        info_text_4: '💜 Спасибо, что играете с нами!',
        close_settings: 'Закрыть настройки',
        help: 'Помощь',
        contact_support: 'Связаться с поддержкой',

        // Minesweeper
        ms_easy: 'Лёгкий',
        ms_medium: 'Средний',
        ms_hard: 'Сложный',
        ms_restart: 'Ещё раз',

        // Snake
        snake_start: 'Нажмите чтобы начать',
        snake_play: 'Играть',

        // Mafia
        mf_choose_mode: 'Выберите режим',
        mf_bot_host: 'Бот-ведущий',
        mf_bot_desc: 'Автоматические фазы и раздача ролей',
        mf_human_host: 'Человек-ведущий',
        mf_human_desc: 'Бросок кубиков, ведущий управляет',
        mf_vote_title: '🗳 Голосование',
        mf_dice_title: '🎲 Бросок кубиков',
        mf_roll: 'Бросить'
    },
    zh: {
        // Main
        subtitle: '与朋友一起玩！',
        settings: '设置',
        language: '语言',
        theme: '主题',
        dark: '深色',
        light: '浅色',
        beta: '测试版',

        // Games
        rps_title: '石头剪刀布',
        rps_desc: '经典运气游戏',
        ttt_title: '井字棋',
        ttt_desc: '3x3 策略对决',
        chess_title: '国际象棋',
        chess_desc: '经典策略游戏',
        checkers_title: '跳棋',
        checkers_desc: '俄式跳棋 8×8',
        bs_title: '战舰',
        bs_desc: '击沉敌方舰队！',
        durak_title: '杜拉克',
        durak_desc: '2-7 人纸牌游戏',
        uno_title: 'UNO',
        uno_desc: '2-7 人彩色纸牌',
        monopoly_title: '大富翁',
        monopoly_desc: '经典棋盘游戏',
        mafia_title: '黑手党',
        mafia_desc: '社交游戏 5-12 人',
        ms_title: '扫雷',
        ms_desc: '找出所有地雷！',
        snake_title: '贪吃蛇',
        snake_desc: '经典街机游戏',
        m3_title: '3 消',
        m3_desc: '收集水晶！',

        // Tabs
        tab_friends: '多人游戏',
        tab_solo: '单人游戏',

        // Common UI
        create_room: '创建房间',
        join_room: '加入房间',
        waiting: '等待中...',
        your_turn: '你的回合！',
        opponent_turn: '对手回合...',
        you_win: '🎉 你赢了！',
        you_lose: '😢 你输了',
        draw: '🤝 平局！',
        play_again: '再玩一次',
        exit: '退出',
        ready: '准备',
        start: '开始',
        cancel: '取消',
        confirm: '确认',
        invite_friend: '邀请朋友',
        room_code: '房间代码',
        players: '玩家',
        password: '密码',
        private_room: '私人房间',

        // Support
        support_dev: '支持开发者',
        donate: '捐赠',
        developer: '开发者',
        version: '版本',

        // Info
        information: '信息',
        about_project: '关于项目',
        info_text_1: '🚀 Game Zone 开发始于<strong>2025 年 11 月 20 日</strong>。',
        info_text_2: '📈 项目正在积极开发并将继续发展！',
        info_text_3: '🎮 即将推出新游戏、改进和功能。',
        info_text_4: '💜 感谢你和我们一起游戏！',
        close_settings: '关闭设置',
        help: '帮助',
        contact_support: '联系支持',

        // Minesweeper
        ms_easy: '简单',
        ms_medium: '中等',
        ms_hard: '困难',
        ms_restart: '再来一局',

        // Snake
        snake_start: '点击开始',
        snake_play: '开始游戏',

        // Mafia
        mf_choose_mode: '选择模式',
        mf_bot_host: '机器人主持',
        mf_bot_desc: '自动阶段和角色分配',
        mf_human_host: '真人主持',
        mf_human_desc: '掷骰子，主持人控制',
        mf_vote_title: '🗳 投票',
        mf_dice_title: '🎲 掷骰子',
        mf_roll: '投掷'
    },
    en: {
        // Main
        subtitle: 'Play with friends!',
        settings: 'Settings',
        language: 'Language',
        theme: 'Theme',
        dark: 'Dark',
        light: 'Light',
        beta: 'BETA',

        // Games
        rps_title: 'Rock-Paper-Scissors',
        rps_desc: 'Classic game of luck',
        ttt_title: 'Tic-Tac-Toe',
        ttt_desc: 'Strategic 3x3 duel',
        chess_title: 'Chess',
        chess_desc: 'Classic strategy game',
        checkers_title: 'Checkers',
        checkers_desc: 'Russian checkers 8×8',
        bs_title: 'Battleship',
        bs_desc: 'Sink the enemy fleet!',
        durak_title: 'Durak',
        durak_desc: 'Card game for 2-7 players',
        uno_title: 'UNO',
        uno_desc: 'Color cards for 2-7 players',
        monopoly_title: 'Monopoly',
        monopoly_desc: 'Classic board game',
        mafia_title: 'Mafia',
        mafia_desc: 'Social game 5-12 players',
        ms_title: 'Minesweeper',
        ms_desc: 'Find all mines!',
        snake_title: 'Snake',
        snake_desc: 'Classic arcade game',
        m3_title: 'Match 3',
        m3_desc: 'Collect crystals!',

        // Tabs
        tab_friends: 'Multiplayer',
        tab_solo: 'Solo',

        // Common UI
        create_room: 'Create Room',
        join_room: 'Join Room',
        waiting: 'Waiting...',
        your_turn: 'Your turn!',
        opponent_turn: 'Opponent\'s turn...',
        you_win: '🎉 You won!',
        you_lose: '😢 You lost',
        draw: '🤝 Draw!',
        play_again: 'Play Again',
        exit: 'Exit',
        ready: 'Ready',
        start: 'Start',
        cancel: 'Cancel',
        confirm: 'Confirm',
        invite_friend: 'Invite Friend',
        room_code: 'Room Code',
        players: 'Players',
        password: 'Password',
        private_room: 'Private Room',

        // Support
        support_dev: 'Support Developer',
        donate: 'Donate',
        developer: 'Developer',
        version: 'Version',

        // Info
        information: 'Information',
        about_project: 'About Project',
        info_text_1: '🚀 Game Zone development started on <strong>November 20, 2025</strong>.',
        info_text_2: '📈 The project is actively developing and will continue to grow!',
        info_text_3: '🎮 New games, improvements and features are coming.',
        info_text_4: '💜 Thank you for playing with us!',
        close_settings: 'Close Settings',
        help: 'Help',
        contact_support: 'Contact Support',

        // Minesweeper
        ms_easy: 'Easy',
        ms_medium: 'Medium',
        ms_hard: 'Hard',
        ms_restart: 'Restart',

        // Snake
        snake_start: 'Tap to start',
        snake_play: 'Play',

        // Mafia
        mf_choose_mode: 'Choose mode',
        mf_bot_host: 'Bot Host',
        mf_bot_desc: 'Auto phases and role dealing',
        mf_human_host: 'Human Host',
        mf_human_desc: 'Dice roll, host controls',
        mf_vote_title: '🗳 Voting',
        mf_dice_title: '🎲 Dice Roll',
        mf_roll: 'Roll'
    }
};

let currentLang = 'ru';
let currentTheme = 'dark';

function initSettings() {
    // Load saved settings
    const savedLang = localStorage.getItem('gamezone_lang') || 'ru';
    const savedTheme = localStorage.getItem('gamezone_theme') || 'dark';

    setLanguage(savedLang, false);
    setTheme(savedTheme, false);
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const btn = document.querySelector('.hamburger-btn');

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
    } else {
        panel.classList.add('hidden');
        btn.classList.remove('active');
    }

    App.haptic('light');
}

function setLanguage(lang, save = true) {
    currentLang = lang;

    // Update option buttons
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.lang === lang);
    });

    // Apply translations
    const t = translations[lang] || translations.ru;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Save to localStorage
    if (save) {
        localStorage.setItem('gamezone_lang', lang);
        App.haptic('light');
    }
}

function setTheme(theme, save = true) {
    currentTheme = theme;

    // Update option buttons
    document.querySelectorAll('[data-theme]').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.theme === theme);
    });

    // Apply theme
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }

    // Update theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.content = theme === 'light' ? '#f5f5f7' : '#0f0f1a';
    }

    // Save to localStorage
    if (save) {
        localStorage.setItem('gamezone_theme', theme);
        App.haptic('light');
    }
}

// Toggle info accordion
function toggleInfo() {
    const content = document.getElementById('info-content');
    const header = document.querySelector('.accordion-header');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        header.classList.add('active');
    } else {
        content.classList.add('hidden');
        header.classList.remove('active');
    }

    App.haptic('light');
}

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.dataset.tab === tab);
    });
    if (typeof App !== 'undefined') App.haptic('light');
}

// ========== SOLO GAMES ==========
function startSoloGame(gameType) {
    if (gameType === 'minesweeper') {
        App.showScreen('minesweeper-game');
        if (typeof Minesweeper !== 'undefined') Minesweeper.init();
    } else if (gameType === 'snake') {
        App.showScreen('snake-game');
        if (typeof SnakeGame !== 'undefined') SnakeGame.init();
    } else if (gameType === 'match3') {
        App.showScreen('match3-game');
        if (typeof Match3Game !== 'undefined') Match3Game.init();
    }
}

function goBackToLobby() {
    App.goBack();
}
