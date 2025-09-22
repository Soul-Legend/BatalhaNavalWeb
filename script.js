document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gameMode = params.get('modo');

    if (document.getElementById('player-board')) {
        if (gameMode === 'bot') {
            iniciarJogoContraBot();
        } else if (gameMode === 'player') {
            mostrarTelaDeEspera();
        }
    }
});

const TAMANHO_TABULEIRO = 10;
const NAVIOS_CONFIG = [
    { nome: 'porta-avioes', tamanho: 5, quantidade: 1 },
    { nome: 'navio-tanque', tamanho: 4, quantidade: 2 },
    { nome: 'contratorpedeiro', tamanho: 3, quantidade: 3 },
    { nome: 'submarino', tamanho: 2, quantidade: 4 },
];

let turnoDoPlayer = true;
let jogoAcabou = false;

function iniciarJogoContraBot() {
    const playerBoardElement = document.getElementById('player-board');
    const opponentBoardElement = document.getElementById('opponent-board');

    const playerBoard = criarTabuleiroLogico();
    const opponentBoard = criarTabuleiroLogico();

    posicionarNaviosAleatoriamente(playerBoard, 'player');
    posicionarNaviosAleatoriamente(opponentBoard, 'opponent');

    renderizarTabuleiroVisual(playerBoardElement, playerBoard, true);
    renderizarTabuleiroVisual(opponentBoardElement, opponentBoard, false);
    
    renderizarContadores('player');
    renderizarContadores('opponent');

    opponentBoardElement.addEventListener('click', (e) => {
        if (!turnoDoPlayer || jogoAcabou || !e.target.classList.contains('cell')) return;

        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const celulaLogica = opponentBoard[y][x];

        if (celulaLogica.atacado) return;
        const resultado = atacar(opponentBoard, x, y);

        if (resultado === 'afundado') {
            marcarComoAfundado(opponentBoard, celulaLogica.navioInfo, opponentBoardElement);
        } else {
            atualizarCelulaVisual(e.target, resultado);
        }
        verificarFimDeJogo(opponentBoard, 'Player');

        if (!jogoAcabou) {
            turnoDoPlayer = false;
            atualizarInfoPanel(false);
            setTimeout(turnoDoBot, 1000);
        }
    });

    const bot = criarLogicaBot();

    function turnoDoBot() {
        if (jogoAcabou) return;
        const { x, y } = bot.escolherAlvo();
        const celulaLogica = playerBoard[y][x];
        const resultado = atacar(playerBoard, x, y);
        bot.registrarResultado(x, y, resultado);

        if (resultado === 'afundado') {
             marcarComoAfundado(playerBoard, celulaLogica.navioInfo, playerBoardElement);
        } else {
            const cellElement = playerBoardElement.querySelector(`[data-x='${x}'][data-y='${y}']`);
            atualizarCelulaVisual(cellElement, resultado);
        }
        verificarFimDeJogo(playerBoard, 'Bot');

        if (!jogoAcabou) {
            turnoDoPlayer = true;
            atualizarInfoPanel(true);
        }
    }
}

function criarTabuleiroLogico() {
    return Array.from({ length: TAMANHO_TABULEIRO }, () =>
        Array.from({ length: TAMANHO_TABULEIRO }, () => ({ temNavio: false, atacado: false, navioInfo: null }))
    );
}

function renderizarTabuleiroVisual(boardElement, boardData, mostrarNavios) {
    boardElement.innerHTML = '';
    for (let y = 0; y < TAMANHO_TABULEIRO; y++) {
        for (let x = 0; x < TAMANHO_TABULEIRO; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (mostrarNavios && boardData[y][x].temNavio) {
                cell.classList.add(`ship-${boardData[y][x].navioInfo.nome}`);
            }
            boardElement.appendChild(cell);
        }
    }
}

function posicionarNaviosAleatoriamente(board, playerType) {
    NAVIOS_CONFIG.forEach(tipoNavio => {
        for (let i = 0; i < tipoNavio.quantidade; i++) {
            let posicionado = false;
            while (!posicionado) {
                const direcao = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                const x = Math.floor(Math.random() * TAMANHO_TABULEIRO);
                const y = Math.floor(Math.random() * TAMANHO_TABULEIRO);
                
                if (podePosicionar(board, x, y, tipoNavio.tamanho, direcao)) {
                    const navioId = `${playerType}-${tipoNavio.nome}-${i}`;
                    const navioInfo = { id: navioId, nome: tipoNavio.nome, tamanho: tipoNavio.tamanho, acertos: 0 };
                    for (let j = 0; j < tipoNavio.tamanho; j++) {
                        if (direcao === 'horizontal') {
                            board[y][x + j] = { temNavio: true, atacado: false, navioInfo };
                        } else {
                            board[y + j][x] = { temNavio: true, atacado: false, navioInfo };
                        }
                    }
                    posicionado = true;
                }
            }
        }
    });
}

function podePosicionar(board, x, y, tamanho, direcao) {
    for (let i = 0; i < tamanho; i++) {
        let currentX = x, currentY = y;
        if (direcao === 'horizontal') { currentX += i; } else { currentY += i; }
        if (currentX >= TAMANHO_TABULEIRO || currentY >= TAMANHO_TABULEIRO || board[currentY][currentX].temNavio) {
            return false;
        }
    }
    return true;
}

function atacar(board, x, y) {
    const celula = board[y][x];
    celula.atacado = true;
    
    if (celula.temNavio) {
        celula.navioInfo.acertos++;
        if (celula.navioInfo.acertos === celula.navioInfo.tamanho) {
            return 'afundado';
        }
        return 'acerto';
    }
    return 'erro';
}

