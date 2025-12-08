// Componente para controlar o barco do jogador
AFRAME.registerComponent('player-boat', {
  schema: {
    acceleration: { type: 'number', default: 7 },
    drag: { type: 'number', default: 0.3 },
    maxSpeed: { type: 'number', default: 7 }
  },

  init() {
    this.velocity = 0;
    this.isMoving = false;

    window.addEventListener('keydown', e => { if (e.key === ' ') this.isMoving = true; });
    window.addEventListener('keyup', e => { if (e.key === ' ') this.isMoving = false; });
    window.addEventListener('completed', () => this.isMoving = true);

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

    if (this.isMoving) {
      this.velocity += this.data.acceleration;
      this.isMoving = false;
    } else {
      this.velocity -= this.velocity * this.data.drag * dt;
    }

    this.velocity = THREE.MathUtils.clamp(this.velocity, 0, this.data.maxSpeed);
    if (this.velocity < 0.01) this.velocity = 0;

    this.currPosition.z -= this.velocity * dt;

    const bot = document.querySelector('#botBoat');
    if (bot) {
      const bz = bot.getAttribute('position').z;
      if (Math.abs(this.currPosition.z - bz) < 10) {
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

AFRAME.registerComponent('follow', {
  schema: {
    target: { type: 'selector' },
    offset: { type: 'vec3', default: { x: 0, y: 0, z: 3 } },
  },
  tick: function () {
    const target = this.data.target;
    const targetPosition = target.object3D.position;

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
    this.lastDistance = null;
    this.botBoatMaxSpeed = null; // Inicializa como null
    this.maxSpeedInitialized = false; // Flag de controle
  },

  tick: function () {
    // Captura o maxSpeed original apenas uma vez (lazy initialization)
    if (!this.maxSpeedInitialized) {
      const botBoatAttr = this.data.botBoat.getAttribute('bot-boat');
      if (botBoatAttr && botBoatAttr.maxSpeed) {
        this.botBoatMaxSpeed = botBoatAttr.maxSpeed;
        this.maxSpeedInitialized = true;
        console.log('[evasive-speed-controller] maxSpeed capturado:', this.botBoatMaxSpeed);
      } else {
        return; // Aguarda bot-boat estar pronto
      }
    }

    const boatPosition = this.data.boat.getAttribute('position');
    const botBoatPosition = this.data.botBoat.getAttribute('position');

    const zPositionUserBoat = boatPosition.z.toFixed(2);
    const zPositionBotBoat = botBoatPosition.z.toFixed(2);
    const boatsDistance = Math.floor(convertZToMeters(zPositionUserBoat, zPositionBotBoat));

    if (boatsDistance !== this.lastDistance) {
      const velocityPercentage = 1 - boatsDistance / 10;
      this.data.botBoat.setAttribute('bot-boat', { maxSpeed: this.botBoatMaxSpeed * velocityPercentage });
      this.lastDistance = boatsDistance;
    }
  }
});

AFRAME.registerComponent('bot-boat', {
  schema: {
    acceleration: { type: 'number', default: 8.5 },
    drag: { type: 'number', default: 0.3 },
    maxSpeed: { type: 'number', default: 8.5 }
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

AFRAME.registerComponent('stretch-rope', {
  schema: {
    target: { type: 'selector' },
    attachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -4 } },
    targetAttachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -10 } },
    breakDistance: { type: 'number', default: 20 },
    slackThreshold: { type: 'number', default: 10 },
    maxSag: { type: 'number', default: 2 },
    startBroken: { type: 'boolean', default: false }
  },

  init: function () {
    console.log('[stretch-rope] Inicializando componente de corda esticável.');

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
    console.log('[stretch-rope] Corda adicionada ao scene para pré-carregamento.');

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

    const warningThreshold = this.data.breakDistance * 0.7;
    if (distance > warningThreshold) {
      this.material.color.set(0xff0000);
    } else {
      this.material.color.set(0x4c3b30);
    }

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

// ===============================
// ANIMAÇÃO DE PERSONAGENS NOS KAYAKS - CORRIGIDO
// ===============================

AFRAME.registerComponent('boat-character-animation', {
  schema: {
    characterClass: { type: 'string', default: '.player-character' },
    boatComponent: { type: 'string', default: 'player-boat' },
    minSpeed: { type: 'number', default: 0.3 },
    maxSpeed: { type: 'number', default: 2.5 },
    deceleration: { type: 'number', default: 0.92 },
    stopThreshold: { type: 'number', default: 0.7 },
    minimumAnimSpeed: { type: 'number', default: 0.6 }
  },

  init() {
    this.boatController = null;
    this.characterModel = null;
    this.currentAnimSpeed = 0;
    this.targetAnimSpeed = 0;
    this.shouldStop = false;
    this.mixer = null;
    this.action = null;
    this.initialized = false;
    this.retryCount = 0;
    this.maxRetries = 100; // Aumentei para dar mais tempo

    console.log(`[boat-character-animation] Inicializando para ${this.data.boatComponent}`);

    // Busca o personagem
    this.characterModel = this.el.querySelector(this.data.characterClass);

    if (!this.characterModel) {
      console.error(`[boat-character-animation] Personagem não encontrado: ${this.data.characterClass}`);
      return;
    }

    // Setup do modelo
    this.setupCharacterModel();
  },

  setupCharacterModel() {
    const setupAnimation = () => {
      console.log(`[boat-character-animation] Modelo carregado para ${this.data.boatComponent}`);

      if (!this.characterModel.components['animation-mixer']) {
        this.characterModel.setAttribute('animation-mixer', {
          clip: '*',
          loop: 'repeat',
          timeScale: 0
        });
      }

      this.characterModel.setAttribute('visible', true);

      // Aguarda o mixer ser inicializado
      setTimeout(() => {
        const mixerComp = this.characterModel.components['animation-mixer'];
        if (mixerComp && mixerComp.mixer) {
          this.mixer = mixerComp.mixer;
          if (this.mixer._actions && this.mixer._actions.length > 0) {
            this.action = this.mixer._actions[0];
            console.log(`[boat-character-animation] Ação de animação encontrada para ${this.data.boatComponent}`);
            this.initialized = true;
          } else {
            console.warn(`[boat-character-animation] Nenhuma ação encontrada no mixer`);
          }
        } else {
          console.warn(`[boat-character-animation] Mixer não inicializado`);
        }
        this._setAnimationSpeed(this.characterModel, 0);
      }, 200);
    };

    if (this.characterModel.getObject3D('mesh')) {
      setupAnimation();
    } else {
      this.characterModel.addEventListener('model-loaded', setupAnimation);
    }
  },

  tick(time, deltaTime) {
    // 🔧 FIX: Busca o controlador com retry e validação robusta
    if (!this.boatController) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        
        // Tenta buscar o componente
        const component = this.el.components[this.data.boatComponent];
        
        if (component && component.velocity !== undefined) {
          this.boatController = component;
          console.log(`[boat-character-animation] ✅ Controlador encontrado: ${this.data.boatComponent} (tentativa ${this.retryCount})`);
        }
        
        // Não bloqueia a renderização enquanto procura
        if (!this.boatController) {
          return;
        }
      } else {
        console.error(`[boat-character-animation] ❌ Falha ao encontrar ${this.data.boatComponent} após ${this.maxRetries} tentativas`);
        // Desabilita o componente para não ficar tentando infinitamente
        this.el.removeAttribute('boat-character-animation');
        return;
      }
    }

    // Só continua se estiver completamente inicializado
    if (!this.initialized || !this.characterModel) {
      return;
    }

    // Calcula velocidade alvo baseada na velocidade do barco
    const velocity = this.boatController.velocity || 0;
    const maxVelocity = this.boatController.data.maxSpeed;
    const velocityNorm = Math.min(1, Math.max(0, velocity / maxVelocity));

    if (velocity > 0.1) {
      this.targetAnimSpeed = this.data.minSpeed +
        (this.data.maxSpeed - this.data.minSpeed) * velocityNorm;
      this.shouldStop = false;
    } else {
      this.targetAnimSpeed = 0;
      this.shouldStop = true;
    }

    // Verifica se deve parar em posição favorável
    if (this.shouldStop && this.currentAnimSpeed <= this.data.stopThreshold) {
      if (this._isInFavorablePosition()) {
        this.currentAnimSpeed = 0;
        this._setAnimationSpeed(this.characterModel, 0);
        return;
      } else {
        this.currentAnimSpeed = this.data.stopThreshold;
        this._setAnimationSpeed(this.characterModel, this.currentAnimSpeed);
        return;
      }
    }

    // Interpola suavemente a velocidade da animação
    const delta = Math.min(deltaTime / 1000, 0.1);
    if (this.currentAnimSpeed > this.targetAnimSpeed) {
      this.currentAnimSpeed = this.currentAnimSpeed * Math.pow(this.data.deceleration, delta * 60);
      this.currentAnimSpeed = Math.max(this.currentAnimSpeed, this.data.minimumAnimSpeed);
      if (this.currentAnimSpeed < 0.01 && !this.shouldStop) {
        this.currentAnimSpeed = 0;
      }
    } else {
      const lerpFactor = 1 - Math.pow(0.001, delta);
      this.currentAnimSpeed += (this.targetAnimSpeed - this.currentAnimSpeed) * lerpFactor;
    }

    this._setAnimationSpeed(this.characterModel, this.currentAnimSpeed);
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

    const mixer = el.components['animation-mixer'];
    if (!mixer || !mixer.mixer) return;

    mixer.data.timeScale = speed;

    if (mixer.mixer && mixer.mixer._actions) {
      mixer.mixer._actions.forEach(action => {
        action.timeScale = speed;
        action.paused = false;
      });
    }
  }
});

// ===============================
// COMPONENTE KILL-CUBES
// ===============================

AFRAME.registerComponent('kill-cubes', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      console.log('[kill-cubes] Procurando cubos para remover...');

      let cubesRemoved = 0;

      this.el.object3D.traverse((node) => {
        if (node.isMesh) {
          const name = node.name.toLowerCase();
          const geometry = node.geometry;

          const isCube = name.includes('cube') ||
            name.includes('box') ||
            (geometry && geometry.type === 'BoxGeometry');

          const isDebugObject = geometry &&
            geometry.attributes.position &&
            geometry.attributes.position.count === 24;

          if (isCube || isDebugObject) {
            console.log(`[kill-cubes] 🗑️ Removendo: ${node.name || 'unnamed'} (${geometry?.type || 'unknown'})`);
            node.visible = false;

            if (node.parent) {
              node.parent.remove(node);
              cubesRemoved++;
            }
          }
        }
      });

      if (cubesRemoved > 0) {
        console.log(`[kill-cubes] ✔ ${cubesRemoved} cubo(s) removido(s)`);
      } else {
        console.log('[kill-cubes] ℹ️ Nenhum cubo encontrado');
      }
    });
  }
});