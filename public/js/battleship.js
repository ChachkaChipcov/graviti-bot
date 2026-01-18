// Battleship Game
const Battleship = {
    room: null,
    myShips: [],
    placedShips: [],
    selectedShipSize: null,
    isHorizontal: true,
    phase: 'placement', // 'placement' | 'battle'
    isMyTurn: false,
    myShots: [],
    opponentShots: [],

    // Ship definitions: 4cel-1, 3cel-2, 2cel-3, 1cel-4
    shipSizes: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1],
    totalShips: 10,

    init(room) {
        this.room = room;
        this.myShips = [];
        this.placedShips = [];
        this.selectedShipSize = null;
        this.isHorizontal = true;
        this.phase = 'placement';
        this.myShots = [];
        this.opponentShots = [];

        // Reset UI
        document.getElementById('bs-placement').classList.remove('hidden');
        document.getElementById('bs-battle').classList.add('hidden');
        document.getElementById('bs-result').classList.add('hidden');
        document.getElementById('bs-ready-btn').disabled = true;

        // Create placement grid
        this.createGrid('bs-placement-grid', true);

        // Reset ship items
        document.querySelectorAll('.ship-item').forEach(item => {
            item.classList.remove('placed', 'selected');
        });

        // Add keyboard listener for rotation
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    },

    handleKeydown(e) {
        if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
            this.toggleRotation();
        }
    },

    toggleRotation() {
        this.isHorizontal = !this.isHorizontal;
        this.updateRotationButton();
        App.haptic('light');
    },

    updateRotationButton() {
        const btn = document.getElementById('rotation-btn');
        const icon = document.getElementById('rotation-icon');
        const text = document.getElementById('rotation-text');

        if (btn && icon && text) {
            if (this.isHorizontal) {
                btn.classList.remove('vertical');
                icon.textContent = '➡️';
                text.textContent = 'Горизонтально';
            } else {
                btn.classList.add('vertical');
                icon.textContent = '⬇️';
                text.textContent = 'Вертикально';
            }
        }
    },

    createGrid(gridId, isPlacement = false) {
        const grid = document.getElementById(gridId);
        grid.innerHTML = '';

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'bs-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                if (isPlacement) {
                    cell.addEventListener('click', () => this.placeShip(x, y));
                    cell.addEventListener('mouseenter', () => this.previewShip(x, y));
                    cell.addEventListener('mouseleave', () => this.clearPreview());

                    // Touch events for drawing ships
                    cell.addEventListener('touchstart', (e) => this.startDraw(e, x, y), { passive: false });
                    cell.addEventListener('touchmove', (e) => this.onDraw(e), { passive: false });
                    cell.addEventListener('touchend', (e) => this.endDraw(e), { passive: false });
                }

                grid.appendChild(cell);
            }
        }
    },

    // Touch drawing state
    drawStartX: null,
    drawStartY: null,
    isDrawing: false,

    startDraw(e, x, y) {
        if (!this.selectedShipSize || this.phase !== 'placement') return;
        e.preventDefault();
        this.drawStartX = x;
        this.drawStartY = y;
        this.isDrawing = true;
        App.haptic('light');
    },

    onDraw(e) {
        if (!this.isDrawing || !this.selectedShipSize) return;
        e.preventDefault();

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element || !element.classList.contains('bs-cell')) return;

        const x = parseInt(element.dataset.x);
        const y = parseInt(element.dataset.y);

        // Determine direction based on drag
        const dx = x - this.drawStartX;
        const dy = y - this.drawStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.isHorizontal = true;
        } else if (Math.abs(dy) > Math.abs(dx)) {
            this.isHorizontal = false;
        }

        this.updateRotationButton();
        this.previewShip(this.drawStartX, this.drawStartY);
    },

    endDraw(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        if (this.drawStartX !== null && this.drawStartY !== null) {
            this.placeShip(this.drawStartX, this.drawStartY);
        }

        this.isDrawing = false;
        this.drawStartX = null;
        this.drawStartY = null;
    },

    createBattleGrids() {
        // Enemy grid (for shooting)
        const enemyGrid = document.getElementById('bs-enemy-grid');
        enemyGrid.innerHTML = '';

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'bs-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => this.fireShot(x, y));
                enemyGrid.appendChild(cell);
            }
        }

        // Own grid (display only)
        const ownGrid = document.getElementById('bs-own-grid');
        ownGrid.innerHTML = '';

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'bs-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                // Show my ships
                if (this.isCellOccupied(x, y)) {
                    cell.classList.add('ship');
                }

                ownGrid.appendChild(cell);
            }
        }
    },

    previewShip(x, y) {
        if (!this.selectedShipSize || this.phase !== 'placement') return;

        this.clearPreview();
        const cells = this.getShipCells(x, y, this.selectedShipSize, this.isHorizontal);

        if (!cells) return;

        const isValid = this.canPlaceShip(cells);

        cells.forEach(({ x, y }) => {
            const cell = document.querySelector(`#bs-placement-grid .bs-cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.style.background = isValid ? 'rgba(108, 92, 231, 0.5)' : 'rgba(255, 107, 107, 0.5)';
            }
        });
    },

    clearPreview() {
        document.querySelectorAll('#bs-placement-grid .bs-cell').forEach(cell => {
            if (!cell.classList.contains('ship')) {
                cell.style.background = '';
            }
        });
    },

    getShipCells(startX, startY, size, horizontal) {
        const cells = [];

        for (let i = 0; i < size; i++) {
            const x = horizontal ? startX + i : startX;
            const y = horizontal ? startY : startY + i;

            if (x >= 10 || y >= 10) return null;

            cells.push({ x, y });
        }

        return cells;
    },

    canPlaceShip(cells) {
        for (const { x, y } of cells) {
            // Check if cell or adjacent cells are occupied
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (this.isCellOccupied(x + dx, y + dy)) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    isCellOccupied(x, y) {
        return this.placedShips.some(ship =>
            ship.cells.some(cell => cell.x === x && cell.y === y)
        );
    },

    placeShip(x, y) {
        if (!this.selectedShipSize || this.phase !== 'placement') return;

        const cells = this.getShipCells(x, y, this.selectedShipSize, this.isHorizontal);

        if (!cells || !this.canPlaceShip(cells)) {
            App.haptic('heavy');
            this.showPlacementError('⚠️ Задевает другой корабль!');
            return;
        }

        // Place the ship
        const ship = {
            size: this.selectedShipSize,
            cells: cells,
            sunk: false
        };

        this.placedShips.push(ship);

        // Update grid visuals
        cells.forEach(({ x, y }) => {
            const cell = document.querySelector(`#bs-placement-grid .bs-cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.classList.add('ship');
                cell.style.background = '';
            }
        });

        // Mark ship item as placed - use selected element if available
        if (this.selectedShipElement) {
            this.selectedShipElement.classList.add('placed');
            this.selectedShipElement.classList.remove('selected');
            this.selectedShipElement = null;
        } else {
            const shipItems = document.querySelectorAll(`.ship-item[data-size="${this.selectedShipSize}"]:not(.placed)`);
            if (shipItems.length > 0) {
                shipItems[0].classList.add('placed');
                shipItems[0].classList.remove('selected');
            }
        }

        App.haptic('medium');

        // Clear selection
        this.selectedShipSize = null;

        // Check if all ships placed
        if (this.placedShips.length === this.totalShips) {
            document.getElementById('bs-ready-btn').disabled = false;
        }
    },

    showPlacementError(message) {
        // Show error toast
        let toast = document.getElementById('bs-error-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'bs-error-toast';
            toast.className = 'bs-error-toast';
            document.getElementById('bs-placement').appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    },

    showWaitingForOpponent() {
        document.getElementById('bs-ready-btn').textContent = '⏳ Ожидаем соперника...';
        document.getElementById('bs-ready-btn').disabled = true;
    },

    startBattle(data) {
        this.phase = 'battle';
        this.isMyTurn = data.currentTurn === App.userId;

        // Hide placement, show battle
        document.getElementById('bs-placement').classList.add('hidden');
        document.getElementById('bs-battle').classList.remove('hidden');

        // Create battle grids
        this.createBattleGrids();

        // Update turn indicator
        this.updateTurnIndicator();
    },

    updateTurnIndicator() {
        const turnEl = document.getElementById('bs-turn');
        if (this.isMyTurn) {
            turnEl.textContent = '🎯 Ваш ход! Стреляйте!';
            turnEl.classList.remove('enemy-turn');
        } else {
            turnEl.textContent = '⏳ Противник целится...';
            turnEl.classList.add('enemy-turn');
        }
    },

    fireShot(x, y) {
        if (!this.isMyTurn || this.phase !== 'battle') return;

        // Check if already shot here
        if (this.myShots.some(s => s.x === x && s.y === y)) {
            App.haptic('heavy');
            return;
        }

        App.haptic('medium');
        Multiplayer.bsFire(x, y);

        // Temporarily disable shooting
        this.isMyTurn = false;
        this.updateTurnIndicator();
    },

    handleShotResult(data) {
        const { shooter, x, y, hit, sunkShip, winner, currentTurn } = data;

        const isMyShot = shooter === App.userId;

        if (isMyShot) {
            // Update enemy grid
            this.myShots.push({ x, y, hit });
            const cell = document.querySelector(`#bs-enemy-grid .bs-cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.classList.add(hit ? 'hit' : 'miss');
                App.haptic(hit ? 'heavy' : 'light');
            }

            // Mark sunk ship
            if (sunkShip) {
                sunkShip.cells.forEach(({ x, y }) => {
                    const cell = document.querySelector(`#bs-enemy-grid .bs-cell[data-x="${x}"][data-y="${y}"]`);
                    if (cell) {
                        cell.classList.add('sunk');
                    }
                });
            }
        } else {
            // Opponent shot at my grid
            this.opponentShots.push({ x, y, hit });
            const cell = document.querySelector(`#bs-own-grid .bs-cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.classList.add(hit ? 'hit' : 'miss');
                if (hit) App.haptic('heavy');
            }
        }

        // Check for winner
        if (winner) {
            this.showGameResult(winner === App.userId);
            return;
        }

        // Update turn
        this.isMyTurn = currentTurn === App.userId;
        this.updateTurnIndicator();
    },

    showGameResult(isWinner) {
        const resultEl = document.getElementById('bs-result');
        resultEl.classList.remove('hidden', 'win', 'lose');
        resultEl.classList.add(isWinner ? 'win' : 'lose');

        resultEl.innerHTML = `
      <h2>${isWinner ? '🎉 Победа!' : '💀 Поражение'}</h2>
      <p>${isWinner ? 'Вы потопили весь флот противника!' : 'Ваш флот уничтожен...'}</p>
      <button class="btn primary" onclick="App.goBack()">🔙 В меню</button>
    `;

        App.showVictory(isWinner);
    }
};

function selectShip(size) {
    if (Battleship.phase !== 'placement') return;

    // Check if all ships of this size are placed
    const placedCount = Battleship.placedShips.filter(s => s.size === size).length;
    const totalCount = Battleship.shipSizes.filter(s => s === size).length;

    if (placedCount >= totalCount) {
        App.haptic('heavy');
        return;
    }

    Battleship.selectedShipSize = size;
    App.haptic('light');

    // Visual feedback
    document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
    const items = document.querySelectorAll(`.ship-item[data-size="${size}"]:not(.placed)`);
    if (items.length > 0) {
        items[0].classList.add('selected');
    }
}

// New function - select specific ship element by ID
function selectShipById(element) {
    if (Battleship.phase !== 'placement') return;
    if (element.classList.contains('placed')) {
        App.haptic('heavy');
        return;
    }

    const size = parseInt(element.dataset.size);
    Battleship.selectedShipSize = size;
    Battleship.selectedShipElement = element;
    App.haptic('light');

    // Visual feedback - only this element
    document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
    element.classList.add('selected');
}

function confirmPlacement() {
    if (Battleship.placedShips.length < Battleship.totalShips) return;

    Multiplayer.bsPlaceShips(Battleship.placedShips);
    Battleship.showWaitingForOpponent();
}

function toggleShipRotation() {
    Battleship.toggleRotation();
}
