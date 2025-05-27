  // Configuração do Firebase (substitua com sua configuração)
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

        // Inicializa o Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Variáveis globais
        let currentUnit = null;
        let unitsData = {};
        let documentsData = {};

        // Função para mostrar mensagens de erro
        function showError(message) {
            alert(message); // Você pode substituir por um toast ou modal mais bonito
        }

        // Função para formatar data
        function formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate();
            return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
        }

        // Função para baixar um arquivo
        function downloadFile(base64Data, fileName, fileType) {
            const link = document.createElement('a');
            link.href = base64Data;
            link.download = fileName;
            link.click();
        }

        // Função para carregar todas as unidades com documentos desabilitados
        async function loadUnits() {
            try {
                document.getElementById('unitsLoading').style.display = 'block';
                document.getElementById('unitsContainer').innerHTML = '';
                
                const querySnapshot = await db.collectionGroup('documentosDisable').get();
                
                // Organizar documentos por unidade
                unitsData = {};
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.unidadeId) {
                        if (!unitsData[data.unidadeId]) {
                            unitsData[data.unidadeId] = {
                                unidade: data.unidade || data.unidadeId,
                                count: 0,
                                documents: []
                            };
                        }
                        unitsData[data.unidadeId].count++;
                        unitsData[data.unidadeId].documents.push({
                            id: doc.id,
                            ...data
                        });
                    }
                });
                
                // Exibir unidades
                displayUnits();
            } catch (error) {
                console.error("Erro ao carregar unidades:", error);
                showError("Erro ao carregar unidades. Por favor, recarregue a página.");
            } finally {
                document.getElementById('unitsLoading').style.display = 'none';
            }
        }

        // Função para exibir unidades na tela
        function displayUnits(filter = '') {
            const unitsContainer = document.getElementById('unitsContainer');
            unitsContainer.innerHTML = '';
            
            const filteredUnits = Object.keys(unitsData).filter(unitId => {
                return unitsData[unitId].unidade.toLowerCase().includes(filter.toLowerCase());
            });
            
            if (filteredUnits.length === 0) {
                unitsContainer.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Nenhuma unidade encontrada com documentos desabilitados.
                        </div>
                    </div>
                `;
                return;
            }
            
            filteredUnits.forEach(unitId => {
                const unit = unitsData[unitId];
                const unitCard = document.createElement('div');
                unitCard.className = 'col-md-6 col-lg-4';
                unitCard.innerHTML = `
                    <div class="unit-card" data-unit-id="${unitId}">
                        <div class="unit-header d-flex justify-content-between align-items-center">
                            <span>${unit.unidade}</span>
                            <span class="badge bg-primary rounded-pill">${unit.count} doc.</span>
                        </div>
                        <div class="card-body">
                            <p class="card-text text-muted">Clique para ver os documentos desabilitados desta unidade.</p>
                            <button class="btn btn-sm btn-outline-primary view-unit-btn" data-unit-id="${unitId}">
                                <i class="fas fa-folder-open me-1"></i> Abrir
                            </button>
                        </div>
                    </div>
                `;
                unitsContainer.appendChild(unitCard);
            });
            
            // Adicionar eventos aos botões
            document.querySelectorAll('.view-unit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const unitId = btn.getAttribute('data-unit-id');
                    showUnitDocuments(unitId);
                });
            });
            
            document.querySelectorAll('.unit-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('view-unit-btn')) {
                        const unitId = card.getAttribute('data-unit-id');
                        showUnitDocuments(unitId);
                    }
                });
            });
        }

        // Função para mostrar documentos de uma unidade específica
        function showUnitDocuments(unitId) {
            currentUnit = unitId;
            const unit = unitsData[unitId];
            
            // Atualizar UI
            document.getElementById('unitsListView').style.display = 'none';
            document.getElementById('unitDetailView').style.display = 'block';
            document.getElementById('unitTitle').textContent = unit.unidade;
            document.getElementById('documentsCount').textContent = `${unit.count} documento(s) desabilitado(s)`;
            
            // Carregar documentos
            displayDocuments(unit.documents);
        }

        // Função para exibir documentos
        function displayDocuments(documents) {
            const container = document.getElementById('documentsContainer');
            container.innerHTML = '';
            
            if (documents.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Nenhum documento desabilitado encontrado para esta unidade.
                        </div>
                    </div>
                `;
                return;
            }
            
            documents.forEach(doc => {
                const docElement = document.createElement('div');
                docElement.className = 'col-12';
                docElement.innerHTML = `
                    <div class="document-item">
                        <h5>${doc.nome || 'Documento sem nome'}</h5>
                        <p class="mb-1"><strong>Tipo:</strong> ${doc.tipo || 'N/A'}</p>
                        <p class="mb-1"><strong>Status:</strong> 
                            <span class="badge badge-status ${doc.status ? 'status-' + doc.status.toLowerCase().replace(' ', '-') : ''}">
                                ${doc.status || 'N/A'}
                            </span>
                        </p>
                        <p class="mb-1"><strong>Validade:</strong> ${doc.validade ? formatDate(doc.validade) : 'N/A'}</p>
                        <p class="mb-1"><strong>Desativado em:</strong> ${doc.desativadoEm ? formatDate(doc.desativadoEm) : 'N/A'}</p>
                        <p class="mb-1"><strong>Motivo:</strong> ${doc.motivoDesativacao || 'N/A'}</p>
                        
                        <div class="document-actions">
                            <button class="btn btn-sm btn-primary download-document-btn" data-doc-id="${doc.id}">
                                <i class="fas fa-download me-1"></i> Baixar
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(docElement);
            });
            
            // Adicionar eventos aos botões de download
            document.querySelectorAll('.download-document-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const docId = btn.getAttribute('data-doc-id');
                    const doc = documents.find(d => d.id === docId);
                    if (doc && doc.arquivoBase64) {
                        downloadFile(doc.arquivoBase64, doc.arquivoNome || 'documento', doc.arquivoTipo || 'application/octet-stream');
                    } else {
                        showError('Não foi possível baixar o documento. Arquivo não encontrado.');
                    }
                });
            });
        }

        // Função para baixar todos os documentos da unidade
        function downloadAllDocuments() {
            if (!currentUnit || !unitsData[currentUnit]) return;
            
            const documents = unitsData[currentUnit].documents;
            documents.forEach(doc => {
                if (doc.arquivoBase64) {
                    downloadFile(doc.arquivoBase64, doc.arquivoNome || 'documento', doc.arquivoTipo || 'application/octet-stream');
                }
            });
        }

        // Event Listeners
        document.getElementById('backToUnits').addEventListener('click', () => {
            document.getElementById('unitsListView').style.display = 'block';
            document.getElementById('unitDetailView').style.display = 'none';
            currentUnit = null;
        });
        
        document.getElementById('downloadAllDocuments').addEventListener('click', downloadAllDocuments);
        
        document.getElementById('searchUnits').addEventListener('input', (e) => {
            displayUnits(e.target.value);
        });

        // Verificar autenticação e carregar dados
        auth.onAuthStateChanged(user => {
            if (user) {
                loadUnits();
            } else {
                // Redirecionar para login se não estiver autenticado
                window.location.href = 'index.html';
            }
        });