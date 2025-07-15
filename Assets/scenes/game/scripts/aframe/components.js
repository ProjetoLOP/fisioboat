// Componente para controlar o barco do jogador
AFRAME.registerComponent('player-boat', {
  schema: {
    acceleration: { type: 'number', default: 7 },   // impulso de aceleração por squat
    drag: { type: 'number', default: 0.3 },   // coeficiente de arrasto (1/s)
    maxSpeed: { type: 'number', default: 7 }    // velocidade máxima (m/s)
  },

  init() {
    this.velocity = 0;
    this.isMoving = false;

    // eventos de input
    window.addEventListener('keydown', e => { if (e.key === ' ') this.isMoving = true; });
    window.addEventListener('keyup', e => { if (e.key === ' ') this.isMoving = false; });
    window.addEventListener('completed', () => this.isMoving = true);

    // fixed-step
    this.accumulator = 0;
    this.fixedStepMs = 30;
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

// Componente para controlar o botBarco
AFRAME.registerComponent('bot-boat', {
  schema: {
    acceleration: { type: 'number', default: 7.77 },
    drag: { type: 'number', default: 0.3 },
    maxSpeed: { type: 'number', default: 7.77 }
  },

  init() {
    this.velocity = 0;
    this.isRacing = false;
    this.isRopeBroken = false;

    window.addEventListener('keydown', e => {
      if (e.key === ' ' && !this.isRopeBroken) this.isRacing = true;
    });
    window.addEventListener('completed', () => {
      if (!this.isRopeBroken) this.isRacing = true;
    });
    document.addEventListener('ropeBroken', () => {
      this.isRopeBroken = true;
      this.isRacing = false;
    });
    this.el.addEventListener('continueGame', () => {
      this.isRopeBroken = false;
      this.isRacing = true;
    });

    // fixed-step
    this.accumulator = 0;
    this.fixedStepMs = 30;
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
    this.prevPosition.copy(this.currPosition);

    if (this.isRacing && !this.isRopeBroken) {
      this.velocity += this.data.acceleration * dt;
    } else {
      this.velocity -= this.velocity * this.data.drag * dt;
    }

    this.velocity = THREE.MathUtils.clamp(this.velocity, 0, this.data.maxSpeed);
    if (this.velocity < 0.01) this.velocity = 0;
    this.currPosition.z -= this.velocity * dt;
  },

  _render(alpha) {
    this.el.object3D.position.z = THREE.MathUtils.lerp(
      this.prevPosition.z,
      this.currPosition.z,
      alpha
    );
  }
});




// Componente para a corda esticável entre os barcos
AFRAME.registerComponent('stretch-rope', {
  schema: {
    target: { type: 'selector' },
    attachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: 2 } },
    targetAttachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -2 } },
    breakDistance: { type: 'number', default: 20 },
    slackThreshold: { type: 'number', default: 10 },
    maxSag: { type: 'number', default: 2 },
    startBroken: { type: 'boolean', default: false }
  },

  init: function () {
    console.log('[stretch-rope] Inicializando componente de corda esticável.');

    // Salva referência ao material
    this.material = new THREE.MeshStandardMaterial({
      color: 0x4c3b30,
      emissive: 0x222222,
      transparent: false
    });

    const initialCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ]);
    this.geometry = new THREE.TubeGeometry(initialCurve, 20, 0.05, 8, false);
    this.ropeMesh = new THREE.Mesh(this.geometry, this.material);
    this.ropeMesh.frustumCulled = false;

    this.el.sceneEl.object3D.add(this.ropeMesh);
    console.log('[stretch-rope] Corda adicionada ao scene para pré‑carregamento.');

    this.ropeBroken = this.data.startBroken;

    this.el.addEventListener('ropeRestore', () => {
      if (this.ropeBroken) {
        this.ropeBroken = false;
        if (!this.el.sceneEl.object3D.children.includes(this.ropeMesh)) {
          this.el.sceneEl.object3D.add(this.ropeMesh);
        }
        console.log('[stretch-rope] Corda restaurada (via ropeRestore).');
      }
    });
  },

  tick: function () {
    if (this.ropeBroken) return;

    this.el.object3D.updateMatrixWorld(true);
    this.data.target.object3D.updateMatrixWorld(true);

    const startLocal = new THREE.Vector3(
      this.data.attachPoint.x,
      this.data.attachPoint.y,
      this.data.attachPoint.z
    );
    const endLocal = new THREE.Vector3(
      this.data.targetAttachPoint.x,
      this.data.targetAttachPoint.y,
      this.data.targetAttachPoint.z
    );
    const startWorld = this.el.object3D.localToWorld(startLocal.clone());
    const endWorld = this.data.target.object3D.localToWorld(endLocal.clone());

    const distance = startWorld.distanceTo(endWorld);

    // 🔴 Muda a cor para vermelho se estiver perto de romper
    const warningThreshold = this.data.breakDistance * 0.7;
    if (distance > warningThreshold) {
      this.material.color.set(0xff0000); // Vermelho
    } else {
      this.material.color.set(0x4c3b30); // Cor original
    }

    // Rompe se exceder breakDistance
    if (distance > this.data.breakDistance) {
      console.log(`[stretch-rope] Distância excedida (${distance.toFixed(2)} > ${this.data.breakDistance}). Corda rompida.`);
      this.el.sceneEl.object3D.remove(this.ropeMesh);
      this.ropeBroken = true;
      this.el.emit('ropeBroken', { distance });
      return;
    }

    const midpoint = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);
    let sag = 0;
    if (distance < this.data.slackThreshold) {
      sag = this.data.maxSag * (1 - distance / this.data.slackThreshold);
    }
    midpoint.y -= sag;

    const curve = new THREE.CatmullRomCurve3([startWorld, midpoint, endWorld]);
    const newGeometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    this.ropeMesh.geometry.dispose();
    this.ropeMesh.geometry = newGeometry;
  },

  remove: function () {
    if (
      this.ropeMesh &&
      this.el.sceneEl.object3D.children.includes(this.ropeMesh)
    ) {
      this.el.sceneEl.object3D.remove(this.ropeMesh);
      console.log('[stretch-rope] Corda removida (via remove()).');
    }
    this.ropeBroken = true;
  }
});