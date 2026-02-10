// ==================== SNAKE ====================
const SnakeGame = {
    canvas: null,
    ctx: null,
    gridSize: 20,
    tileCount: 20,
    snake: [],
    food: { x: 0, y: 0 },
    dx: 1,
    dy: 0,
    nextDx: 1,
    nextDy: 0,
    score: 0,
    bestScore: 0,
    speed: 150,
    gameLoop: null,
    running: false,
    touchStartX: 0,
    touchStartY: 0,

    init() {
        this.canvas = document.getElementById('snake-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bestScore = parseInt(localStorage.getItem('snake_best') || '0');
        this.setupCanvas();
        this.setupControls();
        this.showOverlay('🐍 Змейка', 'Нажмите чтобы начать');
    },

    setupCanvas() {
        const wrap = document.querySelector('.snake-canvas-wrap');
        if (!wrap) return;
        const size = Math.min(wrap.clientWidth - 32, wrap.clientHeight - 32, 400);
        this.canvas.width = size;
        this.canvas.height = size;
        this.gridSize = size / this.tileCount;
    },

    setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (!this.running) return;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': if (this.dy !== 1) { this.nextDx = 0; this.nextDy = -1; } break;
                case 'ArrowDown': case 's': case 'S': if (this.dy !== -1) { this.nextDx = 0; this.nextDy = 1; } break;
                case 'ArrowLeft': case 'a': case 'A': if (this.dx !== 1) { this.nextDx = -1; this.nextDy = 0; } break;
                case 'ArrowRight': case 'd': case 'D': if (this.dx !== -1) { this.nextDx = 1; this.nextDy = 0; } break;
            }
        });

        // Touch swipes — prevent Telegram from closing on swipe down
        const canvasWrap = document.querySelector('.snake-canvas-wrap');
        if (canvasWrap) {
            // Prevent all default touch behavior on the game area
            canvasWrap.style.touchAction = 'none';
            canvasWrap.style.overscrollBehavior = 'none';

            canvasWrap.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.touchHandled = false;

                // Disable Telegram vertical swipes while playing
                if (window.Telegram && window.Telegram.WebApp) {
                    try { window.Telegram.WebApp.disableVerticalSwipes(); } catch (err) { }
                }
            }, { passive: false });

            canvasWrap.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Block scroll & TG close
                if (!this.running || this.touchHandled) return;

                const diffX = e.touches[0].clientX - this.touchStartX;
                const diffY = e.touches[0].clientY - this.touchStartY;
                const minSwipe = 15; // Very sensitive

                if (Math.abs(diffX) < minSwipe && Math.abs(diffY) < minSwipe) return;

                this.touchHandled = true;

                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX > 0 && this.dx !== -1) { this.nextDx = 1; this.nextDy = 0; }
                    else if (diffX < 0 && this.dx !== 1) { this.nextDx = -1; this.nextDy = 0; }
                } else {
                    if (diffY > 0 && this.dy !== -1) { this.nextDx = 0; this.nextDy = 1; }
                    else if (diffY < 0 && this.dy !== 1) { this.nextDx = 0; this.nextDy = -1; }
                }
            }, { passive: false });

            canvasWrap.addEventListener('touchend', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
    },

    start() {
        this.setupCanvas();
        this.snake = [{ x: 10, y: 10 }];
        this.dx = 1; this.dy = 0;
        this.nextDx = 1; this.nextDy = 0;
        this.score = 0;
        this.speed = 150;
        this.running = true;
        this.spawnFood();
        this.hideOverlay();
        this.updateScore();
        clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), this.speed);
    },

    update() {
        this.dx = this.nextDx;
        this.dy = this.nextDy;

        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.die();
            return;
        }

        // Self collision
        for (const seg of this.snake) {
            if (seg.x === head.x && seg.y === head.y) {
                this.die();
                return;
            }
        }

        this.snake.unshift(head);

        // Eat food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.updateScore();
            this.spawnFood();
            // Speed up
            if (this.speed > 60) {
                this.speed -= 3;
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.speed);
            }
        } else {
            this.snake.pop();
        }

        this.draw();
    },

    draw() {
        const ctx = this.ctx;
        const gs = this.gridSize;

        // Background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gs, 0);
            ctx.lineTo(i * gs, this.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * gs);
            ctx.lineTo(this.canvas.width, i * gs);
            ctx.stroke();
        }

        // Snake
        this.snake.forEach((seg, i) => {
            const gradient = ctx.createLinearGradient(seg.x * gs, seg.y * gs, (seg.x + 1) * gs, (seg.y + 1) * gs);
            if (i === 0) {
                gradient.addColorStop(0, '#00b894');
                gradient.addColorStop(1, '#00cec9');
            } else {
                const alpha = 1 - (i / this.snake.length) * 0.5;
                gradient.addColorStop(0, `rgba(0, 184, 148, ${alpha})`);
                gradient.addColorStop(1, `rgba(0, 206, 201, ${alpha})`);
            }
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2, 4);
            ctx.fill();

            // Eyes on head
            if (i === 0) {
                ctx.fillStyle = '#fff';
                const eyeSize = gs * 0.15;
                const eyeOffset = gs * 0.25;
                if (this.dx === 1) {
                    ctx.beginPath(); ctx.arc(seg.x * gs + gs - eyeOffset, seg.y * gs + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(seg.x * gs + gs - eyeOffset, seg.y * gs + gs - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else if (this.dx === -1) {
                    ctx.beginPath(); ctx.arc(seg.x * gs + eyeOffset, seg.y * gs + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(seg.x * gs + eyeOffset, seg.y * gs + gs - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else if (this.dy === -1) {
                    ctx.beginPath(); ctx.arc(seg.x * gs + eyeOffset, seg.y * gs + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(seg.x * gs + gs - eyeOffset, seg.y * gs + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.beginPath(); ctx.arc(seg.x * gs + eyeOffset, seg.y * gs + gs - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(seg.x * gs + gs - eyeOffset, seg.y * gs + gs - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
                }
            }
        });

        // Food
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(this.food.x * gs + gs / 2, this.food.y * gs + gs / 2, gs * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Food stem
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.food.x * gs + gs / 2 - 1, this.food.y * gs + gs * 0.1, 2, gs * 0.2);
    },

    spawnFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.tileCount);
            y = Math.floor(Math.random() * this.tileCount);
        } while (this.snake.some(s => s.x === x && s.y === y));
        this.food = { x, y };
    },

    die() {
        this.running = false;
        clearInterval(this.gameLoop);
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('snake_best', this.bestScore.toString());
        }
        this.updateScore();
        this.showOverlay('💀 Game Over', `Счёт: ${this.score}`);
    },

    updateScore() {
        document.getElementById('snake-score').textContent = `🍎 ${this.score}`;
        document.getElementById('snake-best').textContent = `🏆 ${this.bestScore}`;
    },

    showOverlay(title, text) {
        const overlay = document.getElementById('snake-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('snake-overlay-title').textContent = title;
        document.getElementById('snake-overlay-text').textContent = text;
    },

    hideOverlay() {
        document.getElementById('snake-overlay').classList.add('hidden');
    },

    dpad(dir) {
        if (!this.running) return;
        switch (dir) {
            case 'up': if (this.dy !== 1) { this.nextDx = 0; this.nextDy = -1; } break;
            case 'down': if (this.dy !== -1) { this.nextDx = 0; this.nextDy = 1; } break;
            case 'left': if (this.dx !== 1) { this.nextDx = -1; this.nextDy = 0; } break;
            case 'right': if (this.dx !== -1) { this.nextDx = 1; this.nextDy = 0; } break;
        }
    }
};
