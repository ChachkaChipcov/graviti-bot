// Monopoly Board Game (Beta)
const Monopoly = {
    room: null,
    playerCount: 2,

    // Board (40 squares, classic layout)
    board: [
        { type: 'corner', name: 'Старт', icon: '🏁' },
        { type: 'property', name: 'Житомирская', price: 60, rent: 2, color: 'brown' },
        { type: 'chest', name: 'Общественная казна', icon: '📦' },
        { type: 'property', name: 'Нагатинская', price: 60, rent: 4, color: 'brown' },
        { type: 'tax', name: 'Подоходный налог', amount: 200, icon: '💸' },
        { type: 'railroad', name: 'Рижская ЖД', price: 200, icon: '🚂' },
        { type: 'property', name: 'Варшавская', price: 100, rent: 6, color: 'lightblue' },
        { type: 'chance', name: 'Шанс', icon: '❓' },
        { type: 'property', name: 'Огарёва', price: 100, rent: 6, color: 'lightblue' },
        { type: 'property', name: 'Первая Парковая', price: 120, rent: 8, color: 'lightblue' },

        { type: 'corner', name: 'Тюрьма', icon: '🔒' },
        { type: 'property', name: 'Полянка', price: 140, rent: 10, color: 'pink' },
        { type: 'utility', name: 'Электростанция', price: 150, icon: '💡' },
        { type: 'property', name: 'Сретенка', price: 140, rent: 10, color: 'pink' },
        { type: 'property', name: 'Ростовская', price: 160, rent: 12, color: 'pink' },
        { type: 'railroad', name: 'Курская ЖД', price: 200, icon: '🚂' },
        { type: 'property', name: 'Рязанский проспект', price: 180, rent: 14, color: 'orange' },
        { type: 'chest', name: 'Общественная казна', icon: '📦' },
        { type: 'property', name: 'Вавилова', price: 180, rent: 14, color: 'orange' },
        { type: 'property', name: 'Рублёвка', price: 200, rent: 16, color: 'orange' },

        { type: 'corner', name: 'Бесплатная парковка', icon: '🅿️' },
        { type: 'property', name: 'Тверская', price: 220, rent: 18, color: 'red' },
        { type: 'chance', name: 'Шанс', icon: '❓' },
        { type: 'property', name: 'Пушкинская', price: 220, rent: 18, color: 'red' },
        { type: 'property', name: 'Площадь Маяковского', price: 240, rent: 20, color: 'red' },
        { type: 'railroad', name: 'Казанская ЖД', price: 200, icon: '🚂' },
        { type: 'property', name: 'Грузинский вал', price: 260, rent: 22, color: 'yellow' },
        { type: 'property', name: 'Чайковская', price: 260, rent: 22, color: 'yellow' },
        { type: 'utility', name: 'Водопровод', price: 150, icon: '🚿' },
        { type: 'property', name: 'Смоленская', price: 280, rent: 24, color: 'yellow' },

        { type: 'corner', name: 'Идите в тюрьму', icon: '👮' },
        { type: 'property', name: 'Щусева', price: 300, rent: 26, color: 'green' },
        { type: 'property', name: 'Гоголевский бульвар', price: 300, rent: 26, color: 'green' },
        { type: 'chest', name: 'Общественная казна', icon: '📦' },
        { type: 'property', name: 'Кутузовский проспект', price: 320, rent: 28, color: 'green' },
        { type: 'railroad', name: 'Ленинградская ЖД', price: 200, icon: '🚂' },
        { type: 'chance', name: 'Шанс', icon: '❓' },
        { type: 'property', name: 'Малая Бронная', price: 350, rent: 35, color: 'darkblue' },
        { type: 'tax', name: 'Налог на роскошь', amount: 100, icon: '💎' },
        { type: 'property', name: 'Арбат', price: 400, rent: 50, color: 'darkblue' }
    ],

    // Chance cards
    chanceCards: [
        { text: 'Идите на Старт', action: 'goto', target: 0 },
        { text: 'Идите в тюрьму', action: 'jail' },
        { text: 'Получите $200', action: 'receive', amount: 200 },
        { text: 'Заплатите $50', action: 'pay', amount: 50 },
        { text: 'Вы выиграли в лотерею! +$100', action: 'receive', amount: 100 },
        { text: 'Ремонт дома. Заплатите $100', action: 'pay', amount: 100 },
        { text: 'Освобождение из тюрьмы', action: 'jailcard' }
    ],

    // Game state
    players: [],
    currentPlayer: null,
    myPosition: 0,
    myMoney: 1500,
    myProperties: [],
    isMyTurn: false,
    canRollDice: true,
    lastDice: [0, 0],

    init(room) {
        this.room = room;
        this.myPosition = 0;
        this.myMoney = 1500;
        this.myProperties = [];
        this.renderBoard();
        this.updatePlayerInfo();
    },

    renderBoard() {
        const boardEl = document.getElementById('monopoly-board');
        if (!boardEl) return;

        // Create 11x11 grid (outer ring of 40 cells + center area)
        let html = '';

        // The board is a 11x11 grid where:
        // - Row 0 and Row 10 are top/bottom rows
        // - Col 0 and Col 10 are left/right columns
        // - Corners are at (0,0), (0,10), (10,0), (10,10)

        for (let row = 0; row < 11; row++) {
            for (let col = 0; col < 11; col++) {
                const cellIndex = this.getBoardIndex(row, col);

                if (cellIndex !== null) {
                    const cell = this.board[cellIndex];
                    html += this.renderCell(cell, cellIndex);
                } else {
                    // Center area - empty
                    html += `<div class="monopoly-center"></div>`;
                }
            }
        }

        boardEl.innerHTML = html;
    },

    getBoardIndex(row, col) {
        // Convert grid position to board index (0-39)
        // Corner positions
        if (row === 10 && col === 0) return 0;  // Старт (bottom-left)
        if (row === 0 && col === 0) return 10;  // Тюрьма (top-left)
        if (row === 0 && col === 10) return 20; // Парковка (top-right)
        if (row === 10 && col === 10) return 30; // Идите в тюрьму (bottom-right)

        // Bottom row (right to left after Start)
        if (row === 10 && col > 0 && col < 10) return col;

        // Left column (bottom to top)
        if (col === 0 && row < 10 && row > 0) return 10 + (10 - row);

        // Top row (left to right)
        if (row === 0 && col > 0 && col < 10) return 10 + col;

        // Right column (top to bottom)
        if (col === 10 && row > 0 && row < 10) return 20 + row;

        return null; // Center
    },

    renderCell(cell, index) {
        const isCorner = cell.type === 'corner';
        let colorBar = '';

        if (cell.color) {
            colorBar = `<div class="color-bar ${cell.color}"></div>`;
        }

        const playersHere = this.players.filter(p => p.position === index)
            .map((p, i) => `<div class="monopoly-token player${i + 1}"></div>`)
            .join('');

        return `
            <div class="monopoly-cell ${isCorner ? 'corner' : ''}" data-index="${index}">
                ${colorBar}
                <span class="cell-icon">${cell.icon || ''}</span>
                <span class="cell-name">${cell.name?.substring(0, 8) || ''}</span>
                ${cell.price ? `<span class="cell-price">$${cell.price}</span>` : ''}
                ${playersHere}
            </div>
        `;
    },

    updatePlayerInfo() {
        const infoEl = document.getElementById('monopoly-player-info');
        if (infoEl) {
            infoEl.innerHTML = `
                <span class="money">💰 $${this.myMoney}</span>
                <span class="properties">🏠 ${this.myProperties.length}</span>
            `;
        }
    },

    roll() {
        if (!this.isMyTurn || !this.canRollDice) return;

        App.haptic('heavy');
        Multiplayer.socket.emit('monopoly_roll', { odId: App.userId });
    },

    handleDiceResult(data) {
        this.lastDice = data.dice;
        this.myPosition = data.position;
        this.canRollDice = false;

        // Animate dice
        const diceEl = document.getElementById('monopoly-dice');
        if (diceEl) {
            diceEl.innerHTML = `
                <div class="dice">${data.dice[0]}</div>
                <div class="dice">${data.dice[1]}</div>
            `;
        }

        // Update board
        this.renderBoard();

        // Handle landing
        const cell = this.board[this.myPosition];
        this.handleLanding(cell);
    },

    handleLanding(cell) {
        switch (cell.type) {
            case 'property':
            case 'railroad':
            case 'utility':
                // Check if owned
                if (!this.isPropertyOwned(cell)) {
                    this.showBuyDialog(cell);
                }
                break;
            case 'tax':
                // Pay tax automatically
                Multiplayer.socket.emit('monopoly_pay_tax', {
                    odId: App.userId,
                    amount: cell.amount
                });
                break;
            case 'chance':
            case 'chest':
                // Draw card
                Multiplayer.socket.emit('monopoly_draw_card', {
                    odId: App.userId,
                    type: cell.type
                });
                break;
            case 'corner':
                if (cell.name === 'Идите в тюрьму') {
                    Multiplayer.socket.emit('monopoly_go_to_jail', { odId: App.userId });
                }
                break;
        }
    },

    isPropertyOwned(cell) {
        return false; // TODO: Check ownership
    },

    showBuyDialog(cell) {
        // Show buy/auction dialog
        const overlay = document.createElement('div');
        overlay.className = 'monopoly-dialog-overlay';
        overlay.innerHTML = `
            <div class="monopoly-dialog">
                <h3>${cell.name}</h3>
                <p>Цена: $${cell.price}</p>
                <p>Аренда: $${cell.rent || '?'}</p>
                <div class="dialog-actions">
                    <button class="btn primary" onclick="Monopoly.buyProperty()">💰 Купить</button>
                    <button class="btn secondary" onclick="Monopoly.startAuction()">🔨 Аукцион</button>
                    <button class="btn" onclick="Monopoly.passBuy()">❌ Пропустить</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.pendingProperty = cell;
    },

    buyProperty() {
        const overlay = document.querySelector('.monopoly-dialog-overlay');
        if (overlay) overlay.remove();

        if (this.pendingProperty) {
            Multiplayer.socket.emit('monopoly_buy', {
                odId: App.userId,
                propertyIndex: this.myPosition
            });
            this.pendingProperty = null;
        }
    },

    startAuction() {
        const overlay = document.querySelector('.monopoly-dialog-overlay');
        if (overlay) overlay.remove();

        Multiplayer.socket.emit('monopoly_auction', {
            odId: App.userId,
            propertyIndex: this.myPosition
        });
    },

    passBuy() {
        const overlay = document.querySelector('.monopoly-dialog-overlay');
        if (overlay) overlay.remove();
        this.pendingProperty = null;
    },

    handleGameStart(data) {
        this.players = data.players || [];
        this.myMoney = data.startMoney || 1500;
        this.renderBoard();
        this.updatePlayerInfo();
    },

    handleTurnUpdate(data) {
        this.isMyTurn = data.currentPlayer === App.userId;
        this.canRollDice = data.canRoll ?? true;
        this.currentPlayer = data.currentPlayer;

        // Update dice button
        const diceBtn = document.querySelector('#monopoly-dice button');
        if (diceBtn) {
            diceBtn.disabled = !this.isMyTurn || !this.canRollDice;
            diceBtn.textContent = this.isMyTurn ? '🎲 Бросить кубики' : '⏳ Ждите...';
        }
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
        btn.classList.toggle('selected', parseInt(btn.dataset.count) === count);
    });
    App.haptic('light');
}

function createMonopolyRoom() {
    Multiplayer.socket.emit('create_room', {
        gameType: 'monopoly',
        odId: App.userId,
        userName: App.userName,
        settings: { maxPlayers: monopolySettings.playerCount }
    });
}

function rollDice() {
    Monopoly.roll();
}
