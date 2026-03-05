class WorkerWagePage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        this.workerId = options.workerId;
        this.userData = null;
        this.workerData = null;
        this.wageData = null;
    }

    async init() {
        try {
            await this.loadUserData();
            await this.loadWorkerData();
            await this.loadWageData();
            this.renderPage();
        } catch (error) {
            this.logger.error('工资查看页面初始化失败:', error);
            this.toast.error('加载数据失败，请稍后重试');
            this.renderError(error.message);
        }
    }

    async loadUserData() {
        try {
            // 获取当前用户ID
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            const currentUserId = cookieMatch ? cookieMatch[1] : localStorageUserId;
            
            if (!currentUserId) {
                throw new Error('用户未登录');
            }
            
            const response = await fetch(`/jg/api/get-user-info.php?user_id=${currentUserId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.CSRF_TOKEN
                }
            });
            
            if (!response.ok) {
                throw new Error('获取用户信息失败');
            }
            
            const data = await response.json();
            if (data.success) {
                this.userData = data.user || {};
            } else {
                throw new Error(data.error || '获取用户信息失败');
            }
        } catch (error) {
            this.logger.error('加载用户数据失败:', error);
            throw error;
        }
    }

    async loadWorkerData() {
        try {
            // 获取当前用户ID
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            const currentUserId = cookieMatch ? cookieMatch[1] : localStorageUserId;
            
            if (!currentUserId) {
                throw new Error('用户未登录');
            }
            
            const response = await fetch('/jg/api/data.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getUserById',
                    user_id: currentUserId,
                    userId: this.workerId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            if (!response.ok) {
                throw new Error('获取工人信息失败');
            }
            
            const data = await response.json();
            if (data.success) {
                this.workerData = data.data || {};
            } else {
                throw new Error(data.error || '获取工人信息失败');
            }
        } catch (error) {
            this.logger.error('加载工人数据失败:', error);
            throw error;
        }
    }

    async loadWageData() {
        try {
            // 获取当前用户ID
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            const currentUserId = cookieMatch ? cookieMatch[1] : localStorageUserId;
            
            if (!currentUserId) {
                throw new Error('用户未登录');
            }
            
            const response = await fetch('/jg/api/data.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getWageDetails',
                    user_id: currentUserId,
                    userId: this.workerId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            if (!response.ok) {
                throw new Error('获取工资数据失败');
            }
            
            const data = await response.json();
            if (data.success) {
                this.wageData = data.data || {};
            } else {
                throw new Error(data.error || '获取工资数据失败');
            }
        } catch (error) {
            this.logger.error('加载工资数据失败:', error);
            throw error;
        }
    }

    renderPage() {
        if (!this.workerData || !this.wageData) {
            this.renderError('数据加载不完整');
            return;
        }

        const html = `
            <div class="container-fluid p-4">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h4 class="mb-0">工人工资详情</h4>
                            <div class="d-flex gap-2">
                                <button id="generateHtmlBtn" class="btn btn-light btn-sm">
                                    <i class="fas fa-file-html"></i> 生成HTML
                                </button>
                                <button class="btn btn-light btn-sm" onclick="window.history.back()">
                                    <i class="fas fa-arrow-left"></i> 返回
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- 工人基本信息 -->
                        <div class="mb-4">
                            <h5 class="text-muted">基本信息</h5>
                            <div class="row mt-2">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">姓名</label>
                                        <input type="text" class="form-control" value="${this.workerData.name || '-'}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">电话</label>
                                        <input type="text" class="form-control" value="${this.workerData.phone || '-'}" disabled>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">岗位</label>
                                        <input type="text" class="form-control" value="${this.workerData.position || '-'}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">加班倍率</label>
                                        <input type="text" class="form-control" value="${this.workerData.overtimeRate || 1}" disabled>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 工资详情 -->
                        <div class="mb-4">
                            <h5 class="text-muted">工资详情</h5>
                            <div class="row mt-2">
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">基本工资</label>
                                        <input type="text" class="form-control" value="${this.wageData.baseSalary || 0}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">出勤天数</label>
                                        <input type="text" class="form-control" value="${this.wageData.attendanceDays || 0}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">缺勤天数</label>
                                        <input type="text" class="form-control" value="${this.wageData.absentDays || 0}" disabled>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">加班时长</label>
                                        <input type="text" class="form-control" value="${this.wageData.overtimeHours || 0}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">加班工资</label>
                                        <input type="text" class="form-control" value="${this.wageData.overtimePay || 0}" disabled>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label class="form-label">总工资</label>
                                        <input type="text" class="form-control" value="${this.wageData.totalSalary || 0}" disabled>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 考勤记录 -->
                        <div class="mb-4">
                            <h5 class="text-muted">近期考勤记录</h5>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>日期</th>
                                            <th>出勤状态</th>
                                            <th>工作时长</th>
                                            <th>加班时长</th>
                                            <th>备注</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderAttendanceRecords()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents();
    }

    bindEvents() {
        // 生成HTML按钮点击事件
        const generateHtmlBtn = document.getElementById('generateHtmlBtn');
        if (generateHtmlBtn) {
            generateHtmlBtn.addEventListener('click', async () => {
                await this.generateHtml();
            });
        }
    }

    async generateHtml() {
        try {
            // 获取当前用户ID
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            const currentUserId = cookieMatch ? cookieMatch[1] : localStorageUserId;
            
            if (!currentUserId) {
                this.toast.error('用户未登录');
                return;
            }
            
            this.toast.info('正在生成HTML文件...');
            
            const response = await fetch('/jg/api/generate-html.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'generateHtml',
                    user_id: currentUserId,
                    worker_id: this.workerId,
                    csrf_token: window.CSRF_TOKEN
                })
            });
            
            if (!response.ok) {
                throw new Error('生成HTML文件失败');
            }
            
            const data = await response.json();
            if (data.success) {
                this.toast.success('HTML文件生成成功');
                
                // 下载文件
                const link = document.createElement('a');
                link.href = data.data.downloadUrl;
                link.download = data.data.fileName;
                link.click();
            } else {
                throw new Error(data.error || '生成HTML文件失败');
            }
        } catch (error) {
            this.logger.error('生成HTML文件失败:', error);
            this.toast.error('生成HTML文件失败，请重试');
        }
    }

    renderAttendanceRecords() {
        if (!this.wageData.attendanceRecords || this.wageData.attendanceRecords.length === 0) {
            return `
                <tr>
                    <td colspan="5" class="text-center text-muted">暂无考勤记录</td>
                </tr>
            `;
        }

        return this.wageData.attendanceRecords.map(record => `
            <tr>
                <td>${record.date || '-'}</td>
                <td>${record.status || '-'}</td>
                <td>${record.workHours || 8}</td>
                <td>${record.overtime || 0}</td>
                <td>${record.remark || '-'}</td>
            </tr>
        `).join('');
    }

    renderError(message) {
        const html = `
            <div style="text-align: center; padding: 40px;">
                <h3>加载失败</h3>
                <p style="color: #666; margin-top: 10px;">${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 20px;">
                    <i class="fas fa-refresh"></i> 重新加载
                </button>
                <button class="btn btn-secondary" onclick="window.history.back()" style="margin-top: 20px; margin-left: 10px;">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
            </div>
        `;

        this.container.innerHTML = html;
    }
}

// 暴露类到全局
window.WorkerWagePage = WorkerWagePage;