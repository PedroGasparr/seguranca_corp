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

// Inicializa o Firebase apenas se não estiver inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Sistema de autenticação universal
class AuthSystem {
    constructor() {
        this.user = null;
        this.userData = null;
        this.init();
    }

    async init() {
        this.setupAuthStateListener();
        this.checkAuthState();
        this.setupGlobalEventListeners();
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.user = user;
                await this.loadUserData(user.uid);
                this.updateUI(true);
                console.log('Usuário autenticado:', user.email);
                
                // Se estiver na página de login, redireciona para home
                if (this.isLoginPage()) {
                    setTimeout(() => {
                        window.location.href = './src/home.html';
                    }, 1000);
                }
            } else {
                this.user = null;
                this.userData = null;
                this.updateUI(false);
                console.log('Usuário não autenticado');
                
                // Se não estiver na página de login e não for página pública, redireciona
                if (!this.isLoginPage() && !this.isPublicRoute()) {
                    this.redirectToLogin();
                }
            }
        });
    }

    async checkAuthState() {
        try {
            const user = auth.currentUser;
            if (user) {
                await this.loadUserData(user.uid);
                this.updateUI(true);
            } else if (!this.isLoginPage() && !this.isPublicRoute()) {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            if (!this.isLoginPage() && !this.isPublicRoute()) {
                this.redirectToLogin();
            }
        }
    }

    async loadUserData(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    updateUI(isAuthenticated) {
        // Atualiza elementos da interface baseado no estado de autenticação
        const authElements = document.querySelectorAll('[data-auth]');
        const unauthElements = document.querySelectorAll('[data-unauth]');

        if (isAuthenticated) {
            authElements.forEach(el => el.style.display = '');
            unauthElements.forEach(el => el.style.display = 'none');
        } else {
            authElements.forEach(el => el.style.display = 'none');
            unauthElements.forEach(el => el.style.display = '');
        }
    }

    updateUserInfo() {
        // Atualiza informações do usuário na UI
        const userNameElements = document.querySelectorAll('[data-user-name]');
        const userUnitElements = document.querySelectorAll('[data-user-unit]');
        const userEmailElements = document.querySelectorAll('[data-user-email]');

        if (this.userData && this.user) {
            userNameElements.forEach(el => {
                el.textContent = this.userData.name || this.user.email;
            });
            
            userUnitElements.forEach(el => {
                el.textContent = this.userData.unit || 'N/A';
            });

            userEmailElements.forEach(el => {
                el.textContent = this.user.email;
            });
        }
    }

    isLoginPage() {
        return window.location.pathname.includes('index.html') || 
               window.location.pathname === '/' || 
               window.location.pathname.endsWith('/');
    }

    isPublicRoute() {
        const publicRoutes = ['index.html', 'login.html', 'register.html', 'forgot-password.html'];
        return publicRoutes.some(route => window.location.pathname.includes(route));
    }

    redirectToLogin() {
        if (!this.isLoginPage()) {
            console.log('Redirecionando para login...');
            window.location.href = 'index.html';
        }
    }

    async logout() {
        try {
            await auth.signOut();
            console.log('Usuário deslogado com sucesso');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    setupGlobalEventListeners() {
        // Configura todos os botões de logout
        const logoutButtons = document.querySelectorAll('[data-logout]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
}

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
            if (spinner) spinner.classList.remove('hidden');
            if (buttonText) buttonText.classList.add('hidden');
        } else {
            button.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (buttonText) buttonText.classList.remove('hidden');
        }
    }
}

function toggleAuthForms() {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    
    if (loginContainer && registerContainer) {
        if (loginContainer.classList.contains('hidden')) {
            loginContainer.classList.remove('hidden');
            registerContainer.classList.add('hidden');
        } else {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
        }
    }
}

// Lógica específica da página de login
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' || 
    window.location.pathname.endsWith('/')) {
    
    // Alternar entre login e registro
    document.getElementById('show-register-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
        
        // Preenche o email se já estiver preenchido no login
        const loginEmail = document.getElementById('login-email')?.value;
        if (loginEmail && document.getElementById('register-email')) {
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
                showMessage('login-message', 'Login realizado com sucesso! Redirecionando...', 'success');
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

// Inicialização do sistema de autenticação
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
    
    // Adiciona classe de carregamento
    document.body.classList.add('auth-loading');

    // Remove classe de carregamento após 2 segundos
    setTimeout(() => {
        document.body.classList.remove('auth-loading');
    }, 2000);
});

// Estilos CSS para estados de carregamento
const authStyles = `
<style>
.auth-loading {
    opacity: 0.7;
    pointer-events: none;
}

.auth-loading::after {
    content: 'Verificando autenticação...';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 8px;
    z-index: 10000;
}

[data-auth] { display: none; }
[data-unauth] { display: none; }
</style>
`;

// Adiciona os estilos ao documento
document.head.insertAdjacentHTML('beforeend', authStyles);