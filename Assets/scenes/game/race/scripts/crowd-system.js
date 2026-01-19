// crowd-system.js(//Controla animações e rotação da torcida

AFRAME.registerComponent('crowd-react', {
    init() {
        this.normalSpeed = 1;
        this.cheerSpeed = 1.8;
        this.lastBoat = null;

        document.addEventListener('crowdEnter', () => {
            this.setSpeed(this.cheerSpeed);
        });

        document.addEventListener('crowdExit', () => {
            this.setSpeed(this.normalSpeed);
        });
    },

    tick() {
        // Só atualiza rotação se a corrida começou
        if (!window.raceStarted) return;

        // Busca todos os barcos
        const boats = Array.from(document.querySelectorAll('#boat, .bot-boat'));
        
        if (boats.length === 0) return;

        // Encontra o barco em último lugar (maior Z)
        let lastBoat = boats[0];
        let maxZ = boats[0].object3D.position.z;

        boats.forEach(boat => {
            const z = boat.object3D.position.z;
            if (z > maxZ) {
                maxZ = z;
                lastBoat = boat;
            }
        });

        // Calcula a direção para o último barco
        const crowdPos = this.el.object3D.position;
        const boatPos = lastBoat.object3D.position;

        const dx = boatPos.x - crowdPos.x;
        const dz = boatPos.z - crowdPos.z;

        // Calcula o ângulo em radianos
        const angleRad = Math.atan2(dx, dz);
        
        // Converte para graus
        const angleDeg = THREE.MathUtils.radToDeg(angleRad);

        // Atualiza a rotação Y do personagem
        this.el.object3D.rotation.y = angleRad;
    },

    setSpeed(speed) {
        const mixer = this.el.components['animation-mixer'];
        if (mixer) {
            mixer.timeScale = speed;
        }
    }
});

AFRAME.registerComponent('track-player-z', {
  schema: {
    targetEntity: { type: 'string', default: '#boat' },
    updateInterval: { type: 'number', default: 100 } // atualiza a cada 100ms
  },

  init: function() {
    this.targetBoat = null;
    this.lastUpdateTime = 0;
    this.soundEffects = null;
  },

  tick: function(time, deltaTime) {
    // Encontra o barco se ainda não foi encontrado
    if (!this.targetBoat) {
      this.targetBoat = document.querySelector(this.data.targetEntity);
      if (!this.targetBoat) return;
    }

    // Encontra o sistema de som se ainda não foi encontrado
    if (!this.soundEffects && window.soundEffects) {
      this.soundEffects = window.soundEffects;
    }

    // Atualiza baseado no intervalo configurado
    if (time - this.lastUpdateTime >= this.data.updateInterval) {
      this.lastUpdateTime = time;
      
      // Obtém a posição Z do barco
      const playerZ = this.targetBoat.object3D.position.z;
      
      // Executa a função updateByPlayerZ se o soundEffects existir
      if (this.soundEffects && typeof this.soundEffects.updateByPlayerZ === 'function') {
        this.soundEffects.updateByPlayerZ(playerZ);
      }
    }
  }
});