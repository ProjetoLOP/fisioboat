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

AFRAME.registerComponent('dynamic-rope', {
    schema: {
        target: { type: 'selector' },  // Barco bot
        attachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: 2 } },       // Ponto de conexão no seu barco (por exemplo, a frente)
        targetAttachPoint: { type: 'vec3', default: { x: 0, y: 0.5, z: -2 } },  // Ponto de conexão no barco bot (por exemplo, a parte de trás)
        breakDistance: { type: 'number', default: 20 } // Distância limite para rompimento da corda
    },
    init: function () {
        console.log('[dynamic-rope] Inicializando componente de corda dinâmica.');
        // Cria o material com cor preta e grossura aumentada
        const material = new THREE.LineBasicMaterial({
            color: 0x000000,   // Cor preta
            linewidth: 5       // Grossura (atenção: pode não funcionar no WebGL padrão)
        });
        const points = [new THREE.Vector3(), new THREE.Vector3()];
        this.geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.line = new THREE.Line(this.geometry, material);
        // Desabilita frustum culling para garantir que a linha seja sempre renderizada
        this.line.frustumCulled = false;
        // Adiciona a linha à cena (usando coordenadas mundiais)
        this.el.sceneEl.object3D.add(this.line);
        this.ropeBroken = false;
        console.log('[dynamic-rope] Linha adicionada à cena.');
    },
    tick: function () {
        if (this.ropeBroken) return;

        // Atualiza as matrizes para garantir transformações corretas
        this.el.object3D.updateMatrixWorld(true);
        this.data.target.object3D.updateMatrixWorld(true);

        // Converte o ponto de conexão do seu barco para coordenadas mundiais
        const localAttach = new THREE.Vector3(this.data.attachPoint.x, this.data.attachPoint.y, this.data.attachPoint.z);
        const worldAttach = this.el.object3D.localToWorld(localAttach.clone());

        // Converte o ponto de conexão do barco bot para coordenadas mundiais
        const localTargetAttach = new THREE.Vector3(this.data.targetAttachPoint.x, this.data.targetAttachPoint.y, this.data.targetAttachPoint.z);
        const worldTargetAttach = this.data.target.object3D.localToWorld(localTargetAttach.clone());

        // Calcula a distância entre os dois pontos
        const distance = worldAttach.distanceTo(worldTargetAttach);

        // Se a distância ultrapassar o limite, a corda se rompe
        if (distance > this.data.breakDistance) {
            console.log('[dynamic-rope] Distância excedida (' + distance + ' > ' + this.data.breakDistance + '). Corda rompida.');
            this.el.sceneEl.object3D.remove(this.line);
            this.ropeBroken = true;
            // Emite um evento caso queira acoplar alguma lógica ao rompimento
            this.el.emit('ropeBroken', { distance: distance });
            return;
        }

        // Atualiza os vértices da linha com as novas posições
        const positions = this.geometry.attributes.position.array;
        positions[0] = worldAttach.x;
        positions[1] = worldAttach.y;
        positions[2] = worldAttach.z;
        positions[3] = worldTargetAttach.x;
        positions[4] = worldTargetAttach.y;
        positions[5] = worldTargetAttach.z;
        this.geometry.attributes.position.needsUpdate = true;
    },
    remove: function () {
        if (this.line) {
            this.el.sceneEl.object3D.remove(this.line);
            console.log('[dynamic-rope] Linha removida.');
        }
    }
});