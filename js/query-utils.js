// 查询页面专用精简版脚本 - 版本 1.0

// 查询统计页面专用功能
const QueryUtils = {
    // 初始化查询统计页面
    init: async function() {
        console.log('Query utils initialized');
    },
    
    // 统计考勤数据
    calculateAttendanceStatistics: function(attendanceData) {
        if (!attendanceData || attendanceData.length === 0) {
            return {
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                lateDays: 0,
                leaveDays: 0,
                attendanceRate: 0
            };
        }
        
        const totalDays = attendanceData.length;
        const presentDays = attendanceData.filter(item => item.status === 'present').length;
        const absentDays = attendanceData.filter(item => item.status === 'absent').length;
        const lateDays = attendanceData.filter(item => item.status === 'late').length;
        const leaveDays = attendanceData.filter(item => item.status === 'leave').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        return {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            leaveDays,
            attendanceRate
        };
    },
    
    // 按月份分组考勤数据
    groupAttendanceByMonth: function(attendanceData) {
        if (!attendanceData || attendanceData.length === 0) {
            return {};
        }
        
        return attendanceData.reduce((groups, item) => {
            const month = item.date.substring(0, 7); // YYYY-MM
            if (!groups[month]) {
                groups[month] = [];
            }
            groups[month].push(item);
            return groups;
        }, {});
    }
};

// 导出全局对象
window.QueryUtils = QueryUtils;
