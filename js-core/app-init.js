/**
 * 应用初始化模块
 * 提供统一的页面初始化逻辑，避免各页面重复代码
 */

// 条件声明，避免重复定义
if (!window.AppInitializer) {
    class AppInitializer {
        constructor() {
            this.initialized = false;
            this.components = {};
        }

        /**
         * 初始化应用核心组件
         * @returns {Promise<Object>} 初始化后的组件对象
         */
        async init() {
            if (this.initialized) {
                return this.components;
            }

            try {
                // 确保必要的类存在
                const EventBus = window.EventBus || function() { 
                    return { on: () => {}, emit: () => {}, off: () => {}, once: () => {} }; 
                };
                const IntelligentStorageManager = window.IntelligentStorageManager || function() { 
                    return { init: () => Promise.resolve(), setLocal: () => {}, getLocal: () => null }; 
                };
                const ThemeManager = window.ThemeManager || function() { 
                    return { init: () => {}, applyTheme: () => {}, toggleTheme: () => {} }; 
                };
                const Toast = window.Toast || function() { 
                    return { init: () => {}, error: () => {}, info: () => {}, success: () => {} }; 
                };
                const Dialog = window.Dialog || function() { 
                    return { init: () => {}, show: () => {}, hide: () => {} }; 
                };
                const Logger = window.Logger || { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };
                const loginIconManager = window.loginIconManager || { init: () => {} };

                // 初始化核心组件
                const eventBus = new EventBus();
                const storage = new IntelligentStorageManager();

                // 初始化存储
                try {
                    await storage.init();
                } catch (storageError) {
                    console.warn('存储初始化失败，使用默认实现:', storageError.message);
                }

                // 等待或创建主题实例
                let theme = await this.waitForThemeManager();
                if (!theme) {
                    if (window.themeManager) {
                        theme = window.themeManager;
                    } else {
                        theme = new ThemeManager(storage, eventBus);
                        window.themeManager = theme;
                        theme.init();
                    }
                }

                // 初始化其他组件
                const toast = new Toast(eventBus);
                const dialog = new Dialog(eventBus);

                try {
                    loginIconManager.init();
                    toast.init();
                    dialog.init();
                } catch (initError) {
                    console.warn('组件初始化失败，继续执行:', initError.message);
                }

                // 保存组件引用
                this.components = {
                    eventBus,
                    storage,
                    theme,
                    toast,
                    dialog,
                    logger: Logger,
                    loginIconManager
                };

                this.initialized = true;
                
                return this.components;
            } catch (error) {
                console.error('初始化应用过程中出现错误:', error);
                throw error;
            }
        }

        /**
         * 等待全局主题实例初始化完成
         * @returns {Promise<Object|null>} 主题实例或null
         */
        waitForThemeManager() {
            return new Promise((resolve) => {
                if (window.themeManager) {
                    resolve(window.themeManager);
                    return;
                }
                
                let checkCount = 0;
                const maxChecks = 10;
                const checkInterval = 50;

                function check() {
                    checkCount++;
                    if (window.themeManager) {
                        resolve(window.themeManager);
                    } else if (checkCount >= maxChecks) {
                        resolve(null);
                    } else {
                        setTimeout(check, checkInterval);
                    }
                }

                check();
            });
        }

        /**
         * 获取已初始化的组件
         * @returns {Object} 组件对象
         */
        getComponents() {
            return this.components;
        }

        /**
         * 检查是否已初始化
         * @returns {boolean} 是否已初始化
         */
        isInitialized() {
            return this.initialized;
        }
    }

    // 创建全局单例实例
    window.AppInitializer = AppInitializer;
    window.appInitializer = new AppInitializer();
}
