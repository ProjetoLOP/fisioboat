const isDeveloping = true;
const gameVars = {
    startTime: "",
    startZPosition: 0,
    activities: []
}

if (isDeveloping) {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    gameInstruction.style.display = "none";

    moveNetDetector.run().then(() => {
        playOceanAmbienceSound();
    });
} else {
    showGameInstruction("Reme o mais rápido que puder nos próximos 30 segundos");
}

function hideGameInstruction() {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    gameInstruction.classList.add("hide");

    gameInstruction.addEventListener("transitionend", () => gameInstruction.style.display = "none", { once: true });
}

function showGameInstruction(message) {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    const textElement = document.body.querySelector("#text");

    // Remove the "hide" class to make the instruction visible
    gameInstruction.classList.remove("hide");

    // Clear any previous text
    textElement.innerHTML = "";

    // Use TypeIt to animate the text
    new TypeIt("#text", {
        strings: message,
        speed: 75,
        waitUntilVisible: true,
        afterComplete: () => {
            moveNetDetector.run().then(() => {
                hideGameInstruction();
                playOceanAmbienceSound();
            });
        }
    }).go();
}

function playOceanAmbienceSound() {
    const oceanAmbienceSound = new Audio("/Assets/scenario/soundEffects/oceanAmbience.mp3");
    oceanAmbienceSound.loop = true;
    oceanAmbienceSound.play();
}

function playRowingSound() {
    const rowingSoundSrcs = ["/Assets/scenario/soundEffects/som-da-remada_1.mp3", "/Assets/scenario/soundEffects/som-da-remada_2.mp3", "/Assets/scenario/soundEffects/som-da-remada_3.mp3"];

    // Selecionar um dos sons
    const randomSrc = rowingSoundSrcs[Math.floor(Math.random() * rowingSoundSrcs.length)];
    const soundEffect = new Audio(randomSrc);

    soundEffect.play();
}

function calculateTimeDifference(timestamp1, timestamp2) {
    // Garantir que os timestamps sejam convertidos para números inteiros
    const time1 = new Date(timestamp1).getTime();
    const time2 = new Date(timestamp2).getTime();

    // Calcular a diferença em milissegundos
    const differenceInMilliseconds = Math.abs(time1 - time2);

    // Converter milissegundos em segundos
    const differenceInSeconds = differenceInMilliseconds / 1000;

    return differenceInSeconds;
}

function updateTimer() {
    const currentTime = new Date().toISOString();
    const totalSeconds = Math.floor(calculateTimeDifference(gameVars.startTime, currentTime));

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementsByClassName('time-unit')[0].textContent = hours.toString().padStart(2, '0');
    document.getElementsByClassName('time-unit')[1].textContent = minutes.toString().padStart(2, '0');
    document.getElementsByClassName('time-unit')[2].textContent = seconds.toString().padStart(2, '0');
}

function animateTimer() {
    const timerContainer = document.querySelector(".timer-container");
    const timerIcon = document.querySelector(".timer-icon");

    timerContainer.classList.add("glowAnimation");
    timerIcon.classList.add("rotateAnimation");
}

function createMovementTable(movements) {
    const table = document.createElement('table');
    table.className = 'stats-table';

    // Header
    const headerRow = table.insertRow();
    headerRow.className = 'header-row';
    const headerCell = headerRow.insertCell();
    headerCell.colSpan = 4;
    headerCell.textContent = 'Estatísticas de Movimento';

    // Column headers
    const columnRow = table.insertRow();
    ['ID', 'Instante', 'Qualidade', 'Distância'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        columnRow.appendChild(th);
    });

    // Data rows
    movements.forEach((movement, index) => {
        const row = table.insertRow();

        const idCell = row.insertCell();
        idCell.textContent = index;

        const instantCell = row.insertCell();
        instantCell.className = 'instant';
        instantCell.textContent = movement.instant.toFixed(3);

        const qualityCell = row.insertCell();
        qualityCell.className = 'quality';
        qualityCell.textContent = movement.quality;

        const distanceCell = row.insertCell();
        distanceCell.className = 'distance';
        distanceCell.textContent = movement.distance.toFixed(4);
    });

    return table;
}

function createPerformanceStats(data) {
    const {
        tempoInicial,
        tempoFinal,
        movimentos,
        frequenciaMedia,
        qualidadeMedia,
        distanciaPercorrida,
        velocidadeMedia
    } = data;

    const container = document.createElement('div');
    container.className = 'stats-container';

    container.innerHTML = `
        <div class="stats-highlight">
            A parte da corrida em que houve maior performance foi dos ${Math.round(Number(tempoInicial))}s aos ${Math.round(Number(tempoFinal))}s.
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Movimentos</div>
                <div class="stat-value">${movimentos}</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Frequência média</div>
                <div class="stat-value">1 rep. a cada ${frequenciaMedia}s</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Qualidade média</div>
                <div class="stat-value">${qualidadeMedia}</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Distância percorrida</div>
                <div class="stat-value">${distanciaPercorrida}m</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Velocidade média</div>
                <div class="stat-value">${velocidadeMedia} m/s</div>
            </div>
        </div>
    `;

    return container;
}

