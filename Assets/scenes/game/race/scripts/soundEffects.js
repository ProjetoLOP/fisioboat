// soundEffects.js - Sistema de Som do Jogo

const soundEffects = {
    // Músicas
    introMusic: null,
    raceMusic: null,
    
    // Efeitos sonoros
    countdownSound: null,
    
    // Estado
    currentMusic: null,

    init() {
        // Inicializa músicas
        this.introMusic = new Audio('/Assets/scenario/songs/racing_intro.mp3');
        this.raceMusic = new Audio('/Assets/scenario/songs/racing_loop.mp3');
        this.countdownSound = new Audio('/Assets/scenario/songs/countdown.mp3');

        // Configura loops
        this.introMusic.loop = true;
        this.raceMusic.loop = true;

        // Configura volumes
        this.introMusic.volume = 0.7;
        this.raceMusic.volume = 0.7;
        this.countdownSound.volume = 0.8;


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
        
        // Para qualquer música atual
        this.stopAllMusic();
        
        // Toca música de corrida
        this.raceMusic.currentTime = 0;
        this.raceMusic.play().catch(err => {
            console.warn('Erro ao tocar música de corrida:', err);
        });
        
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
    }
};

// Inicializa o sistema de som imediatamente
soundEffects.init();

// Exporta para uso global
window.soundEffects = soundEffects;