// 考勤状态页面专用精简版脚本 - 版本 1.0

// 考勤状态页面专用功能
const AttendanceUtils = {
    // 初始化考勤状态页面
    init: async function() {
        console.log('Attendance utils initialized');
    },
    
    // 计算考勤统计数据
    calculateAttendanceStats: function(attendanceData) {
        if (!attendanceData || attendanceData.length === 0) {
            return {
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                leave: 0,
                percentage: 0
            };
        }
        
        const total = attendanceData.length;
        const present = attendanceData.filter(item => item.status === 'present').length;
        const absent = attendanceData.filter(item => item.status === 'absent').length;
        const late = attendanceData.filter(item => item.status === 'late').length;
        const leave = attendanceData.filter(item => item.status === 'leave').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        return {
            total,
            present,
            absent,
            late,
            leave,
            percentage
        };
    },
    
    // 检查是否为工作日
    isWorkday: function(date, holidays) {
        const day = new Date(date).getDay();
        // 周六周日
        if (day === 0 || day === 6) {
            return false;
        }
        
        // 检查是否为节假日
        if (holidays && holidays.length > 0) {
            const dateStr = window.Utils.formatDate(date, 'YYYY-MM-DD');
            return !holidays.some(holiday => holiday.date === dateStr && holiday.isHoliday);
        }
        
        return true;
    }
};

// 导出全局对象
window.AttendanceUtils = AttendanceUtils;