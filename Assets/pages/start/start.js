let currentSlide = 0;
const totalSlides = document.querySelectorAll('.carousel-item').length;

function updateCarousel() {
    const carousel = document.querySelector('.carousel');
    carousel.style.transform = `translateX(-${currentSlide * 100}%)`;

    // Atualizar dots
    document.querySelectorAll('.dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function moveCarousel(direction) {
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    updateCarousel();
}

function goToSlide(slideIndex) {
    currentSlide = slideIndex;
    updateCarousel();
}

// Auto sliding (opcional)
let autoSlide = setInterval(() => moveCarousel(1), 5000);

// Parar auto slide quando o mouse estiver sobre o carrossel
document.querySelector('.carousel-container').addEventListener('mouseenter', () => {
    clearInterval(autoSlide);
});

document.querySelector('.carousel-container').addEventListener('mouseleave', () => {
    autoSlide = setInterval(() => moveCarousel(1), 5000);
});

// Para iniciar com a fase selecionada
document.querySelector('.play-button').addEventListener('click', () => {
    const selectedLevel = currentSlide + 1;

    // Aqui você pode adicionar o código para iniciar o jogo na fase selecionada
    switch (selectedLevel) {
        case 1: window.location.href = "/Assets/scenes/game/game.html"
            break;

        case 4: window.location.href = "/Assets/scenes/dev/sandboxes/followBoat.html"
            break;
    }
});
