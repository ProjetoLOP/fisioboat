AFRAME.registerComponent('boat-controls', {
    init: function () {
        window.addEventListener('keydown', (event) => {
            const position = this.el.getAttribute('position');
            switch (event.key) {
                case ' ':
                    position.z -= 0.1;
                    break;
            }
            this.el.setAttribute('position', position);
        });
    }
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