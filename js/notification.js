// 统一提示模块
class Notification {
    constructor() {
        this.container = null;
        this.notifications = {};
        this.idCounter = 0;
        this.initialized = false;
    }

    /**
     * 初始化通知容器
     */
    init() {
        if (this.initialized) return;

        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }

        this.initialized = true;
    }

    /**
     * 显示通知
     * @param {string} message - 通知内容
     * @param {string} type - 通知类型：success, error, warning, info
     * @param {number} duration - 持续时间（毫秒）
     * @param {object} options - 可选配置
     * @returns {string} 通知ID
     */
    show(message, type = 'info', duration = 3000, options = {}) {
        // 确保容器已初始化
        this.init();

        // 再次检查容器是否初始化成功
        if (!this.container) {
            console.error('Notification container not initialized');
            return null;
        }

        const id = `notification-${this.idCounter++}`;
        const notification = this.createNotification(message, type, id, options);

        this.container.appendChild(notification);
        this.notifications[id] = notification;

        // 显示动画
        setTimeout(() => {
            notification.classList.add('notification-shown');
        }, 10);

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        return id;
    }

    /**
     * 创建通知元素
     * @param {string} message - 通知内容
     * @param {string} type - 通知类型
     * @param {string} id - 通知ID
     * @param {object} options - 可选配置
     * @returns {HTMLElement} 通知元素
     */
    createNotification(message, type, id, options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.id = id;

        // 添加自定义类
        if (options.className) {
            notification.classList.add(options.className);
        }

        // 创建图标
        const icon = this.getIcon(type);
        const iconElement = document.createElement('i');
        iconElement.className = `fas ${icon}`;

        // 创建消息内容
        const messageElement = document.createElement('div');
        messageElement.className = 'notification-message';
        messageElement.innerHTML = message; // 支持HTML内容

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.onclick = () => this.hide(id);

        // 组装通知元素
        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        if (options.showClose !== false) {
            notification.appendChild(closeButton);
        }

        return notification;
    }

    /**
     * 根据类型获取图标
     * @param {string} type - 通知类型
     * @returns {string} 图标类名
     */
    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * 隐藏通知
     * @param {string} id - 通知ID
     */
    hide(id) {
        const notification = this.notifications[id];
        if (!notification) return;

        // 添加隐藏动画
        notification.classList.add('notification-hiding');

        // 移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            delete this.notifications[id];
        }, 300);
    }

    /**
     * 隐藏所有通知
     */
    hideAll() {
        Object.keys(this.notifications).forEach(id => this.hide(id));
    }

    /**
     * 显示成功通知
     * @param {string} message - 通知内容
     * @param {number} duration - 持续时间
     * @param {object} options - 可选配置
     * @returns {string} 通知ID
     */
    success(message, duration, options) {
        return this.show(message, 'success', duration, options);
    }

    /**
     * 显示错误通知
     * @param {string} message - 通知内容
     * @param {number} duration - 持续时间
     * @param {object} options - 可选配置
     * @returns {string} 通知ID
     */
    error(message, duration, options) {
        return this.show(message, 'error', duration, options);
    }

    /**
     * 显示警告通知
     * @param {string} message - 通知内容
     * @param {number} duration - 持续时间
     * @param {object} options - 可选配置
     * @returns {string} 通知ID
     */
    warning(message, duration, options) {
        return this.show(message, 'warning', duration, options);
    }

    /**
     * 显示信息通知
     * @param {string} message - 通知内容
     * @param {number} duration - 持续时间
     * @param {object} options - 可选配置
     * @returns {string} 通知ID
     */
    info(message, duration, options) {
        return this.show(message, 'info', duration, options);
    }

    /**
     * 显示加载通知
     * @param {string} message - 通知内容
     * @returns {string} 通知ID
     */
    loading(message = '加载中...') {
        return this.show(
            `<div class="notification-loading">
                <div class="loading-spinner"></div>
                <span>${message}</span>
            </div>`,
            'info',
            0, // 不自动隐藏
            { showClose: false, className: 'notification-loading' }
        );
    }

    /**
     * 显示确认通知
     * @param {string} message - 通知内容
     * @param {function} onConfirm - 确认回调
     * @param {function} onCancel - 取消回调
     * @returns {string} 通知ID
     */
    confirm(message, onConfirm, onCancel) {
        const id = this.show(
            `
                <div class="notification-confirm-message">${message}</div>
                <div class="notification-confirm-buttons">
                    <button class="btn btn-secondary btn-sm" id="confirm-cancel-${this.idCounter}">取消</button>
                    <button class="btn btn-primary btn-sm" id="confirm-ok-${this.idCounter}">确认</button>
                </div>
            `,
            'info',
            0, // 不自动隐藏
            { showClose: false, className: 'notification-confirm' }
        );

        // 绑定按钮事件
        setTimeout(() => {
            const cancelBtn = document.getElementById(`confirm-cancel-${this.idCounter - 1}`);
            const okBtn = document.getElementById(`confirm-ok-${this.idCounter - 1}`);

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hide(id);
                    if (onCancel) onCancel();
                });
            }

            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    this.hide(id);
                    if (onConfirm) onConfirm();
                });
            }
        }, 10);

        return id;
    }
}

// 创建通知实例并暴露到全局
window.Notification = new Notification();

// 立即初始化通知实例
window.Notification.init();

// 页面加载时再次确保初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Notification.init();
    });
}