function calculatePerformance(data) {
    // Função auxiliar para calcular a média de um atributo
    const average = (values) => values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calcular estatísticas globais
    const tempoInicial = data[0].instant;
    const tempoFinal = data[data.length - 1].instant;
    const distanciaPercorrida = data[data.length - 1].distance - data[0].distance;
    const tempoGasto = tempoFinal - tempoInicial;
    const velocidadeMedia = distanciaPercorrida / tempoGasto;

    const movimentos = data.length;
    const qualidadeMedia = average(data.map(entry => entry.quality));

    // Calcular a frequência média como a média das diferenças de tempo entre os instantes
    const intervalos = data.slice(1).map((entry, index) => entry.instant - data[index].instant);
    const frequenciaMedia = average(intervalos);

    // Construir o resultado final
    const performance = {
        tempoInicial: tempoInicial,
        tempoFinal: tempoFinal,
        movimentos: movimentos,
        frequenciaMedia: parseFloat(frequenciaMedia.toFixed(2)),
        qualidadeMedia: parseFloat(qualidadeMedia.toFixed(2)),
        distanciaPercorrida: Math.round(distanciaPercorrida),
        velocidadeMedia: parseFloat(velocidadeMedia.toFixed(2))
    };

    return performance;
}

window.addEventListener('firstSquat', () => {
    gameVars.startTime = new Date().toISOString();


    // Ativar timer
    const intervalId = setInterval(updateTimer, 1000);
    animateTimer();

    setTimeout(() => {
        //Para o vídeo
        const video = document.getElementById("video");
        video.pause();

        // Para o setInterval
        clearInterval(intervalId);

        // Chamando a função
        const result = analyzePerformance(gameVars.activities);
        const performanceCalculated = calculatePerformance(result.bestSequence);

        // Exibindo o resultado
        console.log("Maior número de movimentos:", result.maxMovements);
        console.log("Maior distância coberta:", result.maxDistance);
        console.log("Melhor sequência de movimentos:", result.bestSequence);

        const statsBoard = createPerformanceStats(performanceCalculated);

        const activitiesTable = createMovementTable(result.bestSequence);

        const gameInstruction = document.querySelector("#gameInstruction");
        gameInstruction.style.display = "flex";
        void gameInstruction.offsetWidth; //Renderiza o elemento com um display diferente de none, para não pular animação
        gameInstruction.classList.remove("hide");

        gameInstruction.replaceChildren();
        gameInstruction.appendChild(activitiesTable);
        gameInstruction.appendChild(statsBoard);
    }, 30000)
});

// Dispara o movimento ao detectar o evento de agachamento
window.addEventListener('squatDetected', (event) => {
    const squatDetails = event.detail;
    console.log(new Date(squatDetails.instant).getSeconds())


    const userBoatPosition = document.querySelector("#boat").getAttribute('position');
    const zPosition = userBoatPosition.z;
    const distanceFromStart = convertZToMeters(zPosition, gameVars.startZPosition);

    const startTime = gameVars.startTime ? gameVars.startTime : new Date();
    const timeFromStart = calculateTimeDifference(startTime, squatDetails.instant);

    squatDetails.instant = timeFromStart;
    squatDetails.distance = distanceFromStart;

    gameVars.activities.push(squatDetails);
});


function analyzePerformance(data, window = 10) {
    /**
     * Analisa os dados de desempenho e retorna a sequência com maior performance.
     *
     * @param {Array} data - Lista de objetos contendo 'instant', 'quality' e 'distance'.
     * @param {number} window - Tamanho da janela em segundos para analisar os movimentos.
     * @returns {Object} - Objeto contendo os registros da sequência com maior performance.
     */
    let maxMovements = 0;
    let maxDistance = 0;
    let bestSequence = [];

    // Iterar sobre cada ponto como início da janela
    for (let i = 0; i < data.length; i++) {
        const startTime = data[i].instant;
        const endTime = startTime + window;

        // Selecionar os registros dentro da janela
        const sequence = data.filter(entry => entry.instant >= startTime && entry.instant <= endTime);

        // Calcular métricas da sequência
        const movements = sequence.length;
        const distanceCovered = movements > 1 ? sequence[sequence.length - 1].distance - sequence[0].distance : 0;

        // Atualizar a melhor sequência
        if (movements > maxMovements || (movements === maxMovements && distanceCovered > maxDistance)) {
            maxMovements = movements;
            maxDistance = distanceCovered;
            bestSequence = sequence;
        }
    }

    return {
        maxMovements,
        maxDistance,
        bestSequence
    };
}