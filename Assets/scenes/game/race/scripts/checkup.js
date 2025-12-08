// função para ouvir comando de voz
function commandListener(comando, callback) {
    // Verifica suporte do navegador
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        console.error('Navegador não suporta reconhecimento de voz');
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let comandoExecutado = false;

    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const texto = result[0].transcript.toLowerCase().trim();

        console.log('Detectado:', texto);

        if (!comandoExecutado && texto.includes(comando.toLowerCase())) {
            comandoExecutado = true;
            callback();
            recognition.stop();
        }
    };

    recognition.onerror = (event) => {
        console.error('Erro:', event.error);
        recognition.stop();
    };

    recognition.onend = () => {
        console.log('Microfone desativado');
        window.removeEventListener("raceStart", stopRecognition);
    };

    // Função para parar o reconhecimento quando o evento for disparado
    function stopRecognition() {
        console.log('Evento "raceStart" detectado — microfone desativado.');
        recognition.stop();
    }

    // Escuta o evento "raceStart"
    window.addEventListener("raceStart", stopRecognition);

    recognition.start();
    console.log(`Microfone ativado, aguardando "${comando}"...`);
}

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
function removeOverlay() {
    const overlay = document.getElementById('checkupOverlay');
    const videoContainer = document.getElementById('video-container');
    overlay.classList.remove('active');
    videoContainer.classList.add('game-started');
    console.log('Iniciando o jogo...');
}

// Event listeners
document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        startDetection(); // Função importada de movenet.min.js

        const loadingDots = document.querySelector(".loading-dots");
        loadingDots.classList.add("active");
    }
}, { once: true });


// Exemplo de uso:
commandListener('iniciar', () => {
    startDetection();

    const loadingDots = document.querySelector(".loading-dots");
    loadingDots.classList.add("active");
});

window.addEventListener("detector:ready", () => {
    window.loadingManager.completeTask('detector');
    // setupCamera();
    setupVideo();
});

window.addEventListener("pose:ready", () => {
    window.loadingManager.completeTask('pose');
    setTimeout(() => {
        removeOverlay();
        startGame();
    }, 1200);
});

// Inicializa o detector de pose ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    prepareDetector(); // Função importada de movenet.min.js
});