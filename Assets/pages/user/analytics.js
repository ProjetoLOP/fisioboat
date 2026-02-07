// Configuração global dos gráficos
Chart.defaults.font.family = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
Chart.defaults.color = '#6B4423';

let charts = {}; // Armazena referências aos gráficos

// Função para renderizar analytics
function renderAnalytics(user) {
    const analyticsSection = document.getElementById('analyticsSection');

    if (!user.sessions || typeof user.sessions !== 'object') {
        return;
    }

    const sessionsArray = Object.entries(user.sessions).map(([id, session]) => ({
        id,
        ...session
    }));

    // Verificar se há pelo menos 3 sessões
    if (sessionsArray.length < 3) {
        return;
    }

    // Mostrar seção de analytics
    analyticsSection.classList.add('visible');

    // Atualizar contador de sessões
    const sessionCounter = document.getElementById('sessionCounter');
    sessionCounter.textContent = `${sessionsArray.length} sessões realizadas`;

    // Ordenar por data
    const sortedSessions = sessionsArray.sort((a, b) =>
        new Date(a.occurredAt) - new Date(b.occurredAt)
    );

    // Gerar resumo de estatísticas
    generateStatsSummary(sortedSessions);

    // Criar gráficos
    createDistanceChart(sortedSessions);
    createRepsChart(sortedSessions);
    createDepthChart(sortedSessions);
    createDurationChart(sortedSessions);
}

// Função para gerar resumo de estatísticas
function generateStatsSummary(sessions) {
    const statsSummary = document.getElementById('statsSummary');

    // Calcular estatísticas totais
    const totalDistance = sessions.reduce((sum, s) => sum + (s.stats.distance || 0), 0);
    const totalReps = sessions.reduce((sum, s) => sum + (s.stats.reps || 0), 0);
    const avgRepsPerMin = sessions.reduce((sum, s) => sum + (s.stats.repsByMinute || 0), 0) / sessions.length;
    const avgDepth = sessions.reduce((sum, s) => sum + (s.stats.avgDepth || 0), 0) / sessions.length;

    // Calcular tendências (comparar últimas 3 com 3 anteriores)
    const recentSessions = sessions.slice(-3);
    const previousSessions = sessions.slice(-6, -3);

    const recentAvgDistance = recentSessions.reduce((sum, s) => sum + (s.stats.distance || 0), 0) / recentSessions.length;
    const previousAvgDistance = previousSessions.length > 0
        ? previousSessions.reduce((sum, s) => sum + (s.stats.distance || 0), 0) / previousSessions.length
        : recentAvgDistance;

    const distanceTrend = calculateTrend(recentAvgDistance, previousAvgDistance);

    statsSummary.innerHTML = `
                <div class="summary-card">
                    <div class="summary-icon">📏</div>
                    <div class="summary-value">${totalDistance.toFixed(2)}m</div>
                    <div class="summary-label">Distância Total</div>
                    ${distanceTrend}
                </div>
                <div class="summary-card">
                    <div class="summary-icon">🔢</div>
                    <div class="summary-value">${totalReps}</div>
                    <div class="summary-label">Total de Repetições</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">📊</div>
                    <div class="summary-value">${avgRepsPerMin.toFixed(1)}</div>
                    <div class="summary-label">Média Reps/Min</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">🎯</div>
                    <div class="summary-value">${(avgDepth * 100).toFixed(1)}cm</div>
                    <div class="summary-label">Profundidade Média</div>
                </div>
            `;
}

// Função para calcular tendência
function calculateTrend(current, previous) {
    const difference = ((current - previous) / previous) * 100;

    if (Math.abs(difference) < 5) {
        return '<div class="trend-indicator trend-neutral">→ Estável</div>';
    } else if (difference > 0) {
        return `<div class="trend-indicator trend-up">↑ +${difference.toFixed(1)}%</div>`;
    } else {
        return `<div class="trend-indicator trend-down">↓ ${difference.toFixed(1)}%</div>`;
    }
}

