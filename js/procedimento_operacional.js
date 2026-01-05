let currentUser = null;
let isGestaoCorp = false;
let deleteDocId = null;
let currentViewingDocId = null;
let confirmModal = null;
let documentViewerModal = null;
let allDocuments = [];

// Configuração de subgrupos por grupo (todos os subgrupos disponíveis)
const allSubgroups = [
    'gestão corp',
    'CD SUZANLOG',
    'CDR SUZANO',
    'CD SUZANO MARACANAU',
    'CD SUZANO SERRA',
    'CD SUZANO SÃO JOSE DOS PINHAIS',
    'CD SUZANO CARIACICA',
    'CD TRIANGULO',
    'CD TSUZUKI',
    'CD YAMAHA SÃO PAULO',
    'FABRICA AHLSTROM JACAREÍ',
    'FABRICA BOSTIK SÃO ROQUE',
    'FABRICA IMERYS CACHOEIRO DO ITAPEMIRIM',
    'FABRICA IMERYS LIMEIRA',
    'FABRICA JOHN DEREE HORIZONTINA',
    'FABRICA JOHN DEREE INDAIATUBA',
    'FABRICA JOHN DEREE MONTENEGRO',
    'FABRICA JOHN DEREE CATALÃO',
    'FABRICA JOHN DEREE CAMPINAS',
    'FABRICA NITERRA MOGI DAS CRUZES',
    'FABRICA OJI PAPEIS PIRACICABA',
    'FABRICA PLACO MOGI DAS CRUZES',
    'FABRICA SUZANO SUZANO',
    'FABRICA SUZANO RIO VERDE',
    'FABRICA WHITE MARTINS JACAREÍ',
    'FABRICA SUZANO ARACRUZ',
    'FABRICA SUZANO BELEM',
    'FABRICA SUZANO IMPERATRIZ',
    'FABRICA SUZANO JACAREÍ',
    'FABRICA SUZANO LIMEIRA',
    'FABRICA QUARTZOLIT CAMAÇARI',
    'FABRICA QUARTZOLIT JANDIRA',
    'FABRICA QUARTZOLIT MOGI DAS CRUZES',
    'FABRICA SUZANO MOGI DAS CRUZES',
    'FABRICA IBEMA'
];

// Mapeamento de grupos para subgrupos
const subgroupMapping = {
    'GESTÃO CORPORATIVA': ['gestão corp'],
    'SUZANO UNBC': [
        'CD SUZANLOG',
        'CDR SUZANO',
        'CD SUZANO MARACANAU',
        'CD SUZANO SERRA',
        'CD SUZANO SÃO JOSE DOS PINHAIS',
        'CD SUZANO CARIACICA',
        'CD TRIANGULO',
        'CD TSUZUKI',
        'CD YAMAHA SÃO PAULO'
    ],
    'SUZANO UNPE': [
        'FABRICA AHLSTROM JACAREÍ',
        'FABRICA BOSTIK SÃO ROQUE',
        'FABRICA IMERYS CACHOEIRO DO ITAPEMIRIM',
        'FABRICA IMERYS LIMEIRA',
        'FABRICA JOHN DEREE HORIZONTINA',
        'FABRICA JOHN DEREE INDAIATUBA',
        'FABRICA JOHN DEREE MONTENEGRO',
        'FABRICA JOHN DEREE CATALÃO',
        'FABRICA JOHN DEREE CAMPINAS',
        'FABRICA NITERRA MOGI DAS CRUZES',
        'FABRICA OJI PAPEIS PIRACICABA',
        'FABRICA PLACO MOGI DAS CRUZES',
        'FABRICA SUZANO SUZANO',
        'FABRICA SUZANO RIO VERDE',
        'FABRICA WHITE MARTINS JACAREÍ',
        'FABRICA SUZANO ARACRUZ',
        'FABRICA SUZANO BELEM',
        'FABRICA SUZANO IMPERATRIZ',
        'FABRICA SUZANO JACAREÍ',
        'FABRICA SUZANO LIMEIRA',
        'FABRICA QUARTZOLIT CAMAÇARI',
        'FABRICA QUARTZOLIT JANDIRA',
        'FABRICA QUARTZOLIT MOGI DAS CRUZES',
        'FABRICA SUZANO MOGI DAS CRUZES',
        'FABRICA IBEMA'
    ],
    'SST CORPORATIVO': [],
    'SAINT GOBAIN': [],
    'JOHN DEERE': []
};

