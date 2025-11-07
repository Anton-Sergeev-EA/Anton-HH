class ApplicationManager {
    constructor() {
        this.currentDeleteId = null;
        this.initEventListeners();
        this.loadApplications();
    }

    initEventListeners() {
        // Обработка формы отклика
        const applicationForm = document.getElementById('applicationForm');
        if (applicationForm) {
            applicationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitApplication();
            });
        }

        // Обработка формы аутентификации
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const submitter = e.submitter;
                const action = submitter ? submitter.dataset.action : 'login';
                this.handleAuth(action);
            });

            // Обработка кнопки показа пароля
            const togglePassword = document.getElementById('togglePassword');
            if (togglePassword) {
                togglePassword.addEventListener('click', () => {
                    this.togglePasswordVisibility();
                });

                // Показать пароль при зажатии кнопки
                togglePassword.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.showPassword();
                });

                togglePassword.addEventListener('mouseup', (e) => {
                    e.preventDefault();
                    this.hidePassword();
                });

                togglePassword.addEventListener('mouseleave', (e) => {
                    e.preventDefault();
                    this.hidePassword();
                });

                // Для touch устройств
                togglePassword.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.showPassword();
                });

                togglePassword.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.hidePassword();
                });
            }

            // Индикатор силы пароля (только для регистрации)
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', () => {
                    this.updatePasswordStrength();
                });
            }
        }

        // Закрытие модальных окон
        document.querySelector('.close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('closeDeleteModal').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        // Кнопки модального окна удаления
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.confirmDelete();
        });

        document.getElementById('cancelDelete').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        // Закрытие модальных окон по клику вне их
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('messageModal');
            if (e.target === modal) {
                this.hideModal();
            }

            const deleteModal = document.getElementById('deleteModal');
            if (e.target === deleteModal) {
                this.hideDeleteModal();
            }
        });

        // Автофокус на первом поле
        const firstInput = document.getElementById('company') || document.getElementById('username');
        if (firstInput) {
            firstInput.focus();
        }
    }

    // Управление модальным окном удаления
    showDeleteModal(applicationId, companyName, position) {
        this.currentDeleteId = applicationId;
        const message = `Вы уверены, что хотите удалить отклик в компанию "<strong>${this.escapeHtml(companyName)}</strong>" на должность "<strong>${this.escapeHtml(position)}</strong>"?`;
        document.getElementById('deleteModalMessage').innerHTML = message;
        document.getElementById('deleteModal').style.display = 'block';
    }

    hideDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.currentDeleteId = null;
    }

    async confirmDelete() {
        if (!this.currentDeleteId) return;

        const deleteBtn = document.getElementById('confirmDelete');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '⏳ Удаление...';
        deleteBtn.disabled = true;

        try {
            const response = await fetch(`/api/applications/${this.currentDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message, 'success');
                this.hideDeleteModal();
                this.loadApplications(); // Перезагружаем список
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка соединения с сервером', 'error');
            console.error('Error:', error);
        } finally {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }

    async deleteApplication(applicationId) {
        // Этот метод теперь не используется напрямую, оставлен для обратной совместимости
        this.showDeleteModal(applicationId, 'компанию', 'должность');
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('togglePassword');

        if (passwordInput.type === 'password') {
            this.showPassword();
            toggleButton.classList.add('active');
        } else {
            this.hidePassword();
            toggleButton.classList.remove('active');
        }
    }

    showPassword() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('togglePassword');

        passwordInput.type = 'text';
        toggleButton.innerHTML = '<span class="eye-icon">👁️</span>';
        toggleButton.title = 'Скрыть пароль';
    }

    hidePassword() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('togglePassword');

        passwordInput.type = 'password';
        toggleButton.innerHTML = '<span class="eye-icon">👁️</span>';
        toggleButton.title = 'Показать пароль';
    }

    updatePasswordStrength() {
        const passwordInput = document.getElementById('password');
        const strengthIndicator = document.getElementById('passwordStrength');

        if (!strengthIndicator) return;

        const password = passwordInput.value;
        let strength = 0;
        let message = '';
        let className = '';

        if (password.length > 0) {
            strengthIndicator.style.display = 'block';

            // Простая проверка силы пароля
            if (password.length < 6) {
                strength = 1;
                message = 'Слабый пароль';
                className = 'weak';
            } else if (password.length < 8) {
                strength = 2;
                message = 'Средний пароль';
                className = 'medium';
            } else {
                // Проверка на наличие разных типов символов
                const hasUpperCase = /[A-Z]/.test(password);
                const hasLowerCase = /[a-z]/.test(password);
                const hasNumbers = /\d/.test(password);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                const complexity = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;

                if (complexity >= 3) {
                    strength = 4;
                    message = 'Сильный пароль';
                    className = 'strong';
                } else if (complexity >= 2) {
                    strength = 3;
                    message = 'Хороший пароль';
                    className = 'medium';
                } else {
                    strength = 2;
                    message = 'Средний пароль';
                    className = 'medium';
                }
            }

            strengthIndicator.textContent = message;
            strengthIndicator.className = `password-strength ${className}`;
        } else {
            strengthIndicator.style.display = 'none';
        }
    }

    async handleAuth(action) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        // Проверка минимальной длины пароля при регистрации
        if (action === 'register' && password.length < 4) {
            this.showMessage('Пароль должен содержать минимум 4 символа', 'error');
            return;
        }

        const submitBtn = document.querySelector(`[data-action="${action}"]`);
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = action === 'login' ? '<span>⏳ Вход...</span>' : '<span>⏳ Регистрация...</span>';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    action: action
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message, 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка соединения с сервером', 'error');
            console.error('Error:', error);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async submitApplication() {
        const company = document.getElementById('company').value.trim();
        const position = document.getElementById('position').value.trim();

        if (!company || !position) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        const submitBtn = document.querySelector('.btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>⏳ Добавляем...</span>';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company: company,
                    position: position
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message, 'success');
                document.getElementById('applicationForm').reset();
                this.loadApplications();
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка соединения с сервером', 'error');
            console.error('Error:', error);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async loadApplications() {
        try {
            const response = await fetch('/api/applications');

            if (response.status === 401) {
                // Не авторизован - перенаправляем на страницу входа
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const applications = await response.json();
            this.renderApplications(applications);
            this.updateStats(applications);
        } catch (error) {
            console.error('Error loading applications:', error);

            // Показываем более информативное сообщение об ошибке
            if (error.message.includes('401')) {
                this.showMessage('Сессия истекла. Пожалуйста, войдите снова.', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                this.showMessage('Ошибка загрузки данных. Проверьте подключение.', 'error');
            }
        }
    }

    renderApplications(applications) {
        const container = document.getElementById('applicationsContainer');
        if (!container) return;

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📭 Пока нет откликов. Добавьте первый!</p>
                </div>
            `;
            return;
        }

        applications.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = applications.map((app, index) => `
            <div class="application-item" style="animation-delay: ${index * 0.1}s">
                <div class="application-header">
                    <span class="company-name">${this.escapeHtml(app.company)}</span>
                    <span class="application-date">${this.formatDate(app.date)}</span>
                </div>
                <div class="position">${this.escapeHtml(app.position)}</div>
                <div class="application-actions">
                    <span class="status">${app.status || 'Не просмотрен работодателем'}</span>
                    <button class="delete-btn" onclick="appManager.showDeleteModal(${app.id}, '${this.escapeHtml(app.company)}', '${this.escapeHtml(app.position)}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateStats(applications) {
        const totalApplications = applications.length;
        const uniqueCompanies = new Set(applications.map(app => app.company)).size;

        this.animateCounter('totalApplications', totalApplications);
        this.animateCounter('uniqueCompanies', uniqueCompanies);
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = (targetValue - currentValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (increment * currentStep));
            element.textContent = value;

            if (currentStep >= steps) {
                element.textContent = targetValue;
                clearInterval(timer);
            }
        }, stepTime);
    }

    showMessage(message, type = 'info') {
        const modal = document.getElementById('messageModal');
        const messageElement = document.getElementById('modalMessage');

        messageElement.textContent = message;
        messageElement.className = type;
        modal.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                this.hideModal();
            }, 3000);
        }
    }

    hideModal() {
        document.getElementById('messageModal').style.display = 'none';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Сегодня в ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Вчера в ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Глобальная переменная для доступа к менеджеру приложений
let appManager;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    appManager = new ApplicationManager();
});