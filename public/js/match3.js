// ==================== MATCH-3 (3 в ряд) — 1000 LEVELS ====================
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
    levelStars: {},   // { level: stars(1-3) }
    showingMap: true,
    mapPage: 0,
    LEVELS_PER_PAGE: 30,

    init() {
        this.loadProgress();
        this.showMap();
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

    // ========== LEVEL CONFIG (procedural) ==========
    getLevelConfig(lvl) {
        // Progressive difficulty
        const baseMoves = 30;
        const baseTarget = 300;

        // Moves decrease over levels (min 12)
        const moves = Math.max(12, baseMoves - Math.floor(lvl / 25));

        // Target score increases
        const target = baseTarget + (lvl - 1) * 80 + Math.floor(lvl / 10) * 50;

        // Number of gem types: start with 5, add 6th at level 20
        const gemCount = lvl < 20 ? 5 : 6;

        // Star thresholds
        const star2 = Math.floor(target * 1.3);
        const star3 = Math.floor(target * 1.7);

        return { moves, target, gemCount, star2, star3, level: lvl };
    },

    // ========== LEVEL MAP ==========
    showMap() {
        this.showingMap = true;
        this.mapPage = Math.floor((this.unlockedLevel - 1) / this.LEVELS_PER_PAGE);

        const field = document.getElementById('m3-field');
        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');

        // Update header
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
        html += '</div>';

        html += '<div class="m3-map-grid">';
        for (let i = start; i <= end; i++) {
            const unlocked = i <= this.unlockedLevel;
            const stars = this.levelStars[i] || 0;
            const current = i === this.unlockedLevel;
            let cls = 'm3-map-level';
            if (!unlocked) cls += ' locked';
            if (current) cls += ' current';
            if (stars > 0) cls += ' completed';

            const starsHtml = stars > 0 ? '<div class="m3-map-stars">' + '⭐'.repeat(stars) + '</div>' : '';

            html += `<div class="${cls}" onclick="${unlocked ? `Match3Game.playLevel(${i})` : ''}">`
                + `<span class="m3-map-num">${i}</span>`
                + (unlocked ? '' : '<span class="m3-map-lock">🔒</span>')
                + starsHtml
                + '</div>';
        }
        html += '</div>';

        field.innerHTML = html;
    },

    prevPage() {
        if (this.mapPage > 0) {
            this.mapPage--;
            this.renderMap();
        }
    },

    nextPage() {
        const maxPage = Math.floor((this.maxLevel - 1) / this.LEVELS_PER_PAGE);
        if (this.mapPage < maxPage) {
            this.mapPage++;
            this.renderMap();
        }
    },

    // ========== PLAY LEVEL ==========
    playLevel(lvl) {
        if (lvl > this.unlockedLevel) return;
        this.level = lvl;
        this.showingMap = false;

        const config = this.getLevelConfig(lvl);
        this.maxMoves = config.moves;
        this.moves = config.moves;
        this.targetScore = config.target;
        this.score = 0;
        this.selected = null;
        this.animating = false;

        // Show info header
        const header = document.querySelector('.m3-info');
        if (header) header.style.display = 'flex';

        this.generateBoard(config.gemCount);

        const field = document.getElementById('m3-field');
        if (field) field.className = 'm3-field';

        this.render();
        this.updateUI();

        const result = document.getElementById('m3-result');
        if (result) result.classList.add('hidden');

        // Show level start info
        this.showLevelInfo(config);
    },

    showLevelInfo(config) {
        const result = document.getElementById('m3-result');
        if (!result) return;
        result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = `🎯 Уровень ${this.level}`;
        document.getElementById('m3-result-text').innerHTML =
            `Набери <b>${config.target}</b> очков за <b>${config.moves}</b> ходов!`
            + `<br><small>⭐ ${config.target} · ⭐⭐ ${config.star2} · ⭐⭐⭐ ${config.star3}</small>`;
        const btn = result.querySelector('.btn');
        if (btn) {
            btn.textContent = '▶ Играть!';
            btn.onclick = () => {
                result.classList.add('hidden');
                btn.onclick = () => Match3Game.showMap();
            };
        }
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
            this.swap(sr, sc, r, c);
            this.selected = null;
            this.render();
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
        const points = matches.length * 10 * (matches.length > 3 ? 2 : 1);
        this.score += points;

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
            this.updateUI();

            setTimeout(() => {
                const newMatches = this.findMatches();
                if (newMatches.length > 0) {
                    this.processMatches(newMatches);
                } else {
                    this.animating = false;
                    if (!this.hasValidMoves(config.gemCount)) {
                        this.shuffleBoard(config.gemCount);
                    }
                    // Check win/lose
                    if (this.score >= this.targetScore) {
                        this.levelWin();
                    } else if (this.moves <= 0) {
                        this.levelLose();
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
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) { gems.push(this.board[r][c]); }
        }
        for (let i = gems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gems[i], gems[j]] = [gems[j], gems[i]];
        }
        let idx = 0;
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) { this.board[r][c] = gems[idx++]; }
        }
        const matches = this.findMatches();
        if (matches.length > 0) {
            matches.forEach(({ r, c }) => { this.board[r][c] = -1; });
            this.dropGems();
            this.fillEmpty(gemCount);
        }
        this.render();
    },

    // ========== WIN / LOSE ==========
    levelWin() {
        const config = this.getLevelConfig(this.level);
        let stars = 1;
        if (this.score >= config.star3) stars = 3;
        else if (this.score >= config.star2) stars = 2;

        // Save best stars
        const prev = this.levelStars[this.level] || 0;
        if (stars > prev) this.levelStars[this.level] = stars;

        // Unlock next level
        if (this.level >= this.unlockedLevel && this.level < this.maxLevel) {
            this.unlockedLevel = this.level + 1;
        }
        this.saveProgress();

        const result = document.getElementById('m3-result');
        if (result) result.classList.remove('hidden');
        document.getElementById('m3-result-title').textContent = '🎉 Уровень пройден!';
        document.getElementById('m3-result-text').innerHTML =
            `${'⭐'.repeat(stars)}<br>Очки: ${this.score} / ${config.target}`;
        const btn = result.querySelector('.btn');
        if (btn) {
            if (this.level < this.maxLevel) {
                btn.textContent = '▶ Следующий уровень';
                btn.onclick = () => Match3Game.playLevel(this.level + 1);
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

    // ========== UI ==========
    updateUI() {
        const scoreEl = document.getElementById('m3-score');
        const movesEl = document.getElementById('m3-moves');
        const bestEl = document.getElementById('m3-best');
        if (scoreEl) scoreEl.textContent = `⭐ ${this.score}/${this.targetScore}`;
        if (movesEl) movesEl.textContent = `🔄 ${this.moves}`;
        if (bestEl) bestEl.textContent = `📍 Ур. ${this.level}`;
    }
};
