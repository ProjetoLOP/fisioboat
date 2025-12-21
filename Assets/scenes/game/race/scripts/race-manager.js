// ===============================
// RACE MANAGER - Gerenciamento da corrida
// ===============================

let spaceLocked = false;

const freeCameraStartPos = new THREE.Vector3(-15, 6.5, -14);
const freeCameraStartRot = new THREE.Euler(0, THREE.MathUtils.degToRad(-140), 0);

// Função para mover a câmera suavemente até a posição do barco
function moveCameraToBoat(targetTime = 2500) {
    const freeCam = document.querySelector("#freeCamera");
    const boat = document.querySelector("#boat");

    const startPos = freeCam.object3D.position.clone();
    const targetPos = new THREE.Vector3();
    boat.object3D.getWorldPosition(targetPos);

    targetPos.y += 6.5;
    targetPos.z += 14;

    const controlPos = startPos.clone().lerp(targetPos, 0.5);
    controlPos.x -= 5;

    const curve = new THREE.QuadraticBezierCurve3(startPos, controlPos, targetPos);

    const startTime = performance.now();

    const startYRot = THREE.MathUtils.degToRad(-140);
    const endYRot = 0;

    function animate() {
        const now = performance.now();
        const t = Math.min((now - startTime) / targetTime, 1);

        const newPos = curve.getPoint(t);
        freeCam.object3D.position.copy(newPos);

        const newYRot = startYRot + (endYRot - startYRot) * t;
        freeCam.object3D.rotation.set(0, newYRot, 0);

        if (t < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// Mostra o countdown "3,2,1,GO" antes da corrida
function showCountdown(callback) {
    spaceLocked = true;
    const countdownUI = document.getElementById('countdownUI');
    const countdownEl = document.getElementById('countdownText');
    const sequence = ['3', '2', '1', 'GO'];
    let index = 0;

    countdownUI.style.display = 'block';
    countdownEl.style.display = 'inline-block';
    countdownEl.style.opacity = 1;

    moveCameraToBoat(2500);

    const showNext = () => {
        if (index < sequence.length) {
            countdownEl.textContent = sequence[index];
            countdownEl.style.opacity = 1;

            countdownEl.classList.remove('countdown-pulse', 'countdown-fade');
            void countdownEl.offsetWidth;
            countdownEl.classList.add('countdown-pulse');

            setTimeout(() => {
                countdownEl.classList.add('countdown-fade');
            }, 600);

            setTimeout(() => {
                index++;
                showNext();
            }, 1000);
        } else {
            countdownEl.style.display = 'none';
            spaceLocked = false;
            if (callback) callback();

            document.dispatchEvent(new Event('raceStart'));
        }
    };

    showNext();
}

// Mostra a dica "Pressione C" por alguns segundos após o início da corrida
function showCameraHint() {
    const hint = document.getElementById("cameraHint");
    hint.style.opacity = 1;
    setTimeout(() => {
        hint.style.opacity = 0;
    }, 5000);
}

// Função para ativar movimento dos barcos e trocar a câmera após o countdown
function enableBoatsMovement() {
    window.raceStartedTime = performance.now();
    window.raceStarted = true;

    document.querySelectorAll("#boat, .bot-boat").forEach(e => {
        if (e.components["bot-boat-movement"]) e.components["bot-boat-movement"].moving = true;
        if (e.components["boat-controls"]) e.components["boat-controls"].moving = true;
    });

    // Troca para POV do barco (3ª pessoa)
    const freeCam = document.querySelector("#freeCamera");
    const boatCam = document.querySelector("#boatCamera");
    freeCam.setAttribute("camera", "active", false);
    boatCam.setAttribute("camera", "active", true);

    showCameraHint();
}

// Inicia a corrida
function startGame() {

    document.dispatchEvent(new Event('gameStart'));
    document.querySelectorAll("#boat, .bot-boat").forEach(e => e.setAttribute("visible", true));
    document.getElementById("startUI").style.display = "none";
    document.getElementById("finishUI").style.display = "none";

    document.querySelectorAll("#boat, .bot-boat").forEach(e => {
        if (e.components["bot-boat-movement"]) e.components["bot-boat-movement"].moving = false;
        if (e.components["boat-controls"]) e.components["boat-controls"].moving = false;
    });

    const freeCam = document.querySelector("#freeCamera");
    const boatCam = document.querySelector("#boatCamera");
    freeCam.setAttribute("camera", "active", true);
    boatCam.setAttribute("camera", "active", false);

    showCountdown(enableBoatsMovement);
}

// Alternar câmeras com tecla C durante a corrida e lógica do espaço
document.addEventListener('keydown', (e) => {
    if (!e.key) return;

    if (e.key.toLowerCase() === "c" && window.raceStarted) {
        CameraSwitch();
    }

    if (e.key === 'Enter' && !spaceLocked) {
        if (window.allFinished) {
            resetRace();
            startGame();
        }
    }
});

// Estado atual da câmera (false = 3ª pessoa, true = POV)
let povActive = false;

function CameraSwitch() {
    const boat = document.querySelector("#boat");
    const cam3p = document.querySelector("#boatCamera");
    const camPov = document.querySelector("#boatCameraPov");

    const fromCam = povActive ? camPov : cam3p;
    const toCam = povActive ? cam3p : camPov;

    fromCam.setAttribute("camera", "active", false);
    toCam.setAttribute("camera", "active", true);

    povActive = !povActive;

    const toFollowData = toCam.getAttribute("follow");
    const toOffset = toFollowData.offset;
    const boatWorldPos = new THREE.Vector3();
    boat.object3D.getWorldPosition(boatWorldPos);

    const targetPos = boatWorldPos.clone().add(new THREE.Vector3(toOffset.x, toOffset.y, toOffset.z));
    toCam.object3D.position.copy(targetPos);
}

function resetCameraAnimation(callback) {
    const freeCam = document.querySelector('#freeCamera');

    freeCam.object3D.position.copy(freeCameraStartPos);
    freeCam.object3D.rotation.copy(freeCameraStartRot);

    moveCameraToBoat(2500);

    if (callback) {
        setTimeout(callback, 2500);
    }
}

function resetRace() {
    const freeCam = document.querySelector('#freeCamera');

    resetCameraAnimation();

    const checkFinishComp = document.querySelector('#boat').components['check-finish'];
    if (checkFinishComp) {
        checkFinishComp.finishedBoats = [];
        checkFinishComp.showCornerLeaderboard();
    }

    document.getElementById('finishUI').style.display = 'none';
    document.getElementById('leaderboard').innerHTML = '';
    document.getElementById('leaderboard-corner').style.display = 'block';

    document.querySelectorAll('#boat, .bot-boat').forEach((b) => {
        b.setAttribute('position',
            b.id === 'boat' ? '0 0.6 0' :
                b.id === 'bot1' ? '-10 0.6 0' :
                    b.id === 'bot2' ? '10 0.6 0' :
                        b.id === 'bot3' ? '5 0.6 0' :
                            '10 0.6 0'
        );

        if (b.components['boat-controls']) {
            b.components['boat-controls'].velocity = 0;
            b.components['boat-controls'].finished = false;
        }
        if (b.components['bot-boat-movement']) {
            b.components['bot-boat-movement'].data.speed = 0;
            b.components['bot-boat-movement'].moving = false;
        }
    });

    window.allFinished = false;
    window.raceStarted = false;
}

// ===============================
// COMPONENTE BOT BOAT MOVEMENT
// ===============================
AFRAME.registerComponent('bot-boat-movement', {
    schema: { speed: { type: 'number', default: 0 } },

    init: function () {
        this.moving = true;
        this.elapsedTime = 0;
        this.startupTime = 0;
        this.data.speed = 0;
        this.targetSpeed = 0;
        this.smoothFactor = 0.04;
        this.accelerationRate = 0.6 + Math.random() * 0.4;
        this.lastWaveY = 0;

        const spray = document.createElement('a-entity');
        spray.setAttribute('particle-system', {
            preset: 'dust',
            color: '#AEEFFF',
            particleCount: 300,
            size: 0.15,
            opacity: 0.4,
            direction: 'backward',
            velocityValue: '0 1.5 -5',
            positionSpread: '0.25 0.25 0.25'
        });
        spray.setAttribute('position', '0 0 -0.8');
        this.el.appendChild(spray);
        this.spray = spray;
    },

    tick: function (time, timeDelta) {
        if (!window.raceStarted || !this.moving) return;

        const delta = timeDelta / 1000;
        this.elapsedTime += delta;
        this.startupTime += delta;
        const ocean = document.getElementById('ocean');

        if (this.startupTime < 4) {
            const progress = Math.min(1, this.startupTime / 4);
            this.targetSpeed = (4.2 + Math.random() * 2.8) * progress * this.accelerationRate;
        }
        else if (this.elapsedTime >= 15) {
            const changeFactor = 1 + (Math.random() * 0.4 - 0.2);
            const newTarget = this.data.speed * changeFactor;
            MIN_SPEED = 4.2
            MAX_SPEED = 6.9
            this.targetSpeed = Math.min(Math.max(newTarget, MIN_SPEED), MAX_SPEED);
            this.elapsedTime = 0;
        }

        this.data.speed += (this.targetSpeed - this.data.speed) * this.smoothFactor;

        if (this.targetSpeed < this.data.speed && this.data.speed > 0.05) {
            const inertiaFactor = 0.9992 + Math.min(this.data.speed / 60, 0.0006);
            this.data.speed *= inertiaFactor;
        }

        if (ocean) {
            const pos = this.el.getAttribute('position');
            const waveY = getOceanHeightAt(pos.x, pos.z, ocean);
            const slope = (waveY - this.lastWaveY) / delta;
            this.lastWaveY = waveY;

            const drag = 0.0012 * this.data.speed * this.data.speed;
            this.data.speed -= slope * 0.08 + drag * delta;
        }

        this.data.speed = Math.max(this.data.speed, 0);

        const pos = this.el.getAttribute('position');
        pos.z -= this.data.speed * delta;
        this.el.setAttribute('position', pos);

        if (this.spray && this.spray.components['particle-system']) {
            const intensity = Math.min(1, (this.data?.speed || this.velocity) / 27.78);
            this.spray.setAttribute('particle-system', 'opacity', 0.2 + intensity * 0.6);
            const backwardSpeed = -2 - intensity * 5;
            this.spray.setAttribute('particle-system', 'velocityValue', `0 ${0.5 + intensity} ${backwardSpeed}`);
            this.spray.setAttribute('particle-system', 'positionSpread', `0.5 0.5 0.5`);
        }
    },

    stop: function () {
        this.moving = false;
        if (this.spray) this.spray.setAttribute('particle-system', 'enabled', false);
    }
});

// ===============================
// COMPONENTE BOAT CONTROLS (COM PERSONAGEM)
// ===============================
AFRAME.registerComponent('boat-controls', {
    schema: {
        acceleration: { type: 'number', default: 14 },
        deceleration: { type: 'number', default: 0.03 },
        maxSpeed: { type: 'number', default: 7 }
    },
    init: function () {
        this.velocity = 0;
        this.isMoving = false;
        this.finished = false;

        window.addEventListener('keydown', (event) => {
            if (!this.finished && event.key === ' ') this.isMoving = true;
        });

        window.addEventListener('keyup', (event) => {
            if (!this.finished && event.key === ' ') this.isMoving = false;
        });

        window.addEventListener('squatDetected', () => {
            if (!this.finished) this.isMoving = true;
        });
    },
    tick: function (time, timeDelta) {
        if (!window.raceStarted || this.finished) return;

        // Removida limitação de deltaTime para manter velocidade consistente em FPS baixo
        const deltaSeconds = timeDelta / 1000;
        const currentPosition = this.el.getAttribute('position');

        if (this.isMoving) {
            this.velocity += this.data.acceleration;
            this.isMoving = false;
        } else {
            this.velocity -= this.data.deceleration;
        }
        this.velocity = Math.max(0, Math.min(this.velocity, this.data.maxSpeed));

        currentPosition.z -= this.velocity * deltaSeconds;
        this.el.setAttribute('position', currentPosition);
    },
    stop: function () {
        this.velocity = 0;
        this.isMoving = false;
        this.finished = true;
    }
});

// ===============================
// COMPONENTE FOLLOW (Câmera segue barco)
// ===============================
AFRAME.registerComponent('follow', {
    schema: { target: { type: 'selector' }, offset: { type: 'vec3', default: { x: 0, y: 1.5, z: 3 } } },
    tick: function () {
        const target = this.data.target;
        if (!target) return;
        const tp = target.object3D.position;
        this.el.object3D.position.set(
            tp.x + this.data.offset.x,
            tp.y + this.data.offset.y,
            tp.z + this.data.offset.z
        );
    }
});

// ===============================
// COMPONENTE CHECK-FINISH
// ===============================
AFRAME.registerComponent('check-finish', {
    init: function () {
        this.finishedBoats = [];
        this.boats = Array.from(document.querySelectorAll('#boat, .bot-boat'));
        if (!window.raceStartedTime) window.raceStartedTime = performance.now();
        this.leaderboardCorner = document.getElementById('leaderboard-corner');
        this.showCornerLeaderboard();
    },

    tick: function () {
        const finish = document.querySelector('#finishLine');

        this.boats.forEach((boat) => {
            const pos = boat.getAttribute('position');
            if (!this.finishedBoats.some(f => f.boat === boat) && pos.z <= finish.getAttribute('position').z) {
                const finishTime = performance.now() - window.raceStartedTime;
                const seconds = Math.floor(finishTime / 1000);
                const milliseconds = Math.floor(finishTime % 1000);
                this.finishedBoats.push({ boat, time: finishTime, seconds, milliseconds });

                if (boat.id === 'boat') boat.components['boat-controls'].stop();
                else if (boat.components['bot-boat-movement']) boat.components['bot-boat-movement'].stop();
            }
        });

        if (this.finishedBoats.length < this.boats.length) {
            const boatsStatus = this.boats.map(b => {
                const pos = b.getAttribute('position');
                const finished = this.finishedBoats.some(f => f.boat === b);
                const time = finished ? this.finishedBoats.find(f => f.boat === b).time : performance.now() - window.raceStartedTime;
                return { boat: b, time, finished };
            });

            boatsStatus.sort((a, b) => a.boat.getAttribute('position').z - b.boat.getAttribute('position').z);
            this.updateCornerLeaderboard(boatsStatus);
        } else {
            if (this.leaderboardCorner) this.leaderboardCorner.style.display = 'none';
            this.updateFinalLeaderboard();
        }
    },

    updateCornerLeaderboard: function (boatsStatus) {
        if (!this.leaderboardCorner) return;
        let html = '';
        boatsStatus.forEach((entry, i) => {
            const b = entry.boat;
            const name = b.id === 'boat' ? (window.getPlayerName ? window.getPlayerName() : 'Jogador') : b.id.replace('bot', 'Bot ');

            let speed = 0;
            if (b.components['boat-controls']) speed = (b.components['boat-controls'].velocity * 3.6).toFixed(1);
            else if (b.components['bot-boat-movement']) speed = (b.components['bot-boat-movement'].data.speed * 3.6).toFixed(1);

            html += `<p>${i + 1}º: ${name} - ${speed} km/h</p>`;
        });
        this.leaderboardCorner.innerHTML = html;
        this.leaderboardCorner.style.display = 'block';
    },

    updateFinalLeaderboard: function () {
        const finishUI = document.getElementById('finishUI');
        const div = document.getElementById('leaderboard');

        div.innerHTML = '';
        this.finishedBoats.forEach((entry, i) => {
            const b = entry.boat;
            const name = b.id === 'boat' ? (window.getPlayerName ? window.getPlayerName() : 'Jogador') : b.id.replace('bot', 'Bot ');
            const timeStr = `${entry.seconds}.${entry.milliseconds.toString().padStart(3, '0')}s`;
            div.innerHTML += `<p>${i + 1}º: ${name} - ${timeStr}</p>`;
        });

        finishUI.style.display = 'flex';
        div.style.display = 'block';
        window.allFinished = true;
    },

    showCornerLeaderboard: function () {
        if (this.leaderboardCorner) this.leaderboardCorner.style.display = 'block';
    }
});

// ===============================
// COMPONENTE KILL-CUBES (Remove cubos do modelo)
// ===============================
AFRAME.registerComponent('kill-cubes', {
    schema: { tol: { type: 'number', default: 0.001 } },

    init() {
        this.el.addEventListener('model-loaded', () => {
            const root = this.el.getObject3D('mesh');
            if (!root) return;

            root.traverse(n => {
                if (!n.isMesh || !n.geometry) return;

                const gtype = n.geometry.type || '';
                if (/Box/i.test(gtype)) { this._remove(n); return; }

                const geom = n.geometry;
                if (!geom.boundingBox) geom.computeBoundingBox();
                const bb = geom.boundingBox;
                if (!bb) return;

                const sx = bb.max.x - bb.min.x;
                const sy = bb.max.y - bb.min.y;
                const sz = bb.max.z - bb.min.z;
                const { tol } = this.data;

                const isCubeish =
                    Math.abs(sx - sy) <= tol * (sx + sy) &&
                    Math.abs(sy - sz) <= tol * (sy + sz) &&
                    Math.abs(sx - sz) <= tol * (sx + sz);

                if (isCubeish) this._remove(n);
            });
        });
    },

    _remove(n) {
        if (n.parent) n.parent.remove(n);
        n.visible = false;
        if (n.material) {
            n.material.visible = false;
            n.material.transparent = true;
            n.material.opacity = 0;
        }
    }
});