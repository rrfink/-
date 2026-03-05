// 通用对话框组件
if (!window.Dialog) {
    class Dialog {
        constructor() {
            this.dialogs = new Map();
        }

    // 显示对话框
    show(options) {
        const {
            title,
            htmlContent,
            showConfirm = true,
            showCancel = true,
            confirmText = '确定',
            cancelText = '取消',
            onConfirm,
            onCancel,
            onShow
        } = options;

        // 生成唯一ID
        const id = `dialog-${Date.now()}`;

        // 检查是否已经存在对话框，如果存在则移除
        const existingDialog = document.getElementById(id);
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }

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
            background-color: var(--card-bg);
            padding: 24px;
            border-radius: var(--border-radius-lg);
            width: 90%;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            color: var(--text-color);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
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
            background: var(--bg-tertiary);
            border: none;
            font-size: 14px;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        `;

        // 添加关闭按钮悬停效果
        closeButton.onmouseenter = () => {
            closeButton.style.backgroundColor = 'var(--error-color)';
            closeButton.style.color = 'white';
            closeButton.style.transform = 'rotate(90deg)';
        };
        closeButton.onmouseleave = () => {
            closeButton.style.backgroundColor = 'var(--bg-tertiary)';
            closeButton.style.color = 'var(--text-secondary)';
            closeButton.style.transform = 'rotate(0deg)';
        };

        // 组装标题容器
        titleContainer.appendChild(dialogTitle);
        titleContainer.appendChild(closeButton);

        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.className = 'dialog-content-body';
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
        let cancelButton = null;
        if (showCancel) {
            cancelButton = document.createElement('button');
            cancelButton.textContent = cancelText;
            cancelButton.style.cssText = `
                padding: 8px 16px;
                border: 1px solid var(--border-color);
                background-color: var(--bg-tertiary);
                color: var(--text-color);
                border-radius: var(--border-radius-sm);
                cursor: pointer;
            `;
            buttonContainer.appendChild(cancelButton);
        }

        // 创建确认按钮
        let confirmButton = null;
        if (showConfirm) {
            confirmButton = document.createElement('button');
            confirmButton.textContent = confirmText;
            confirmButton.style.cssText = `
                padding: 8px 16px;
                border: 1px solid var(--primary-color);
                background-color: var(--primary-color);
                color: white;
                border-radius: var(--border-radius-sm);
                cursor: pointer;
            `;
            buttonContainer.appendChild(confirmButton);
        }

        // 组装对话框
        dialogContent.appendChild(titleContainer);
        dialogContent.appendChild(contentContainer);
        dialogContent.appendChild(buttonContainer);
        dialogContainer.appendChild(dialogContent);

        // 添加到页面
        document.body.appendChild(dialogContainer);

        // 存储对话框引用
        this.dialogs.set(id, dialogContainer);

        // 调用 onShow 回调
        if (onShow) {
            setTimeout(() => {
                onShow();
            }, 100);
        }

        // 关闭按钮事件（在添加到页面后绑定）
        closeButton.onclick = () => {
            this.close(id);
            if (onCancel) {
                onCancel();
            }
        };

        // 取消按钮事件（在添加到页面后绑定）
        if (cancelButton) {
            cancelButton.onclick = () => {
                this.close(id);
                if (onCancel) {
                    onCancel();
                }
            };
        }

        // 确认按钮事件（在添加到页面后绑定）
        if (confirmButton) {
            confirmButton.onclick = async () => {
                if (onConfirm) {
                    // 后台执行保存操作（不阻塞）
                    try {
                        await onConfirm();
                        // 操作成功后关闭对话框
                        this.close(id);
                    } catch (error) {
                        console.error('Error in dialog confirm:', error);
                        if (window.toast) {
                            window.toast.error(error.message || '操作失败');
                        } else {
                            alert(error.message || '操作失败');
                        }
                    }
                } else {
                    this.close(id);
                }
            };
        }

        // 点击背景关闭
        dialogContainer.onclick = (e) => {
            if (e.target === dialogContainer) {
                this.close(id);
                if (onCancel) {
                    onCancel();
                }
            }
        };

        // 动态添加样式到head - 只设置基本样式，不覆盖验证状态
        let dialogStyles = document.getElementById('dialog-dynamic-styles');
        if (!dialogStyles) {
            dialogStyles = document.createElement('style');
            dialogStyles.id = 'dialog-dynamic-styles';
            dialogStyles.textContent = `
                .dialog-content-body input,
                .dialog-content-body select,
                .dialog-content-body textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    font-size: 14px;
                    color: var(--text-color);
                    background-color: var(--bg-light);
                    width: 100%;
                    box-sizing: border-box;
                    transition: all var(--transition-fast);
                }
                .dialog-content-body input:focus,
                .dialog-content-body select:focus,
                .dialog-content-body textarea:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
                }
                .dialog-content-body input::placeholder,
                .dialog-content-body textarea::placeholder {
                    color: var(--text-light);
                }
                .dialog-content-body input:invalid,
                .dialog-content-body select:invalid,
                .dialog-content-body textarea:invalid {
                    border-color: var(--error-color);
                }
                .dialog-content-body input:valid,
                .dialog-content-body select:valid,
                .dialog-content-body textarea:valid {
                    border-color: var(--success-color);
                }
                .dialog-content-body label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-color);
                }
                .dialog-content-body .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }
            `;
            document.head.appendChild(dialogStyles);
        }

        return id;
    }

    // 关闭对话框
    close(id) {
        const dialogContainer = this.dialogs.get(id);
        if (dialogContainer && dialogContainer.parentNode) {
            document.body.removeChild(dialogContainer);
            this.dialogs.delete(id);
        }
    }

    // 隐藏对话框（别名方法）
    hide() {
        this.closeAll();
    }

    // 关闭所有对话框
    closeAll() {
        for (const id of this.dialogs.keys()) {
            this.close(id);
        }
    }

    // 初始化方法
    init() {
        // 初始化逻辑
    }
}

// 将对话框实例暴露到全局作用域
window.Dialog = Dialog;
window.dialog = new Dialog();
}
