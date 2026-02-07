// Função para obter parâmetro da URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Função para formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Função para formatar hora
function formatTime(dateString) {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Função para formatar duração em segundos para minutos
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
}

// Função para carregar dados do usuário
function loadUserData() {
    const userId = getUrlParameter('id');

    if (!userId) {
        console.error('ID do usuário não encontrado na URL');
        showError('ID do usuário não encontrado na URL');
        return;
    }

    // Buscar dados no localStorage
    const usersData = localStorage.getItem('users');
    if (!usersData) {
        console.error('Dados de usuários não encontrados no localStorage');
        showError('Dados de usuários não encontrados');
        return;
    }

    let users;
    try {
        users = JSON.parse(usersData);
    } catch (error) {
        console.error('Erro ao parsear dados dos usuários:', error);
        showError('Erro ao carregar dados dos usuários');
        return;
    }

    // Validar que users é um array
    if (!Array.isArray(users)) {
        console.error('Dados de usuários corrompidos');
        showError('Dados de usuários corrompidos');
        return;
    }

    // Encontrar usuário pelo ID
    const user = users.find(u => u && u.id === userId);
    if (!user) {
        console.error('Usuário não encontrado com ID:', userId);
        showError('Usuário não encontrado');
        return;
    }

    // Atualizar informações do perfil
    updateUserProfile(user);

    // Renderizar sessões
    renderSessions(user);

    renderAnalytics(user);
}

// Função para atualizar perfil do usuário
function updateUserProfile(user) {
    // Atualizar avatar (primeira letra do nome)
    const playerAvatar = document.querySelector('.player-avatar');
    if (playerAvatar && user.personal_info && user.personal_info.nome) {
        playerAvatar.textContent = user.personal_info.nome.charAt(0).toUpperCase();
    }

    // Atualizar nome do jogador
    const playerName = document.querySelector('.player-name');
    if (playerName && user.personal_info && user.personal_info.nome) {
        playerName.textContent = user.personal_info.nome;
    }

    // Atualizar detalhes do jogador (idade, altura, peso)
    const playerDetails = document.querySelector('.player-details');
    if (playerDetails && user.personal_info) {
        const idade = user.personal_info.idade || 'N/A';
        const altura = user.personal_info.altura ? `${user.personal_info.altura}cm` : 'N/A';
        const peso = user.personal_info.peso ? `${user.personal_info.peso}kg` : 'N/A';
        playerDetails.textContent = `Idade: ${idade} | Altura: ${altura} | Peso: ${peso}`;
    }
}

// Função para renderizar sessões
function renderSessions(user) {
    const sessionGrid = document.querySelector('.session-grid');

    if (!sessionGrid) {
        console.error('Container de sessões não encontrado');
        return;
    }

    // Limpar conteúdo existente
    sessionGrid.innerHTML = '';

    // Verificar se o usuário tem sessões
    if (!user.sessions || typeof user.sessions !== 'object') {
        showNoSessions(sessionGrid);
        return;
    }

    // Converter objeto de sessões para array com IDs
    const sessionsArray = Object.entries(user.sessions).map(([id, session]) => ({
        id,
        ...session
    }));

    // Verificar se há sessões
    if (sessionsArray.length === 0) {
        showNoSessions(sessionGrid);
        return;
    }

    // Ordenar sessões por data (mais recente primeiro)
    const sortedSessions = sessionsArray.sort((a, b) =>
        new Date(b.occurredAt) - new Date(a.occurredAt)
    );

    // Criar cards para cada sessão
    sortedSessions.forEach(session => {
        const sessionCard = createSessionCard(session);
        sessionGrid.appendChild(sessionCard);
    });

    console.log(`${sortedSessions.length} sessões renderizadas com sucesso`);
}

