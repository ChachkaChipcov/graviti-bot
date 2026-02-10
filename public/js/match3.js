// ==================== MATCH-3 (3 в ряд) — FULL VERSION ====================
const Match3Game = {
    BOARD_SIZE: 8,
    GEMS: ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'],
    board: [],
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

        field.className = 'm3-tutorial';
        field.innerHTML = `
      <div class="m3-tut-slide active" data-slide="0">
        <div class="m3-tut-emoji">💎</div>
        <h3>Добро пожаловать!</h3>
        <p>Собирай 3 или больше одинаковых кристалла в ряд, чтобы набрать очки!</p>
      </div>
      <div class="m3-tut-slide" data-slide="1">
        <div class="m3-tut-emoji">👆</div>
        <h3>Как играть</h3>
        <p>Свайпай кристаллы в любом направлении или нажми на два соседних, чтобы поменять их местами.</p>
      </div>
      <div class="m3-tut-slide" data-slide="2">
        <div class="m3-tut-emoji">⭐</div>
        <h3>Собирай звёзды!</h3>
        <p>Набери нужное количество очков за ограниченное число ходов. За больше очков — больше звёзд!</p>
      </div>
      <div class="m3-tut-slide" data-slide="3">
        <div class="m3-tut-emoji">🗺️</div>
        <h3>1000 уровней!</h3>
        <p>Проходи уровень за уровнем. Каждый сложнее предыдущего!</p>
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
        const slides = document.querySelectorAll('.m3-tut-slide');
        const dots = document.querySelectorAll('.m3-tut-dot');
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        const current = document.querySelector(`.m3-tut-slide[data-slide="${this._tutSlide}"]`);
        const currentDot = document.querySelector(`.m3-tut-dot[data-d="${this._tutSlide}"]`);
        if (current) current.classList.add('active');
        if (currentDot) currentDot.classList.add('active');
        const btn = document.querySelector('.m3-tut-nav .btn');
        if (btn && this._tutSlide === 3) btn.textContent = 'Начать! 🎮';
    },

    // ========== SAVE / LOAD ==========
    loadProgress() {
        try {
            this.unlockedLevel = parseInt(localStorage.getItem('m3_unlocked') || '1');
            const stars = localStorage.getItem('m3_stars');
            this.levelStars = stars ? JSON.parse(stars) : {};
        } catch (e) {
            this.unlockedLevel = 1;
            this.levelStars = {};
        }
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
        return { moves, target, gemCount, star2, star3, level: lvl };
    },

    // ========== LEVEL MAP ==========
    showMap() {
        this.showingMap = true;
        this.mapPage = Math.floor((this.unlockedLevel - 1) / this.LEVELS_PER_PAGE);
        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');
        const header = document.querySelector('.m3-info');
        if (header) header.style.display = 'none';
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

        this.generateBoard(config.gemCount);
        const field = document.getElementById('m3-field');
        if (field) field.className = 'm3-field';

        this.render();
        this.updateUI();
        this.setupTouch();
        this.showLevelInfo(config);
    },

    showLevelInfo(config) {
        const result = document.getElementById('m3-result');
        if (!result) return;
        result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = `🎯 Уровень ${this.level}`;
        document.getElementById('m3-result-text').innerHTML =
            `Набери <b>${config.target}</b> очков за <b>${config.moves}</b> ходов!`
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
            // Find the cell under touch
            const el = document.elementFromPoint(t.clientX, t.clientY);
            if (el && el.classList.contains('m3-cell')) {
                this.touchCell = { r: parseInt(el.dataset.r), c: parseInt(el.dataset.c) };
            } else {
                this.touchCell = null;
            }
        }, { passive: false });

        field.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        field.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.touchCell || this.animating || this.showingMap) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            const minSwipe = 20;

            if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
                // Tap — select cell
                this.onCellClick(this.touchCell.r, this.touchCell.c);
                return;
            }

            // Swipe direction
            let tr, tc;
            if (Math.abs(dx) > Math.abs(dy)) {
                tr = this.touchCell.r;
                tc = this.touchCell.c + (dx > 0 ? 1 : -1);
            } else {
                tr = this.touchCell.r + (dy > 0 ? 1 : -1);
                tc = this.touchCell.c;
            }

            // Bounds check
            if (tr < 0 || tr >= this.BOARD_SIZE || tc < 0 || tc >= this.BOARD_SIZE) return;

            // Do swap directly
            this.selected = { r: this.touchCell.r, c: this.touchCell.c };
            this.onCellClick(tr, tc);
        }, { passive: false });
    },

    // ========== BOARD GENERATION ==========
    generateBoard(gemCount) {
        gemCount = gemCount || 6;
        this.board = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                let gem;
                do {
                    gem = Math.floor(Math.random() * gemCount);
                } while (
                    (c >= 2 && this.board[r][c - 1] === gem && this.board[r][c - 2] === gem) ||
                    (r >= 2 && this.board[r - 1][c] === gem && this.board[r - 2][c] === gem)
                );
                this.board[r][c] = gem;
            }
        }
    },

    // ========== RENDERING ==========
    render() {
        const field = document.getElementById('m3-field');
        if (!field || this.showingMap) return;

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

    // ========== GAME LOGIC ==========
    onCellClick(r, c) {
        if (this.animating || this.board[r][c] === -1 || this.showingMap) return;

        if (!this.selected) {
            this.selected = { r, c };
            this.render();
            return;
        }

        const sr = this.selected.r, sc = this.selected.c;
        if (sr === r && sc === c) { this.selected = null; this.render(); return; }
        const isAdjacent = (Math.abs(sr - r) + Math.abs(sc - c)) === 1;

        if (!isAdjacent) {
            this.selected = { r, c };
            this.render();
            return;
        }

        // Animate swap
        this.animateSwap(sr, sc, r, c, () => {
            this.swap(sr, sc, r, c);
            const matches = this.findMatches();

            if (matches.length === 0) {
                // Swap back with animation
                this.swap(sr, sc, r, c);
                this.animateSwap(r, c, sr, sc, () => {
                    this.selected = null;
                    this.render();
                });
                return;
            }

            this.selected = null;
            this.moves--;
            this.comboCount = 0;
            this.animating = true;
            this.processMatches(matches);
        });
    },

    animateSwap(r1, c1, r2, c2, callback) {
        this.animating = true;
        const cell1 = document.querySelector(`.m3-cell[data-r="${r1}"][data-c="${c1}"]`);
        const cell2 = document.querySelector(`.m3-cell[data-r="${r2}"][data-c="${c2}"]`);
        if (!cell1 || !cell2) { if (callback) callback(); return; }

        const dx = (c2 - c1) * 100;
        const dy = (r2 - r1) * 100;
        cell1.style.transition = 'transform 0.2s ease';
        cell2.style.transition = 'transform 0.2s ease';
        cell1.style.transform = `translate(${dx}%, ${dy}%)`;
        cell2.style.transform = `translate(${-dx}%, ${-dy}%)`;

        setTimeout(() => {
            cell1.style.transition = '';
            cell2.style.transition = '';
            cell1.style.transform = '';
            cell2.style.transform = '';
            this.animating = false;
            if (callback) callback();
        }, 220);
    },

    swap(r1, c1, r2, c2) {
        const tmp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = tmp;
    },

    findMatches() {
        const matches = new Set();
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE - 2; c++) {
                const g = this.board[r][c];
                if (g < 0) continue;
                if (g === this.board[r][c + 1] && g === this.board[r][c + 2]) {
                    matches.add(`${r},${c}`); matches.add(`${r},${c + 1}`); matches.add(`${r},${c + 2}`);
                    let ext = c + 3;
                    while (ext < this.BOARD_SIZE && this.board[r][ext] === g) { matches.add(`${r},${ext}`); ext++; }
                }
            }
        }
        for (let c = 0; c < this.BOARD_SIZE; c++) {
            for (let r = 0; r < this.BOARD_SIZE - 2; r++) {
                const g = this.board[r][c];
                if (g < 0) continue;
                if (g === this.board[r + 1][c] && g === this.board[r + 2][c]) {
                    matches.add(`${r},${c}`); matches.add(`${r + 1},${c}`); matches.add(`${r + 2},${c}`);
                    let ext = r + 3;
                    while (ext < this.BOARD_SIZE && this.board[ext][c] === g) { matches.add(`${ext},${c}`); ext++; }
                }
            }
        }
        return [...matches].map(s => { const [r, c] = s.split(',').map(Number); return { r, c }; });
    },

    processMatches(matches) {
        this.comboCount++;
        const combo = this.comboCount;
        const points = matches.length * 10 * combo * (matches.length > 3 ? 2 : 1);
        this.score += points;

        // Show floating score
        if (matches.length > 0) {
            const firstCell = document.querySelector(`.m3-cell[data-r="${matches[0].r}"][data-c="${matches[0].c}"]`);
            if (firstCell) {
                const scorePop = document.createElement('div');
                scorePop.className = 'm3-score-pop';
                scorePop.textContent = `+${points}${combo > 1 ? ` x${combo}` : ''}`;
                firstCell.appendChild(scorePop);
                setTimeout(() => scorePop.remove(), 800);
            }
        }

        matches.forEach(({ r, c }) => { this.board[r][c] = -1; });
        this.render();
        matches.forEach(({ r, c }) => {
            const cell = document.querySelector(`.m3-cell[data-r="${r}"][data-c="${c}"]`);
            if (cell) cell.classList.add('matched');
        });

        setTimeout(() => {
            const config = this.getLevelConfig(this.level);
            this.dropGems();
            this.fillEmpty(config.gemCount);
            this.render();
            // Animate new gems falling in
            document.querySelectorAll('.m3-cell').forEach(cell => {
                cell.classList.add('drop-in');
                setTimeout(() => cell.classList.remove('drop-in'), 300);
            });
            this.updateUI();

            setTimeout(() => {
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
            }, 300);
        }, 350);
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
            for (let r = writePos; r >= 0; r--) { this.board[r][c] = -1; }
        }
    },

    fillEmpty(gemCount) {
        gemCount = gemCount || 6;
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === -1) {
                    this.board[r][c] = Math.floor(Math.random() * gemCount);
                }
            }
        }
    },

    hasValidMoves(gemCount) {
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

    shuffleBoard(gemCount) {
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
        if (m.length > 0) { m.forEach(({ r, c }) => { this.board[r][c] = -1; }); this.dropGems(); this.fillEmpty(gemCount); }
        this.render();
    },

    // ========== WIN / LOSE ==========
    levelWin() {
        const config = this.getLevelConfig(this.level);
        let stars = 1;
        if (this.score >= config.star3) stars = 3;
        else if (this.score >= config.star2) stars = 2;

        const prev = this.levelStars[this.level] || 0;
        if (stars > prev) this.levelStars[this.level] = stars;
        if (this.level >= this.unlockedLevel && this.level < this.maxLevel) {
            this.unlockedLevel = this.level + 1;
        }
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
                btn.textContent = '🏆 Все уровни пройдены!';
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
        if (btn) {
            btn.textContent = '🔄 Заново';
            btn.onclick = () => Match3Game.playLevel(Match3Game.level);
        }
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

        // Progress bar
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
