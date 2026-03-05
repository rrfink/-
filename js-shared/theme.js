// 条件声明，避免重复定义
if (!window.ThemeManager) {
    class ThemeManager {
        constructor(storage, eventBus) {
            this.storage = storage;
            this.eventBus = eventBus;
            this.currentTheme = 'light';
            this.customThemes = [];
        }

        init() {
            // 防止重复初始化
            if (this._initialized) {
                return;
            }
            this._initialized = true;

            this.loadTheme();
            this.loadCustomThemes();
            // 应用主题（header.php 中已设置初始主题，这里确保一致性）
            this.applyTheme();
            this.bindEvents();
        }

        // 静态方法：在页面加载前立即应用主题（避免闪烁）
        static applyThemeBeforeRender() {
            try {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) {
                    document.documentElement.setAttribute('data-theme', savedTheme);
                }
            } catch (e) {
                // 静默处理
            }
        }

        loadTheme() {
            const savedTheme = this.storage.getLocal('theme');
            this.currentTheme = savedTheme || 'light';
        }

        loadCustomThemes() {
            const savedThemes = this.storage.getLocal('customThemes');
            this.customThemes = savedThemes || [];
        }

        saveCustomThemes() {
            this.storage.setLocal('customThemes', this.customThemes);
        }

        applyTheme() {
            // 检查当前主题是否已经是目标主题，避免不必要的DOM操作（防止闪烁）
            const currentAttr = document.documentElement.getAttribute('data-theme');
            if (currentAttr !== this.currentTheme) {
                document.documentElement.setAttribute('data-theme', this.currentTheme);
            }
            this.updateThemeIcon();
            this.applyCustomThemeStyles();
        }

        applyCustomThemeStyles() {
            const customTheme = this.customThemes.find(theme => theme.id === this.currentTheme);
            if (customTheme) {
                const styleElement = document.getElementById('custom-theme-styles');
                if (styleElement) {
                    styleElement.remove();
                }
                const newStyleElement = document.createElement('style');
                newStyleElement.id = 'custom-theme-styles';
                newStyleElement.textContent = `
                    [data-theme="${customTheme.id}"] {
                        ${Object.entries(customTheme.variables).map(([key, value]) => `${key}: ${value};`).join('\n                    ')}
                    }
                `;
                document.head.appendChild(newStyleElement);
            }
        }

        updateThemeIcon() {
            const lightIcon = document.querySelector('.light-icon');
            const darkIcon = document.querySelector('.dark-icon');
            const headerThemeToggle = document.getElementById('theme-toggle');

            if (this.currentTheme === 'dark') {
                if (lightIcon) lightIcon.classList.add('hidden');
                if (darkIcon) darkIcon.classList.remove('hidden');
                if (headerThemeToggle) {
                    const icon = headerThemeToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-sun';
                    }
                }
            } else {
                if (lightIcon) lightIcon.classList.remove('hidden');
                if (darkIcon) darkIcon.classList.add('hidden');
                if (headerThemeToggle) {
                    const icon = headerThemeToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-moon';
                    }
                }
            }
        }

        toggleTheme() {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.saveTheme();
            this.applyTheme();
            this.eventBus.emit('theme:changed', this.currentTheme);
        }

        saveTheme() {
            this.storage.setLocal('theme', this.currentTheme);
        }

        setTheme(theme) {
            const validThemes = ['light', 'dark', ...this.customThemes.map(t => t.id)];
            if (!validThemes.includes(theme)) return;
            this.currentTheme = theme;
            this.saveTheme();
            this.applyTheme();
            this.eventBus.emit('theme:changed', this.currentTheme);
        }

        getTheme() {
            return this.currentTheme;
        }

        getCustomThemes() {
            return this.customThemes;
        }

        importTheme(themeData) {
            try {
                const theme = JSON.parse(themeData);
                if (!theme.id || !theme.name || !theme.variables) {
                    throw new Error('Invalid theme format');
                }
                
                const existingIndex = this.customThemes.findIndex(t => t.id === theme.id);
                if (existingIndex >= 0) {
                    this.customThemes[existingIndex] = theme;
                } else {
                    this.customThemes.push(theme);
                }
                
                this.saveCustomThemes();
                return { success: true, theme };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        exportTheme(themeId) {
            const theme = this.customThemes.find(t => t.id === themeId);
            if (!theme) {
                return { success: false, error: 'Theme not found' };
            }
            return { success: true, themeData: JSON.stringify(theme, null, 2) };
        }

        deleteTheme(themeId) {
            const themeIndex = this.customThemes.findIndex(t => t.id === themeId);
            if (themeIndex < 0) {
                return { success: false, error: 'Theme not found' };
            }
            
            if (this.currentTheme === themeId) {
                this.setTheme('light');
            }
            
            this.customThemes.splice(themeIndex, 1);
            this.saveCustomThemes();
            return { success: true };
        }

        createTheme(name, variables) {
            const themeId = `custom-${Date.now()}`;
            const theme = {
                id: themeId,
                name,
                variables,
                createdAt: new Date().toISOString()
            };
            
            this.customThemes.push(theme);
            this.saveCustomThemes();
            return { success: true, theme };
        }

        bindEvents() {
            // 使用全局标志确保事件只绑定一次
            if (window._themeEventsBound) {
                return;
            }
            window._themeEventsBound = true;

            const themeToggleBtn = document.getElementById('themeToggleBtn');
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => {
                    this.toggleTheme();
                });
            }

            const headerThemeToggleBtn = document.getElementById('theme-toggle');
            if (headerThemeToggleBtn) {
                headerThemeToggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.themeManager.toggleTheme();
                });
            }

            this.eventBus.on('theme:toggle', () => {
                this.toggleTheme();
            });
            this.eventBus.on('theme:set', (theme) => this.setTheme(theme));
            this.eventBus.on('theme:import', (themeData) => this.importTheme(themeData));
            this.eventBus.on('theme:export', (themeId) => this.exportTheme(themeId));
            this.eventBus.on('theme:delete', (themeId) => this.deleteTheme(themeId));
        }
    }

    // 将ThemeManager暴露为全局对象
    window.ThemeManager = ThemeManager;
}
