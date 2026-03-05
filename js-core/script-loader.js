/**
 * 脚本加载模块
 * 提供统一的脚本加载功能，避免各页面重复定义 loadScript 函数
 */

// 条件声明，避免重复定义
if (!window.ScriptLoader) {
    class ScriptLoader {
        constructor() {
            this.loadedScripts = new Set();
            this.loadingPromises = new Map();
        }

        /**
         * 加载单个脚本
         * @param {string} src - 脚本URL
         * @param {boolean} useCache - 是否使用缓存
         * @returns {Promise} 加载完成的Promise
         */
        load(src, useCache = false) {
            // 如果已经加载过，直接返回
            if (this.loadedScripts.has(src)) {
                return Promise.resolve();
            }

            // 如果正在加载中，返回现有的Promise
            if (this.loadingPromises.has(src)) {
                return this.loadingPromises.get(src);
            }

            // 创建新的加载Promise
            const promise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = useCache ? src : `${src}?v=${Date.now()}`;
                script.async = true;
                
                script.onload = () => {
                    this.loadedScripts.add(src);
                    this.loadingPromises.delete(src);
                    resolve();
                };
                
                script.onerror = () => {
                    this.loadingPromises.delete(src);
                    reject(new Error(`Failed to load script: ${src}`));
                };
                
                document.head.appendChild(script);
            });

            this.loadingPromises.set(src, promise);
            return promise;
        }

        /**
         * 并行加载多个脚本
         * @param {Array<string>} sources - 脚本URL数组
         * @param {boolean} useCache - 是否使用缓存
         * @returns {Promise} 所有脚本加载完成的Promise
         */
        loadAll(sources, useCache = false) {
            return Promise.all(sources.map(src => this.load(src, useCache)));
        }

        /**
         * 检查脚本是否已加载
         * @param {string} src - 脚本URL
         * @returns {boolean} 是否已加载
         */
        isLoaded(src) {
            return this.loadedScripts.has(src);
        }

        /**
         * 获取已加载的脚本列表
         * @returns {Array<string>} 已加载的脚本URL数组
         */
        getLoadedScripts() {
            return Array.from(this.loadedScripts);
        }
    }

    // 创建全局单例实例
    window.ScriptLoader = ScriptLoader;
    window.scriptLoader = new ScriptLoader();
}
