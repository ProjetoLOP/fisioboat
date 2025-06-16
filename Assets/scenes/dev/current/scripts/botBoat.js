// Componente para controlar o botBarco
AFRAME.registerComponent('bot-boat', {
  schema: {
    acceleration: { type: 'number', default: 7.77 },
    drag:         { type: 'number', default: 0.3 },
    maxSpeed:     { type: 'number', default: 7.77 }
  },

  init() {
    this.velocity    = 0;
    this.isRacing    = false;
    this.isRopeBroken= false;

    window.addEventListener('keydown', e => {
      if (e.key === ' ' && !this.isRopeBroken) this.isRacing = true;
    });
    window.addEventListener('squatDetected', () => {
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

        // Carrega textura
        const textureLoader = new THREE.TextureLoader();
        const ropeTexture = textureLoader.load('/Assets/scenario/textures/rope.jpg');
        ropeTexture.wrapS = ropeTexture.wrapT = THREE.RepeatWrapping;
        ropeTexture.repeat.set(1, 4);

        // Material
        const material = new THREE.MeshStandardMaterial({
            map: ropeTexture,
            color: 0x4c3b30,
            emissive: 0x222222,
            transparent: false
        });

        // Geometria inicial
        const initialCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
        ]);
        this.geometry = new THREE.TubeGeometry(initialCurve, 20, 0.05, 8, false);
        this.ropeMesh = new THREE.Mesh(this.geometry, material);
        this.ropeMesh.frustumCulled = false;

        // 1) Adiciona ao scene para pré‑carregamento
        this.el.sceneEl.object3D.add(this.ropeMesh);
        console.log('[stretch-rope] Corda adicionada ao scene para pré‑carregamento.');

        // Estado inicial: quebrada se startBroken=true
        this.ropeBroken = this.data.startBroken;

        // Listener existente para restaurar
        this.el.addEventListener('ropeRestore', () => {
            if (this.ropeBroken) {
                this.ropeBroken = false;
                if (!this.el.sceneEl.object3D.children.includes(this.ropeMesh)) {
                    this.el.sceneEl.object3D.add(this.ropeMesh);
                }
                console.log('[stretch-rope] Corda restaurada (via ropeRestore).');
            }
        });

        // Novo listener para ropeRemove, chamando a sua lógica de remove()
        this.el.addEventListener('ropeRemove', () => {
            this.remove();
        });

        // 2) Dispara os eventos de “pré‑aquecimento”
        //    a) garante que passe pela lógica de restauração
        this.el.emit('ropeRestore');
        //    b) remove logo em seguida, sem lag

        setTimeout(() => {
          this.el.emit('ropeRemove');
        }, 200)
    },

    tick: function () {
        if (this.ropeBroken) return;

        // Atualiza transformações
        this.el.object3D.updateMatrixWorld(true);
        this.data.target.object3D.updateMatrixWorld(true);

        // Calcula posições mundiais
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

        // Distância e quebra
        const distance = startWorld.distanceTo(endWorld);
        if (distance > this.data.breakDistance) {
            console.log(
                `[stretch-rope] Distância excedida (${distance.toFixed(2)} > ${this.data.breakDistance}). Corda rompida.`
            );
            this.el.sceneEl.object3D.remove(this.ropeMesh);
            this.ropeBroken = true;
            this.el.emit('ropeBroken', { distance });
            return;
        }

        // Calcula sag
        const midpoint = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);
        let sag = 0;
        if (distance < this.data.slackThreshold) {
            sag = this.data.maxSag * (1 - distance / this.data.slackThreshold);
        }
        midpoint.y -= sag;

        // Atualiza geometria
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
