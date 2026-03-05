// 项目管理页面专用精简版脚本 - 版本 1.0

// 项目管理页面专用功能
const ProjectUtils = {
    // 初始化项目管理页面
    init: async function() {
        console.log('Project utils initialized');
    },
    
    // 验证项目数据
    validateProjectData: function(projectData) {
        if (!projectData || !projectData.name) {
            return { valid: false, message: '项目名称不能为空' };
        }
        
        if (projectData.name.length > 50) {
            return { valid: false, message: '项目名称不能超过50个字符' };
        }
        
        return { valid: true };
    },
    
    // 生成项目ID
    generateProjectId: function() {
        return 'project_' + Date.now() + Math.random().toString(36).substr(2, 9);
    }
};

// 导出全局对象
window.ProjectUtils = ProjectUtils;