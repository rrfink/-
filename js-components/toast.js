// 常规的全局对象定义
// 使用赋值方式覆盖现有的Toast类，避免"Identifier 'Toast' has already been declared"错误
window.Toast = function(eventBus) {
    this.eventBus = eventBus;
    this.container = null;
    this.notifications = {};
    this.idCounter = 0;
    this.initialized = false;
};

window.Toast.prototype.init = function() {
    if (this.initialized) return;

    // 强制创建新的通知容器，确保位置正确
    // 先移除旧的容器
    const oldContainer = document.getElementById('toastContainer');
    if (oldContainer) {
        oldContainer.remove();
    }
    
    // 创建新的容器
    this.container = document.createElement('div');
    this.container.id = 'toastContainer';
    // 使用内联样式确保位置正确
    this.container.style.position = 'fixed';
    this.container.style.top = '80px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '99999';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    this.container.style.pointerEvents = 'none';
    // 确保容器添加到body的最前面，避免被其他元素遮挡
    document.body.insertBefore(this.container, document.body.firstChild);

    this.initialized = true;
};

window.Toast.prototype.show = function(message, type = 'info', duration = 3000) {
    this.init();

    // 检查通知设置
    const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    
    // 根据通知类型检查是否应该显示
    let shouldShow = true;
    switch (type) {
        case 'info':
            // info 类型对应考勤提醒
            if (notificationSettings.attendanceReminder === false) {
                shouldShow = false;
            }
            break;
        case 'warning':
            // warning 类型对应迟到通知
            if (notificationSettings.lateNotification === false) {
                shouldShow = false;
            }
            break;
        case 'error':
            // error 类型对应缺勤通知
            if (notificationSettings.absentNotification === false) {
                shouldShow = false;
            }
            break;
        case 'success':
            // success 类型不受限制，始终显示
            break;
    }
    
    // 如果不应该显示，直接返回
    if (!shouldShow) {
        return null;
    }

    if (!this.container) {
        console.error('Notification container not initialized');
        return null;
    }

    const id = 'notification-' + this.idCounter++;
    const notification = this.createNotification(message, type, id);

    this.container.appendChild(notification);
    this.notifications[id] = notification;

    setTimeout(() => {
        notification.classList.add('notification-shown');
    }, 10);

    if (duration > 0) {
        setTimeout(() => {
            this.hide(id);
        }, duration);
    }

    return id;
};

window.Toast.prototype.createNotification = function(message, type, id) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.id = id;

    const icon = this.getIcon(type);
    const iconElement = document.createElement('i');
    iconElement.className = 'fas ' + icon;

    const messageElement = document.createElement('div');
    messageElement.className = 'notification-message';
    messageElement.innerHTML = message;

    const closeButton = document.createElement('div');
    closeButton.className = 'notification-icon-decoration';
    closeButton.innerHTML = '<i class="fas fa-hard-hat"></i>';

    notification.appendChild(iconElement);
    notification.appendChild(messageElement);
    notification.appendChild(closeButton);

    return notification;
};

window.Toast.prototype.getIcon = function(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
};

window.Toast.prototype.hide = function(id) {
    const notification = this.notifications[id];
    if (!notification) return;

    notification.classList.add('notification-hiding');

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        delete this.notifications[id];
    }, 300);
};

window.Toast.prototype.hideAll = function() {
    Object.keys(this.notifications).forEach(id => this.hide(id));
};

window.Toast.prototype.success = function(message, duration) {
    return this.show(message, 'success', duration);
};

window.Toast.prototype.error = function(message, duration) {
    return this.show(message, 'error', duration);
};

window.Toast.prototype.warning = function(message, duration) {
    return this.show(message, 'warning', duration);
};

window.Toast.prototype.info = function(message, duration) {
    return this.show(message, 'info', duration);
};
