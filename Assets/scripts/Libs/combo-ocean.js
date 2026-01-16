/* global AFRAME, THREE */

/**
 * Combo Ocean – refatorado SEM quebrar compatibilidade
 * ----------------------------------------------------
 * Estrutura original preservada:
 * - getOceanHeightAt GLOBAL (mesmo nome)
 * - float-on-ocean continua chamando getOceanHeightAt
 * - Primitive a-ocean-plane mantida
 * - Componentes wobble-* mantidos (apenas melhorados)
 *
 * Melhorias aplicadas:
 * - Água menos reflexiva
 * - Sem transparência excessiva
 * - Normal map mais suave
 * - Correção de bug no normalScale
 * - Código organizado e comentado
 */

/* ===========================
 * NORMAL MAP ANIMADO (mantém nome original)
 * =========================== */
AFRAME.registerComponent('wobble-normal', {
  schema: {},
  tick: function (t) {
    const mat = this.el.components.material?.material;
    if (!mat || !mat.normalMap) return;

    mat.normalMap.offset.x += 0.00005 * Math.sin(t / 8000);
    mat.normalMap.offset.y += 0.00005 * Math.cos(t / 9000);

    // BUG CORRIGIDO (antes setava x duas vezes)
    mat.normalScale.x = 0.35 + 0.15 * Math.cos(t / 1200);
    mat.normalScale.y = 0.35 + 0.15 * Math.sin(t / 1400);
  }
});

/* ===========================
 * ONDAS NA GEOMETRIA (mantém nome original)
 * =========================== */
AFRAME.registerComponent('wobble-geometry', {
  schema: {
    amplitude: { default: 0.12 },
    amplitudeVariance: { default: 0.25 },
    speed: { default: 0.25 },
    speedVariance: { default: 2 }
  },

  play: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;

    this.geometry = mesh.geometry;
    const pos = this.geometry.getAttribute('position');

    this.waves = [];
    for (let i = 0; i < pos.count; i++) {
      this.waves.push({
        z: pos.getZ(i),
        ang: Math.random() * Math.PI * 2,
        amp: this.data.amplitude + Math.random() * this.data.amplitudeVariance,
        speed:
          (this.data.speed +
            Math.random() * this.data.speedVariance) / 1000
      });
    }
  },

  tick: function (_, dt) {
    if (!dt || !this.geometry) return;

    const pos = this.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const w = this.waves[i];
      pos.setZ(i, w.z + Math.sin(w.ang) * w.amp);
      w.ang += w.speed * dt;
    }

    pos.needsUpdate = true;
  }
});

/* ===========================
 * PRIMITIVE ORIGINAL (mantido)
 * =========================== */
AFRAME.registerPrimitive('a-ocean-plane', {
  defaultComponents: {
    geometry: {
      primitive: 'plane',
      width: 100,
      height: 4000,
      segmentsWidth: 10,
      segmentsHeight: 400
    },
    rotation: '-90 0 0',
    material: {
      shader: 'standard',
      color: 'rgba(38, 113, 171, 1)',

      // 🔥 equilíbrio entre reflexo e suavidade
      metalness: 0.05,
      roughness: 0.7,
      reflectivity: 0.4,

      // 🌊 transparência leve
      opacity: 0.75,
      transparent: true,

      // 🌫️ ajuda no realismo quando tem envMap
      envMapIntensity: 0.35,

      normalMap: 'url(/Assets/scenario/images/waternormals.jpg)',
      normalTextureRepeat: '2 80',
      normalScale: '0.35 0.35'
    },
    'wobble-normal': {},
    'wobble-geometry': {}
  }
});

/* ===========================
 * FUNÇÃO GLOBAL – NÃO MUDAR NOME
 * =========================== */
function getOceanHeightAt(worldX, worldZ, oceanEl) {
  const mesh = oceanEl.getObject3D('mesh');
  if (!mesh) return 0;

  const geometry = mesh.geometry;
  const pos = geometry.getAttribute('position');

  const segW = geometry.parameters.widthSegments;
  const segH = geometry.parameters.heightSegments;
  const width = geometry.parameters.width;
  const height = geometry.parameters.height;

  const vertsX = segW + 1;

  const local = new THREE.Vector3(worldX, 0, worldZ);
  mesh.parent.worldToLocal(local);

  const x = THREE.MathUtils.clamp(local.x + width / 2, 0, width);
  const y = THREE.MathUtils.clamp(local.y + height / 2, 0, height);

  const cellW = width / segW;
  const cellH = height / segH;

  const col = Math.min(segW - 1, Math.floor(x / cellW));
  const row = Math.min(segH - 1, Math.floor(y / cellH));

  const i00 = (row * vertsX + col) * 3;
  const i10 = (row * vertsX + col + 1) * 3;
  const i01 = ((row + 1) * vertsX + col) * 3;
  const i11 = ((row + 1) * vertsX + col + 1) * 3;

  const z00 = pos.array[i00 + 2];
  const z10 = pos.array[i10 + 2];
  const z01 = pos.array[i01 + 2];
  const z11 = pos.array[i11 + 2];

  const tx = (x - col * cellW) / cellW;
  const ty = (y - row * cellH) / cellH;

  const z0 = z00 * (1 - tx) + z10 * tx;
  const z1 = z01 * (1 - tx) + z11 * tx;
  const localZ = z0 * (1 - ty) + z1 * ty;

  const worldPoint = new THREE.Vector3(local.x, local.y, localZ);
  mesh.parent.localToWorld(worldPoint);

  return worldPoint.y;
}

/* ===========================
 * FLOAT-ON-OCEAN (INALTERADO)
 * =========================== */
AFRAME.registerComponent('float-on-ocean', {
  schema: {
    oceanId: { type: 'string', default: 'ocean' }
  },

  init: function () {
    this.oceanEl = document.getElementById(this.data.oceanId);
    this.tempPos = new THREE.Vector3();
  },

  tick: function () {
    if (!this.oceanEl) return;

    const worldPos = this.el.object3D.getWorldPosition(this.tempPos);
    const waveY = getOceanHeightAt(
      worldPos.x,
      worldPos.z,
      this.oceanEl
    );

    worldPos.y = waveY + 0.2;

    this.el.object3D.rotation.x =
      Math.sin(performance.now() / 500) * 0.02;
    this.el.object3D.rotation.z =
      Math.cos(performance.now() / 500) * 0.02;

    this.el.object3D.position.copy(worldPos);
  }
});
