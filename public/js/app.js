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
                const u = this.tg.initDataUnsafe.user;
                this.userId = u.id;
                this.userName = u.first_name || 'Игрок';
                this.username = u.username || '';
                this.photoUrl = u.photo_url || '';

                // Sync with server
                fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegramId: this.userId,
                        username: this.username,
                        firstName: this.userName,
                        photoUrl: this.photoUrl
                    })
                }).catch(e => console.error('Sync error:', e));

                // Set lobby avatar
                const lobbyAvatar = document.getElementById('lobby-avatar');
                if (lobbyAvatar && this.photoUrl) {
                    lobbyAvatar.src = this.photoUrl;
                } else if (lobbyAvatar) {
                    lobbyAvatar.style.display = 'none';
                }
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

// ========== LEADERBOARD API ==========
async function submitScore(game, score, level) {
    if (!App.userId) return;
    try {
        await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game,
                score,
                level,
                telegramId: String(App.userId),
                username: App.tg?.initDataUnsafe?.user?.username || '',
                firstName: App.userName
            })
        });
    } catch (err) {
        console.error('Submit score error:', err);
    }
}

async function showLeaderboard(game) {
    const modal = document.getElementById('leaderboard-modal');
    const list = document.getElementById('lb-list');
    const tabs = document.getElementById('lb-tabs');
    if (tabs) tabs.classList.add('hidden');

    // Show modal & loader
    modal.classList.remove('hidden');
    list.innerHTML = '<div class="loader"></div>';
    App.haptic('light');

    try {
        const res = await fetch(`/api/leaderboard/${game}`);
        const data = await res.json();

        list.innerHTML = '';
        if (data.leaderboard && data.leaderboard.length > 0) {
            data.leaderboard.forEach((user, idx) => {
                const isMe = String(user.username) === String(App.tg?.initDataUnsafe?.user?.username) && user.username;
                const row = document.createElement('div');
                row.className = `lb-item ${isMe ? 'lb-me' : ''}`;

                let rankEmoji = `${idx + 1}`;
                if (idx === 0) rankEmoji = '🥇';
                if (idx === 1) rankEmoji = '🥈';
                if (idx === 2) rankEmoji = '🥉';

                // Show level for match3 and tetris
                let scoreText = user.best_score;
                if (game === 'match3' || game === 'tetris') {
                    scoreText = `${user.best_score} <span style="opacity:0.6;font-size:0.8em">(Ур.${user.best_level})</span>`;
                }

                let nameHtml = user.first_name;
                if (user.username) {
                    nameHtml += ` <span style="opacity:0.5;font-size:0.8em">@${user.username}</span>`;
                }

                row.innerHTML = `
                    <div class="lb-rank">${rankEmoji}</div>
                    <div class="lb-name">${nameHtml}</div>
                    <div class="lb-score">${scoreText}</div>
                `;
                list.appendChild(row);
            });
        } else {
            list.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5">Пока нет результатов</div>';
        }
    } catch (err) {
        console.error('Leaderboard error:', err);
        list.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.5" data-i18n="lb_empty">Пока нет результатов</div>`;
    }
}

function showAllLeaderboards() {
    switchLeaderboardTab('match3');
}

function switchLeaderboardTab(game) {
    showLeaderboard(game).then(() => {
        const tabs = document.getElementById('lb-tabs');
        if (tabs) tabs.classList.remove('hidden');

        // Выделение активного таба через CSS-класс
        document.querySelectorAll('#lb-tabs .lb-tab-btn').forEach(btn => {
            const isActive = btn.getAttribute('onclick').includes("'" + game + "'");
            btn.classList.toggle('active', isActive);
        });
    });
}

function hideLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
    App.haptic('light');
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

