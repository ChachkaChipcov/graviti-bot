const Tetris = {
    canvas: null,
    ctx: null,
    nextCanvas: null,
    nextCtx: null,
    field: [],
    score: 0,
    level: 1,
    lines: 0,
    current: null,
    next: null,
    interval: null,
    speed: 800,
    isGameOver: false,
    showingLeaderboard: false,

    ROWS: 20,
    COLS: 10,
    BLOCK_SIZE: 20,

    COLORS: [
        null,
        '#00ffff', // I - cyan
        '#0000ff', // J - blue
        '#ffa500', // L - orange
        '#ffff00', // O - yellow
        '#00ff00', // S - green
        '#800080', // T - purple
        '#ff0000'  // Z - red
    ],

    SHAPES: [
        [],
        [[1, 1, 1, 1]], // I
        [[2, 0, 0], [2, 2, 2]], // J
        [[0, 0, 3], [3, 3, 3]], // L
        [[4, 4], [4, 4]], // O
        [[0, 5, 5], [5, 5, 0]], // S
        [[0, 6, 0], [6, 6, 6]], // T
        [[7, 7, 0], [0, 7, 7]]  // Z
    ],

    init() {
        this.canvas = document.getElementById('tetris-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('tetris-next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
    },

    start() {
        if (!this.canvas) this.init();
        document.getElementById('tetris-result').classList.add('hidden');
        this.field = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.speed = 800;
        this.isGameOver = false;
        this.updateScore();

        this.current = this.randomPiece();
        this.next = this.randomPiece();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.tick(), this.speed);

        this.draw();
        this.drawNext();
    },

    randomPiece() {
        const id = Math.floor(Math.random() * 7) + 1;
        const shape = this.SHAPES[id];
        return {
            id,
            shape,
            x: Math.floor((this.COLS - shape[0].length) / 2),
            y: 0
        };
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw field
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.field[r][c]) {
                    this.drawBlock(this.ctx, c, r, this.COLORS[this.field[r][c]]);
                }
            }
        }

        // Draw current piece
        if (this.current) {
            for (let r = 0; r < this.current.shape.length; r++) {
                for (let c = 0; c < this.current.shape[r].length; c++) {
                    if (this.current.shape[r][c]) {
                        this.drawBlock(this.ctx, this.current.x + c, this.current.y + r, this.COLORS[this.current.shape[r][c]]);
                    }
                }
            }
        }
    },

    drawNext() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        if (!this.next) return;

        const scale = 20;
        const offsetX = (this.nextCanvas.width - this.next.shape[0].length * scale) / 2;
        const offsetY = (this.nextCanvas.height - this.next.shape.length * scale) / 2;

        for (let r = 0; r < this.next.shape.length; r++) {
            for (let c = 0; c < this.next.shape[r].length; c++) {
                if (this.next.shape[r][c]) {
                    this.nextCtx.fillStyle = this.COLORS[this.next.shape[r][c]];
                    this.nextCtx.fillRect(offsetX + c * scale, offsetY + r * scale, scale - 1, scale - 1);
                }
            }
        }
    },

    drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE - 1, this.BLOCK_SIZE - 1);
    },

    tick() {
        if (this.isGameOver) return;
        this.move(0, 1);
    },

    move(dx, dy = 0) {
        if (this.isGameOver) return;

        if (this.isValid(this.current.shape, this.current.x + dx, this.current.y + dy)) {
            this.current.x += dx;
            this.current.y += dy;
            this.draw();
            App.haptic('light');
        } else if (dy === 1) {
            this.freeze();
        }
    },

    drop() {
        if (this.isGameOver) return;
        while (this.isValid(this.current.shape, this.current.x, this.current.y + 1)) {
            this.current.y++;
        }
        App.haptic('medium');
        this.freeze();
    },

    rotate() {
        if (this.isGameOver) return;
        const shape = this.current.shape;
        const rotated = shape[0].map((_, i) => shape.map(row => row[i]).reverse());

        if (this.isValid(rotated, this.current.x, this.current.y)) {
            this.current.shape = rotated;
            this.draw();
            App.haptic('light');
        }
    },

    isValid(shape, x, y) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newX = x + c;
                    const newY = y + r;
                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS || (newY >= 0 && this.field[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    freeze() {
        for (let r = 0; r < this.current.shape.length; r++) {
            for (let c = 0; c < this.current.shape[r].length; c++) {
                if (this.current.shape[r][c]) {
                    if (this.current.y + r < 0) {
                        return this.gameOver();
                    }
                    this.field[this.current.y + r][this.current.x + c] = this.current.shape[r][c];
                }
            }
        }
        this.clearLines();
        this.current = this.next;
        this.next = this.randomPiece();
        this.drawNext();

        if (!this.isValid(this.current.shape, this.current.x, this.current.y)) {
            this.gameOver();
        } else {
            this.draw();
        }
    },

    clearLines() {
        let cleared = 0;
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (this.field[r].every(cell => cell !== 0)) {
                this.field.splice(r, 1);
                this.field.unshift(Array(this.COLS).fill(0));
                cleared++;
                r++; // check same row again
            }
        }

        if (cleared > 0) {
            App.haptic('heavy');
            this.lines += cleared;
            this.score += [0, 40, 100, 300, 1200][cleared] * this.level;

            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.speed = Math.max(100, 800 - (this.level - 1) * 50);
                clearInterval(this.interval);
                this.interval = setInterval(() => this.tick(), this.speed);
            }
            this.updateScore();
        }
    },

    updateScore() {
        document.getElementById('tetris-score').textContent = `🏆 ${this.score}`;
        document.getElementById('tetris-level').textContent = `Ур. ${this.level}`;
    },

    gameOver() {
        this.isGameOver = true;
        clearInterval(this.interval);
        App.haptic('heavy');
        document.getElementById('tetris-result-title').textContent = 'Игра окончена';
        document.getElementById('tetris-result-text').textContent = `Счёт: ${this.score}\nУровень: ${this.level}`;
        document.getElementById('tetris-result').classList.remove('hidden');

        // Save to leaderboard
        if (window.submitScore && this.score > 0) {
            window.submitScore('tetris', this.score, this.level);
        }
    },

    hideLeaderboard() {
        this.showingLeaderboard = false;
        hideLeaderboard();
    }
};
