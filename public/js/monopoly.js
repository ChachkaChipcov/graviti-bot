// ================================================
// MONOPOLY PLUS - Premium Edition
// Full animations, trading, auctions
// ================================================

const MonopolyPlus = {
    room: null,
    playerCount: 2,

    // Player tokens & colors
    playerTokens: ['🎩', '🚗', '🐕', '🚂', '⛵', '👢'],
    playerColors: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'],

    // Property color groups (Monopoly Plus authentic)
    colors: {
        brown: '#8B4513',
        lightBlue: '#87CEEB',
        pink: '#FF69B4',
        orange: '#FF8C00',
        red: '#DC143C',
        yellow: '#FFD700',
        green: '#228B22',
        darkBlue: '#00008B'
    },

    // Complete 40-square board with FULL names
    board: [
        // === BOTTOM ROW (0-10): GO to JAIL ===
        { id: 0, type: 'corner', name: 'СТАРТ', fullName: 'СТАРТ - Получите $200', icon: '🏁' },
        { id: 1, type: 'property', name: 'Житомирская', fullName: 'ул. Житомирская', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
        { id: 2, type: 'chest', name: 'Казна', fullName: 'Общественная казна', icon: '💰' },
        { id: 3, type: 'property', name: 'Нагатинская', fullName: 'ул. Нагатинская', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
        { id: 4, type: 'tax', name: 'Налог $200', fullName: 'Подоходный налог', amount: 200, icon: '💸' },
        { id: 5, type: 'railroad', name: 'Рижская ЖД', fullName: 'Рижская железная дорога', price: 200, icon: '🚂' },
        { id: 6, type: 'property', name: 'Варшавка', fullName: 'Варшавское шоссе', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
        { id: 7, type: 'chance', name: 'Шанс', fullName: 'Шанс', icon: '❓' },
        { id: 8, type: 'property', name: 'Огарёва', fullName: 'ул. Огарёва', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
        { id: 9, type: 'property', name: 'Первая Парковая', fullName: 'Первая Парковая улица', group: 'lightBlue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
        { id: 10, type: 'corner', name: 'ТЮРЬМА', fullName: 'Тюрьма / Посетитель', icon: '🔒' },

        // === LEFT COLUMN (11-19): bottom to top ===
        { id: 11, type: 'property', name: 'Полянка', fullName: 'ул. Полянка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
        { id: 12, type: 'utility', name: 'Электростанция', fullName: 'Электростанция', price: 150, icon: '💡' },
        { id: 13, type: 'property', name: 'Сретенка', fullName: 'ул. Сретенка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
        { id: 14, type: 'property', name: 'Ростовская', fullName: 'Ростовская набережная', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
        { id: 15, type: 'railroad', name: 'Курский вокзал', fullName: 'Курский вокзал', price: 200, icon: '🚂' },
        { id: 16, type: 'property', name: 'Рязанский пр-т', fullName: 'Рязанский проспект', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
        { id: 17, type: 'chest', name: 'Казна', fullName: 'Общественная казна', icon: '💰' },
        { id: 18, type: 'property', name: 'Вавилова', fullName: 'ул. Вавилова', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
        { id: 19, type: 'property', name: 'Рублёвка', fullName: 'Рублёвское шоссе', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
        { id: 20, type: 'corner', name: 'ПАРКОВКА', fullName: 'Бесплатная парковка', icon: '🅿️' },

        // === TOP ROW (21-30): left to right ===
        { id: 21, type: 'property', name: 'Тверская', fullName: 'ул. Тверская', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
        { id: 22, type: 'chance', name: 'Шанс', fullName: 'Шанс', icon: '❓' },
        { id: 23, type: 'property', name: 'Пушкинская', fullName: 'Пушкинская площадь', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
        { id: 24, type: 'property', name: 'Маяковского', fullName: 'пл. Маяковского', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
        { id: 25, type: 'railroad', name: 'Казанский вокзал', fullName: 'Казанский вокзал', price: 200, icon: '🚂' },
        { id: 26, type: 'property', name: 'Грузинский вал', fullName: 'Грузинский вал', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
        { id: 27, type: 'property', name: 'Чайковского', fullName: 'ул. Чайковского', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
        { id: 28, type: 'utility', name: 'Водоканал', fullName: 'Водопроводная станция', price: 150, icon: '🚿' },
        { id: 29, type: 'property', name: 'Смоленская', fullName: 'Смоленская площадь', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
        { id: 30, type: 'corner', name: 'В ТЮРЬМУ', fullName: 'Отправляйтесь в тюрьму!', icon: '👮' },

        // === RIGHT COLUMN (31-39): top to bottom ===
        { id: 31, type: 'property', name: 'Щусева', fullName: 'ул. Щусева', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
        { id: 32, type: 'property', name: 'Гоголевский', fullName: 'Гоголевский бульвар', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
        { id: 33, type: 'chest', name: 'Казна', fullName: 'Общественная казна', icon: '💰' },
        { id: 34, type: 'property', name: 'Кутузовский', fullName: 'Кутузовский проспект', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
        { id: 35, type: 'railroad', name: 'Ленинградский', fullName: 'Ленинградский вокзал', price: 200, icon: '🚂' },
        { id: 36, type: 'chance', name: 'Шанс', fullName: 'Шанс', icon: '❓' },
        { id: 37, type: 'property', name: 'М. Бронная', fullName: 'Малая Бронная улица', group: 'darkBlue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
        { id: 38, type: 'tax', name: 'Налог $100', fullName: 'Налог на роскошь', amount: 100, icon: '💎' },
        { id: 39, type: 'property', name: 'АРБАТ', fullName: 'Улица Арбат', group: 'darkBlue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 }
    ],

    // Property groups for monopoly checking
    propertyGroups: {
        brown: [1, 3],
        lightBlue: [6, 8, 9],
        pink: [11, 13, 14],
        orange: [16, 18, 19],
        red: [21, 23, 24],
        yellow: [26, 27, 29],
        green: [31, 32, 34],
        darkBlue: [37, 39]
    },

    // Game state
    players: [],
    currentPlayer: null,
    myData: null,
    isMyTurn: false,
    canRollDice: true,
    lastDice: [0, 0],
    doublesCount: 0,
    properties: {},

    // Auction state
    auctionActive: false,
    auctionProperty: null,
    auctionBids: {},
    auctionTimer: null,

    // Trade state
    tradeActive: false,
    tradeData: null,

    // =========================================
    // INITIALIZATION
    // =========================================

    init(room) {
        this.room = room;
        this.auctionActive = false;
        this.tradeActive = false;
        this.renderBoard();
        this.updateUI();
    },

    // =========================================
    // BOARD RENDERING
    // =========================================

    renderBoard() {
        const boardEl = document.getElementById('mp-board');
        if (!boardEl) return;

        let html = '';
        const positions = this.calculateGridPositions();

        for (let row = 0; row < 11; row++) {
            for (let col = 0; col < 11; col++) {
                const cellIdx = positions[`${row},${col}`];
                if (cellIdx !== undefined) {
                    const cell = this.board[cellIdx];
                    html += this.renderCell(cell, cellIdx, row, col);
                }
            }
        }

        boardEl.innerHTML = html;
    },

    calculateGridPositions() {
        const pos = {};
        // Bottom row (0-10): row 10, col 10→0
        for (let i = 0; i <= 10; i++) pos[`10,${10 - i}`] = i;
        // Left column (11-19): col 0, row 9→1
        for (let i = 0; i < 9; i++) pos[`${9 - i},0`] = 11 + i;
        // Top row (20-30): row 0, col 0→10
        for (let i = 0; i <= 10; i++) pos[`0,${i}`] = 20 + i;
        // Right column (31-39): col 10, row 1→9
        for (let i = 0; i < 9; i++) pos[`${1 + i},10`] = 31 + i;
        return pos;
    },

    renderCell(cell, index, row, col) {
        const isCorner = cell.type === 'corner';
        const propData = this.properties[index];
        const ownerIdx = propData ? this.players.findIndex(p => p.odId === propData.owner) : -1;
        const colorStyle = cell.group ? `--cell-color: ${this.colors[cell.group]}` : '';

        // Players on this cell
        const playersHere = this.players
            .filter(p => p.position === index && !p.bankrupt)
            .map(p => {
                const idx = this.players.findIndex(pl => pl.odId === p.odId);
                const isMe = p.odId === App.userId;
                return `<span class="mp-token ${isMe ? 'my-token' : ''}" style="background:${this.playerColors[idx]}">${this.playerTokens[idx]}</span>`;
            }).join('');

        const ownerDot = ownerIdx >= 0 ?
            `<div class="mp-owner-dot" style="background:${this.playerColors[ownerIdx]}"></div>` : '';

        const houses = propData?.houses || 0;
        const housesHtml = houses === 5 ?
            '<span class="mp-hotel">🏨</span>' :
            (houses > 0 ? `<span class="mp-houses">${'🏠'.repeat(houses)}</span>` : '');

        // Display name logic
        let displayName = cell.icon || cell.name;
        let priceHtml = cell.price ? `<span class="mp-cell-price">$${cell.price}</span>` : '';

        return `
            <div class="mp-cell ${isCorner ? 'corner' : ''} ${cell.group || ''} ${propData ? 'owned' : ''}" 
                 data-index="${index}"
                 style="grid-row:${row + 1};grid-column:${col + 1};${colorStyle}"
                 onclick="MonopolyPlus.showCellInfo(${index})">
                ${cell.group ? '<div class="mp-cell-color"></div>' : ''}
                <div class="mp-cell-body">
                    <span class="mp-cell-name">${displayName}</span>
                    ${priceHtml}
                    ${housesHtml}
                </div>
                ${ownerDot}
                <div class="mp-cell-tokens">${playersHere}</div>
            </div>
        `;
    },

    // =========================================
    // UI UPDATES
    // =========================================

    updateUI() {
        this.updateStatus();
        this.updatePlayerInfo();
        this.updateButtons();
        this.updateDice();
        this.renderBoard();
    },

    updateStatus() {
        const statusEl = document.getElementById('mp-status');
        if (!statusEl) return;

        let statusText = '';
        let statusClass = '';

        if (this.isMyTurn) {
            if (this.myData?.inJail) {
                statusText = '🔒 Вы в тюрьме - бросьте дубль или заплатите $50';
                statusClass = 'jail';
            } else if (this.canRollDice) {
                statusText = '🎲 Ваш ход! Бросьте кости';
                statusClass = 'your-turn';
            } else {
                statusText = '✋ Выполните действие или завершите ход';
                statusClass = 'action';
            }
        } else {
            const currentName = this.players.find(p => p.odId === this.currentPlayer)?.name || '';
            statusText = `⏳ Ход: ${currentName}`;
            statusClass = 'waiting';
        }

        statusEl.innerHTML = `<span class="status-${statusClass}">${statusText}</span>`;
    },

    updatePlayerInfo() {
        const infoEl = document.getElementById('mp-my-info');
        if (infoEl && this.myData) {
            const propCount = Object.values(this.properties).filter(p => p.owner === App.userId).length;
            infoEl.innerHTML = `
                <span class="mp-money-display">💵 <b>$${this.myData.money}</b></span>
                <span class="mp-props-count">🏠 ${propCount}</span>
            `;
        }

        const playersEl = document.getElementById('mp-players');
        if (playersEl) {
            playersEl.innerHTML = this.players.map((p, idx) => {
                const isMe = p.odId === App.userId;
                const isCurrent = p.odId === this.currentPlayer;
                const isBankrupt = p.bankrupt;
                return `
                    <div class="mp-player-chip ${isCurrent ? 'active' : ''} ${isMe ? 'me' : ''} ${isBankrupt ? 'bankrupt' : ''}"
                         style="--player-color: ${this.playerColors[idx]}"
                         onclick="MonopolyPlus.showPlayerInfo('${p.odId}')">
                        <span class="mp-chip-token">${this.playerTokens[idx]}</span>
                        <span class="mp-chip-name">${isMe ? 'Вы' : p.name.slice(0, 8)}</span>
                        <span class="mp-chip-money">$${p.money || 0}</span>
                    </div>
                `;
            }).join('');
        }
    },

    updateButtons() {
        const rollBtn = document.getElementById('mp-roll-btn');
        const endBtn = document.getElementById('mp-end-btn');
        const propsBtn = document.getElementById('mp-props-btn');
        const tradeBtn = document.getElementById('mp-trade-btn');

        if (rollBtn) {
            const canRoll = this.isMyTurn && this.canRollDice && !this.auctionActive && !this.tradeActive;
            rollBtn.disabled = !canRoll;
            rollBtn.className = `btn primary mp-roll-btn ${canRoll ? 'pulse-glow' : ''}`;
        }

        if (endBtn) {
            const canEnd = this.isMyTurn && !this.canRollDice && !this.auctionActive && !this.tradeActive;
            endBtn.disabled = !canEnd;
        }

        if (propsBtn) propsBtn.disabled = !this.isMyTurn;
        if (tradeBtn) tradeBtn.disabled = !this.isMyTurn || this.players.length < 2;
    },

    updateDice() {
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

        if (die1 && this.lastDice[0]) die1.textContent = diceEmojis[this.lastDice[0]];
        if (die2 && this.lastDice[1]) die2.textContent = diceEmojis[this.lastDice[1]];
    },

    // =========================================
    // DICE ROLLING
    // =========================================

    roll() {
        if (!this.isMyTurn || !this.canRollDice) return;

        App.haptic && App.haptic('heavy');

        // Animate dice
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        if (die1) die1.classList.add('rolling');
        if (die2) die2.classList.add('rolling');

        // Emit to server
        Multiplayer.socket.emit('monopoly_roll', { odId: App.userId });
    },

    // =========================================
    // EVENT HANDLERS
    // =========================================

    handleGameStart(data) {
        this.players = data.players || [];
        this.myData = data.myData;
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.canRollDice = true;
        this.properties = data.properties || {};
        this.lastDice = [0, 0];
        this.doublesCount = 0;
        this.auctionActive = false;
        this.tradeActive = false;

        this.updateUI();
        this.showToast('🎮 Игра началась!', 2000);
    },

    handleDiceResult(data) {
        this.lastDice = data.dice;
        this.canRollDice = data.canRollAgain && !data.wentToJail;
        this.doublesCount = data.doublesCount || 0;

        // Stop dice animation
        document.querySelectorAll('.mp-die').forEach(d => d.classList.remove('rolling'));

        // Update player position with animation
        const playerIdx = this.players.findIndex(p => p.odId === data.playerId);
        if (playerIdx !== -1) {
            const oldPos = this.players[playerIdx].position;
            this.players[playerIdx].position = data.newPosition;
            this.players[playerIdx].money = data.money;

            // Animate token movement if it's our turn
            if (data.playerId === App.userId) {
                this.animateTokenMove(oldPos, data.newPosition);
            }
        }

        if (data.playerId === App.userId && this.myData) {
            this.myData.position = data.newPosition;
            this.myData.money = data.money;
            if (data.wentToJail) this.myData.inJail = true;
        }

        // Show notifications
        if (data.isDoubles && !data.wentToJail) {
            this.showToast(`🎲 Дубль! ${data.dice[0]}+${data.dice[0]} - бросьте снова!`, 3000);
        }
        if (data.wentToJail) {
            this.showToast('👮 Три дубля подряд! В тюрьму!', 3000);
        }
        if (data.escapedJail) {
            this.showToast('🔓 Дубль! Вы сбежали из тюрьмы!', 3000);
        }
        if (data.passedGo && data.playerId === App.userId) {
            this.showToast('🏁 +$200 за прохождение СТАРТА!', 2000);
        }

        this.updateUI();

        // Handle landing
        if (data.playerId === App.userId && !data.wentToJail) {
            setTimeout(() => this.handleLanding(data.newPosition), 500);
        }
    },

    handleTurnUpdate(data) {
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = data.currentPlayer === App.userId;
        this.canRollDice = data.canRoll;
        this.properties = data.properties || {};

        if (data.myData) this.myData = data.myData;
        if (data.players) this.players = data.players;

        this.updateUI();
    },

    // =========================================
    // LANDING LOGIC
    // =========================================

    handleLanding(position) {
        const cell = this.board[position];
        if (!cell || !this.isMyTurn) return;

        // Buyable property
        if ((cell.type === 'property' || cell.type === 'railroad' || cell.type === 'utility') &&
            !this.properties[position]) {
            this.showBuyDialog(position);
        }
    },

    animateTokenMove(from, to) {
        // Simple board animation - just update and add pulse
        setTimeout(() => {
            this.renderBoard();
            const cell = document.querySelector(`.mp-cell[data-index="${to}"]`);
            if (cell) {
                cell.classList.add('cell-pulse');
                setTimeout(() => cell.classList.remove('cell-pulse'), 600);
            }
        }, 100);
    },

    // =========================================
    // BUY DIALOG
    // =========================================

    showBuyDialog(position) {
        const cell = this.board[position];
        if (!cell || !this.isMyTurn) return;

        const canAfford = this.myData.money >= cell.price;
        const colorBar = cell.group ? `border-top: 8px solid ${this.colors[cell.group]}` : '';

        let rentTable = '';
        if (cell.rent) {
            rentTable = `
                <div class="mp-rent-table">
                    <div class="rent-row"><span>Пустой</span><span>$${cell.rent[0]}</span></div>
                    <div class="rent-row"><span>1 дом</span><span>$${cell.rent[1]}</span></div>
                    <div class="rent-row"><span>2 дома</span><span>$${cell.rent[2]}</span></div>
                    <div class="rent-row"><span>3 дома</span><span>$${cell.rent[3]}</span></div>
                    <div class="rent-row"><span>4 дома</span><span>$${cell.rent[4]}</span></div>
                    <div class="rent-row"><span>🏨 Отель</span><span>$${cell.rent[5]}</span></div>
                </div>
            `;
        }

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-buy-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog slide-up" style="${colorBar}">
                <h3>${cell.fullName || cell.name}</h3>
                <div class="mp-dialog-price">💰 Цена: <b>$${cell.price}</b></div>
                ${rentTable}
                <div class="mp-dialog-balance">Ваш баланс: <b>$${this.myData.money}</b></div>
                <div class="mp-dialog-btns">
                    <button class="btn primary ${!canAfford ? 'disabled' : ''}" 
                            ${!canAfford ? 'disabled' : ''} 
                            onclick="MonopolyPlus.buyProperty(${position})">
                        💵 Купить
                    </button>
                    <button class="btn warning" onclick="MonopolyPlus.declinePurchase(${position})">
                        🏛️ На аукцион
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    buyProperty(position) {
        this.closeDialog();
        Multiplayer.socket.emit('monopoly_buy', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    declinePurchase(position) {
        this.closeDialog();
        Multiplayer.socket.emit('monopoly_decline_buy', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    // =========================================
    // AUCTION SYSTEM
    // =========================================

    handleAuctionStart(data) {
        this.auctionActive = true;
        this.auctionProperty = data.propertyIndex;
        this.auctionBids = {};

        const cell = this.board[data.propertyIndex];
        const colorBar = cell.group ? `border-top: 8px solid ${this.colors[cell.group]}` : '';

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-auction-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-auction-dialog slide-up" style="${colorBar}">
                <h3>🏛️ АУКЦИОН</h3>
                <h4>${cell.fullName || cell.name}</h4>
                <div class="mp-auction-timer">
                    <div class="mp-timer-bar" id="mp-timer-bar"></div>
                </div>
                <div class="mp-auction-bid-display">
                    <span>Текущая ставка:</span>
                    <b id="mp-current-bid">$${data.currentBid || 10}</b>
                </div>
                <div class="mp-auction-leader" id="mp-bid-leader">
                    ${data.highestBidder ? 'Лидер: ' + (this.players.find(p => p.odId === data.highestBidder)?.name || '-') : 'Нет ставок'}
                </div>
                <div class="mp-auction-actions">
                    <button class="btn primary" onclick="MonopolyPlus.placeBid(10)">+$10</button>
                    <button class="btn primary" onclick="MonopolyPlus.placeBid(50)">+$50</button>
                    <button class="btn primary" onclick="MonopolyPlus.placeBid(100)">+$100</button>
                    <button class="btn warning" onclick="MonopolyPlus.passAuction()">❌ Пас</button>
                </div>
                <div class="mp-dialog-balance">Ваш баланс: <b>$${this.myData?.money || 0}</b></div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.updateUI();
    },

    handleAuctionUpdate(data) {
        const bidEl = document.getElementById('mp-current-bid');
        const leaderEl = document.getElementById('mp-bid-leader');

        if (bidEl) bidEl.textContent = `$${data.currentBid}`;
        if (leaderEl) {
            const leaderName = this.players.find(p => p.odId === data.highestBidder)?.name || '-';
            leaderEl.textContent = `Лидер: ${leaderName}`;
        }

        // Reset timer bar animation
        const timerBar = document.getElementById('mp-timer-bar');
        if (timerBar) {
            timerBar.style.animation = 'none';
            timerBar.offsetHeight; // Trigger reflow
            timerBar.style.animation = 'timerShrink 10s linear forwards';
        }
    },

    handleAuctionEnd(data) {
        this.auctionActive = false;
        this.closeDialog('mp-auction-overlay');

        if (data.winner) {
            const winnerName = data.winner === App.userId ? 'Вы' :
                (this.players.find(p => p.odId === data.winner)?.name || 'Игрок');
            const cell = this.board[data.propertyIndex];
            this.showToast(`🎉 ${winnerName} выиграли аукцион за ${cell.name} ($${data.winningBid})!`, 3000);

            if (data.winner === App.userId && this.myData) {
                this.myData.money = data.newMoney;
            }
        } else {
            this.showToast('Аукцион завершён без победителя', 2000);
        }

        this.updateUI();
    },

    placeBid(amount) {
        if (!this.auctionActive) return;
        Multiplayer.socket.emit('monopoly_auction_bid', {
            odId: App.userId,
            amount: amount
        });
    },

    passAuction() {
        if (!this.auctionActive) return;
        Multiplayer.socket.emit('monopoly_auction_pass', { odId: App.userId });
        this.showToast('Вы пасанули', 1500);
    },

    // =========================================
    // TRADE SYSTEM
    // =========================================

    showTradeDialog() {
        if (!this.isMyTurn || this.players.length < 2) return;

        const otherPlayers = this.players.filter(p => p.odId !== App.userId && !p.bankrupt);
        if (otherPlayers.length === 0) {
            this.showToast('Нет игроков для торговли', 2000);
            return;
        }

        const myProps = Object.entries(this.properties)
            .filter(([idx, data]) => data.owner === App.userId)
            .map(([idx, data]) => ({ idx: parseInt(idx), ...data, cell: this.board[parseInt(idx)] }));

        let playersHtml = otherPlayers.map(p => {
            const idx = this.players.findIndex(pl => pl.odId === p.odId);
            return `
                <div class="mp-trade-player" onclick="MonopolyPlus.selectTradeTarget('${p.odId}')">
                    <span class="mp-chip-token">${this.playerTokens[idx]}</span>
                    <span>${p.name}</span>
                    <span>$${p.money}</span>
                </div>
            `;
        }).join('');

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-trade-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-trade-dialog slide-up">
                <h3>🤝 Торговля</h3>
                <p>Выберите игрока:</p>
                <div class="mp-trade-players">${playersHtml}</div>
                <button class="btn secondary" onclick="MonopolyPlus.closeDialog('mp-trade-overlay')">Отмена</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    selectTradeTarget(targetId) {
        this.closeDialog('mp-trade-overlay');
        this.showTradeOffer(targetId);
    },

    showTradeOffer(targetId) {
        const target = this.players.find(p => p.odId === targetId);
        if (!target) return;

        const myProps = Object.entries(this.properties)
            .filter(([idx, data]) => data.owner === App.userId)
            .map(([idx, data]) => ({ idx: parseInt(idx), cell: this.board[parseInt(idx)] }));

        const theirProps = Object.entries(this.properties)
            .filter(([idx, data]) => data.owner === targetId)
            .map(([idx, data]) => ({ idx: parseInt(idx), cell: this.board[parseInt(idx)] }));

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-trade-offer-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-trade-offer-dialog slide-up">
                <h3>🤝 Предложение для ${target.name}</h3>
                
                <div class="mp-trade-section">
                    <h4>Вы отдаёте:</h4>
                    <div class="mp-trade-props" id="mp-my-offer">
                        ${myProps.map(p => `
                            <label class="mp-trade-prop">
                                <input type="checkbox" value="${p.idx}" class="offer-prop">
                                <span style="border-color:${this.colors[p.cell.group] || '#666'}">${p.cell.name}</span>
                            </label>
                        `).join('') || '<p>Нет недвижимости</p>'}
                    </div>
                    <div class="mp-trade-money">
                        <label>Деньги: $<input type="number" id="mp-offer-money" value="0" min="0" max="${this.myData.money}"></label>
                    </div>
                </div>
                
                <div class="mp-trade-section">
                    <h4>Вы получаете:</h4>
                    <div class="mp-trade-props" id="mp-their-offer">
                        ${theirProps.map(p => `
                            <label class="mp-trade-prop">
                                <input type="checkbox" value="${p.idx}" class="request-prop">
                                <span style="border-color:${this.colors[p.cell.group] || '#666'}">${p.cell.name}</span>
                            </label>
                        `).join('') || '<p>Нет недвижимости</p>'}
                    </div>
                    <div class="mp-trade-money">
                        <label>Деньги: $<input type="number" id="mp-request-money" value="0" min="0" max="${target.money}"></label>
                    </div>
                </div>
                
                <div class="mp-dialog-btns">
                    <button class="btn primary" onclick="MonopolyPlus.sendTradeOffer('${targetId}')">📤 Отправить</button>
                    <button class="btn secondary" onclick="MonopolyPlus.closeDialog('mp-trade-offer-overlay')">Отмена</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    sendTradeOffer(targetId) {
        const offerProps = [...document.querySelectorAll('.offer-prop:checked')].map(el => parseInt(el.value));
        const requestProps = [...document.querySelectorAll('.request-prop:checked')].map(el => parseInt(el.value));
        const offerMoney = parseInt(document.getElementById('mp-offer-money')?.value) || 0;
        const requestMoney = parseInt(document.getElementById('mp-request-money')?.value) || 0;

        if (offerProps.length === 0 && requestProps.length === 0 && offerMoney === 0 && requestMoney === 0) {
            this.showToast('Добавьте что-нибудь в сделку', 2000);
            return;
        }

        this.closeDialog('mp-trade-offer-overlay');

        Multiplayer.socket.emit('monopoly_trade_offer', {
            odId: App.userId,
            targetId,
            offerProps,
            requestProps,
            offerMoney,
            requestMoney
        });

        this.showToast('📤 Предложение отправлено', 2000);
    },

    handleTradeOffer(data) {
        this.tradeActive = true;
        this.tradeData = data;

        const sender = this.players.find(p => p.odId === data.senderId);
        const senderName = sender?.name || 'Игрок';

        let offerHtml = data.offerProps.map(idx => this.board[idx].name).join(', ') || 'Ничего';
        if (data.offerMoney > 0) offerHtml += ` + $${data.offerMoney}`;

        let requestHtml = data.requestProps.map(idx => this.board[idx].name).join(', ') || 'Ничего';
        if (data.requestMoney > 0) requestHtml += ` + $${data.requestMoney}`;

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-trade-receive-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog slide-up">
                <h3>🤝 Предложение от ${senderName}</h3>
                <div class="mp-trade-summary">
                    <div class="mp-trade-give">
                        <h4>Вы получите:</h4>
                        <p>${offerHtml}</p>
                    </div>
                    <div class="mp-trade-get">
                        <h4>Вы отдадите:</h4>
                        <p>${requestHtml}</p>
                    </div>
                </div>
                <div class="mp-dialog-btns">
                    <button class="btn success" onclick="MonopolyPlus.acceptTrade()">✅ Принять</button>
                    <button class="btn warning" onclick="MonopolyPlus.declineTrade()">❌ Отклонить</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    acceptTrade() {
        if (!this.tradeData) return;
        this.closeDialog('mp-trade-receive-overlay');
        Multiplayer.socket.emit('monopoly_trade_response', {
            odId: App.userId,
            accept: true,
            tradeId: this.tradeData.tradeId
        });
        this.tradeActive = false;
        this.tradeData = null;
    },

    declineTrade() {
        if (!this.tradeData) return;
        this.closeDialog('mp-trade-receive-overlay');
        Multiplayer.socket.emit('monopoly_trade_response', {
            odId: App.userId,
            accept: false,
            tradeId: this.tradeData.tradeId
        });
        this.tradeActive = false;
        this.tradeData = null;
        this.showToast('Сделка отклонена', 2000);
    },

    handleTradeComplete(data) {
        this.tradeActive = false;
        if (data.success) {
            this.showToast('🤝 Сделка завершена!', 2500);
        } else {
            this.showToast('❌ Сделка отклонена', 2000);
        }
        this.updateUI();
    },

    // =========================================
    // MY PROPERTIES PANEL
    // =========================================

    showMyProperties() {
        const myProps = Object.entries(this.properties)
            .filter(([idx, data]) => data.owner === App.userId)
            .map(([idx, data]) => ({ idx: parseInt(idx), ...data, cell: this.board[parseInt(idx)] }));

        if (myProps.length === 0) {
            this.showToast('У вас пока нет недвижимости', 2000);
            return;
        }

        // Group by color
        const grouped = {};
        myProps.forEach(prop => {
            const group = prop.cell.group || 'other';
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(prop);
        });

        let propsHtml = '';
        for (const [group, props] of Object.entries(grouped)) {
            const groupComplete = this.propertyGroups[group] &&
                this.propertyGroups[group].every(idx => this.properties[idx]?.owner === App.userId);

            propsHtml += `<div class="mp-prop-group ${groupComplete ? 'complete' : ''}">`;
            props.forEach(prop => {
                const canBuild = groupComplete && prop.houses < 5 && this.isMyTurn &&
                    this.myData.money >= (prop.cell.houseCost || 0);
                const housesDisplay = prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses);

                propsHtml += `
                    <div class="mp-prop-card" style="border-left: 5px solid ${this.colors[group] || '#666'}">
                        <div class="mp-prop-info">
                            <strong>${prop.cell.name}</strong>
                            <span>${housesDisplay || 'Пустой'}</span>
                        </div>
                        ${canBuild ? `
                            <button class="btn small primary" onclick="MonopolyPlus.buildHouse(${prop.idx})">
                                🏗️ +дом ($${prop.cell.houseCost})
                            </button>
                        ` : ''}
                    </div>
                `;
            });
            propsHtml += '</div>';
        }

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-props-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="mp-dialog mp-props-dialog slide-up">
                <h3>🏠 Ваша недвижимость</h3>
                <div class="mp-props-list">${propsHtml}</div>
                <button class="btn secondary" onclick="MonopolyPlus.closeDialog('mp-props-overlay')">Закрыть</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    buildHouse(propertyIndex) {
        Multiplayer.socket.emit('monopoly_build', {
            odId: App.userId,
            propertyIndex
        });
        this.closeDialog('mp-props-overlay');
    },

    // =========================================
    // CELL INFO
    // =========================================

    showCellInfo(index) {
        const cell = this.board[index];
        if (!cell) return;

        const propData = this.properties[index];
        const owner = propData ? this.players.find(p => p.odId === propData.owner) : null;
        const ownerName = owner ? (owner.odId === App.userId ? 'Вы' : owner.name) : 'Свободен';

        this.showToast(`${cell.fullName || cell.name} | ${ownerName}`, 2000);
    },

    showPlayerInfo(playerId) {
        const player = this.players.find(p => p.odId === playerId);
        if (!player) return;

        const propCount = Object.values(this.properties).filter(p => p.owner === playerId).length;
        this.showToast(`${player.name}: $${player.money} | 🏠${propCount}`, 2000);
    },

    // =========================================
    // OTHER HANDLERS
    // =========================================

    handlePropertyPurchased(data) {
        this.properties[data.propertyIndex] = { owner: data.playerId, houses: 0 };

        if (data.playerId === App.userId && this.myData) {
            this.myData.money = data.newMoney;
        }

        const cell = this.board[data.propertyIndex];
        const buyerName = data.playerId === App.userId ? 'Вы купили' :
            (this.players.find(p => p.odId === data.playerId)?.name + ' купил');
        this.showToast(`🏠 ${buyerName} ${cell.name}!`, 2500);

        // Animate purchase
        const cellEl = document.querySelector(`.mp-cell[data-index="${data.propertyIndex}"]`);
        if (cellEl) {
            cellEl.classList.add('purchase-glow');
            setTimeout(() => cellEl.classList.remove('purchase-glow'), 1000);
        }

        this.updateUI();
    },

    handleRentPaid(data) {
        if (data.payerId === App.userId && this.myData) {
            this.myData.money = data.payerMoney;
            this.showToast(`💸 Вы заплатили $${data.amount} аренды`, 2500);
        } else if (data.ownerId === App.userId && this.myData) {
            this.myData.money = data.ownerMoney;
            this.showToast(`💰 Получено $${data.amount} аренды!`, 2500);
        }
        this.updateUI();
    },

    handleCard(data) {
        const icon = data.type === 'chance' ? '❓' : '💰';
        const title = data.type === 'chance' ? 'ШАНС' : 'КАЗНА';

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.id = 'mp-card-overlay';
        overlay.onclick = () => this.closeDialog('mp-card-overlay');
        overlay.innerHTML = `
            <div class="mp-dialog mp-card-dialog ${data.type} slide-up" onclick="event.stopPropagation()">
                <div class="mp-card-icon">${icon}</div>
                <h3>${title}</h3>
                <p class="mp-card-text">${data.text}</p>
                <button class="btn primary" onclick="MonopolyPlus.closeDialog('mp-card-overlay')">OK</button>
            </div>
        `;
        document.body.appendChild(overlay);

        if (data.playerId === App.userId && this.myData && data.newMoney !== undefined) {
            this.myData.money = data.newMoney;
        }

        this.updateUI();
    },

    handleBuildResult(data) {
        if (data.success) {
            this.properties[data.propertyIndex].houses = data.houses;
            if (data.playerId === App.userId && this.myData) {
                this.myData.money = data.newMoney;
            }
            const cell = this.board[data.propertyIndex];
            this.showToast(`🏗️ Построен дом на ${cell.name}!`, 2000);
        }
        this.updateUI();
    },

    handleBankruptcy(data) {
        const name = data.playerId === App.userId ? 'Вы' : data.playerName;
        this.showToast(`💔 ${name} обанкротились!`, 3000);

        const idx = this.players.findIndex(p => p.odId === data.playerId);
        if (idx !== -1) this.players[idx].bankrupt = true;

        this.updateUI();
    },

    handleGameOver(data) {
        const isWinner = data.winner === App.userId;

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay fade-in';
        overlay.innerHTML = `
            <div class="mp-dialog mp-gameover-dialog slide-up">
                <h2>${isWinner ? '🎉 ПОБЕДА!' : '😔 Игра окончена'}</h2>
                <p>${isWinner ? 'Вы стали монополистом!' : (data.winnerName + ' победил!')}</p>
                <div class="mp-final-stats">
                    <div>💰 Итоговый капитал: $${data.finalMoney}</div>
                    <div>🏠 Недвижимость: ${data.propertiesCount} участков</div>
                </div>
                <div class="mp-dialog-btns">
                    <button class="btn primary" onclick="playAgain()">🔄 Снова</button>
                    <button class="btn secondary" onclick="exitToMenu()">🏠 Меню</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        App.showVictory && App.showVictory(isWinner);
    },

    // =========================================
    // END TURN
    // =========================================

    endTurn() {
        if (!this.isMyTurn || this.canRollDice) {
            this.showToast('Сначала бросьте кости!', 2000);
            return;
        }
        if (this.auctionActive || this.tradeActive) return;

        Multiplayer.socket.emit('monopoly_end_turn', { odId: App.userId });
        this.showToast('Ход завершён', 1500);
    },

    payJailFine() {
        if (!this.isMyTurn || !this.myData?.inJail) return;
        if (this.myData.money < 50) {
            this.showToast('Недостаточно денег ($50)', 2000);
            return;
        }
        Multiplayer.socket.emit('monopoly_pay_jail', { odId: App.userId });
    },

    // =========================================
    // UTILITIES
    // =========================================

    closeDialog(id) {
        const el = id ? document.getElementById(id) : document.querySelector('.mp-overlay');
        if (el) {
            el.classList.add('fade-out');
            setTimeout(() => el.remove(), 200);
        }
    },

    showToast(message, duration = 3000) {
        document.querySelector('.mp-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = 'mp-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// =========================================
// GLOBAL FUNCTIONS
// =========================================

let monopolySettings = { playerCount: 2 };

function selectMonopolyPlayerCount(count) {
    monopolySettings.playerCount = count;
    document.querySelectorAll('#monopoly-setup .player-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`#monopoly-setup .player-btn[data-count="${count}"]`)?.classList.add('selected');
    App.haptic && App.haptic('light');
}

function createMonopolyRoom() {
    App.currentGame = 'monopoly';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🎲 Монополия';

    const isPrivate = document.getElementById('monopoly-private-toggle')?.checked || false;
    const password = document.getElementById('monopoly-password')?.value.trim() || null;

    Multiplayer.createRoom('monopoly', isPrivate ? password : null, !isPrivate, {
        maxPlayers: monopolySettings.playerCount
    });
}

function monopolyRoll() {
    MonopolyPlus.roll();
}

// Backward compatibility
const Monopoly = MonopolyPlus;