const translations = {
    ru: {
        subtitle: 'Играй с друзьями!', settings: 'Настройки', language: 'Язык', theme: 'Тема', dark: 'Тёмная', light: 'Светлая', beta: 'БЕТА',
        rps_title: 'Камень-Ножницы-Бумага', rps_desc: 'Классическая игра на удачу', ttt_title: 'Крестики-Нолики', ttt_desc: 'Стратегическая дуэль 3x3', bs_title: 'Морской Бой', bs_desc: 'Потопи флот противника!', durak_title: 'Дурак', durak_desc: 'Карточная игра 2-7 игроков', uno_title: 'UNO', uno_desc: 'Цветные карты 2-7 игроков', monopoly_title: 'Монополия', monopoly_desc: 'Классическая настольная игра',
        tab_friends: 'С друзьями', tab_solo: 'Одному', ms_title: 'Сапёр', ms_desc: 'Найди все мины!', snake_title: 'Змейка', snake_desc: 'Классическая аркада', m3_title: '3 в ряд', m3_desc: 'Собирай кристаллы!', tetris_title: 'Тетрис', tetris_desc: 'Классика с ускорением', memory_title: 'Память', memory_desc: 'Найди пары всем картам', sudoku_title: 'Судоку', sudoku_desc: 'Головоломка 9x9',
        create_room: 'Создать комнату', join_room: 'Присоединиться', waiting: 'Ожидание...', your_turn: 'Ваш ход!', opponent_turn: 'Ход соперника...', you_win: '🎉 Вы победили!', you_lose: '😢 Вы проиграли', draw: '🤝 Ничья!', play_again: 'Играть снова', exit: 'Выход', ready: 'Готово', start: 'Начать', cancel: 'Отмена', confirm: 'Подтвердить', invite_friend: 'Пригласить друга', room_code: 'Код комнаты', players: 'Игроки', password: 'Пароль', private_room: 'Приватная комната',
        support_dev: 'Поддержка разработчика', donate: 'Поддержать', developer: 'Разработчик', version: 'Версия', information: 'Информация', about_project: 'О проекте', info_text_1: '🚀 Разработка Game Zone началась <strong>20 ноября 2025 года</strong>.', info_text_2: '📈 Проект активно развивается!', info_text_3: '🎮 Впереди новые игры и улучшения.', info_text_4: '💜 Спасибо, что играете с нами!', close_settings: 'Закрыть настройки', help: 'Помощь', contact_support: 'Связаться с поддержкой'
    },
    en: {
        subtitle: 'Play with friends!', settings: 'Settings', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', beta: 'BETA',
        rps_title: 'Rock-Paper-Scissors', rps_desc: 'Classic game of luck', ttt_title: 'Tic-Tac-Toe', ttt_desc: 'Strategic 3x3 duel', bs_title: 'Battleship', bs_desc: 'Sink the enemy fleet!', durak_title: 'Durak', durak_desc: 'Card game for 2-7 players', uno_title: 'UNO', uno_desc: 'Color cards for 2-7 players', monopoly_title: 'Monopoly', monopoly_desc: 'Classic board game',
        tab_friends: 'With friends', tab_solo: 'Solo', ms_title: 'Minesweeper', ms_desc: 'Find all mines!', snake_title: 'Snake', snake_desc: 'Classic arcade', m3_title: 'Match-3', m3_desc: 'Collect crystals!', tetris_title: 'Tetris', tetris_desc: 'Classic with speed up', memory_title: 'Memory', memory_desc: 'Find pairs for all cards', sudoku_title: 'Sudoku', sudoku_desc: '9x9 puzzle',
        create_room: 'Create Room', join_room: 'Join Room', waiting: 'Waiting...', your_turn: 'Your turn!', opponent_turn: 'Opponent\'s turn...', you_win: '🎉 You won!', you_lose: '😢 You lost', draw: '🤝 Draw!', play_again: 'Play Again', exit: 'Exit', ready: 'Ready', start: 'Start', cancel: 'Cancel', confirm: 'Confirm', invite_friend: 'Invite Friend', room_code: 'Room Code', players: 'Players', password: 'Password', private_room: 'Private Room',
        support_dev: 'Support Developer', donate: 'Donate', developer: 'Developer', version: 'Version', information: 'Information', about_project: 'About Project', info_text_1: '🚀 Game Zone development started on <strong>Nov 20, 2025</strong>.', info_text_2: '📈 The project is actively developing!', info_text_3: '🎮 New games and improvements are coming.', info_text_4: '💜 Thank you for playing!', close_settings: 'Close Settings', help: 'Help', contact_support: 'Contact Support'
    },
    zh: {
        subtitle: '和朋友一起玩！', settings: '设置', language: '语言', theme: '主题', dark: '暗', light: '亮', beta: '测试版',
        rps_title: '石头剪刀布', rps_desc: '经典运气游戏', ttt_title: '井字棋', ttt_desc: '3x3 策略对决', bs_title: '海战', bs_desc: '击沉敌方舰队！', durak_title: '傻瓜', durak_desc: '2-7 人纸牌游戏', uno_title: 'UNO', uno_desc: '2-7 人彩色纸牌', monopoly_title: '大富翁', monopoly_desc: '经典桌面游戏',
        tab_friends: '和朋友', tab_solo: '单人', ms_title: '扫雷', ms_desc: '找出所有地雷！', snake_title: '贪吃蛇', snake_desc: '经典街机', m3_title: '三消', m3_desc: '收集水晶！', tetris_title: '俄罗斯方块', tetris_desc: '加速经典', memory_title: '记忆', memory_desc: '为所有卡片找到配对', sudoku_title: '数独', sudoku_desc: '9x9 谜题',
        create_room: '创建房间', join_room: '加入房间', waiting: '等待中...', your_turn: '轮到你了！', opponent_turn: '对手的回合...', you_win: '🎉 你赢了！', you_lose: '😢 你输了', draw: '🤝 平局！', play_again: '再玩一次', exit: '退出', ready: '准备', start: '开始', cancel: '取消', confirm: '确认', invite_friend: '邀请好友', room_code: '房间代码', players: '玩家', password: '密码', private_room: '私人房间',
        support_dev: '支持开发者', donate: '赞助', developer: '开发者', version: '版本', information: '信息', about_project: '关于项目', info_text_1: '🚀 开发始于 <strong>2025年11月20日</strong>。', info_text_2: '📈 项目正在开发中！', info_text_3: '🎮 即将推出新游戏。', info_text_4: '💜 感谢您玩！', close_settings: '关闭', help: '帮助', contact_support: '联系支持'
    },
    hi: {
        subtitle: 'दोस्तों के साथ खेलें!', settings: 'सेटिंग्स', language: 'भाषा', theme: 'थीम', dark: 'गहरा', light: 'हल्का', beta: 'बेटा',
        rps_title: 'रॉक-पेपर-सिज़र्स', rps_desc: 'क्लासिक खेल', ttt_title: 'टिक-टैक-टो', ttt_desc: 'रणनीतिक 3x3', bs_title: 'बैटलशिप', bs_desc: 'बेड़े को डुबोएं!', durak_title: 'ड्यूरक', durak_desc: '2-7 कार्ड गेम', uno_title: 'UNO', uno_desc: '2-7 रंगीन कार्ड', monopoly_title: 'मोनोपोली', monopoly_desc: 'क्लासिक बोर्ड गेम',
        tab_friends: 'दोस्तों के साथ', tab_solo: 'अकेले', ms_title: 'माइनस्वीपर', ms_desc: 'खदानें खोजें!', snake_title: 'स्नेक', snake_desc: 'आर्केड', m3_title: 'मैच-3', m3_desc: 'क्रिस्टल इकट्ठा करें!', tetris_title: 'टेट्रिस', tetris_desc: 'क्लासिक गति', memory_title: 'मेमोरी', memory_desc: 'जोड़े खोजें', sudoku_title: 'सुडोकू', sudoku_desc: 'पहेली',
        create_room: 'कमरा बनाएँ', join_room: 'शामिल हों', waiting: 'प्रतीक्षा...', your_turn: 'आपकी बारी!', opponent_turn: 'प्रतिद्वंद्वी...', you_win: '🎉 आप जीत गए!', you_lose: '😢 आप हार गए', draw: '🤝 ड्रा!', play_again: 'फिर खेलें', exit: 'बाहर', ready: 'तैयार', start: 'शुरू करें', cancel: 'रद्द करें', confirm: 'पुष्टि करें', invite_friend: 'आमंत्रित करें', room_code: 'कोड', players: 'खिलाड़ी', password: 'पासवर्ड', private_room: 'निजी कमरा',
        support_dev: 'समर्थन करें', donate: 'दान करें', developer: 'डेवलपर', version: 'संस्करण', information: 'जानकारी', about_project: 'प्रोजेक्ट के बारे में', info_text_1: '🚀 <strong>20 नवंबर</strong> को शुरू हुआ।', info_text_2: '📈 विकसित हो रहा है!', info_text_3: '🎮 नए गेम आने वाले हैं।', info_text_4: '💜 खेलने के लिए धन्यवाद!', close_settings: 'बंद करें', help: 'मदद', contact_support: 'संपर्क करें'
    },
    ja: {
        subtitle: '友達と遊ぼう！', settings: '設定', language: '言語', theme: 'テーマ', dark: 'ダーク', light: 'ライト', beta: 'ベータ',
        rps_title: 'じゃんけん', rps_desc: '運のゲーム', ttt_title: '三目並べ', ttt_desc: '3x3の決闘', bs_title: 'バトルシップ', bs_desc: '艦隊を沈めろ！', durak_title: 'ドゥラーク', durak_desc: '2-7人カード', uno_title: 'UNO', uno_desc: '2-7人カラーカード', monopoly_title: 'モノポリー', monopoly_desc: 'ボードゲーム',
        tab_friends: '友達と', tab_solo: 'ソロ', ms_title: 'マインスイーパー', ms_desc: '地雷を見つける！', snake_title: 'スネーク', snake_desc: 'アーケード', m3_title: 'マッチ3', m3_desc: 'クリスタル集め', tetris_title: 'テトリス', tetris_desc: '加速クラシック', memory_title: 'メモリー', memory_desc: 'ペアを見つける', sudoku_title: '数独', sudoku_desc: '9x9パズル',
        create_room: 'ルームを作成', join_room: '参加', waiting: '待機中...', your_turn: 'あなたの番！', opponent_turn: '相手の番...', you_win: '🎉 勝ち！', you_lose: '😢 負け', draw: '🤝 引き分け！', play_again: 'もう一度', exit: '終了', ready: '準備完了', start: '開始', cancel: 'キャンセル', confirm: '確認', invite_friend: '招待', room_code: 'コード', players: 'プレイヤー', password: 'パスワード', private_room: 'プライベートルーム',
        support_dev: '開発者を支援', donate: '寄付', developer: '開発者', version: 'バージョン', information: '情報', about_project: 'プロジェクト', info_text_1: '🚀 <strong>2025年11月20日</strong>に開始。', info_text_2: '📈 積極的に開発中！', info_text_3: '🎮 新しいゲームを追加予定。', info_text_4: '💜 ありがとうございます！', close_settings: '閉じる', help: 'ヘルプ', contact_support: 'サポート'
    },
    de: {
        subtitle: 'Spiel mit Freunden!', settings: 'Einstellungen', language: 'Sprache', theme: 'Design', dark: 'Dunkel', light: 'Hell', beta: 'BETA',
        rps_title: 'Schere-Stein-Papier', rps_desc: 'Klassisches Glücksspiel', ttt_title: 'Tic-Tac-Toe', ttt_desc: 'Strategisches 3x3 Duell', bs_title: 'Schiffe versenken', bs_desc: 'Versenke die Flotte!', durak_title: 'Durak', durak_desc: 'Kartenspiel', uno_title: 'UNO', uno_desc: 'Farbkarten', monopoly_title: 'Monopoly', monopoly_desc: 'Brettspiel',
        tab_friends: 'Mit Freunden', tab_solo: 'Solo', ms_title: 'Minesweeper', ms_desc: 'Finde alle Minen!', snake_title: 'Snake', snake_desc: 'Arcade', m3_title: 'Match-3', m3_desc: 'Sammle Kristalle!', tetris_title: 'Tetris', tetris_desc: 'Klassiker', memory_title: 'Memory', memory_desc: 'Finde Paare', sudoku_title: 'Sudoku', sudoku_desc: '9x9 Rätsel',
        create_room: 'Raum erstellen', join_room: 'Beitreten', waiting: 'Warten...', your_turn: 'Du bist dran!', opponent_turn: 'Gegner ist dran...', you_win: '🎉 Gewonnen!', you_lose: '😢 Verloren', draw: '🤝 Unentschieden!', play_again: 'Nochmal spielen', exit: 'Verlassen', ready: 'Bereit', start: 'Start', cancel: 'Abbrechen', confirm: 'Bestätigen', invite_friend: 'Freund einladen', room_code: 'Code', players: 'Spieler', password: 'Passwort', private_room: 'Privater Raum',
        support_dev: 'Entwickler unterstützen', donate: 'Spenden', developer: 'Entwickler', version: 'Version', information: 'Informationen', about_project: 'Über das Projekt', info_text_1: '🚀 Begann am <strong>20. Nov 2025</strong>.', info_text_2: '📈 Projekt wächst!', info_text_3: '🎮 Neue Spiele kommen.', info_text_4: '💜 Danke fürs Spielen!', close_settings: 'Schließen', help: 'Hilfe', contact_support: 'Support'
    },
    it: {
        subtitle: 'Gioca con gli amici!', settings: 'Impostazioni', language: 'Lingua', theme: 'Tema', dark: 'Scuro', light: 'Chiaro', beta: 'BETA',
        rps_title: 'Sasso-Carta-Forbice', rps_desc: 'Gioco di fortuna', ttt_title: 'Tris', ttt_desc: 'Duello 3x3', bs_title: 'Battaglia Navale', bs_desc: 'Affonda la flotta!', durak_title: 'Durak', durak_desc: 'Gioco di carte', uno_title: 'UNO', uno_desc: 'Carte colorate', monopoly_title: 'Monopoli', monopoly_desc: 'Gioco da tavolo',
        tab_friends: 'Con amici', tab_solo: 'Da solo', ms_title: 'Prato Fiorito', ms_desc: 'Trova le mine!', snake_title: 'Snake', snake_desc: 'Arcade', m3_title: 'Match-3', m3_desc: 'Raccogli cristalli!', tetris_title: 'Tetris', tetris_desc: 'Classico', memory_title: 'Memory', memory_desc: 'Trova le coppie', sudoku_title: 'Sudoku', sudoku_desc: 'Puzzle 9x9',
        create_room: 'Crea Stanza', join_room: 'Unisciti', waiting: 'In attesa...', your_turn: 'Tocca a te!', opponent_turn: 'Avversario...', you_win: '🎉 Hai vinto!', you_lose: '😢 Hai perso', draw: '🤝 Pareggio!', play_again: 'Gioca ancora', exit: 'Esci', ready: 'Pronto', start: 'Inizia', cancel: 'Annulla', confirm: 'Conferma', invite_friend: 'Invita un amico', room_code: 'Codice', players: 'Giocatori', password: 'Password', private_room: 'Stanza Privata',
        support_dev: 'Supporta lo sviluppatore', donate: 'Dona', developer: 'Sviluppatore', version: 'Versione', information: 'Informazioni', about_project: 'Sul progetto', info_text_1: '🚀 Iniziato il <strong>20 Nov 2025</strong>.', info_text_2: '📈 Il progetto cresce!', info_text_3: '🎮 Nuovi giochi in arrivo.', info_text_4: '💜 Grazie per aver giocato!', close_settings: 'Chiudi', help: 'Aiuto', contact_support: 'Supporto'
    },
    es: {
        subtitle: '¡Juega con amigos!', settings: 'Ajustes', language: 'Idioma', theme: 'Tema', dark: 'Oscuro', light: 'Claro', beta: 'BETA',
        rps_title: 'Piedra-Papel-Tijera', rps_desc: 'Juego de suerte', ttt_title: 'Tres en raya', ttt_desc: 'Duelo 3x3', bs_title: 'Batalla Naval', bs_desc: '¡Hunde la flota!', durak_title: 'Durak', durak_desc: 'Juego de cartas', uno_title: 'UNO', uno_desc: 'Cartas de colores', monopoly_title: 'Monopoly', monopoly_desc: 'Juego de mesa',
        tab_friends: 'Con amigos', tab_solo: 'Solo', ms_title: 'Buscaminas', ms_desc: '¡Encuentra minas!', snake_title: 'Snake', snake_desc: 'Arcade', m3_title: 'Match-3', m3_desc: '¡Recoge cristales!', tetris_title: 'Tetris', tetris_desc: 'Clásico', memory_title: 'Memoria', memory_desc: 'Encuentra pares', sudoku_title: 'Sudoku', sudoku_desc: 'Rompecabezas 9x9',
        create_room: 'Crear Sala', join_room: 'Unirse', waiting: 'Esperando...', your_turn: '¡Tu turno!', opponent_turn: 'Turno oponente...', you_win: '🎉 ¡Ganaste!', you_lose: '😢 Perdiste', draw: '🤝 ¡Empate!', play_again: 'Jugar de nuevo', exit: 'Salir', ready: 'Listo', start: 'Comenzar', cancel: 'Cancelar', confirm: 'Confirmar', invite_friend: 'Invitar amigo', room_code: 'Código', players: 'Jugadores', password: 'Contraseña', private_room: 'Sala Privada',
        support_dev: 'Apoyar al dev', donate: 'Donar', developer: 'Desarrollador', version: 'Versión', information: 'Información', about_project: 'Sobre el proyecto', info_text_1: '🚀 Comenzó el <strong>20 Nov 2025</strong>.', info_text_2: '📈 ¡Sigue creciendo!', info_text_3: '🎮 Nuevos juegos pronto.', info_text_4: '💜 ¡Gracias por jugar!', close_settings: 'Cerrar', help: 'Ayuda', contact_support: 'Soporte'
    },
    fr: {
        subtitle: 'Joue avec des amis !', settings: 'Paramètres', language: 'Langue', theme: 'Thème', dark: 'Sombre', light: 'Clair', beta: 'BÊTA',
        rps_title: 'Pierre-Papier-Ciseaux', rps_desc: 'Jeu classique', ttt_title: 'Morpion', ttt_desc: 'Duel 3x3', bs_title: 'Bataille Navale', bs_desc: 'Coulez la flotte !', durak_title: 'Durak', durak_desc: 'Jeu de cartes', uno_title: 'UNO', uno_desc: 'Cartes colorées', monopoly_title: 'Monopoly', monopoly_desc: 'Jeu de société',
        tab_friends: 'Amis', tab_solo: 'Solo', ms_title: 'Démineur', ms_desc: 'Trouvez les mines !', snake_title: 'Snake', snake_desc: 'Arcade', m3_title: 'Match-3', m3_desc: 'Récupérez les cristaux !', tetris_title: 'Tetris', tetris_desc: 'Classique', memory_title: 'Mémoire', memory_desc: 'Trouvez des paires', sudoku_title: 'Sudoku', sudoku_desc: 'Puzzle 9x9',
        create_room: 'Créer un salon', join_room: 'Rejoindre', waiting: 'En attente...', your_turn: 'À vous !', opponent_turn: 'L\'adversaire...', you_win: '🎉 Gagné !', you_lose: '😢 Perdu', draw: '🤝 Égalité !', play_again: 'Rejouer', exit: 'Quitter', ready: 'Prêt', start: 'Commencer', cancel: 'Annuler', confirm: 'Confirmer', invite_friend: 'Inviter un ami', room_code: 'Code', players: 'Joueurs', password: 'Mot de passe', private_room: 'Salon privé',
        support_dev: 'Soutenir le dev', donate: 'Faire un don', developer: 'Développeur', version: 'Version', information: 'Information', about_project: 'À propos', info_text_1: '🚀 Commencé le <strong>20 Nov 2025</strong>.', info_text_2: '📈 Le projet grandit !', info_text_3: '🎮 Nouveaux jeux prévus.', info_text_4: '💜 Merci de jouer !', close_settings: 'Fermer', help: 'Aide', contact_support: 'Support'
    },
    pl: {
        subtitle: 'Graj z przyjaciółmi!', settings: 'Ustawienia', language: 'Język', theme: 'Motyw', dark: 'Ciemny', light: 'Jasny', beta: 'BETA',
        rps_title: 'Papier, Kamień, Nożyce', rps_desc: 'Klasyczna gra', ttt_title: 'Kółko i Krzyżyk', ttt_desc: 'Pojedynek 3x3', bs_title: 'Statki', bs_desc: 'Zatop flotę!', durak_title: 'Dureń', durak_desc: 'Gra karciana', uno_title: 'UNO', uno_desc: 'Kolorowe karty', monopoly_title: 'Monopoly', monopoly_desc: 'Gra planszowa',
        tab_friends: 'Z przyjaciółmi', tab_solo: 'Solo', ms_title: 'Saper', ms_desc: 'Znajdź miny!', snake_title: 'Wąż', snake_desc: 'Automat', m3_title: 'Dopasuj 3', m3_desc: 'Zbieraj kryształy!', tetris_title: 'Tetris', tetris_desc: 'Klasyk', memory_title: 'Pamięć', memory_desc: 'Znajdź pary', sudoku_title: 'Sudoku', sudoku_desc: 'Łamigłówka 9x9',
        create_room: 'Utwórz pokój', join_room: 'Dołącz', waiting: 'Oczekiwanie...', your_turn: 'Twój ruch!', opponent_turn: 'Ruch przeciwnika...', you_win: '🎉 Wygrałeś!', you_lose: '😢 Przegrałeś', draw: '🤝 Remis!', play_again: 'Zagraj ponownie', exit: 'Wyjście', ready: 'Gotowy', start: 'Start', cancel: 'Anuluj', confirm: 'Potwierdź', invite_friend: 'Zaproś przyjaciela', room_code: 'Kod', players: 'Gracze', password: 'Hasło', private_room: 'Prywatny pokój',
        support_dev: 'Wspieraj programistę', donate: 'Datek', developer: 'Programista', version: 'Wersja', information: 'Informacje', about_project: 'O projekcie', info_text_1: '🚀 Rozpoczęty <strong>20 Lis 2025 r.</strong>', info_text_2: '📈 Projekt rośnie!', info_text_3: '🎮 Nadchodzą nowe gry.', info_text_4: '💜 Dziękujemy za grę!', close_settings: 'Zamknij', help: 'Pomoc', contact_support: 'Wsparcie'
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
    } else if (gameType === 'tetris') {
        App.showScreen('tetris-game');
        if (typeof Tetris !== 'undefined') Tetris.start();
    } else if (gameType === 'memory') {
        App.showScreen('memory-game');
        if (typeof MemoryGame !== 'undefined') MemoryGame.start();
    } else if (gameType === 'sudoku') {
        App.showScreen('sudoku-game');
        if (typeof Sudoku !== 'undefined') Sudoku.start();
    }
}

