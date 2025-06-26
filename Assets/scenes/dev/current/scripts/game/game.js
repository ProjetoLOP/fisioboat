const gameVars = {
    sessionDuration: 450,
    adaptDuration: 30,
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 7, // velocidade padrão player
    activities: []
}

let firstSquat = false;

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
    const timeTriggers = {
        [gameVars.adaptDuration]: adaptBotVelocity,
        [gameVars.sessionDuration]: endGame
    };

    const triggered = new Set();

    setInterval(() => {
        const diffSeconds = calculateTimeDifference(gameVars.startTime, new Date().toISOString());

        for (const timeStr of Object.keys(timeTriggers)) {
            const targetTime = Number(timeStr);

            if (diffSeconds >= targetTime && !triggered.has(targetTime)) {
                triggered.add(targetTime);
                timeTriggers[targetTime]();
            }
        }

    }, 1000);
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

    const sessionStats = {
        sessionDuration: gameVars.sessionDuration,
        reps: gameVars.activities.length,
        repsByMinute: Math.round((gameVars.activities.length / (gameVars.sessionDuration / 60)) * 100) / 100,
        distance: Math.round(distanceFromStart * 100) / 100
    }

    return sessionStats;
}

function saveSession(sessionStats) {
    // 1. Pega o objeto "sessions" atual do localStorage (ou cria um vazio)
    const sessions = JSON.parse(localStorage.getItem("sessions")) || {};

    // 2. Gera um novo ID automático
    // Pega os IDs existentes, transforma em números, encontra o maior e soma 1
    const newId = Object.keys(sessions).length > 0
        ? Math.max(...Object.keys(sessions).map(id => Number(id))) + 1
        : 1;

    // 3. Cria a nova sessão
    const session = {
        occurredAt: new Date().toISOString(),
        stats: sessionStats,
        activities: gameVars.activities
    };

    // 4. Adiciona ao objeto sessions
    sessions[newId] = session;

    // 5. Salva de volta no localStorage
    localStorage.setItem("sessions", JSON.stringify(sessions));
}
