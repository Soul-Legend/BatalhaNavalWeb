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
        
        let navioAfundado = null;
        if (resultado === 'afundado') {
            navioAfundado = celulaLogica.navioInfo;
            marcarComoAfundado(playerBoard, navioAfundado, playerBoardElement);
        } else {
            const cellElement = playerBoardElement.querySelector(`[data-x='${x}'][data-y='${y}']`);
            atualizarCelulaVisual(cellElement, resultado);
        }

        bot.registrarResultado(x, y, resultado, navioAfundado ? obterCoordenadasDoNavio(playerBoard, navioAfundado.id) : []);
        
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
    
    NAVIOS_CONFIG.forEach(config => {
        for(let i = 0; i < config.quantidade; i++){
            const navioId = `${navioInfo.id.split('-')[0]}-${config.nome}-${i}`;
            if(navioInfo.id === navioId){
                const counterIcon = document.querySelector(`#${navioInfo.id.split('-')[0]}-ship-counters #${navioId}`);
                if (counterIcon && !counterIcon.classList.contains('sunk')) {
                    counterIcon.classList.add('sunk');
                    return; 
                }
            }
        }
    });

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

        const label = document.createElement('span');
        label.textContent = `${tipoNavio.nome.charAt(0).toUpperCase() + tipoNavio.nome.slice(1)}: `;
        //item.appendChild(label);

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

function obterCoordenadasDoNavio(board, navioId) {
    const coordenadas = [];
    for (let y = 0; y < TAMANHO_TABULEIRO; y++) {
        for (let x = 0; x < TAMANHO_TABULEIRO; x++) {
            if (board[y][x].navioInfo && board[y][x].navioInfo.id === navioId) {
                coordenadas.push({ x, y });
            }
        }
    }
    return coordenadas;
}

function criarLogicaBot() {
    let alvosDisponiveis = [];
    for (let y = 0; y < TAMANHO_TABULEIRO; y++) {
        for (let x = 0; x < TAMANHO_TABULEIRO; x++) {
            alvosDisponiveis.push({ x, y });
        }
    }

    let acertosAtuais = []; // Fila de acertos que precisam ser investigados
    let alvosPrioritarios = []; // Alvos adjacentes a um acerto

    const removerAlvoDisponivel = (x, y) => {
        alvosDisponiveis = alvosDisponiveis.filter(p => p.x !== x || p.y !== y);
    };

    const alvoJaAtacado = (x, y) => {
        return !alvosDisponiveis.some(p => p.x === x && p.y === y);
    };

    function escolherAlvo() {
        // 1. Se houver alvos prioritários (adjacentes a um acerto), ataque-os primeiro
        if (alvosPrioritarios.length > 0) {
            const alvo = alvosPrioritarios.pop();
            removerAlvoDisponivel(alvo.x, alvo.y);
            return alvo;
        }

        // 2. Se não, mas houver acertos não resolvidos, crie alvos prioritários a partir deles
        if (acertosAtuais.length > 0) {
            gerarAlvosPrioritarios();
            // Tenta novamente, agora com alvos prioritários
            if (alvosPrioritarios.length > 0) {
                const alvo = alvosPrioritarios.pop();
                removerAlvoDisponivel(alvo.x, alvo.y);
                return alvo;
            }
        }

        // 3. Se não houver acertos, ataque aleatoriamente (Modo Caça)
        const index = Math.floor(Math.random() * alvosDisponiveis.length);
        const alvo = alvosDisponiveis[index];
        if(alvo) {
            alvosDisponiveis.splice(index, 1);
            return alvo;
        }
        return {x:0, y:0}; // Fallback
    }

    function registrarResultado(x, y, resultado, coordenadasNavioAfundado) {
        if (resultado === 'acerto') {
            acertosAtuais.push({ x, y });
            // Se agora temos dois acertos, podemos inferir a direção
            if (acertosAtuais.length >= 2) {
                const primeiro = acertosAtuais[0];
                const ultimo = acertosAtuais[acertosAtuais.length - 1];
                let direcao;
                if(primeiro.x === ultimo.x) direcao = 'vertical';
                if(primeiro.y === ultimo.y) direcao = 'horizontal';

                // Limpa os alvos antigos e foca na linha do navio
                alvosPrioritarios = []; 
                if(direcao){
                    acertosAtuais.forEach(acerto => {
                        if (direcao === 'horizontal') {
                            adicionarAlvoPrioritario(acerto.x + 1, acerto.y);
                            adicionarAlvoPrioritario(acerto.x - 1, acerto.y);
                        } else { // vertical
                            adicionarAlvoPrioritario(acerto.x, acerto.y + 1);
                            adicionarAlvoPrioritario(acerto.x, acerto.y - 1);
                        }
                    });
                }
            } else {
                 // Primeiro acerto, adicione todos os vizinhos
                gerarAlvosPrioritarios();
            }
        } else if (resultado === 'afundado') {
             // Remove todas as células do navio afundado da lista de acertos
            acertosAtuais = acertosAtuais.filter(acerto => 
                !coordenadasNavioAfundado.some(coord => coord.x === acerto.x && coord.y === acerto.y)
            );
            // Remove o acerto atual também
            acertosAtuais = acertosAtuais.filter(acerto => acerto.x !== x || acerto.y !== y);

            alvosPrioritarios = []; // Limpa os alvos prioritários
        }
        // Se for 'erro', a lógica de 'escolherAlvo' naturalmente tentará outro alvo prioritário ou voltará para a caça.
    }
    
    function adicionarAlvoPrioritario(x, y) {
        if (x >= 0 && x < TAMANHO_TABULEIRO && y >= 0 && y < TAMANHO_TABULEIRO &&
            !alvoJaAtacado(x, y) && !alvosPrioritarios.some(p => p.x === x && p.y === y)) {
            alvosPrioritarios.push({ x, y });
        }
    }

    function gerarAlvosPrioritarios() {
        if (acertosAtuais.length > 0) {
            // Foca no último acerto para tentar seguir uma linha
            const ultimoAcerto = acertosAtuais[acertosAtuais.length - 1];
            adicionarAlvoPrioritario(ultimoAcerto.x + 1, ultimoAcerto.y);
            adicionarAlvoPrioritario(ultimoAcerto.x - 1, ultimoAcerto.y);
            adicionarAlvoPrioritario(ultimoAcerto.x, ultimoAcerto.y + 1);
            adicionarAlvoPrioritario(ultimoAcerto.x, ultimoAcerto.y - 1);
        }
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
