// 条件声明，避免重复定义
if (!window.LoginIconManager) {
    class LoginIconManager {
        constructor() {
            this.loginIcon = null;
        }

        init() {
            this.loginIcon = document.getElementById('loginIcon');
            if (this.loginIcon) {
                this.updateLoginIcon();
                this.setupEventListeners();
            }
        }

        updateLoginIcon() {
            if (!this.loginIcon) return;

            const icon = this.loginIcon.querySelector('i');
            const userId = localStorage.getItem('user_id');
            
            if (userId) {
                // 已登录，显示用户验证图标并添加已登录类
                icon.className = 'fas fa-user-check';
                this.loginIcon.classList.add('logged-in');
                this.loginIcon.title = '个人中心';
                this.loginIcon.onclick = () => this.showUserCenter();
            } else {
                // 未登录，显示用户图标并移除已登录类
                icon.className = 'fas fa-user';
                this.loginIcon.classList.remove('logged-in');
                this.loginIcon.title = '登录';
                this.loginIcon.onclick = () => this.navigateToLogin();
            }
        }

        showUserCenter() {
            // 导航到个人中心页面
            window.location.href = '/jg/html-new/user-center.php';
        }

        navigateToLogin() {
            window.location.href = '/jg/admin/login.html';
        }

        setupEventListeners() {
            // 监听登录状态变化
            window.addEventListener('storage', (e) => {
                if (e.key === 'user_id') {
                    this.updateLoginIcon();
                }
            });
        }
    }

    // 创建并暴露单例实例
    const loginIconManager = new LoginIconManager();
    window.LoginIconManager = LoginIconManager;
    window.loginIconManager = loginIconManager;
}


