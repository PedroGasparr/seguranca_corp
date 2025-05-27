// Script para carregar informações do usuário e manipulação de arquivos
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o Firebase
    initializeFirebase();
    
    // Observa mudanças na autenticação
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            // Carrega informações adicionais do usuário
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: userData.name || user.email,
                    unidade: userData.unit || 'Não definida',
                    unidadeId: userData.unit // Usamos o valor da unidade como ID também
                };
                
                // Atualiza a sidebar
                document.getElementById('sidebar-user-name').textContent = currentUser.displayName;
                document.getElementById('sidebar-user-unit').textContent = currentUser.unidade;
                
                // Carrega documentos existentes
                await carregarDocumentos();
            }
        } else {
            // Redireciona para a página de login se não estiver autenticado
            window.location.href = 'login.html';
        }
    });

    // Manipulação do upload de arquivo
    const fileInput = document.getElementById('document-file');
    const fileNameDisplay = document.getElementById('file-name');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
        } else {
            fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        }
    });
});

// Inicializa o Firebase
function initializeFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyDZwa4XNqlupNDLs7-CRQbhr5pRT4NyFBA",
        authDomain: "application-gzl.firebaseapp.com",
        databaseURL: "https://application-gzl-default-rtdb.firebaseio.com",
        projectId: "application-gzl",
        storageBucket: "application-gzl.appspot.com",
        messagingSenderId: "319900903265",
        appId: "1:319900903265:web:a8f400aeb7a697fc168720",
        measurementId: "G-ZRRFQZXT54"
    };
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

// Variável global para armazenar informações do usuário atual
let currentUser = null;

// Função para mostrar mensagens
function showMessage(message, type) {
    const element = document.getElementById('document-message');
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden', 'alert-success', 'alert-danger', 'alert-warning');
        element.classList.add(`alert-${type}`, 'show');
        
        setTimeout(() => {
            element.classList.remove('show');
            setTimeout(() => element.classList.add('hidden'), 500);
        }, 5000);
    }
}

