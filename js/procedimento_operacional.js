let currentUser = null;
let isGestaoCorp = false;
let deleteDocId = null;
let currentViewingDocId = null;
let confirmModal = null;
let documentViewerModal = null;
let allDocuments = [];

// Inicializa a página
document.addEventListener('DOMContentLoaded', function() {
    // Verifica autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData(user);
            checkGestaoCorp(user);
            loadDocuments();
        } else {
            window.location.href = 'index.html';
        }
    });
    
    // Configura o formulário de upload
    document.getElementById('upload-form').addEventListener('submit', handleUpload);
    
    // Configura o botão de logout
    document.getElementById('sidebar-logout-btn').addEventListener('click', logoutUser);
    
    // Configura a busca
    document.getElementById('search-input').addEventListener('input', filterDocuments);
    
    // Configura o filtro de grupo
    document.getElementById('group-filter').addEventListener('change', filterDocuments);
    
    // Inicializa os modais
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    documentViewerModal = new bootstrap.Modal(document.getElementById('documentViewerModal'));
    
    // Configura o botão de confirmação de exclusão
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        if (deleteDocId) {
            deleteDocument(deleteDocId);
            confirmModal.hide();
        }
    });
    
    // Configura o botão de download no visualizador
    document.getElementById('downloadFromViewerBtn').addEventListener('click', function() {
        if (currentViewingDocId) {
            downloadDocument(currentViewingDocId);
        }
    });
});

// Carrega os dados do usuário
function loadUserData(user) {
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                document.getElementById('sidebar-user-name').textContent = userData.name || 'Usuário';
                document.getElementById('sidebar-user-unit').textContent = userData.unit || 'Não definida';
            }
        });
}

// Verifica se o usuário é da gestão corp
function checkGestaoCorp(user) {
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                isGestaoCorp = userData.unit === 'gestão corp';
                
                if (isGestaoCorp) {
                    document.getElementById('upload-section').style.display = 'block';
                }
            }
        });
}

// Carrega os documentos da coleção
function loadDocuments() {
    const container = document.getElementById('documents-container');
    container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h5>Carregando documentos...</h5></div>';
    
    db.collection('procedimentos_operacionais').orderBy('createdAt', 'desc').get()
        .then(querySnapshot => {
            allDocuments = [];
            
            if (querySnapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h5>Nenhum documento encontrado</h5><p>Não há procedimentos operacionais cadastrados ainda.</p></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                allDocuments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            renderDocuments(allDocuments);
        })
        .catch(error => {
            console.error('Erro ao carregar documentos:', error);
            container.innerHTML = '<div class="alert alert-danger">Erro ao carregar documentos. Tente novamente.</div>';
        });
}

function assignButtonEvents() {
    // Visualizar
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            viewDocument(this.getAttribute('data-id'));
        });
    });
    
    // Baixar
    document.querySelectorAll('.btn-download-list').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            downloadDocument(this.getAttribute('data-id'));
        });
    });
    
    // Excluir (apenas para gestão corp)
    if (isGestaoCorp) {
        document.querySelectorAll('.btn-delete-list').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                deleteDocId = this.getAttribute('data-id');
                confirmModal.show();
            });
        });
    }
}

