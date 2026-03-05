// 动态获取syncDataToCloud和restoreDataFromCloud函数，确保使用最新的函数
function getSyncDataToCloud() {
    return window.syncDataToCloud || (async (storageManager) => {
        return { success: false, error: 'syncDataToCloud not loaded' };
    });
}

function getRestoreDataFromCloud() {
    return window.restoreDataFromCloud || (async (storageManager) => {
        return { success: false, error: 'restoreDataFromCloud not loaded' };
    });
}

// 加载XLSX库或使用本地模拟实现
if (typeof XLSX === 'undefined') {
    // 直接使用本地模拟实现，避免CDN加载失败
    window.XLSX = {
        utils: {
            json_to_sheet: function(data) {
                return { data: JSON.stringify(data) };
            },
            book_new: function() {
                return { Sheets: {}, SheetNames: [] };
            },
            book_append_sheet: function(book, sheet, name) {
                book.Sheets[name] = sheet;
                book.SheetNames.push(name);
            }
        },
        writeFile: function(book, filename) {
            // 模拟导出，实际使用CSV格式
            try {
                const data = JSON.parse(book.Sheets.Sheet1.data);
                const csvContent = "data:text/csv;charset=utf-8," + 
                    Object.keys(data[0]).join(',') + '\n' +
                    data.map(row => Object.values(row).join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", filename.replace('.xlsx', '.csv'));
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                // 纯文本导出作为最终备选方案
                const textContent = "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(book, null, 2));
                const encodedUri = encodeURI(textContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", filename.replace('.xlsx', '.txt'));
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };
}

// 解析URL参数
function getUrlParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams.entries()) {
        params[key] = value;
    }
    return params;
}

class AttendanceStatus {
    constructor(options = {}) {
        this.storage = options.storage || window.storageManager;
        this.eventBus = options.eventBus || window.eventBus;
        this.toast = options.toast || window.toast;
        this.dialog = options.dialog || window.dialog;
        this.logger = options.logger || window.logger;
        this.theme = options.theme || window.themeManager;
        this.attendanceList = [];
        this.currentFilter = 'all';
        this.eventsBound = false;
        this.urlParams = getUrlParams();
        this.currentProjectId = localStorage.getItem('currentProjectId');
        this.cloudSync = {
            syncDataToCloud: () => getSyncDataToCloud()(this.storage),
            restoreDataFromCloud: () => getRestoreDataFromCloud()(this.storage)
        };
    }

    async init() {
        try {
            await this.storage.init();
            
            this.currentProjectId = localStorage.getItem('currentProjectId');
            
            // 如果是管理员查看模式，设置用户ID
            if (this.urlParams.user_id && this.urlParams.admin_view) {
                localStorage.setItem('user_id', this.urlParams.user_id);
            }
            
            await this.loadAttendanceList();
            this.renderAttendanceList();
            this.bindEvents();
            // 初始化登录图标管理器
            if (window.loginIconManager) {
                window.loginIconManager.init();
            }
            // 初始化主题管理器
            if (this.theme) {
                this.theme.init();
            }
        } catch (error) {
            this.toast.error('初始化考勤状态失败');
        }
    }

    async loadAttendanceList() {
        try {
            let attendanceData = await this.storage.getAll('attendance');
            
            if (!attendanceData || attendanceData.length === 0) {
                try {
                    const localStorageData = localStorage.getItem('attendance');
                    if (localStorageData) {
                        attendanceData = JSON.parse(localStorageData);
                    }
                } catch (localError) {
                }
            }
            
            const rawData = Array.isArray(attendanceData) ? attendanceData : [];
            
            let projectData;
            if (this.currentProjectId) {
                const normalizedProjectId = this.currentProjectId.replace(/^"|"$/g, '');
                projectData = rawData.filter(item => {
                    const itemProjectId = String(item.projectId || '');
                    return itemProjectId === normalizedProjectId || itemProjectId === String(this.currentProjectId);
                });
            } else {
                projectData = rawData;
            }
            
            const uniqueData = this.removeDuplicateAttendance(projectData);
            
            this.attendanceList = uniqueData;
            
            this.attendanceList.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
        } catch (error) {
            this.attendanceList = [];
        }
    }
    
    // 去除重复的考勤记录，保留有打卡时间的记录
    removeDuplicateAttendance(attendanceData) {
        const uniqueMap = new Map();
        
        attendanceData.forEach(record => {
            if (record.date) {
                const key = record.projectId ? `${record.projectId}_${record.date}` : record.date;
                const existingRecord = uniqueMap.get(key);
                if (!existingRecord || 
                    (record.checkIn && record.checkOut && (!existingRecord.checkIn || !existingRecord.checkOut)) ||
                    (record.checkIn && !existingRecord.checkIn)) {
                    uniqueMap.set(key, record);
                }
            }
        });
        
        return Array.from(uniqueMap.values());
    }

    // 获取当前月份的考勤数据
    getCurrentMonthAttendance() {
        // 获取当前月份的开始和结束日期
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 过滤出当前月份的考勤数据
        const currentMonthAttendance = this.attendanceList.filter(a => {
            const attendanceDate = new Date(a.date);
            return attendanceDate.getMonth() === currentMonth && attendanceDate.getFullYear() === currentYear;
        });
        
        return currentMonthAttendance;
    }

    renderAttendanceList() {
        const container = document.getElementById('attendance-list');
        if (!container) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = now.getDate();
        
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const attendanceMap = {};
        this.attendanceList.forEach(item => {
            const dateKey = item.date.substring(0, 10);
            attendanceMap[dateKey] = item;
        });
        
        const anomalies = window.attendanceAlertInstance ? window.attendanceAlertInstance.getAnomalies() : [];
        const anomalyMap = {};
        anomalies.forEach(a => { anomalyMap[a.date] = a; });

        const allDays = [];
        for (let day = 1; day <= today; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const item = attendanceMap[dateStr];
            const anomaly = anomalyMap[dateStr];
            
            allDays.push({
                date: dateStr,
                status: item ? item.status : 'unrecorded',
                remark: item ? item.remark : null,
                checkIn: item ? item.checkIn : null,
                checkOut: item ? item.checkOut : null,
                id: item ? item.id : null,
                isEarlyCheckIn: item ? item.isEarlyCheckIn : false,
                anomaly: anomaly
            });
        }
        
        allDays.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = allDays.map(item => {
            const anomalyHtml = item.anomaly ? `
                <span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px;">
                    <i class="fas fa-exclamation-triangle"></i> ${item.anomaly.type === 'late' ? '迟到' : item.anomaly.type === 'early_leave' ? '早退' : item.anomaly.type === 'incomplete' ? '未完成' : '异常'}
                </span>
            ` : '';
            
            const isUnrecorded = item.status === 'unrecorded';
            const statusClass = isUnrecorded ? 'status-unrecorded' : `status-${item.status}`;
            const statusText = isUnrecorded ? '未记录' : this.formatStatus(item.status);
            const rowStyle = isUnrecorded ? 'background-color: rgba(255, 200, 200, 0.3);' : '';
            
            return `
            <div class="attendance-item" data-id="${item.id || ''}" style="${rowStyle}">
                <div class="date">
                    <i class="fas fa-calendar"></i>
                    ${Utils.formatDate(new Date(item.date), 'YYYY-MM-DD')}
                    ${anomalyHtml}
                    ${isUnrecorded ? '<span style="color: var(--error-color); margin-left: 8px;"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                </div>
                <div class="status ${statusClass}">
                    ${statusText}
                </div>
                <div class="remark">
                        ${item.remark || '无备注'}
                        ${(item.checkIn || item.checkOut) ? '<br>' : ''}
                        ${item.checkIn ? `上班: ${item.checkIn}${item.isEarlyCheckIn ? '（提前）' : item.isLateCheckIn ? '（迟到）' : ''}` : ''}
                        ${item.checkIn && item.checkOut ? ' | ' : ''}
                        ${item.checkOut ? `下班: ${item.checkOut}${item.isEarlyCheckOut ? '（早退）' : ''}` : ''}
                    </div>
                <div class="actions">
                    ${item.id ? `<button class="btn btn-sm btn-ghost" data-action="edit" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>` : ''}
                </div>
            </div>
        `}).join('');

        this.updateStatistics();
    }

    formatStatus(status) {
        const statusMap = {
            'present': '全勤',
            'half': '半天',
            'absent': '缺勤',
            'leave': '请假',
            'rest': '休息',
            'holiday': '放假',
            'late': '迟到',
            'early': '早退'
        };
        return statusMap[status] || '未知';
    }

    filterAttendance(list, filter) {
        if (filter === 'all') return list;
        
        return list.filter(item => item.status === filter);
    }

    updateStatistics() {
        // 获取当前月份的开始和结束日期
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 过滤出当前月份的考勤数据
        const currentMonthAttendance = this.attendanceList.filter(a => {
            const attendanceDate = new Date(a.date);
            return attendanceDate.getMonth() === currentMonth && attendanceDate.getFullYear() === currentYear;
        });
        
        // 计算当前月份的统计数据
        const presentCount = currentMonthAttendance.filter(a => a.status === 'present').length;
        const halfCount = currentMonthAttendance.filter(a => a.status === 'half').length;
        const absentCount = currentMonthAttendance.filter(a => a.status === 'absent').length;
        const lateCount = this.calculateLateCount(currentMonthAttendance);
        const earlyCount = this.calculateEarlyCount(currentMonthAttendance);

        const presentEl = document.getElementById('stat-present');
        const halfEl = document.getElementById('stat-half');
        const absentEl = document.getElementById('stat-absent');
        const lateEl = document.getElementById('stat-late');
        const earlyEl = document.getElementById('stat-early');
        const anomalyEl = document.getElementById('stat-anomaly');

        if (presentEl) presentEl.textContent = presentCount;
        if (halfEl) halfEl.textContent = halfCount;
        if (absentEl) absentEl.textContent = absentCount;
        if (lateEl) lateEl.textContent = lateCount;
        if (earlyEl) earlyEl.textContent = earlyCount;
        
        if (anomalyEl) {
            const today = now.getDate() - 1;
            let unrecordedCount = 0;
            for (let day = 1; day <= today; day++) {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasRecord = currentMonthAttendance.some(a => a.date === dateStr);
                if (!hasRecord) {
                    unrecordedCount++;
                }
            }
            anomalyEl.textContent = unrecordedCount;
        }
    }
    
    // 计算提前到岗次数
    calculateEarlyCount(attendanceList) {
        return attendanceList.filter(record => record.isEarlyCheckIn === true).length;
    }
    
    // 获取当前项目的工作时间设置
    getCurrentProjectWorkHours() {
        try {
            // 从localStorage获取当前项目ID
            const currentProjectId = localStorage.getItem('currentProjectId');
            if (!currentProjectId) return null;
            
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
    
    // 计算迟到次数
    calculateLateCount(attendanceList) {
        let lateCount = 0;
        
        // 获取当前项目的工作时间设置
        const workHours = this.getCurrentProjectWorkHours();
        
        // 从localStorage获取系统设置
        const savedSettings = localStorage.getItem('systemSettings');
        let systemSettings = null;
        if (savedSettings) {
            try {
                systemSettings = JSON.parse(savedSettings);
            } catch (e) {
                console.error('解析系统设置失败:', e);
            }
        }
        
        // 定义默认值
        const defaultMorningStart = '08:00';
        const defaultLateThreshold = 10;
        
        // 获取上班时间和迟到阈值
        const morningStart = workHours?.morningStart || defaultMorningStart;
        const lateThreshold = systemSettings?.lateThreshold || defaultLateThreshold;
        
        attendanceList.forEach(record => {
            if (record.checkIn) {
                // 解析打卡时间
                const checkInTime = record.checkIn;
                
                // 判断是否迟到
                if (this.isLate(checkInTime, morningStart, lateThreshold)) {
                    lateCount++;
                }
            }
        });
        
        return lateCount;
    }
    
    // 判断是否迟到
    isLate(checkInTime, morningStart, lateThreshold) {
        try {
            // 转换时间为分钟数
            const checkInMinutes = this.timeToMinutes(checkInTime);
            const morningStartMinutes = this.timeToMinutes(morningStart);
            
            // 计算迟到时间阈值
            const lateThresholdMinutes = morningStartMinutes + lateThreshold;
            
            // 判断是否迟到
            return checkInMinutes > lateThresholdMinutes;
        } catch (error) {
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

    bindEvents() {
        // 防止事件监听器重复绑定
        if (this.eventsBound) {
            return;
        }

        const filterSelect = document.getElementById('status-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderAttendanceList();
            });
        }

        // 日期范围筛选
        const applyDateFilterBtn = document.getElementById('apply-date-filter');
        if (applyDateFilterBtn) {
            applyDateFilterBtn.addEventListener('click', () => {
                const startDate = document.getElementById('date-start').value;
                const endDate = document.getElementById('date-end').value;
                this.filterByDateRange(startDate, endDate);
            });
        }

        const exportBtn = document.getElementById('export-attendance');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAttendance();
            });
        }

        // 为考勤记录的编辑和删除按钮添加事件监听器
        this.clickHandler = (e) => {
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
                case 'sync-data':
                    this.handleSyncData();
                    break;
                case 'edit':
                    this.editAttendance(id);
                    break;
                case 'close-alert':
                    document.getElementById('attendance-alert-section').style.display = 'none';
                    break;
                case 'check-anomalies':
                    this.toast.info('正在检查异常详情...');
                    if (window.attendanceAlertInstance) {
                        window.attendanceAlertInstance.triggerCheck();
                        setTimeout(() => {
                            this.renderAttendanceAlerts();
                        }, 1000);
                    }
                    break;
                case 'clear-anomalies':
                    if (window.attendanceAlertInstance) {
                        window.attendanceAlertInstance.clearAnomalies();
                        document.getElementById('attendance-alert-section').style.display = 'none';
                        this.renderAttendanceList();
                        this.toast.success('异常已标记为已处理');
                    }
                    break;
                case 'clear-single-anomaly':
                    if (window.attendanceAlertInstance) {
                        const index = parseInt(actionEl.dataset.index);
                        const anomalies = window.attendanceAlertInstance.getAnomalies();
                        if (index >= 0 && index < anomalies.length) {
                            anomalies.splice(index, 1);
                            localStorage.setItem('attendanceAnomalies', JSON.stringify(anomalies));
                            this.renderAttendanceAlerts();
                            this.renderAttendanceList();
                            this.toast.success('已忽略该异常');
                        }
                    }
                    break;
                case 'check-attendance-anomalies':
                    this.toast.info('正在检查考勤异常...');
                    if (window.attendanceAlertInstance) {
                        window.attendanceAlertInstance.triggerCheck().then(() => {
                            const anomalies = window.attendanceAlertInstance.getAnomalies();
                            this.renderAttendanceList();
                            if (anomalies.length > 0) {
                                this.renderAttendanceAlerts();
                                this.toast.warning(`发现 ${anomalies.length} 条考勤异常`);
                            } else {
                                this.toast.success('考勤数据正常，未发现异常');
                            }
                        }).catch(err => {
                            this.toast.error('检查异常失败');
                        });
                    } else {
                        this.toast.error('异常检测模块未加载，请刷新页面重试');
                    }
                    break;
            }
        };

        document.addEventListener('click', this.clickHandler);

        // 标记事件监听器已绑定
        this.eventsBound = true;
    }

    // 添加destroy方法，用于清理事件监听器
    destroy() {
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        this.eventsBound = false;
    }

    filterByDate(targetDate) {
        if (!targetDate) {
            // 如果没有选择日期，显示所有记录并更新统计为当月
            this.renderAttendanceList();
            // 更新统计期间显示
            const statPeriodEl = document.getElementById('stat-period');
            if (statPeriodEl) {
                statPeriodEl.textContent = '当月考勤统计';
            }
            return;
        }
        
        // 过滤出日期包含targetDate的考勤记录
        const filteredList = this.attendanceList.filter(item => 
            item.date.includes(targetDate)
        );
        
        const container = document.getElementById('attendance-list');
        if (!container) return;

        if (!filteredList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>该日期无考勤记录</p>
                </div>
            `;
        } else {
            container.innerHTML = filteredList.map(item => `
                <div class="attendance-item" data-id="${item.id}">
                    <div class="date">
                        <i class="fas fa-calendar"></i>
                        ${Utils.formatDate(new Date(item.date), 'YYYY-MM-DD')}
                    </div>
                    <div class="status status-${item.status}">
                        ${this.formatStatus(item.status)}
                    </div>
                    <div class="remark">
                        ${item.remark || '无备注'}
                        ${(item.checkIn || item.checkOut) ? '<br>' : ''}
                        ${item.checkIn ? `上班: ${item.checkIn}${item.isEarlyCheckIn ? '（提前）' : ''}` : ''}
                        ${item.checkIn && item.checkOut ? ' | ' : ''}
                        ${item.checkOut ? `下班: ${item.checkOut}` : ''}
                    </div>
                    <div class="actions">
                    <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                </div>
            `).join('');
        }
        
        // 更新统计期间显示
        const statPeriodEl = document.getElementById('stat-period');
        if (statPeriodEl) {
            statPeriodEl.textContent = `${targetDate} 考勤统计`;
        }
        
        // 更新统计结果为筛选后的日期
        this.updateStatisticsForDate(targetDate);
    }

    // 按指定日期更新统计结果
    updateStatisticsForDate(targetDate) {
        // 过滤出指定日期的考勤记录
        const filteredAttendance = this.attendanceList.filter(item => 
            item.date.includes(targetDate)
        );
        
        // 计算指定日期的统计数据
        const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
        const halfCount = filteredAttendance.filter(a => a.status === 'half').length;
        const absentCount = filteredAttendance.filter(a => a.status === 'absent').length;
        const lateCount = this.calculateLateCount(filteredAttendance);
        const earlyCount = this.calculateEarlyCount(filteredAttendance);

        const presentEl = document.getElementById('stat-present');
        const halfEl = document.getElementById('stat-half');
        const absentEl = document.getElementById('stat-absent');
        const lateEl = document.getElementById('stat-late');
        const earlyEl = document.getElementById('stat-early');

        if (presentEl) presentEl.textContent = presentCount;
        if (halfEl) halfEl.textContent = halfCount;
        if (absentEl) absentEl.textContent = absentCount;
        if (lateEl) lateEl.textContent = lateCount;
        if (earlyEl) earlyEl.textContent = earlyCount;
    }

    // 按日期范围筛选
    filterByDateRange(startDate, endDate) {
        if (!startDate && !endDate) {
            // 如果没有选择日期，显示所有记录并更新统计为当月
            this.renderAttendanceList();
            // 更新统计期间显示
            const statPeriodEl = document.getElementById('stat-period');
            if (statPeriodEl) {
                statPeriodEl.textContent = '当月考勤统计';
            }
            return;
        }
        
        // 过滤出指定日期范围内的考勤记录
        const filteredList = this.attendanceList.filter(item => {
            const itemDate = new Date(item.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            if (start && end) {
                // 同时有开始和结束日期，筛选范围内的记录
                return itemDate >= start && itemDate <= end;
            } else if (start) {
                // 只有开始日期，筛选开始日期及以后的记录
                return itemDate >= start;
            } else if (end) {
                // 只有结束日期，筛选结束日期及以前的记录
                return itemDate <= end;
            }
            return true;
        });
        
        const container = document.getElementById('attendance-list');
        if (!container) return;

        if (!filteredList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>该日期范围内无考勤记录</p>
                </div>
            `;
        } else {
            container.innerHTML = filteredList.map(item => `
                <div class="attendance-item" data-id="${item.id}">
                    <div class="date">
                        <i class="fas fa-calendar"></i>
                        ${Utils.formatDate(new Date(item.date), 'YYYY-MM-DD')}
                    </div>
                    <div class="status status-${item.status}">
                        ${this.formatStatus(item.status)}
                    </div>
                    <div class="remark">
                        ${item.remark || '无备注'}
                        ${(item.checkIn || item.checkOut) ? '<br>' : ''}
                        ${item.checkIn ? `上班: ${item.checkIn}${item.isEarlyCheckIn ? '（提前）' : ''}` : ''}
                        ${item.checkIn && item.checkOut ? ' | ' : ''}
                        ${item.checkOut ? `下班: ${item.checkOut}` : ''}
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // 更新统计期间显示
        const statPeriodEl = document.getElementById('stat-period');
        if (statPeriodEl) {
            if (startDate && endDate) {
                statPeriodEl.textContent = `${startDate} 至 ${endDate} 考勤统计`;
            } else if (startDate) {
                statPeriodEl.textContent = `${startDate} 以后考勤统计`;
            } else if (endDate) {
                statPeriodEl.textContent = `${endDate} 以前考勤统计`;
            }
        }
        
        // 更新统计结果为筛选后的日期范围
        this.updateStatisticsForDateRange(startDate, endDate);
    }

    // 按指定日期范围更新统计结果
    updateStatisticsForDateRange(startDate, endDate) {
        // 过滤出指定日期范围内的考勤记录
        const filteredAttendance = this.attendanceList.filter(item => {
            const itemDate = new Date(item.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            if (start && end) {
                // 同时有开始和结束日期，筛选范围内的记录
                return itemDate >= start && itemDate <= end;
            } else if (start) {
                // 只有开始日期，筛选开始日期及以后的记录
                return itemDate >= start;
            } else if (end) {
                // 只有结束日期，筛选结束日期及以前的记录
                return itemDate <= end;
            }
            return true;
        });
        
        // 计算指定日期范围的统计数据
        const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
        const halfCount = filteredAttendance.filter(a => a.status === 'half').length;
        const absentCount = filteredAttendance.filter(a => a.status === 'absent').length;
        const lateCount = this.calculateLateCount(filteredAttendance);
        const earlyCount = this.calculateEarlyCount(filteredAttendance);

        const presentEl = document.getElementById('stat-present');
        const halfEl = document.getElementById('stat-half');
        const absentEl = document.getElementById('stat-absent');
        const lateEl = document.getElementById('stat-late');
        const earlyEl = document.getElementById('stat-early');

        if (presentEl) presentEl.textContent = presentCount;
        if (halfEl) halfEl.textContent = halfCount;
        if (absentEl) absentEl.textContent = absentCount;
        if (lateEl) lateEl.textContent = lateCount;
        if (earlyEl) earlyEl.textContent = earlyCount;
    }

    editAttendance(id) {
        const item = this.attendanceList.find(a => a.id === id);
        if (!item) return;

        // 创建自定义对话框
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'custom-dialog-overlay';
        dialogContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog';
        dialog.style.cssText = `
            background-color: var(--bg-primary);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-xl);
            width: 90%;
            max-width: 400px;
            box-shadow: var(--shadow-lg);
        `;

        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'dialog-header';
        dialogHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg);
        `;

        const dialogTitle = document.createElement('h4');
        dialogTitle.className = 'dialog-title';
        dialogTitle.style.cssText = `
            margin: 0;
            font-size: var(--font-size-lg);
            font-weight: 600;
            color: var(--text-primary);
        `;
        dialogTitle.textContent = '编辑考勤记录';

        const closeButton = document.createElement('button');
        closeButton.className = 'btn btn-sm btn-ghost';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: var(--font-size-lg);
            cursor: pointer;
            color: var(--text-secondary);
        `;
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.removeChild(dialogContainer);
        });

        dialogHeader.appendChild(dialogTitle);
        dialogHeader.appendChild(closeButton);

        const dialogBody = document.createElement('div');
        dialogBody.className = 'dialog-body';
        dialogBody.style.cssText = `
            margin-bottom: var(--spacing-lg);
        `;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.style.cssText = `
            margin-bottom: var(--spacing-md);
        `;

        const label = document.createElement('label');
        label.htmlFor = 'remark-input';
        label.className = 'form-label';
        label.style.cssText = `
            display: block;
            margin-bottom: var(--spacing-sm);
            font-weight: 500;
            color: var(--text-primary);
        `;
        label.textContent = '备注';

        const textarea = document.createElement('textarea');
        textarea.id = 'remark-input';
        textarea.name = 'remark';
        textarea.className = 'form-input';
        textarea.style.cssText = `
            width: 100%;
            padding: var(--spacing-md);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            font-size: var(--font-size-md);
            resize: vertical;
            min-height: 100px;
        `;
        textarea.value = item.remark || '';

        formGroup.appendChild(label);
        formGroup.appendChild(textarea);
        dialogBody.appendChild(formGroup);

        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'dialog-footer';
        dialogFooter.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-md);
        `;

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-secondary';
        cancelButton.style.cssText = `
            padding: var(--spacing-sm) var(--spacing-lg);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            transition: all var(--transition-fast);
        `;
        cancelButton.textContent = '取消';
        cancelButton.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.removeChild(dialogContainer);
        });

        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-primary';
        saveButton.style.cssText = `
            padding: var(--spacing-sm) var(--spacing-lg);
            border: none;
            border-radius: var(--border-radius-md);
            background-color: var(--primary-color);
            color: white;
            cursor: pointer;
            transition: all var(--transition-fast);
        `;
        saveButton.textContent = '保存';
        saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const newRemark = textarea.value;
            
            // 立即更新UI，不等待存储操作
            item.remark = newRemark;
            this.renderAttendanceList();
            this.toast.success('备注已更新');

            // 后台执行存储操作
            this.storage.set('attendance', item).catch(error => {
                this.toast.error('更新备注失败');
            });

            document.body.removeChild(dialogContainer);
        });

        dialogFooter.appendChild(cancelButton);
        dialogFooter.appendChild(saveButton);

        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogBody);
        dialog.appendChild(dialogFooter);
        dialogContainer.appendChild(dialog);

        document.body.appendChild(dialogContainer);
    }



    exportAttendance() {
        if (!this.attendanceList.length) {
            this.toast.warning('暂无考勤记录可导出');
            return;
        }

        // 检查XLSX是否已加载
        if (typeof XLSX === 'undefined') {
            // XLSX库未加载，使用纯文本导出作为备选方案
            this.exportAttendanceAsText();
            return;
        }

        const data = this.attendanceList.map(item => ({
            日期: Utils.formatDate(new Date(item.date), 'YYYY-MM-DD'),
            状态: this.formatStatus(item.status),
            备注: item.remark || '无备注'
        }));

        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '考勤记录');
            XLSX.writeFile(wb, `考勤记录_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`);
            
            this.toast.success('考勤记录已导出');
        } catch (error) {
            // 导出失败，使用纯文本导出作为备选方案
            this.exportAttendanceAsText();
        }
    }

    // 纯文本导出备选方案
    exportAttendanceAsText() {
        const data = this.attendanceList.map(item => ({
            日期: Utils.formatDate(new Date(item.date), 'YYYY-MM-DD'),
            状态: this.formatStatus(item.status),
            备注: item.remark || '无备注'
        }));

        // 生成CSV格式文本
        const headers = ['日期', '状态', '备注'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');

        // 创建Blob对象并下载
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `考勤记录_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.toast.success('考勤记录已导出为CSV文件');
    }

    async handleSyncData() {
        try {
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
                return;
            }
            
            this.toast.info('数据同步中...');
            
            // 调用云端同步功能
            const result = await this.cloudSync.syncDataToCloud();
            
            if (result.success) {
                this.toast.success('数据同步成功！');
            } else {
                this.toast.error('数据同步失败，请重试');
            }
        } catch (error) {
            this.toast.error('同步过程中发生错误，请重试');
        }
    }

    async handleCloudRestore() {
        try {
            
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
                return;
            }
            
            this.toast.info('从云端恢复数据中...');
            
            // 调用云端恢复功能
            const result = await this.cloudSync.restoreDataFromCloud();
            
            if (result.success) {
                this.toast.success('数据恢复成功！页面将自动刷新...');
                
                // 强制刷新页面以确保所有数据都被重新加载
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.toast.error('恢复数据失败，请重试');
            }
        } catch (error) {
            this.toast.error('恢复过程中发生错误，请重试');
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
    
    // 渲染考勤异常提醒
    renderAttendanceAlerts() {
        const alertSection = document.getElementById('attendance-alert-section');
        const alertContent = document.getElementById('alert-content');
        
        if (!alertSection || !alertContent) return;
        
        const anomalies = window.attendanceAlertInstance ? window.attendanceAlertInstance.getAnomalies() : [];
        
        if (anomalies.length > 0) {
            alertSection.style.display = 'block';
            
            alertContent.innerHTML = `
                <p>发现 ${anomalies.length} 条考勤异常记录：</p>
                <ul style="margin: 12px 0; padding-left: 0; list-style: none;">
                    ${anomalies.map((anomaly, index) => `
                        <li style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 4px;">
                            <span><span style="font-weight: 500;">${anomaly.date}</span>: ${anomaly.message}</span>
                            <button data-action="clear-single-anomaly" data-index="${index}" style="background: #856404; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                忽略
                            </button>
                        </li>
                    `).join('')}
                </ul>
            `;
            
            this.bindAlertEvents();
        } else {
            alertSection.style.display = 'none';
        }
    }
    
    // 绑定异常提醒事件 - 使用事件委托
    bindAlertEvents() {
        // 事件委托已经在bindEvents中处理，这里不需要重复绑定
        // 移除单独的事件监听器，使用全局事件委托
    }
}

// 预加载考勤异常检测模块
function preloadAttendanceAlert() {
    const script = document.createElement('script');
    script.src = '/jg/js/attendance-alert.js';
    script.async = true;
    document.head.appendChild(script);
}

// 添加全局引用
window.AttendanceStatus = AttendanceStatus;

// 防止重复初始化
if (!window.attendanceStatusInstance) {
    window.attendanceStatusInstance = null;
    window.attendanceAlertInstance = null;
    
    document.addEventListener('DOMContentLoaded', async () => {
        // 预加载考勤异常检测模块
        preloadAttendanceAlert();
        
        // 确保只创建一个AttendanceStatus实例
        if (!window.attendanceStatusInstance) {
            try {
                // 等待核心工具库初始化
                if (!window.storageManager || !window.eventBus) {
                    // 如果核心工具库未初始化，使用降级方案
                    const eventBus = new EventBus();
                    const storage = new IntelligentStorageManager();
                    await storage.init();
                    const logger = new Logger();
                    const toast = new Toast(eventBus);
                    const dialog = new Dialog(eventBus);
                    const theme = new ThemeManager(storage, eventBus);
                    theme.init();
                    
                    window.attendanceStatusInstance = new AttendanceStatus({
                        storage: storage,
                        eventBus: eventBus,
                        toast: toast,
                        dialog: dialog,
                        logger: logger,
                        theme: theme
                    });
                } else {
                    // 使用全局核心工具库实例
                    window.attendanceStatusInstance = new AttendanceStatus();
                }
                
                await window.attendanceStatusInstance.init();

                // 初始化考勤异常检测 - 使用 requestIdleCallback 或立即执行以减少页面闪烁
                const initAttendanceAlert = () => {
                    if (window.AttendanceAlert) {
                        window.attendanceAlertInstance = new AttendanceAlert(window.storageManager || storage, window.toast || toast);
                        window.attendanceAlertInstance.init();
                    }
                };

                // 如果浏览器支持 requestIdleCallback，使用它；否则立即执行
                if (window.requestIdleCallback) {
                    requestIdleCallback(initAttendanceAlert, { timeout: 100 });
                } else {
                    initAttendanceAlert();
                }
                
                // 初始化菜单处理器
        if (!window.menuHandler) {
            const MenuHandler = window.MenuHandler || (function() {
                // 降级实现
                return function(options) {
                    return {
                        toast: options.toast,
                        logger: options.logger,
                        init: function() {
                            // 绑定菜单事件
                            document.addEventListener('click', (e) => {
                                const actionEl = e.target.closest('[data-action]');
                                
                                if (actionEl) {
                                    const action = actionEl.dataset.action;
                                    
                                    switch (action) {
                                        case 'toggle-menu':
                                            this.toggleMenu();
                                            break;
                                        case 'close-menu':
                                            this.closeMenu();
                                            break;
                                        case 'share-screenshot':
                                            this.handleShareScreenshot();
                                            break;
                                        case 'logout':
                                            this.handleLogout();
                                            break;
                                    }
                                }
                            });
                        },
                        // 切换菜单显示状态
                        toggleMenu: function() {
                            // 首先尝试通过id找到菜单元素
                            let menu = document.getElementById('mobileMenu');
                            // 如果没找到，再尝试通过class找到
                            if (!menu) {
                                menu = document.querySelector('.mobile-menu');
                            }
                            if (menu) {
                                menu.classList.toggle('show');
                            }
                        },
                        // 关闭菜单
                        closeMenu: function() {
                            // 首先尝试通过id找到菜单元素
                            let menu = document.getElementById('mobileMenu');
                            // 如果没找到，再尝试通过class找到
                            if (!menu) {
                                menu = document.querySelector('.mobile-menu');
                            }
                            if (menu) {
                                menu.classList.remove('show');
                                // 移除内联样式，确保后续的toggle操作能正常工作
                                setTimeout(() => {
                                    menu.style.display = '';
                                }, 300);
                            }
                        },
                        // 处理退出登录
                        handleLogout: function() {
                            if (confirm('确定要退出登录吗？')) {
                                // 清除本地存储
                                localStorage.removeItem('user_id');
                                localStorage.removeItem('user_name');
                                localStorage.removeItem('user_email');
                                localStorage.removeItem('user_phone');
                                localStorage.removeItem('user_password');
                                
                                // 显示退出成功提示
                                if (this.toast) {
                                    this.toast.success('退出登录成功');
                                } else {
                                    alert('退出登录成功');
                                }
                                
                                // 关闭菜单
                                this.closeMenu();
                                
                                // 跳转到登录页面
                                setTimeout(() => {
                                    window.location.href = '/jg/admin/login.html';
                                }, 1000);
                            } else {
                                // 关闭菜单
                                this.closeMenu();
                            }
                        },
                        // 处理分享截图
                        handleShareScreenshot: function() {
                            
                            // 先关闭菜单
                            this.closeMenu();
                            
                            // 延迟执行截图操作，确保菜单完全关闭
                            setTimeout(() => {
                                this.performScreenshot();
                            }, 300); // 300毫秒的延迟，与菜单关闭动画时间匹配
                        },
                        
                        // 执行截图操作
                        performScreenshot: function() {
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
                                    
                                    // 配置HTML2Canvas选项，确保生成高清图片
                                    const options = {
                                        scale: 2, // 缩放比例，2表示2倍高清
                                        useCORS: true, // 允许跨域图片
                                        logging: false, // 禁用日志
                                        backgroundColor: '#ffffff', // 设置白色背景
                                        removeContainer: true, // 截图完成后移除临时容器
                                        width: element.offsetWidth, // 设置截图宽度
                                        height: element.offsetHeight, // 设置截图高度
                                        windowWidth: document.documentElement.clientWidth, // 设置窗口宽度
                                        windowHeight: document.documentElement.clientHeight // 设置窗口高度
                                    };
                                    
                                    // 使用HTML2Canvas进行截图
                                    html2canvas(element, options).then((canvas) => {
                                        // 显示成功提示
                                        if (this.toast) {
                                            this.toast.success('截图成功');
                                        } else {
                                            alert('截图成功');
                                        }
                                        
                                        // 询问用户是否保存为图片
                                        const shareOptions = confirm('截图成功，是否保存为图片？');
                                        if (shareOptions) {
                                            // 将canvas转换为图片并下载
                                            this.saveCanvasAsImage(canvas);
                                        }
                                    }).catch((error) => {
                                        if (this.toast) {
                                            this.toast.error('截图失败，请重试');
                                        } else {
                                            alert('截图失败，请重试');
                                        }
                                    });
                                }).catch((error) => {
                                    if (this.toast) {
                                        this.toast.error('加载截图功能失败，请重试');
                                    } else {
                                        alert('加载截图功能失败，请重试');
                                    }
                                });
                            } catch (error) {
                                if (this.toast) {
                                    this.toast.error('截图失败，请重试');
                                } else {
                                    alert('截图失败，请重试');
                                }
                            }
                        },
                        
                        // 动态加载HTML2Canvas库
                        loadHTML2Canvas: function() {
                            return new Promise((resolve, reject) => {
                                // 检查HTML2Canvas库是否已加载
                                if (window.html2canvas) {
                                    resolve();
                                    return;
                                }
                                
                                // 定义备用CDN地址列表
                                const cdnUrls = [
                                    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
                                    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
                                    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
                                ];
                                
                                // 尝试从第一个CDN加载
                                this.loadScriptFromCdn(cdnUrls, 0, resolve, reject);
                            });
                        },
                        
                        // 从CDN加载脚本，支持备用地址
                        loadScriptFromCdn: function(cdnUrls, index, resolve, reject) {
                            if (index >= cdnUrls.length) {
                                reject(new Error('所有CDN地址都加载失败，请检查网络连接'));
                                return;
                            }
                            
                            // 创建script标签
                            const script = document.createElement('script');
                            script.src = cdnUrls[index];
                            script.async = true;
                            
                            // 加载成功回调
                            script.onload = function() {
                                if (window.html2canvas) {
                                    resolve();
                                } else {
                                    // 移除当前脚本
                                    document.head.removeChild(script);
                                    // 尝试下一个CDN地址
                                    this.loadScriptFromCdn(cdnUrls, index + 1, resolve, reject);
                                }
                            }.bind(this);
                            
                            // 加载失败回调
                            script.onerror = function() {
                                // 移除当前脚本
                                document.head.removeChild(script);
                                // 尝试下一个CDN地址
                                this.loadScriptFromCdn(cdnUrls, index + 1, resolve, reject);
                            }.bind(this);
                            
                            // 添加到文档
                            document.head.appendChild(script);
                        },
                        
                        // 将Canvas保存为图片
                        saveCanvasAsImage: function(canvas) {
                            try {
                                // 创建下载链接
                                const link = document.createElement('a');
                                
                                // 将canvas转换为PNG图片，质量更高
                                const dataURL = canvas.toDataURL('image/png', 1.0); // 1.0表示最高质量
                                
                                // 设置下载链接
                                link.href = dataURL;
                                
                                // 设置文件名，包含当前日期时间
                                const now = new Date();
                                const timestamp = now.toISOString().replace(/[:.]/g, '-');
                                link.download = `screenshot-${timestamp}.png`;
                                
                                // 触发下载
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                // 显示保存成功提示
                                if (this.toast) {
                                    this.toast.info('图片已保存到下载文件夹');
                                } else {
                                    alert('图片已保存到下载文件夹');
                                }
                            } catch (error) {
                                if (this.toast) {
                                    this.toast.error('保存图片失败，请重试');
                                } else {
                                    alert('保存图片失败，请重试');
                                }
                            }
                        }
                    };
                };
            })();
            
            window.menuHandler = new MenuHandler({
                toast: toast,
                logger: logger
            });
            window.menuHandler.init();
        }
        
        // 确保菜单按钮点击事件正常工作
        const menuBtn = document.querySelector('[data-action="toggle-menu"]');
        if (menuBtn) {
            // 移除可能存在的旧事件监听器，避免冲突
            menuBtn.removeEventListener('click', menuBtn._menuClickHandler);
            // 添加新的事件监听器
            menuBtn._menuClickHandler = () => {
                if (window.menuHandler && window.menuHandler.toggleMenu) {
                    window.menuHandler.toggleMenu();
                } else {
                    // 降级实现：直接切换菜单显示状态
                    const menu = document.getElementById('mobileMenu') || document.querySelector('.mobile-menu');
                    if (menu) {
                        menu.classList.toggle('show');
                    }
                }
            };
            menuBtn.addEventListener('click', menuBtn._menuClickHandler);
        }
            } catch (error) {
                // 创建降级实例
                window.attendanceStatusInstance = new AttendanceStatus();
                await window.attendanceStatusInstance.init();
            }
        }
    });
}