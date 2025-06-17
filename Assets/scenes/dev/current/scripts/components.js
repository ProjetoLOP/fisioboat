// Componente para controlar o barco do jogador
AFRAME.registerComponent('player-boat', {
  schema: {
    acceleration: { type: 'number', default: 7 },   // impulso de aceleração por squat
    drag:         { type: 'number', default: 0.3 },   // coeficiente de arrasto (1/s)
    maxSpeed:     { type: 'number', default: 7 }    // velocidade máxima (m/s)
  },

  init() {
    this.velocity = 0;
    this.isMoving = false;

    // eventos de input
    window.addEventListener('keydown', e => { if (e.key === ' ') this.isMoving = true; });
    window.addEventListener('keyup',   e => { if (e.key === ' ') this.isMoving = false; });
    window.addEventListener('completed', () => this.isMoving = true);

    // fixed-step
    this.accumulator  = 0;
    this.fixedStepMs  = 30;
    this.prevPosition = this.el.object3D.position.clone();
    this.currPosition = this.prevPosition.clone();
  },

  tick(time, timeDelta) {
    this.accumulator += timeDelta;
    while (this.accumulator >= this.fixedStepMs) {
      this._physicsStep(this.fixedStepMs / 1000);
      this.accumulator -= this.fixedStepMs;
    }
    const alpha = this.accumulator / this.fixedStepMs;
    this._render(alpha);
  },

  _physicsStep(dt) {
    // atualiza prev
    this.prevPosition.copy(this.currPosition);

    if (this.isMoving) {
      this.velocity += this.data.acceleration;
      this.isMoving = false;
    } else {
      // desaceleração via arrasto proporcional à velocidade
      this.velocity -= this.velocity * this.data.drag * dt;
    }

    // clamp e zero small
    this.velocity = THREE.MathUtils.clamp(this.velocity, 0, this.data.maxSpeed);
    if (this.velocity < 0.01) this.velocity = 0;

    // atualiza posição
    this.currPosition.z -= this.velocity * dt;

    // colisão com bot
    const bot = document.querySelector('#botBoat');
    if (bot) {
      const bz = bot.getAttribute('position').z;
      if (Math.abs(this.currPosition.z - bz) < 6) {
        this.velocity *= 0.7;
        const rope = document.querySelector('[stretch-rope]');
        if (rope?.components['stretch-rope'].ropeBroken) {
          this.continueGame(bot, rope);
        }
      }
    }
  },

  _render(alpha) {
    const z = THREE.MathUtils.lerp(
      this.prevPosition.z,
      this.currPosition.z,
      alpha
    );
    this.el.object3D.position.z = z;
  },

  continueGame(bot, rope) {
    rope.emit('ropeRestore');
    bot.emit('continueGame');
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

            // console.log("Distância entre barcos: " + boatsDistance);
            // console.log(`Velocidade setada para ${velocityPercentage * 100}%`);
            // console.log("-------------------");

            this.lastDistance = boatsDistance;
        }
    }
});
