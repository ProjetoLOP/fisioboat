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

AFRAME.registerComponent('textured-rope', {
    schema: {
        target: { type: 'selector' },  // Barco bot
        attachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: 2 } },       // Ponto de conexão no seu barco (ex: a frente)
        targetAttachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -2 } },  // Ponto de conexão no barco bot (ex: a parte de trás)
        breakDistance: { type: 'number', default: 20 } // Distância limite para rompimento da corda
    },
    init: function () {
        console.log('[textured-rope] Inicializando componente de corda realista.');
        const textureLoader = new THREE.TextureLoader();
        // Substitua o caminho abaixo pela URL da sua textura de corda
        const ropeTexture = textureLoader.load('/Assets/scenario/textures/rope.jpg');
        ropeTexture.wrapS = ropeTexture.wrapT = THREE.RepeatWrapping;
        ropeTexture.repeat.set(1, 4);

        // Material com a textura
        const material = new THREE.MeshStandardMaterial({
            map: ropeTexture,
            color: 0x4c3b30,   // Amarelo dourado
            emissive: 0x222222, // Um toque para evidenciar a cor, se necessário
            transparent: false
        });

        // Cria a geometria de um cilindro fino com comprimento 1 (no eixo Y)
        this.geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true);
        this.ropeMesh = new THREE.Mesh(this.geometry, material);
        this.ropeMesh.frustumCulled = false;

        // Adiciona a malha da corda à cena (em coordenadas mundiais)
        this.el.sceneEl.object3D.add(this.ropeMesh);
        this.ropeBroken = false;
    },
    tick: function () {
        if (this.ropeBroken) return;

        // Atualiza as matrizes para garantir as transformações corretas
        this.el.object3D.updateMatrixWorld(true);
        this.data.target.object3D.updateMatrixWorld(true);

        // Converte os pontos de conexão para coordenadas mundiais
        const startLocal = new THREE.Vector3(this.data.attachPoint.x, this.data.attachPoint.y, this.data.attachPoint.z);
        const endLocal = new THREE.Vector3(this.data.targetAttachPoint.x, this.data.targetAttachPoint.y, this.data.targetAttachPoint.z);
        const startWorld = this.el.object3D.localToWorld(startLocal.clone());
        const endWorld = this.data.target.object3D.localToWorld(endLocal.clone());

        // Calcula a distância entre os pontos
        const distance = startWorld.distanceTo(endWorld);
        if (distance > this.data.breakDistance) {
            console.log('[textured-rope] Distância excedida (' + distance + ' > ' + this.data.breakDistance + '). Corda rompida.');
            this.el.sceneEl.object3D.remove(this.ropeMesh);
            this.ropeBroken = true;
            this.el.emit('ropeBroken', { distance: distance });
            return;
        }

        // Posiciona a corda no meio entre os dois pontos
        const midpoint = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);
        this.ropeMesh.position.copy(midpoint);

        // Ajusta a escala para que o cilindro tenha o comprimento da distância calculada
        this.ropeMesh.scale.set(1, distance, 1);

        // Calcula a rotação necessária para alinhar o cilindro (eixo Y) com a direção entre os pontos
        const direction = new THREE.Vector3().subVectors(endWorld, startWorld).normalize();
        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);
        this.ropeMesh.quaternion.copy(quaternion);
    },
    remove: function () {
        if (this.ropeMesh) {
            this.el.sceneEl.object3D.remove(this.ropeMesh);
            console.log('[textured-rope] Corda removida.');
        }
    }
});