// 确保必要的全局对象存在
// 确保FormDialog存在
window.FormDialog = window.FormDialog || function (dialog) {
    return {
        show: function (options) {
            if (dialog && dialog.show) {
                dialog.show(options);
            }
        }
    };
};

// 确保FestivalEffect存在
window.FestivalEffect = window.FestivalEffect || function () {
    return {
        init: function () {},
        show: function () {}
    };
};

class HomePage {
    constructor(options) {
        this.container = options.container;
        this.eventBus = options.eventBus;
        this.storage = options.storage;
        this.theme = options.theme;
        this.toast = options.toast;
        this.dialog = options.dialog;
        this.logger = options.logger;

        this.currentMonth = new Date();
        this.personalInfo = null;
        this.projects = [];
        this.currentProjectId = null;
        this.attendance = [];
        this.selectedDate = null;
        this.holidays = [];
        this.eventsBound = false;
        this.projectData = {};
        
        this.timers = [];
        this.eventListeners = [];
        this.showDailyWage = true;
        
        // 月份锁定数据
        this.monthLocks = {};
    }

    get WEEK_DAYS() {
        return ['日', '一', '二', '三', '四', '五', '六'];
    }

    async init() {
        try {
            // 初始化默认节日数据，确保倒计时有数据显示
            this.holidays = [
                // 最近的法定节假日
                { id: '1', date: '2026-02-17', name: '春节' },
                { id: '2', date: '2026-02-18', name: '春节' },
                { id: '3', date: '2026-02-19', name: '春节' },
                { id: '4', date: '2026-02-20', name: '春节' },
                { id: '5', date: '2026-02-21', name: '春节' },
                { id: '6', date: '2026-02-22', name: '春节' },
                { id: '7', date: '2026-02-23', name: '春节' },
                { id: '8', date: '2026-04-04', name: '清明节' },
                { id: '9', date: '2026-04-05', name: '清明节' },
                { id: '10', date: '2026-04-06', name: '清明节' }
            ];

            // 加载月份锁定数据
            this.loadMonthLocks();

            // 显示骨架屏
            this.showSkeleton();

            // 1. 首先渲染页面基本结构，确保用户能看到内容
            this.render();

            // 2. 绑定事件，确保用户可以与页面交互（只绑定一次）
            this.bindEvents();

            // 3. 渲染假日倒计时
            this.renderHolidayCountdown();

            // 4. 快速加载本地数据，不显示加载状态
            try {
                await this.loadLocalData();
                
                await this.updateAll();

                // 隐藏骨架屏，显示实际内容
                this.hideSkeleton();

                this.loadLatestData().catch(error => {
                    this.logger.error('后台加载数据失败:', error);
                });
            } catch (dataError) {
                this.logger.error('Failed to load local data:', dataError);
                await this.updateAll();
                // 隐藏骨架屏
                this.hideSkeleton();
            }

            this.eventBus.on('project:switched', async (data) => {
                if (data.projectId) {
                    if (String(data.projectId) !== String(this.currentProjectId)) {
                        this.currentProjectId = data.projectId;
                    }
                    try {
                        this.showDataLoading();
                        
                        await this.loadData();
                        
                        await this.updateAll();
                    } catch (switchError) {
                        this.logger.error('Failed to switch project:', switchError);
                        this.toast.error('项目切换失败');
                        await this.updateAll();
                    }
                }
            });
            
            this.eventBus.on('project:status-updated', async (data) => {
                try {
                    this.showDataLoading();
                    
                    await this.loadData();
                    
                    await this.updateAll();
                } catch (error) {
                    this.logger.error('Failed to update project status:', error);
                }
            });
            
            this.eventBus.on('attendance:updated', async (data) => {
                try {
                    this.showDataLoading();
                    
                    await this.loadData();
                    
                    await this.updateAll();
                } catch (error) {
                    this.logger.error('Failed to update attendance:', error);
                }
            });
            
            window.addEventListener('storage', (event) => {
                if (event.key === 'attendanceUpdated') {
                    this.loadData().then(() => {
                        this.updateAll();
                    }).catch(error => {
                        this.logger.error('Failed to update attendance from localStorage event:', error);
                    });
                } else if (event.key === 'personalInfo') {
                    try {
                        const updatedPersonalInfo = JSON.parse(event.newValue);
                        this.personalInfo = updatedPersonalInfo;
                        this.updatePersonalInfo();
                        // 如果是工资相关字段，还需要更新统计信息
                        if (updatedPersonalInfo.wage || updatedPersonalInfo.monthlyWage || updatedPersonalInfo.overtimeRate) {
                            this.updatePartial({ statistics: true });
                        }
                    } catch (error) {
                        this.logger.error('Failed to update personal info from localStorage event:', error);
                    }
                }
            });
            
            // 监听来自个人中心的更新通知
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'personalInfoUpdated') {
                    // 更新本地个人信息
                    if (this.personalInfo) {
                        this.personalInfo[event.data.field] = event.data.value;
                    } else {
                        this.personalInfo = { [event.data.field]: event.data.value };
                    }
                    // 更新UI
                    this.updatePersonalInfo();
                    // 如果是工资相关字段，还需要更新统计信息
                    if (['wage', 'monthlyWage', 'overtimeRate'].includes(event.data.field)) {
                        this.updatePartial({ statistics: true });
                    }
                }
            });
        } catch (error) {
            this.logger.error('Failed to initialize home page:', error);
            this.toast.error('页面初始化失败');
            this.render();
            if (!this.eventsBound) {
                this.bindEvents();
            }
        }
    }

    render() {
        if (!this.container) {
            console.error('Container is not defined, cannot render home page');
            return;
        }

        try {
            this.container.innerHTML = this.getTemplate();
            this.renderHolidayCountdown();
            // 更新锁定按钮状态
            this.updateMonthLockButton();
        } catch (renderError) {
            console.error('Failed to render home page:', renderError);
        }
    }

    // 显示顶部进度条
    showProgressBar() {
        const progressBar = document.getElementById('top-progress-bar');
        if (progressBar) {
            progressBar.classList.add('active');
        }
    }

    // 隐藏顶部进度条
    hideProgressBar() {
        const progressBar = document.getElementById('top-progress-bar');
        if (progressBar) {
            progressBar.classList.remove('active');
        }
    }

    // 显示骨架屏
    showSkeleton() {
        const skeletonContainer = document.getElementById('skeleton-container');
        const appContent = document.getElementById('app-content');
        if (skeletonContainer) {
            skeletonContainer.classList.add('active');
        }
        if (appContent) {
            appContent.style.display = 'none';
        }
        // 同时显示进度条
        this.showProgressBar();
    }

    // 隐藏骨架屏
    hideSkeleton() {
        const skeletonContainer = document.getElementById('skeleton-container');
        const appContent = document.getElementById('app-content');
        if (skeletonContainer) {
            skeletonContainer.classList.remove('active');
        }
        if (appContent) {
            appContent.style.display = '';
            appContent.style.opacity = '1';
        }
        // 同时隐藏进度条
        this.hideProgressBar();
    }

    // 显示数据加载状态
    showDataLoading() {
        // 使用骨架屏和进度条替代原来的加载动画
        this.showSkeleton();
    }

    async loadData() {
        try {
            // 1. 加载当前项目ID
            await this.loadCurrentProjectId();
            
            // 2. 加载项目和个人信息
            await this.loadProjectsAndPersonalInfo();
            
            // 3. 处理项目排序和当前项目设置
            this.processProjectOrder();
            
            // 4. 加载考勤和节日数据
            await this.loadAttendanceAndHolidays();
            
            // 5. 检查并使用默认节日数据
            this.checkAndSetDefaultHolidays();
            
            // 6. 检查考勤数据
            await this.checkAttendanceData();
            
        } catch (error) {
            this.logger.error('Failed to load data:', error);
            // 使用默认数据
            this.personalInfo = null;
            this.projects = [];
            this.attendance = [];
            this.holidays = [];
        }
    }

    // 加载当前项目ID
    async loadCurrentProjectId() {
        try {
            const currentProjectId = this.storage.getLocal('currentProjectId');
            this.currentProjectId = currentProjectId;
        } catch (error) {
            console.error('获取当前项目ID失败:', error);
            this.currentProjectId = null;
        }
        
        // 只有当localStorage中没有值时，才从服务器获取currentProjectId
        if (!this.currentProjectId) {
            try {
                const userSettings = await this.storage.getAll('userSettings');
                if (userSettings && Array.isArray(userSettings)) {
                    const currentProjectSetting = userSettings.find(setting => setting.key === 'currentProjectId');
                    if (currentProjectSetting) {
                        // 只有当localStorage中没有值时，才使用服务器的值
                        this.currentProjectId = currentProjectSetting.value;
                        // 保存到localStorage
                        this.storage.setLocal('currentProjectId', this.currentProjectId);
                    }
                }
            } catch (error) {
                console.error('从服务器获取currentProjectId失败:', error);
            }
        }
    }

    // 从API加载最新项目数据
    async loadProjectsFromAPI() {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;
        
        try {
            const response = await fetch(`/jg/api/get-projects.php?user_id=${userId}`);
            const data = await response.json();
            if (data.success && data.projects) {
                // 保存到localStorage，以便下次使用
                localStorage.setItem('projects', JSON.stringify(data.projects));
                
                // 处理项目数据
                const processedProjects = data.projects.map(project => {
                    // 转换isEnded字段为布尔类型，处理服务器返回的数字类型
                    if (project.isEnded !== undefined) {
                        project.isEnded = Boolean(project.isEnded);
                    }
                    if (!project.personalInfo) {
                        project.personalInfo = {
                            name: '',
                            phone: ''
                        };
                    } else {
                        // 确保personalInfo中有name和phone字段
                        if (!project.personalInfo.name) {
                            project.personalInfo.name = '';
                        }
                        if (!project.personalInfo.phone) {
                            project.personalInfo.phone = '';
                        }
                    }
                    return project;
                });
                
                return processedProjects;
            }
        } catch (apiError) {
            console.error('从API加载项目数据失败:', apiError);
        }
        return null;
    }

    // 加载项目和个人信息
    async loadProjectsAndPersonalInfo() {
        let projects = [];
        let personalInfo = null;
        
        try {
            // 优先从localStorage加载项目数据，实现秒开
            const localStorageData = localStorage.getItem('projects');
            if (localStorageData) {
                try {
                    projects = JSON.parse(localStorageData);
                } catch (parseError) {
                    console.error('解析localStorage项目数据失败:', parseError);
                    projects = [];
                }
            }
            
            // 从localStorage加载当前项目的个人信息（避免网络请求）
            const personalInfoKey = `personalInfo_${this.currentProjectId}`;
            const personalInfoData = localStorage.getItem(personalInfoKey);
            if (personalInfoData) {
                try {
                    personalInfo = JSON.parse(personalInfoData);
                } catch (parseError) {
                    console.error('解析个人信息失败:', parseError);
                }
            }
            
            // 如果当前项目没有，尝试加载全局个人信息
            if (!personalInfo) {
                const globalPersonalInfoData = localStorage.getItem('personalInfo');
                if (globalPersonalInfoData) {
                    try {
                        personalInfo = JSON.parse(globalPersonalInfoData);
                    } catch (parseError) {
                        console.error('解析全局个人信息失败:', parseError);
                    }
                }
            }
            
            // 如果localStorage没有数据，从IndexedDB加载
            if (projects.length === 0) {
                try {
                    // 检查缓存时间，避免频繁请求
                    const cacheKey = 'projects_cache_time';
                    const lastCacheTime = localStorage.getItem(cacheKey);
                    const now = Date.now();
                    const CACHE_DURATION = 30000; // 30秒缓存
                    
                    if (!lastCacheTime || (now - parseInt(lastCacheTime)) >= CACHE_DURATION) {
                        const storageProjects = await this.storage.getAll('projects');
                        if (storageProjects && storageProjects.length > 0) {
                            projects = storageProjects;
                            localStorage.setItem('projects', JSON.stringify(projects));
                            localStorage.setItem(cacheKey, now.toString());
                        }
                    }
                } catch (dbError) {
                    console.error('从IndexedDB加载项目数据失败:', dbError);
                }
            }
        } catch (localError) {
            console.error('从localStorage加载数据失败:', localError);
        }
        
        this.personalInfo = personalInfo || {};
        
        // 确保每个项目都有personalInfo字段和正确的isEnded类型
        this.projects = projects.map(project => {
            if (project.isEnded !== undefined) {
                project.isEnded = Boolean(project.isEnded);
            }
            if (!project.personalInfo) {
                project.personalInfo = { name: '', phone: '' };
            } else {
                if (!project.personalInfo.name) project.personalInfo.name = '';
                if (!project.personalInfo.phone) project.personalInfo.phone = '';
            }
            return project;
        });
        
        // 处理项目顺序和当前项目设置（关键：确保总是有项目被选择）
        this.processProjectOrder();
        
        // 后台异步从API获取最新数据，不阻塞页面加载
        this.setTimeoutSafe(async () => {
            try {
                // 加载项目
                const apiProjects = await this.loadProjectsFromAPI();
                if (apiProjects && JSON.stringify(apiProjects) !== JSON.stringify(this.projects)) {
                    const currentProjectId = this.currentProjectId; // 保存当前项目ID
                    this.projects = apiProjects;
                    // 保持当前项目ID不变，只在没有项目时才自动选择
                    if (!currentProjectId) {
                        this.processProjectOrder();
                    } else {
                        // 确保当前项目ID在新的项目列表中
                        const projectExists = this.projects.some(p => String(p.id) === String(currentProjectId));
                        if (projectExists) {
                            this.currentProjectId = currentProjectId;
                        } else {
                            this.processProjectOrder();
                        }
                    }
                    this.renderProjects();
                }
                
                // 加载个人信息
                const latestPersonalInfo = await this.loadLatestPersonalInfo();
                if (latestPersonalInfo) {
                    this.personalInfo = latestPersonalInfo;
                    this.updatePersonalInfo();
                }
            } catch (error) {
                this.logger.error('后台加载数据失败:', error);
            }
        }, 100);
    }

    // 加载个人信息
    async loadPersonalInfo() {
        // 尝试从服务器加载最新个人信息（优先）
        try {
            const userId = localStorage.getItem('user_id');
            if (userId) {
                const response = await fetch(`/jg/api/get-user-info.php?user_id=${userId}`);
                const data = await response.json();
                if (data.success) {
                    const personalInfo = data.user;
                    // 保存到全局localStorage
                    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
                    // 保存到项目特定的localStorage
                    const personalInfoKey = `personalInfo_${this.currentProjectId}`;
                    localStorage.setItem(personalInfoKey, JSON.stringify(personalInfo));
                    return personalInfo;
                }
            }
        } catch (error) {
            console.error('从服务器加载个人信息失败:', error);
        }
        
        // 如果服务器加载失败，从localStorage加载作为备选
        const personalInfoKey = `personalInfo_${this.currentProjectId}`;
        const personalInfoData = localStorage.getItem(personalInfoKey);
        if (personalInfoData) {
            try {
                const personalInfo = JSON.parse(personalInfoData);
                return personalInfo;
            } catch (parseError) {
                console.error('解析个人信息失败:', parseError);
            }
        }
        
        // 如果当前项目没有个人信息，尝试加载全局个人信息作为默认值
        const globalPersonalInfoData = localStorage.getItem('personalInfo');
        if (globalPersonalInfoData) {
            try {
                const personalInfo = JSON.parse(globalPersonalInfoData);
                return personalInfo;
            } catch (parseError) {
                console.error('解析全局个人信息失败:', parseError);
            }
        }
        
        return null;
    }
    
    // 后台加载最新个人信息
    async loadLatestPersonalInfo() {
        try {
            const userId = localStorage.getItem('user_id');
            if (userId) {
                const response = await fetch(`/jg/api/get-user-info.php?user_id=${userId}`);
                const data = await response.json();
                if (data.success) {
                    const personalInfo = data.user;
                    // 保存到全局localStorage
                    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
                    // 保存到项目特定的localStorage
                    const personalInfoKey = `personalInfo_${this.currentProjectId}`;
                    localStorage.setItem(personalInfoKey, JSON.stringify(personalInfo));
                    // 更新UI
                    this.personalInfo = personalInfo;
                    this.updatePersonalInfo();
                }
            }
        } catch (error) {
            console.error('后台从服务器加载个人信息失败:', error);
        }
    }

    // 处理项目排序和当前项目设置
    processProjectOrder() {
        if (this.projects.length > 0) {
            // 根据order字段排序，确保项目顺序保持一致
            this.projects.sort((a, b) => {
                const orderA = a.order || 9999;
                const orderB = b.order || 9999;
                return orderA - orderB;
            });
            
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
            
            // 如果没有当前项目ID，设置第一个未结束的项目为当前项目
            if (!this.currentProjectId) {
                const activeProject = this.projects.find(p => !p.isEnded) || this.projects[0];
                this.currentProjectId = activeProject.id;
                this.storage.setLocal('currentProjectId', this.currentProjectId);
            }
            
            // 如果有当前项目且它不在列表的第一个位置，将其移到第一个位置
            if (this.currentProjectId) {
                const currentProjectIndex = this.projects.findIndex(p => String(p.id) === String(this.currentProjectId));
                if (currentProjectIndex > 0) {
                    const currentProject = this.projects.splice(currentProjectIndex, 1)[0];
                    this.projects.unshift(currentProject);
                    // 更新所有项目的排序字段
                    this.projects.forEach((proj, index) => {
                        proj.order = index;
                    });
                    // 保存更新后的项目列表（异步，不阻塞）
                    this.saveProjectOrder();
                }
            }
        }
    }

    // 保存项目排序
    async saveProjectOrder() {
        try {
            for (const proj of this.projects) {
                await this.storage.set('projects', proj);
            }
            // 同时更新localStorage中的项目列表，确保顺序一致
            localStorage.setItem('projects', JSON.stringify(this.projects));
        } catch (saveError) {
            this.logger.error('Failed to save project order:', saveError);
        }
    }

    // 加载考勤和节日数据
    async loadAttendanceAndHolidays() {
        try {
            // 首先从localStorage加载考勤数据（确保页面秒开）
            await this.loadAttendanceFromLocalStorage();
            
            // 然后从localStorage加载节日数据
            this.loadHolidaysFromLocalStorage();
            
            // 如果localStorage没有数据且currentProjectId已设置，从IndexedDB加载
            if (this.currentProjectId) {
                if (this.attendance.length === 0) {
                    try {
                        const dbAttendance = await this.storage.getAttendance(this.currentProjectId);
                        if (dbAttendance && dbAttendance.length > 0) {
                            this.attendance = dbAttendance;
                            localStorage.setItem('attendance', JSON.stringify(dbAttendance));
                        }
                    } catch (dbError) {
                        console.error('从IndexedDB加载考勤数据失败:', dbError);
                    }
                }
                
                if (this.holidays.length === 0) {
                    try {
                        const dbHolidays = await this.storage.getHolidays(this.currentProjectId);
                        if (dbHolidays && dbHolidays.length > 0) {
                            this.holidays = dbHolidays;
                            localStorage.setItem('holidays', JSON.stringify(dbHolidays));
                        }
                    } catch (dbError) {
                        console.error('从IndexedDB加载节假日数据失败:', dbError);
                    }
                }
            }
            
            // 检查缓存时间，避免频繁网络请求
            const cacheKey = 'attendance_cache_time';
            const lastCacheTime = localStorage.getItem(cacheKey);
            const now = Date.now();
            const CACHE_DURATION = 60000; // 1分钟缓存
            
            // 只有当缓存过期或没有数据时，才从服务器同步数据
            if (this.currentProjectId && (!lastCacheTime || (now - parseInt(lastCacheTime)) >= CACHE_DURATION)) {
                const userId = localStorage.getItem('user_id');
                this.setTimeoutSafe(async () => {
                    try {
                        // 从服务器同步节假日数据
                        if (userId) {
                            const holidaysResponse = await fetch('api/data.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    action: 'getHolidays', 
                                    user_id: userId, 
                                    projectId: this.currentProjectId 
                                })
                            });
                            const holidaysResult = await holidaysResponse.json();
                            if (holidaysResult.success && holidaysResult.data && holidaysResult.data.length > 0) {
                                this.holidays = holidaysResult.data;
                                localStorage.setItem('holidays', JSON.stringify(this.holidays));
                                for (const h of this.holidays) {
                                    await this.storage.set('holidays', h);
                                }
                                this.renderHolidayCountdown();
                            }
                        }
                        
                        // 从服务器同步考勤数据（关键：每次都同步，确保跨设备一致）
                        if (userId) {
                            const attendanceResponse = await fetch('api/data.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    action: 'getAttendance', 
                                    user_id: userId, 
                                    projectId: this.currentProjectId 
                                })
                            });
                            const attendanceResult = await attendanceResponse.json();
                            if (attendanceResult.success && attendanceResult.data && attendanceResult.data.length > 0) {
                                // 比较本地和服务器数据，只在有变化时更新
                                const localAttendance = JSON.stringify(this.attendance);
                                const serverAttendance = JSON.stringify(attendanceResult.data);
                                
                                if (localAttendance !== serverAttendance) {
                                    this.attendance = attendanceResult.data;
                                    localStorage.setItem('attendance', serverAttendance);
                                    for (const a of this.attendance) {
                                        await this.storage.set('attendance', a);
                                    }
                                    await this.updateAll();
                                }
                            }
                        }
                        
                        // 更新缓存时间
                        localStorage.setItem(cacheKey, now.toString());
                    } catch (serverError) {
                        console.error('后台从服务器加载考勤和节日数据失败:', serverError);
                    }
                }, 500);
            }
        } catch (attendanceError) {
            this.logger.error('Failed to load attendance data:', attendanceError);
            this.attendance = [];
            this.holidays = [];
            
            this.loadHolidaysFromLocalStorage();
            await this.loadAttendanceFromLocalStorage();
        }
    }

    // 检查并使用默认节日数据
    checkAndSetDefaultHolidays() {
        // 只在从存储中加载节日数据失败时才使用默认的节日数据
        if (this.holidays.length === 0) {
            this.holidays = [
                // 最近的法定节假日
                { id: '1', date: '2026-02-17', name: '春节' },
                { id: '2', date: '2026-02-18', name: '春节' },
                { id: '3', date: '2026-02-19', name: '春节' },
                { id: '4', date: '2026-02-20', name: '春节' },
                { id: '5', date: '2026-02-21', name: '春节' },
                { id: '6', date: '2026-02-22', name: '春节' },
                { id: '7', date: '2026-02-23', name: '春节' },
                { id: '8', date: '2026-04-04', name: '清明节' },
                { id: '9', date: '2026-04-05', name: '清明节' },
                { id: '10', date: '2026-04-06', name: '清明节' }
            ];
        }
    }

    // 检查考勤数据
    async checkAttendanceData() {
        // 检查是否有项目但没有考勤数据
        if (this.projects.length > 0 && this.currentProjectId && this.attendance.length === 0) {
            // 尝试直接从localStorage获取考勤数据
            await this.loadAttendanceFromLocalStorage();
        }
    }

    // 快速加载本地数据
    async loadLocalData() {
        try {
            // 1. 加载当前项目ID
            await this.loadCurrentProjectId();
            
            // 2. 加载项目和个人信息（优先从localStorage）
            await this.loadProjectsAndPersonalInfo();
            
            // 3. 处理项目排序和当前项目设置
            this.processProjectOrder();
            
            // 3.5 如果localStorage没有项目，从IndexedDB加载
            if (this.projects.length === 0) {
                try {
                    const dbProjects = await this.storage.getAll('projects');
                    if (dbProjects && dbProjects.length > 0) {
                        this.projects = dbProjects;
                        localStorage.setItem('projects', JSON.stringify(dbProjects));
                        // 重新处理项目排序
                        this.processProjectOrder();
                    }
                } catch (error) {
                    this.logger.error('从IndexedDB加载项目失败:', error);
                }
            }
            
            // 4. 确保currentProjectId已设置后再加载考勤数据
            // 如果processProjectOrder设置了currentProjectId，需要重新加载考勤
            if (this.currentProjectId) {
                console.log('开始加载考勤数据...', this.currentProjectId);
                // 先从IndexedDB加载考勤数据（优先确保有数据）
                try {
                    console.log('从IndexedDB加载考勤数据...');
                    const dbAttendance = await this.storage.getAttendance(this.currentProjectId);
                    console.log('从IndexedDB加载考勤数据成功:', dbAttendance.length);
                    if (dbAttendance && dbAttendance.length > 0) {
                        this.attendance = dbAttendance;
                        localStorage.setItem('attendance', JSON.stringify(dbAttendance));
                        console.log('考勤数据已保存到localStorage');
                    } else {
                        console.log('IndexedDB中没有考勤数据，尝试从localStorage加载');
                        // IndexedDB没有数据，尝试从localStorage加载
                        await this.loadAttendanceFromLocalStorage();
                        console.log('从localStorage加载考勤数据成功:', this.attendance.length);
                    }
                } catch (error) {
                    console.error('从IndexedDB加载考勤数据失败:', error);
                    // IndexedDB加载失败，尝试从localStorage加载
                    await this.loadAttendanceFromLocalStorage();
                    console.log('从localStorage加载考勤数据成功:', this.attendance.length);
                }
                
                // 加载节假日数据
                try {
                    const dbHolidays = await this.storage.getHolidays(this.currentProjectId);
                    if (dbHolidays && dbHolidays.length > 0) {
                        this.holidays = dbHolidays;
                        localStorage.setItem('holidays', JSON.stringify(dbHolidays));
                    } else {
                        this.loadHolidaysFromLocalStorage();
                    }
                } catch (error) {
                    this.loadHolidaysFromLocalStorage();
                }
            } else {
                // 没有currentProjectId，从localStorage加载
                await this.loadAttendanceFromLocalStorage();
                this.loadHolidaysFromLocalStorage();
            }
            
            console.log('考勤数据加载完成:', this.attendance.length);
            
            // 5. 检查并使用默认节日数据
            this.checkAndSetDefaultHolidays();
            
            // 6. 检查考勤数据
            await this.checkAttendanceData();
            
            console.log('所有数据加载完成');
            
        } catch (error) {
            this.logger.error('Failed to load local data:', error);
            // 使用默认数据
            this.personalInfo = null;
            this.projects = [];
            this.attendance = [];
            this.holidays = [];
        }
    }

    // 后台加载最新数据
    async loadLatestData() {
        try {
            // 1. 从服务器获取最新的项目数据
            const apiProjects = await this.loadProjectsFromAPI();
            if (apiProjects) {
                this.projects = apiProjects;
                this.processProjectOrder();
            }
            
            // 2. 从服务器获取最新的个人信息
            if (this.currentProjectId) {
                try {
                    const personalInfo = await this.storage.get('personalInfo', `personalInfo_${this.currentProjectId}`);
                    if (personalInfo) {
                        this.personalInfo = personalInfo;
                    }
                } catch (error) {
                    this.logger.error('Failed to load latest personal info:', error);
                }
            }
            
            await this.updateAll();
        } catch (error) {
            this.logger.error('Failed to load latest data:', error);
        }
    }

    async updateAll() {
        try {
            console.log('开始执行updateAll...');
            
            // 先加载数据，确保数据已准备就绪
            console.log('加载考勤数据...');
            await this.loadAttendanceFromLocalStorage();
            console.log('考勤数据加载完成:', this.attendance.length);
            
            console.log('加载节假日数据...');
            this.loadHolidaysFromLocalStorage();
            
            console.log('开始渲染UI...');
            
            // 渲染UI
            this.render();
            this.updatePersonalInfo();
            this.renderProjects();
            this.renderCalendar();
            this.updateStatistics();
            this.renderWorkTable();
            
            console.log('updateAll执行完成');
        } catch (error) {
            this.logger.error('Failed to update all:', error);
        }
    }

    updatePartial(options = {}) {
        try {
            if (options.render) this.render();
            if (options.personalInfo) this.updatePersonalInfo();
            if (options.projects) this.renderProjects();
            if (options.calendar) this.renderCalendar();
            if (options.statistics) this.updateStatistics();
            if (options.workTable) this.renderWorkTable();
            if (options.holidayCountdown) this.renderHolidayCountdown();
        } catch (error) {
            this.logger.error('Failed to update partial:', error);
        }
    }

    getTemplate() {
        return `
                <div class="container">
                    <div class="section" id="personalInfoSection">
                        <div class="section-header">
                            <h2 class="section-title"><i class="fas fa-user-circle"></i> 个人信息</h2>
                            <div class="section-actions">
                                <button class="btn btn-primary btn-sm" data-action="edit-info">
                                    <i class="fas fa-edit"></i>
                                    编辑信息
                                </button>
                            </div>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">姓名</div>
                                <div class="info-value clickable" id="workerName">请设置姓名</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">工种</div>
                                <div class="info-value clickable" id="workerType">请填写工种</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">日工资</div>
                                <div class="info-value clickable" id="workerWage">¥0/天</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">月工资</div>
                                <div class="info-value clickable" id="monthlyWage" style="display: flex; align-items: center; gap: 6px;">¥0/月<i class="fas fa-question-circle" id="monthlyWageTooltip" style="font-size: 12px; color: var(--text-secondary); cursor: help;"></i></div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">加班工资倍率</div>
                                <div class="info-value clickable" id="overtimeRate">0倍（无加班费）</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">当前月份</div>
                                <div class="info-value" id="currentMonthText">2026年2月</div>
                            </div>
                        </div>
                    </div>

                    <div class="section" id="projectInfoSection">
                        <div class="section-header">
                            <h2 class="section-title"><i class="fas fa-project-diagram"></i> 项目信息</h2>
                            <div class="section-actions">
                                <button class="btn btn-primary btn-sm" data-action="new-project">
                                    <i class="fas fa-plus"></i>
                                    新建项目
                                </button>
                            </div>
                        </div>
                        <div id="projectList" class="grid grid-auto-fit gap-2"></div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title"><i class="fas fa-calendar-check"></i> 出勤记录</h2>
                            <span class="inline-countdown" id="holidayCountdown">
                                加载中...
                            </span>
                        </div>
                        <div class="calendar-header">
                            <div class="calendar-nav">
                                <button class="btn btn-ghost btn-sm" data-action="prev-month">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                            </div>
                            <div class="calendar-title" id="calendarTitle">2026年2月</div>
                            <div class="calendar-nav" style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn btn-ghost btn-sm" id="monthLockBtn" data-action="toggle-month-lock" title="锁定/解锁月份">
                                    <i class="fas fa-unlock"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm" data-action="next-month">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="calendar-grid">
                            <div class="week-days">
                                <div class="week-day">日</div>
                                <div class="week-day">一</div>
                                <div class="week-day">二</div>
                                <div class="week-day">三</div>
                                <div class="week-day">四</div>
                                <div class="week-day">五</div>
                                <div class="week-day">六</div>
                            </div>
                            <div class="calendar-days" id="calendarDays"></div>
                        </div>
                        <div id="paidDaysSummary" style="margin-top: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 6px; font-size: 13px; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-info-circle" style="color: var(--primary-color);"></i>
                            <span id="paidDaysSummaryText">本月计薪天数：0天</span>
                        </div>
                        <div class="action-bar" style="display: flex; gap: 10px; width: 100%;" id="attendanceActionBar">
                            <button class="btn btn-success" data-action="set-present" style="flex: 1;" id="btnPresent">
                                <i class="fas fa-check"></i>
                                满勤
                            </button>
                            <button class="btn btn-warning" data-action="set-half" style="flex: 1;" id="btnHalf">
                                <i class="fas fa-adjust"></i>
                                半天
                            </button>
                            <button class="btn btn-error" data-action="set-absent" style="flex: 1;" id="btnAbsent">
                                <i class="fas fa-times"></i>
                                缺勤
                            </button>
                            <button class="btn btn-secondary" data-action="clear-attendance" style="flex: 1;" id="btnClear">
                                <i class="fas fa-eraser"></i>
                                清除
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title"><i class="fas fa-clipboard-list"></i> 本月工作记录</h2>
                            <button id="toggleDailyWageBtn" data-action="toggle-daily-wage" class="btn btn-sm" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px 8px; font-size: 14px;">
                                <i class="fas fa-eye" id="toggleDailyWageIcon"></i>
                            </button>
                        </div>
                        <div id="workTableContainer">
                            <!-- 工作记录表格将在这里动态生成 -->
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-header">
                            <h2 class="section-title"><i class="fas fa-chart-line"></i> 工资统计</h2>
                            <button class="btn btn-primary btn-sm" id="showWageCalcBtn" data-action="show-wage-calc">
                                <i class="fas fa-calculator"></i> 计算说明
                            </button>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%); color: white;">
                                <div class="stat-label" style="color: rgba(255,255,255,0.9);">实发工资 <i class="fas fa-question-circle" id="actualWageTooltip" style="font-size: 14px; color: rgba(255,255,255,0.7); cursor: help;" title="实发工资 = 总工资 + 补贴 + 加班费"></i></div>
                                <div class="stat-value" id="actualWage" style="font-size: 32px; font-weight: 700; color: white;">¥0</div>
                                <div class="stat-change" id="actualWageFormula" style="color: rgba(255,255,255,0.8); font-size: 12px;">总工资+补贴+加班费</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">工作天数</div>
                                <div class="stat-value" id="workDays">0</div>
                                <div class="stat-change positive" id="workDaysDetail">天</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">加班小时</div>
                                <div class="stat-value" id="overtimeHours">0</div>
                                <div class="stat-change positive">小时</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">加班费</div>
                                <div class="stat-value" id="overtimeWage">¥0</div>
                                <div class="stat-change positive">元</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">补贴</div>
                                <div class="stat-value" id="subsidyWage">¥0</div>
                                <div class="stat-change positive">元</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">总工资 <i class="fas fa-question-circle" id="totalWageTooltip" style="font-size: 11px; color: var(--text-secondary); cursor: help;" title="总工资 = 日薪 × 计薪天数"></i></div>
                                <div class="stat-value" id="totalWage">¥0</div>
                                <div class="stat-change positive" id="totalWageFormula" style="font-size: 10px; color: var(--text-secondary);">日薪×计薪天数</div>
                            </div>
                        </div>
                    </div>


                </div>
        `;
    }

    updatePersonalInfo() {
        if (this.personalInfo) {
            const nameEl = document.getElementById('workerName');
            const typeEl = document.getElementById('workerType');
            const wageEl = document.getElementById('workerWage');
            const monthlyWageEl = document.getElementById('monthlyWage');
            const overtimeRateEl = document.getElementById('overtimeRate');
            const currentMonthEl = document.getElementById('currentMonthText');

            if (nameEl) {
                nameEl.textContent = this.personalInfo.name || '请设置姓名';
                nameEl.style.color = 'var(--text-color)';
            }
            if (typeEl) {
                typeEl.textContent = this.personalInfo.job || '请填写工种';
                typeEl.style.color = 'var(--text-color)';
            }
            if (wageEl) {
                // 显示日工资：点工直接显示设置的日工资，全职根据月工资计算
                let displayWage = this.personalInfo.wage || 0;
                const isFullTime = this.personalInfo.employeeType === 'fullTime';
                
                if (isFullTime) {
                    // 全职：根据月工资和计算方式计算日工资
                    const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
                    const monthlyWage = this.personalInfo.monthlyWage || 0;
                    
                    if (monthlyWage > 0) {
                        if (wageCalculationMethod === 'currentMonth') {
                            // 按当月天数计算
                            const currentYear = this.currentMonth.getFullYear();
                            const currentMonthNum = this.currentMonth.getMonth() + 1;
                            const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                            displayWage = monthlyWage / daysInMonth;
                        } else if (wageCalculationMethod === 'natural') {
                            displayWage = monthlyWage / 30;
                        } else if (wageCalculationMethod === 'legal') {
                            displayWage = monthlyWage / 21.75;
                        } else if (wageCalculationMethod === 'attendance') {
                            displayWage = monthlyWage / 26;
                        }
                    }
                }
                // 点工：直接显示 personalInfo.wage，不做计算
                // 全职：显示日工资和计算依据
                let wageText = Utils.formatCurrency(displayWage) + '/天';
                if (isFullTime && this.personalInfo.monthlyWage > 0) {
                    const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
                    const monthlyWage = this.personalInfo.monthlyWage;
                    let calcDesc = '';
                    let divisor = 30;
                    
                    if (wageCalculationMethod === 'currentMonth') {
                        const currentYear = this.currentMonth.getFullYear();
                        const currentMonthNum = this.currentMonth.getMonth() + 1;
                        divisor = new Date(currentYear, currentMonthNum, 0).getDate();
                        calcDesc = `按当月${divisor}天`;
                    } else if (wageCalculationMethod === 'natural') {
                        divisor = 30;
                        calcDesc = '按自然日30天';
                    } else if (wageCalculationMethod === 'legal') {
                        divisor = 21.75;
                        calcDesc = '按法定21.75天';
                    } else if (wageCalculationMethod === 'attendance') {
                        divisor = 26;
                        calcDesc = '按标准26天';
                    }
                    
                    const dailyWage = monthlyWage / divisor;
                    wageText = `${Utils.formatCurrency(dailyWage)}/天 (${monthlyWage}÷${divisor})`;
                }
                
                wageEl.textContent = wageText;
                wageEl.style.color = 'var(--text-color)';
            }
            if (monthlyWageEl) {
                // 点工显示预估满勤工资，全职显示实际月工资
                let displayMonthlyWage = this.personalInfo.monthlyWage || 0;
                const isFullTime = this.personalInfo.employeeType === 'fullTime';
                
                if (!isFullTime) {
                    const currentYear = this.currentMonth.getFullYear();
                    const currentMonthNum = this.currentMonth.getMonth() + 1;
                    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                    displayMonthlyWage = (this.personalInfo.wage || 0) * daysInMonth;
                }
                
                // 构建月薪显示文本和tooltip
                let tooltipText = '';
                if (isFullTime && this.personalInfo.monthlyWage > 0) {
                    const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
                    const currentYear = this.currentMonth.getFullYear();
                    const currentMonthNum = this.currentMonth.getMonth() + 1;
                    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                    
                    let calcMethodText = '';
                    let divisor = 30;
                    
                    if (wageCalculationMethod === 'currentMonth') {
                        divisor = daysInMonth;
                        calcMethodText = `按当月天数（${divisor}天）`;
                    } else if (wageCalculationMethod === 'natural') {
                        divisor = 30;
                        calcMethodText = '按自然日（30天）';
                    } else if (wageCalculationMethod === 'legal') {
                        divisor = 21.75;
                        calcMethodText = '按法定工作日（21.75天）';
                    } else if (wageCalculationMethod === 'attendance') {
                        divisor = 26;
                        calcMethodText = '按标准工作日（26天）';
                    }
                    
                    tooltipText = `本月工资计算方式：${calcMethodText}核算，出勤、休息、放假均计薪`;
                } else if (!isFullTime) {
                    tooltipText = '点工按月预估满勤工资，按实际出勤天数计算';
                }
                
                monthlyWageEl.innerHTML = `${Utils.formatCurrency(displayMonthlyWage)}/月<i class="fas fa-question-circle" id="monthlyWageTooltip" style="font-size: 12px; color: var(--text-secondary); cursor: help; margin-left: 6px;" title="${tooltipText}"></i>`;
                monthlyWageEl.style.color = 'var(--text-color)';
            }
            if (overtimeRateEl) {
                const rate = this.personalInfo.overtimeRate || 0;
                overtimeRateEl.textContent = rate === 0 ? '0倍（无加班费）' : rate + '倍';
                overtimeRateEl.style.color = 'var(--text-color)';
            }
            if (currentMonthEl) {
                const year = this.currentMonth.getFullYear();
                const month = this.currentMonth.getMonth() + 1;
                currentMonthEl.textContent = `${year}年${month}月`;
                currentMonthEl.style.color = 'var(--text-color)';
            }
        }
    }

    renderProjects() {
        const container = document.getElementById('projectList');
        if (!container) return;

        if (this.projects.length === 0) {
            container.innerHTML = '<div class="info-item">' +
                '<div class="info-label">项目状态</div>' +
                '<div class="info-value">暂无项目</div>' +
                '<div class="no-projects-info">请点击"新建项目"按钮创建</div>' +
            '</div>';
            return;
        }

        // 准备要显示的项目
        let displayProjects = [...this.projects];

        // 检测设备类型
        const isMobile = window.innerWidth <= 768;

        // 手机端显示两个项目
        if (isMobile) {
            // 手机端：只显示前两个项目
            displayProjects = displayProjects.slice(0, 2);
        } else {
            // 电脑端：当项目数量小于3时，添加"其它项目"的占位项目，确保总共显示3个项目
            while (displayProjects.length < 3) {
                displayProjects.push({ 
                    id: 'other_' + displayProjects.length, 
                    name: '其它项目', 
                    address: '', 
                    workHours: {
                        morningStart: '08:00',
                        morningEnd: '12:00',
                        afternoonStart: '14:00',
                        afternoonEnd: '18:00'
                    }
                });
            }

            // 只显示前三个项目
            displayProjects = displayProjects.slice(0, 3);
        }

        // 渲染项目列表
        container.innerHTML = displayProjects.map((project) => {
            const isCurrentProject = String(this.currentProjectId) === String(project.id);
            const workHours = project.workHours;

            // 为"其它项目"占位项目添加特殊样式
            const isOtherProject = String(project.id).startsWith('other');
            // 检查项目是否已结束
            const isEndedProject = !isOtherProject && Boolean(project.isEnded);

            // 构建CSS类名
            let projectClasses = 'project-item';
            if (isCurrentProject) projectClasses += ' current-project';
            if (isEndedProject) projectClasses += ' ended-project';
            if (isOtherProject) projectClasses += ' other-project';

            // 为已结束的项目添加特殊标记
            const endedBadge = isEndedProject ? '<div class="ended-badge">已结束</div>' : '';
            
            // 为当前项目添加徽章
            const currentBadge = isCurrentProject ? '<div class="current-badge">当前项目</div>' : '';
            
            // 为激活项目添加徽章（非当前项目且未结束）
            const isActiveProject = !isCurrentProject && !isEndedProject && !isOtherProject;
            const activeBadge = isActiveProject ? '<div class="active-badge">进行中</div>' : '';

            // 判断是否为"其它项目"
            if (isOtherProject) {
                return '<div ' +
                'class="' + projectClasses + '" ' +
                'data-project-id="' + project.id + '" ' +
                '>' +
                '<div class="other-project-badge">占位</div>' +
                '<div class="card-inner">' +
                    '<div class="card-front">' +
                        '<div class="project-item-content">' +
                            '<div class="project-item-name"><i class="fas fa-plus-circle"></i> ' + project.name + '</div>' +
                            '<div class="project-item-hint">点击"新建项目"添加更多项目</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
            }

            return '<div ' +
                'class="' + projectClasses + '" ' +
                'data-project-id="' + project.id + '" ' +
                '>' +
                endedBadge +
                currentBadge +
                activeBadge +
                '<div class="card-inner">' +
                    '<div class="card-front">' +
                        '<div class="project-item-content">' +
                            '<div class="project-item-name">' + project.name + '</div>' +
                            (workHours ? '<div class="project-item-workhours">上午：' + workHours.morningStart + ':' + (workHours.morningStartMin || '00') + ' - ' + workHours.morningEnd + ':' + (workHours.morningEndMin || '00') + '</div>' : '') +
                            (workHours ? '<div class="project-item-workhours">下午：' + workHours.afternoonStart + ':' + (workHours.afternoonStartMin || '00') + ' - ' + workHours.afternoonEnd + ':' + (workHours.afternoonEndMin || '00') + '</div>' : '') +
                            (project.address ? '<div class="project-item-address">地址：' + project.address + '</div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="card-back">' +
                        '<div class="project-item-content">' +
                            '<div class="close-card-btn" data-project-id="' + project.id + '">×</div>' +
                            '<div class="project-item-details">已切换到项目：<strong>' + project.name + '</strong></div>' +
                            (project.personalInfo && project.personalInfo.name !== undefined ? '<div class="project-item-manager"><strong>项目经理：</strong>' + (project.personalInfo.name || '未设置') + '</div>' : '') +
                            (project.personalInfo && project.personalInfo.phone !== undefined ? '<div class="project-item-phone"><strong>联系电话：</strong><a href="tel:' + project.personalInfo.phone + '" class="text-primary hover:underline">' + (project.personalInfo.phone || '未设置') + '<i class="fas fa-phone-alt"></i></a></div>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        // 事件委托已经在bindEvents中处理，这里不需要重复绑定
        // 移除单独的事件监听器，使用全局事件委托
    }

    renderCalendar() {
        const container = document.getElementById('calendarDays');
        const titleEl = document.getElementById('calendarTitle');
        if (!container || !titleEl) return;
        
        // 清除之前设置的临时样式
        container.style.position = '';
        container.style.height = '';
        container.style.overflow = '';

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        titleEl.textContent = `${year}年${month + 1}月`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        // 使用文档片段减少DOM操作次数
        const fragment = document.createDocumentFragment();
        
        // 添加空白日期
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day-item empty';
            fragment.appendChild(emptyDay);
        }

        // 生成日历天数
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateStr = Utils.formatDate(date);
            const dayOfWeek = date.getDay();
            const attendance = this.attendance.find(a => a.date === dateStr);
            const selectedClass = this.selectedDate === dateStr ? 'selected' : '';
            const isHoliday = this.holidays.some(h => h.date === dateStr);
            const holidayClass = isHoliday ? 'holiday' : '';
            const today = new Date();
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const todayClass = isToday ? 'today' : '';
            
            // 根据休息制度计算是否为休息日
            let isRestDay = false;
            const restSystem = this.personalInfo?.restSystem || 'doubleRest';
            
            if (restSystem === 'doubleRest') {
                // 双休：周六周日休息
                isRestDay = dayOfWeek === 0 || dayOfWeek === 6;
            } else if (restSystem === 'singleRest') {
                // 单休：周日休息
                isRestDay = dayOfWeek === 0;
            }
            
            const restDayClass = isRestDay ? 'rest-day' : '';
            
            // 确定状态类和图标
            let statusClass = '';
            let statusIcon = '';
            
            if (attendance) {
                // 有考勤记录的情况
                if (attendance.status === 'present') {
                    statusClass = 'attendance-present';
                    statusIcon = '<i class="fas fa-check-circle status-icon status-icon-present"></i>';
                } else if (attendance.status === 'half') {
                    statusClass = 'attendance-half';
                    statusIcon = '<i class="fas fa-adjust status-icon status-icon-half"></i>';
                } else if (attendance.status === 'absent') {
                    // 根据缺勤原因显示不同的图标和颜色，与对话框保持一致
                    if (attendance.remark === '请假') {
                        statusClass = 'attendance-leave';
                        statusIcon = '<i class="fas fa-calendar-check status-icon status-icon-leave"></i>';
                    } else if (attendance.remark === '放假') {
                        statusClass = 'attendance-holiday';
                        statusIcon = '<i class="fas fa-umbrella-beach status-icon status-icon-holiday"></i>';
                    } else if (attendance.remark === '休息') {
                        statusClass = 'attendance-rest';
                        statusIcon = '<i class="fas fa-bed status-icon status-icon-rest"></i>';
                    } else {
                        statusClass = 'attendance-absent';
                        statusIcon = '<i class="fas fa-times-circle status-icon status-icon-absent"></i>';
                    }
                }
            }
            
            // 创建日期元素
            const dayItem = document.createElement('div');
            dayItem.className = `day-item ${statusClass} ${selectedClass} ${holidayClass} ${todayClass} ${restDayClass}`;
            dayItem.setAttribute('data-date', dateStr);
            
            // 日期数字
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayItem.appendChild(dayNumber);
            
            // 今天标记
            if (isToday) {
                const todayBadge = document.createElement('span');
                todayBadge.className = 'today-badge';
                todayBadge.textContent = '今';
                dayItem.appendChild(todayBadge);
            }
            
            // 节假日标记
            if (isHoliday) {
                const holiday = this.holidays.find(h => h.date === dateStr);
                if (holiday) {
                    const holidayBadge = document.createElement('span');
                    holidayBadge.className = 'holiday-badge';
                    holidayBadge.textContent = holiday.name;
                    dayItem.appendChild(holidayBadge);
                }
            }
            
            // 状态图标
            if (statusIcon) {
                dayItem.insertAdjacentHTML('beforeend', statusIcon);
            }
            
            fragment.appendChild(dayItem);
        }

        // 一次性更新DOM
        container.innerHTML = '';
        container.appendChild(fragment);

        // 更新计薪天数统计
        this.updatePaidDaysSummary();

        // 更新锁定按钮状态
        this.updateMonthLockButton();
    }

    // 更新计薪天数统计
    updatePaidDaysSummary() {
        const summaryEl = document.getElementById('paidDaysSummaryText');
        if (!summaryEl) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const isFullTime = this.personalInfo?.employeeType === 'fullTime';

        let presentDays = 0;
        let halfDays = 0;
        let holidayDays = 0;
        let restDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = Utils.formatDate(date);
            const attendance = this.attendance.find(a => a.date === dateStr);

            if (attendance) {
                if (attendance.status === 'present') {
                    presentDays++;
                } else if (attendance.status === 'half') {
                    halfDays++;
                } else if (attendance.status === 'absent') {
                    if (attendance.remark === '放假') {
                        holidayDays++;
                    } else if (attendance.remark === '休息') {
                        restDays++;
                    }
                }
            }
        }

        let summaryText = '';
        
        if (isFullTime) {
            // 全职：出勤+半天+放假+休息都计薪
            const totalPaidDays = presentDays + halfDays + holidayDays + restDays;
            const halfDaysText = halfDays > 0 ? `+${halfDays}个半天` : '';
            const holidayRestText = (holidayDays + restDays) > 0 ? `+休息/放假${holidayDays + restDays}天` : '';
            
            summaryText = `本月计薪天数：${totalPaidDays}天`;
            if (presentDays > 0 || halfDays > 0 || holidayDays > 0 || restDays > 0) {
                summaryText += `（出勤${presentDays}天${halfDaysText}${holidayRestText}）`;
            }
        } else {
            // 点工：只有实际出勤天数计薪
            const workDays = presentDays + halfDays * 0.5;
            const halfDaysText = halfDays > 0 ? `（含${halfDays}个半天）` : '';
            
            summaryText = `本月工作天数：${workDays}天${halfDaysText}`;
            if (presentDays === 0 && halfDays === 0) {
                summaryText = '本月暂无工作记录';
            }
        }

        summaryEl.textContent = summaryText;
    }

    // 更新月份锁定按钮显示状态
    updateMonthLockButton() {
        const lockBtn = document.getElementById('monthLockBtn');
        if (!lockBtn) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const isLocked = this.isMonthLocked(year, month);

        if (isLocked) {
            lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
            lockBtn.title = '该月已锁定，点击解锁';
            lockBtn.classList.add('btn-warning');
            lockBtn.classList.remove('btn-ghost');
        } else {
            lockBtn.innerHTML = '<i class="fas fa-unlock"></i>';
            lockBtn.title = '该月未锁定，点击锁定';
            lockBtn.classList.add('btn-ghost');
            lockBtn.classList.remove('btn-warning');
        }

        // 更新考勤按钮状态
        this.updateAttendanceButtonsState(isLocked);
    }

    // 更新考勤按钮状态（根据锁定状态禁用/启用）
    updateAttendanceButtonsState(isLocked) {
        const buttons = ['btnPresent', 'btnHalf', 'btnAbsent', 'btnClear'];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (isLocked) {
                    btn.disabled = true;
                    btn.classList.add('btn-disabled');
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.disabled = false;
                    btn.classList.remove('btn-disabled');
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            }
        });
    }

    updateStatistics() {
        // 获取当前月份的年份和月份
        const currentYear = this.currentMonth.getFullYear();
        const currentMonth = this.currentMonth.getMonth() + 1;
        const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        // 只过滤出当前月份的考勤记录
        const currentMonthAttendance = this.attendance.filter(a => {
            return a.date.startsWith(currentMonthStr);
        });

        // 计算当月总天数
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        // 计算考勤统计数据
        const attendanceStats = this.calculateAttendanceStats(currentMonthAttendance, daysInMonth);
        
        // 计算加班统计数据
        const overtimeStats = this.calculateOvertimeStats(currentMonthAttendance);
        
        // 计算工资
        const wageStats = this.calculateWage(attendanceStats, overtimeStats, currentMonthAttendance.length > 0);
        
        // 更新统计数据显示
        this.updateStatisticsDisplay(attendanceStats, overtimeStats, wageStats);

        // 只有当有考勤数据时，才存储工资历史记录（后台异步）
        if (currentMonthAttendance.length > 0) {
            this.saveWageHistory(currentYear, currentMonth, attendanceStats.workDays, wageStats.totalWage, overtimeStats.totalOvertimeHours).catch(error => {
                this.logger.error('保存工资历史失败:', error);
            });
        }
    }

    // 计算考勤统计数据
    calculateAttendanceStats(attendanceData, daysInMonth) {
        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let restDays = 0;
        let holidayDays = 0;
        
        attendanceData.forEach(a => {
            if (a.status === 'present') {
                presentDays += 1;
            } else if (a.status === 'half') {
                halfDays += 1;
            } else if (a.status === 'absent') {
                if (a.remark === '请假') {
                    absentDays += 1;
                } else if (a.remark === '休息') {
                    restDays += 1;
                } else if (a.remark === '放假') {
                    holidayDays += 1;
                }
            }
        });

        // 计算未考勤的天数（需要扣工资）
        // 记录的天数包括：出勤 + 半天 + 请假 + 休息 + 放假
        const recordedDays = presentDays + halfDays + absentDays + restDays + holidayDays;
        const unrecordedDays = Math.max(0, daysInMonth - recordedDays);
        // 只将未考勤的天数加到 absentDays 中（需要扣工资）
        absentDays += unrecordedDays;
        
        // 计算工作天数（出勤 + 半天×0.5）
        const workDays = presentDays + (halfDays * 0.5);
        
        return {
            presentDays,
            halfDays,
            absentDays,
            restDays,
            holidayDays,
            workDays
        };
    }

    // 计算加班统计数据
    calculateOvertimeStats(attendanceData) {
        let totalOvertimeHours = 0;
        let totalOvertimeWage = 0;
        
        attendanceData.forEach(attendance => {
            if (attendance.overtime && attendance.overtime > 0) {
                totalOvertimeHours += attendance.overtime;
                
                // 计算该天的加班费
                const salaryInfo = this.calculateSalary(
                    attendance.date,
                    attendance.status,
                    attendance.overtime,
                    attendance.overtimeType
                );
                totalOvertimeWage += salaryInfo.overtime;
            }
        });
        
        return {
            totalOvertimeHours,
            totalOvertimeWage
        };
    }

    // 计算工资
    calculateWage(attendanceStats, overtimeStats, hasAttendanceData) {
        let totalWage = 0;
        let actualWage = 0;
        let subsidyWage = 0;

        if (this.personalInfo) {
            // 使用 employeeType 判断是全职还是点工
            const isFullTime = this.personalInfo.employeeType === 'fullTime';
            
            if (isFullTime) {
                // 全职：根据用户需求计算工资
                totalWage = this.calculateFullTimeWage(attendanceStats, overtimeStats);
                subsidyWage = this.calculateSubsidy(attendanceStats);
                actualWage = totalWage + subsidyWage;
            } else {
                // 点工：根据日工资和实际工作天数计算工资，扣除未考勤的天数
                totalWage = this.calculatePartTimeWage(attendanceStats, overtimeStats);
                subsidyWage = this.calculateSubsidy(attendanceStats);
                actualWage = totalWage + subsidyWage;
            }
        } else {
            // 没有个人信息时，只显示基本统计数据
            // 工作天数和加班小时数仍然可以计算
            totalWage = 0;
            actualWage = 0;
            subsidyWage = 0;
        }

        // 当没有考勤数据时，将工资设置为0
        if (!hasAttendanceData) {
            totalWage = 0;
            actualWage = 0;
            subsidyWage = 0;
            // 保留工作天数和加班小时数的计算，显示为0
        }

        return {
            totalWage,
            actualWage,
            subsidyWage
        };
    }

    // 计算全职工资
    calculateFullTimeWage(attendanceStats, overtimeStats) {
        // 将月工资转换为数字（可能是字符串）
        const monthlyWage = parseFloat(this.personalInfo.monthlyWage) || 0;
        const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
        const restSystem = this.personalInfo.restSystem || 'doubleRest';
        
        // 如果没有设置月工资，返回0
        if (!monthlyWage || monthlyWage <= 0 || isNaN(monthlyWage)) {
            return 0;
        }
        
        // 获取当前月份信息
        const currentYear = this.currentMonth.getFullYear();
        const currentMonthNum = this.currentMonth.getMonth() + 1;
        const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        
        // 根据休息制度计算应工作天数
        let expectedRestDays;
        if (restSystem === 'doubleRest') {
            expectedRestDays = 8; // 双休休息8天
        } else if (restSystem === 'singleRest') {
            expectedRestDays = 4; // 单休休息4天
        } else {
            expectedRestDays = 5; // 自由休休息5天
        }
        const expectedWorkDays = daysInCurrentMonth - expectedRestDays;
        
        // 根据工资计算方式计算工资
        let actualWage = 0;
        
        if (wageCalculationMethod === 'attendance') {
            // 按标准工作日计算（26天）
            // 满26天给6000元，多上的算加班费
            const dailyWage = monthlyWage / 26;
            const actualWorkDays = attendanceStats.presentDays + (attendanceStats.halfDays * 0.5);
            
            if (actualWorkDays >= 26) {
                // 满勤 + 加班费
                const overtimeDays = actualWorkDays - 26;
                actualWage = monthlyWage + (dailyWage * overtimeDays);
            } else {
                // 不满勤，按实际出勤天数计算
                actualWage = dailyWage * actualWorkDays;
            }
        } else if (wageCalculationMethod === 'legal') {
            // 按法定工作日计算（21.75天）
            // 应出勤天数 = 当月天数 - 休息天数
            const expectedWorkDays = daysInCurrentMonth - expectedRestDays;
            const dailyWage = monthlyWage / 21.75;
            const actualWorkDays = attendanceStats.presentDays + (attendanceStats.halfDays * 0.5);
            
            if (actualWorkDays >= expectedWorkDays) {
                // 满勤 + 加班费
                const overtimeDays = actualWorkDays - expectedWorkDays;
                actualWage = monthlyWage + (dailyWage * overtimeDays);
            } else {
                // 不满勤，按实际出勤天数计算
                actualWage = dailyWage * actualWorkDays;
            }
        } else if (wageCalculationMethod === 'currentMonth') {
            // 按当月天数计算
            const dailyWage = monthlyWage / daysInCurrentMonth;
            const totalPaidDays = attendanceStats.presentDays + (attendanceStats.halfDays * 0.5) + attendanceStats.holidayDays + attendanceStats.restDays;
            actualWage = dailyWage * totalPaidDays;
        } else {
            // 默认按自然日（30天）计算
            const dailyWage = monthlyWage / 30;
            const totalPaidDays = attendanceStats.presentDays + (attendanceStats.halfDays * 0.5) + attendanceStats.holidayDays + attendanceStats.restDays;
            actualWage = dailyWage * totalPaidDays;
        }
        
        // 注意：补贴在 calculateWage 中单独计算，这里不加补贴
        
        return Math.round(actualWage + (overtimeStats.totalOvertimeWage || 0));
    }

    // 计算点工工资
    calculatePartTimeWage(attendanceStats, overtimeStats) {
        const dailyWage = this.personalInfo.wage || 0;
        // 点工工资 = 工作天数 × 日工资（workDays 已包含出勤和半天，不包含请假）
        const basicWage = attendanceStats.workDays * dailyWage;
        
        // 计算补贴
        const subsidyTotal = this.calculateSubsidy(attendanceStats);
        
        return Math.round(basicWage + overtimeStats.totalOvertimeWage + subsidyTotal);
    }

    // 计算补贴
    calculateSubsidy(attendanceStats) {
        const subsidyType = this.personalInfo?.subsidyType || 'none';
        
        if (subsidyType === 'none') {
            return 0;
        }
        
        // 获取有补贴天数
        const subsidyStatuses = this.personalInfo?.subsidyStatuses || ['present', 'half', 'holiday', 'rest'];
        let subsidyDays = 0;
        
        if (subsidyStatuses.includes('present')) {
            subsidyDays += attendanceStats.presentDays;
        }
        if (subsidyStatuses.includes('half')) {
            subsidyDays += attendanceStats.halfDays * 0.5;
        }
        if (subsidyStatuses.includes('holiday')) {
            subsidyDays += attendanceStats.holidayDays;
        }
        if (subsidyStatuses.includes('rest')) {
            subsidyDays += attendanceStats.restDays;
        }
        
        // 根据休息制度计算应工作天数
        const restSystem = this.personalInfo?.restSystem || 'doubleRest';
        const currentYear = this.currentMonth.getFullYear();
        const currentMonthNum = this.currentMonth.getMonth() + 1;
        const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        let expectedWorkDays;
        
        if (restSystem === 'doubleRest') {
            // 双休：每月休息8天
            expectedWorkDays = daysInCurrentMonth - 8;
        } else if (restSystem === 'singleRest') {
            // 单休：每月休息4天
            expectedWorkDays = daysInCurrentMonth - 4;
        } else {
            // 自由休：按26天计算
            expectedWorkDays = 26;
        }
        
        let subsidyTotal = 0;
        
        switch (subsidyType) {
            case 'monthly':
                // 按月计算：如果有补贴天数 >= 应工作天数，给满月补贴
                // 否则按日补贴计算
                const monthlySubsidy = this.personalInfo?.monthlySubsidy || 0;
                if (subsidyDays >= expectedWorkDays) {
                    subsidyTotal = monthlySubsidy;
                } else {
                    const dailySubsidyFromMonthly = monthlySubsidy / daysInCurrentMonth;
                    subsidyTotal = dailySubsidyFromMonthly * subsidyDays;
                }
                break;
                
            case 'daily':
                // 按天计算：日补贴 × 有补贴天数
                const dailySubsidy = this.personalInfo?.dailySubsidy || 0;
                subsidyTotal = dailySubsidy * subsidyDays;
                break;
                
            case 'perMeal':
                // 按餐计算：每餐补贴 × 每日餐数 × 有补贴天数
                const perMealSubsidy = this.personalInfo?.perMealSubsidy || 0;
                const mealsPerDay = this.personalInfo?.mealsPerDay || 2;
                subsidyTotal = perMealSubsidy * mealsPerDay * subsidyDays;
                break;
        }
        
        return Math.round(subsidyTotal);
    }

    // 更新统计数据显示
    updateStatisticsDisplay(attendanceStats, overtimeStats, wageStats) {
        const workDaysEl = document.getElementById('workDays');
        const workDaysDetailEl = document.getElementById('workDaysDetail');
        const overtimeHoursEl = document.getElementById('overtimeHours');
        const overtimeWageEl = document.getElementById('overtimeWage');
        const subsidyWageEl = document.getElementById('subsidyWage');
        const totalWageEl = document.getElementById('totalWage');
        const actualWageEl = document.getElementById('actualWage');

        if (workDaysEl) workDaysEl.textContent = attendanceStats.workDays.toFixed(1);
        
        // 工作天数详情：显示计薪天数（全职）或实际工作天数（点工）
        if (workDaysDetailEl) {
            const isFullTime = this.personalInfo?.employeeType === 'fullTime';
            const paidDays = attendanceStats.presentDays + attendanceStats.halfDays + attendanceStats.restDays + attendanceStats.holidayDays;
            if (isFullTime && paidDays > 0) {
                workDaysDetailEl.innerHTML = `天<br><span style="font-size: 11px; color: var(--text-secondary);">计薪${paidDays.toFixed(1)}天</span>`;
            } else {
                workDaysDetailEl.textContent = '天';
            }
        }
        
        if (overtimeHoursEl) overtimeHoursEl.textContent = overtimeStats.totalOvertimeHours.toFixed(1);
        if (overtimeWageEl) overtimeWageEl.textContent = Utils.formatCurrency(overtimeStats.totalOvertimeWage);
        if (subsidyWageEl) subsidyWageEl.textContent = Utils.formatCurrency(wageStats.subsidyWage || 0);
        if (totalWageEl) totalWageEl.textContent = Utils.formatCurrency(wageStats.totalWage);
        if (actualWageEl) actualWageEl.textContent = Utils.formatCurrency(wageStats.actualWage);
    }

    async saveWageHistory(year, month, workDays, totalWage, overtime) {
        // 后台异步保存工资历史记录，不阻塞页面加载
        this.setTimeoutSafe(async () => {
            try {
                const monthStr = `${month}月`;
                const dateStr = `${year}-${month.toString().padStart(2, '0')}`;
                const id = `wage_${dateStr}`;
                const createdAt = new Date().toISOString();

                let existingRecord = null;
                try {
                    const wageHistoryJson = localStorage.getItem('wageHistory');
                    if (wageHistoryJson) {
                        const localStorageWageHistory = JSON.parse(wageHistoryJson) || [];
                        existingRecord = localStorageWageHistory.find(record => record.month === monthStr);
                    }
                } catch (localError) {
                    console.error('从localStorage获取工资历史记录失败:', localError);
                }

                const wageRecord = {
                    id: existingRecord?.id || id,
                    month: monthStr,
                    year: year,
                    workDays: parseFloat(workDays.toFixed(1)),
                    totalWage: parseFloat(totalWage.toFixed(2)),
                    overtime: parseFloat(overtime.toFixed(1)),
                    createdAt: existingRecord?.createdAt || createdAt,
                    updatedAt: createdAt
                };

                // 检查是否需要更新（避免重复保存）
                let needUpdate = true;
                if (existingRecord) {
                    // 确保值是数字类型，避免 toFixed 调用失败
                    const existingWorkDays = parseFloat(parseFloat(existingRecord.workDays || 0).toFixed(1));
                    const existingTotalWage = parseFloat(parseFloat(existingRecord.totalWage || 0).toFixed(2));
                    const existingOvertime = parseFloat(parseFloat(existingRecord.overtime || 0).toFixed(1));
                    
                    if (existingWorkDays === parseFloat(workDays.toFixed(1)) &&
                        existingTotalWage === parseFloat(totalWage.toFixed(2)) &&
                        existingOvertime === parseFloat(overtime.toFixed(1))) {
                        needUpdate = false;
                    }
                }

                if (needUpdate) {
                    try {
                        const wageHistoryJson = localStorage.getItem('wageHistory');
                        let wageHistory = [];
                        if (wageHistoryJson) {
                            wageHistory = JSON.parse(wageHistoryJson) || [];
                        }
                        const existingIndex = wageHistory.findIndex(record => record.month === monthStr);
                        if (existingIndex !== -1) {
                            wageHistory[existingIndex] = wageRecord;
                        } else {
                            wageHistory.push(wageRecord);
                        }
                        localStorage.setItem('wageHistory', JSON.stringify(wageHistory));
                    } catch (localError) {
                        console.error('保存工资历史记录到localStorage失败:', localError);
                    }

                    // 记录月份修改时间（用于24小时自动锁定）
                    this.recordMonthModification(year, month);
                }

                // 后台异步保存到服务器
                try {
                    await this.storage.set('wageHistory', wageRecord);
                } catch (serverError) {
                    this.logger.error('Failed to save wage history to server:', serverError);
                }
            } catch (error) {
                this.logger.error('Failed to save wage history:', error);
            }
        }, 1000);
    }

    // ==================== 月份锁定功能 ====================

    // 获取月份锁定状态
    getMonthLockStatus(year, month) {
        // 检查是否是当前月份
        const currentDate = new Date();
        const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
        
        // 当前月份永远不锁定
        if (isCurrentMonth) {
            return { locked: false };
        }
        
        // 检查是否是过去的月份
        const isPastMonth = year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month < currentDate.getMonth() + 1);
        
        // 所有过去的月份都自动锁定
        if (isPastMonth) {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            // 创建锁定记录
            if (!this.monthLocks[monthKey]) {
                this.monthLocks[monthKey] = {};
            }
            
            this.monthLocks[monthKey].locked = true;
            this.monthLocks[monthKey].lockedAt = this.monthLocks[monthKey].lockedAt || new Date().toISOString();
            this.saveMonthLocks();
            
            return { 
                locked: true, 
                lockedAt: this.monthLocks[monthKey].lockedAt 
            };
        }
        
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        let lockInfo = this.monthLocks[monthKey];
        
        // 如果没有锁定记录，尝试从工资历史记录中获取更新时间
        if (!lockInfo) {
            // 获取用户ID，构建带前缀的键名
            const userId = localStorage.getItem('user_id') || 'default';
            const wageHistoryKeyWithPrefix = `${userId}_wageHistory`;
            const wageHistoryKeyWithoutPrefix = 'wageHistory';
            
            // 先尝试带前缀的键名，再尝试不带前缀的键名
            let wageHistoryJson = localStorage.getItem(wageHistoryKeyWithPrefix);
            let usedKey = wageHistoryKeyWithPrefix;
            
            if (!wageHistoryJson) {
                wageHistoryJson = localStorage.getItem(wageHistoryKeyWithoutPrefix);
                usedKey = wageHistoryKeyWithoutPrefix;
            }
            
            if (wageHistoryJson) {
                const wageHistory = JSON.parse(wageHistoryJson) || [];
                const monthStr = `${month}月`;
                
                // 更灵活的查找：先尝试匹配年月，如果没有year字段则只匹配月份
                let wageRecord = wageHistory.find(record => record.month === monthStr && record.year === year);
                
                // 如果没找到，尝试只匹配月份（兼容旧数据）
                if (!wageRecord) {
                    wageRecord = wageHistory.find(record => record.month === monthStr);
                }
                
                if (wageRecord) {
                    // 有工资记录，检查是否超过24小时
                    // 方法1：优先使用 createdAt（创建时间），因为 updatedAt 可能在恢复数据时被更新
                    let timeField = wageRecord.createdAt || wageRecord.updatedAt;
                    let recordTime = new Date(timeField).getTime();
                    let currentTime = new Date().getTime();
                    let hoursDiff = (currentTime - recordTime) / (1000 * 60 * 60);
                    
                    // 方法2：如果工资记录时间是今天（恢复数据导致），则根据考勤数据的最后日期判断
                    // 从 storage 获取考勤数据
                    if (hoursDiff < 24) {
                        try {
                            const attendanceJson = localStorage.getItem('attendance') || '[]';
                            const attendance = JSON.parse(attendanceJson) || [];
                            
                            if (attendance.length > 0) {
                                const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
                                const monthAttendance = attendance.filter(a => a.date && a.date.startsWith(monthPrefix));
                                
                                if (monthAttendance.length > 0) {
                                    // 找到该月最后一条考勤记录的日期
                                    const lastAttendance = monthAttendance.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                    const lastAttendanceDate = new Date(lastAttendance.date);
                                    const lastAttendanceTime = lastAttendanceDate.getTime();
                                    
                                    // 如果最后考勤日期 + 24小时 < 当前时间，则锁定
                                    const hoursSinceLastAttendance = (currentTime - lastAttendanceTime) / (1000 * 60 * 60);
                                    
                                    // 如果距离最后考勤已经超过24小时，使用考勤时间作为判断依据
                                    if (hoursSinceLastAttendance >= 24) {
                                        hoursDiff = hoursSinceLastAttendance;
                                        timeField = lastAttendance.date;
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('获取考勤数据失败:', error);
                        }
                    }
                    
                    // 创建锁定记录
                    lockInfo = {
                        modifiedAt: timeField,
                        locked: hoursDiff >= 24
                    };
                    
                    if (lockInfo.locked) {
                        lockInfo.lockedAt = new Date().toISOString();
                    }
                    
                    // 保存到monthLocks
                    this.monthLocks[monthKey] = lockInfo;
                    this.saveMonthLocks();
                    
                    return lockInfo;
                }
            }
            
            return { locked: false };
        }

        // 检查是否超过24小时自动锁定（只在未锁定状态下检查，且尊重用户的手动解锁操作）
        if (!lockInfo.locked && lockInfo.modifiedAt) {
            const modifiedTime = new Date(lockInfo.modifiedAt).getTime();
            const currentTime = new Date().getTime();
            const hoursDiff = (currentTime - modifiedTime) / (1000 * 60 * 60);
            
            if (hoursDiff >= 24) {
                lockInfo.locked = true;
                lockInfo.lockedAt = new Date().toISOString();
                this.saveMonthLocks();
            }
            // 移除根据考勤时间强制锁定的逻辑，尊重用户的手动解锁选择
        }
        
        return lockInfo;
    }

    // 检查月份是否已锁定
    isMonthLocked(year, month) {
        const status = this.getMonthLockStatus(year, month);
        return status.locked;
    }

    // 记录月份修改时间（用于24小时自动锁定）
    recordMonthModification(year, month) {
        // 检查是否是当前月份
        const currentDate = new Date();
        const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
        
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!this.monthLocks[monthKey]) {
            this.monthLocks[monthKey] = {};
        }
        
        this.monthLocks[monthKey].modifiedAt = new Date().toISOString();
        
        // 只有当前月份可以解除锁定，过去的月份保持锁定状态
        if (isCurrentMonth) {
            this.monthLocks[monthKey].locked = false;
            this.saveMonthLocks();
            // 移除24小时锁定提示
        } else {
            // 过去的月份保持锁定状态
            this.saveMonthLocks();
        }
    }

    // 手动锁定月份
    lockMonth(year, month) {
        // 检查是否是当前月份
        const currentDate = new Date();
        const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
        
        // 当前月份不允许锁定
        if (isCurrentMonth) {
            this.toast.info('当前月份不允许锁定');
            return;
        }
        
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!this.monthLocks[monthKey]) {
            this.monthLocks[monthKey] = {};
        }
        
        this.monthLocks[monthKey].locked = true;
        this.monthLocks[monthKey].lockedAt = new Date().toISOString();
        this.saveMonthLocks();
        
        this.renderCalendar();
        this.updateMonthLockButton(); // 更新锁定按钮和考勤按钮状态
        this.toast.success(`${year}年${month}月已锁定`);
    }

    // 解锁月份
    unlockMonth(year, month) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // 无论是否存在记录，都创建或更新解锁记录
        if (!this.monthLocks[monthKey]) {
            this.monthLocks[monthKey] = {};
        }
        
        this.monthLocks[monthKey].locked = false;
        this.monthLocks[monthKey].modifiedAt = new Date().toISOString();
        this.saveMonthLocks();
        
        this.renderCalendar();
        this.updateMonthLockButton(); // 更新锁定按钮和考勤按钮状态
        this.toast.success(`${year}年${month}月已解锁`);
    }

    // 保存月份锁定数据到本地存储
    saveMonthLocks() {
        try {
            localStorage.setItem('monthLocks', JSON.stringify(this.monthLocks));
        } catch (error) {
            console.error('保存月份锁定数据失败:', error);
        }
    }

    // 从本地存储加载月份锁定数据
    loadMonthLocks() {
        try {
            const locksJson = localStorage.getItem('monthLocks');
            if (locksJson) {
                this.monthLocks = JSON.parse(locksJson) || {};
            }
        } catch (error) {
            console.error('加载月份锁定数据失败:', error);
            this.monthLocks = {};
        }
    }

    // 显示锁定/解锁对话框
    showMonthLockDialog() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const lockStatus = this.getMonthLockStatus(year, month);
        
        if (lockStatus.locked) {
            // 已锁定，显示解锁选项
            this.dialog.show({
                title: '月份已锁定',
                htmlContent: `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-lock" style="font-size: 48px; color: var(--warning-color); margin-bottom: 16px;"></i>
                        <p style="margin-bottom: 8px;">${year}年${month}月已锁定</p>
                        <p style="font-size: 12px; color: var(--text-secondary);">
                            锁定时间: ${lockStatus.lockedAt ? new Date(lockStatus.lockedAt).toLocaleString() : '未知'}
                        </p>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                            解锁后24小时将再次自动锁定
                        </p>
                    </div>
                `,
                showConfirm: true,
                showCancel: true,
                confirmText: '解锁',
                cancelText: '取消',
                onConfirm: () => this.unlockMonth(year, month)
            });
        } else {
            // 未锁定，显示锁定选项
            const modifiedAt = lockStatus.modifiedAt;
            let timeLeft = '';
            
            if (modifiedAt) {
                const modifiedTime = new Date(modifiedAt).getTime();
                const currentTime = new Date().getTime();
                const hoursPassed = (currentTime - modifiedTime) / (1000 * 60 * 60);
                const hoursLeft = Math.max(0, 24 - hoursPassed);
                const minutesLeft = Math.floor((hoursLeft % 1) * 60);
                
                if (hoursLeft > 0) {
                    timeLeft = `还有 ${Math.floor(hoursLeft)}小时${minutesLeft}分钟 自动锁定`;
                }
            }
            
            this.dialog.show({
                title: '月份未锁定',
                htmlContent: `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-unlock" style="font-size: 48px; color: var(--success-color); margin-bottom: 16px;"></i>
                        <p style="margin-bottom: 8px;">${year}年${month}月未锁定</p>
                        ${timeLeft ? `<p style="font-size: 12px; color: var(--text-secondary);">${timeLeft}</p>` : ''}
                        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                            立即锁定后将无法修改该月考勤和工资
                        </p>
                    </div>
                `,
                showConfirm: true,
                showCancel: true,
                confirmText: '立即锁定',
                cancelText: '取消',
                onConfirm: () => this.lockMonth(year, month)
            });
        }
    }

    calculateSalary(dateStr, status, overtime = 0, overtimeType = 'weekday', remark = null) {
        if (!this.personalInfo) {
            return { basic: 0, overtime: 0, total: 0 };
        }

        // 根据员工类型获取日工资
        const isFullTime = this.personalInfo.employeeType === 'fullTime';
        let dailyWage = 0;
        
        if (isFullTime) {
            // 全职：根据工资计算方式计算日工资
            const monthlyWage = parseFloat(this.personalInfo.monthlyWage) || 0;
            const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
            
            if (wageCalculationMethod === 'legal') {
                // 按法定工作日计算（21.75天）
                dailyWage = monthlyWage / 21.75;
            } else if (wageCalculationMethod === 'attendance') {
                // 按标准工作日计算（26天）
                dailyWage = monthlyWage / 26;
            } else if (wageCalculationMethod === 'currentMonth') {
                // 按当月天数计算
                const currentYear = this.currentMonth.getFullYear();
                const currentMonthNum = this.currentMonth.getMonth() + 1;
                const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                dailyWage = monthlyWage / daysInCurrentMonth;
            } else {
                // 默认按自然日（30天）计算
                dailyWage = monthlyWage / 30;
            }
        } else {
            // 点工：直接使用设置的日工资
            dailyWage = this.personalInfo.wage || 0;
        }
        
        // 获取工资计算方式
        const wageCalculationMethod = this.personalInfo.wageCalculationMethod || 'natural';
        
        // 放假和休息也有工资（带薪休假）
        const isPaidLeave = status === 'absent' && (remark === '放假' || remark === '休息');
        
        // 只有按当月天数计算时，休息和放假才显示金额
        // 其他计算方式（法定、26天制、自然日）都是满勤给固定工资，休息和放假已包含在工资里
        if (isPaidLeave && wageCalculationMethod !== 'currentMonth') {
            return { basic: '-', overtime: 0, total: 0 };
        }
        
        if ((status === 'absent' && !isPaidLeave) || dailyWage === 0) {
            return { basic: 0, overtime: 0, total: 0 };
        }
        
        let basicSalary = 0;
        if (status === 'present' || isPaidLeave) {
            basicSalary = dailyWage;
        } else if (status === 'half') {
            basicSalary = dailyWage * 0.5;
        }
        
        let overtimeSalary = 0;
        const enableOvertimePay = this.personalInfo.overtimeRate > 0;
        if (overtime > 0 && enableOvertimePay) {
            const hourlyWage = dailyWage / 8;
            let rate = this.personalInfo.overtimeRate || 0;
            
            if (overtimeType === 'weekend') {
                rate = this.personalInfo.overtimeRate || 0;
            } else if (overtimeType === 'holiday') {
                rate = this.personalInfo.overtimeRate || 0;
            }
            
            overtimeSalary = hourlyWage * overtime * rate;
        }
        
        return {
            basic: basicSalary,
            overtime: overtimeSalary,
            total: basicSalary + overtimeSalary
        };
    }

    renderWorkTable() {
        const container = document.getElementById('workTableContainer');
        if (!container) {
            return;
        }
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        let tableHTML = '';
        let hasRecords = false;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0');
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const attendance = this.attendance.find(a => a.date === dateStr);
            const status = attendance ? attendance.status : null;
            
            const overtime = attendance?.overtime || 0;
            const overtimeType = attendance?.overtimeType || 'weekday';
            
            hasRecords = true;
            
            let statusText = '未记录';
            let statusClass = '';
            let workDay = 0;
            let salaryInfo = { basic: 0, overtime: 0, total: 0 };
            
            if (status === 'present') {
                statusText = '满勤';
                statusClass = 'badge-present';
                workDay = 1;
                salaryInfo = this.calculateSalary(dateStr, status, overtime, overtimeType);
            } else if (status === 'half') {
                statusText = '半天';
                statusClass = 'badge-half';
                workDay = 0.5;
                salaryInfo = this.calculateSalary(dateStr, status, overtime, overtimeType);
            } else if (status === 'absent') {
                const remark = attendance?.remark || '缺勤';
                statusText = remark;
                // 根据备注类型设置不同的颜色
                if (remark === '休息') {
                    statusClass = 'badge-rest';
                } else if (remark === '放假') {
                    statusClass = 'badge-holiday';
                } else {
                    statusClass = 'badge-absent';
                }
                workDay = 0;
                // 放假和休息也有工资，需要计算
                salaryInfo = this.calculateSalary(dateStr, status, overtime, overtimeType, remark);
            }
            
            let basicSalaryHtml = '';
            if (salaryInfo.basic === '-') {
                // 按法定或26天制时，休息和放假显示"-"
                basicSalaryHtml = '<div><strong>-</strong></div>';
            } else if (salaryInfo.basic > 0) {
                basicSalaryHtml = '<div><strong>¥' + Number(salaryInfo.basic).toFixed(2) + '</strong></div>';
            }
            
            let overtimeSalaryHtml = '';
            if (salaryInfo.overtime > 0) {
                overtimeSalaryHtml = '<div class="text-xs text-warning">加班: ¥' + Number(salaryInfo.overtime).toFixed(2) + '</div>';
            }
            
            let totalDaySalaryHtml = '';
            if (salaryInfo.total > 0) {
                totalDaySalaryHtml = '<div class="text-xs text-success">总计: ¥' + Number(salaryInfo.total).toFixed(2) + '</div>';
            }
            
            tableHTML += 
                '<tr style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-light);">' +
                    '<td class="date-cell" style="vertical-align: top; padding: 8px;">' + month + '.' + day + '</td>' +
                    '<td class="week-cell" style="vertical-align: top; padding: 8px;">' + this.WEEK_DAYS[dayOfWeek] + '</td>' +
                    '<td style="vertical-align: top; padding: 8px;"><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
                    '<td style="vertical-align: top; padding: 8px;">' + workDay + '</td>' +
                    '<td class="salary-cell" style="vertical-align: top; padding: 8px;">' +
                        basicSalaryHtml +
                        overtimeSalaryHtml +
                        totalDaySalaryHtml +
                    '</td>' +
                    '<td class="note-cell" style="vertical-align: top; padding: 8px; background-color: transparent;">' +
                        '<div style="width: 100%;">' +
                            (attendance?.overtime > 0 ? '<div style="margin-bottom: 4px; font-weight: 500; color: #ff9800; transition: color 0.2s ease;">' + attendance.overtime + 'h 加班</div>' : '') +
                            '<div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">' +
                                '<span class="note-text" style="flex: 1; margin-right: 10px; word-break: break-word; white-space: normal; overflow-wrap: break-word;">' + (attendance?.remark || '-') + '</span>' +
                                '<button class="note-edit-btn" data-date="' + dateStr + '" title="编辑备注" style="margin-left: 10px; flex-shrink: 0; transition: transform 0.2s ease;">' +
                                    '<i class="fas fa-edit"></i>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                '</tr>';


        }
        
        if (!hasRecords) {
            container.innerHTML = 
                '<div class="empty-state">' +
                    '<i class="fas fa-calendar"></i>' +
                    '<p>本月暂无工作记录</p>' +
                    '<p class="empty-state-hint">📝 点击上方日历开始记录吧</p>' +
                '</div>';
        } else {
            container.innerHTML = 
                '<table class="work-table" style="width: 100%; border-collapse: collapse; border: 1px solid var(--border-color); background-color: var(--bg-light);">' +
                    '<thead>' +
                        '<tr style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-dark);">' +
                            '<th style="width: 10%; padding: 8px; text-align: left; vertical-align: top;">日期</th>' +
                            '<th style="width: 8%; padding: 8px; text-align: left; vertical-align: top;">星期</th>' +
                            '<th style="width: 12%; padding: 8px; text-align: left; vertical-align: top;">状态</th>' +
                            '<th style="width: 8%; padding: 8px; text-align: left; vertical-align: top;">工日</th>' +
                            '<th style="width: 10%; padding: 8px; text-align: left; vertical-align: top;">日薪</th>' +
                            '<th style="width: 52%; padding: 8px; text-align: left; vertical-align: top;">备注</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        tableHTML +
                    '</tbody>' +
                '</table>';
            
            // 添加表格行的hover效果
            this.setTimeoutSafe(() => {
                const rows = container.querySelectorAll('tr');
                rows.forEach(row => {
                    row.style.transition = 'background-color 0.2s ease';
                    row.style.position = 'relative';
                    row.style.zIndex = '1';
                    row.addEventListener('mouseover', function() {
                        this.style.backgroundColor = 'var(--bg-tertiary)';
                        this.style.zIndex = '10';
                    });
                    row.addEventListener('mouseout', function() {
                        this.style.backgroundColor = 'var(--bg-light)';
                        this.style.zIndex = '1';
                    });
                });
            }, 100);
            
            // 移除备注列的宽度限制，确保备注内容能够完整显示
            this.setTimeoutSafe(() => {
                const table = container.querySelector('.work-table');
                if (table) {
                    table.style.width = '100%';
                    table.style.overflowX = 'hidden';
                }
                
                const noteCells = container.querySelectorAll('.note-cell');
                noteCells.forEach(cell => {
                    cell.style.maxWidth = 'none';
                    cell.style.width = '100%';
                    cell.style.whiteSpace = 'normal';
                    cell.style.wordWrap = 'break-word';
                    cell.style.height = 'auto';
                    cell.style.minHeight = '40px';
                    cell.style.verticalAlign = 'top';
                });
                
                // 为所有单元格添加垂直对齐
                const allCells = container.querySelectorAll('td');
                allCells.forEach(cell => {
                    cell.style.verticalAlign = 'top';
                });
                
                // 特别为日薪列添加垂直对齐
                const salaryCells = container.querySelectorAll('.salary-cell');
                salaryCells.forEach(cell => {
                    cell.style.verticalAlign = 'top';
                });
                
                const noteTexts = container.querySelectorAll('.note-text');
                noteTexts.forEach(text => {
                    text.style.whiteSpace = 'normal';
                    text.style.wordWrap = 'break-word';
                    text.style.flex = '1';
                    text.style.lineHeight = '1.3';
                });
            }, 100);
            
            this.setTimeoutSafe(() => {
                const noteBtns = container.querySelectorAll('.note-edit-btn');
                noteBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const dateStr = btn.dataset.date;
                        this.showNoteDialog(dateStr);
                    });
                });
            }, 100);
            
            // 根据showDailyWage状态控制日薪列显示
            this.setTimeoutSafe(() => {
                const table = container.querySelector('.work-table');
                if (table) {
                    const headerCell = table.querySelector('th:nth-child(5)');
                    if (headerCell) {
                        headerCell.style.display = this.showDailyWage ? '' : 'none';
                    }
                    
                    const salaryCells = table.querySelectorAll('td:nth-child(5)');
                    salaryCells.forEach(cell => {
                        cell.style.display = this.showDailyWage ? '' : 'none';
                    });
                }
            }, 100);
        }
    }

    renderHolidayCountdown() {
        const container = document.getElementById('holidayCountdown');
        if (!container) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const upcomingHolidays = this.holidays.filter(h => {
            const holidayDate = new Date(h.date);
            holidayDate.setHours(0, 0, 0, 0);
            return holidayDate >= now;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (upcomingHolidays.length === 0) {
            container.textContent = '暂无即将到来的节日';
            return;
        }

        const nextHoliday = upcomingHolidays[0];
        const holidayDate = new Date(nextHoliday.date);
        holidayDate.setHours(0, 0, 0, 0);
        const diffTime = holidayDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let countdownText = '';

        if (daysLeft === 0) {
            countdownText = '🎉 ' + nextHoliday.name + ' · 就是今天';
        } else if (daysLeft === 1) {
            countdownText = '⏰ 离' + nextHoliday.name + '还有1天';
        } else {
            countdownText = '📅 离' + nextHoliday.name + '还有' + daysLeft + '天';
        }

        container.textContent = countdownText;
    }

    bindEvents() {
        if (this.eventsBound) {
            return;
        }
        
        this.eventsBound = true;
        
        const clickHandler = (e) => {
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
                    case 'share-screenshot':
                        this.handleShareScreenshot();
                        break;


                    case 'edit-info':
                        this.handleEditInfo();
                        break;
                    case 'phonebook':
                        window.location.href = '/jg/html-new/phonebook.php';
                        break;
                    case 'project-management':
                        window.location.href = '/jg/html-new/project-management.php';
                        break;
                    case 'data-management':
                        window.location.href = '/jg/html-new/data-management.php';
                        break;
                    case 'new-project':
                        this.handleNewProject();
                        break;
                    case 'login':
                        this.toast.info('登录/注册功能开发中');
                        break;

                    case 'logout':
                        if (confirm('确定要退出登录吗？')) {
                            localStorage.removeItem('user_id');
                            localStorage.removeItem('user_name');
                            localStorage.removeItem('user_email');
                            localStorage.removeItem('user_phone');
                            localStorage.removeItem('user_password');
                            localStorage.removeItem('login_time');
                            localStorage.removeItem('username');
                            
                            document.cookie = 'user_id=; max-age=0; path=/; secure=false; samesite=lax';
                            document.cookie = 'user_name=; max-age=0; path=/; secure=false; samesite=lax';
                            document.cookie = 'user_email=; max-age=0; path=/; secure=false; samesite=lax';
                            document.cookie = 'user_phone=; max-age=0; path=/; secure=false; samesite=lax';
                            document.cookie = 'user_password=; max-age=0; path=/; secure=false; samesite=lax';
                            
                            this.toast.info('已退出登录');
                            this.setTimeoutSafe(() => {
                                window.location.href = '/jg/html-new/login.php';
                            }, 1000);
                        }
                        break;
                    case 'prev-month':
                        this.changeMonth(-1);
                        break;
                    case 'next-month':
                        this.changeMonth(1);
                        break;
                    case 'toggle-month-lock':
                        this.showMonthLockDialog();
                        break;
                    case 'set-present':
                        this.setAttendance('present');
                        break;
                    case 'set-half':
                        this.setAttendance('half');
                        break;
                    case 'set-absent':
                        this.setAttendance('absent');
                        break;
                    case 'clear-attendance':
                        this.clearAttendance();
                        break;
                    case 'toggle-daily-wage':
                        this.toggleDailyWage();
                        break;
                    case 'show-wage-calc':
                        this.showWageCalculationDialog();
                        break;
                }
            }

            const projectItem = e.target.closest('.project-item[data-project-id]');
            if (projectItem) {
                const projectId = projectItem.getAttribute('data-project-id');
                if (projectId) {
                    const closeCardBtn = e.target.closest('.close-card-btn');
                    if (closeCardBtn) {
                        const cardInner = projectItem.querySelector('.card-inner');
                        const cardBack = projectItem.querySelector('.card-back');
                        if (cardInner) {
                            cardInner.style.transform = 'rotateY(0deg)';
                        }
                        if (cardBack) {
                            this.setTimeoutSafe(() => {
                                cardBack.style.display = 'none';
                            }, 250);
                        }
                        return;
                    }

                    const isOtherProject = String(projectId).startsWith('other');
                    if (isOtherProject) {
                        this.toast.info('我只是占位符');
                        return;
                    }

                    const project = this.projects.find(p => String(p.id) === String(projectId));
                    if (project && Boolean(project.isEnded)) {
                        this.toast.error('切换我必须要激活');
                        return;
                    }

                    this.switchProject(projectId);
                }
            }

            const dateEl = e.target.closest('.day-item[data-date]');
            if (dateEl && !dateEl.classList.contains('empty')) {
                const dateStr = dateEl.dataset.date;
                this.selectedDate = dateStr;
                this.renderCalendar();
            }
        };
        
        this.addEventListenerSafe(document, 'click', clickHandler);
        
        const keydownHandler = (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    this.changeMonth(-1);
                    break;
                case 'ArrowRight':
                    this.changeMonth(1);
                    break;
            }
        };
        
        this.addEventListenerSafe(document, 'keydown', keydownHandler);
    }

    // 对话框组件已经移至独立文件 js-components/dialog.js
    
    handleEditInfo() {
        try {
            const initialEmployeeType = this.personalInfo?.employeeType || 'partTime';
            const isFullTime = initialEmployeeType === 'fullTime';
            
            // 计算当月实际天数
            const currentYear = this.currentMonth.getFullYear();
            const currentMonthNum = this.currentMonth.getMonth() + 1;
            const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
            
            // 检查当前月份是否被锁定
            const isMonthLocked = this.isMonthLocked(currentYear, currentMonthNum);
            
            // 表单内容
            const formContent = `
                ${isMonthLocked ? `
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-lock" style="color: #856404;"></i>
                        <span style="color: #856404; font-weight: 500;">${currentYear}年${currentMonthNum}月工资已锁定</span>
                    </div>
                    <p style="margin: 8px 0 0 0; color: #856404; font-size: 12px;">为保证数据安全与核算准确，已锁定期间的工资字段暂时禁用修改</p>
                    <p style="margin: 4px 0 0 0; color: #856404; font-size: 12px;">操作路径：点击日历右上角的🔓图标解锁</p>
                </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">姓名</label>
                    <input type="text" id="name" class="form-input" value="${this.personalInfo?.name || ''}" placeholder="请输入姓名" required>
                </div>
                <div class="form-group">
                    <label class="form-label">工种</label>
                    <input type="text" id="job" class="form-input" value="${this.personalInfo?.job || ''}" placeholder="请输入工种" required>
                </div>
                <div class="form-group">
                    <label class="form-label">就业类型</label>
                    <select id="type" class="form-select" ${isMonthLocked ? 'disabled' : ''}>
                        <option value="partTime" ${!isFullTime ? 'selected' : ''}>点工（按日计算）</option>
                        <option value="fullTime" ${isFullTime ? 'selected' : ''}>全职（按月计算）</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">休息制度</label>
                    <select id="rest" class="form-select" ${isMonthLocked ? 'disabled' : ''}>
                        <option value="doubleRest" ${(this.personalInfo?.restSystem || 'doubleRest') === 'doubleRest' ? 'selected' : ''}>双休（每周休息2天）</option>
                        <option value="singleRest" ${(this.personalInfo?.restSystem || 'doubleRest') === 'singleRest' ? 'selected' : ''}>单休（每周休息1天）</option>
                        <option value="freeRest" ${(this.personalInfo?.restSystem || 'doubleRest') === 'freeRest' ? 'selected' : ''}>自由休（灵活安排）</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">日工资（元）</label>
                    <input type="number" id="daily" class="form-input" value="${this.personalInfo?.wage || ''}" placeholder="请输入日工资" min="0" step="0.01" ${isMonthLocked ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">月工资（元）</label>
                    <input type="number" id="monthly" class="form-input" value="${isFullTime ? (this.personalInfo?.monthlyWage || '') : ((this.personalInfo?.wage || 0) * daysInCurrentMonth)}" placeholder="请输入月工资" min="0" step="0.01" ${!isFullTime || isMonthLocked ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">日工资计算方式（月工资计算时使用）</label>
                    <select id="calc" class="form-select" ${isMonthLocked ? 'disabled' : ''}>
                        <option value="natural" ${(this.personalInfo?.wageCalculationMethod || 'natural') === 'natural' ? 'selected' : ''}>按自然日（30天）</option>
                        <option value="currentMonth" ${(this.personalInfo?.wageCalculationMethod || 'natural') === 'currentMonth' ? 'selected' : ''}>按自然日当月天数（${daysInCurrentMonth}天）</option>
                        <option value="legal" ${(this.personalInfo?.wageCalculationMethod || 'natural') === 'legal' ? 'selected' : ''}>按法定工作日（21.75天）</option>
                        <option value="attendance" ${(this.personalInfo?.wageCalculationMethod || 'natural') === 'attendance' ? 'selected' : ''}>按标准工作日（26天）</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">加班工资倍率（0表示无加班费）</label>
                    <input type="number" id="overtime" class="form-input" value="${this.personalInfo?.overtimeRate || 0}" placeholder="例如：1.5表示1.5倍工资，0表示无加班费" min="0" max="3" step="0.5" ${isMonthLocked ? 'disabled' : ''}>
                </div>
                <div class="form-group" style="margin-top: 16px;">
                    <button type="button" class="btn btn-outline" id="subsidySettingsBtn" style="width: 100%;" ${isMonthLocked ? 'disabled' : ''}>
                        <i class="fas fa-utensils"></i> 补贴设置
                    </button>
                </div>
            `;
            
            // 使用this.dialog.show()创建对话框
            this.dialog.show({
                title: '编辑信息',
                htmlContent: formContent,
                showConfirm: true,
                showCancel: true,
                confirmText: '保存',
                cancelText: '取消',
                onShow: () => {
                    // 如果月份被锁定，不绑定事件监听器
                    if (isMonthLocked) {
                        return;
                    }
                    
                    // 绑定补贴设置按钮事件
                    const subsidyBtn = document.getElementById('subsidySettingsBtn');
                    if (subsidyBtn) {
                        subsidyBtn.addEventListener('click', () => {
                            this.showSubsidySettingsDialog();
                        });
                    }
                    
                    // 绑定就业类型变化事件
                    const typeSelect = document.getElementById('type');
                    const restSelect = document.getElementById('rest');
                    const calcSelect = document.getElementById('calc');
                    const monthlyInput = document.getElementById('monthly');
                    const dailyInput = document.getElementById('daily');
                    
                    const updatePartTimeOptions = () => {
                        const isPartTime = typeSelect.value === 'partTime';
                        const isDoubleRest = restSelect.value === 'doubleRest';
                        
                        // 更新休息制度选项
                        // 点工：只能选择自由休
                        // 全职：只能选择单休或双休
                        const restOptions = restSelect.options;
                        for (let i = 0; i < restOptions.length; i++) {
                            const option = restOptions[i];
                            if (isPartTime) {
                                // 点工：只有自由休可选
                                option.disabled = option.value !== 'freeRest';
                            } else {
                                // 全职：只有单休和双休可选
                                option.disabled = option.value === 'freeRest';
                            }
                        }
                        if (isPartTime && restSelect.value !== 'freeRest') {
                            restSelect.value = 'freeRest';
                        } else if (!isPartTime && restSelect.value === 'freeRest') {
                            restSelect.value = 'singleRest';
                        }
                        
                        // 更新日工资计算方式选项
                        const calcOptions = calcSelect.options;
                        for (let i = 0; i < calcOptions.length; i++) {
                            const option = calcOptions[i];
                            if (isPartTime) {
                                // 点工：只能选择按自然日当月天数
                                option.disabled = option.value !== 'currentMonth';
                            } else if (isDoubleRest) {
                                // 全职双休：只能选择按法定工作日
                                option.disabled = option.value !== 'legal';
                            } else {
                                // 全职单休：可以选择所有
                                option.disabled = false;
                            }
                        }
                        if (isPartTime && calcSelect.value !== 'currentMonth') {
                            calcSelect.value = 'currentMonth';
                        } else if (!isPartTime && isDoubleRest && calcSelect.value !== 'legal') {
                            calcSelect.value = 'legal';
                        }
                        
                        // 更新日工资和月工资输入框的禁用状态
                        if (isPartTime) {
                            // 点工：禁用月工资，启用日工资
                            const dailyWage = parseFloat(dailyInput.value) || 0;
                            monthlyInput.value = (dailyWage * daysInCurrentMonth).toString();
                            monthlyInput.disabled = true;
                            dailyInput.disabled = false;
                        } else {
                            // 全职：启用月工资，禁用日工资
                            monthlyInput.disabled = false;
                            dailyInput.disabled = true;
                            // 如果已有月工资数据，保持显示，不清空
                            if (!monthlyInput.value || monthlyInput.value === '0') {
                                monthlyInput.value = this.personalInfo?.monthlyWage || '';
                            }
                            // 计算并显示日工资
                            const monthlyWage = parseFloat(monthlyInput.value) || 0;
                            const calcMethod = calcSelect.value || 'natural';
                            let daysInMonth = 30;
                            
                            if (calcMethod === 'currentMonth') {
                                daysInMonth = daysInCurrentMonth;
                            } else if (calcMethod === 'legal') {
                                daysInMonth = 21.75;
                            } else if (calcMethod === 'attendance') {
                                daysInMonth = 26;
                            }
                            
                            if (monthlyWage > 0) {
                                const dailyWage = monthlyWage / daysInMonth;
                                dailyInput.value = dailyWage.toFixed(2);
                            }
                        }
                    };
                    
                    typeSelect.addEventListener('change', updatePartTimeOptions);
                    restSelect.addEventListener('change', updatePartTimeOptions);
                    monthlyInput.addEventListener('input', updatePartTimeOptions);
                    calcSelect.addEventListener('change', updatePartTimeOptions);
                    
                    updatePartTimeOptions();
                },
                onConfirm: async () => {
                    // 先获取表单数据
                    const name = document.getElementById('name').value || '';
                    const job = document.getElementById('job').value || '';
                    const employeeType = document.getElementById('type').value || 'partTime';
                    const restSystem = document.getElementById('rest').value || 'doubleRest';
                    const wage = parseFloat(document.getElementById('daily').value) || 0;
                    const monthlyWage = parseFloat(document.getElementById('monthly').value) || 0;
                    const wageCalculationMethod = document.getElementById('calc').value || 'natural';
                    const overtimeRate = parseFloat(document.getElementById('overtime').value) || 0;
                        
                    let finalWage = wage;
                    let finalMonthlyWage = monthlyWage;
                    
                    // 根据员工类型计算工资
                    if (employeeType === 'fullTime' && monthlyWage > 0) {
                        // 全职：根据月工资计算日工资
                        switch (wageCalculationMethod) {
                            case 'natural':
                                finalWage = monthlyWage / 30;
                                break;
                            case 'currentMonth':
                                // 按当月实际天数计算
                                const currentYear = this.currentMonth.getFullYear();
                                const currentMonthNum = this.currentMonth.getMonth() + 1;
                                const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                                finalWage = monthlyWage / daysInCurrentMonth;
                                break;
                            case 'legal':
                                finalWage = monthlyWage / 21.75;
                                break;
                            case 'attendance':
                                // 按出勤天数计算（固定26天）
                                const expectedWorkDays = 26;
                                finalWage = monthlyWage / expectedWorkDays;
                                break;
                        }
                    } else if (employeeType === 'partTime' && wage > 0) {
                        // 点工：月工资按当月满勤计算（预估最高工资）
                        const currentYear = this.currentMonth.getFullYear();
                        const currentMonthNum = this.currentMonth.getMonth() + 1;
                        const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                        // 点工按实际工作天数计算，月工资设为0表示不固定
                        finalMonthlyWage = 0;
                    }

                    // 创建项目特定的个人信息，保留原有的补贴设置
                    const personalInfo = {
                        id: `personalInfo_${this.currentProjectId}`,
                        projectId: this.currentProjectId,
                        name: name,
                        job: job,
                        employeeType: employeeType,
                        restSystem: restSystem,
                        wage: finalWage,
                        monthlyWage: finalMonthlyWage,
                        wageCalculationMethod: wageCalculationMethod,
                        overtimeRate: overtimeRate,
                        // 保留原有的补贴设置
                        subsidyType: this.personalInfo?.subsidyType || 'none',
                        monthlySubsidy: this.personalInfo?.monthlySubsidy || 0,
                        dailySubsidy: this.personalInfo?.dailySubsidy || 0,
                        perMealSubsidy: this.personalInfo?.perMealSubsidy || 0,
                        mealsPerDay: this.personalInfo?.mealsPerDay || 2,
                        subsidyStatuses: this.personalInfo?.subsidyStatuses || ['present', 'half', 'holiday', 'rest']
                    };

                    // 先保存到localStorage（立即完成）
                    const personalInfoKey = `personalInfo_${this.currentProjectId}`;
                    localStorage.setItem(personalInfoKey, JSON.stringify(personalInfo));
                    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
                    
                    // 后台异步保存到服务器（不阻塞用户）
                    const userId = localStorage.getItem('user_id');
                    if (userId) {
                        // 保存到 IndexedDB 和服务器（不等待）
                        this.storage.set('personalInfo', personalInfo).catch(err => {
                            console.error('保存个人信息失败:', err);
                        });
                        
                        // 同步到服务器（不等待）
                        const syncData = {
                            user_id: userId,
                            name, job, wage: finalWage, monthlyWage: finalMonthlyWage,
                            overtimeRate, employeeType, restSystem, wageCalculationMethod
                        };
                        fetch('/jg/api/update-user-info-batch.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(syncData)
                        }).catch(err => console.error('同步到服务器失败:', err));
                    }
                    
                    this.personalInfo = personalInfo;
                    
                    // 立即更新UI（不等待）
                    this.updatePartial({ personalInfo: true, statistics: true });
                    
                    // 后台检查工资变化并保存工资历史
                    const currentYear = this.currentMonth.getFullYear();
                    const currentMonthNum = this.currentMonth.getMonth() + 1;
                    const wageChanged = this.personalInfo.wage !== finalWage || 
                                       this.personalInfo.monthlyWage !== finalMonthlyWage;
                    
                    if (wageChanged) {
                        // 后台异步保存工资历史（不阻塞）
                        const currentMonthStr = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`;
                        const currentMonthAttendance = this.attendance.filter(a => a.date.startsWith(currentMonthStr));
                        
                        if (currentMonthAttendance.length > 0) {
                            const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
                            const attendanceStats = this.calculateAttendanceStats(currentMonthAttendance, daysInMonth);
                            const overtimeStats = this.calculateOvertimeStats(currentMonthAttendance);
                            const wageStats = this.calculateWage(attendanceStats, overtimeStats, true);
                            
                            this.saveWageHistory(currentYear, currentMonthNum, attendanceStats.workDays, wageStats.totalWage, overtimeStats.totalOvertimeHours).catch(err => {
                                console.error('保存工资历史失败:', err);
                            });
                        }
                    }
                    
                    this.toast.success('信息保存成功');
                }
            });
            
            // 设置工资字段逻辑
            this.setTimeoutSafe(function() {
                const typeSelect = document.getElementById('type');
                const dailyInput = document.getElementById('daily');
                const monthlyInput = document.getElementById('monthly');
                
                if (!typeSelect || !dailyInput || !monthlyInput) {
                    console.error('工资输入框未找到！');
                    return;
                }
                
                function updateWageFields() {
                    const type = typeSelect.value;
                    
                    if (type === 'fullTime') {
                        // 全职：月工资可编辑，日工资禁用
                        monthlyInput.disabled = false;
                        monthlyInput.style.backgroundColor = 'var(--bg-dark)';
                        monthlyInput.style.color = 'var(--text-color)';
                        monthlyInput.style.border = '1px solid var(--border-color)';
                        monthlyInput.style.cursor = 'text';
                        
                        dailyInput.disabled = true;
                        dailyInput.style.backgroundColor = 'var(--bg-dark)';
                        dailyInput.style.color = 'var(--text-light)';
                        dailyInput.style.border = '1px solid var(--border-color)';
                        dailyInput.style.cursor = 'not-allowed';
                    } else {
                        // 点工：日工资可编辑，月工资禁用
                        dailyInput.disabled = false;
                        dailyInput.style.backgroundColor = 'var(--bg-dark)';
                        dailyInput.style.color = 'var(--text-color)';
                        dailyInput.style.border = '1px solid var(--border-color)';
                        dailyInput.style.cursor = 'text';
                        
                        monthlyInput.disabled = true;
                        monthlyInput.style.backgroundColor = 'var(--bg-dark)';
                        monthlyInput.style.color = 'var(--text-light)';
                        monthlyInput.style.border = '1px solid var(--border-color)';
                        monthlyInput.style.cursor = 'not-allowed';
                    }
                }
                
                // 绑定事件
                typeSelect.onchange = updateWageFields;
                
                // 初始调用
                updateWageFields();
            }, 100);
            
        } catch (error) {
            console.error('Error in handleEditInfo:', error);
            this.toast.error('编辑功能出错，请刷新页面重试');
        }
    }

    handleNewProject() {
        try {
            // 表单内容 - 与项目管理页面一致
            const formContent = `
                <div class="form-group">
                    <label class="form-label">项目名称 <span style="color: red;">*</span></label>
                    <input type="text" id="project-name" class="form-input" placeholder="请输入项目名称" required>
                </div>
                <div class="form-group">
                    <label class="form-label">项目地址 <span style="color: red;">*</span></label>
                    <input type="text" id="project-address" class="form-input" placeholder="请输入项目地址" required>
                </div>
                <div class="form-group">
                    <label class="form-label">项目描述</label>
                    <textarea id="project-description" class="form-textarea" placeholder="请输入项目描述" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">工种</label>
                    <input type="text" id="project-type" class="form-input" placeholder="请输入工种（如：木工、电工）">
                </div>
                <div class="form-group">
                    <label class="form-label">项目经理</label>
                    <input type="text" id="project-manager" class="form-input" placeholder="请输入姓名">
                </div>
                <div class="form-group">
                    <label class="form-label">手机号 <span style="color: red;">*</span></label>
                    <input type="tel" id="project-phone" class="form-input" placeholder="请输入手机号" required>
                </div>
                <div class="form-row" style="display: flex; gap: 10px;">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">上午上班</label>
                        <input type="time" id="project-morning-start" class="form-input" value="08:00">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">上午下班</label>
                        <input type="time" id="project-morning-end" class="form-input" value="12:00">
                    </div>
                </div>
                <div class="form-row" style="display: flex; gap: 10px;">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">下午上班</label>
                        <input type="time" id="project-afternoon-start" class="form-input" value="14:00">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">下午下班</label>
                        <input type="time" id="project-afternoon-end" class="form-input" value="18:00">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">提前打卡时间范围（分钟）</label>
                    <input type="number" id="project-early-checkin" class="form-input" value="60" min="0" max="180">
                </div>
            `;
            
            // 使用this.dialog.show()创建对话框
            this.dialog.show({
                title: '新建项目',
                htmlContent: formContent,
                showConfirm: true,
                showCancel: true,
                confirmText: '创建',
                cancelText: '取消',
                onConfirm: async () => {
                    // 获取表单数据
                    const name = document.getElementById('project-name').value || '';
                    const address = document.getElementById('project-address').value || '';
                    const description = document.getElementById('project-description').value || '';
                    const type = document.getElementById('project-type').value || '';
                    const projectManager = document.getElementById('project-manager').value || '';
                    const phone = document.getElementById('project-phone').value || '';
                    const morningStart = document.getElementById('project-morning-start').value || '08:00';
                    const morningEnd = document.getElementById('project-morning-end').value || '12:00';
                    const afternoonStart = document.getElementById('project-afternoon-start').value || '14:00';
                    const afternoonEnd = document.getElementById('project-afternoon-end').value || '18:00';
                    const earlyCheckInLimit = parseInt(document.getElementById('project-early-checkin').value) || 60;
                    
                    if (!name) {
                        this.toast.error('请输入项目名称');
                        return false;
                    }
                    
                    if (!address) {
                        this.toast.error('请输入项目地址');
                        return false;
                    }
                    
                    if (!phone) {
                        this.toast.error('请输入手机号');
                        return false;
                    }
                    
                    try {
                        const projectId = Utils.generateId();
                        
                        const project = {
                            id: projectId,
                            name: name,
                            address: address,
                            description: description,
                            type: type,
                            personalInfo: {
                                name: projectManager,
                                phone: phone
                            },
                            workHours: {
                                morningStart: morningStart,
                                morningEnd: morningEnd,
                                afternoonStart: afternoonStart,
                                afternoonEnd: afternoonEnd,
                                earlyCheckInLimit: earlyCheckInLimit
                            },
                            createdAt: new Date().toISOString(),
                            order: this.projects.length
                        };

                        await this.storage.set('projects', project);
                        
                        // 同时更新 localStorage
                        // 将新项目插入到第2个位置（索引1），确保能立即显示
                        if (this.projects.length >= 1) {
                            this.projects.splice(1, 0, project);
                        } else {
                            this.projects.push(project);
                        }
                        localStorage.setItem('projects', JSON.stringify(this.projects));
                        
                        // 如果是第一个项目，自动设为当前项目
                        if (this.projects.length === 1) {
                            this.currentProjectId = project.id;
                            this.storage.setLocal('currentProjectId', project.id);
                        }
                        
                        this.renderProjects();
                        this.toast.success('项目创建成功');
                        return true;
                    } catch (error) {
                        this.logger.error('Failed to create project:', error);
                        this.toast.error('创建失败，请重试');
                        return false;
                    }
                }
            });
            
            // 绑定项目经理姓名输入事件，实现手机号自动填充
            setTimeout(() => {
                const projectManagerInput = document.getElementById('project-manager');
                const phoneInput = document.getElementById('project-phone');
                
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
            
        } catch (error) {
            this.logger.error('Error in handleNewProject:', error);
            this.toast.error('新建项目功能出错，请刷新页面重试');
        }
    }

    async switchProject(projectId) {
        const project = this.projects.find(p => String(p.id) === String(projectId));
        
        if (!project) {
            this.toast.error('项目不存在');
            return;
        }
        
        if (project.isEnded) {
            this.toast.error('该项目已结束，无法选择');
            return;
        }
        
        // 检查是否是当前项目
        const isCurrentProject = String(projectId) === String(this.currentProjectId);
        
        if (isCurrentProject) {
            // 如果是当前项目，执行卡片翻转
            const projectItem = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
            if (projectItem) {
                const cardInner = projectItem.querySelector('.card-inner');
                const cardBack = projectItem.querySelector('.card-back');
                if (cardInner && cardBack) {
                    // 检查卡片是否已经翻转
                    const isFlipped = cardBack.style.display === 'block';
                    
                    if (isFlipped) {
                        // 如果已经翻转，就转回去
                        cardInner.style.transform = 'rotateY(0deg)';
                        this.setTimeoutSafe(() => {
                            cardBack.style.display = 'none';
                        }, 250);
                        this.toast.info('卡片已关闭');
                    } else {
                        // 如果没有翻转，执行翻转
                        cardInner.style.transform = 'rotateY(180deg)';
                        cardBack.style.display = 'block';
                        this.toast.info('卡片已翻转');
                    }
                }
            }
            return;
        }
        
        // 保存当前项目ID
        this.currentProjectId = projectId;
        this.storage.setLocal('currentProjectId', projectId);
        
        try {
            // 保存当前项目ID到服务器
            await this.storage.set('userSettings', {
                id: 'currentProjectId',
                key: 'currentProjectId',
                value: projectId,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('保存当前项目ID到服务器失败:', error);
        }
        
        // 获取当前项目在列表中的位置
        const projectIndex = this.projects.findIndex(p => String(p.id) === String(projectId));
        
        // 执行项目切换动画
        if (projectIndex > 0) {
            this.animateProjectMove(projectId, projectIndex);
        }
        
        // 重新加载数据，包括项目特定的个人信息
        try {
            // 等待动画完成后再显示加载状态
            if (projectIndex > 0) {
                await new Promise(resolve => setTimeout(resolve, 600));
            }
            
            // 手动更新项目顺序，确保当前项目在第一个位置
            if (projectIndex > 0) {
                // 从数组中移除点击的项目
                const [movedProject] = this.projects.splice(projectIndex, 1);
                // 将点击的项目添加到数组的最前面
                this.projects.unshift(movedProject);
                // 更新所有项目的排序字段
                this.projects.forEach((proj, index) => {
                    proj.order = index;
                });
                // 保存更新后的项目列表（异步，不阻塞）
                this.setTimeoutSafe(async () => {
                    try {
                        for (const proj of this.projects) {
                            await this.storage.set('projects', proj);
                        }
                        // 同时更新localStorage中的项目列表，确保顺序一致
                        localStorage.setItem('projects', JSON.stringify(this.projects));
                    } catch (saveError) {
                        this.logger.error('Failed to save project order:', saveError);
                    }
                }, 0);
            }
            
            this.showDataLoading();
            await this.loadData();
            
            await this.updateAll();
            
            this.eventBus.emit('project:switched', { projectId: projectId });
            
            this.toast.success('项目切换成功');
        } catch (error) {
            console.error('切换项目失败:', error);
            this.toast.error('项目切换失败，请刷新页面重试');
        }
        

    }

    // 从localStorage加载节日数据
    loadHolidaysFromLocalStorage() {
        try {
            const holidaysJson = localStorage.getItem('holidays');
            if (holidaysJson) {
                const localStorageHolidays = JSON.parse(holidaysJson) || [];
                if (localStorageHolidays.length > 0) {
                    this.holidays = localStorageHolidays;
                }
            }
        } catch (error) {
            console.error('从localStorage获取节日数据失败:', error);
        }
    }
    
    // 从localStorage加载考勤数据
    async loadAttendanceFromLocalStorage() {
        try {
            const attendanceJson = localStorage.getItem('attendance');
            if (attendanceJson) {
                const localStorageAttendance = JSON.parse(attendanceJson) || [];
                if (Array.isArray(localStorageAttendance)) {
                    // 过滤出当前项目的考勤数据
                    const currentProjectIdClean = String(this.currentProjectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
                    const projectAttendance = localStorageAttendance.filter(item => {
                        const recordProjectId = String(item.projectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
                        return recordProjectId === currentProjectIdClean;
                    });
                    // 无论projectAttendance是否为空，都更新this.attendance
                    this.attendance = projectAttendance;
                }
            } else if (this.currentProjectId) {
                // localStorage 没有数据，尝试从 IndexedDB 加载
                try {
                    console.log('从IndexedDB加载考勤数据...', this.currentProjectId);
                    const dbAttendance = await this.storage.getAttendance(this.currentProjectId);
                    console.log('从IndexedDB加载考勤数据成功:', dbAttendance.length);
                    if (dbAttendance && dbAttendance.length > 0) {
                        this.attendance = dbAttendance;
                        localStorage.setItem('attendance', JSON.stringify(dbAttendance));
                        console.log('考勤数据已保存到localStorage');
                    } else {
                        console.log('IndexedDB中没有考勤数据');
                    }
                } catch (dbError) {
                    console.error('从IndexedDB加载考勤数据失败:', dbError);
                    this.attendance = [];
                }
            } else {
                // 如果localStorage中没有考勤数据且没有当前项目，清空this.attendance
                this.attendance = [];
            }
        } catch (localError) {
            console.error('从localStorage获取考勤数据失败:', localError);
            // 出错时尝试从 IndexedDB 加载
            if (this.currentProjectId) {
                try {
                    const dbAttendance = await this.storage.getAttendance(this.currentProjectId);
                    if (dbAttendance && dbAttendance.length > 0) {
                        this.attendance = dbAttendance;
                        localStorage.setItem('attendance', JSON.stringify(dbAttendance));
                    }
                } catch (dbError) {
                    console.error('从IndexedDB加载考勤数据失败:', dbError);
                    this.attendance = [];
                }
            } else {
                this.attendance = [];
            }
        }
    }
    
    changeMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        
        // 立即更新月份标题，让用户看到月份已经切换
        const titleEl = document.getElementById('calendarTitle');
        if (titleEl) {
            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth() + 1;
            titleEl.textContent = `${year}年${month}月`;
        }
        
        // 先检查本地是否有缓存数据
        let hasLocalData = false;
        try {
            const attendanceJson = localStorage.getItem('attendance');
            const holidaysJson = localStorage.getItem('holidays');
            if (attendanceJson && holidaysJson) {
                const attendanceData = JSON.parse(attendanceJson);
                const holidaysData = JSON.parse(holidaysJson);
                if (Array.isArray(attendanceData) && attendanceData.length > 0 && 
                    Array.isArray(holidaysData) && holidaysData.length > 0) {
                    hasLocalData = true;
                    // 立即更新界面，不显示加载状态
                    this.updatePartial({ personalInfo: true, calendar: true, statistics: true, workTable: true });
                }
            }
        } catch (e) {
            console.error('检查本地缓存失败:', e);
        }
        
        // 只有在没有本地数据时才显示加载状态
        if (!hasLocalData) {
            const calendarDays = document.getElementById('calendarDays');
            if (calendarDays) {
                // 第一步：给容器设置相对定位，作为绝对定位的参考
                calendarDays.style.position = 'relative';
                // 第二步：清空容器原有内容，避免干扰
                calendarDays.style.height = '300px'; // 强制给容器设高度，可根据需求改
                calendarDays.style.overflow = 'hidden'; // 防止内容溢出
                
                // 第三步：用绝对定位+transform实现万能居中
                calendarDays.innerHTML = `
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 16px;
                        color: var(--text-secondary);
                    ">加载中...</div>
                `;
            }
        }

        
        if (this.currentProjectId) {
            // 后台加载考勤数据，不阻塞界面
            this.storage.getAttendance(this.currentProjectId).then(attendance => {
                this.attendance = attendance || [];
                return this.storage.getHolidays(this.currentProjectId);
            }).then(holidays => {
                this.holidays = holidays || [];
                // 数据加载完成后更新界面
                this.updatePartial({ personalInfo: true, calendar: true, statistics: true, workTable: true });
            }).catch(error => {
                console.error('加载考勤数据失败:', error);
                // 即使加载失败也更新界面
                this.updatePartial({ personalInfo: true, calendar: true, statistics: true, workTable: true });
            });
        } else {
            // 没有项目时直接更新界面
            this.updatePartial({ personalInfo: true, calendar: true, statistics: true, workTable: true });
        }
    }

    async setAttendance(status) {
        const selectedDateEl = document.querySelector('.day-item.selected');
        if (!selectedDateEl) {
            this.toast.warning('请先选择日期');
            return;
        }

        const dateStr = selectedDateEl.dataset.date;

        // 检查月份是否已锁定
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        if (this.isMonthLocked(year, month)) {
            this.toast.warning('该月已锁定，无法修改考勤');
            return;
        }

        if (status === 'absent') {
            this.showAbsentReasonDialog(dateStr);
            return;
        }

        const existingAttendance = this.attendance.find(a => a.date === dateStr);
        
        try {
            // 使用与IntelligentStorageManager相同的ID格式
            const attendanceId = `attendance_${this.currentProjectId}_${dateStr}`;
            
            // 创建考勤数据对象
            const attendanceData = existingAttendance ? 
                { ...existingAttendance, id: attendanceId, status, updatedAt: new Date().toISOString() } : 
                { id: attendanceId, projectId: this.currentProjectId, date: dateStr, status, updatedAt: new Date().toISOString() };
            
            // 保存考勤数据
            await this.storage.saveAttendance(
                attendanceData.projectId,
                attendanceData.date,
                attendanceData.status,
                attendanceData.remark || null
            );
            
            // 更新本地考勤数据
            if (existingAttendance) {
                const index = this.attendance.findIndex(a => a.date === dateStr);
                this.attendance[index] = attendanceData;
            } else {
                this.attendance.push(attendanceData);
            }
            
            // 同时更新localStorage中的数据
            try {
                const attendanceJson = localStorage.getItem('attendance');
                if (attendanceJson) {
                    const localStorageAttendance = JSON.parse(attendanceJson) || [];
                    if (Array.isArray(localStorageAttendance)) {
                        // 检查是否已存在该日期的记录
                        const existingIndex = localStorageAttendance.findIndex(item => String(item.projectId) === String(this.currentProjectId) && item.date === dateStr);
                        if (existingIndex >= 0) {
                            // 更新现有记录
                            localStorageAttendance[existingIndex] = { ...localStorageAttendance[existingIndex], id: attendanceId, status, updatedAt: new Date().toISOString() };
                        } else {
                            // 添加新记录
                            localStorageAttendance.push({ id: attendanceId, projectId: this.currentProjectId, date: dateStr, status, updatedAt: new Date().toISOString() });
                        }
                        // 保存回localStorage
                        localStorage.setItem('attendance', JSON.stringify(localStorageAttendance));
                    }
                }
            } catch (localError) {
                console.error('更新localStorage中的考勤数据失败:', localError);
            }
            
            await this.updatePartial({ calendar: true, statistics: true, workTable: true });
            
            const label = status === 'present' ? '满勤' : '半天';
            this.toast.success(`${dateStr}设置为${label}`);
        } catch (error) {
            this.logger.error('Failed to set attendance:', error);
            this.toast.error('设置失败，请重试');
        }
    }

    animateProjectMove(projectId, fromIndex) {
        const projectList = document.getElementById('projectList');
        if (!projectList) return;
        
        const projectItems = projectList.querySelectorAll('.project-item');
        const clickedElement = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
        
        // 检测设备类型
        const isMobile = window.innerWidth <= 768;
        
        // 为所有项目卡片添加过渡效果
        projectItems.forEach((item, index) => {
            item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            item.style.position = 'relative';
            item.style.zIndex = '1';
        });
        
        // 获取第一个项目的位置和尺寸，用于计算移动距离
        const firstItem = projectItems[0];
        if (!firstItem || !clickedElement) return;
        
        const firstRect = firstItem.getBoundingClientRect();
        const clickedRect = clickedElement.getBoundingClientRect();
        
        // 计算实际移动距离
        const moveX = firstRect.left - clickedRect.left;
        const moveY = firstRect.top - clickedRect.top;
        
        // 为点击的项目添加更强的动画效果
        clickedElement.style.zIndex = '100';
        clickedElement.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
        clickedElement.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.3)';
        clickedElement.style.opacity = '1';
        
        // 为其他项目添加淡出效果
        projectItems.forEach((item, index) => {
            if (index !== fromIndex && index < fromIndex) {
                item.style.opacity = '0';
                item.style.transform = isMobile ? 'translateY(50px)' : 'translateX(50px)';
            }
        });
        
        // 为后面的项目添加移动效果
        projectItems.forEach((item, index) => {
            if (index > fromIndex) {
                if (isMobile) {
                    item.style.transform = 'translateY(-30px)';
                } else {
                    item.style.transform = 'translateX(-30px)';
                }
                item.style.opacity = '0.7';
            }
        });
        
        // 动画完成后重置样式
        this.setTimeoutSafe(() => {
            projectItems.forEach((item) => {
                item.style.transition = '';
                item.style.position = '';
                item.style.zIndex = '';
                item.style.transform = '';
                item.style.boxShadow = '';
                item.style.opacity = '';
            });
        }, 600);
    }

    async clearAttendance() {
        const selectedDateEl = document.querySelector('.day-item.selected');
        if (!selectedDateEl) {
            this.toast.warning('请先选择日期');
            return;
        }

        const dateStr = selectedDateEl.dataset.date;
        const existingAttendance = this.attendance.find(a => a.date === dateStr);
        
        if (!existingAttendance) {
            this.toast.info('该日期没有考勤记录');
            return;
        }

        try {
            // 从内存中过滤掉要删除的记录
            this.attendance = this.attendance.filter(a => a.date !== dateStr);
            
            // 直接更新localStorage中的数据，这是最关键的一步
            try {
                const attendanceJson = localStorage.getItem('attendance');
                if (attendanceJson) {
                    const localStorageAttendance = JSON.parse(attendanceJson) || [];
                    if (Array.isArray(localStorageAttendance)) {
                        // 过滤出不是当前日期的记录
                        const updatedAttendance = localStorageAttendance.filter(item => !(String(item.projectId) === String(this.currentProjectId) && item.date === dateStr));
                        // 保存回localStorage
                        localStorage.setItem('attendance', JSON.stringify(updatedAttendance));
                    }
                } else {
                    // 如果localStorage中没有考勤数据，清空this.attendance
                    this.attendance = [];
                }
            } catch (localError) {
                console.error('更新localStorage中的考勤数据失败:', localError);
            }
            
            // 尝试从服务器删除考勤记录（即使失败也不影响本地清除）
            try {
                await this.storage.deleteAttendance(this.currentProjectId, dateStr);
            } catch (serverError) {
                console.error('从服务器删除考勤记录失败:', serverError);
            }
            
            await this.updatePartial({ calendar: true, statistics: true, workTable: true });
            this.toast.success(`${dateStr}考勤记录已清除`);
        } catch (error) {
            this.logger.error('Failed to clear attendance:', error);
            this.toast.error('清除失败，请重试');
        }
    }

    showAbsentReasonDialog(dateStr) {
        const [year, month, day] = dateStr.split('-');
        
        const isFullTime = this.personalInfo?.employeeType === 'fullTime';
        
        this.dialog.show({
            title: '选择缺勤原因',
            htmlContent: `
                <div class="absent-reason-dialog">
                    <div class="dialog-date">${month}月${day}日</div>
                    <div class="reason-buttons">
                        <button class="reason-btn leave-btn" data-reason="请假">
                            <i class="fas fa-calendar-check"></i>
                            <span>请假</span>
                        </button>
                        <button class="reason-btn holiday-btn ${!isFullTime ? 'disabled' : ''}" data-reason="放假" ${!isFullTime ? 'disabled' : ''}>
                            <i class="fas fa-umbrella-beach"></i>
                            <span>放假</span>
                        </button>
                        <button class="reason-btn rest-btn ${!isFullTime ? 'disabled' : ''}" data-reason="休息" ${!isFullTime ? 'disabled' : ''}>
                            <i class="fas fa-bed"></i>
                            <span>休息</span>
                        </button>
                    </div>
                    ${!isFullTime ? '<div class="reason-tip" style="text-align: center; color: var(--text-secondary); font-size: 12px; margin-top: 12px;">点工仅支持请假</div>' : ''}
                </div>
            `,
            showConfirm: false,
            showCancel: true,
            cancelText: '取消',
            width: '400px'
        });

        this.setTimeoutSafe(() => {
            const dialogContent = document.querySelector('.absent-reason-dialog');
            if (dialogContent) {
                const handleReasonClick = (e) => {
                    const reasonBtn = e.target.closest('.reason-btn');
                    if (reasonBtn && !reasonBtn.disabled) {
                        const reason = reasonBtn.dataset.reason;
                        this.setAbsentReason(dateStr, reason);
                        this.dialog.hide();
                    }
                };
                this.addEventListenerSafe(dialogContent, 'click', handleReasonClick);
            }
        }, 100);
    }

    async setAbsentReason(dateStr, reason) {
        const existingAttendance = this.attendance.find(a => a.date === dateStr);
        
        try {
            await this.storage.saveAttendance(this.currentProjectId, dateStr, 'absent', reason);
            
            // 使用与IntelligentStorageManager相同的ID格式
            const attendanceId = `attendance_${this.currentProjectId}_${dateStr}`;
            
            // 更新本地考勤数据
            if (existingAttendance) {
                const index = this.attendance.findIndex(a => a.date === dateStr);
                this.attendance[index] = { ...existingAttendance, id: attendanceId, status: 'absent', remark: reason, updatedAt: new Date().toISOString() };
            } else {
                this.attendance.push({ id: attendanceId, projectId: this.currentProjectId, date: dateStr, status: 'absent', remark: reason, updatedAt: new Date().toISOString() });
            }
            
            // 同时更新localStorage中的数据
            try {
                const attendanceJson = localStorage.getItem('attendance');
                if (attendanceJson) {
                    const localStorageAttendance = JSON.parse(attendanceJson) || [];
                    if (Array.isArray(localStorageAttendance)) {
                        // 检查是否已存在该日期的记录
                        const existingIndex = localStorageAttendance.findIndex(item => String(item.projectId) === String(this.currentProjectId) && item.date === dateStr);
                        if (existingIndex >= 0) {
                            localStorageAttendance[existingIndex] = { ...localStorageAttendance[existingIndex], id: attendanceId, status: 'absent', remark: reason, updatedAt: new Date().toISOString() };
                        } else {
                            localStorageAttendance.push({ id: attendanceId, projectId: this.currentProjectId, date: dateStr, status: 'absent', remark: reason, updatedAt: new Date().toISOString() });
                        }
                        localStorage.setItem('attendance', JSON.stringify(localStorageAttendance));
                    }
                }
            } catch (localError) {
                console.error('更新localStorage中的考勤数据失败:', localError);
            }
            
            await this.updatePartial({ calendar: true, statistics: true, workTable: true });
            
            const [year, month, day] = dateStr.split('-');
            this.toast.success(`${month}月${day}日: 缺勤（${reason}）`);
        } catch (error) {
            this.logger.error('Failed to set absent reason:', error);
            this.toast.error('设置失败，请重试');
        }
    }

    showNoteDialog(dateStr) {
        const attendance = this.attendance.find(a => a.date === dateStr);
        const note = attendance?.remark || '';
        const overtime = attendance?.overtime || 0;
        const overtimeType = attendance?.overtimeType || 'weekday';
        
        const [year, month, day] = dateStr.split('-');
        
        const overtimeRate = overtimeType === 'weekday' ? '1.5' : overtimeType === 'weekend' ? '2' : overtimeType === 'holiday' ? '3' : '0';
        
        this.dialog.show({
            title: '添加备注',
            htmlContent: `
                <div class="note-dialog">
                    <div class="note-date">${year}年${month}月${day}日</div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sticky-note"></i> 备注内容
                        </label>
                        <textarea id="noteContent" class="form-textarea" placeholder="请输入备注内容（如：加班、请假看病、工具损坏等）..." maxlength="200">${note}</textarea>
                        <div class="char-count">还可输入 <span id="noteCharCount">${200 - note.length}</span> 字</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock text-warning"></i> 加班类型
                        </label>
                        <select id="overtimeType" class="form-select">
                            <option value="none" ${overtimeType === 'none' ? 'selected' : ''}>无加班费（0倍）</option>
                            <option value="weekday" ${overtimeType === 'weekday' ? 'selected' : ''}>工作日加班（1.5倍）</option>
                            <option value="weekend" ${overtimeType === 'weekend' ? 'selected' : ''}>周末加班（2倍）</option>
                            <option value="holiday" ${overtimeType === 'holiday' ? 'selected' : ''}>节假日加班（3倍）</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock text-warning"></i> 加班时长（小时）
                        </label>
                        <input type="number" id="overtimeHours" class="form-input" placeholder="请输入加班时长，例如：2.5" min="0" max="24" step="0.5" value="${overtime}">
                        <div class="overtime-calc">加班工资计算：日薪 ÷ 8小时 × 加班时长 × <span id="overtimeRateDisplay">${overtimeRate}</span>倍</div>
                    </div>
                </div>
            `,
            showConfirm: true,
            showCancel: true,
            confirmText: '保存备注',
            cancelText: '取消',
            width: '500px',
            onConfirm: () => this.saveNote(dateStr)
        });

        this.setTimeoutSafe(() => {
            const noteContent = document.getElementById('noteContent');
            const noteCharCount = document.getElementById('noteCharCount');
            const overtimeType = document.getElementById('overtimeType');
            const overtimeHours = document.getElementById('overtimeHours');
            const overtimeRateDisplay = document.getElementById('overtimeRateDisplay');

            if (noteContent && noteCharCount) {
                this.addEventListenerSafe(noteContent, 'input', () => {
                    const remaining = 200 - noteContent.value.length;
                    noteCharCount.textContent = remaining;
                });
            }

            if (overtimeType && overtimeRateDisplay) {
                this.addEventListenerSafe(overtimeType, 'change', () => {
                    const rate = overtimeType.value === 'none' ? '0' : overtimeType.value === 'weekday' ? '1.5' : overtimeType.value === 'weekend' ? '2' : '3';
                    overtimeRateDisplay.textContent = rate;
                });
            }
        }, 100);
    }

    async saveNote(dateStr) {
        const noteContent = document.getElementById('noteContent');
        const overtimeType = document.getElementById('overtimeType');
        const overtimeHours = document.getElementById('overtimeHours');

        if (!noteContent || !overtimeType || !overtimeHours) {
            return;
        }

        const note = noteContent.value.trim();
        const overtime = parseFloat(overtimeHours.value) || 0;
        const overtimeTypeValue = overtimeType.value;

        let attendance = this.attendance.find(a => a.date === dateStr);
        
        if (!attendance) {
            attendance = {
                id: Utils.generateId(),
                projectId: this.currentProjectId,
                date: dateStr,
                status: 'present',
                remark: note,
                overtime: overtime,
                overtimeType: overtimeTypeValue,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.attendance.push(attendance);
        } else {
            attendance.remark = note;
            attendance.overtime = overtime;
            attendance.overtimeType = overtimeTypeValue;
            attendance.updatedAt = new Date().toISOString();
        }
        
        try {
            await this.storage.set('attendance', attendance);
            await this.updatePartial({ workTable: true, calendar: true, statistics: true });
            
            const [year, month, day] = dateStr.split('-');
            this.toast.success(`${month}月${day}日备注已保存`);
        } catch (error) {
            this.logger.error('Failed to save note:', error);
            this.toast.error('保存失败，请重试');
        }
    }

    toggleMobileMenu() {
        // 首先尝试通过id找到菜单元素
        let menu = document.getElementById('mobileMenu');
        // 如果没找到，再尝试通过class找到
        if (!menu) {
            menu = document.querySelector('.mobile-menu');
        }
        if (menu) {
            if (menu.classList.contains('show')) {
                menu.classList.remove('show');
                this.setTimeoutSafe(() => {
                    menu.style.display = 'none';
                }, 300);
            } else {
                menu.style.display = 'block';
                this.setTimeoutSafe(() => {
                    menu.classList.add('show');
                }, 10);
            }
        } else {
            console.error('菜单元素未找到');
        }
    }

    closeMobileMenu() {
        let menu = document.getElementById('mobileMenu');
        if (!menu) {
            menu = document.querySelector('.mobile-menu');
        }
        if (menu) {
            menu.classList.remove('show');
            this.setTimeoutSafe(() => {
                menu.style.display = 'none';
            }, 300);
        } else {
            console.error('菜单元素未找到');
        }
    }







    // 处理分享截图
    handleShareScreenshot() {
        // 先关闭菜单
        this.closeMobileMenu();
        
        // 延迟执行截图操作，确保菜单完全关闭
        this.setTimeoutSafe(() => {
            // 实现分享截图功能
            this.performScreenshot();
        }, 300); // 300毫秒的延迟，与菜单关闭动画时间匹配
    }

    // 执行截图操作
    performScreenshot() {
        try {
            // 显示加载提示
            if (this.toast) {
                this.toast.info('正在准备截图功能，请稍候...');
            } else {
                alert('正在准备截图功能，请稍候...');
            }
            
            // 动态加载HTML2Canvas库
            this.loadHTML2Canvas().then(() => {
                // 显示加载提示
                if (this.toast) {
                    this.toast.info('正在截图，请稍候...');
                } else {
                    alert('正在截图，请稍候...');
                }
                
                // 获取要截图的元素（整个文档体）
                const element = document.body;
                
                // 保存原始的滚动位置
                const originalScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                const originalScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // 保存原始的body样式
                const originalBodyStyle = document.body.style.cssText;
                
                try {
                    // 临时修改body样式，确保能够截取整个页面
                    document.body.style.height = document.body.scrollHeight + 'px';
                    document.body.style.overflow = 'visible';
                    document.body.style.position = 'relative';
                    
                    // 配置HTML2Canvas选项，确保生成高清图片和整页截图
                    const options = {
                        scale: 2, // 缩放比例，2表示2倍高清
                        useCORS: true, // 允许跨域图片
                        logging: false, // 禁用日志
                        backgroundColor: '#ffffff', // 设置背景色为白色
                        removeContainer: true, // 自动移除生成的容器
                        allowTaint: true, // 允许污染的画布
                        letterRendering: true, // 启用字母渲染
                        scrollX: 0, // 滚动到顶部
                        scrollY: 0, // 滚动到左侧
                        windowWidth: document.documentElement.scrollWidth, // 整个页面的宽度
                        windowHeight: document.documentElement.scrollHeight, // 整个页面的高度
                        ignoreElements: function(element) {
                            // 忽略一些不需要截图的元素，如菜单按钮、加载动画等
                            return element.classList.contains('menu-btn') || 
                                   element.classList.contains('mobile-menu') || 
                                   element.classList.contains('mobile-menu-overlay');
                        }
                    };
                    
                    // 执行截图
                    window.html2canvas(element, options).then(canvas => {
                        // 转换为图片URL
                        const imgData = canvas.toDataURL('image/png');
                        
                        // 创建临时链接用于下载
                        const link = document.createElement('a');
                        link.download = `任工记工_截图_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
                        link.href = imgData;
                        link.click();
                        
                        // 显示成功提示
                        if (this.toast) {
                            this.toast.success('截图成功，已下载到本地');
                        } else {
                            alert('截图成功，已下载到本地');
                        }
                    }).catch(error => {
                        console.error('截图失败:', error);
                        // 显示失败提示
                        if (this.toast) {
                            this.toast.error('截图失败，请重试');
                        } else {
                            alert('截图失败，请重试');
                        }
                    });
                } finally {
                    // 恢复原始的滚动位置
                    window.scrollTo(originalScrollLeft, originalScrollTop);
                    
                    // 恢复原始的body样式
                    document.body.style.cssText = originalBodyStyle;
                }
            }).catch(error => {
                console.error('加载HTML2Canvas失败:', error);
                // 显示失败提示
                if (this.toast) {
                    this.toast.error('截图功能准备失败，请重试');
                } else {
                    alert('截图功能准备失败，请重试');
                }
            });
        } catch (error) {
            console.error('执行截图操作失败:', error);
            // 显示失败提示
            if (this.toast) {
                this.toast.error('截图失败，请重试');
            } else {
                alert('截图失败，请重试');
            }
        }
    }

    // 加载HTML2Canvas库
    loadHTML2Canvas() {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.html2canvas) {
                resolve();
                return;
            }
            
            // 动态创建script标签
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('HTML2Canvas加载失败'));
            };
            
            document.head.appendChild(script);
        });
    }

    destroy() {
        this.container.innerHTML = '';
        
        this.clearAllTimers();
        this.removeAllEventListeners();
    }
    
    clearAllTimers() {
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.timers = [];
    }
    
    removeAllEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
    
    setTimeoutSafe(callback, delay) {
        const timerId = setTimeout(() => {
            this.timers = this.timers.filter(id => id !== timerId);
            callback();
        }, delay);
        this.timers.push(timerId);
        return timerId;
    }
    
    addEventListenerSafe(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    toggleDailyWage() {
        this.showDailyWage = !this.showDailyWage;

        const icon = document.getElementById('toggleDailyWageIcon');
        if (icon) {
            icon.className = this.showDailyWage ? 'fas fa-eye' : 'fas fa-eye-slash';
        }

        // 隐藏/显示工资统计版块
        const statsSection = document.querySelector('.stats-grid')?.closest('.section');
        if (statsSection) {
            if (this.showDailyWage) {
                statsSection.style.display = '';
                statsSection.style.opacity = '0';
                statsSection.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    statsSection.style.opacity = '1';
                }, 10);
            } else {
                statsSection.style.opacity = '1';
                statsSection.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    statsSection.style.opacity = '0';
                    setTimeout(() => {
                        statsSection.style.display = 'none';
                    }, 300);
                }, 10);
            }
        }

        // 隐藏/显示个人信息中的工资金额
        const workerWageEl = document.getElementById('workerWage');
        const monthlyWageEl = document.getElementById('monthlyWage');
        
        [workerWageEl, monthlyWageEl].forEach((el, index) => {
            if (!el) return;
            if (this.showDailyWage) {
                el.style.display = '';
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    el.style.opacity = '1';
                }, 10 + index * 50);
            } else {
                el.style.opacity = '1';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    el.style.opacity = '0';
                    setTimeout(() => {
                        el.style.display = 'none';
                    }, 300);
                }, 10 + index * 50);
            }
        });

        const table = document.querySelector('.work-table');
        if (table) {
            const headerCell = table.querySelector('th:nth-child(5)');
            const salaryCells = table.querySelectorAll('td:nth-child(5)');

            if (this.showDailyWage) {
                if (headerCell) {
                    headerCell.style.display = '';
                    headerCell.style.opacity = '0';
                    headerCell.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        headerCell.style.opacity = '1';
                    }, 10);
                }

                salaryCells.forEach((cell, index) => {
                    cell.style.display = '';
                    cell.style.opacity = '0';
                    cell.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        cell.style.opacity = '1';
                    }, 10 + index * 20);
                });
            } else {
                if (headerCell) {
                    headerCell.style.opacity = '1';
                    headerCell.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        headerCell.style.opacity = '0';
                        setTimeout(() => {
                            headerCell.style.display = 'none';
                        }, 300);
                    }, 10);
                }

                salaryCells.forEach((cell, index) => {
                    cell.style.opacity = '1';
                    cell.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        cell.style.opacity = '0';
                        setTimeout(() => {
                            cell.style.display = 'none';
                        }, 300);
                    }, 10 + index * 20);
                });
            }
        }
    }

    showWageCalculationDialog() {
        const content = `
            <div style="line-height: 1.8; color: var(--text-color);">
                <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 15px;">📊 四种工资计算方式（全职）</h4>
                
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 12px 0; color: var(--primary-color);"><strong>方式一：按当月天数计算（推荐）</strong></p>
                    <p style="margin: 0 0 8px 0;"><strong>日工资</strong> = 月工资 ÷ 当月实际天数</p>
                    <p style="margin: 0 0 8px 0;"><strong>工资</strong> = 日工资 × 有工资天数（出勤+半天+放假+休息）</p>
                    <p style="margin: 0; color: var(--text-secondary);">✓ 每天显示金额，加起来正好等于月工资</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary);">✓ 请假扣当日工资</p>
                </div>

                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 12px 0; color: var(--primary-color);"><strong>方式二：按自然日（30天）计算</strong></p>
                    <p style="margin: 0 0 8px 0;"><strong>日工资</strong> = 月工资 ÷ 30</p>
                    <p style="margin: 0 0 8px 0;"><strong>满勤</strong>：出勤 ≥ 应工作天数 → 工资 = 月工资 + 加班费</p>
                    <p style="margin: 0 0 8px 0;"><strong>缺勤</strong>：出勤 < 应工作天数 → 工资 = 日工资 × 出勤天数</p>
                    <p style="margin: 0; color: var(--text-secondary);">✓ 休息/放假显示"-"（已含在月工资中）</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary);">✓ 请假扣当日工资</p>
                </div>

                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 12px 0; color: var(--primary-color);"><strong>方式三：按法定工作日（21.75天）计算</strong></p>
                    <p style="margin: 0 0 8px 0;"><strong>日工资</strong> = 月工资 ÷ 21.75</p>
                    <p style="margin: 0 0 8px 0;"><strong>满勤</strong>：出勤 ≥ 应工作天数 → 工资 = 月工资 + 加班费</p>
                    <p style="margin: 0 0 8px 0;"><strong>缺勤</strong>：出勤 < 应工作天数 → 工资 = 日工资 × 出勤天数</p>
                    <p style="margin: 0; color: var(--text-secondary);">✓ 休息/放假显示"-"（已含在月工资中）</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary);">✓ 请假扣当日工资（扣款较多）</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary);">✓ 加班费较高</p>
                </div>

                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 12px 0; color: var(--primary-color);"><strong>方式四：按标准工作日（26天）计算</strong></p>
                    <p style="margin: 0 0 8px 0;"><strong>日工资</strong> = 月工资 ÷ 26</p>
                    <p style="margin: 0 0 8px 0;"><strong>满勤</strong>：出勤 ≥ 26天 → 工资 = 月工资 + 加班费</p>
                    <p style="margin: 0 0 8px 0;"><strong>缺勤</strong>：出勤 < 26天 → 工资 = 日工资 × 出勤天数</p>
                    <p style="margin: 0; color: var(--text-secondary);">✓ 休息/放假显示"-"（已含在月工资中）</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary);">✓ 请假扣当日工资</p>
                </div>

                <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 15px;">💰 工资状态说明</h4>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 8px 0;"><strong>有工资：</strong>考勤 ✅、半天 ✅、放假 ✅、休息 ✅</p>
                    <p style="margin: 0;"><strong>没工资：</strong>请假 ❌、未打卡 ❌</p>
                </div>

                <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 15px;">📐 应工作天数计算</h4>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 8px 0;"><strong>单休</strong>：每月休息≈4天，应工作天数 = 当月天数 - 4</p>
                    <p style="margin: 0;"><strong>双休</strong>：每月休息≈8天，应工作天数 = 当月天数 - 8</p>
                </div>

                <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 15px;">🔧 点工工资计算</h4>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 8px 0;"><strong>工作天数</strong> = 考勤天数 + 半天×0.5</p>
                    <p style="margin: 0;"><strong>工资</strong> = 日工资 × 工作天数 + 加班费</p>
                    <p style="margin: 8px 0 0 0; color: var(--text-secondary);">注：点工按实际工作天数计算，请假无工资</p>
                </div>

                <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 15px;">⏰ 加班费计算</h4>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                    <p style="margin: 0 0 8px 0;"><strong>时薪</strong> = 日工资 ÷ 8小时</p>
                    <p style="margin: 0;"><strong>加班费</strong> = 时薪 × 加班小时 × 加班倍率</p>
                </div>

                <h4 style="margin: 16px 0 12px 0; color: var(--primary-color); font-size: 15px;">📝 举例说明（月薪6000元，单休）</h4>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <p style="margin: 0 0 12px 0;"><strong>按当月天数（3月31天）：</strong></p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">日工资 = 6000 ÷ 31 = 193.55元</p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">上班28天 + 休息3天 = 31天</p>
                    <p style="margin: 0 0 12px 0; padding-left: 16px;">工资 = 193.55 × 31 = 6000元</p>
                    
                    <p style="margin: 0 0 12px 0;"><strong>按标准工作日（26天）：</strong></p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">日工资 = 6000 ÷ 26 = 230.77元</p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">上班28天（满26天+2天加班）</p>
                    <p style="margin: 0 0 12px 0; padding-left: 16px;">工资 = 6000 + 230.77×2 = 6461.54元</p>
                    
                    <p style="margin: 0;"><strong>按法定工作日（21.75天）：</strong></p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">日工资 = 6000 ÷ 21.75 = 275.86元</p>
                    <p style="margin: 0 0 4px 0; padding-left: 16px;">上班28天（超过法定应出勤天数，超出部分算加班）</p>
                    <p style="margin: 0; padding-left: 16px;">工资 = 6000 + 275.86×1 = 6275.86元</p>
                </div>
            </div>
        `;

        this.dialog.show({
            title: '工资计算说明',
            htmlContent: content,
            showConfirm: false,
            showCancel: true,
            cancelText: '关闭',
            width: '520px'
        });
    }

    showSubsidySettingsDialog() {
        const subsidyType = this.personalInfo?.subsidyType || 'monthly';
        const monthlySubsidy = this.personalInfo?.monthlySubsidy || 0;
        const dailySubsidy = this.personalInfo?.dailySubsidy || 0;
        const perMealSubsidy = this.personalInfo?.perMealSubsidy || 0;
        const mealsPerDay = this.personalInfo?.mealsPerDay || 2;
        const subsidyDivisor = this.personalInfo?.subsidyDivisor || 30;
        const subsidyStatuses = this.personalInfo?.subsidyStatuses || ['present', 'half', 'holiday', 'rest'];
        
        const content = `
            <div style="line-height: 1.8; color: var(--text-color);">
                <div class="form-group">
                    <label class="form-label">📋 补贴计算方式</label>
                    <select id="subsidyTypeInput" class="form-select">
                        <option value="monthly" ${subsidyType === 'monthly' ? 'selected' : ''}>按月计算（月补贴÷天数×有工资天数）</option>
                        <option value="daily" ${subsidyType === 'daily' ? 'selected' : ''}>按天计算（每日固定金额×出勤天数）</option>
                        <option value="perMeal" ${subsidyType === 'perMeal' ? 'selected' : ''}>按餐计算（每餐金额×每日餐数×出勤天数）</option>
                        <option value="none" ${subsidyType === 'none' ? 'selected' : ''}>无补贴</option>
                    </select>
                </div>
                
                <div id="monthlySubsidyGroup" style="display: ${subsidyType === 'monthly' ? 'block' : 'none'};">
                    <div class="form-group">
                        <label class="form-label">💰 月补贴金额（元/月）</label>
                        <input type="number" id="monthlySubsidyInput" class="form-input" value="${monthlySubsidy}" placeholder="例如：900" min="0" step="1">
                    </div>
                    <div style="background: var(--bg-tertiary); padding: 10px; border-radius: 6px; font-size: 12px; color: var(--text-secondary);">
                        <p style="margin: 0;">日补贴 = 月补贴 ÷ 当月实际天数</p>
                    </div>
                </div>
                
                <div id="dailySubsidyGroup" style="display: ${subsidyType === 'daily' ? 'block' : 'none'};">
                    <div class="form-group">
                        <label class="form-label">💰 日补贴金额（元/天）</label>
                        <input type="number" id="dailySubsidyInput" class="form-input" value="${dailySubsidy}" placeholder="例如：30" min="0" step="1">
                    </div>
                </div>
                
                <div id="perMealSubsidyGroup" style="display: ${subsidyType === 'perMeal' ? 'block' : 'none'};">
                    <div class="form-group">
                        <label class="form-label">🍚 每餐补贴（元/餐）</label>
                        <input type="number" id="perMealSubsidyInput" class="form-input" value="${perMealSubsidy}" placeholder="例如：15" min="0" step="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">🍽️ 每日餐数</label>
                        <select id="mealsPerDayInput" class="form-select">
                            <option value="1" ${mealsPerDay === 1 ? 'selected' : ''}>1餐</option>
                            <option value="2" ${mealsPerDay === 2 ? 'selected' : ''}>2餐</option>
                            <option value="3" ${mealsPerDay === 3 ? 'selected' : ''}>3餐</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">✅ 哪些状态算"有补贴"</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" class="subsidy-status-checkbox" value="present" ${subsidyStatuses.includes('present') ? 'checked' : ''} style="margin-right: 6px;">
                            <span>考勤 ✅</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" class="subsidy-status-checkbox" value="half" ${subsidyStatuses.includes('half') ? 'checked' : ''} style="margin-right: 6px;">
                            <span>半天 ⏱️</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" class="subsidy-status-checkbox" value="holiday" ${subsidyStatuses.includes('holiday') ? 'checked' : ''} style="margin-right: 6px;">
                            <span>放假 🎉</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" class="subsidy-status-checkbox" value="rest" ${subsidyStatuses.includes('rest') ? 'checked' : ''} style="margin-right: 6px;">
                            <span>休息 😴</span>
                        </label>
                    </div>
                </div>
                
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 13px;">
                    <p style="margin: 0 0 8px 0;"><strong>💡 计算说明：</strong></p>
                    <p style="margin: 0;">按月计算：日补贴 = 月补贴 ÷ 天数，补贴总额 = 日补贴 × 有补贴天数</p>
                    <p style="margin: 8px 0 0 0;">按天计算：补贴总额 = 日补贴 × 有补贴天数</p>
                    <p style="margin: 8px 0 0 0;">按餐计算：补贴总额 = 每餐补贴 × 每日餐数 × 有补贴天数</p>
                </div>
            </div>
        `;

        const dialogId = this.dialog.show({
            title: '补贴设置',
            htmlContent: content,
            showConfirm: true,
            showCancel: true,
            confirmText: '保存',
            cancelText: '取消',
            width: '480px',
            onShow: () => {
                // 绑定补贴类型切换事件
                const subsidyTypeSelect = document.getElementById('subsidyTypeInput');
                subsidyTypeSelect.addEventListener('change', (e) => {
                    const type = e.target.value;
                    document.getElementById('monthlySubsidyGroup').style.display = type === 'monthly' ? 'block' : 'none';
                    document.getElementById('dailySubsidyGroup').style.display = type === 'daily' ? 'block' : 'none';
                    document.getElementById('perMealSubsidyGroup').style.display = type === 'perMeal' ? 'block' : 'none';
                });
            },
            onConfirm: async () => {
                const subsidyType = document.getElementById('subsidyTypeInput').value;
                const monthlySubsidy = parseFloat(document.getElementById('monthlySubsidyInput')?.value) || 0;
                const dailySubsidy = parseFloat(document.getElementById('dailySubsidyInput')?.value) || 0;
                const perMealSubsidy = parseFloat(document.getElementById('perMealSubsidyInput')?.value) || 0;
                const mealsPerDay = parseInt(document.getElementById('mealsPerDayInput')?.value) || 2;
                
                // 获取选中的状态
                const checkboxes = document.querySelectorAll('.subsidy-status-checkbox:checked');
                const subsidyStatuses = Array.from(checkboxes).map(cb => cb.value);
                
                // 更新个人信息
                this.personalInfo.subsidyType = subsidyType;
                this.personalInfo.monthlySubsidy = monthlySubsidy;
                this.personalInfo.dailySubsidy = dailySubsidy;
                this.personalInfo.perMealSubsidy = perMealSubsidy;
                this.personalInfo.mealsPerDay = mealsPerDay;
                this.personalInfo.subsidyStatuses = subsidyStatuses;
                
                // 保存到存储
                await this.storage.set('personalInfo', this.personalInfo);
                
                // 同时保存到localStorage
                try {
                    const personalInfoKey = `personalInfo_${this.currentProjectId}`;
                    localStorage.setItem(personalInfoKey, JSON.stringify(this.personalInfo));
                } catch (e) {
                    console.error('保存补贴设置到localStorage失败:', e);
                }
                
                // 同步到服务器
                try {
                    const userId = localStorage.getItem('user_id');
                    if (userId) {
                        const subsidyData = {
                            subsidyType,
                            monthlySubsidy,
                            dailySubsidy,
                            perMealSubsidy,
                            mealsPerDay,
                            subsidyStatuses
                        };
                        
                        const response = await fetch('/jg/api/update-user-info.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                user_id: userId,
                                field: 'subsidySettings',
                                value: JSON.stringify(subsidyData)
                            })
                        });
                        const result = await response.json();
                        if (!result.success) {
                            console.error('服务器同步补贴设置失败:', result.error);
                        }
                    }
                } catch (serverError) {
                    console.error('同步补贴设置到服务器失败:', serverError);
                }
                
                this.toast.success('补贴设置已保存');
                
                // 重新计算工资
                this.updateStatistics();
                this.renderWorkTable();
                
                // 关闭当前对话框
                this.dialog.close(dialogId);
            }
        });
    }
}

// 将HomePage暴露为全局对象
window.HomePage = HomePage;
