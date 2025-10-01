const saveButton = document.body.querySelector(".save-button");

saveButton.addEventListener("click", () => {
    const userId = new URLSearchParams(window.location.search).get('id');
    const sessionStats = getSessionStats();
    saveSession(sessionStats);

    window.location.href = "/Assets/pages/user/user.html?id=" + userId;
})