const gameVars = {
    sessionDuration: 60,
    adaptDuration: 30,
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 7, // velocidade padrão player
    activities: [],
    currentTime: 0,
    timeTriggers: {}
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
    
    // Armazena dados iniciais
    gameVars.startZPosition = playerBoat.getAttribute('position').z;
    gameVars.startTime = new Date().toISOString();
    
    // Mapeia segundos → função a executar
    gameVars.timeTriggers[gameVars.adaptDuration] = adaptBotVelocity;
    gameVars.timeTriggers[gameVars.sessionDuration] = endGame;
    setFigureTriggers();

    const triggered = new Set();

    setInterval(() => {
        const diffSeconds = calculateTimeDifference(gameVars.startTime, new Date().toISOString());
        gameVars.currentTime = diffSeconds;

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

  for (let m = 0; m < minutes; m++) {
    const chosen = [];

    while (chosen.length < 3) {
      const rand = Math.floor(Math.random() * 60);

      // garante unicidade + diferença mínima de 7
      if (
        !chosen.includes(rand) &&
        chosen.every(x => Math.abs(x - rand) >= 7)
      ) {
        chosen.push(rand);
      }
    }

    // ordenar para facilitar leitura
    chosen.sort((a, b) => a - b);

    // converter para segundos absolutos na sessão
    const absoluteSeconds = chosen.map(sec => m * 60 + sec);

    // adicionar ao timeTriggers
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
    }, 4000)
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
    const userId = new URLSearchParams(window.location.search).get('id');
    if (!userId) {
        console.error("User ID not found in URL parameters.");
        return;
    }
    // Busca usuário no localStorage 
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error("User not found in localStorage.");
        return;
    }

    // Cria a nova sessão
    const session = {
        occurredAt: new Date().toISOString(),
        stats: sessionStats,
        activities: gameVars.activities
    };

    // Adiciona ao objeto sessions
    user.sessions.push(session);

    // atualiza users
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex] = user;

    // 5. Salva de volta no localStorage
    localStorage.setItem("users", JSON.stringify(users));
}
