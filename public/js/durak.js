// ================================================
// ДУРАК ОНЛАЙН - Premium Design
// Based on "Дурак Онлайн" video reference
// ================================================

const Durak = {
    room: null,
    mode: 'podkidnoy', // 'podkidnoy' or 'perevodnoy'
    playerCount: 2,

    // Card deck (36 cards: 6-A in 4 suits)
    suits: ['♠', '♥', '♦', '♣'],
    suitSymbols: { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' },
    suitColors: { '♠': '#1a1a2e', '♥': '#dc3545', '♦': '#dc3545', '♣': '#1a1a2e' },
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
    currentAttacker: null,
    currentDefender: null,
    isPlaying: false,

    // =========================================
    // INITIALIZATION
    // =========================================

    init(room) {
        this.room = room;
        this.hand = [];
        this.table = [];
        this.gamePhase = 'waiting';
        this.isPlaying = false;
        this.renderUI();
        this.updateStatus('Ожидание игроков...');
    },

    renderUI() {
        this.renderHand();
        this.renderTable();
        this.renderPlayers();
        this.renderDeck();
    },

    // =========================================
    // CARD RENDERING - Premium Design
    // =========================================

    renderCard(card, options = {}) {
        const { index = -1, playable = false, inHand = false, type = '' } = options;
        const isRed = card.suit === '♥' || card.suit === '♦';
        const colorClass = isRed ? 'red' : 'black';

        // Both click AND drag work on all devices
        const clickHandler = inHand && index >= 0 ? `onclick="Durak.playCard(${index})"` : '';
        const dragHandlers = inHand ? `
            ontouchstart="Durak.startCardDrag(event, ${index})"
            ontouchmove="Durak.onCardDrag(event)"
            ontouchend="Durak.endCardDrag(event)"
        ` : '';

        return `
            <div class="dk-card ${colorClass} ${playable ? 'playable' : ''} ${type}" 
                 data-index="${index}"
                 ${clickHandler}
                 ${dragHandlers}>
                <div class="dk-card-inner">
                    <div class="dk-card-corner top-left">
                        <span class="dk-card-value">${card.value}</span>
                        <span class="dk-card-suit">${card.suit}</span>
                    </div>
                    <div class="dk-card-center">
                        <span class="dk-card-suit-big">${card.suit}</span>
                    </div>
                    <div class="dk-card-corner bottom-right">
                        <span class="dk-card-value">${card.value}</span>
                        <span class="dk-card-suit">${card.suit}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderCardBack() {
        return `
            <div class="dk-card back">
                <div class="dk-card-back-pattern"></div>
            </div>
        `;
    },

    // =========================================
    // HAND RENDERING - Fan Layout
    // =========================================

    renderHand() {
        const handEl = document.getElementById('dk-hand');
        if (!handEl) return;

        if (this.hand.length === 0) {
            handEl.innerHTML = '<div class="dk-hand-empty">Нет карт</div>';
            return;
        }

        const cardCount = this.hand.length;
        const maxRotation = Math.min(cardCount * 3, 25); // Max fan angle
        const startRotation = -maxRotation / 2;

        let html = '';
        this.hand.forEach((card, index) => {
            const playable = this.isCardPlayable(card);
            const rotation = startRotation + (index / (cardCount - 1 || 1)) * maxRotation;
            const translateY = Math.abs(rotation) * 0.5; // Arc effect

            html += `
                <div class="dk-hand-card" style="
                    --card-index: ${index};
                    --card-rotation: ${rotation}deg;
                    --card-translate-y: ${translateY}px;
                    z-index: ${index + 10};
                ">
                    ${this.renderCard(card, { index, playable, inHand: true })}
                </div>
            `;
        });

        handEl.innerHTML = html;
    },

    // =========================================
    // TABLE RENDERING
    // =========================================

    renderTable() {
        const tableEl = document.getElementById('dk-table');
        if (!tableEl) return;

        if (this.table.length === 0) {
            tableEl.innerHTML = '<div class="dk-table-empty">Бросьте карту</div>';
            return;
        }

        let html = '';
        this.table.forEach((pair, index) => {
            const attackHtml = this.renderCard(pair.attack, { type: 'attack' });
            const defenseHtml = pair.defense ?
                this.renderCard(pair.defense, { type: 'defense' }) : '';

            html += `
                <div class="dk-pair" data-pair="${index}">
                    ${attackHtml}
                    ${defenseHtml}
                </div>
            `;
        });

        tableEl.innerHTML = html;
    },

    // =========================================
    // PLAYERS RENDERING - Circular Layout
    // =========================================

    renderPlayers() {
        const playersEl = document.getElementById('dk-players');
        if (!playersEl || this.players.length === 0) return;

        // Filter out self for opponent display
        const opponents = this.players.filter(p => p.odId !== App.userId);

        let html = '';
        opponents.forEach((player, index) => {
            const isAttacker = player.odId === this.currentAttacker;
            const isDefender = player.odId === this.currentDefender;
            const statusClass = isAttacker ? 'attacking' : (isDefender ? 'defending' : '');
            const cardCount = player.cardCount || 0;

            // Card backs for opponent
            const cardBacks = Array(Math.min(cardCount, 6)).fill(this.renderCardBack()).join('');

            html += `
                <div class="dk-opponent ${statusClass}" data-player="${player.odId}">
                    <div class="dk-opponent-avatar">
                        <span class="dk-avatar-icon">👤</span>
                        <span class="dk-avatar-name">${player.name?.slice(0, 8) || 'Игрок'}</span>
                    </div>
                    <div class="dk-opponent-cards">${cardBacks}</div>
                    <span class="dk-opponent-count">${cardCount}</span>
                </div>
            `;
        });

        playersEl.innerHTML = html;
    },

    // =========================================
    // DECK & TRUMP RENDERING
    // =========================================

    renderDeck() {
        const deckEl = document.getElementById('dk-deck-area');
        if (!deckEl) return;

        let trumpHtml = '';
        if (this.trump) {
            trumpHtml = `
                <div class="dk-trump-card">
                    ${this.renderCard(this.trump, { type: 'trump' })}
                </div>
            `;
        }

        const deckStackHtml = this.deckCount > 0 ? `
            <div class="dk-deck-stack">
                <div class="dk-card back"></div>
                ${this.deckCount > 1 ? '<div class="dk-card back offset-1"></div>' : ''}
                ${this.deckCount > 3 ? '<div class="dk-card back offset-2"></div>' : ''}
                <span class="dk-deck-count">${this.deckCount}</span>
            </div>
        ` : '<div class="dk-deck-empty">Колода пуста</div>';

        // Big trump suit indicator
        const trumpIndicator = this.trumpSuit ? `
            <div class="dk-trump-indicator ${this.trumpSuit === '♥' || this.trumpSuit === '♦' ? 'red' : 'black'}">
                ${this.trumpSuit}
            </div>
        ` : '';

        deckEl.innerHTML = `
            ${trumpHtml}
            ${deckStackHtml}
            ${trumpIndicator}
        `;
    },

    // =========================================
    // GAME LOGIC
    // =========================================

    isCardPlayable(card) {
        if (this.isPlaying) return false;

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

        // Transfer mode (perevodnoy)
        if (this.mode === 'perevodnoy' && this.gamePhase === 'defense' && this.isDefender) {
            if (this.table.length > 0 && !this.table.some(p => p.defense)) {
                const attackValue = this.table[0].attack.value;
                if (card.value === attackValue) return true;
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
        if (!card || !this.isCardPlayable(card) || this.isPlaying) {
            App.haptic && App.haptic('heavy');
            return;
        }

        this.isPlaying = true;
        App.haptic && App.haptic('medium');

        // Add animation class
        const cardEl = document.querySelector(`.dk-hand-card[style*="--card-index: ${index}"]`);
        if (cardEl) {
            cardEl.classList.add('playing');
        }

        setTimeout(() => {
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
        }, 150);
    },

    // =========================================
    // DRAG & DROP
    // =========================================

    draggedCard: null,
    dragStartPos: { x: 0, y: 0 },
    dragThreshold: 30, // Minimum drag distance to trigger play
    isDragging: false,

    startCardDrag(event, index) {
        if (!this.isCardPlayable(this.hand[index])) return;

        this.draggedCard = { index, element: event.target.closest('.dk-hand-card') };
        const touch = event.touches[0];
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };

        if (this.draggedCard.element) {
            this.draggedCard.element.classList.add('dragging');
        }
    },

    onCardDrag(event) {
        if (!this.draggedCard) return;
        event.preventDefault();

        const touch = event.touches[0];
        const dx = touch.clientX - this.dragStartPos.x;
        const dy = touch.clientY - this.dragStartPos.y;

        if (this.draggedCard.element) {
            this.draggedCard.element.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
        }
    },

    endCardDrag(event) {
        if (!this.draggedCard) return;
        event.preventDefault();

        const touch = event.changedTouches[0];
        const dy = touch.clientY - this.dragStartPos.y;

        // Play card if dragged UP (towards table) by at least 50px
        if (dy < -50) {
            this.playCard(this.draggedCard.index);
        }

        if (this.draggedCard.element) {
            this.draggedCard.element.classList.remove('dragging');
            this.draggedCard.element.style.transform = '';
        }

        this.draggedCard = null;
        this.isDragging = false;
    },

    // =========================================
    // UI UPDATES
    // =========================================

    updateStatus(text, type = '') {
        const statusEl = document.getElementById('dk-status');
        if (statusEl) {
            statusEl.className = `dk-status ${type}`;
            statusEl.innerHTML = text;
        }
    },

    updateActionButtons() {
        const takeBtn = document.getElementById('dk-take-btn');
        const passBtn = document.getElementById('dk-pass-btn');

        if (takeBtn) {
            const canTake = this.isDefender && this.gamePhase === 'defense' && this.table.length > 0;
            takeBtn.style.display = canTake ? 'flex' : 'none';
        }

        if (passBtn) {
            const canPass = this.isAttacker && this.table.length > 0 &&
                this.table.every(p => p.defense);
            passBtn.style.display = canPass ? 'flex' : 'none';
        }
    },

    showToast(message, duration = 2500) {
        const existing = document.querySelector('.dk-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'dk-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // =========================================
    // EVENT HANDLERS
    // =========================================

    handleGameStart(data) {
        this.hand = data.hand || [];
        this.trump = data.trump;
        this.trumpSuit = data.trump?.suit;
        this.players = data.players || [];
        this.mode = data.mode || 'podkidnoy';
        this.deckCount = data.deckCount || 0;
        this.isAttacker = data.isAttacker;
        this.isDefender = data.isDefender;
        this.currentAttacker = data.attacker;
        this.currentDefender = data.defender;
        this.gamePhase = data.isAttacker ? 'attack' : 'defense';
        this.table = [];
        this.isPlaying = false;

        this.renderUI();
        this.updateActionButtons();

        if (this.isAttacker) {
            this.updateStatus('⚔️ ВАШ ХОД - Атакуйте!', 'attack');
        } else if (this.isDefender) {
            this.updateStatus('🛡️ ЗАЩИЩАЙТЕСЬ!', 'defense');
        } else {
            this.updateStatus('⏳ Ожидание хода...', 'waiting');
        }

        this.showToast('🎮 Игра началась!');
    },

    handleTurnUpdate(data) {
        this.isAttacker = data.attacker === App.userId;
        this.isDefender = data.defender === App.userId;
        this.currentAttacker = data.attacker;
        this.currentDefender = data.defender;
        this.gamePhase = data.phase;
        this.table = data.table || [];
        this.deckCount = data.deckCount;
        this.isPlaying = false;

        if (data.hand) {
            this.hand = data.hand;
        }
        if (data.players) {
            this.players = data.players;
        }

        this.renderUI();
        this.updateActionButtons();

        if (this.isAttacker && this.gamePhase === 'attack') {
            this.updateStatus('⚔️ ВАШ ХОД - Атакуйте!', 'attack');
        } else if (this.isDefender && this.gamePhase === 'defense') {
            this.updateStatus('🛡️ ЗАЩИЩАЙТЕСЬ!', 'defense');
        } else {
            this.updateStatus('⏳ Ход противника...', 'waiting');
        }
    },

    handleCardPlayed(data) {
        if (data.playerId === App.userId) {
            this.hand = this.hand.filter(c => c.id !== data.card.id);
        }
        this.table = data.table || this.table;
        this.isPlaying = false;

        this.renderHand();
        this.renderTable();
        this.updateActionButtons();
    },

    handleRoundEnd(data) {
        this.table = [];
        this.isPlaying = false;

        if (data.hand) {
            this.hand = data.hand;
        }
        if (data.players) {
            this.players = data.players;
        }
        this.deckCount = data.deckCount;

        // Animate table clear
        const tableEl = document.getElementById('dk-table');
        if (tableEl) {
            tableEl.classList.add('clearing');
            setTimeout(() => tableEl.classList.remove('clearing'), 500);
        }

        this.renderUI();

        if (data.message) {
            this.showToast(data.message);
        }
    },

    handleGameOver(data) {
        const isLoser = data.loser === App.userId;

        const overlay = document.createElement('div');
        overlay.className = 'dk-gameover-overlay';
        overlay.innerHTML = `
            <div class="dk-gameover-modal ${isLoser ? 'loser' : 'winner'}">
                <div class="dk-gameover-icon">${isLoser ? '🃏' : '🏆'}</div>
                <h2>${isLoser ? 'Вы ДУРАК!' : 'ПОБЕДА!'}</h2>
                <p>${isLoser ? 'В следующий раз повезёт!' : (data.loserName || 'Противник') + ' остался дураком!'}</p>
                <div class="dk-gameover-buttons">
                    <button class="btn primary" onclick="playAgain()">🔄 Ещё раз</button>
                    <button class="btn secondary" onclick="exitToMenu()">🏠 Меню</button>
                </div>
            </div>
        `;
        document.getElementById('durak-game')?.appendChild(overlay);

        App.showVictory && App.showVictory(!isLoser);
    }
};

// =========================================
// GLOBAL FUNCTIONS
// =========================================

let durakSettings = {
    mode: 'podkidnoy',
    playerCount: 2
};

function selectDurakMode(mode) {
    durakSettings.mode = mode;
    document.querySelectorAll('#durak-setup .mode-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mode === mode);
    });
    App.haptic && App.haptic('light');
}

function selectPlayerCount(count) {
    durakSettings.playerCount = count;
    document.querySelectorAll('#durak-setup .player-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.count) === count);
    });
    App.haptic && App.haptic('light');
}

function createDurakRoom() {
    Durak.mode = durakSettings.mode;
    Durak.playerCount = durakSettings.playerCount;

    App.currentGame = 'durak';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🃏 Дурак';

    const isPrivate = document.getElementById('durak-private-toggle')?.checked || false;
    const password = document.getElementById('durak-password')?.value.trim() || null;

    Multiplayer.createRoom('durak', isPrivate ? password : null, !isPrivate, {
        maxPlayers: durakSettings.playerCount,
        mode: durakSettings.mode
    });
}

function durakTake() {
    if (!Durak.isDefender) return;
    Multiplayer.socket.emit('durak_take', { odId: App.userId });
    App.haptic && App.haptic('medium');
    Durak.showToast('📥 Вы берёте карты');
}

function durakPass() {
    if (!Durak.isAttacker) return;
    Multiplayer.socket.emit('durak_pass', { odId: App.userId });
    App.haptic && App.haptic('medium');
    Durak.showToast('✅ Бито!');
}
