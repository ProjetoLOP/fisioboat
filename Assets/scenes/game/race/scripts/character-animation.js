// ===============================
// CHARACTER ANIMATIONS - Animações dos personagens
// ===============================

// ===============================
// COMPONENTE BOT-CHARACTER-ANIMATION (Animação dos personagens dos bots)
// ===============================
AFRAME.registerComponent('bot-character-animation', {
    schema: {
        minSpeed: { type: 'number', default: 0.3 },
        maxSpeed: { type: 'number', default: 2.5 },
        deceleration: { type: 'number', default: 0.92 },
        stopThreshold: { type: 'number', default: 0.7 },
        minimumAnimSpeed: { type: 'number', default: 0.6 }
    },

    init() {
        this.botMovement = null;
        this.charRow = this.el.querySelector('.bot-char-row');
        this.currentAnimSpeed = 0;
        this.targetAnimSpeed = 0;
        this.shouldStop = false;
        this.mixer = null;
        this.action = null;

        if (this.charRow) {
            this.charRow.addEventListener('model-loaded', () => {
                if (!this.charRow.components['animation-mixer']) {
                    this.charRow.setAttribute('animation-mixer', 'clip:*; loop:repeat; timeScale:1');
                }
                this.charRow.setAttribute('visible', true);
                
                setTimeout(() => {
                    const mixerComp = this.charRow.components['animation-mixer'];
                    if (mixerComp && mixerComp.mixer) {
                        this.mixer = mixerComp.mixer;
                        if (this.mixer._actions && this.mixer._actions.length > 0) {
                            this.action = this.mixer._actions[0];
                        }
                    }
                    this._setAnimationSpeed(this.charRow, 0);
                }, 100);
            });
        }
    },

    tick(time, deltaTime) {
        if (!window.raceStarted) return;
        if (!this.botMovement) this.botMovement = this.el.components['bot-boat-movement'];
        if (!this.botMovement || !this.charRow) return;

        // Calcula velocidade alvo baseada no movimento do bot
        if (this.botMovement.moving) {
            const velocity = this.botMovement.data.speed;
            const maxVelocity = 6.9;
            const velocityNorm = Math.min(1, Math.max(0, velocity / maxVelocity));
            this.targetAnimSpeed = this.data.minSpeed + (this.data.maxSpeed - this.data.minSpeed) * velocityNorm;
            this.shouldStop = false;
        } else {
            this.targetAnimSpeed = 0;
            this.shouldStop = true;
        }

        // Se deve parar e está abaixo do threshold, verifica se está em posição favorável
        if (this.shouldStop && this.currentAnimSpeed <= this.data.stopThreshold) {
            if (this._isInFavorablePosition()) {
                this.currentAnimSpeed = 0;
                this._setAnimationSpeed(this.charRow, 0);
                return;
            } else {
                this.currentAnimSpeed = this.data.stopThreshold;
                this._setAnimationSpeed(this.charRow, this.currentAnimSpeed);
                return;
            }
        }

        // Interpola suavemente entre velocidade atual e alvo
        const delta = Math.min(deltaTime / 1000, 0.1);
        if (this.currentAnimSpeed > this.targetAnimSpeed) {
            // Desacelerando
            this.currentAnimSpeed = this.currentAnimSpeed * Math.pow(this.data.deceleration, delta * 60);
            this.currentAnimSpeed = Math.max(this.currentAnimSpeed, this.data.minimumAnimSpeed);
            if (this.currentAnimSpeed < 0.01 && !this.shouldStop) {
                this.currentAnimSpeed = 0;
            }
        } else {
            // Acelerando
            const lerpFactor = 1 - Math.pow(0.001, delta);
            this.currentAnimSpeed += (this.targetAnimSpeed - this.currentAnimSpeed) * lerpFactor;
        }

        this._setAnimationSpeed(this.charRow, this.currentAnimSpeed);
    },

    _isInFavorablePosition() {
        if (!this.action) return true;

        const duration = this.action.getClip().duration;
        const currentTime = this.action.time % duration;
        const normalizedTime = currentTime / duration;

        const windowSize = 0.1;
        const isAtStart = normalizedTime <= windowSize || normalizedTime >= (1 - windowSize);
        const isAtMiddle = Math.abs(normalizedTime - 0.5) <= windowSize;

        return isAtStart || isAtMiddle;
    },

    forceStop() {
        this.targetAnimSpeed = 0;
        this.shouldStop = true;
    },

    _setAnimationSpeed(el, speed) {
        if (!el) return;

        const rowMix = el.components['animation-mixer'];
        if (!rowMix || !rowMix.mixer) return;

        rowMix.data.timeScale = speed;

        if (rowMix.mixer && rowMix.mixer._actions) {
            rowMix.mixer._actions.forEach(action => {
                action.timeScale = speed;
                action.paused = false;
            });
        }
    }
});

