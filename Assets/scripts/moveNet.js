const video = document.getElementById("video");

class MoveNetDetector {
    constructor(videoElement, config = {}) {
        this.video = videoElement;
        this.isFirstSquat = true;
        this.detector = null;
        this.isSquatting = false;
        this.squatFrames = 0;
        this.squatStartDistance = { left: null, right: null };
        this.squatEndDistance = { left: Infinity, right: Infinity };

        // Track pose history for quality assessment
        this.poseHistory = [];
        this.maxHistoryLength = 30; // Store about 1 second of poses at 30fps
        this.currentSquatPoses = [];

        // Initial positions for reference
        this.initialPose = null;

        // Configurações com valores padrão
        this.stabilityFrames = config.stabilityFrames || 3;
        this.threshold = config.threshold || 0.5;

        // Quality metrics thresholds
        this.qualityConfig = {
            minDepthPercentage: 0.5,    // Minimum squat depth (as percentage of initial distance)
            symmetryThreshold: 0.15,     // Max difference between left/right sides
            backAngleThreshold: 20,      // Max forward lean in degrees
            kneeAlignmentThreshold: 0.1  // Knees should track over toes
        };
    }

    async setupVideo() {
        // Existing code remains unchanged
        this.video.loop = true;
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.src = "/Assets/videos/correctMove(2).mp4"; // caminho para o vídeo pré gravado

        return new Promise((resolve, reject) => {
            this.video.onloadedmetadata = () => resolve(this.video);
            this.video.onerror = (err) => reject(`Erro ao carregar vídeo: ${err.message}`);
        });
    }

