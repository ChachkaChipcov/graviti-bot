// ==================== MATCH-3 (3 в ряд) — FULL VERSION v2 ====================
const Match3Game = {
    BOARD_SIZE: 8,
    GEMS: ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'],
    board: [],       // gem type index (-1 = empty)
    chains: [],      // chain count per cell (0 = no chain)
    selected: null,
    score: 0,
    moves: 0,
    maxMoves: 0,
    targetScore: 0,
    animating: false,
    level: 1,
    maxLevel: 1000,
    unlockedLevel: 1,
    levelStars: {},
    showingMap: true,
    mapPage: 0,
    LEVELS_PER_PAGE: 30,
    touchStartX: 0,
    touchStartY: 0,
    touchCell: null,
    tutorialShown: false,
    comboCount: 0,
    cells: [],        // DOM references for smooth animation

    init() {
        this.loadProgress();
        this.tutorialShown = localStorage.getItem('m3_tutorial') === '1';
        if (!this.tutorialShown) {
            this.showTutorial();
        } else {
            this.showMap();
        }
    },

    // ========== TUTORIAL ==========
    showTutorial() {
        const field = document.getElementById('m3-field');
        if (!field) return;
        this.showingMap = true;
        const header = document.querySelector('.m3-info');
        if (header) header.style.display = 'none';
        this.removeProgress();

        field.className = 'm3-tutorial';
        field.innerHTML = `
      <div class="m3-tut-slide active" data-slide="0">
        <div class="m3-tut-emoji">💎</div>
        <h3>Добро пожаловать!</h3>
        <p>Собирай 3 или больше одинаковых камней в ряд!</p>
      </div>
      <div class="m3-tut-slide" data-slide="1">
        <div class="m3-tut-emoji">👆</div>
        <h3>Управление</h3>
        <p>Свайпай камни или нажимай на два соседних, чтобы поменять их местами.</p>
      </div>
      <div class="m3-tut-slide" data-slide="2">
        <div class="m3-tut-emoji">⛓️</div>
        <h3>Цепи!</h3>
        <p>Некоторые камни скованы цепями. Собери совпадение рядом, чтобы разбить цепь!</p>
      </div>
      <div class="m3-tut-slide" data-slide="3">
        <div class="m3-tut-emoji">🗺️</div>
        <h3>1000 уровней!</h3>
        <p>Каждый уровень сложнее. Собирай звёзды!</p>
      </div>
      <div class="m3-tut-nav">
        <span class="m3-tut-dots">
          <span class="m3-tut-dot active" data-d="0"></span>
          <span class="m3-tut-dot" data-d="1"></span>
          <span class="m3-tut-dot" data-d="2"></span>
          <span class="m3-tut-dot" data-d="3"></span>
        </span>
        <button class="btn primary" onclick="Match3Game.nextTutSlide()">Далее ➡️</button>
      </div>
    `;
        this._tutSlide = 0;
    },

    nextTutSlide() {
        this._tutSlide++;
        if (this._tutSlide > 3) {
            this.tutorialShown = true;
            localStorage.setItem('m3_tutorial', '1');
            this.showMap();
            return;
        }
        document.querySelectorAll('.m3-tut-slide').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.m3-tut-dot').forEach(d => d.classList.remove('active'));
        const s = document.querySelector(`.m3-tut-slide[data-slide="${this._tutSlide}"]`);
        const d = document.querySelector(`.m3-tut-dot[data-d="${this._tutSlide}"]`);
        if (s) s.classList.add('active');
        if (d) d.classList.add('active');
        if (this._tutSlide === 3) {
            const btn = document.querySelector('.m3-tut-nav .btn');
            if (btn) btn.textContent = 'Начать! 🎮';
        }
    },

    // ========== SAVE / LOAD ==========
    loadProgress() {
        try {
            this.unlockedLevel = parseInt(localStorage.getItem('m3_unlocked') || '1');
            const s = localStorage.getItem('m3_stars');
            this.levelStars = s ? JSON.parse(s) : {};
        } catch (e) { this.unlockedLevel = 1; this.levelStars = {}; }
    },
    saveProgress() {
        localStorage.setItem('m3_unlocked', this.unlockedLevel.toString());
        localStorage.setItem('m3_stars', JSON.stringify(this.levelStars));
    },

    // ========== LEVEL CONFIG ==========
    getLevelConfig(lvl) {
        const moves = Math.max(12, 30 - Math.floor(lvl / 25));
        const target = 300 + (lvl - 1) * 80 + Math.floor(lvl / 10) * 50;
        const gemCount = lvl < 20 ? 5 : 6;
        const star2 = Math.floor(target * 1.3);
        const star3 = Math.floor(target * 1.7);
        // Chain config: chains start at level 5
        let chainCount = 0;
        let maxChain = 0;
        if (lvl >= 5) {
            chainCount = Math.min(20, 2 + Math.floor(lvl / 5));
            maxChain = lvl >= 30 ? 2 : 1;
        }
        return { moves, target, gemCount, star2, star3, level: lvl, chainCount, maxChain };
    },

    // ========== LEVEL MAP ==========
    showMap() {
        this.showingMap = true;
        this.mapPage = Math.floor((this.unlockedLevel - 1) / this.LEVELS_PER_PAGE);
        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');
        const header = document.querySelector('.m3-info');
        if (header) header.style.display = 'none';
        this.removeProgress();
        this.renderMap();
    },

    renderMap() {
        const field = document.getElementById('m3-field');
        if (!field) return;
        field.className = 'm3-level-map';
        const start = this.mapPage * this.LEVELS_PER_PAGE + 1;
        const end = Math.min(start + this.LEVELS_PER_PAGE - 1, this.maxLevel);
        let html = '<div class="m3-map-header">';
        html += `<button class="m3-map-nav" onclick="Match3Game.prevPage()" ${this.mapPage <= 0 ? 'disabled' : ''}>◀</button>`;
        html += `<span class="m3-map-title">Уровни ${start}-${end}</span>`;
        html += `<button class="m3-map-nav" onclick="Match3Game.nextPage()" ${end >= this.maxLevel ? 'disabled' : ''}>▶</button>`;
        html += '</div><div class="m3-map-grid">';
        for (let i = start; i <= end; i++) {
            const unlocked = i <= this.unlockedLevel;
            const stars = this.levelStars[i] || 0;
            const current = i === this.unlockedLevel;
            let cls = 'm3-map-level';
            if (!unlocked) cls += ' locked';
            if (current) cls += ' current';
            if (stars > 0) cls += ' completed';
            html += `<div class="${cls}" onclick="${unlocked ? `Match3Game.playLevel(${i})` : ''}">`
                + `<span class="m3-map-num">${i}</span>`
                + (unlocked ? '' : '<span class="m3-map-lock">🔒</span>')
                + (stars > 0 ? `<div class="m3-map-stars">${'⭐'.repeat(stars)}</div>` : '')
                + '</div>';
        }
        html += '</div>';
        field.innerHTML = html;
    },

    prevPage() { if (this.mapPage > 0) { this.mapPage--; this.renderMap(); } },
    nextPage() { if (this.mapPage < Math.floor((this.maxLevel - 1) / this.LEVELS_PER_PAGE)) { this.mapPage++; this.renderMap(); } },

    // ========== PLAY LEVEL ==========
    playLevel(lvl) {
        if (lvl > this.unlockedLevel) return;
        this.level = lvl;
        this.showingMap = false;
        this.comboCount = 0;
        const config = this.getLevelConfig(lvl);
        this.maxMoves = config.moves;
        this.moves = config.moves;
        this.targetScore = config.target;
        this.score = 0;
        this.selected = null;
        this.animating = false;

        const header = document.querySelector('.m3-info');
        if (header) header.style.display = 'flex';

        this.generateBoard(config);
        const field = document.getElementById('m3-field');
        if (field) field.className = 'm3-field';

        this.buildDOM();
        this.updateUI();
        this.setupTouch();
        this.showLevelInfo(config);
    },

    showLevelInfo(config) {
        const result = document.getElementById('m3-result');
        if (!result) return;
        result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = `🎯 Уровень ${this.level}`;
        let extra = '';
        if (config.chainCount > 0) extra = `<br>⛓️ Разбей цепи!`;
        document.getElementById('m3-result-text').innerHTML =
            `Набери <b>${config.target}</b> очков за <b>${config.moves}</b> ходов!${extra}`
            + `<br><small>⭐${config.target} · ⭐⭐${config.star2} · ⭐⭐⭐${config.star3}</small>`;
        const btn = result.querySelector('.btn');
        if (btn) {
            btn.textContent = '▶ Играть!';
            btn.onclick = () => { result.classList.add('hidden'); };
        }
    },

    // ========== TOUCH / SWIPE ==========
    setupTouch() {
        const field = document.getElementById('m3-field');
        if (!field || field._m3touch) return;
        field._m3touch = true;
        field.style.touchAction = 'none';

        field.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
            const el = document.elementFromPoint(t.clientX, t.clientY);
            if (el) {
                const cell = el.closest('.m3-cell');
                if (cell) {
                    this.touchCell = { r: parseInt(cell.dataset.r), c: parseInt(cell.dataset.c) };
                    return;
                }
            }
            this.touchCell = null;
        }, { passive: false });

        field.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

        field.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.touchCell || this.animating || this.showingMap) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                this.onCellClick(this.touchCell.r, this.touchCell.c);
                return;
            }
            let tr, tc;
            if (Math.abs(dx) > Math.abs(dy)) {
                tr = this.touchCell.r; tc = this.touchCell.c + (dx > 0 ? 1 : -1);
            } else {
                tr = this.touchCell.r + (dy > 0 ? 1 : -1); tc = this.touchCell.c;
            }
            if (tr < 0 || tr >= this.BOARD_SIZE || tc < 0 || tc >= this.BOARD_SIZE) return;
            this.selected = { r: this.touchCell.r, c: this.touchCell.c };
            this.onCellClick(tr, tc);
        }, { passive: false });
    },

    // ========== BOARD GENERATION ==========
    generateBoard(config) {
        const gc = config.gemCount || 6;
        this.board = [];
        this.chains = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            this.board[r] = [];
            this.chains[r] = [];
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                let gem;
                do {
                    gem = Math.floor(Math.random() * gc);
                } while (
                    (c >= 2 && this.board[r][c - 1] === gem && this.board[r][c - 2] === gem) ||
                    (r >= 2 && this.board[r - 1][c] === gem && this.board[r - 2][c] === gem)
                );
                this.board[r][c] = gem;
                this.chains[r][c] = 0;
            }
        }
        // Place chains
        if (config.chainCount > 0) {
            let placed = 0;
            const maxAttempts = 200;
            let attempts = 0;
            while (placed < config.chainCount && attempts < maxAttempts) {
                const r = Math.floor(Math.random() * this.BOARD_SIZE);
                const c = Math.floor(Math.random() * this.BOARD_SIZE);
                if (this.chains[r][c] === 0) {
                    this.chains[r][c] = 1 + Math.floor(Math.random() * config.maxChain);
                    placed++;
                }
                attempts++;
            }
        }
    },

    // ========== DOM-BASED RENDERING ==========
    buildDOM() {
        const field = document.getElementById('m3-field');
        if (!field || this.showingMap) return;
        field.innerHTML = '';
        this.cells = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            this.cells[r] = [];
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'm3-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', () => this.onCellClick(r, c));
                this.cells[r][c] = cell;
                field.appendChild(cell);
                this.updateCell(r, c);
            }
        }
    },

    updateCell(r, c) {
        const cell = this.cells[r] && this.cells[r][c];
        if (!cell) return;
        const gem = this.board[r][c];
        const chain = this.chains[r][c];
        cell.className = 'm3-cell';
        if (gem === -1) {
            cell.classList.add('empty');
            cell.innerHTML = '';
            return;
        }
        if (this.selected && this.selected.r === r && this.selected.c === c) {
            cell.classList.add('selected');
        }
        let html = `<span class="m3-gem">${this.GEMS[gem]}</span>`;
        if (chain > 0) {
            cell.classList.add('chained');
            html += `<span class="m3-chain">${chain > 1 ? '⛓️⛓️' : '⛓️'}</span>`;
        }
        cell.innerHTML = html;
    },

    updateAllCells() {
        for (let r = 0; r < this.BOARD_SIZE; r++)
            for (let c = 0; c < this.BOARD_SIZE; c++)
                this.updateCell(r, c);
    },

    // ========== GAME LOGIC ==========
    onCellClick(r, c) {
        if (this.animating || this.board[r][c] === -1 || this.showingMap) return;

        if (!this.selected) {
            this.selected = { r, c };
            this.updateAllCells();
            return;
        }

        const sr = this.selected.r, sc = this.selected.c;
        if (sr === r && sc === c) { this.selected = null; this.updateAllCells(); return; }
        const isAdj = (Math.abs(sr - r) + Math.abs(sc - c)) === 1;
        if (!isAdj) { this.selected = { r, c }; this.updateAllCells(); return; }

        // Animate swap
        this.animating = true;
        this.animateSwap(sr, sc, r, c, () => {
            this.swap(sr, sc, r, c);
            const matches = this.findMatches();
            if (matches.length === 0) {
                this.swap(sr, sc, r, c);
                this.animateSwap(r, c, sr, sc, () => {
                    this.selected = null;
                    this.updateAllCells();
                    this.animating = false;
                    // Shake both cells
                    this.shakeCell(sr, sc);
                    this.shakeCell(r, c);
                });
                return;
            }
            this.selected = null;
            this.moves--;
            this.comboCount = 0;
            this.processMatches(matches);
        });
    },

    shakeCell(r, c) {
        const cell = this.cells[r] && this.cells[r][c];
        if (!cell) return;
        cell.classList.add('shake');
        setTimeout(() => cell.classList.remove('shake'), 400);
    },

    animateSwap(r1, c1, r2, c2, cb) {
        const cell1 = this.cells[r1] && this.cells[r1][c1];
        const cell2 = this.cells[r2] && this.cells[r2][c2];
        if (!cell1 || !cell2) { cb(); return; }
        const size = cell1.offsetWidth + 3; // cell size + gap
        const dx = (c2 - c1) * size;
        const dy = (r2 - r1) * size;
        cell1.style.transition = 'transform 0.2s ease';
        cell2.style.transition = 'transform 0.2s ease';
        cell1.style.transform = `translate(${dx}px, ${dy}px)`;
        cell2.style.transform = `translate(${-dx}px, ${-dy}px)`;
        cell1.style.zIndex = '5';
        setTimeout(() => {
            cell1.style.transition = '';
            cell2.style.transition = '';
            cell1.style.transform = '';
            cell2.style.transform = '';
            cell1.style.zIndex = '';
            cb();
        }, 220);
    },

    swap(r1, c1, r2, c2) {
        let t = this.board[r1][c1]; this.board[r1][c1] = this.board[r2][c2]; this.board[r2][c2] = t;
        t = this.chains[r1][c1]; this.chains[r1][c1] = this.chains[r2][c2]; this.chains[r2][c2] = t;
    },

    findMatches() {
        const matches = new Set();
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE - 2; c++) {
                const g = this.board[r][c]; if (g < 0) continue;
                if (g === this.board[r][c + 1] && g === this.board[r][c + 2]) {
                    matches.add(`${r},${c}`); matches.add(`${r},${c + 1}`); matches.add(`${r},${c + 2}`);
                    let e = c + 3; while (e < this.BOARD_SIZE && this.board[r][e] === g) { matches.add(`${r},${e}`); e++; }
                }
            }
        }
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            for (let r = 0; r < this.BOARD_SIZE - 2; r++) {
                const g = this.board[r][c]; if (g < 0) continue;
                if (g === this.board[r + 1][c] && g === this.board[r + 2][c]) {
                    matches.add(`${r},${c}`); matches.add(`${r + 1},${c}`); matches.add(`${r + 2},${c}`);
                    let e = r + 3; while (e < this.BOARD_SIZE && this.board[e][c] === g) { matches.add(`${e},${c}`); e++; }
                }
            }
        }
        return [...matches].map(s => { const [r, c] = s.split(',').map(Number); return { r, c }; });
    },

    processMatches(matches) {
        this.comboCount++;
        const combo = this.comboCount;

        // Separate: chained gems lose a chain, unchained gems are removed
        const toRemove = [];
        const toUnchain = [];
        const chainNeighbors = new Set();

        matches.forEach(({ r, c }) => {
            if (this.chains[r][c] > 0) {
                toUnchain.push({ r, c });
            } else {
                toRemove.push({ r, c });
            }
            // Mark neighbors of matches for chain-breaking
            [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < this.BOARD_SIZE && nc >= 0 && nc < this.BOARD_SIZE) {
                    if (this.chains[nr][nc] > 0) {
                        chainNeighbors.add(`${nr},${nc}`);
                    }
                }
            });
        });

        // Also break chains on neighboring cells that weren't in the match
        chainNeighbors.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const already = toUnchain.find(u => u.r === r && u.c === c) || toRemove.find(u => u.r === r && u.c === c);
            if (!already) {
                toUnchain.push({ r, c });
            }
        });

        // Calculate points
        const pts = toRemove.length * 10 * combo * (toRemove.length > 3 ? 2 : 1);
        this.score += pts;

        // Animate burst on removed gems
        toRemove.forEach(({ r, c }) => {
            const cell = this.cells[r][c];
            cell.classList.add('burst');
            // Add particles
            for (let i = 0; i < 6; i++) {
                const p = document.createElement('span');
                p.className = 'm3-particle';
                p.style.setProperty('--angle', `${i * 60}deg`);
                p.textContent = this.GEMS[this.board[r][c]] || '✨';
                cell.appendChild(p);
            }
        });

        // Show floating score
        if (toRemove.length > 0) {
            const mid = toRemove[Math.floor(toRemove.length / 2)];
            const cell = this.cells[mid.r][mid.c];
            const pop = document.createElement('div');
            pop.className = 'm3-score-pop';
            pop.textContent = `+${pts}${combo > 1 ? ` x${combo}` : ''}`;
            cell.appendChild(pop);
        }

        // Animate chain-break on unchained gems
        toUnchain.forEach(({ r, c }) => {
            this.chains[r][c] = Math.max(0, this.chains[r][c] - 1);
            const cell = this.cells[r][c];
            cell.classList.add('chain-break');
        });

        // After burst animation → drop & fill
        setTimeout(() => {
            // Remove matched gems from board
            toRemove.forEach(({ r, c }) => { this.board[r][c] = -1; });
            this.updateAllCells();

            // Chain break animation done - update those cells
            toUnchain.forEach(({ r, c }) => {
                const cell = this.cells[r][c];
                cell.classList.remove('chain-break');
            });

            // Now animate drop
            setTimeout(() => {
                this.animateDrop();
            }, 50);
        }, 400);
    },

    animateDrop() {
        const config = this.getLevelConfig(this.level);
        // Calculate how far each cell needs to drop
        const dropDistances = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            dropDistances[r] = [];
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                dropDistances[r][c] = 0;
            }
        }

        // Process drops column by column
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            let emptyCount = 0;
            for (let r = this.BOARD_SIZE - 1; r >= 0; r--) {
                if (this.board[r][c] === -1) {
                    emptyCount++;
                } else if (emptyCount > 0) {
                    dropDistances[r][c] = emptyCount;
                }
            }
        }

        // Do the actual drop in the data
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            let writePos = this.BOARD_SIZE - 1;
            for (let r = this.BOARD_SIZE - 1; r >= 0; r--) {
                if (this.board[r][c] !== -1) {
                    this.board[writePos][c] = this.board[r][c];
                    this.chains[writePos][c] = this.chains[r][c];
                    if (writePos !== r) { this.board[r][c] = -1; this.chains[r][c] = 0; }
                    writePos--;
                }
            }
            // Fill empty spaces at top with new gems
            for (let r = writePos; r >= 0; r--) {
                this.board[r][c] = Math.floor(Math.random() * (config.gemCount || 6));
                this.chains[r][c] = 0;
            }
        }

        // Update all cells
        this.updateAllCells();

        // Animate: cells that moved down get a drop animation
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            let emptyBelow = 0;
            // Count from bottom - find first non-dropping position
            for (let r = 0; r < this.BOARD_SIZE; r++) {
                const cell = this.cells[r][c];
                // All cells in top portion that were filled get drop-in animation
                if (r <= this.findTopEmpty(c, dropDistances)) {
                    const delay = r * 30;
                    cell.style.animation = 'none';
                    cell.offsetHeight; // force reflow
                    cell.style.animation = `m3-drop-smooth 0.35s ease-out ${delay}ms both`;
                }
            }
        }

        // Apply drop animation to cells that fell down
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (dropDistances[r][c] > 0) {
                    const cell = this.cells[r + dropDistances[r][c]] && this.cells[r + dropDistances[r][c]][c];
                    // Already handled via the new positions
                }
            }
        }

        this.updateUI();

        // Check for cascading matches
        setTimeout(() => {
            // Clean up animations
            for (let r = 0; r < this.BOARD_SIZE; r++)
                for (let c = 0; c < this.BOARD_SIZE; c++)
                    this.cells[r][c].style.animation = '';

            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                this.processMatches(newMatches);
            } else {
                this.animating = false;
                this.comboCount = 0;
                if (!this.hasValidMoves(config.gemCount)) {
                    this.shuffleBoard(config.gemCount);
                }
                if (this.score >= this.targetScore) {
                    this.levelWin();
                } else if (this.moves <= 0) {
                    this.levelLose();
                }
            }
        }, 450);
    },

    findTopEmpty(c, dropDistances) {
        // Find the highest row that had drop distances > 0 or was empty
        for (let r = this.BOARD_SIZE - 1; r >= 0; r--) {
            if (dropDistances[r] && dropDistances[r][c] > 0) return r + dropDistances[r][c];
        }
        // Find first row that was -1 before drop
        return -1;
    },

    hasValidMoves(gc) {
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (c < this.BOARD_SIZE - 1) {
                    this.swap(r, c, r, c + 1);
                    if (this.findMatches().length > 0) { this.swap(r, c, r, c + 1); return true; }
                    this.swap(r, c, r, c + 1);
                }
                if (r < this.BOARD_SIZE - 1) {
                    this.swap(r, c, r + 1, c);
                    if (this.findMatches().length > 0) { this.swap(r, c, r + 1, c); return true; }
                    this.swap(r, c, r + 1, c);
                }
            }
        }
        return false;
    },

    shuffleBoard(gc) {
        const gems = [];
        for (let r = 0; r < this.BOARD_SIZE; r++)
            for (let c = 0; c < this.BOARD_SIZE; c++) gems.push(this.board[r][c]);
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        let idx = 0;
        for (let r = 0; r < this.BOARD_SIZE; r++)
            for (let c = 0; c < this.BOARD_SIZE; c++) this.board[r][c] = gems[idx++];
        const m = this.findMatches();
        if (m.length > 0) { m.forEach(({ r, c }) => { this.board[r][c] = -1; }); this.animateDrop(); return; }
        this.updateAllCells();
    },

    // ========== WIN / LOSE ==========
    levelWin() {
        const config = this.getLevelConfig(this.level);
        let stars = 1;
        if (this.score >= config.star3) stars = 3;
        else if (this.score >= config.star2) stars = 2;
        const prev = this.levelStars[this.level] || 0;
        if (stars > prev) this.levelStars[this.level] = stars;
        if (this.level >= this.unlockedLevel && this.level < this.maxLevel)
            this.unlockedLevel = this.level + 1;
        this.saveProgress();

        const result = document.getElementById('m3-result');
        if (result) result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = '🎉 Уровень пройден!';
        document.getElementById('m3-result-text').innerHTML =
            `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}<br>Очки: ${this.score} / ${config.target}`;
        const btn = result.querySelector('.btn');
        if (btn) {
            if (this.level < this.maxLevel) {
                btn.textContent = '▶ Следующий уровень';
                btn.onclick = () => Match3Game.playLevel(Match3Game.level + 1);
            } else {
                btn.textContent = '🏆 Все уровни!';
                btn.onclick = () => Match3Game.showMap();
            }
        }
    },

    levelLose() {
        const result = document.getElementById('m3-result');
        if (result) result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = '😔 Не хватило ходов';
        document.getElementById('m3-result-text').innerHTML =
            `Очки: ${this.score} / ${this.targetScore}<br>Попробуй ещё!`;
        const btn = result.querySelector('.btn');
        if (btn) { btn.textContent = '🔄 Заново'; btn.onclick = () => Match3Game.playLevel(Match3Game.level); }
    },

    // ========== UI ==========
    removeProgress() {
        const bar = document.getElementById('m3-progress');
        if (bar) bar.remove();
    },

    updateUI() {
        const scoreEl = document.getElementById('m3-score');
        const movesEl = document.getElementById('m3-moves');
        const bestEl = document.getElementById('m3-best');
        if (scoreEl) scoreEl.textContent = `⭐ ${this.score}/${this.targetScore}`;
        if (movesEl) {
            movesEl.textContent = `🔄 ${this.moves}`;
            if (this.moves <= 5) movesEl.classList.add('low');
            else movesEl.classList.remove('low');
        }
        if (bestEl) bestEl.textContent = `📍 Ур. ${this.level}`;

        const pct = Math.min(100, Math.round((this.score / this.targetScore) * 100));
        let bar = document.getElementById('m3-progress');
        if (!bar) {
            const field = document.getElementById('m3-field');
            if (field) {
                bar = document.createElement('div');
                bar.id = 'm3-progress';
                bar.className = 'm3-progress';
                bar.innerHTML = '<div class="m3-progress-fill"></div>';
                field.parentNode.insertBefore(bar, field);
            }
        }
        if (bar) {
            const fill = bar.querySelector('.m3-progress-fill');
            if (fill) {
                fill.style.width = pct + '%';
                fill.className = 'm3-progress-fill' + (pct >= 100 ? ' complete' : '');
            }
        }
    }
};
