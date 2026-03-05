

class ProjectManagementPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        this.cloudSync = options.cloudSync;
        this.formDialog = new FormDialog(options.dialog);
        
        this.projects = [];
        this.currentProjectId = '';
        this.eventsBound = false;
    }

    async init() {
        // 检查是否已经初始化，避免重复初始化
        if (window.projectManagementInitialized) {
            this.logger.info('Project management page already initialized');
            return;
        }
        
        this.logger.info('Initializing project management page...');
        
        try {
            // 检查版本号
            if (window.VersionChecker) {
                const versionChecker = new VersionChecker({
                    storage: this.storage,
                    toast: this.toast,
                    logger: this.logger
                });
                await versionChecker.check();
            }
            
            this.render();
            this.bindEvents(); // 先绑定事件，确保按钮可点击
            await this.loadData(); // loadData内部已经调用了renderProjects
            
            // 监听项目切换事件（仅响应其他页面的切换）
            this.eventBus.on('project:switched', async (data) => {
                if (data.projectId && String(data.projectId) !== String(this.currentProjectId)) {
                    this.currentProjectId = data.projectId;
                    await this.storage.setLocal('currentProjectId', data.projectId);
                    
                    // 重新加载项目列表
                    await this.loadData();
                    
                    // 将选中的项目移动到列表顶部
                    const projectIndex = this.projects.findIndex(p => String(p.id) === String(data.projectId));
                    if (projectIndex > 0) {
                        // 从原位置移除
                        const selectedProject = this.projects.splice(projectIndex, 1)[0];
                        // 添加到列表顶部
                        this.projects.unshift(selectedProject);
                        // 更新所有项目的排序字段
                        this.projects.forEach((proj, index) => {
                            proj.order = index;
                        });
                        // 保存更新后的项目列表
                        for (const proj of this.projects) {
                            await this.storage.set('projects', proj);
                        }
                    }
                    
                    this.renderProjects();
                }
            });
            
            window.projectManagementInitialized = true;
            this.logger.info('Project management page initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize project management page:', error);
            this.toast.error('页面初始化失败');
        }
    }

    async loadData() {
        try {
            let projects = [];
            let loadedFromLocal = false;
            
            // 优先从localStorage加载数据，实现秒开
            const localStorageData = localStorage.getItem('projects');
            if (localStorageData) {
                try {
                    projects = JSON.parse(localStorageData);
                    loadedFromLocal = true;
                    this.logger.info('从localStorage加载项目数据', projects.length);
                } catch (e) {
                    console.error('解析localStorage数据失败:', e);
                }
            }
            
            this.currentProjectId = this.storage.getLocal('currentProjectId') || '';
            
            // 立即渲染本地数据，实现秒开
            if (loadedFromLocal && projects.length > 0) {
                this.projects = projects;
                this.processProjects();
                this.renderProjects();
                this.logger.info('已渲染本地数据，页面已显示');
                
                // 后台静默同步服务器数据
                this.syncFromServerBackground();
            } else {
                // 没有本地数据，必须从服务器加载
                await this.syncFromServer();
            }
            
        } catch (error) {
            this.logger.error('Failed to load data:', error);
        }
    }

    processProjects() {
        const uniqueProjects = [];
        const projectIds = new Set();
        
        for (const project of this.projects) {
            if (project.isEnded !== undefined) {
                project.isEnded = Boolean(project.isEnded);
            }
            if (!projectIds.has(project.id)) {
                projectIds.add(project.id);
                uniqueProjects.push(project);
            }
        }
        
        this.projects = uniqueProjects;
        
        this.projects = this.projects.filter(project => {
            const isTestProject = project.name && (project.name.includes('测试项目') || project.id.includes('test_'));
            return !isTestProject;
        });
        
        this.projects = this.projects.map(project => {
            if (!project.personalInfo) {
                project.personalInfo = { name: '', phone: '' };
            } else {
                if (!project.personalInfo.name) project.personalInfo.name = '';
                if (!project.personalInfo.phone) project.personalInfo.phone = '';
            }
            return project;
        });
        
        this.projects.sort((a, b) => (a.order || 9999) - (b.order || 9999));
        
        // 检查当前项目是否已结束
        const currentProject = this.projects.find(p => String(p.id) === String(this.currentProjectId));
        if (currentProject && currentProject.isEnded) {
            // 如果当前项目已结束，尝试切换到一个未结束的项目
            const activeProject = this.projects.find(p => !p.isEnded);
            if (activeProject) {
                this.currentProjectId = activeProject.id;
                this.storage.setLocal('currentProjectId', this.currentProjectId);
            }
        }
        
        if (!this.currentProjectId && this.projects.length > 0) {
            const activeProjects = this.projects.filter(p => !p.isEnded);
            if (activeProjects.length > 0) {
                this.currentProjectId = activeProjects[0].id;
            } else {
                this.currentProjectId = this.projects[0].id;
            }
            this.storage.setLocal('currentProjectId', this.currentProjectId);
        }
        
        if (this.currentProjectId) {
            const currentProjectIndex = this.projects.findIndex(p => String(p.id) === String(this.currentProjectId));
            if (currentProjectIndex > 0) {
                const currentProject = this.projects.splice(currentProjectIndex, 1)[0];
                this.projects.unshift(currentProject);
            }
        }
    }

    async syncFromServer() {
        try {
            const [storageProjects, userSettings] = await Promise.all([
                this.storage.getAll('projects').catch(() => null),
                this.storage.getAll('userSettings').catch(() => null)
            ]);
            
            if (storageProjects && storageProjects.length > 0) {
                this.projects = storageProjects;
                localStorage.setItem('projects', JSON.stringify(storageProjects));
            }
            
            if (userSettings && Array.isArray(userSettings)) {
                const currentProjectSetting = userSettings.find(s => s.key === 'currentProjectId');
                if (currentProjectSetting) {
                    this.currentProjectId = currentProjectSetting.value;
                    this.storage.setLocal('currentProjectId', this.currentProjectId);
                }
            }
            
            this.processProjects();
            this.renderProjects();
        } catch (error) {
            console.error('从服务器同步失败:', error);
        }
    }

    syncFromServerBackground() {
        setTimeout(async () => {
            try {
                // 检查缓存时间，避免频繁网络请求
                const cacheKey = 'projects_bg_sync_time';
                const lastSyncTime = localStorage.getItem(cacheKey);
                const now = Date.now();
                const SYNC_INTERVAL = 60000; // 60秒同步间隔
                
                if (lastSyncTime && (now - parseInt(lastSyncTime)) < SYNC_INTERVAL) {
                    // 距离上次同步不到60秒，跳过
                    return;
                }
                
                const [storageProjects, userSettings] = await Promise.all([
                    this.storage.getAll('projects').catch(() => null),
                    this.storage.getAll('userSettings').catch(() => null)
                ]);
                
                // 更新同步时间
                localStorage.setItem(cacheKey, now.toString());
                
                let needsUpdate = false;
                
                if (storageProjects && storageProjects.length > 0) {
                    const localData = localStorage.getItem('projects');
                    const localProjects = localData ? JSON.parse(localData) : [];
                    
                    if (JSON.stringify(storageProjects) !== JSON.stringify(localProjects)) {
                        this.projects = storageProjects;
                        localStorage.setItem('projects', JSON.stringify(storageProjects));
                        needsUpdate = true;
                    }
                }
                
                if (userSettings && Array.isArray(userSettings)) {
                    const currentProjectSetting = userSettings.find(s => s.key === 'currentProjectId');
                    if (currentProjectSetting && currentProjectSetting.value !== this.currentProjectId) {
                        this.currentProjectId = currentProjectSetting.value;
                        this.storage.setLocal('currentProjectId', this.currentProjectId);
                        needsUpdate = true;
                    }
                }
                
                if (needsUpdate) {
                    this.processProjects();
                    this.renderProjects();
                }
            } catch (error) {
                console.error('后台同步失败:', error);
            }
        }, 5000); // 延迟5秒，让页面先显示
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = this.getTemplate();
    }

    getTemplate() {
        return `
            <main class="app-main">
                <div class="container">
                    <!-- 项目信息统计 -->
                    <section class="project-overview">
                        <h2>
                            <i class="fas fa-chart-pie"></i>项目概览
                        </h2>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-card-content">
                                    <div>
                                        <p class="stat-card-label">总项目数</p>
                                        <p class="stat-card-value" id="totalProjects">0</p>
                                    </div>
                                    <div class="stat-card-icon">
                                        <i class="fas fa-folder-open"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-content">
                                    <div>
                                        <p class="stat-card-label">活跃项目 <i class="fas fa-question-circle" style="font-size: 11px; color: var(--text-secondary); cursor: help;" title="活跃项目指未结束的项目"></i></p>
                                        <p class="stat-card-value" id="activeProjects">0</p>
                                    </div>
                                    <div class="stat-card-icon success">
                                        <i class="fas fa-play-circle"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-content">
                                    <div>
                                        <p class="stat-card-label">当前项目</p>
                                        <p class="stat-card-value" id="currentProject">未选择</p>
                                    </div>
                                    <div class="stat-card-icon primary">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-content">
                                    <div>
                                        <p class="stat-card-label">最近更新</p>
                                        <p class="stat-card-value" id="lastUpdated">无数据</p>
                                    </div>
                                    <div class="stat-card-icon warning">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 项目列表区域 -->
                    <section class="project-list-section">
                        <div class="section-header">
                            <h2 class="section-title">
                                <i class="fas fa-list-alt"></i>项目列表
                            </h2>
                            <div class="section-actions" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div class="search-box" style="flex: 1; min-width: 200px; max-width: 300px; display: flex; align-items: stretch; gap: 5px;">
                                    <input type="text" id="project-search" placeholder="搜索项目名称、地址、项目经理..." style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; flex: 1; margin: 0;">
                                    <button id="search-btn" style="padding: 8px 12px; background-color: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; flex: none; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                                <div class="desktop-batch-actions" style="display: flex; align-items: center; gap: 10px;">
                                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; margin: 0;">
                                        <input type="checkbox" id="select-all" title="全选">
                                        <span>全选</span>
                                    </label>
                                    <div id="batch-actions" style="display: none; flex: none; align-items: center; gap: 5px;">
                                        <button id="batch-delete-btn" class="btn btn-sm btn-error" data-action="batch-delete" title="批量删除" style="margin: 0;">
                                            <i class="fas fa-trash"></i>批量删除
                                        </button>
                                        <button id="batch-end-btn" class="btn btn-sm btn-warning" data-action="batch-end" title="批量结束" style="margin: 0;">
                                            <i class="fas fa-flag"></i>批量结束
                                        </button>
                                        <button id="batch-activate-btn" class="btn btn-sm btn-success" data-action="batch-activate" title="批量激活" style="margin: 0;">
                                            <i class="fas fa-redo"></i>批量激活
                                        </button>
                                    </div>
                                </div>
                                <button id="createProjectBtn" class="btn btn-primary btn-sm" title="新建项目" data-action="new-project">
                                    <i class="fas fa-plus"></i>新建项目
                                </button>
                            </div>
                        </div>

                        <!-- 桌面端：项目列表表格 -->
                        <div class="desktop-table">
                            <table class="project-table" id="projectTable" style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                                <tbody id="projectList">
                                    <!-- 项目列表将动态生成 -->
                                </tbody>
                            </table>
                        </div>

                        <!-- 移动端：项目列表卡片 -->
                        <div id="projectListMobile" class="mobile-card">
                            <!-- 移动端项目卡片将动态生成 -->
                        </div>

                        <!-- 空状态提示（无项目时显示） -->
                        <div id="empty-state" class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <p>暂无项目数据，点击「新建项目」添加吧</p>
                        </div>
                    </section>
                </div>
            </main>
        `;
    }

    renderProjects() {
        const container = document.getElementById('projectList');
        const mobileContainer = document.getElementById('projectListMobile');
        const emptyState = document.getElementById('empty-state');
        const totalProjectsEl = document.getElementById('totalProjects');
        const activeProjectsEl = document.getElementById('activeProjects');
        const currentProjectEl = document.getElementById('currentProject');
        const lastUpdatedEl = document.getElementById('lastUpdated');
        
        if (!container || !mobileContainer || !emptyState) return;

        // 更新统计信息
        if (totalProjectsEl) totalProjectsEl.textContent = this.projects.length;
        const activeProjectsCount = this.projects.filter(project => !Boolean(project.isEnded)).length;
        if (activeProjectsEl) activeProjectsEl.textContent = activeProjectsCount;
        if (lastUpdatedEl) {
            if (this.projects.length > 0) {
                // 过滤掉没有 updatedAt 和 createdAt 的项目
                const projectsWithDate = this.projects.filter(project => 
                    project.updatedAt || project.createdAt
                );
                
                if (projectsWithDate.length > 0) {
                    const lastUpdatedProject = projectsWithDate.reduce((latest, project) => {
                        const projectDate = new Date(project.updatedAt || project.createdAt);
                        const latestDate = new Date(latest.updatedAt || latest.createdAt);
                        return projectDate > latestDate ? project : latest;
                    });
                    const date = new Date(lastUpdatedProject.updatedAt || lastUpdatedProject.createdAt);
                    lastUpdatedEl.textContent = Utils.formatDate(date, 'YYYY-MM-DD');
                } else {
                    lastUpdatedEl.textContent = '无数据';
                }
            } else {
                lastUpdatedEl.textContent = '无数据';
            }
        }
        if (currentProjectEl) {
            if (this.currentProjectId) {
                const currentProject = this.projects.find(p => p.id === this.currentProjectId);
                if (currentProject) {
                    currentProjectEl.textContent = currentProject.name;
                } else {
                    currentProjectEl.textContent = '未选择';
                }
            } else {
                currentProjectEl.textContent = '未选择';
            }
        }

        if (this.projects.length === 0) {
            container.innerHTML = '';
            mobileContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // 使用文档片段优化渲染性能
        const desktopFragment = document.createDocumentFragment();
        const tbody = document.createElement('tbody');
        
        for (const project of this.projects) {
            const projectManager = project.personalInfo?.name || '无';
            const phone = project.personalInfo?.phone || '无';
            const createdAt = new Date(project.createdAt);
            const dateStr = Utils.formatDate(createdAt, 'YYYY-MM-DD');
            const isEnded = Boolean(project.isEnded) || false;
            const isCurrentProject = this.currentProjectId === project.id;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left;">
                    <input type="checkbox" class="project-checkbox" data-id="${project.id}" ${isCurrentProject ? 'disabled' : ''}>
                </td>
                <td style="text-align: left;">${project.name}${isEnded ? ' <span class="project-ended-badge">已结束</span>' : ''}</td>
                <td style="text-align: left;">${project.address || '无地址'}</td>
                <td style="text-align: left;">${projectManager}</td>
                <td style="text-align: left;">${phone}</td>
                <td style="text-align: left;">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-ghost btn-icon" data-action="edit-project" data-id="${project.id}" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost btn-icon ${isCurrentProject ? 'btn-disabled' : ''}" data-action="delete-project" data-id="${project.id}" title="${isCurrentProject ? '当前项目不能删除' : '删除'}" ${isCurrentProject ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                        ${!isEnded ? `<button class="btn btn-sm btn-ghost btn-icon" data-action="switch-project" data-id="${project.id}" title="切换">
                            <i class="fas fa-check"></i>
                        </button>` : ''}
                        <button class="btn btn-sm btn-ghost btn-icon" data-action="toggle-project-status" data-id="${project.id}" title="${isEnded ? '激活' : '结束'}">
                            <i class="fas ${isEnded ? 'fa-redo' : 'fa-flag'}"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        }
        
        desktopFragment.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(desktopFragment);

        const mobileFragment = document.createDocumentFragment();
        
        for (const project of this.projects) {
            const projectManager = project.personalInfo?.name || '无';
            const phone = project.personalInfo?.phone || '无';
            const createdAt = new Date(project.createdAt);
            const dateStr = Utils.formatDate(createdAt, 'YYYY-MM-DD');
            const isEnded = Boolean(project.isEnded) || false;
            const isCurrentProject = this.currentProjectId === project.id;
            
            const card = document.createElement('div');
            card.className = `project-card ${isCurrentProject ? 'project-card-current' : ''}`;
            card.innerHTML = `
                <h3>${project.name}</h3>
                ${isEnded ? '<div class="project-card-ended"><span class="project-ended-badge">已结束</span></div>' : ''}
                <p><i class="fas fa-map-marker-alt"></i> ${project.address || '无地址'}</p>
                <p><i class="fas fa-user"></i> ${projectManager}</p>
                <p><i class="fas fa-phone"></i> ${phone}</p>
                <p class="project-card-date">创建时间：${dateStr}</p>
                <div class="card-actions">
                    <button class="btn btn-sm btn-ghost btn-icon" data-action="edit-project" data-id="${project.id}" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost btn-icon ${isCurrentProject ? 'btn-disabled' : ''}" data-action="delete-project" data-id="${project.id}" title="${isCurrentProject ? '当前项目不能删除' : '删除'}" ${isCurrentProject ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                    ${!isEnded ? `<button class="btn btn-sm btn-ghost btn-icon" data-action="switch-project" data-id="${project.id}" title="切换">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                    <button class="btn btn-sm btn-ghost btn-icon" data-action="toggle-project-status" data-id="${project.id}" title="${isEnded ? '激活' : '结束'}">
                        <i class="fas ${isEnded ? 'fa-redo' : 'fa-flag'}"></i>
                    </button>
                </div>
            `;
            mobileFragment.appendChild(card);
        }
        
        mobileContainer.innerHTML = '';
        mobileContainer.appendChild(mobileFragment);
    }

    bindEvents() {
        // 确保只添加一次事件监听器
        if (this.eventsBound) return;
        this.eventsBound = true;
        
        // 为其他按钮添加事件监听器
        const handleClick = (e) => {
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
                case 'new-project':
                    this.handleNewProject();
                    break;
                case 'edit-project':
                    this.handleEditProject(id);
                    break;
                case 'delete-project':
                    this.handleDeleteProject(id);
                    break;
                case 'switch-project':
                    this.handleSwitchProject(id);
                    break;
                case 'toggle-project-status':
                    this.handleToggleProjectStatus(id);
                    break;
                case 'sync-data':
                    this.handleSyncData();
                    break;
                case 'cloud-restore':
                    this.handleCloudRestore();
                    break;
                case 'batch-delete':
                    this.handleBatchDelete();
                    break;
                case 'batch-end':
                    this.handleBatchEnd();
                    break;
                case 'batch-activate':
                    this.handleBatchActivate();
                    break;
            }
        };
        
        document.addEventListener('click', handleClick);
        
        // 保存事件处理函数的引用，以便在需要时可以移除它
        this.clickHandler = handleClick;
        
        // 添加搜索功能
        this.bindSearchEvents();
        
        // 添加批量操作功能
        this.bindBatchOperations();
    }
    
    bindSearchEvents() {
        const searchInput = document.getElementById('project-search');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput) {
            // 搜索按钮点击事件
            searchBtn?.addEventListener('click', () => {
                this.performSearch();
            });
            
            // 回车键搜索
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            // 输入框清空时重置搜索
            searchInput.addEventListener('input', (e) => {
                if (!e.target.value.trim()) {
                    this.renderProjects();
                }
            });
        }
    }
    
    bindBatchOperations() {
        // 桌面端全选
        const selectAllCheckbox = document.getElementById('select-all');
        selectAllCheckbox?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.project-checkbox:not(:disabled)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            this.updateBatchActionsVisibility();
            // 同步移动端全选状态
            this.updateSelectAllState();
        });
        
        // 单个复选框变化事件
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('project-checkbox')) {
                this.updateBatchActionsVisibility();
                // 更新全选复选框状态
                this.updateSelectAllState();
            }
        });
    }
    
    updateBatchActionsVisibility() {
        const batchActions = document.getElementById('batch-actions');
        const checkedCheckboxes = document.querySelectorAll('.project-checkbox:checked');
        
        if (batchActions) {
            batchActions.style.display = checkedCheckboxes.length > 0 ? 'flex' : 'none';
        }
    }
    
    updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.project-checkbox:not(:disabled)');
        const checkedCheckboxes = document.querySelectorAll('.project-checkbox:checked');
        
        if (selectAllCheckbox && checkboxes.length > 0) {
            selectAllCheckbox.checked = checkboxes.length === checkedCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < checkboxes.length;
        }
    }
    
    performSearch() {
        const searchInput = document.getElementById('project-search');
        const searchTerm = searchInput?.value?.toLowerCase().trim() || '';
        
        if (!searchTerm) {
            this.renderProjects();
            return;
        }
        
        const container = document.getElementById('projectList');
        const mobileContainer = document.getElementById('projectListMobile');
        const emptyState = document.getElementById('empty-state');
        
        if (!container || !mobileContainer || !emptyState) return;
        
        const filteredProjects = this.projects.filter(project => {
            const projectName = project.name?.toLowerCase() || '';
            const projectAddress = project.address?.toLowerCase() || '';
            const projectManager = project.personalInfo?.name?.toLowerCase() || '';
            const phone = project.personalInfo?.phone || '';
            
            return (
                projectName.includes(searchTerm) ||
                projectAddress.includes(searchTerm) ||
                projectManager.includes(searchTerm) ||
                phone.includes(searchTerm)
            );
        });
        
        if (filteredProjects.length === 0) {
            container.innerHTML = '';
            mobileContainer.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <p>未找到匹配的项目</p>
            `;
            return;
        }
        
        emptyState.style.display = 'none';
        
        // 渲染桌面端表格
        container.innerHTML = filteredProjects.map(project => {
            const projectManager = project.personalInfo?.name || '无';
            const phone = project.personalInfo?.phone || '无';
            const createdAt = new Date(project.createdAt);
            const dateStr = Utils.formatDate(createdAt, 'YYYY-MM-DD');
            const isEnded = Boolean(project.isEnded) || false;
            const isCurrentProject = this.currentProjectId === project.id;
            
            return `
                <tr>
                    <td style="text-align: left;">
                        <input type="checkbox" class="project-checkbox" data-id="${project.id}" ${isCurrentProject ? 'disabled' : ''}>
                    </td>
                    <td style="text-align: left;">${project.name}${isEnded ? ' <span class="project-ended-badge">已结束</span>' : ''}</td>
                    <td style="text-align: left;">${project.address || '无地址'}</td>
                    <td style="text-align: left;">${projectManager}</td>
                    <td style="text-align: left;">${phone}</td>
                    <td style="text-align: left;">
                        <div class="table-actions">
                            <button class="btn btn-sm btn-ghost btn-icon" data-action="edit-project" data-id="${project.id}" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost btn-icon ${isCurrentProject ? 'btn-disabled' : ''}" data-action="delete-project" data-id="${project.id}" title="${isCurrentProject ? '当前项目不能删除' : '删除'}" ${isCurrentProject ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                            ${!isEnded ? `<button class="btn btn-sm btn-ghost btn-icon" data-action="switch-project" data-id="${project.id}" title="切换">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            <button class="btn btn-sm btn-ghost btn-icon" data-action="toggle-project-status" data-id="${project.id}" title="${isEnded ? '激活' : '结束'}">
                                <i class="fas ${isEnded ? 'fa-redo' : 'fa-flag'}"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // 渲染移动端卡片（不带全选功能）
        mobileContainer.innerHTML = '';
        
        filteredProjects.forEach(project => {
            const projectManager = project.personalInfo?.name || '无';
            const phone = project.personalInfo?.phone || '无';
            const createdAt = new Date(project.createdAt);
            const dateStr = Utils.formatDate(createdAt, 'YYYY-MM-DD');
            const isEnded = Boolean(project.isEnded) || false;
            const isCurrentProject = this.currentProjectId === project.id;
            
            const card = document.createElement('div');
            card.className = `project-card ${isCurrentProject ? 'project-card-current' : ''}`;
            card.innerHTML = `
                <h3>${project.name}</h3>
                ${isEnded ? '<div class="project-card-ended"><span class="project-ended-badge">已结束</span></div>' : ''}
                <p><i class="fas fa-map-marker-alt"></i> ${project.address || '无地址'}</p>
                <p><i class="fas fa-user"></i> ${projectManager}</p>
                <p><i class="fas fa-phone"></i> ${phone}</p>
                <p class="project-card-date">创建时间：${dateStr}</p>
                <div class="card-actions">
                    <button class="btn btn-sm btn-ghost btn-icon" data-action="edit-project" data-id="${project.id}" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost btn-icon ${isCurrentProject ? 'btn-disabled' : ''}" data-action="delete-project" data-id="${project.id}" title="${isCurrentProject ? '当前项目不能删除' : '删除'}" ${isCurrentProject ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                    ${!isEnded ? `<button class="btn btn-sm btn-ghost btn-icon" data-action="switch-project" data-id="${project.id}" title="切换">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                    <button class="btn btn-sm btn-ghost btn-icon" data-action="toggle-project-status" data-id="${project.id}" title="${isEnded ? '激活' : '结束'}">
                        <i class="fas ${isEnded ? 'fa-redo' : 'fa-flag'}"></i>
                    </button>
                </div>
            `;
            mobileContainer.appendChild(card);
        });
    }
    
    async handleBatchDelete() {
        const checkedCheckboxes = document.querySelectorAll('.project-checkbox:checked');
        const projectIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.dataset.id);
        
        if (projectIds.length === 0) return;
        
        if (!confirm(`确定要删除选中的 ${projectIds.length} 个项目吗？`)) return;
        
        try {
            let successCount = 0;
            
            for (const id of projectIds) {
                const success = await this.storage.delete('projects', id);
                if (success) {
                    successCount++;
                    this.projects = this.projects.filter(p => p.id !== id);
                }
            }
            
            this.renderProjects();
            this.toast.success(`成功删除 ${successCount} 个项目`);
        } catch (error) {
            this.logger.error('批量删除项目失败:', error);
            this.toast.error('批量删除失败，请重试');
        }
    }
    
    async handleBatchEnd() {
        const checkedCheckboxes = document.querySelectorAll('.project-checkbox:checked');
        const projectIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.dataset.id);
        
        if (projectIds.length === 0) return;
        
        if (!confirm(`确定要标记选中的 ${projectIds.length} 个项目为已结束吗？`)) return;
        
        try {
            let successCount = 0;
            
            for (const id of projectIds) {
                const project = this.projects.find(p => p.id === id);
                if (project && !project.isEnded) {
                    const updatedProject = {
                        ...project,
                        isEnded: true,
                        updatedAt: new Date().toISOString()
                    };
                    
                    await this.storage.set('projects', updatedProject);
                    const index = this.projects.findIndex(p => p.id === id);
                    if (index !== -1) {
                        this.projects[index] = updatedProject;
                        successCount++;
                    }
                }
            }
            
            this.renderProjects();
            this.toast.success(`成功标记 ${successCount} 个项目为已结束`);
        } catch (error) {
            this.logger.error('批量结束项目失败:', error);
            this.toast.error('批量结束失败，请重试');
        }
    }
    
    async handleBatchActivate() {
        const checkedCheckboxes = document.querySelectorAll('.project-checkbox:checked');
        const projectIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.dataset.id);
        
        if (projectIds.length === 0) return;
        
        if (!confirm(`确定要重新激活选中的 ${projectIds.length} 个项目吗？`)) return;
        
        try {
            let successCount = 0;
            
            for (const id of projectIds) {
                const project = this.projects.find(p => p.id === id);
                if (project && project.isEnded) {
                    const updatedProject = {
                        ...project,
                        isEnded: false,
                        updatedAt: new Date().toISOString()
                    };
                    
                    await this.storage.set('projects', updatedProject);
                    const index = this.projects.findIndex(p => p.id === id);
                    if (index !== -1) {
                        this.projects[index] = updatedProject;
                        successCount++;
                    }
                }
            }
            
            this.renderProjects();
            this.toast.success(`成功激活 ${successCount} 个项目`);
        } catch (error) {
            this.logger.error('批量激活项目失败:', error);
            this.toast.error('批量激活失败，请重试');
        }
    }

    handleNewProject() {
        try {
            // 确保onSubmit回调函数只被调用一次
            let isSubmitting = false;
            
            this.formDialog.show({
                type: 'info',
                title: '新建项目',
                confirmText: '创建',
                cancelText: '取消',
                fields: [
                {
                    type: 'text',
                    name: 'name',
                    label: '项目名称',
                    placeholder: '请输入项目名称',
                    required: true
                },
                {
                    type: 'text',
                    name: 'address',
                    label: '项目地址',
                    placeholder: '请输入项目地址',
                    required: true
                },
                {
                    type: 'textarea',
                    name: 'description',
                    label: '项目描述',
                    placeholder: '请输入项目描述',
                    rows: 3
                },
                {
                    type: 'text',
                    name: 'type',
                    label: '工种',
                    placeholder: '请输入工种（如：木工、电工）'
                },
                {
                    type: 'text',
                    name: 'projectManager',
                    label: '项目经理',
                    placeholder: '请输入姓名'
                },
                {
                    type: 'tel',
                    name: 'phone',
                    label: '手机号',
                    placeholder: '请输入手机号',
                    required: true
                },
                {
                    type: 'time',
                    name: 'morningStart',
                    label: '上午上班时间',
                    value: '08:00'
                },
                {
                    type: 'time',
                    name: 'morningEnd',
                    label: '上午下班时间',
                    value: '12:00'
                },
                {
                    type: 'time',
                    name: 'afternoonStart',
                    label: '下午上班时间',
                    value: '14:00'
                },
                {
                    type: 'time',
                    name: 'afternoonEnd',
                    label: '下午下班时间',
                    value: '18:00'
                },
                {
                    type: 'number',
                    name: 'earlyCheckInLimit',
                    label: '提前打卡时间范围（分钟）',
                    value: 60,
                    min: 0,
                    max: 180
                },
            ],
            onSubmit: async (data) => {
                // 防止重复提交
                if (isSubmitting) {
                    return;
                }
                isSubmitting = true;
                
                try {
                    // 生成唯一的项目ID
                    const projectId = Utils.generateId();
                    
                    const project = {
                        id: projectId,
                        name: data.name,
                        address: data.address || '',
                        description: data.description || '',
                        type: data.type || '',
                        personalInfo: {
                            name: data.projectManager || '',
                            phone: data.phone || ''
                        },
                        workHours: {
                            morningStart: data.morningStart || '08:00',
                            morningEnd: data.morningEnd || '12:00',
                            afternoonStart: data.afternoonStart || '14:00',
                            afternoonEnd: data.afternoonEnd || '18:00',
                            earlyCheckInLimit: parseInt(data.earlyCheckInLimit) || 60
                        },
                        createdAt: new Date().toISOString(),
                        order: this.projects.length // 设置新项目的order为当前项目数量
                    };

                    // 保存项目到存储
                    await this.storage.set('projects', project);
                    
                    // 同时更新 localStorage，确保 loadData 能读取到最新数据
                    this.projects.push(project);
                    localStorage.setItem('projects', JSON.stringify(this.projects));
                    
                    // 重新加载项目数据，确保只显示最新的项目列表
                    await this.loadData();
                    
                    // 渲染项目列表
                    this.renderProjects();
                    
                    this.toast.success('项目创建成功');
                } catch (error) {
                    this.logger.error('Failed to create project:', error);
                    this.toast.error('创建失败，请重试');
                } finally {
                    isSubmitting = false;
                }
            }
        });
        } catch (error) {
            this.logger.error('Error in handleNewProject:', error);
        }

        // 绑定项目经理姓名输入事件，实现手机号自动填充
        setTimeout(() => {
            const projectManagerInput = document.querySelector('input[name="projectManager"]');
            const phoneInput = document.querySelector('input[name="phone"]');
            
            if (projectManagerInput && phoneInput) {
                projectManagerInput.addEventListener('input', () => {
                    const name = projectManagerInput.value.trim();
                    if (name) {
                        // 从现有项目中查找匹配的项目经理姓名
                        const matchedProject = this.projects.find(project => 
                            project.personalInfo?.name === name && project.personalInfo?.phone
                        );
                        
                        if (matchedProject) {
                            // 自动填充手机号
                            phoneInput.value = matchedProject.personalInfo.phone;
                        }
                    } else {
                        // 如果姓名被清空，也清空手机号
                        phoneInput.value = '';
                    }
                });
            }
        }, 100);
    }

    handleEditProject(id) {
        const project = this.projects.find(p => String(p.id) === String(id));
        if (!project) return;

        this.formDialog.show({
            type: 'info',
            title: '编辑项目',
            confirmText: '保存',
            cancelText: '取消',
            fields: [
                {
                    type: 'text',
                    name: 'name',
                    label: '项目名称',
                    value: project.name,
                    placeholder: '请输入项目名称',
                    required: true
                },
                {
                    type: 'text',
                    name: 'address',
                    label: '项目地址',
                    value: project.address || '',
                    placeholder: '请输入项目地址',
                    required: true
                },
                {
                    type: 'textarea',
                    name: 'description',
                    label: '项目描述',
                    value: project.description || '',
                    placeholder: '请输入项目描述',
                    rows: 3
                },
                {
                    type: 'text',
                    name: 'type',
                    label: '工种',
                    value: project.type || '',
                    placeholder: '请输入工种（如：木工、电工）'
                },
                {
                    type: 'text',
                    name: 'projectManager',
                    label: '项目经理',
                    value: project.personalInfo?.name || '',
                    placeholder: '请输入姓名'
                },
                {
                    type: 'tel',
                    name: 'phone',
                    label: '手机号',
                    value: project.personalInfo?.phone || '',
                    placeholder: '请输入手机号',
                    required: true
                },
                {
                    type: 'time',
                    name: 'morningStart',
                    label: '上午上班时间',
                    value: project.workHours?.morningStart || '08:00'
                },
                {
                    type: 'time',
                    name: 'morningEnd',
                    label: '上午下班时间',
                    value: project.workHours?.morningEnd || '12:00'
                },
                {
                    type: 'time',
                    name: 'afternoonStart',
                    label: '下午上班时间',
                    value: project.workHours?.afternoonStart || '14:00'
                },
                {
                    type: 'time',
                    name: 'afternoonEnd',
                    label: '下午下班时间',
                    value: project.workHours?.afternoonEnd || '18:00'
                },
            ],
            onSubmit: async (data) => {
                try {
                    const updatedProject = {
                        ...project,
                        name: data.name,
                        address: data.address || '',
                        description: data.description || '',
                        type: data.type || '',
                        personalInfo: {
                            name: data.projectManager || '',
                            phone: data.phone || ''
                        },
                        workHours: {
                            morningStart: data.morningStart || '08:00',
                            morningEnd: data.morningEnd || '12:00',
                            afternoonStart: data.afternoonStart || '14:00',
                            afternoonEnd: data.afternoonEnd || '18:00'
                        },
                        updatedAt: new Date().toISOString()
                    };

                    await this.storage.set('projects', updatedProject);
                    const index = this.projects.findIndex(p => p.id === id);
                    this.projects[index] = updatedProject;
                    
                    // 处理项目经理变更时的联系人信息
                    try {
                        const contacts = await this.storage.getAll('contacts') || [];
                        
                        // 查找与该项目相关的联系人
                        const projectContacts = contacts.filter(contact => contact.projectId === id);
                        
                        if (updatedProject.personalInfo.name) {
                            // 项目经理存在，更新或创建联系人
                            const managerContact = projectContacts.find(contact => contact.isProjectManager);
                            
                            if (managerContact) {
                                // 更新现有联系人
                                await this.storage.set('contacts', {
                                    ...managerContact,
                                    name: updatedProject.personalInfo.name,
                                    phone: updatedProject.personalInfo.phone,
                                    updatedAt: new Date().toISOString()
                                });
                            } else {
                                // 创建新的项目经理联系人
                                await this.storage.set('contacts', {
                                    id: `manager_${id}`,
                                    name: updatedProject.personalInfo.name,
                                    phone: updatedProject.personalInfo.phone,
                                    projectId: id,
                                    note: '项目项目经理',
                                    isProjectManager: true,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        } else {
                            // 项目经理被移除，删除相关联系人
                            for (const contact of projectContacts) {
                                if (contact.isProjectManager) {
                                    await this.storage.delete('contacts', contact.id);
                                }
                            }
                        }
                    } catch (contactError) {
                        this.logger.error('Failed to update associated contacts:', contactError);
                    }
                    
                    this.renderProjects();
                    this.toast.success('项目保存成功');
                } catch (error) {
                    this.logger.error('Failed to update project:', error);
                    this.toast.error('保存失败，请重试');
                }
            }
        });

        // 绑定加班字段显示/隐藏事件
        setTimeout(() => {
            const checkbox = document.querySelector('input[name="noOvertimePay"]');
            const overtimeFields = document.querySelectorAll('.overtime-field');
            
            if (checkbox) {
                // 初始状态：根据复选框状态显示/隐藏加班字段
                overtimeFields.forEach(field => {
                    field.closest('.form-group').style.display = checkbox.checked ? 'block' : 'none';
                });
                
                // 添加事件监听器
                checkbox.addEventListener('change', () => {
                    overtimeFields.forEach(field => {
                        field.closest('.form-group').style.display = checkbox.checked ? 'block' : 'none';
                    });
                });
            }
            
            // 绑定项目经理姓名输入事件，实现手机号自动填充
            const projectManagerInput = document.querySelector('input[name="projectManager"]');
            const phoneInput = document.querySelector('input[name="phone"]');
            
            if (projectManagerInput && phoneInput) {
                projectManagerInput.addEventListener('input', () => {
                    const name = projectManagerInput.value.trim();
                    if (name) {
                        // 从现有项目中查找匹配的项目经理姓名
                        const matchedProject = this.projects.find(project => 
                            project.personalInfo?.name === name && project.personalInfo?.phone
                        );
                        
                        if (matchedProject) {
                            // 自动填充手机号
                            phoneInput.value = matchedProject.personalInfo.phone;
                        }
                    } else {
                        // 如果姓名被清空，也清空手机号
                        phoneInput.value = '';
                    }
                });
            }
        }, 100);
    }

    async handleDeleteProject(id) {
        const project = this.projects.find(p => String(p.id) === String(id));
        if (!project) return;

        // 检查是否是当前项目
        if (String(id) === String(this.currentProjectId)) {
            this.toast.error('当前项目不能删除，请先切换到其他项目');
            return;
        }

        if (!confirm(`确定要删除项目"${project.name}"吗？`)) return;

        try {
            const success = await this.storage.delete('projects', id);
            if (success) {
                // 从本地项目列表中移除
                this.projects = this.projects.filter(p => p.id !== id);
                
                // 更新localStorage中的项目列表
                localStorage.setItem('projects', JSON.stringify(this.projects));
                
                // 同时删除与该项目相关的联系人
                try {
                    const contacts = await this.storage.getAll('contacts') || [];
                    const contactsToDelete = contacts.filter(contact => contact.projectId === id);
                    
                    for (const contact of contactsToDelete) {
                        await this.storage.delete('contacts', contact.id);
                    }
                    
                    if (contactsToDelete.length > 0) {
                        this.logger.info(`Deleted ${contactsToDelete.length} contacts associated with project ${id}`);
                    }
                } catch (contactError) {
                    this.logger.error('Failed to delete associated contacts:', contactError);
                }
                
                this.renderProjects();
                this.toast.success('项目删除成功');
            } else {
                this.toast.error('删除失败，请重试');
            }
        } catch (error) {
            this.logger.error('Failed to delete project:', error);
            this.toast.error('删除失败，请重试');
        }
    }

    async handleSwitchProject(id) {
        const project = this.projects.find(p => String(p.id) === String(id));
        if (!project) {
            console.error('未找到项目:', id);
            return;
        }

        if (project.isEnded) {
            this.toast.error('该项目已结束，无法选择');
            return;
        }

        try {
            this.currentProjectId = id;
            
            // 保存到localStorage
            this.storage.setLocal('currentProjectId', id);
            
            // 保存当前项目ID到服务器
            try {
                await this.storage.set('userSettings', {
                    id: 'currentProjectId',
                    key: 'currentProjectId',
                    value: id,
                    user_id: localStorage.getItem('user_id'),
                    updatedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('当前项目ID保存到服务器失败:', error);
            }
            
            // 将选中的项目移动到列表顶部
            const projectIndex = this.projects.findIndex(p => p.id === id);
            if (projectIndex > 0) {
                // 从原位置移除
                const selectedProject = this.projects.splice(projectIndex, 1)[0];
                // 添加到列表顶部
                this.projects.unshift(selectedProject);
                // 更新所有项目的排序字段并保存
                this.projects.forEach((proj, index) => {
                    proj.order = index;
                });
                // 保存整个项目列表到localStorage
                try {
                    localStorage.setItem('projects', JSON.stringify(this.projects));
                } catch (localError) {
                    console.error('保存项目到localStorage失败:', localError);
                }
                // 保存更新后的项目列表到服务器存储
                for (const proj of this.projects) {
                    await this.storage.set('projects', proj);
                }
            }
            
            this.renderProjects();
            this.toast.success(`已切换到项目：${project.name}`);
            
            // 通知其他页面项目已切换
            this.eventBus.emit('project:switched', {
                projectId: id,
                projectName: project.name
            });
        } catch (error) {
            this.logger.error('Failed to switch project:', error);
            this.toast.error('切换失败，请重试');
        }
    }

    async handleToggleProjectStatus(id) {
        const project = this.projects.find(p => String(p.id) === String(id));
        if (!project) return;

        const isEnded = Boolean(project.isEnded) || false;

        if (!isEnded) {
            if (!confirm(`确定要标记项目"${project.name}"为已结束吗？\n结束后将无法选择该项目。`)) return;
        } else {
            if (!confirm(`确定要重新激活项目"${project.name}"吗？`)) return;
        }

        try {
            const updatedProject = {
                ...project,
                isEnded: !isEnded,
                updatedAt: new Date().toISOString()
            };

            // 直接更新内存中的项目列表
            const index = this.projects.findIndex(p => p.id === id);
            if (index !== -1) {
                this.projects[index] = updatedProject;
            }

            // 保存整个项目列表到localStorage
            try {
                localStorage.setItem('projects', JSON.stringify(this.projects));
            } catch (localError) {
                console.error('Error saving projects to localStorage:', localError);
            }

            // 保存单个项目到存储
            await this.storage.set('projects', updatedProject);

            // 无论保存是否成功，都更新UI
            this.renderProjects();
            this.toast.success(isEnded ? '项目已重新激活' : '项目已标记为结束');
            
            // 通知其他页面项目状态已更新
            this.eventBus.emit('project:status-updated', {
                projectId: id,
                isEnded: !isEnded
            });
            
            // 同时通知主页重新加载数据
            this.eventBus.emit('project:switched', {
                projectId: this.currentProjectId
            });
        } catch (error) {
            this.logger.error('Failed to toggle project status:', error);
            this.toast.error('操作失败，请重试');
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
            this.logger.info('开始同步项目数据到云端...');
            
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
        this.logger.info('Destroying project management page...');
        this.container.innerHTML = '';
        this.logger.info('Project management page destroyed');
    }
}

// 添加全局引用
window.ProjectManagementPage = ProjectManagementPage;
