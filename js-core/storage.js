/**
 * 本地存储管理器
 * 负责处理IndexedDB和localStorage的数据存储和读取
 */
// 引入防抖函数
if (!window.DebounceThrottle) {
    // 提供默认实现
    window.DebounceThrottle = {
        debounce: function(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    func.apply(this, args);
                }, wait);
            };
        },
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => {
                        inThrottle = false;
                    }, limit);
                }
            };
        }
    };
}

// 条件声明，避免重复定义
if (!window.LocalStorageManager) {
    class LocalStorageManager {
        /**
         * 构造函数
         */
        constructor() {
            this.dbName = 'RenGongJiGongDB';
            this.dbVersion = 7; // 增加版本号，添加userSettings存储
            this.db = null;
            this.userId = localStorage.getItem('user_id') || 'default';
            this.stores = {
                projects: 'id',
                attendance: 'id',
                contacts: 'id',
                personalInfo: 'id',
                wageHistory: 'id',
                holidays: 'id',
                cloudData: 'id',
                users: 'email', // 使用邮箱作为主键
                userSettings: 'id'
            };
            
            // 初始化防抖函数，用于优化localStorage操作
            this.debouncedSetLocal = window.DebounceThrottle ? window.DebounceThrottle.debounce(this.setLocal.bind(this), 300) : this.setLocal.bind(this);
        }
        
        /**
         * 更新用户ID
         * @param {string} userId 用户ID
         */
        updateUserId(userId) {
            this.userId = userId || 'default';
        }
        
        /**
         * 获取带用户ID前缀的存储键
         * @param {string} key 原始键名
         * @returns {string} 带用户ID前缀的键名
         */
        getUserIdKey(key) {
            return `${this.userId}_${key}`;
        }

        /**
         * 初始化数据库连接
         * @returns {Promise} 初始化结果
         */
        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    reject(new Error('Failed to open database'));
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    // 初始化防抖函数，用于优化localStorage操作
                    this.debouncedSetLocal = window.DebounceThrottle ? window.DebounceThrottle.debounce(this.setLocal.bind(this), 300) : this.setLocal.bind(this);
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const oldVersion = event.oldVersion || 0;
                    
                    // 创建对象存储
                    for (const storeName in this.stores) {
                        if (this.stores.hasOwnProperty(storeName)) {
                            const keyPath = this.stores[storeName];
                            if (!db.objectStoreNames.contains(storeName)) {
                                db.createObjectStore(storeName, { keyPath });
                            }
                        }
                    }
                    
                    // 版本升级处理
                    if (oldVersion < 2) {
                        if (!db.objectStoreNames.contains('wageHistory')) {
                            db.createObjectStore('wageHistory', { keyPath: 'id' });
                        }
                        if (!db.objectStoreNames.contains('holidays')) {
                            db.createObjectStore('holidays', { keyPath: 'id' });
                        }
                    }
                    
                    if (oldVersion < 4) {
                        if (!db.objectStoreNames.contains('cloudData')) {
                            db.createObjectStore('cloudData', { keyPath: 'id' });
                        }
                    }
                    
                    if (oldVersion < 5) {
                        if (!db.objectStoreNames.contains('users')) {
                            db.createObjectStore('users', { keyPath: 'email' });
                        }
                    }
                };
            });
        }

        // 使用防抖的setLocal方法
        setLocalDebounced(key, value) {
            return this.debouncedSetLocal(key, value);
        }

        async get(storeName, key) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;
                    // 验证数据是否属于当前用户
                    if (result && (result.userId === this.userId || !result.userId)) {
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        }

        async getAll(storeName) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    const results = request.result || [];
                    // 首次加载时，userId 可能还没有设置，返回所有数据
                    if (!this.userId || this.userId === 'default') {
                        resolve(results);
                        return;
                    }
                    const userResults = results.filter(item => {
                        // 返回匹配当前用户ID的数据或没有用户ID的数据
                        return item.userId === this.userId || !item.userId;
                    });
                    resolve(userResults);
                };
                request.onerror = () => reject(request.error);
            });
        }

        async set(storeName, data) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                // 添加用户ID字段，确保数据属于当前用户
                const dataWithUserId = {
                    ...data,
                    userId: this.userId
                };

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(dataWithUserId);

                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(request.error);
                };
            });
        }

        async delete(storeName, key) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        async remove(storeName, key) {
            return this.delete(storeName, key);
        }

        async clear(storeName) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // 使用clear方法清空整个存储，而不是逐个删除
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                    resolve();
                };
                
                clearRequest.onerror = () => {
                    reject(clearRequest.error);
                };
            });
        }

        async clearAll() {
            try {
                // 清空所有存储的数据
                await Promise.all([
                    this.clear('contacts'),
                    this.clear('projects'),
                    this.clear('attendance'),
                    this.clear('holidays'),
                    this.clear('wageHistory'),
                    this.clear('personalInfo'),
                    this.clear('userSettings')
                ]);
                
                // 清空本地存储，但保留登录状态相关的数据
                const loginData = {
                    user_id: localStorage.getItem('user_id'),
                    login_time: localStorage.getItem('login_time'),
                    username: localStorage.getItem('username'),
                    user_email: localStorage.getItem('user_email')
                };
                
                // 清除所有本地存储数据，然后只恢复登录状态相关的数据
                localStorage.clear();
                
                // 恢复登录状态相关的数据
                if (loginData.user_id) localStorage.setItem('user_id', loginData.user_id);
                if (loginData.login_time) localStorage.setItem('login_time', loginData.login_time);
                if (loginData.username) localStorage.setItem('username', loginData.username);
                if (loginData.user_email) localStorage.setItem('user_email', loginData.user_email);
                
                // 调用服务器API清空SQL数据库中的数据
                if (loginData.user_id) {
                    try {
                        const response = await fetch('/jg/api/data.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'clearAll',
                                user_id: loginData.user_id
                            })
                        });
                        
                        if (!response.ok) {
                            if (window.Logger) {
                                Logger.error('Failed to clear data on server:', { status: response.status, statusText: response.statusText });
                            } else {
                                console.error('Failed to clear data on server:', response.statusText);
                            }
                        }
                    } catch (apiError) {
                        if (window.Logger) {
                            Logger.error('API error when clearing data:', { error: apiError.message, stack: apiError.stack });
                        } else {
                            console.error('API error when clearing data:', apiError);
                        }
                        // 即使API调用失败，也继续执行，因为本地数据已经清空
                    }
                }
                
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('Failed to clear all data:', { error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to clear all data:', error);
                }
                return false;
            }
        }

        getLocal(key) {
            try {
                const value = localStorage.getItem(key);
                if (!value) return null;
                
                // 尝试解析为 JSON
                try {
                    return JSON.parse(value);
                } catch (parseError) {
                    // 如果解析失败，直接返回原始值
                    return value;
                }
            } catch (error) {
                if (window.Logger) {
                    Logger.error('Failed to get from localStorage:', { key, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to get from localStorage:', error);
                }
                return null;
            }
        }

        setLocal(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('Failed to set to localStorage:', { key, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to set to localStorage:', error);
                }
                return false;
            }
        }

        removeLocal(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('Failed to remove from localStorage:', { key, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to remove from localStorage:', error);
                }
                return false;
            }
        }

        // 用户相关方法
        async registerUser(email, password) {
            try {
                // 检查用户是否已存在
                const existingUser = await this.get('users', email);
                if (existingUser) {
                    throw new Error('用户已存在');
                }

                // 创建新用户
                const user = {
                    email: email,
                    password: password, // 注意：实际应用中应该对密码进行加密
                    createdAt: new Date().toISOString()
                };

                await this.set('users', user);
                if (window.Logger) {
                    Logger.info('用户注册成功', { email });
                }
                return { success: true, user };
            } catch (error) {
                if (window.Logger) {
                    Logger.error('注册用户失败:', { email, error: error.message, stack: error.stack });
                } else {
                    console.error('注册用户失败:', error);
                }
                return { success: false, error: error.message };
            }
        }

        async loginUser(email, password) {
            try {
                // 获取用户信息
                const user = await this.get('users', email);
                if (!user) {
                    throw new Error('用户不存在');
                }

                // 验证密码
                if (user.password !== password) {
                    throw new Error('密码错误');
                }

                if (window.Logger) {
                    Logger.info('用户登录成功', { email });
                }
                return { success: true, user };
            } catch (error) {
                if (window.Logger) {
                    Logger.error('登录失败:', { email, error: error.message, stack: error.stack });
                } else {
                    console.error('登录失败:', error);
                }
                return { success: false, error: error.message };
            }
        }

        async getUser(email) {
            try {
                const user = await this.get('users', email);
                return user;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('获取用户信息失败:', { email, error: error.message, stack: error.stack });
                } else {
                    console.error('获取用户信息失败:', error);
                }
                return null;
            }
        }

        async updateUser(email, updates) {
            try {
                const user = await this.get('users', email);
                if (!user) {
                    throw new Error('用户不存在');
                }

                const updatedUser = { ...user, ...updates };
                await this.set('users', updatedUser);
                if (window.Logger) {
                    Logger.info('用户信息更新成功', { email, updatedFields: Object.keys(updates) });
                }
                return { success: true, user: updatedUser };
            } catch (error) {
                if (window.Logger) {
                    Logger.error('更新用户信息失败:', { email, error: error.message, stack: error.stack });
                } else {
                    console.error('更新用户信息失败:', error);
                }
                return { success: false, error: error.message };
            }
        }

        async deleteUser(email) {
            try {
                await this.delete('users', email);
                if (window.Logger) {
                    Logger.info('用户删除成功', { email });
                }
                return { success: true };
            } catch (error) {
                if (window.Logger) {
                    Logger.error('删除用户失败:', { email, error: error.message, stack: error.stack });
                } else {
                    console.error('删除用户失败:', error);
                }
                return { success: false, error: error.message };
            }
        }

        async getAllUsers() {
            try {
                const users = await this.getAll('users');
                if (window.Logger) {
                    Logger.info('获取所有用户成功', { count: users.length });
                }
                return users;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('获取所有用户失败:', { error: error.message, stack: error.stack });
                } else {
                    console.error('获取所有用户失败:', error);
                }
                return [];
            }
        }

        async getAttendance(projectId) {
            try {
                const allAttendance = await this.getAll('attendance');
                const filteredAttendance = allAttendance.filter(item => {
                    const match = String(item.projectId) === String(projectId);
                    return match;
                });
                if (window.Logger) {
                    Logger.info('获取考勤数据成功', { projectId, count: filteredAttendance.length });
                }
                return filteredAttendance;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('获取考勤数据失败:', { projectId, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to get attendance:', error);
                }
                return [];
            }
        }

        async saveAttendance(projectId, date, status, remark = null) {
            try {
                const attendanceData = {
                    id: 'attendance_' + projectId + '_' + date,
                    projectId,
                    date,
                    status,
                    remark,
                    updatedAt: new Date().toISOString()
                };
                await this.set('attendance', attendanceData);
                if (window.Logger) {
                    Logger.info('保存考勤数据成功', { projectId, date, status, remark });
                }
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('保存考勤数据失败:', { projectId, date, status, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to save attendance:', error);
                }
                return false;
            }
        }

        async deleteAttendance(projectId, date) {
            try {
                const attendanceId = 'attendance_' + projectId + '_' + date;
                await this.delete('attendance', attendanceId);
                if (window.Logger) {
                    Logger.info('删除考勤数据成功', { projectId, date });
                }
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('删除考勤数据失败:', { projectId, date, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to delete attendance:', error);
                }
                return false;
            }
        }

        async getHolidays(projectId) {
            try {
                const allHolidays = await this.getAll('holidays');
                const filteredHolidays = allHolidays.filter(item => !item.projectId || item.projectId === projectId);
                if (window.Logger) {
                    Logger.info('获取节日数据成功', { projectId, count: filteredHolidays.length });
                }
                return filteredHolidays;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('获取节日数据失败:', { projectId, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to get holidays:', error);
                }
                return [];
            }
        }

        async saveHoliday(projectId, date, isHoliday) {
            try {
                const holidayData = {
                    id: 'holiday_' + projectId + '_' + date,
                    projectId,
                    date,
                    isHoliday,
                    updatedAt: new Date().toISOString()
                };
                await this.set('holidays', holidayData);
                if (window.Logger) {
                    Logger.info('保存节日数据成功', { projectId, date, isHoliday });
                }
                return true;
            } catch (error) {
                if (window.Logger) {
                    Logger.error('保存节日数据失败:', { projectId, date, isHoliday, error: error.message, stack: error.stack });
                } else {
                    console.error('Failed to save holiday:', error);
                }
                return false;
            }
        }



    }

    // 创建全局 LocalStorageManager 实例
    window.LocalStorageManager = LocalStorageManager;
    window.storageManager = new LocalStorageManager();

    // 初始化 LocalStorageManager
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.storageManager.init();
        } catch (error) {
            console.error('LocalStorageManager 初始化失败:', error);
        }
    });
}