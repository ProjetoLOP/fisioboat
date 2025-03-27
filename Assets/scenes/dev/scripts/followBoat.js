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