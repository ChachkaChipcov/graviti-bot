// Durak Card Game (Redesigned)
const Durak = {
    room: null,
    mode: 'podkidnoy',
    playerCount: 2,

    // Card deck (36 cards: 6-A in 4 suits)
    suits: ['♠', '♥', '♦', '♣'],
    suitColors: { '♠': '#1a1a2e', '♥': '#e74c3c', '♦': '#e74c3c', '♣': '#1a1a2e' },
    values: ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    valueOrder: { '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 },

    // Game state
    trump: null,
    trumpSuit: null,
    deckCount: 0,
    hand: [],
    table: [],
    isAttacker: false,
    isDefender: false,
    gamePhase: 'waiting',
    players: [],

    init(room) {
        this.room = room;
        this.hand = [];
        this.table = [];
        this.gamePhase = 'waiting';
        this.renderHand();
        this.renderTable();
        this.updateStatus('Ожидание игроков...');
    },

    renderHand() {
        const handEl = document.getElementById('durak-hand');
        if (!handEl) return;

        const cardWidth = Math.min(70, (window.innerWidth - 40) / Math.max(this.hand.length, 6));
        const overlap = Math.max(-30, -cardWidth * 0.4);

        handEl.innerHTML = this.hand.map((card, index) => {
            const isRed = card.suit === '♥' || card.suit === '♦';
            const playable = this.isCardPlayable(card);
            const rotation = (index - this.hand.length / 2) * 3;
            const lift = playable ? 10 : 0;

            return `
                <div class="d-card ${playable ? 'playable' : ''}" 
                     data-index="${index}"
                     style="--rotation: ${rotation}deg; --lift: ${lift}px; margin-left: ${index > 0 ? overlap : 0}px"
                     onclick="Durak.playCard(${index})">
                    <div class="d-card-inner ${isRed ? 'red' : 'black'}">
                        <span class="d-card-corner top">
                            <span class="d-card-value">${card.value}</span>
                            <span class="d-card-suit">${card.suit}</span>
                        </span>
                        <span class="d-card-big-suit">${card.suit}</span>
                        <span class="d-card-corner bottom">
                            <span class="d-card-value">${card.value}</span>
                            <span class="d-card-suit">${card.suit}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderTable() {
        const tableEl = document.getElementById('durak-table');
        if (!tableEl) return;

        if (this.table.length === 0) {
            tableEl.innerHTML = '<div class="d-table-empty">Карты на столе</div>';
            return;
        }

        tableEl.innerHTML = this.table.map((pair, index) => {
            const attackCard = this.renderTableCard(pair.attack, 'attack');
            const defenseCard = pair.defense ? this.renderTableCard(pair.defense, 'defense') : '';

            return `
                <div class="d-pair">
                    ${attackCard}
                    ${defenseCard}
                </div>
            `;
        }).join('');
    },

    renderTableCard(card, type) {
        const isRed = card.suit === '♥' || card.suit === '♦';
        return `
            <div class="d-table-card ${type} ${isRed ? 'red' : 'black'}">
                <span class="d-tc-value">${card.value}</span>
                <span class="d-tc-suit">${card.suit}</span>
            </div>
        `;
    },

    isCardPlayable(card) {
        if (this.gamePhase === 'attack' && this.isAttacker) {
            if (this.table.length === 0) return true;
            const tableValues = new Set();
            this.table.forEach(pair => {
                tableValues.add(pair.attack.value);
                if (pair.defense) tableValues.add(pair.defense.value);
            });
            return tableValues.has(card.value);
        }

        if (this.gamePhase === 'defense' && this.isDefender) {
            const undefended = this.table.find(p => !p.defense);
            if (undefended) {
                return this.canBeat(undefended.attack, card);
            }
        }
        return false;
    },

    canBeat(attackCard, defenseCard) {
        if (attackCard.suit === defenseCard.suit) {
            return this.valueOrder[defenseCard.value] > this.valueOrder[attackCard.value];
        }
        if (defenseCard.suit === this.trumpSuit && attackCard.suit !== this.trumpSuit) {
            return true;
        }
        return false;
    },

    playCard(index) {
        const card = this.hand[index];
        if (!card || !this.isCardPlayable(card)) {
            App.haptic('heavy');
            return;
        }

        App.haptic('medium');

        if (this.isAttacker && this.gamePhase === 'attack') {
            Multiplayer.socket.emit('durak_attack', {
                odId: App.userId,
                card: card
            });
        } else if (this.isDefender && this.gamePhase === 'defense') {
            const undefendedIndex = this.table.findIndex(p => !p.defense);
            Multiplayer.socket.emit('durak_defend', {
                odId: App.userId,
                card: card,
                pairIndex: undefendedIndex
            });
        }
    },

    updateStatus(text) {
        const statusEl = document.getElementById('durak-status');
        if (statusEl) statusEl.textContent = text;
    },

    updateTrump(card) {
        this.trump = card;
        this.trumpSuit = card.suit;

        const trumpEl = document.getElementById('durak-trump');
        if (trumpEl) {
            const isRed = card.suit === '♥' || card.suit === '♦';
            trumpEl.innerHTML = `
                <span class="d-trump-label">Козырь:</span>
                <span class="d-trump-card ${isRed ? 'red' : 'black'}">${card.value}${card.suit}</span>
            `;
        }
    },

    updateDeckCount(count) {
        this.deckCount = count;
        const deckEl = document.getElementById('durak-deck');
        if (deckEl) {
            deckEl.innerHTML = `<span class="d-deck-icon">🎴</span><span class="d-deck-count">${count}</span>`;
        }
    },

    updateActionButtons() {
        const takeBtn = document.getElementById('durak-take');
        const passBtn = document.getElementById('durak-pass');

        if (takeBtn) {
            takeBtn.style.display = this.isDefender && this.gamePhase === 'defense' && this.table.length > 0 ? 'inline-flex' : 'none';
        }
        if (passBtn) {
            passBtn.style.display = this.isAttacker && this.table.length > 0 &&
                this.table.every(p => p.defense) ? 'inline-flex' : 'none';
        }
    },

    // Event handlers
    handleGameStart(data) {
        this.hand = data.hand || [];
        this.trump = data.trump;
        this.trumpSuit = data.trump?.suit;
        this.players = data.players || [];
        this.mode = data.mode || 'podkidnoy';
        this.deckCount = data.deckCount || 0;
        this.isAttacker = data.isAttacker;
        this.isDefender = data.isDefender;
        this.gamePhase = data.isAttacker ? 'attack' : 'defense';
        this.table = [];

        this.updateTrump(this.trump);
        this.updateDeckCount(this.deckCount);
        this.renderHand();
        this.renderTable();
        this.updateActionButtons();
        this.updateStatus(this.isAttacker ? '⚔️ Ваша атака!' : '🛡️ Защищайтесь!');
    },

    handleTurnUpdate(data) {
        this.isAttacker = data.attacker === App.userId;
        this.isDefender = data.defender === App.userId;
        this.gamePhase = data.phase;
        this.table = data.table || [];
        this.deckCount = data.deckCount;

        if (data.hand) {
            this.hand = data.hand;
        }

        this.updateDeckCount(this.deckCount);
        this.renderTable();
        this.renderHand();
        this.updateActionButtons();

        if (this.isAttacker && this.gamePhase === 'attack') {
            this.updateStatus('⚔️ Ваша атака!');
        } else if (this.isDefender && this.gamePhase === 'defense') {
            this.updateStatus('🛡️ Защищайтесь!');
        } else {
            this.updateStatus('⏳ Ход противника...');
        }
    },

    handleCardPlayed(data) {
        if (data.playerId === App.userId) {
            this.hand = this.hand.filter(c => c.id !== data.card.id);
        }
        this.table = data.table || this.table;
        this.renderTable();
        this.renderHand();
    },

    handleRoundEnd(data) {
        this.table = [];
        if (data.hand) {
            this.hand = data.hand;
        }
        this.deckCount = data.deckCount;

        this.updateDeckCount(this.deckCount);
        this.renderTable();
        this.renderHand();

        if (data.message) {
            this.updateStatus(data.message);
        }
    },

    handleGameOver(data) {
        const isLoser = data.loser === App.userId;

        const gameEl = document.getElementById('durak-game');
        if (gameEl) {
            const overlay = document.createElement('div');
            overlay.className = 'd-result-overlay';
            overlay.innerHTML = `
                <div class="d-result">
                    <h2>${isLoser ? '😅 Вы Дурак!' : '🎉 Победа!'}</h2>
                    <p>${isLoser ? 'Вы остались с картами' : (data.loserName || 'Противник') + ' - Дурак!'}</p>
                    <button class="btn primary" onclick="App.goBack()">🔙 В меню</button>
                </div>
            `;
            gameEl.appendChild(overlay);
        }

        App.showVictory(!isLoser);
    }
};

// Global functions
let durakSettings = {
    mode: 'podkidnoy',
    playerCount: 2
};

function selectDurakMode(mode) {
    durakSettings.mode = mode;
    document.querySelectorAll('#durak-setup .mode-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`#durak-setup .mode-btn[data-mode="${mode}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');
    App.haptic('light');
}

function selectPlayerCount(count) {
    durakSettings.playerCount = count;
    document.querySelectorAll('#durak-setup .player-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`#durak-setup .player-btn[data-count="${count}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');
    App.haptic('light');
}

function createDurakRoom() {
    Durak.mode = durakSettings.mode;
    Durak.playerCount = durakSettings.playerCount;

    App.currentGame = 'durak';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🃏 Дурак';

    Multiplayer.createRoom('durak', {
        mode: durakSettings.mode,
        maxPlayers: durakSettings.playerCount
    });
}

function durakTake() {
    if (!Durak.isDefender) return;
    Multiplayer.socket.emit('durak_take', { odId: App.userId });
    App.haptic('medium');
}

function durakPass() {
    if (!Durak.isAttacker) return;
    Multiplayer.socket.emit('durak_pass', { odId: App.userId });
    App.haptic('medium');
}