function goBackToLobby() {
    App.goBack();
}

// ========== PROFILE & FRIENDS ==========

async function loadProfile() {
    if (!App.userId) return;

    // Set basic info visually first
    document.getElementById('profile-avatar').src = App.photoUrl || '/assets/default-avatar.png';
    document.getElementById('profile-name').textContent = App.userName;
    document.getElementById('profile-username').textContent = App.username ? `@${App.username}` : 'Без @username';

    try {
        const res = await fetch(`/api/user/${App.userId}`);
        const data = await res.json();

        if (data.user) {
            document.getElementById('profile-bio').value = data.user.bio || '';
        }

        if (data.stats) {
            let statsHtml = '';
            let totalGames = 0;
            data.stats.forEach(s => {
                totalGames += s.matches;
                statsHtml += `<div><b>${s.game}</b>: Игр ${s.matches}, Рекорд ${s.best_score}</div>`;
            });
            if (statsHtml === '') statsHtml = 'Вы еще не играли в игры.';
            else statsHtml = `<div><b>Всего игр:</b> ${totalGames}</div>` + statsHtml;

            document.getElementById('profile-stats').innerHTML = statsHtml;
        }

        // Load friends (default to 'list' tab)
        switchFriendsTab('list');

    } catch (e) {
        console.error('Failed to load profile', e);
    }
}

