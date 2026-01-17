// Monopoly Board Game (Redesigned)
const Monopoly = {
    room: null,
    playerCount: 2,

    // Player tokens (emoji figures)
    playerTokens: ['🗼', '🚗', '🐻', '🎄', '🚀', '🎩'],

    // Board (40 squares, classic layout)
    board: [
        { type: 'corner', name: 'СТАРТ', icon: '🏁', shortName: 'GO' },
        { type: 'property', name: 'Житомирская', price: 60, rent: 2, color: '#8B4513', shortName: 'ЖИТ' },
        { type: 'chest', name: 'Казна', icon: '💰', shortName: '💰' },
        { type: 'property', name: 'Нагатинская', price: 60, rent: 4, color: '#8B4513', shortName: 'НАГ' },
        { type: 'tax', name: 'Налог', amount: 200, icon: '💸', shortName: '💸' },
        { type: 'railroad', name: 'Рижская ЖД', price: 200, icon: '🚂', shortName: '🚂' },
        { type: 'property', name: 'Варшавская', price: 100, rent: 6, color: '#87CEEB', shortName: 'ВАР' },
        { type: 'chance', name: 'Шанс', icon: '❓', shortName: '❓' },
        { type: 'property', name: 'Огарёва', price: 100, rent: 6, color: '#87CEEB', shortName: 'ОГА' },
        { type: 'property', name: 'Парковая', price: 120, rent: 8, color: '#87CEEB', shortName: 'ПАР' },

        { type: 'corner', name: 'ТЮРЬМА', icon: '🔒', shortName: '🔒' },
        { type: 'property', name: 'Полянка', price: 140, rent: 10, color: '#FF69B4', shortName: 'ПОЛ' },
        { type: 'utility', name: 'Электро', price: 150, icon: '💡', shortName: '💡' },
        { type: 'property', name: 'Сретенка', price: 140, rent: 10, color: '#FF69B4', shortName: 'СРЕ' },
        { type: 'property', name: 'Ростовская', price: 160, rent: 12, color: '#FF69B4', shortName: 'РОС' },
        { type: 'railroad', name: 'Курская ЖД', price: 200, icon: '🚂', shortName: '🚂' },
        { type: 'property', name: 'Рязанский', price: 180, rent: 14, color: '#FFA500', shortName: 'РЯЗ' },
        { type: 'chest', name: 'Казна', icon: '💰', shortName: '💰' },
        { type: 'property', name: 'Вавилова', price: 180, rent: 14, color: '#FFA500', shortName: 'ВАВ' },
        { type: 'property', name: 'Рублёвка', price: 200, rent: 16, color: '#FFA500', shortName: 'РУБ' },

        { type: 'corner', name: 'ПАРКОВКА', icon: '🅿️', shortName: '🅿️' },
        { type: 'property', name: 'Тверская', price: 220, rent: 18, color: '#FF0000', shortName: 'ТВЕ' },
        { type: 'chance', name: 'Шанс', icon: '❓', shortName: '❓' },
        { type: 'property', name: 'Пушкинская', price: 220, rent: 18, color: '#FF0000', shortName: 'ПУШ' },
        { type: 'property', name: 'Маяковского', price: 240, rent: 20, color: '#FF0000', shortName: 'МАЯ' },
        { type: 'railroad', name: 'Казанская ЖД', price: 200, icon: '🚂', shortName: '🚂' },
        { type: 'property', name: 'Грузинский', price: 260, rent: 22, color: '#FFFF00', shortName: 'ГРУ' },
        { type: 'property', name: 'Чайковская', price: 260, rent: 22, color: '#FFFF00', shortName: 'ЧАЙ' },
        { type: 'utility', name: 'Вода', price: 150, icon: '🚿', shortName: '🚿' },
        { type: 'property', name: 'Смоленская', price: 280, rent: 24, color: '#FFFF00', shortName: 'СМО' },

        { type: 'corner', name: 'В ТЮРЬМУ', icon: '👮', shortName: '👮' },
        { type: 'property', name: 'Щусева', price: 300, rent: 26, color: '#228B22', shortName: 'ЩУС' },
        { type: 'property', name: 'Гоголевский', price: 300, rent: 26, color: '#228B22', shortName: 'ГОГ' },
        { type: 'chest', name: 'Казна', icon: '💰', shortName: '💰' },
        { type: 'property', name: 'Кутузовский', price: 320, rent: 28, color: '#228B22', shortName: 'КУТ' },
        { type: 'railroad', name: 'Ленингр. ЖД', price: 200, icon: '🚂', shortName: '🚂' },
        { type: 'chance', name: 'Шанс', icon: '❓', shortName: '❓' },
        { type: 'property', name: 'Бронная', price: 350, rent: 35, color: '#0000CD', shortName: 'БРО' },
        { type: 'tax', name: 'Роскошь', amount: 100, icon: '💎', shortName: '💎' },
        { type: 'property', name: 'АРБАТ', price: 400, rent: 50, color: '#0000CD', shortName: 'АРБ' }
    ],

    // Game state
    players: [],
    currentPlayer: null,
    myData: null,
    isMyTurn: false,
    canRollDice: true,
    lastDice: [0, 0],
    properties: {},

    init(room) {
        this.room = room;
        this.renderBoard();
        this.updateUI();
    },

    renderBoard() {
        const boardEl = document.getElementById('monopoly-board');
        if (!boardEl) return;

        // Create linear track layout for mobile
        let html = '<div class="monopoly-track">';

        this.board.forEach((cell, index) => {
            html += this.renderCell(cell, index);
        });

        html += '</div>';
        boardEl.innerHTML = html;
    },

    renderCell(cell, index) {
        const playersHere = this.players
            .filter(p => p.position === index)
            .map((p, i) => {
                const tokenIdx = this.players.findIndex(pl => pl.odId === p.odId);
                return `<span class="player-token">${this.playerTokens[tokenIdx] || '🔵'}</span>`;
            })
            .join('');

        const isCorner = cell.type === 'corner';
        const colorStyle = cell.color ? `border-top: 4px solid ${cell.color};` : '';
        const isOwned = this.properties[index];
        const ownerClass = isOwned ? `owned owner-${isOwned.ownerIndex}` : '';

        return `
            <div class="m-cell ${isCorner ? 'corner' : ''} ${ownerClass}" 
                 data-index="${index}" style="${colorStyle}">
                <div class="m-cell-content">
                    ${cell.icon ? `<span class="m-icon">${cell.icon}</span>` : ''}
                    <span class="m-name">${cell.shortName || cell.name}</span>
                    ${cell.price ? `<span class="m-price">$${cell.price}</span>` : ''}
                </div>
                <div class="m-tokens">${playersHere}</div>
            </div>
        `;
    },

    updateUI() {
        // Update player info panel
        const infoEl = document.getElementById('monopoly-player-info');
        if (infoEl && this.myData) {
            infoEl.innerHTML = `
                <div class="m-my-info">
                    <span class="m-money">💵 $${this.myData.money}</span>
                    <span class="m-props">🏠 ${this.myData.properties?.length || 0}</span>
                </div>
            `;
        }

        // Update dice button
        const diceContainer = document.getElementById('monopoly-dice');
        if (diceContainer) {
            diceContainer.innerHTML = `
                <div class="m-dice-display">
                    <span class="m-die">${this.lastDice[0] || '🎲'}</span>
                    <span class="m-die">${this.lastDice[1] || '🎲'}</span>
                </div>
                <button class="btn primary m-roll-btn" onclick="rollDice()" 
                        ${!this.isMyTurn || !this.canRollDice ? 'disabled' : ''}>
                    ${this.isMyTurn ? '🎲 Бросить' : '⏳ Ждите'}
                </button>
                ${this.isMyTurn && !this.canRollDice ?
                    `<button class="btn secondary" onclick="endMonopolyTurn()">✅ Конец хода</button>` : ''}
            `;
        }

        // Update turn indicator
        const statusEl = document.getElementById('monopoly-status');
        if (statusEl) {
            const currentPlayerName = this.players.find(p => p.odId === this.currentPlayer)?.name || '';
            statusEl.textContent = this.isMyTurn ? 'Ваш ход!' : `Ход: ${currentPlayerName}`;
        }
    },

    roll() {
        if (!this.isMyTurn || !this.canRollDice) return;
        App.haptic('heavy');

        // Animate dice
        const dice = document.querySelectorAll('.m-die');
        dice.forEach(d => d.classList.add('rolling'));

        Multiplayer.socket.emit('monopoly_roll', { odId: App.userId });
    },

    handleGameStart(data) {
        this.players = data.players || [];
        this.myData = data.myData;
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.canRollDice = true;
        this.properties = {};

        this.renderBoard();
        this.updateUI();
    },

    handleDiceResult(data) {
        this.lastDice = data.dice;
        this.canRollDice = data.canRollAgain;

        // Update player position
        const playerIdx = this.players.findIndex(p => p.odId === data.playerId);
        if (playerIdx !== -1) {
            this.players[playerIdx].position = data.newPosition;
        }

        if (data.playerId === App.userId && this.myData) {
            this.myData.money = data.money;
        }

        // Remove rolling animation
        document.querySelectorAll('.m-die').forEach(d => d.classList.remove('rolling'));

        this.renderBoard();
        this.updateUI();

        // Handle landing for current player
        if (data.playerId === App.userId) {
            const cell = this.board[data.newPosition];
            this.handleLanding(cell, data.newPosition);
        }
    },

    handleTurnUpdate(data) {
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = data.currentPlayer === App.userId;
        this.canRollDice = data.canRoll;
        this.lastDice = data.lastDice || [0, 0];
        this.properties = data.properties || {};

        if (data.myData) {
            this.myData = data.myData;
        }

        // Update players positions
        if (data.players) {
            this.players = data.players;
        }

        this.renderBoard();
        this.updateUI();
    },

    handleLanding(cell, position) {
        if (cell.type === 'property' || cell.type === 'railroad' || cell.type === 'utility') {
            if (!this.properties[position]) {
                this.showBuyDialog(cell, position);
            }
        }
    },

    showBuyDialog(cell, position) {
        const overlay = document.createElement('div');
        overlay.className = 'monopoly-overlay';
        overlay.innerHTML = `
            <div class="m-dialog">
                <h3 style="border-color: ${cell.color || '#666'}">${cell.name}</h3>
                <div class="m-dialog-info">
                    <p>💰 Цена: <strong>$${cell.price}</strong></p>
                    ${cell.rent ? `<p>🏠 Аренда: <strong>$${cell.rent}</strong></p>` : ''}
                </div>
                <div class="m-dialog-actions">
                    <button class="btn primary" onclick="Monopoly.buyProperty(${position})">
                        💵 Купить
                    </button>
                    <button class="btn secondary" onclick="Monopoly.closeBuyDialog()">
                        ❌ Пропустить
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    buyProperty(position) {
        this.closeBuyDialog();
        Multiplayer.socket.emit('monopoly_buy', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    closeBuyDialog() {
        const overlay = document.querySelector('.monopoly-overlay');
        if (overlay) overlay.remove();
    },

    handleGameOver(data) {
        const isWinner = data.winner === App.userId;
        App.showVictory(isWinner);
    }
};

// Global functions
let monopolySettings = { playerCount: 2 };

function selectMonopolyPlayerCount(count) {
    monopolySettings.playerCount = count;
    document.querySelectorAll('#monopoly-setup .player-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`#monopoly-setup .player-btn[data-count="${count}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');
    App.haptic('light');
}

function createMonopolyRoom() {
    App.currentGame = 'monopoly';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🎲 Монополия';
    Multiplayer.createRoom('monopoly', {
        maxPlayers: monopolySettings.playerCount
    });
}

function rollDice() {
    Monopoly.roll();
}

function endMonopolyTurn() {
    Multiplayer.socket.emit('monopoly_end_turn', { odId: App.userId });
}
