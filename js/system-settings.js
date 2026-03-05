// 通用的加载系统名称函数
async function loadSystemName(options = {}) {
    try {
        // 从数据库加载系统名称
        const response = await fetch('/jg/api/get-settings.php');
        const result = await response.json();

        if (result.success && result.settings && result.settings.systemName) {
            // 更新页面标题
            if (options.updateTitle !== false) {
                if (document.title.includes('任工记工')) {
                    document.title = document.title.replace('任工记工', result.settings.systemName);
                } else {
                    document.title = result.settings.systemName;
                }
            }

            // 更新指定的元素
            if (options.elements && Array.isArray(options.elements)) {
                options.elements.forEach(elementInfo => {
                    const element = document.querySelector(elementInfo.selector);
                    if (element) {
                        if (elementInfo.type === 'text') {
                            if (element.textContent.includes('任工记工')) {
                                element.textContent = element.textContent.replace('任工记工', result.settings.systemName);
                            } else {
                                element.textContent = result.settings.systemName;
                            }
                        } else if (elementInfo.type === 'html') {
                            element.innerHTML = elementInfo.template.replace('{{systemName}}', result.settings.systemName);
                        }
                    }
                });
            }

            // 将数据库中的系统名称保存到localStorage
            const settings = result.settings;
            localStorage.setItem('systemSettings', JSON.stringify(settings));
        } else {
            // 从localStorage加载系统名称
            const savedSettings = localStorage.getItem('systemSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.systemName) {
                    // 更新页面标题
                    if (options.updateTitle !== false) {
                        if (document.title.includes('任工记工')) {
                            document.title = document.title.replace('任工记工', settings.systemName);
                        } else {
                            document.title = settings.systemName;
                        }
                    }

                    // 更新指定的元素
                    if (options.elements && Array.isArray(options.elements)) {
                        options.elements.forEach(elementInfo => {
                            const element = document.querySelector(elementInfo.selector);
                            if (element) {
                                if (elementInfo.type === 'text') {
                                    if (element.textContent.includes('任工记工')) {
                                        element.textContent = element.textContent.replace('任工记工', settings.systemName);
                                    } else {
                                        element.textContent = settings.systemName;
                                    }
                                } else if (elementInfo.type === 'html') {
                                    element.innerHTML = elementInfo.template.replace('{{systemName}}', settings.systemName);
                                }
                            }
                        });
                    }
                }
            }
        }
    } catch (error) {
        // 加载失败时从localStorage加载
        try {
            const savedSettings = localStorage.getItem('systemSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.systemName) {
                    // 更新页面标题
                    if (options.updateTitle !== false) {
                        if (document.title.includes('任工记工')) {
                            document.title = document.title.replace('任工记工', settings.systemName);
                        } else {
                            document.title = settings.systemName;
                        }
                    }

                    // 更新指定的元素
                    if (options.elements && Array.isArray(options.elements)) {
                        options.elements.forEach(elementInfo => {
                            const element = document.querySelector(elementInfo.selector);
                            if (element) {
                                if (elementInfo.type === 'text') {
                                    if (element.textContent.includes('任工记工')) {
                                        element.textContent = element.textContent.replace('任工记工', settings.systemName);
                                    } else {
                                        element.textContent = settings.systemName;
                                    }
                                } else if (elementInfo.type === 'html') {
                                    element.innerHTML = elementInfo.template.replace('{{systemName}}', settings.systemName);
                                }
                            }
                        });
                    }
                }
            }
        } catch (localStorageError) {
            // 从localStorage加载失败
        }
    }
}
