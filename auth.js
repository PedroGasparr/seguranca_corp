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

const isHomePage = window.location.pathname.includes('home.html');

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
        
        toggleLoading('login-btn', true);
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Atualiza o último login no Firestore
                return db.collection('users').doc(userCredential.user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                window.location.href = 'home.html';
            })
            .catch((error) => {
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
        
        toggleLoading('register-btn', true);
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Salva informações adicionais no Firestore
                return db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    unit: unit,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'user'
                });
            })
            .then(() => {
                showMessage('register-message', 'Conta criada com sucesso! Redirecionando...', 'success');
                setTimeout(() => window.location.href = 'home.html', 2000);
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
            })
            .finally(() => {
                toggleLoading('register-btn', false);
            });
    });
}

// Lógica da página home
if (isHomePage) {
    const loadUserData = (user) => {
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (!doc.exists) {
                    console.log("Documento do usuário não encontrado");
                    return;
                }
                
                const userData = doc.data();
                
                // Atualiza a interface
                document.getElementById('sidebar-user-name').textContent =
                    userData?.name || user.displayName || "Usuário";
                document.getElementById('home-user-unit').textContent = 
                    userData?.unit || "Não definida";
                document.getElementById('home-user-unit-detail').textContent = 
                    userData?.unit || "Não definida";
                document.getElementById('home-user-email').textContent = user.email;
                
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
            loadUserData(user);
        } else {
            window.location.href = 'index.html';
        }
    });
}
function logoutUser() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            }).catch(error => {
                console.error('Erro ao fazer logout:', error);
            });
        }