const gameVars = {
    sessionType: "resistance",
    figuresByMinute: 3,
    figuresDuration: 4,
    sessionDuration: 60,
    adaptDuration: 30,
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 7, // velocidade padrão player
    activities: [],
    timeTriggers: {}
}

let firstSquat = false;

document.addEventListener("DOMContentLoaded", setupConfigVars);

// Inicia o jogo ao detectar o primeiro agachamento

window.addEventListener("performing", () => {
    if (!firstSquat) {
        firstSquat = true;
        startGame();
    }
});

// Dispara o movimento ao detectar o evento de agachamento
window.addEventListener('completed', (event) => {
    const squatData = event.detail;

    // Obtém posição atual do player
    const userBoatPosition = document.querySelector("#boat").getAttribute('position');
    const zPosition = userBoatPosition.z;
    const distanceFromStart = convertZToMeters(zPosition, gameVars.startZPosition);

    squatData.distance = distanceFromStart;

    // Formata dados antes de armazenar
    const squatDataFormatted = formatSquatData(squatData);

    // Armazena dados
    gameVars.activities.push(squatDataFormatted);
});

function startGame() {
    const playerBoat = document.querySelector("#boat");

    gameVars.startZPosition = playerBoat.getAttribute('position').z;
    gameVars.startTime = new Date().toISOString();

    // Mapeia segundos → função a executar
    gameVars.timeTriggers[gameVars.adaptDuration] = adaptBotVelocity;
    gameVars.timeTriggers[gameVars.sessionDuration] = endGame;

    setFigureTriggers();

    const triggered = new Set();

    setInterval(() => {
        const diffSeconds = calculateTimeDifference(gameVars.startTime, new Date().toISOString());

        for (const timeStr of Object.keys(gameVars.timeTriggers)) {
            const targetTime = Number(timeStr);

            if (diffSeconds >= targetTime && !triggered.has(targetTime)) {
                triggered.add(targetTime);
                gameVars.timeTriggers[targetTime]();
            }
        }

    }, 1000);
}

function setFigureTriggers() {
    const minutes = Math.floor(gameVars.sessionDuration / 60);
    const count = gameVars.figuresByMinute;
    const minSpacing = 7;

    // 1. gerar todos os slots possíveis dentro do minuto
    const possibleSlots = [];
    for (let t = 0; t < 60; t += minSpacing) {
        possibleSlots.push(t);
    }

    // 2. gerar todas as combinações possíveis
    function combinations(arr, k) {
        const result = [];

        function backtrack(start, combo) {
            if (combo.length === k) {
                result.push([...combo]);
                return;
            }

            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                backtrack(i + 1, combo);
                combo.pop();
            }
        }

        backtrack(0, []);
        return result;
    }

    const allCombos = combinations(possibleSlots, count);

    for (let m = 0; m < minutes; m++) {
        // 3. sorteia *uma sequência válida inteira*
        const chosen = allCombos[Math.floor(Math.random() * allCombos.length)];

        chosen.sort((a, b) => a - b);

        // 4. converter para segundos absolutos
        const absoluteSeconds = chosen.map(sec => m * 60 + sec);

        // 5. registrar triggers
        absoluteSeconds.forEach(triggerTime => {
            gameVars.timeTriggers[triggerTime] = showFigure;
        });

        console.log(`Minuto ${m + 1}: [${absoluteSeconds.join(", ")}]`);
    }
}

function showFigure() {
    const figure = document.querySelector("#aperta");
    figure.classList.add("active");
    setTimeout(() => {
        figure.classList.remove("active");
    }, gameVars.figuresDuration * 1000);
}

function endGame() {
    stopDetection();

    const congratsScreen = document.body.querySelector("#celebrationOverlay");
    congratsScreen.classList.add("active");
}

function adaptBotVelocity() {
    // console.log(gameVars.activities)
    const botBoat = document.querySelector('#botBoat');

    // * Desativa componente
    const handleBoatsDistance = document.body.querySelector("#evasive-speed-controller");
    handleBoatsDistance.removeAttribute('evasive-speed-controller');

    // * Analisa resultados e obtém velocidade média do usuário
    const performanceAnalyzed = analyzePerformance(gameVars.activities);
    const performanceCalculated = calculatePerformance(performanceAnalyzed.bestSequence);
    // console.log(performanceAnalyzed)
    // console.log(performanceCalculated)

    const userMaxSpeed = performanceCalculated.velocidadeMedia;
    const userMaxSpeedInZ = convertMetersToZ(userMaxSpeed);
    gameVars.userMaxSpeed = userMaxSpeedInZ;

    // * Seta velocidade do bot
    console.log("velocidade do bot setada: ", gameVars.userMaxSpeed);
    botBoat.setAttribute('bot-boat', { maxSpeed: gameVars.userMaxSpeed });

    // * Para o bot para o usuário alcançar
    botBoat.components['bot-boat'].isRacing = false;
    botBoat.components['bot-boat'].isRopeBroken = true;
}

