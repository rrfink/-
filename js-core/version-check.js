/**
 * 版本检查模块
 * 用于检查应用版本号，并在版本更新时清除缓存
 */

class VersionChecker {
    constructor(options = {}) {
        this.storage = options.storage;
        this.toast = options.toast;
        this.logger = options.logger || console;
        this.apiEndpoint = options.apiEndpoint || '/jg/api/app-version.php';
    }

    /**
     * 检查应用版本号
     * @returns {Promise<boolean>} 是否需要刷新页面
     */
    async check() {
        try {
            const response = await fetch(this.apiEndpoint);
            const result = await response.json();
            
            if (result.success && result.version) {
                const currentVersion = result.version;
                const storedVersion = localStorage.getItem('app_version');
                
                // 如果版本号不一致，说明有更新
                if (storedVersion && storedVersion !== currentVersion) {
                    this.logger.info(`检测到新版本: ${storedVersion} -> ${currentVersion}`);
                    
                    // 清除缓存
                    await this.clearCache();
                    
                    // 更新版本号
                    localStorage.setItem('app_version', currentVersion);
                    
                    // 提示用户刷新页面
                    if (this.toast) {
                        this.toast.info('应用已更新，正在刷新页面...');
                    }
                    
                    // 延迟刷新页面
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                    
                    return true;
                } else if (!storedVersion) {
                    // 首次访问，保存版本号
                    localStorage.setItem('app_version', currentVersion);
                }
            }
            
            return false;
        } catch (error) {
            this.logger.error('检查应用版本失败:', error);
            return false;
        }
    }

    /**
     * 清除缓存
     */
    async clearCache() {
        try {
            // 清除localStorage中的缓存数据（保留登录状态、版本号和用户数据）
            const loginData = {
                user_id: localStorage.getItem('user_id'),
                login_time: localStorage.getItem('login_time'),
                username: localStorage.getItem('username'),
                user_email: localStorage.getItem('user_email'),
                app_version: localStorage.getItem('app_version')
            };
            
            // 保存用户数据（不清除）
            const userData = {
                attendance: localStorage.getItem('attendance'),
                wageHistory: localStorage.getItem('wageHistory'),
                personalInfo: localStorage.getItem('personalInfo'),
                holidays: localStorage.getItem('holidays'),
                contacts: localStorage.getItem('contacts'),
                projects: localStorage.getItem('projects'),
                currentProjectId: localStorage.getItem('currentProjectId'),
                cachedContacts: localStorage.getItem('cachedContacts'),
                cachedProjects: localStorage.getItem('cachedProjects')
            };
            
            // 保存所有项目相关的个人信息（personalInfo_开头的key）
            const personalInfoKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('personalInfo_')) {
                    personalInfoKeys.push({
                        key: key,
                        value: localStorage.getItem(key)
                    });
                }
            }
            
            // 清除IndexedDB
            if (this.storage && this.storage.clearAll) {
                await this.storage.clearAll();
            }
            
            // 清除localStorage中的缓存数据，然后恢复必要的数据
            localStorage.clear();
            
            // 恢复登录数据
            if (loginData.user_id) localStorage.setItem('user_id', loginData.user_id);
            if (loginData.login_time) localStorage.setItem('login_time', loginData.login_time);
            if (loginData.username) localStorage.setItem('username', loginData.username);
            if (loginData.user_email) localStorage.setItem('user_email', loginData.user_email);
            if (loginData.app_version) localStorage.setItem('app_version', loginData.app_version);
            
            // 恢复用户数据
            if (userData.attendance) localStorage.setItem('attendance', userData.attendance);
            if (userData.wageHistory) localStorage.setItem('wageHistory', userData.wageHistory);
            if (userData.personalInfo) localStorage.setItem('personalInfo', userData.personalInfo);
            if (userData.holidays) localStorage.setItem('holidays', userData.holidays);
            if (userData.contacts) localStorage.setItem('contacts', userData.contacts);
            if (userData.projects) localStorage.setItem('projects', userData.projects);
            if (userData.currentProjectId) localStorage.setItem('currentProjectId', userData.currentProjectId);
            if (userData.cachedContacts) localStorage.setItem('cachedContacts', userData.cachedContacts);
            if (userData.cachedProjects) localStorage.setItem('cachedProjects', userData.cachedProjects);
            
            // 恢复所有项目相关的个人信息
            personalInfoKeys.forEach(item => {
                localStorage.setItem(item.key, item.value);
            });
            
            this.logger.info('缓存已清除，用户数据已保留');
        } catch (error) {
            this.logger.error('清除缓存失败:', error);
        }
    }

    /**
     * 获取当前版本号
     * @returns {Promise<string|null>} 版本号
     */
    async getCurrentVersion() {
        try {
            const response = await fetch(this.apiEndpoint);
            const result = await response.json();
            return result.success ? result.version : null;
        } catch (error) {
            this.logger.error('获取当前版本号失败:', error);
            return null;
        }
    }

    /**
     * 获取本地存储的版本号
     * @returns {string|null} 版本号
     */
    getStoredVersion() {
        return localStorage.getItem('app_version');
    }
}

// 导出为全局变量
if (!window.VersionChecker) {
    window.VersionChecker = VersionChecker;
}