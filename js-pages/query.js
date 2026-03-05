

class QueryPage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;
        this.formDialog = new FormDialog(options.dialog);
        
        this.currentTab = 'wage-query';
        this.wageHistory = [];
        this.attendance = [];
        this.personalInfo = null;
    }

    async init() {
        // 检查是否已经初始化，避免重复初始化
        if (window.queryPageInitialized) {
            this.logger.info('Query page already initialized');
            return;
        }
        
        this.logger.info('Initializing query page...');
        
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
            
            // 优先从缓存加载
            await this.loadData();
            
            window.queryPageInitialized = true;
            this.logger.info('Query page initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize query page:', error);
            this.toast.error('页面初始化失败');
        }
    }

    async loadData() {
        try {
            // 先尝试从本地缓存加载数据，提高加载速度
            try {
                const cachedData = localStorage.getItem('cachedQueryData');
                if (cachedData) {
                    const { wageHistory, attendance, personalInfo } = JSON.parse(cachedData);
                    this.wageHistory = wageHistory || [];
                    this.attendance = attendance || [];
                    this.personalInfo = personalInfo;
                    this.logger.info('Data loaded from cache:', {
                        wageHistory: this.wageHistory.length,
                        attendance: this.attendance.length,
                        personalInfo: this.personalInfo ? 'loaded' : 'not loaded'
                    });
                    // 后台异步从服务器更新数据
                    this.updateDataFromServer();
                    return;
                }
            } catch (error) {
                this.logger.error('Failed to load data from cache:', error);
            }
            
            // 从服务器加载数据
            const [wageHistory, attendance, personalInfo] = await Promise.all([
                this.storage.getAll('wageHistory'),
                this.storage.getAll('attendance'),
                this.storage.get('personalInfo', 'current')
            ]);

            this.wageHistory = wageHistory || [];
            this.attendance = attendance || [];
            this.personalInfo = personalInfo;
            
            // 缓存数据到本地
            try {
                localStorage.setItem('cachedQueryData', JSON.stringify({
                    wageHistory: this.wageHistory,
                    attendance: this.attendance,
                    personalInfo: this.personalInfo
                }));
                this.logger.info('Data cached to localStorage');
            } catch (error) {
                this.logger.error('Failed to cache data:', error);
            }
            
            this.logger.info('Data loaded from server:', {
                wageHistory: this.wageHistory.length,
                attendance: this.attendance.length,
                personalInfo: this.personalInfo ? 'loaded' : 'not loaded'
            });
        } catch (error) {
            this.logger.error('Failed to load data:', error);
            this.wageHistory = [];
            this.attendance = [];
            this.personalInfo = null;
        }
    }
    
    // 后台异步从服务器更新数据
    async updateDataFromServer() {
        try {
            const [freshWageHistory, freshAttendance, freshPersonalInfo] = await Promise.all([
                this.storage.getAll('wageHistory'),
                this.storage.getAll('attendance'),
                this.storage.get('personalInfo', 'current')
            ]);
            
            const freshData = {
                wageHistory: freshWageHistory || [],
                attendance: freshAttendance || [],
                personalInfo: freshPersonalInfo
            };
            
            const currentData = {
                wageHistory: this.wageHistory,
                attendance: this.attendance,
                personalInfo: this.personalInfo
            };
            
            // 检查数据是否有变化
            if (JSON.stringify(freshData) !== JSON.stringify(currentData)) {
                this.wageHistory = freshData.wageHistory;
                this.attendance = freshData.attendance;
                this.personalInfo = freshData.personalInfo;
                
                this.logger.info('Data updated from server:', {
                    wageHistory: this.wageHistory.length,
                    attendance: this.attendance.length,
                    personalInfo: this.personalInfo ? 'loaded' : 'not loaded'
                });
                
                // 更新缓存
                try {
                    localStorage.setItem('cachedQueryData', JSON.stringify(freshData));
                } catch (error) {
                    this.logger.error('Failed to update data cache:', error);
                }
                
                // 更新UI
                this.renderTabContent();
            }
        } catch (error) {
            this.logger.error('Failed to update data from server:', error);
        }
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = this.getTemplate();
        this.renderTabContent();
    }

    getTemplate() {
        return `
            <main class="app-main">
                <div class="container">
                    <div class="section">
                        <div class="tabs">
                            <button class="tab-btn ${this.currentTab === 'wage-query' ? 'active' : ''}" data-tab="wage-query">
                                <i class="fas fa-search"></i>
                                工资查询
                            </button>
                            <button class="tab-btn ${this.currentTab === 'month-comparison' ? 'active' : ''}" data-tab="month-comparison">
                                <i class="fas fa-chart-bar"></i>
                                多月份对比
                            </button>
                            <button class="tab-btn ${this.currentTab === 'salary-trend' ? 'active' : ''}" data-tab="salary-trend">
                                <i class="fas fa-chart-line"></i>
                                工资趋势
                            </button>
                            <button class="tab-btn ${this.currentTab === 'attendance-stats' ? 'active' : ''}" data-tab="attendance-stats">
                                <i class="fas fa-chart-pie"></i>
                                考勤统计
                            </button>

                        </div>
                        <div id="tabContent"></div>
                    </div>
                </div>
            </main>
        `;
    }

    renderTabContent() {
        const container = document.getElementById('tabContent');
        if (!container) return;

        switch (this.currentTab) {
            case 'wage-query':
                this.renderWageQuery(container);
                break;
            case 'month-comparison':
                this.renderMonthComparison(container);
                break;
            case 'salary-trend':
                this.renderSalaryTrend(container);
                break;
            case 'attendance-stats':
                this.renderAttendanceStats(container);
                break;
        }
    }

    renderWageQuery(container) {
        const years = [...new Set(this.wageHistory.map(w => new Date(w.createdAt).getFullYear()))].sort((a, b) => b - a);
        const months = [...new Set(this.wageHistory.map(w => w.month))].sort();

        container.innerHTML = `
            <div class="card">
                <h3>工资查询</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">选择年份</label>
                        <select class="form-select" id="queryYear">
                            <option value="">全部年份</option>
                            ${years.map(year => `<option value="${year}">${year}年</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">选择月份</label>
                        <select class="form-select" id="queryMonth">
                            <option value="">全部月份</option>
                            ${months.map(month => `<option value="${month}">${month}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-full" data-action="query-wage">
                    <i class="fas fa-search"></i>
                    查询
                </button>
            </div>
            <div id="queryResult" class="grid grid-auto-fit gap-4 mt-4"></div>
        `;
    }

    renderMonthComparison(container) {
        const years = [...new Set(this.wageHistory.map(w => new Date(w.createdAt).getFullYear()))].sort((a, b) => b - a);

        container.innerHTML = `
            <div class="card">
                <h3>多月份对比</h3>
                <div class="form-group">
                    <label class="form-label">选择对比月份（可多选）</label>
                    <div class="checkbox-group">
                        ${this.wageHistory.map(w => `
                            <label class="checkbox-label">
                                <input type="checkbox" class="form-checkbox" value="${w.month}" data-month="${w.month}">
                                ${w.month}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <button class="btn btn-primary w-full" data-action="compare-months">
                    <i class="fas fa-chart-bar"></i>
                    对比
                </button>
            </div>
            <div id="comparisonResult" class="card mt-4"></div>
        `;
    }

    renderSalaryTrend(container) {
        const years = [...new Set(this.wageHistory.map(w => new Date(w.createdAt).getFullYear()))].sort((a, b) => b - a);

        container.innerHTML = `
            <div class="card">
                <h3>工资趋势</h3>
                <div class="form-group">
                    <label class="form-label">选择年份</label>
                    <select class="form-select" id="trendYear">
                        ${years.map(year => `<option value="${year}">${year}年</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-primary w-full" data-action="show-trend">
                    <i class="fas fa-chart-line"></i>
                    显示趋势
                </button>
            </div>
            <div id="trendResult" class="card mt-4"></div>
        `;
    }

    renderAttendanceStats(container) {
        const years = [...new Set(this.attendance.map(a => new Date(a.date).getFullYear()))].sort((a, b) => b - a);
        const months = [...new Set(this.attendance.map(a => a.date.substring(0, 7)))].sort();

        container.innerHTML = `
            <div class="card">
                <h3>考勤统计</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">选择年份</label>
                        <select class="form-select" id="statsYear">
                            <option value="">全部年份</option>
                            ${years.map(year => `<option value="${year}">${year}年</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">选择月份</label>
                        <select class="form-select" id="statsMonth">
                            <option value="">全部月份</option>
                            ${months.map(month => `<option value="${month}">${month}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-full" data-action="show-stats">
                    <i class="fas fa-chart-pie"></i>
                    统计
                </button>
            </div>
            <div id="statsResult" class="card mt-4"></div>
        `;
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
                    this.closeMenu();
                    break;
                case 'query-wage':
                    this.handleQueryWage();
                    break;
                case 'compare-months':
                    this.handleCompareMonths();
                    break;
                case 'show-trend':
                    this.handleShowTrend();
                    break;
                case 'show-stats':
                    this.handleShowStats();
                    break;
                case 'sync-data':
                    this.handleSyncData();
                    break;
                case 'cloud-restore':
                    this.handleCloudRestore();
                    break;
            }
        });

        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'queryYear' || e.target.id === 'queryMonth') {
                this.handleQueryWage();
            }
        });

        this.container.addEventListener('click', (e) => {
            const tabEl = e.target.closest('[data-tab]');
            if (!tabEl) return;
            
            const tab = tabEl.dataset.tab;
            this.currentTab = tab;
            this.renderTabs();
            this.renderTabContent();
        });
    }

    renderTabs() {
        const tabs = this.container.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            if (tab.dataset.tab === this.currentTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    handleQueryWage() {
        const year = document.getElementById('queryYear')?.value;
        const month = document.getElementById('queryMonth')?.value;
        const resultContainer = document.getElementById('queryResult');

        if (!resultContainer) return;

        // 显示加载状态
        resultContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        `;

        // 模拟加载延迟
        setTimeout(() => {
            let filtered = this.wageHistory;
            
            if (year) {
                filtered = filtered.filter(w => new Date(w.createdAt).getFullYear().toString() === year);
            }
            
            if (month) {
                filtered = filtered.filter(w => w.month === month);
            }

            if (filtered.length === 0) {
                resultContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>没有找到符合条件的工资记录</p>
                        <p class="text-sm text-secondary">请先在主页记录工资数据</p>
                    </div>
                `;
                return;
            }

            // 计算统计数据
            const totalWage = filtered.reduce((sum, w) => sum + (parseFloat(w.totalWage) || 0), 0);
            const averageWage = filtered.length > 0 ? Math.round(totalWage / filtered.length) : 0;
            const totalWorkDays = filtered.reduce((sum, w) => sum + (parseFloat(w.workDays) || 0), 0);

            // 生成查询结果
            resultContainer.innerHTML = `
                <div class="query-header mb-4">
                    <h4>查询结果 (${filtered.length} 条记录)</h4>
                    <div class="query-stats grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div class="stat-card">
                            <div class="stat-content">
                                <div class="stat-label">总工资</div>
                                <div class="stat-value text-primary">${Utils.formatCurrency(totalWage)}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-content">
                                <div class="stat-label">平均工资</div>
                                <div class="stat-value">${Utils.formatCurrency(averageWage)}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-content">
                                <div class="stat-label">总工作天数</div>
                                <div class="stat-value">${totalWorkDays} 天</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-auto-fit gap-4">
                    ${filtered.map(wage => {
                        const wageValue = parseFloat(wage.totalWage) || 0;
                        const workDaysValue = parseFloat(wage.workDays) || 0;
                        return `
                        <div class="wage-card">
                            <div class="wage-card-header">
                                <h3>${wage.month}</h3>
                                <span class="wage-tag">${wageValue > averageWage ? '高于平均' : wageValue < averageWage ? '低于平均' : '平均水平'}</span>
                            </div>
                            <div class="wage-card-body">
                                <div class="wage-info">
                                    <div class="info-item">
                                        <i class="fas fa-calendar-alt"></i>
                                        <span>${workDaysValue} 天</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-money-bill-wave"></i>
                                        <span>${Utils.formatCurrency(wageValue)}</span>
                                    </div>
                                    ${wage.overtime ? `
                                        <div class="info-item">
                                            <i class="fas fa-clock"></i>
                                            <span>加班 ${wage.overtime} 小时</span>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="wage-card-footer">
                                    <p class="text-sm text-secondary">${wage.createdAt || ''}</p>
                                </div>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            `;
        }, 300);
    }

    handleCompareMonths() {
        const checkedMonths = Array.from(document.querySelectorAll('.form-checkbox:checked')).map(cb => cb.value);
        const resultContainer = document.getElementById('comparisonResult');

        if (checkedMonths.length < 2) {
            this.toast.warning('请至少选择2个月进行对比');
            return;
        }

        // 显示加载状态
        resultContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        `;

        // 模拟加载延迟
        setTimeout(() => {
            const selectedWages = this.wageHistory.filter(w => checkedMonths.includes(w.month));
            
            if (selectedWages.length === 0) {
                resultContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <p>没有找到符合条件的工资记录</p>
                        <p class="text-sm text-secondary">请先在主页记录工资数据</p>
                    </div>
                `;
                return;
            }

            // 计算对比数据
            const maxWage = Math.max(...selectedWages.map(w => parseFloat(w.totalWage) || 0));
            const minWage = Math.min(...selectedWages.map(w => parseFloat(w.totalWage) || 0));
            const averageWage = selectedWages.length > 0 ? Math.round(selectedWages.reduce((sum, w) => sum + (parseFloat(w.totalWage) || 0), 0) / selectedWages.length) : 0;
            const totalWage = selectedWages.reduce((sum, w) => sum + (parseFloat(w.totalWage) || 0), 0);

            // 生成对比结果
            resultContainer.innerHTML = `
                <h4 class="mb-4">月份对比结果</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- 对比图表 -->
                    <div class="comparison-chart">
                        <h5 class="mb-3">工资对比</h5>
                        <div class="chart-container">
                            ${selectedWages.map(wage => {
                                const wageValue = parseFloat(wage.totalWage) || 0;
                                const percentage = maxWage > 0 ? Math.round((wageValue / maxWage) * 100) : 0;
                                const isMax = wageValue === maxWage;
                                const isMin = wageValue === minWage;
                                return `
                                    <div class="chart-item">
                                        <div class="chart-label">${wage.month}</div>
                                        <div class="chart-bar">
                                            <div class="chart-fill ${isMax ? 'success' : isMin ? 'warning' : ''}" style="height: ${percentage}%">
                                                <span class="chart-value">${Utils.formatCurrency(wageValue)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- 对比表格和统计 -->
                    <div>
                        <h5 class="mb-3">详细对比</h5>
                        <div class="overflow-x-auto">
                            <table class="table comparison-table">
                                <thead>
                                    <tr>
                                        <th>月份</th>
                                        <th>工作天数</th>
                                        <th>总工资</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${selectedWages.map(wage => `
                                        <tr>
                                            <td>${wage.month}</td>
                                            <td>${wage.workDays}</td>
                                            <td>${Utils.formatCurrency(wage.totalWage)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- 对比统计 -->
                        <div class="comparison-summary mt-4 p-4 bg-primary/5 rounded-lg">
                            <h6 class="text-primary mb-2">对比统计</h6>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="summary-item">
                                    <div class="summary-label">最高工资</div>
                                    <div class="summary-value text-success">${Utils.formatCurrency(maxWage)}</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">最低工资</div>
                                    <div class="summary-value text-warning">${Utils.formatCurrency(minWage)}</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">平均工资</div>
                                    <div class="summary-value">${Utils.formatCurrency(averageWage)}</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">总工资</div>
                                    <div class="summary-value text-primary font-bold">${Utils.formatCurrency(totalWage)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }, 500);
    }

    handleShowTrend() {
        const year = document.getElementById('trendYear')?.value;
        const resultContainer = document.getElementById('trendResult');

        if (!year) {
            this.toast.warning('请选择年份');
            return;
        }

        // 显示加载状态
        resultContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        `;

        // 模拟加载延迟，提升用户体验
        setTimeout(async () => {
            const yearWages = this.wageHistory.filter(w => new Date(w.createdAt).getFullYear().toString() === year);
            
            if (yearWages.length === 0) {
                resultContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <p>该年份没有工资记录</p>
                        <p class="text-sm text-secondary">请先在主页记录工资数据</p>
                    </div>
                `;
                return;
            }

            // 按月份排序
            const monthOrder = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            yearWages.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

            // 计算最大值用于比例计算
            const maxWage = Math.max(...yearWages.map(w => parseFloat(w.totalWage) || 0));

            // 生成趋势图表
            resultContainer.innerHTML = `
                <h4 class="mb-4">${year}年工资趋势</h4>
                <div class="trend-chart">
                    ${yearWages.map(wage => {
                        const wageValue = parseFloat(wage.totalWage) || 0;
                        const percentage = maxWage > 0 ? Math.min((wageValue / maxWage) * 100, 100) : 0;
                        return `
                            <div class="trend-item">
                                <div class="trend-month">${wage.month}</div>
                                <div class="trend-bar-container">
                                    <div class="trend-bar">
                                        <div class="trend-fill" style="width: ${percentage}%" data-value="${Utils.formatCurrency(wageValue)}">
                                            <span class="trend-tooltip">${Utils.formatCurrency(wageValue)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="trend-value">${Utils.formatCurrency(wageValue)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="trend-summary mt-4 p-4 bg-primary/5 rounded-lg">
                    <h5 class="text-primary mb-2">年度工资 summary</h5>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="summary-item">
                            <div class="summary-label">月平均工资</div>
                            <div class="summary-value">${Utils.formatCurrency(yearWages.reduce((sum, w) => sum + (parseFloat(w.totalWage) || 0), 0) / (yearWages.length || 1))}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">最高月工资</div>
                            <div class="summary-value text-success">${Utils.formatCurrency(Math.max(...yearWages.map(w => parseFloat(w.totalWage) || 0)))}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">最低月工资</div>
                            <div class="summary-value text-warning">${Utils.formatCurrency(Math.min(...yearWages.map(w => parseFloat(w.totalWage) || 0)))}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">年度总工资</div>
                            <div class="summary-value text-primary font-bold">${Utils.formatCurrency(yearWages.reduce((sum, w) => sum + (parseFloat(w.totalWage) || 0), 0))}</div>
                        </div>
                    </div>
                </div>
            `;
        }, 500);
    }

    handleShowStats() {
        const year = document.getElementById('statsYear')?.value;
        const month = document.getElementById('statsMonth')?.value;
        const resultContainer = document.getElementById('statsResult');

        if (!resultContainer) return;

        // 显示加载状态
        resultContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        `;

        // 模拟加载延迟
        setTimeout(() => {
            let filtered = this.attendance;
            
            if (year) {
                filtered = filtered.filter(a => new Date(a.date).getFullYear().toString() === year);
            }
            
            if (month) {
                filtered = filtered.filter(a => a.date.startsWith(month));
            }

            if (filtered.length === 0) {
                resultContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>没有找到符合条件的考勤记录</p>
                        <p class="text-sm text-secondary">请先在主页记录考勤数据</p>
                    </div>
                `;
                return;
            }

            // 计算考勤统计数据
            const presentDays = filtered.filter(a => a.status === 'present').length;
            const halfDays = filtered.filter(a => a.status === 'half').length;
            const absentDays = filtered.filter(a => a.status === 'absent').length;
            const totalDays = filtered.length;

            // 计算百分比
            const presentPercent = Math.round((presentDays / totalDays) * 100);
            const halfPercent = Math.round((halfDays / totalDays) * 100);
            const absentPercent = Math.round((absentDays / totalDays) * 100);

            // 生成考勤统计结果
            resultContainer.innerHTML = `
                <h4 class="mb-4">考勤统计</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- 统计卡片 -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">总天数</div>
                                <div class="stat-value">${totalDays}</div>
                                <div class="stat-change">天</div>
                            </div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">满勤</div>
                                <div class="stat-value">${presentDays}</div>
                                <div class="stat-change">${presentPercent}%</div>
                            </div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-icon">
                                <i class="fas fa-adjust"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">半天</div>
                                <div class="stat-value">${halfDays}</div>
                                <div class="stat-change">${halfPercent}%</div>
                            </div>
                        </div>
                        <div class="stat-card error">
                            <div class="stat-icon">
                                <i class="fas fa-times-circle"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">缺勤</div>
                                <div class="stat-value">${absentDays}</div>
                                <div class="stat-change">${absentPercent}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- 考勤状态分布 -->
                    <div class="attendance-distribution">
                        <h5 class="mb-3">考勤状态分布</h5>
                        <div class="distribution-chart">
                            <div class="distribution-item">
                                <div class="distribution-label">
                                    <span class="status-dot success"></span>
                                    满勤
                                </div>
                                <div class="distribution-bar">
                                    <div class="distribution-fill success" style="width: ${presentPercent}%"></div>
                                </div>
                                <div class="distribution-value">${presentPercent}%</div>
                            </div>
                            <div class="distribution-item">
                                <div class="distribution-label">
                                    <span class="status-dot warning"></span>
                                    半天
                                </div>
                                <div class="distribution-bar">
                                    <div class="distribution-fill warning" style="width: ${halfPercent}%"></div>
                                </div>
                                <div class="distribution-value">${halfPercent}%</div>
                            </div>
                            <div class="distribution-item">
                                <div class="distribution-label">
                                    <span class="status-dot error"></span>
                                    缺勤
                                </div>
                                <div class="distribution-bar">
                                    <div class="distribution-fill error" style="width: ${absentPercent}%"></div>
                                </div>
                                <div class="distribution-value">${absentPercent}%</div>
                            </div>
                        </div>

                        <!-- 考勤总结 -->
                        <div class="attendance-summary mt-4 p-4 bg-primary/5 rounded-lg">
                            <h6 class="text-primary mb-2">考勤总结</h6>
                            <p class="text-sm">
                                ${presentPercent >= 80 ? '🎉 考勤表现优秀！' : presentPercent >= 60 ? '💪 考勤表现良好' : '⚠️ 考勤需要改进'}<br>
                                满勤率 ${presentPercent}%，共 ${totalDays} 天记录
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }, 500);
    }

    toggleMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    closeMenu() {
        const menu = document.getElementById('mobileMenu');
        if (menu) {
            menu.classList.remove('show');
            // 移除内联样式，确保后续的toggle操作能正常工作
            setTimeout(() => {
                menu.style.display = '';
            }, 300);
        }
    }

    async handleSyncData() {
        try {
            this.logger.info('开始同步查询数据到云端...');
            console.log('user_id:', localStorage.getItem('user_id'));
            console.log('this.cloudSync:', this.cloudSync);
            
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
            console.log('user_id:', localStorage.getItem('user_id'));
            console.log('this.cloudSync:', this.cloudSync);
            
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
        this.logger.info('Destroying query page...');
        this.container.innerHTML = '';
        this.logger.info('Query page destroyed');
    }
}

// 添加全局引用
window.QueryPage = QueryPage;
