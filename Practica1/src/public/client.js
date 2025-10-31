// Verificar autenticación
export async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return null;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            localStorage.removeItem('token');
            return null;
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('token');
        return null;
    }
}

// Redirigir si no está autenticado
export function requireAuth(redirectUrl = '/login.html') {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// Mostrar/ocultar elementos basados en el rol
export function updateUIForUser(user) {
    const adminElements = document.querySelectorAll('.admin-only');
    const userElements = document.querySelectorAll('.user-only');
    
    if (user && user.role === 'admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
    }
    
    if (user) {
        userElements.forEach(el => el.classList.remove('hidden'));
    } else {
        userElements.forEach(el => el.classList.add('hidden'));
    }
}

// Manejar logout
export function setupLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');
    
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    });
}

// Formatear fecha
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Validar email
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Mostrar notificación
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 4px;
        color: white;
        z-index: 1000;
        max-width: 300px;
    `;
    
    if (type === 'success') {
        notification.style.background = '#27ae60';
    } else if (type === 'error') {
        notification.style.background = '#e74c3c';
    } else {
        notification.style.background = '#3498db';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para hacer fetch con autenticación
export async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return null;
    }
    
    return response;
}