// Configuração do Firebase
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

// Verifica se está na página de login ou home
const isLoginPage = window.location.pathname.includes('index.html') || 
                    window.location.pathname === '/' || 
                    window.location.pathname === '/index.html';

const isHomePage = window.location.pathname.includes('./src/home.html');

// Funções compartilhadas
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
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

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function toggleLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        const spinner = button.querySelector('.fa-spinner');
        const buttonText = button.querySelector('.btn-text');
        
        if (isLoading) {
            button.disabled = true;
            spinner.classList.remove('hidden');
            if (buttonText) buttonText.classList.add('hidden');
        } else {
            button.disabled = false;
            spinner.classList.add('hidden');
            if (buttonText) buttonText.classList.remove('hidden');
        }
    }
}

function toggleAuthForms() {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    
    if (loginContainer.classList.contains('hidden')) {
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
    } else {
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    }
}

// Lógica da página de login
if (isLoginPage) {
    console.log("Estamos na página de login");
    
    // Alternar entre login e registro
    document.getElementById('show-register-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
        
        // Preenche o email se já estiver preenchido no login
        const loginEmail = document.getElementById('login-email').value;
        if (loginEmail) {
            document.getElementById('register-email').value = loginEmail;
        }
    });
    
    document.getElementById('show-login-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
    });

    // Login com email e senha
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        console.log("Tentando login com:", email);
        toggleLoading('login-btn', true);
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log("Autenticação bem-sucedida, UID:", userCredential.user.uid);
                
                // Atualiza o último login no Firestore
                return db.collection('users').doc(userCredential.user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                console.log("Buscando dados do usuário no Firestore...");
                // Verifica o papel do usuário para redirecionamento
                return db.collection('users').doc(auth.currentUser.uid).get();
            })
            .then((doc) => {
                console.log("Documento recebido do Firestore:", doc.exists);
                
                if (doc.exists) {
                    const userData = doc.data();
                    console.log("Dados completos do usuário:", userData);
                    console.log("Role específico:", userData.role);
                    console.log("Tipo do role:", typeof userData.role);
                    
                    const userRole = userData.role;
                    
                    // Função para normalizar o role (remover acentos, minúsculas, remover espaços)
                    function normalizeRole(role) {
                        if (!role) return '';
                        return role.toString()
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .trim();
                    }
                    
                    const normalizedRole = normalizeRole(userRole);
                    
                    console.log("Role normalizado:", normalizedRole);
                    console.log("Contém 'lider'?", normalizedRole.includes('lider'));
                    
                    // Se o usuário for Líder, redireciona para google_forms.html
                    if (normalizedRole.includes('lider')) {
                        console.log("✓ USUÁRIO É LÍDER - Redirecionando para pages/google_forms.html");
                        window.location.href = 'pages/google_forms.html';
                    } else {
                        // Caso contrário, redireciona para home.html
                        console.log("✗ USUÁRIO NÃO É LÍDER - Redirecionando para ./src/home.html");
                        window.location.href = './src/home.html';
                    }
                } else {
                    // Se não houver dados, redireciona para home.html
                    console.log("✗ Documento não existe - Redirecionando para ./src/home.html");
                    window.location.href = './src/home.html';
                }
            })
            .catch((error) => {
                console.error("Erro completo no login:", error);
                let errorMessage = error.message;
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Usuário não encontrado. Verifique o email ou crie uma conta.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Senha incorreta. Tente novamente ou clique em "Esqueceu sua senha?"';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Muitas tentativas falhas. Acesso temporariamente bloqueado. Tente mais tarde ou redefina sua senha.';
                }
                showMessage('login-message', errorMessage, 'danger');
            })
            .finally(() => {
                toggleLoading('login-btn', false);
            });
    });

    // Recuperação de senha
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        
        if (!email) {
            showMessage('login-message', 'Digite seu email para redefinir a senha', 'warning');
            return;
        }
        
        toggleLoading('login-btn', true);
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showMessage('login-message', `Email de redefinição enviado para ${email}. Verifique sua caixa de entrada.`, 'success');
            })
            .catch((error) => {
                let errorMessage = error.message;
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Email não cadastrado. Crie uma conta primeiro.';
                }
                showMessage('login-message', errorMessage, 'danger');
            })
            .finally(() => {
                toggleLoading('login-btn', false);
            });
    });

    // Registro de nova conta
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const unit = document.getElementById('register-unit').value;
        const role = document.getElementById('register-role').value; // Captura a função
        
        console.log("Registro com role:", role);
        
        // Validações
        if (password !== confirmPassword) {
            showMessage('register-message', 'As senhas não coincidem', 'danger');
            return;
        }
        
        if (password.length < 6) {
            showMessage('register-message', 'A senha deve ter pelo menos 6 caracteres', 'danger');
            return;
        }
        
        if (!unit) {
            showMessage('register-message', 'Selecione uma unidade', 'danger');
            return;
        }
        
        if (!role) {
            showMessage('register-message', 'Selecione uma função', 'danger');
            return;
        }
        
        toggleLoading('register-btn', true);
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log("Usuário criado, salvando dados no Firestore...");
                
                // Salva informações adicionais no Firestore incluindo a função
                return db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    unit: unit,
                    role: role, // Salva a função selecionada
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    status: "ativo",
                    admin: false
                });
            })
            .then(() => {
                // Função para normalizar o role
                function normalizeRole(role) {
                    if (!role) return '';
                    return role.toString()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .trim();
                }
                
                const normalizedRole = normalizeRole(role);
                
                console.log("Role no registro:", role);
                console.log("Role normalizado:", normalizedRole);
                console.log("Contém 'lider'?", normalizedRole.includes('lider'));
                
                // Após registrar, verifica a função para redirecionamento
                if (normalizedRole.includes('lider')) {
                    showMessage('register-message', 'Conta criada com sucesso! Redirecionando para formulários...', 'success');
                    console.log("✓ NOVO USUÁRIO É LÍDER - Redirecionando para pages/google_forms.html");
                    setTimeout(() => window.location.href = 'pages/google_forms.html', 2000);
                } else {
                    showMessage('register-message', 'Conta criada com sucesso! Redirecionando...', 'success');
                    console.log("✗ NOVO USUÁRIO NÃO É LÍDER - Redirecionando para ./src/home.html");
                    setTimeout(() => window.location.href = './src/home.html', 2000);
                }
            })
            .catch((error) => {
                let errorMessage = error.message;
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'Email já cadastrado. Faça login ou use outro email.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Email inválido. Digite um email válido.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'Senha muito fraca. Use uma senha mais complexa.';
                }
                showMessage('register-message', errorMessage, 'danger');
                console.error("Erro no registro:", error);
            })
            .finally(() => {
                toggleLoading('register-btn', false);
            });
    });
}

