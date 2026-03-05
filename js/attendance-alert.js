// 考勤异常检测和提醒模块
class AttendanceAlert {
    constructor(storage, toast, eventBus) {
        this.storage = storage;
        this.toast = toast;
        this.eventBus = eventBus;
        this.checkInterval = null;
    }
    
    // 初始化考勤异常检测
    init() {
        // 每天检查一次异常
        this.scheduleDailyCheck();
    }
    
    // 安排每日检查
    scheduleDailyCheck() {
        // 计算下一次检查时间（每天早上8点）
        const now = new Date();
        const nextCheck = new Date(now);
        nextCheck.setHours(8, 0, 0, 0);
        
        if (nextCheck <= now) {
            // 如果今天的检查时间已过，设置为明天
            nextCheck.setDate(nextCheck.getDate() + 1);
        }
        
        const timeUntilNextCheck = nextCheck - now;
        
        setTimeout(() => {
            // 执行检查
            this.checkAttendanceAnomalies();
            
            // 之后每天检查一次
            this.checkInterval = setInterval(() => {
                this.checkAttendanceAnomalies();
            }, 24 * 60 * 60 * 1000); // 24小时
        }, timeUntilNextCheck);
    }
    
    // 检查考勤异常
    async checkAttendanceAnomalies() {
        try {
            // 获取当前项目ID
            const currentProjectId = this.storage.getLocal('currentProjectId');
            if (!currentProjectId) {
                return;
            }
            
            // 获取考勤数据
            const attendanceRecords = await this.storage.getAll('attendance');
            if (!attendanceRecords || attendanceRecords.length === 0) {
                return;
            }
            
            // 过滤出当前项目的考勤记录
            const projectAttendance = attendanceRecords.filter(record => {
                const recordProjectId = String(record.projectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
                const currentProjectIdClean = String(currentProjectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
                return recordProjectId === currentProjectIdClean;
            });
            
            if (projectAttendance.length === 0) {
                return;
            }
            
            // 检查最近7天的考勤
            const anomalies = this.detectAnomalies(projectAttendance);
            
            if (anomalies.length > 0) {
                this.notifyAnomalies(anomalies);
            }
            
        } catch (error) {
            console.error('检查考勤异常失败:', error);
        }
    }
    
    // 检测异常
    detectAnomalies(attendanceRecords) {
        const anomalies = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 检查到今天，包括今天
        for (let i = 1; i <= 31; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i + 1);
            const dateStr = Utils.formatDate(checkDate, 'YYYY-MM-DD');
            
            const dayRecord = attendanceRecords.find(record => record.date === dateStr);
            
            if (!dayRecord) {
                anomalies.push({
                    date: dateStr,
                    type: 'absent',
                    message: `未打卡：${dateStr} 无考勤记录`
                });
            } else {
                const status = dayRecord.status;
                
                if (status === 'holiday' || status === 'rest' || status === 'leave' || status === 'absent') {
                    continue;
                }
                
                if (status === 'present' || status === 'half') {
                    if (dayRecord.checkIn) {
                        const checkInTime = dayRecord.checkIn;
                        if (this.isLate(checkInTime)) {
                            anomalies.push({
                                date: dateStr,
                                type: 'late',
                                message: `迟到：${dateStr} 打卡时间 ${checkInTime}`
                            });
                        }
                    }
                    
                    if (dayRecord.checkOut) {
                        const checkOutTime = dayRecord.checkOut;
                        if (this.isEarlyLeave(checkOutTime)) {
                            anomalies.push({
                                date: dateStr,
                                type: 'early_leave',
                                message: `早退：${dateStr} 打卡时间 ${checkOutTime}`
                            });
                        }
                    }
                }
            }
        }
        
        return anomalies;
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
    
    // 判断是否迟到
    isLate(checkInTime) {
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
        
        // 转换时间为分钟数
        const checkInMinutes = this.timeToMinutes(checkInTime);
        const morningStartMinutes = this.timeToMinutes(morningStart);
        
        // 计算迟到时间阈值
        const lateThresholdMinutes = morningStartMinutes + lateThreshold;
        
        // 判断是否迟到
        return checkInMinutes > lateThresholdMinutes;
    }
    
    // 判断是否早退
    isEarlyLeave(checkOutTime) {
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
    }
    
    // 将时间字符串转换为分钟数
    timeToMinutes(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        return hours * 60 + minutes;
    }
    
    // 通知异常
    notifyAnomalies(anomalies) {
        if (anomalies.length === 0) return;
        
        // 获取用户的通知设置
        const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        
        // 检查考勤提醒总开关（默认关闭）
        if (notificationSettings.attendanceReminder !== true) {
            return;
        }
        
        // 只显示今天的异常
        const today = new Date();
        const todayStr = Utils.formatDate(today, 'YYYY-MM-DD');
        const todayAnomalies = anomalies.filter(a => a.date === todayStr);
        
        if (todayAnomalies.length === 0) {
            return;
        }
        
        // 过滤出用户允许的异常类型
        const filteredAnomalies = todayAnomalies.filter(anomaly => {
            switch (anomaly.type) {
                case 'late':
                    return notificationSettings.lateNotification !== false;
                case 'absent':
                    return notificationSettings.absentNotification !== false;
                case 'early_leave':
                    return notificationSettings.attendanceReminder !== false;
                default:
                    return notificationSettings.attendanceReminder !== false;
            }
        });
        
        if (filteredAnomalies.length === 0) {
            return;
        }
        
        // 显示通知
        const message = `今天有 ${filteredAnomalies.length} 条考勤异常：\n` + 
            filteredAnomalies.map(a => `- ${a.message}`).join('\n');
        
        this.toast.warning(message, 5000);
        
        // 存储异常记录
        localStorage.setItem('attendanceAnomalies', JSON.stringify(anomalies));
    }
    
    // 手动触发异常检查
    async triggerCheck() {
        await this.checkAttendanceAnomalies();
    }
    
    // 获取异常记录
    getAnomalies() {
        try {
            const anomalies = localStorage.getItem('attendanceAnomalies');
            return anomalies ? JSON.parse(anomalies) : [];
        } catch (error) {
            console.error('获取异常记录失败:', error);
            return [];
        }
    }
    
    // 清除异常记录
    clearAnomalies() {
        localStorage.removeItem('attendanceAnomalies');
    }
}

// 导出模块
window.AttendanceAlert = AttendanceAlert;