// attendance-status.php 页面初始化脚本
// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', async function() {
    // 客户端登录状态检查
    function checkLoginStatus() {
        // 检查cookie
        const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
        if (cookieMatch) {
            return true;
        }

        // 检查localStorage
        const localStorageUserId = localStorage.getItem('user_id');
        if (localStorageUserId) {
            return true;
        }

        return false;
    }

    // 检查登录状态
    if (!checkLoginStatus()) {
        window.location.href = '/jg/html-new/login.php';
        return;
    }

    // 动态加载脚本，添加错误处理
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                resolve(src);
            };
            script.onerror = () => {
                // 即使脚本加载失败，也继续执行，不抛出错误
                resolve(src + ' (failed)');
            };
            document.head.appendChild(script);
        });
    }
    
    // 加载所有必要的脚本
    async function loadAllScripts() {
        try {
            // 获取应用版本号
            let version = '1.0.0';
            try {
                const response = await fetch('/jg/api/app-version.php');
                const result = await response.json();
                if (result.success && result.version) {
                    version = result.version;
                }
            } catch (error) {
                console.log('获取版本号失败，使用默认版本');
            }

            // 并行加载脚本，提高加载速度
            const scriptPromises = [
                loadScript(`/jg/js-core/event-bus.js?v=${version}`),
                loadScript(`/jg/js-core/storage.js?v=${version}`),
                loadScript(`/jg/js-core/intelligent-storage.js?v=${version}`),
                loadScript(`/jg/js-core/logger.js?v=${version}`),
                loadScript(`/jg/js-core/utils.js?v=${version}`),
                loadScript(`/jg/js-core/export-templates.js?v=${version}`),
                loadScript(`/jg/js-core/constants.js?v=${version}`),
                loadScript(`/jg/js-shared/theme.js?v=${version}`),
                loadScript(`/jg/js-shared/login-icon.js?v=${version}`),
                loadScript(`/jg/js-components/toast.js?v=${version}`),
                loadScript(`/jg/js-components/dialog.js?v=${version}`),
                loadScript(`/jg/js-components/form-dialog.js?v=${version}`),
                loadScript(`/jg/js-components/festival-effect.js?v=${version}`),
                loadScript(`/jg/js/attendance-alert.js?v=${version}`),
                loadScript(`/jg/js-pages/attendance-status.js?v=${version}`),
                loadScript(`/jg/js-shared/menu-handler.js?v=${version}`)
            ];

            // 等待所有脚本加载完成
            await Promise.all(scriptPromises);

            return true;
        } catch (error) {
            // 即使出现错误，也继续执行
            return false;
        }
    }
    
    // 加载所有脚本
    try {
        await loadAllScripts();

        // 使用应用初始化模块初始化核心组件
        let components;
        if (window.appInitializer) {
            components = await window.appInitializer.init();
        }
        
        // 从components中获取核心组件
        const eventBus = components ? components.eventBus : window.eventBus;
        const storage = components ? components.storage : window.storage;
        const toast = components ? components.toast : window.toast;
        const dialog = components ? components.dialog : window.dialog;

        // 初始化主题管理器
        const ThemeManager = window.ThemeManager || function() { return { init: () => {} }; };
        const theme = window.themeManager || new ThemeManager(storage, eventBus);
        if (!window.themeManager) {
            theme.init();
            window.themeManager = theme;
        }
        
        // 菜单处理逻辑（由 menu-handler.js 处理主要事件，这里只处理额外的关闭按钮）
        function setupMenu() {
            // 直接获取菜单元素
            const mobileMenu = document.getElementById('mobileMenu');

            // 创建一个简单的菜单切换函数（供其他代码使用）
            window.toggleMenu = function() {
                if (mobileMenu) {
                    if (mobileMenu.style.display === 'block' || mobileMenu.classList.contains('show')) {
                        // 关闭菜单
                        mobileMenu.classList.remove('show');
                        setTimeout(() => {
                            mobileMenu.style.display = 'none';
                        }, 300);
                    } else {
                        // 显示菜单
                        mobileMenu.style.display = 'block';
                        setTimeout(() => {
                            mobileMenu.classList.add('show');
                        }, 10);
                    }
                }
            };

            // 注意：菜单按钮、遮罩层等主要事件由 menu-handler.js 处理
            // 这里只处理关闭菜单按钮（因为它有特殊的 stopPropagation 需求）
            const closeMenuBtn = document.querySelector('.mobile-menu-close');
            if (closeMenuBtn) {
                closeMenuBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.toggleMenu();
                });
            }
            
            // 为所有具有data-action="close-menu"属性的元素添加点击事件监听器
            const closeMenuElements = document.querySelectorAll('[data-action="close-menu"]');
            closeMenuElements.forEach((element) => {
                element.onclick = function(e) {
                    e.stopPropagation();
                    toggleMenu();
                };
            });
            
            // 为所有具有data-action="toggle-menu"属性的元素添加点击事件监听器
            const toggleMenuElements = document.querySelectorAll('[data-action="toggle-menu"]');
            toggleMenuElements.forEach((element) => {
                element.onclick = function() {
                    toggleMenu();
                };
            });
        }
        
        // 调用菜单设置函数
        setupMenu();;

        // 初始化菜单处理器（用于分享截图等功能）
        if (window.MenuHandler) {
            const menuHandler = new MenuHandler({
                toast: window.toast || { success: () => {}, error: () => {}, info: () => {} },
                logger: window.logger || { info: () => {}, error: () => {} }
            });
            menuHandler.init();
        }

        // 初始化AttendanceStatus类
        // 确保AttendanceStatus类存在
        if (window.AttendanceStatus) {
            // 创建AttendanceStatus实例
            const attendanceStatus = new AttendanceStatus({
                storage: storage,
                eventBus: eventBus,
                toast: toast,
                dialog: dialog
            });
            
            // 初始化AttendanceStatus
            try {
                await attendanceStatus.init();
                
                // 初始化考勤异常检测
                if (window.AttendanceAlert) {
                    window.attendanceAlertInstance = new window.AttendanceAlert(storage, toast);
                    window.attendanceAlertInstance.init();
                }
            } catch (error) {
                // 初始化失败，静默处理
            }
        }
    } catch (error) {
        // 初始化过程中出现错误，静默处理
    }
});
