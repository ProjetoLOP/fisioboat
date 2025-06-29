// Componente para controlar o botBarco
AFRAME.registerComponent('bot-boat', {
    schema: {
        acceleration: { type: 'number', default: 7.77 }, // Taxa de aceleração
        deceleration: { type: 'number', default: 0.03 }, // Taxa de desaceleração
        maxSpeed: { type: 'number', default: 7.77 }         // Velocidade máxima permitida
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

        // // Anti queda do abismo
        // if (botCurrentPosition.z < -250) {
        //     botCurrentPosition.z = 0;
        // }

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



// Componente para a corda esticável entre os barcos
AFRAME.registerComponent('stretch-rope', {
    schema: {
        target: { type: 'selector' },               // Referência para o botBarco
        attachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: 2 } },   // Ponto de conexão no barco do player
        targetAttachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -2 } },  // Ponto de conexão no botBarco
        breakDistance: { type: 'number', default: 20 },     // Distância para rompimento da corda
        slackThreshold: { type: 'number', default: 10 },     // Distância até a qual a corda terá folga (sag)
        maxSag: { type: 'number', default: 2 },      // Altura máxima de sag
        startBroken: { type: 'boolean', default: false } // Se true, começa com a corda “quebrada” (não renderiza)
    },

    init: function () {
        console.log('[stretch-rope] Inicializando componente de corda esticável.');

        // Carrega a textura da corda
        const textureLoader = new THREE.TextureLoader();
        const ropeTexture = textureLoader.load('/Assets/scenario/textures/rope.jpg');
        ropeTexture.wrapS = ropeTexture.wrapT = THREE.RepeatWrapping;
        ropeTexture.repeat.set(1, 4);

        // Cria material para a corda
        const material = new THREE.MeshStandardMaterial({
            map: ropeTexture,
            color: 0x4c3b30,
            emissive: 0x222222,
            transparent: false
        });

        // Geometria inicial da corda (ajustada a cada tick)
        const initialCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
        ]);
        this.geometry = new THREE.TubeGeometry(initialCurve, 20, 0.05, 8, false);
        this.ropeMesh = new THREE.Mesh(this.geometry, material);
        this.ropeMesh.frustumCulled = false;

        // Define estado inicial
        this.ropeBroken = this.data.startBroken;

        // Adiciona à cena apenas se não começar quebrado
        if (!this.data.startBroken) {
            this.el.sceneEl.object3D.add(this.ropeMesh);
            console.log('[stretch-rope] Corda adicionada à cena.');
        } else {
            console.log('[stretch-rope] Começando com a corda quebrada (não adicionada).');
        }

        // Listener para restaurar a corda
        this.el.addEventListener('ropeRestore', () => {
            if (this.ropeBroken) {
                this.ropeBroken = false;
                if (!this.el.sceneEl.object3D.children.includes(this.ropeMesh)) {
                    this.el.sceneEl.object3D.add(this.ropeMesh);
                }
                console.log('[stretch-rope] Corda restaurada.');
            }
        });
    },

    tick: function () {
        if (this.ropeBroken) return;

        // Atualiza matrizes de mundo
        this.el.object3D.updateMatrixWorld(true);
        this.data.target.object3D.updateMatrixWorld(true);

        // Pontos de conexão em coordenadas mundiais
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

        // Distância entre os barcos
        const distance = startWorld.distanceTo(endWorld);
        if (distance > this.data.breakDistance) {
            console.log(
                `[stretch-rope] Distância excedida (${distance.toFixed(2)} > ${this.data.breakDistance}). Corda rompida.`
            );
            this.el.sceneEl.object3D.remove(this.ropeMesh);
            this.ropeBroken = true;
            this.el.emit('ropeBroken', { distance: distance });
            return;
        }

        // Calcula o sag com base na folga
        const midpoint = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);
        let sag = 0;
        if (distance < this.data.slackThreshold) {
            sag = this.data.maxSag * (1 - distance / this.data.slackThreshold);
        }
        midpoint.y -= sag;

        // Atualiza a geometria da corda
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
            console.log('[stretch-rope] Corda removida.');
        }
    }
});  