function filterDocuments() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const groupFilter = document.getElementById('group-filter').value;
    const container = document.getElementById('documents-container');
    
    // Filtra os documentos por grupo e pesquisa
    const filteredDocs = allDocuments.filter(doc => {
        const matchesGroup = groupFilter === 'all' || doc.group === groupFilter;
        const matchesSearch = doc.title.toLowerCase().includes(searchText);
        return matchesGroup && matchesSearch;
    });
    
    // Se não houver resultados, mostra estado vazio
    if (filteredDocs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>Nenhum documento encontrado</h5>
                <p>Não há documentos que correspondam aos filtros selecionados.</p>
            </div>
        `;
    } else {
        // Mostra os documentos filtrados
        renderDocuments(filteredDocs);
    }
}

// Função auxiliar para renderizar documentos na lista
function renderDocuments(documents) {
    const container = document.getElementById('documents-container');
    const list = document.createElement('ul');
    list.className = 'document-list';
    
    documents.forEach(doc => {
        const listItem = document.createElement('li');
        listItem.className = 'document-item';
        listItem.innerHTML = `
            <div class="document-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="document-info">
                <div class="document-title">${doc.title}</div>
                <div class="document-meta">
                    <span class="document-group">Grupo: ${doc.group || 'Não definido'}</span>
                    <span>Enviado em: ${new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span>Tamanho: ${formatFileSize(doc.size)}</span>
                    <span>Tipo: ${doc.type}</span>
                </div>
            </div>
            <div class="document-actions">
                <button class="btn btn-view" data-id="${doc.id}">
                    <i class="fas fa-eye me-1"></i> Visualizar
                </button>
                <button class="btn btn-download-list" data-id="${doc.id}">
                    <i class="fas fa-download me-1"></i> Baixar
                </button>
                ${isGestaoCorp ? `
                <button class="btn btn-delete-list" data-id="${doc.id}">
                    <i class="fas fa-trash me-1"></i> Excluir
                </button>
                ` : ''}
            </div>
        `;
        list.appendChild(listItem);
    });
    
    container.innerHTML = '';
    container.appendChild(list);
    assignButtonEvents();
}

// Visualiza um documento
function viewDocument(docId) {
    currentViewingDocId = docId;
    
    db.collection('procedimentos_operacionais').doc(docId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('documentViewerTitle').textContent = data.title;
                
                const iframe = document.getElementById('documentViewerIframe');
                iframe.src = data.arquivoBase64;
                
                documentViewerModal.show();
            }
        })
        .catch(error => {
            console.error('Erro ao carregar documento:', error);
            alert('Erro ao abrir o documento para visualização');
        });
}

function handleUpload(e) {
    e.preventDefault();

    const title = document.getElementById('document-title').value;
    const group = document.getElementById('document-group').value;
    const file = document.getElementById('document-file').files[0];

    if (!title || !group || !file) {
        alert('Preencha todos os campos');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';

    const progress = document.querySelector('.progress');
    const progressBar = document.querySelector('.progress-bar');
    progress.style.display = 'block';
    progressBar.style.width = '0%';

    // Ler o arquivo como base64
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileBase64 = event.target.result; // já vem como string base64

        // Simula progresso (já que não tem upload real)
        progressBar.style.width = `100%`;

        // Salva diretamente no Firestore
        db.collection('procedimentos_operacionais').add({
            title: title,
            group: group,
            arquivoBase64: fileBase64, // conteúdo em base64
            fileName: file.name,
            type: file.type,
            size: file.size,
            uploadedBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            document.getElementById('upload-form').reset();
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Enviar Documento';
            progress.style.display = 'none';
            loadDocuments();
        })
        .catch(error => {
            console.error('Erro ao salvar documento:', error);
            alert('Erro ao salvar informações do documento');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Enviar Documento';
            progress.style.display = 'none';
        });
    };

    reader.readAsDataURL(file);
}

// Exclui um documento
function deleteDocument(docId) {
    db.collection('procedimentos_operacionais').doc(docId).delete()
        .then(() => {
            loadDocuments();
        })
        .catch(error => {
            console.error('Erro ao excluir documento:', error);
            alert('Erro ao excluir documento');
        });
}

// Formata o tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Logout do usuário
function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Função para baixar documento
function downloadDocument(docId) {
    db.collection('procedimentos_operacionais').doc(docId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const link = document.createElement('a');
                link.href = data.arquivoBase64;
                link.download = data.fileName || 'documento.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        })
        .catch(error => {
            console.error('Erro ao baixar documento:', error);
            alert('Erro ao baixar o documento');
        });
}