// Componente para controlar o movimento do barco
AFRAME.registerComponent('boat-controls', {
    schema: {
        acceleration: { type: 'number', default: 7 }, // Taxa de aceleração
        deceleration: { type: 'number', default: 0.03 }, // Taxa de desaceleração
        maxSpeed: { type: 'number', default: 7 }, // Velocidade máxima permitida
    },
    init: function () {
        this.velocity = 0; // Velocidade inicial do barco
        this.isMoving = false; // Estado inicial: barco parado

        // Inicia o movimento ao pressionar a tecla "espaço"
        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.isMoving = true;
            }
        });

        // Para o movimento ao soltar a tecla "espaço"
        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                this.isMoving = false;
            }
        });

        // Dispara o movimento ao detectar o evento de agachamento
        window.addEventListener('squatDetected', () => {
            this.isMoving = true;
        });
    },
    tick: function (time, timeDelta) {
        const deltaSeconds = timeDelta / 1000; // Converte o tempo delta para segundos
        const currentPosition = this.el.getAttribute('position'); // Obtém a posição atual do barco

        //Anti queda do abismo
        currentPosition.z = ((currentPosition.z < -150) ? 0 : currentPosition.z);

        // Acelera se o barco estiver em movimento
        if (this.isMoving) {
            this.velocity += this.data.acceleration;
            this.isMoving = false; // Reseta para evitar movimento contínuo
        } else {
            // Aplica desaceleração gradual quando parado
            this.velocity -= this.data.deceleration;
        }

        // Garante que a velocidade esteja entre 0 e o valor máximo permitido
        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));

        // Atualiza a posição do barco com base na velocidade
        currentPosition.z -= this.velocity * deltaSeconds;
        this.el.setAttribute('position', currentPosition);
    },
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

// Componente para controlar o botBarco
AFRAME.registerComponent('bot-boat', {
    schema: {
        botSpeed: { type: 'number', default: 0.15 }, // velocidade botBarco

    },
    init: function () {
        this.isRacing = false; // Estado inicial: sem corrida -> botBarco parado

        // Inicia o movimento ao pressionar a tecla "espaço"
        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.isRacing = true;
            }
        });
        // Dispara o movimento ao detectar o evento de agachamento
        window.addEventListener('squatDetected', () => {
            this.isRacing = true;
        });
    },
    tick: function () {

        const botCurrentPosition = this.el.getAttribute('position'); // Obtém a posição atual do botBarco
        // Anti queda do abismo
        botCurrentPosition.z = ((botCurrentPosition.z < -150) ? 0 : botCurrentPosition.z);
        // inicia movimentação do bot mediante espaço ou squat
        if (this.isRacing) {
            botCurrentPosition.z -= this.data.botSpeed;
            this.el.setAttribute('position', botCurrentPosition);
        }
    },
});