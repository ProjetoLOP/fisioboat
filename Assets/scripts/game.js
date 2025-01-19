const isDeveloping = false;

if (isDeveloping) {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    gameInstruction.style.display = "none";

    setTimeout(() => {
        main();
        playOceanAmbienceSound();
    }, 3000);
} else {
    showGameInstruction("Reme o mais rápido que puder nos próximos 30 segundos");
}

function hideGameInstruction() {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    gameInstruction.classList.add("hide");

    gameInstruction.addEventListener("transitionend", () => gameInstruction.style.display = "none", { once: true });
}

function showGameInstruction(message) {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    const textElement = document.body.querySelector("#text");

    // Remove the "hide" class to make the instruction visible
    gameInstruction.classList.remove("hide");

    // Clear any previous text
    textElement.innerHTML = "";

    // Use TypeIt to animate the text
    new TypeIt("#text", {
        strings: message,
        speed: 75,
        waitUntilVisible: true,
        afterComplete: () => {
            setTimeout(() => {
                hideGameInstruction();
                playOceanAmbienceSound();
                main();
            }, 3000);
        }
    }).go();
}

function playOceanAmbienceSound() {
    const oceanAmbienceSound = new Audio("/Assets/soundEffects/oceanAmbience.mp3");
    oceanAmbienceSound.loop = true;
    oceanAmbienceSound.play();
}

function playRowingSound() {
    const rowingSoundSrcs = ["/Assets/soundEffects/som-da-remada_1.mp3", "/Assets/soundEffects/som-da-remada_2.mp3", "/Assets/soundEffects/som-da-remada_3.mp3"];

    // Selecionar um dos sons
    const randomSrc = rowingSoundSrcs[Math.floor(Math.random() * rowingSoundSrcs.length)];
    const soundEffect = new Audio(randomSrc);

    soundEffect.play();
}