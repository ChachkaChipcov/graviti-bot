// ==================== CHECKERS (Шашки) 🏁 ====================
const Checkers = {
    room: null,
    myColor: null,    // 'w' or 'b'
    isMyTurn: false,
    gameOver: false,
    selected: null,    // {r,c}
    validMoves: [],    // [{r,c,captures:[{r,c}]}]
    board: [],         // 8x8: null | {color:'w'|'b', king:bool}
    mustCapture: [],   // forced capture pieces
    captured: { w: 0, b: 0 },
    timers: null,
    timerInterval: null,
    currentTurn: 'w',
    moveHistory: [],
    multiCapturePiece: null, // piece mid-chain capture

    // ==================== INIT ====================
    init(room) {
        this.room = room;
        this.gameOver = false;
        this.selected = null;
        this.validMoves = [];
        this.captured = { w: 0, b: 0 };
        this.moveHistory = [];
        this.mustCapture = [];
        this.multiCapturePiece = null;

        const myIdx = room.players.findIndex(p => p.odId === App.userId);
        this.myColor = myIdx === 0 ? 'w' : 'b';
        this.currentTurn = 'w';
        this.isMyTurn = this.myColor === 'w';

        const settings = room.settings || {};
        if (settings.timer && settings.timer > 0) {
            const ms = settings.timer * 60 * 1000;
            this.timers = { w: ms, b: ms, increment: 2000, lastTick: Date.now() };
        } else {
            this.timers = null;
        }

        this.setupBoard();
        this.findMustCapture();
        this.render();
        this.updateUI();
        this.startTimerTick();
    },

    setupBoard() {
        this.board = [];
        for (let r = 0; r < 8; r++) {
            this.board[r] = [];
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) this.board[r][c] = { color: 'b', king: false };
                    else if (r > 4) this.board[r][c] = { color: 'w', king: false };
                    else this.board[r][c] = null;
                } else {
                    this.board[r][c] = null;
                }
            }
        }
    },

    // ==================== RENDER ====================
    render() {
        const boardEl = document.getElementById('checkers-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';

        const rowOrder = this.myColor === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        const colOrder = this.myColor === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

        for (const r of rowOrder) {
            for (const c of colOrder) {
                const cell = document.createElement('div');
                const isDark = (r + c) % 2 === 1;
                cell.className = 'ck-cell ' + (isDark ? 'dark' : 'light');
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (this.selected && this.selected.r === r && this.selected.c === c) {
                    cell.classList.add('selected');
                }
                if (this.validMoves.find(m => m.r === r && m.c === c)) {
                    cell.classList.add('move-hint');
                }
                if (this.moveHistory.length > 0) {
                    const last = this.moveHistory[this.moveHistory.length - 1];
                    if ((last.from.r === r && last.from.c === c) || (last.to.r === r && last.to.c === c)) {
                        cell.classList.add('last-move');
                    }
                }
                if (this.mustCapture.find(p => p.r === r && p.c === c)) {
                    cell.classList.add('must-capture');
                }

                const piece = this.board[r][c];
                if (piece) {
                    const span = document.createElement('span');
                    span.className = 'ck-piece ' + piece.color + (piece.king ? ' king' : '');
                    span.textContent = piece.king ? (piece.color === 'w' ? '👑' : '👑') : (piece.color === 'w' ? '⚪' : '⚫');
                    cell.appendChild(span);
                }

                cell.addEventListener('click', () => this.onCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }
    },

    updateUI() {
        const turnEl = document.getElementById('ck-turn');
        if (turnEl) {
            turnEl.textContent = this.isMyTurn ? 'Ваш ход!' : 'Ход соперника...';
            turnEl.style.background = this.isMyTurn ? 'var(--accent-gradient)' : 'var(--glass)';
        }

        const p1 = document.getElementById('ck-player1');
        const p2 = document.getElementById('ck-player2');
        if (p1) p1.textContent = `Вы (${this.myColor === 'w' ? '⚪ Белые' : '⚫ Чёрные'})`;
        if (p2) {
            const opp = this.room.players.find(p => p.odId !== App.userId);
            p2.textContent = `${opp?.name || 'Соперник'} (${this.myColor === 'w' ? '⚫ Чёрные' : '⚪ Белые'})`;
        }

        const c1 = document.getElementById('ck-captured1');
        const c2 = document.getElementById('ck-captured2');
        if (c1) c1.textContent = `Взято: ${this.captured[this.myColor === 'w' ? 'b' : 'w']}`;
        if (c2) c2.textContent = `Взято: ${this.captured[this.myColor]}`;

        this.updateTimerDisplay();
    },

    updateTimerDisplay() {
        if (!this.timers) return;
        const fmt = (ms) => {
            const s = Math.max(0, Math.floor(ms / 1000));
            const m = Math.floor(s / 60);
            return `${m}:${String(s % 60).padStart(2, '0')}`;
        };
        const t1 = document.getElementById('ck-timer1');
        const t2 = document.getElementById('ck-timer2');
        if (t1) { t1.textContent = fmt(this.timers[this.myColor]); t1.classList.toggle('low-time', this.timers[this.myColor] < 30000); }
        if (t2) { const opp = this.myColor === 'w' ? 'b' : 'w'; t2.textContent = fmt(this.timers[opp]); t2.classList.toggle('low-time', this.timers[opp] < 30000); }
    },

    startTimerTick() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (!this.timers) return;
        this.timers.lastTick = Date.now();
        this.timerInterval = setInterval(() => {
            if (this.gameOver || !this.timers) { clearInterval(this.timerInterval); return; }
            const now = Date.now();
            const dt = now - this.timers.lastTick;
            this.timers.lastTick = now;
            this.timers[this.currentTurn] -= dt;
            if (this.timers[this.currentTurn] <= 0) this.timers[this.currentTurn] = 0;
            this.updateTimerDisplay();
        }, 200);
    },

    // ==================== MOVE LOGIC ====================
    findMustCapture() {
        this.mustCapture = [];
        if (this.multiCapturePiece) {
            // Only that piece can continue chain capture
            const caps = this.getCapturesFrom(this.multiCapturePiece.r, this.multiCapturePiece.c);
            if (caps.length > 0) this.mustCapture.push(this.multiCapturePiece);
            return;
        }
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p || p.color !== this.currentTurn) continue;
                const caps = this.getCapturesFrom(r, c);
                if (caps.length > 0) this.mustCapture.push({ r, c });
            }
        }
    },

    getCapturesFrom(r, c) {
        const piece = this.board[r][c];
        if (!piece) return [];
        const captures = [];
        const enemy = piece.color === 'w' ? 'b' : 'w';

        if (piece.king) {
            // King: can capture at any distance diagonally
            for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                let er = r + dr, ec = c + dc;
                // Find first piece on this diagonal
                while (er >= 0 && er < 8 && ec >= 0 && ec < 8) {
                    if (this.board[er][ec]) {
                        if (this.board[er][ec].color === enemy) {
                            // Found enemy — check landing squares after it
                            let lr = er + dr, lc = ec + dc;
                            while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !this.board[lr][lc]) {
                                captures.push({ r: lr, c: lc, captured: { r: er, c: ec } });
                                lr += dr; lc += dc;
                            }
                        }
                        break; // stop on first piece regardless
                    }
                    er += dr; ec += dc;
                }
            }
        } else {
            // Regular piece: capture 1 diagonal forward/backward
            for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                const mr = r + dr, mc = c + dc; // middle (enemy)
                const lr = r + 2 * dr, lc = c + 2 * dc; // landing
                if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;
                if (this.board[mr]?.[mc]?.color === enemy && !this.board[lr][lc]) {
                    captures.push({ r: lr, c: lc, captured: { r: mr, c: mc } });
                }
            }
        }
        return captures;
    },

    getSimpleMoves(r, c) {
        const piece = this.board[r][c];
        if (!piece) return [];
        const moves = [];

        if (piece.king) {
            // King: slide any distance diagonally
            for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                let tr = r + dr, tc = c + dc;
                while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !this.board[tr][tc]) {
                    moves.push({ r: tr, c: tc });
                    tr += dr; tc += dc;
                }
            }
        } else {
            // Regular: 1 step forward diagonally
            const dirs = piece.color === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
            for (const [dr, dc] of dirs) {
                const tr = r + dr, tc = c + dc;
                if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !this.board[tr][tc]) {
                    moves.push({ r: tr, c: tc });
                }
            }
        }
        return moves;
    },

    // ==================== CLICK ====================
    onCellClick(r, c) {
        if (this.gameOver || !this.isMyTurn) return;

        // Click on a valid move target
        if (this.selected && this.validMoves.find(m => m.r === r && m.c === c)) {
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            this.sendMove(this.selected.r, this.selected.c, r, c, move.captured || null);
            return;
        }

        const piece = this.board[r][c];
        if (!piece || piece.color !== this.myColor) {
            this.selected = null;
            this.validMoves = [];
            this.render();
            return;
        }

        // Must capture check
        if (this.mustCapture.length > 0 && !this.mustCapture.find(p => p.r === r && p.c === c)) {
            // Can only select pieces that must capture
            this.selected = null;
            this.validMoves = [];
            this.render();
            return;
        }

        this.selected = { r, c };
        if (this.mustCapture.length > 0) {
            this.validMoves = this.getCapturesFrom(r, c);
        } else {
            this.validMoves = this.getSimpleMoves(r, c);
        }
        this.render();
    },

    sendMove(fr, fc, tr, tc, captured) {
        Multiplayer.checkersMove({ fr, fc, tr, tc, captured });
        this.selected = null;
        this.validMoves = [];
    },

    // ==================== APPLY ====================
    applyMove(data) {
        const { fr, fc, tr, tc, captured, crowned, chainContinue, timers: st } = data;
        const piece = this.board[fr][fc];
        if (!piece) return;

        // Move piece
        this.board[tr][tc] = piece;
        this.board[fr][fc] = null;

        // Remove captured
        if (captured) {
            this.board[captured.r][captured.c] = null;
            this.captured[piece.color === 'w' ? 'b' : 'w']++;
        }

        // Crown
        if (crowned) {
            this.board[tr][tc].king = true;
        }

        this.moveHistory.push({ from: { r: fr, c: fc }, to: { r: tr, c: tc } });

        if (st) this.timers = { ...this.timers, ...st };

        if (chainContinue) {
            this.multiCapturePiece = { r: tr, c: tc };
        } else {
            this.multiCapturePiece = null;
            this.currentTurn = data.currentTurn;
            this.isMyTurn = this.currentTurn === this.myColor;
        }

        this.findMustCapture();
        this.render();
        this.updateUI();
        App.haptic('light');
    },

    update(data) {
        if (data.move) this.applyMove(data.move);

        if (data.gameOver) {
            this.gameOver = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            const resultEl = document.getElementById('ck-result');
            if (resultEl) resultEl.classList.remove('hidden');

            const titleEl = document.getElementById('ck-result-title');
            const textEl = document.getElementById('ck-result-text');

            if (data.winner === 'draw') {
                if (titleEl) titleEl.textContent = '🤝 Ничья!';
                if (textEl) textEl.textContent = 'Ничья';
                App.haptic('medium');
            } else if (data.winner === App.userId) {
                if (titleEl) titleEl.textContent = '🎉 Вы победили!';
                if (textEl) textEl.textContent = data.reason || 'Все шашки взяты';
                App.showVictory(true);
            } else {
                if (titleEl) titleEl.textContent = '😔 Вы проиграли';
                if (textEl) textEl.textContent = data.reason || 'Все шашки потеряны';
                App.showVictory(false);
            }

            const rematchEl = document.getElementById('ck-rematch');
            if (rematchEl) rematchEl.classList.remove('hidden');
        }
    }
};

// ==================== SETUP ====================
let checkersTimer = 0;

function selectCheckersTimer(btn, val) {
    document.querySelectorAll('#checkers-setup .mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    checkersTimer = val;
    App.haptic('light');
}

function createCheckersRoom() {
    App.currentGame = 'checkers';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '🏁 Шашки';

    const isPrivate = document.getElementById('checkers-private-toggle')?.checked || false;
    const password = document.getElementById('checkers-password')?.value.trim() || null;

    Multiplayer.createRoom('checkers', isPrivate ? password : null, !isPrivate, { timer: checkersTimer });
}

