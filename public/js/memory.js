const MemoryGame = {
    board: null,
    cards: [],
    flipped: [],
    matchedPairs: 0,
    moves: 0,
    isLocked: false,
    showingLeaderboard: false,

    EMOJIS: ['🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🥝'],

    init() {
        this.board = document.getElementById('memory-board');
    },

    start() {
        if (!this.board) this.init();

        document.getElementById('memory-result').classList.add('hidden');
        this.board.innerHTML = '';
        this.flipped = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.isLocked = false;
        this.updateStats();

        // Create deck (2 of each emoji)
        const deck = [...this.EMOJIS, ...this.EMOJIS];

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Render
        this.cards = deck.map((emoji, idx) => {
            const el = document.createElement('div');
            el.className = 'memory-card w-full h-full';
            el.innerHTML = `
        <div class="mc-front">${emoji}</div>
        <div class="mc-back"></div>
      `;
            el.dataset.emoji = emoji;
            el.dataset.idx = idx;

            el.addEventListener('click', () => this.flip(el));
            this.board.appendChild(el);
            return el;
        });
    },

    flip(card) {
        if (this.isLocked) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

        App.haptic('light');
        card.classList.add('flipped');
        this.flipped.push(card);

        if (this.flipped.length === 2) {
            this.moves++;
            this.updateStats();
            this.checkMatch();
        }
    },

    checkMatch() {
        const [c1, c2] = this.flipped;
        const match = c1.dataset.emoji === c2.dataset.emoji;

        if (match) {
            this.matchedPairs++;
            App.haptic('medium');
            this.updateStats();

            setTimeout(() => {
                c1.classList.add('matched');
                c2.classList.add('matched');

                if (this.matchedPairs === this.EMOJIS.length) {
                    this.gameOver();
                }
            }, 500);

            this.flipped = [];
        } else {
            this.isLocked = true;
            setTimeout(() => {
                c1.classList.remove('flipped');
                c2.classList.remove('flipped');
                this.isLocked = false;
                App.haptic('light');
            }, 1000);
            this.flipped = [];
        }
    },

    updateStats() {
        document.getElementById('memory-moves').textContent = `🔄 ${this.moves} х.`;
        document.getElementById('memory-pairs').textContent = `🔍 ${this.matchedPairs}/8`;
    },

    gameOver() {
        App.haptic('heavy');

        // Calculate score based on moves (min moves = 8, perfect score = 1000)
        // Less moves = higher score
        const baseScore = 1500;
        const penalty = (this.moves - 8) * 50;
        const score = Math.max(100, baseScore - penalty);

        document.getElementById('memory-result-title').textContent = 'Отличная память!';
        document.getElementById('memory-result-text').textContent = `Счёт: ${score}\nХодов: ${this.moves}`;
        document.getElementById('memory-result').classList.remove('hidden');

        if (window.submitScore) {
            window.submitScore('memory', score, 0);
        }
    },

    hideLeaderboard() {
        this.showingLeaderboard = false;
        hideLeaderboard();
    }
};
