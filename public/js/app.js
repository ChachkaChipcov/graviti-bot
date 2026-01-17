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


    showWaiting(roomId) {
        this.roomId = roomId;
        document.querySelector('.room-actions').classList.add('hidden');
        document.getElementById('waiting-view').classList.remove('hidden');
        document.getElementById('join-view').classList.add('hidden');

        // Display room code
        const roomCodeText = document.getElementById('room-code-text');
        if (roomCodeText) {
            roomCodeText.textContent = roomId.toUpperCase();
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

        const botUsername = 'modulletgbot'; // Actual bot username
        const inviteText = encodeURIComponent(`🎮 Давай сыграем! Присоединяйся к игре:`);
        const inviteUrl = encodeURIComponent(`https://t.me/${botUsername}?start=join_${this.roomId}`);
        const shareUrl = `https://t.me/share/url?url=${inviteUrl}&text=${inviteText}`;

        if (this.tg && this.tg.openTelegramLink) {
            // This method works in almost all Telegram versions
            this.tg.openTelegramLink(shareUrl);
        } else if (this.tg && this.tg.openLink) {
            // Alternative method
            this.tg.openLink(shareUrl);
        } else {
            // Fallback for regular browser
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

function joinRoom() {
    const input = document.getElementById('room-code-input');
    const code = input.value.trim().toUpperCase();

    if (code.length < 6) {
        input.style.borderColor = '#ff6b6b';
        input.placeholder = 'Введите код (мин. 6 символов)';
        setTimeout(() => {
            input.style.borderColor = '';
            input.placeholder = 'XXXXXXXX';
        }, 2000);
        return;
    }

    Multiplayer.joinRoom(code);
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
