class HolidayManagementPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        this.formDialog = new FormDialog(options.dialog);
        
        this.holidays = [];
        this.systemUserId = '__system_holidays__';
        this.currentCategory = 'all';
    }
    
    async init() {
        if (window.holidayManagementInitialized) {
            this.logger.info('Holiday management page already initialized');
            return;
        }
        
        this.logger.info('Initializing holiday management page...');
        
        try {
            if (window.VersionChecker) {
                const versionChecker = new VersionChecker({
                    storage: this.storage,
                    toast: this.toast,
                    logger: this.logger
                });
                await versionChecker.check();
            }
            
            this.render();
            this.bindEvents();
            await this.loadHolidays();
            this.renderHolidays();
            
            window.holidayManagementInitialized = true;
            this.logger.info('Holiday management page initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize holiday management page:', error);
            this.toast.error('页面初始化失败');
        }
    }
    
    async loadHolidays() {
        try {
            const userId = localStorage.getItem('user_id');
            const currentProjectId = localStorage.getItem('currentProjectId');
            const url = new URL('/jg/api/get-holidays.php', window.location.origin);
            if (userId) {
                url.searchParams.set('user_id', userId);
            }
            if (currentProjectId) {
                url.searchParams.set('project_id', currentProjectId);
            }
            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (data.success) {
                this.holidays = data.holidays || [];
                this.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
                this.logger.info('Holidays loaded from server:', this.holidays.length);
            } else {
                this.holidays = [];
            }
        } catch (error) {
            this.logger.error('Failed to load holidays:', error);
            this.holidays = [];
        }
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = this.getTemplate();
    }
    
    getTemplate() {
        return `
            <main class="app-main">
                <div class="container">
                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title">节日管理</h2>
                            <div class="section-actions">
                                <button class="btn btn-primary" data-action="add-holiday">
                                    <i class="fas fa-plus"></i>
                                    新建节日
                                </button>
                            </div>
                        </div>
                        <div class="tabs" style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color);">
                            <button class="tab-btn" data-category="all" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">全部</button>
                            <button class="tab-btn" data-category="statutory" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">法定节日</button>
                            <button class="tab-btn" data-category="traditional" style="padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;">中国传统</button>
                        </div>
                        <div id="holidayList" class="grid grid-auto-fit gap-4"></div>
                    </div>
                </div>
            </main>
        `;
    }
    
    renderHolidays() {
        const container = document.getElementById('holidayList');
        if (!container) return;
        
        // 调试：输出节日数据
        console.log('节日数据:', this.holidays);
        console.log('当前分类:', this.currentCategory);
        
        // 处理节日数据：系统节日如果没有分类，默认设为 statutory
        this.holidays = this.holidays.map(h => {
            const isSystem = h.isSystem === true || (h.id && h.id.startsWith('sys_holiday_'));
            if (isSystem && !h.category) {
                return { ...h, category: 'statutory' };
            }
            return h;
        });
        
        let filteredHolidays = this.holidays;
        if (this.currentCategory !== 'all') {
            filteredHolidays = this.holidays.filter(h => h.category === this.currentCategory);
        }
        
        // 调试：输出过滤后的数据
        console.log('过滤后数据:', filteredHolidays);
        
        this.updateTabStyles();
        
        if (filteredHolidays.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt empty-icon"></i>
                    <h3>暂无节日</h3>
                    <p>点击"新建节日"按钮添加节日</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredHolidays.map(holiday => this.getHolidayCard(holiday)).join('');
    }
    
    updateTabStyles() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const category = btn.dataset.category;
            if (category === this.currentCategory) {
                btn.style.color = 'var(--primary-color)';
                btn.style.borderBottomColor = 'var(--primary-color)';
                btn.style.fontWeight = '500';
            } else {
                btn.style.color = 'var(--text-secondary)';
                btn.style.borderBottomColor = 'transparent';
                btn.style.fontWeight = 'normal';
            }
        });
    }
    
    getHolidayCard(holiday) {
        const date = new Date(holiday.date);
        const formattedDate = Utils.formatDate(date, 'YYYY年MM月DD日');
        // 系统节日判断：API返回的isSystem字段，或ID以sys_holiday_开头，或分类为statutory（法定节日）
        const isSystem = holiday.isSystem === true || (holiday.id && holiday.id.startsWith('sys_holiday_'));
        const isStatutory = holiday.category === 'statutory';
        const canDelete = !isSystem && !isStatutory;
        const userId = localStorage.getItem('user_id');
        const hasAdminUsername = localStorage.getItem('admin_username') !== null;
        const hasAdminCookie = document.cookie.includes('admin_id=');
        
        let isAdmin = false;
        if (userId) {
            isAdmin = false;
        } else {
            isAdmin = hasAdminUsername || hasAdminCookie;
        }
        
        let showButtons = false;
        if (isAdmin) {
            showButtons = true;
        } else if (canDelete) {
            showButtons = true;
        }
        
        return `
            <div class="card">
                <div class="card-content">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="card-title">${holiday.name}</h3>
                            <p class="card-text">
                                <i class="fas fa-calendar-alt mr-2" style="color: var(--primary-color);"></i>
                                ${formattedDate}
                            </p>
                            ${holiday.category ? `
                                <p class="card-text text-secondary">
                                    <i class="fas fa-tag mr-2" style="color: var(--info-color);"></i>
                                    分类: ${this.getCategoryLabel(holiday.category)}
                                </p>
                            ` : ''}
                            ${holiday.description ? `
                                <p class="card-text text-secondary">
                                    <i class="fas fa-info-circle mr-2" style="color: var(--info-color);"></i>
                                    ${holiday.description}
                                </p>
                            ` : ''}
                        </div>
                        ${showButtons ? `
                            <div class="flex gap-2">
                                ${canDelete ? `
                                    <button class="btn btn-sm" style="background-color: var(--primary-color); color: white;" data-action="edit-holiday" data-holiday-id="${holiday.id}" title="编辑">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                ` : ''}
                                ${canDelete ? `
                                    <button class="btn btn-sm" style="background-color: var(--error-color); color: white;" data-action="delete-holiday" data-holiday-id="${holiday.id}" title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    getCategoryLabel(category) {
        const labels = {
            'statutory': '法定节日',
            'traditional': '中国传统'
        };
        return labels[category] || '法定节日';
    }
    
    bindEvents() {
        document.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                const action = actionEl.dataset.action;
                
                switch (action) {
                    case 'toggle-menu':
                        this.toggleMobileMenu();
                        break;
                    case 'close-menu':
                        this.closeMobileMenu();
                        break;
                    case 'add-holiday':
                        this.handleAddHoliday();
                        break;
                    case 'edit-holiday':
                        const holidayId = actionEl.dataset.holidayId;
                        this.handleEditHoliday(holidayId);
                        break;
                    case 'delete-holiday':
                        const deleteHolidayId = actionEl.dataset.holidayId;
                        this.handleDeleteHoliday(deleteHolidayId);
                        break;
                }
            }
            
            const categoryBtn = e.target.closest('[data-category]');
            if (categoryBtn) {
                const category = categoryBtn.dataset.category;
                this.currentCategory = category;
                this.renderHolidays();
            }
        });
    }
    
    async handleAddHoliday() {
        try {
            this.formDialog.show({
                type: 'info',
                title: '新建节日',
                confirmText: '保存',
                cancelText: '取消',
                fields: [
                    {
                        type: 'text',
                        name: 'name',
                        label: '节日名称',
                        placeholder: '请输入节日名称',
                        required: true
                    },
                    {
                        type: 'date',
                        name: 'date',
                        label: '节日日期',
                        placeholder: '请选择节日日期',
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'category',
                        label: '节日分类',
                        options: [
                            { value: 'statutory', label: '法定节日' },
                            { value: 'traditional', label: '中国传统节日' }
                        ],
                        defaultValue: 'statutory',
                        required: true
                    },
                    {
                        type: 'textarea',
                        name: 'description',
                        label: '节日描述',
                        placeholder: '请输入节日描述（可选）',
                        required: false
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        const userId = localStorage.getItem('user_id');
                        const response = await fetch('/jg/api/create-holiday.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                    name: data.name,
                                    date: data.date,
                                    category: data.category || 'statutory',
                                    description: data.description || '',
                                    user_id: userId
                                })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            await this.loadHolidays();
                            this.renderHolidays();
                            this.toast.success('节日创建成功');
                        } else {
                            this.toast.error(result.error || '节日创建失败');
                        }
                    } catch (error) {
                        this.logger.error('Failed to add holiday:', error);
                        this.toast.error('节日创建失败，请重试');
                    }
                }
            });
        } catch (error) {
            this.logger.error('Failed to show add holiday dialog:', error);
            this.toast.error('操作失败，请重试');
        }
    }
    
    async handleEditHoliday(holidayId) {
        try {
            const holiday = this.holidays.find(h => h.id === holidayId);
            if (!holiday) {
                this.toast.error('节日不存在');
                return;
            }
            
            const userId = localStorage.getItem('user_id');
            const hasAdminUsername = localStorage.getItem('admin_username') !== null;
            const hasAdminCookie = document.cookie.includes('admin_id=');
            
            let isAdmin = false;
            if (userId) {
                isAdmin = false;
            } else {
                isAdmin = hasAdminUsername || hasAdminCookie;
            }
            
            const isSystem = holiday.isSystem === true || (holiday.id && holiday.id.startsWith('sys_holiday_'));
            const isStatutory = holiday.category === 'statutory';
            if (!isAdmin && (isSystem || isStatutory)) {
                this.toast.error('法定节日不能编辑');
                return;
            }
            
            this.formDialog.show({
                type: 'info',
                title: '编辑节日',
                confirmText: '保存',
                cancelText: '取消',
                fields: [
                    {
                        type: 'text',
                        name: 'name',
                        label: '节日名称',
                        value: holiday.name,
                        placeholder: '请输入节日名称',
                        required: true
                    },
                    {
                        type: 'date',
                        name: 'date',
                        label: '节日日期',
                        value: holiday.date,
                        placeholder: '请选择节日日期',
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'category',
                        label: '节日分类',
                        options: [
                            { value: 'statutory', label: '法定节日' },
                            { value: 'traditional', label: '中国传统节日' }
                        ],
                        value: holiday.category || 'statutory',
                        required: true
                    },
                    {
                        type: 'textarea',
                        name: 'description',
                        label: '节日描述',
                        value: holiday.description || '',
                        placeholder: '请输入节日描述（可选）',
                        required: false
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        const userId = localStorage.getItem('user_id');
                        const response = await fetch('/jg/api/update-holiday.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                    id: holidayId,
                                    name: data.name,
                                    date: data.date,
                                    category: data.category || 'statutory',
                                    description: data.description || '',
                                    user_id: userId
                                })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            await this.loadHolidays();
                            this.renderHolidays();
                            this.toast.success('节日更新成功');
                        } else {
                            this.toast.error(result.error || '节日更新失败');
                        }
                    } catch (error) {
                        this.logger.error('Failed to update holiday:', error);
                        this.toast.error('节日更新失败，请重试');
                    }
                }
            });
        } catch (error) {
            this.logger.error('Failed to show edit holiday dialog:', error);
            this.toast.error('操作失败，请重试');
        }
    }
    
    async handleDeleteHoliday(holidayId) {
        try {
            const holiday = this.holidays.find(h => h.id === holidayId);
            const userId = localStorage.getItem('user_id');
            const hasAdminUsername = localStorage.getItem('admin_username') !== null;
            const hasAdminCookie = document.cookie.includes('admin_id=');
            
            let isAdmin = false;
            if (userId) {
                isAdmin = false;
            } else {
                isAdmin = hasAdminUsername || hasAdminCookie;
            }
            
            const isSystem = holiday && (holiday.isSystem === true || (holiday.id && holiday.id.startsWith('sys_holiday_')));
            const isStatutory = holiday && holiday.category === 'statutory';
            if (!isAdmin && (isSystem || isStatutory)) {
                this.toast.error('法定节日不能删除');
                return;
            }
            
            if (confirm('确定要删除这个节日吗？')) {
                const response = await fetch('/jg/api/delete-holiday.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: holidayId, user_id: userId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    await this.loadHolidays();
                    this.renderHolidays();
                    this.toast.success('节日删除成功');
                } else {
                    this.toast.error(result.error || '节日删除失败');
                }
            }
        } catch (error) {
            this.logger.error('Failed to delete holiday:', error);
            this.toast.error('节日删除失败，请重试');
        }
    }

    toggleMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    closeMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        if (menu) {
            menu.classList.remove('show');
        }
    }
}

window.HolidayManagementPage = HolidayManagementPage;
