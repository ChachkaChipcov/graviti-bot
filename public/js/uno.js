// UNO Card Game (Redesigned)
const UNO = {
    room: null,
    playerCount: 2,

    // UNO Colors with gradients
    colorStyles: {
        red: { bg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', text: '#fff' },
        green: { bg: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)', text: '#fff' },
        blue: { bg: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', text: '#fff' },
        yellow: { bg: 'linear-gradient(135deg, #f1c40f 0%, #d4ac0d 100%)', text: '#333' },
        wild: { bg: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)', text: '#fff' }
    },

    // Card symbols
    symbols: {
        'skip': '🚫',
        'reverse': '🔄',
        'draw2': '+2',
        'wild': '🌈',
        'wild4': '+4'
    },

    // Game state
    hand: [],
    currentCard: null,
    chosenColor: null,
    direction: 1,
    currentPlayer: null,
    players: [],
    isMyTurn: false,
    deckCount: 0,
    unoCalled: false,

    init(room) {
        this.room = room;
        this.hand = [];
        this.currentCard = null;
        this.renderHand();
        this.updateUI();
    },

    canPlay(card) {
        if (!this.currentCard || !this.isMyTurn) return false;
        if (card.color === 'wild') return true;
        const matchColor = this.chosenColor || this.currentCard.color;
        if (card.color === matchColor) return true;
        if (card.value === this.currentCard.value) return true;
        return false;
    },

    renderHand() {
        const handEl = document.getElementById('uno-hand');
        if (!handEl) return;

        handEl.innerHTML = this.hand.map((card, index) => {
            const playable = this.canPlay(card);
            const style = this.colorStyles[card.color] || this.colorStyles.wild;
            const isWild = card.color === 'wild';
            const displayVal = this.getDisplayValue(card);

            return `
                <div class="u-card ${playable ? 'playable' : ''}" 
                     data-index="${index}"
                     draggable="true"
                     style="--bg: ${style.bg}; --text: ${style.text}"
                     onclick="UNO.playCard(${index})"
                     ontouchstart="startDrag(event, ${index}, 'uno')"
                     ontouchmove="onDrag(event)"
                     ontouchend="endDrag(event, 'uno')">
                    <div class="u-card-inner ${isWild ? 'wild-card' : ''}">
                        <span class="u-card-tl">${displayVal}</span>
                        <div class="u-card-oval">
                            <span class="u-card-value">${displayVal}</span>
                        </div>
                        <span class="u-card-br">${displayVal}</span>
                        ${isWild ? '<div class="u-card-wild-colors"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    getDisplayValue(card) {
        return this.symbols[card.value] || card.value;
    },

    playCard(index) {
        const card = this.hand[index];
        if (!card || !this.isMyTurn || !this.canPlay(card)) {
            App.haptic('heavy');
            return;
        }

        App.haptic('medium');

        if (card.color === 'wild') {
            this.showColorPicker(card);
            return;
        }

        Multiplayer.socket.emit('uno_play_card', {
            odId: App.userId,
            card: card
        });
    },

    showColorPicker(card) {
        const overlay = document.createElement('div');
        overlay.className = 'u-color-overlay';
        overlay.innerHTML = `
            <div class="u-color-picker">
                <h3>Выберите цвет:</h3>
                <div class="u-color-options">
                    <button class="u-color-btn" style="background: ${this.colorStyles.red.bg}" onclick="UNO.selectColor('red')">
                        <span>🔴</span>
                    </button>
                    <button class="u-color-btn" style="background: ${this.colorStyles.green.bg}" onclick="UNO.selectColor('green')">
                        <span>🟢</span>
                    </button>
                    <button class="u-color-btn" style="background: ${this.colorStyles.blue.bg}" onclick="UNO.selectColor('blue')">
                        <span>🔵</span>
                    </button>
                    <button class="u-color-btn" style="background: ${this.colorStyles.yellow.bg}" onclick="UNO.selectColor('yellow')">
                        <span>🟡</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.pendingWildCard = card;
    },

    selectColor(color) {
        const overlay = document.querySelector('.u-color-overlay');
        if (overlay) overlay.remove();

        if (this.pendingWildCard) {
            Multiplayer.socket.emit('uno_play_card', {
                odId: App.userId,
                card: this.pendingWildCard,
                chosenColor: color
            });
            this.pendingWildCard = null;
        }
    },

    updateUI() {
        this.updateCurrentCard();
        this.updatePlayers();
        this.updateDirection();
        this.updateActions();
        this.updateStatus();
    },

    updateStatus() {
        const statusEl = document.getElementById('uno-status');
        if (!statusEl) return;

        // Find current player name
        const currentPlayerObj = this.players.find(p => p.odId === this.currentPlayer);
        const currentName = currentPlayerObj ? (currentPlayerObj.odId === App.userId ? 'Вы' : currentPlayerObj.name) : '';

        let statusText = '';
        let statusClass = '';

        if (this.isMyTurn) {
            if (this.hand.length === 2 && !this.unoCalled) {
                statusText = '⚠️ 2 карты! Нажмите UNO!';
                statusClass = 'warning';
            } else if (this.hand.some(c => this.canPlay(c))) {
                statusText = '🎯 Ваш ход! Выберите карту';
                statusClass = 'your-turn';
            } else {
                statusText = '📥 Нет подходящих карт - возьмите';
                statusClass = 'draw';
            }
        } else {
            statusText = `⏳ Ход: ${currentName}`;
            statusClass = 'waiting';
        }

        statusEl.innerHTML = `<span class="status-${statusClass}">${statusText}</span>`;
    },

    updateCurrentCard() {
        const pileEl = document.getElementById('uno-pile');
        if (!pileEl || !this.currentCard) return;

        const displayColor = this.chosenColor || this.currentCard.color;
        const style = this.colorStyles[displayColor] || this.colorStyles.wild;

        pileEl.innerHTML = `
            <div class="u-pile-card" style="background: ${style.bg}; color: ${style.text}">
                <span class="u-pile-value">${this.getDisplayValue(this.currentCard)}</span>
            </div>
        `;
    },

    updatePlayers() {
        const playersEl = document.getElementById('uno-players');
        if (!playersEl) return;

        playersEl.innerHTML = this.players.map(p => {
            const isMe = p.odId === App.userId;
            const isCurrent = p.odId === this.currentPlayer;
            return `
                <div class="u-player ${isCurrent ? 'active' : ''} ${isMe ? 'me' : ''}">
                    <span class="u-player-name">${isMe ? 'Вы' : p.name}</span>
                    <span class="u-player-cards">🎴 ${p.cardCount}</span>
                </div>
            `;
        }).join('');
    },

    updateDirection() {
        const dirEl = document.getElementById('uno-direction');
        if (dirEl) {
            dirEl.innerHTML = `<span class="u-dir-icon">${this.direction === 1 ? '➡️' : '⬅️'}</span>`;
        }
    },

    updateActions() {
        const actionsEl = document.getElementById('uno-actions');
        if (!actionsEl) return;

        // Show UNO button only if 2 cards, my turn, and not already called
        const showUno = this.hand.length === 2 && this.isMyTurn && !this.unoCalled;

        actionsEl.innerHTML = `
            <button class="btn secondary u-draw-btn" onclick="unoDraw()" ${!this.isMyTurn ? 'disabled' : ''}>
                📥 Взять карту
            </button>
            ${showUno ? `
                <button class="btn primary u-uno-btn" onclick="unoCall()">
                    🔥 UNO!
                </button>
            ` : ''}
        `;
    },

    handleGameStart(data) {
        this.hand = data.hand || [];
        this.currentCard = data.currentCard;
        this.players = data.players || [];
        this.currentPlayer = data.currentPlayer;
        this.direction = data.direction || 1;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.chosenColor = null;

        this.renderHand();
        this.updateUI();
    },

    handleTurnUpdate(data) {
        this.currentCard = data.currentCard || this.currentCard;
        this.chosenColor = data.chosenColor || null;
        this.currentPlayer = data.currentPlayer;
        this.direction = data.direction || this.direction;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.deckCount = data.deckCount || 0;

        if (data.hand) {
            this.hand = data.hand;
        }
        if (data.players) {
            this.players = data.players;
        }

        this.renderHand();
        this.updateUI();
    },

    handleGameOver(data) {
        const isWinner = data.winner === App.userId;

        const gameEl = document.getElementById('uno-game');
        if (gameEl) {
            const overlay = document.createElement('div');
            overlay.className = 'game-over-overlay';
            overlay.innerHTML = `
                <div class="game-over-modal">
                    <h2>${isWinner ? '🎉 Победа!' : '😔 Поражение'}</h2>
                    <p>${isWinner ? 'Вы выиграли UNO!' : (data.winnerName || 'Противник') + ' победил!'}</p>
                    <div class="game-over-buttons">
                        <button class="btn primary" onclick="playAgain()">🔄 Играть снова</button>
                        <button class="btn secondary" onclick="exitToMenu()">🏠 В меню</button>
                    </div>
                </div>
            `;
            gameEl.appendChild(overlay);
        }

        App.showVictory(isWinner);
    }
};

// Global functions
let unoSettings = { playerCount: 2 };

function selectUnoPlayerCount(count) {
    unoSettings.playerCount = count;
    document.querySelectorAll('#uno-setup .player-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`#uno-setup .player-btn[data-count="${count}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');
    App.haptic('light');
}

function createUnoRoom() {
    App.currentGame = 'uno';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🎴 UNO';

    Multiplayer.createRoom('uno', {
        maxPlayers: unoSettings.playerCount
    });
}

function unoDraw() {
    if (!UNO.isMyTurn) return;
    Multiplayer.socket.emit('uno_draw', { odId: App.userId });
    App.haptic('medium');
}

function unoCall() {
    if (UNO.hand.length <= 2 && !UNO.unoCalled) {
        UNO.unoCalled = true;
        Multiplayer.socket.emit('uno_call', { odId: App.userId });
        UNO.updateUI(); // Hide the UNO button
        App.haptic('heavy');
    }
}
