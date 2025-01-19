const video = document.getElementById("video");

async function setupVideo() {
    video.loop = true;
    video.playsinline = true;
    video.muted = true;
    video.src = "./Assets/videos/incorrectMove.mp4";
    video.type = "video/mp4";
    
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function main() {
    await setupVideo();
    //await setupCamera();
    video.play();

    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });

    let isSquatting = false;

    function calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        return Math.abs(radians * (180 / Math.PI));
    }

    async function detectPose() {
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
            const keypoints = poses[0].keypoints;

            // Filtrar keypoints com confiabilidade suficiente
            const threshold = 0.5; // Confiança mínima
            const leftHip = keypoints.find(kp => kp.name === "left_hip" && kp.score > threshold);
            const rightHip = keypoints.find(kp => kp.name === "right_hip" && kp.score > threshold);
            const leftKnee = keypoints.find(kp => kp.name === "left_knee" && kp.score > threshold);
            const rightKnee = keypoints.find(kp => kp.name === "right_knee" && kp.score > threshold);
            const leftAnkle = keypoints.find(kp => kp.name === "left_ankle" && kp.score > threshold);
            const rightAnkle = keypoints.find(kp => kp.name === "right_ankle" && kp.score > threshold);

            if (leftHip && rightHip && leftKnee && rightKnee && leftAnkle && rightAnkle) {
                const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

                // Configurações ajustadas
                const squatStartAngle = 135; // Começo do agachamento
                const squatEndAngle = 160; // Retorno à posição ereta
                const stabilityFrames = 3; // Frames consecutivos para estabilidade

                if ((leftAngle < squatStartAngle || rightAngle < squatStartAngle) && !isSquatting) {
                    squatFrames++;
                    if (squatFrames >= stabilityFrames) {
                        isSquatting = true;
                        squatFrames = 0;
                    }
                } else if ((leftAngle > squatEndAngle && rightAngle > squatEndAngle) && isSquatting) {
                    squatFrames++;
                    if (squatFrames >= stabilityFrames) {
                        isSquatting = false;
                        squatFrames = 0;

                        // Emitir evento global
                        const event = new Event('squatDetected');
                        window.dispatchEvent(event);
                    }
                } else {
                    squatFrames = 0; // Resetar contador fora dos ângulos
                }
            }
        }

        requestAnimationFrame(detectPose);
    }


    detectPose();
}