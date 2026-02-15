// ==================== CHESS ♟️ ====================
const Chess = {
    room: null,
    myColor: null,    // 'w' or 'b'
    isMyTurn: false,
    gameOver: false,
    selected: null,    // {r,c}
    validMoves: [],    // [{r,c}]
    board: [],         // 8x8, piece objects {type,color} or null
    captured: { w: [], b: [] },
    timers: null,      // null or {w: ms, b: ms, increment, lastTick}
    timerInterval: null,

    // Piece symbols
    SYMBOLS: {
        'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
        'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
    },

    // Castling rights, en passant
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,   // target square {r,c} or null
    currentTurn: 'w',
    moveHistory: [],

    // ==================== INIT ====================
    init(room) {
        this.room = room;
        this.gameOver = false;
        this.selected = null;
        this.validMoves = [];
        this.captured = { w: [], b: [] };
        this.moveHistory = [];

        const myIdx = room.players.findIndex(p => p.odId === App.userId);
        this.myColor = myIdx === 0 ? 'w' : 'b';
        this.currentTurn = 'w';
        this.isMyTurn = this.myColor === 'w';

        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassant = null;

        // Setup timers
        const settings = room.settings || {};
        if (settings.timer && settings.timer > 0) {
            const ms = settings.timer * 60 * 1000;
            this.timers = { w: ms, b: ms, increment: 2000, lastTick: Date.now() };
        } else {
            this.timers = null;
        }

        this.setupInitialBoard();
        this.render();
        this.updateUI();
        this.startTimerTick();
    },

    setupInitialBoard() {
        const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        this.board = [];
        for (let r = 0; r < 8; r++) {
            this.board[r] = [];
            for (let c = 0; c < 8; c++) {
                if (r === 0) this.board[r][c] = { type: back[c], color: 'b' };
                else if (r === 1) this.board[r][c] = { type: 'P', color: 'b' };
                else if (r === 6) this.board[r][c] = { type: 'P', color: 'w' };
                else if (r === 7) this.board[r][c] = { type: back[c], color: 'w' };
                else this.board[r][c] = null;
            }
        }
    },

    // ==================== RENDER ====================
    render() {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';

        // Flip board for black
        const rows = this.myColor === 'b' ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
        const cols = this.myColor === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        const rowOrder = this.myColor === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

        for (const r of rowOrder) {
            for (const c of cols) {
                const cell = document.createElement('div');
                const isDark = (r + c) % 2 === 1;
                cell.className = 'chess-cell ' + (isDark ? 'dark' : 'light');
                cell.dataset.r = r;
                cell.dataset.c = c;

                // Highlight
                if (this.selected && this.selected.r === r && this.selected.c === c) {
                    cell.classList.add('selected');
                }
                if (this.validMoves.find(m => m.r === r && m.c === c)) {
                    cell.classList.add(this.board[r][c] ? 'capture-hint' : 'move-hint');
                }

                // Last move highlight
                if (this.moveHistory.length > 0) {
                    const last = this.moveHistory[this.moveHistory.length - 1];
                    if ((last.from.r === r && last.from.c === c) || (last.to.r === r && last.to.c === c)) {
                        cell.classList.add('last-move');
                    }
                }

                const piece = this.board[r][c];
                if (piece) {
                    const sym = this.SYMBOLS[piece.color + piece.type];
                    const span = document.createElement('span');
                    span.className = 'chess-piece ' + piece.color;
                    span.textContent = sym;
                    cell.appendChild(span);
                }

                cell.addEventListener('click', () => this.onCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }

        // Coords
        this.renderCoords(boardEl);
    },

    renderCoords(boardEl) {
        // Row numbers & column letters
        const files = 'abcdefgh';
        const isFlipped = this.myColor === 'b';
        // Add file labels at bottom
        for (let i = 0; i < 8; i++) {
            const idx = isFlipped ? 7 - i : i;
            const label = document.createElement('span');
            label.className = 'chess-coord-file';
            label.textContent = files[idx];
            label.style.left = `calc(${i * 12.5}% + 6.25%)`;
            boardEl.appendChild(label);
        }
    },

    updateUI() {
        const turnEl = document.getElementById('chess-turn');
        if (turnEl) {
            turnEl.textContent = this.isMyTurn ? 'Ваш ход!' : 'Ход соперника...';
            turnEl.style.background = this.isMyTurn ? 'var(--accent-gradient)' : 'var(--glass)';
        }

        const p1 = document.getElementById('chess-player1');
        const p2 = document.getElementById('chess-player2');
        if (p1) p1.textContent = `Вы (${this.myColor === 'w' ? '♔ Белые' : '♚ Чёрные'})`;
        if (p2) {
            const opp = this.room.players.find(p => p.odId !== App.userId);
            p2.textContent = `${opp?.name || 'Соперник'} (${this.myColor === 'w' ? '♚ Чёрные' : '♔ Белые'})`;
        }

        // Captured pieces
        const cap1 = document.getElementById('chess-captured1');
        const cap2 = document.getElementById('chess-captured2');
        const myCap = this.captured[this.myColor === 'w' ? 'b' : 'w']; // pieces I captured
        const oppCap = this.captured[this.myColor]; // pieces opponent captured
        if (cap1) cap1.textContent = myCap.map(t => this.SYMBOLS[(this.myColor === 'w' ? 'b' : 'w') + t]).join('');
        if (cap2) cap2.textContent = oppCap.map(t => this.SYMBOLS[this.myColor + t]).join('');

        // Timers
        this.updateTimerDisplay();
    },

    updateTimerDisplay() {
        if (!this.timers) return;
        const fmt = (ms) => {
            const s = Math.max(0, Math.floor(ms / 1000));
            const m = Math.floor(s / 60);
            return `${m}:${String(s % 60).padStart(2, '0')}`;
        };
        const t1 = document.getElementById('chess-timer1');
        const t2 = document.getElementById('chess-timer2');
        if (t1) {
            t1.textContent = fmt(this.timers[this.myColor]);
            t1.classList.toggle('low-time', this.timers[this.myColor] < 30000);
        }
        if (t2) {
            const oppColor = this.myColor === 'w' ? 'b' : 'w';
            t2.textContent = fmt(this.timers[oppColor]);
            t2.classList.toggle('low-time', this.timers[oppColor] < 30000);
        }
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
            if (this.timers[this.currentTurn] <= 0) {
                this.timers[this.currentTurn] = 0;
                this.updateTimerDisplay();
                // Time loss — handled by server
                return;
            }
            this.updateTimerDisplay();
        }, 200);
    },

    // ==================== CLICK HANDLER ====================
    onCellClick(r, c) {
        if (this.gameOver || !this.isMyTurn) return;
        const piece = this.board[r][c];

        // If a valid move target is clicked
        if (this.selected && this.validMoves.find(m => m.r === r && m.c === c)) {
            this.makeMove(this.selected.r, this.selected.c, r, c);
            return;
        }

        // Select own piece
        if (piece && piece.color === this.myColor) {
            this.selected = { r, c };
            this.validMoves = this.getLegalMoves(r, c);
            this.render();
            return;
        }

        // Deselect
        this.selected = null;
        this.validMoves = [];
        this.render();
    },

    // ==================== MOVE ====================
    makeMove(fr, fc, tr, tc) {
        const piece = this.board[fr][fc];
        if (!piece) return;

        // Check pawn promotion
        if (piece.type === 'P' && (tr === 0 || tr === 7)) {
            this.showPromotion(fr, fc, tr, tc);
            return;
        }

        this.sendMove(fr, fc, tr, tc);
    },

    showPromotion(fr, fc, tr, tc) {
        const modal = document.getElementById('chess-promotion');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.innerHTML = '';
        const pieces = ['Q', 'R', 'B', 'N'];
        pieces.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'chess-promo-btn';
            btn.textContent = this.SYMBOLS[this.myColor + type];
            btn.onclick = () => {
                modal.classList.add('hidden');
                this.sendMove(fr, fc, tr, tc, type);
            };
            modal.appendChild(btn);
        });
    },

    sendMove(fr, fc, tr, tc, promotion = null) {
        Multiplayer.chessMove({ fr, fc, tr, tc, promotion });
        this.selected = null;
        this.validMoves = [];
    },

    // ==================== APPLY MOVE (from server) ====================
    applyMove(data) {
        const { fr, fc, tr, tc, promotion, castling: castleType, enPassantCapture, timers: serverTimers } = data;
        const piece = this.board[fr][fc];
        if (!piece) return;

        // Capture
        const target = this.board[tr][tc];
        if (target) {
            this.captured[target.color].push(target.type);
        }

        // En passant capture
        if (enPassantCapture) {
            const ep = this.board[enPassantCapture.r][enPassantCapture.c];
            if (ep) this.captured[ep.color].push(ep.type);
            this.board[enPassantCapture.r][enPassantCapture.c] = null;
        }

        // Move piece
        this.board[tr][tc] = piece;
        this.board[fr][fc] = null;

        // Promotion
        if (promotion) {
            this.board[tr][tc] = { type: promotion, color: piece.color };
        }

        // Castling rook movement
        if (castleType) {
            if (castleType === 'K') {
                // Kingside: rook from col 7 to col 5
                this.board[tr][5] = this.board[tr][7];
                this.board[tr][7] = null;
            } else if (castleType === 'Q') {
                // Queenside: rook from col 0 to col 3
                this.board[tr][3] = this.board[tr][0];
                this.board[tr][0] = null;
            }
        }

        // Update castling rights
        if (data.castlingRights) this.castling = data.castlingRights;
        this.enPassant = data.enPassantTarget || null;

        // Move history
        this.moveHistory.push({ from: { r: fr, c: fc }, to: { r: tr, c: tc } });

        // Update timers
        if (serverTimers) this.timers = { ...this.timers, ...serverTimers };

        // Switch turn
        this.currentTurn = data.currentTurn;
        this.isMyTurn = this.currentTurn === this.myColor;

        this.render();
        this.updateUI();
        App.haptic('light');
    },

    // ==================== UPDATE FROM SERVER ====================
    update(data) {
        if (data.move) this.applyMove(data.move);

        if (data.check) {
            // Flash king in check
            const kingPos = this.findKing(this.currentTurn);
            if (kingPos) {
                const cells = document.querySelectorAll('.chess-cell');
                cells.forEach(cell => {
                    if (+cell.dataset.r === kingPos.r && +cell.dataset.c === kingPos.c) {
                        cell.classList.add('in-check');
                    }
                });
            }
        }

        if (data.gameOver) {
            this.gameOver = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            const resultEl = document.getElementById('chess-result');
            if (resultEl) resultEl.classList.remove('hidden');

            const titleEl = document.getElementById('chess-result-title');
            const textEl = document.getElementById('chess-result-text');

            if (data.winner === 'draw') {
                if (titleEl) titleEl.textContent = '🤝 Ничья!';
                if (textEl) textEl.textContent = data.reason || 'Пат';
                App.haptic('medium');
            } else if (data.winner === App.userId) {
                if (titleEl) titleEl.textContent = '🎉 Вы победили!';
                if (textEl) textEl.textContent = data.reason || 'Мат';
                App.showVictory(true);
            } else {
                if (titleEl) titleEl.textContent = '😔 Вы проиграли';
                if (textEl) textEl.textContent = data.reason || 'Мат';
                App.showVictory(false);
            }

            const rematchEl = document.getElementById('chess-rematch');
            if (rematchEl) rematchEl.classList.remove('hidden');
        }
    },

    // ==================== MOVE GENERATION ====================
    getLegalMoves(r, c) {
        const piece = this.board[r][c];
        if (!piece) return [];
        const pseudo = this.getPseudoMoves(r, c, piece);
        // Filter out moves that leave king in check
        return pseudo.filter(m => {
            const sim = this.simulate(r, c, m.r, m.c);
            const inCheck = this.isKingInCheck(piece.color, sim);
            return !inCheck;
        });
    },

    getPseudoMoves(r, c, piece) {
        const moves = [];
        const color = piece.color;
        const B = this.board;

        const addIf = (tr, tc) => {
            if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) return false;
            const t = B[tr][tc];
            if (t && t.color === color) return false;
            moves.push({ r: tr, c: tc });
            return !t; // continue sliding if empty
        };

        switch (piece.type) {
            case 'P': {
                const dir = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;
                // Forward
                if (!B[r + dir]?.[c]) {
                    moves.push({ r: r + dir, c });
                    // Double move
                    if (r === startRow && !B[r + 2 * dir]?.[c]) {
                        moves.push({ r: r + 2 * dir, c });
                    }
                }
                // Captures
                for (const dc of [-1, 1]) {
                    const tr = r + dir, tc = c + dc;
                    if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) continue;
                    if (B[tr][tc] && B[tr][tc].color !== color) moves.push({ r: tr, c: tc });
                    // En passant
                    if (this.enPassant && this.enPassant.r === tr && this.enPassant.c === tc) {
                        moves.push({ r: tr, c: tc });
                    }
                }
                break;
            }

            case 'N':
                for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                    addIf(r + dr, c + dc);
                }
                break;

            case 'B':
                for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                    for (let i = 1; i < 8; i++) { if (!addIf(r + dr * i, c + dc * i)) break; }
                }
                break;

            case 'R':
                for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    for (let i = 1; i < 8; i++) { if (!addIf(r + dr * i, c + dc * i)) break; }
                }
                break;

            case 'Q':
                for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                    for (let i = 1; i < 8; i++) { if (!addIf(r + dr * i, c + dc * i)) break; }
                }
                break;

            case 'K':
                for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                    addIf(r + dr, c + dc);
                }
                // Castling
                if (!this.isKingInCheck(color, B)) {
                    const row = color === 'w' ? 7 : 0;
                    if (r === row && c === 4) {
                        // Kingside
                        if (this.castling[color + 'K'] && !B[row][5] && !B[row][6] && B[row][7]?.type === 'R') {
                            if (!this.isSquareAttacked(row, 5, color, B) && !this.isSquareAttacked(row, 6, color, B)) {
                                moves.push({ r: row, c: 6 });
                            }
                        }
                        // Queenside
                        if (this.castling[color + 'Q'] && !B[row][3] && !B[row][2] && !B[row][1] && B[row][0]?.type === 'R') {
                            if (!this.isSquareAttacked(row, 3, color, B) && !this.isSquareAttacked(row, 2, color, B)) {
                                moves.push({ r: row, c: 2 });
                            }
                        }
                    }
                }
                break;
        }
        return moves;
    },

    // ==================== CHECK DETECTION ====================
    findKing(color, board = this.board) {
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c]?.type === 'K' && board[r][c]?.color === color)
                    return { r, c };
        return null;
    },

    isKingInCheck(color, board = this.board) {
        const king = this.findKing(color, board);
        if (!king) return false;
        return this.isSquareAttacked(king.r, king.c, color, board);
    },

    isSquareAttacked(r, c, defenderColor, board) {
        const attacker = defenderColor === 'w' ? 'b' : 'w';
        // Check all opponent pieces
        for (let pr = 0; pr < 8; pr++) {
            for (let pc = 0; pc < 8; pc++) {
                const p = board[pr][pc];
                if (!p || p.color !== attacker) continue;
                if (this.canAttack(pr, pc, r, c, p, board)) return true;
            }
        }
        return false;
    },

    canAttack(fr, fc, tr, tc, piece, board) {
        const dr = tr - fr, dc = tc - fc;
        switch (piece.type) {
            case 'P': {
                const dir = piece.color === 'w' ? -1 : 1;
                return dr === dir && Math.abs(dc) === 1;
            }
            case 'N':
                return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
            case 'B':
                if (Math.abs(dr) !== Math.abs(dc) || dr === 0) return false;
                return this.isPathClear(fr, fc, tr, tc, board);
            case 'R':
                if (dr !== 0 && dc !== 0) return false;
                return this.isPathClear(fr, fc, tr, tc, board);
            case 'Q':
                if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return false;
                return this.isPathClear(fr, fc, tr, tc, board);
            case 'K':
                return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        }
        return false;
    },

    isPathClear(fr, fc, tr, tc, board) {
        const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
        let r = fr + dr, c = fc + dc;
        while (r !== tr || c !== tc) {
            if (board[r][c]) return false;
            r += dr; c += dc;
        }
        return true;
    },

    // ==================== SIMULATION ====================
    simulate(fr, fc, tr, tc) {
        const sim = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        // En passant capture
        const piece = sim[fr][fc];
        if (piece?.type === 'P' && this.enPassant && tr === this.enPassant.r && tc === this.enPassant.c) {
            const epRow = piece.color === 'w' ? tr + 1 : tr - 1;
            sim[epRow][tc] = null;
        }
        sim[tr][tc] = sim[fr][fc];
        sim[fr][fc] = null;
        return sim;
    },

    // ==================== RESIGN ====================
    resign() {
        if (this.gameOver) return;
        if (confirm('Сдаться?')) {
            Multiplayer.chessResign();
        }
    }
};

// ==================== SETUP ====================
let chessTimer = 0;

function selectChessTimer(btn, val) {
    document.querySelectorAll('#chess-setup .mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    chessTimer = val;
    App.haptic('light');
}

function createChessRoom() {
    App.currentGame = 'chess';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '♟️ Шахматы';

    const isPrivate = document.getElementById('chess-private-toggle')?.checked || false;
    const password = document.getElementById('chess-password')?.value.trim() || null;

    Multiplayer.createRoom('chess', isPrivate ? password : null, !isPrivate, { timer: chessTimer });
}