// Inicializa a página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado - Inicializando página...');
    
    // Configurar hamburger menu
    setupHamburgerMenu();
    
    // Verifica autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuário autenticado:', user.email);
            currentUser = user;
            loadUserData(user);
            checkGestaoCorp(user);
            loadDocuments();
        } else {
            console.log('Usuário não autenticado - redirecionando...');
            window.location.href = 'index.html';
        }
    });

    // Configura o formulário de upload
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
        console.log('Formulário de upload configurado');
    }

    // Configura o botão de logout
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Configura a busca
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterDocuments);
    }

    // Configura o filtro de grupo
    const groupFilter = document.getElementById('group-filter');
    if (groupFilter) {
        groupFilter.addEventListener('change', function() {
            console.log('Filtro de grupo alterado para:', this.value);
            updateSubgroupOptions(this.value, 'filter');
            filterDocuments();
        });
    }

    // Configura o filtro de subgrupo
    const subgroupFilter = document.getElementById('subgroup-filter');
    if (subgroupFilter) {
        subgroupFilter.addEventListener('change', filterDocuments);
    }

    // Configura o select de grupo no upload
    const uploadGroup = document.getElementById('document-group');
    if (uploadGroup) {
        uploadGroup.addEventListener('change', function() {
            console.log('Grupo de upload alterado para:', this.value);
            updateSubgroupOptions(this.value, 'upload');
        });
    }

    // Inicializa os modais
    const confirmModalElement = document.getElementById('confirmModal');
    if (confirmModalElement) {
        confirmModal = new bootstrap.Modal(confirmModalElement);
    }
    
    const documentViewerModalElement = document.getElementById('documentViewerModal');
    if (documentViewerModalElement) {
        documentViewerModal = new bootstrap.Modal(documentViewerModalElement);
    }

    // Configura o botão de confirmação de exclusão
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (deleteDocId) {
                deleteDocument(deleteDocId);
                confirmModal.hide();
            }
        });
    }

    // Configura o botão de download no visualizador
    const downloadFromViewerBtn = document.getElementById('downloadFromViewerBtn');
    if (downloadFromViewerBtn) {
        downloadFromViewerBtn.addEventListener('click', function() {
            if (currentViewingDocId) {
                downloadDocument(currentViewingDocId);
            }
        });
    }

    // Inicializa os subgrupos
    initializeSubgroups();
});

// Configura o menu hamburger
function setupHamburgerMenu() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                this.classList.remove('active');
                if (sidebarToggle) sidebarToggle.classList.remove('active');
            });
        }
    }
}

// Inicializa os subgrupos
function initializeSubgroups() {
    console.log('Inicializando subgrupos...');
    
    // Carrega todos os subgrupos no filtro
    const filterSubgroup = document.getElementById('subgroup-filter');
    if (filterSubgroup) {
        filterSubgroup.innerHTML = '<option value="all">Todos os Subgrupos</option>';
        allSubgroups.forEach(subgroup => {
            const option = document.createElement('option');
            option.value = subgroup;
            option.textContent = subgroup;
            filterSubgroup.appendChild(option);
        });
        console.log('Filtro de subgrupos carregado com', allSubgroups.length, 'opções');
    }
    
    // Inicializa o select de subgrupos no upload
    const uploadSubgroup = document.getElementById('document-subgroup');
    if (uploadSubgroup) {
        uploadSubgroup.innerHTML = '<option value="">Selecione um subgrupo</option>';
        console.log('Select de upload de subgrupos inicializado');
    }
}

// Atualiza as opções de subgrupo
function updateSubgroupOptions(group, type = 'filter') {
    console.log('Atualizando subgrupos para grupo:', group, 'tipo:', type);
    
    let selectElement;
    if (type === 'upload') {
        selectElement = document.getElementById('document-subgroup');
    } else {
        selectElement = document.getElementById('subgroup-filter');
    }
    
    if (!selectElement) {
        console.error('Elemento select não encontrado para tipo:', type);
        return;
    }
    
    // Salva o valor selecionado atual
    const currentValue = selectElement.value;
    
    // Limpa as opções existentes
    if (type === 'upload') {
        selectElement.innerHTML = '<option value="">Selecione um subgrupo</option>';
    } else {
        selectElement.innerHTML = '<option value="all">Todos os Subgrupos</option>';
    }
    
    // Se não houver grupo selecionado ou grupo for vazio, mostra todos os subgrupos
    if (!group || group === 'all' || group === '') {
        allSubgroups.forEach(subgroup => {
            const option = document.createElement('option');
            option.value = subgroup;
            option.textContent = subgroup;
            selectElement.appendChild(option);
        });
        
        if (type === 'filter') {
            selectElement.disabled = false;
        }
        console.log('Mostrando todos os subgrupos:', allSubgroups.length);
    } else if (subgroupMapping[group]) {
        // Mostra apenas os subgrupos específicos do grupo
        subgroupMapping[group].forEach(subgroup => {
            const option = document.createElement('option');
            option.value = subgroup;
            option.textContent = subgroup;
            selectElement.appendChild(option);
        });
        
        if (type === 'filter') {
            selectElement.disabled = subgroupMapping[group].length === 0;
        }
        console.log('Subgrupos específicos carregados:', subgroupMapping[group].length, 'para grupo:', group);
    } else {
        // Se o grupo não estiver no mapeamento, mostra todos
        allSubgroups.forEach(subgroup => {
            const option = document.createElement('option');
            option.value = subgroup;
            option.textContent = subgroup;
            selectElement.appendChild(option);
        });
        
        if (type === 'filter') {
            selectElement.disabled = false;
        }
        console.log('Grupo não encontrado no mapeamento, mostrando todos os subgrupos');
    }
    
    // Tenta restaurar o valor selecionado anteriormente
    if (currentValue && Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
        selectElement.value = currentValue;
    }
    
    // Dispara evento de change se for o filtro
    if (type === 'filter') {
        selectElement.dispatchEvent(new Event('change'));
    }
}

