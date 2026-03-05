class PhoneBookPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        this.cloudSync = options.cloudSync;
        this.formDialog = null;
        
        this.contacts = [];
        this.projects = [];
        this.currentProjectId = null;
    }
    
    // 懒加载FormDialog
    async getFormDialog() {
        if (!this.formDialog) {
            try {
                // 检查FormDialog是否已加载
                if (!window.FormDialog) {
                    // 尝试动态加载FormDialog
                    if (window.lazyLoadScripts && window.lazyLoadScripts.formDialog) {
                        await window.lazyLoadScripts.formDialog();
                    } else {
                        // 降级方案：直接加载脚本
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = `/jg/js-components/form-dialog.js?v=${Date.now()}`;
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }
                }
                
                if (window.FormDialog) {
                    this.formDialog = new FormDialog(this.dialog);
                } else {
                    throw new Error('FormDialog not available');
                }
            } catch (error) {
                this.logger.error('Failed to load FormDialog:', error);
                // 创建一个简单的降级实现
                this.formDialog = {
                    show: (options) => {
                        if (options.onSubmit) {
                            options.onSubmit({});
                        }
                    }
                };
            }
        }
        return this.formDialog;
    }

    async init() {
        // 开始性能监控
        const performanceMarks = {
            start: performance.now()
        };
        
        this.logger.info('Initializing phonebook page...');
        
        try {
            // 1. 立即渲染页面骨架，让用户看到页面结构
            performanceMarks.renderStart = performance.now();
            this.render();
            performanceMarks.renderEnd = performance.now();
            
            // 2. 绑定事件，确保页面交互可用
            performanceMarks.bindEventsStart = performance.now();
            this.bindEvents();
            performanceMarks.bindEventsEnd = performance.now();
            
            // 3. 显示加载状态
            this.showLoadingState();
            
            // 4. 立即获取当前项目ID（同步操作，速度快）
            this.currentProjectId = this.storage.getLocal('currentProjectId');
            
            // 5. 异步加载数据，即使失败也不影响页面显示
            try {
                performanceMarks.loadDataStart = performance.now();
                // 并行加载数据，提高速度
                const [contacts, projects] = await Promise.all([
                    this.loadData(),
                    this.loadProjects()
                ]);
                performanceMarks.loadDataEnd = performance.now();
                
                // 6. 渲染联系人列表
                performanceMarks.renderContactsStart = performance.now();
                this.renderContacts();
                performanceMarks.renderContactsEnd = performance.now();
                
                this.logger.info('Data loaded successfully');
            } catch (dataError) {
                this.logger.error('Failed to load data:', dataError);
                this.toast.info('数据加载失败，显示默认内容');
                // 即使数据加载失败，也继续显示页面
                this.renderContacts();
            }
            
            performanceMarks.end = performance.now();
            
            // 输出性能监控结果
            this.logPerformance(performanceMarks);
            
            this.logger.info('Phonebook page initialized successfully');
            
            // 7. 添加页面卸载事件，清理资源
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });
            
            // 8. 添加项目切换事件监听
            if (this.eventBus) {
                this.eventBus.on('projectChanged', async () => {
                    this.logger.info('Project changed event received, refreshing contacts');
                    // 重新获取当前项目ID
                    this.currentProjectId = this.storage.getLocal('currentProjectId');
                    // 重新加载项目数据
                    await this.loadProjects();
                    // 重新加载联系人数据
                    await this.loadData();
                    // 重新渲染联系人列表
                    this.renderContacts();
                });
            }
            
            // 9. 添加定期数据刷新，确保数据同步
            this.refreshInterval = setInterval(async () => {
                try {
                    // 检查当前项目ID是否变化
                    const newProjectId = this.storage.getLocal('currentProjectId');
                    if (newProjectId !== this.currentProjectId) {
                        this.currentProjectId = newProjectId;
                        await this.loadProjects();
                        await this.loadData();
                        this.renderContacts();
                    }
                } catch (error) {
                    this.logger.error('Error in periodic refresh:', error);
                }
            }, 5000); // 每5秒检查一次
        } catch (error) {
            this.logger.error('Failed to initialize phonebook page:', error);
            this.toast.error('页面初始化失败');
            // 显示错误状态
            this.showErrorState();
        }
    }
    
    // 清理资源
    cleanup() {
        this.logger.info('Cleaning up phonebook page resources...');
        
        // 清空数组，释放内存
        this.contacts = [];
        this.projects = [];
        
        // 清除缓存
        if (this.storage && typeof this.storage.clearCache === 'function') {
            this.storage.clearCache();
        }
        
        // 清除localStorage缓存
        try {
            localStorage.removeItem('cachedContacts');
            localStorage.removeItem('cachedProjects');
        } catch (error) {
            this.logger.error('Failed to clear localStorage cache:', error);
        }
        
        // 清除定时器
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // 解除事件绑定
        document.removeEventListener('click', this.clickHandler);
        
        this.logger.info('Phonebook page resources cleaned up successfully');
    }
    
    // 记录性能监控结果
    logPerformance(marks) {
        const totalTime = marks.end - marks.start;
        const renderTime = marks.renderEnd - marks.renderStart;
        const bindEventsTime = marks.bindEventsEnd - marks.bindEventsStart;
        const loadDataTime = marks.loadDataEnd - marks.loadDataStart;
        const renderContactsTime = marks.renderContactsEnd - marks.renderContactsStart;
        
        this.logger.info('Performance metrics:');
        this.logger.info(`Total initialization time: ${totalTime.toFixed(2)}ms`);
        this.logger.info(`Render time: ${renderTime.toFixed(2)}ms`);
        this.logger.info(`Bind events time: ${bindEventsTime.toFixed(2)}ms`);
        this.logger.info(`Load data time: ${loadDataTime.toFixed(2)}ms`);
        this.logger.info(`Render contacts time: ${renderContactsTime.toFixed(2)}ms`);
        
        // 也可以发送到服务器进行分析
        // 这里只是在控制台输出
    }
    
    // 显示加载状态
    showLoadingState() {
        const container = document.getElementById('contactList');
        if (!container) return;
        container.innerHTML = '<div class="loading-state">加载联系人中...</div>';
    }
    
    // 显示错误状态
    showErrorState() {
        const container = document.getElementById('contactList');
        if (!container) return;
        container.innerHTML = '<div class="error-state">加载失败，请刷新页面重试</div>';
    }

    // 缓存相关配置
    getCacheConfig() {
        return {
            contacts: {
                key: 'cachedContacts',
                expiry: 5 * 60 * 1000, // 5分钟过期
                backupKeys: ['contacts', 'user_contacts']
            },
            projects: {
                key: 'cachedProjects',
                expiry: 10 * 60 * 1000, // 10分钟过期
                backupKeys: ['projects']
            }
        };
    }
    
    // 检查缓存是否有效
    isCacheValid(cacheKey, expiry) {
        try {
            const cacheItem = localStorage.getItem(cacheKey);
            if (!cacheItem) return false;
            
            const parsedItem = JSON.parse(cacheItem);
            const now = Date.now();
            return parsedItem.timestamp && (now - parsedItem.timestamp) < expiry;
        } catch (error) {
            this.logger.error('Cache validation error:', error);
            return false;
        }
    }
    
    // 获取缓存数据
    getCachedData(cacheKey, backupKeys = []) {
        try {
            // 尝试从主缓存获取
            const cacheItem = localStorage.getItem(cacheKey);
            if (cacheItem) {
                const parsedItem = JSON.parse(cacheItem);
                return parsedItem.data;
            }
            
            // 尝试从备份缓存获取
            for (const backupKey of backupKeys) {
                const backupItem = localStorage.getItem(backupKey);
                if (backupItem) {
                    try {
                        return JSON.parse(backupItem);
                    } catch (error) {
                        this.logger.error('Failed to parse backup cache:', backupKey, error);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to get cached data:', error);
        }
        return null;
    }
    
    // 设置缓存数据
    setCachedData(cacheKey, data) {
        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            this.logger.info('Data cached to localStorage:', cacheKey);
        } catch (error) {
            this.logger.error('Failed to set cached data:', error);
        }
    }
    
    // 清除缓存
    clearCache(cacheKey, backupKeys = []) {
        try {
            localStorage.removeItem(cacheKey);
            for (const backupKey of backupKeys) {
                localStorage.removeItem(backupKey);
                sessionStorage.removeItem(backupKey);
            }
            this.logger.info('Cache cleared:', cacheKey);
        } catch (error) {
            this.logger.error('Failed to clear cache:', error);
        }
    }
    
    async loadData() {
        const cacheConfig = this.getCacheConfig().contacts;
        
        try {
            // 先尝试从本地缓存加载数据，提高加载速度
            if (this.isCacheValid(cacheConfig.key, cacheConfig.expiry)) {
                const cachedData = this.getCachedData(cacheConfig.key, cacheConfig.backupKeys);
                if (cachedData) {
                    this.contacts = cachedData;
                    this.logger.info('Contacts loaded from cache:', this.contacts.length, 'items');
                    // 后台异步从服务器更新数据
                    this.updateContactsFromServer();
                    return this.contacts;
                }
            }
            
            // 从服务器加载数据
            this.logger.info('Loading contacts from server...');
            this.contacts = await this.storage.getAll('contacts') || [];
            this.logger.info('Contacts loaded from server:', this.contacts.length, 'items');
            
            // 缓存数据到本地
            this.setCachedData(cacheConfig.key, this.contacts);
            
            // 记录加载的联系人数据，以便调试
            if (this.contacts.length > 0) {
                this.logger.info('Loaded contacts count:', this.contacts.length);
            }
        } catch (error) {
            this.logger.error('Failed to load contacts:', error);
            // 尝试从备份缓存加载
            const cachedData = this.getCachedData(cacheConfig.key, cacheConfig.backupKeys);
            if (cachedData) {
                this.contacts = cachedData;
                this.logger.info('Contacts loaded from backup cache:', this.contacts.length, 'items');
            } else {
                this.contacts = [];
            }
        }
        
        this.logger.info('Contacts loaded successfully');
        return this.contacts;
    }
    
    // 后台异步从服务器更新联系人数据
    async updateContactsFromServer() {
        const cacheConfig = this.getCacheConfig().contacts;
        
        try {
            this.logger.info('Updating contacts from server...');
            const freshContacts = await this.storage.getAll('contacts') || [];
            
            // 比较数据是否有变化
            const hasChanges = freshContacts.length !== this.contacts.length || 
                JSON.stringify(freshContacts) !== JSON.stringify(this.contacts);
            
            if (hasChanges) {
                this.contacts = freshContacts;
                this.logger.info('Contacts updated from server:', this.contacts.length, 'items');
                // 更新缓存
                this.setCachedData(cacheConfig.key, this.contacts);
                // 更新UI
                this.renderContacts();
            } else {
                this.logger.info('Contacts are up to date, no update needed');
            }
        } catch (error) {
            this.logger.error('Failed to update contacts from server:', error);
        }
    }

    async loadProjects() {
        const cacheConfig = this.getCacheConfig().projects;
        
        try {
            // 先尝试从本地缓存加载数据，提高加载速度
            if (this.isCacheValid(cacheConfig.key, cacheConfig.expiry)) {
                const cachedData = this.getCachedData(cacheConfig.key, cacheConfig.backupKeys);
                if (cachedData) {
                    this.projects = cachedData;
                    this.logger.info('Projects loaded from cache:', this.projects.length, 'items');
                    // 后台异步从服务器更新数据
                    this.updateProjectsFromServer();
                    return this.projects;
                }
            }
            
            // 从服务器加载数据
            this.logger.info('Loading projects from server...');
            this.projects = await this.storage.getAll('projects') || [];
            this.logger.info('Projects loaded from server:', this.projects.length, 'items');
            
            // 缓存数据到本地
            this.setCachedData(cacheConfig.key, this.projects);
            
            // 记录加载的项目数据，以便调试
            if (this.projects.length > 0) {
                this.logger.info('Loaded projects count:', this.projects.length);
            }
        } catch (error) {
            this.logger.error('Failed to load projects:', error);
            // 尝试从备份缓存加载
            const cachedData = this.getCachedData(cacheConfig.key, cacheConfig.backupKeys);
            if (cachedData) {
                this.projects = cachedData;
                this.logger.info('Projects loaded from backup cache:', this.projects.length, 'items');
            } else {
                this.projects = [];
            }
        }
        
        this.logger.info('Projects loaded successfully');
        return this.projects;
    }
    
    // 后台异步从服务器更新项目数据
    async updateProjectsFromServer() {
        const cacheConfig = this.getCacheConfig().projects;
        
        try {
            this.logger.info('Updating projects from server...');
            const freshProjects = await this.storage.getAll('projects') || [];
            
            // 比较数据是否有变化
            const hasChanges = freshProjects.length !== this.projects.length || 
                JSON.stringify(freshProjects) !== JSON.stringify(this.projects);
            
            if (hasChanges) {
                this.projects = freshProjects;
                this.logger.info('Projects updated from server:', this.projects.length, 'items');
                // 更新缓存
                this.setCachedData(cacheConfig.key, this.projects);
                // 更新UI
                this.renderContacts();
            } else {
                this.logger.info('Projects are up to date, no update needed');
            }
        } catch (error) {
            this.logger.error('Failed to update projects from server:', error);
        }
    }

    getProjectName(projectId) {
        if (!projectId) return '';
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.name : '';
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
                            <h2 class="section-title">联系人列表</h2>
                            <div class="section-actions">
                                <button class="btn btn-primary btn-sm" data-action="new-contact">
                                    <i class="fas fa-plus"></i>
                                    新建联系人
                                </button>
                            </div>
                        </div>
                        <div id="contactList" class="grid grid-auto-fit gap-4"></div>
                    </div>
                </div>
            </main>
        `;
    }

    // 生成联系人卡片HTML
    generateContactCardHTML(contact) {
        let cardHTML = `
            <h3>${contact.name}${contact.isProjectManager ? ' <span class="badge bg-primary text-xs">项目经理</span>' : ''}</h3>
            <p><i class="fas fa-phone"></i> ${contact.phone ? `<a href="tel:${contact.phone}" class="text-primary hover:underline">${contact.phone}</a>` : '无电话'}</p>
            <p><i class="fas fa-folder"></i> ${this.getProjectName(contact.projectId) || '无项目'}</p>
            <p class="text-sm text-secondary">${contact.note || ''}</p>
            <div class="card-actions" style="display: flex; justify-content: flex-start; gap: 8px;">
        `;
        
        if (!contact.isProjectManager) {
            cardHTML += `
                <button class="btn btn-sm btn-ghost" data-action="edit-contact" data-id="${contact.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-ghost" data-action="delete-contact" data-id="${contact.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        if (contact.phone) {
            cardHTML += `
                <div style="flex-grow: 1;"></div>
                <a href="tel:${contact.phone}" class="btn btn-sm btn-primary" title="拨打电话">
                    <i class="fas fa-phone-alt"></i>
                </a>
            `;
        }
        
        cardHTML += `
            </div>
        `;
        
        return cardHTML;
    }
    
    // 优化后的渲染方法
    renderContacts() {
        const container = document.getElementById('contactList');
        if (!container) return;

        // 合并现有联系人和项目经理信息
        const allContacts = [...this.contacts];
        
        // 只添加当前项目的项目经理信息，确保不重复添加
        if (this.currentProjectId) {
            const currentProject = this.projects.find(p => p.id === this.currentProjectId);
            if (currentProject && currentProject.personalInfo && currentProject.personalInfo.name && currentProject.personalInfo.phone) {
                // 检查是否已存在相同姓名和电话的联系人
                const managerExists = allContacts.some(contact => 
                    contact.name === currentProject.personalInfo.name && contact.phone === currentProject.personalInfo.phone
                );
                
                if (!managerExists) {
                    // 创建项目经理联系人对象
                    const managerContact = {
                        id: `manager_${currentProject.id}`,
                        name: currentProject.personalInfo.name,
                        phone: currentProject.personalInfo.phone,
                        projectId: currentProject.id,
                        note: '当前项目项目经理',
                        isProjectManager: true
                    };
                    
                    // 将项目经理联系人添加到数组开头，确保始终排在第一位
                    allContacts.unshift(managerContact);
                } else {
                    // 如果项目经理已存在，将其移到数组开头
                    const managerIndex = allContacts.findIndex(contact => 
                        contact.name === currentProject.personalInfo.name && contact.phone === currentProject.personalInfo.phone
                    );
                    if (managerIndex > 0) {
                        const managerContact = allContacts.splice(managerIndex, 1)[0];
                        allContacts.unshift(managerContact);
                    }
                }
            }
        }
        
        // 按姓名排序联系人
        allContacts.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, 'zh-CN');
        });

        if (allContacts.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无联系人，点击"新建联系人"创建</div>';
            return;
        }

        // 使用文档片段批量处理DOM元素，减少重排重绘
        const fragment = document.createDocumentFragment();
        
        // 批量创建联系人卡片
        allContacts.forEach(contact => {
            const contactCard = document.createElement('div');
            contactCard.className = `project-card ${contact.isProjectManager ? 'manager-contact' : ''}`;
            contactCard.innerHTML = this.generateContactCardHTML(contact);
            fragment.appendChild(contactCard);
        });
        
        // 直接更新DOM，不使用requestAnimationFrame，以确保截图时内容已渲染
        // 清空容器并一次性添加所有元素
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    // 快速更新单个联系人卡片
    updateContactCard(contactId) {
        const container = document.getElementById('contactList');
        if (!container) return;
        
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;
        
        // 查找对应的卡片元素
        const cardElements = container.querySelectorAll('.project-card');
        let targetCard = null;
        
        for (const card of cardElements) {
            const editBtn = card.querySelector('[data-action="edit-contact"]');
            if (editBtn && editBtn.dataset.id === contactId) {
                targetCard = card;
                break;
            }
        }
        
        if (targetCard) {
            // 直接更新DOM，不使用requestAnimationFrame
            targetCard.innerHTML = this.generateContactCardHTML(contact);
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            
            const action = actionEl.dataset.action;
            const id = actionEl.dataset.id;
            
            switch (action) {
                case 'toggle-menu':
                    this.toggleMobileMenu();
                    break;
                case 'close-menu':
                    this.closeMobileMenu();
                    break;
                case 'new-contact':
                    this.handleNewContact();
                    break;
                case 'edit-contact':
                    this.handleEditContact(id);
                    break;
                case 'delete-contact':
                    this.handleDeleteContact(id);
                    break;
                case 'sync-data':
                    this.handleSyncData();
                    break;
                case 'cloud-restore':
                    this.handleCloudRestore();
                    break;
            }
        });
    }

    async handleNewContact() {
        try {
            const formDialog = await this.getFormDialog();
            formDialog.show({
                type: 'info',
                title: '新建联系人',
                confirmText: '创建',
                cancelText: '取消',
                fields: [
                    {
                        type: 'text',
                        name: 'name',
                        label: '姓名',
                        placeholder: '请输入姓名',
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'phone',
                        label: '电话',
                        placeholder: '请输入电话号码',
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'projectId',
                        label: '所属项目',
                        options: this.projects.map(project => ({ value: project.id, label: project.name })),
                        placeholder: '请选择项目'
                    },
                    {
                        type: 'textarea',
                        name: 'note',
                        label: '备注',
                        placeholder: '请输入备注',
                        rows: 3
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        // 确保Utils已加载
                        if (!window.Utils) {
                            if (window.lazyLoadScripts && window.lazyLoadScripts.utils) {
                                await window.lazyLoadScripts.utils();
                            }
                        }
                        
                        const contact = {
                            id: window.Utils ? Utils.generateId() : Date.now().toString(),
                            name: data.name,
                            phone: data.phone,
                            projectId: data.projectId || '',
                            note: data.note || '',
                            createdAt: new Date().toISOString()
                        };

                        await this.storage.set('contacts', contact);
                        this.contacts.push(contact);
                        this.renderContacts();
                        this.toast.success('联系人创建成功');
                    } catch (error) {
                        this.logger.error('Failed to create contact:', error);
                        this.toast.error('创建失败，请重试');
                    }
                }
            });
        } catch (error) {
            this.logger.error('Failed to open new contact dialog:', error);
            this.toast.error('打开对话框失败，请重试');
        }
    }

    async handleEditContact(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;

        try {
            const formDialog = await this.getFormDialog();
            formDialog.show({
                type: 'info',
                title: '编辑联系人',
                confirmText: '保存',
                cancelText: '取消',
                fields: [
                    {
                        type: 'text',
                        name: 'name',
                        label: '姓名',
                        value: contact.name,
                        placeholder: '请输入姓名',
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'phone',
                        label: '电话',
                        value: contact.phone,
                        placeholder: '请输入电话号码',
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'projectId',
                        label: '所属项目',
                        options: this.projects.map(project => ({ value: project.id, label: project.name })),
                        value: contact.projectId || '',
                        placeholder: '请选择项目'
                    },
                    {
                        type: 'textarea',
                        name: 'note',
                        label: '备注',
                        value: contact.note || '',
                        placeholder: '请输入备注',
                        rows: 3
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        const updatedContact = {
                            ...contact,
                            name: data.name,
                            phone: data.phone,
                            projectId: data.projectId || '',
                            note: data.note || '',
                            updatedAt: new Date().toISOString()
                        };

                        await this.storage.set('contacts', updatedContact);
                        const index = this.contacts.findIndex(c => c.id === id);
                        this.contacts[index] = updatedContact;
                        this.renderContacts();
                        this.toast.success('联系人保存成功');
                    } catch (error) {
                        this.logger.error('Failed to update contact:', error);
                        this.toast.error('保存失败，请重试');
                    }
                }
            });
        } catch (error) {
            this.logger.error('Failed to open edit contact dialog:', error);
            this.toast.error('打开对话框失败，请重试');
        }
    }

    async handleDeleteContact(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;

        if (!confirm(`确定要删除联系人"${contact.name}"吗？`)) return;

        try {
            // 记录删除操作的开始
            this.logger.info('开始删除联系人:', id, contact.name);
            
            // 先清除所有相关的缓存，防止删除后缓存数据被重新同步
            try {
                localStorage.removeItem('cachedContacts');
                sessionStorage.removeItem('cachedContacts');
                localStorage.removeItem('contacts');
                sessionStorage.removeItem('contacts');
                localStorage.removeItem('user_contacts');
                sessionStorage.removeItem('user_contacts');
                this.logger.info('Contact cache cleared before deletion');
            } catch (error) {
                this.logger.error('Failed to clear contact cache before deletion:', error);
            }
            
            // 执行删除操作
            const success = await this.storage.delete('contacts', id);
            this.logger.info('Delete operation result:', success);
            
            if (success) {
                // 更新本地联系人列表
                this.contacts = this.contacts.filter(c => c.id !== id);
                this.renderContacts();
                
                // 清除缓存，确保下次加载时从服务器获取最新数据
                try {
                    localStorage.removeItem('cachedContacts');
                    sessionStorage.removeItem('cachedContacts');
                    localStorage.removeItem('contacts');
                    sessionStorage.removeItem('contacts');
                    localStorage.removeItem('user_contacts');
                    sessionStorage.removeItem('user_contacts');
                    this.logger.info('Contact cache cleared after deletion');
                } catch (error) {
                    this.logger.error('Failed to clear contact cache after deletion:', error);
                }
                
                // 强制重新加载数据，确保显示的是最新的结果
                setTimeout(async () => {
                    await this.loadData();
                    this.renderContacts();
                    this.logger.info('Forced reload of contacts after deletion');
                }, 100);
                
                this.toast.success('联系人删除成功');
            } else {
                this.toast.error('删除失败，请重试');
            }
        } catch (error) {
            this.logger.error('Failed to delete contact:', error);
            this.toast.error('删除失败，请重试');
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

    async handleSyncData() {
        try {
            this.logger.info('开始同步通讯录数据到云端...');
            
            // 检查是否已登录
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                this.toast.error('请先登录后再同步数据');
                setTimeout(() => {
                    window.location.href = '/jg/admin/login.html';
                }, 1000);
                return;
            }
            
            // 检查 this.cloudSync 是否存在
            if (!this.cloudSync || !this.cloudSync.syncDataToCloud) {
                this.toast.error('云端同步功能未初始化，请刷新页面重试');
                this.logger.error('this.cloudSync 未定义或 syncDataToCloud 方法不存在');
                return;
            }
            
            this.toast.info('数据同步中...');
            
            // 调用云端同步功能
            const result = await this.cloudSync.syncDataToCloud();
            this.logger.info('同步结果:', result);
            
            if (result.success) {
                this.toast.success('数据同步成功！');
            } else {
                this.toast.error('数据同步失败，请重试');
            }
        } catch (error) {
            this.logger.error('同步数据时发生错误:', error);
            this.toast.error('同步过程中发生错误，请重试');
        }
    }

    async handleCloudRestore() {
        try {
            this.logger.info('开始从云端恢复数据...');
            
            // 检查是否已登录
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                this.toast.error('请先登录后再恢复数据');
                setTimeout(() => {
                    window.location.href = '/jg/admin/login.html';
                }, 1000);
                return;
            }
            
            // 检查 this.cloudSync 是否存在
            if (!this.cloudSync || !this.cloudSync.restoreDataFromCloud) {
                this.toast.error('云端恢复功能未初始化，请刷新页面重试');
                this.logger.error('this.cloudSync 未定义或 restoreDataFromCloud 方法不存在');
                return;
            }
            
            this.toast.info('从云端恢复数据中...');
            
            // 调用云端恢复功能
            const result = await this.cloudSync.restoreDataFromCloud();
            this.logger.info('恢复结果:', result);
            
            if (result.success) {
                this.toast.success('数据恢复成功！页面将自动刷新...');
                
                // 强制刷新页面以确保所有数据都被重新加载
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.toast.error('数据恢复失败，请重试');
            }
        } catch (error) {
            this.logger.error('恢复数据时发生错误:', error);
            this.toast.error('恢复过程中发生错误，请重试');
        }
    }

    destroy() {
        this.logger.info('Destroying phonebook page...');
        this.container.innerHTML = '';
        this.logger.info('Phonebook page destroyed');
    }
}

// 添加全局引用
window.PhoneBookPage = PhoneBookPage;