// Função para criar card de sessão
function createSessionCard(session) {
    console.log(session)
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    sessionItem.setAttribute('data-session-id', session.id);

    const sessionDate = formatDate(session.occurredAt);
    const sessionTime = formatTime(session.occurredAt);

    // Extrair estatísticas com valores padrão
    const stats = session.stats || {};
    const duration = formatDuration(stats.sessionDuration || 0);
    const reps = stats.reps || 0;
    const repsByMinute = (stats.repsByMinute || 0).toFixed(1);
    const distance = (stats.distance || 0).toFixed(2);
    const avgDepth = stats.avgDepth ?? '0.0';

    sessionItem.innerHTML = `
        <div class="session-date">
            <div class="date-icon">📅</div>
            <div>
                <div>${sessionDate}</div>
                <div style="font-size: 0.85rem; opacity: 0.7; font-weight: normal;">${sessionTime}</div>
            </div>
        </div>
        <div class="session-stats">
            <div style="display: flex; flex-direction: column; gap: 0.8rem; flex: 1;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div class="stat-group">
                        <div class="stat-icon">⏱️</div>
                        <span>${duration}</span>
                    </div>
                    <div class="stat-group">
                        <div class="stat-icon">🔢</div>
                        <span>${reps} reps</span>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div class="stat-group">
                        <div class="stat-icon">📊</div>
                        <span>${repsByMinute} reps/min</span>
                    </div>
                    <div class="stat-group">
                        <div class="stat-icon">📏</div>
                        <span>${distance}m</span>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div class="stat-group">
                        <div class="stat-icon">🎯</div>
                        <span>${avgDepth}%</span>
                    </div>
                </div>
            </div>
            <div class="download-button" title="Baixar dados da sessão">
                <svg class="download-icon-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3V16M12 16L7 11M12 16L17 11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </div>
        </div>
    `;

    // Adicionar event listener para clique
    sessionItem.addEventListener('click', function (e) {
        // Não abrir detalhes se clicar no botão de download
        if (e.target.classList.contains('download-button')) {
            return;
        }
        showSessionDetails(session);
    });

    // Event listener para botão de download
    const downloadButton = sessionItem.querySelector('.download-button');
    downloadButton.addEventListener('click', function (e) {
        e.stopPropagation();
        downloadSessionActivities(session);
    });

    return sessionItem;
}

// Função para mostrar mensagem quando não há sessões
function showNoSessions(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; color: #8B4513; grid-column: 1 / -1;">
            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📊</div>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Nenhuma sessão registrada</h3>
            <p style="font-size: 1.1rem; opacity: 0.7;">Clique em "Iniciar Nova Sessão" para começar!</p>
        </div>
    `;
}

// Função para mostrar erro
function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: rgba(255, 107, 53, 0.1);
            border: 2px solid rgba(255, 107, 53, 0.3);
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            color: #8B4513;
            margin: 2rem 0;
        `;
        errorDiv.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Erro</h3>
            <p style="font-size: 1.1rem;">${message}</p>
        `;
        container.insertBefore(errorDiv, container.firstChild);
    }
}

// Função para mostrar detalhes da sessão
function showSessionDetails(session) {
    console.log('Detalhes da sessão:', session);

    const avgDepth = session.stats.avgDepth ?? '0.0';

    // Aqui você pode implementar um modal ou navegação para página de detalhes
    alert(`Sessão #${session.id}\n\nData: ${formatDate(session.occurredAt)}\nDuração: ${formatDuration(session.stats.sessionDuration)}\nRepetições: ${session.stats.reps}\nDistância: ${session.stats.distance.toFixed(2)}m\nProfundidade Média: ${avgDepth}%`);
}

// Função para baixar as atividades da sessão em JSON
function downloadSessionActivities(session) {
    // Verificar se a sessão tem atividades
    if (!session.activities || !Array.isArray(session.activities)) {
        alert('Esta sessão não possui atividades registradas.');
        console.warn('Sessão sem atividades:', session);
        return;
    }

    // Preparar os dados para download
    const activitiesData = {
        sessionId: session.id,
        sessionDate: session.occurredAt,
        sessionStats: session.stats,
        activities: session.activities
    };

    // Converter para JSON com formatação
    const jsonString = JSON.stringify(activitiesData, null, 2);

    // Criar blob com os dados
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Criar URL temporária para o blob
    const url = URL.createObjectURL(blob);

    // Criar elemento de link temporário
    const link = document.createElement('a');
    link.href = url;
    
    // Criar nome do arquivo com data da sessão
    const sessionDate = new Date(session.occurredAt);
    const dateStr = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = sessionDate.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    link.download = `session_${session.id}_${dateStr}_${timeStr}_activities.json`;

    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar URL temporária
    URL.revokeObjectURL(url);

    console.log(`Download iniciado para sessão ${session.id}`);
}

