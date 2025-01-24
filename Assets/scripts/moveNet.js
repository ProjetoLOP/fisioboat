const video = document.getElementById("video");
let isFirstSquat = true;

async function setupVideo() {
    video.loop = true;
    video.playsInline = true;
    video.muted = true;
    video.src = "./Assets/videos/correctMove.mp4";

    return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve(video);
        video.onerror = (err) => reject(`Error loading video: ${err.message}`);
    });
}

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
        });
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(video);
        });
    } catch (error) {
        console.error("Error accessing the camera:", error);
        throw error;
    }
}

function calculateDistance(pointA, pointB) {
    return Math.sqrt(
        Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
    );
}

async function runMoveNet() {
    let detector;
    let isSquatting = false;
    let squatFrames = 0;
    let squatStartDistance = { left: null, right: null };
    let squatEndDistance = { left: Infinity, right: Infinity };

    const stabilityFrames = 3;
    const threshold = 0.5; // Confidence threshold

    async function prepareDetector() {
        // await setupCamera();
        await setupVideo();
        video.play();
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log("Detector initialized.");
    }

    async function detectPose() {
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
            const keypoints = poses[0].keypoints.filter(
                (kp) => kp.score > threshold
            );

            const leftHip = keypoints.find((kp) => kp.name === "left_hip");
            const rightHip = keypoints.find((kp) => kp.name === "right_hip");
            const leftKnee = keypoints.find((kp) => kp.name === "left_knee");
            const rightKnee = keypoints.find((kp) => kp.name === "right_knee");

            if (leftHip && rightHip && leftKnee && rightKnee) {
                const leftDistance = calculateDistance(leftHip, leftKnee);
                const rightDistance = calculateDistance(rightHip, rightKnee);

                if (!squatStartDistance.left || !squatStartDistance.right) {
                    squatStartDistance.left = leftDistance;
                    squatStartDistance.right = rightDistance;
                    video.play();
                    console.log("Initial distances set.");
                }

                if (
                    (leftDistance < squatStartDistance.left ||
                        rightDistance < squatStartDistance.right) &&
                    !isSquatting
                ) {
                    squatFrames++;

                    squatEndDistance.left = Math.min(
                        leftDistance,
                        squatEndDistance.left
                    );
                    squatEndDistance.right = Math.min(
                        rightDistance,
                        squatEndDistance.right
                    );

                    if (squatFrames >= stabilityFrames) {
                        isSquatting = true;
                        squatFrames = 0;
                        console.log("Squat detected.");
                    }
                } else if (
                    (leftDistance > squatStartDistance.left ||
                        rightDistance > squatStartDistance.right) &&
                    isSquatting
                ) {
                    squatFrames++;

                    if (squatFrames >= stabilityFrames) {
                        isSquatting = false;
                        squatFrames = 0;
                        const squatDetails = {
                            instant: new Date().toISOString(),
                            quality: 10
                        }

                        // Emitir evento global
                        const event = new CustomEvent('squatDetected', { detail: squatDetails });
                        window.dispatchEvent(event);

                        if (isFirstSquat === true) {
                            const firstSquatEvent = new CustomEvent('firstSquat');
                            window.dispatchEvent(firstSquatEvent);

                            isFirstSquat = false;
                        }
                    }
                } else {
                    squatFrames = 0;
                }
            }
        }

        requestAnimationFrame(detectPose);
    }

    await prepareDetector();
    detectPose();
}
