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

    videoEl.src = "/Assets/videos/stress9.mp4";
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
    console.log('Iniciando o jogo...');
}

// Event listeners
document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        detectPose(); // Função importada de movenet.min.js

        const loadingDots = document.querySelector(".loading-dots");
        loadingDots.classList.add("active");
    }
});

window.addEventListener("detector:ready", () => {
    // setupCamera();
     setupVideo();
});

window.addEventListener("pose:ready", () => {
    setTimeout(startGame, 1200);
});

window.addEventListener("squatDetected", () => {
    // console.log("Um agachamento foi completado!");
    // Aqui você pode adicionar código para atualizar a pontuação ou interface
});

// Inicializa o detector de pose ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    prepareDetector(); // Função importada de movenet.min.js
});