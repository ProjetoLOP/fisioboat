// Componente para controlar o botBarco
AFRAME.registerComponent('bot-boat', {
    schema: {
        acceleration: { type: 'number', default: 8 }, // Taxa de aceleração
        deceleration: { type: 'number', default: 0.03 }, // Taxa de desaceleração
        maxSpeed: { type: 'number', default: 6 }         // Velocidade máxima permitida
    },
    init: function () {
        this.velocity = 0;         // Velocidade inicial
        this.isRacing = false;     // Estado inicial: parado
        this.isRopeBroken = false; // Estado inicial: corda intacta

        // Inicia o movimento com a tecla "espaço"
        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                if (!this.isRopeBroken) {
                    this.isRacing = true;
                }
            }
        });

        // Inicia o movimento com o evento de agachamento
        window.addEventListener('squatDetected', () => {
            if (!this.isRopeBroken) {
                this.isRacing = true;
            }
        });

        // Quando a corda é rompida, o bot para de acelerar
        document.addEventListener('ropeBroken', () => {
            this.isRopeBroken = true;
            this.isRacing = false;
        });

        // Quando o evento continueGame for recebido, o bot retoma o movimento
        this.el.addEventListener('continueGame', () => {
            console.log("continueGame recebido no bot-boat.");
            this.isRopeBroken = false;
            this.isRacing = true;
        });
    },
    tick: function (time, timeDelta) {
        // Limita o delta para evitar deslocamentos exagerados em frames lentos
        const maxDeltaMilliseconds = 30;
        const deltaSeconds = Math.min(timeDelta, maxDeltaMilliseconds) / 1000;

        let botCurrentPosition = this.el.getAttribute('position');

        // Anti queda do abismo
        if (botCurrentPosition.z < -250) {
            botCurrentPosition.z = 0;
        }

        // Atualiza a velocidade:
        // Se estiver correndo e a corda não estiver quebrada, acelera.
        // Caso contrário, desacelera gradualmente.
        if (this.isRacing && !this.isRopeBroken) {
            this.velocity += this.data.acceleration;
        } else {
            this.velocity -= this.data.deceleration;
        }
        // Garante que a velocidade fique entre 0 e o valor máximo
        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));

        // Atualiza a posição com base na velocidade atual e no delta do tempo
        botCurrentPosition.z -= this.velocity * deltaSeconds;
        this.el.setAttribute('position', botCurrentPosition);
    }
});
