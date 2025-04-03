importScripts('/Assets/scripts/Libs/tfjs.js');
importScripts('/Assets/scripts/Libs/pose-detection.js');
importScripts('/Assets/scripts/Libs/tfjs-backend-webgl.js');

// Variáveis globais para armazenar estados e configurações
let detectorReady = false;
let detector;
let threshold = 0.5; // Exemplo: valor mínimo de score
let squatStartDistance = { left: null, right: null };
let squatEndDistance = { left: Infinity, right: Infinity };
let isSquatting = false;
let squatFrames = 0;
let stabilityFrames = 3; // Número de frames para considerar estabilidade
let currentSquatPoses = [];

// Inicializa o detector
prepareDetector();

onmessage = async (event) => {
  if (!detectorReady) {
    return; // Ignora os frames até o detector estar pronto
  }

  const { frame } = event.data; // O frame é um VideoFrame transferido
  const width = frame.codedWidth;
  const height = frame.codedHeight;

  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(frame, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const movementStatus = await detectPose(imageData);

  postMessage({ movementStatus });
  frame.close();
};


async function detectPose(frame) {
  if (!detector) return null;
  const poses = await detector.estimatePoses(frame);
  if (poses.length > 0) {
    const extractedKeypoints = extractKeypoints(poses[0].keypoints);
    if (extractedKeypoints.leftHip && extractedKeypoints.rightHip &&
      extractedKeypoints.leftKnee && extractedKeypoints.rightKnee) {
      const movementStatus = processPose(extractedKeypoints);

      return movementStatus;
    }
  }
}

// Função para preparar o detector
async function prepareDetector() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );
  detectorReady = true;
  console.log("Detector pronto.");
}

// Função que extrai os keypoints filtrando pelo score
function extractKeypoints(keypoints) {
  const filtered = keypoints.filter((kp) => kp.score > threshold);
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

// Função que processa a pose e calcula as distâncias dos keypoints
function processPose(pose) {
  const { leftHip, rightHip, leftKnee, rightKnee } = pose;

  const leftDistance = calculateDistance(leftHip, leftKnee);
  const rightDistance = calculateDistance(rightHip, rightKnee);

  // Configura as distâncias iniciais, se ainda não foram definidas
  if (squatStartDistance.left === null || squatStartDistance.right === null) {
    squatStartDistance = { left: leftDistance, right: rightDistance };
    console.log("Distâncias iniciais definidas.");
    return;
  }

  // Fase de descida do agachamento
  if (
    (leftDistance < squatStartDistance.left || rightDistance < squatStartDistance.right) &&
    !isSquatting
  ) {
    squatFrames++;
    squatEndDistance.left = Math.min(leftDistance, squatEndDistance.left);
    squatEndDistance.right = Math.min(rightDistance, squatEndDistance.right);

    if (squatFrames >= stabilityFrames) {
      isSquatting = true;
      squatFrames = 0;
      currentSquatPoses = []; // Reinicia para o novo agachamento
      console.log("Agachamento detectado.");

      return "performing";
    }
  }
  // Fase de subida do agachamento
  else if (
    (leftDistance > squatStartDistance.left || rightDistance > squatStartDistance.right) &&
    isSquatting
  ) {
    squatFrames++;

    if (squatFrames >= stabilityFrames) {
      isSquatting = false;
      squatFrames = 0;
      // Aqui você pode chamar uma função para despachar eventos, se necessário
      console.log("Agachou.");

      return "completed";
    }
  } else {
    // Reinicia o contador se não houver mudanças significativas
    squatFrames = 0;
  }
}

// Função para calcular a distância entre dois pontos
function calculateDistance(pointA, pointB) {
  return Math.sqrt(
    Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
  );
}