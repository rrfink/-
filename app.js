

// 动态获取syncDataToCloud和restoreDataFromCloud函数，确保使用最新的函数
function getSyncDataToCloud() {
    return window.syncDataToCloud || (async (storageManager) => {
        console.warn('syncDataToCloud not loaded yet');
        return { success: false, error: 'syncDataToCloud not loaded' };
    });
}

function getRestoreDataFromCloud() {
    return window.restoreDataFromCloud || (async (storageManager) => {
        console.warn('restoreDataFromCloud not loaded yet');
        return { success: false, error: 'restoreDataFromCloud not loaded' };
    });
}

class App {
    constructor(options) {
        this.container = options.container || document.getElementById('app');
        this.page = options.page || 'home';
        
        // 初始化核心组件，添加错误处理
        try {
            this.eventBus = new EventBus();
        } catch (eventBusError) {
            console.error('EventBus初始化失败:', eventBusError);
            // 创建模拟的EventBus
            this.eventBus = {
                on: () => {},
                off: () => {},
                emit: () => {}
            };
        }
        
        try {
            this.storage = new StorageManager();
        } catch (storageError) {
            console.error('StorageManager初始化失败:', storageError);
            // 创建基于localStorage的降级存储管理器
            this.storage = {
                getLocal: (key) => {
                    try {
                        const value = localStorage.getItem(key);
                        if (!value) return null;
                        try {
                            return JSON.parse(value);
                        } catch (e) {
                            return value;
                        }
                    } catch (e) {
                        return null;
                    }
                },
                setLocal: (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                removeLocal: (key) => {
                    try {
                        localStorage.removeItem(key);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                // 模拟其他方法
                get: async () => null,
                getAll: async () => [],
                set: async () => null,
                delete: async () => null,
                clear: async () => null,
                clearAll: async () => true
            };
        }
        
        this.logger = Logger || console;
        
        try {
            this.theme = new ThemeManager(this.storage, this.eventBus);
        } catch (themeError) {
            console.error('ThemeManager初始化失败:', themeError);
            // 创建模拟的ThemeManager
            this.theme = {
                init: () => {},
                setTheme: () => {},
                getTheme: () => 'light',
                toggleTheme: () => 'light'
            };
        }
        
        try {
            this.toast = new Toast(this.eventBus);
        } catch (toastError) {
            console.error('Toast初始化失败:', toastError);
            // 创建模拟的Toast
            this.toast = {
                show: (message) => console.log('Toast:', message),
                success: (message) => console.log('Success:', message),
                error: (message) => console.error('Error:', message),
                warning: (message) => console.warn('Warning:', message),
                info: (message) => console.info('Info:', message)
            };
        }
        
        try {
            // 使用全局dialog实例（从js-components/dialog.js加载）
            if (window.dialog) {
                this.dialog = window.dialog;
                console.log('使用全局dialog实例');
            } else {
                console.warn('全局dialog实例未找到，使用默认实现');
                // 降级方案：使用默认实现
                this.dialog = {
                    show: (options) => {
                        const {
                            title,
                            htmlContent,
                            showConfirm = true,
                            showCancel = true,
                            confirmText = '确定',
                            cancelText = '取消',
                            onConfirm,
                            onCancel
                        } = options;

                        // 生成唯一ID
                        const id = `dialog-${Date.now()}`;

                        // 创建对话框容器
                        const dialogContainer = document.createElement('div');
                        dialogContainer.id = id;
                        dialogContainer.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background-color: rgba(0, 0, 0, 0.5);
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            z-index: 9999;
                        `;

                        // 创建对话框内容
                        const dialogContent = document.createElement('div');
                        dialogContent.style.cssText = `
                            background-color: var(--bg-light);
                            padding: 20px;
                            border-radius: var(--border-radius-md);
                            width: 90%;
                            max-width: 500px;
                            max-height: 80vh;
                            overflow-y: auto;
                            color: var(--text-color);
                            box-shadow: var(--shadow-md);
                        `;

                        // 创建标题容器
                        const titleContainer = document.createElement('div');
                        titleContainer.style.cssText = `
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 20px;
                        `;

                        // 创建标题
                        const dialogTitle = document.createElement('h3');
                        dialogTitle.textContent = title;
                        dialogTitle.style.cssText = `
                            margin: 0;
                            font-size: var(--font-size-lg);
                            color: var(--text-color);
                        `;

                        // 创建关闭按钮
                        const closeButton = document.createElement('button');
                        closeButton.textContent = '×';
                        closeButton.style.cssText = `
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: var(--text-light);
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        `;

                        // 组装标题容器
                        titleContainer.appendChild(dialogTitle);
                        titleContainer.appendChild(closeButton);

                        // 创建内容容器
                        const contentContainer = document.createElement('div');
                        contentContainer.innerHTML = htmlContent;

                        // 为内容容器中的表单元素设置主题样式
                        setTimeout(() => {
                            const inputs = contentContainer.querySelectorAll('input, select, textarea');
                            inputs.forEach(input => {
                                input.style.cssText += `
                                    background-color: var(--bg-light);
                                    color: var(--text-color);
                                    border: 1px solid var(--border-color);
                                `;
                            });

                            const labels = contentContainer.querySelectorAll('label');
                            labels.forEach(label => {
                                label.style.color = 'var(--text-color)';
                            });
                        }, 10);

                        // 创建按钮容器
                        const buttonContainer = document.createElement('div');
                        buttonContainer.style.cssText = `
                            display: flex;
                            justify-content: flex-end;
                            gap: 10px;
                            margin-top: 20px;
                        `;

                        // 创建取消按钮
                        if (showCancel) {
                            const cancelButton = document.createElement('button');
                            cancelButton.textContent = cancelText;
                            cancelButton.style.cssText = `
                                padding: 8px 16px;
                                border: 1px solid var(--border-color);
                                background-color: var(--bg-tertiary);
                                color: var(--text-color);
                                border-radius: var(--border-radius-sm);
                                cursor: pointer;
                            `;

                            // 取消按钮事件
                            cancelButton.onclick = () => {
                                document.body.removeChild(dialogContainer);
                                if (onCancel) {
                                    onCancel();
                                }
                            };

                            buttonContainer.appendChild(cancelButton);
                        }

                        // 创建确认按钮
                        if (showConfirm) {
                            const confirmButton = document.createElement('button');
                            confirmButton.textContent = confirmText;
                            confirmButton.style.cssText = `
                                padding: 8px 16px;
                                border: 1px solid var(--primary-color);
                                background-color: var(--primary-color);
                                color: white;
                                border-radius: var(--border-radius-sm);
                                cursor: pointer;
                            `;

                            // 确认按钮事件
                            confirmButton.onclick = async () => {
                                if (onConfirm) {
                                    try {
                                        await onConfirm();
                                        document.body.removeChild(dialogContainer);
                                    } catch (error) {
                                        console.error('Error in dialog confirm:', error);
                                    }
                                } else {
                                    document.body.removeChild(dialogContainer);
                                }
                            };

                            buttonContainer.appendChild(confirmButton);
                        }

                        // 组装对话框
                        dialogContent.appendChild(titleContainer);
                        dialogContent.appendChild(contentContainer);
                        dialogContent.appendChild(buttonContainer);
                        dialogContainer.appendChild(dialogContent);

                        // 关闭按钮事件
                        closeButton.onclick = () => {
                            document.body.removeChild(dialogContainer);
                            if (onCancel) {
                                onCancel();
                            }
                        };

                        // 点击背景关闭
                        dialogContainer.onclick = (e) => {
                            if (e.target === dialogContainer) {
                                document.body.removeChild(dialogContainer);
                                if (onCancel) {
                                    onCancel();
                                }
                            }
                        };

                        // 添加到页面
                        document.body.appendChild(dialogContainer);

                        return id;
                    },
                    close: (id) => {
                        const dialogContainer = document.getElementById(id);
                        if (dialogContainer) {
                            document.body.removeChild(dialogContainer);
                        }
                    },
                    closeAll: () => {
                        const dialogs = document.querySelectorAll('[id^="dialog-"]');
                        dialogs.forEach(dialog => {
                            dialog.remove();
                        });
                    },
                    init: () => {}
                };
            }
        } catch (dialogError) {
            console.error('Dialog初始化失败:', dialogError);
            // 创建功能完整的模拟Dialog
            this.dialog = {
                show: (options) => {
                    const {
                        title,
                        htmlContent,
                        showConfirm = true,
                        showCancel = true,
                        confirmText = '确定',
                        cancelText = '取消',
                        onConfirm,
                        onCancel
                    } = options;

                    // 生成唯一ID
                    const id = `dialog-${Date.now()}`;

                    // 创建对话框容器
                    const dialogContainer = document.createElement('div');
                    dialogContainer.id = id;
                    dialogContainer.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                    `;

                    // 创建对话框内容
                    const dialogContent = document.createElement('div');
                    dialogContent.style.cssText = `
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 80vh;
                        overflow-y: auto;
                        color: #333;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    `;

                    // 创建标题容器
                    const titleContainer = document.createElement('div');
                    titleContainer.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    `;

                    // 创建标题
                    const dialogTitle = document.createElement('h3');
                    dialogTitle.textContent = title;
                    dialogTitle.style.cssText = `
                        margin: 0;
                        font-size: 18px;
                        color: #333;
                    `;

                    // 创建关闭按钮
                    const closeButton = document.createElement('button');
                    closeButton.textContent = '×';
                    closeButton.style.cssText = `
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #999;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;

                    // 组装标题容器
                    titleContainer.appendChild(dialogTitle);
                    titleContainer.appendChild(closeButton);

                    // 创建内容容器
                    const contentContainer = document.createElement('div');
                    contentContainer.innerHTML = htmlContent;

                    // 创建按钮容器
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.cssText = `
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 20px;
                    `;

                    // 创建取消按钮
                    if (showCancel) {
                        const cancelButton = document.createElement('button');
                        cancelButton.textContent = cancelText;
                        cancelButton.style.cssText = `
                            padding: 8px 16px;
                            border: 1px solid #ddd;
                            background-color: #f5f5f5;
                            color: #333;
                            border-radius: 4px;
                            cursor: pointer;
                        `;

                        // 取消按钮事件
                        cancelButton.onclick = () => {
                            document.body.removeChild(dialogContainer);
                            if (onCancel) {
                                onCancel();
                            }
                        };

                        buttonContainer.appendChild(cancelButton);
                    }

                    // 创建确认按钮
                    if (showConfirm) {
                        const confirmButton = document.createElement('button');
                        confirmButton.textContent = confirmText;
                        confirmButton.style.cssText = `
                            padding: 8px 16px;
                            border: 1px solid #165DFF;
                            background-color: #165DFF;
                            color: white;
                            border-radius: 4px;
                            cursor: pointer;
                        `;

                        // 确认按钮事件
                        confirmButton.onclick = async () => {
                            if (onConfirm) {
                                try {
                                    await onConfirm();
                                    document.body.removeChild(dialogContainer);
                                } catch (error) {
                                    console.error('Error in dialog confirm:', error);
                                }
                            } else {
                                document.body.removeChild(dialogContainer);
                            }
                        };

                        buttonContainer.appendChild(confirmButton);
                    }

                    // 组装对话框
                    dialogContent.appendChild(titleContainer);
                    dialogContent.appendChild(contentContainer);
                    dialogContent.appendChild(buttonContainer);
                    dialogContainer.appendChild(dialogContent);

                    // 关闭按钮事件
                    closeButton.onclick = () => {
                        document.body.removeChild(dialogContainer);
                        if (onCancel) {
                            onCancel();
                        }
                    };

                    // 点击背景关闭
                    dialogContainer.onclick = (e) => {
                        if (e.target === dialogContainer) {
                            document.body.removeChild(dialogContainer);
                            if (onCancel) {
                                onCancel();
                            }
                        }
                    };

                    // 添加到页面
                    document.body.appendChild(dialogContainer);

                    return id;
                },
                close: (id) => {
                    const dialogContainer = document.getElementById(id);
                    if (dialogContainer) {
                        document.body.removeChild(dialogContainer);
                    }
                },
                closeAll: () => {
                    const dialogs = document.querySelectorAll('[id^="dialog-"]');
                    dialogs.forEach(dialog => {
                        dialog.remove();
                    });
                },
                init: () => {}
            };
        }
        
        this.currentPage = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) {
            this.logger.warn('App already initialized');
            return;
        }

        try {
            // 尝试初始化StorageManager
            try {
                await this.storage.init();
                this.logger.info('Storage initialized');
                // 暴露StorageManager实例到全局，方便云端恢复时使用
                window.storageManager = this.storage;
            } catch (storageError) {
                this.logger.error('Failed to initialize StorageManager:', storageError);
                // 创建一个基于localStorage的降级存储管理器
                this.storage = {
                    getLocal: (key) => {
                        try {
                            const value = localStorage.getItem(key);
                            if (!value) return null;
                            try {
                                return JSON.parse(value);
                            } catch (e) {
                                return value;
                            }
                        } catch (e) {
                            return null;
                        }
                    },
                    setLocal: (key, value) => {
                        try {
                            localStorage.setItem(key, JSON.stringify(value));
                            return true;
                        } catch (e) {
                            return false;
                        }
                    },
                    removeLocal: (key) => {
                        try {
                            localStorage.removeItem(key);
                            return true;
                        } catch (e) {
                            return false;
                        }
                    },
                    // 模拟其他方法
                    get: async () => null,
                    getAll: async () => [],
                    set: async () => null,
                    delete: async () => null,
                    clear: async () => null,
                    clearAll: async () => true
                };
                this.logger.warn('Using fallback localStorage storage');
            }

            this.theme.init();
            this.logger.info('Theme initialized');

            // 尝试初始化登录图标管理器
            try {
                if (window.loginIconManager) {
                    window.loginIconManager.init();
                    this.logger.info('Login icon manager initialized');
                } else {
                    this.logger.warn('LoginIconManager not found, skipping initialization');
                }
            } catch (loginIconError) {
                this.logger.warn('Failed to initialize login icon manager:', loginIconError);
                // 继续执行，不阻塞初始化
            }

            this.toast.init();
            this.logger.info('Toast initialized');

            this.dialog.init();
            this.logger.info('Dialog initialized');

            await this.loadPage(this.page);
            
            this.isInitialized = true;
            this.logger.info('App initialized successfully');
            this.eventBus.emit('app:ready');
        } catch (error) {
            this.logger.error('Failed to initialize app:', error);
            // 显示更友好的错误消息
            this.toast.error('初始化失败，请检查网络连接后重试');
            // 不抛出错误，允许应用继续运行
        }
    }

    async loadPage(pageName) {
        if (this.currentPage) {
            this.currentPage.destroy();
        }

        const PageClass = this.getPageClass(pageName);
        
        if (!PageClass) {
            throw new Error(`Page not found: ${pageName}`);
        }

        this.currentPage = new PageClass({
            container: this.container,
            eventBus: this.eventBus,
            storage: this.storage,
            theme: this.theme,
            toast: this.toast,
            dialog: this.dialog,
            logger: this.logger,
            cloudSync: {
                syncDataToCloud: () => getSyncDataToCloud()(this.storage),
                restoreDataFromCloud: () => getRestoreDataFromCloud()(this.storage)
            }
        });

        try {
            await this.currentPage.init();
            this.logger.info(`Page loaded: ${pageName}`);
            this.eventBus.emit('page:loaded', { page: pageName });
        } catch (error) {
            this.logger.error(`Failed to load page ${pageName}:`, error);
            this.toast.error(`页面加载失败: ${error.message}`);
            throw error;
        }
    }

    getPageClass(pageName) {
        const pages = {
            'home': HomePage
        };

        return pages[pageName];
    }

    navigateTo(pageName) {
        if (pageName === this.page) return;
        
        this.page = pageName;
        this.loadPage(pageName);
        
        this.eventBus.emit('page:navigate', { from: this.page, to: pageName });
    }

    destroy() {
        if (this.currentPage) {
            this.currentPage.destroy();
        }
        
        this.toast.hideAll();
        this.dialog.hideAll();
        
        this.isInitialized = false;
        this.logger.info('App destroyed');
    }
}

// 添加全局引用
window.App = App;
