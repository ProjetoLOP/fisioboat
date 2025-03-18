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
                playRowingSound();
            }
        });

        // Para o movimento ao soltar a tecla "espaço"
        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                this.isMoving = false;
            }
        });

        // Dispara o movimento ao detectar o evento de agachamento
        window.addEventListener('squatDetected', (event) => {
            const squatDetails = event.details;

            this.isMoving = true;
            playRowingSound();
        });
    },
    tick: function (time, timeDelta) {
        const deltaSeconds = timeDelta / 1000; // Converte o tempo delta para segundos
        const currentPosition = this.el.getAttribute('position'); // Obtém a posição atual do barco

        //Anti queda do abismo
        currentPosition.z = ((currentPosition.z < -250) ? 0 : currentPosition.z);

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
        botSpeed: { type: 'number', default: 0.1 }, // velocidade botBarco

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
        botCurrentPosition.z = ((botCurrentPosition.z < -250) ? 0 : botCurrentPosition.z);
        // inicia movimentação do bot mediante espaço ou squat
        if (this.isRacing) {
            botCurrentPosition.z -= this.data.botSpeed;
            this.el.setAttribute('position', botCurrentPosition);
        }
    },
});

// Componente para exibir as coordenadas z dos barcos na tela
// AFRAME.registerComponent('display-coordinates', {
//     schema: {
//         boat: { type: 'selector' }, // Seletor para o barco controlado pelo usuário
//         botBoat: { type: 'selector' }, // Seletor para o barco bot
//     },
//     init: function () {
//         // Cria elementos HTML para exibir as coordenadas
//         this.infoContainer = document.createElement('div');
//         this.infoContainer.style.position = 'absolute';
//         this.infoContainer.style.top = '10%';
//         this.infoContainer.style.right = '-5%';
//         this.infoContainer.style.transform = 'translate(-50%, -50%)';
//         this.infoContainer.style.color = 'white';
//         this.infoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
//         this.infoContainer.style.padding = '10px';
//         this.infoContainer.style.borderRadius = '5px';
//         this.infoContainer.style.fontFamily = 'Arial, sans-serif';
//         this.infoContainer.style.zIndex = '1000';

//         // Adiciona o container ao body do documento
//         document.body.appendChild(this.infoContainer);
//     },
//     tick: function () {
//         const boatPosition = this.data.boat.getAttribute('position'); // Posição do barco do usuário
//         const botBoatPosition = this.data.botBoat.getAttribute('position'); // Posição do barco bot

//         const zPositionUserBoat = boatPosition.z.toFixed(2);
//         const zPositionBotBoat = botBoatPosition.z.toFixed(2);
//         const boatsDistance = Math.floor(convertZToMeters(zPositionUserBoat, zPositionBotBoat));

//         // Atualiza o conteúdo do container
//         this.infoContainer.innerHTML = `
//             <p><strong>Barco 1 (Usuário)</strong> - Z: ${zPositionUserBoat}</p>
//             <p><strong>Barco 2 (Bot)</strong> - Z: ${zPositionBotBoat}</p>
//             <p><strong>Distância</strong>: ${boatsDistance}m</p>
//         `;
//     },
// });

// Converte unidades de Z em metros
function convertZToMeters(z1, z2) {
    const unitsPerMeter = 13.7 / 3; // Unidades de z equivalentes a 1 metro
    const differenceInZ = Math.abs(z1 - z2); // Diferença absoluta entre os dois valores de z
    return differenceInZ / unitsPerMeter; // Converte para metros
}