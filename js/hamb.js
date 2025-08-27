// Hamburger menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Alternar menu
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarToggle.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Bloquear/liberar scroll do body quando o menu estiver aberto
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    // Event listeners
    sidebarToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
    
    // Fechar menu ao clicar em um item (apenas em mobile)
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 992) {
                toggleSidebar();
            }
        });
    });
});