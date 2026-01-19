// soundEffects.js - Sistema de Som do Jogo

const soundEffects = {
    // Músicas
    introMusic: null,
    raceMusic: null,

    // Efeitos sonoros
    countdownSound: null,

    // Estado
    currentMusic: null,

    // Torcida
    cheerAmbience: null,   // áudio longo 
    cheerFinish: null,     // áudio curto 

    init() {
        // Inicializa músicas
        this.introMusic = new Audio('../../../scenario/songs/racing_intro.mp3');
        this.raceMusic = new Audio('../../../scenario/songs/racing_loop.mp3');
        this.countdownSound = new Audio('../../../scenario/songs/countdown.mp3');

        this.cheerAmbience = new Audio('../../../scenario/songs/cheer_ambience.mp3');
        this.cheerAmbience.loop = true;
        this.cheerAmbience.volume = 0.3;   // Começa silencioso

        this.cheerFinish = new Audio('../../../scenario/songs/cheer_finish.mp3');
        this.cheerFinish.loop = false;
        this.cheerFinish.volume = 1.0;


        // Configura loops
        this.introMusic.loop = true;
        this.raceMusic.loop = true;

        // Configura volumes
        this.introMusic.volume = 0.2;
        this.raceMusic.volume = 0.2;
        this.countdownSound.volume = 0.3;


        // Toca música de intro imediatamente
        this.playIntroMusic();

        // Registra listeners de eventos
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Evento de countdown - pausa música e toca efeito
        document.addEventListener('gameStart', () => {
            console.log('[SoundEffects] Countdown iniciado - pausando música');
            this.pauseCurrentMusic();

            if (this.countdownSound) {
                this.countdownSound.currentTime = 0;
                this.countdownSound.play().catch(err => {
                    console.warn('Erro ao tocar countdown:', err);
                });
            }
        });

        // Evento de início da corrida - toca música de corrida
        document.addEventListener('raceStart', () => {
            console.log('[SoundEffects] Corrida iniciada - tocando música de corrida');
            this.playRaceMusic();
            this.playFinishCheer();
        });

        document.addEventListener('raceFinish', () => {
            console.log('[SoundEffects] Corrida finalizada - tocando música de vitória');
            this.playFinishCheer();
        });

        document.addEventListener('loadingComplete', () => {
            console.log('[SoundEffects] Loading complete - tocando música de introdução');
            this.playCheerAmbience();
        });

        // Eventos úteis adicionais
        document.addEventListener('pauseGame', () => {
            this.pauseCurrentMusic();
        });

        document.addEventListener('resumeGame', () => {
            this.resumeCurrentMusic();
        });
    },

    playIntroMusic() {
        console.log('[SoundEffects] Tocando música de introdução');

        // Para qualquer música atual
        this.stopAllMusic();

        // Toca música de intro
        this.introMusic.currentTime = 0;
        this.introMusic.play().catch(err => {
            console.warn('Erro ao tocar música de intro:', err);
            console.log('Clique na tela para habilitar o áudio');
        });

        this.currentMusic = this.introMusic;
    },

    playRaceMusic() {
        console.log('[SoundEffects] Tocando música de corrida');

        this.stopAllMusic();

        this.raceMusic.currentTime = 0;
        this.raceMusic.play().catch(err => {
            console.warn('Erro ao tocar música de corrida:', err);
        });

        this.raceMusic.volume = 0.2;  // garante volume mais baixo mesmo quando reinicia
        this.currentMusic = this.raceMusic;
    },

    pauseCurrentMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
    },

    resumeCurrentMusic() {
        if (this.currentMusic) {
            this.currentMusic.play().catch(err => {
                console.warn('Erro ao retomar música:', err);
            });
        }
    },

    stopAllMusic() {
        if (this.introMusic) {
            this.introMusic.pause();
            this.introMusic.currentTime = 0;
        }
        if (this.raceMusic) {
            this.raceMusic.pause();
            this.raceMusic.currentTime = 0;
        }
    },

    // Métodos de controle
    setMusicVolume(volume) {
        // volume entre 0 e 1
        if (this.introMusic) this.introMusic.volume = volume;
        if (this.raceMusic) this.raceMusic.volume = volume;
    },

    setSoundVolume(volume) {
        // volume entre 0 e 1
        if (this.countdownSound) this.countdownSound.volume = volume;
    },

    mute() {
        if (this.introMusic) this.introMusic.muted = true;
        if (this.raceMusic) this.raceMusic.muted = true;
        if (this.countdownSound) this.countdownSound.muted = true;
    },

    unmute() {
        if (this.introMusic) this.introMusic.muted = false;
        if (this.raceMusic) this.raceMusic.muted = false;
        if (this.countdownSound) this.countdownSound.muted = false;
    },

    updateByPlayerZ(playerZ) {
        if (!window.raceStarted) return;

        // Inicia o áudio de torcida se ainda não estiver tocando
        if (!this.cheerAmbiencePlaying && this.cheerAmbience.paused) {
            this.cheerAmbience.play().then(() => {
                this.cheerAmbiencePlaying = true;
                console.log('[SoundEffects] cheerAmbience iniciado durante corrida');
            }).catch(() => { });
        }

        const crowdEntities = document.querySelectorAll('[id^="cheeringCrowd"]');
        if (crowdEntities.length === 0) return;

        const playerBoat = document.querySelector('#boat');
        if (!playerBoat) return;

        const playerPos = playerBoat.object3D.position;

        // Distâncias ajustadas de forma mais suave
        const MIN_DIST = 15;  // distância para volume máximo (0.5)
        const MAX_DIST = 150; // distância para volume zero (reduzido de 150)
        const MAX_VOLUME = 0.7; // volume máximo permitido

        let combinedVolume = 0;

        crowdEntities.forEach(crowd => {
            const crowdPos = crowd.object3D.position;
            const dist = playerPos.distanceTo(crowdPos);

            let v = 0;
            if (dist <= MIN_DIST) {
                v = MAX_VOLUME;
            } else if (dist >= MAX_DIST) {
                v = 0;
            } else {
                // Calcula o fator de interpolação (1 = perto, 0 = longe)
                const t = (MAX_DIST - dist) / (MAX_DIST - MIN_DIST);
                // Curva quadrática suave, mas com volume máximo de 0.5
                v = (t * t) * MAX_VOLUME;
            }

            // Soma parcial (múltiplas torcidas podem contribuir)
            combinedVolume += v * 0.5;
        });

        // Limita ao volume máximo
        combinedVolume = Math.min(MAX_VOLUME, combinedVolume);

        // Suavização do volume (transição gradual)
        this.cheerAmbience.volume += (combinedVolume - this.cheerAmbience.volume) * 0.05;

        // Silencia completamente se muito baixo
        if (this.cheerAmbience.volume < 0.01) {
            this.cheerAmbience.volume = 0;
        }

        console.log(`[Cheer Audio] Volume calculado: ${combinedVolume.toFixed(2)} | Volume atual: ${this.cheerAmbience.volume.toFixed(2)}`);
    },

    playFinishCheer() {
        if (this.cheerFinish) {
            this.cheerFinish.currentTime = 0;
            this.cheerFinish.play().catch(() => { });
        }
    },

    playCheerAmbience() {
        if (this.cheerAmbience) {
            this.cheerAmbience.currentTime = 0;
            this.cheerAmbience.play().catch(() => { });
        }
    }

};

// Inicializa o sistema de som imediatamente
soundEffects.init();

// Exporta para uso global
window.soundEffects = soundEffects;