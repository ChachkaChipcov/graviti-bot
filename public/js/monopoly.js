// Monopoly Plus - Classic Board Layout
// Telegram Mini App Version

const MonopolyPlus = {
    room: null,
    playerCount: 2,

    // Player tokens
    playerTokens: ['🎩', '🚗', '🐕', '🚂', '⛵', '👢'],
    playerColors: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'],

    // Property color groups
    colors: {
        brown: '#8B4513',
        lightBlue: '#AAD4E5',
        pink: '#D93A96',
        orange: '#F7941D',
        red: '#ED1B24',
        yellow: '#FEF200',
        green: '#1FB25A',
        darkBlue: '#0072BB'
    },

    // Classic 40-square board
    board: [
        // Bottom row (0-10) - right to left
        { id: 0, type: 'corner', name: 'СТАРТ', icon: '🏁' },
        { id: 1, type: 'property', name: 'Житомирская', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250] },
        { id: 2, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 3, type: 'property', name: 'Нагатинская', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450] },
        { id: 4, type: 'tax', name: 'Налог', amount: 200, icon: '💸' },
        { id: 5, type: 'railroad', name: 'Рижская ЖД', price: 200, icon: '🚂' },
        { id: 6, type: 'property', name: 'Варшавская', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
        { id: 7, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 8, type: 'property', name: 'Огарёва', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550] },
        { id: 9, type: 'property', name: 'Парковая', group: 'lightBlue', price: 120, rent: [8, 40, 100, 300, 450, 600] },
        { id: 10, type: 'corner', name: 'ТЮРЬМА', icon: '🔒' },
        // Left column (11-19) - bottom to top
        { id: 11, type: 'property', name: 'Полянка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
        { id: 12, type: 'utility', name: 'Электро', price: 150, icon: '💡' },
        { id: 13, type: 'property', name: 'Сретенка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750] },
        { id: 14, type: 'property', name: 'Ростовская', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900] },
        { id: 15, type: 'railroad', name: 'Курская ЖД', price: 200, icon: '🚂' },
        { id: 16, type: 'property', name: 'Рязанский', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
        { id: 17, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 18, type: 'property', name: 'Вавилова', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950] },
        { id: 19, type: 'property', name: 'Рублёвка', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000] },
        { id: 20, type: 'corner', name: 'ПАРКОВКА', icon: '🅿️' },
        // Top row (21-30) - left to right
        { id: 21, type: 'property', name: 'Тверская', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
        { id: 22, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 23, type: 'property', name: 'Пушкинская', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050] },
        { id: 24, type: 'property', name: 'Маяковского', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100] },
        { id: 25, type: 'railroad', name: 'Казанская ЖД', price: 200, icon: '🚂' },
        { id: 26, type: 'property', name: 'Грузинский', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
        { id: 27, type: 'property', name: 'Чайковская', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150] },
        { id: 28, type: 'utility', name: 'Вода', price: 150, icon: '🚿' },
        { id: 29, type: 'property', name: 'Смоленская', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200] },
        { id: 30, type: 'corner', name: 'В ТЮРЬМУ', icon: '👮' },
        // Right column (31-39) - top to bottom
        { id: 31, type: 'property', name: 'Щусева', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
        { id: 32, type: 'property', name: 'Гоголевский', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275] },
        { id: 33, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 34, type: 'property', name: 'Кутузовский', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400] },
        { id: 35, type: 'railroad', name: 'Ленингр. ЖД', price: 200, icon: '🚂' },
        { id: 36, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 37, type: 'property', name: 'Бронная', group: 'darkBlue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500] },
        { id: 38, type: 'tax', name: 'Роскошь', amount: 100, icon: '💎' },
        { id: 39, type: 'property', name: 'АРБАТ', group: 'darkBlue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000] }
    ],

    // Game state
    players: [],
    currentPlayer: null,
    myData: null,
    isMyTurn: false,
    canRollDice: true,
    lastDice: [0, 0],
    properties: {},

    // Initialize
    init(room) {
        this.room = room;
        this.renderBoard();
        this.updateUI();
    },

    // Get short name for cell (max 3 chars)
    getShortName(cell) {
        if (cell.type === 'corner') {
            if (cell.name === 'СТАРТ') return 'GO';
            if (cell.name === 'ТЮРЬМА') return '🔒';
            if (cell.name === 'ПАРКОВКА') return '🅿️';
            if (cell.name === 'В ТЮРЬМУ') return '👮';
        }
        if (cell.icon) return cell.icon;
        return cell.name.substring(0, 3).toUpperCase();
    },

    // Render classic board
    renderBoard() {
        const boardEl = document.getElementById('mp-board');
        if (!boardEl) return;

        // Create 11x11 grid (corners + 9 cells per side)
        let html = '';

        // Board positions mapping (cell index -> grid position)
        // Grid is 11x11, positions are [row, col]
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

    // Calculate grid positions for each cell
    calculateGridPositions() {
        const pos = {};

        // Bottom row (0-10): row 10, col 10 down to 0 (right to left)
        for (let i = 0; i <= 10; i++) {
            pos[`10,${10 - i}`] = i;
        }

        // Left column (11-19): col 0, row 9 down to 1 (bottom to top, skip corners)
        for (let i = 0; i < 9; i++) {
            pos[`${9 - i},0`] = 11 + i;
        }

        // Top row (20-30): row 0, col 0 to 10 (left to right)
        // Position 20 is at row 0, col 0 (top-left corner)
        for (let i = 0; i <= 10; i++) {
            pos[`0,${i}`] = 20 + i;
        }

        // Right column (31-39): col 10, row 1 to 9 (top to bottom, skip corners)
        for (let i = 0; i < 9; i++) {
            pos[`${1 + i},10`] = 31 + i;
        }

        return pos;
    },

    // Render single cell
    renderCell(cell, index, row, col) {
        const isCorner = cell.type === 'corner';
        const colorStyle = cell.group ? `--cell-color: ${this.colors[cell.group]}` : '';
        const propData = this.properties[index];
        const ownerIdx = propData ? this.players.findIndex(p => p.odId === propData.owner) : -1;

        // Find players on this cell
        const playersHere = this.players
            .filter(p => p.position === index)
            .map((p, i) => {
                const idx = this.players.findIndex(pl => pl.odId === p.odId);
                return `<span class="mp-token" style="background:${this.playerColors[idx]}">${this.playerTokens[idx]}</span>`;
            }).join('');

        const ownerDot = ownerIdx >= 0 ?
            `<div class="mp-owner-dot" style="background:${this.playerColors[ownerIdx]}"></div>` : '';

        const houses = propData?.houses || 0;
        const houseDisplay = houses === 5 ? '🏨' : (houses > 0 ? '🏠'.repeat(houses) : '');

        return `
            <div class="mp-cell ${isCorner ? 'corner' : ''} ${cell.group || ''}" 
                 data-index="${index}"
                 style="grid-row:${row + 1};grid-column:${col + 1};${colorStyle}"
                 onclick="MonopolyPlus.showCellInfo(${index})">
                <div class="mp-cell-color"></div>
                <div class="mp-cell-body">
                    <span class="mp-cell-name">${this.getShortName(cell)}</span>
                    ${cell.price ? `<span class="mp-cell-price">$${cell.price}</span>` : ''}
                    ${houseDisplay ? `<span class="mp-houses">${houseDisplay}</span>` : ''}
                </div>
                ${ownerDot}
                <div class="mp-cell-tokens">${playersHere}</div>
            </div>
        `;
    },

    // Update UI
    updateUI() {
        this.updateStatus();
        this.updatePlayerInfo();
        this.updateButtons();
        this.updateDice();
        this.renderBoard();
    },

    // Update status text
    updateStatus() {
        const statusEl = document.getElementById('mp-status');
        if (!statusEl) return;

        if (this.isMyTurn) {
            if (this.myData?.inJail) {
                statusEl.textContent = '🔒 Вы в тюрьме';
            } else if (this.canRollDice) {
                statusEl.textContent = '🎲 Бросьте кости';
            } else {
                statusEl.textContent = '👆 Выполните действие';
            }
        } else {
            const name = this.players.find(p => p.odId === this.currentPlayer)?.name || '';
            statusEl.textContent = `Ход: ${name}`;
        }
    },

    // Update player info panel
    updatePlayerInfo() {
        const infoEl = document.getElementById('mp-my-info');
        if (infoEl && this.myData) {
            const propCount = Object.values(this.properties).filter(p => p.owner === App.userId).length;
            infoEl.innerHTML = `
                <span class="mp-money">💵 $${this.myData.money}</span>
                <span class="mp-properties">🏠 ${propCount}</span>
            `;
        }

        const playersEl = document.getElementById('mp-players');
        if (playersEl) {
            playersEl.innerHTML = this.players.map((p, idx) => {
                const isMe = p.odId === App.userId;
                const isCurrent = p.odId === this.currentPlayer;
                return `<span class="mp-player-chip ${isCurrent ? 'active' : ''} ${isMe ? 'me' : ''}" style="border-color:${this.playerColors[idx]}">
                    ${this.playerTokens[idx]} ${isMe ? 'Вы' : p.name.substring(0, 6)}
                </span>`;
            }).join('');
        }
    },

    // Update buttons
    updateButtons() {
        const rollBtn = document.getElementById('mp-roll-btn');
        const endBtn = document.getElementById('mp-end-btn');

        if (rollBtn) {
            rollBtn.disabled = !this.isMyTurn || !this.canRollDice;
            rollBtn.textContent = this.isMyTurn && this.canRollDice ? '🎲 Бросить кости' : '⏳ Ждите';
        }

        if (endBtn) {
            endBtn.disabled = !this.isMyTurn || this.canRollDice;
        }
    },

    // Update dice display
    updateDice() {
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

        if (die1 && this.lastDice[0]) die1.textContent = diceEmojis[this.lastDice[0]] || '🎲';
        if (die2 && this.lastDice[1]) die2.textContent = diceEmojis[this.lastDice[1]] || '🎲';
    },

    // Roll dice
    roll() {
        if (!this.isMyTurn || !this.canRollDice) return;

        App.haptic('heavy');

        // Animate
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        if (die1) die1.classList.add('rolling');
        if (die2) die2.classList.add('rolling');

        Multiplayer.socket.emit('monopoly_roll', { odId: App.userId });
    },

    // Handle game start
    handleGameStart(data) {
        this.players = data.players || [];
        this.myData = data.myData;
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.canRollDice = true;
        this.properties = {};
        this.lastDice = [0, 0];

        this.updateUI();
    },

    // Handle dice result
    handleDiceResult(data) {
        this.lastDice = data.dice;
        this.canRollDice = data.canRollAgain && !data.wentToJail;

        // Remove animation
        document.querySelectorAll('.mp-die').forEach(d => d.classList.remove('rolling'));

        // Update player position
        const playerIdx = this.players.findIndex(p => p.odId === data.playerId);
        if (playerIdx !== -1) {
            this.players[playerIdx].position = data.newPosition;
            this.players[playerIdx].money = data.money;
        }

        if (data.playerId === App.userId && this.myData) {
            this.myData.position = data.newPosition;
            this.myData.money = data.money;
            if (data.wentToJail) this.myData.inJail = true;
        }

        // Show notification for doubles
        if (data.isDoubles && !data.wentToJail) {
            this.showToast(`🎲 Дубль! Бросьте ещё раз`);
        }

        if (data.wentToJail) {
            this.showToast('👮 Три дубля - в тюрьму!');
        }

        this.updateUI();

        // Handle landing
        if (data.playerId === App.userId && !data.wentToJail) {
            const cell = this.board[data.newPosition];
            this.handleLanding(cell, data.newPosition);
        }
    },

    // Handle turn update
    handleTurnUpdate(data) {
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = data.currentPlayer === App.userId;
        this.canRollDice = data.canRoll;
        this.properties = data.properties || {};

        if (data.myData) this.myData = data.myData;
        if (data.players) this.players = data.players;

        this.updateUI();
    },

    // Handle landing on cell
    handleLanding(cell, position) {
        if (!cell || !this.isMyTurn) return;

        if ((cell.type === 'property' || cell.type === 'railroad' || cell.type === 'utility') &&
            !this.properties[position]) {
            this.showBuyDialog(position);
        }
    },

    // Show buy dialog
    showBuyDialog(position) {
        const cell = this.board[position];
        if (!cell || !this.isMyTurn) return;

        const canAfford = this.myData.money >= cell.price;
        const colorBar = cell.group ? `border-top: 6px solid ${this.colors[cell.group]}` : '';

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog" style="${colorBar}">
                <h3>${cell.name}</h3>
                <div class="mp-dialog-info">
                    <p>💰 Цена: <b>$${cell.price}</b></p>
                    ${cell.rent ? `<p>🏠 Аренда: <b>$${cell.rent[0]}</b></p>` : ''}
                    <p>💵 У вас: <b>$${this.myData.money}</b></p>
                </div>
                <div class="mp-dialog-btns">
                    <button class="btn primary" ${!canAfford ? 'disabled' : ''} onclick="MonopolyPlus.buyProperty(${position})">
                        Купить
                    </button>
                    <button class="btn secondary" onclick="MonopolyPlus.closeDialog()">
                        Пропустить
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Buy property
    buyProperty(position) {
        this.closeDialog();
        Multiplayer.socket.emit('monopoly_buy', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    // Close dialog
    closeDialog() {
        document.querySelector('.mp-overlay')?.remove();
    },

    // Show cell info
    showCellInfo(index) {
        const cell = this.board[index];
        if (!cell) return;

        const propData = this.properties[index];
        const owner = propData ? this.players.find(p => p.odId === propData.owner) : null;
        const ownerName = owner ? (owner.odId === App.userId ? 'Вы' : owner.name) : null;

        let info = `<h3>${cell.name}</h3>`;
        if (cell.price) info += `<p>Цена: $${cell.price}</p>`;
        if (ownerName) info += `<p>Владелец: ${ownerName}</p>`;
        if (propData?.houses) info += `<p>Дома: ${propData.houses}</p>`;

        this.showToast(cell.name + (ownerName ? ` (${ownerName})` : ''));
    },

    // Handle property purchased
    handlePropertyPurchased(data) {
        this.properties[data.propertyIndex] = {
            owner: data.playerId,
            houses: 0
        };

        if (data.playerId === App.userId && this.myData) {
            this.myData.money = data.newMoney;
        }

        const cell = this.board[data.propertyIndex];
        const name = data.playerId === App.userId ? 'Вы купили' :
            (this.players.find(p => p.odId === data.playerId)?.name + ' купил');
        this.showToast(`🏠 ${name} ${cell.name}`);

        this.updateUI();
    },

    // Handle rent paid
    handleRentPaid(data) {
        if (data.payerId === App.userId) {
            this.myData.money = data.payerMoney;
            this.showToast(`💸 Вы заплатили $${data.amount} аренды`);
        } else if (data.ownerId === App.userId) {
            this.myData.money = data.ownerMoney;
            this.showToast(`💰 Получено $${data.amount} аренды`);
        }
        this.updateUI();
    },

    // Handle card drawn
    handleCard(data) {
        const icon = data.type === 'chance' ? '❓' : '💰';
        this.showToast(`${icon} ${data.text}`, 4000);
        this.updateUI();
    },

    // Handle build result
    handleBuildResult(data) {
        if (data.success) {
            this.properties[data.propertyIndex].houses = data.houses;
            if (data.playerId === App.userId) {
                this.myData.money = data.newMoney;
            }
            this.showToast(`🏗️ Построен дом`);
            this.updateUI();
        }
    },

    // Handle bankruptcy
    handleBankruptcy(data) {
        const name = data.playerId === App.userId ? 'Вы' : data.playerName;
        this.showToast(`💔 ${name} обанкротились!`);

        const idx = this.players.findIndex(p => p.odId === data.playerId);
        if (idx !== -1) this.players[idx].bankrupt = true;

        this.updateUI();
    },

    // Handle game over
    handleGameOver(data) {
        const isWinner = data.winner === App.userId;

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog center">
                <h2>${isWinner ? '🎉 ПОБЕДА!' : '😔 Игра окончена'}</h2>
                <p>${isWinner ? 'Вы стали монополистом!' : (data.winnerName + ' победил!')}</p>
                <p>💰 Капитал: $${data.finalMoney}</p>
                <div class="mp-dialog-btns">
                    <button class="btn primary" onclick="playAgain()">🔄 Снова</button>
                    <button class="btn secondary" onclick="exitToMenu()">🏠 Меню</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        App.showVictory(isWinner);
    },

    // End turn
    endTurn() {
        if (!this.isMyTurn) return;
        Multiplayer.socket.emit('monopoly_end_turn', { odId: App.userId });
    },

    // Show toast notification
    showToast(message, duration = 3000) {
        document.querySelector('.mp-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = 'mp-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
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
