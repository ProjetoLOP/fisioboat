function hideGameInstruction() {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    gameInstruction.classList.add("hide");

    gameInstruction.addEventListener("transitionend", () => gameInstruction.style.display = "none", {once: true});
}

function showGameInstruction(message, show) {
    const gameInstruction = document.body.querySelector("#gameInstruction");
    const textElement = document.body.querySelector("#text");

    if(show === false) return gameInstruction.style.display = "none";

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
                main();
            }, 3000);
        }
    }).go();
}

const gameInstructionBoolean = true;

// Example of how to use the function
showGameInstruction("Reme o mais rápido que puder nos próximos 30 segundos", gameInstructionBoolean);

// execute main caso gameInstructionBoolean seja false
if(!gameInstructionBoolean) {
    main();
}