function marcarComoAfundado(board, navioInfo, boardElement) {
    for (let y = 0; y < TAMANHO_TABULEIRO; y++) {
        for (let x = 0; x < TAMANHO_TABULEIRO; x++) {
            const celula = board[y][x];
            if (celula.navioInfo && celula.navioInfo.id === navioInfo.id) {
                const cellElement = boardElement.querySelector(`[data-x='${x}'][data-y='${y}']`);
                if (cellElement) {
                   cellElement.classList.remove('hit');
                   cellElement.classList.add('sunk');
                }
            }
        }
    }
    const counterIcon = document.getElementById(navioInfo.id);
    if (counterIcon) {
        counterIcon.classList.add('sunk');
    }
    atualizarInfoPanel(turnoDoPlayer, "Navio afundado!");
}

function atualizarCelulaVisual(cellElement, resultado) {
    if (resultado === 'acerto') {
        cellElement.classList.add('hit');
    } else {
        cellElement.classList.add('miss');
    }
}

function verificarFimDeJogo(board, atacante) {
    const todosNaviosAfundados = board.flat().filter(c => c.temNavio).every(c => c.navioInfo.acertos === c.navioInfo.tamanho);
    if (todosNaviosAfundados) {
        jogoAcabou = true;
        document.getElementById('info-titulo').textContent = "Fim de Jogo!";
        document.getElementById('info-mensagem').textContent = `${atacante} venceu!`;
    }
}

function renderizarContadores(playerType) {
    const container = document.getElementById(`${playerType}-ship-counters`);
    container.innerHTML = '';

    NAVIOS_CONFIG.forEach(tipoNavio => {
        const item = document.createElement('div');
        item.classList.add('ship-counter-item');

        const iconsContainer = document.createElement('div');
        iconsContainer.classList.add('counter-ship-icons');

        for (let i = 0; i < tipoNavio.quantidade; i++) {
            const icon = document.createElement('div');
            icon.classList.add('counter-ship-icon', `ship-${tipoNavio.nome}`);
            icon.id = `${playerType}-${tipoNavio.nome}-${i}`;
            iconsContainer.appendChild(icon);
        }
        
        item.appendChild(iconsContainer);
        container.appendChild(item);
    });
}

function atualizarInfoPanel(isPlayerTurn, mensagemExtra = "") {
    if (jogoAcabou) return;
    const titulo = document.getElementById('info-titulo');
    const mensagem = document.getElementById('info-mensagem');

    if (isPlayerTurn) {
        titulo.textContent = "Seu Turno";
        mensagem.textContent = mensagemExtra || "Clique no tabuleiro do oponente para atacar.";
    } else {
        titulo.textContent = "Turno do Oponente";
        mensagem.textContent = mensagemExtra || "Aguarde o ataque do bot...";
    }
}

function criarLogicaBot() {
    let alvosPossiveis = [];
    for(let y=0; y < TAMANHO_TABULEIRO; y++) {
        for(let x=0; x < TAMANHO_TABULEIRO; x++) { alvosPossiveis.push({x, y}); }
    }
    
    let modoCaca = 'aleatorio';
    let primeiroAcerto = null, ultimoAcerto = null;

    function escolherAlvo() {
        if (modoCaca === 'procurar') {
            const vizinhos = obterVizinhosValidos(ultimoAcerto);
            if (vizinhos.length > 0) {
                const alvo = vizinhos[0];
                removerAlvoPossivel(alvo.x, alvo.y);
                return alvo;
            } else {
                modoCaca = 'aleatorio';
                ultimoAcerto = primeiroAcerto;
            }
        }
        
        const index = Math.floor(Math.random() * alvosPossiveis.length);
        const alvo = alvosPossiveis[index];
        if(alvo) alvosPossiveis.splice(index, 1);
        return alvo || {x:0, y:0};
    }

    function removerAlvoPossivel(x, y) {
        alvosPossiveis = alvosPossiveis.filter(p => p.x !== x || p.y !== y);
    }
    
    function registrarResultado(x, y, resultado) {
        removerAlvoPossivel(x, y);
        if (resultado === 'acerto') {
            modoCaca = 'procurar';
            ultimoAcerto = {x, y};
            if(!primeiroAcerto) primeiroAcerto = {x, y};
        } else if (resultado === 'afundado') {
            modoCaca = 'aleatorio';
            primeiroAcerto = null;
            ultimoAcerto = null;
        } else if (resultado === 'erro' && modoCaca === 'procurar') {
            ultimoAcerto = primeiroAcerto; 
        }
    }
    
    function obterVizinhosValidos({x, y}) {
        const vizinhos = [];
        if(y > 0) vizinhos.push({x, y: y - 1});
        if(x < TAMANHO_TABULEIRO - 1) vizinhos.push({x: x + 1, y});
        if(y < TAMANHO_TABULEIRO - 1) vizinhos.push({x, y: y + 1});
        if(x > 0) vizinhos.push({x: x - 1, y});
        return vizinhos.filter(v => alvosPossiveis.some(p => p.x === v.x && p.y === v.y));
    }

    return { escolherAlvo, registrarResultado };
}

function mostrarTelaDeEspera() {
    const waitingScreen = document.getElementById('waiting-screen');
    const timerElement = document.getElementById('timer');
    const cancelButton = document.getElementById('cancel-matchmaking');
    waitingScreen.style.display = 'flex';
    let segundos = 0;
    const intervalId = setInterval(() => {
        segundos++;
        timerElement.textContent = segundos;
    }, 1000);
    cancelButton.addEventListener('click', () => {
        clearInterval(intervalId);
        window.location.href = 'index.html';
    });
}