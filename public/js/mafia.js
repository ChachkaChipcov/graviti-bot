// ==================== MAFIA GAME ====================
const MafiaGame = {
    mode: null,        // 'bot' | 'human'
    socket: null,
    roomId: null,
    myId: null,
    myRole: null,
    isHost: false,
    players: [],
    phase: null,       // 'night', 'day', 'vote'
    selectedTarget: null,
    diceRolls: {},

    ROLES: {
        mafia: { icon: '🔫', name: 'Мафия', desc: 'Ночью выбираете жертву вместе с другими мафиози' },
        civilian: { icon: '👤', name: 'Мирный', desc: 'Днём голосуйте, чтобы вычислить мафию' },
        sheriff: { icon: '🔍', name: 'Шериф', desc: 'Ночью можете проверить одного игрока' },
        medic: { icon: '💊', name: 'Медик', desc: 'Ночью можете вылечить одного игрока' }
    },

    PHASE_MESSAGES: {
        night: '🌙 Наступает ночь...',
        mafia_wake: '🔫 Просыпается мафия...',
        sheriff_wake: '🔍 Просыпается шериф...',
        medic_wake: '💊 Просыпается медик...',
        day: '☀️ Наступает день...',
        vote: '🗳 Голосование!',
        mafia_win: '🔫 Мафия победила!',
        civilian_win: '👥 Мирные победили!'
    },

    selectMode(mode) {
        this.mode = mode;
        document.getElementById('mf-mode-select').style.display = 'none';

        if (typeof MultiplayerManager !== 'undefined' && MultiplayerManager.socket) {
            this.socket = MultiplayerManager.socket;
        } else if (typeof io !== 'undefined') {
            this.socket = io();
        }

        if (!this.socket) {
            alert('Ошибка подключения!');
            return;
        }

        this.setupSocketListeners();

        // Emit join mafia room
        this.socket.emit('mafia:join', {
            mode: mode,
            userId: window.tg?.initDataUnsafe?.user?.id || Math.random().toString(36).substr(2, 8),
            userName: window.tg?.initDataUnsafe?.user?.first_name || 'Игрок',
            photoUrl: window.tg?.initDataUnsafe?.user?.photo_url || null
        });

        document.getElementById('mf-game-area').classList.remove('hidden');
        document.getElementById('mf-status').innerHTML = '⏳ Ожидание игроков... (минимум 5)';
    },

    setupSocketListeners() {
        const s = this.socket;

        s.on('mafia:player_list', (data) => {
            this.players = data.players;
            this.roomId = data.roomId;
            this.myId = data.myId;
            this.isHost = data.isHost;
            this.renderPlayers();
            const count = this.players.length;
            document.getElementById('mf-status').innerHTML =
                `👥 Игроков: ${count}/12 ${count >= 5 ? '(можно начинать!)' : `(нужно ещё ${5 - count})`}`;

            if (this.isHost && count >= 5) {
                document.getElementById('mf-status').innerHTML +=
                    `<br><button class="btn primary" style="margin-top:10px" onclick="MafiaGame.startGame()">▶ Начать игру</button>`;
            }
        });

        s.on('mafia:role', (data) => {
            this.myRole = data.role;
            this.showRoleCard(data.role);
        });

        s.on('mafia:phase', (data) => {
            this.phase = data.phase;
            this.showPhaseOverlay(data.phaseMsg, data.phaseType);

            setTimeout(() => {
                this.hidePhaseOverlay();
                this.handlePhase(data);
            }, data.duration || 2500);
        });

        s.on('mafia:action_result', (data) => {
            if (data.type === 'sheriff_check') {
                const target = this.players.find(p => p.id === data.targetId);
                const isMafia = data.isMafia;
                alert(`🔍 ${target?.name || 'Игрок'} — ${isMafia ? '🔫 МАФИЯ!' : '👤 Мирный'}`);
            }
        });

        s.on('mafia:night_result', (data) => {
            if (data.killed) {
                const killed = this.players.find(p => p.id === data.killed);
                document.getElementById('mf-status').innerHTML =
                    `💀 Этой ночью был убит: <strong>${killed?.name || 'Игрок'}</strong>`;
            } else {
                document.getElementById('mf-status').innerHTML = '🌅 Этой ночью никто не погиб!';
            }
            if (data.saved) {
                document.getElementById('mf-status').innerHTML += '<br>💊 Медик спас жизнь!';
            }
            this.players = data.players;
            this.renderPlayers();
        });

        s.on('mafia:vote_result', (data) => {
            if (data.eliminated) {
                const elim = this.players.find(p => p.id === data.eliminated);
                document.getElementById('mf-status').innerHTML =
                    `🗳 Голосованием исключён: <strong>${elim?.name || 'Игрок'}</strong> (${this.ROLES[data.eliminatedRole]?.name || '?'})`;
            } else {
                document.getElementById('mf-status').innerHTML = '🗳 Голоса разделились — никто не исключён';
            }
            this.players = data.players;
            this.renderPlayers();
        });

        s.on('mafia:game_over', (data) => {
            const msg = data.winner === 'mafia' ? this.PHASE_MESSAGES.mafia_win : this.PHASE_MESSAGES.civilian_win;
            this.showPhaseOverlay(msg, data.winner === 'mafia' ? 'night' : 'day');
            document.getElementById('mf-status').innerHTML = msg +
                `<br><button class="btn primary" style="margin-top:10px" onclick="goBackToLobby()">🏠 В меню</button>`;
            // Show all roles
            if (data.players) {
                this.players = data.players;
                this.renderPlayers(true);
            }
        });

        s.on('mafia:chat', (data) => {
            this.addChatMessage(data.name, data.text, data.system);
        });

        s.on('mafia:dice', (data) => {
            this.showDiceResult(data);
        });

        s.on('mafia:host_controls', (data) => {
            this.showHostControls(data);
        });
    },

    startGame() {
        this.socket.emit('mafia:start', { roomId: this.roomId });
    },

    showRoleCard(role) {
        const info = this.ROLES[role];
        if (!info) return;

        const card = document.getElementById('mf-role-card');
        document.getElementById('mf-role-icon').textContent = info.icon;
        document.getElementById('mf-role-name').textContent = info.name;
        document.getElementById('mf-role-desc').textContent = info.desc;
        card.classList.remove('hidden');

        setTimeout(() => card.classList.add('hidden'), 4000);
    },

    showPhaseOverlay(msg, type) {
        const overlay = document.getElementById('mf-phase-overlay');
        overlay.className = 'mf-phase-overlay ' + (type || 'night');
        document.getElementById('mf-phase-text').textContent = msg;
    },

    hidePhaseOverlay() {
        document.getElementById('mf-phase-overlay').classList.add('hidden');
    },

    handlePhase(data) {
        // Hide all action areas
        document.getElementById('mf-actions').classList.add('hidden');
        document.getElementById('mf-voting').classList.add('hidden');
        document.getElementById('mf-chat').classList.add('hidden');
        document.getElementById('mf-dice-area').classList.add('hidden');

        if (data.phase === 'night') {
            // Check if this player has a night action
            if (data.activeRole === this.myRole && data.canAct) {
                this.showActionUI(data);
            } else {
                document.getElementById('mf-status').innerHTML = '🌙 Ночь... Ждите своей очереди.';
            }
        } else if (data.phase === 'day') {
            document.getElementById('mf-chat').classList.remove('hidden');
            document.getElementById('mf-status').innerHTML = '☀️ День — обсуждайте!';

            if (data.showVoteButton) {
                document.getElementById('mf-status').innerHTML +=
                    `<br><button class="btn primary" style="margin-top:10px" onclick="MafiaGame.socket.emit('mafia:start_vote', {roomId: MafiaGame.roomId})">🗳 Начать голосование</button>`;
            }
        } else if (data.phase === 'vote') {
            this.showVotingUI(data);
        }
    },

    showActionUI(data) {
        const actions = document.getElementById('mf-actions');
        actions.classList.remove('hidden');

        let title = '';
        if (this.myRole === 'mafia') title = '🔫 Выберите жертву:';
        else if (this.myRole === 'sheriff') title = '🔍 Кого проверить?';
        else if (this.myRole === 'medic') title = '💊 Кого лечить?';

        document.getElementById('mf-action-title').textContent = title;

        const targets = document.getElementById('mf-action-targets');
        targets.innerHTML = '';

        const alivePlayers = this.players.filter(p => p.alive && p.id !== this.myId);
        alivePlayers.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'btn secondary';
            btn.textContent = p.name;
            btn.onclick = () => {
                this.socket.emit('mafia:action', {
                    roomId: this.roomId,
                    targetId: p.id,
                    role: this.myRole
                });
                actions.classList.add('hidden');
                document.getElementById('mf-status').innerHTML = '✅ Действие выполнено. Ожидайте...';
            };
            targets.appendChild(btn);
        });
    },

    showVotingUI(data) {
        const voting = document.getElementById('mf-voting');
        voting.classList.remove('hidden');

        const targets = document.getElementById('mf-vote-targets');
        targets.innerHTML = '';

        const alivePlayers = this.players.filter(p => p.alive && p.id !== this.myId);
        alivePlayers.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'btn secondary';
            btn.textContent = `${p.name} ${p.votes ? `(${p.votes})` : ''}`;
            btn.onclick = () => {
                this.socket.emit('mafia:vote', {
                    roomId: this.roomId,
                    targetId: p.id
                });
                voting.classList.add('hidden');
                document.getElementById('mf-status').innerHTML = '🗳 Голос принят!';
            };
            targets.appendChild(btn);
        });

        // Skip vote
        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn secondary';
        skipBtn.textContent = '⏭ Пропустить';
        skipBtn.onclick = () => {
            this.socket.emit('mafia:vote', { roomId: this.roomId, targetId: null });
            voting.classList.add('hidden');
        };
        targets.appendChild(skipBtn);
    },

    renderPlayers(showRoles = false) {
        const container = document.getElementById('mf-players');
        container.innerHTML = '';

        this.players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'mf-player' + (p.alive ? '' : ' dead');

            const avatar = document.createElement('div');
            avatar.className = 'mf-player-avatar';
            if (p.photoUrl) {
                avatar.innerHTML = `<img src="${p.photoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
            } else {
                avatar.textContent = p.name?.charAt(0)?.toUpperCase() || '?';
            }

            const name = document.createElement('div');
            name.className = 'mf-player-name';
            let nameText = p.name || 'Игрок';
            if (showRoles && p.role) {
                nameText += ` ${this.ROLES[p.role]?.icon || ''}`;
            }
            if (!p.alive) nameText += ' 💀';
            name.textContent = nameText;

            div.appendChild(avatar);
            div.appendChild(name);
            container.appendChild(div);
        });
    },

    sendChat() {
        const input = document.getElementById('mf-chat-text');
        const text = input.value.trim();
        if (!text) return;
        this.socket.emit('mafia:chat', {
            roomId: this.roomId,
            text: text
        });
        input.value = '';
    },

    addChatMessage(name, text, isSystem = false) {
        const container = document.getElementById('mf-chat-messages');
        const div = document.createElement('div');
        div.className = 'mf-chat-msg' + (isSystem ? ' system' : '');
        div.innerHTML = isSystem ? text : `<span class="name">${name}:</span> ${text}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    // === Human Host Mode ===
    rollDice() {
        this.socket.emit('mafia:roll_dice', { roomId: this.roomId });
    },

    showDiceResult(data) {
        const area = document.getElementById('mf-dice-area');
        area.classList.remove('hidden');

        const result = document.getElementById('mf-dice-result');
        // Dice animation
        let rolls = 0;
        const anim = setInterval(() => {
            result.textContent = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][Math.floor(Math.random() * 6)];
            rolls++;
            if (rolls > 10) {
                clearInterval(anim);
                const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
                result.textContent = diceEmojis[data.value - 1] || data.value;
                result.innerHTML += `<br><span style="font-size:1rem">${data.playerName}: ${data.value}</span>`;
            }
        }, 100);
    },

    showHostControls(data) {
        // For human host mode - show controls to manage game
        if (!this.isHost && this.mode !== 'human') return;

        let html = '<div style="padding:16px; text-align:center;">';
        html += '<h4>🎭 Управление ведущего</h4>';

        if (data.action === 'assign_roles') {
            html += '<p>Раздайте роли игрокам:</p>';
            data.players.forEach(p => {
                html += `<div style="margin:8px 0">
          <span>${p.name}</span>
          <select id="role-${p.id}" style="margin-left:8px;padding:4px 8px;border-radius:8px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.2)">
            <option value="civilian">👤 Мирный</option>
            <option value="mafia">🔫 Мафия</option>
            <option value="sheriff">🔍 Шериф</option>
            <option value="medic">💊 Медик</option>
          </select>
        </div>`;
            });
            html += `<button class="btn primary" style="margin-top:12px" onclick="MafiaGame.submitRoles()">✅ Раздать роли</button>`;
        } else if (data.action === 'next_phase') {
            html += `<button class="btn primary" onclick="MafiaGame.socket.emit('mafia:next_phase',{roomId:MafiaGame.roomId})">
        ▶ Следующая фаза
      </button>`;
        }

        html += '</div>';
        document.getElementById('mf-status').innerHTML = html;
    },

    submitRoles() {
        const roles = {};
        this.players.forEach(p => {
            const sel = document.getElementById(`role-${p.id}`);
            if (sel) roles[p.id] = sel.value;
        });
        this.socket.emit('mafia:assign_roles', { roomId: this.roomId, roles });
    }
};
