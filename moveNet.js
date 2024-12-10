const video = document.getElementById("video");

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
    await setupCamera();
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
            const leftHip = keypoints.find(kp => kp.name === "left_hip");
            const rightHip = keypoints.find(kp => kp.name === "right_hip");
            const leftKnee = keypoints.find(kp => kp.name === "left_knee");
            const rightKnee = keypoints.find(kp => kp.name === "right_knee");
            const leftAnkle = keypoints.find(kp => kp.name === "left_ankle");
            const rightAnkle = keypoints.find(kp => kp.name === "right_ankle");

            if (leftHip && rightHip && leftKnee && rightKnee && leftAnkle && rightAnkle) {
                const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

                // Detecting squat based on knee angle
                if ((leftAngle < 120 || rightAngle < 120) && !isSquatting) {
                    isSquatting = true;
                } else if ((leftAngle > 160 && rightAngle > 160) && isSquatting) {
                    isSquatting = false;

                    // Emitir evento global para notificar o barco
                    const event = new Event('squatDetected');
                    window.dispatchEvent(event);
                }
            }
        }

        requestAnimationFrame(detectPose);
    }

    detectPose();
}

main();