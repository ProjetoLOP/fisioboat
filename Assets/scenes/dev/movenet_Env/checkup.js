// Função para acessar a câmera
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        const videoContainer = document.getElementById("video-container");
        const loadingDots = videoContainer.querySelector(".loading-dots");
        const videoElement = videoContainer.querySelector('#video');

        videoElement.srcObject = stream;
        videoElement.play();

        loadingDots.classList.remove("active");

        console.log('Câmera inicializada com sucesso');
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error);
        alert('Não foi possível acessar sua câmera. Por favor, verifique as permissões.');
    }
}

// Função para preparar vídeo
function setupVideo() {
    const videoEl = document.getElementById("video");

    videoEl.src = "/Assets/videos/stress3.mp4";
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.play();

    videoEl.addEventListener("playing", () => {
        const loadingDots = document.querySelector(".loading-dots");
        loadingDots.classList.remove("active");
    });
}

// Função para iniciar o jogo
function startGame() {
    const overlay = document.getElementById('checkupOverlay');
    const videoContainer = document.getElementById('video-container');
    overlay.classList.remove('active');
    videoContainer.classList.add('game-started');
    document.body.classList.add("game-started");
    console.log('Iniciando o jogo...');
}

// Event listeners
// document.addEventListener('keypress', function (event) {
//     if (event.key === 'Enter') {
//         detectPose(); // Função importada de movenet.min.js

//         const loadingDots = document.querySelector(".loading-dots");
//         loadingDots.classList.add("active");
//     }
// });

document.addEventListener('click', function (event) {
    detectPose(); // Função importada de movenet.min.js

    const loadingDots = document.querySelector(".loading-dots");
    loadingDots.classList.add("active");
}, { once: true });

window.addEventListener("detector:ready", () => {
    // setupCamera();
    setupVideo();
});

window.addEventListener("pose:ready", () => {
    startGame();
});

window.addEventListener("squatDetected", (event) => {
    const { depth, duration } = event.detail;

    const repsEl = document.body.querySelector("#reps .stat-value");
    const durationEl = document.body.querySelector("#duration .stat-value");
    const depthEl = document.body.querySelector("#depth .stat-value");

    const currentReps = Number(repsEl.textContent);
    repsEl.textContent = currentReps + 1;
    durationEl.textContent = `${(duration / 1000).toFixed(2)}s`;
    depthEl.textContent = depth.toFixed(2);
});

window.addEventListener("completed", () => {
    const imgCompleteState = document.body.querySelector("#complete");
    const imgPerformingState = document.body.querySelector("#performing");

    imgPerformingState.classList.remove("active");
    imgCompleteState.classList.add("active");
});

let firstSquat = false;

window.addEventListener("performing", () => {
    if (!firstSquat) {
        firstSquat = true;

        let seconds = 0;
        let minutes = 0;

        const timerInterval = setInterval(() => {
            seconds++;
            if (seconds >= 60) {
                minutes++;
                seconds = 0;
            }

            document.querySelector('.timer-minutes').textContent = minutes.toString().padStart(2, '0');
            document.querySelector('.timer-seconds').textContent = seconds.toString().padStart(2, '0');
        }, 1000);
    }

    const imgCompleteState = document.body.querySelector("#complete");
    const imgPerformingState = document.body.querySelector("#performing");

    imgCompleteState.classList.remove("active");
    imgPerformingState.classList.add("active");
});

// Inicializa o detector de pose ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    prepareDetector(); // Função importada de movenet.min.js
});