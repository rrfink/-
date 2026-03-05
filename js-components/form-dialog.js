class FormDialog {
    constructor(dialog) {
        this.dialog = dialog;
    }

    show(config) {
        const formHtml = this.createForm(config);
        
        // 适配/js-components/dialog.js中的Dialog类参数格式
        this.dialog.show({
            title: config.title || '表单',
            type: config.type || 'info',
            htmlContent: formHtml,
            cancelText: config.cancelText || '取消',
            confirmText: config.confirmText || '保存',
            showCancel: true,
            showConfirm: true,
            onCancel: config.onCancel,
            onConfirm: () => {
                const form = document.getElementById('dynamicForm');
                if (form) {
                    // 直接调用handleFormSubmit，不再触发submit事件
                    this.handleFormSubmit(form, config);
                }
            },
            onClose: config.onClose
        });

        // 不再绑定表单的submit事件，避免重复提交
        // this.bindFormEvents(config);

        // 调用 onShow 回调
        if (config.onShow) {
            setTimeout(() => {
                config.onShow();
            }, 100);
        }
    }

    createForm(config) {
        let formHtml = '<form id="dynamicForm" class="form-container">';
        
        if (config.fields) {
            config.fields.forEach(field => {
                formHtml += this.createField(field);
            });
        }
        
        formHtml += '</form>';
        return formHtml;
    }

    createField(field) {
        switch (field.type) {
            case 'text':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input 
                            type="text" 
                            class="form-input ${field.className || ''}" 
                            name="${field.name}" 
                            value="${field.value || ''}"
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                        >
                    </div>
                `;
            case 'number':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input 
                            type="number" 
                            class="form-input ${field.className || ''}" 
                            name="${field.name}" 
                            value="${field.value || ''}"
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                            ${field.min ? `min="${field.min}"` : ''}
                            ${field.max ? `max="${field.max}"` : ''}
                            ${field.step ? `step="${field.step}"` : ''}
                        >
                    </div>
                `;
            case 'select':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <select class="form-select ${field.className || ''}" name="${field.name}" ${field.required ? 'required' : ''}>
                            ${field.options.map(opt => `
                                <option value="${opt.value}" ${(field.value || field.defaultValue) === opt.value ? 'selected' : ''}>
                                    ${opt.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            case 'textarea':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <textarea 
                            class="form-textarea ${field.className || ''}" 
                            name="${field.name}" 
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                            rows="${field.rows || 4}"
                        >${field.value || ''}</textarea>
                    </div>
                    `;
            case 'date':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input 
                            type="date" 
                            class="form-input ${field.className || ''}" 
                            name="${field.name}" 
                            value="${field.value || ''}"
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                        >
                    </div>
                    `;
            case 'time':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input 
                            type="time" 
                            class="form-input ${field.className || ''}" 
                            name="${field.name}" 
                            value="${field.value || ''}"
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                        >
                    </div>
                    `;
            case 'checkbox':
                return `
                    <div class="form-group">
                        <div class="checkbox-container">
                            <input 
                                type="checkbox" 
                                class="form-checkbox ${field.className || ''}" 
                                name="${field.name}" 
                                ${field.checked ? 'checked' : ''}
                            >
                            <label class="checkbox-label">${field.label}</label>
                        </div>
                    </div>
                    `;
            case 'tel':
                return `
                    <div class="form-group">
                        <label class="form-label">${field.label}</label>
                        <input 
                            type="tel" 
                            class="form-input ${field.className || ''}" 
                            name="${field.name}" 
                            value="${field.value || ''}"
                            placeholder="${field.placeholder || ''}"
                            ${field.required ? 'required' : ''}
                        >
                    </div>
                    `;
            default:
                return '';
        }
    }

    bindFormEvents(config) {
        const form = document.getElementById('dynamicForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(form, config);
        });
    }

    handleFormSubmit(form, config) {
        const formData = new FormData(form);
        const data = {};
        
        // 先处理所有非checkbox字段
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // 单独处理checkbox字段，确保未选中时也有值
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        if (config.onSubmit) {
            config.onSubmit(data);
        }
    }

    handleSubmit(config) {
        const form = document.getElementById('dynamicForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }

    getFormData() {
        const form = document.getElementById('dynamicForm');
        if (!form) return null;

        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });

        return data;
    }
}

// 添加全局引用
window.FormDialog = FormDialog;


