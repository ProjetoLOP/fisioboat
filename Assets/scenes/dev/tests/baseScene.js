let isFirstSquat = false; // Variável para controlar a primeira execução

// Componente para controlar o barco do jogador
AFRAME.registerComponent('player-boat', {
    schema: {
        acceleration: { type: 'number', default: 7 }, // Taxa de aceleração
        deceleration: { type: 'number', default: 0.03 }, // Taxa de desaceleração
        maxSpeed: { type: 'number', default: 7 } // Velocidade máxima permitida
    },
    init: function () {
        this.velocity = 0; // Velocidade inicial
        this.isMoving = false; // Estado inicial: parado

        // Inicia o movimento com a tecla "espaço"
        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.isMoving = true;

                const squatDetails = {
                    instant: new Date().toISOString(),
                    quality: 10,
                };

                const squatEvent = new CustomEvent("squatDetected", { detail: squatDetails });
                window.dispatchEvent(squatEvent);

                if (!isFirstSquat) {
                    isFirstSquat = true;
                    const firstSquatEvent = new CustomEvent("firstSquat");
                    window.dispatchEvent(firstSquatEvent);
                }
            }
        });

        // Para o movimento ao soltar a tecla "espaço"
        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                this.isMoving = false;
            }
        });

        // Movimento com o evento de agachamento
        window.addEventListener('squatDetected', () => {
            this.isMoving = true;
        });
    },
    tick: function (time, timeDelta) {
        // Limita o delta para evitar deslocamentos muito grandes em frames lentos.
        const maxDeltaMilliseconds = 30; // 30 ms é o limite máximo
        const deltaSeconds = Math.min(timeDelta, maxDeltaMilliseconds) / 1000;

        let currentPosition = this.el.getAttribute('position');

        // "Anti queda do abismo"
        // if (currentPosition.z < -250) {
        //     currentPosition.z = 0;
        // }

        // Atualiza velocidade conforme o estado do movimento
        if (this.isMoving) {
            this.velocity += this.data.acceleration;
            this.isMoving = false;
        } else {
            this.velocity -= this.data.deceleration;
        }
        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));

        // Atualiza a posição com base no delta controlado
        currentPosition.z -= this.velocity * deltaSeconds;
        this.el.setAttribute('position', currentPosition);

        // Verifica colisão com o botBarco
        const botBoatEl = document.querySelector('#botBoat');
        if (botBoatEl) {
            const botPos = botBoatEl.getAttribute('position');
            const collisionThreshold = 6; // ajuste conforme necessário
            if (Math.abs(currentPosition.z - botPos.z) < collisionThreshold) {
                console.log("Colisão detectada entre player e bot.");
                // Reduz a velocidade em 30%
                this.velocity *= 0.7;
                // Se a corda estiver quebrada, chama a função para retomar o jogo
                const ropeEl = document.querySelector('[stretch-rope]');
                if (ropeEl && ropeEl.components['stretch-rope'].ropeBroken) {
                    this.continueGame(botBoatEl, ropeEl);
                }
            }
        }
    },
    continueGame: function (botBoatEl, ropeEl) {
        console.log("continueGame: restaurando corda e retomando movimento do bot.");
        // Restaura a corda
        ropeEl.emit('ropeRestore', {}, false);
        // Emite um evento para o botBarco retomar a movimentação
        botBoatEl.emit('continueGame', {}, false);
    }
});

// Componente para telespectador seguir barco
AFRAME.registerComponent('follow', {
    schema: {
        target: { type: 'selector' }, // Alvo a ser seguido
        offset: { type: 'vec3', default: { x: 0, y: 0, z: 3 } }, // Offset em relação ao alvo
    },
    tick: function () {
        const target = this.data.target; // Obtém o alvo configurado

        // Posição do objeto alvo no espaço 3D
        const targetPosition = target.object3D.position;

        // Atualiza a posição do objeto atual para seguir o alvo com o offset
        this.el.object3D.position.set(
            targetPosition.x + this.data.offset.x,
            targetPosition.y + this.data.offset.y,
            targetPosition.z + this.data.offset.z
        );
    }
});

AFRAME.registerComponent('evasive-speed-controller', {
    schema: {
        boat: { type: 'selector' },
        botBoat: { type: 'selector' },
    },

    init: function () {
        this.lastDistance = null; // Armazena a última distância registrada
        this.botBoatMaxSpeed = this.data.botBoat.getAttribute('bot-boat').maxSpeed;
    },

    tick: function () {
        const boatPosition = this.data.boat.getAttribute('position');
        const botBoatPosition = this.data.botBoat.getAttribute('position');

        const zPositionUserBoat = boatPosition.z.toFixed(2);
        const zPositionBotBoat = botBoatPosition.z.toFixed(2);
        const boatsDistance = Math.floor(convertZToMeters(zPositionUserBoat, zPositionBotBoat));

        if (boatsDistance !== this.lastDistance) {
            const velocityPercentage = 1 - boatsDistance / 10;
            this.data.botBoat.setAttribute('bot-boat', { maxSpeed: this.botBoatMaxSpeed * velocityPercentage });

            console.log(boatsDistance);
            console.log(velocityPercentage)
            console.log("-------------------");

            this.lastDistance = boatsDistance;
        }
    }
});
