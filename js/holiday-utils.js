// 节日管理页面专用精简版脚本 - 版本 1.0

// 节日管理专用工具函数
const HolidayUtils = {
    // 检查是否为节日
    isHoliday: function(date, holidays) {
        const formattedDate = Utils.formatDate(date, 'YYYY-MM-DD');
        return holidays.some(holiday => holiday.date === formattedDate);
    },
    
    // 获取节日名称
    getHolidayName: function(date, holidays) {
        const formattedDate = Utils.formatDate(date, 'YYYY-MM-DD');
        const holiday = holidays.find(holiday => holiday.date === formattedDate);
        return holiday ? holiday.name : '';
    },
    
    // 生成节日数据
    generateHolidayData: function(name, date, type = 'holiday') {
        return {
            id: Utils.generateId(),
            name: name,
            date: Utils.formatDate(date, 'YYYY-MM-DD'),
            type: type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
};

// 导出节日管理专用工具函数
window.HolidayUtils = HolidayUtils;