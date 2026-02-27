const Sudoku = {
    boardEl: null,
    grid: [],
    solution: [],
    selectedRow: -1,
    selectedCol: -1,
    timerInterval: null,
    timeSeconds: 0,
    isGameOver: false,
    showingLeaderboard: false,

    init() {
        this.boardEl = document.getElementById('sudoku-board');
    },

    start() {
        if (!this.boardEl) this.init();

        document.getElementById('sudoku-result').classList.add('hidden');
        this.isGameOver = false;
        this.timeSeconds = 0;
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.updateTimeDisplay();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeSeconds++;
            this.updateTimeDisplay();
        }, 1000);

        this.generateBoard();
        this.render();
    },

    generateBoard() {
        // Generate simple true complete grid via backtracking
        this.solution = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.fillGrid(this.solution);

        // Create puzzle (remove numbers)
        // For a quick game let's remove 40 numbers
        this.grid = this.solution.map(row => [...row]);
        let removed = 0;
        while (removed < 40) {
            let r = Math.floor(Math.random() * 9);
            let c = Math.floor(Math.random() * 9);
            if (this.grid[r][c] !== 0) {
                this.grid[r][c] = 0;
                removed++;
            }
        }

        // Create view
        this.boardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                if (this.grid[r][c] !== 0) {
                    cell.textContent = this.grid[r][c];
                    cell.classList.add('fixed');
                } else {
                    cell.addEventListener('click', () => this.selectCell(r, c));
                }
                cell.dataset.r = r;
                cell.dataset.c = c;
                this.boardEl.appendChild(cell);
            }
        }
    },

    fillGrid(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    // Try numbers 1-9 in random order
                    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    for (let n of nums) {
                        if (this.isValidPlacement(grid, row, col, n)) {
                            grid[row][col] = n;
                            if (this.fillGrid(grid)) return true;
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    },

    isValidPlacement(grid, row, col, num) {
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
            if (grid[x][col] === num) return false;
        }
        let rStart = Math.floor(row / 3) * 3;
        let cStart = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[rStart + r][cStart + c] === num) return false;
            }
        }
        return true;
    },

    selectCell(r, c) {
        if (this.isGameOver) return;
        this.selectedRow = r;
        this.selectedCol = c;
        this.render();
    },

    inputNum(n) {
        if (this.isGameOver || this.selectedRow === -1) return;
        const r = this.selectedRow;
        const c = this.selectedCol;
        if (this.grid[r][c] !== 0 && document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`).classList.contains('fixed')) {
            return; // Cannot edit fixed cells
        }

        const cell = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);

        if (n === 0) {
            this.grid[r][c] = 0;
            cell.textContent = '';
            cell.classList.remove('error');
            return;
        }

        this.grid[r][c] = n;
        cell.textContent = n;

        // Check errors
        if (this.grid[r][c] !== this.solution[r][c]) {
            cell.classList.add('error');
            App.haptic('light');
        } else {
            cell.classList.remove('error');
            App.haptic('light');
            this.checkWin();
        }
    },

    checkWin() {
        let complete = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.grid[r][c] !== this.solution[r][c]) complete = false;
            }
        }
        if (complete) this.gameOver();
    },

    render() {
        const cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'highlight');
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);

            if (r === this.selectedRow && c === this.selectedCol) {
                cell.classList.add('selected');
            } else if (this.selectedRow !== -1 && (r === this.selectedRow || c === this.selectedCol)) {
                cell.classList.add('highlight'); // Cross highlight
            } else if (this.selectedRow !== -1) {
                // Block highlight
                const rStart = Math.floor(this.selectedRow / 3) * 3;
                const cStart = Math.floor(this.selectedCol / 3) * 3;
                if (r >= rStart && r < rStart + 3 && c >= cStart && c < cStart + 3) {
                    cell.classList.add('highlight');
                }
            }
        });
    },

    updateTimeDisplay() {
        const m = Math.floor(this.timeSeconds / 60).toString().padStart(2, '0');
        const s = (this.timeSeconds % 60).toString().padStart(2, '0');
        document.getElementById('sudoku-time').textContent = `⏱️ ${m}: ${s}`;
    },

    gameOver() {
        this.isGameOver = true;
        clearInterval(this.timerInterval);
        App.haptic('heavy');

        // Score based on time. Faster = better.
        // E.g. 5 minutes (300s) = baseline 1000 pts
        const penalty = this.timeSeconds * 5;
        const score = Math.max(100, 3000 - penalty);

        document.getElementById('sudoku-result-text').textContent = `Время: ${this.timeSeconds} сек\nСчёт: ${score}`;
        document.getElementById('sudoku-result').classList.remove('hidden');

        if (window.submitScore) {
            window.submitScore('sudoku', score, 0);
        }
    },

    hideLeaderboard() {
        this.showingLeaderboard = false;
        hideLeaderboard();
    }
};
