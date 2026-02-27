// ==================== MATCH-3 (3 в ряд) — v4 SHAPES + POWER-UPS ====================
const Match3Game = {
    BS: 8,
    // Geometric shapes instead of colored circles
    GEMS: ['🔺', '🟦', '⭐', '💎', '⬡', '●'],
    GEM_NAMES: ['Треугольник', 'Квадрат', 'Звезда', 'Ромб', 'Шестиугольник', 'Круг'],
    GEM_COLORS: ['#ff6b6b', '#74c0fc', '#ffd43b', '#da77f2', '#69db7c', '#ff922b'],
    // Special types: 0=none, 1=bomb(3x3), 2=lightning(row+col), 3=rainbow(all of type)
    SPECIAL_NONE: 0,
    SPECIAL_BOMB: 1,
    SPECIAL_LIGHTNING: 2,
    SPECIAL_RAINBOW: 3,
    SPECIAL_ICONS: { 1: '💣', 2: '⚡', 3: '🌈' },
    // Per-cell data arrays
    board: [],    // gem index (-1=empty, -2=stone)
    special: [],  // special type per cell
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
        <p>Собирай 3 или больше одинаковых фигур в ряд!<br>🔺🟦⭐💎⬡● — 6 фигур</p>
      </div>
      <div class="m3-tut-slide" data-slide="1">
        <div class="m3-tut-emoji">👆</div>
        <h3>Управление</h3>
        <p>Свайпай фигуры или нажимай на две соседние чтобы поменять местами</p>
      </div>
      <div class="m3-tut-slide" data-slide="2">
        <div class="m3-tut-emoji">💣</div>
        <h3>Бонусы!</h3>
        <p>4 в ряд → 💣 Бомба (взрыв 3×3)<br>5 в ряд → ⚡ Молния (ряд + столбец)<br>L/T фигура → 🌈 Радуга (удаляет все одного типа)</p>
      </div>
      <div class="m3-tut-slide" data-slide="3">
        <div class="m3-tut-emoji">🧊</div>
        <h3>Препятствия!</h3>
        <p>⛓️ Цепи · 🧊 Лёд · 📦 Коробки · 🪨 Камни<br>Собирай совпадения рядом чтобы уничтожить!</p>
      </div>
      <div class="m3-tut-slide" data-slide="4">
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
          <span class="m3-tut-dot" data-d="4"></span>
        </span>
        <button class="btn primary" onclick="Match3Game.nextTutSlide()">Далее ➡️</button>
      </div>`;
        this._tutSlide = 0;
    },

    nextTutSlide() {
        this._tutSlide++;
        if (this._tutSlide > 4) {
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
        if (this._tutSlide === 4) {
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
        // Увеличиваем сложность: базовые очки 500, +150 за каждый уровень
        const target = 500 + (lvl - 1) * 150 + Math.floor(lvl / 10) * 100;
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

        // Исправление бага с прыжками размера: убираем класс сетки 8x8
        field.className = 'm3-level-map';
        field.style.gridTemplateColumns = ''; // Сброс inline стилей если есть

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
        return this.board[r][c] === -2 || this.box[r][c] > 0;
    },

    generateBoard(config) {
        const gc = config.gemCount || 6;
        this.board = []; this.special = []; this.chains = []; this.ice = []; this.box = [];
        for (let r = 0; r < this.BS; r++) {
            this.board[r] = []; this.special[r] = []; this.chains[r] = []; this.ice[r] = []; this.box[r] = [];
            for (let c = 0; c < this.BS; c++) {
                let gem;
                do { gem = Math.floor(Math.random() * gc); } while (
                    (c >= 2 && this.board[r][c - 1] === gem && this.board[r][c - 2] === gem) ||
                    (r >= 2 && this.board[r - 1][c] === gem && this.board[r - 2][c] === gem)
                );
                this.board[r][c] = gem;
                this.special[r][c] = 0;
                this.chains[r][c] = 0;
                this.ice[r][c] = 0;
                this.box[r][c] = 0;
            }
        }
        // Place obstacles
        this._placeObstacles(config, 'chains', config.chainCount, config.maxChain);
        this._placeObstacles(config, 'ice', config.iceCount, config.maxIce);
        // Boxes
        if (config.boxCount > 0) {
            let placed = 0, att = 0;
            while (placed < config.boxCount && att < 300) {
                const r = Math.floor(Math.random() * this.BS);
                const c = Math.floor(Math.random() * this.BS);
                if (this.box[r][c] === 0 && this.board[r][c] !== -2) {
                    this.box[r][c] = 1 + Math.floor(Math.random() * config.maxBox);
                    this.board[r][c] = -1;
                    placed++;
                }
                att++;
            }
        }
        // Stones
        if (config.stoneCount > 0) {
            let placed = 0, att = 0;
            while (placed < config.stoneCount && att < 300) {
                const r = 1 + Math.floor(Math.random() * (this.BS - 2));
                const c = 1 + Math.floor(Math.random() * (this.BS - 2));
                if (this.board[r][c] !== -2 && this.box[r][c] === 0) {
                    this.board[r][c] = -2;
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
        const spec = this.special[r][c];
        cell.className = 'm3-cell';

        // Stone
        if (gem === -2) {
            cell.classList.add('stone');
            cell.innerHTML = '<span class="m3-gem">🪨</span>';
            return;
        }

        // Box
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

        // Add gem color class
        cell.classList.add(`gem-${gem}`);

        // Gem content with optional special indicator
        let gemText = this.GEMS[gem];
        let specialBadge = '';
        if (spec === this.SPECIAL_BOMB) {
            specialBadge = '<span class="m3-special-badge bomb">💣</span>';
            cell.classList.add('has-bomb');
        } else if (spec === this.SPECIAL_LIGHTNING) {
            specialBadge = '<span class="m3-special-badge lightning">⚡</span>';
            cell.classList.add('has-lightning');
        } else if (spec === this.SPECIAL_RAINBOW) {
            specialBadge = '<span class="m3-special-badge rainbow">🌈</span>';
            cell.classList.add('has-rainbow');
        }

        let html = `<span class="m3-gem">${gemText}</span>${specialBadge}`;

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
        t = this.special[r1][c1]; this.special[r1][c1] = this.special[r2][c2]; this.special[r2][c2] = t;
        t = this.chains[r1][c1]; this.chains[r1][c1] = this.chains[r2][c2]; this.chains[r2][c2] = t;
        t = this.ice[r1][c1]; this.ice[r1][c1] = this.ice[r2][c2]; this.ice[r2][c2] = t;
    },

    // ==================== FIND MATCHES ====================
    findMatches() {
        const matchSets = []; // Each element: { cells: [{r,c},...], isHoriz: bool }

        // Horizontal
        for (let r = 0; r < this.BS; r++) {
            let c = 0;
            while (c < this.BS) {
                const g = this.board[r][c];
                if (g < 0) { c++; continue; }
                let end = c + 1;
                while (end < this.BS && this.board[r][end] === g) end++;
                if (end - c >= 3) {
                    const cells = [];
                    for (let i = c; i < end; i++) cells.push({ r, c: i });
                    matchSets.push({ cells, isHoriz: true });
                }
                c = end;
            }
        }

        // Vertical
        for (let c = 0; c < this.BS; c++) {
            let r = 0;
            while (r < this.BS) {
                const g = this.board[r][c];
                if (g < 0) { r++; continue; }
                let end = r + 1;
                while (end < this.BS && this.board[end][c] === g) end++;
                if (end - r >= 3) {
                    const cells = [];
                    for (let i = r; i < end; i++) cells.push({ r: i, c });
                    matchSets.push({ cells, isHoriz: false });
                }
                r = end;
            }
        }

        // Determine specials to create
        this._pendingSpecials = [];
        const allMatchCells = new Set();

        // Check for L/T shapes (intersection of horiz + vert match)
        const usedForLT = new Set();
        for (let i = 0; i < matchSets.length; i++) {
            for (let j = i + 1; j < matchSets.length; j++) {
                if (matchSets[i].isHoriz === matchSets[j].isHoriz) continue;
                // Find intersection
                for (const a of matchSets[i].cells) {
                    for (const b of matchSets[j].cells) {
                        if (a.r === b.r && a.c === b.c) {
                            // L/T intersection found → Rainbow
                            this._pendingSpecials.push({
                                r: a.r, c: a.c,
                                type: this.SPECIAL_RAINBOW,
                                gem: this.board[a.r][a.c]
                            });
                            usedForLT.add(i);
                            usedForLT.add(j);
                        }
                    }
                }
            }
        }

        // Check remaining match sets for 4-in-a-row and 5-in-a-row
        for (let i = 0; i < matchSets.length; i++) {
            if (usedForLT.has(i)) {
                // Still add cells but no extra special
                matchSets[i].cells.forEach(c => allMatchCells.add(`${c.r},${c.c}`));
                continue;
            }
            const ms = matchSets[i];
            ms.cells.forEach(c => allMatchCells.add(`${c.r},${c.c}`));

            if (ms.cells.length >= 5) {
                // Lightning
                const mid = ms.cells[Math.floor(ms.cells.length / 2)];
                this._pendingSpecials.push({
                    r: mid.r, c: mid.c,
                    type: this.SPECIAL_LIGHTNING,
                    gem: this.board[mid.r][mid.c]
                });
            } else if (ms.cells.length === 4) {
                // Bomb
                const mid = ms.cells[1]; // second cell
                this._pendingSpecials.push({
                    r: mid.r, c: mid.c,
                    type: this.SPECIAL_BOMB,
                    gem: this.board[mid.r][mid.c]
                });
            }
        }

        // Also add L/T cells
        for (const i of usedForLT) {
            matchSets[i].cells.forEach(c => allMatchCells.add(`${c.r},${c.c}`));
        }

        return [...allMatchCells].map(s => {
            const p = s.split(',').map(Number);
            return { r: p[0], c: p[1] };
        });
    },

    // ==================== ACTIVATE SPECIAL ====================
    activateSpecial(r, c, extraRemove) {
        const spec = this.special[r][c];
        if (spec === 0) return;
        this.special[r][c] = 0;

        if (spec === this.SPECIAL_BOMB) {
            // Explode 3x3 area
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.BS && nc >= 0 && nc < this.BS) {
                        if (this.board[nr][nc] >= 0) {
                            extraRemove.push({ r: nr, c: nc });
                        }
                        // Damage nearby obstacles
                        if (this.chains[nr][nc] > 0) this.chains[nr][nc]--;
                        if (this.ice[nr][nc] > 0) this.ice[nr][nc]--;
                        if (this.box[nr][nc] > 0) {
                            this.box[nr][nc]--;
                            if (this.box[nr][nc] <= 0) this.board[nr][nc] = -1;
                        }
                    }
                }
            }
            this.score += 50 * this.comboCount;
        } else if (spec === this.SPECIAL_LIGHTNING) {
            // Clear entire row + column
            for (let i = 0; i < this.BS; i++) {
                if (this.board[r][i] >= 0) extraRemove.push({ r, c: i });
                if (this.board[i][c] >= 0) extraRemove.push({ r: i, c });
                // Damage obstacles in row/col
                if (this.chains[r][i] > 0) this.chains[r][i]--;
                if (this.ice[r][i] > 0) this.ice[r][i]--;
                if (this.chains[i][c] > 0) this.chains[i][c]--;
                if (this.ice[i][c] > 0) this.ice[i][c]--;
            }
            this.score += 80 * this.comboCount;
        } else if (spec === this.SPECIAL_RAINBOW) {
            // Remove all gems of same type
            const targetGem = this.board[r][c];
            if (targetGem >= 0) {
                for (let rr = 0; rr < this.BS; rr++) {
                    for (let cc = 0; cc < this.BS; cc++) {
                        if (this.board[rr][cc] === targetGem) {
                            extraRemove.push({ r: rr, c: cc });
                        }
                    }
                }
            }
            this.score += 100 * this.comboCount;
        }
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
                if (this.chains[nr][nc] > 0) toUnchain.push({ r: nr, c: nc });
                if (this.ice[nr][nc] > 0) toMeltIce.add(`${nr},${nc}`);
                if (this.box[nr][nc] > 0) toHitBox.add(`${nr},${nc}`);
            });
        });

        // Also melt ice on matched cells
        matches.forEach(({ r, c }) => {
            if (this.ice[r][c] > 0) toMeltIce.add(`${r},${c}`);
        });

        // Dedup unchains
        const unchainMap = {};
        toUnchain.forEach(({ r, c }) => { unchainMap[`${r},${c}`] = { r, c }; });
        const uniqueUnchain = Object.values(unchainMap);

        // Activate specials on matched cells
        const extraRemove = [];
        toRemove.forEach(({ r, c }) => {
            if (this.special[r][c] > 0) {
                this.activateSpecial(r, c, extraRemove);
            }
        });

        // Add extra removals from specials (dedup)
        const removeSet = new Set(toRemove.map(p => `${p.r},${p.c}`));
        extraRemove.forEach(p => {
            const key = `${p.r},${p.c}`;
            if (!removeSet.has(key)) {
                removeSet.add(key);
                toRemove.push(p);
            }
        });

        // Calculate points
        const pts = toRemove.length * 10 * combo * (toRemove.length > 3 ? 2 : 1);
        this.score += pts;

        // ---- Animate burst ----
        toRemove.forEach(({ r, c }) => {
            const cell = this.cells[r][c];
            cell.classList.add('burst');
            const gemIdx = this.board[r][c];
            const color = this.GEM_COLORS[gemIdx] || '#fff';
            for (let i = 0; i < 6; i++) {
                const p = document.createElement('span');
                p.className = 'm3-particle';
                p.style.setProperty('--angle', `${i * 60}deg`);
                p.style.setProperty('--color', color);
                p.textContent = this.GEMS[gemIdx] || '✨';
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
                this.board[r][c] = -1;
                this.score += 20 * combo;
            }
        });

        // ---- Create pending specials (from findMatches) ----
        // Place specials BEFORE removing matched cells
        if (this._pendingSpecials) {
            this._pendingSpecials.forEach(ps => {
                // Don't place on cells that will be removed (except the special cell itself stays)
                this.special[ps.r][ps.c] = ps.type;
                // Keep the gem on this cell (don't remove it)
                removeSet.delete(`${ps.r},${ps.c}`);
                // Remove from toRemove array
                const idx = toRemove.findIndex(p => p.r === ps.r && p.c === ps.c);
                if (idx !== -1) toRemove.splice(idx, 1);
            });
            this._pendingSpecials = [];
        }

        // After burst → drop
        setTimeout(() => {
            toRemove.forEach(({ r, c }) => {
                this.board[r][c] = -1;
                this.special[r][c] = 0;
            });
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

        for (let c = 0; c < this.BS; c++) {
            let writePos = this.BS - 1;
            for (let r = this.BS - 1; r >= 0; r--) {
                if (this.board[r][c] === -2) {
                    if (writePos === r) writePos = r - 1;
                    continue;
                }
                if (this.box[r][c] > 0) {
                    if (writePos === r) writePos = r - 1;
                    continue;
                }
                if (this.board[r][c] >= 0) {
                    while (writePos >= 0 && (this.board[writePos][c] === -2 || this.box[writePos][c] > 0)) writePos--;
                    if (writePos < 0) break;
                    if (writePos !== r) {
                        this.board[writePos][c] = this.board[r][c];
                        this.special[writePos][c] = this.special[r][c];
                        this.chains[writePos][c] = this.chains[r][c];
                        this.ice[writePos][c] = this.ice[r][c];
                        this.board[r][c] = -1;
                        this.special[r][c] = 0;
                        this.chains[r][c] = 0;
                        this.ice[r][c] = 0;
                    }
                    writePos--;
                }
            }
            for (let r = writePos; r >= 0; r--) {
                if (this.board[r][c] === -2 || this.box[r][c] > 0) continue;
                if (this.board[r][c] < 0) {
                    this.board[r][c] = Math.floor(Math.random() * (config.gemCount || 6));
                    this.special[r][c] = 0;
                    this.chains[r][c] = 0;
                    this.ice[r][c] = 0;
                    if (!newCellRows[c]) newCellRows[c] = [];
                    newCellRows[c].push(r);
                }
            }
        }

        this.updateAllCells();

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
        if (window.submitScore) window.submitScore('match3', this.score, this.level);
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
