// Rock Paper Scissors Game
const RPS = {
    room: null,
    myChoice: null,
    isWaiting: false,

    choiceEmojis: {
        rock: '✊',
        paper: '✋',
        scissors: '✌️'
    },

    init(room) {
        this.room = room;
        this.myChoice = null;
        this.isWaiting = false;

        // Reset UI
        document.getElementById('rps-left-hand').textContent = '❓';
        document.getElementById('rps-right-hand').textContent = '❓';
        document.getElementById('rps-result').textContent = '';
        document.getElementById('rps-result').className = 'rps-result';

        // Update player names
        const me = room.players.find(p => p.odId === App.userId);
        const opponent = room.players.find(p => p.odId !== App.userId);

        document.getElementById('rps-player1').textContent = me?.name || 'Вы';
        document.getElementById('rps-player2').textContent = opponent?.name || 'Соперник';

        // Update scores
        document.getElementById('rps-score1').textContent = room.state?.scores?.[App.userId] || 0;
        document.getElementById('rps-score2').textContent = room.state?.scores?.[opponent?.odId] || 0;

        // Enable buttons
        this.enableButtons(true);
    },

    enableButtons(enabled) {
        document.querySelectorAll('.rps-choice').forEach(btn => {
            btn.disabled = !enabled;
            btn.classList.remove('selected');
        });
    },

    showWaiting() {
        this.isWaiting = true;
        document.getElementById('rps-result').textContent = 'Ожидаем соперника...';
        document.getElementById('rps-result').className = 'rps-result loading';
    },

    showResult(data) {
        const { choices, winner, scores } = data;

        // Get opponent ID
        const opponentId = this.room.players.find(p => p.odId !== App.userId)?.odId;

        // Animate hands
        const leftHand = document.getElementById('rps-left-hand');
        const rightHand = document.getElementById('rps-right-hand');

        leftHand.classList.add('shake');
        rightHand.classList.add('shake');

        setTimeout(() => {
            leftHand.classList.remove('shake');
            rightHand.classList.remove('shake');

            // Show choices
            leftHand.textContent = this.choiceEmojis[choices[App.userId]];
            rightHand.textContent = this.choiceEmojis[choices[opponentId]];

            // Update scores
            document.getElementById('rps-score1').textContent = scores[App.userId] || 0;
            document.getElementById('rps-score2').textContent = scores[opponentId] || 0;

            // Show result
            const resultEl = document.getElementById('rps-result');

            if (winner === null) {
                resultEl.textContent = '🤝 Ничья!';
                resultEl.className = 'rps-result draw';
            } else if (winner === App.userId) {
                resultEl.textContent = '🎉 Вы победили!';
                resultEl.className = 'rps-result win';
                App.haptic('heavy');
                App.showVictory(true);
            } else {
                resultEl.textContent = '😢 Вы проиграли';
                resultEl.className = 'rps-result lose';
                App.haptic('medium');
            }

            // Enable buttons for next round after delay
            setTimeout(() => {
                this.myChoice = null;
                this.isWaiting = false;
                this.enableButtons(true);
                resultEl.textContent = 'Выберите снова!';
                resultEl.className = 'rps-result';
                leftHand.textContent = '❓';
                rightHand.textContent = '❓';
            }, 2500);

        }, 1500); // After shake animation
    }
};

function makeRPSChoice(choice) {
    if (RPS.myChoice || RPS.isWaiting) return;

    RPS.myChoice = choice;
    App.haptic('light');

    // Show selected
    document.querySelectorAll('.rps-choice').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.choice === choice) {
            btn.classList.add('selected');
        }
        btn.disabled = true;
    });

    // Show my choice on left hand
    document.getElementById('rps-left-hand').textContent = RPS.choiceEmojis[choice];

    // Send to server
    Multiplayer.rpsChoice(choice);
}

// RPS Settings
let rpsSettings = {
    winsToWin: 3
};

function updateRpsWinsDisplay(value) {
    document.getElementById('rps-wins-value').textContent = value;
    rpsSettings.winsToWin = parseInt(value);
    App.haptic('light');
}

function createRpsRoom() {
    App.currentGame = 'rps';
    App.showScreen('room');
    document.getElementById('room-title').textContent = '✊✋✌️ КНБ';

    Multiplayer.createRoom('rps', {
        maxPlayers: 2,
        winsToWin: rpsSettings.winsToWin
    });
}

