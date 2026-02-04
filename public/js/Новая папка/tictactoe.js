// Tic Tac Toe Game
const TicTacToe = {
    room: null,
    mySymbol: null,
    isMyTurn: false,
    gameOver: false,

    init(room) {
        this.room = room;
        this.gameOver = false;

        // Determine my symbol
        const myIndex = room.players.findIndex(p => p.odId === App.userId);
        this.mySymbol = myIndex === 0 ? 'X' : 'O';
        this.isMyTurn = room.currentTurn === App.userId;

        // Update player names
        const opponent = room.players.find(p => p.odId !== App.userId);
        document.getElementById('ttt-player1').textContent = `Вы (${this.mySymbol})`;
        document.getElementById('ttt-player2').textContent = `${opponent?.name || 'Соперник'} (${this.mySymbol === 'X' ? 'O' : 'X'})`;

        // Reset board
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.textContent = '';
            cell.className = 'ttt-cell';
        });

        // Update turn indicator
        this.updateTurnIndicator();

        // Hide result and rematch
        document.getElementById('ttt-result').textContent = '';
        document.getElementById('ttt-rematch').classList.add('hidden');
    },

    updateTurnIndicator() {
        const turnEl = document.getElementById('ttt-turn');
        if (this.isMyTurn) {
            turnEl.textContent = 'Ваш ход!';
            turnEl.style.background = 'var(--accent-gradient)';
        } else {
            turnEl.textContent = 'Ход соперника...';
            turnEl.style.background = 'var(--glass)';
        }
    },

    update(data) {
        const { state, currentTurn, winner, winLine, isDraw } = data;

        // Update board
        state.forEach((cell, index) => {
            const cellEl = document.querySelector(`.ttt-cell[data-index="${index}"]`);
            if (cell && cellEl.textContent !== cell) {
                cellEl.textContent = cell;
                cellEl.classList.add('filled', cell.toLowerCase(), 'pop');
                App.haptic('light');
            }
        });

        // Update turn
        this.isMyTurn = currentTurn === App.userId;
        this.updateTurnIndicator();

        // Check for game end
        if (winner || isDraw) {
            this.gameOver = true;

            if (winLine) {
                // Highlight winning cells
                winLine.forEach(index => {
                    document.querySelector(`.ttt-cell[data-index="${index}"]`).classList.add('win');
                });
            }

            const resultEl = document.getElementById('ttt-result');

            if (isDraw) {
                resultEl.innerHTML = '<span class="draw">🤝 Ничья!</span>';
                App.haptic('medium');
            } else if (winner === App.userId) {
                resultEl.innerHTML = '<span class="win">🎉 Вы победили!</span>';
                App.showVictory(true);
            } else {
                resultEl.innerHTML = '<span class="lose">😢 Вы проиграли</span>';
                App.showVictory(false);
            }

            document.getElementById('ttt-rematch').classList.remove('hidden');
        }
    }
};

function makeTTTMove(index) {
    if (!TicTacToe.isMyTurn || TicTacToe.gameOver) return;

    const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
    if (cell.classList.contains('filled')) return;

    App.haptic('light');
    Multiplayer.tttMove(index);
}

function requestRematch() {
    playAgain();
}
