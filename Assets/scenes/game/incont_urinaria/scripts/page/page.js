const saveButton = document.body.querySelector(".save-button");

saveButton.addEventListener("click", () => {
    const sessionStats = getSessionStats();
    const userId = getUrlParameter('id');

    saveSession(userId, sessionStats);

    window.open(`/Assets/pages/user/user.html?id=${userId}`, "_self");
});