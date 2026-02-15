// ==================== MATCH-3 (3 в ряд) — v3 OBSTACLES ====================
const Match3Game = {
    BS: 8,
    GEMS: ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'],
    // Per-cell data arrays
    board: [],    // gem index (-1=empty, -2=stone)
    chains: [],   // chain layers 0-2
    ice: [],      // ice layers 0-2
    box: [],      // box HP 0-2
    // State
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
    cells: [],

    // ==================== INIT ====================
    init() {
        this.loadProgress();
        this.tutorialShown = localStorage.getItem('m3_tutorial') === '1';
        if (!this.tutorialShown) this.showTutorial();
        else this.showMap();
    },

    // ==================== TUTORIAL ====================
    showTutorial() {
        const field = document.getElementById('m3-field');
        if (!field) return;
        this.showingMap = true;
        const h = document.querySelector('.m3-info');
        if (h) h.style.display = 'none';
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
        <p>Свайпай камни или нажимай на два соседних чтобы поменять местами</p>
      </div>
      <div class="m3-tut-slide" data-slide="2">
        <div class="m3-tut-emoji">🧊</div>
        <h3>Препятствия!</h3>
        <p>⛓️ Цепи · 🧊 Лёд · 📦 Коробки · 🪨 Камни<br>Собирай совпадения рядом чтобы уничтожить!</p>
      </div>
      <div class="m3-tut-slide" data-slide="3">
        <div class="m3-tut-emoji">🗺️</div>
        <h3>1000 уровней!</h3>
        <p>Каждый уровень сложнее. Собирай ⭐!</p>
      </div>
      <div class="m3-tut-nav">
        <span class="m3-tut-dots">
          <span class="m3-tut-dot active" data-d="0"></span>
          <span class="m3-tut-dot" data-d="1"></span>
          <span class="m3-tut-dot" data-d="2"></span>
          <span class="m3-tut-dot" data-d="3"></span>
        </span>
        <button class="btn primary" onclick="Match3Game.nextTutSlide()">Далее ➡️</button>
      </div>`;
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

    // ==================== SAVE / LOAD ====================
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

    // ==================== LEVEL CONFIG ====================
    // Obstacle progression:
    //  Lvl 1-4:   nothing
    //  Lvl 5-14:  chains (1 layer)
    //  Lvl 15-29: chains + ice (1 layer)
    //  Lvl 30-49: chains(2) + ice(1) + boxes(1HP)
    //  Lvl 50-99: chains(2) + ice(2) + boxes(2HP)
    //  Lvl 100+:  all above + stones (permanent)
    getLevelConfig(lvl) {
        const moves = Math.max(12, 30 - Math.floor(lvl / 25));
        const target = 300 + (lvl - 1) * 80 + Math.floor(lvl / 10) * 50;
        const gemCount = lvl < 20 ? 5 : 6;
        const star2 = Math.floor(target * 1.3);
        const star3 = Math.floor(target * 1.7);

        let chainCount = 0, maxChain = 0;
        let iceCount = 0, maxIce = 0;
        let boxCount = 0, maxBox = 0;
        let stoneCount = 0;

        if (lvl >= 5) { chainCount = Math.min(16, 2 + Math.floor(lvl / 6)); maxChain = 1; }
        if (lvl >= 15) { iceCount = Math.min(12, 1 + Math.floor((lvl - 15) / 5)); maxIce = 1; }
        if (lvl >= 30) { maxChain = 2; boxCount = Math.min(10, 1 + Math.floor((lvl - 30) / 8)); maxBox = 1; }
        if (lvl >= 50) { maxIce = 2; maxBox = 2; }
        if (lvl >= 100) { stoneCount = Math.min(6, 1 + Math.floor((lvl - 100) / 40)); }

        return {
            moves, target, gemCount, star2, star3, level: lvl,
            chainCount, maxChain, iceCount, maxIce, boxCount, maxBox, stoneCount
        };
    },

    // ==================== MAP ====================
    showMap() {
        this.showingMap = true;
        this.mapPage = Math.floor((this.unlockedLevel - 1) / this.LEVELS_PER_PAGE);
        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');
        const h = document.querySelector('.m3-info');
        if (h) h.style.display = 'none';
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
    nextPage() { const max = Math.floor((this.maxLevel - 1) / this.LEVELS_PER_PAGE); if (this.mapPage < max) { this.mapPage++; this.renderMap(); } },

    // ==================== PLAY LEVEL ====================
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

        const h = document.querySelector('.m3-info');
        if (h) h.style.display = 'flex';

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
        let extras = [];
        if (config.chainCount > 0) extras.push('⛓️ Цепи');
        if (config.iceCount > 0) extras.push('🧊 Лёд');
        if (config.boxCount > 0) extras.push('📦 Коробки');
        if (config.stoneCount > 0) extras.push('🪨 Камни');
        const extra = extras.length > 0 ? '<br>' + extras.join(' · ') : '';
        document.getElementById('m3-result-text').innerHTML =
            `Набери <b>${config.target}</b> очков за <b>${config.moves}</b> ходов!${extra}`
            + `<br><small>⭐${config.target} · ⭐⭐${config.star2} · ⭐⭐⭐${config.star3}</small>`;
        const btn = result.querySelector('.btn');
        if (btn) {
            btn.textContent = '▶ Играть!';
            btn.onclick = () => { result.classList.add('hidden'); };
        }
    },

    // ==================== TOUCH / SWIPE ====================
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
                if (cell) { this.touchCell = { r: +cell.dataset.r, c: +cell.dataset.c }; return; }
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
            if (tr < 0 || tr >= this.BS || tc < 0 || tc >= this.BS) return;
            this.selected = { r: this.touchCell.r, c: this.touchCell.c };
            this.onCellClick(tr, tc);
        }, { passive: false });
    },

    // ==================== BOARD GEN ====================
    isBlocker(r, c) {
        // Can't be swapped: stone, box
        return this.board[r][c] === -2 || this.box[r][c] > 0;
    },

    generateBoard(config) {
        const gc = config.gemCount || 6;
        this.board = []; this.chains = []; this.ice = []; this.box = [];
        for (let r = 0; r < this.BS; r++) {
            this.board[r] = []; this.chains[r] = []; this.ice[r] = []; this.box[r] = [];
            for (let c = 0; c < this.BS; c++) {
                let gem;
                do { gem = Math.floor(Math.random() * gc); } while (
                    (c >= 2 && this.board[r][c - 1] === gem && this.board[r][c - 2] === gem) ||
                    (r >= 2 && this.board[r - 1][c] === gem && this.board[r - 2][c] === gem)
                );
                this.board[r][c] = gem;
                this.chains[r][c] = 0;
                this.ice[r][c] = 0;
                this.box[r][c] = 0;
            }
        }
        // Place obstacles
        this._placeObstacles(config, 'chains', config.chainCount, config.maxChain);
        this._placeObstacles(config, 'ice', config.iceCount, config.maxIce);
        // Boxes: set board to -1 and box HP
        if (config.boxCount > 0) {
            let placed = 0, att = 0;
            while (placed < config.boxCount && att < 300) {
                const r = Math.floor(Math.random() * this.BS);
                const c = Math.floor(Math.random() * this.BS);
                if (this.box[r][c] === 0 && this.board[r][c] !== -2) {
                    this.box[r][c] = 1 + Math.floor(Math.random() * config.maxBox);
                    this.board[r][c] = -1; // no gem under box
                    placed++;
                }
                att++;
            }
        }
        // Stones: permanent blockers
        if (config.stoneCount > 0) {
            let placed = 0, att = 0;
            while (placed < config.stoneCount && att < 300) {
                const r = 1 + Math.floor(Math.random() * (this.BS - 2)); // avoid edges
                const c = 1 + Math.floor(Math.random() * (this.BS - 2));
                if (this.board[r][c] !== -2 && this.box[r][c] === 0) {
                    this.board[r][c] = -2; // stone
                    this.chains[r][c] = 0; this.ice[r][c] = 0;
                    placed++;
                }
                att++;
            }
        }
    },

    _placeObstacles(config, arr, count, maxLvl) {
        if (count <= 0 || maxLvl <= 0) return;
        let placed = 0, att = 0;
        while (placed < count && att < 300) {
            const r = Math.floor(Math.random() * this.BS);
            const c = Math.floor(Math.random() * this.BS);
            if (this[arr][r][c] === 0 && this.board[r][c] >= 0 && this.box[r][c] === 0) {
                this[arr][r][c] = 1 + Math.floor(Math.random() * maxLvl);
                placed++;
            }
            att++;
        }
    },

    // ==================== DOM ====================
    buildDOM() {
        const field = document.getElementById('m3-field');
        if (!field || this.showingMap) return;
        field.innerHTML = '';
        this.cells = [];
        for (let r = 0; r < this.BS; r++) {
            this.cells[r] = [];
            for (let c = 0; c < this.BS; c++) {
                const cell = document.createElement('div');
                cell.className = 'm3-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', () => this.onCellClick(r, c));
                this.cells[r][c] = cell;
                field.appendChild(cell);
                this.renderCell(r, c);
            }
        }
    },

    renderCell(r, c) {
        const cell = this.cells[r] && this.cells[r][c];
        if (!cell) return;
        const gem = this.board[r][c];
        const chain = this.chains[r][c];
        const iceL = this.ice[r][c];
        const boxHP = this.box[r][c];
        cell.className = 'm3-cell';

        // Stone
        if (gem === -2) {
            cell.classList.add('stone');
            cell.innerHTML = '<span class="m3-gem">🪨</span>';
            return;
        }

        // Box (no gem underneath)
        if (boxHP > 0) {
            cell.classList.add('blocker-box');
            if (boxHP > 1) cell.classList.add('box-strong');
            cell.innerHTML = `<span class="m3-gem">${boxHP > 1 ? '📦' : '📦'}</span>`
                + (boxHP > 1 ? '<span class="m3-box-hp">×2</span>' : '');
            return;
        }

        // Empty
        if (gem < 0) {
            cell.classList.add('empty');
            cell.innerHTML = '';
            return;
        }

        // Selection
        if (this.selected && this.selected.r === r && this.selected.c === c) {
            cell.classList.add('selected');
        }

        let html = `<span class="m3-gem">${this.GEMS[gem]}</span>`;

        // Chain overlay
        if (chain > 0) {
            cell.classList.add('chained');
            html += `<span class="m3-chain">${chain > 1 ? '⛓️⛓️' : '⛓️'}</span>`;
        }

        // Ice overlay
        if (iceL > 0) {
            cell.classList.add('iced');
            if (iceL > 1) cell.classList.add('ice-thick');
        }

        cell.innerHTML = html;
    },

    updateAllCells() {
        for (let r = 0; r < this.BS; r++)
            for (let c = 0; c < this.BS; c++)
                this.renderCell(r, c);
    },

    // ==================== GAME LOGIC ====================
    onCellClick(r, c) {
        if (this.animating || this.showingMap) return;
        // Can't select blockers
        if (this.isBlocker(r, c)) return;
        if (this.board[r][c] < 0) return;

        if (!this.selected) {
            this.selected = { r, c };
            this.updateAllCells();
            return;
        }

        const sr = this.selected.r, sc = this.selected.c;
        if (sr === r && sc === c) { this.selected = null; this.updateAllCells(); return; }
        const isAdj = (Math.abs(sr - r) + Math.abs(sc - c)) === 1;
        if (!isAdj) { this.selected = { r, c }; this.updateAllCells(); return; }
        // Can't swap if target is a blocker
        if (this.isBlocker(r, c)) { this.selected = { r, c }; this.updateAllCells(); return; }

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
        const size = cell1.offsetWidth + 3;
        const dx = (c2 - c1) * size, dy = (r2 - r1) * size;
        cell1.style.transition = 'transform 0.2s ease';
        cell2.style.transition = 'transform 0.2s ease';
        cell1.style.transform = `translate(${dx}px,${dy}px)`;
        cell2.style.transform = `translate(${-dx}px,${-dy}px)`;
        cell1.style.zIndex = '5';
        setTimeout(() => {
            cell1.style.transition = ''; cell2.style.transition = '';
            cell1.style.transform = ''; cell2.style.transform = '';
            cell1.style.zIndex = '';
            cb();
        }, 220);
    },

    swap(r1, c1, r2, c2) {
        let t;
        t = this.board[r1][c1]; this.board[r1][c1] = this.board[r2][c2]; this.board[r2][c2] = t;
        t = this.chains[r1][c1]; this.chains[r1][c1] = this.chains[r2][c2]; this.chains[r2][c2] = t;
        t = this.ice[r1][c1]; this.ice[r1][c1] = this.ice[r2][c2]; this.ice[r2][c2] = t;
    },

    findMatches() {
        const matches = new Set();
        for (let r = 0; r < this.BS; r++) {
            for (let c = 0; c < this.BS - 2; c++) {
                const g = this.board[r][c]; if (g < 0) continue;
                if (g === this.board[r][c + 1] && g === this.board[r][c + 2]) {
                    matches.add(`${r},${c}`); matches.add(`${r},${c + 1}`); matches.add(`${r},${c + 2}`);
                    let e = c + 3; while (e < this.BS && this.board[r][e] === g) { matches.add(`${r},${e}`); e++; }
                }
            }
        }
        for (let c = 0; c < this.BS; c++) {
            for (let r = 0; r < this.BS - 2; r++) {
                const g = this.board[r][c]; if (g < 0) continue;
                if (g === this.board[r + 1][c] && g === this.board[r + 2][c]) {
                    matches.add(`${r},${c}`); matches.add(`${r + 1},${c}`); matches.add(`${r + 2},${c}`);
                    let e = r + 3; while (e < this.BS && this.board[e][c] === g) { matches.add(`${e},${c}`); e++; }
                }
            }
        }
        return [...matches].map(s => { const p = s.split(',').map(Number); return { r: p[0], c: p[1] }; });
    },

    // ==================== PROCESS MATCHES ====================
    processMatches(matches) {
        this.comboCount++;
        const combo = this.comboCount;
        const toRemove = [];
        const toUnchain = [];
        const toMeltIce = new Set();
        const toHitBox = new Set();

        matches.forEach(({ r, c }) => {
            if (this.chains[r][c] > 0) {
                toUnchain.push({ r, c });
            } else {
                toRemove.push({ r, c });
            }
            // Check neighbors for obstacle damage
            [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
                if (nr < 0 || nr >= this.BS || nc < 0 || nc >= this.BS) return;
                // Neighbor chains
                if (this.chains[nr][nc] > 0) toUnchain.push({ r: nr, c: nc });
                // Neighbor ice
                if (this.ice[nr][nc] > 0) toMeltIce.add(`${nr},${nc}`);
                // Neighbor box
                if (this.box[nr][nc] > 0) toHitBox.add(`${nr},${nc}`);
            });
        });

        // Also melt ice on matched cells themselves
        matches.forEach(({ r, c }) => {
            if (this.ice[r][c] > 0) toMeltIce.add(`${r},${c}`);
        });

        // Dedup unchains
        const unchainMap = {};
        toUnchain.forEach(({ r, c }) => { unchainMap[`${r},${c}`] = { r, c }; });
        const uniqueUnchain = Object.values(unchainMap);

        // Calculate points
        const pts = toRemove.length * 10 * combo * (toRemove.length > 3 ? 2 : 1);
        this.score += pts;

        // ---- Animate burst ----
        toRemove.forEach(({ r, c }) => {
            const cell = this.cells[r][c];
            cell.classList.add('burst');
            for (let i = 0; i < 6; i++) {
                const p = document.createElement('span');
                p.className = 'm3-particle';
                p.style.setProperty('--angle', `${i * 60}deg`);
                p.textContent = this.GEMS[this.board[r][c]] || '✨';
                cell.appendChild(p);
            }
        });

        // Floating score
        if (toRemove.length > 0) {
            const mid = toRemove[Math.floor(toRemove.length / 2)];
            const cell = this.cells[mid.r][mid.c];
            const pop = document.createElement('div');
            pop.className = 'm3-score-pop';
            pop.textContent = `+${pts}${combo > 1 ? ` x${combo}` : ''}`;
            cell.appendChild(pop);
        }

        // ---- Chain break animation ----
        uniqueUnchain.forEach(({ r, c }) => {
            this.chains[r][c] = Math.max(0, this.chains[r][c] - 1);
            this.cells[r][c].classList.add('chain-break');
        });

        // ---- Ice melt animation ----
        toMeltIce.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            this.ice[r][c] = Math.max(0, this.ice[r][c] - 1);
            this.cells[r][c].classList.add('ice-melt');
        });

        // ---- Box hit animation ----
        toHitBox.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            this.box[r][c] = Math.max(0, this.box[r][c] - 1);
            this.cells[r][c].classList.add('box-hit');
            if (this.box[r][c] <= 0) {
                // Box destroyed — cell becomes empty, new gem will fall in
                this.board[r][c] = -1;
                this.score += 20 * combo;
            }
        });

        // After burst → drop
        setTimeout(() => {
            toRemove.forEach(({ r, c }) => { this.board[r][c] = -1; });
            this.updateAllCells();
            uniqueUnchain.forEach(({ r, c }) => this.cells[r][c].classList.remove('chain-break'));
            toMeltIce.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                this.cells[r][c].classList.remove('ice-melt');
            });
            toHitBox.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                this.cells[r][c].classList.remove('box-hit');
            });
            setTimeout(() => this.animateDrop(), 50);
        }, 400);
    },

    // ==================== DROP ====================
    animateDrop() {
        const config = this.getLevelConfig(this.level);
        const newCellRows = [];

        // Drop column by column, skip stones & boxes
        for (let c = 0; c < this.BS; c++) {
            let writePos = this.BS - 1;
            // Move existing gems down, skipping blockers
            for (let r = this.BS - 1; r >= 0; r--) {
                if (this.board[r][c] === -2) {
                    // Stone: don't move, reset writePos above it
                    if (writePos === r) writePos = r - 1;
                    continue;
                }
                if (this.box[r][c] > 0) {
                    if (writePos === r) writePos = r - 1;
                    continue;
                }
                if (this.board[r][c] >= 0) {
                    // Skip if writePos points to a blocker
                    while (writePos >= 0 && (this.board[writePos][c] === -2 || this.box[writePos][c] > 0)) writePos--;
                    if (writePos < 0) break;
                    if (writePos !== r) {
                        this.board[writePos][c] = this.board[r][c];
                        this.chains[writePos][c] = this.chains[r][c];
                        this.ice[writePos][c] = this.ice[r][c];
                        this.board[r][c] = -1;
                        this.chains[r][c] = 0;
                        this.ice[r][c] = 0;
                    }
                    writePos--;
                }
            }
            // Fill empty cells from top, skip blockers
            for (let r = writePos; r >= 0; r--) {
                if (this.board[r][c] === -2 || this.box[r][c] > 0) continue;
                if (this.board[r][c] < 0) {
                    this.board[r][c] = Math.floor(Math.random() * (config.gemCount || 6));
                    this.chains[r][c] = 0;
                    this.ice[r][c] = 0;
                    if (!newCellRows[c]) newCellRows[c] = [];
                    newCellRows[c].push(r);
                }
            }
        }

        // Update DOM
        this.updateAllCells();

        // Animate new/dropped cells
        for (let c = 0; c < this.BS; c++) {
            if (newCellRows[c]) {
                newCellRows[c].forEach((r, idx) => {
                    const cell = this.cells[r][c];
                    const delay = idx * 40;
                    cell.style.animation = 'none';
                    cell.offsetHeight;
                    cell.style.animation = `m3-drop-smooth 0.35s ease-out ${delay}ms both`;
                });
            }
        }

        this.updateUI();

        setTimeout(() => {
            // Clean animations
            for (let r = 0; r < this.BS; r++)
                for (let c = 0; c < this.BS; c++)
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
                this.checkWinLose();
            }
        }, 450);
    },

    checkWinLose() {
        if (this.score >= this.targetScore) this.levelWin();
        else if (this.moves <= 0) this.levelLose();
    },

    hasValidMoves(gc) {
        for (let r = 0; r < this.BS; r++) {
            for (let c = 0; c < this.BS; c++) {
                if (this.board[r][c] < 0 || this.isBlocker(r, c)) continue;
                if (c < this.BS - 1 && !this.isBlocker(r, c + 1) && this.board[r][c + 1] >= 0) {
                    this.swap(r, c, r, c + 1);
                    if (this.findMatches().length > 0) { this.swap(r, c, r, c + 1); return true; }
                    this.swap(r, c, r, c + 1);
                }
                if (r < this.BS - 1 && !this.isBlocker(r + 1, c) && this.board[r + 1][c] >= 0) {
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
        for (let r = 0; r < this.BS; r++)
            for (let c = 0; c < this.BS; c++)
                if (this.board[r][c] >= 0 && !this.isBlocker(r, c)) gems.push(this.board[r][c]);
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        let idx = 0;
        for (let r = 0; r < this.BS; r++)
            for (let c = 0; c < this.BS; c++)
                if (this.board[r][c] >= 0 && !this.isBlocker(r, c)) this.board[r][c] = gems[idx++];
        const m = this.findMatches();
        if (m.length > 0) { m.forEach(({ r, c }) => { this.board[r][c] = -1; }); this.animateDrop(); return; }
        this.updateAllCells();
    },

    // ==================== WIN / LOSE ====================
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
            `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}<br>Очки: ${this.score}/${this.targetScore}`;
        const btn = result.querySelector('.btn');
        if (btn) {
            if (this.level < this.maxLevel) {
                btn.textContent = '▶ Следующий';
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
            `Очки: ${this.score}/${this.targetScore}<br>Попробуй ещё!`;
        const btn = result.querySelector('.btn');
        if (btn) { btn.textContent = '🔄 Заново'; btn.onclick = () => Match3Game.playLevel(Match3Game.level); }
    },

    // ==================== UI ====================
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
        if (bestEl) bestEl.textContent = `📍 Ур.${this.level}`;

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