// Carrega os dados do usuário
function loadUserData(user) {
    console.log('Carregando dados do usuário...');
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const userNameElement = document.getElementById('sidebar-user-name');
                const userUnitElement = document.getElementById('sidebar-user-unit');
                
                if (userNameElement) {
                    userNameElement.textContent = userData.name || 'Usuário';
                }
                if (userUnitElement) {
                    userUnitElement.textContent = userData.unit || 'Não definida';
                }
                console.log('Dados do usuário carregados:', userData.name);
            } else {
                console.log('Documento do usuário não encontrado');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar dados do usuário:', error);
        });
}

// Verifica se o usuário é da gestão corp
function checkGestaoCorp(user) {
    console.log('Verificando se usuário é gestão corp...');
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                isGestaoCorp = userData.unit && userData.unit.toLowerCase() === 'gestão corp';
                console.log('É gestão corp?', isGestaoCorp);

                if (isGestaoCorp) {
                    const uploadSection = document.getElementById('upload-section');
                    if (uploadSection) {
                        uploadSection.style.display = 'block';
                        console.log('Seção de upload exibida');
                    }
                }
            }
        })
        .catch(error => {
            console.error('Erro ao verificar gestão corp:', error);
        });
}

// Carrega os documentos da coleção
function loadDocuments() {
    console.log('Carregando documentos...');
    const container = document.getElementById('documents-container');
    if (!container) {
        console.error('Container de documentos não encontrado');
        return;
    }
    
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h5>Carregando documentos...</h5></div>';

    db.collection('procedimentos_operacionais').orderBy('createdAt', 'desc').get()
        .then(querySnapshot => {
            allDocuments = [];
            console.log('Documentos encontrados:', querySnapshot.size);

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <h5>Nenhum documento encontrado</h5>
                        <p>Não há procedimentos operacionais cadastrados ainda.</p>
                    </div>
                `;
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                allDocuments.push({
                    id: doc.id,
                    ...data
                });
            });

            console.log('Total de documentos carregados:', allDocuments.length);
            renderDocuments(allDocuments);
        })
        .catch(error => {
            console.error('Erro ao carregar documentos:', error);
            container.innerHTML = '<div class="alert alert-danger">Erro ao carregar documentos. Tente novamente.</div>';
        });
}

// Renderiza os documentos na lista
function renderDocuments(documents) {
    console.log('Renderizando', documents.length, 'documentos');
    const container = document.getElementById('documents-container');

    if (documents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>Nenhum documento encontrado</h5>
                <p>Não há documentos que correspondam aos filtros selecionados.</p>
            </div>
        `;
        return;
    }

    const list = document.createElement('div');
    list.className = 'document-list';

    documents.forEach((doc, index) => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Determina o ícone baseado no tipo de arquivo
        const fileIcon = getFileIcon(doc.fileName || doc.type);
        
        card.innerHTML = `
            <div class="document-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="${fileIcon}" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <div class="document-title">${doc.title || 'Documento sem título'}</div>
                </div>
                <div class="document-badges">
                    <span class="badge-group">${doc.group || 'Sem grupo'}</span>
                    ${doc.subgroup ? `<span class="badge-subgroup">${doc.subgroup}</span>` : ''}
                </div>
            </div>
            <div class="document-meta">
                <div class="document-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Enviado em: ${formatDate(doc.createdAt)}</span>
                </div>
                <div class="document-meta-item">
                    <i class="fas fa-user"></i>
                    <span>Por: ${doc.uploadedByName || 'Usuário'}</span>
                </div>
                <div class="document-meta-item">
                    <i class="fas fa-file"></i>
                    <span>Tipo: ${getFileType(doc.fileName || doc.type)}</span>
                </div>
                ${doc.size ? `
                <div class="document-meta-item">
                    <i class="fas fa-weight-hanging"></i>
                    <span>Tamanho: ${formatFileSize(doc.size)}</span>
                </div>
                ` : ''}
            </div>
            <div class="document-actions">
                <button class="btn btn-view document-action-btn" data-id="${doc.id}" title="Visualizar documento">
                    <i class="fas fa-eye"></i> Visualizar
                </button>
                <button class="btn btn-download document-action-btn" data-id="${doc.id}" title="Baixar documento">
                    <i class="fas fa-download"></i> Baixar
                </button>
                ${isGestaoCorp ? `
                <button class="btn btn-delete document-action-btn" data-id="${doc.id}" title="Excluir documento">
                    <i class="fas fa-trash"></i> Excluir
                </button>
                ` : ''}
            </div>
        `;
        list.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(list);
    assignButtonEvents();
}

// Retorna o ícone apropriado para o tipo de arquivo
function getFileIcon(fileName) {
    if (!fileName) return 'fas fa-file';
    
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'txt': 'fas fa-file-alt',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive'
    };
    
    return iconMap[extension] || 'fas fa-file';
}

// Atribui eventos aos botões dos documentos
function assignButtonEvents() {
    console.log('Atribuindo eventos aos botões...');
    
    // Visualizar
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const docId = this.getAttribute('data-id');
            console.log('Visualizando documento:', docId);
            viewDocument(docId);
        });
    });
    
    // Baixar
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const docId = this.getAttribute('data-id');
            console.log('Baixando documento:', docId);
            downloadDocument(docId);
        });
    });
    
    // Excluir (apenas para gestão corp)
    if (isGestaoCorp) {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                deleteDocId = this.getAttribute('data-id');
                console.log('Solicitando exclusão do documento:', deleteDocId);
                confirmModal.show();
            });
        });
    }
}