async function saveBio() {
    if (!App.userId) return;
    const bioText = document.getElementById('profile-bio').value;

    try {
        const res = await fetch('/api/user/bio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: App.userId, bio: bioText })
        });
        const data = await res.json();
        if (data.ok) {
            App.haptic('success');
            const btn = document.querySelector('#profile-screen .btn.small');
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Сохранено';
            setTimeout(() => btn.innerHTML = orig, 1500);
        }
    } catch (e) {
        console.error('Bio save error', e);
    }
}

let friendsData = { list: [], incoming: [], outgoing: [] };

async function loadFriends() {
    if (!App.userId) return;
    try {
        const res = await fetch(`/api/friends/${App.userId}`);
        const data = await res.json();

        friendsData.list = data.friends || [];
        friendsData.incoming = data.incoming || [];
        friendsData.outgoing = data.outgoing || [];

        // Update badge
        const badge = document.getElementById('inc-count');
        if (friendsData.incoming.length > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = friendsData.incoming.length;
        } else {
            badge.style.display = 'none';
        }

        // Re-render current tab
        const activeTab = document.querySelector('.friends-tabs .active').id.replace('ftab-', '');
        renderFriendsList(activeTab);
    } catch (e) {
        console.error('Friends load error', e);
    }
}

function switchFriendsTab(tab) {
    document.querySelectorAll('.friends-tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById(`ftab-${tab}`).classList.add('active');

    if (friendsData.list.length === 0 && friendsData.incoming.length === 0 && friendsData.outgoing.length === 0) {
        // First load
        loadFriends();
    } else {
        renderFriendsList(tab);
    }
}

function renderFriendsList(tab) {
    const container = document.getElementById('friends-list');
    let list = friendsData[tab] || [];

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">Список пуст</p>`;
        return;
    }

    let html = '';
    list.forEach(u => {
        let actionBtn = '';
        if (tab === 'list') {
            actionBtn = `<button class="btn small" style="background:var(--danger);" onclick="removeFriend('${u.telegram_id}')">Удалить</button>`;
        } else if (tab === 'incoming') {
            actionBtn = `
                <button class="btn small" style="background:var(--success);" onclick="acceptFriend(${u.request_id}, true)">✔️</button>
                <button class="btn small" style="background:var(--danger);" onclick="acceptFriend(${u.request_id}, false)">✖️</button>
            `;
        } else if (tab === 'outgoing') {
            actionBtn = `<span style="font-size:0.8rem; color:var(--text-secondary);">Ожидает</span>`;
        }

        const avatar = u.photo_url || '/assets/default-avatar.png';
        html += `
            <div class="friend-item">
                <img class="friend-avatar" src="${avatar}" alt="👤" onerror="this.src=''">
                <div class="friend-info">
                    <div class="friend-name">${u.first_name}</div>
                    <div class="friend-username">${u.username ? '@' + u.username : ''}</div>
                </div>
                <div class="friend-actions">
                    ${actionBtn}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddFriendModal() {
    document.getElementById('add-friend-modal').classList.remove('hidden');
    document.getElementById('add-friend-input').value = '';
    document.getElementById('add-friend-input').focus();
}

function hideAddFriendModal() {
    document.getElementById('add-friend-modal').classList.add('hidden');
}

async function sendFriendRequest() {
    const targetUsername = document.getElementById('add-friend-input').value.trim();
    if (!targetUsername) return;

    try {
        const res = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromId: App.userId, targetUsername })
        });
        const data = await res.json();

        hideAddFriendModal();
        if (data.ok) {
            App.haptic('success');
            // Allow alert for feedback
            if (App.tg) App.tg.showAlert('Заявка успешно отправлена!');
            loadFriends();
        } else {
            App.haptic('error');
            if (App.tg) App.tg.showAlert(data.error || 'Ошибка отправки заявки');
        }
    } catch (e) {
        console.error(e);
    }
}

async function acceptFriend(requestId, accept) {
    try {
        await fetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, accept })
        });
        loadFriends(); // Reload full list
    } catch (e) { console.error(e); }
}

async function removeFriend(targetId) {
    if (!confirm('Точно удалить из друзей?')) return;
    try {
        await fetch('/api/friends/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: App.userId, user2: targetId })
        });
        loadFriends(); // Reload full list
    } catch (e) { console.error(e); }
}
