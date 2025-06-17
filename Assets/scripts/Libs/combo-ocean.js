/* global AFRAME */

// Combo of Ada's ocean plane and Don's a-ocean component
// Original source ada: https://samsunginter.net/a-frame-components/dist/ocean-plane.js
// Original source don: https://github.com/c-frame/aframe-extras/blob/master/src/primitives/a-ocean.js

AFRAME.registerComponent('wobble-normal', {
  schema: {},
  tick: function (t) {
    if (!this.el.components.material.material.normalMap) return;
    this.el.components.material.material.normalMap.offset.x += 0.0001 * Math.sin(t / 10000);
    this.el.components.material.material.normalMap.offset.y += 0.0001 * Math.cos(t / 8000);
    this.el.components.material.material.normalScale.x = 0.5 + 0.5 * Math.cos(t / 1000);
    this.el.components.material.material.normalScale.x = 0.5 + 0.5 * Math.sin(t / 1200);
  }
});

AFRAME.registerComponent('wobble-geometry', {
  schema: {
    // Wave amplitude and variance.
    amplitude: {default: 0.1},
    amplitudeVariance: {default: 0.3},

    // Wave speed and variance.
    speed: {default: 0.25},
    speedVariance: {default: 2},
  },
  play: function () {
    let data = this.data;
    let geometry = this.geometry = this.el.object3D.children[0].geometry;

    this.waves = [];
    const posAttribute = geometry.getAttribute('position');
    for (let i = 0; i < posAttribute.count; i++) {
      this.waves.push({
        z: posAttribute.getZ(i),
        ang: Math.random() * Math.PI * 2,
        amp: data.amplitude + Math.random() * data.amplitudeVariance,
        speed: (data.speed + Math.random() * data.speedVariance) / 1000 // radians / frame
      });
    }
  },
  tick: function (t, dt) {
    if (!dt) return;

    const posAttribute = this.geometry.getAttribute('position');
    for (let i = 0; i < posAttribute.count; i++){
      const vprops = this.waves[i];
      const value = vprops.z + Math.sin(vprops.ang) * vprops.amp;
      posAttribute.setZ(i, value);
      vprops.ang += vprops.speed * dt;
    }
    posAttribute.needsUpdate = true;
  }
});

AFRAME.registerPrimitive('a-ocean-plane', {
  defaultComponents: {
    geometry: {
      primitive: 'plane',
      height: 4000,
      width: 4000,
      segmentsHeight: 100,
      segmentsWidth: 100
    },
    rotation: '-90 0 0',
    material: {
      shader: 'standard',
      color: '#8ab39f',
      metalness: 1,
      roughness: 0.2,
      normalMap: 'url(https://assets.3dstreet.app/materials/waternormals.jpg)',
      normalTextureRepeat: '50 50',
      normalTextureOffset: '0 0',
      normalScale: '0.5 0.5',
      opacity: 0.8
    },
    'wobble-normal': {},
    'wobble-geometry': {},
  }
});

AFRAME.registerComponent('float-on-ocean', {
  schema: { oceanId: { type: 'string', default: 'ocean' } },

  init: function () {
      this.oceanEl = document.getElementById(this.data.oceanId);
      this.tempPos = new THREE.Vector3();
  },

  tick: function () {
      if (!this.oceanEl) return;

      // Pegar posição X, Z do objeto em coordenadas de mundo
      const worldPos = this.el.object3D.getWorldPosition(this.tempPos);

      // Obter a altura do oceano naquele X,Z
      const waveY = getOceanHeightAt(worldPos.x, worldPos.z, this.oceanEl);

      // Ajustar Y do objeto para ficar na superfície
      // (talvez acrescente um offset se ele tiver um casco, etc.)
      worldPos.y = waveY + 0.2; // offset

      // Setar de volta no objeto
      this.el.object3D.position.copy(worldPos);
  }
});  

/**
 * Retorna a altura do oceano (em coordenadas de mundo) para um determinado (x, z) no mundo.
 * @param {Number} worldX Posição X em coordenadas de mundo.
 * @param {Number} worldZ Posição Z em coordenadas de mundo.
 * @param {Element} oceanEl Elemento <a-ocean-plane> (ou ID dele).
 * @returns {Number} Altura (Y, em coordenadas de mundo) naquele ponto.
 */
