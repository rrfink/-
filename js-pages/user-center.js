// 个人中心页面类
class UserCenterPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        
        // 解析URL参数
        this.urlParams = this.parseUrlParams();
        
        // 用户信息
        this.userInfo = {
            name: '未设置',
            userId: this.urlParams.user_id || localStorage.getItem('user_id') || '未设置',
            email: '未设置',
            phone: '未设置',
            idNumber: '未设置',
            job: '未设置',
            wage: 0,
            monthlyWage: 0,
            overtimeRate: 0
        };
    }
    
    // 解析URL参数
    parseUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        return params;
    }

    // 获取节日主题偏好
    getHolidayThemePreference() {
        return localStorage.getItem('holidayThemePreference') || 'auto';
    }

    // 获取节日主题选项（已废弃，改用卡片）
    getHolidayThemeOptions() {
        return '';
    }

    // 获取节日主题卡片
    getHolidayThemeCards() {
        const themes = [
            { id: 'springFestival', name: '春节', icon: '🧧' },
            { id: 'lanternFestival', name: '元宵节', icon: '🏮' },
            { id: 'qingming', name: '清明节', icon: '🌿' },
            { id: 'laborDay', name: '劳动节', icon: '👷' },
            { id: 'dragonBoat', name: '端午节', icon: '🐲' },
            { id: 'midAutumn', name: '中秋节', icon: '🌕' },
            { id: 'nationalDay', name: '国庆节', icon: '🇨🇳' },
            { id: 'newYear', name: '元旦', icon: '🎆' },
            { id: 'birthday', name: '生日', icon: '🎂' }
        ];
        
        const currentPreference = this.getHolidayThemePreference();
        return themes.map(theme => {
            const isActive = currentPreference === theme.id;
            return `
                <div class="holiday-select-card ${isActive ? 'active' : ''}" data-value="${theme.id}" 
                     style="padding: 10px 8px; border: 2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; 
                            border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s;
                            background: ${isActive ? 'var(--primary-color-10)' : 'transparent'};">
                    <div style="font-size: 22px; margin-bottom: 2px;">${theme.icon}</div>
                    <div style="font-size: 12px; font-weight: 500;">${theme.name}</div>
                </div>
            `;
        }).join('');
    }

    // 获取自定义主题列表HTML
    getCustomThemesListHTML() {
        const customThemes = this.theme ? this.theme.getCustomThemes() : [];
        
        if (customThemes.length === 0) {
            return `
                <h3>自定义主题</h3>
                <p style="color: var(--text-secondary);">暂无自定义主题，点击"导入主题"按钮添加</p>
            `;
        }
        
        const currentTheme = this.theme ? this.theme.getTheme() : 'light';
        
        return `
            <h3 style="margin-bottom: 12px;">自定义主题 (${customThemes.length}个)</h3>
            <div class="custom-theme-cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                ${customThemes.map(theme => {
                    const isActive = currentTheme === theme.id;
                    // 获取主题的主色作为预览色
                    const primaryColor = theme.variables && theme.variables['--primary-color'] ? theme.variables['--primary-color'] : '#666';
                    const bgColor = theme.variables && theme.variables['--bg-primary'] ? theme.variables['--bg-primary'] : '#f5f5f5';
                    return `
                        <div class="custom-theme-card ${isActive ? 'active' : ''}" data-theme-id="${theme.id}"
                             style="padding: 12px; border: 2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; 
                                    border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s;
                                    background: ${isActive ? 'var(--primary-color-10)' : bgColor};">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${primaryColor}; 
                                        margin: 0 auto 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">${theme.name}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${theme.id}</div>
                            ${isActive ? '<div style="font-size: 11px; color: var(--success-color); margin-top: 4px;"><i class="fas fa-check"></i> 当前使用</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // 保存节日主题设置
    async saveHolidayThemeSetting() {
        // 获取选中的卡片值
        const activeCard = document.querySelector('.holiday-theme-card.active, .holiday-select-card.active');
        const preference = activeCard?.dataset.value || 'auto';
        
        try {
            // 保存到 localStorage
            localStorage.setItem('holidayThemePreference', preference);
            
            // 保存到服务器
            if (this.storage) {
                await this.storage.set('userSettings', {
                    id: 'holidayThemePreference',
                    key: 'holidayThemePreference',
                    value: preference,
                    user_id: localStorage.getItem('user_id'),
                    updatedAt: new Date().toISOString()
                });
            }
            
            // 立即应用主题
            if (window.holidayThemeManager) {
                await window.holidayThemeManager.saveUserPreference(preference);
                await window.holidayThemeManager.applyThemeByPreference();
            }
            
            this.toast.success('节日主题设置已保存');
        } catch (error) {
            this.toast.error('保存设置失败：' + error.message);
        }
    }

    // 设置选中的主题卡片
    setHolidayThemeCard(value) {
        // 移除所有 active 状态
        document.querySelectorAll('.holiday-theme-card, .holiday-select-card').forEach(card => {
            card.classList.remove('active');
            card.style.borderColor = 'var(--border-color)';
            card.style.background = 'transparent';
        });
        
        // 添加 active 状态到选中的卡片
        const selectedCard = document.querySelector(`[data-value="${value}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            selectedCard.style.borderColor = 'var(--primary-color)';
            selectedCard.style.background = 'var(--primary-color-10)';
        }
    }
    
    // 加载个人信息
    async loadPersonalInfo() {
        try {
            // 记录加载开始
            this.logger.info('开始加载个人信息');
            
            // 确定要加载的用户ID - 优先从URL参数，然后cookie，最后localStorage
            let targetUserId = this.urlParams.user_id;
            
            // 如果URL参数没有，尝试从cookie获取
            if (!targetUserId) {
                const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
                if (cookieMatch) {
                    targetUserId = cookieMatch[1];
                }
            }
            
            // 如果cookie也没有，尝试从localStorage获取
            if (!targetUserId) {
                targetUserId = localStorage.getItem('user_id');
            }
            
            this.logger.info('目标用户ID:', targetUserId);
            
            // 尝试从服务器获取个人信息
            let personalInfo = null;
            
            if (targetUserId) {
                try {
                    // 添加时间戳避免缓存
                    const timestamp = Date.now();
                    const response = await fetch(`/jg/api/get-user-info.php?user_id=${targetUserId}&_t=${timestamp}`);
                    const data = await response.json();
                    if (data.success) {
                        personalInfo = data.user;
                        // 将服务器数据保存到本地存储，以便快速访问
                        localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
                    }
                } catch (error) {
                    this.logger.error('从服务器获取用户信息失败:', error);
                }
            }
            
            // 如果服务器获取失败，尝试从本地存储获取
            if (!personalInfo) {
                // 先尝试全局 personalInfo
                try {
                    const localData = localStorage.getItem('personalInfo');
                    if (localData) {
                        personalInfo = JSON.parse(localData);
                        this.logger.info('从全局 personalInfo 加载:', personalInfo);
                    }
                } catch (localError) {
                    this.logger.error('从本地存储获取个人信息失败:', localError);
                }
            }
            
            // 如果还是没有，尝试从项目特定的 personalInfo 加载
            if (!personalInfo) {
                try {
                    // 获取当前项目ID
                    const currentProjectId = localStorage.getItem('currentProjectId');
                    if (currentProjectId) {
                        const projectPersonalInfo = localStorage.getItem(`personalInfo_${currentProjectId}`);
                        if (projectPersonalInfo) {
                            personalInfo = JSON.parse(projectPersonalInfo);
                            this.logger.info('从项目 personalInfo 加载:', personalInfo);
                        }
                    }
                } catch (projectError) {
                    this.logger.error('从项目本地存储获取个人信息失败:', projectError);
                }
            }
            
            // 如果还是没有，尝试从 IndexedDB 读取
            if (!personalInfo && this.storage) {
                try {
                    personalInfo = await this.storage.get('personalInfo');
                    if (personalInfo) {
                        this.logger.info('从 IndexedDB 加载:', personalInfo);
                    }
                } catch (idbError) {
                    this.logger.error('从 IndexedDB 获取个人信息失败:', idbError);
                }
            }
            
            // 如果还是没有，尝试从项目的 personalInfo 读取
            if (!personalInfo) {
                try {
                    const projectsData = localStorage.getItem('projects');
                    if (projectsData) {
                        const projects = JSON.parse(projectsData);
                        let currentProjectId = localStorage.getItem('currentProjectId');
                        // 处理 currentProjectId 可能是 JSON 字符串的情况
                        try {
                            currentProjectId = JSON.parse(currentProjectId);
                        } catch (e) {
                            // 如果解析失败，说明是普通字符串，直接使用
                        }
                        // 找到当前项目
                        const currentProject = projects.find(p => p.id === currentProjectId);
                        if (currentProject && currentProject.personalInfo) {
                            personalInfo = currentProject.personalInfo;
                            this.logger.info('从当前项目 personalInfo 加载:', personalInfo);
                        } else if (projects.length > 0 && projects[0].personalInfo) {
                            // 如果没有当前项目，使用第一个项目的 personalInfo
                            personalInfo = projects[0].personalInfo;
                            this.logger.info('从第一个项目 personalInfo 加载:', personalInfo);
                        }
                    }
                } catch (projectError) {
                    this.logger.error('从项目 personalInfo 获取失败:', projectError);
                }
            }
            
            this.logger.info('获取到的个人信息:', personalInfo);
            
            // 更新用户信息，即使personalInfo为null也设置默认值
            // 兼容项目的 personalInfo 结构（使用 type 而不是 job）
            this.userInfo = {
                name: personalInfo?.name || '未设置',
                userId: targetUserId || '未设置',
                email: personalInfo?.email || '未设置',
                phone: personalInfo?.phone || '未设置',
                idNumber: personalInfo?.idNumber || '未设置',
                job: personalInfo?.job || personalInfo?.type || '未设置',
                wage: personalInfo?.wage || 0,
                monthlyWage: personalInfo?.monthlyWage || 0,
                overtimeRate: personalInfo?.overtimeRate || 0
            };
            
            // 记录加载结果
            this.logger.info('加载个人信息完成:', this.userInfo);
        } catch (error) {
            this.logger.error('加载个人信息失败:', error);
            // 发生错误时，设置默认值
            const targetUserId = this.urlParams.user_id || localStorage.getItem('user_id');
            this.userInfo = {
                name: '未设置',
                userId: targetUserId || '未设置',
                email: '未设置',
                phone: '未设置',
                idNumber: '未设置',
                job: '未设置',
                wage: 0,
                monthlyWage: 0,
                overtimeRate: 0
            };
        }
    }
    
    async init() {
        // 检查是否已经初始化，避免重复初始化
        if (window.userCenterInitialized) {
            this.logger.info('User center page already initialized');
            return true;
        }
        
        try {
            this.logger.info('初始化个人中心页面');
            
            // 检查版本号
            if (window.VersionChecker) {
                const versionChecker = new VersionChecker({
                    storage: this.storage,
                    toast: this.toast,
                    logger: this.logger
                });
                await versionChecker.check();
            }
            
            if (!this.container) {
                this.logger.error('container元素不存在');
                return false;
            }
            
            // 优先从本地加载个人信息（在渲染之前）
            this.loadPersonalInfoFromLocal();
            
            // 先渲染页面和绑定事件，让页面快速显示
            this.render();
            this.bindEvents();
            
            // 异步加载个人信息和统计数据
            await Promise.all([
                this.loadPersonalInfo(),
                this.loadAttendanceStats(),
                this.loadUnreadFeedbackCount()
            ]);
            
            window.userCenterInitialized = true;
            this.logger.info('个人中心页面初始化完成');
            return true;
        } catch (error) {
            this.logger.error('初始化个人中心页面失败:', error);
            return false;
        }
    }
    
    // 从本地加载个人信息（快速）
    loadPersonalInfoFromLocal() {
        try {
            let personalInfo = null;
            
            // 先尝试从全局 personalInfo 读取
            const localData = localStorage.getItem('personalInfo');
            if (localData) {
                personalInfo = JSON.parse(localData);
            }
            
            // 如果没有，尝试从项目的 personalInfo 读取
            if (!personalInfo) {
                const projectsData = localStorage.getItem('projects');
                if (projectsData) {
                    const projects = JSON.parse(projectsData);
                    let currentProjectId = localStorage.getItem('currentProjectId');
                    // 处理 currentProjectId 可能是 JSON 字符串的情况
                    try {
                        currentProjectId = JSON.parse(currentProjectId);
                    } catch (e) {}
                    
                    const currentProject = projects.find(p => p.id === currentProjectId);
                    if (currentProject && currentProject.personalInfo) {
                        personalInfo = currentProject.personalInfo;
                    } else if (projects.length > 0 && projects[0].personalInfo) {
                        personalInfo = projects[0].personalInfo;
                    }
                }
            }
            
            if (personalInfo) {
                this.userInfo = {
                    name: personalInfo?.name || '未设置',
                    userId: this.urlParams.user_id || localStorage.getItem('user_id') || '未设置',
                    email: personalInfo?.email || '未设置',
                    phone: personalInfo?.phone || '未设置',
                    idNumber: personalInfo?.idNumber || '未设置',
                    job: personalInfo?.job || personalInfo?.type || '未设置',
                    wage: personalInfo?.wage || 0,
                    monthlyWage: personalInfo?.monthlyWage || 0,
                    overtimeRate: personalInfo?.overtimeRate || 0
                };
                this.logger.info('从本地加载个人信息成功:', this.userInfo);
            }
        } catch (error) {
            this.logger.error('从本地加载个人信息失败:', error);
        }
    }
    
    // 加载未读反馈通知数量
    async loadUnreadFeedbackCount() {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            
            const response = await fetch(`/jg/api/get-feedback.php?user_id=${userId}`);
            const result = await response.json();
            
            if (result.unread_count !== undefined) {
                this.updateFeedbackNotificationCount(result.unread_count);
            }
        } catch (error) {
            this.logger.error('加载未读反馈通知失败:', error);
        }
    }
    
    // 更新反馈通知计数显示
    updateFeedbackNotificationCount(count) {
        const feedbackBtn = document.getElementById('feedbackBtn');
        if (feedbackBtn) {
            // 移除旧的通知标记
            const oldBadge = feedbackBtn.querySelector('.notification-badge');
            if (oldBadge) {
                oldBadge.remove();
            }
            
            // 添加新的通知标记
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = count;
                badge.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: var(--error-color);
                    color: white;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                feedbackBtn.style.position = 'relative';
                feedbackBtn.appendChild(badge);
            }
        }
    }
    
    // 标记反馈为已读
    async markFeedbackAsRead(feedbackId) {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            
            const response = await fetch('/jg/api/mark-feedback-as-read.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: feedbackId,
                    user_id: userId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // 重新加载未读计数
                await this.loadUnreadFeedbackCount();
            }
        } catch (error) {
            this.logger.error('标记反馈为已读失败:', error);
        }
    }
    
    render() {
        // 记录渲染开始
        this.logger.info('开始渲染个人中心页面', this.userInfo);
        
        // 确保container元素存在
        if (!this.container) {
            this.logger.error('container元素不存在');
            return;
        }
        
        // 确保userInfo对象存在
        if (!this.userInfo) {
            this.userInfo = {
                name: '未设置',
                userId: '未设置',
                email: '未设置',
                phone: '未设置',
                job: '未设置',
                wage: 0,
                monthlyWage: 0,
                overtimeRate: 0
            };
        }
        
        // 渲染页面
        const returnUrl = this.urlParams.return_url || '';
        const adminView = this.urlParams.admin_view === '1';
        
        this.container.innerHTML = `
            <div class="user-center-page">
                <!-- 页面头部 -->
                <div class="page-header">
                    ${adminView && returnUrl ? `
                        <div class="admin-return-link">
                            <a href="${returnUrl}" class="btn btn-secondary">
                                <i class="fas fa-arrow-left"></i> 返回管理员后台
                            </a>
                        </div>
                    ` : ''}
                    <h1>个人中心</h1>
                    <div class="page-subtitle">管理您的个人信息和考勤数据</div>
                </div>
                
                <!-- 个人信息卡片 -->
                <div class="card user-info-card">
                    <div class="card-header">
                        <h2><i class="fas fa-user-circle"></i> 个人基本信息</h2>
                    </div>
                    <div class="card-body">
                        <div class="user-info-grid">
                            <div class="info-item">
                                <label>姓名</label>
                                <span>${this.userInfo.name || '未设置'}</span>
                            </div>
                            <div class="info-item">
                                <label>用户ID</label>
                                <span>${this.userInfo.userId || '未设置'}</span>
                            </div>
                            <div class="info-item">
                                <label>邮箱</label>
                                <span>${this.userInfo.email || '未设置'}</span>
                                <button class="edit-btn" data-field="email">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="info-item">
                                <label>电话</label>
                                <span>${this.userInfo.phone || '未设置'}</span>
                                <button class="edit-btn" data-field="phone">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="info-item">
                                <label>身份证号</label>
                                <span>${this.userInfo.idNumber || '未设置'}</span>
                                <button class="edit-btn" data-field="idNumber">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="info-item">
                                <label>工种</label>
                                <span>${this.userInfo.job || '未设置'}</span>
                            </div>
                            <div class="info-item">
                                <label>日薪</label>
                                <span>¥${this.userInfo.wage || 0}/天</span>
                            </div>
                            <div class="info-item">
                                <label>月薪</label>
                                <span>¥${this.userInfo.monthlyWage || 0}/月</span>
                            </div>
                            <div class="info-item">
                                <label>加班费倍率</label>
                                <span>${this.userInfo.overtimeRate || 0}倍</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 考勤统计卡片 -->
                <div class="card attendance-stats-card">
                    <div class="card-header">
                        <h2><i class="fas fa-calendar-check"></i> 考勤统计概览</h2>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-icon">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value" id="normalDays">--</div>
                                    <div class="stat-label">正常出勤</div>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon warning">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value" id="lateDays">--</div>
                                    <div class="stat-label">迟到</div>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon danger">
                                    <i class="fas fa-times-circle"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value" id="absentDays">--</div>
                                    <div class="stat-label">缺勤</div>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon info">
                                    <i class="fas fa-hourglass-half"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value" id="totalHours">--</div>
                                    <div class="stat-label">累计工时</div>
                                </div>
                            </div>
                        </div>
                        <div class="recent-attendance">
                            <h3>最近考勤记录</h3>
                            <div id="recentAttendanceList" class="attendance-list">
                                <p class="loading">加载中...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 个人设置卡片 -->
                <div class="card settings-card">
                    <div class="card-header">
                        <h2><i class="fas fa-cog"></i> 个人设置</h2>
                    </div>
                    <div class="card-body">
                        <div class="settings-grid">
                            <div class="setting-item">
                                <label>密码修改</label>
                                <button class="btn btn-primary" id="changePasswordBtn">
                                    <i class="fas fa-key"></i> 修改密码
                                </button>
                            </div>
                            <div class="setting-item">
                                <label>通知设置</label>
                                <button class="btn btn-primary" id="notificationSettingsBtn">
                                    <i class="fas fa-bell"></i> 通知偏好
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 主题管理卡片 -->
                <div class="card theme-management-card">
                    <div class="card-header">
                        <h2><i class="fas fa-palette"></i> 主题管理</h2>
                    </div>
                    <div class="card-body">
                        <!-- 主题选择 -->
                        <div class="theme-selection">
                            <h3>选择主题</h3>
                            <div class="theme-cards">
                                <div class="theme-card ${this.theme.getTheme() === 'light' ? 'active' : ''}" data-theme="light">
                                    <div class="theme-card-header">
                                        <i class="fas fa-sun"></i>
                                        <h3>浅色主题</h3>
                                    </div>
                                    <div class="theme-card-preview">
                                        <div class="preview-bg light-bg"></div>
                                        <div class="preview-text">示例文本</div>
                                    </div>
                                </div>
                                <div class="theme-card ${this.theme.getTheme() === 'dark' ? 'active' : ''}" data-theme="dark">
                                    <div class="theme-card-header">
                                        <i class="fas fa-moon"></i>
                                        <h3>深色主题</h3>
                                    </div>
                                    <div class="theme-card-preview">
                                        <div class="preview-bg dark-bg"></div>
                                        <div class="preview-text dark-text">示例文本</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 节日主题设置 -->
                        <div class="holiday-theme-settings" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                            <h3 style="font-size: 15px; margin-bottom: 12px;"><i class="fas fa-gift"></i> 节日主题</h3>
                            <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 12px;">在法定节日期间自动切换节日主题，或手动选择喜欢的主题</p>
                            
                            <!-- 选项卡片 -->
                            <div class="holiday-theme-cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px;">
                                <div class="holiday-theme-card ${this.getHolidayThemePreference() === 'auto' ? 'active' : ''}" data-value="auto" style="padding: 12px; border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                    <div style="font-size: 24px; margin-bottom: 4px;">🔄</div>
                                    <div style="font-size: 13px; font-weight: 500;">自动切换</div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">根据日期</div>
                                </div>
                                <div class="holiday-theme-card ${this.getHolidayThemePreference() === 'none' ? 'active' : ''}" data-value="none" style="padding: 12px; border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                    <div style="font-size: 24px; margin-bottom: 4px;">🚫</div>
                                    <div style="font-size: 13px; font-weight: 500;">关闭主题</div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">不使用</div>
                                </div>
                            </div>
                            
                            <!-- 节日选择卡片 -->
                            <div style="margin-bottom: 16px;">
                                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; display: block;">或选择特定主题：</label>
                                <div class="holiday-select-cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
                                    ${this.getHolidayThemeCards()}
                                </div>
                            </div>
                        </div>

                        <div class="theme-actions" style="display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: start;">
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button class="btn btn-primary" id="importThemeBtn">
                                    <i class="fas fa-upload"></i> 导入主题
                                </button>
                                <button class="btn btn-primary" id="exportThemeBtn">
                                    <i class="fas fa-download"></i> 导出主题
                                </button>
                                <button class="btn btn-danger" id="deleteThemeBtn">
                                    <i class="fas fa-trash"></i> 删除主题
                                </button>
                            </div>
                            <button class="btn btn-success" id="saveHolidayThemeBtn">
                                <i class="fas fa-save"></i> 保存主题
                            </button>
                        </div>
                        
                        <!-- 自定义主题列表 -->
                        <div class="custom-themes-list" id="customThemesList">
                            ${this.getCustomThemesListHTML()}
                        </div>
                    </div>
                </div>
                
                <!-- 数据管理卡片 -->
                <div class="card data-management-card">
                    <div class="card-header">
                        <h2><i class="fas fa-database"></i> 数据管理</h2>
                    </div>
                    <div class="card-body">
                        <div class="data-actions">
                            <button class="btn btn-primary" id="exportAttendanceBtn">
                                <i class="fas fa-download"></i> 导出考勤数据
                            </button>
                            <button class="btn btn-primary" id="viewHistoryBtn">
                                <i class="fas fa-history"></i> 查看历史记录
                            </button>
                            <button class="btn btn-primary" id="backupDataBtn">
                                <i class="fas fa-save"></i> 备份个人数据
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 系统功能卡片 -->
                <div class="card system-card">
                    <div class="card-header">
                        <h2><i class="fas fa-cogs"></i> 系统功能</h2>
                    </div>
                    <div class="card-body">
                        <div class="system-actions">
                            <button class="btn btn-primary" id="helpBtn">
                                <i class="fas fa-question-circle"></i> 帮助文档
                            </button>
                            <button class="btn btn-primary" id="feedbackBtn">
                                <i class="fas fa-comment-dots"></i> 反馈与建议
                            </button>
                            <button class="btn btn-error" id="logoutBtn">
                                <i class="fas fa-sign-out-alt"></i> 退出登录
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
    }
    
    addStyles() {
        // 移除所有旧的用户中心样式
        const oldStyles = document.querySelectorAll('[id^="user-center-styles"]');
        oldStyles.forEach(oldStyle => oldStyle.remove());
        
        const style = document.createElement('style');
        style.id = 'user-center-styles';
        style.textContent = `
            .user-center-page {
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
            
            .admin-return-link {
                margin-bottom: var(--spacing-md);
            }
            
            .admin-return-link .btn {
                display: inline-flex;
                align-items: center;
                gap: var(--spacing-sm);
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
            
            /* 个人信息样式 */
            .user-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: var(--spacing-md);
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
                position: relative;
            }
            
            .user-center-page .info-item label {
                font-size: var(--font-size-sm);
                color: var(--text-light);
            }
            
            .user-center-page .info-item span {
                font-size: var(--font-size-md);
                color: var(--text-color);
                padding: var(--spacing-xs) 0;
            }
            
            .edit-btn {
                position: absolute;
                top: 0;
                right: 0;
                background: none;
                border: none;
                color: var(--text-light);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--border-radius-sm);
                transition: all var(--transition-fast);
            }
            
            .edit-btn:hover {
                background: var(--bg-dark);
                color: var(--text-color);
            }
            
            /* 考勤统计样式 */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
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
            
            .stat-icon.warning {
                background: var(--warning-color);
            }
            
            .stat-icon.danger {
                background: var(--danger-color);
            }
            
            .stat-icon.info {
                background: var(--info-color);
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
            
            .recent-attendance {
                margin-top: var(--spacing-lg);
            }
            
            .recent-attendance h3 {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-md);
            }
            
            .attendance-list {
                max-height: 200px;
                overflow-y: auto;
            }
            
            .user-center-page .user-attendance-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-sm);
                border-bottom: 1px solid var(--border-color);
                background: var(--bg-light);
            }
            
            .user-center-page .user-attendance-item:last-child {
                border-bottom: none;
            }
            
            .attendance-date {
                font-size: var(--font-size-sm);
                color: var(--text-color);
            }
            
            .attendance-status {
                font-size: var(--font-size-sm);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius-sm);
            }
            
            .attendance-status.normal {
                background: var(--success-color-light);
                color: var(--success-color);
            }
            
            .attendance-status.late {
                background: var(--warning-color-light);
                color: var(--warning-color);
            }
            
            .attendance-status.absent {
                background: var(--danger-color-light);
                color: var(--danger-color);
            }
            
            /* 设置样式 */
            .settings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: var(--spacing-md);
            }
            
            .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-sm) 0;
                border-bottom: 1px solid var(--border-color);
            }
            
            .setting-item:last-child {
                border-bottom: none;
            }
            
            .setting-item label {
                font-size: var(--font-size-md);
                color: var(--text-color);
            }
            
            .theme-cards {
                display: flex;
                gap: var(--spacing-md);
                margin-top: var(--spacing-sm);
            }
            
            .theme-card {
                flex: 1;
                min-width: 120px;
                padding: var(--spacing-sm);
                border: 2px solid var(--border-color);
                border-radius: var(--border-radius-md);
                background: var(--bg-light);
                cursor: pointer;
                transition: all var(--transition-fast);
                text-align: center;
            }
            
            .theme-card:hover {
                border-color: var(--primary-color);
                box-shadow: var(--shadow-sm);
            }
            
            .theme-card.active {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.2);
                background: rgba(22, 93, 255, 0.05);
            }
            
            .theme-card-header {
                margin-bottom: var(--spacing-sm);
            }
            
            .theme-card-header i {
                font-size: var(--font-size-lg);
                margin-bottom: var(--spacing-xs);
                color: var(--text-color);
            }
            
            .theme-card-header h3 {
                font-size: var(--font-size-sm);
                font-weight: 600;
                color: var(--text-color);
                margin: 0;
            }
            
            .theme-card-preview {
                height: 60px;
                border-radius: var(--border-radius-sm);
                overflow: hidden;
                position: relative;
            }
            
            .preview-bg {
                width: 100%;
                height: 100%;
                transition: background-color var(--transition-fast);
            }
            
            .light-bg {
                background: #ffffff;
            }
            
            .dark-bg {
                background: #1f2937;
            }
            
            .preview-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: var(--font-size-xs);
                font-weight: 500;
                transition: color var(--transition-fast);
            }
            
            .dark-text {
                color: #e5e7eb;
            }
            
            @media (max-width: 768px) {
                .theme-cards {
                    flex-direction: column;
                }
                
                .theme-card {
                    min-width: auto;
                }
            }
            

            
            /* 数据管理和系统功能样式 */
            .data-actions,
            .system-actions {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-md);
            }
            
            /* 主题管理样式 */
            .theme-management-card {
                margin-bottom: var(--spacing-lg);
            }
            
            .theme-selection {
                margin-bottom: var(--spacing-lg);
            }
            
            .theme-selection h3 {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-md);
            }
            
            .theme-actions {
                display: flex;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
                flex-wrap: wrap;
                align-items: center;
            }

            .theme-actions .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-sm);
                height: 36px;
                padding: 0 16px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            
            .btn-danger {
                background: var(--error-color);
                color: white;
            }
            
            .btn-danger:hover {
                background: #d32f2f;
            }
            
            .custom-themes-list {
                margin-top: var(--spacing-lg);
            }
            
            .custom-themes-list h3 {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-md);
            }
            
            .theme-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: var(--spacing-md);
            }
            
            .theme-item {
                background: var(--bg-light);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-md);
                padding: var(--spacing-md);
                transition: all var(--transition-fast);
            }
            
            .theme-item:hover {
                box-shadow: var(--shadow-sm);
                border-color: var(--primary-color);
            }
            
            .theme-item.selected {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.2);
            }
            
            .theme-name {
                font-size: var(--font-size-md);
                font-weight: bold;
                color: var(--text-color);
                margin-bottom: var(--spacing-sm);
            }
            
            .theme-actions-secondary {
                display: flex;
                gap: var(--spacing-sm);
                margin-top: var(--spacing-sm);
            }
            
            .theme-actions-secondary .btn {
                font-size: var(--font-size-sm);
                padding: var(--spacing-xs) var(--spacing-sm);
            }
            
            .system-info {
                font-size: var(--font-size-sm);
                color: var(--text-light);
                padding-top: var(--spacing-md);
                border-top: 1px solid var(--border-color);
            }
            
            .loading {
                text-align: center;
                color: var(--text-light);
                padding: var(--spacing-md);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    async loadAttendanceStats() {
        try {
            // 获取当前项目ID
            const currentProjectId = this.storage.getLocal('currentProjectId');
            
            // 获取当前月份
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
            
            // 获取真实的考勤数据
            const attendanceRecords = await this.storage.getAll('attendance');
            
            // 过滤出当前项目的当月考勤数据
            const filteredRecords = attendanceRecords.filter(record => {
                // 检查是否为当前项目
                if (currentProjectId && String(record.projectId) !== String(currentProjectId)) {
                    return false;
                }
                // 检查是否为当月
                return record.date.startsWith(currentMonthStr);
            });
            
            // 计算统计数据
            let normalDays = 0;
            let lateDays = 0;
            let absentDays = 0;
            let totalHours = 0;
            
            filteredRecords.forEach(record => {
                if (record.status === 'present') {
                    normalDays++;
                } else if (record.status === 'late') {
                    lateDays++;
                } else if (record.status === 'absent') {
                    absentDays++;
                }
                
                // 计算工作时长
                if (record.checkIn && record.checkOut) {
                    const checkInTime = new Date(`1970-01-01T${record.checkIn}`);
                    const checkOutTime = new Date(`1970-01-01T${record.checkOut}`);
                    totalHours += (checkOutTime - checkInTime) / (1000 * 60 * 60);
                }
            });
            
            // 格式化总工作时长
            const formattedTotalHours = `${totalHours.toFixed(1)}h`;
            
            // 更新统计数据
            document.getElementById('normalDays').textContent = normalDays;
            document.getElementById('lateDays').textContent = lateDays;
            document.getElementById('absentDays').textContent = absentDays;
            document.getElementById('totalHours').textContent = formattedTotalHours;
            
            // 按日期排序，最新的在前
            filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 获取最近的考勤记录（最多5条）
            const recentAttendance = filteredRecords.slice(0, 5).map(record => {
                let statusText = '正常';
                let statusClass = 'normal';
                
                if (record.status === 'late') {
                    statusText = '迟到';
                    statusClass = 'late';
                } else if (record.status === 'absent') {
                    statusText = '缺勤';
                    statusClass = 'absent';
                } else if (record.status === 'half') {
                    statusText = '半天';
                    statusClass = 'half';
                } else if (record.status === 'leave') {
                    statusText = '请假';
                    statusClass = 'leave';
                } else if (record.status === 'rest') {
                    statusText = '休息';
                    statusClass = 'rest';
                } else if (record.status === 'holiday') {
                    statusText = '放假';
                    statusClass = 'holiday';
                }
                
                let timeText = '未打卡';
                // 如果有考勤状态（不是未考勤），但没有打卡时间，显示考勤状态
                if ((record.status === 'present' || record.status === 'half') && !record.checkIn && !record.checkOut) {
                    timeText = statusText;
                } else if (record.checkIn && record.checkOut) {
                    timeText = `${record.checkIn} - ${record.checkOut}`;
                } else if (record.checkIn) {
                    timeText = `${record.checkIn} - 未打卡`;
                } else if (record.checkOut) {
                    timeText = `未打卡 - ${record.checkOut}`;
                }
                
                return {
                    date: record.date,
                    status: statusClass,
                    statusText: statusText,
                    time: timeText
                };
            });
            
            // 渲染最近考勤记录
            const attendanceList = document.getElementById('recentAttendanceList');
            if (recentAttendance.length === 0) {
                attendanceList.innerHTML = '<p class="no-attendance">暂无考勤记录</p>';
            } else {
                attendanceList.innerHTML = recentAttendance.map(item => `
                    <div class="attendance-item user-attendance-item">
                        <div class="attendance-date">${item.date}</div>
                        <div class="attendance-time">${item.time}</div>
                        <div class="attendance-status ${item.status}">
                            ${item.statusText}
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            this.logger.error('加载考勤统计数据失败:', error);
            // 即使加载失败，也要更新UI显示错误状态
            const attendanceList = document.getElementById('recentAttendanceList');
            if (attendanceList) {
                attendanceList.innerHTML = '<p class="error">加载考勤记录失败</p>';
            }
            this.toast.error('加载考勤数据失败');
        }
    }
    
    // 注意：菜单切换由 menu-handler.js 统一处理
    // 显示登录/个人中心
    showLogin() {
        const userId = localStorage.getItem('user_id');
        if (userId) {
            // 已登录，导航到个人中心（当前页面）
            this.toast.info('您已登录');
        } else {
            // 未登录，导航到登录页面
            window.location.href = '/jg/admin/login.html';
        }
    }
    
    // 处理退出登录
    handleLogout() {
        // 使用新的对话框组件显示确认对话框
        this.dialog.show({
            title: '确认退出',
            htmlContent: '<p>您确定要退出登录吗？</p>',
            showConfirm: true,
            showCancel: true,
            confirmText: '确认退出',
            cancelText: '取消',
            onConfirm: () => {
                // 清除本地存储
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_email');
                localStorage.removeItem('user_phone');
                // 保留currentProjectId，确保退出账号后再登录时保持当前项目
                
                // 显示退出成功提示
                this.toast.success('退出登录成功');
                
                // 跳转到登录页面
                setTimeout(() => {
                    window.location.href = '/jg/html-new/login.php';
                }, 1000);
            }
        });
    }

    // 绑定事件
    bindEvents() {
        // 注意：顶部菜单按钮事件由 menu-handler.js 统一处理

        // 绑定登录图标事件
        const loginIcon = document.getElementById('loginIcon');
        if (loginIcon) {
            loginIcon.addEventListener('click', () => {
                this.showLogin();
            });
        }
        
        // 主题切换卡片
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            card.addEventListener('click', () => {
                const theme = card.getAttribute('data-theme');
                this.theme.setTheme(theme);
                
                // 更新卡片激活状态
                themeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });
        
        // 监听主题变化事件（只注册一次）
        if (!this.themeChangedListenerRegistered) {
            this.themeChangedListenerRegistered = true;
            this.eventBus.on('theme:changed', async (theme) => {
                // 主题变化时，只更新必要的部分
                // 重新添加样式，确保工作记录的背景色更新
                this.addStyles();
                // 重新加载考勤统计数据，确保工作记录的背景色更新
                await this.loadAttendanceStats();
                // 不需要重新渲染整个页面，只需要更新激活的主题卡片
                const currentTheme = this.theme.getTheme();
                const themeCards = document.querySelectorAll('.theme-card');
                themeCards.forEach(card => {
                    if (card.getAttribute('data-theme') === currentTheme) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                });
            });
        }
        
        // 绑定主题管理按钮事件
        const importThemeBtn = document.getElementById('importThemeBtn');
        if (importThemeBtn) {
            importThemeBtn.addEventListener('click', () => this.importTheme());
        }
        
        const exportThemeBtn = document.getElementById('exportThemeBtn');
        if (exportThemeBtn) {
            exportThemeBtn.addEventListener('click', () => this.exportTheme());
        }
        
        const deleteThemeBtn = document.getElementById('deleteThemeBtn');
        if (deleteThemeBtn) {
            deleteThemeBtn.addEventListener('click', () => this.deleteTheme());
        }
        
        // 自定义主题卡片点击事件
        const customThemeCards = document.querySelectorAll('.custom-theme-card');
        customThemeCards.forEach(card => {
            card.addEventListener('click', () => {
                const themeId = card.getAttribute('data-theme-id');
                if (themeId) {
                    this.theme.setTheme(themeId);
                    this.toast.success(`已切换到主题: ${themeId}`);
                    // 重新渲染以更新激活状态
                    this.render();
                }
            });
        });
        
        // 节日主题卡片点击事件
        const holidayThemeCards = document.querySelectorAll('.holiday-theme-card, .holiday-select-card');
        holidayThemeCards.forEach(card => {
            card.addEventListener('click', () => {
                const value = card.dataset.value;
                this.setHolidayThemeCard(value);
            });
        });
        
        // 保存节日主题设置
        const saveHolidayThemeBtn = document.getElementById('saveHolidayThemeBtn');
        if (saveHolidayThemeBtn) {
            saveHolidayThemeBtn.addEventListener('click', () => {
                this.saveHolidayThemeSetting();
            });
        }
        
        // 密码修改
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.showChangePasswordForm();
            });
        }
        
        // 通知设置
        const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
        if (notificationSettingsBtn) {
            notificationSettingsBtn.addEventListener('click', () => {
                this.showNotificationSettings();
            });
        }
        
        // 导出考勤数据
        const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
        if (exportAttendanceBtn) {
            exportAttendanceBtn.addEventListener('click', async () => {
                await this.exportAttendanceData();
            });
        }
        
        // 查看历史记录
        const viewHistoryBtn = document.getElementById('viewHistoryBtn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', async () => {
                await this.viewHistoryRecords();
            });
        }
        
        // 备份数据
        const backupDataBtn = document.getElementById('backupDataBtn');
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', async () => {
                await this.backupUserData();
            });
        }
        
        // 帮助文档
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelpDocs();
            });
        }
        
        // 反馈与建议
        const feedbackBtn = document.getElementById('feedbackBtn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => {
                this.showFeedbackForm();
            });
        }
        
        // 退出登录
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // 使用匿名函数来绑定事件，确保this指向正确
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // 编辑个人信息
        const editBtns = document.querySelectorAll('.edit-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = btn.getAttribute('data-field');
                this.showEditForm(field);
            });
        });
    }
    
    // 显示编辑表单
    showEditForm(field) {
        const fieldNames = {
            name: '姓名',
            email: '邮箱',
            phone: '电话',
            idNumber: '身份证号',
            job: '工种',
            wage: '日薪',
            monthlyWage: '月薪',
            overtimeRate: '加班费倍率'
        };
        
        const currentValue = this.userInfo[field];
        
        // 确定输入类型和单位
        let inputType = 'text';
        let placeholder = '';
        let unit = '';
        
        if (field === 'email') {
            inputType = 'email';
            placeholder = '请输入邮箱地址';
        } else if (field === 'phone') {
            inputType = 'tel';
            placeholder = '请输入电话号码';
        } else if (field === 'idNumber') {
            inputType = 'text';
            placeholder = '请输入身份证号';
        } else if (field === 'wage' || field === 'monthlyWage') {
            inputType = 'number';
            placeholder = `请输入${fieldNames[field]}`;
            unit = field === 'wage' ? '元/天' : '元/月';
        } else if (field === 'overtimeRate') {
            inputType = 'number';
            placeholder = '请输入加班费倍率';
            unit = '倍';
        } else if (field === 'job') {
            placeholder = '请输入工种';
        }
        
        // 创建编辑表单HTML
        const formHTML = `
            <div class="form-group" style="margin-bottom: 16px;">
                <label for="${field}" style="display: block; margin-bottom: 8px; color: var(--text-color); font-size: 14px;">${fieldNames[field]}</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="${inputType}" 
                           id="dialog-${field}" 
                           value="${currentValue}" 
                           placeholder="${placeholder}" 
                           ${field === 'email' ? 'required' : ''}
                           ${(field === 'wage' || field === 'monthlyWage' || field === 'overtimeRate') ? 'step="0.01" min="0"' : ''}
                           style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 16px; box-sizing: border-box;">
                    ${unit ? `<span style="position: absolute; right: 12px; color: var(--text-light); font-size: 14px;">${unit}</span>` : ''}
                </div>
            </div>
        `;
        
        // 使用新的对话框组件
        this.dialog.show({
            title: `编辑${fieldNames[field]}`,
            htmlContent: formHTML,
            showConfirm: true,
            showCancel: true,
            confirmText: '保存',
            cancelText: '取消',
            onConfirm: async () => {
                const newValue = document.getElementById(`dialog-${field}`).value;
                if (newValue) {
                    await this.saveProfileField(field, newValue);
                } else {
                    this.toast.error('请输入有效的值');
                    throw new Error('无效的值');
                }
            }
        });
    }
    
    // 保存个人信息字段
    async saveProfileField(field, value) {
        try {
            // 获取当前的个人信息
            const personalInfo = await this.storage.get('personalInfo', 'current') || {};
            
            // 对于所有字段都保存到personalInfo
            personalInfo[field] = field === 'wage' || field === 'monthlyWage' || field === 'overtimeRate' ? parseFloat(value) : value;
            
            // 保存回存储
            await this.storage.set('personalInfo', personalInfo, 'current');
            
            // 更新本地存储的personalInfo
            localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
            
            // 更新内存中的用户信息
            this.userInfo[field] = field === 'wage' || field === 'monthlyWage' || field === 'overtimeRate' ? parseFloat(value) : value;
            
            // 更新UI
            const editBtn = document.querySelector(`.edit-btn[data-field="${field}"]`);
            if (editBtn) {
                const infoItem = editBtn.closest('.info-item');
                if (infoItem) {
                    const span = infoItem.querySelector('span');
                    if (span) {
                        if (field === 'wage') {
                            span.textContent = `¥${value}/天`;
                        } else if (field === 'monthlyWage') {
                            span.textContent = `¥${value}/月`;
                        } else if (field === 'overtimeRate') {
                            span.textContent = `${value}倍`;
                        } else {
                            span.textContent = value;
                        }
                    }
                }
            }
            
            // 同时更新内存中的userInfo对象
            this.userInfo[field] = field === 'wage' || field === 'monthlyWage' || field === 'overtimeRate' ? parseFloat(value) : value;
            
            // 同步到服务器
            try {
                const userId = this.urlParams.user_id || localStorage.getItem('user_id');
                if (userId) {
                    const response = await fetch('/jg/api/update-user-info.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            field: field,
                            value: value
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        this.logger.error('服务器同步失败:', result.error);
                    }
                }
            } catch (syncError) {
                this.logger.error('服务器同步失败:', syncError);
            }
            
            // 通知主页更新
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({
                    type: 'personalInfoUpdated',
                    field: field,
                    value: value
                }, '*');
            }
            
            // 显示成功消息
            const fieldNames = {
                name: '姓名',
                email: '邮箱',
                phone: '电话',
                idNumber: '身份证号',
                job: '工种',
                wage: '日薪',
                monthlyWage: '月薪',
                overtimeRate: '加班费倍率'
            };
            this.toast.success(`${fieldNames[field] || field}更新成功`);
        } catch (error) {
            this.logger.error('保存个人信息字段失败:', error);
            this.toast.error('保存失败，请重试');
        }
    }
    
    // 显示修改密码表单
    showChangePasswordForm() {
        const formHTML = `
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: var(--text-color); font-size: 14px;">当前密码</label>
                <input type="password" id="dialog-currentPassword" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 16px; box-sizing: border-box;" required>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: var(--text-color); font-size: 14px;">新密码</label>
                <input type="password" id="dialog-newPassword" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 16px; box-sizing: border-box;" required>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: var(--text-color); font-size: 14px;">确认新密码</label>
                <input type="password" id="dialog-confirmPassword" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 16px; box-sizing: border-box;" required>
            </div>
        `;
        
        // 使用新的对话框组件
        this.dialog.show({
            title: '修改密码',
            htmlContent: formHTML,
            showConfirm: true,
            showCancel: true,
            confirmText: '保存',
            cancelText: '取消',
            onConfirm: async () => {
                const currentPassword = document.getElementById('dialog-currentPassword').value;
                const newPassword = document.getElementById('dialog-newPassword').value;
                const confirmPassword = document.getElementById('dialog-confirmPassword').value;
                
                if (!currentPassword || !newPassword || !confirmPassword) {
                    this.toast.error('请填写所有字段');
                    throw new Error('请填写所有字段');
                }
                
                if (newPassword !== confirmPassword) {
                    this.toast.error('两次输入的密码不一致');
                    throw new Error('密码不一致');
                }
                
                if (newPassword.length < 6) {
                    this.toast.error('新密码长度至少为6位');
                    throw new Error('密码太短');
                }
                
                try {
                    const userId = localStorage.getItem('user_id');
                    const response = await fetch('/jg/api/change-password.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            currentPassword: currentPassword,
                            newPassword: newPassword
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.toast.success('密码修改成功，请重新登录');
                        
                        setTimeout(() => {
                            window.location.href = '/jg/html-new/login.php';
                        }, 1500);
                    } else {
                        this.toast.error(result.error || '密码修改失败');
                        throw new Error(result.error || '密码修改失败');
                    }
                } catch (error) {
                    this.logger.error('修改密码失败:', error);
                    this.toast.error('密码修改失败，请重试');
                    throw error;
                }
            }
        });
    }
    
    // 显示通知设置
    showNotificationSettings() {
        // 从localStorage加载已保存的设置
        const savedSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        
        const formHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-color); transition: background 0.2s;">
                    <input type="checkbox" id="dialog-attendanceReminder" ${savedSettings.attendanceReminder === true ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
                    <span style="font-size: 14px;">考勤提醒</span>
                </label>
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-color); transition: background 0.2s;">
                    <input type="checkbox" id="dialog-lateNotification" ${savedSettings.lateNotification === true ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
                    <span style="font-size: 14px;">迟到通知</span>
                </label>
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-color); transition: background 0.2s;">
                    <input type="checkbox" id="dialog-absentNotification" ${savedSettings.absentNotification === true ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
                    <span style="font-size: 14px;">缺勤通知</span>
                </label>
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-color); transition: background 0.2s;">
                    <input type="checkbox" id="dialog-weeklyReport" ${savedSettings.weeklyReport === true ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
                    <span style="font-size: 14px;">每周考勤报告</span>
                </label>
            </div>
        `;
        
        // 使用新的对话框组件
        this.dialog.show({
            title: '通知设置',
            htmlContent: formHTML,
            showConfirm: true,
            showCancel: true,
            confirmText: '保存',
            cancelText: '取消',
            onConfirm: () => {
                const settings = {
                    attendanceReminder: document.getElementById('dialog-attendanceReminder').checked,
                    lateNotification: document.getElementById('dialog-lateNotification').checked,
                    absentNotification: document.getElementById('dialog-absentNotification').checked,
                    weeklyReport: document.getElementById('dialog-weeklyReport').checked
                };
                
                // 保存设置到本地存储
                localStorage.setItem('notificationSettings', JSON.stringify(settings));
                
                // 显示成功消息
                this.toast.success('通知设置保存成功');
            }
        });
    }
    
    // 导出考勤数据
    async exportAttendanceData() {
        try {
            this.toast.info('正在导出考勤数据...');
            
            // 获取真实的考勤数据
            const attendanceRecords = await this.storage.getAll('attendance');
            
            // 获取项目信息
            const projects = await this.storage.getAll('projects');
            const projectMap = new Map();
            projects.forEach(project => {
                projectMap.set(project.id, project.name);
            });
            
            // 格式化考勤数据
            const formattedData = attendanceRecords.map(record => {
                // 计算工作时长
                let hours = 0;
                if (record.checkIn && record.checkOut) {
                    const checkInTime = new Date(`1970-01-01T${record.checkIn}`);
                    const checkOutTime = new Date(`1970-01-01T${record.checkOut}`);
                    hours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
                }
                
                // 转换状态为中文
                const statusMap = {
                    'present': '全勤',
                    'half': '半天',
                    'absent': '缺勤',
                    'leave': '请假',
                    'rest': '休息',
                    'holiday': '放假'
                };
                
                return {
                    date: record.date,
                    project: projectMap.get(record.projectId) || '未知项目',
                    status: statusMap[record.status] || record.status,
                    checkIn: record.checkIn || '未打卡',
                    checkOut: record.checkOut || '未打卡',
                    hours: hours || '0.00',
                    remark: record.remark || '无'
                };
            });
            
            // 转换为CSV格式
            const csvContent = "日期,项目,状态,上班时间,下班时间,工作时长,备注\n" +
                formattedData.map(row => `${row.date},${row.project},${row.status},${row.checkIn},${row.checkOut},${row.hours},${row.remark}`).join('\n');
            
            // 添加BOM以解决Excel中文乱码问题
            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csvContent;
            
            // 创建下载链接
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.toast.success('考勤数据导出成功');
        } catch (error) {
            this.logger.error('导出考勤数据失败:', error);
            this.toast.error('导出考勤数据失败');
        }
    }
    
    // 查看历史记录
    async viewHistoryRecords() {
        try {
            // 获取真实的考勤数据
            const attendanceRecords = await this.storage.getAll('attendance');
            
            // 获取项目信息
            const projects = await this.storage.getAll('projects');
            const projectMap = new Map();
            projects.forEach(project => {
                projectMap.set(project.id, project.name);
            });
            
            // 按日期排序，最新的在前
            attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 转换状态为中文
            const statusMap = {
                'present': '全勤',
                'half': '半天',
                'absent': '缺勤',
                'leave': '请假',
                'rest': '休息',
                'holiday': '放假'
            };
            
            // 生成历史记录HTML
            let historyItemsHTML = '';
            if (attendanceRecords.length === 0) {
                historyItemsHTML = `
                    <div class="history-item">
                        <div class="history-empty" colspan="3">暂无考勤记录</div>
                    </div>
                `;
            } else {
                historyItemsHTML = attendanceRecords.map(record => {
                    const statusText = statusMap[record.status] || record.status;
                    let statusClass = '';
                    switch (record.status) {
                        case 'present':
                            statusClass = 'normal';
                            break;
                        case 'half':
                            statusClass = 'late';
                            break;
                        case 'absent':
                            statusClass = 'absent';
                            break;
                        default:
                            statusClass = '';
                    }
                    
                    const workTime = record.checkIn && record.checkOut 
                        ? `${record.checkIn} - ${record.checkOut}` 
                        : '未打卡';
                    
                    let statusStyle = '';
                    switch (record.status) {
                        case 'present':
                            statusStyle = 'background: #e6f7ff; color: #1890ff;';
                            break;
                        case 'half':
                            statusStyle = 'background: #fff7e6; color: #fa8c16;';
                            break;
                        case 'absent':
                            statusStyle = 'background: #fff1f0; color: #ff4d4f;';
                            break;
                        default:
                            statusStyle = 'background: #f5f5f5; color: #666;';
                    }
                    
                    return `
                        <div class="history-item" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; transition: background 0.2s;">
                            <div style="color: var(--text-color);">${record.date}</div>
                            <div class="history-status ${statusClass}" style="padding: 4px 8px; border-radius: 4px; text-align: center; font-size: 13px; ${statusStyle}">${statusText}</div>
                            <div style="color: var(--text-color);">${workTime}</div>
                        </div>
                    `;
                }).join('');
            }
            
            const historyHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="history-item header" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 12px; border-bottom: 2px solid var(--border-color); font-weight: bold; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="color: var(--text-color);">日期</div>
                        <div style="color: var(--text-color);">状态</div>
                        <div style="color: var(--text-color);">工作时间</div>
                    </div>
                    ${historyItemsHTML}
                </div>
            `;
            
            // 使用新的对话框组件
            this.dialog.show({
                title: '历史考勤记录',
                htmlContent: historyHTML,
                showConfirm: true,
                showCancel: false,
                confirmText: '关闭'
            });
        } catch (error) {
            this.logger.error('查看历史记录失败:', error);
            this.toast.error('加载历史记录失败');
        }
    }
    
    // 备份用户数据
    async backupUserData() {
        try {
            this.toast.info('正在备份数据...');
            
            // 获取真实的用户数据
            const backupData = {
                userInfo: this.userInfo,
                attendance: await this.storage.getAll('attendance'),
                projects: await this.storage.getAll('projects'),
                personalInfo: await this.storage.get('personalInfo', 'current'),
                settings: {
                    theme: this.theme.getTheme(),
                    notificationSettings: JSON.parse(localStorage.getItem('notificationSettings') || '{}'),
                    userPreferences: JSON.parse(localStorage.getItem('userPreferences') || '{}')
                },
                systemInfo: {
                    version: '2.1',
                    backupDate: new Date().toISOString(),
                    userId: localStorage.getItem('user_id') || 'guest'
                }
            };
            
            // 转换为JSON格式
            const jsonContent = JSON.stringify(backupData, null, 2);
            
            // 创建下载链接
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `user_backup_${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.toast.success('数据备份成功');
        } catch (error) {
            this.logger.error('备份数据失败:', error);
            this.toast.error('数据备份失败');
        }
    }
    
    // 导入主题
    importTheme() {
        // 创建文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        // 监听文件选择事件
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const themeData = event.target.result;
                        const result = this.theme.importTheme(themeData);
                        if (result.success) {
                            this.toast.success('主题导入成功');
                            this.render();
                        } else {
                            this.toast.error(`主题导入失败: ${result.error}`);
                        }
                    } catch (error) {
                        this.toast.error('主题导入失败: 无效的主题文件');
                    }
                };
                reader.readAsText(file);
            }
        });
        
        // 触发文件选择对话框
        fileInput.click();
    }
    
    // 导出主题
    exportTheme() {
        const customThemes = this.theme.getCustomThemes();
        if (customThemes.length === 0) {
            this.toast.error('暂无自定义主题可导出');
            return;
        }
        
        // 创建主题选择对话框
        const dialogHTML = `
            <div class="theme-export-dialog">
                <h3>选择要导出的主题</h3>
                <div class="theme-selector">
                    ${customThemes.map(theme => `
                        <div class="theme-option">
                            <input type="radio" id="theme-${theme.id}" name="theme" value="${theme.id}">
                            <label for="theme-${theme.id}">${theme.name}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" id="cancelExportBtn">取消</button>
                    <button class="btn btn-primary" id="confirmExportBtn">导出</button>
                </div>
            </div>
        `;
        
        // 创建对话框
        const dialogElement = document.createElement('div');
        dialogElement.className = 'edit-form';
        dialogElement.innerHTML = dialogHTML;
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 添加到页面
        document.body.appendChild(overlay);
        overlay.appendChild(dialogElement);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .theme-export-dialog {
                background: var(--bg-light);
                padding: var(--spacing-lg);
                border-radius: var(--border-radius-md);
                width: 400px;
                max-width: 90%;
                box-shadow: var(--shadow-lg);
            }
            
            .theme-export-dialog h3 {
                margin-top: 0;
                margin-bottom: var(--spacing-md);
                color: var(--text-color);
            }
            
            .theme-selector {
                margin-bottom: var(--spacing-lg);
            }
            
            .theme-option {
                margin-bottom: var(--spacing-sm);
            }
            
            .theme-option label {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                padding: var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                transition: all var(--transition-fast);
                color: var(--text-color);
            }
            
            .theme-option label:hover {
                background: var(--bg-dark);
            }
            
            .dialog-actions {
                display: flex;
                gap: var(--spacing-md);
                justify-content: flex-end;
            }
            
            .btn {
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }
            
            .btn-primary {
                background: var(--primary-color);
                color: white;
            }
            
            .btn-secondary {
                background: var(--bg-dark);
                color: var(--text-color);
            }
        `;
        document.head.appendChild(style);
        
        // 绑定事件
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            overlay.remove();
            style.remove();
        });
        
        document.getElementById('confirmExportBtn').addEventListener('click', () => {
            const selectedThemeId = document.querySelector('input[name="theme"]:checked')?.value;
            if (selectedThemeId) {
                const result = this.theme.exportTheme(selectedThemeId);
                if (result.success) {
                    // 创建下载链接
                    const blob = new Blob([result.themeData], { type: 'application/json;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `theme_${selectedThemeId}_${new Date().toISOString().split('T')[0]}.json`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.toast.success('主题导出成功');
                } else {
                    this.toast.error(`主题导出失败: ${result.error}`);
                }
            } else {
                this.toast.error('请选择要导出的主题');
            }
            overlay.remove();
            style.remove();
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
            }
        });
    }
    
    // 删除主题
    deleteTheme() {
        const customThemes = this.theme.getCustomThemes();
        if (customThemes.length === 0) {
            this.toast.error('暂无自定义主题可删除');
            return;
        }
        
        // 创建主题选择对话框
        const dialogHTML = `
            <div class="theme-delete-dialog">
                <h3>选择要删除的主题</h3>
                <div class="theme-selector">
                    ${customThemes.map(theme => `
                        <div class="theme-option">
                            <input type="radio" id="theme-${theme.id}" name="theme" value="${theme.id}">
                            <label for="theme-${theme.id}">${theme.name}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" id="cancelDeleteBtn">取消</button>
                    <button class="btn btn-danger" id="confirmDeleteBtn">删除</button>
                </div>
            </div>
        `;
        
        // 创建对话框
        const dialogElement = document.createElement('div');
        dialogElement.className = 'edit-form';
        dialogElement.innerHTML = dialogHTML;
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 添加到页面
        document.body.appendChild(overlay);
        overlay.appendChild(dialogElement);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .theme-delete-dialog {
                background: var(--bg-light);
                padding: var(--spacing-lg);
                border-radius: var(--border-radius-md);
                width: 400px;
                max-width: 90%;
                box-shadow: var(--shadow-lg);
            }
            
            .theme-delete-dialog h3 {
                margin-top: 0;
                margin-bottom: var(--spacing-md);
                color: var(--text-color);
            }
            
            .theme-selector {
                margin-bottom: var(--spacing-lg);
            }
            
            .theme-option {
                margin-bottom: var(--spacing-sm);
            }
            
            .theme-option label {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                padding: var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                transition: all var(--transition-fast);
                color: var(--text-color);
            }
            
            .theme-option label:hover {
                background: var(--bg-dark);
            }
            
            .dialog-actions {
                display: flex;
                gap: var(--spacing-md);
                justify-content: flex-end;
            }
            
            .btn {
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }
            
            .btn-danger {
                background: var(--error-color);
                color: white;
            }
            
            .btn-secondary {
                background: var(--bg-dark);
                color: var(--text-color);
            }
        `;
        document.head.appendChild(style);
        
        // 绑定事件
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            overlay.remove();
            style.remove();
        });
        
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            const selectedThemeId = document.querySelector('input[name="theme"]:checked')?.value;
            if (selectedThemeId) {
                const result = this.theme.deleteTheme(selectedThemeId);
                if (result.success) {
                    this.toast.success('主题删除成功');
                    this.render();
                } else {
                    this.toast.error(`主题删除失败: ${result.error}`);
                }
            } else {
                this.toast.error('请选择要删除的主题');
            }
            overlay.remove();
            style.remove();
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
            }
        });
    }
    
    // 显示帮助文档
    showHelpDocs() {
        const helpContent = `
            <div class="help-content">
                <div class="help-section">
                    <h4>考勤打卡</h4>
                    <p>1. 进入考勤站页面</p>
                    <p>2. 点击"上班打卡"或"下班打卡"按钮</p>
                    <p>3. 系统会自动记录打卡时间</p>
                    <p>4. 支持多种打卡状态：正常、迟到、早退、请假、旷工</p>
                </div>
                <div class="help-section">
                    <h4>个人信息管理</h4>
                    <p>1. 点击顶部的用户图标进入个人中心</p>
                    <p>2. 在个人信息卡片中点击编辑按钮修改信息</p>
                    <p>3. 个人中心仅允许编辑：邮箱、电话、身份证号</p>
                    <p>4. 其他信息（姓名、工种、工资等）请在主页编辑</p>
                </div>
                <div class="help-section">
                    <h4>工资计算</h4>
                    <p>1. 进入主页，点击"编辑信息"按钮</p>
                    <p>2. 选择就业类型：点工（按日计算）或全职（按月计算）</p>
                    <p>3. 选择日工资计算方式：</p>
                    <p>   - 按自然日（30天）</p>
                    <p>   - 按自然日当月天数（根据当月实际天数）</p>
                    <p>   - 按法定工作日（21.75天）</p>
                    <p>   - 按标准工作日（26天）</p>
                    <p>4. 设置加班工资倍率（0表示无加班费）</p>
                </div>
                <div class="help-section">
                    <h4>休息制度</h4>
                    <p>1. 进入主页，点击"编辑信息"按钮</p>
                    <p>2. 选择休息制度：</p>
                    <p>   - 双休：每周休息2天</p>
                    <p>   - 单休：每周休息1天</p>
                    <p>   - 自由休：灵活安排休息时间</p>
                </div>
                <div class="help-section">
                    <h4>数据管理</h4>
                    <p>1. 导出考勤数据：在个人中心数据管理卡片中点击"导出考勤数据"按钮</p>
                    <p>2. 查看历史记录：在个人中心数据管理卡片中点击"查看历史记录"按钮</p>
                    <p>3. 备份个人数据：在个人中心数据管理卡片中点击"备份个人数据"按钮</p>
                </div>
                <div class="help-section">
                    <h4>主题管理</h4>
                    <p>1. 进入个人中心，在主题管理卡片中选择主题</p>
                    <p>2. 支持浅色主题和深色主题</p>
                    <p>3. 可以导入和导出自定义主题</p>
                </div>
                <div class="help-section">
                    <h4>通知设置</h4>
                    <p>1. 进入个人中心，在个人设置卡片中点击"通知偏好"按钮</p>
                    <p>2. 可以设置：考勤提醒、迟到通知、缺勤通知、每周考勤报告</p>
                </div>
                <div class="help-section">
                    <h4>常见问题</h4>
                    <p><strong>Q: 忘记密码怎么办？</strong></p>
                    <p>A: 请联系管理员重置密码</p>
                    <p><strong>Q: 打卡失败怎么办？</strong></p>
                    <p>A: 请检查网络连接，或联系管理员处理</p>
                    <p><strong>Q: 工资计算不准确怎么办？</strong></p>
                    <p>A: 请检查工资设置和计算方式是否正确</p>
                    <p><strong>Q: 如何切换项目？</strong></p>
                    <p>A: 在主页顶部的项目选择器中选择不同项目</p>
                </div>
                <div class="help-section">
                    <h4>联系我们</h4>
                    <p>管理员联系方式：任工 18079559626</p>
                    <p>如有任何问题或建议，请随时联系我们</p>
                </div>
            </div>
        `;
        
        // 先添加帮助文档样式
        let style = document.getElementById('help-docs-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'help-docs-styles';
            style.textContent = `
                .help-content {
                    max-height: 60vh;
                    overflow-y: auto;
                }
                
                .help-section {
                    margin-bottom: var(--spacing-lg);
                }
                
                .help-section h4 {
                    margin-top: 0;
                    margin-bottom: var(--spacing-sm);
                    color: var(--text-color);
                    font-size: var(--font-size-md);
                }
                
                .help-section p {
                    margin: var(--spacing-xs) 0;
                    color: var(--text-color);
                    font-size: var(--font-size-sm);
                }
                
                .help-section p strong {
                    color: var(--text-color);
                }
            `;
            document.head.appendChild(style);
        }
        
        // 使用统一的对话框组件
        this.dialog.show({
            title: '帮助文档',
            htmlContent: helpContent,
            showConfirm: true,
            showCancel: false,
            confirmText: '关闭',
            onConfirm: () => {
                // 关闭对话框时移除样式
                const style = document.getElementById('help-docs-styles');
                if (style) {
                    style.remove();
                }
            }
        });
        

    }
    
    // 显示反馈与建议表单
    showFeedbackForm() {
        const formHTML = `
            <div class="edit-form">
                <h3>反馈与建议</h3>
                <div class="form-group">
                    <label for="feedbackType">反馈类型</label>
                    <select id="feedbackType" class="form-input">
                        <option value="suggestion">功能建议</option>
                        <option value="bug">bug报告</option>
                        <option value="question">使用问题</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="feedbackContent">反馈内容</label>
                    <textarea id="feedbackContent" class="form-input" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label for="feedbackContact">联系方式（可选）</label>
                    <input type="text" id="feedbackContact" class="form-input" placeholder="邮箱或电话">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="viewFeedbackHistoryBtn">查看历史反馈</button>
                    <button type="button" class="btn btn-secondary" id="cancelFeedbackBtn">取消</button>
                    <button type="button" class="btn btn-primary" id="submitFeedbackBtn">提交</button>
                </div>
            </div>
        `;
        
        // 创建对话框
        const dialogElement = document.createElement('div');
        dialogElement.className = 'dialog dialog-show';
        dialogElement.innerHTML = formHTML;
        dialogElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-light);
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            padding: var(--spacing-lg);
            z-index: 1000;
            min-width: 320px;
            max-width: 500px;
            width: 90%;
        `;
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        
        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(dialogElement);
        
        // 添加表单样式
        const style = document.createElement('style');
        style.textContent = `
            .edit-form h3 {
                margin-top: 0;
                margin-bottom: var(--spacing-md);
                color: var(--text-color);
            }
            
            .form-group {
                margin-bottom: var(--spacing-md);
            }
            
            .form-group label {
                display: block;
                margin-bottom: var(--spacing-xs);
                color: var(--text-light);
                font-size: var(--font-size-sm);
            }
            
            .form-input {
                width: 100%;
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-md);
                background: var(--bg-dark);
                color: var(--text-color);
                box-sizing: border-box;
            }
            
            .form-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
            }
            
            .form-actions {
                display: flex;
                gap: var(--spacing-md);
                justify-content: flex-end;
                margin-top: var(--spacing-lg);
                flex-wrap: wrap;
            }
            
            .feedback-history {
                margin-top: var(--spacing-md);
                max-height: 300px;
                overflow-y: auto;
            }
            
            .feedback-item {
                padding: var(--spacing-sm);
                border-bottom: 1px solid var(--border-color);
                margin-bottom: var(--spacing-sm);
            }
            
            .feedback-item:last-child {
                border-bottom: none;
            }
            
            .feedback-item .feedback-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: var(--spacing-xs);
            }
            
            .feedback-item .feedback-type {
                font-size: var(--font-size-sm);
                color: var(--text-light);
            }
            
            .feedback-item .feedback-date {
                font-size: var(--font-size-xs);
                color: var(--text-light);
            }
            
            .feedback-item .feedback-content {
                font-size: var(--font-size-md);
                color: var(--text-color);
                margin-bottom: var(--spacing-sm);
            }
            
            .feedback-item .feedback-reply {
                font-size: var(--font-size-md);
                color: var(--primary-color);
                margin-top: var(--spacing-sm);
                padding-top: var(--spacing-sm);
                border-top: 1px dashed var(--border-color);
            }
            
            .feedback-item .feedback-reply-label {
                font-size: var(--font-size-sm);
                color: var(--text-light);
                margin-bottom: var(--spacing-xs);
            }
            
            .unread-badge {
                background: var(--error-color);
                color: white;
                font-size: var(--font-size-xs);
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: bold;
            }

        `;
        document.head.appendChild(style);
        
        // 绑定事件
        document.getElementById('cancelFeedbackBtn').addEventListener('click', () => {
            document.body.removeChild(dialogElement);
            document.body.removeChild(overlay);
            document.head.removeChild(style);
        });
        
        document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
            const type = document.getElementById('feedbackType').value;
            const content = document.getElementById('feedbackContent').value;
            const contact = document.getElementById('feedbackContact').value;
            const userId = localStorage.getItem('user_id');
            
            if (!content) {
                this.toast.error('请填写反馈内容');
                return;
            }
            
            if (!userId) {
                this.toast.error('用户未登录');
                return;
            }
            
            // 显示提交中状态
            this.toast.info('正在提交反馈...');
            
            try {
                // 发送反馈到后端
                const response = await fetch('/jg/api/submit-feedback.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        type: type,
                        content: content,
                        contact: contact
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.toast.success('反馈提交成功，感谢您的建议！');
                    // 关闭对话框
                    document.body.removeChild(dialogElement);
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                } else {
                    this.toast.error(result.error || '提交失败，请重试');
                }
            } catch (error) {
                this.logger.error('提交反馈失败:', error);
                this.toast.error('网络错误，请稍后重试');
            }
        });
        
        // 查看历史反馈
        document.getElementById('viewFeedbackHistoryBtn').addEventListener('click', async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                this.toast.error('用户未登录');
                return;
            }
            
            try {
                const response = await fetch(`/jg/api/get-feedback.php?user_id=${userId}`);
                const result = await response.json();
                
                if (result.feedback) {
                    const feedbackHistoryHTML = `
                        <div class="feedback-history">
                            ${result.feedback.length > 0 ? result.feedback.map(feedback => `
                                <div class="feedback-item" data-feedback-id="${feedback.id}">
                                    <div class="feedback-header">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span class="feedback-type">${feedback.type === 'suggestion' ? '功能建议' : feedback.type === 'bug' ? 'Bug报告' : feedback.type === 'question' ? '使用问题' : '其他'}</span>
                                            ${feedback.reply && feedback.is_notified === 0 ? `
                                                <span class="unread-badge">未读</span>
                                            ` : ''}
                                        </div>
                                        <span class="feedback-date">${feedback.created_at}</span>
                                    </div>
                                    <div class="feedback-content">${feedback.content}</div>
                                    ${feedback.reply ? `
                                        <div class="feedback-reply">
                                            <div class="feedback-reply-label">管理员回复 (${feedback.reply_at || feedback.updated_at})</div>
                                            <div>${feedback.reply}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') : '<p style="text-align: center; color: var(--text-light);">暂无反馈记录</p>'}
                        </div>
                    `;
                    
                    // 更新表单内容
                    dialogElement.innerHTML = `
                        <div class="edit-form">
                            <h3>反馈历史</h3>
                            ${feedbackHistoryHTML}
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="backToFeedbackBtn">返回</button>
                            </div>
                        </div>
                    `;
                    
                    // 标记未读反馈为已读
                    result.feedback.forEach(feedback => {
                        if (feedback.reply && feedback.is_notified === 0) {
                            this.markFeedbackAsRead(feedback.id);
                        }
                    });
                    
                    // 绑定返回按钮事件
                    document.getElementById('backToFeedbackBtn').addEventListener('click', () => {
                        // 重新显示反馈表单
                        dialogElement.innerHTML = formHTML;
                        // 重新绑定事件
                        this.bindFeedbackFormEvents(dialogElement, overlay, style, formHTML);
                    });
                } else {
                    this.toast.error('加载反馈历史失败');
                }
            } catch (error) {
                this.logger.error('加载反馈历史失败:', error);
                this.toast.error('网络错误，请稍后重试');
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
            document.body.removeChild(overlay);
            document.head.removeChild(style);
        });
    }
    
    // 绑定反馈表单事件
    bindFeedbackFormEvents(dialogElement, overlay, style, formHTML) {
        document.getElementById('cancelFeedbackBtn').addEventListener('click', () => {
            document.body.removeChild(dialogElement);
            document.body.removeChild(overlay);
            document.head.removeChild(style);
        });
        
        document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
            const type = document.getElementById('feedbackType').value;
            const content = document.getElementById('feedbackContent').value;
            const contact = document.getElementById('feedbackContact').value;
            const userId = localStorage.getItem('user_id');
            
            if (!content) {
                this.toast.error('请填写反馈内容');
                return;
            }
            
            if (!userId) {
                this.toast.error('用户未登录');
                return;
            }
            
            // 显示提交中状态
            this.toast.info('正在提交反馈...');
            
            try {
                // 发送反馈到后端
                const response = await fetch('/jg/api/submit-feedback.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        type: type,
                        content: content,
                        contact: contact
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.toast.success('反馈提交成功，感谢您的建议！');
                    // 关闭对话框
                    document.body.removeChild(dialogElement);
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                } else {
                    this.toast.error(result.error || '提交失败，请重试');
                }
            } catch (error) {
                this.logger.error('提交反馈失败:', error);
                this.toast.error('网络错误，请稍后重试');
            }
        });
        
        // 查看历史反馈
        document.getElementById('viewFeedbackHistoryBtn').addEventListener('click', async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                this.toast.error('用户未登录');
                return;
            }
            
            try {
                const response = await fetch(`/jg/api/get-feedback.php?user_id=${userId}`);
                const result = await response.json();
                
                if (result.feedback) {
                    const feedbackHistoryHTML = `
                        <div class="feedback-history">
                            ${result.feedback.length > 0 ? result.feedback.map(feedback => `
                                <div class="feedback-item" data-feedback-id="${feedback.id}">
                                    <div class="feedback-header">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span class="feedback-type">${feedback.type === 'suggestion' ? '功能建议' : feedback.type === 'bug' ? 'Bug报告' : feedback.type === 'question' ? '使用问题' : '其他'}</span>
                                            ${feedback.reply && feedback.is_notified === 0 ? `
                                                <span class="unread-badge">未读</span>
                                            ` : ''}
                                        </div>
                                        <span class="feedback-date">${feedback.created_at}</span>
                                    </div>
                                    <div class="feedback-content">${feedback.content}</div>
                                    ${feedback.reply ? `
                                        <div class="feedback-reply">
                                            <div class="feedback-reply-label">管理员回复 (${feedback.reply_at || feedback.updated_at})</div>
                                            <div>${feedback.reply}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') : '<p style="text-align: center; color: var(--text-light);">暂无反馈记录</p>'}
                        </div>
                    `;
                    
                    // 更新表单内容
                    dialogElement.innerHTML = `
                        <div class="edit-form">
                            <h3>反馈历史</h3>
                            ${feedbackHistoryHTML}
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="backToFeedbackBtn">返回</button>
                            </div>
                        </div>
                    `;
                    
                    // 标记未读反馈为已读
                    result.feedback.forEach(feedback => {
                        if (feedback.reply && feedback.is_notified === 0) {
                            this.markFeedbackAsRead(feedback.id);
                        }
                    });
                    
                    // 绑定返回按钮事件
                    document.getElementById('backToFeedbackBtn').addEventListener('click', () => {
                        // 重新显示反馈表单
                        dialogElement.innerHTML = formHTML;
                        // 重新绑定事件
                        this.bindFeedbackFormEvents(dialogElement, overlay, style, formHTML);
                    });
                } else {
                    this.toast.error('加载反馈历史失败');
                }
            } catch (error) {
                this.logger.error('加载反馈历史失败:', error);
                this.toast.error('网络错误，请稍后重试');
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
            document.body.removeChild(overlay);
            document.head.removeChild(style);
        });
    }
}

// 导出UserCenterPage类
window.UserCenterPage = UserCenterPage;