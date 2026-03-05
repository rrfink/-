// 每周考勤报告模块
class WeeklyReportGenerator {
    constructor(storage, toast, eventBus) {
        this.storage = storage;
        this.toast = toast;
        this.eventBus = eventBus;
        this.checkInterval = null;
    }
    
    // 初始化
    init() {
        // 立即检查一次是否需要发送报告
        this.checkAndSendReport();
        
        // 每天检查一次是否需要发送报告
        this.scheduleDailyCheck();
    }
    
    // 安排每日检查
    scheduleDailyCheck() {
        // 每天晚上8点检查
        const now = new Date();
        const nextCheck = new Date(now);
        nextCheck.setHours(20, 0, 0, 0);
        
        if (nextCheck <= now) {
            // 如果今天的检查时间已过，设置为明天
            nextCheck.setDate(nextCheck.getDate() + 1);
        }
        
        const timeUntilNextCheck = nextCheck - now;
        
        setTimeout(() => {
            // 执行检查
            this.checkAndSendReport();
            
            // 之后每天检查一次
            this.checkInterval = setInterval(() => {
                this.checkAndSendReport();
            }, 24 * 60 * 60 * 1000); // 24小时
        }, timeUntilNextCheck);
    }
    
    // 检查并发送报告
    async checkAndSendReport() {
        try {
            // 获取用户的通知设置
            const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
            
            // 如果用户关闭了每周报告，则不发送
            if (notificationSettings.weeklyReport === false) {
                return;
            }
            
            // 检查今天是否是周日
            const today = new Date();
            if (today.getDay() !== 0) {
                return;
            }
            
            // 检查今天是否已经发送过报告
            const lastReportDate = localStorage.getItem('lastWeeklyReportDate');
            const todayStr = Utils.formatDate(today, 'YYYY-MM-DD');
            if (lastReportDate === todayStr) {
                return;
            }
            
            // 生成并发送报告
            await this.generateAndSendReport();
            
        } catch (error) {
            console.error('检查并发送每周报告失败:', error);
        }
    }
    
    // 生成并发送报告
    async generateAndSendReport() {
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
            
            // 清理projectId格式
            const currentProjectIdClean = String(currentProjectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
            const projectAttendance = attendanceRecords.filter(record => {
                const recordProjectId = String(record.projectId).replace(/^"|"$/g, '').replace(/\\"/g, '"');
                return recordProjectId === currentProjectIdClean;
            });
            
            // 获取本周的日期范围
            const { startDate, endDate } = this.getThisWeekRange();
            
            // 过滤出本周的考勤记录
            const weekAttendance = projectAttendance.filter(record => {
                return record.date >= startDate && record.date <= endDate;
            });
            
            // 统计数据
            const stats = this.calculateStats(weekAttendance);
            
            // 生成报告消息
            const reportData = this.generateReportData(startDate, endDate, stats);
            
            // 显示横条通知
            this.showBannerNotification(reportData);
            
            // 记录已发送
            const today = new Date();
            const todayStr = Utils.formatDate(today, 'YYYY-MM-DD');
            localStorage.setItem('lastWeeklyReportDate', todayStr);
            
        } catch (error) {
            console.error('生成并发送每周报告失败:', error);
        }
    }
    
    // 获取本周的日期范围
    getThisWeekRange() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        // 计算本周一的日期
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);
        
