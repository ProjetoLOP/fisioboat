const gameVars = {
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 7, // velocidade padrão player
    activitiesByMinute: {},
    currentMinute: 0
}

let firstSquat = false;

window.addEventListener("performing", () => {
    if (!firstSquat) {
        x();
        firstSquat = true;
    }
});

function x() {
    const botBoat = document.querySelector('#botBoat');

    gameVars.startTime = new Date().toISOString();

    setInterval(() => {
        // retorna diferença em segundos
        const diffSeconds = calculateTimeDifference(gameVars.startTime, new Date().toISOString());

        // converte para minutos inteiros
        const diffMinutes = Math.floor(diffSeconds / 60);

        // seta no gameVars
        gameVars.currentMinute = diffMinutes;
    }, 1000);

    setTimeout(() => {
        console.log(gameVars.activitiesByMinute)

        // * Desativa componente
        const handleBoatsDistance = document.body.querySelector("#evasive-speed-controller");
        handleBoatsDistance.removeAttribute('evasive-speed-controller');

        // * Analisa resultados e obtém velocidade média do usuário
        const performanceAnalyzed = analyzePerformance(gameVars.activitiesByMinute[0]);
        const performanceCalculated = calculatePerformance(performanceAnalyzed.bestSequence);
        console.log(performanceAnalyzed)
        console.log(performanceCalculated)

        const userMaxSpeed = performanceCalculated.velocidadeMedia;
        const userMaxSpeedInZ = convertMetersToZ(userMaxSpeed);
        gameVars.userMaxSpeed = userMaxSpeedInZ;

        // * Seta velocidade do bot
        console.log("velocidade do bot setada: ", gameVars.userMaxSpeed);
        botBoat.setAttribute('bot-boat', { maxSpeed: gameVars.userMaxSpeed });

        // * Para o bot para o usuário alcançar
        botBoat.components['bot-boat'].isRacing = false;
        botBoat.components['bot-boat'].isRopeBroken = true;

        for (minute in gameVars.activitiesByMinute) {
            const activities = gameVars.activitiesByMinute[minute];

            console.log("Minuto: ", minute);
            // const performanceAnalyzed = analyzePerformance(activities);
            const performanceCalculated = calculatePerformance(activities);
            // console.log(performanceAnalyzed)
            console.log(performanceCalculated)
        }
    }, 30000)
}

// Dispara o movimento ao detectar o evento de agachamento
window.addEventListener('squatDetected', (event) => {
    const squatDetails = event.detail;

    const userBoatPosition = document.querySelector("#boat").getAttribute('position');
    const zPosition = userBoatPosition.z;
    const distanceFromStart = convertZToMeters(zPosition, gameVars.startZPosition);

    const startTime = gameVars.startTime ? gameVars.startTime : new Date();
    const timeFromStart = calculateTimeDifference(startTime, squatDetails.instant);

    // Adicionando informações ao squat
    squatDetails.instant = timeFromStart;
    squatDetails.distance = distanceFromStart;

    // Armazenando squat

    // verifica se o minuto já existe e incializa o array
    if (!gameVars.activitiesByMinute[gameVars.currentMinute]) {
        gameVars.activitiesByMinute[gameVars.currentMinute] = [];
    }

    gameVars.activitiesByMinute[gameVars.currentMinute].push(squatDetails);
});