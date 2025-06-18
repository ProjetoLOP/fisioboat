let sessionData = {};

function loadSessions() {
    let stored = localStorage.getItem('sessions');

    if (!stored) stored = "{}";

    sessionsData = JSON.parse(stored);

    const container = document.getElementById('sessions-container');
    const sessionsCount = document.getElementById('sessions-count');

    const sessionIds = Object.keys(sessionsData) ?? [];

    if (sessionIds.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h3>Nenhuma sessão encontrada</h3>
                        <p>Complete uma sessão de fisioterapia para começar a visualizar seus dados aqui.</p>
                    </div>
                `;
        sessionsCount.textContent = '';
        return;
    }

    sessionsCount.textContent = `${sessionIds.length} sess${sessionIds.length > 1 ? 'ões' : 'ão'} encontrada${sessionIds.length > 1 ? 's' : ''}`;

    // Sort sessions by date (most recent first)
    const sortedSessions = sessionIds.sort((a, b) => {
        return new Date(sessionsData[b].occurredAt) - new Date(sessionsData[a].occurredAt);
    });

    const sessionsHTML = sortedSessions.map(sessionId => {
        const session = sessionsData[sessionId];
        const date = new Date(session.occurredAt);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
                    <div class="session-item" data-session-id="${sessionId}">
                        <div class="session-header" onclick="toggleSession('${sessionId}')">
                            <div class="session-info">
                                <h3>Sessão #${sessionId}</h3>
                                <div class="session-date">${formattedDate} às ${formattedTime}</div>
                            </div>
                            <div class="session-arrow">▶</div>
                        </div>
                        <div class="session-content">
                            <div class="session-details">
                                <div class="stats-grid">
                                    <div class="stat-card">
                                        <div class="stat-value">${formatSecondsToTime(session.stats.sessionDuration)}</div>
                                        <div class="stat-label">Duração</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${session.stats.reps}</div>
                                        <div class="stat-label">Repetições</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${session.stats.repsByMinute}</div>
                                        <div class="stat-label">Reps/Min</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${session.stats.distance.toFixed(2)}m</div>
                                        <div class="stat-label">Distância</div>
                                    </div>
                                </div>
                                <div class="session-actions">
                                    <button class="btn btn-small" onclick="downloadStats('${sessionId}')">
                                        📋 Baixar Resumo
                                    </button>
                                    <button class="btn btn-small btn-secondary" onclick="downloadActivities('${sessionId}')">
                                        📝 Baixar Log Detalhado
                                    </button>
                                    <button class="btn btn-small btn-danger" onclick="deleteSession('${sessionId}')">
                                        🗑️ Deletar Sessão
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
    }).join('');

    container.innerHTML = sessionsHTML;
}

function formatSecondsToTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const paddedSeconds = String(secs).padStart(2, '0');
    return `${minutes}:${paddedSeconds}`;
}

function toggleSession(sessionId) {
    const sessionItem = document.querySelector(`[data-session-id="${sessionId}"]`);
    sessionItem.classList.toggle('expanded');
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadStats(sessionId) {
    const session = sessionsData[sessionId];
    const data = {
        sessionId: sessionId,
        occurredAt: session.occurredAt,
        stats: session.stats
    };
    downloadJSON(data, `fisioboat-resumo-sessao-${sessionId}.json`);
}

function downloadActivities(sessionId) {
    const session = sessionsData[sessionId];
    const data = {
        sessionId: sessionId,
        occurredAt: session.occurredAt,
        activities: session.activities
    };
    downloadJSON(data, `fisioboat-log-atividades-sessao-${sessionId}.json`);
}

function downloadOverview() {
    const overview = Object.keys(sessionsData).map(sessionId => ({
        sessionId: sessionId,
        occurredAt: sessionsData[sessionId].occurredAt,
        stats: sessionsData[sessionId].stats
    }));
    downloadJSON(overview, 'fisioboat-visao-geral-sessoes.json');
}

function deleteSession(sessionId) {
    if (confirm('Tem certeza de que deseja deletar esta sessão? Esta ação não pode ser desfeita.')) {
        delete sessionsData[sessionId];

        // Update localStorage
        try {
            localStorage.setItem('sessions', JSON.stringify(sessionsData));
        } catch (error) {
            console.log('Could not save to localStorage');
        }

        loadSessions();
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadSessions);