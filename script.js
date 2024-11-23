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