// Função para criar gráfico de distância
function createDistanceChart(sessions) {
    const ctx = document.getElementById('distanceChart');

    // Destruir gráfico anterior se existir
    if (charts.distance) {
        charts.distance.destroy();
    }

    const labels = sessions.map((s, i) => `#${i + 1}`);
    const data = sessions.map(s => s.stats.distance || 0);

    charts.distance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Distância (m)',
                data: data,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#ff6b35',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            return `Distância: ${context.parsed.y.toFixed(2)}m`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Função para criar gráfico de repetições por minuto
function createRepsChart(sessions) {
    const ctx = document.getElementById('repsChart');

    if (charts.reps) {
        charts.reps.destroy();
    }

    const labels = sessions.map((s, i) => `#${i + 1}`);
    const data = sessions.map(s => s.stats.repsByMinute || 0);

    charts.reps = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reps/Min',
                data: data,
                backgroundColor: 'rgba(255, 107, 53, 0.7)',
                borderColor: '#ff6b35',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `Reps/Min: ${context.parsed.y.toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Função para criar gráfico de profundidade
function createDepthChart(sessions) {
    const ctx = document.getElementById('depthChart');

    if (charts.depth) {
        charts.depth.destroy();
    }

    const labels = sessions.map((s, i) => `#${i + 1}`);
    const data = sessions.map(s => (s.stats.avgDepth || 0) * 100);

    charts.depth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Profundidade (cm)',
                data: data,
                borderColor: '#f7931e',
                backgroundColor: 'rgba(247, 147, 30, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#f7931e',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `Profundidade: ${context.parsed.y.toFixed(1)}cm`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Função para criar gráfico de duração
function createDurationChart(sessions) {
    const ctx = document.getElementById('durationChart');

    if (charts.duration) {
        charts.duration.destroy();
    }

    const labels = sessions.map((s, i) => `#${i + 1}`);
    const data = sessions.map(s => (s.stats.sessionDuration || 0) / 60);

    charts.duration = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Duração (min)',
                data: data,
                backgroundColor: 'rgba(247, 147, 30, 0.7)',
                borderColor: '#f7931e',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return `Duração: ${context.parsed.y.toFixed(1)} min`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Função para selecionar jogo
function selectGame(gameType) {
    // Remover classe active de todos
    document.querySelectorAll('.game-option').forEach(option => {
        option.classList.remove('active');
    });

    // Adicionar classe active ao selecionado
    const selectedOption = document.querySelector(`[data-game="${gameType}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }

    // Mostrar/ocultar configurações específicas
    const incontinenciaConfig = document.getElementById('incontinenciaConfig');
    const corridaConfig = document.getElementById('corridaConfig');

    if (gameType === 'incontinencia') {
        incontinenciaConfig.style.display = 'contents';
        corridaConfig.style.display = 'none';
    } else {
        incontinenciaConfig.style.display = 'none';
        corridaConfig.style.display = 'block';
    }
}

// Função para obter configurações da sessão (SUBSTITUIR a existente)
function getSessionConfig() {
    const sessionTime = document.getElementById('sessionTime')?.value || 20;
    const selectedGame = document.querySelector('.game-option.active')?.getAttribute('data-game') || 'incontinencia';

    const config = {
        sessionDuration: parseInt(sessionTime, 10),
        gameType: selectedGame
    };

    // Adicionar configurações específicas se for incontinência
    if (selectedGame === 'incontinencia') {
        const sessionType = document.getElementById('sessionType')?.value || 'resistencia';
        const figuresByMinute = document.getElementById('figuresByMinute')?.value || 3;
        const figuresDuration = document.getElementById('figureDuration')?.value || 4;

        config.sessionType = sessionType;
        config.figuresByMinute = parseInt(figuresByMinute, 10);
        config.figuresDuration = parseInt(figuresDuration, 10);
    }

    console.log('Configurações da Sessão:', config);
    return config;
}

// Função para iniciar nova sessão (SUBSTITUIR a existente)
function startNewSession() {
    const userId = getUrlParameter('id');
    if (!userId) {
        console.error('ID do usuário não encontrado para iniciar sessão');
        alert('Erro: ID do usuário não encontrado');
        return;
    }

    const sessionConfig = getSessionConfig();
    const configParam = encodeURIComponent(JSON.stringify(sessionConfig));

    // Determinar qual jogo abrir
    const selectedGame = document.querySelector('.game-option.active')?.getAttribute('data-game') || 'incontinencia';

    let gameUrl;
    if (selectedGame === 'corrida') {
        gameUrl = `/Assets/scenes/game/race/index.html?id=${userId}&sessionConfig=${configParam}`;
    } else {
        gameUrl = `/Assets/scenes/game/incont_urinaria/game.html?id=${userId}&sessionConfig=${configParam}`;
    }

    window.open(gameUrl, '_self');
}