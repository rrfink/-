// 条件声明，避免重复定义
if (!window.DataManagementPage) {
    class DataManagementPage {
        constructor(options) {
            this.container = options.container;
            this.eventBus = options.eventBus;
            this.storage = options.storage;
            this.theme = options.theme;
            this.toast = options.toast;
            this.dialog = options.dialog;
            this.logger = options.logger;
            this.formDialog = new FormDialog(options.dialog);
            
            this.stats = {
                contacts: 0,
                projects: 0,
                attendance: 0,
                wageHistory: 0
            };
            this.wageHistory = [];
            
            // 添加全局引用，方便在导出选项对话框中调用
            window.dataManagement = this;
        }

        async init() {
            // 检查是否已经初始化，避免重复初始化
            if (window.dataManagementInitialized) {
                this.logger.info('Data management page already initialized');
                return;
            }
            
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
                this.bindEvents(); // 先绑定事件
                await this.loadData();
                this.renderStats();
                
                window.dataManagementInitialized = true;
                this.logger.info('Data management page initialized successfully');
            } catch (error) {
                console.error('Failed to initialize data management page:', error);
                if (this.container) {
                    this.container.innerHTML = `
                        <div class="error-container">
                            <h2>页面初始化失败</h2>
                            <p>错误信息: ${error.message}</p>
                            <button onclick="window.location.reload()" class="btn btn-primary">
                                重试
                            </button>
                        </div>
                    `;
                }
            }
        }

        async loadData() {
            // 优先从localStorage加载数据，实现秒开
            let contacts = [];
            let projects = [];
            let wageHistory = [];
            let personalInfo = {};
            
            // 从localStorage加载数据
            try {
                const contactsData = localStorage.getItem('contacts');
                if (contactsData) {
                    contacts = JSON.parse(contactsData);
                    this.logger.info('从localStorage加载联系人数据', contacts.length);
                }
            } catch (e) {
                console.error('解析联系人数据失败:', e);
            }
            
            try {
                const projectsData = localStorage.getItem('projects');
                if (projectsData) {
                    projects = JSON.parse(projectsData);
                    this.logger.info('从localStorage加载项目数据', projects.length);
                }
            } catch (e) {
                console.error('解析项目数据失败:', e);
            }
            
            try {
                const wageHistoryData = localStorage.getItem('wageHistory');
                if (wageHistoryData) {
                    wageHistory = JSON.parse(wageHistoryData);
                    this.logger.info('从localStorage加载工资历史数据', wageHistory.length);
                }
            } catch (e) {
                console.error('解析工资历史数据失败:', e);
            }
            
            try {
                const personalInfoData = localStorage.getItem('personalInfo');
                if (personalInfoData) {
                    personalInfo = JSON.parse(personalInfoData);
                }
            } catch (e) {
                console.error('解析个人信息失败:', e);
            }
            
            // 过滤掉重复的项目（按ID去重）
            const uniqueProjects = [];
            const projectIds = new Set();
            if (projects && projects.length > 0) {
                for (const project of projects) {
                    if (project.id && !projectIds.has(project.id)) {
                        projectIds.add(project.id);
                        uniqueProjects.push(project);
                    }
                }
            }

            // 过滤掉测试项目，与项目管理页面保持一致
            const filteredProjects = uniqueProjects.filter(project => {
                const isTestProject = project.name && (project.name.includes('测试项目') || project.id.includes('test_'));
                return !isTestProject;
            });
            
            // 确保至少有一个项目，避免考勤数据无法获取
            if (filteredProjects.length === 0 && uniqueProjects.length > 0) {
                filteredProjects.push(uniqueProjects[0]);
            }

            // 并行获取所有项目的考勤数据并计算总数
            let totalAttendance = 0;
            if (filteredProjects.length > 0) {
                const attendancePromises = filteredProjects.map(async (project) => {
                    const projectAttendance = await this.storage.getAttendance(project.id);
                    return (projectAttendance || []).length;
                });
                const attendanceCounts = await Promise.all(attendancePromises);
                totalAttendance = attendanceCounts.reduce((sum, count) => sum + count, 0);
            }

            this.stats = {
                contacts: (contacts || []).length,
                projects: filteredProjects.length,
                attendance: totalAttendance,
                wageHistory: (wageHistory || []).length
            };
            this.wageHistory = wageHistory || [];
            this.personalInfo = personalInfo || {};
            this.currentProjectId = this.storage.getLocal('currentProjectId') || '';
            
            // 后台异步更新数据，不阻塞页面加载
            setTimeout(async () => {
                try {
                    const [serverContacts, serverProjects, serverWageHistory, serverPersonalInfo] = await Promise.all([
                        this.storage.getAll('contacts'),
                        this.storage.getAll('projects'),
                        this.storage.getAll('wageHistory'),
                        this.storage.get('personalInfo', 'current')
                    ]);
                    
                    // 如果服务器数据更新了，重新渲染
                    if (JSON.stringify(serverContacts) !== JSON.stringify(contacts)) {
                        contacts = serverContacts;
                        this.renderStats();
                    }
                    if (JSON.stringify(serverWageHistory) !== JSON.stringify(wageHistory)) {
                        wageHistory = serverWageHistory;
                        this.renderStats();
                    }
                    this.logger.info('后台数据更新完成');
                } catch (error) {
                    this.logger.error('后台数据更新失败:', error);
                }
            }, 500);
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
                            <h2 class="section-title">数据统计</h2>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">联系人</div>
                                <div class="stat-value" id="contactCount">0</div>
                                <div class="stat-change positive">条</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">项目</div>
                                <div class="stat-value" id="projectCount">0</div>
                                <div class="stat-change positive">个</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">出勤记录</div>
                                <div class="stat-value" id="attendanceCount">0</div>
                                <div class="stat-change positive">条</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">工资历史</div>
                                <div class="stat-value" id="wageHistoryCount">0</div>
                                <div class="stat-change positive">条</div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title">数据操作</h2>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="card">
                                <h3>导出Excel</h3>
                                <p class="text-sm text-secondary mb-3">导出所有数据为Excel格式</p>
                                <button class="btn btn-primary w-full" data-action="export-excel">
                                    <i class="fas fa-file-excel"></i>
                                    导出Excel
                                </button>
                            </div>
                            <div class="card">
                                <h3>复制到剪贴板</h3>
                                <p class="text-sm text-secondary mb-3">复制所有数据到剪贴板</p>
                                <button class="btn btn-primary w-full" data-action="copy-to-clipboard">
                                    <i class="fas fa-copy"></i>
                                    复制
                                </button>
                            </div>
                            <div class="card">
                                <h3>导入数据</h3>
                                <p class="text-sm text-secondary mb-3">从JSON文件导入数据</p>
                                <input type="file" id="importFile" accept=".json" class="hidden">
                                <button class="btn btn-secondary w-full" data-action="import-data">
                                    <i class="fas fa-upload"></i>
                                    导入数据
                                </button>
                            </div>
                            <div class="card">
                                <h3>清空所有数据</h3>
                                <p class="text-sm text-secondary mb-3">删除所有数据，不可恢复</p>
                                <button class="btn btn-error w-full" data-action="clear-all-data">
                                    <i class="fas fa-trash"></i>
                                    清空数据
                                </button>
                            </div>
                            <div class="card">
                                <h3>导出JSON</h3>
                                <p class="text-sm text-secondary mb-3">导出所有数据为JSON格式</p>
                                <button class="btn btn-primary w-full" data-action="export-json">
                                    <i class="fas fa-file-code"></i>
                                    导出JSON
                                </button>
                            </div>
                            <div class="card">
                                <h3>恢复备份</h3>
                                <p class="text-sm text-secondary mb-3">从备份文件恢复数据</p>
                                <div class="form-group mb-3">
                                    <input type="file" id="backupFileInput" class="form-input" accept=".json" style="display: none;">
                                    <button class="btn btn-secondary w-full mb-2" data-action="select-backup-file">
                                        <i class="fas fa-folder-open"></i>
                                        选择备份文件
                                    </button>
                                    <div id="selectedBackupFile" class="text-sm text-secondary" style="display: none;">
                                        已选择: <span id="backupFileName"></span>
                                    </div>
                                </div>
                                <button class="btn btn-warning w-full" data-action="restore-backup">
                                    <i class="fas fa-database"></i>
                                    恢复备份
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title">工资历史</h2>
                        </div>
                        <div id="wageHistoryList" class="grid grid-auto-fit gap-4"></div>
                    </div>
                </div>
            </main>
        `;
    }

    renderStats() {
        const contactCountEl = document.getElementById('contactCount');
        const projectCountEl = document.getElementById('projectCount');
        const attendanceCountEl = document.getElementById('attendanceCount');
        const wageHistoryCountEl = document.getElementById('wageHistoryCount');

        if (contactCountEl) contactCountEl.textContent = this.stats.contacts;
        if (projectCountEl) projectCountEl.textContent = this.stats.projects;
        if (attendanceCountEl) attendanceCountEl.textContent = this.stats.attendance;
        if (wageHistoryCountEl) wageHistoryCountEl.textContent = this.stats.wageHistory;

        this.renderWageHistory();
    }

    renderWageHistory() {
        const container = document.getElementById('wageHistoryList');
        if (!container) return;

        if (this.wageHistory.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无工资历史记录</div>';
            return;
        }

        // 按月份降序排序
        const sortedHistory = [...this.wageHistory].sort((a, b) => b.month.localeCompare(a.month));

        container.innerHTML = sortedHistory.map(record => `
            <div class="project-card">
                <h3>${record.month}</h3>
                <p><i class="fas fa-calendar-alt"></i> ${record.workDays} 天</p>
                <p><i class="fas fa-money-bill-wave"></i> ${Utils.formatCurrency(record.totalWage)}</p>
                ${record.reason ? `<p class="text-sm"><i class="fas fa-info-circle"></i> ${record.reason}</p>` : ''}
                <p class="text-sm text-secondary">${record.updatedAt ? '更新于: ' + record.updatedAt : '创建于: ' + record.createdAt}</p>
            </div>
        `).join('');
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            
            const action = actionEl.dataset.action;
            
            switch (action) {
                case 'toggle-menu':
                    this.toggleMobileMenu();
                    break;
                case 'close-menu':
                    this.closeMobileMenu();
                    break;
                case 'export-excel':
                    this.showExportOptions();
                    break;
                case 'export-pdf':
                    this.showExportOptions();
                    break;
                case 'export-contacts':
                    this.handleExportContacts();
                    break;
                case 'copy-to-clipboard':
                    this.handleCopyToClipboard();
                    break;
                case 'import-data':
                    this.handleImportData();
                    break;
                case 'export-json':
                    this.handleExportJson();
                    break;
                case 'clear-all-data':
                    this.handleClearAllData();
                    break;
                case 'sync-data':
                    this.handleSyncData();
                    break;
                case 'restore-data':
                    this.handleCloudRestore();
                    break;
                case 'restore-backup':
                    this.restoreBackupData();
                    break;
                case 'select-backup-file':
                    this.handleSelectBackupFile();
                    break;
            }
        });
    }

    handleImportData() {
        const fileInput = document.getElementById('importFile');
        if (!fileInput) return;

        fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // 检查数据文件是否有效，允许只包含部分数据
                // 只要文件包含contacts、projects、attendance、personalInfo、wageHistory或holidays中的任意一个，就认为是有效的
                const hasContacts = data.contacts && data.contacts.length > 0;
                const hasProjects = data.projects && data.projects.length > 0;
                const hasAttendance = data.attendance && (typeof data.attendance === 'object');
                const hasPersonalInfo = data.personalInfo && Object.keys(data.personalInfo).length > 0;
                const hasWageHistory = data.wageHistory && data.wageHistory.length > 0;
                const hasHolidays = data.holidays && data.holidays.length > 0;
                
                if (!hasContacts && !hasProjects && !hasAttendance && !hasPersonalInfo && !hasWageHistory && !hasHolidays) {
                    this.toast.error('无效的数据文件');
                    return;
                }

                if (!confirm('导入数据将覆盖现有数据，确定要继续吗？')) return;

                // 计算总数据量
                let totalItems = 0;
                if (data.contacts && data.contacts.length > 0) {
                    totalItems += data.contacts.length;
                }
                if (data.projects && data.projects.length > 0) {
                    totalItems += data.projects.length;
                }
                if (data.attendance) {
                    if (typeof data.attendance === 'object' && !Array.isArray(data.attendance)) {
                        for (const records of Object.values(data.attendance)) {
                            if (Array.isArray(records)) {
                                totalItems += records.length;
                            }
                        }
                    } else if (Array.isArray(data.attendance)) {
                        totalItems += data.attendance.length;
                    }
                }
                if (data.personalInfo && Object.keys(data.personalInfo).length > 0) {
                    totalItems += 1;
                }
                if (data.wageHistory && data.wageHistory.length > 0) {
                    totalItems += data.wageHistory.length;
                }
                if (data.holidays && data.holidays.length > 0) {
                    totalItems += data.holidays.length;
                }



                // 创建进度条对话框（使用统一样式）
                const createProgressDialog = () => {
                    const dialog = document.createElement('div');
                    dialog.id = 'importProgressDialog';
                    dialog.className = 'progress-dialog-overlay';
                    
                    dialog.innerHTML = `
                        <div class="progress-dialog-content">
                            <div class="progress-dialog-header">
                                <h3>正在导入数据</h3>
                            </div>
                            <div class="progress-info">
                                <span id="importProgressText">0%</span>
                                <span id="importProgressStatus">准备中...</span>
                            </div>
                            <div class="progress-bar-container">
                                <div id="importProgressBar" class="progress-bar" style="width: 0%;"></div>
                            </div>
                            <p id="importProgressMessage" class="progress-message">正在初始化...</p>
                        </div>
                    `;
                    
                    document.body.appendChild(dialog);
                    document.body.style.overflow = 'hidden';
                    
                    return dialog;
                };
                
                // 显示进度条对话框
                const progressDialog = createProgressDialog();
                const progressBar = document.getElementById('importProgressBar');
                const progressText = document.getElementById('importProgressText');
                const progressStatus = document.getElementById('importProgressStatus');
                const progressMessage = document.getElementById('importProgressMessage');
                
                // 显示进度条
                let processedItems = 0;
                let lastProgressUpdate = 0;
                
                // 更新进度的函数
                const updateProgress = () => {
                    // 确保totalItems至少为1，避免除以0
                    const safeTotalItems = Math.max(1, totalItems);
                    const progress = Math.min(100, Math.round((processedItems / safeTotalItems) * 100));
                    
                    // 限制进度更新频率，每100ms最多更新一次
                    const now = Date.now();
                    if (now - lastProgressUpdate < 100 && progress < 100) {
                        return;
                    }
                    lastProgressUpdate = now;
                    
                    // 更新进度条
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    
                    // 更新进度文本
                    if (progressText) {
                        progressText.textContent = `${progress}%`;
                    }
                    
                    // 更新状态文本
                    if (progressStatus) {
                        progressStatus.textContent = `处理中...`;
                    }
                    
                    // 更新消息
                    if (progressMessage) {
                        progressMessage.textContent = `正在导入数据... (${processedItems}/${totalItems})`;
                    }
                };
                
                // 初始进度
                updateProgress();

                // 批处理大小
                const batchSize = 10;

                // 批处理函数
                const batchImport = async (items, processItem, itemType) => {
                    for (let i = 0; i < items.length; i += batchSize) {
                        const batch = items.slice(i, i + batchSize);
                        
                        // 并行处理批次内的所有项目
                        const batchPromises = batch.map(async (item, index) => {
                            try {
                                await processItem(item, i + index);
                            } catch (error) {
                                console.error(`Failed to process ${itemType} item:`, error);
                                // 即使出错，也增加processedItems以确保进度条能继续前进
                                processedItems++;
                                if (processedItems % 10 === 0) { // 每处理10个项目更新一次进度
                                    updateProgress();
                                }
                            }
                        });
                        
                        // 等待批次处理完成
                        await Promise.all(batchPromises);
                        
                        // 每批次后更新一次进度
                        updateProgress();
                    }
                };

                // 处理personalInfo
                if (data.personalInfo && Object.keys(data.personalInfo).length > 0) {
                    try {
                        console.log('Importing personalInfo:', data.personalInfo);
                        const success = await this.storage.set('personalInfo', data.personalInfo);
                        console.log('Imported personalInfo:', { success });
                        processedItems++;
                        updateProgress();
                    } catch (error) {
                        console.error('Failed to import personalInfo:', error);
                    }
                }

                // 导入项目数据
                if (data.projects && data.projects.length > 0) {
                    console.log('Importing projects:', { count: data.projects.length });
                    await batchImport(data.projects, async (project) => {
                        console.log('Importing project:', project);
                        try {
                            // 确保project对象有必要的字段
                            if (project.id && project.name) {
                                const success = await this.storage.set('projects', project);
                                console.log('Imported project:', { id: project.id, success });
                                processedItems++;
                            } else {
                                console.error('Invalid project data:', project);
                                processedItems++;
                            }
                        } catch (error) {
                            console.error('Failed to import project:', { id: project.id, error });
                            processedItems++;
                        }
                    }, 'project');
                }

                // 导入联系人数据
                if (data.contacts && data.contacts.length > 0) {
                    console.log('Importing contacts:', { count: data.contacts.length });
                    await batchImport(data.contacts, async (contact) => {
                        console.log('Importing contact:', contact);
                        try {
                            // 确保contact对象有必要的字段
                            if (contact.id && contact.name) {
                                const success = await this.storage.set('contacts', contact);
                                console.log('Imported contact:', { id: contact.id, success });
                                processedItems++;
                            } else {
                                console.error('Invalid contact data:', contact);
                                processedItems++;
                            }
                        } catch (error) {
                            console.error('Failed to import contact:', { id: contact.id, error });
                            processedItems++;
                        }
                    }, 'contact');
                }

                // 导入考勤数据
                if (data.attendance) {
                    console.log('Importing attendance:', data.attendance);
                    if (typeof data.attendance === 'object' && !Array.isArray(data.attendance)) {
                        // 新格式：{ projectId: [records] }
                        const projectIds = Object.keys(data.attendance);
                        console.log('Importing attendance (new format):', { projectIds: projectIds.length });
                        if (projectIds.length > 0) {
                            for (const [projectId, records] of Object.entries(data.attendance)) {
                                console.log('Importing attendance for project:', { projectId, records: records.length });
                                if (Array.isArray(records)) {
                                    await batchImport(records, async (record) => {
                                        console.log('Importing attendance record:', record);
                                        if (record.date && record.status) {
                                            try {
                                                const success = await this.storage.saveAttendance(projectId, record.date, record.status, record.remark);
                                                console.log('Imported attendance:', { projectId, date: record.date, success });
                                                processedItems++;
                                            } catch (error) {
                                                console.error('Failed to import attendance:', { projectId, date: record.date, error });
                                                processedItems++;
                                            }
                                        } else {
                                            processedItems++;
                                        }
                                    }, 'attendance');
                                }
                            }
                        }
                    } else if (Array.isArray(data.attendance)) {
                        // 老格式：[records]
                        console.log('Importing attendance (old format):', { records: data.attendance.length });
                        if (data.attendance.length > 0) {
                            await batchImport(data.attendance, async (record) => {
                                console.log('Importing attendance record:', record);
                                if (record.projectId && record.date && record.status) {
                                    try {
                                        const success = await this.storage.saveAttendance(record.projectId, record.date, record.status, record.remark);
                                        console.log('Imported attendance:', { projectId: record.projectId, date: record.date, success });
                                        processedItems++;
                                    } catch (error) {
                                        console.error('Failed to import attendance:', { projectId: record.projectId, date: record.date, error });
                                        processedItems++;
                                    }
                                } else if (record.date && record.status) {
                                    // 处理没有projectId的记录，使用默认项目
                                    const defaultProject = data.projects && data.projects.length > 0 ? data.projects[0].id : 'default';
                                    try {
                                        const success = await this.storage.saveAttendance(defaultProject, record.date, record.status, record.remark);
                                        console.log('Imported attendance (default project):', { projectId: defaultProject, date: record.date, success });
                                        processedItems++;
                                    } catch (error) {
                                        console.error('Failed to import attendance (default project):', { projectId: defaultProject, date: record.date, error });
                                        processedItems++;
                                    }
                                } else {
                                    processedItems++;
                                }
                            }, 'attendance');
                        }
                    }
                }

                // 导入工资历史数据
                if (data.wageHistory && data.wageHistory.length > 0) {
                    console.log('Importing wageHistory:', { count: data.wageHistory.length });
                    await batchImport(data.wageHistory, async (wageRecord) => {
                        console.log('Importing wage record:', wageRecord);
                        try {
                            // 确保wageRecord对象有必要的字段
                            if (wageRecord.id && wageRecord.projectId && wageRecord.month) {
                                const success = await this.storage.set('wageHistory', wageRecord);
                                console.log('Imported wage record:', { id: wageRecord.id, success });
                                processedItems++;
                            } else {
                                console.error('Invalid wage record data:', wageRecord);
                                // 即使数据无效，也增加processedItems以确保进度条能继续前进
                                processedItems++;
                            }
                        } catch (error) {
                            console.error('Failed to import wage record:', { id: wageRecord.id, error });
                            // 即使出错，也增加processedItems以确保进度条能继续前进
                            processedItems++;
                        }
                    }, 'wage record');
                }

                // 导入节假日数据
                if (data.holidays && data.holidays.length > 0) {
                    console.log('Importing holidays:', { count: data.holidays.length });
                    await batchImport(data.holidays, async (holiday) => {
                        console.log('Importing holiday:', holiday);
                        try {
                            // 确保holiday对象有必要的字段
                            if (holiday.id && holiday.date && holiday.name) {
                                const success = await this.storage.set('holidays', holiday);
                                console.log('Imported holiday:', { id: holiday.id, success });
                                processedItems++;
                            } else {
                                console.error('Invalid holiday data:', holiday);
                                // 即使数据无效，也增加processedItems以确保进度条能继续前进
                                processedItems++;
                            }
                        } catch (error) {
                            console.error('Failed to import holiday:', { id: holiday.id, error });
                            // 即使出错，也增加processedItems以确保进度条能继续前进
                            processedItems++;
                        }
                    }, 'holiday');
                }

                // 确保显示100%进度
                processedItems = totalItems;
                updateProgress();
                
                // 更新完成状态
                if (progressStatus) {
                    progressStatus.textContent = `完成`;
                }
                if (progressMessage) {
                    progressMessage.textContent = `导入完成！`;
                }
                
                // 等待一下，让用户看到100%的进度
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 关闭进度条对话框
                if (progressDialog && progressDialog.parentNode) {
                    document.body.removeChild(progressDialog);
                    document.body.style.overflow = '';
                }

            try {
                    await this.loadData();
                    this.renderStats();
                    this.toast.success('数据导入成功');
                } catch (error) {
                    this.logger.error('Failed to load data after import:', { error: error.message, stack: error.stack });
                    this.toast.success('数据导入成功，但加载数据时出现错误');
                }
                fileInput.value = '';
            } catch (error) {
                this.logger.error('Failed to import data:', { error: error.message, stack: error.stack });
                
                let errorMessage = '导入失败，请检查文件格式';
                if (error instanceof SyntaxError) {
                    errorMessage = '导入失败，文件格式错误：' + error.message;
                } else if (error.message) {
                    errorMessage = '导入失败：' + error.message;
                }
                
                this.toast.error(errorMessage);
                fileInput.value = '';
            }
        };
    }

    /**
     * 显示清空数据确认对话框（使用统一样式）
     * @returns {Promise<boolean>} 是否确认清空
     */
    showClearDataConfirmDialog() {
        return new Promise((resolve) => {
            // 创建自定义HTML内容
            const htmlContent = `
                <div class="clear-data-confirm" style="max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <div class="confirm-warning" style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #fff3cd; border-radius: 6px; margin-bottom: 12px; color: #856404; font-size: 13px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 18px; flex-shrink: 0;"></i>
                        <span style="font-weight: 600;">确认清空所有数据</span>
                    </div>
                    <div class="confirm-description" style="margin-bottom: 12px;">
                        <p style="margin-bottom: 8px; color: var(--text-color); font-size: 12px; line-height: 1.5;">此操作将清空本地存储和服务器数据库中的所有数据，包括：</p>
                        <ul class="data-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 10px 0; padding: 0; list-style: none;">
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-user" style="margin-right: 6px; color: var(--primary-color);"></i>个人信息</li>
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-project-diagram" style="margin-right: 6px; color: var(--primary-color);"></i>项目数据</li>
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-address-book" style="margin-right: 6px; color: var(--primary-color);"></i>联系人数据</li>
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-calendar-check" style="margin-right: 6px; color: var(--primary-color);"></i>考勤记录</li>
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-money-bill-wave" style="margin-right: 6px; color: var(--primary-color);"></i>工资历史</li>
                            <li style="padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 14px; white-space: nowrap;"><i class="fas fa-umbrella-beach" style="margin-right: 6px; color: var(--primary-color);"></i>节假日数据</li>
                        </ul>
                        <p class="warning-text" style="color: #f5222d; font-weight: 500; margin-top: 10px; padding: 6px 8px; background: #fff1f0; border-radius: 4px; border-left: 3px solid #f5222d; font-size: 12px;"><i class="fas fa-exclamation-circle" style="margin-right: 4px;"></i>此操作不可恢复，请谨慎操作！</p>
                    </div>
                    <div class="confirm-form" style="border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <div class="input-group" style="margin-bottom: 8px;">
                            <label for="confirmClearText" style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--text-secondary);">请输入"确认清空"：</label>
                            <input type="text" id="confirmClearText" class="form-input" placeholder="确认清空" style="width: 100%; box-sizing: border-box; font-size: 13px;">
                        </div>
                        <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: var(--text-secondary); width: auto;">
                            <input type="checkbox" id="confirmClearCheckbox" style="width: 14px; height: 14px; margin: 0;">
                            已备份，确认清空
                        </label>
                    </div>
                </div>
            `;

            // 使用统一的 Dialog 组件显示
            this.dialog.show({
                title: '危险操作确认',
                htmlContent: htmlContent,
                type: 'error',
                showCancel: true,
                showConfirm: true,
                confirmText: '确认清空',
                cancelText: '取消',
                width: 'auto',
                onShow: () => {
                    // 对话框显示后的处理
                    const checkbox = document.getElementById('confirmClearCheckbox');
                    const textInput = document.getElementById('confirmClearText');
                    const confirmBtn = document.querySelector('.dialog-footer .btn-success, .dialog-footer .btn-primary');
                    
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.style.opacity = '0.5';
                    }
                    
                    const validateForm = () => {
                        const isCheckboxChecked = checkbox && checkbox.checked;
                        const isTextCorrect = textInput && textInput.value.trim() === '确认清空';
                        
                        if (confirmBtn) {
                            if (isCheckboxChecked && isTextCorrect) {
                                confirmBtn.disabled = false;
                                confirmBtn.style.opacity = '1';
                            } else {
                                confirmBtn.disabled = true;
                                confirmBtn.style.opacity = '0.5';
                            }
                        }
                    };
                    
                    if (checkbox) {
                        checkbox.addEventListener('change', validateForm);
                    }
                    if (textInput) {
                        textInput.addEventListener('input', validateForm);
                    }
                },
                onConfirm: () => {
                    const checkbox = document.getElementById('confirmClearCheckbox');
                    const textInput = document.getElementById('confirmClearText');
                    
                    if (checkbox && checkbox.checked && textInput && textInput.value.trim() === '确认清空') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                onCancel: () => {
                    resolve(false);
                }
            });
        });
    }

    async handleClearAllData() {
        // 使用统一的确认对话框
        const confirmed = await this.showClearDataConfirmDialog();
        if (!confirmed) {
            return;
        }

        try {
            // 创建进度条对话框（使用统一样式）
            const createProgressDialog = () => {
                const progressDialog = document.createElement('div');
                progressDialog.id = 'clearProgressDialog';
                progressDialog.className = 'progress-dialog-overlay';
                
                progressDialog.innerHTML = `
                    <div class="progress-dialog-content">
                        <div class="progress-dialog-header">
                            <h3>正在清空数据</h3>
                        </div>
                        <div class="progress-info">
                            <span id="clearProgressText">0%</span>
                            <span id="clearProgressStatus">准备中...</span>
                        </div>
                        <div class="progress-bar-container">
                            <div id="clearProgressBar" class="progress-bar" style="width: 0%;"></div>
                        </div>
                        <p id="clearProgressMessage" class="progress-message">正在初始化...</p>
                    </div>
                `;
                
                document.body.appendChild(progressDialog);
                document.body.style.overflow = 'hidden';
                
                return progressDialog;
            };
            
            // 显示进度条对话框
            const progressDialog = createProgressDialog();
            const progressBar = document.getElementById('clearProgressBar');
            const progressText = document.getElementById('clearProgressText');
            const progressStatus = document.getElementById('clearProgressStatus');
            const progressMessage = document.getElementById('clearProgressMessage');
            
            // 显示进度条
            let progress = 0;
            let lastProgressUpdate = 0;
            
            // 更新进度的函数
            const updateProgress = (newProgress, message) => {
                // 限制进度更新频率，每100ms最多更新一次
                const now = Date.now();
                if (now - lastProgressUpdate < 100 && newProgress < 100) {
                    return;
                }
                lastProgressUpdate = now;
                
                progress = Math.min(100, newProgress);
                
                // 更新进度条
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                
                // 更新进度文本
                if (progressText) {
                    progressText.textContent = `${progress}%`;
                }
                
                // 更新状态文本
                if (progressStatus) {
                    progressStatus.textContent = `处理中...`;
                }
                
                // 更新消息
                if (progressMessage) {
                    progressMessage.textContent = message || `正在清空数据...`;
                }
            };
            
            // 初始进度
            updateProgress(0, '正在准备清空数据...');

            // 模拟清空数据的步骤，实际操作可能很快，但为了用户体验添加一些延迟
            updateProgress(20, '正在清空个人信息...');
            await new Promise(resolve => setTimeout(resolve, 300));

            updateProgress(40, '正在清空项目数据...');
            await new Promise(resolve => setTimeout(resolve, 300));

            updateProgress(60, '正在清空联系人数据...');
            await new Promise(resolve => setTimeout(resolve, 300));

            updateProgress(70, '正在清空考勤记录...');
            await new Promise(resolve => setTimeout(resolve, 300));

            updateProgress(85, '正在清空工资历史...');
            await new Promise(resolve => setTimeout(resolve, 300));

            updateProgress(95, '正在清空节假日数据...');
            await new Promise(resolve => setTimeout(resolve, 300));

            // 实际清空数据操作
            const clearSuccess = await this.storage.clearAll();

            if (!clearSuccess) {
                // 清空失败
                updateProgress(100, '清空失败！');
                await new Promise(resolve => setTimeout(resolve, 500));

                // 关闭进度条对话框
                if (progressDialog && progressDialog.parentNode) {
                    document.body.removeChild(progressDialog);
                    document.body.style.overflow = '';
                }

                this.toast.error('清空数据失败，请重试');
                return;
            }

            // 完成进度
            updateProgress(100, '清空完成！');
            await new Promise(resolve => setTimeout(resolve, 500));

            // 关闭进度条对话框
            if (progressDialog && progressDialog.parentNode) {
                document.body.removeChild(progressDialog);
                document.body.style.overflow = '';
            }

            // 显示清空成功的友好提示
            this.toast.success('数据清空成功！');
            
            // 延迟刷新页面，确保用户有足够的时间看到成功提示
            setTimeout(() => {
                // 强制刷新页面，确保用户看到的是最新的状态
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            // 移除对话框（如果还存在）
            if (progressDialog && progressDialog.parentNode) {
                document.body.removeChild(progressDialog);
                document.body.style.overflow = '';
            }
            
            this.logger.error('Failed to clear data:', error);
            this.toast.error('清空失败，请重试');
        }
    }

    async handleExportJson() {
        try {
            this.toast.info('正在导出数据...');

            // 获取所有数据
            const [contacts, projects, wageHistory, personalInfo, holidays] = await Promise.all([
                this.storage.getAll('contacts'),
                this.storage.getAll('projects'),
                this.storage.getAll('wageHistory'),
                this.storage.get('personalInfo', 'current'),
                this.storage.getAll('holidays')
            ]);

            // 并行获取所有项目的考勤数据
            const attendanceByProject = {};
            if (projects && projects.length > 0) {
                const attendancePromises = projects.map(async (project) => {
                    const projectAttendance = await this.storage.getAttendance(project.id);
                    if (projectAttendance && projectAttendance.length > 0) {
                        attendanceByProject[project.id] = projectAttendance;
                    }
                });
                await Promise.all(attendancePromises);
            }

            // 构建导出数据
            const exportData = {
                contacts: contacts || [],
                projects: projects || [],
                attendance: attendanceByProject,
                wageHistory: wageHistory || [],
                personalInfo: personalInfo || {},
                holidays: holidays || [],
                exportTime: new Date().toISOString(),
                version: '1.0'
            };

            // 转换为JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 创建Blob对象
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `任工记工数据_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
            document.body.appendChild(a);

            // 触发下载
            a.click();

            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            this.toast.success('JSON数据导出成功');
        } catch (error) {
                this.logger.error('Failed to export JSON:', { error: error.message, stack: error.stack });
                this.toast.error('导出失败，请重试');
            }
    }

    /**
     * 处理选择备份文件
     */
    handleSelectBackupFile() {
        const fileInput = document.getElementById('backupFileInput');
        if (!fileInput) return;

        fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 显示已选择的文件名
            const selectedBackupFile = document.getElementById('selectedBackupFile');
            const backupFileName = document.getElementById('backupFileName');
            if (selectedBackupFile && backupFileName) {
                backupFileName.textContent = file.name;
                selectedBackupFile.style.display = 'block';
            }

            // 保存文件对象供恢复时使用
            this.selectedBackupFile = file;
            this.toast.info(`已选择备份文件: ${file.name}`);
        };
    }

    /**
     * 恢复备份数据
     */
    async restoreBackupData() {
        try {
            // 检查是否有选择的文件
            let data;
            
            if (this.selectedBackupFile) {
                // 使用用户选择的文件
                const text = await this.selectedBackupFile.text();
                data = JSON.parse(text);
                console.log('从选择的文件加载备份数据:', this.selectedBackupFile.name);
            } else {
                // 尝试从默认路径读取备份文件（添加时间戳防止缓存）
                const response = await fetch('/jg/converted_work_data.json?t=' + Date.now(), {
                    cache: 'no-store'
                });
                if (!response.ok) {
                    throw new Error('备份文件不存在或无法读取，请先选择备份文件');
                }
                data = await response.json();
                console.log('从默认路径加载备份数据');
            }
            
            // 创建进度条对话框（使用统一样式）
            const createProgressDialog = () => {
                const dialog = document.createElement('div');
                dialog.id = 'restoreProgressDialog';
                dialog.className = 'progress-dialog-overlay';
                
                dialog.innerHTML = `
                    <div class="progress-dialog-content">
                        <div class="progress-dialog-header">
                            <h3>正在恢复备份数据</h3>
                        </div>
                        <div class="progress-info">
                            <span id="restoreProgressText">0%</span>
                            <span id="restoreProgressStatus">准备中...</span>
                        </div>
                        <div class="progress-bar-container">
                            <div id="restoreProgressBar" class="progress-bar" style="width: 0%;"></div>
                        </div>
                        <p id="restoreProgressMessage" class="progress-message">正在初始化...</p>
                    </div>
                `;
                
                document.body.appendChild(dialog);
                document.body.style.overflow = 'hidden';
                
                return dialog;
            };
            
            // 显示进度条对话框
            const progressDialog = createProgressDialog();
            const progressBar = document.getElementById('restoreProgressBar');
            const progressText = document.getElementById('restoreProgressText');
            const progressStatus = document.getElementById('restoreProgressStatus');
            const progressMessage = document.getElementById('restoreProgressMessage');
            
            console.log('Backup data loaded:', data);
            
            // 计算总数据量
            let totalItems = 0;
            if (data.contacts && data.contacts.length > 0) {
                totalItems += data.contacts.length;
            }
            if (data.projects && data.projects.length > 0) {
                totalItems += data.projects.length;
            }
            if (data.attendance) {
                for (const records of Object.values(data.attendance)) {
                    if (Array.isArray(records)) {
                        totalItems += records.length;
                    }
                }
            }
            if (data.personalInfo) {
                totalItems += 1;
            }
            if (data.wageHistory && data.wageHistory.length > 0) {
                totalItems += data.wageHistory.length;
            }
            if (data.holidays && data.holidays.length > 0) {
                totalItems += data.holidays.length;
            }
            
            console.log('Total items to restore:', totalItems);
            
            // 显示进度条
            let processedItems = 0;
            
            // 更新进度的函数
                const updateProgress = () => {
                    // 确保totalItems至少为1，避免除以0
                    const safeTotalItems = Math.max(1, totalItems);
                    const progress = Math.min(100, Math.round((processedItems / safeTotalItems) * 100));
                    
                    console.log('Restore progress:', progress, '%');
                    
                    // 更新进度条
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    
                    // 更新进度文本
                    if (progressText) {
                        progressText.textContent = `${progress}%`;
                    }
                    
                    // 更新状态文本
                    if (progressStatus) {
                        progressStatus.textContent = `处理中...`;
                    }
                    
                    // 更新消息
                    if (progressMessage) {
                        progressMessage.textContent = `正在恢复数据... (${processedItems}/${totalItems})`;
                    }
                };
            
            // 初始进度
            updateProgress();
            
            // 延迟函数
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            // 处理personalInfo
            if (data.personalInfo) {
                try {
                    // 移除userId字段，确保使用当前用户的userId
                    const personalInfo = { ...data.personalInfo };
                    delete personalInfo.userId;
                    
                    const success = await this.storage.set('personalInfo', personalInfo);
                    console.log('Restored personalInfo:', { success });
                    processedItems++;
                    updateProgress();
                } catch (error) {
                    console.error('Failed to restore personalInfo:', error);
                }
                await delay(200);
            }
            
            // 导入项目数据
            if (data.projects && data.projects.length > 0) {
                console.log('Restoring projects:', { count: data.projects.length });
                for (const project of data.projects) {
                    console.log('Restoring project:', project);
                    try {
                        // 移除userId字段，确保使用当前用户的userId
                        const projectData = { ...project };
                        delete projectData.userId;
                        
                        const success = await this.storage.set('projects', projectData);
                        console.log('Restored project:', { id: project.id, success });
                        processedItems++;
                        updateProgress();
                    } catch (error) {
                        console.error('Failed to restore project:', { id: project.id, error });
                    }
                    await delay(150);
                }
            }
            
            // 导入联系人数据
            if (data.contacts && data.contacts.length > 0) {
                console.log('Restoring contacts:', { count: data.contacts.length });
                for (const contact of data.contacts) {
                    console.log('Restoring contact:', contact);
                    try {
                        // 移除userId字段，确保使用当前用户的userId
                        const contactData = { ...contact };
                        delete contactData.userId;
                        
                        const success = await this.storage.set('contacts', contactData);
                        console.log('Restored contact:', { id: contact.id, success });
                        processedItems++;
                        updateProgress();
                    } catch (error) {
                        console.error('Failed to restore contact:', { id: contact.id, error });
                    }
                    await delay(150);
                }
            }
            
            // 导入考勤数据
            if (data.attendance) {
                console.log('Restoring attendance:', data.attendance);
                for (const [projectId, records] of Object.entries(data.attendance)) {
                    console.log('Restoring attendance for project:', { projectId, records: records.length });
                    if (Array.isArray(records)) {
                        for (const record of records) {
                            console.log('Restoring attendance record:', record);
                            if (record.date && record.status) {
                                try {
                                    // 直接保存到本地存储，确保数据至少保存在本地
                                    const attendanceData = {
                                        id: 'attendance_' + projectId + '_' + record.date,
                                        projectId,
                                        date: record.date,
                                        status: record.status,
                                        remark: record.remark,
                                        updatedAt: new Date().toISOString()
                                    };
                                    
                                    // 检查 localStorage.set 方法是否存在
                                    if (this.storage.localStorage && this.storage.localStorage.set) {
                                        const result = await this.storage.localStorage.set('attendance', attendanceData);
                                        // 检查存储是否成功，result 是存储的对象的键值（key），如果不是 undefined 或 null，则表示存储成功
                                        const success = result !== undefined && result !== null;
                                        console.log('Direct local storage result for attendance:', { projectId, date: record.date, result, success });
                                    }
                                    
                                    // 尝试使用 saveAttendance 方法保存
                                    const success = await this.storage.saveAttendance(projectId, record.date, record.status, record.remark);
                                    console.log('Restored attendance:', { projectId, date: record.date, success });
                                    processedItems++;
                                    updateProgress();
                                } catch (error) {
                                    console.error('Failed to restore attendance:', { projectId, date: record.date, error });
                                }
                                await delay(100);
                            }
                        }
                    }
                }
            }
            
            // 导入工资历史数据
            if (data.wageHistory && data.wageHistory.length > 0) {
                console.log('Restoring wageHistory:', { count: data.wageHistory.length });
                for (const wageItem of data.wageHistory) {
                    console.log('Restoring wage item:', wageItem);
                    try {
                        // 移除userId字段，确保使用当前用户的userId
                        const wageData = { ...wageItem };
                        delete wageData.userId;
                        
                        const success = await this.storage.set('wageHistory', wageData);
                        console.log('Restored wage item:', { id: wageItem.id, success });
                        processedItems++;
                        updateProgress();
                    } catch (error) {
                        console.error('Failed to restore wage item:', { id: wageItem.id, error });
                        // 即使出错，也增加processedItems以确保进度条能继续前进
                        processedItems++;
                        updateProgress();
                    }
                    await delay(50); // 减少延迟时间，提高恢复速度
                }
            }
            
            // 导入节假日数据
            if (data.holidays && data.holidays.length > 0) {
                console.log('Restoring holidays:', { count: data.holidays.length });
                for (const holiday of data.holidays) {
                    console.log('Restoring holiday:', holiday);
                    try {
                        // 移除userId字段，确保使用当前用户的userId
                        const holidayData = { ...holiday };
                        delete holidayData.userId;
                        
                        const success = await this.storage.set('holidays', holidayData);
                        console.log('Restored holiday:', { id: holiday.id, success });
                        processedItems++;
                        updateProgress();
                    } catch (error) {
                        console.error('Failed to restore holiday:', { id: holiday.id, error });
                        // 即使出错，也增加processedItems以确保进度条能继续前进
                        processedItems++;
                        updateProgress();
                    }
                    await delay(50); // 减少延迟时间，提高恢复速度
                }
            }
            
            // 确保显示100%进度
            processedItems = totalItems;
            updateProgress();
            
            // 更新完成状态
            if (progressStatus) {
                progressStatus.textContent = `完成`;
            }
            if (progressMessage) {
                progressMessage.textContent = `恢复完成！`;
            }
            
            // 等待一下，让用户看到100%的进度
            await delay(1000);
            
            // 关闭进度条对话框
            if (progressDialog && progressDialog.parentNode) {
                document.body.removeChild(progressDialog);
                document.body.style.overflow = '';
            }

            await this.loadData();
            this.renderStats();
            
            // 清除已选择的文件
            this.selectedBackupFile = null;
            const selectedBackupFile = document.getElementById('selectedBackupFile');
            if (selectedBackupFile) {
                selectedBackupFile.style.display = 'none';
            }
            const fileInput = document.getElementById('backupFileInput');
            if (fileInput) {
                fileInput.value = '';
            }
            
            this.toast.success('备份数据恢复成功');
        } catch (error) {
            console.error('Failed to restore backup data:', error);
            this.toast.error('恢复备份数据失败，请检查备份文件');
        }
    }

    /**
     * 显示导出选项对话框（使用统一样式）
     */
    showExportOptions() {
        // 创建对话框内容
        const htmlContent = `
            <div class="export-options-dialog">
                <div class="export-options-title">
                    <i class="fas fa-download"></i>导出数据
                </div>
                
                <div class="export-options-grid">
                    <button class="export-option-btn" id="exportExcelBtn">
                        <i class="fas fa-file-excel"></i>
                        <div class="export-option-info">
                            <div class="export-option-title">导出为 Excel</div>
                            <div class="export-option-desc">导出工资单，方便打印</div>
                        </div>
                    </button>
                    
                    <button class="export-option-btn" id="exportPdfBtn">
                        <i class="fas fa-file-pdf"></i>
                        <div class="export-option-info">
                            <div class="export-option-title">导出为 PDF</div>
                            <div class="export-option-desc">导出工资单，适合分享</div>
                        </div>
                    </button>
                    
                    <button class="export-option-btn" id="exportContactsBtn">
                        <i class="fas fa-file-csv"></i>
                        <div class="export-option-info">
                            <div class="export-option-title">导出联系人</div>
                            <div class="export-option-desc">导出联系人列表为 CSV</div>
                        </div>
                    </button>
                </div>
                
                <div class="export-tips">
                    <div class="export-tips-title">💡 提示</div>
                    <div class="export-tips-content">
                        Excel 和 PDF 格式只包含工资单，适合打印和分享<br>
                        CSV 格式只包含联系人列表，适合导入到其他系统
                    </div>
                </div>
            </div>
        `;
        
        // 使用统一的 Dialog 组件显示
        this.dialog.show({
            title: '',
            htmlContent: htmlContent,
            type: 'info',
            showCancel: true,
            showConfirm: false,
            cancelText: '关闭',
            width: '500px',
            onShow: () => {
                // 绑定导出按钮事件
                const excelBtn = document.getElementById('exportExcelBtn');
                const pdfBtn = document.getElementById('exportPdfBtn');
                const contactsBtn = document.getElementById('exportContactsBtn');
                
                if (excelBtn) {
                    excelBtn.addEventListener('click', () => {
                        this.dialog.hide();
                        setTimeout(() => {
                            this.showProjectSelectDialogForExport('excel');
                        }, 350);
                    });
                }
                
                if (pdfBtn) {
                    pdfBtn.addEventListener('click', () => {
                        this.dialog.hide();
                        setTimeout(() => {
                            this.showProjectSelectDialogForExport('pdf');
                        }, 350);
                    });
                }
                
                if (contactsBtn) {
                    contactsBtn.addEventListener('click', () => {
                        this.dialog.hide();
                        setTimeout(() => {
                            this.handleExportContacts();
                        }, 350);
                    });
                }
            }
        });
    }

    /**
     * 显示项目选择对话框并导出数据
     * @param {string} type 导出类型：'excel' 或 'pdf'
     */
    async showProjectSelectDialogForExport(type) {
        try {
            // 显示项目选择对话框
            const selectedProject = await this.showProjectSelectDialog();
            if (!selectedProject) return;
            
            // 显示月份选择对话框
            const selectedMonth = await this.showMonthSelectDialog();
            if (!selectedMonth) return;
            
            if (type === 'excel') {
                await this.handleExportExcel(selectedMonth, selectedProject);
            } else if (type === 'pdf') {
                await this.handleExportPdf(selectedMonth, selectedProject);
            }
        } catch (error) {
                this.logger.error('Failed to export data:', { error: error.message, stack: error.stack });
                this.toast.error('导出失败，请重试');
            }
    }

    /**
     * 显示项目选择对话框（使用统一样式）
     * @returns {Promise<Object>} 选中的项目
     */
    async showProjectSelectDialog() {
        return new Promise((resolve) => {
            const projects = this.storage.getAll('projects');
            
            projects.then(projectsList => {
                if (!projectsList || projectsList.length === 0) {
                    this.toast.error('暂无项目，请先创建项目');
                    resolve(null);
                    return;
                }
                
                // 创建项目选择对话框HTML
                let projectOptionsHTML = '';
                projectsList.forEach(project => {
                    projectOptionsHTML += `
                        <div class="project-option-item" data-project-id="${project.id}">
                            <div class="project-option-name">${project.name}</div>
                            <div class="project-option-address">${project.address || '无地址'}</div>
                        </div>
                    `;
                });
                
                const htmlContent = `
                    <div class="project-select-dialog">
                        <div class="project-select-title">
                            <i class="fas fa-project-diagram"></i>选择项目
                        </div>
                        
                        <div class="project-options-list">
                            ${projectOptionsHTML}
                        </div>
                    </div>
                `;
                
                // 使用统一的 Dialog 组件显示
                this.dialog.show({
                    title: '',
                    htmlContent: htmlContent,
                    type: 'info',
                    showCancel: true,
                    showConfirm: false,
                    cancelText: '取消',
                    width: '500px',
                    onShow: () => {
                        // 绑定项目选择事件
                        const projectOptions = document.querySelectorAll('.project-option-item');
                        projectOptions.forEach(option => {
                            option.addEventListener('click', () => {
                                const projectId = option.dataset.projectId;
                                const selectedProject = projectsList.find(p => p.id === projectId);
                                this.dialog.hide();
                                setTimeout(() => {
                                    resolve(selectedProject);
                                }, 350);
                            });
                        });
                    },
                    onCancel: () => {
                        resolve(null);
                    }
                });
            });
        });
    }

    // 添加缺失的方法
    async handleExportExcel(selectedMonth, selectedProject) {
        try {
            this.toast.info('正在生成Excel文件...');
            
            // 获取个人信息（使用项目特定的ID）
            const personalInfoKey = `personalInfo_${selectedProject.id}`;
            let personalInfo = await this.storage.get('personalInfo', personalInfoKey);
            console.log('DataManagement - personalInfo from key:', personalInfoKey, personalInfo);
            
            // 如果找不到项目特定的个人信息，尝试使用'current'
            if (!personalInfo || !personalInfo.name) {
                personalInfo = await this.storage.get('personalInfo', 'current');
                console.log('DataManagement - personalInfo from current:', personalInfo);
            }
            
            if (!personalInfo || !personalInfo.name) {
                this.toast.error('请先设置个人信息');
                return;
            }
            
            console.log('DataManagement - final personalInfo:', {
                name: personalInfo.name,
                wage: personalInfo.wage,
                monthlyWage: personalInfo.monthlyWage,
                wageCalculationMethod: personalInfo.wageCalculationMethod,
                overtimeRate: personalInfo.overtimeRate
            });
            
            // 检查工资设置（点工需要wage，全职需要monthlyWage）
            const hasWage = personalInfo.wage && personalInfo.wage > 0;
            const hasMonthlyWage = personalInfo.monthlyWage && personalInfo.monthlyWage > 0;
            if (!hasWage && !hasMonthlyWage) {
                this.toast.error('请先设置日工资或月工资标准');
                return;
            }
            
            // 获取所选月份的考勤数据
            const attendanceData = await this.storage.getAttendance(selectedProject.id);
            
            // 转换考勤数据为模板所需格式
            const projectData = {
                attendance: {},
                notes: {}
            };
            
            attendanceData.forEach(record => {
                if (record.date) {
                    projectData.attendance[record.date] = record.status;
                    // 只要有备注或加班数据，就创建notes对象
                    if (record.remark || record.overtime || record.overtimeType) {
                        projectData.notes[record.date] = {
                            note: record.remark || '',
                            overtime: record.overtime || 0,
                            overtimeType: record.overtimeType || 'weekday'
                        };
                    }
                }
            });
            
            // 使用ExportTemplates生成Excel内容
            const excelContent = ExportTemplates.generateExcel(personalInfo, selectedProject, selectedMonth, projectData);
            
            // 创建Blob对象并下载
            const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // 生成文件名
            const [year, month] = selectedMonth.split('-');
            const monthText = `${year}年${month}月`;
            a.download = `${monthText}_${personalInfo.name}_工资单.xls`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.toast.success('Excel文件导出成功');
        } catch (error) {
                console.error('导出Excel详细错误:', error);
                this.logger.error('Failed to export Excel:', { error: error.message, stack: error.stack });
                this.toast.error('导出失败: ' + error.message);
            }
    }

    async handleExportPdf(selectedMonth, selectedProject) {
        try {
            this.toast.info('正在生成打印文件...');
            
            // 获取个人信息（使用项目特定的ID）
            const personalInfoKey = `personalInfo_${selectedProject.id}`;
            let personalInfo = await this.storage.get('personalInfo', personalInfoKey);
            
            // 如果找不到项目特定的个人信息，尝试使用'current'
            if (!personalInfo || !personalInfo.name) {
                personalInfo = await this.storage.get('personalInfo', 'current');
            }
            
            if (!personalInfo || !personalInfo.name) {
                this.toast.error('请先设置个人信息');
                return;
            }
            
            // 检查工资设置（点工需要wage，全职需要monthlyWage）
            const hasWage = personalInfo.wage && personalInfo.wage > 0;
            const hasMonthlyWage = personalInfo.monthlyWage && personalInfo.monthlyWage > 0;
            if (!hasWage && !hasMonthlyWage) {
                this.toast.error('请先设置日工资或月工资标准');
                return;
            }
            
            // 获取所选月份的考勤数据
            const attendanceData = await this.storage.getAttendance(selectedProject.id);
            
            // 转换考勤数据为模板所需格式
            const projectData = {
                attendance: {},
                notes: {}
            };
            
            attendanceData.forEach(record => {
                if (record.date) {
                    projectData.attendance[record.date] = record.status;
                    if (record.remark || record.overtime || record.overtimeType) {
                        projectData.notes[record.date] = {
                            note: record.remark || '',
                            overtime: record.overtime || 0,
                            overtimeType: record.overtimeType || 'weekday'
                        };
                    }
                }
            });
            
            // 使用ExportTemplates生成HTML内容
            const htmlContent = ExportTemplates.generatePDF(personalInfo, selectedProject, selectedMonth, projectData);
            
            // 创建Blob对象并下载为HTML文件
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // 生成文件名
            const [year, month] = selectedMonth.split('-');
            const monthText = `${year}年${month}月`;
            a.download = `${monthText}_${personalInfo.name}_工资单.html`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.toast.success('打印文件导出成功，请在浏览器中打开并使用打印功能保存为PDF');
        } catch (error) {
                this.logger.error('Failed to export print file:', { error: error.message, stack: error.stack });
                this.toast.error('导出失败，请重试');
            }
    }

    async handleExportContacts() {
        try {
            this.toast.info('正在导出联系人...');
            
            // 获取所有联系人数据
            const contacts = await this.storage.getAll('contacts') || [];
            
            if (contacts.length === 0) {
                this.toast.error('暂无联系人数据');
                return;
            }
            
            // 生成CSV内容
            let csvContent = '姓名,电话,备注,项目\n';
            
            // 获取所有项目用于查找项目名称
            const projects = await this.storage.getAll('projects') || [];
            const projectMap = {};
            projects.forEach(project => {
                projectMap[project.id] = project.name || project.title || '未知项目';
            });
            
            contacts.forEach(contact => {
                const name = contact.name || '';
                const phone = contact.phone || '';
                const note = contact.note || '';
                // 使用 projectId 查找项目名称
                const projectId = contact.projectId || '';
                const projectName = projectMap[projectId] || (projectId ? '未知项目' : '');
                
                // 处理CSV中的特殊字符
                const escapeCsv = (value) => {
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                };
                
                csvContent += `${escapeCsv(name)},${escapeCsv(phone)},${escapeCsv(note)},${escapeCsv(projectName)}\n`;
            });
            
            // 创建Blob对象并下载，添加UTF-8 BOM头防止乱码
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `联系人列表_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.toast.success('联系人导出成功');
        } catch (error) {
                this.logger.error('Failed to export contacts:', { error: error.message, stack: error.stack });
                this.toast.error('导出失败，请重试');
            }
    }

    async handleCopyToClipboard() {
        try {
            this.toast.info('正在复制数据到剪贴板...');

            // 获取所有数据
            const [contacts, projects, wageHistory, personalInfo, holidays] = await Promise.all([
                this.storage.getAll('contacts'),
                this.storage.getAll('projects'),
                this.storage.getAll('wageHistory'),
                this.storage.get('personalInfo', 'current'),
                this.storage.getAll('holidays')
            ]);

            // 获取所有项目的考勤数据
            const attendanceByProject = {};
            if (projects && projects.length > 0) {
                for (const project of projects) {
                    const projectAttendance = await this.storage.getAttendance(project.id);
                    if (projectAttendance && projectAttendance.length > 0) {
                        attendanceByProject[project.id] = projectAttendance;
                    }
                }
            }

            // 构建导出数据
            const exportData = {
                contacts: contacts || [],
                projects: projects || [],
                attendance: attendanceByProject,
                wageHistory: wageHistory || [],
                personalInfo: personalInfo || {},
                holidays: holidays || [],
                exportTime: new Date().toISOString(),
                version: '1.0'
            };

            // 转换为JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 尝试复制到剪贴板
            let copySuccess = false;
            
            // 方法1: 使用现代 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(jsonString);
                    copySuccess = true;
                } catch (e) {
                    console.log('Clipboard API failed, trying fallback method');
                }
            }
            
            // 方法2: 使用传统方法（兼容非HTTPS环境）
            if (!copySuccess) {
                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    copySuccess = successful;
                } catch (e) {
                    document.body.removeChild(textArea);
                    throw new Error('无法复制到剪贴板');
                }
            }

            if (copySuccess) {
                this.toast.success('数据已成功复制到剪贴板');
            } else {
                throw new Error('复制失败');
            }
        } catch (error) {
            this.logger.error('Failed to copy to clipboard:', error);
            this.toast.error('复制失败，请重试');
        }
    }

    async handleSyncData() {
        try {
            this.toast.info('数据同步功能开发中...');
        } catch (error) {
                this.logger.error('Failed to sync data:', { error: error.message, stack: error.stack });
                this.toast.error('同步失败，请重试');
            }
    }

    async handleCloudRestore() {
        try {
            this.toast.info('数据恢复功能开发中...');
        } catch (error) {
                this.logger.error('Failed to restore data:', { error: error.message, stack: error.stack });
                this.toast.error('恢复失败，请重试');
            }
    }

    /**
     * 显示月份选择对话框（使用统一样式）
     * @returns {Promise<string>} 选中的月份
     */
    async showMonthSelectDialog() {
        return new Promise((resolve) => {
            // 生成最近12个月的选项
            const months = [];
            const today = new Date();
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
                const displayStr = `${year}年${month}月`;
                months.push({ value: monthStr, label: displayStr });
            }
            
            // 创建月份选择对话框HTML
            let monthOptionsHTML = '';
            months.forEach(month => {
                monthOptionsHTML += `
                    <div class="month-option-item" data-month="${month.value}">
                        <div class="month-option-label">${month.label}</div>
                    </div>
                `;
            });
            
            const htmlContent = `
                <div class="month-select-dialog">
                    <div class="month-select-title">
                        <i class="fas fa-calendar-alt"></i>选择月份
                    </div>
                    
                    <div class="month-options-list">
                        ${monthOptionsHTML}
                    </div>
                </div>
            `;
            
            // 使用统一的 Dialog 组件显示
            this.dialog.show({
                title: '',
                htmlContent: htmlContent,
                type: 'info',
                showCancel: true,
                showConfirm: false,
                cancelText: '取消',
                width: '500px',
                onShow: () => {
                    // 绑定月份选择事件
                    const monthOptions = document.querySelectorAll('.month-option-item');
                    monthOptions.forEach(option => {
                        option.addEventListener('click', () => {
                            const selectedMonth = option.dataset.month;
                            this.dialog.hide();
                            resolve(selectedMonth);
                        });
                    });
                },
                onCancel: () => {
                    resolve(null);
                }
            });
        });
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

// 添加全局引用
window.DataManagementPage = DataManagementPage;
}
