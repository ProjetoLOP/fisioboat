AFRAME.registerComponent('boat-controls', {
    schema: {
        acceleration: { type: 'number', default: 7 },
        deceleration: { type: 'number', default: 0.03 },
        maxSpeed: { type: 'number', default: 7 },
    },
    init: function () {
        this.velocity = 0;
        this.movingForward = false;

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

        // Listener para o evento de agachamento
        window.addEventListener('squatDetected', () => {
            this.movingForward = true;
        });
    },
    tick: function (time, timeDelta) {
        const delta = timeDelta / 1000;
        const position = this.el.getAttribute('position');

        // Aceleração quando o evento de agachamento é detectado
        if (this.movingForward) {
            this.velocity += this.data.acceleration;
           this.movingForward = false; // Reseta para evitar movimento contínuo
        } else {
            this.velocity -= this.data.deceleration;
        }

        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));
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