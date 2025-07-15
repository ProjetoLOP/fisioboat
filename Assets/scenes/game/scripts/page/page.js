const saveButton = document.body.querySelector(".save-button");

saveButton.addEventListener("click", () => {
    const sessionStats = getSessionStats();
    saveSession(sessionStats);

    window.location.href = "/Assets/pages/sessions/sessions.html";
})