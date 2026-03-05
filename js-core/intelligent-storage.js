// 智能存储管理类，根据登录状态自动切换存储方式
// 如果 DebounceThrottle 未定义，提供默认实现
if (!window.DebounceThrottle) {
    window.DebounceThrottle = {
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        throttle: function(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };
}

if (!window.IntelligentStorageManager) {
    class IntelligentStorageManager {
        constructor() {
            this.localStorage = null;
            this.apiBaseUrl = '/jg/api';
            this.isLoggedIn = false;
            this.userId = null;
            this.userStatusCheckInterval = null;
            
            // 网络请求配置
            this.networkConfig = {
                // 不同类型请求的超时时间（毫秒）
                timeouts: {
                    default: 10000, // 默认10秒
                    data: 15000,     // 数据请求15秒
                    auth: 5000,      // 认证请求5秒
                    sync: 30000      // 同步请求30秒
                },
                // 重试策略
                retry: {
                    maxAttempts: 3,     // 最大重试次数
                    baseDelay: 1000,    // 基础重试延迟（毫秒）
                    maxDelay: 10000,    // 最大重试延迟（毫秒）
                    // 可重试的错误状态码
                    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
                },
                // 请求优先级
                priority: {
                    high: 0,    // 高优先级
                    normal: 1,  // 正常优先级
                    low: 2      // 低优先级
                }
            };
            
            // 内存缓存，减少重复请求
            this.memoryCache = new Map();
            this.cacheExpiry = 10 * 60 * 1000; // 缓存过期时间（10分钟）
            
            // 正在进行的请求映射，用于请求合并和去重
            this.pendingRequests = new Map();
            
            // 请求队列，用于管理高优先级请求
            this.requestQueue = [];
            this.isProcessingQueue = false;
            
            // 预加载配置
            this.preloadConfig = {
                enabled: true,
                // 需要预加载的数据类型
                dataTypes: [
                    { type: 'projects', priority: 'high' },
                    { type: 'attendance', priority: 'high' },
                    { type: 'userSettings', priority: 'medium' },
                    { type: 'holidays', priority: 'medium' },
                    { type: 'contacts', priority: 'low' }
                ],
                // 预加载间隔（毫秒）
                interval: 2000,
                // 预加载状态
                loaded: new Set()
            };
            
            // 预加载定时器
            this.preloadTimer = null;
            
            // 网络状态相关
            this.networkStatus = {
                online: navigator.onLine,
                lastChecked: Date.now(),
                // 网络状态变化回调
                listeners: []
            };
            
            // 错误处理配置
            this.errorConfig = {
                // 错误分类
                categories: {
                    network: ['NetworkError', 'timeout', 'Failed to fetch', 'Connection refused'],
                    auth: ['Unauthorized', '401', '403'],
                    server: ['500', '502', '503', '504'],
                    client: ['400', '404'],
                    data: ['JSON', 'Parse error', 'Invalid data']
                },
                // 错误处理策略
                strategies: {
                    network: { retry: true, fallback: true },
                    auth: { retry: false, fallback: false, redirect: '/jg/html-new/login.php' },
                    server: { retry: true, fallback: true },
                    client: { retry: false, fallback: false },
                    data: { retry: false, fallback: true }
                }
            };
            
            // 初始化防抖函数，用于优化localStorage操作
            this.debouncedSetLocal = window.DebounceThrottle ? window.DebounceThrottle.debounce(this.setLocal.bind(this), 300) : this.setLocal.bind(this);
            
            // 注册网络状态变化监听
            this.registerNetworkListeners();
        }

        // 获取请求超时时间
        getRequestTimeout(requestType = 'default') {
            return this.networkConfig.timeouts[requestType] || this.networkConfig.timeouts.default;
        }

        // 数据压缩方法
        async compressData(data) {
            try {
                // 检查浏览器是否支持CompressionStream API
                if (typeof CompressionStream !== 'undefined') {
                    const stream = new Blob([JSON.stringify(data)]).stream();
                    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
                    const reader = compressedStream.getReader();
                    const chunks = [];
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                    }
                    
                    const compressedBlob = new Blob(chunks);
                    const compressedArrayBuffer = await compressedBlob.arrayBuffer();
                    
                    // 将ArrayBuffer转换为Base64字符串
                    return btoa(String.fromCharCode(...new Uint8Array(compressedArrayBuffer)));
                } else {
                    // 浏览器不支持CompressionStream API，返回原始数据
                    console.warn('CompressionStream API not supported, sending uncompressed data');
                    return JSON.stringify(data);
                }
            } catch (error) {
                console.error('Error compressing data:', error);
                // 压缩失败时返回原始数据
                return JSON.stringify(data);
            }
        }

        // 数据解压方法
        async decompressData(compressedData) {
            try {
                // 检查是否是Base64编码的压缩数据
                if (typeof compressedData === 'string' && compressedData.length > 0) {
                    // 检查是否是压缩数据（简单判断：非JSON格式且长度较短）
                    try {
                        // 尝试解析为JSON，如果成功则不是压缩数据
                        JSON.parse(compressedData);
                        return compressedData;
                    } catch (e) {
                        // 不是JSON，可能是压缩数据
                        if (typeof DecompressionStream !== 'undefined') {
                            // 解码Base64字符串为ArrayBuffer
                            const binaryString = atob(compressedData);
                            const length = binaryString.length;
                            const bytes = new Uint8Array(length);
                            for (let i = 0; i < length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            const stream = new Blob([bytes]).stream();
                            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
                            const reader = decompressedStream.getReader();
                            const chunks = [];
                            
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                chunks.push(value);
                            }
                            
                            const decompressedBlob = new Blob(chunks);
                            return await decompressedBlob.text();
                        } else {
                            // 浏览器不支持DecompressionStream API
                            console.warn('DecompressionStream API not supported, returning original data');
                            return compressedData;
                        }
                    }
                }
                return compressedData;
            } catch (error) {
                console.error('Error decompressing data:', error);
                // 解压失败时返回原始数据
                return compressedData;
            }
        }

        // 启动预加载
        startPreloading() {
            if (!this.preloadConfig.enabled) return;
            
            // 检查是否已经启动了预加载定时器
            if (this.preloadTimer) {
                return;
            }
            

            
            // 立即执行一次预加载
            this.performPreloading();
            
            // 设置预加载定时器
            this.preloadTimer = setInterval(() => {
                this.performPreloading();
            }, this.preloadConfig.interval);
        }

        // 执行预加载
        async performPreloading() {
            if (!this.isLoggedIn || !this.preloadConfig.enabled) return;
            
            // 检查是否已经预加载过所有数据类型
            if (this.preloadConfig.loaded.size >= this.preloadConfig.dataTypes.length) {
                return;
            }
            

            
            // 按优先级排序预加载数据类型
            const sortedDataTypes = [...this.preloadConfig.dataTypes].sort((a, b) => {
                const priorityA = this.networkConfig.priority[a.priority] || this.networkConfig.priority.normal;
                const priorityB = this.networkConfig.priority[b.priority] || this.networkConfig.priority.normal;
                return priorityA - priorityB;
            });
            
            // 执行预加载
            for (const dataType of sortedDataTypes) {
                // 检查是否已经预加载过
                if (this.preloadConfig.loaded.has(dataType.type)) {
                    continue;
                }
                
                try {
                    // 使用低优先级请求进行预加载
                    await this.getAll(dataType.type);
                    // 标记为已预加载
                    this.preloadConfig.loaded.add(dataType.type);
                } catch (error) {
                    console.error(`Error preloading ${dataType.type}:`, error);
                }
                
                // 等待一小段时间，避免同时发起过多请求
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 停止预加载
        stopPreloading() {
            if (this.preloadTimer) {
                clearInterval(this.preloadTimer);
                this.preloadTimer = null;

            }
        }

        // 重置预加载状态
        resetPreloading() {
            this.preloadConfig.loaded.clear();

        }

        // 注册网络状态变化监听器
        registerNetworkListeners() {
            // 监听在线状态变化
            window.addEventListener('online', () => {
                this.updateNetworkStatus(true);
            });
            
            // 监听离线状态变化
            window.addEventListener('offline', () => {
                this.updateNetworkStatus(false);
            });
        }

        // 更新网络状态
        updateNetworkStatus(online) {
            const previousStatus = this.networkStatus.online;
            this.networkStatus.online = online;
            this.networkStatus.lastChecked = Date.now();
            
            if (previousStatus !== online) {

                // 触发网络状态变化回调
                this.triggerNetworkStatusListeners(online);
                
                if (online) {
                    // 网络恢复，重置预加载状态并重新预加载
                    this.resetPreloading();
                    this.performPreloading();
                }
            }
        }

        // 检查网络状态
        checkNetworkStatus() {
            const online = navigator.onLine;
            this.updateNetworkStatus(online);
            return online;
        }

        // 添加网络状态变化监听器
        addNetworkStatusListener(callback) {
            if (typeof callback === 'function') {
                this.networkStatus.listeners.push(callback);
            }
        }

        // 移除网络状态变化监听器
        removeNetworkStatusListener(callback) {
            const index = this.networkStatus.listeners.indexOf(callback);
            if (index !== -1) {
                this.networkStatus.listeners.splice(index, 1);
            }
        }

        // 触发网络状态变化回调
        triggerNetworkStatusListeners(online) {
            this.networkStatus.listeners.forEach(callback => {
                try {
                    callback(online);
                } catch (error) {
                    console.error('Error in network status listener:', error);
                }
            });
        }

        // 分类错误
        categorizeError(error) {
            const errorMessage = error.message || String(error);
            
            for (const [category, keywords] of Object.entries(this.errorConfig.categories)) {
                if (keywords.some(keyword => errorMessage.includes(keyword))) {
                    return category;
                }
            }
            
            return 'unknown';
        }

        // 处理错误
        handleError(error, context = {}) {
            const errorCategory = this.categorizeError(error);
            const strategy = this.errorConfig.strategies[errorCategory] || {};
            
            console.error(`[${errorCategory}] Error in ${context.operation || 'unknown operation'}:`, error);
            
            // 根据错误类型执行不同的处理策略
            if (strategy.redirect) {
                // 重定向到指定页面（如登录页）
                console.log(`Redirecting to ${strategy.redirect} due to ${errorCategory} error`);
                window.location.href = strategy.redirect;
            }
            
            return {
                category: errorCategory,
                shouldRetry: strategy.retry,
                shouldFallback: strategy.fallback
            };
        }

        // 检查是否可以重试请求
        shouldRetryRequest(error) {
            const errorInfo = this.handleError(error);
            return errorInfo.shouldRetry;
        }

        // 检查是否应该使用本地存储作为 fallback
        shouldUseFallback(error) {
            const errorInfo = this.handleError(error);
            return errorInfo.shouldFallback;
        }

        // 处理请求队列
        async processRequestQueue() {
            if (this.isProcessingQueue || this.requestQueue.length === 0) {
                return;
            }
            
            this.isProcessingQueue = true;
            
            // 按优先级排序队列
            this.requestQueue.sort((a, b) => {
                const priorityA = this.networkConfig.priority[a.priority] || this.networkConfig.priority.normal;
                const priorityB = this.networkConfig.priority[b.priority] || this.networkConfig.priority.normal;
                return priorityA - priorityB;
            });
            
            // 处理队列中的请求
            while (this.requestQueue.length > 0) {
                const request = this.requestQueue.shift();
                try {
                    const response = await this.fetchWithTimeoutInternal(request.url, request.options, request.retryCount, request.requestType);
                    request.resolve(response);
                } catch (error) {
                    request.reject(error);
                }
            }
            
            this.isProcessingQueue = false;
        }

        // 内存缓存相关方法
        getFromCache(key) {
            const cachedItem = this.memoryCache.get(key);
            if (cachedItem) {
                const now = Date.now();
                if (now - cachedItem.timestamp < this.cacheExpiry) {
                    return cachedItem.data;
                } else {
                    // 缓存过期，删除
                    this.memoryCache.delete(key);
                }
            }
            return null;
        }

        setToCache(key, data) {
            this.memoryCache.set(key, {
                data: data,
                timestamp: Date.now()
            });
        }

        clearCache(prefix = '') {
            if (prefix) {
                // 清除特定前缀的缓存
                for (const key of this.memoryCache.keys()) {
                    if (key.startsWith(prefix)) {
                        this.memoryCache.delete(key);
                    }
                }
            } else {
                // 清除所有缓存
                this.memoryCache.clear();
            }
        }

        // 启动定期用户状态检查
        startUserStatusCheck() {
            // 每60秒检查一次用户状态（从30秒改为60秒，减少网络请求）
            this.userStatusCheckInterval = setInterval(() => {
                this.checkUserStatus();
            }, 60000);
        }

        // 通用网络请求方法，包含超时和重试机制
        async fetchWithTimeout(url, options = {}, retryCount = 0, requestType = 'default', priority = 'normal') {
            // 确保 options 存在
            options = options || {};

            // 确保 headers 存在
            options.headers = options.headers || {};

            // 直接处理所有请求，移除请求合并和去重逻辑
            // 这样可以确保每个请求都有自己的响应对象，避免"body stream already read"错误
            return this.fetchWithTimeoutInternal(url, options, retryCount, requestType);
        }

        // 内部网络请求方法，处理实际的网络请求
        async fetchWithTimeoutInternal(url, options, retryCount = 0, requestType = 'default') {
            // 检查网络状态
            if (!this.checkNetworkStatus()) {
                console.warn('Network is offline, falling back to local storage');
                throw new Error('Network is offline');
            }

            // 获取请求超时时间
            const timeout = this.getRequestTimeout(requestType);

            // 创建超时Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Network request timeout'));
                }, timeout);
            });

            try {
                // 使用Promise.race实现超时控制
                const response = await Promise.race([
                    fetch(url, options),
                    timeoutPromise
                ]);

                if (!response.ok) {
                    // 对于401错误，可能是登录状态过期，需要处理
                    if (response.status === 401) {
                        console.error('Unauthorized access, redirecting to login');
                        // 清除登录状态
                        this.forceLogout();
                        throw new Error('Unauthorized access');
                    }
                    
                    // 检查是否是可重试的状态码
                    if (this.networkConfig.retry.retryableStatusCodes.includes(response.status) && 
                        retryCount < this.networkConfig.retry.maxAttempts) {
                        console.warn(`Network request failed with status ${response.status}, retrying (${retryCount + 1}/${this.networkConfig.retry.maxAttempts})...`);
                        
                        // 等待一段时间后重试，使用指数退避策略
                        const delay = Math.min(
                            this.networkConfig.retry.baseDelay * Math.pow(2, retryCount),
                            this.networkConfig.retry.maxDelay
                        );

                        await new Promise(resolve => setTimeout(resolve, delay));

                        // 递归重试
                        return this.fetchWithTimeoutInternal(url, options, retryCount + 1, requestType);
                    }
                    
                    throw new Error(`Network response was not ok: ${response.status}`);
                }

                return response;
            } catch (error) {
                // 处理错误
                const errorInfo = this.handleError(error, { operation: 'fetchWithTimeout' });
                
                // 检查是否可以重试
                if (errorInfo.shouldRetry && retryCount < this.networkConfig.retry.maxAttempts) {
                    console.warn(`Network request failed, retrying (${retryCount + 1}/${this.networkConfig.retry.maxAttempts})...`, error.message);

                    // 等待一段时间后重试，使用指数退避策略
                    const delay = Math.min(
                        this.networkConfig.retry.baseDelay * Math.pow(2, retryCount),
                        this.networkConfig.retry.maxDelay
                    );

                    await new Promise(resolve => setTimeout(resolve, delay));

                    // 递归重试
                    return this.fetchWithTimeoutInternal(url, options, retryCount + 1, requestType);
                }

                // 其他错误或达到最大重试次数，抛出错误
                console.error('Network request failed after all retries:', error);
                throw error;
            }
        }
        
        // 停止定期用户状态检查
        stopUserStatusCheck() {
            if (this.userStatusCheckInterval) {
                clearInterval(this.userStatusCheckInterval);
                this.userStatusCheckInterval = null;
            }
        }
        
        // 检查用户状态
        async checkUserStatus() {
            this.updateLoginStatus();
            
            if (this.isLoggedIn) {
                const userId = localStorage.getItem('user_id');
                if (userId) {
                    // 检查缓存，避免频繁网络请求
                    const lastCheckTime = localStorage.getItem('user_status_check_time');
                    const now = Date.now();
                    const CACHE_DURATION = 60000; // 1分钟缓存
                    
                    if (lastCheckTime && (now - parseInt(lastCheckTime)) < CACHE_DURATION) {
                        // 距离上次检查不到1分钟，跳过检查
                        return;
                    }
                    
                    try {
                        // 发送请求检查用户是否存在
                        const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/check-user.php`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ id: userId })
                        });
                        
                        const data = await response.json();
                        
                        // 更新检查时间
                        localStorage.setItem('user_status_check_time', now.toString());
                        
                        if (data.success && !data.exists) {
                            // 用户不存在，强制退出登录
                            console.log('用户账号已被删除，强制退出登录');
                            this.forceLogout();
                        }
                    } catch (error) {
                        console.error('检查用户状态失败:', error);
                    }
                }
            }
        }
        
        // 强制退出登录
        forceLogout() {
            // 清除本地存储中的登录状态
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_email');
            localStorage.removeItem('username');
            localStorage.removeItem('login_time');
            
            // 清除cookie中的登录状态
            document.cookie = 'user_id=; max-age=0; path=/; secure=false; samesite=lax';
            
            // 停止定期检查
            this.stopUserStatusCheck();
            
            // 显示退出消息并跳转到登录页面
            if (window.toast) {
                window.toast.error('您的账号已被删除，请重新登录');
            } else {
                alert('您的账号已被删除，请重新登录');
            }
            
            // 跳转到登录页面
            setTimeout(() => {
                window.location.href = '/jg/html-new/login.php';
            }, 2000);
        }

        async init() {
            // 检查登录状态
            this.updateLoginStatus();

            // 初始化本地存储
            // 每次初始化都创建一个新的 LocalStorageManager 实例，确保使用最新的 userId
            // 确保 LocalStorageManager 存在
            if (!window.LocalStorageManager) {
                console.error('LocalStorageManager is not defined');
                // 尝试等待 LocalStorageManager 加载
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (window.LocalStorageManager) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    // 5秒后超时
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 5000);
                });
            }

            if (window.LocalStorageManager) {
                try {
                    this.localStorage = new window.LocalStorageManager();
                    // 更新本地存储的用户ID
                    if (this.localStorage.updateUserId) {
                        this.localStorage.updateUserId(this.userId);
                    }
                    await this.localStorage.init();
                } catch (error) {
                    console.error('Failed to create LocalStorageManager instance:', error);
                    // 创建一个简单的本地存储实现作为 fallback
                    this.localStorage = {
                        init: async () => Promise.resolve(),
                        get: async () => null,
                        getAll: async () => [],
                        set: async () => true,
                        remove: async () => true,
                        clearAll: async () => true,
                        getLocal: () => null,
                        setLocal: () => {},
                        getAttendance: async () => [],
                        saveAttendance: async () => true,
                        updateUserId: () => {} // 添加updateUserId方法作为fallback
                    };
                }
            } else {
                console.error('LocalStorageManager still not defined after timeout');
                // 创建一个简单的本地存储实现作为 fallback
                this.localStorage = {
                    init: async () => Promise.resolve(),
                    get: async () => null,
                    getAll: async () => [],
                    set: async () => true,
                    remove: async () => true,
                    clearAll: async () => true,
                    getLocal: () => null,
                    setLocal: () => {},
                    getAttendance: async () => [],
                    saveAttendance: async () => true,
                    updateUserId: () => {} // 添加updateUserId方法作为fallback
                };
            }

            // 启动定期用户状态检查
            this.startUserStatusCheck();
            
            // 延迟启动预加载，避免初始化时的网络请求堆积
            setTimeout(() => {
                this.startPreloading();
            }, 2000);

            return true;
        }

        // 检查登录状态并更新
        updateLoginStatus() {
            // 优先从localStorage获取
            const newUserId = localStorage.getItem('user_id');
            
            // 如果localStorage中没有，从cookie中获取
            if (!newUserId) {
                const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
                if (cookieMatch) {
                    const cookieUserId = cookieMatch[1];
                    // 同时更新到localStorage，保持一致性
                    localStorage.setItem('user_id', cookieUserId);
                    this.userId = cookieUserId;
                } else {
                    this.userId = null;
                }
            } else {
                this.userId = newUserId;
            }
            
            this.isLoggedIn = !!this.userId;
            
            // 如果本地存储已经存在，更新用户ID
            if (this.localStorage && this.localStorage.updateUserId) {
                this.localStorage.updateUserId(this.userId);
            }
        }

        // 通用的存储方法，根据登录状态选择存储方式
        async get(storeName, key) {
            this.updateLoginStatus();
            
            // 特殊处理personalInfo，从localStorage中获取
            if (storeName === 'personalInfo') {
                try {
                    const storageKey = key || 'personalInfo';
                    const personalInfoData = localStorage.getItem(storageKey);
                    if (personalInfoData) {
                        return JSON.parse(personalInfoData);
                    }
                } catch (error) {
                    console.error('Failed to get personalInfo from localStorage:', error);
                }
            }
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            if (this.isLoggedIn) {
                try {
                    return this.getFromServer(storeName, key);
                } catch (error) {
                    console.error('Failed to get data from server, falling back to local storage:', error);
                    // 检查 localStorage.get 方法是否存在
                    if (this.localStorage && this.localStorage.get) {
                        return this.localStorage.get(storeName, key);
                    } else {
                        console.error('localStorage.get is not defined');
                        return null;
                    }
                }
            } else {
                // 检查 localStorage.get 方法是否存在
                if (this.localStorage && this.localStorage.get) {
                    return this.localStorage.get(storeName, key);
                } else {
                    console.error('localStorage.get is not defined');
                    return null;
                }
            }
        }

        async getAll(storeName) {
            this.updateLoginStatus();
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            // 先从localStorage获取数据，作为主要数据源
            let localStorageData = [];
            try {
                const storageData = localStorage.getItem(storeName);
                if (storageData) {
                    const parsedData = JSON.parse(storageData);
                    if (Array.isArray(parsedData)) {
                        localStorageData = parsedData;
    
                    }
                }
            } catch (localError) {
                console.error(`从localStorage获取${storeName}数据失败:`, localError);
            }
            
            // 从本地存储获取数据，作为备用
            let localData = [];
            try {
                if (this.localStorage && this.localStorage.getAll) {
                    localData = await this.localStorage.getAll(storeName) || [];

                }
            } catch (storageError) {
                console.error(`从本地存储获取${storeName}数据失败:`, storageError);
            }
            
            // 合并localStorage和本地存储的数据
            const mergedLocalData = [...new Map([...localStorageData, ...localData].map(item => [item.id, item])).values()];
            
            // 检查缓存，避免频繁网络请求
            const cacheKey = `${storeName}_cache_time`;
            const lastCacheTime = localStorage.getItem(cacheKey);
            const now = Date.now();
            const CACHE_DURATION = 60000; // 1分钟缓存
            
            // 如果有缓存且未过期，直接返回本地数据
            if (lastCacheTime && (now - parseInt(lastCacheTime)) < CACHE_DURATION && mergedLocalData.length > 0) {
                return mergedLocalData;
            }
            
            if (this.isLoggedIn) {
                try {
                    // 从服务器获取数据
                    const serverData = await this.getAllFromServer(storeName);
                    
                    // 更新缓存时间
                    localStorage.setItem(cacheKey, now.toString());
                    
                    // 合并服务器数据和本地数据
                    const dataMap = new Map();
                    mergedLocalData.forEach(item => {
                        if (item.id) {
                            dataMap.set(item.id, item);
                        }
                    });
                    
                    serverData.forEach(item => {
                        if (item.id) {
                            // 如果服务器数据没有order字段，但本地数据有，则保留本地数据的order字段
                            if (storeName === 'projects' && !item.order && dataMap.has(item.id) && dataMap.get(item.id).order !== undefined) {
                                item.order = dataMap.get(item.id).order;
                            }
                            // 转换isEnded字段为布尔类型，处理服务器返回的数字类型
                            if (storeName === 'projects' && item.isEnded !== undefined) {
                                item.isEnded = Boolean(item.isEnded);
                            }
                            dataMap.set(item.id, item);
                        }
                    });
                    
                    const mergedData = Array.from(dataMap.values());
                    
                    // 对项目数据按order字段排序
                    if (storeName === 'projects') {
                        mergedData.sort((a, b) => {
                            const orderA = a.order || 9999;
                            const orderB = b.order || 9999;
                            return orderA - orderB;
                        });
                    }
                    
                    // 将合并后的数据保存到本地存储
                    if (mergedData.length > 0) {
                        try {
                            // 保存到本地存储
                            if (this.localStorage && this.localStorage.set) {
                                for (const item of mergedData) {
                                    await this.localStorage.set(storeName, item);
                                }
                            }
                            
                            // 同时保存到localStorage，使用防抖优化
                            try {
                                this.setLocalDebounced(storeName, mergedData);

                            } catch (localStorageError) {
                                console.error(`保存${storeName}数据到localStorage失败:`, localStorageError);
                            }
                        } catch (saveError) {
                            console.error('保存合并后的数据到本地存储失败:', saveError);
                        }
                    }
                    
                    return mergedData;
                } catch (error) {
                    console.error('从服务器获取数据失败，使用本地数据:', error);
                    return mergedLocalData;
                }
            } else {
                // 未登录时，使用本地数据
                console.log('getAttendance - 未登录，返回本地数据:', mergedLocalData);
                return mergedLocalData;
            }
        }

        async set(storeName, data, key) {
            this.updateLoginStatus();
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            // 无论是否登录，都同时保存到本地存储，确保数据不会丢失
            let localSuccess = false;
            try {
                // 检查 localStorage.set 方法是否存在
                if (this.localStorage && this.localStorage.set) {
                    const result = await this.localStorage.set(storeName, data);
                    // 检查存储是否成功，result 是存储的对象的键值（key），如果不是 undefined 或 null，则表示存储成功
                    localSuccess = result !== undefined && result !== null;
                } else {
                    console.error('localStorage.set is not defined');
                    localSuccess = false;
                }
            } catch (error) {
                console.error('Failed to save data to local storage:', error);
                localSuccess = false;
            }
            
            // 同时保存到localStorage作为备份
            try {
                // 特殊处理personalInfo，因为它是一个对象而不是数组
                if (storeName === 'personalInfo') {
                    // 添加userId字段，确保数据的一致性
                    const dataWithUserId = {
                        ...data,
                        userId: this.userId
                    };
                    // 使用固定键或提供的key保存
                    const storageKey = key || 'personalInfo';
                    localStorage.setItem(storageKey, JSON.stringify(dataWithUserId));
                } else {
                    // 先获取现有的数据
                    let existingData = [];
                    const existingStorageData = localStorage.getItem(storeName);
                    if (existingStorageData) {
                        try {
                            existingData = JSON.parse(existingStorageData);
                            if (!Array.isArray(existingData)) {
                                existingData = [];
                            }
                        } catch (parseError) {
                            console.error(`解析${storeName}现有数据失败:`, parseError);
                            existingData = [];
                        }
                    }
                    
                    // 合并数据，去重
                    const dataMap = new Map();
                    existingData.forEach(item => {
                        if (item.id) {
                            dataMap.set(item.id, item);
                        }
                    });
                    
                    // 添加userId字段，确保数据的一致性
                    const dataWithUserId = {
                        ...data,
                        userId: this.userId
                    };
                    
                    dataMap.set(data.id, dataWithUserId);
                    const mergedData = Array.from(dataMap.values());
                    this.setLocalDebounced(storeName, mergedData);
                }
            } catch (localError) {
                console.error(`${storeName}数据保存到localStorage失败:`, localError);
            }
            
            if (this.isLoggedIn) {
                try {
                    const serverSuccess = await this.setToServer(storeName, data);
                    if (!serverSuccess) {
                        console.error('Server storage failed, but local storage succeeded');
                        // 服务器存储失败时，只要本地存储成功，就返回true
                        // 这样可以确保数据至少保存在本地，不会丢失
                        return localSuccess;
                    }
                } catch (error) {
                    console.error('Failed to save data to server:', error);
                    // 服务器存储失败时，只要本地存储成功，就返回true
                    // 这样可以确保数据至少保存在本地，不会丢失
                    return localSuccess;
                }
                return localSuccess;
            } else {
                return localSuccess;
            }
        }

        async remove(storeName, key) {
            this.updateLoginStatus();
            
            // 未登录时禁止编辑数据
            if (!this.isLoggedIn) {
                console.error('Cannot remove data when not logged in');
                return false;
            }
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            if (this.isLoggedIn) {
                try {
                    return this.removeFromServer(storeName, key);
                } catch (error) {
                    console.error('Failed to remove data from server, falling back to local storage:', error);
                    // 检查 localStorage.remove 方法是否存在
                    if (this.localStorage && this.localStorage.remove) {
                        return this.localStorage.remove(storeName, key);
                    } else {
                        console.error('localStorage.remove is not defined');
                        return false;
                    }
                }
            } else {
                // 检查 localStorage.remove 方法是否存在
                if (this.localStorage && this.localStorage.remove) {
                    return this.localStorage.remove(storeName, key);
                } else {
                    console.error('localStorage.remove is not defined');
                    return false;
                }
            }
        }
        
        async delete(storeName, key) {
            return this.remove(storeName, key);
        }

        async clear(storeName) {
            this.updateLoginStatus();
            
            // 未登录时禁止编辑数据
            if (!this.isLoggedIn) {
                console.error('Cannot clear data when not logged in');
                return false;
            }
            
            if (this.isLoggedIn) {
                return this.clearFromServer(storeName);
            } else {
                return this.localStorage.clear(storeName);
            }
        }

        // 服务器存储方法
        async getFromServer(storeName, key) {
            // 生成缓存键
            const cacheKey = `get_${storeName}_${key}`;
            
            // 尝试从内存缓存获取
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData !== null) {
                return cachedData;
            }
            
            try {
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    // 检查 localStorage.get 方法是否存在
                    if (this.localStorage && this.localStorage.get) {
                        return this.localStorage.get(storeName, key);
                    } else {
                        console.error('localStorage.get is not defined');
                        return null;
                    }
                }
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'get',
                        store: storeName,
                        key: key,
                        user_id: userId
                    })
                });

                let responseText;
                let data;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    // 检查 localStorage.get 方法是否存在
                    if (this.localStorage && this.localStorage.get) {
                        return this.localStorage.get(storeName, key);
                    } else {
                        console.error('localStorage.get is not defined');
                        return null;
                    }
                }
                
                if (data && data.success) {
                    // 缓存服务器返回的数据
                    this.setToCache(cacheKey, data.data);
                    // 即使服务器返回的数据为空，也返回服务器数据
                    // 这样可以确保前端知道服务器确实没有数据
                    return data.data;
                } else {
                    console.error('Server returned error, falling back to local storage:', data ? data.error : 'Unknown error');
                    // 检查 localStorage.get 方法是否存在
                    if (this.localStorage && this.localStorage.get) {
                        return this.localStorage.get(storeName, key);
                    } else {
                        console.error('localStorage.get is not defined');
                        return null;
                    }
                }
            } catch (error) {
                console.error('Failed to get data from server, falling back to local storage:', error);
                // 检查 localStorage.get 方法是否存在
                if (this.localStorage && this.localStorage.get) {
                    return this.localStorage.get(storeName, key);
                } else {
                    console.error('localStorage.get is not defined');
                    return null;
                }
            }
        }

        async getAllFromServer(storeName) {
            // 生成缓存键
            const cacheKey = `getAll_${storeName}`;
            
            // 尝试从内存缓存获取
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData !== null) {
                return cachedData;
            }
            
            try {
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    return this.localStorage.getAll(storeName);
                }
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'getAll',
                        store: storeName,
                        user_id: userId
                    })
                });

                let responseText;
                let data;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    // 降级到本地存储
                    return this.localStorage.getAll(storeName);
                }
                
                if (data && data.success) {
                    const result = data.data || [];
                    // 缓存服务器返回的数据
                    this.setToCache(cacheKey, result);
                    // 即使服务器返回的数据为空，也返回服务器数据
                    // 这样可以确保前端知道服务器确实没有数据
                    return result;
                } else {
                    console.error('Server returned no data, falling back to local storage');
                    // 降级到本地存储
                    return this.localStorage.getAll(storeName);
                }
            } catch (error) {
                console.error('Error getting all data from server:', error);
                // 降级到本地存储
                return this.localStorage.getAll(storeName);
            }
        }

        async setToServer(storeName, data) {
            try {
                // 验证数据格式
                if (!storeName || !data) {
                    console.error('Invalid storeName or data');
                    return false;
                }
                
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    return false;
                }
                
                // 构建请求数据
                const requestData = {
                    action: 'set',
                    store: storeName,
                    data: data,
                    user_id: userId
                };
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                let responseText;
                let result;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    return false;
                }
                
                if (result && result.success) {
                    // 清除相关缓存，确保数据一致性
                    this.clearCache(`get_${storeName}_`);
                    this.clearCache(`getAll_${storeName}`);
                } else if (result && result.error) {
                    console.error('Server storage failed with error:', result.error);
                }
                
                return result ? result.success : false;
            } catch (error) {
                console.error('Error setting data to server:', error);
                // 服务器存储失败时，返回false，但不影响本地存储的成功状态
                return false;
            }
        }

        async removeFromServer(storeName, key) {
            try {
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    return this.localStorage.remove(storeName, key);
                }
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'remove',
                        store: storeName,
                        key: key,
                        user_id: userId
                    })
                });

                let responseText;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    const result = JSON.parse(responseText);
                    
                    // 无论服务器删除是否成功，都尝试从本地删除
                    await this.localStorage.remove(storeName, key);
                    // 清除相关缓存，确保数据一致性
                    this.clearCache(`get_${storeName}_${key}`);
                    this.clearCache(`getAll_${storeName}`);
                    
                    return true;
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    // 降级到本地存储
                    return this.localStorage.remove(storeName, key);
                }
            } catch (error) {
                console.error('Error removing data from server:', error);
                // 降级到本地存储
                return this.localStorage.remove(storeName, key);
            }
        }

        async clearFromServer(storeName) {
            try {
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    return this.localStorage.clear(storeName);
                }
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'clear',
                        store: storeName,
                        user_id: userId
                    })
                });

                let responseText;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    const result = JSON.parse(responseText);
                    
                    if (result.success) {
                        // 清除相关缓存，确保数据一致性
                        this.clearCache(`get_${storeName}_`);
                        this.clearCache(`getAll_${storeName}`);
                    }
                    
                    return result.success;
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    // 降级到本地存储
                    return this.localStorage.clear(storeName);
                }
            } catch (error) {
                console.error('Error clearing data from server:', error);
                // 降级到本地存储
                return this.localStorage.clear(storeName);
            }
        }

        // 批量请求方法，减少API请求次数
        async batchRequest(operations) {
            try {
                // 确保user_id存在
                const userId = this.userId || localStorage.getItem('user_id');
                if (!userId) {
                    console.error('User ID not available');
                    return [];
                }
                
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'batch',
                        operations: operations,
                        user_id: userId
                    })
                });

                let responseText;
                
                try {
                    // 只读取响应一次
                    responseText = await response.text();
                    const result = JSON.parse(responseText);
                    if (result.success) {
                        return result.results || [];
                    } else {
                        console.error('Batch request failed:', result.error);
                        return [];
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    return [];
                }
            } catch (error) {
                console.error('Error making batch request:', error);
                return [];
            }
        }

        // 数据同步方法：将本地数据同步到服务器
        async syncLocalToServer() {
            if (!this.isLoggedIn) {
                return false;
            }

            try {
                // 同步各种数据
                const stores = ['projects', 'attendance', 'contacts', 'personalInfo', 'wageHistory', 'holidays'];
                let syncResults = {};
                
                for (const store of stores) {
                    // 首先尝试从localStorage获取数据
                    let localData = null;
                    try {
                        const localStorageData = localStorage.getItem(store);
                        if (localStorageData) {
                            localData = JSON.parse(localStorageData);

                        }
                    } catch (localError) {
                        console.error(`从localStorage获取${store}数据失败:`, localError);
                    }
                    
                    // 如果localStorage没有数据，尝试从本地存储获取
                    if (!localData) {
                        try {
                            localData = await this.localStorage.getAll(store);

                        } catch (storageError) {
                            console.error(`从本地存储获取${store}数据失败:`, storageError);
                        }
                    }
                    
                    // 同步数据到服务器
                    if (localData && Array.isArray(localData) && localData.length > 0) {

                        let successCount = 0;
                        let totalCount = localData.length;
                        
                        for (const item of localData) {
                            try {
                                // 确保数据包含 user_id 字段
                                const itemWithUserId = {
                                    ...item,
                                    user_id: this.userId || localStorage.getItem('user_id')
                                };
                                
                                // 移除可能导致序列化问题的字段
                                const cleanItem = JSON.parse(JSON.stringify(itemWithUserId));
                                
                                const success = await this.setToServer(store, cleanItem);
                                if (success) {
                                    successCount++;
                                }
                            } catch (itemError) {
                                console.error(`同步${store}数据项失败:`, itemError, item);
                            }
                        }
                        
                        syncResults[store] = { success: successCount, total: totalCount };

                    }
                }

                // 同步当前项目ID
                const currentProjectId = localStorage.getItem('currentProjectId');
                if (currentProjectId) {
                    try {
                        const success = await this.setToServer('userSettings', {
                            id: 'currentProjectId',
                            key: 'currentProjectId',
                            value: currentProjectId,
                            userId: this.userId,
                            user_id: this.userId || localStorage.getItem('user_id')
                        });

                    } catch (error) {
                        console.error('同步当前项目ID失败:', error);
                    }
                }

    
                return true;
            } catch (error) {
                console.error('Error syncing local data to server:', error);
                return false;
            }
        }

        // 数据同步方法：将服务器数据同步到本地
        async syncServerToLocal() {
            if (!this.isLoggedIn) {
                return false;
            }

            try {
                // 同步各种数据
                const stores = ['projects', 'attendance', 'contacts', 'personalInfo', 'wageHistory', 'holidays'];
                let syncResults = {};
                
                for (const store of stores) {

                    try {
                        const serverData = await this.getAllFromServer(store);

                        
                        if (serverData && Array.isArray(serverData)) {

                            let saveCount = 0;
                            
                            for (const item of serverData) {
                                try {
                                    const result = await this.localStorage.set(store, item);
                                    if (result) {
                                        saveCount++;
                                    }
                                } catch (saveError) {
                                    console.error(`保存${store}数据项失败:`, saveError, item);
                                }
                            }
                            

                            
                            // 同时保存到localStorage，确保数据的持久性
                            try {
                                // 先获取现有的数据，进行合并和去重
                                let existingData = [];
                                const existingStorageData = localStorage.getItem(store);
                                if (existingStorageData) {
                                    try {
                                        existingData = JSON.parse(existingStorageData);
                                        if (!Array.isArray(existingData)) {
                                            existingData = [];
                                        }
                                    } catch (parseError) {
                                        console.error(`解析${store}现有数据失败:`, parseError);
                                        existingData = [];
                                    }
                                }
                                
                                // 合并服务器数据和现有数据，去重
                                const dataMap = new Map();
                                existingData.forEach(item => {
                                    if (item.id) {
                                        dataMap.set(item.id, item);
                                    }
                                });
                                
                                serverData.forEach(item => {
                                    if (item.id) {
                                        dataMap.set(item.id, item);
                                    }
                                });
                                
                                const mergedData = Array.from(dataMap.values());
                                this.setLocalDebounced(store, mergedData);

                            } catch (localError) {
                                console.error(`${store}数据保存到localStorage失败:`, localError);
                            }
                            
                            syncResults[store] = { success: saveCount, total: serverData.length };
                        } else {

                            syncResults[store] = { success: 0, total: 0 };
                        }
                    } catch (fetchError) {
                        console.error(`从服务器获取${store}数据失败:`, fetchError);
                        syncResults[store] = { success: 0, total: 0, error: fetchError.message };
                    }
                }

                // 同步当前项目ID
    
                try {
                    const userSettings = await this.getAllFromServer('userSettings');

                    
                    if (userSettings && Array.isArray(userSettings) && userSettings.length > 0) {
                        const currentProjectSetting = userSettings.find(setting => setting.key === 'currentProjectId');
                        if (currentProjectSetting) {
                            localStorage.setItem('currentProjectId', currentProjectSetting.value);

                        }
                    }
                } catch (error) {
                    console.error('同步当前项目ID失败:', error);
                }

                console.log('服务器到本地同步结果:', syncResults);
                return true;
            } catch (error) {
                console.error('Error syncing server data to local:', error);
                return false;
            }
        }

        // 本地存储方法，直接操作localStorage
        getLocal(key) {
            try {
                const value = localStorage.getItem(key);
                if (!value) return null;
                
                // 尝试解析为 JSON
                try {
                    return JSON.parse(value);
                } catch (parseError) {
                    // 如果解析失败，直接返回原始值
                    console.log('Using raw value for key', key, 'since it\'s not valid JSON');
                    return value;
                }
            } catch (error) {
                console.error('Failed to get from localStorage:', error);
                return null;
            }
        }

        setLocal(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Failed to set to localStorage:', error);
                return false;
            }
        }

        // 使用防抖的setLocal方法
        setLocalDebounced(key, value) {
            return this.debouncedSetLocal(key, value);
        }

        removeLocal(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove from localStorage:', error);
                return false;
            }
        }

        // 考勤相关方法
        async getAttendance(projectId) {
            this.updateLoginStatus();
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            // 先从localStorage获取数据，作为主要数据源
            let localStorageData = [];
            try {
                const attendanceJson = localStorage.getItem('attendance');
                if (attendanceJson) {
                    const parsedData = JSON.parse(attendanceJson);
                    if (Array.isArray(parsedData)) {
                        // 过滤出当前项目的考勤数据
                        localStorageData = parsedData.filter(item => String(item.projectId) === String(projectId));
                    }
                }
            } catch (localError) {
                console.error('Failed to get attendance from localStorage:', localError);
            }
            
            // 从本地存储获取数据，作为主要数据源
            let localData = [];
            try {
                // 检查 localStorage.getAttendance 方法是否存在
                if (this.localStorage && this.localStorage.getAttendance) {
                    localData = await this.localStorage.getAttendance(projectId) || [];
                } else if (this.localStorage && this.localStorage.getAll) {
                    // 如果 getAttendance 方法不存在，使用 getAll 方法作为备用
                    const allAttendance = await this.localStorage.getAll('attendance') || [];
                    localData = allAttendance.filter(item => String(item.projectId) === String(projectId));
                }
                
                // 如果本地数据存在且用户已登录，检查并更新userId为当前用户ID
                if (localData.length > 0 && this.isLoggedIn && this.userId) {
                    for (const item of localData) {
                        if (!item.userId || item.userId === 'null' || item.userId === null) {
                            item.userId = this.userId;
                            // 更新本地存储中的数据
                            if (this.localStorage && this.localStorage.set) {
                                await this.localStorage.set('attendance', item);
                            }
                        }
                    }
                }
            } catch (localError) {
                console.error('Failed to get attendance from local storage:', localError);
            }
            
            // 合并localStorage和本地存储的数据，本地存储数据优先
            const mergedLocalData = [...new Map([...localStorageData, ...localData].map(item => [item.id, item])).values()];
            
            // 检查缓存是否有效
            const cacheKey = `attendance_cache_${projectId}_time`;
            const lastCacheTime = localStorage.getItem(cacheKey);
            const now = Date.now();
            const CACHE_DURATION = 60000; // 1分钟缓存
            
            // 如果有本地数据且缓存未过期，直接返回本地数据
            if (mergedLocalData.length > 0 && lastCacheTime && (now - parseInt(lastCacheTime)) < CACHE_DURATION) {
                return mergedLocalData;
            }
            
            // 尝试从服务器获取最新数据
            if (this.isLoggedIn) {
                try {
                    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'getAttendance',
                            projectId: projectId,
                            user_id: this.userId
                        })
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        const serverData = data.data || [];
                        
                        // 更新缓存时间
                        localStorage.setItem(cacheKey, now.toString());
                        
                        // 将服务器数据保存到本地存储，以便下次使用
                        if (this.localStorage && this.localStorage.set) {
                            try {
                                // 批量保存考勤数据到本地存储
                                for (const item of serverData) {
                                    await this.localStorage.set('attendance', item);
                                }
                                
                                // 同时保存到localStorage，作为额外的备份
                                try {
                                    // 合并服务器数据和现有数据，去重
                                    const attendanceMap = new Map();
                                    mergedLocalData.forEach(item => {
                                        if (item.id) {
                                            attendanceMap.set(item.id, item);
                                        }
                                    });
                                    
                                    serverData.forEach(item => {
                                        if (item.id) {
                                            attendanceMap.set(item.id, item);
                                        }
                                    });
                                    
                                    const mergedData = Array.from(attendanceMap.values());
                                    this.setLocalDebounced('attendance', mergedData);
                                } catch (localStorageError) {
                                    console.error('Failed to save attendance to localStorage:', localStorageError);
                                }
                            } catch (saveError) {
                                console.error('Failed to save attendance to local storage:', saveError);
                            }
                        }
                        
                        // 如果服务器返回空数组，使用本地数据作为fallback
                        if (serverData.length === 0 && mergedLocalData.length > 0) {
                            console.log('getAttendance - 服务器返回空数组，使用本地数据:', mergedLocalData);
                            return mergedLocalData;
                        }
                        
                        // 合并服务器数据和本地数据，确保数据完整性
                        // 服务器数据优先，本地数据作为补充
                        const finalDataMap = new Map();
                        
                        // 先添加本地数据
                        mergedLocalData.forEach(item => {
                            if (item.id) {
                                finalDataMap.set(item.id, item);
                            }
                        });
                        
                        // 再用服务器数据覆盖（服务器数据优先）
                        serverData.forEach(item => {
                            if (item.id) {
                                finalDataMap.set(item.id, item);
                            }
                        });
                        
                        const finalData = Array.from(finalDataMap.values());
                        return finalData;
                    } else {
                        console.error('Server returned error for getAttendance:', data.error);
                        // 服务器返回错误时，使用本地数据
                        return mergedLocalData;
                    }
                } catch (error) {
                    console.error('Failed to get attendance from server:', error);
                    // 网络错误时，使用本地数据
                    return mergedLocalData;
                }
            } else {
                // 未登录时，使用本地数据
                return mergedLocalData;
            }
        }

        async getHolidays(projectId) {
            this.updateLoginStatus();
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            if (this.isLoggedIn) {
                try {
                    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'getHolidays',
                            projectId: projectId,
                            user_id: this.userId
                        })
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        // 即使服务器返回的数据为空，也返回服务器数据
                        // 这样可以确保前端知道服务器确实没有数据
                        return data.data || [];
                    } else {
                        console.error('Server returned error for getHolidays:', data.error);
                        // 检查 localStorage.getHolidays 方法是否存在
                        if (this.localStorage && this.localStorage.getHolidays) {
                            return this.localStorage.getHolidays(projectId);
                        } else {
                            console.error('localStorage.getHolidays is not defined');
                            return [];
                        }
                    }
                } catch (error) {
                    console.error('Failed to get holidays from server, falling back to local storage:', error);
                    // 检查 localStorage.getHolidays 方法是否存在
                    if (this.localStorage && this.localStorage.getHolidays) {
                        return this.localStorage.getHolidays(projectId);
                    } else {
                        console.error('localStorage.getHolidays is not defined');
                        return [];
                    }
                }
            } else {
                // 检查 localStorage.getHolidays 方法是否存在
                if (this.localStorage && this.localStorage.getHolidays) {
                    return this.localStorage.getHolidays(projectId);
                } else {
                    console.error('localStorage.getHolidays is not defined');
                    return [];
                }
            }
        }



        async saveAttendance(projectId, date, status, remark = null) {
            this.updateLoginStatus();
            
            // 未登录时禁止编辑数据
            if (!this.isLoggedIn) {
                console.error('Cannot save attendance when not logged in');
                return false;
            }
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            const attendanceData = {
                id: 'attendance_' + projectId + '_' + date,
                projectId,
                date,
                status,
                remark,
                updatedAt: new Date().toISOString()
            };
            
            console.log('Saving attendance:', attendanceData);
            
            // 直接保存到本地存储，确保数据至少保存在本地
            let localSuccess = false;
            try {
                // 检查 localStorage.set 方法是否存在
                if (this.localStorage && this.localStorage.set) {
                    const result = await this.localStorage.set('attendance', attendanceData);
                    // 检查存储是否成功，result 是存储的对象的键值（key），如果不是 undefined 或 null，则表示存储成功
                    localSuccess = result !== undefined && result !== null;
                    console.log('Local storage result for attendance:', { projectId, date, result, success: localSuccess });
                } else {
                    console.error('localStorage.set is not defined');
                }
            } catch (localError) {
                console.error('Failed to save attendance to local storage:', localError);
            }
            
            // 尝试保存到服务器
            if (this.isLoggedIn) {
                try {
                    // 确保用户ID存在
                    if (!this.userId) {
                        this.userId = localStorage.getItem('user_id');
                        console.log('Updated userId:', this.userId);
                    }
                    
                    // 构建完整的请求数据，确保包含所有必要的字段
                    const requestData = {
                        action: 'set',
                        store: 'attendance',
                        data: {
                            ...attendanceData,
                            user_id: this.userId // 确保数据中包含user_id字段
                        },
                        user_id: this.userId // 同时在请求级别包含user_id字段
                    };
                    
                    console.log('Sending attendance data to server:', requestData);
                    
                    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                    
                    console.log('Server response status:', response.status);
                    
                    // 尝试解析响应
                    const text = await response.text();
                    console.log('Server response text:', text);
                    
                    let result;
                    try {
                        result = JSON.parse(text);
                        console.log('Server response for attendance:', result);
                    } catch (parseError) {
                        console.error('Failed to parse server response:', parseError);
                        result = { success: false, error: 'Invalid response format' };
                    }
                    
                    if (result.success) {
                        console.log('Attendance saved to server successfully');
                    } else {
                        console.error('Failed to save attendance to server:', result.error);
                    }
                } catch (serverError) {
                    console.error('Failed to save attendance to server:', serverError);
                }
            }
            
            // 只要本地存储成功，就返回true
            return localSuccess;
        }

        async deleteAttendance(projectId, date) {
            this.updateLoginStatus();
            
            // 未登录时禁止编辑数据
            if (!this.isLoggedIn) {
                console.error('Cannot delete attendance when not logged in');
                return false;
            }
            
            // 确保localStorage已初始化
            if (!this.localStorage) {
                await this.init();
            }
            
            const attendanceId = 'attendance_' + projectId + '_' + date;
            
            if (this.isLoggedIn) {
                try {
                    await this.remove('attendance', attendanceId);
                    return true;
                } catch (error) {
                    console.error('Failed to delete attendance from server:', error);
                    // 降级到本地存储
                    try {
                        // 检查 localStorage.delete 方法是否存在
                        if (this.localStorage && this.localStorage.delete) {
                            await this.localStorage.delete('attendance', attendanceId);
                            return true;
                        } else if (this.localStorage && this.localStorage.remove) {
                            // 尝试使用 remove 方法作为备选
                            await this.localStorage.remove('attendance', attendanceId);
                            return true;
                        } else {
                            console.error('localStorage.delete or remove is not defined');
                            return false;
                        }
                    } catch (localError) {
                        console.error('Failed to delete attendance from local storage:', localError);
                        return false;
                    }
                }
            } else {
                try {
                    // 检查 localStorage.delete 方法是否存在
                    if (this.localStorage && this.localStorage.delete) {
                        await this.localStorage.delete('attendance', attendanceId);
                        return true;
                    } else if (this.localStorage && this.localStorage.remove) {
                        // 尝试使用 remove 方法作为备选
                        await this.localStorage.remove('attendance', attendanceId);
                        return true;
                    } else {
                        console.error('localStorage.delete or remove is not defined');
                        return false;
                    }
                } catch (error) {
                    console.error('Failed to delete attendance:', error);
                    return false;
                }
            }
        }

        // 清除所有数据的方法
        async clearAll() {
            this.updateLoginStatus();
            
            // 未登录时禁止编辑数据
            if (!this.isLoggedIn) {
                console.error('Cannot clear all data when not logged in');
                return false;
            }
            
            try {
                // 清除本地存储的数据
                // 这样可以确保用户在前端看不到数据
                await this.clearAllFromLocal();
                
                // 尝试从服务器清除数据
                await this.clearAllFromServer();
                
                return true;
            } catch (error) {
                console.error('Error clearing all data:', error);
                return false;
            }
        }

        // 从服务器清除所有数据
        async clearAllFromServer() {
            try {
                const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/data.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'clearAll',
                        user_id: this.userId
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    // 同时清除本地存储数据
                    await this.clearAllFromLocal();
                    return true;
                } else {
                    console.error('Server returned error when clearing data:', result.error);
                    return false;
                }
            } catch (error) {
                console.error('Error clearing data from server:', error);
                return false;
            }
        }

        // 从本地清除所有数据
        async clearAllFromLocal() {
            try {
                // 确保localStorage已初始化
                if (!this.localStorage) {
                    await this.init();
                }
                
                // 清除所有本地存储的数据
                const stores = ['contacts', 'attendance', 'wageHistory', 'personalInfo', 'holidays'];
                
                for (const store of stores) {
                    if (this.localStorage && this.localStorage.clear) {
                        await this.localStorage.clear(store);
                    }
                }
                
                // 清除localStorage中的数据，但保留登录状态相关的数据、currentProjectId和项目排序信息
                const currentProjectId = localStorage.getItem('currentProjectId');
                // 保留登录状态相关的数据
                const loginData = {
                    user_id: localStorage.getItem('user_id'),
                    login_time: localStorage.getItem('login_time'),
                    username: localStorage.getItem('username'),
                    user_email: localStorage.getItem('user_email')
                };
                
                // 保存项目排序信息
                let projectsData = [];
                try {
                    const projectsJson = localStorage.getItem('projects');
                    if (projectsJson) {
                        const projects = JSON.parse(projectsJson);
                        if (Array.isArray(projects)) {
                            // 只保留项目的id、name和order字段，用于恢复排序
                            projectsData = projects.map(project => ({
                                id: project.id,
                                name: project.name,
                                order: project.order
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error saving project order information:', error);
                }
                
                localStorage.removeItem('contacts');
                localStorage.removeItem('attendance');
                localStorage.removeItem('wageHistory');
                localStorage.removeItem('personalInfo');
                localStorage.removeItem('holidays');
                localStorage.removeItem('cachedContacts');
                localStorage.removeItem('cachedProjects');
                
                // 恢复登录状态相关的数据
                if (loginData.user_id) localStorage.setItem('user_id', loginData.user_id);
                if (loginData.login_time) localStorage.setItem('login_time', loginData.login_time);
                if (loginData.username) localStorage.setItem('username', loginData.username);
                if (loginData.user_email) localStorage.setItem('user_email', loginData.user_email);
                if (currentProjectId) localStorage.setItem('currentProjectId', currentProjectId);
                
                // 恢复项目排序信息
                if (projectsData.length > 0) {
                    localStorage.setItem('projects', JSON.stringify(projectsData));
                }
                
                // 清除sessionStorage中的数据
                sessionStorage.removeItem('cachedContacts');
                sessionStorage.removeItem('cachedProjects');
                
                return true;
            } catch (error) {
                console.error('Error clearing data from local storage:', error);
                return false;
            }
        }
    }

    // 导出智能存储管理类
    window.IntelligentStorageManager = IntelligentStorageManager;
}