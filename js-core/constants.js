const Constants = {
    THEME: {
        LIGHT: 'light',
        DARK: 'dark'
    },

    ATTENDANCE: {
        PRESENT: 'present',
        HALF_DAY: 'half',
        ABSENT: 'absent',
        HOLIDAY: 'holiday',
        OVERTIME: 'overtime'
    },

    ATTENDANCE_LABELS: {
        present: '满勤',
        half: '半天',
        absent: '缺勤',
        holiday: '节假日',
        overtime: '加班'
    },

    TOAST_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    STORAGE_KEYS: {
        THEME: 'theme',
        USER_ID: 'userId',
        USER_EMAIL: 'userEmail',

        SYNC_STATUS: 'syncStatus',
        LAST_SYNC_TIME: 'lastSyncTime',
        CLOUD_DATA_SIZE: 'cloudDataSize',
        AUTO_SYNC: 'autoSync'
    },

    ERROR_MESSAGES: {
        NETWORK_ERROR: '网络连接失败，请检查网络设置',
        STORAGE_ERROR: '数据存储失败',
        AUTH_ERROR: '认证失败，请重新登录',
        VALIDATION_ERROR: '数据验证失败',
        UNKNOWN_ERROR: '未知错误，请稍后重试',
        PROJECT_NOT_FOUND: '项目不存在',
        CONTACT_NOT_FOUND: '联系人不存在',
        INVALID_PHONE: '请输入有效的手机号码',
        INVALID_EMAIL: '请输入有效的邮箱地址'
    },

    EXPORT_FORMATS: {
        JSON: 'json',
        EXCEL: 'excel',
        PDF: 'pdf'
    }
};

// 添加全局引用
window.Constants = Constants;