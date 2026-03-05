// 工头管理页面类
class ForemanManagementPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        
        // 用户信息
        const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
        const localStorageUserId = localStorage.getItem('user_id');
        this.userId = cookieMatch ? cookieMatch[1] : localStorageUserId;
        this.userRole = null;
        
        // 数据
        this.allWorkers = [];
        this.managedWorkers = [];
    }
    
    async init() {
        // 检查是否已经初始化，避免重复初始化
        if (window.foremanManagementInitialized) {
            this.logger.info('Foreman management page already initialized');
            return true;
        }
        
        try {
            this.logger.info('初始化工头管理页面');
            
            if (!this.container) {
                this.logger.error('container元素不存在');
                return false;
            }
            
            // 检查用户角色
            await this.checkUserRole();
            
            // 加载数据
            await this.loadData();
            
            // 渲染页面
            this.render();
            
            // 绑定事件
            this.bindEvents();
            
            window.foremanManagementInitialized = true;
            this.logger.info('工头管理页面初始化完成');
            return true;
        } catch (error) {
            this.logger.error('初始化工头管理页面失败:', error);
            return false;
        }
    }
    
    async checkUserRole() {
        try {
            const response = await fetch('/jg/api/user-role.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getAllUsers',
                    user_id: this.userId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            const data = await response.json();
            if (data.success) {
                const currentUser = data.data.find(user => user.id === this.userId);
                if (currentUser) {
                    this.userRole = currentUser.role;
                }
            }
        } catch (error) {
            this.logger.error('检查用户角色失败:', error);
        }
    }
    
    async loadData() {
        try {
            // 加载所有工人
            await this.loadAllWorkers();
            
            // 加载工头管理的工人
            await this.loadManagedWorkers();
        } catch (error) {
            this.logger.error('加载数据失败:', error);
        }
    }
    
    async loadAllWorkers() {
        try {
            const response = await fetch('/jg/api/user-role.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getAllUsers',
                    user_id: this.userId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.allWorkers = data.data.filter(user => user.role === 'worker' && user.id !== this.userId);
            }
        } catch (error) {
            this.logger.error('加载所有工人失败:', error);
        }
    }
    
    async loadManagedWorkers() {
        try {
            const response = await fetch('/jg/api/foreman-workers.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getWorkers',
                    user_id: this.userId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.managedWorkers = data.data || [];
            }
        } catch (error) {
            this.logger.error('加载管理的工人失败:', error);
        }
    }
    
    render() {
        // 确保container元素存在
        if (!this.container) {
            this.logger.error('container元素不存在');
            return;
        }
        
        // 渲染页面
        this.container.innerHTML = `
            <div class="foreman-management-page">
                <!-- 页面头部 -->
                <div class="page-header">
                    <h1>工头管理</h1>
                    <div class="page-subtitle">管理您的工人和团队</div>
                </div>
                
                <!-- 工头信息卡片 -->
                <div class="card foreman-info-card">
                    <div class="card-header">
                        <h2><i class="fas fa-user-tie"></i> 工头信息</h2>
                    </div>
                    <div class="card-body">
                        <div class="foreman-info">
                            <div class="info-item">
                                <label>用户ID</label>
                                <span>${this.userId || '未设置'}</span>
                            </div>
                            <div class="info-item">
                                <label>角色</label>
                                <span>${this.userRole || '加载中...'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 工人管理卡片 -->
                <div class="card workers-management-card">
                    <div class="card-header">
                        <h2><i class="fas fa-users"></i> 工人管理</h2>
                    </div>
                    <div class="card-body">
                        <!-- 添加工人 -->
                        <div class="add-worker-section">
                            <h3>添加工人</h3>
                            <div class="add-worker-form">
                                <select id="workerSelect" class="form-select">
                                    <option value="">选择工人</option>
                                    ${this.allWorkers
                                        .filter(worker => !this.managedWorkers.some(mw => mw.id === worker.id))
                                        .map(worker => `
                                            <option value="${worker.id}">${worker.phone} (${worker.role})</option>
                                        `).join('')
                                    }
                                </select>
                                <button id="addWorkerBtn" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> 添加
                                </button>
                            </div>
                        </div>
                        
                        <!-- 管理的工人列表 -->
                        <div class="managed-workers-section">
                            <h3>管理的工人</h3>
                            <div id="managedWorkersList" class="workers-list">
                                ${this.managedWorkers.length > 0 ? 
                                    this.managedWorkers.map(worker => `
                                        <div class="worker-item" data-worker-id="${worker.id}">
                                            <div class="worker-info">
                                                <div class="worker-phone">${worker.phone}</div>
                                                <div class="worker-id">ID: ${worker.id}</div>
                                            </div>
                                            <button class="btn btn-danger remove-worker-btn" data-worker-id="${worker.id}">
                                                <i class="fas fa-trash"></i> 移除
                                            </button>
                                        </div>
                                    `).join('')
                                    : '<p class="no-data">暂无管理的工人</p>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 数据统计卡片 -->
                <div class="card stats-card">
                    <div class="card-header">
                        <h2><i class="fas fa-chart-pie"></i> 团队统计</h2>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-icon">
                                    <i class="fas fa-user-friends"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${this.managedWorkers.length}</div>
                                    <div class="stat-label">管理工人</div>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${this.allWorkers.length}</div>
                                    <div class="stat-label">总工人</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
    }
    
    addStyles() {
        // 移除所有旧的工头管理样式
        const oldStyles = document.querySelectorAll('[id^="foreman-management-styles"]');
        oldStyles.forEach(oldStyle => oldStyle.remove());
        
        const style = document.createElement('style');
        style.id = 'foreman-management-styles';
        style.textContent = `
            .foreman-management-page {
                padding: var(--spacing-lg);
                max-width: 1000px;
                margin: 0 auto;
            }
            
            .page-header {
                margin-bottom: var(--spacing-lg);
                text-align: center;
                padding: var(--spacing-lg) 0;
            }
            
            .page-header h1 {
                font-size: var(--font-size-xl);
                color: var(--text-color);
                margin: 0 0 var(--spacing-xs) 0;
                font-weight: 600;
            }
            
            .page-subtitle {
                font-size: var(--font-size-md);
                color: var(--text-light);
                margin: 0;
            }
            
            .card {
                background: var(--bg-light);
                border-radius: var(--border-radius-md);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                margin-bottom: var(--spacing-lg);
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .card:hover {
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                transform: translateY(-2px);
            }
            
            .card-header {
                background: var(--bg-primary);
                padding: var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
            }
            
            .card-header h2 {
                font-size: var(--font-size-lg);
                color: var(--text-color);
                margin: 0;
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }
            
            .card-body {
                padding: var(--spacing-md);
            }
            
            /* 工头信息样式 */
            .foreman-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: var(--spacing-md);
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
            }
            
            .info-item label {
                font-size: var(--font-size-sm);
                color: var(--text-light);
            }
            
            .info-item span {
                font-size: var(--font-size-md);
                color: var(--text-color);
                padding: var(--spacing-xs) 0;
            }
            
            /* 添加工人样式 */
            .add-worker-section {
                margin-bottom: var(--spacing-lg);
                padding-bottom: var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
            }
            
            .add-worker-section h3 {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-md);
            }
            
            .add-worker-form {
                display: flex;
                gap: var(--spacing-md);
                align-items: center;
            }
            
            .form-select {
                flex: 1;
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-md);
            }
            
            /* 工人列表样式 */
            .managed-workers-section h3 {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-md);
            }
            
            .workers-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .worker-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
                background: var(--bg-light);
                transition: background-color var(--transition-fast);
            }
            
            .worker-item:hover {
                background: var(--bg-dark);
            }
            
            .worker-item:last-child {
                border-bottom: none;
            }
            
            .worker-info {
                flex: 1;
            }
            
            .worker-phone {
                font-size: var(--font-size-md);
                font-weight: 500;
                color: var(--text-color);
            }
            
            .worker-id {
                font-size: var(--font-size-sm);
                color: var(--text-light);
                margin-top: var(--spacing-xs);
            }
            
            .remove-worker-btn {
                padding: var(--spacing-xs) var(--spacing-sm);
                font-size: var(--font-size-sm);
            }
            
            .no-data {
                text-align: center;
                color: var(--text-light);
                padding: var(--spacing-lg);
            }
            
            /* 统计样式 */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: var(--spacing-md);
            }
            
            .stat-item {
                background: var(--bg-dark);
                border-radius: var(--border-radius-md);
                padding: var(--spacing-md);
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
                transition: transform var(--transition-fast);
            }
            
            .stat-item:hover {
                transform: translateY(-2px);
            }
            
            .stat-icon {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--primary-color);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--font-size-lg);
            }
            
            .stat-content {
                flex: 1;
            }
            
            .stat-value {
                font-size: var(--font-size-xl);
                font-weight: bold;
                color: var(--text-color);
            }
            
            .stat-label {
                font-size: var(--font-size-sm);
                color: var(--text-light);
            }
            
            @media (max-width: 768px) {
                .add-worker-form {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .form-select {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // 添加工人按钮
        const addWorkerBtn = document.getElementById('addWorkerBtn');
        if (addWorkerBtn) {
            addWorkerBtn.addEventListener('click', async () => {
                await this.addWorker();
            });
        }
        
        // 移除工人按钮
        document.querySelectorAll('.remove-worker-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const workerId = e.target.closest('.remove-worker-btn').dataset.workerId;
                await this.removeWorker(workerId);
            });
        });
        
        // 工人点击事件 - 跳转到工资查看页面
        document.querySelectorAll('.worker-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 只有点击工人信息区域才跳转，避免点击移除按钮时跳转
                if (!e.target.closest('.remove-worker-btn')) {
                    const workerId = item.dataset.workerId;
                    window.location.href = `/jg/html-new/worker-wage.php?worker_id=${workerId}`;
                }
            });
        });
    }
    
    async addWorker() {
        const workerSelect = document.getElementById('workerSelect');
        const workerId = workerSelect.value;
        
        if (!workerId) {
            this.toast.error('请选择要添加的工人');
            return;
        }
        
        try {
            const response = await fetch('/jg/api/foreman-workers.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'addWorker',
                    user_id: this.userId,
                    worker_id: workerId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.toast.success('工人添加成功');
                // 重新加载数据
                await this.loadData();
                // 重新渲染页面
                this.render();
                // 重新绑定事件
                this.bindEvents();
            } else {
                this.toast.error(data.error || '添加失败');
            }
        } catch (error) {
            this.logger.error('添加工人失败:', error);
            this.toast.error('添加失败，请重试');
        }
    }
    
    async removeWorker(workerId) {
        try {
            const response = await fetch('/jg/api/foreman-workers.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'removeWorker',
                    user_id: this.userId,
                    worker_id: workerId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.toast.success('工人移除成功');
                // 重新加载数据
                await this.loadData();
                // 重新渲染页面
                this.render();
                // 重新绑定事件
                this.bindEvents();
            } else {
                this.toast.error(data.error || '移除失败');
            }
        } catch (error) {
            this.logger.error('移除工人失败:', error);
            this.toast.error('移除失败，请重试');
        }
    }
}

// 暴露到window对象
window.ForemanManagementPage = ForemanManagementPage;