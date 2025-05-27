  // Variáveis para os gráficos
        let typeChart, unitChart, statusChart, expirationChart;
        let timelineChart, unitStatusChart, creationChart, typeStatusChart;
        
        document.addEventListener('DOMContentLoaded', function() {
            // Referências do Firestore
            const db = firebase.firestore();
            let currentUser = null;
            
            // Carrega informações do usuário
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    currentUser = user;
                    document.getElementById('sidebar-user-name').textContent = user.displayName || user.email;
                    
                    db.collection('users').doc(user.uid).get()
                        .then(doc => {
                            if (doc.exists) {
                                const userData = doc.data();
                                document.getElementById('sidebar-user-unit').textContent = userData.unit || 'Unidade não definida';
                            }
                        })
                        .catch(error => {
                            console.error("Erro ao buscar dados do usuário:", error);
                            document.getElementById('sidebar-user-unit').textContent = 'Erro ao carregar unidade';
                        });
                    
                    // Carrega documentos e filtros
                    loadDocuments();
                    loadFilterOptions();
                } else {
                    window.location.href = 'index.html';
                }
            });
            
            // Logout
            document.getElementById('sidebar-logout-btn').addEventListener('click', function() {
                firebase.auth().signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
            
            // Carrega opções de filtro

            function isCorporateManagement(userRole) {
            return userRole === 'gestão corp' || userRole === 'gestão_corp' || userRole === 'gestao_corp'; 
        }

            // Carrega as opções de filtro baseadas no perfil do usuário
            function loadFilterOptions() {
            showLoading(true, 'Carregando opções de filtro...');
            
            db.collection('users').doc(currentUser.uid).get().then(userDoc => {
                if (!userDoc.exists) {
                    throw new Error("Dados do usuário não encontrados");
                }

                const userData = userDoc.data();
                const userUnit = userData.unit;
                const userRole = userData.role || 'user';
                
                const unitFilter = document.getElementById('filter-unit');
                const typeFilter = document.getElementById('filter-type');
                
                const promises = [];
                
                // Carrega unidades conforme perfil
                if (isCorporateManagement(userRole)) {
                    // Habilita o filtro de unidade para gestão corporativa
                    unitFilter.disabled = false;
                    
                    promises.push(
                        db.collection('documentos').get().then(querySnapshot => {
                            const units = new Set(['']); // Opção "Todas as unidades"
                            
                            querySnapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.unidade) units.add(data.unidade);
                            });
                            
                            // Limpa e preenche o filtro de unidades
                            unitFilter.innerHTML = '<option value="">Todas as unidades</option>';
                            Array.from(units).sort().forEach(unit => {
                                if (unit) { // Não adiciona a string vazia novamente
                                    const option = document.createElement('option');
                                    option.value = unit;
                                    option.textContent = unit;
                                    unitFilter.appendChild(option);
                                }
                            });
                        })
                    );
                } else {
                    // Usuário normal - trava na unidade dele
                    unitFilter.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = userUnit || '';
                    option.textContent = userUnit || 'Unidade não definida';
                    option.selected = false;
                    unitFilter.appendChild(option);
                    unitFilter.disabled = false;
                }
                
                // Carrega tipos de documentos (para todos os perfis)
                promises.push(
                    db.collection('documentos').get().then(querySnapshot => {
                        const types = new Set(['']); // Opção "Todos os tipos"
                        
                        querySnapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.tipo) types.add(data.tipo);
                        });
                        
                        // Limpa e preenche o filtro de tipos
                        typeFilter.innerHTML = '<option value="">Todos os tipos</option>';
                        Array.from(types).sort().forEach(type => {
                            if (type) { // Não adiciona a string vazia novamente
                                const option = document.createElement('option');
                                option.value = type;
                                option.textContent = type;
                                typeFilter.appendChild(option);
                            }
                        });
                    })
                );
                
                return Promise.all(promises);
            })
            .then(() => {
                showLoading(false);
                // Carrega os documentos sem filtro inicial se for gestão corporativa
                db.collection('users').doc(currentUser.uid).get().then(userDoc => {
                    const userData = userDoc.data();
                    if (isCorporateManagement(userData.role)) {
                        loadDocuments(); // Carrega todos os documentos sem filtro
                    } else if (userData.unit) {
                        loadDocuments({ unit: userData.unit }); // Filtra pela unidade do usuário
                    }
                });
            })
            .catch(error => {
                console.error("Erro ao carregar opções de filtro:", error);
                showError("Erro ao carregar filtros. Tente recarregar a página.");
                showLoading(false);
            });
        }

            // Carrega documentos aplicando os filtros
            function loadDocuments(filters = {}) {
            showLoading(true, 'Carregando documentos...');
            
            let query = db.collection('documentos');
            
            // Verifica o perfil do usuário primeiro
            db.collection('users').doc(currentUser.uid).get().then(userDoc => {
                if (!userDoc.exists) {
                    throw new Error("Dados do usuário não encontrados");
                }

                const userData = userDoc.data();
                const userRole = userData.role || 'user';
                const userUnit = userData.unit;
                
                if (filters.unit) {
                    query = query.where('unidade', '==', filters.unit);
                }
                
                if (filters.type) {
                    query = query.where('tipo', '==', filters.type);
                }
                
                // Filtro de status (se aplicável)
                if (filters.status) {
                    const now = new Date();
                    if (filters.status === 'valido') {
                        query = query.where('validade', '>=', now);
                    } else if (filters.status === 'vencido') {
                        query = query.where('validade', '<', now);
                    }
                }
                
                return query.get();
            })
                .then(querySnapshot => {
                    if (!querySnapshot || querySnapshot.empty) {
                        showMessage("Nenhum documento encontrado com os filtros aplicados.");
                        resetCharts(); // Limpa os gráficos se não houver resultados
                        return;
                    }
                    
                    const now = new Date();
                    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    
                    // Inicializa estruturas para os gráficos
                    const chartData = {
                        typeData: {},
                        unitData: {},
                        statusData: { 'Válido': 0, 'Vencido': 0 },
                        expirationData: Object.fromEntries(months.map(month => [month, 0])),
                        creationData: Object.fromEntries(months.map(month => [month, 0])),
                        unitStatusData: {},
                        typeStatusData: {}
                    };
                    
                    // Processa cada documento
                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        const validade = data.validade ? new Date(data.validade.toDate()) : null;
                        const criadoEm = data.criadoEm ? new Date(data.criadoEm.toDate()) : new Date();
                        
                        // Determina status do documento
                        let status = 'Válido';
                        if (validade && validade < now) {
                            status = 'Vencido';
                        }
                        
                        // Contagem por mês de vencimento
                        if (validade) {
                            const expMonthIndex = validade.getMonth();
                            chartData.expirationData[months[expMonthIndex]]++;
                        }
                        
                        // Contagem por mês de criação
                        const creationMonthIndex = criadoEm.getMonth();
                        chartData.creationData[months[creationMonthIndex]]++;
                        
                        // Atualiza dados gerais
                        chartData.statusData[status]++;
                        
                        // Contagem por tipo
                        const tipo = data.tipo || 'Não especificado';
                        chartData.typeData[tipo] = (chartData.typeData[tipo] || 0) + 1;
                        
                        // Contagem por unidade
                        const unidade = data.unidade || 'Não especificada';
                        chartData.unitData[unidade] = (chartData.unitData[unidade] || 0) + 1;
                        
                        // Status por unidade
                        if (!chartData.unitStatusData[unidade]) {
                            chartData.unitStatusData[unidade] = { 'Válido': 0, 'Vencido': 0 };
                        }
                        chartData.unitStatusData[unidade][status]++;
                        
                        // Status por tipo
                        if (!chartData.typeStatusData[tipo]) {
                            chartData.typeStatusData[tipo] = { 'Válido': 0, 'Vencido': 0 };
                        }
                        chartData.typeStatusData[tipo][status]++;
                    });
                    
                    // Atualiza todos os gráficos
                    updateAllCharts(chartData);
                    
                    // Mostra contagem de documentos
                    showDocumentCount(querySnapshot.size);
                })
                .catch(error => {
                    console.error("Erro ao carregar documentos:", error);
                    showError("Erro ao carregar documentos. Tente novamente.");
                })
                .finally(() => {
                    showLoading(false);
                });
            }

            // Funções auxiliares (exemplos - implemente conforme sua necessidade)
            function showLoading(show, message = '') {
                // Implemente a exibição de um spinner/loading
            }

            function showError(message) {
                // Implemente a exibição de mensagens de erro
            }

            function showMessage(message) {
                // Implemente a exibição de mensagens informativas
            }

            function resetCharts() {
                // Implemente a limpeza/reset dos gráficos
            }

            function updateAllCharts(chartData) {
                // Atualiza todos os gráficos de uma vez
                updateTypeChart(chartData.typeData);
                updateUnitChart(chartData.unitData);
                updateStatusChart(chartData.statusData);
                updateExpirationChart(chartData.expirationData, Object.keys(chartData.expirationData));
                updateTimelineChart(chartData.expirationData, chartData.creationData, Object.keys(chartData.expirationData));
                updateUnitStatusChart(chartData.unitStatusData);
                updateCreationChart(chartData.creationData, Object.keys(chartData.creationData));
                updateTypeStatusChart(chartData.typeStatusData);
            }

            function showDocumentCount(count) {
            const countElement = document.getElementById('document-count');
            if (countElement) {
                countElement.textContent = `${count} documentos encontrados`;
            }
        }
            
            // Funções para atualizar gráficos
            function updateTypeChart(data) {
                const ctx = document.getElementById('typeChart').getContext('2d');
                const labels = Object.keys(data);
                const values = Object.values(data);
                
                if (typeChart) {
                    typeChart.data.labels = labels;
                    typeChart.data.datasets[0].data = values;
                    typeChart.update();
                } else {
                    typeChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                data: values,
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                                    '#9966FF', '#FF9F40', '#8AC24A', '#607D8B'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'right',
                                }
                            }
                        }
                    });
                }
            }
            
            function updateUnitChart(data) {
                const ctx = document.getElementById('unitChart').getContext('2d');
                const labels = Object.keys(data);
                const values = Object.values(data);
                
                if (unitChart) {
                    unitChart.data.labels = labels;
                    unitChart.data.datasets[0].data = values;
                    unitChart.update();
                } else {
                    unitChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Documentos por Unidade',
                                data: values,
                                backgroundColor: '#36A2EB',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            function updateStatusChart(data) {
                const ctx = document.getElementById('statusChart').getContext('2d');
                const labels = Object.keys(data);
                const values = Object.values(data);
                
                if (statusChart) {
                    statusChart.data.labels = labels;
                    statusChart.data.datasets[0].data = values;
                    statusChart.update();
                } else {
                    statusChart = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: labels,
                            datasets: [{
                                data: values,
                                backgroundColor: [
                                    '#28a745', // Verde para válido
                                    '#dc3545'  // Vermelho para vencido
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'right',
                                }
                            }
                        }
                    });
                }
            }
            
            function updateExpirationChart(data, months) {
                const ctx = document.getElementById('expirationChart').getContext('2d');
                const labels = months;
                const values = months.map(month => data[month] || 0);
                
                if (expirationChart) {
                    expirationChart.data.labels = labels;
                    expirationChart.data.datasets[0].data = values;
                    expirationChart.update();
                } else {
                    expirationChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Documentos que vencem',
                                data: values,
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 2,
                                tension: 0.1,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            function updateTimelineChart(expirationData, creationData, months) {
                const ctx = document.getElementById('timelineChart').getContext('2d');
                const labels = months;
                const expirationValues = months.map(month => expirationData[month] || 0);
                const creationValues = months.map(month => creationData[month] || 0);
                
                if (timelineChart) {
                    timelineChart.data.labels = labels;
                    timelineChart.data.datasets[0].data = creationValues;
                    timelineChart.data.datasets[1].data = expirationValues;
                    timelineChart.update();
                } else {
                    timelineChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Documentos criados',
                                    data: creationValues,
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                    borderWidth: 2,
                                    tension: 0.1,
                                    fill: true
                                },
                                {
                                    label: 'Documentos que vencem',
                                    data: expirationValues,
                                    borderColor: 'rgba(255, 99, 132, 1)',
                                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                    borderWidth: 2,
                                    tension: 0.1,
                                    fill: true
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            function updateUnitStatusChart(data) {
                const ctx = document.getElementById('unitStatusChart').getContext('2d');
                const units = Object.keys(data);
                const validData = units.map(unit => data[unit]['Válido'] || 0);
                const expiredData = units.map(unit => data[unit]['Vencido'] || 0);
                
                if (unitStatusChart) {
                    unitStatusChart.data.labels = units;
                    unitStatusChart.data.datasets[0].data = validData;
                    unitStatusChart.data.datasets[1].data = expiredData;
                    unitStatusChart.update();
                } else {
                    unitStatusChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: units,
                            datasets: [
                                {
                                    label: 'Válidos',
                                    data: validData,
                                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                                    borderColor: 'rgba(40, 167, 69, 1)',
                                    borderWidth: 1
                                },
                                {
                                    label: 'Vencidos',
                                    data: expiredData,
                                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                                    borderColor: 'rgba(220, 53, 69, 1)',
                                    borderWidth: 1
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    stacked: true,
                                },
                                y: {
                                    stacked: true,
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            function updateCreationChart(data, months) {
                const ctx = document.getElementById('creationChart').getContext('2d');
                const labels = months;
                const values = months.map(month => data[month] || 0);
                
                if (creationChart) {
                    creationChart.data.labels = labels;
                    creationChart.data.datasets[0].data = values;
                    creationChart.update();
                } else {
                    creationChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Documentos criados',
                                data: values,
                                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            function updateTypeStatusChart(data) {
                const ctx = document.getElementById('typeStatusChart').getContext('2d');
                const types = Object.keys(data);
                const validData = types.map(type => data[type]['Válido'] || 0);
                const expiredData = types.map(type => data[type]['Vencido'] || 0);
                
                if (typeStatusChart) {
                    typeStatusChart.data.labels = types;
                    typeStatusChart.data.datasets[0].data = validData;
                    typeStatusChart.data.datasets[1].data = expiredData;
                    typeStatusChart.update();
                } else {
                    typeStatusChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: types,
                            datasets: [
                                {
                                    label: 'Válidos',
                                    data: validData,
                                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                                    borderColor: 'rgba(40, 167, 69, 1)',
                                    borderWidth: 1
                                },
                                {
                                    label: 'Vencidos',
                                    data: expiredData,
                                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                                    borderColor: 'rgba(220, 53, 69, 1)',
                                    borderWidth: 1
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    stacked: true,
                                },
                                y: {
                                    stacked: true,
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            // Aplica filtros
            document.getElementById('apply-filters').addEventListener('click', function() {
                const filters = {
                    unit: document.getElementById('filter-unit').value,
                    type: document.getElementById('filter-type').value,
                    status: document.getElementById('filter-status').value
                };
                
                loadDocuments(filters);
            });
        });
        // Modifique a função loadUnitSelector para garantir que está recebendo os dados corretos
function loadUnitSelector(userData) {
    console.log('Dados do usuário recebidos:', userData); // Adicione este log para depuração
    
    const unitSelector = document.getElementById('unit-selector');
    const confirmBtn = document.getElementById('confirm-unit-change');
    const currentUnit = userData.unit || '';
    const unitReserv = userData.unitreserv || [];
    
    console.log('Unidade atual:', currentUnit); // Log para depuração
    console.log('Unidades reserva:', unitReserv); // Log para depuração

    // Limpa e popula o seletor
    unitSelector.innerHTML = '<option value="">Selecione uma unidade</option>';
    
    unitReserv.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        if (unit === currentUnit) {
            option.selected = true;
        }
        unitSelector.appendChild(option);
    });

    // Mostra o container se for gestão corp
    const isGestaoCorp = currentUnit.toLowerCase().includes('gestão corp') || 
                         currentUnit.toLowerCase().includes('gestao corp') || 
                         currentUnit.toLowerCase().includes('gestão_corp');
    
    document.getElementById('unit-selector-container').style.display = 'block' ;
    console.log('Seletor visível?', isGestaoCorp); // Log para depuração

    // Evento de mudança no select
    unitSelector.addEventListener('change', function() {
        const selectedUnit = this.value;
        confirmBtn.style.display = (selectedUnit && selectedUnit !== currentUnit) ? 'block' : 'none';
    });

    // Evento de clique no botão de confirmação
    confirmBtn.addEventListener('click', function() {
        const newUnit = unitSelector.value;
        if (newUnit && newUnit !== currentUnit) {
            updateUserUnit(newUnit, currentUser.uid); // Passar o UID do usuário
        }
    });
}

// Modifique a função updateUserUnit para incluir mais logs e tratamento de erro
function updateUserUnit(newUnit, userId) {
    console.log('Tentando atualizar unidade para:', newUnit, 'do usuário:', userId); // Log para depuração
    
    showLoading(true, 'Atualizando unidade...');
    
    const db = firebase.firestore();
    
    db.collection('users').doc(userId).update({
        unit: newUnit
    })
    .then(() => {
        console.log('Unidade atualizada com sucesso no banco de dados'); // Log para depuração
        // Atualiza a interface
        document.getElementById('sidebar-user-unit').textContent = newUnit;
        document.getElementById('filter-unit').value = newUnit;
        document.getElementById('confirm-unit-change').style.display = 'none';
        
        // Recarrega os dados
        loadDocuments({ unit: newUnit });
        
        showMessage(`Unidade alterada para: ${newUnit}`);
        
        // Força recarregar os dados do usuário do Firestore
        return db.collection('users').doc(userId).get();
    })
    .then(doc => {
        if (doc.exists) {
            console.log('Dados atualizados do usuário:', doc.data()); // Log para depuração
        }
    })
    .catch(error => {
        console.error("Erro detalhado ao atualizar unidade:", error); // Log mais detalhado
        showError(`Erro ao alterar unidade: ${error.message}`);
    })
    .finally(() => {
        showLoading(false);
    });
}

// Na função que carrega os dados do usuário, modifique para:
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        currentUser = user;
        console.log('Usuário autenticado:', user.uid); // Log para depuração
        document.getElementById('sidebar-user-name').textContent = user.displayName || user.email;
        
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    console.log('Dados do Firestore:', userData); // Log para depuração
                    document.getElementById('sidebar-user-unit').textContent = userData.unit || 'Unidade não definida';
                    
                    // Verifica se unitreserv existe, caso contrário, cria com a unidade atual
                    if (!userData.unitreserv) {
                        userData.unitreserv = [userData.unit];
                    }
                    
                    loadUnitSelector(userData);
                } else {
                    console.error("Documento do usuário não encontrado no Firestore");
                }
            })
            .catch(error => {
                console.error("Erro detalhado ao buscar dados do usuário:", error);
                document.getElementById('sidebar-user-unit').textContent = 'Erro ao carregar unidade';
            });
    } else {
        window.location.href = 'index.html';
    }
});
function showLoading(show, message = '') {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
        if (message) {
            loadingElement.textContent = message;
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o link de Gerenciamento de Unidades existe
    const gerenciamentoLink = document.querySelector('a[href="gerenciamento_user_units.html"]');
    
    if (gerenciamentoLink) {
        gerenciamentoLink.addEventListener('click', function(e) {
            e.preventDefault(); // Impede o redirecionamento padrão
            
            // Solicita a senha do usuário
            const senhaInserida = prompt("🔒 Acesso Restrito\nPor favor, insira a senha para acessar o Gerenciamento de Unidades:");
            
            // Senha correta: "corp1234"
            if (senhaInserida === "corp1234") {
                window.location.href = "gerenciamento_user_units.html"; // Redireciona se a senha estiver correta
            } else {
                alert("❌ Senha incorreta! Acesso negado."); // Exibe erro se a senha estiver errada
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o link de Gerenciamento de Unidades existe
    const gerenciamentoLink = document.querySelector('a[href="documentos_desativados.html"]');
    
    if (gerenciamentoLink) {
        gerenciamentoLink.addEventListener('click', function(e) {
            e.preventDefault(); // Impede o redirecionamento padrão
            
            // Solicita a senha do usuário
            const senhaInserida = prompt("🔒 Acesso Restrito\nPor favor, insira a senha para acessar o Gerenciamento de Unidades:");
            
            // Senha correta: "corp1234"
            if (senhaInserida === "corp1234") {
                window.location.href = "documentos_desativados.html"; // Redireciona se a senha estiver correta
            } else {
                alert("❌ Senha incorreta! Acesso negado."); // Exibe erro se a senha estiver errada
            }
        });
    }
});