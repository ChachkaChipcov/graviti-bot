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
        this.showScreen('room');

        const titles = {
            'rps': '✊ Камень-Ножницы-Бумага',
            'tictactoe': '❌⭕ Крестики-Нолики',
            'battleship': '🚢 Морской Бой'
        };

        // New games with setup screens
        if (gameType === 'rps') {
            this.showScreen('rps-setup');
            return;
        }
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

        document.getElementById('room-title').textContent = titles[gameType];

        // Reset room view
        document.getElementById('waiting-view').classList.add('hidden');
        document.getElementById('join-view').classList.add('hidden');
        document.querySelector('.room-actions').classList.remove('hidden');
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

function createRoom() {
    Multiplayer.createRoom(App.currentGame);
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
    document.querySelectorAll('.join-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.join-tab:first-child').classList.add('active');
    document.getElementById('join-by-code').classList.remove('hidden');
    document.getElementById('room-browser').classList.add('hidden');
}

function showRoomBrowser() {
    document.querySelectorAll('.join-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.join-tab:last-child').classList.add('active');
    document.getElementById('join-by-code').classList.add('hidden');
    document.getElementById('room-browser').classList.remove('hidden');

    // Request rooms list from server
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

// Drag and drop for cards - optimized for smooth touch
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragCardEl = null;
let dragCardIndex = null;
let dragGame = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function startDrag(e, index, game) {
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    dragCardEl = e.currentTarget;
    dragCardIndex = index;
    dragGame = game;
    isDragging = true;

    const rect = dragCardEl.getBoundingClientRect();
    dragStartX = rect.left;
    dragStartY = rect.top;
    dragOffsetX = touch.clientX - rect.left;
    dragOffsetY = touch.clientY - rect.top;

    // Instant visual feedback
    dragCardEl.style.willChange = 'transform';
    dragCardEl.style.zIndex = '1000';
    dragCardEl.style.transition = 'none';
    dragCardEl.style.position = 'fixed';
    dragCardEl.style.left = rect.left + 'px';
    dragCardEl.style.top = rect.top + 'px';
    dragCardEl.style.transform = 'scale(1.15) rotate(5deg)';
    dragCardEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

    App.haptic('light');
}

function onDrag(e) {
    if (!isDragging || !dragCardEl) return;
    e.preventDefault();

    const touch = e.touches[0];
    const x = touch.clientX - dragOffsetX;
    const y = touch.clientY - dragOffsetY;

    dragCardEl.style.left = x + 'px';
    dragCardEl.style.top = y + 'px';
}

function endDrag(e, game) {
    if (!isDragging || !dragCardEl) return;

    const touch = e.changedTouches[0];

    // Reset card style
    dragCardEl.style.willChange = '';
    dragCardEl.style.zIndex = '';
    dragCardEl.style.position = '';
    dragCardEl.style.left = '';
    dragCardEl.style.top = '';
    dragCardEl.style.transform = '';
    dragCardEl.style.boxShadow = '';
    dragCardEl.style.transition = '';

    // Check drop zone
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const validDrop = dropEl?.closest('#uno-pile, #durak-table, .u-pile-card, .d-pair, .uno-discard');

    if (validDrop && dragCardIndex !== null) {
        App.haptic('medium');
        if (game === 'uno') {
            UNO.playCard(dragCardIndex);
        } else if (game === 'durak') {
            Durak.playCard(dragCardIndex);
        }
    }

    // Reset state
    isDragging = false;
    dragCardEl = null;
    dragCardIndex = null;
    dragGame = null;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