// Função para baixar todas as sessões de um usuário
function downloadAllSessions() {
    const userId = getUrlParameter('id');

    if (!userId) {
        alert('Erro: ID do usuário não encontrado');
        console.error('ID do usuário não encontrado na URL');
        return;
    }

    // Buscar dados no localStorage
    const usersData = localStorage.getItem('users');
    if (!usersData) {
        alert('Erro: Dados de usuários não encontrados');
        console.error('Dados de usuários não encontrados no localStorage');
        return;
    }

    let users;
    try {
        users = JSON.parse(usersData);
    } catch (error) {
        alert('Erro ao carregar dados dos usuários');
        console.error('Erro ao parsear dados dos usuários:', error);
        return;
    }

    // Encontrar usuário pelo ID
    const user = users.find(u => u && u.id === userId);
    if (!user) {
        alert('Erro: Usuário não encontrado');
        console.error('Usuário não encontrado com ID:', userId);
        return;
    }

    // Verificar se o usuário tem sessões
    if (!user.sessions || typeof user.sessions !== 'object' || Object.keys(user.sessions).length === 0) {
        alert('Este usuário não possui sessões registradas.');
        return;
    }

    // Converter objeto de sessões para array
    const sessionsArray = Object.entries(user.sessions).map(([id, session]) => ({
        id,
        ...session
    }));

    // Preparar dados completos para download
    const exportData = {
        exportDate: new Date().toISOString(),
        user: {
            id: user.id,
            name: user.personal_info?.nome || 'N/A',
            age: user.personal_info?.idade || 'N/A',
            height: user.personal_info?.altura || 'N/A',
            weight: user.personal_info?.peso || 'N/A'
        },
        totalSessions: sessionsArray.length,
        sessions: sessionsArray.map(session => ({
            sessionId: session.id,
            occurredAt: session.occurredAt,
            stats: session.stats,
            activities: session.activities || []
        }))
    };

    // Converter para JSON com formatação
    const jsonString = JSON.stringify(exportData, null, 2);

    // Criar blob com os dados
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Criar URL temporária para o blob
    const url = URL.createObjectURL(blob);

    // Criar elemento de link temporário
    const link = document.createElement('a');
    link.href = url;
    
    // Criar nome do arquivo com data atual e nome do usuário
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const userName = (user.personal_info?.nome || 'usuario').replace(/\s+/g, '_').toLowerCase();
    link.download = `${userName}_todas_sessoes_${dateStr}.json`;

    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar URL temporária
    URL.revokeObjectURL(url);

    console.log(`Download de ${sessionsArray.length} sessões iniciado para usuário ${user.personal_info?.nome}`);
}

// Função para criar partículas
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particlesContainer.appendChild(particle);
    }
}

// Função para iniciar nova sessão
function startNewSession() {
    const userId = getUrlParameter('id');
    if (!userId) {
        console.error('ID do usuário não encontrado para iniciar sessão');
        alert('Erro: ID do usuário não encontrado');
        return;
    }

    const sessionConfig = getSessionConfig();
    const configParam = encodeURIComponent(JSON.stringify(sessionConfig));

    window.open(`/Assets/scenes/game/incont_urinaria/game.html?id=${userId}&sessionConfig=${configParam}`, '_self');
}

// Função para obter configurações da sessão
function getSessionConfig() {
    const sessionTime = document.getElementById('sessionTime')?.value || 20;
    const sessionType = document.getElementById('sessionType')?.value || 'resistencia';
    const figuresByMinute = document.getElementById('figuresByMinute')?.value || 3;
    const figuresDuration = document.getElementById('figureDuration')?.value || 4;

    const config = {
        sessionDuration: parseInt(sessionTime, 10),
        sessionType: sessionType,
        figuresByMinute: parseInt(figuresByMinute, 10),
        figuresDuration: parseInt(figuresDuration, 10)
    };

    console.log('Configurações da Sessão:', config);
    return config;
}

// Função para toggle do config
function toggleConfig() {
    const wrapper = document.querySelector('.session-config-wrapper');
    const btn = document.querySelector('.config-toggle-btn');

    if (wrapper && btn) {
        wrapper.classList.toggle('expanded');
        btn.classList.toggle('active');
    }
}

// Executar quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    loadUserData();
    createParticles();
});