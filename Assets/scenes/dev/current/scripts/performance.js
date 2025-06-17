const gameVars = {
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 7, // velocidade padrão player
    activities: [],
    currentMinute: 0
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
        30: adaptBotVelocity,
        60: endGame
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
    const congratsScreen = document.body.querySelector("#celebrationOverlay");
    congratsScreen.classList.add("active");

    stopDetection();
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