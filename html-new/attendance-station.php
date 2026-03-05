<?php
$pageTitle = '考勤站 - 任工记工';
$isHome = false;
$page = 'attendance';
include '../html-new/header.php';
?>
    <link rel="stylesheet" href="/jg/css-new/attendance.css">
    <main class="app-main">
        <div class="container">
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">考勤站</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary btn-sm" data-action="refresh">
                            <i class="fas fa-sync-alt"></i>
                            刷新
                        </button>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">打卡操作</h3>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">打卡状态</div>
                            <div class="info-value">
                                <div class="status-display">
                                    <div id="clock-in-status" class="status-badge">未打卡</div>
                                    <div id="clock-out-status" class="status-badge">未打卡</div>
                                </div>
                                <div id="recent-clock-time" class="recent-clock-time">
                                    最近打卡时间：无
                                </div>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">打卡操作</div>
                            <div class="info-value">
                                <div class="btn-group">
                                    <button class="btn btn-success btn-lg" data-action="clock-in">
                                        <i class="fas fa-sign-in-alt"></i>
                                        上班打卡
                                    </button>
                                    <button class="btn btn-danger btn-lg" data-action="clock-out">
                                        <i class="fas fa-sign-out-alt"></i>
                                        下班打卡
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">今日信息</h3>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">当前日期</div>
                            <div class="info-value" id="current-date"></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">当前时间</div>
                            <div class="info-value" id="current-time"></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">当前项目</div>
                            <div class="info-value" id="current-project"></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">最近打卡记录</h3>
                        <div class="section-actions">
                            <a href="/jg/html-new/attendance-status.php" class="btn btn-sm btn-ghost">
                                <i class="fas fa-ellipsis-h"></i>
                                更多
                            </a>
                        </div>
                    </div>
                    <div class="attendance-list" id="recent-records">
                        <div class="empty-state">
                            暂无打卡记录
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <script src="/jg/js-core/event-bus.js"></script>
    <script src="/jg/js-core/combined-core.js"></script>
    <script src="/jg/js-components/combined-components.js"></script>
    <script src="/jg/js-shared/menu-handler.js"></script>
    <script src="/jg/js-shared/theme.js?v=2.4"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 确保EventBus存在
            if (!window.eventBus) {
                // 创建EventBus实例
                if (window.EventBus) {
                    window.eventBus = new EventBus();
                } else {
                    // 创建默认实现
                    window.eventBus = { on: () => {}, emit: () => {} };
                }
            }
            
            // 使用全局实例
            const eventBus = window.eventBus;
            
            // 创建带有getLocal和setLocal方法的存储包装器
            const storage = {
                ...(window.storageManager || {}),
                getLocal: function(key) {
                    try {
                        const value = localStorage.getItem(key);
                        if (!value) return null;
                        try {
                            return JSON.parse(value);
                        } catch (e) {
                            return value;
                        }
                    } catch (error) {
                        console.error('Error getting local storage:', error);
                        return null;
                    }
                },
                setLocal: function(key, value) {
                    try {
                        try {
                            const jsonValue = JSON.stringify(value);
                            localStorage.setItem(key, jsonValue);
                        } catch (e) {
                            localStorage.setItem(key, value);
                        }
                    } catch (error) {
                        console.error('Error setting local storage:', error);
                    }
                }
            };
            
            // 初始化MenuHandler
            if (window.MenuHandler) {
                window.menuHandler = new window.MenuHandler({
                    toast: window.toast,
                    logger: window.Logger
                });
                window.menuHandler.init();
                console.log('MenuHandler初始化成功');
            }
            
            // 初始化主题切换
            if (window.ThemeManager) {
                window.themeManager = new window.ThemeManager(storage, eventBus);
                window.themeManager.init();
                console.log('ThemeManager初始化成功');
            }
            
            // 初始化登录图标管理器
            if (window.loginIconManager) {
                window.loginIconManager.init();
                console.log('loginIconManager初始化成功');
            }
            
            // 初始化考勤站
            const attendanceStation = new AttendanceStation();
            attendanceStation.init();
        });

        class AttendanceStation {
            constructor() {
                this.storageManager = null;
                this.currentDate = new Date();
                this.clockInStatus = document.getElementById('clock-in-status');
                this.clockOutStatus = document.getElementById('clock-out-status');
                this.recentClockTime = document.getElementById('recent-clock-time');
                this.currentDateElement = document.getElementById('current-date');
                this.currentTimeElement = document.getElementById('current-time');
                this.currentProjectElement = document.getElementById('current-project');
                this.recentRecordsElement = document.getElementById('recent-records');
                this.clockInButton = document.querySelector('[data-action="clock-in"]');
                this.clockOutButton = document.querySelector('[data-action="clock-out"]');
                this.refreshButton = document.querySelector('[data-action="refresh"]');
                this.systemSettings = null;
            }

            async init() {
                // 初始化存储管理器
                if (window.IntelligentStorageManager) {
                    this.storageManager = new IntelligentStorageManager();
                    await this.storageManager.init();
                } else {
                    console.error('IntelligentStorageManager not available');
                    this.showToast('系统初始化失败，请刷新页面重试', 'error');
                    return;
                }

                // 加载系统设置
                await this.loadSystemSettings();

                // 绑定事件
                this.bindEvents();

                // 设置项目切换监听器
                this.setupProjectChangeListeners();

                // 更新时间
                this.updateDateTime();
                setInterval(() => this.updateDateTime(), 1000);

                // 先加载当前项目，确保项目ID正确
                await this.loadCurrentProject();

                // 加载打卡状态
                await this.loadClockStatus();

                // 加载最近打卡记录
                await this.loadRecentRecords();
            }

            bindEvents() {
                // 上班打卡
                this.clockInButton.addEventListener('click', async () => {
                    await this.clockIn();
                });

                // 下班打卡
                this.clockOutButton.addEventListener('click', async () => {
                    await this.clockOut();
                });

                // 刷新
                this.refreshButton.addEventListener('click', async () => {
                    await this.loadClockStatus();
                    await this.loadRecentRecords();
                    this.showToast('刷新成功', 'success');
                });
            }

            updateDateTime() {
                const now = new Date();
                this.currentDateElement.textContent = now.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    weekday: 'long'
                });
                this.currentTimeElement.textContent = now.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }

            async loadCurrentProject() {
                try {
                    // 直接从localStorage获取currentProjectId
                    let currentProjectId = localStorage.getItem('currentProjectId');
                    // 去除currentProjectId的引号
                    if (currentProjectId && (currentProjectId.startsWith('"') || currentProjectId.startsWith('\''))) {
                        currentProjectId = currentProjectId.slice(1, -1);
                    }
                    
                    // 直接从localStorage获取项目数据
                    const projectsJson = localStorage.getItem('projects');
                    
                    if (projectsJson) {
                        let projects = [];
                        try {
                            projects = JSON.parse(projectsJson);
                            
                            if (Array.isArray(projects) && projects.length > 0) {
                                // 查找当前项目（使用宽松比较，确保ID格式一致）
                                let currentProject = null;
                                
                                if (currentProjectId) {
                                    // 遍历项目，手动查找匹配的项目
                                    for (let i = 0; i < projects.length; i++) {
                                        const project = projects[i];
                                        const projectIdStr = String(project.id);
                                        const currentIdStr = String(currentProjectId);
                                        
                                        if (projectIdStr === currentIdStr) {
                                            currentProject = project;
                                            break;
                                        }
                                    }
                                }
                                
                                if (currentProject) {
                                    this.currentProjectElement.textContent = currentProject.name;
                                } else {
                                    // 如果找不到对应项目，使用第一个项目，并更新currentProjectId
                                    this.currentProjectElement.textContent = projects[0].name;
                                    // 更新currentProjectId为第一个项目的ID
                                    localStorage.setItem('currentProjectId', projects[0].id);
                                    console.log('更新currentProjectId为第一个项目的ID:', projects[0].id);
                                }
                                
                                return;
                            }
                        } catch (parseError) {
                            console.error('解析项目数据失败:', parseError);
                        }
                    }
                    
                    // 所有尝试都失败
                    this.currentProjectElement.textContent = '未选择项目';
                } catch (error) {
                    console.error('加载当前项目失败:', error);
                    this.currentProjectElement.textContent = '加载失败';
                }
            }
            
            // 添加项目切换监听器
            setupProjectChangeListeners() {
                // 监听localStorage变化
                window.addEventListener('storage', (event) => {
                    if (event.key === 'currentProjectId' || event.key === 'attendance') {
                        this.loadCurrentProject();
                        this.loadClockStatus();
                        this.loadRecentRecords();
                    } else if (event.key === 'systemSettings') {
                        // 系统设置变化时重新加载
                        this.loadSystemSettings();
                    }
                });
                
                // 监听事件总线
                if (window.eventBus) {
                    window.eventBus.on('projectChanged', () => {
                        this.loadCurrentProject();
                        this.loadClockStatus();
                        this.loadRecentRecords();
                    });
                    
                    // 监听考勤更新事件
                    window.eventBus.on('attendance:updated', () => {
                        this.loadClockStatus();
                        this.loadRecentRecords();
                    });
                    
                    // 监听系统设置更新事件
                    window.eventBus.on('systemSettings:updated', () => {
                        this.loadSystemSettings();
                    });
                }
                
                // 定期检查项目变化（每5秒）
                setInterval(() => {
                    this.loadCurrentProject();
                    this.loadClockStatus();
                    this.loadRecentRecords();
                }, 5000);
            }
            
            // 加载系统设置
            async loadSystemSettings() {
                try {
                    // 从localStorage获取系统设置
                    const savedSettings = localStorage.getItem('systemSettings');
                    if (savedSettings) {
                        this.systemSettings = JSON.parse(savedSettings);
                        console.log('从localStorage加载系统设置:', this.systemSettings);
                    } else {
                        // 从服务器获取系统设置
                        const response = await fetch('/jg/api/get-settings.php');
                        const result = await response.json();
                        if (result.success && result.settings) {
                            this.systemSettings = result.settings;
                            // 保存到localStorage
                            localStorage.setItem('systemSettings', JSON.stringify(result.settings));
                            console.log('从服务器加载系统设置:', this.systemSettings);
                        }
                    }
                } catch (error) {
                    console.error('加载系统设置失败:', error);
                    // 使用默认设置
                    this.systemSettings = {
                        workStartTime: '09:00',
                        workEndTime: '18:00',
                        lateThreshold: 10
                    };
                }
            }

            async loadClockStatus() {
                try {
                    const todayRecord = await this.getTodayAttendance();
                    
                    if (todayRecord) {
                        if (todayRecord.checkIn) {
                            this.clockInStatus.textContent = `已打卡 ${todayRecord.checkIn}`;
                            this.clockInStatus.classList.add('status-present');
                            this.clockInButton.disabled = true;
                            this.clockInButton.classList.add('btn-disabled');
                            this.clockInButton.title = '今日已完成上班打卡';
                        } else {
                            this.clockInStatus.textContent = '未打卡';
                            this.clockInStatus.classList.remove('status-present');
                            this.clockInButton.disabled = false;
                            this.clockInButton.classList.remove('btn-disabled');
                            this.clockInButton.title = '点击进行上班打卡';
                        }

                        if (todayRecord.checkOut) {
                            this.clockOutStatus.textContent = `已打卡 ${todayRecord.checkOut}`;
                            this.clockOutStatus.classList.add('status-present');
                            this.clockOutButton.disabled = true;
                            this.clockOutButton.classList.add('btn-disabled');
                            this.clockOutButton.title = '今日已完成下班打卡';
                        } else {
                            this.clockOutStatus.textContent = '未打卡';
                            this.clockOutStatus.classList.remove('status-present');
                            if (todayRecord.checkIn) {
                                this.clockOutButton.disabled = false;
                                this.clockOutButton.classList.remove('btn-disabled');
                                this.clockOutButton.title = '点击进行下班打卡';
                            } else {
                                this.clockOutButton.disabled = true;
                                this.clockOutButton.classList.add('btn-disabled');
                                this.clockOutButton.title = '请先完成上班打卡';
                            }
                        }
                    } else {
                        this.clockInStatus.textContent = '未打卡';
                        this.clockInStatus.classList.remove('status-present');
                        this.clockOutStatus.textContent = '未打卡';
                        this.clockOutStatus.classList.remove('status-present');
                        this.clockInButton.disabled = false;
                        this.clockInButton.classList.remove('btn-disabled');
                        this.clockInButton.title = '点击进行上班打卡';
                        this.clockOutButton.disabled = true;
                        this.clockOutButton.classList.add('btn-disabled');
                        this.clockOutButton.title = '请先完成上班打卡';
                    }
                    
                    // 更新最近打卡时间
                    await this.updateRecentClockTime();
                } catch (error) {
                    console.error('Failed to load clock status:', error);
                    this.showToast('加载打卡状态失败', 'error');
                }
            }
            
            async updateRecentClockTime() {
                try {
                    // 获取当前项目ID
                    let currentProjectId = localStorage.getItem('currentProjectId');
                    if (currentProjectId && (currentProjectId.startsWith('"') || currentProjectId.startsWith('\''))) {
                        currentProjectId = currentProjectId.slice(1, -1);
                    }
                    
                    // 直接从localStorage获取数据
                    let attendanceRecords = [];
                    try {
                        const localStorageData = localStorage.getItem('attendance');
                        if (localStorageData) {
                            const parsedData = JSON.parse(localStorageData);
                            if (Array.isArray(parsedData)) {
                                attendanceRecords = parsedData;
                            }
                        }
                    } catch (localError) {
                        console.error('Failed to get attendance from localStorage:', localError);
                    }
                    
                    // 确保attendanceRecords是一个数组
                    const recordsArray = Array.isArray(attendanceRecords) ? attendanceRecords : [];
                    
                    // 过滤出当前项目的考勤数据
                    let projectRecords = recordsArray;
                    if (currentProjectId) {
                        projectRecords = recordsArray.filter(record => String(record.projectId) === String(currentProjectId));
                    }
                    
                    // 找出最近的打卡记录
                    let recentRecord = null;
                    let recentTime = null;
                    
                    projectRecords.forEach(record => {
                        if (record.checkOut) {
                            const checkOutTime = new Date(`${record.date} ${record.checkOut}`);
                            if (!recentTime || checkOutTime > recentTime) {
                                recentTime = checkOutTime;
                                recentRecord = record;
                            }
                        } else if (record.checkIn) {
                            const checkInTime = new Date(`${record.date} ${record.checkIn}`);
                            if (!recentTime || checkInTime > recentTime) {
                                recentTime = checkInTime;
                                recentRecord = record;
                            }
                        }
                    });
                    
                    if (recentRecord) {
                        if (recentRecord.checkOut) {
                            this.recentClockTime.textContent = `最近打卡时间：${recentRecord.date} ${recentRecord.checkOut}（下班）`;
                        } else if (recentRecord.checkIn) {
                            const earlyCheckInText = recentRecord.isEarlyCheckIn ? '（提前上班）' : '（上班）';
                            this.recentClockTime.textContent = `最近打卡时间：${recentRecord.date} ${recentRecord.checkIn}${earlyCheckInText}`;
                        }
                    } else {
                        this.recentClockTime.textContent = '最近打卡时间：无';
                    }
                } catch (error) {
                    console.error('Failed to update recent clock time:', error);
                    this.recentClockTime.textContent = '最近打卡时间：无';
                }
            }
            
            // 获取当前项目的工作时间设置
            getCurrentProjectWorkHours() {
                try {
                    // 从localStorage获取当前项目ID
                    let currentProjectId = localStorage.getItem('currentProjectId');
                    if (currentProjectId && (currentProjectId.startsWith('"') || currentProjectId.startsWith('\''))) {
                        currentProjectId = currentProjectId.slice(1, -1);
                    }
                    
                    // 从localStorage获取项目数据
                    const projectsData = localStorage.getItem('projects');
                    if (!projectsData) return null;
                    
                    const projects = JSON.parse(projectsData);
                    if (!Array.isArray(projects)) return null;
                    
                    // 找到当前项目
                    const currentProject = projects.find(project => String(project.id) === String(currentProjectId));
                    return currentProject?.workHours || null;
                } catch (error) {
                    console.error('获取项目工作时间失败:', error);
                    return null;
                }
            }
            
            // 检测是否提前打卡
            checkEarlyCheckIn(checkInTime) {
                try {
                    // 获取当前项目的工作时间设置
                    const workHours = this.getCurrentProjectWorkHours();
                    
                    // 定义默认值
                    const defaultMorningStart = '08:00';
                    const earlyCheckInLimit = 60; // 默认提前60分钟
                    
                    // 获取上班时间
                    const morningStart = workHours?.morningStart || defaultMorningStart;
                    
                    // 转换时间为分钟数
                    const checkInMinutes = this.timeToMinutes(checkInTime);
                    const morningStartMinutes = this.timeToMinutes(morningStart);
                    
                    // 计算最早允许打卡时间
                    const earliestCheckInMinutes = morningStartMinutes - earlyCheckInLimit;
                    
                    // 判断是否在提前打卡时间范围内
                    return checkInMinutes < morningStartMinutes && checkInMinutes >= earliestCheckInMinutes;
                } catch (error) {
                    console.error('检测提前打卡失败:', error);
                    return false;
                }
            }
            
            // 检测是否迟到
            checkLateCheckIn(checkInTime) {
                try {
                    // 获取当前项目的工作时间设置
                    const workHours = this.getCurrentProjectWorkHours();
                    
                    // 定义默认值
                    const defaultMorningStart = '08:00';
                    const defaultLateThreshold = 10;
                    
                    // 获取上班时间和迟到阈值
                    const morningStart = workHours?.morningStart || defaultMorningStart;
                    const lateThreshold = this.systemSettings?.lateThreshold || defaultLateThreshold;
                    
                    // 转换时间为分钟数
                    const checkInMinutes = this.timeToMinutes(checkInTime);
                    const morningStartMinutes = this.timeToMinutes(morningStart);
                    
                    // 计算迟到时间阈值
                    const lateThresholdMinutes = morningStartMinutes + lateThreshold;
                    
                    // 判断是否迟到
                    return checkInMinutes > lateThresholdMinutes;
                } catch (error) {
                    console.error('检测迟到失败:', error);
                    return false;
                }
            }
            
            // 检测是否早退
            checkEarlyCheckOut(checkOutTime) {
                try {
                    // 获取当前项目的工作时间设置
                    const workHours = this.getCurrentProjectWorkHours();
                    
                    // 定义默认值
                    const defaultAfternoonEnd = '18:00';
                    
                    // 获取下班时间
                    const afternoonEnd = workHours?.afternoonEnd || defaultAfternoonEnd;
                    
                    // 转换时间为分钟数
                    const checkOutMinutes = this.timeToMinutes(checkOutTime);
                    const afternoonEndMinutes = this.timeToMinutes(afternoonEnd);
                    
                    // 判断是否早退
                    return checkOutMinutes < afternoonEndMinutes;
                } catch (error) {
                    console.error('检测早退失败:', error);
                    return false;
                }
            }
            
            // 将时间字符串转换为分钟数
            timeToMinutes(timeStr) {
                const parts = timeStr.split(':');
                if (parts.length !== 2) return 0;
                
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                
                return hours * 60 + minutes;
            }

            async loadRecentRecords() {
                try {
                    // 获取当前项目ID
                    let currentProjectId = localStorage.getItem('currentProjectId');
                    if (currentProjectId && (currentProjectId.startsWith('"') || currentProjectId.startsWith('\''))) {
                        currentProjectId = currentProjectId.slice(1, -1);
                    }
                    console.log('当前项目ID:', currentProjectId);
                    
                    // 直接从localStorage获取数据，不依赖storageManager
                    let attendanceRecords = [];
                    try {
                        const localStorageData = localStorage.getItem('attendance');
                        console.log('localStorage中的考勤数据:', localStorageData);
                        if (localStorageData) {
                            const parsedData = JSON.parse(localStorageData);
                            if (Array.isArray(parsedData)) {
                                console.log('解析后的考勤记录数量:', parsedData.length);
                                attendanceRecords = parsedData;
                            }
                        }
                    } catch (localError) {
                        console.error('Failed to get attendance from localStorage:', localError);
                    }
                    
                    // 确保attendanceRecords是一个数组
                    const recordsArray = Array.isArray(attendanceRecords) ? attendanceRecords : [];
                    
                    // 过滤出当前项目的考勤数据，如果没有项目ID则显示所有记录
                    let projectRecords = recordsArray;
                    if (currentProjectId) {
                        projectRecords = recordsArray.filter(record => {
                            const recordProjectId = String(record.projectId || '');
                            const currentId = String(currentProjectId);
                            return recordProjectId === currentId;
                        });
                    }
                    console.log('当前项目的考勤记录数量:', projectRecords.length);
                    console.log('当前项目的考勤记录:', projectRecords);
                    
                    // 计算7天前的日期
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    
                    // 先按日期分组，确保每天只有一条记录
                    const recordsByDate = new Map();
                    projectRecords.forEach(record => {
                        if (record.date && new Date(record.date) >= sevenDaysAgo) {
                            const existingRecord = recordsByDate.get(record.date);
                            if (!existingRecord || 
                                (record.checkIn && record.checkOut && (!existingRecord.checkIn || !existingRecord.checkOut)) ||
                                (record.checkIn && !existingRecord.checkIn)) {
                                recordsByDate.set(record.date, record);
                            }
                        }
                    });
                    
                    // 转换为数组并按日期排序
                    const recentRecords = Array.from(recordsByDate.values())
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 7);
                    console.log('最近7天的考勤记录:', recentRecords);

                    if (recentRecords.length > 0) {
                        this.recentRecordsElement.innerHTML = '';
                        recentRecords.forEach(record => {
                            const recordElement = document.createElement('div');
                            recordElement.className = 'attendance-item';
                            recordElement.innerHTML = `
                                <div class="date">${record.date}</div>
                                <div class="status ${record.checkIn && record.checkOut ? (record.status === 'late' ? 'status-late' : record.status === 'early' ? 'status-early' : 'status-present') : record.checkIn ? 'status-half' : 'status-absent'}">
                                    ${record.checkIn && record.checkOut ? (record.status === 'late' ? '迟到' : record.status === 'early' ? '早退' : '已完成') : record.checkIn ? (record.isEarlyCheckIn ? '提前上班' : record.isLateCheckIn ? '迟到' : '仅上班') : '未打卡'}
                                </div>
                                <div class="remark">
                                    ${record.checkIn ? `上班: ${record.checkIn}${record.isEarlyCheckIn ? '（提前）' : record.isLateCheckIn ? '（迟到）' : ''}` : ''}
                                    ${record.checkIn && record.checkOut ? ' | ' : ''}
                                    ${record.checkOut ? `下班: ${record.checkOut}${record.isEarlyCheckOut ? '（早退）' : ''}` : ''}
                                </div>
                            `;
                            this.recentRecordsElement.appendChild(recordElement);
                        });
                    } else {
                        this.recentRecordsElement.innerHTML = `
                            <div class="empty-state">
                                暂无打卡记录
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('Failed to load recent records:', error);
                    this.recentRecordsElement.innerHTML = `
                        <div class="empty-state">
                            加载记录失败
                        </div>
                    `;
                }
            }

            async getTodayAttendance() {
            try {
                // 使用当前日期，而不是构造函数中初始化的日期
                const now = new Date();
                // 使用与主页相同的日期格式 YYYY-MM-DD
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                console.log('今天的日期:', dateStr);
                
                // 获取当前项目ID
                let currentProjectId = localStorage.getItem('currentProjectId');
                if (currentProjectId && (currentProjectId.startsWith('"') || currentProjectId.startsWith('\''))) {
                    currentProjectId = currentProjectId.slice(1, -1);
                }
                console.log('当前项目ID:', currentProjectId);
                
                // 直接从localStorage获取数据，不依赖storageManager
                let attendanceRecords = [];
                try {
                    const localStorageData = localStorage.getItem('attendance');
                    console.log('localStorage中的考勤数据:', localStorageData);
                    if (localStorageData) {
                        const parsedData = JSON.parse(localStorageData);
                        if (Array.isArray(parsedData)) {
                            console.log('解析后的考勤记录数量:', parsedData.length);
                            attendanceRecords = parsedData;
                        }
                    }
                } catch (localError) {
                    console.error('Failed to get attendance from localStorage:', localError);
                }
                
                // 确保attendanceRecords是一个数组
                if (Array.isArray(attendanceRecords)) {
                    // 过滤出当前项目的考勤数据，如果没有项目ID则显示所有记录
                    let projectRecords = attendanceRecords;
                    if (currentProjectId) {
                        projectRecords = attendanceRecords.filter(record => String(record.projectId) === String(currentProjectId));
                    }
                    console.log('当前项目的考勤记录:', projectRecords);
                    const todayRecord = projectRecords.find(record => record.date === dateStr);
                    console.log('今天的考勤记录:', todayRecord);
                    return todayRecord;
                } else {
                    console.warn('attendanceRecords is not an array:', attendanceRecords);
                    return null;
                }
            } catch (error) {
                console.error('Failed to get today attendance:', error);
                return null;
            }
        }

        async clockIn() {
                try {
                    // 禁用打卡按钮，防止重复点击
                    this.clockInButton.disabled = true;
                    this.clockInButton.classList.add('btn-disabled');
                    this.clockInButton.title = '打卡中...';
                    
                    const now = new Date();
                    // 使用与主页相同的日期格式 YYYY-MM-DD
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    console.log('打卡日期:', dateStr);
                    
                    const checkInTime = now.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    let attendanceRecord = await this.getTodayAttendance();
                    
                    if (!attendanceRecord) {
                        // 获取当前项目ID，如果没有则使用默认值
                        let projectId = localStorage.getItem('currentProjectId');
                        // 去除可能的引号
                        if (projectId && (projectId.startsWith('"') || projectId.startsWith('\''))) {
                            projectId = projectId.slice(1, -1);
                        }
                        if (!projectId) {
                            // 尝试从项目列表中获取第一个项目ID
                            const projects = localStorage.getItem('projects');
                            if (projects) {
                                try {
                                    const projectsArray = JSON.parse(projects);
                                    if (projectsArray && projectsArray.length > 0) {
                                        projectId = projectsArray[0].id;
                                        // 保存为当前项目ID
                                        localStorage.setItem('currentProjectId', projectId);
                                    }
                                } catch (e) {
                                    console.error('解析项目数据失败:', e);
                                }
                            }
                        }
                        
                        // 使用与IntelligentStorageManager相同的attendanceId格式
                        const attendanceId = `attendance_${projectId || (localStorage.getItem('currentProjectId') ? localStorage.getItem('currentProjectId').replace(/^["']|['"]$/g, '') : 'default')}_${dateStr}`;
                        // 检测是否提前打卡
                        const isEarlyCheckIn = this.checkEarlyCheckIn(checkInTime);
                        // 检测是否迟到
                        const isLateCheckIn = this.checkLateCheckIn(checkInTime);
                        
                        attendanceRecord = {
                            id: attendanceId,
                            date: dateStr,
                            checkIn: checkInTime,
                            checkOut: null,
                            status: isLateCheckIn ? 'late' : 'present',
                            isEarlyCheckIn: isEarlyCheckIn,
                            isLateCheckIn: isLateCheckIn,
                            projectId: projectId || (localStorage.getItem('currentProjectId') ? localStorage.getItem('currentProjectId').replace(/^["']|['"]$/g, '') : 'default'),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        console.log('创建考勤记录，项目ID:', attendanceRecord.projectId);
                    } else {
                        attendanceRecord.checkIn = checkInTime;
                        // 检测是否提前打卡
                        attendanceRecord.isEarlyCheckIn = this.checkEarlyCheckIn(checkInTime);
                        // 检测是否迟到
                        attendanceRecord.isLateCheckIn = this.checkLateCheckIn(checkInTime);
                        attendanceRecord.status = attendanceRecord.isLateCheckIn ? 'late' : 'present';
                        attendanceRecord.updatedAt = new Date().toISOString();
                    }

                    // 保存考勤记录到localStorage
                    try {
                        let existingAttendance = [];
                        const existingData = localStorage.getItem('attendance');
                        if (existingData) {
                            try {
                                existingAttendance = JSON.parse(existingData);
                                if (!Array.isArray(existingAttendance)) {
                                    existingAttendance = [];
                                }
                            } catch (parseError) {
                                console.error('解析现有考勤数据失败:', parseError);
                                existingAttendance = [];
                            }
                        }
                        
                        // 合并数据
                        const dataMap = new Map();
                        existingAttendance.forEach(item => {
                            if (item.id) {
                                dataMap.set(item.id, item);
                            }
                        });
                        
                        dataMap.set(attendanceRecord.id, attendanceRecord);
                        const mergedData = Array.from(dataMap.values());
                        localStorage.setItem('attendance', JSON.stringify(mergedData));
                        console.log('考勤记录保存到localStorage成功:', attendanceRecord);
                        console.log('当前项目ID:', localStorage.getItem('currentProjectId'));
                        console.log('localStorage中的考勤记录数量:', mergedData.length);
                        // 打印完整的localStorage数据
                        console.log('localStorage完整考勤数据:', localStorage.getItem('attendance'));
                    } catch (localError) {
                        console.error('保存考勤记录到localStorage失败:', localError);
                    }

                    // 保存考勤记录到storageManager
                    const saveSuccess = await this.storageManager.set('attendance', attendanceRecord);
                    
                    // 无论storageManager保存是否成功，都更新UI状态
                    // 手动更新UI状态
                    this.clockInStatus.textContent = `已打卡 ${checkInTime}`;
                    this.clockInStatus.classList.add('status-present');
                    this.clockInButton.disabled = true;
                    this.clockInButton.classList.add('btn-disabled');
                    this.clockInButton.title = '今日已完成上班打卡';
                    this.clockOutButton.disabled = false;
                    this.clockOutButton.classList.remove('btn-disabled');
                    this.clockOutButton.title = '点击进行下班打卡';
                    
                    // 更新最近记录
                    await this.loadRecentRecords();
                    
                    // 更新最近打卡时间
                    await this.updateRecentClockTime();
                    
                    // 尝试同步到服务器（失败不影响本地打卡）
                    try {
                        await this.storageManager.syncLocalToServer();
                    } catch (syncError) {
                        console.warn('同步到服务器失败，将在网络恢复后自动同步:', syncError);
                    }
                    
                    // 通知主页更新数据
                    if (window.eventBus) {
                        console.log('触发考勤更新事件:', { date: dateStr, projectId: attendanceRecord.projectId });
                        window.eventBus.emit('attendance:updated', {
                            date: dateStr,
                            projectId: attendanceRecord.projectId
                        });
                    } else {
                        console.error('EventBus 不存在，无法触发考勤更新事件');
                    }
                    
                    // 同时设置一个本地存储标志，通知主页数据已更新
                    try {
                        localStorage.setItem('attendanceUpdated', Date.now().toString());
                        console.log('设置考勤更新标志');
                    } catch (error) {
                        console.error('设置考勤更新标志失败:', error);
                    }
                    
                    this.showToast('上班打卡成功', 'success');
                } catch (error) {
                    console.error('Clock-in failed:', error);
                    this.showToast('打卡失败，请检查网络连接', 'error');
                    // 打卡失败时恢复按钮状态
                    await this.loadClockStatus();
                }
            }

        async clockOut() {
            try {
                // 禁用打卡按钮，防止重复点击
                this.clockOutButton.disabled = true;
                this.clockOutButton.classList.add('btn-disabled');
                this.clockOutButton.title = '打卡中...';
                
                const now = new Date();
                // 使用与主页相同的日期格式 YYYY-MM-DD
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                const checkOutTime = now.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let attendanceRecord = await this.getTodayAttendance();
                
                if (!attendanceRecord) {
                    this.showToast('请先进行上班打卡', 'warning');
                    // 恢复按钮状态
                    await this.loadClockStatus();
                    return;
                }

                attendanceRecord.checkOut = checkOutTime;
                // 检测是否早退
                const isEarlyCheckOut = this.checkEarlyCheckOut(checkOutTime);
                // 更新状态
                if (attendanceRecord.isLateCheckIn) {
                    attendanceRecord.status = 'late';
                } else if (isEarlyCheckOut) {
                    attendanceRecord.status = 'early';
                } else {
                    attendanceRecord.status = 'present';
                }
                attendanceRecord.isEarlyCheckOut = isEarlyCheckOut;
                attendanceRecord.updatedAt = new Date().toISOString();
                
                // 确保有projectId
                if (!attendanceRecord.projectId) {
                    let projectId = localStorage.getItem('currentProjectId');
                    // 去除可能的引号
                    if (projectId && (projectId.startsWith('"') || projectId.startsWith('\''))) {
                        projectId = projectId.slice(1, -1);
                    }
                    if (!projectId) {
                        // 尝试从项目列表中获取第一个项目ID
                        const projects = localStorage.getItem('projects');
                        if (projects) {
                            try {
                                const projectsArray = JSON.parse(projects);
                                if (projectsArray && projectsArray.length > 0) {
                                    projectId = projectsArray[0].id;
                                    // 保存为当前项目ID
                                    localStorage.setItem('currentProjectId', projectId);
                                }
                            } catch (e) {
                                console.error('解析项目数据失败:', e);
                            }
                        }
                    }
                    attendanceRecord.projectId = projectId || 'default';
                }

                // 保存考勤记录到localStorage
                try {
                    let existingAttendance = [];
                    const existingData = localStorage.getItem('attendance');
                    if (existingData) {
                        try {
                            existingAttendance = JSON.parse(existingData);
                            if (!Array.isArray(existingAttendance)) {
                                existingAttendance = [];
                            }
                        } catch (parseError) {
                            console.error('解析现有考勤数据失败:', parseError);
                            existingAttendance = [];
                        }
                    }
                    
                    // 合并数据
                    const dataMap = new Map();
                    existingAttendance.forEach(item => {
                        if (item.id) {
                            dataMap.set(item.id, item);
                        }
                    });
                    
                    dataMap.set(attendanceRecord.id, attendanceRecord);
                    const mergedData = Array.from(dataMap.values());
                    localStorage.setItem('attendance', JSON.stringify(mergedData));
                } catch (localError) {
                    console.error('保存考勤记录到localStorage失败:', localError);
                }

                // 保存考勤记录到storageManager
                const saveSuccess = await this.storageManager.set('attendance', attendanceRecord);
                
                // 无论storageManager保存是否成功，都更新UI状态
                // 手动更新UI状态
                this.clockOutStatus.textContent = `已打卡 ${checkOutTime}`;
                this.clockOutStatus.classList.add('status-present');
                this.clockOutButton.disabled = true;
                this.clockOutButton.classList.add('btn-disabled');
                this.clockOutButton.title = '今日已完成下班打卡';
                
                // 更新最近记录
                await this.loadRecentRecords();
                
                // 更新最近打卡时间
                await this.updateRecentClockTime();
                
                // 尝试同步到服务器（失败不影响本地打卡）
                try {
                    await this.storageManager.syncLocalToServer();
                } catch (syncError) {
                    console.warn('同步到服务器失败，将在网络恢复后自动同步:', syncError);
                }
                
                // 通知主页更新数据
                if (window.eventBus) {
                    window.eventBus.emit('attendance:updated', {
                        date: dateStr,
                        projectId: attendanceRecord.projectId
                    });
                }
                
                this.showToast('下班打卡成功', 'success');
            } catch (error) {
                console.error('Clock-out failed:', error);
                this.showToast('打卡失败，请检查网络连接', 'error');
                // 打卡失败时恢复按钮状态
                await this.loadClockStatus();
            }
        }

        showToast(message, type = 'info') {
            if (window.toast) {
                switch (type) {
                    case 'success':
                        window.toast.success(message);
                        break;
                    case 'error':
                        window.toast.error(message);
                        break;
                    case 'warning':
                        window.toast.warning(message);
                        break;
                    default:
                        window.toast.info(message);
                }
            } else {
                alert(message);
            }
        }
    }
    </script>
<?php
include '../html-new/menu.php';
include '../html-new/footer.php';
?>
</body>
</html>