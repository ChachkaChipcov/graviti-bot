// UNO Card Game (Beta)
const UNO = {
    room: null,
    playerCount: 2,

    // UNO Colors
    colors: ['red', 'green', 'blue', 'yellow'],

    // Card types
    numbers: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    actions: ['skip', 'reverse', 'draw2'],
    wilds: ['wild', 'wild4'],

    // Game state
    hand: [],
    currentCard: null,
    direction: 1, // 1 = clockwise, -1 = counter-clockwise
    currentPlayer: null,
    players: [],
    isMyTurn: false,
    mustCallUno: false,

    init(room) {
        this.room = room;
        this.hand = [];
        this.currentCard = null;
        this.renderHand();
        this.updateStatus('Ожидание игроков...');
    },

    // Create full UNO deck (108 cards)
    createDeck() {
        const deck = [];
        let id = 0;

        for (const color of this.colors) {
            // One 0 per color
            deck.push({ color, value: '0', id: id++ });

            // Two of each 1-9 per color
            for (const num of this.numbers.slice(1)) {
                deck.push({ color, value: num, id: id++ });
                deck.push({ color, value: num, id: id++ });
            }

            // Two of each action per color
            for (const action of this.actions) {
                deck.push({ color, value: action, id: id++ });
                deck.push({ color, value: action, id: id++ });
            }
        }

        // 4 Wild cards
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'wild', id: id++ });
            deck.push({ color: 'wild', value: 'wild4', id: id++ });
        }

        return deck;
    },

    // Check if card can be played
    canPlay(card) {
        if (!this.currentCard) return true;
        if (card.color === 'wild') return true;
        if (card.color === this.currentCard.color) return true;
        if (card.value === this.currentCard.value) return true;
        return false;
    },

    renderHand() {
        const handEl = document.getElementById('uno-hand');
        if (!handEl) return;

        handEl.innerHTML = this.hand.map((card, index) => `
            <div class="uno-card ${card.color} ${this.canPlay(card) && this.isMyTurn ? 'playable' : ''}" 
                 data-index="${index}"
                 onclick="UNO.playCard(${index})">
                <span>${this.getDisplayValue(card)}</span>
            </div>
        `).join('');
    },

    getDisplayValue(card) {
        const symbols = {
            'skip': '🚫',
            'reverse': '🔄',
            'draw2': '+2',
            'wild': '🌈',
            'wild4': '+4'
        };
        return symbols[card.value] || card.value;
    },

    playCard(index) {
        const card = this.hand[index];
        if (!card || !this.isMyTurn || !this.canPlay(card)) {
            App.haptic('heavy');
            return;
        }

        App.haptic('medium');

        // If it's a wild card, show color picker
        if (card.color === 'wild') {
            this.showColorPicker(card);
            return;
        }

        Multiplayer.socket.emit('uno_play', {
            odId: App.userId,
            card: card
        });
    },

    showColorPicker(card) {
        // Create color picker overlay
        const overlay = document.createElement('div');
        overlay.className = 'color-picker-overlay';
        overlay.innerHTML = `
            <div class="color-picker">
                <h3>Выберите цвет:</h3>
                <div class="color-options">
                    <button class="color-option red" onclick="UNO.selectColor('red')">🔴</button>
                    <button class="color-option green" onclick="UNO.selectColor('green')">🟢</button>
                    <button class="color-option blue" onclick="UNO.selectColor('blue')">🔵</button>
                    <button class="color-option yellow" onclick="UNO.selectColor('yellow')">🟡</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.pendingWildCard = card;
    },

    selectColor(color) {
        const overlay = document.querySelector('.color-picker-overlay');
        if (overlay) overlay.remove();

        if (this.pendingWildCard) {
            Multiplayer.socket.emit('uno_play', {
                odId: App.userId,
                card: this.pendingWildCard,
                chosenColor: color
            });
            this.pendingWildCard = null;
        }
    },

    updateStatus(text) {
        // Update UI
    },

    handleGameStart(data) {
        this.hand = data.hand || [];
        this.currentCard = data.currentCard;
        this.players = data.players || [];
        this.renderHand();
        this.updateCurrentCard();
    },

    updateCurrentCard() {
        const pileEl = document.getElementById('uno-pile');
        if (pileEl && this.currentCard) {
            pileEl.innerHTML = `
                <div class="uno-card ${this.currentCard.color}">
                    <span>${this.getDisplayValue(this.currentCard)}</span>
                </div>
            `;
        }
    },

    handleTurnUpdate(data) {
        this.isMyTurn = data.currentPlayer === App.userId;
        this.currentCard = data.currentCard || this.currentCard;
        this.direction = data.direction || this.direction;

        this.renderHand();
        this.updateCurrentCard();

        // Update direction indicator
        const dirEl = document.getElementById('uno-direction');
        if (dirEl) {
            dirEl.textContent = this.direction === 1 ? '➡️' : '⬅️';
        }

        // Check if player needs to call UNO
        if (this.hand.length === 1 && !this.mustCallUno) {
            this.mustCallUno = true;
            document.getElementById('uno-call')?.classList.remove('hidden');
        }
    },

    handleGameOver(data) {
        const isWinner = data.winner === App.userId;
        App.showVictory(isWinner);
    }
};

// Global functions
let unoSettings = { playerCount: 2 };

function selectUnoPlayerCount(count) {
    unoSettings.playerCount = count;
    document.querySelectorAll('#uno-setup .player-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.count) === count);
    });
    App.haptic('light');
}

function createUnoRoom() {
    Multiplayer.socket.emit('create_room', {
        gameType: 'uno',
        odId: App.userId,
        userName: App.userName,
        settings: { maxPlayers: unoSettings.playerCount }
    });
}

function unoDraw() {
    if (!UNO.isMyTurn) return;
    Multiplayer.socket.emit('uno_draw', { odId: App.userId });
    App.haptic('medium');
}

function unoCall() {
    if (UNO.hand.length === 1) {
        Multiplayer.socket.emit('uno_call', { odId: App.userId });
        document.getElementById('uno-call')?.classList.add('hidden');
        App.haptic('heavy');
    }
}