// Lógica da página home
if (isHomePage) {
    console.log("Estamos na página home");
    
    const loadUserData = (user) => {
        console.log("Carregando dados do usuário:", user.uid);
        
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (!doc.exists) {
                    console.log("✗ Documento do usuário não encontrado");
                    return;
                }
                
                const userData = doc.data();
                
                console.log("Dados do usuário na home:", userData);
                console.log("Role na home:", userData.role);
                
                // Verifica se é líder e redireciona
                function normalizeRole(role) {
                    if (!role) return '';
                    return role.toString()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .trim();
                }
                
                const userRole = userData.role;
                const normalizedRole = normalizeRole(userRole);
                
                console.log("Role normalizado na home:", normalizedRole);
                console.log("Contém 'lider'?", normalizedRole.includes('lider'));
                
                if (normalizedRole.includes('lider')) {
                    console.log("✓ USUÁRIO NA HOME É LÍDER - Redirecionando para ../pages/google_forms.html");
                    window.location.href = '../pages/google_forms.html';
                    return;
                }
                
                console.log("✗ USUÁRIO NA HOME NÃO É LÍDER - Continuando na home");
                
                // Atualiza a interface apenas se não for líder
                document.getElementById('sidebar-user-name').textContent =
                    userData?.name || user.displayName || "Usuário";
                document.getElementById('home-user-unit').textContent = 
                    userData?.unit || "Não definida";
                document.getElementById('home-user-unit-detail').textContent = 
                    userData?.unit || "Não definida";
                document.getElementById('home-user-email').textContent = user.email;
                
                // Adiciona exibição da função do usuário
                if (userData?.role) {
                    const roleElement = document.getElementById('home-user-role');
                    if (roleElement) {
                        roleElement.textContent = userData.role;
                    }
                }
                
                if (userData?.createdAt) {
                    const date = userData.createdAt.toDate();
                    document.getElementById('home-user-created-at').textContent = 
                        date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR');
                }
                
                if (userData?.lastLogin) {
                    const lastLoginDate = userData.lastLogin.toDate();
                    document.getElementById('home-user-last-login').textContent = 
                        lastLoginDate.toLocaleDateString('pt-BR') + ' às ' + lastLoginDate.toLocaleTimeString('pt-BR');
                }
            })
            .catch((error) => {
                console.log("Erro ao carregar dados:", error);
                document.getElementById('home-user-name').textContent = 
                    user.displayName || "Usuário";
                document.getElementById('home-user-unit').textContent = "Não definida";
                document.getElementById('home-user-email').textContent = user.email;
            });
    };

    // Logout
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', logoutUser);

    // Verifica autenticação ao carregar a home
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Usuário autenticado na home, UID:", user.uid);
            loadUserData(user);
        } else {
            console.log("Usuário não autenticado, redirecionando para index.html");
            window.location.href = 'index.html';
        }
    });
}

function logoutUser() {
    console.log("Fazendo logout...");
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    }).catch(error => {
        console.error('Erro ao fazer logout:', error);
    });
}