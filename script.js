AFRAME.registerComponent('boat-controls', {
    schema: {
        acceleration: { type: 'number', default: 0.7 }, // Intensidade da aceleração
        deceleration: { type: 'number', default: 0.03 }, // Taxa de desaceleração
        maxSpeed: { type: 'number', default: 5 },      // Velocidade máxima
    },
    init: function () {
        this.velocity = 0; // Velocidade atual do barco
        this.movingForward = false; // Indica se a tecla está pressionada

        // Listener para detectar o início do movimento
        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.movingForward = true;
            }
        });

        // Listener para detectar o fim do movimento
        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                this.movingForward = false;
            }
        });
    },
    tick: function (time, timeDelta) {
        const delta = timeDelta / 1000; // Converter para segundos
        const position = this.el.getAttribute('position');

        // Aceleração quando a tecla está pressionada
        if (this.movingForward) {
            this.velocity += this.data.acceleration;
        } else {
            // Desaceleração natural (atrito)
            this.velocity -= this.data.deceleration;
        }

        // Limitar a velocidade mínima e máxima
        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));

        // Atualizar a posição com base na velocidade
        position.z -= this.velocity * delta;
        this.el.setAttribute('position', position);
    },
});


AFRAME.registerComponent('follow', {
    schema: {
      target: { type: 'selector' },
      offset: { type: 'vec3', default: { x: 0, y: 0, z: 3 } },
    },
    tick: function () {
        const target = this.data.target;

        // Posição do objeto alvo
        const targetPosition = target.object3D.position;

        // Atualizar posição da câmera com o offset
        this.el.object3D.position.set(
            targetPosition.x + this.data.offset.x,
            targetPosition.y + this.data.offset.y,
            targetPosition.z + this.data.offset.z
        );
    },
});