// Função para adicionar documento diretamente ao Firestore
async function adicionarDocumento() {
    const nome = document.getElementById('document-name').value.trim();
    const tipo = document.getElementById('document-type').value;
    const validade = document.getElementById('document-expiry').value;
    const criacao = document.getElementById('document-creation').value;
    const status = document.getElementById('document-status').value;
    const observacoes = document.getElementById('document-notes').value.trim();
    const arquivo = document.getElementById('document-file').files[0];
    
    // Validação dos campos
    if (!nome || !tipo || !validade || !criacao || !status) {
        showMessage('Preencha todos os campos obrigatórios.', 'danger');
        return false;
    }
    
    if (!arquivo) {
        showMessage('Selecione um arquivo para upload.', 'danger');
        return false;
    }
    
    if (arquivo.size > 10 * 1024 * 1024) {
        showMessage('O arquivo é muito grande (máximo 10MB).', 'danger');
        return false;
    }
    
    try {
        const btn = document.getElementById('add-another-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        
        // Converte o arquivo para base64
        const fileBase64 = await toBase64(arquivo);
        
        const documento = {
            nome,
            tipo,
            validade: firebase.firestore.Timestamp.fromDate(new Date(validade)),
            criacao: firebase.firestore.Timestamp.fromDate(new Date(criacao)),
            status,
            observacoes: observacoes || '',
            arquivoBase64: fileBase64,
            arquivoNome: arquivo.name,
            arquivoTipo: arquivo.type,
            dataCadastro: firebase.firestore.Timestamp.now(),
            userId: currentUser.uid,
            unidade: currentUser.unidade,
            unidadeId: currentUser.unidadeId,
            criadoPor: currentUser.displayName,
            criadoPorEmail: currentUser.email
        };
        
        // Salva diretamente no Firestore
        await firebase.firestore().collection('documentos').add(documento);
        
        // Limpa o formulário
        document.getElementById('document-form').reset();
        document.getElementById('file-name').textContent = 'Nenhum arquivo selecionado';
        
        showMessage('Documento salvo com sucesso!', 'success');
        
        // Atualiza a lista de documentos
        await carregarDocumentos();
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar documento:', error);
        showMessage('Erro ao salvar documento: ' + error.message, 'danger');
        return false;
    } finally {
        const btn = document.getElementById('add-another-btn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Outro';
    }
}

// Função para converter arquivo para base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Função para criar URL de visualização a partir do base64
function createPreviewUrl(base64, type) {
    return `data:${type};base64,${base64.split(',')[1]}`;
}

// Função para atualizar a tabela de visualização
function atualizarTabela(documentos) {
    const tbody = document.querySelector('#documents-table tbody');
    
    if (!documentos || documentos.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum documento encontrado</td></tr>';
        document.getElementById('rows-count').textContent = '0';
        document.getElementById('total-rows').textContent = '0';
        return;
    }
    
    tbody.innerHTML = '';
    
    documentos.forEach((doc, index) => {
        const row = document.createElement('tr');
        const previewUrl = createPreviewUrl(doc.arquivoBase64, doc.arquivoTipo);
        
        row.innerHTML = `
            <td>${doc.nome}</td>
            <td>${getTipoText(doc.tipo)}</td>
            <td>${doc.validade.toDate().toLocaleDateString('pt-BR')}</td>
            <td><span class="status-badge ${doc.status}">${getStatusText(doc.status)}</span></td>
            <td>${doc.unidade}</td>
            <td>
                <a href="${previewUrl}" target="_blank" class="file-link" download="${doc.arquivoNome}">
                    <i class="fas fa-file-download"></i> ${doc.arquivoNome}
                </a>
            </td>
            <td class="actions">
                <button class="btn btn-info btn-sm" onclick="editarDocumento('${doc.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="removerDocumento('${doc.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Atualiza contador
    document.getElementById('rows-count').textContent = documentos.length;
    document.getElementById('total-rows').textContent = documentos.length;
}

// Função para obter texto do tipo
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

// Função para obter texto do status
function getStatusText(status) {
    const statusMap = {
        'conforme': 'Conforme',
        'atualizacao': 'Atualização',
        'vencido': 'Vencido',
        'nao_aplicavel': 'Não Aplicável'
    };
    return statusMap[status] || status;
}

// Função para remover documento
async function removerDocumento(documentId) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
        await firebase.firestore().collection('documentos').doc(documentId).delete();
        showMessage('Documento excluído com sucesso!', 'success');
        await carregarDocumentos();
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        showMessage('Erro ao excluir documento: ' + error.message, 'danger');
    }
}

// Função para editar documento
async function editarDocumento(documentId) {
    try {
        const docRef = firebase.firestore().collection('documentos').doc(documentId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            showMessage('Documento não encontrado.', 'danger');
            return;
        }
        
        const doc = docSnap.data();
        const modal = document.getElementById('document-modal');
        
        // Preenche o modal com os dados do documento
        document.getElementById('edit-document-id').value = documentId;
        document.getElementById('edit-document-name').value = doc.nome;
        document.getElementById('edit-document-type').value = doc.tipo;
        document.getElementById('edit-document-expiry').valueAsDate = doc.validade.toDate();
        document.getElementById('edit-document-status').value = doc.status;
        document.getElementById('edit-document-notes').value = doc.observacoes;
        
        // Configura o link do arquivo atual
        const fileLink = document.getElementById('current-file-link');
        fileLink.href = createPreviewUrl(doc.arquivoBase64, doc.arquivoTipo);
        fileLink.setAttribute('download', doc.arquivoNome);
        document.getElementById('current-file-name').textContent = doc.arquivoNome;
        
        // Mostra o modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar documento para edição:', error);
        showMessage('Erro ao carregar documento: ' + error.message, 'danger');
    }
}

// Função para atualizar documento no Firestore
async function atualizarDocumento() {
    const documentId = document.getElementById('edit-document-id').value;
    
    const nome = document.getElementById('edit-document-name').value.trim();
    const tipo = document.getElementById('edit-document-type').value;
    const validade = document.getElementById('edit-document-expiry').valueAsDate;
    const status = document.getElementById('edit-document-status').value;
    const observacoes = document.getElementById('edit-document-notes').value.trim();
    const novoArquivo = document.getElementById('edit-document-file').files[0];
    
    if (!nome || !tipo || !validade || !status) {
        showMessage('Preencha todos os campos obrigatórios.', 'danger');
        return;
    }
    
    try {
        const docRef = firebase.firestore().collection('documentos').doc(documentId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            showMessage('Documento não encontrado.', 'danger');
            return;
        }
        
        const updateData = {
            nome,
            tipo,
            validade: firebase.firestore.Timestamp.fromDate(validade),
            status,
            observacoes,
            dataAtualizacao: firebase.firestore.Timestamp.now()
        };
        
        // Se um novo arquivo foi enviado
        if (novoArquivo) {
            const fileBase64 = await toBase64(novoArquivo);
            updateData.arquivoBase64 = fileBase64;
            updateData.arquivoNome = novoArquivo.name;
            updateData.arquivoTipo = novoArquivo.type;
        }
        
        await docRef.update(updateData);
        
        fecharModal();
        showMessage('Documento atualizado com sucesso!', 'success');
        await carregarDocumentos();
    } catch (error) {
        console.error('Erro ao atualizar documento:', error);
        showMessage('Erro ao atualizar documento: ' + error.message, 'danger');
    }
}

// Função para fechar o modal
function fecharModal() {
    document.getElementById('document-modal').style.display = 'none';
    document.getElementById('edit-document-file').value = '';
}

// Função para carregar documentos do Firestore com filtro de unidade
async function carregarDocumentos() {
    if (!currentUser) return;
    
    try {
        let query = firebase.firestore().collection('documentos');
        
        // Se o usuário não for admin, filtra pela unidade
        if (currentUser.unidade !== 'gestão corp') {
            query = query.where('unidadeId', '==', currentUser.unidadeId);
        }
        
        // Ordena por data de cadastro decrescente
        query = query.orderBy('dataCadastro', 'desc');
        
        const snapshot = await query.get();
        
        const documentos = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                nome: data.nome,
                tipo: data.tipo,
                validade: data.validade,
                status: data.status,
                observacoes: data.observacoes,
                arquivoBase64: data.arquivoBase64,
                arquivoNome: data.arquivoNome,
                arquivoTipo: data.arquivoTipo,
                dataCadastro: data.dataCadastro,
                userId: data.userId,
                unidade: data.unidade,
                unidadeId: data.unidadeId,
                criadoPor: data.criadoPor,
                criadoPorEmail: data.criadoPorEmail
            };
        });
        
        atualizarTabela(documentos);
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        showMessage('Erro ao carregar documentos: ' + error.message, 'danger');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Botão Adicionar Outro
    document.getElementById('add-another-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        adicionarDocumento();
    });
    
    // Formulário Salvar
    document.getElementById('document-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        adicionarDocumento();
    });
    
    // Botão de atualizar documento no modal
    document.getElementById('update-document-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        atualizarDocumento();
    });
    
    // Botão de deletar documento no modal
    document.getElementById('delete-document-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const documentId = document.getElementById('edit-document-id').value;
        removerDocumento(documentId);
        fecharModal();
    });
    
    // Fechar modal
    document.querySelectorAll('.modal-close')?.forEach(btn => {
        btn.addEventListener('click', fecharModal);
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('document-modal')) {
            fecharModal();
        }
    });
    
    // Mostrar nome do arquivo selecionado
    document.getElementById('document-file')?.addEventListener('change', function(e) {
        document.getElementById('file-name').textContent = 
            e.target.files.length > 0 ? e.target.files[0].name : 'Nenhum arquivo selecionado';
    });
    
    // Mostrar nome do arquivo selecionado no modal de edição
    document.getElementById('edit-document-file')?.addEventListener('change', function(e) {
        document.getElementById('edit-file-name').textContent = 
            e.target.files.length > 0 ? e.target.files[0].name : 'Nenhum arquivo selecionado';
    });
});

document.getElementById('sidebar-logout-btn')?.addEventListener('click', logoutUser);

function logoutUser() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            }).catch(error => {
                console.error('Erro ao fazer logout:', error);
            });
        }