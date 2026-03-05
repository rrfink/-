// 电话本专用工具脚本 - 版本 1.0

// 电话簿专用工具函数
const PhonebookUtils = {
    // 格式化电话号码
    formatPhone: function(phone) {
        if (!phone) return '';
        // 移除所有非数字字符
        const cleaned = phone.replace(/\D/g, '');
        // 简单的电话号码格式化
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
        }
        return phone;
    },
    
    // 验证电话号码
    validatePhone: function(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, '');
        // 验证中国大陆手机号
        return /^1[3-9]\d{9}$/.test(cleaned);
    },
    
    // 生成联系人ID
    generateContactId: function() {
        return 'contact_' + Date.now() + Math.random().toString(36).substr(2, 9);
    },
    
    // 按姓名排序联系人
    sortContactsByName: function(contacts) {
        if (!contacts || !Array.isArray(contacts)) return [];
        return contacts.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, 'zh-CN');
        });
    },
    
    // 按项目分组联系人
    groupContactsByProject: function(contacts, projects) {
        if (!contacts || !Array.isArray(contacts)) return {};
        
        const grouped = {};
        
        contacts.forEach(contact => {
            const projectId = contact.projectId || '未分组';
            if (!grouped[projectId]) {
                grouped[projectId] = [];
            }
            grouped[projectId].push(contact);
        });
        
        return grouped;
    },
    
    // 获取项目名称
    getProjectName: function(projectId, projects) {
        if (!projectId) return '未分组';
        const project = projects.find(p => p.id === projectId);
        return project ? project.name : '未知项目';
    }
};

// 导出电话簿专用工具
window.PhonebookUtils = PhonebookUtils;