// ===============================
// COMPONENTE CHARACTER-ROW-SWITCH (Animação do personagem do jogador)
// ===============================
AFRAME.registerComponent('character-row-switch', {
    schema: {
        row: { type: 'selector', default: '#char-row' },
        minSpeed: { type: 'number', default: 0.3 },
        maxSpeed: { type: 'number', default: 2.5 },
        deceleration: { type: 'number', default: 0.92 },
        stopThreshold: { type: 'number', default: 0.7 },
        minimumAnimSpeed: { type: 'number', default: 0.6 }
    },

    init() {
        this.bc = null;
        this.currentAnimSpeed = 0;
        this.targetAnimSpeed = 0;
        this.shouldStop = false;
        this.mixer = null;
        this.action = null;

        if (this.data.row) {
            this.data.row.addEventListener('model-loaded', () => {
                if (!this.data.row.components['animation-mixer']) {
                    this.data.row.setAttribute('animation-mixer', 'clip:*; loop:repeat; timeScale:1');
                }
                this.data.row.setAttribute('visible', true);
                
                setTimeout(() => {
                    const mixerComp = this.data.row.components['animation-mixer'];
                    if (mixerComp && mixerComp.mixer) {
                        this.mixer = mixerComp.mixer;
                        if (this.mixer._actions && this.mixer._actions.length > 0) {
                            this.action = this.mixer._actions[0];
                        }
                    }
                    this._setAnimationSpeed(this.data.row, 0);
                }, 100);
            });
        }
    },

    tick(time, deltaTime) {
        if (!window.raceStarted) return;
        if (!this.bc) this.bc = this.el.components['boat-controls'];
        if (!this.bc || !this.data.row) return;

        // Calcula velocidade alvo baseada na velocidade do barco
        const velocity = this.bc.velocity;
        const maxVelocity = this.bc.data.maxSpeed;
        const velocityNorm = Math.min(1, Math.max(0, velocity / maxVelocity));
        
        if (velocity > 0.1) {
            this.targetAnimSpeed = this.data.minSpeed + (this.data.maxSpeed - this.data.minSpeed) * velocityNorm;
            this.shouldStop = false;
        } else {
            this.targetAnimSpeed = 0;
            this.shouldStop = true;
        }

        // Se deve parar e está abaixo do threshold, verifica se está em posição favorável
        if (this.shouldStop && this.currentAnimSpeed <= this.data.stopThreshold) {
            if (this._isInFavorablePosition()) {
                this.currentAnimSpeed = 0;
                this._setAnimationSpeed(this.data.row, 0);
                return;
            } else {
                this.currentAnimSpeed = this.data.stopThreshold;
                this._setAnimationSpeed(this.data.row, this.currentAnimSpeed);
                return;
            }
        }

        // Interpola suavemente entre velocidade atual e alvo
        const delta = Math.min(deltaTime / 1000, 0.1);
        if (this.currentAnimSpeed > this.targetAnimSpeed) {
            // Desacelerando
            this.currentAnimSpeed = this.currentAnimSpeed * Math.pow(this.data.deceleration, delta * 60);
            this.currentAnimSpeed = Math.max(this.currentAnimSpeed, this.data.minimumAnimSpeed);
            if (this.currentAnimSpeed < 0.01 && !this.shouldStop) {
                this.currentAnimSpeed = 0;
            }
        } else {
            // Acelerando
            const lerpFactor = 1 - Math.pow(0.001, delta);
            this.currentAnimSpeed += (this.targetAnimSpeed - this.currentAnimSpeed) * lerpFactor;
        }

        this._setAnimationSpeed(this.data.row, this.currentAnimSpeed);
    },

    _isInFavorablePosition() {
        if (!this.action) return true;

        const duration = this.action.getClip().duration;
        const currentTime = this.action.time % duration;
        const normalizedTime = currentTime / duration;

        const windowSize = 0.1;
        const isAtStart = normalizedTime <= windowSize || normalizedTime >= (1 - windowSize);
        const isAtMiddle = Math.abs(normalizedTime - 0.5) <= windowSize;

        return isAtStart || isAtMiddle;
    },

    _setAnimationSpeed(el, speed) {
        if (!el) return;

        const rowMix = el.components['animation-mixer'];
        if (!rowMix || !rowMix.mixer) return;

        rowMix.data.timeScale = speed;

        if (rowMix.mixer && rowMix.mixer._actions) {
            rowMix.mixer._actions.forEach(action => {
                action.timeScale = speed;
                action.paused = false;
            });
        }
    }
});