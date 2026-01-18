// Monopoly Plus - Complete Game Implementation
// Telegram Mini App Adaptation

const MonopolyPlus = {
    room: null,
    playerCount: 2,

    // Player tokens (emoji figures)
    playerTokens: ['🎩', '🚗', '🐕', '🚂', '⛵', '👢'],
    playerColors: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'],

    // Property color groups (Authentic Monopoly Plus colors)
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

    // Complete 40-square board (Classic Monopoly layout)
    board: [
        // Bottom row (0-10)
        { id: 0, type: 'corner', name: 'СТАРТ', icon: '🏁', action: 'go' },
        { id: 1, type: 'property', name: 'Житомирская', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
        { id: 2, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 3, type: 'property', name: 'Нагатинская', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
        { id: 4, type: 'tax', name: 'Подоходный налог', amount: 200, icon: '💸' },
        { id: 5, type: 'railroad', name: 'Рижская ЖД', price: 200, icon: '🚂' },
        { id: 6, type: 'property', name: 'Варшавская', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
        { id: 7, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 8, type: 'property', name: 'Огарёва', group: 'lightBlue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
        { id: 9, type: 'property', name: 'Первая Парковая', group: 'lightBlue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
        { id: 10, type: 'corner', name: 'ТЮРЬМА', icon: '🔒', action: 'jail' },

        // Left column (11-20)
        { id: 11, type: 'property', name: 'Полянка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
        { id: 12, type: 'utility', name: 'Электростанция', price: 150, icon: '💡' },
        { id: 13, type: 'property', name: 'Сретенка', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
        { id: 14, type: 'property', name: 'Ростовская', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
        { id: 15, type: 'railroad', name: 'Курская ЖД', price: 200, icon: '🚂' },
        { id: 16, type: 'property', name: 'Рязанский проспект', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
        { id: 17, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 18, type: 'property', name: 'Вавилова', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
        { id: 19, type: 'property', name: 'Рублёвка', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
        { id: 20, type: 'corner', name: 'ПАРКОВКА', icon: '🅿️', action: 'parking' },

        // Top row (21-30)
        { id: 21, type: 'property', name: 'Тверская', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
        { id: 22, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 23, type: 'property', name: 'Пушкинская', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
        { id: 24, type: 'property', name: 'Маяковская', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
        { id: 25, type: 'railroad', name: 'Казанская ЖД', price: 200, icon: '🚂' },
        { id: 26, type: 'property', name: 'Грузинский вал', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
        { id: 27, type: 'property', name: 'Чайковского', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
        { id: 28, type: 'utility', name: 'Водоканал', price: 150, icon: '🚿' },
        { id: 29, type: 'property', name: 'Смоленская', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
        { id: 30, type: 'corner', name: 'В ТЮРЬМУ', icon: '👮', action: 'gotoJail' },

        // Right column (31-39)
        { id: 31, type: 'property', name: 'Щусева', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
        { id: 32, type: 'property', name: 'Гоголевский бульвар', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
        { id: 33, type: 'chest', name: 'Казна', icon: '💰' },
        { id: 34, type: 'property', name: 'Кутузовский проспект', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
        { id: 35, type: 'railroad', name: 'Ленинградская ЖД', price: 200, icon: '🚂' },
        { id: 36, type: 'chance', name: 'Шанс', icon: '❓' },
        { id: 37, type: 'property', name: 'Малая Бронная', group: 'darkBlue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
        { id: 38, type: 'tax', name: 'Налог на роскошь', amount: 100, icon: '💎' },
        { id: 39, type: 'property', name: 'АРБАТ', group: 'darkBlue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 }
    ],

    // Chance cards (16 cards)
    chanceCards: [
        { id: 1, text: 'Проезд до СТАРТА. Получите $200', action: 'moveTo', value: 0, bonus: 200 },
        { id: 2, text: 'Отправляйтесь в тюрьму', action: 'goToJail' },
        { id: 3, text: 'Проезд до Тверской', action: 'moveTo', value: 21 },
        { id: 4, text: 'Проезд до Рижской ЖД', action: 'moveTo', value: 5 },
        { id: 5, text: 'Банк выплачивает дивиденды $50', action: 'receive', value: 50 },
        { id: 6, text: 'Освобождение из тюрьмы', action: 'jailCard' },
        { id: 7, text: 'Отступите на 3 клетки назад', action: 'moveBack', value: 3 },
        { id: 8, text: 'Ремонт улиц: $25 за дом, $100 за отель', action: 'streetRepair', house: 25, hotel: 100 },
        { id: 9, text: 'Штраф за превышение скорости $15', action: 'pay', value: 15 },
        { id: 10, text: 'Поездка на Ленинградскую ЖД', action: 'moveTo', value: 35 },
        { id: 11, text: 'Избраны председателем. Заплатите каждому $50', action: 'payEach', value: 50 },
        { id: 12, text: 'Кредит на строительство: получите $150', action: 'receive', value: 150 },
        { id: 13, text: 'Вы выиграли в лотерею! Получите $100', action: 'receive', value: 100 },
        { id: 14, text: 'Пьянка! Штраф $20', action: 'pay', value: 20 },
        { id: 15, text: 'Идите до ближайшей ЖД. Платите двойную аренду!', action: 'nearestRailroad', multiplier: 2 },
        { id: 16, text: 'Идите до ближайшей компании. Бросьте кости и платите x10', action: 'nearestUtility' }
    ],

    // Community Chest cards (16 cards)
    chestCards: [
        { id: 1, text: 'Проезд до СТАРТА. Получите $200', action: 'moveTo', value: 0, bonus: 200 },
        { id: 2, text: 'Банковская ошибка в вашу пользу. Получите $200', action: 'receive', value: 200 },
        { id: 3, text: 'Оплата услуг доктора $50', action: 'pay', value: 50 },
        { id: 4, text: 'Продажа акций: получите $50', action: 'receive', value: 50 },
        { id: 5, text: 'Освобождение из тюрьмы', action: 'jailCard' },
        { id: 6, text: 'Отправляйтесь в тюрьму', action: 'goToJail' },
        { id: 7, text: 'Праздники! Получите от каждого $10', action: 'collectEach', value: 10 },
        { id: 8, text: 'Подоходный налог: получите $20 возврат', action: 'receive', value: 20 },
        { id: 9, text: 'День рождения! Получите $10 от каждого', action: 'collectEach', value: 10 },
        { id: 10, text: 'Страховка: получите $100', action: 'receive', value: 100 },
        { id: 11, text: 'Плата за обучение $50', action: 'pay', value: 50 },
        { id: 12, text: 'Получите наследство $100', action: 'receive', value: 100 },
        { id: 13, text: 'Оплата больничных $100', action: 'pay', value: 100 },
        { id: 14, text: 'Выигрыш в конкурсе красоты $10', action: 'receive', value: 10 },
        { id: 15, text: 'Ремонт: $40 за дом, $115 за отель', action: 'streetRepair', house: 40, hotel: 115 },
        { id: 16, text: 'Продажа старых вещей: получите $45', action: 'receive', value: 45 }
    ],

    // Property groups (for monopoly detection)
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

    railroads: [5, 15, 25, 35],
    utilities: [12, 28],

    // Game state
    players: [],
    currentPlayer: null,
    myData: null,
    isMyTurn: false,
    canRollDice: true,
    lastDice: [0, 0],
    doublesCount: 0,
    properties: {},
    chanceDeck: [],
    chestDeck: [],
    jailFreeCards: {},

    // Initialize game
    init(room) {
        this.room = room;
        this.shuffleDecks();
        this.renderBoard();
        this.updateUI();
    },

    // Shuffle card decks
    shuffleDecks() {
        this.chanceDeck = [...this.chanceCards].sort(() => Math.random() - 0.5);
        this.chestDeck = [...this.chestCards].sort(() => Math.random() - 0.5);
    },

    // Get property group color
    getGroupColor(group) {
        return this.colors[group] || '#666';
    },

    // Render game board
    renderBoard() {
        const boardEl = document.getElementById('mp-board');
        if (!boardEl) return;

        let html = '';
        this.board.forEach((cell, index) => {
            html += this.renderCell(cell, index);
        });

        boardEl.innerHTML = html;
        this.renderPlayerTokens();
    },

    // Render single board cell
    renderCell(cell, index) {
        const isCorner = cell.type === 'corner';
        const colorStyle = cell.group ? `style="--cell-color: ${this.getGroupColor(cell.group)}"` : '';
        const propData = this.properties[index];
        const ownerIndex = propData ? this.players.findIndex(p => p.odId === propData.owner) : -1;
        const ownerIndicator = ownerIndex >= 0 ? `<div class="mp-owner" style="background: ${this.playerColors[ownerIndex]}"></div>` : '';

        // Houses/hotel display
        let buildingHtml = '';
        if (propData && propData.houses > 0) {
            if (propData.houses === 5) {
                buildingHtml = '<div class="mp-hotel">🏨</div>';
            } else {
                buildingHtml = `<div class="mp-houses">${'🏠'.repeat(propData.houses)}</div>`;
            }
        }

        const cellClass = `mp-cell ${cell.type} ${isCorner ? 'corner' : ''} ${cell.group || ''}`;

        return `
            <div class="${cellClass}" data-index="${index}" ${colorStyle} onclick="MonopolyPlus.showCellInfo(${index})">
                <div class="mp-cell-color"></div>
                <div class="mp-cell-content">
                    ${cell.icon ? `<span class="mp-icon">${cell.icon}</span>` : ''}
                    <span class="mp-name">${this.getShortName(cell)}</span>
                    ${cell.price ? `<span class="mp-price">$${cell.price}</span>` : ''}
                </div>
                ${ownerIndicator}
                ${buildingHtml}
                <div class="mp-tokens" id="mp-tokens-${index}"></div>
            </div>
        `;
    },

    // Get short name for cell
    getShortName(cell) {
        if (cell.name.length > 12) {
            return cell.name.substring(0, 10) + '...';
        }
        return cell.name;
    },

    // Render player tokens on board
    renderPlayerTokens() {
        // Clear all existing tokens
        document.querySelectorAll('.mp-tokens').forEach(el => el.innerHTML = '');

        // Place tokens
        this.players.forEach((player, idx) => {
            const pos = player.position || 0;
            const tokenContainer = document.getElementById(`mp-tokens-${pos}`);
            if (tokenContainer) {
                const token = document.createElement('span');
                token.className = `mp-token ${player.odId === App.userId ? 'my-token' : ''}`;
                token.style.background = this.playerColors[idx];
                token.textContent = this.playerTokens[idx];
                token.setAttribute('data-player', player.odId);
                tokenContainer.appendChild(token);
            }
        });

        // Scroll to current player position
        setTimeout(() => this.scrollToPlayer(), 100);
    },

    // Scroll board to show current player
    scrollToPlayer() {
        if (!this.myData) return;
        const cell = document.querySelector(`[data-index="${this.myData.position}"]`);
        if (cell) {
            cell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    },

    // Update all UI elements
    updateUI() {
        this.updatePlayersBar();
        this.updateStatusBar();
        this.updateControls();
        this.updateMoneyDisplay();
        this.renderPlayerTokens();
    },

    // Update players bar
    updatePlayersBar() {
        const playersEl = document.getElementById('mp-players');
        if (!playersEl) return;

        playersEl.innerHTML = this.players.map((p, idx) => {
            const isMe = p.odId === App.userId;
            const isCurrent = p.odId === this.currentPlayer;
            const playerState = p;
            const jailIcon = playerState.inJail ? '🔒' : '';

            return `
                <div class="mp-player ${isCurrent ? 'active' : ''} ${isMe ? 'me' : ''} ${playerState.bankrupt ? 'bankrupt' : ''}">
                    <span class="mp-player-token" style="background: ${this.playerColors[idx]}">${this.playerTokens[idx]}</span>
                    <span class="mp-player-name">${isMe ? 'Вы' : p.name}</span>
                    <span class="mp-player-money">$${playerState.money || 0}${jailIcon}</span>
                </div>
            `;
        }).join('');
    },

    // Update status bar
    updateStatusBar() {
        const statusEl = document.getElementById('mp-status');
        if (!statusEl) return;

        if (this.isMyTurn) {
            if (this.myData?.inJail) {
                statusEl.innerHTML = '<span class="status-jail">🔒 Вы в тюрьме! Платите $50 или бросьте дубль</span>';
            } else if (this.canRollDice) {
                statusEl.innerHTML = '<span class="status-your-turn">🎲 Ваш ход! Бросьте кости</span>';
            } else {
                statusEl.innerHTML = '<span class="status-action">Выполните действие или завершите ход</span>';
            }
        } else {
            const currentPlayerName = this.players.find(p => p.odId === this.currentPlayer)?.name || 'Игрок';
            statusEl.innerHTML = `<span class="status-waiting">⏳ Ход: ${currentPlayerName}</span>`;
        }
    },

    // Update money display
    updateMoneyDisplay() {
        const moneyEl = document.getElementById('mp-money');
        if (moneyEl && this.myData) {
            moneyEl.textContent = `$${this.myData.money}`;
        }
    },

    // Update control buttons
    updateControls() {
        const rollBtn = document.getElementById('mp-roll-btn');
        if (rollBtn) {
            rollBtn.disabled = !this.isMyTurn || !this.canRollDice;
            if (this.myData?.inJail && this.canRollDice) {
                rollBtn.innerHTML = '🎲 Бросить (дубль = свобода)';
            } else {
                rollBtn.innerHTML = this.isMyTurn ? '🎲 Бросить кости' : '⏳ Ждите...';
            }
        }

        const actionsEl = document.getElementById('mp-actions');
        if (actionsEl) {
            const showEndTurn = this.isMyTurn && !this.canRollDice;
            const showJailPay = this.isMyTurn && this.myData?.inJail;
            const hasJailCard = this.jailFreeCards[App.userId] > 0;

            actionsEl.innerHTML = `
                ${showJailPay ? `
                    <button class="btn warning" onclick="MonopolyPlus.payJailFine()">💵 Заплатить $50</button>
                    ${hasJailCard ? `<button class="btn secondary" onclick="MonopolyPlus.useJailCard()">🎫 Использовать карту</button>` : ''}
                ` : ''}
                ${showEndTurn ? `<button class="btn primary" onclick="MonopolyPlus.endTurn()">✅ Конец хода</button>` : ''}
                <button class="btn secondary" onclick="MonopolyPlus.showMyProperties()" ${!this.isMyTurn ? 'disabled' : ''}>🏠 Мои участки</button>
            `;
        }
    },

    // Roll dice
    roll() {
        if (!this.isMyTurn || !this.canRollDice) return;
        App.haptic('heavy');

        // Animate dice
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        if (die1 && die2) {
            die1.classList.add('rolling');
            die2.classList.add('rolling');
        }

        Multiplayer.socket.emit('monopoly_roll', { odId: App.userId });
    },

    // Handle game start event
    handleGameStart(data) {
        this.players = data.players || [];
        this.myData = data.myData;
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = this.currentPlayer === App.userId;
        this.canRollDice = true;
        this.properties = {};
        this.doublesCount = 0;
        this.jailFreeCards = {};

        this.renderBoard();
        this.updateUI();
    },

    // Handle dice result
    handleDiceResult(data) {
        this.lastDice = data.dice;
        this.canRollDice = data.canRollAgain && !data.wentToJail;
        this.doublesCount = data.doublesCount || 0;

        // Remove dice animation
        const die1 = document.getElementById('mp-die1');
        const die2 = document.getElementById('mp-die2');
        if (die1 && die2) {
            die1.classList.remove('rolling');
            die2.classList.remove('rolling');
            die1.textContent = this.getDiceEmoji(data.dice[0]);
            die2.textContent = this.getDiceEmoji(data.dice[1]);
        }

        // Animate player movement
        if (data.playerId === App.userId && this.myData) {
            this.animateMovement(this.myData.position, data.newPosition, () => {
                this.myData.position = data.newPosition;
                this.myData.money = data.money;
                this.renderPlayerTokens();

                // Handle landing after animation
                if (!data.wentToJail) {
                    this.handleLanding(data.newPosition);
                }
            });
        } else {
            // Update other player position
            const playerIdx = this.players.findIndex(p => p.odId === data.playerId);
            if (playerIdx !== -1) {
                this.players[playerIdx].position = data.newPosition;
                this.players[playerIdx].money = data.money;
            }
            this.renderPlayerTokens();
        }

        // Show doubles notification
        if (data.isDoubles && !data.wentToJail) {
            this.showNotification(`🎲 Дубль! ${data.dice[0]}+${data.dice[0]} - бросьте ещё раз!`);
        }

        if (data.wentToJail) {
            this.showNotification('👮 Три дубля подряд! Вы отправляетесь в тюрьму!');
        }

        this.updateUI();
    },

    // Get dice emoji
    getDiceEmoji(value) {
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value] || '🎲';
    },

    // Animate player movement
    animateMovement(from, to, callback) {
        let current = from;
        const steps = [];

        // Calculate path
        while (current !== to) {
            current = (current + 1) % 40;
            steps.push(current);
        }

        // Animate each step
        let stepIndex = 0;
        const animateStep = () => {
            if (stepIndex < steps.length) {
                // Update visual position
                const cell = document.querySelector(`[data-index="${steps[stepIndex]}"]`);
                if (cell) {
                    cell.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                }
                stepIndex++;
                setTimeout(animateStep, 150);
            } else {
                callback();
            }
        };

        if (steps.length > 0) {
            animateStep();
        } else {
            callback();
        }
    },

    // Handle landing on a cell
    handleLanding(position) {
        const cell = this.board[position];
        if (!cell) return;

        switch (cell.type) {
            case 'property':
            case 'railroad':
            case 'utility':
                if (!this.properties[position]) {
                    // Unowned - offer to buy
                    this.showBuyDialog(position);
                }
                break;
            case 'chance':
                // Card handled by server
                break;
            case 'chest':
                // Card handled by server
                break;
            case 'corner':
                if (cell.action === 'gotoJail') {
                    this.showNotification('👮 В тюрьму!');
                }
                break;
        }
    },

    // Show buy property dialog
    showBuyDialog(position) {
        const cell = this.board[position];
        if (!cell || !this.isMyTurn) return;

        const colorStyle = cell.group ? `border-top: 6px solid ${this.getGroupColor(cell.group)}` : '';

        let rentInfo = '';
        if (cell.rent) {
            rentInfo = `
                <div class="mp-rent-table">
                    <div class="rent-row"><span>Аренда:</span><span>$${cell.rent[0]}</span></div>
                    <div class="rent-row"><span>С 1 домом:</span><span>$${cell.rent[1]}</span></div>
                    <div class="rent-row"><span>С 2 домами:</span><span>$${cell.rent[2]}</span></div>
                    <div class="rent-row"><span>С 3 домами:</span><span>$${cell.rent[3]}</span></div>
                    <div class="rent-row"><span>С 4 домами:</span><span>$${cell.rent[4]}</span></div>
                    <div class="rent-row"><span>С отелем:</span><span>$${cell.rent[5]}</span></div>
                    <div class="rent-row"><span>Стоимость дома:</span><span>$${cell.houseCost}</span></div>
                </div>
            `;
        } else if (cell.type === 'railroad') {
            rentInfo = `
                <div class="mp-rent-table">
                    <div class="rent-row"><span>1 ЖД:</span><span>$25</span></div>
                    <div class="rent-row"><span>2 ЖД:</span><span>$50</span></div>
                    <div class="rent-row"><span>3 ЖД:</span><span>$100</span></div>
                    <div class="rent-row"><span>4 ЖД:</span><span>$200</span></div>
                </div>
            `;
        } else if (cell.type === 'utility') {
            rentInfo = `
                <div class="mp-rent-table">
                    <div class="rent-row"><span>1 компания:</span><span>4× кости</span></div>
                    <div class="rent-row"><span>2 компании:</span><span>10× кости</span></div>
                </div>
            `;
        }

        const canAfford = this.myData.money >= cell.price;

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.id = 'mp-buy-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-buy-dialog" style="${colorStyle}">
                <h3>${cell.name}</h3>
                <div class="mp-dialog-price">💰 Цена: <strong>$${cell.price}</strong></div>
                ${rentInfo}
                <div class="mp-dialog-balance">Ваш баланс: $${this.myData.money}</div>
                <div class="mp-dialog-actions">
                    <button class="btn primary ${!canAfford ? 'disabled' : ''}" onclick="MonopolyPlus.buyProperty(${position})" ${!canAfford ? 'disabled' : ''}>
                        💵 Купить
                    </button>
                    <button class="btn secondary" onclick="MonopolyPlus.declinePurchase(${position})">
                        🏛️ На аукцион
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Buy property
    buyProperty(position) {
        this.closeBuyDialog();
        Multiplayer.socket.emit('monopoly_buy', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    // Decline purchase (start auction)
    declinePurchase(position) {
        this.closeBuyDialog();
        Multiplayer.socket.emit('monopoly_auction_start', {
            odId: App.userId,
            propertyIndex: position
        });
    },

    // Close buy dialog
    closeBuyDialog() {
        const overlay = document.getElementById('mp-buy-overlay');
        if (overlay) overlay.remove();
    },

    // Show cell info
    showCellInfo(index) {
        const cell = this.board[index];
        const propData = this.properties[index];

        if (!cell) return;

        const colorStyle = cell.group ? `border-top: 6px solid ${this.getGroupColor(cell.group)}` : '';
        let ownerInfo = '';

        if (propData) {
            const owner = this.players.find(p => p.odId === propData.owner);
            const ownerName = owner ? (owner.odId === App.userId ? 'Вы' : owner.name) : 'Неизвестно';
            const buildingInfo = propData.houses > 0 ?
                (propData.houses === 5 ? '🏨 Отель' : `🏠 × ${propData.houses}`) : '';
            ownerInfo = `
                <div class="mp-owner-info">
                    <span>👤 Владелец: <strong>${ownerName}</strong></span>
                    ${buildingInfo ? `<span>${buildingInfo}</span>` : ''}
                </div>
            `;
        }

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="mp-dialog mp-info-dialog" style="${colorStyle}">
                <h3>${cell.icon || ''} ${cell.name}</h3>
                ${cell.price ? `<div class="mp-dialog-price">💰 Цена: $${cell.price}</div>` : ''}
                ${ownerInfo}
                <button class="btn secondary" onclick="this.closest('.mp-overlay').remove()">Закрыть</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Handle turn update from server
    handleTurnUpdate(data) {
        this.currentPlayer = data.currentPlayer;
        this.isMyTurn = data.currentPlayer === App.userId;
        this.canRollDice = data.canRoll;
        this.lastDice = data.lastDice || [0, 0];
        this.properties = data.properties || {};
        this.doublesCount = data.doublesCount || 0;

        if (data.myData) {
            this.myData = data.myData;
        }

        if (data.players) {
            this.players = data.players;
        }

        this.renderBoard();
        this.updateUI();
    },

    // Handle property purchased
    handlePropertyPurchased(data) {
        this.properties[data.propertyIndex] = {
            owner: data.playerId,
            houses: 0,
            mortgaged: false
        };

        const cell = this.board[data.propertyIndex];
        const buyerName = data.playerId === App.userId ? 'Вы' :
            (this.players.find(p => p.odId === data.playerId)?.name || 'Игрок');

        this.showNotification(`🏠 ${buyerName} купили "${cell.name}" за $${cell.price}`);
        this.renderBoard();
        this.updateUI();
    },

    // Handle rent paid
    handleRentPaid(data) {
        const cell = this.board[data.propertyIndex];

        if (data.payerId === App.userId) {
            this.showNotification(`💸 Вы заплатили $${data.amount} аренды за "${cell.name}"`);
            this.myData.money = data.payerMoney;
        } else if (data.ownerId === App.userId) {
            this.showNotification(`💰 Получено $${data.amount} аренды за "${cell.name}"`);
            this.myData.money = data.ownerMoney;
        }

        this.updateUI();
    },

    // Handle Chance/Community Chest card
    handleCard(data) {
        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-card-dialog ${data.type}">
                <div class="mp-card-icon">${data.type === 'chance' ? '❓' : '💰'}</div>
                <h3>${data.type === 'chance' ? 'ШАНС' : 'КАЗНА'}</h3>
                <p class="mp-card-text">${data.text}</p>
                <button class="btn primary" onclick="this.closest('.mp-overlay').remove()">OK</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Auto close after 4 seconds
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 4000);
    },

    // Pay jail fine
    payJailFine() {
        if (this.myData?.money >= 50) {
            Multiplayer.socket.emit('monopoly_pay_jail', { odId: App.userId });
        } else {
            this.showNotification('❌ Недостаточно денег для выхода из тюрьмы!');
        }
    },

    // Use get out of jail card
    useJailCard() {
        Multiplayer.socket.emit('monopoly_use_jail_card', { odId: App.userId });
    },

    // End turn
    endTurn() {
        if (!this.isMyTurn) return;
        Multiplayer.socket.emit('monopoly_end_turn', { odId: App.userId });
    },

    // Show my properties overlay
    showMyProperties() {
        const myProps = Object.entries(this.properties)
            .filter(([idx, data]) => data.owner === App.userId)
            .map(([idx, data]) => ({ idx: parseInt(idx), ...data, cell: this.board[parseInt(idx)] }));

        if (myProps.length === 0) {
            this.showNotification('У вас пока нет недвижимости');
            return;
        }

        const propsHtml = myProps.map(prop => {
            const colorStyle = prop.cell.group ? `border-left: 4px solid ${this.getGroupColor(prop.cell.group)}` : '';
            const canBuild = this.canBuildOnProperty(prop.idx);
            const buildBtn = canBuild && prop.houses < 5 ?
                `<button class="btn small primary" onclick="MonopolyPlus.buildHouse(${prop.idx})">🏠 Строить ($${prop.cell.houseCost})</button>` : '';

            return `
                <div class="mp-prop-item" style="${colorStyle}">
                    <div class="mp-prop-info">
                        <strong>${prop.cell.name}</strong>
                        <span>${prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses)}</span>
                    </div>
                    ${buildBtn}
                </div>
            `;
        }).join('');

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="mp-dialog mp-props-dialog">
                <h3>🏠 Ваша недвижимость</h3>
                <div class="mp-props-list">${propsHtml}</div>
                <button class="btn secondary" onclick="this.closest('.mp-overlay').remove()">Закрыть</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Check if can build on property
    canBuildOnProperty(propertyIndex) {
        const cell = this.board[propertyIndex];
        if (!cell.group || !this.isMyTurn) return false;

        // Check if player owns full set
        const groupProps = this.propertyGroups[cell.group];
        const ownedInGroup = groupProps.filter(idx =>
            this.properties[idx]?.owner === App.userId
        );

        if (ownedInGroup.length !== groupProps.length) return false;

        // Check even building rule
        const propData = this.properties[propertyIndex];
        const minHouses = Math.min(...groupProps.map(idx => this.properties[idx]?.houses || 0));

        return propData.houses <= minHouses && this.myData.money >= cell.houseCost;
    },

    // Build house
    buildHouse(propertyIndex) {
        Multiplayer.socket.emit('monopoly_build', {
            odId: App.userId,
            propertyIndex
        });
        // Close properties dialog
        document.querySelector('.mp-overlay')?.remove();
    },

    // Handle build result
    handleBuildResult(data) {
        if (data.success) {
            this.properties[data.propertyIndex].houses = data.houses;
            const cell = this.board[data.propertyIndex];
            const building = data.houses === 5 ? 'отель' : `дом (${data.houses}/5)`;
            this.showNotification(`🏗️ Построен ${building} на "${cell.name}"`);

            if (data.playerId === App.userId) {
                this.myData.money = data.newMoney;
            }

            this.renderBoard();
            this.updateUI();
        }
    },

    // Handle auction
    handleAuction(data) {
        // Show auction dialog
        const cell = this.board[data.propertyIndex];
        const colorStyle = cell.group ? `border-top: 6px solid ${this.getGroupColor(cell.group)}` : '';

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.id = 'mp-auction-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-auction-dialog" style="${colorStyle}">
                <h3>🏛️ АУКЦИОН</h3>
                <h4>${cell.name}</h4>
                <div class="mp-auction-bid">
                    <span>Текущая ставка:</span>
                    <strong id="mp-current-bid">$${data.currentBid}</strong>
                </div>
                <div class="mp-auction-leader" id="mp-bid-leader">
                    Лидер: ${data.highestBidder ? (this.players.find(p => p.odId === data.highestBidder)?.name || 'Игрок') : 'Нет ставок'}
                </div>
                <div class="mp-auction-actions">
                    <button class="btn primary" onclick="MonopolyPlus.placeBid(${data.propertyIndex}, ${data.currentBid + 10})">
                        💵 +$10 ($${data.currentBid + 10})
                    </button>
                    <button class="btn secondary" onclick="MonopolyPlus.placeBid(${data.propertyIndex}, ${data.currentBid + 50})">
                        💰 +$50 ($${data.currentBid + 50})
                    </button>
                    <button class="btn warning" onclick="MonopolyPlus.passAuction()">
                        ❌ Пас
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Place auction bid
    placeBid(propertyIndex, amount) {
        if (this.myData.money >= amount) {
            Multiplayer.socket.emit('monopoly_bid', {
                odId: App.userId,
                propertyIndex,
                amount
            });
        } else {
            this.showNotification('❌ Недостаточно денег для ставки!');
        }
    },

    // Pass auction
    passAuction() {
        document.getElementById('mp-auction-overlay')?.remove();
        Multiplayer.socket.emit('monopoly_auction_pass', { odId: App.userId });
    },

    // Handle game over
    handleGameOver(data) {
        const isWinner = data.winner === App.userId;
        const winnerName = this.players.find(p => p.odId === data.winner)?.name || 'Игрок';

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-dialog mp-gameover-dialog">
                <h2>${isWinner ? '🎉 ПОБЕДА!' : '😔 ИГРА ОКОНЧЕНА'}</h2>
                <p>${isWinner ? 'Вы стали монополистом!' : `${winnerName} победил!`}</p>
                <div class="mp-final-stats">
                    <div>💰 Итоговый капитал: $${data.finalMoney}</div>
                    <div>🏠 Недвижимость: ${data.propertiesCount} участков</div>
                </div>
                <div class="mp-gameover-actions">
                    <button class="btn primary" onclick="playAgain()">🔄 Играть снова</button>
                    <button class="btn secondary" onclick="exitToMenu()">🏠 В меню</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        App.showVictory(isWinner);
    },

    // Handle player bankruptcy
    handleBankruptcy(data) {
        const playerName = data.playerId === App.userId ? 'Вы' :
            (this.players.find(p => p.odId === data.playerId)?.name || 'Игрок');

        this.showNotification(`💔 ${playerName} обанкротились!`);

        // Mark player as bankrupt
        const playerIdx = this.players.findIndex(p => p.odId === data.playerId);
        if (playerIdx !== -1) {
            this.players[playerIdx].bankrupt = true;
        }

        // Transfer properties to bank
        Object.entries(this.properties).forEach(([idx, prop]) => {
            if (prop.owner === data.playerId) {
                delete this.properties[idx];
            }
        });

        this.renderBoard();
        this.updateUI();
    },

    // Show notification toast
    showNotification(message) {
        const existing = document.querySelector('.mp-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'mp-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Global functions for HTML onclick handlers
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

function endMonopolyTurn() {
    MonopolyPlus.endTurn();
}

// Alias for backward compatibility
const Monopoly = MonopolyPlus;