// Filtra os documentos
function filterDocuments() {
    console.log('Filtrando documentos...');
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const groupFilter = document.getElementById('group-filter').value;
    const subgroupFilter = document.getElementById('subgroup-filter').value;
    
    console.log('Filtros:', {
        searchText,
        groupFilter,
        subgroupFilter
    });
    
    const filteredDocs = allDocuments.filter(doc => {
        // Filtro por grupo
        const matchesGroup = groupFilter === 'all' || doc.group === groupFilter;
        
        // Filtro por subgrupo
        const matchesSubgroup = subgroupFilter === 'all' || doc.subgroup === subgroupFilter;
        
        // Filtro por texto de busca
        const matchesSearch = !searchText || 
            (doc.title && doc.title.toLowerCase().includes(searchText)) ||
            (doc.group && doc.group.toLowerCase().includes(searchText)) ||
            (doc.subgroup && doc.subgroup.toLowerCase().includes(searchText));
        
        return matchesGroup && matchesSubgroup && matchesSearch;
    });
    
    console.log('Documentos filtrados:', filteredDocs.length);
    renderDocuments(filteredDocs);
}

// Visualiza um documento
function viewDocument(docId) {
    console.log('Abrindo visualização do documento:', docId);
    currentViewingDocId = docId;
    
    db.collection('procedimentos_operacionais').doc(docId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                console.log('Dados do documento carregados:', data.title);
                
                const titleElement = document.getElementById('documentViewerTitle');
                const iframe = document.getElementById('documentViewerIframe');
                
                if (titleElement) {
                    titleElement.textContent = data.title || 'Visualização do Documento';
                }
                
                if (iframe) {
                    iframe.src = data.arquivoBase64;
                    console.log('Iframe configurado com URL base64');
                }
                
                if (documentViewerModal) {
                    documentViewerModal.show();
                }
            } else {
                console.error('Documento não encontrado:', docId);
                alert('Documento não encontrado');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar documento:', error);
            alert('Erro ao abrir o documento para visualização');
        });
}

