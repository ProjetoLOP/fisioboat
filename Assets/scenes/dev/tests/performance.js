const gameVars = {
    startTime: "",
    startZPosition: 0,
    userMaxSpeed: 0,
    activities: []
}

window.addEventListener('firstSquat', () => {
    const botBoat = document.querySelector('#botBoat');

    gameVars.startTime = new Date().toISOString();

    setTimeout(() => {
        // const botBoatPosition = botBoat.getAttribute('position')?.z;
        // const metersBot = convertZToMeters(botBoatPosition, gameVars.startZPosition);
        //    console.log(metersBot)

        // console.log(gameVars.activities)

        const performanceAnalyzed = analyzePerformance(gameVars.activities);
        const performanceCalculated = calculatePerformance(performanceAnalyzed.bestSequence);

        const userMaxSpeed = performanceCalculated.velocidadeMedia;
        gameVars.userMaxSpeed = userMaxSpeed;

        const userMaxSpeedInZ = convertMetersToZ(userMaxSpeed);

        console.log("velocidade do bot setada: ", userMaxSpeedInZ);
        botBoat.setAttribute('bot-boat', { maxSpeed: userMaxSpeedInZ });

        console.log(performanceAnalyzed)
        console.log(performanceCalculated)

    }, 20000)
})


// // Ativar timer
// const intervalId = setInterval(updateTimer, 1000);
// animateTimer();

// setTimeout(() => {
//     //Para o vídeo
//     const video = document.getElementById("video");
//     video.pause();

//     // Para o setInterval
//     clearInterval(intervalId);

//     // Chamando a função
//     const result = analyzePerformance(gameVars.activities);
//     const performanceCalculated = calculatePerformance(result.bestSequence);

//     // Exibindo o resultado
//     console.log("Maior número de movimentos:", result.maxMovements);
//     console.log("Maior distância coberta:", result.maxDistance);
//     console.log("Melhor sequência de movimentos:", result.bestSequence);

//     const statsBoard = createPerformanceStats(performanceCalculated);

//     const activitiesTable = createMovementTable(result.bestSequence);

//     const gameInstruction = document.querySelector("#gameInstruction");
//     gameInstruction.style.display = "flex";
//     void gameInstruction.offsetWidth; //Renderiza o elemento com um display diferente de none, para não pular animação
//     gameInstruction.classList.remove("hide");

//     gameInstruction.replaceChildren();
//     gameInstruction.appendChild(activitiesTable);
//     gameInstruction.appendChild(statsBoard);
// }, 30000)
// });

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
    gameVars.activities.push(squatDetails);
});