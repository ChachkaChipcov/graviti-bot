// Durak Card Game
const Durak = {
    room: null,
    mode: 'podkidnoy', // 'podkidnoy', 'perevodnoy', 'combined'
    playerCount: 2,

    // Card deck (36 cards: 6-A in 4 suits)
    suits: ['♠', '♥', '♦', '♣'],
    suitNames: { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' },
    values: ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    valueOrder: { '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 },

    // Game state
    trump: null,
    trumpSuit: null,
    deck: [],
    hand: [],
    table: [], // [{attack: card, defense: card|null}, ...]
    isAttacker: false,
    isDefender: false,
    canTransfer: false,
    gamePhase: 'waiting', // 'waiting', 'attack', 'defense', 'picking'
    players: [],
    currentDefender: null,

    init(room) {
        this.room = room;
        this.hand = [];
        this.table = [];
        this.gamePhase = 'waiting';

        // Reset UI
        this.renderHand();
        this.renderTable();
        this.updateStatus('Ожидание игроков...');
    },

    // Create a full deck of 36 cards
    createDeck() {
        const deck = [];
        for (const suit of this.suits) {
            for (const value of this.values) {
                deck.push({ suit, value, id: `${value}${suit}` });
            }
        }
        return deck;
    },

    // Shuffle deck
    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    // Compare cards (can card2 beat card1?)
    canBeat(attackCard, defenseCard) {
        // Same suit - compare values
        if (attackCard.suit === defenseCard.suit) {
            return this.valueOrder[defenseCard.value] > this.valueOrder[attackCard.value];
        }
        // Trump beats non-trump
        if (defenseCard.suit === this.trumpSuit && attackCard.suit !== this.trumpSuit) {
            return true;
        }
        return false;
    },

    // Check if card can be transferred (perevodnoy mode)
    canTransferCard(card) {
        if (this.mode !== 'perevodnoy' && this.mode !== 'combined') return false;
        if (this.players.length < 3) return false; // Need 3+ players for transfer
        if (this.table.length === 0) return false;

        // Can transfer if card has same value as attack card
        const attackValue = this.table[0].attack.value;
        return card.value === attackValue;
    },

    // Render player's hand
    renderHand() {
        const handEl = document.getElementById('durak-hand');
        if (!handEl) return;

        handEl.innerHTML = this.hand.map((card, index) => `
            <div class="durak-card ${this.suitNames[card.suit]} ${this.isCardPlayable(card) ? 'playable' : ''}" 
                 data-index="${index}"
                 onclick="Durak.playCard(${index})">
                <span class="card-value">${card.value}</span>
                <span class="card-suit">${card.suit}</span>
            </div>
        `).join('');
    },

    // Check if card can be played
    isCardPlayable(card) {
        if (this.gamePhase === 'attack' && this.isAttacker) {
            // Can attack with any card if table empty, or matching value
            if (this.table.length === 0) return true;
            const tableValues = new Set();
            this.table.forEach(pair => {
                tableValues.add(pair.attack.value);
                if (pair.defense) tableValues.add(pair.defense.value);
            });
            return tableValues.has(card.value);
        }

        if (this.gamePhase === 'defense' && this.isDefender) {
            // Can defend with a card that beats the undefended attack
            const undefended = this.table.find(p => !p.defense);
            if (undefended) {
                return this.canBeat(undefended.attack, card);
            }
        }

        return false;
    },

    // Play a card from hand
    playCard(index) {
        const card = this.hand[index];
        if (!card || !this.isCardPlayable(card)) {
            App.haptic('heavy');
            return;
        }

        App.haptic('medium');

        if (this.isAttacker && this.gamePhase === 'attack') {
            // Send attack
            Multiplayer.socket.emit('durak_attack', {
                odId: App.userId,
                card: card
            });
        } else if (this.isDefender && this.gamePhase === 'defense') {
            // Send defense
            const undefendedIndex = this.table.findIndex(p => !p.defense);
            Multiplayer.socket.emit('durak_defend', {
                odId: App.userId,
                card: card,
                pairIndex: undefendedIndex
            });
        }
    },

    // Render table (attack and defense cards)
    renderTable() {
        const tableEl = document.getElementById('durak-table');
        if (!tableEl) return;

        tableEl.innerHTML = this.table.map((pair, index) => `
            <div class="durak-pair">
                <div class="durak-card attack ${this.suitNames[pair.attack.suit]}">
                    <span class="card-value">${pair.attack.value}</span>
                    <span class="card-suit">${pair.attack.suit}</span>
                </div>
                ${pair.defense ? `
                    <div class="durak-card defense ${this.suitNames[pair.defense.suit]}">
                        <span class="card-value">${pair.defense.value}</span>
                        <span class="card-suit">${pair.defense.suit}</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    // Update game status
    updateStatus(text) {
        const statusEl = document.getElementById('durak-status');
        if (statusEl) statusEl.textContent = text;
    },

    // Update trump display
    updateTrump(card) {
        this.trump = card;
        this.trumpSuit = card.suit;

        const trumpEl = document.getElementById('durak-trump');
        if (trumpEl) {
            trumpEl.innerHTML = `<span class="${this.suitNames[card.suit]}">${card.value}${card.suit}</span>`;
        }
    },

    // Update deck count
    updateDeckCount(count) {
        const deckEl = document.getElementById('durak-deck');
        if (deckEl) deckEl.textContent = `📚 ${count}`;
    },

    // Handle incoming events from server
    handleGameStart(data) {
        this.hand = data.hand || [];
        this.trump = data.trump;
        this.trumpSuit = data.trump?.suit;
        this.players = data.players || [];
        this.mode = data.mode || 'podkidnoy';
        this.deck = data.deckCount || 0;

        this.updateTrump(this.trump);
        this.updateDeckCount(this.deck);
        this.renderHand();
        this.updateStatus('Игра началась!');
    },

    handleTurnUpdate(data) {
        this.isAttacker = data.attacker === App.userId;
        this.isDefender = data.defender === App.userId;
        this.currentDefender = data.defender;
        this.gamePhase = data.phase;
        this.table = data.table || [];

        this.renderTable();
        this.renderHand();

        // Update action buttons
        this.updateActionButtons();

        if (this.isAttacker && this.gamePhase === 'attack') {
            this.updateStatus('Ваш ход - атакуйте!');
        } else if (this.isDefender && this.gamePhase === 'defense') {
            this.updateStatus('Защищайтесь!');
        } else {
            this.updateStatus('Ход противника...');
        }
    },

    updateActionButtons() {
        const takeBtn = document.getElementById('durak-take');
        const passBtn = document.getElementById('durak-pass');
        const transferBtn = document.getElementById('durak-transfer');

        if (takeBtn) takeBtn.style.display = this.isDefender && this.gamePhase === 'defense' ? 'block' : 'none';
        if (passBtn) passBtn.style.display = this.isAttacker && this.table.length > 0 ? 'block' : 'none';

        // Transfer button (only in perevodnoy/combined mode with 3+ players)
        if (transferBtn) {
            const canTransfer = (this.mode === 'perevodnoy' || this.mode === 'combined')
                && this.isDefender
                && this.players.length >= 3
                && this.table.length > 0
                && this.table.every(p => !p.defense); // No cards defended yet
            transferBtn.style.display = canTransfer ? 'block' : 'none';
        }
    },

    handleCardPlayed(data) {
        // Remove card from hand if it's ours
        if (data.playerId === App.userId) {
            this.hand = this.hand.filter(c => c.id !== data.card.id);
        }

        this.table = data.table || this.table;
        this.renderTable();
        this.renderHand();
    },

    handleRoundEnd(data) {
        this.table = [];
        this.hand = data.hand || this.hand;
        this.deck = data.deckCount;

        this.updateDeckCount(this.deck);
        this.renderTable();
        this.renderHand();

        if (data.message) {
            this.updateStatus(data.message);
        }
    },

    handleGameOver(data) {
        const isLoser = data.loser === App.userId;

        // Show result
        const gameEl = document.getElementById('durak-game');
        if (gameEl) {
            const overlay = document.createElement('div');
            overlay.className = 'durak-result';
            overlay.innerHTML = `
                <h2>${isLoser ? '😅 Вы Дурак!' : '🎉 Победа!'}</h2>
                <p>${isLoser ? 'Вы остались с картами' : data.loserName + ' - Дурак!'}</p>
                <button class="btn primary" onclick="App.goBack()">🔙 В меню</button>
            `;
            gameEl.appendChild(overlay);
        }

        App.showVictory(!isLoser);
    }
};

// Global functions for setup screen
let durakSettings = {
    mode: 'podkidnoy',
    playerCount: 2
};

function selectDurakMode(mode) {
    durakSettings.mode = mode;
    // First remove selected from all buttons
    document.querySelectorAll('#durak-setup .mode-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    // Then add selected to the clicked button
    const selectedBtn = document.querySelector(`#durak-setup .mode-btn[data-mode="${mode}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    App.haptic('light');
}

function selectPlayerCount(count) {
    durakSettings.playerCount = count;
    // First remove selected from all buttons
    document.querySelectorAll('#durak-setup .player-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    // Then add selected to the clicked button
    const selectedBtn = document.querySelector(`#durak-setup .player-btn[data-count="${count}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    App.haptic('light');
}

function createDurakRoom() {
    Durak.mode = durakSettings.mode;
    Durak.playerCount = durakSettings.playerCount;

    // Set current game and switch to room screen
    App.currentGame = 'durak';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🃏 Дурак';

    // Create room with settings
    Multiplayer.createRoom('durak', {
        mode: durakSettings.mode,
        maxPlayers: durakSettings.playerCount
    });
}

// Action buttons
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

function durakTransfer() {
    if (!Durak.canTransfer) return;
    // Transfer requires selecting a matching card first
    Multiplayer.socket.emit('durak_transfer', { odId: App.userId });
    App.haptic('medium');
}