// Manipula o upload do documento
function handleUpload(e) {
    e.preventDefault();
    console.log('Iniciando upload...');

    const title = document.getElementById('document-title').value;
    const group = document.getElementById('document-group').value;
    const subgroup = document.getElementById('document-subgroup').value;
    const file = document.getElementById('document-file').files[0];

    console.log('Dados do upload:', { title, group, subgroup, file: file?.name });

    if (!title || !group || !subgroup || !file) {
        alert('Preencha todos os campos');
        console.log('Upload falhou: campos obrigatórios não preenchidos');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    const progress = document.getElementById('upload-progress');
    const progressBar = progress?.querySelector('.progress-bar');
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';
    }
    
    if (progress) {
        progress.style.display = 'block';
    }
    
    if (progressBar) {
        progressBar.style.width = '0%';
    }

    // Ler o arquivo como base64
    const reader = new FileReader();
    reader.onload = function(event) {
        console.log('Arquivo lido como base64, tamanho:', event.target.result.length);
        const fileBase64 = event.target.result;

        // Simula progresso
        let progressValue = 0;
        const progressInterval = setInterval(() => {
            progressValue += 10;
            if (progressBar) {
                progressBar.style.width = `${progressValue}%`;
            }
            
            if (progressValue >= 100) {
                clearInterval(progressInterval);
                
                // Salva no Firestore
                db.collection('procedimentos_operacionais').add({
                    title: title,
                    group: group,
                    subgroup: subgroup,
                    arquivoBase64: fileBase64,
                    fileName: file.name,
                    type: file.type,
                    size: file.size,
                    uploadedBy: currentUser.uid,
                    uploadedByName: currentUser.displayName || currentUser.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then((docRef) => {
                    console.log('Documento salvo com ID:', docRef.id);
                    
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Enviar Documento';
                    }
                    
                    if (progress) {
                        progress.style.display = 'none';
                    }
                    
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                    
                    // Resetar o formulário
                    const uploadForm = document.getElementById('upload-form');
                    if (uploadForm) {
                        uploadForm.reset();
                        // Resetar subgrupos
                        updateSubgroupOptions('', 'upload');
                    }
                    
                    // Recarregar documentos
                    loadDocuments();
                    
                    alert('Documento enviado com sucesso!');
                })
                .catch(error => {
                    console.error('Erro ao salvar documento:', error);
                    alert('Erro ao salvar informações do documento: ' + error.message);
                    
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Enviar Documento';
                    }
                    
                    if (progress) {
                        progress.style.display = 'none';
                    }
                    
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                });
            }
        }, 100);
    };

    reader.onerror = function(error) {
        console.error('Erro ao ler arquivo:', error);
        alert('Erro ao ler o arquivo. Tente novamente.');
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Enviar Documento';
        }
        
        if (progress) {
            progress.style.display = 'none';
        }
    };

    reader.readAsDataURL(file);
}

// Exclui um documento
function deleteDocument(docId) {
    console.log('Excluindo documento:', docId);
    
    db.collection('procedimentos_operacionais').doc(docId).delete()
        .then(() => {
            console.log('Documento excluído com sucesso');
            loadDocuments();
            alert('Documento excluído com sucesso!');
        })
        .catch(error => {
            console.error('Erro ao excluir documento:', error);
            alert('Erro ao excluir documento: ' + error.message);
        });
}

// Baixa um documento
function downloadDocument(docId) {
    console.log('Baixando documento:', docId);
    
    db.collection('procedimentos_operacionais').doc(docId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                console.log('Documento encontrado para download:', data.fileName);
                
                const link = document.createElement('a');
                link.href = data.arquivoBase64;
                link.download = data.fileName || 'documento.pdf';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('Download iniciado');
            } else {
                console.error('Documento não encontrado para download:', docId);
                alert('Documento não encontrado');
            }
        })
        .catch(error => {
            console.error('Erro ao baixar documento:', error);
            alert('Erro ao baixar o documento: ' + error.message);
        });
}

// Funções auxiliares
function formatDate(timestamp) {
    if (!timestamp) return 'Data não disponível';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data inválida';
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(fileName) {
    if (!fileName) return 'Documento';
    const extension = fileName.split('.').pop().toLowerCase();
    const types = {
        'pdf': 'PDF',
        'doc': 'Word',
        'docx': 'Word',
        'xls': 'Excel',
        'xlsx': 'Excel',
        'ppt': 'PowerPoint',
        'pptx': 'PowerPoint',
        'txt': 'Texto',
        'jpg': 'Imagem',
        'jpeg': 'Imagem',
        'png': 'Imagem',
        'zip': 'Compactado',
        'rar': 'Compactado'
    };
    return types[extension] || extension.toUpperCase();
}

// Logout do usuário
function logoutUser() {
    console.log('Fazendo logout...');
    auth.signOut().then(() => {
        console.log('Logout realizado, redirecionando...');
        window.location.href = 'index.html';
    }).catch(error => {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    });
}