function getOceanHeightAt(worldX, worldZ, oceanEl) {
  // 1) Obter objeto Three.js (Mesh) do oceano
  const mesh = oceanEl.getObject3D('mesh');
  if (!mesh) { 
    console.warn('Oceano ainda não está carregado!');
    return 0;
  }
  const geometry = mesh.geometry;
  const positionAttr = geometry.getAttribute('position');
  
  // Número de subdivisões
  const segW = 100;
  const segH = 100;
  const vertsX = segW + 1; // 101
  const vertsY = segH + 1; // 101

  // Largura e altura do plano
  const planeHeight = 4000;
  const planeWidth  = 4000;
  
  // 2) Converter (worldX, worldZ) para coordenadas LOCAIS do plano
  //    Precisamos de um Vector3 para usar worldToLocal().
  const worldPos = new THREE.Vector3(worldX, 0, worldZ);
  mesh.parent.worldToLocal(worldPos); 
  // Agora, worldPos está em coordenadas locais do "oceanEl".
  // Por padrão, o THREE.PlaneGeometry vai de -width/2 até +width/2 em X,
  // e -height/2 até +height/2 em Y (antes de qualquer rotação).
  // Porém, lembrando que o 'rotation="-90 0 0"' faz o "eixo Y local" virar "eixo Z no mundo".
  // Ou seja, *dentro* do geometry, o eixo Y local é o que chamamos de "profundidade do plano",
  // e o Z local é a "altura da onda".
  //
  // Se não mexermos em rotação, a distribuição dos vértices é:
  //   x local: [-planeWidth/2, +planeWidth/2]
  //   y local: [-planeHeight/2, +planeHeight/2]
  //   z local: usado pelo "wobble" como a onda
  //
  // Então, no geometry, (x,y) são as coordenadas do plano e z é o "deslocamento da onda".
  // Vamos, portanto, tratar "worldPos.x" como localX e "worldPos.y" como localY
  // para encontrar o retângulo de vértices e ler a z (onda).

  const localX = worldPos.x; // deve variar de -750 a +750
  const localY = worldPos.y; // deve variar de -750 a +750 (pois, antes da rotação, era "height" em Y)
  
  // 3) Descobrir em qual célula da malha (grid) o ponto caiu
  //    Precisamos primeiro deslocar de [-750, +750] para [0, 1500]
  const x0 = localX + planeWidth / 2;
  const y0 = localY + planeHeight / 2;

  // Cada célula tem tamanho:
  const cellW = planeWidth  / segW;  // 1500 / 100 = 15
  const cellH = planeHeight / segH;  // 1500 / 100 = 15

  // Índices inteiros (col, row) na grid
  let col = Math.floor(x0 / cellW);
  let row = Math.floor(y0 / cellH);

  // Garantir que não saiam do grid
  col = THREE.MathUtils.clamp(col, 0, segW - 1); 
  row = THREE.MathUtils.clamp(row, 0, segH - 1);

  // 4) Obter os 4 vértices do quadrilátero que envolve (x0, y0)
  //    A organização padrão do PlaneGeometry (sem index invertido) é:
  //    row major, percorrendo X primeiro e depois Y. 
  //    i = (row * vertsX + col).
  function getVertIndex(col, row) {
    return (row * vertsX + col);
  }

  function getXYZ(col, row) {
    // Pega o índice base no array "position"
    const idxBase = getVertIndex(col, row) * 3; 
    return new THREE.Vector3(
      positionAttr.getX(getVertIndex(col, row)),
      positionAttr.getY(getVertIndex(col, row)),
      positionAttr.getZ(getVertIndex(col, row))
    );
  }

  // Cantos:
  const v00 = getXYZ(col,   row);     // canto inferior-esquerdo do cell
  const v10 = getXYZ(col+1, row);     // canto inferior-direito
  const v01 = getXYZ(col,   row+1);   // canto superior-esquerdo
  const v11 = getXYZ(col+1, row+1);   // canto superior-direito

  // Coordenadas (no plano local) desses cantos (x,y). z neles é a altura da onda.
  // Precisamos fazer a interpolação bilinear em z, mas usando (x,y) para achar o peso.
  const xLeft   = -planeWidth/2  + col   * cellW; 
  const xRight  = -planeWidth/2  + (col+1) * cellW;
  const yBottom = -planeHeight/2 + row   * cellH;
  const yTop    = -planeHeight/2 + (row+1) * cellH;

  // Frações de interpolação [0..1]
  const tx = (localX - xLeft) / (xRight - xLeft);
  const ty = (localY - yBottom) / (yTop - yBottom);

  // Interpolamos as alturas (z) nos 4 cantos
  //   Observação: no geometry, vXX.z é o “deslocamento da onda”.
  //   vXX.x e vXX.y são as coordenadas do plano.
  const z00 = v00.z;
  const z10 = v10.z;
  const z01 = v01.z;
  const z11 = v11.z;

  // Interpolação bilinear em z
  const z0 = z00 * (1 - tx) + z10 * tx;  // linha de baixo
  const z1 = z01 * (1 - tx) + z11 * tx;  // linha de cima
  const localZ = z0 * (1 - ty) + z1 * ty; // valor final em coordenadas LOCAIS

  // 5) Precisamos converter esse ponto local (x, y, z=onda) de volta para mundo
  const localPoint = new THREE.Vector3(localX, localY, localZ);
  mesh.parent.localToWorld(localPoint);
  
  // A coordenada final .y do localPoint será a "altura no mundo"
  // (pois a rotação -90° faz com que o z local vire y no mundo).
  return localPoint.y;
}