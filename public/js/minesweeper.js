// ==================== MINESWEEPER ====================
const Minesweeper = {
    difficulties: {
        easy: { rows: 9, cols: 9, mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard: { rows: 16, cols: 30, mines: 99 }
    },
    difficulty: 'easy',
    grid: [],
    revealed: [],
    flagged: [],
    rows: 9,
    cols: 9,
    totalMines: 10,
    minesLeft: 10,
    gameOver: false,
    firstClick: true,
    timerInterval: null,
    seconds: 0,
    longPressTimer: null,

    setDifficulty(diff) {
        this.difficulty = diff;
        document.querySelectorAll('.ms-diff-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.diff === diff);
        });
        this.restart();
    },

    restart() {
        const d = this.difficulties[this.difficulty];
        this.rows = d.rows;
        this.cols = d.cols;
        this.totalMines = d.mines;
        this.minesLeft = d.mines;
        this.gameOver = false;
        this.firstClick = true;
        this.seconds = 0;
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Init empty grid
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.revealed = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
        this.flagged = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));

        this.updateUI();
        this.renderField();
        document.getElementById('ms-result').classList.add('hidden');
    },

    placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < this.totalMines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            // Keep safe zone around first click (3×3)
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
            if (this.grid[r][c] === -1) continue;
            this.grid[r][c] = -1;
            placed++;
        }
        // Calculate numbers
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.grid[nr][nc] === -1) {
                            count++;
                        }
                    }
                }
                this.grid[r][c] = count;
            }
        }
    },

    renderField() {
        const field = document.getElementById('ms-field');
        field.style.gridTemplateColumns = `repeat(${this.cols}, 32px)`;
        let html = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const revealed = this.revealed[r][c];
                const flagged = this.flagged[r][c];
                let cls = 'ms-cell';
                let content = '';

                if (revealed) {
                    cls += ' revealed';
                    const val = this.grid[r][c];
                    if (val === -1) {
                        cls += ' mine';
                        content = '💣';
                    } else if (val > 0) {
                        content = val;
                    }
                } else if (flagged) {
                    cls += ' flagged';
                    content = '🚩';
                }

                const numAttr = revealed && this.grid[r][c] > 0 ? ` data-num="${this.grid[r][c]}"` : '';
                html += `<div class="${cls}"${numAttr} data-r="${r}" data-c="${c}">${content}</div>`;
            }
        }
        field.innerHTML = html;

        // Add event listeners
        field.querySelectorAll('.ms-cell').forEach(cell => {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);

            cell.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.flagged[r][c]) this.reveal(r, c);
            });

            // Right click for flag
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleFlag(r, c);
            });

            // Long press for mobile
            cell.addEventListener('touchstart', (e) => {
                this.longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    this.toggleFlag(r, c);
                }, 400);
            }, { passive: false });

            cell.addEventListener('touchend', () => {
                clearTimeout(this.longPressTimer);
            });

            cell.addEventListener('touchmove', () => {
                clearTimeout(this.longPressTimer);
            });
        });
    },

    reveal(r, c) {
        if (this.gameOver || this.revealed[r][c] || this.flagged[r][c]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(r, c);
            this.startTimer();
        }

        this.revealed[r][c] = true;

        if (this.grid[r][c] === -1) {
            // Hit mine
            this.gameOver = true;
            clearInterval(this.timerInterval);
            // Reveal all mines
            for (let rr = 0; rr < this.rows; rr++) {
                for (let cc = 0; cc < this.cols; cc++) {
                    if (this.grid[rr][cc] === -1) this.revealed[rr][cc] = true;
                }
            }
            this.renderField();
            // Mark hit mine
            const hitCell = document.querySelector(`.ms-cell[data-r="${r}"][data-c="${c}"]`);
            if (hitCell) hitCell.classList.add('mine-hit');
            this.showResult(false);
            return;
        }

        // Empty cell → cascade
        if (this.grid[r][c] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        this.reveal(nr, nc);
                    }
                }
            }
        }

        this.renderField();
        this.checkWin();
    },

    toggleFlag(r, c) {
        if (this.gameOver || this.revealed[r][c] || this.firstClick) return;
        this.flagged[r][c] = !this.flagged[r][c];
        this.minesLeft += this.flagged[r][c] ? -1 : 1;
        this.updateUI();
        this.renderField();
    },

    checkWin() {
        let unrevealed = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.revealed[r][c]) unrevealed++;
            }
        }
        if (unrevealed === this.totalMines) {
            this.gameOver = true;
            clearInterval(this.timerInterval);
            this.showResult(true);
        }
    },

    showResult(won) {
        const result = document.getElementById('ms-result');
        result.classList.remove('hidden');
        document.getElementById('ms-result-title').textContent = won ? '🎉 Победа!' : '💥 Поражение!';
        const timeStr = `${Math.floor(this.seconds / 60)}:${(this.seconds % 60).toString().padStart(2, '0')}`;
        document.getElementById('ms-result-text').textContent = won
            ? `Время: ${timeStr}`
            : `Вы наступили на мину! Время: ${timeStr}`;
    },

    startTimer() {
        this.seconds = 0;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            this.updateUI();
        }, 1000);
    },

    updateUI() {
        document.getElementById('ms-mines-count').textContent = `🚩 ${this.minesLeft}`;
        const mins = Math.floor(this.seconds / 60);
        const secs = (this.seconds % 60).toString().padStart(2, '0');
        document.getElementById('ms-timer').textContent = `⏱ ${mins}:${secs}`;
    },

    init() {
        this.restart();
    }
};