        // 计算本周日的日期
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        
        return {
            startDate: Utils.formatDate(monday, 'YYYY-MM-DD'),
            endDate: Utils.formatDate(sunday, 'YYYY-MM-DD')
        };
    }
    
    // 计算统计数据
    calculateStats(attendanceRecords) {
        const stats = {
            normalDays: 0,
            lateDays: 0,
            earlyLeaveDays: 0,
            absentDays: 0,
            halfDays: 0,
            totalHours: 0,
            totalDays: 0
        };
        
        attendanceRecords.forEach(record => {
            stats.totalDays++;
            
            switch (record.status) {
                case 'present':
                    stats.normalDays++;
                    break;
                case 'late':
                    stats.lateDays++;
                    break;
                case 'early_leave':
                    stats.earlyLeaveDays++;
                    break;
                case 'absent':
                    stats.absentDays++;
                    break;
                case 'half':
                    stats.halfDays++;
                    break;
                case 'holiday':
                case 'rest':
                case 'leave':
                    // 不计入统计
                    break;
            }
            
            // 计算工时
            if (record.workHours) {
                stats.totalHours += parseFloat(record.workHours) || 0;
            }
        });
        
        return stats;
    }
    
    // 生成报告消息
    generateReportMessage(startDate, endDate, stats) {
        const lines = [
            '📊 每周考勤报告',
            `📅 时间：${startDate} 至 ${endDate}`,
            '',
            `✅ 正常出勤：${stats.normalDays} 天`,
            stats.halfDays > 0 ? `⏰ 半天出勤：${stats.halfDays} 天` : '',
            stats.lateDays > 0 ? `⚠️ 迟到：${stats.lateDays} 次` : '',
            stats.earlyLeaveDays > 0 ? `🚪 早退：${stats.earlyLeaveDays} 次` : '',
            stats.absentDays > 0 ? `❌ 缺勤：${stats.absentDays} 天` : '',
            '',
            `⏱️ 累计工时：${stats.totalHours.toFixed(1)} 小时`,
            `📝 考勤天数：${stats.totalDays} 天`
        ].filter(line => line !== '');
        
        return lines.join('\n');
    }
    
    // 生成报告数据
    generateReportData(startDate, endDate, stats) {
        return {
            title: '每周考勤报告',
            dateRange: `${startDate} 至 ${endDate}`,
            stats: {
                normalDays: stats.normalDays,
                halfDays: stats.halfDays,
                lateDays: stats.lateDays,
                earlyLeaveDays: stats.earlyLeaveDays,
                absentDays: stats.absentDays,
                totalHours: stats.totalHours.toFixed(1),
                totalDays: stats.totalDays
            }
        };
    }
    
    // 显示横条通知
    showBannerNotification(reportData) {
        // 移除旧的通知
        const oldBanner = document.getElementById('weeklyReportBanner');
        if (oldBanner) {
            oldBanner.remove();
        }
        
        // 创建横条
        const banner = document.createElement('div');
        banner.id = 'weeklyReportBanner';
        banner.className = 'weekly-report-banner';
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-text">
                    <div class="banner-title">
                        <span class="banner-icon">📊</span>
                        ${reportData.title}
                    </div>
                    <div class="banner-date">${reportData.dateRange}</div>
                    <div class="banner-stats">
                        <span class="stat-item">✅ ${reportData.stats.normalDays}天</span>
                        ${reportData.stats.lateDays > 0 ? `<span class="stat-item warning">⚠️ ${reportData.stats.lateDays}次</span>` : ''}
                        ${reportData.stats.earlyLeaveDays > 0 ? `<span class="stat-item warning">🚪 ${reportData.stats.earlyLeaveDays}次</span>` : ''}
                        ${reportData.stats.absentDays > 0 ? `<span class="stat-item error">❌ ${reportData.stats.absentDays}天</span>` : ''}
                        <span class="stat-item">⏱️ ${reportData.stats.totalHours}h</span>
                    </div>
                </div>
                <button class="banner-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .weekly-report-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #FFB800;
                color: white;
                padding: 8px 16px;
                z-index: 9999;
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .banner-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .banner-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-right: 6px;
            }
            
            .banner-text {
                flex: 1;
                min-width: 0;
                text-align: center;
            }
            
            .banner-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 2px;
            }
            
            .banner-date {
                font-size: 12px;
                opacity: 0.95;
                margin-bottom: 4px;
            }
            
            .banner-stats {
                display: flex;
                gap: 8px;
                font-size: 12px;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .stat-item {
                background: rgba(255, 255, 255, 0.25);
                padding: 3px 8px;
                border-radius: 10px;
                white-space: nowrap;
            }
            
            .stat-item.warning {
                background: rgba(255, 255, 255, 0.35);
            }
            
            .stat-item.error {
                background: rgba(255, 255, 255, 0.4);
            }
            
            .banner-close {
                background: rgba(255, 255, 255, 0.25);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .banner-close:hover {
                background: rgba(255, 255, 255, 0.4);
                transform: scale(1.1);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(banner);
    }
    
    // 手动触发报告生成
    async triggerReport() {
        await this.generateAndSendReport();
    }
    
    // 测试显示横条（用于开发测试）
    testBanner() {
        const testData = {
            title: '每周考勤报告（测试）',
            dateRange: '2026-02-17 至 2026-02-23',
            stats: {
                normalDays: 5,
                halfDays: 0,
                lateDays: 1,
                earlyLeaveDays: 0,
                absentDays: 1,
                totalHours: 40.5,
                totalDays: 7
            }
        };
        this.showBannerNotification(testData);
    }
}

// 导出模块
window.WeeklyReportGenerator = WeeklyReportGenerator;

// 暴露测试方法到全局（用于开发测试）
window.testWeeklyReportBanner = function() {
    if (window.weeklyReportInstance) {
        window.weeklyReportInstance.testBanner();
    }
};
