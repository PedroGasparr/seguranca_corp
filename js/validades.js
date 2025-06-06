     // Variáveis globais
        let currentUser = null;
        let currentUnitId = null;
        let allUnits = [];
        let allDocuments = [];
        let selectedUnitId = null;
        let isViewingAsUnit = false;
        let selectedDocuments = [];

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            firebase.auth().onAuthStateChanged(async function(user) {
                if (user) {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        currentUser = {
                            uid: user.uid,
                            email: user.email,
                            displayName: userData.name || user.email,
                            unidade: userData.unit || 'Não definida',
                            unidadeId: userData.unitId || userData.unit
                        };
                        
                        // Atualiza a sidebar
                        document.getElementById('sidebar-user-name').textContent = currentUser.displayName;
                        document.getElementById('sidebar-user-unit').textContent = currentUser.unidade;
                        
                        // Carrega unidades (para gestão corp)
                        if (currentUser.unidade.toLowerCase() === 'gestão corp') {
                            await loadAllUnits();
                            showCorpView();
                        } else {
                            currentUnitId = currentUser.unidadeId;
                            showUnitView(currentUnitId);
                        }
                    }
                } else {
                    window.location.href = 'index.html';
                }
            });

            // Event listeners
            document.getElementById('sidebar-logout-btn')?.addEventListener('click', logoutUser);
            document.getElementById('send-email-btn')?.addEventListener('click', showEmailModal);
            document.getElementById('cancel-email-btn')?.addEventListener('click', () => {
                document.getElementById('email-modal').classList.remove('modal-open');
            });
            document.getElementById('confirm-send-email-btn')?.addEventListener('click', sendEmailAlert);
            document.getElementById('back-to-corp')?.addEventListener('click', backToCorpView);
            
            // Fechar modais
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.getElementById('unit-documents-modal').classList.remove('modal-open');
                    document.getElementById('email-modal').classList.remove('modal-open');
                });
            });
            
            window.addEventListener('click', function(e) {
                if (e.target === document.getElementById('unit-documents-modal')) {
                    document.getElementById('unit-documents-modal').classList.remove('modal-open');
                }
                if (e.target === document.getElementById('email-modal')) {
                    document.getElementById('email-modal').classList.remove('modal-open');
                }
            });
        });

        // Mostrar visão para unidades comuns
        async function showUnitView(unitId, unitName = null, isFromCorpView = false) {
            document.getElementById('unit-view').style.display = 'block';
            document.getElementById('corp-view').style.display = 'none';
            
            if (isFromCorpView) {
                isViewingAsUnit = true;
                document.getElementById('back-to-corp').style.display = 'block';
                
                // Atualiza a sidebar temporariamente para mostrar a unidade selecionada
                document.getElementById('sidebar-user-unit').textContent = unitName || 'Visualizando Unidade';
            } else {
                isViewingAsUnit = false;
                document.getElementById('back-to-corp').style.display = 'none';
            }
            
            const unitNameToShow = unitName || currentUser.unidade;
            document.getElementById('unit-name-title').textContent = unitNameToShow;
            
            await loadUnitDocuments(unitId);
        }

        // Voltar para a visão corporativa
        function backToCorpView() {
            isViewingAsUnit = false;
            document.getElementById('back-to-corp').style.display = 'none';
            
            // Restaura a sidebar para mostrar o usuário real
            document.getElementById('sidebar-user-unit').textContent = currentUser.unidade;
            
            showCorpView();
        }
        
        // Mostrar visão para gestão corp
        async function showCorpView() {
            document.getElementById('unit-view').style.display = 'none';
            document.getElementById('corp-view').style.display = 'flex';
            
            const corpView = document.getElementById('corp-view');
            corpView.innerHTML = '';
            
            // Adiciona um loader enquanto carrega
            corpView.innerHTML = '<div class="loading">Carregando unidades...</div>';
            
            try {
                // Garante que os dados estão carregados
                if (allUnits.length === 0) {
                    await loadAllUnits();
                }
                
                corpView.innerHTML = ''; // Limpa o loader
                
                for (const unit of allUnits) {
                    if (unit.id === 'gestão corp') continue;
                    
                    const unitDocs = allDocuments.filter(doc => doc.unidadeId === unit.id);
                    
                    // Modificado: considerar apenas conforme e vencidos (com base em dias)
                    const conformeCount = unitDocs.filter(doc => doc.daysLeft >= 0).length;
                    const vencidoCount = unitDocs.filter(doc => doc.daysLeft < 0).length;
                    
                    // Pegar os 2 documentos mais vencidos para mostrar no card
                    const vencidos = unitDocs.filter(doc => doc.daysLeft < 0)
                                            .sort((a, b) => a.daysLeft - b.daysLeft)
                                            .slice(0, 2);
                    
                    const card = document.createElement('div');
                    card.className = 'unit-card';
                    card.setAttribute('data-unit-id', unit.id);
                    card.setAttribute('data-unit-name', unit.name);
                    
                    card.innerHTML = `
                        <h3>${unit.name}</h3>
                        <div class="status-count">
                            <div class="status-item">
                                <div class="status-value conforme">${conformeCount}</div>
                                <div>Conformes</div>
                            </div>
                            <div class="status-item">
                                <div class="status-value vencido">${vencidoCount}</div>
                                <div>Vencidos</div>
                            </div>
                        </div>
                        <div class="document-list">
                            ${vencidos.map(doc => `
                                <div class="document-item vencido">
                                    <div>${doc.nome}</div>
                                    <div class="days-left negative-days">
                                        Venceu há ${Math.abs(doc.daysLeft)} dias
                                    </div>
                                </div>
                            `).join('')}
                            ${vencidoCount > 2 ? `<div>+ ${vencidoCount - 2} mais vencidos...</div>` : ''}
                        </div>
                        <button class="btn-view-docs" data-unit-id="${unit.id}" data-unit-name="${unit.name}">
                            <i class="fas fa-eye"></i> Ver Documentos
                        </button>
                    `;
                    const btn = card.querySelector(`button[data-unit-id="${unit.id}"]`);
                    if (btn) btn.style.display = "none";

                    corpView.appendChild(card);
                }

                // Restante do código permanece igual...
                // Event delegation para os cards
                corpView.addEventListener('click', function(e) {
                    const card = e.target.closest('.unit-card');
                    const btn = e.target.closest('.btn-view-docs');
                    
                    if (card && !btn) {
                        // Clicou no card inteiro (exceto no botão)
                        const unitId = card.getAttribute('data-unit-id');
                        const unitName = card.getAttribute('data-unit-name');
                        showUnitView(unitId, unitName, true);
                    } else if (btn) {
                        // Clicou no botão "Ver Documentos"
                        const unitId = btn.getAttribute('data-unit-id');
                        const unitName = btn.getAttribute('data-unit-name');
                        showUnitDocumentsModal(unitId, unitName);
                    }
                });

            } catch (error) {
                console.error('Erro ao mostrar visão corporativa:', error);
                corpView.innerHTML = '<div class="error">Erro ao carregar unidades. Tente recarregar a página.</div>';
            }
        }

        // Carregar todas as unidades
        async function loadAllUnits() {
            try {
                const docsSnapshot = await firebase.firestore().collection('documentos').get();
                
                allDocuments = docsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const validadeDate = data.validade.toDate();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysLeft = Math.ceil((validadeDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    
                    return {
                        id: doc.id,
                        ...data,
                        validadeDate,
                        daysLeft
                    };
                });

                const unidadesMap = new Map();
                allDocuments.forEach(doc => {
                    if (doc.unidadeId) {
                        unidadesMap.set(doc.unidadeId, doc.unidade || doc.unidadeId);
                    }
                });

                allUnits = Array.from(unidadesMap, ([id, name]) => ({ id, name }));
            } catch (error) {
                console.error("Erro ao carregar unidades:", error);
                allUnits = [];
                allDocuments = [];
            }
        }

        // Mostrar modal de documentos da unidade
        async function showUnitDocumentsModal(unitId, unitName) {
            selectedUnitId = unitId;
            const modal = document.getElementById('unit-documents-modal');
            const modalTitle = document.getElementById('modal-unit-name');
            
            modalTitle.textContent = `Documentos - ${unitName}`;
            
            try {
                const querySnapshot = await firebase.firestore().collection('documentos')
                    .where('unidadeId', '==', unitId)
                    .get();
                
                const unitDocs = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const validadeDate = data.validade.toDate();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysLeft = Math.ceil((validadeDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    
                    // Determina o status baseado apenas nos dias
                    const status = daysLeft >= 0 ? 'conforme' : 'vencido';
                    
                    return {
                        id: doc.id,
                        ...data,
                        validadeDate,
                        daysLeft,
                        status, // Usamos o status calculado aqui
                        arquivoBase64: data.arquivoBase64 || '',
                        arquivoTipo: data.arquivoTipo || 'application/pdf',
                        arquivoNome: data.arquivoNome || 'documento.pdf'
                    };
                });

                // Atualiza contadores com a nova lógica
                document.getElementById('modal-conforme-count').textContent = 
                    unitDocs.filter(doc => doc.daysLeft >= 0).length;
                // Remove o contador de atualização ou esconde o elemento
                document.getElementById('modal-atualizacao-count').textContent = '0';
                document.getElementById('modal-atualizacao-count').parentElement.style.display = 'none';
                document.getElementById('modal-vencido-count').textContent = 
                    unitDocs.filter(doc => doc.daysLeft < 0).length;
                
                // Atualiza tabela no modal
                const tbody = document.querySelector('#modal-documents-table tbody');
                tbody.innerHTML = unitDocs.map(doc => `
                    <tr class="${doc.status}">
                        <td>${doc.nome}</td>
                        <td>${getTipoText(doc.tipo)}</td>
                        <td>${doc.validadeDate.toLocaleDateString('pt-BR')}</td>
                        <td class="days-left ${getDaysLeftClass(doc.daysLeft)}">
                            ${formatDaysLeft(doc.daysLeft)}
                        </td>
                        <td><span class="status-badge ${doc.status}">${getStatusText(doc.status)}</span></td>
                        <td>
                            ${doc.arquivoBase64 ? 
                                `<a href="${createPreviewUrl(doc.arquivoBase64, doc.arquivoTipo)}" 
                                target="_blank" 
                                class="btn btn-info btn-sm" 
                                download="${doc.arquivoNome}">
                                    <i class="fas fa-download"></i>
                                </a>` : 
                                'N/A'}
                        </td>
                    </tr>
                `).join('') || '<tr><td colspan="6">Nenhum documento encontrado</td></tr>';
                
                // Mostra o modal usando a classe modal-open
                modal.classList.add('modal-open');
            } catch (error) {
                console.error('Erro ao carregar documentos:', error);
                alert('Erro ao carregar documentos da unidade');
            }
        }

        // Carregar documentos de uma unidade específica
        async function loadUnitDocuments(unitId) {
            let query = firebase.firestore().collection('documentos');
            query = query.where('unidadeId', '==', unitId);
            
            const snapshot = await query.get();
            const documents = snapshot.docs.map(doc => {
                const data = doc.data();
                const validadeDate = data.validade.toDate();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const timeDiff = validadeDate.getTime() - today.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                return {
                    id: doc.id,
                    ...data,
                    validadeDate,
                    daysLeft,
                    arquivoBase64: data.arquivoBase64 || '',
                    arquivoTipo: data.arquivoTipo || 'application/pdf',
                    arquivoNome: data.arquivoNome || 'documento.pdf'
                };
            });
            
            updateUnitDocumentsTable(documents);
        }

        // Atualizar tabela de documentos da unidade
        function updateUnitDocumentsTable(documents) {
            const tbody = document.querySelector('#documents-table tbody');
            
            // Nova lógica: conforme = daysLeft >= 0, vencido = daysLeft < 0
            const conformeCount = documents.filter(doc => doc.daysLeft >= 0).length;
            const vencidoCount = documents.filter(doc => doc.daysLeft < 0).length;
            
            document.getElementById('conforme-count').textContent = conformeCount;
            document.getElementById('atualizacao-count').textContent = '0'; // Mantém como 0
            document.getElementById('atualizacao-count').parentElement.style.display = 'none'; // Esconde o elemento
            document.getElementById('vencido-count').textContent = vencidoCount;
            
            if (documents.length === 0) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum documento encontrado</td></tr>';
                return;
            }
            
            documents.sort((a, b) => a.daysLeft - b.daysLeft);
            
            tbody.innerHTML = documents.map(doc => {
                // Determina o status baseado apenas nos dias
                const status = doc.daysLeft >= 0 ? 'conforme' : 'vencido';
                
                return `
                    <tr class="${status}">
                        <td>${doc.nome}</td>
                        <td>${getTipoText(doc.tipo)}</td>
                        <td>${doc.validadeDate.toLocaleDateString('pt-BR')}</td>
                        <td class="days-left ${getDaysLeftClass(doc.daysLeft)}">
                            ${formatDaysLeft(doc.daysLeft)}
                        </td>
                        <td><span class="status-badge ${status}">${getStatusText(status)}</span></td>
                        <td>
                            <a href="${createPreviewUrl(doc.arquivoBase64, doc.arquivoTipo)}" 
                            target="_blank" 
                            class="btn btn-info btn-sm" 
                            download="${doc.arquivoNome}">
                                <i class="fas fa-download"></i>
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Mostrar modal de envio de email
        async function showEmailModal() {
            if (!selectedUnitId) return;
            
            const unit = allUnits.find(u => u.id === selectedUnitId);
            if (!unit) return;
            
            const unitDocs = allDocuments.filter(doc => 
                doc.unidadeId === selectedUnitId && 
                (doc.status === 'vencido' || doc.status === 'atualizacao')
            );
            
            if (unitDocs.length === 0) {
                alert('Não há documentos vencidos ou próximos do vencimento nesta unidade.');
                return;
            }
            
            const usersSnapshot = await firebase.firestore().collection('users')
                .where('unitId', '==', selectedUnitId)
                .get();
            
            const recipients = usersSnapshot.docs.map(doc => {
                const userData = doc.data();
                return {
                    email: userData.email,
                    name: userData.name || userData.email
                };
            });
            
            if (recipients.length === 0) {
                alert('Não há usuários cadastrados nesta unidade para enviar o email.');
                return;
            }
            
            document.getElementById('email-unit-name').textContent = unit.name;
            
            const docsList = document.getElementById('email-documents-list');
            docsList.innerHTML = unitDocs.map(doc => `
                <div class="document-item ${doc.status}">
                    <strong>${doc.nome}</strong> - 
                    ${doc.validadeDate.toLocaleDateString('pt-BR')} 
                    (${formatDaysLeft(doc.daysLeft)})
                </div>
            `).join('');
            
            const recipientsList = document.getElementById('email-recipients');
            recipientsList.innerHTML = recipients.map(user => `
                <div class="email-recipient">
                    <i class="fas fa-user"></i> ${user.name} &lt;${user.email}&gt;
                </div>
            `).join('');
            
            const emailMessage = document.getElementById('email-message');
            const documentsText = unitDocs.map(doc => 
                `- ${doc.nome} (Vencimento: ${doc.validadeDate.toLocaleDateString('pt-BR')} - ${formatDaysLeft(doc.daysLeft)})`
            ).join('\n');
            
            emailMessage.value = emailMessage.value.replace('[LISTA_DE_DOCUMENTOS]', documentsText);
            
            document.getElementById('email-modal').classList.add('modal-open');
        }

        // Enviar email de alerta
        async function sendEmailAlert() {
            if (!selectedUnitId) return;
            
            const unit = allUnits.find(u => u.id === selectedUnitId);
            if (!unit) return;
            
            const subject = document.getElementById('email-subject').value;
            const message = document.getElementById('email-message').value;
            
            const usersSnapshot = await firebase.firestore().collection('users')
                .where('unitId', '==', selectedUnitId)
                .get();
            
            const recipients = usersSnapshot.docs.map(doc => doc.data().email);
            
            if (recipients.length === 0) {
                alert('Não há destinatários para enviar o email.');
                return;
            }
            
            try {
                const btn = document.getElementById('confirm-send-email-btn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                
                const sendEmail = firebase.functions().httpsCallable('sendDocumentAlertEmail');
                await sendEmail({
                    recipients,
                    subject,
                    message,
                    unitName: unit.name
                });
                
                alert('Email enviado com sucesso para os responsáveis da unidade!');
                document.getElementById('email-modal').classList.remove('modal-open');
            } catch (error) {
                console.error('Erro ao enviar email:', error);
                alert('Erro ao enviar email: ' + error.message);
            } finally {
                const btn = document.getElementById('confirm-send-email-btn');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Email';
            }
        }

        // Funções auxiliares
        function getTipoText(tipo) {
            const tipos = {
                'certificado': 'Certificado',
                'contrato': 'Contrato',
                'licenca': 'Licença',
                'procedimento': 'Procedimento',
                'outro': 'Outro'
            };
            return tipos[tipo] || tipo;
        }

        function getStatusText(status) {
            const statusMap = {
                'conforme': 'Conforme',
                'atualizacao': 'Atualização',
                'vencido': 'Vencido',
                'nao_aplicavel': 'Não Aplicável'
            };
            return statusMap[status] || status;
        }

        function formatDaysLeft(days) {
            if (days === 0) return 'Vence hoje';
            if (days < 0) return `Venceu há ${Math.abs(days)} dias`;
            return `${days} dias`;
        }

        function getDaysLeftClass(days) {
            if (days < 0) return 'negative-days';
            if (days <= 7) return 'warning-days';
            return 'positive-days';
        }

        function createPreviewUrl(base64, type) {
            if (!base64) return '#';
            if (base64.startsWith('data:')) return base64;
            return `data:${type};base64,${base64}`;
        }

        // Logout
        function logoutUser() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            }).catch(error => {
                console.error('Erro ao fazer logout:', error);
            });
        }

function initDocumentSelection() {
    // Evento para selecionar/deselecionar todos
    document.getElementById('select-all-docs')?.addEventListener('change', function(e) {
        const checkboxes = document.querySelectorAll('.doc-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            // Atualiza visualmente o estado de seleção da linha
            const row = checkbox.closest('tr');
            if (checkbox.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        updateSelectedDocuments();
    });

    // Event delegation para checkboxes individuais
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('doc-checkbox')) {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
            updateSelectedDocuments();
        }
    });

    // Botão para mover documentos desativados
    document.getElementById('move-to-disable-btn')?.addEventListener('click', moveToDisableCollection);
}

/**
 * Atualiza a lista de documentos selecionados e o painel de ações
 */
function updateSelectedDocuments() {
    const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
    selectedDocuments = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-doc-id'));
    
    const actionsPanel = document.getElementById('docs-actions');
    const selectedCount = document.getElementById('selected-count');
    
    if (selectedDocuments.length > 0) {
        actionsPanel.style.display = 'flex';
        selectedCount.textContent = `${selectedDocuments.length} selecionado(s)`;
        
        // Verifica se há documentos vencidos selecionados
        const hasExpiredDocs = checkExpiredDocumentsStatus();
        document.getElementById('move-to-disable-btn').disabled = !hasExpiredDocs;
        
        if (!hasExpiredDocs) {
            selectedCount.innerHTML += '<span class="text-warning"> (Nenhum vencido selecionado)</span>';
        }
    } else {
        actionsPanel.style.display = 'none';
    }
    
    // Desmarca o "selecionar todos" se não estiverem todos selecionados
    const totalCheckboxes = document.querySelectorAll('.doc-checkbox').length;
    const selectAll = document.getElementById('select-all-docs');
    if (selectAll) {
        selectAll.checked = selectedDocuments.length === totalCheckboxes && totalCheckboxes > 0;
        selectAll.indeterminate = selectedDocuments.length > 0 && selectedDocuments.length < totalCheckboxes;
    }
}

/**
 * Verifica se há documentos vencidos entre os selecionados
 * @returns {boolean} True se há documentos vencidos selecionados
 */
function checkExpiredDocumentsStatus() {
    const rows = document.querySelectorAll('#documents-table tbody tr');
    let hasExpired = false;
    
    rows.forEach(row => {
        const checkbox = row.querySelector('.doc-checkbox');
        if (checkbox && checkbox.checked) {
            const daysLeftCell = row.querySelector('.days-left');
            if (daysLeftCell && daysLeftCell.classList.contains('negative-days')) {
                hasExpired = true;
            }
        }
    });
    
    return hasExpired;
}

/**
 * Move os documentos selecionados para a coleção de desativados
 */
async function moveToDisableCollection() {
    if (selectedDocuments.length === 0) return;
    
    // Confirmação do usuário
    const confirmMove = confirm(`Tem certeza que deseja mover ${selectedDocuments.length} documento(s) para a coleção de desativados?\n\nEsta ação não pode ser desfeita.`);
    if (!confirmMove) return;
    
    try {
        // Mostrar loading
        const btn = document.getElementById('move-to-disable-btn');
        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Movendo...';
        
        // Mover cada documento selecionado
        const db = firebase.firestore();
        const batch = db.batch();
        
        // Primeiro, verificar quais documentos estão vencidos
        const docsToMove = [];
        const docsSnapshot = await db.collection('documentos')
            .where(firebase.firestore.FieldPath.documentId(), 'in', selectedDocuments)
            .get();
            
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        docsSnapshot.forEach(doc => {
            const data = doc.data();
            const validadeDate = data.validade.toDate();
            const daysLeft = Math.ceil((validadeDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            
            if (daysLeft < 0) { // Só move se estiver vencido
                docsToMove.push({ 
                    id: doc.id, 
                    data: data,
                    daysLeft: daysLeft
                });
            }
        });
        
        if (docsToMove.length === 0) {
            alert('Nenhum dos documentos selecionados está vencido. Apenas documentos vencidos podem ser movidos.');
            return;
        }
        
        // Criar documentos na nova coleção e deletar da antiga
        const disableCollection = db.collection('documentosDisable');
        
        for (const doc of docsToMove) {
            // Adicionar metadados de desativação
            const docData = {
                ...doc.data,
                desativadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                desativadoPor: currentUser.displayName,
                desativadoPorEmail: currentUser.email,
                desativadoPorId: currentUser.uid,
                statusOriginal: doc.data.status,
                diasAtraso: Math.abs(doc.daysLeft),
                motivoDesativacao: "Vencimento automático"
            };
            
            // Adicionar à nova coleção
            batch.set(disableCollection.doc(doc.id), docData);
            
            // Remover da coleção original
            batch.delete(db.collection('documentos').doc(doc.id));
        }
        
        // Executar a operação em lote
        await batch.commit();
        
        // Feedback visual
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success';
        successAlert.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${docsToMove.length} documento(s) vencido(s) foram movidos para a coleção de desativados com sucesso!
        `;
        successAlert.style.position = 'fixed';
        successAlert.style.top = '20px';
        successAlert.style.right = '20px';
        successAlert.style.zIndex = '2000';
        successAlert.style.maxWidth = '400px';
        successAlert.style.animation = 'fadeIn 0.5s, fadeOut 0.5s 4.5s forwards';
        
        document.body.appendChild(successAlert);
        setTimeout(() => successAlert.remove(), 5000);
        
        // Recarregar os documentos
        if (isViewingAsUnit) {
            await loadUnitDocuments(selectedUnitId);
        } else if (currentUser.unidade.toLowerCase() === 'gestão corp') {
            await loadAllUnits();
            showCorpView();
        } else {
            await loadUnitDocuments(currentUnitId);
        }
        
    } catch (error) {
        console.error('Erro ao mover documentos:', error);
        
        // Feedback de erro
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger';
        errorAlert.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Ocorreu um erro ao mover os documentos: ${error.message}
        `;
        errorAlert.style.position = 'fixed';
        errorAlert.style.top = '20px';
        errorAlert.style.right = '20px';
        errorAlert.style.zIndex = '2000';
        errorAlert.style.maxWidth = '400px';
        
        document.body.appendChild(errorAlert);
        setTimeout(() => errorAlert.remove(), 5000);
    } finally {
        const btn = document.getElementById('move-to-disable-btn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
        
        // Resetar seleção
        resetDocumentSelection();
    }
}

/**
 * Reseta a seleção de documentos
 */
function resetDocumentSelection() {
    selectedDocuments = [];
    document.querySelectorAll('.doc-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('tr');
        row?.classList.remove('selected');
    });
    document.getElementById('select-all-docs').checked = false;
    document.getElementById('select-all-docs').indeterminate = false;
    document.getElementById('docs-actions').style.display = 'none';
}

// ==============================================
// ATUALIZAÇÃO DA FUNÇÃO updateUnitDocumentsTable
// ==============================================

/**
 * Atualiza a tabela de documentos da unidade com os checkboxes de seleção
 */
function updateUnitDocumentsTable(documents) {
    const tbody = document.querySelector('#documents-table tbody');
    
    const conformeCount = documents.filter(doc => doc.daysLeft >= 0).length;
    const vencidoCount = documents.filter(doc => doc.daysLeft < 0).length;
    
    document.getElementById('conforme-count').textContent = conformeCount;
    document.getElementById('atualizacao-count').textContent = '0';
    document.getElementById('vencido-count').textContent = vencidoCount;
    
    if (documents.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum documento encontrado</td></tr>';
        return;
    }
    
    documents.sort((a, b) => a.daysLeft - b.daysLeft);
    
    tbody.innerHTML = documents.map(doc => {
        const status = doc.daysLeft >= 0 ? 'conforme' : 'vencido';
        
        return `
            <tr class="${status}">
                <td>
                    <input type="checkbox" class="doc-checkbox" data-doc-id="${doc.id}">
                </td>
                <td>${doc.nome}</td>
                <td>${getTipoText(doc.tipo)}</td>
                <td>${doc.validadeDate.toLocaleDateString('pt-BR')}</td>
                <td class="days-left ${getDaysLeftClass(doc.daysLeft)}">
                    ${formatDaysLeft(doc.daysLeft)}
                </td>
                <td><span class="status-badge ${status}">${getStatusText(status)}</span></td>
                <td>
                    <a href="${createPreviewUrl(doc.arquivoBase64, doc.arquivoTipo)}" 
                    target="_blank" 
                    class="btn btn-info btn-sm" 
                    download="${doc.arquivoNome}">
                        <i class="fas fa-download"></i>
                    </a>
                </td>
            </tr>
        `;
    }).join('');
    
    // Inicializa a seleção de documentos
    initDocumentSelection();
}


const style = document.createElement('style');
style.textContent = `
    tr.selected {
        background-color: #e6f7ff !important;
    }
    
    .text-warning {
        color: #ffc107;
        margin-left: 8px;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    
    .alert {
        padding: 15px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .alert-success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .alert-danger {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
`;
document.head.appendChild(style);