function formatSquatData(squatData) {
    const { depth, duration, instant, distance } = squatData;
    const squatDataFormatted = {};

    const startTime = gameVars.startTime;
    const timeFromStart = calculateTimeDifference(startTime, instant);

    // Formata instant
    squatDataFormatted.instant = Math.round(timeFromStart * 100) / 100;

    // Formata duration
    squatDataFormatted.duration = Math.round((duration / 1000) * 100) / 100;

    // Arredonda depth
    squatDataFormatted.depth = Math.round(depth * 100) / 100;

    // Arredonda distance
    squatDataFormatted.distance = Math.round(distance * 100) / 100;

    return squatDataFormatted;
}

function getSessionStats() {
    const playerBoatPosition = document.querySelector("#boat").getAttribute('position');
    const zPosition = playerBoatPosition.z;
    const distanceFromStart = convertZToMeters(zPosition, gameVars.startZPosition);

    // Calcular profundidade média das repetições
    let avgDepth = 0;
    if (gameVars.activities && gameVars.activities.length > 0) {
        const totalDepth = gameVars.activities.reduce((sum, activity) => {
            return sum + (activity.depth || 0);
        }, 0);
        
        avgDepth = totalDepth / gameVars.activities.length;
    }

    const sessionStats = {
        sessionDuration: gameVars.sessionDuration,
        reps: gameVars.activities.length,
        repsByMinute: Math.round((gameVars.activities.length / (gameVars.sessionDuration / 60)) * 100) / 100,
        distance: Math.round(distanceFromStart * 100) / 100,
        avgDepth: Math.round(avgDepth * 100) / 100 // Arredonda para 2 casas decimais
    }

    console.log('Estatísticas da sessão:', sessionStats);

    return sessionStats;
}

function saveSession(userId, sessionStats) {
    try {
        // Busca usuário existente
        const users = JSON.parse(localStorage.getItem("users")) || [];
        
        // Validar que users é um array
        if (!Array.isArray(users)) {
            console.error('Dados de usuários corrompidos');
            return;
        }
        
        // Encontrar o ÍNDICE do usuário no array
        const userIndex = users.findIndex(u => u && u.id === userId);
        
        if (userIndex === -1) {
            console.error(`User with ID ${userId} not found.`);
            return;
        }
        
        // Pega o usuário pelo índice
        const user = users[userIndex];
        
        // 1. Garante que sessions é um OBJETO (não array)
        if (!user.sessions || typeof user.sessions !== 'object') {
            user.sessions = {};
        }
        
        // Se sessions for um array por engano, converter para objeto
        if (Array.isArray(user.sessions)) {
            const tempSessions = {};
            user.sessions.forEach((session, index) => {
                if (session) {
                    tempSessions[index + 1] = session;
                }
            });
            user.sessions = tempSessions;
        }
        
        // 2. Gera um novo ID automático de forma segura
        const existingIds = Object.keys(user.sessions)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
        
        const newId = existingIds.length > 0 
            ? Math.max(...existingIds) + 1 
            : 1;
        
        // 3. Cria a nova sessão com validação
        const session = {
            occurredAt: new Date().toISOString(),
            stats: sessionStats || {},
            activities: (typeof gameVars !== 'undefined' && gameVars.activities) 
                ? [...gameVars.activities] // Cria cópia para evitar referência
                : []
        };
        
        // 4. Adiciona ao objeto sessions (não ao array users!)
        user.sessions[newId] = session;
        
        // 5. Atualiza o usuário NO ÍNDICE CORRETO do array
        users[userIndex] = user;
        
        // 6. Salva de volta no localStorage
        localStorage.setItem("users", JSON.stringify(users));
        
        console.log(`Sessão ${newId} salva com sucesso para usuário ${userId}`);
        
    } catch (error) {
        console.error('Erro ao salvar sessão:', error);
        alert('Erro ao salvar a sessão. Verifique o console.');
    }
}

function setupConfigVars() {
    const sessionConfig = getUrlParameter('sessionConfig');
    const configParsed = JSON.parse(sessionConfig);

    console.log(configParsed)

    const { sessionType, figuresByMinute, figuresDuration, sessionDuration } = configParsed;

    if (sessionType) {
        gameVars.sessionType = sessionType;
    }

    if (figuresByMinute) {
        gameVars.figuresByMinute = Number(figuresByMinute);
    }

    if (figuresDuration) {
        gameVars.figuresDuration = Number(figuresDuration);
    }

    if (sessionDuration) {
        gameVars.sessionDuration = Number(sessionDuration) * 60;
    }
}

// Função para obter parâmetro da URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}