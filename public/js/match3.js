// ==================== MATCH-3 (3 в ряд) ====================
const Match3Game = {
    BOARD_SIZE: 8,
    GEMS: ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'],
    board: [],
    selected: null,
    score: 0,
    bestScore: 0,
    moves: 30,
    maxMoves: 30,
    animating: false,
    level: 1,

    init() {
        this.bestScore = parseInt(localStorage.getItem('match3_best') || '0');
        this.level = 1;
        this.startLevel();
    },

    startLevel() {
        this.moves = this.maxMoves;
        this.score = 0;
        this.selected = null;
        this.animating = false;
        this.generateBoard();
        this.render();
        this.updateUI();
        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');
    },

    generateBoard() {
        // Generate board without initial matches
        this.board = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                let gem;
                do {
                    gem = Math.floor(Math.random() * this.GEMS.length);
                } while (
                    (c >= 2 && this.board[r][c - 1] === gem && this.board[r][c - 2] === gem) ||
                    (r >= 2 && this.board[r - 1][c] === gem && this.board[r - 2][c] === gem)
                );
                this.board[r][c] = gem;
            }
        }
    },

    render() {
        const field = document.getElementById('m3-field');
        if (!field) return;

        let html = '';
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const gem = this.board[r][c];
                const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
                const cls = 'm3-cell' + (isSelected ? ' selected' : '') + (gem === -1 ? ' empty' : '');
                html += `<div class="${cls}" data-r="${r}" data-c="${c}" onclick="Match3Game.onCellClick(${r},${c})">${gem >= 0 ? this.GEMS[gem] : ''}</div>`;
            }
        }
        field.innerHTML = html;
    },

    onCellClick(r, c) {
        if (this.animating || this.board[r][c] === -1) return;

        if (!this.selected) {
            this.selected = { r, c };
            this.render();
            return;
        }

        const sr = this.selected.r, sc = this.selected.c;

        // Check if adjacent
        const isAdjacent = (Math.abs(sr - r) + Math.abs(sc - c)) === 1;

        if (!isAdjacent) {
            this.selected = { r, c };
            this.render();
            return;
        }

        // Try swap
        this.swap(sr, sc, r, c);
        const matches = this.findMatches();

        if (matches.length === 0) {
            // No match — swap back
            this.swap(sr, sc, r, c);
            this.selected = null;
            this.render();
            // Shake animation
            const cell = document.querySelector(`.m3-cell[data-r="${r}"][data-c="${c}"]`);
            if (cell) { cell.classList.add('shake'); setTimeout(() => cell.classList.remove('shake'), 300); }
            return;
        }

        this.selected = null;
        this.moves--;
        this.animating = true;

        this.processMatches(matches);
    },

    swap(r1, c1, r2, c2) {
        const tmp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = tmp;
    },

    findMatches() {
        const matches = new Set();

        // Horizontal
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE - 2; c++) {
                const g = this.board[r][c];
                if (g < 0) continue;
                if (g === this.board[r][c + 1] && g === this.board[r][c + 2]) {
                    matches.add(`${r},${c}`);
                    matches.add(`${r},${c + 1}`);
                    matches.add(`${r},${c + 2}`);
                    // Check for 4+ in a row
                    let ext = c + 3;
                    while (ext < this.BOARD_SIZE && this.board[r][ext] === g) {
                        matches.add(`${r},${ext}`);
                        ext++;
                    }
                }
            }
        }

        // Vertical
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            for (let r = 0; r < this.BOARD_SIZE - 2; r++) {
                const g = this.board[r][c];
                if (g < 0) continue;
                if (g === this.board[r + 1][c] && g === this.board[r + 2][c]) {
                    matches.add(`${r},${c}`);
                    matches.add(`${r + 1},${c}`);
                    matches.add(`${r + 2},${c}`);
                    let ext = r + 3;
                    while (ext < this.BOARD_SIZE && this.board[ext][c] === g) {
                        matches.add(`${ext},${c}`);
                        ext++;
                    }
                }
            }
        }

        return [...matches].map(s => {
            const [r, c] = s.split(',').map(Number);
            return { r, c };
        });
    },

    processMatches(matches) {
        // Score: 10 per gem, bonus for combos
        const points = matches.length * 10 * (matches.length > 3 ? 2 : 1);
        this.score += points;

        // Remove matched gems
        matches.forEach(({ r, c }) => {
            this.board[r][c] = -1;
        });

        this.render();
        // Highlight matched cells
        matches.forEach(({ r, c }) => {
            const cell = document.querySelector(`.m3-cell[data-r="${r}"][data-c="${c}"]`);
            if (cell) cell.classList.add('matched');
        });

        setTimeout(() => {
            this.dropGems();
            this.fillEmpty();
            this.render();
            this.updateUI();

            // Check for cascading matches
            setTimeout(() => {
                const newMatches = this.findMatches();
                if (newMatches.length > 0) {
                    this.processMatches(newMatches);
                } else {
                    this.animating = false;
                    // Check if no moves possible
                    if (!this.hasValidMoves()) {
                        this.shuffleBoard();
                    }
                    // Check game over
                    if (this.moves <= 0) {
                        this.gameOver();
                    }
                }
            }, 200);
        }, 300);
    },

    dropGems() {
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            let writePos = this.BOARD_SIZE - 1;
            for (let r = this.BOARD_SIZE - 1; r >= 0; r--) {
                if (this.board[r][c] !== -1) {
                    this.board[writePos][c] = this.board[r][c];
                    if (writePos !== r) this.board[r][c] = -1;
                    writePos--;
                }
            }
            // Fill top with -1
            for (let r = writePos; r >= 0; r--) {
                this.board[r][c] = -1;
            }
        }
    },

    fillEmpty() {
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === -1) {
                    this.board[r][c] = Math.floor(Math.random() * this.GEMS.length);
                }
            }
        }
    },

    hasValidMoves() {
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                // Try swap right
                if (c < this.BOARD_SIZE - 1) {
                    this.swap(r, c, r, c + 1);
                    if (this.findMatches().length > 0) { this.swap(r, c, r, c + 1); return true; }
                    this.swap(r, c, r, c + 1);
                }
                // Try swap down
                if (r < this.BOARD_SIZE - 1) {
                    this.swap(r, c, r + 1, c);
                    if (this.findMatches().length > 0) { this.swap(r, c, r + 1, c); return true; }
                    this.swap(r, c, r + 1, c);
                }
            }
        }
        return false;
    },

    shuffleBoard() {
        // Flatten, shuffle, refill
        const gems = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                gems.push(this.board[r][c]);
            }
        }
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        let idx = 0;
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                this.board[r][c] = gems[idx++];
            }
        }
        // Process any immediate matches
        const matches = this.findMatches();
        if (matches.length > 0) {
            matches.forEach(({ r, c }) => { this.board[r][c] = -1; });
            this.dropGems();
            this.fillEmpty();
        }
        this.render();
    },

    gameOver() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('match3_best', this.bestScore.toString());
        }
        const result = document.getElementById('m3-result');
        if (result) result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = '🎉 Игра окончена!';
        document.getElementById('m3-result-text').textContent = `Очки: ${this.score} | Рекорд: ${this.bestScore}`;
    },

    updateUI() {
        const scoreEl = document.getElementById('m3-score');
        const movesEl = document.getElementById('m3-moves');
        const bestEl = document.getElementById('m3-best');
        if (scoreEl) scoreEl.textContent = `⭐ ${this.score}`;
        if (movesEl) movesEl.textContent = `🔄 ${this.moves}`;
        if (bestEl) bestEl.textContent = `🏆 ${this.bestScore}`;
    }
};