    async setupCamera() {
        // Existing code remains unchanged
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
            });
            this.video.srcObject = stream;
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => resolve(this.video);
            });
        } catch (error) {
            console.error("Erro ao acessar a câmera:", error);
            throw error;
        }
    }

    async prepareDetector() {
        this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );

        // Existing code remains unchanged
        await this.setupVideo();
        // await this.setupCamera();

        setTimeout(() => {
            this.video.play();
        }, 3000)

        console.log("Detector inicializado.");
    }

    // Expanded extractKeypoints to include all relevant squat quality points
    extractKeypoints(keypoints) {
        const filtered = keypoints.filter((kp) => kp.score > this.threshold);
        return {
            leftHip: filtered.find((kp) => kp.name === "left_hip"),
            rightHip: filtered.find((kp) => kp.name === "right_hip"),
            leftKnee: filtered.find((kp) => kp.name === "left_knee"),
            rightKnee: filtered.find((kp) => kp.name === "right_knee"),
            leftAnkle: filtered.find((kp) => kp.name === "left_ankle"),
            rightAnkle: filtered.find((kp) => kp.name === "right_ankle"),
            leftShoulder: filtered.find((kp) => kp.name === "left_shoulder"),
            rightShoulder: filtered.find((kp) => kp.name === "right_shoulder"),
            nose: filtered.find((kp) => kp.name === "nose")
        };
    }

    calculateDistance(pointA, pointB) {
        // Existing code remains unchanged
        return Math.sqrt(
            Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
        );
    }

    // Calculate angle between three points (in degrees)
    calculateAngle(pointA, pointB, pointC) {
        const AB = { x: pointB.x - pointA.x, y: pointB.y - pointA.y };
        const BC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };

        // Dot product divided by product of magnitudes
        const dotProduct = AB.x * BC.x + AB.y * BC.y;
        const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
        const magBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y);

        const angleRadians = Math.acos(dotProduct / (magAB * magBC));
        return angleRadians * (180 / Math.PI); // Convert to degrees
    }

    // Store the current pose in history
    storePoseInHistory(pose) {
        this.poseHistory.push(pose);
        if (this.poseHistory.length > this.maxHistoryLength) {
            this.poseHistory.shift(); // Remove oldest pose if exceeded max length
        }

        // If we're in a squat, also track for this specific squat
        if (this.isSquatting) {
            this.currentSquatPoses.push(pose);
        }
    }

    // Find the initial standing pose as reference
    setInitialPose(pose) {
        if (!this.initialPose && this.isStablePose(pose)) {
            this.initialPose = pose;
            console.log("Initial reference pose captured");
        }
    }

    // Check if a pose is stable enough to use as reference
    isStablePose(pose) {
        // Simple check: all required keypoints are present with good confidence
        const requiredKeypoints = [
            pose.leftHip, pose.rightHip, pose.leftKnee, pose.rightKnee,
            pose.leftAnkle, pose.rightAnkle, pose.leftShoulder, pose.rightShoulder
        ];

        return requiredKeypoints.every(kp => kp && kp.score > this.threshold * 1.2);
    }

    processPose(pose) {
        const { leftHip, rightHip, leftKnee, rightKnee } = pose;

        // Store history for quality analysis
        this.storePoseInHistory(pose);

        // Try to capture initial reference pose
        this.setInitialPose(pose);

        const leftDistance = this.calculateDistance(leftHip, leftKnee);
        const rightDistance = this.calculateDistance(rightHip, rightKnee);

        // Define as distâncias iniciais se ainda não estiverem configuradas
        if (this.squatStartDistance.left === null || this.squatStartDistance.right === null) {
            this.squatStartDistance = { left: leftDistance, right: rightDistance };
            console.log("Distâncias iniciais definidas.");
            return;
        }

        // Fase de descida do agachamento
        if (
            (leftDistance < this.squatStartDistance.left || rightDistance < this.squatStartDistance.right) &&
            !this.isSquatting
        ) {
            this.squatFrames++;
            this.squatEndDistance.left = Math.min(leftDistance, this.squatEndDistance.left);
            this.squatEndDistance.right = Math.min(rightDistance, this.squatEndDistance.right);

            if (this.squatFrames >= this.stabilityFrames) {
                this.isSquatting = true;
                this.squatFrames = 0;
                this.currentSquatPoses = []; // Reset for new squat
                console.log("Agachamento detectado.");
            }
        }
        // Fase de subida do agachamento
        else if (
            (leftDistance > this.squatStartDistance.left || rightDistance > this.squatStartDistance.right) &&
            this.isSquatting
        ) {
            this.squatFrames++;

            if (this.squatFrames >= this.stabilityFrames) {
                this.isSquatting = false;
                this.squatFrames = 0;
                this.dispatchSquatEvents();
            }
        } else {
            // Reinicia o contador se não houver mudanças significativas
            this.squatFrames = 0;
        }
    }

    // Calculate squat quality metrics
    calculateSquatQuality() {
        if (this.currentSquatPoses.length === 0 || !this.initialPose) {
            return 5; // Default middle score if we don't have enough data
        }

        // Find the deepest squat position
        const deepestSquatPose = this.findDeepestSquatPose();
        if (!deepestSquatPose) return 5;

        // Calculate individual quality metrics
        const depthScore = this.evaluateSquatDepth(deepestSquatPose);
        const symmetryScore = this.evaluateSquatSymmetry(deepestSquatPose);
        const backAngleScore = this.evaluateBackAngle(deepestSquatPose);
        const kneeAlignmentScore = this.evaluateKneeAlignment(deepestSquatPose);

        // Calculate final weighted quality score (0-10 scale)
        const weightedScore = (
            depthScore * 0.3 +      // Depth is 30% of score
            symmetryScore * 0.3 +   // Symmetry is 30% of score
            backAngleScore * 0.2 +  // Back angle is 20% of score
            kneeAlignmentScore * 0.2 // Knee alignment is 20% of score
        ) * 10; // Scale to 0-10

        // Round to nearest 0.5
        return Math.round(weightedScore * 2) / 2;
    }

    // Find the frame with the deepest squat position
    findDeepestSquatPose() {
        if (this.currentSquatPoses.length === 0) return null;

        let deepestPose = null;
        let minDistance = Infinity;

        for (const pose of this.currentSquatPoses) {
            const leftDistance = this.calculateDistance(pose.leftHip, pose.leftKnee);
            const rightDistance = this.calculateDistance(pose.rightHip, pose.rightKnee);
            const avgDistance = (leftDistance + rightDistance) / 2;

            if (avgDistance < minDistance) {
                minDistance = avgDistance;
                deepestPose = pose;
            }
        }

        return deepestPose;
    }

    // Evaluate squat depth (0-1 score)
    evaluateSquatDepth(pose) {
        if (!pose || !this.initialPose) return 0.5;

        // Calculate initial and current hip-knee distances
        const initialLeftDist = this.calculateDistance(this.initialPose.leftHip, this.initialPose.leftKnee);
        const initialRightDist = this.calculateDistance(this.initialPose.rightHip, this.initialPose.rightKnee);
        const initialAvgDist = (initialLeftDist + initialRightDist) / 2;

        const currentLeftDist = this.calculateDistance(pose.leftHip, pose.leftKnee);
        const currentRightDist = this.calculateDistance(pose.rightHip, pose.rightKnee);
        const currentAvgDist = (currentLeftDist + currentRightDist) / 2;

        // Calculate depth as percentage reduction from initial position
        const depthPercentage = 1 - (currentAvgDist / initialAvgDist);

        // Score based on depth (optimal depth is around 0.4-0.6 reduction)
        if (depthPercentage < this.qualityConfig.minDepthPercentage) {
            // Not deep enough: score based on how close to minimum
            return depthPercentage / this.qualityConfig.minDepthPercentage;
        } else if (depthPercentage <= 0.7) {
            // Optimal depth range: full score
            return 1.0;
        } else {
            // Too deep: gradually reduce score
            return Math.max(0, 1 - ((depthPercentage - 0.7) * 3));
        }
    }

    // Evaluate left-right symmetry (0-1 score)
    evaluateSquatSymmetry(pose) {
        if (!pose) return 0.5;

        // Compare left vs right side distances
        const leftHipKnee = this.calculateDistance(pose.leftHip, pose.leftKnee);
        const rightHipKnee = this.calculateDistance(pose.rightHip, pose.rightKnee);

        // Calculate relative difference
        const maxDist = Math.max(leftHipKnee, rightHipKnee);
        const minDist = Math.min(leftHipKnee, rightHipKnee);
        const symmetryDiff = maxDist > 0 ? (maxDist - minDist) / maxDist : 0;

        // Score based on symmetry (lower difference is better)
        return Math.max(0, 1 - (symmetryDiff / this.qualityConfig.symmetryThreshold));
    }

    // Evaluate back angle (0-1 score)
    evaluateBackAngle(pose) {
        if (!pose || !pose.leftShoulder || !pose.leftHip || !pose.leftKnee) return 0.5;

        // Calculate the angle between shoulder-hip-knee
        const backAngle = this.calculateAngle(pose.leftShoulder, pose.leftHip, pose.leftKnee);

        // For a squat, we want this angle to be close to 180° (straight back)
        // or slightly forward lean (160-180°)
        const idealAngle = 170;
        const angleDiff = Math.abs(backAngle - idealAngle);

        // Score based on how close to ideal (lower difference is better)
        return Math.max(0, 1 - (angleDiff / this.qualityConfig.backAngleThreshold));
    }

    // Evaluate knee alignment over toes (0-1 score)
    evaluateKneeAlignment(pose) {
        if (!pose || !pose.leftKnee || !pose.leftAnkle || !pose.rightKnee || !pose.rightAnkle) return 0.5;

        // Calculate horizontal difference between knee and ankle
        const leftKneeAnkleDiff = Math.abs(pose.leftKnee.x - pose.leftAnkle.x);
        const rightKneeAnkleDiff = Math.abs(pose.rightKnee.x - pose.rightAnkle.x);

        // Normalize by height of person (use hip-to-ankle distance as reference)
        const heightReference = (
            this.calculateDistance(pose.leftHip, pose.leftAnkle) +
            this.calculateDistance(pose.rightHip, pose.rightAnkle)
        ) / 2;

        const normalizedDiff = (leftKneeAnkleDiff + rightKneeAnkleDiff) / (2 * heightReference);

        // Score based on alignment (lower normalized difference is better)
        return Math.max(0, 1 - (normalizedDiff / this.qualityConfig.kneeAlignmentThreshold));
    }

    // Generate feedback text based on quality scores
    generateQualityFeedback(depthScore, symmetryScore, backAngleScore, kneeAlignmentScore) {
        let feedback = [];

        if (depthScore < 0.7) {
            feedback.push("Try to squat deeper for better muscle engagement.");
        }

        if (symmetryScore < 0.7) {
            feedback.push("Focus on equal weight distribution between both legs.");
        }

        if (backAngleScore < 0.7) {
            feedback.push("Keep your back more upright during the squat.");
        }

        if (kneeAlignmentScore < 0.7) {
            feedback.push("Make sure your knees track over your toes, not inward or outward.");
        }

        if (feedback.length === 0) {
            feedback.push("Great form! Keep it up.");
        }

        return feedback;
    }

    dispatchSquatEvents() {
        // Calculate quality metrics for the completed squat
        const qualityScore = this.calculateSquatQuality();

        // Get detailed scores for feedback
        const deepestSquatPose = this.findDeepestSquatPose();
        const depthScore = this.evaluateSquatDepth(deepestSquatPose);
        const symmetryScore = this.evaluateSquatSymmetry(deepestSquatPose);
        const backAngleScore = this.evaluateBackAngle(deepestSquatPose);
        const kneeAlignmentScore = this.evaluateKneeAlignment(deepestSquatPose);

        // Generate feedback text
        const feedbackText = this.generateQualityFeedback(
            depthScore, symmetryScore, backAngleScore, kneeAlignmentScore
        );

        // Create detailed quality information
        const squatDetails = {
            instant: new Date().toISOString(),
            quality: qualityScore,
            metrics: {
                depth: depthScore * 10,
                symmetry: symmetryScore * 10,
                backAngle: backAngleScore * 10,
                kneeAlignment: kneeAlignmentScore * 10
            },
            feedback: feedbackText
        };

        // Dispatch the event with detailed quality information
        const squatEvent = new CustomEvent("squatDetected", { detail: squatDetails });
        window.dispatchEvent(squatEvent);

        if (this.isFirstSquat) {
            const firstSquatEvent = new CustomEvent("firstSquat");
            window.dispatchEvent(firstSquatEvent);
            this.isFirstSquat = false;
        }

        // Reset for next squat
        this.currentSquatPoses = [];
        this.squatEndDistance = { left: Infinity, right: Infinity };

        console.log(`Squat completed! Quality score: ${qualityScore.toFixed(1)}/10`);
        // console.log(`Feedback: ${feedbackText.join(' ')}`);
    }

    async detectPose() {
        const poses = await this.detector.estimatePoses(this.video);
        if (poses.length > 0) {
            const extractedKeypoints = this.extractKeypoints(poses[0].keypoints);
            if (extractedKeypoints.leftHip && extractedKeypoints.rightHip &&
                extractedKeypoints.leftKnee && extractedKeypoints.rightKnee) {
                this.processPose(extractedKeypoints);
            }
        }
        requestAnimationFrame(this.detectPose.bind(this));
    }

    async run() {
        await this.prepareDetector();
        this.detectPose();
    }
}

// Instancia e executa o detector
const moveNetDetector = new MoveNetDetector(video, {
    stabilityFrames: 3,
    threshold: 0.5,
});