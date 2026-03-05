<?php
$pageTitle = '节日管理';
$isHome = false;
$page = 'holiday-management';
include 'header.php';
?>
    <div id="app"></div>
    
    <script>
        (async function() {
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            if (!cookieMatch && !localStorageUserId) {
                window.location.href = '/jg/html-new/login.php';
                return;
            }
            
            const loadScript = (src) => new Promise((resolve) => {
                if (document.querySelector(`script[src="${src}"]`)) return resolve();
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.head.appendChild(script);
            });
            
            try {
                // 使用全局版本号，避免重复请求
                const version = window.appVersion || '1.0.0';
                console.log('使用全局版本号:', version);
                
                // 检查核心脚本是否已加载
                const coreScriptsLoaded = window.eventBus && window.storage && window.toast && window.dialog;
                
                if (!coreScriptsLoaded) {
                    console.log('并行加载核心脚本...');
                    // 并行加载所有核心脚本，大幅减少加载时间
                    await Promise.all([
                        loadScript(`/jg/js-core/event-bus.js?v=${version}`),
                        loadScript(`/jg/js-core/logger.js?v=${version}`),
                        loadScript(`/jg/js-core/utils.js?v=${version}`),
                        loadScript(`/jg/js-core/storage.js?v=${version}`),
                        loadScript(`/jg/js-core/intelligent-storage.js?v=${version}`),
                        loadScript(`/jg/js-shared/theme.js?v=${version}`),
                        loadScript(`/jg/js-shared/login-icon.js?v=${version}`),
                        loadScript(`/jg/js-components/dialog.js?v=${version}`),
                        loadScript(`/jg/js-components/toast.js?v=${version}`),
                        loadScript(`/jg/js-components/form-dialog.js?v=${version}`),
                        loadScript(`/jg/js/holiday-utils.js?v=${version}`)
                    ]);
                    console.log('核心脚本加载完成');
                } else {
                    console.log('核心脚本已加载，跳过');
                }
                
                // 加载节日管理页面脚本
                await loadScript(`/jg/js-pages/holiday-management.js?v=${version}`);

                // 加载菜单处理器（用于分享截图等功能）
                await loadScript(`/jg/js-shared/menu-handler.js?v=${version}`);

                const EventBus = window.EventBus || function() { return { on: () => {}, emit: () => {} }; };
                const IntelligentStorageManager = window.IntelligentStorageManager || function() { return { init: () => Promise.resolve(), setLocal: () => {}, getLocal: () => null }; };
                const Toast = window.Toast || function() { return { init: () => {}, error: () => {} }; };
                const Dialog = window.Dialog || function() { return { init: () => {} }; };
                const Logger = window.Logger || { info: () => {}, error: () => {} };
                const ThemeManager = window.ThemeManager || function() { return { init: () => {} }; };
                
                const eventBus = window.eventBus || new EventBus();
                const storage = window.storage || new IntelligentStorageManager();
                const toast = window.toast || new Toast(eventBus);
                const dialog = window.dialog || new Dialog(eventBus);
                const theme = window.themeManager || new ThemeManager(storage, eventBus);
                
                if (!window.storage) {
                    await storage.init();
                    window.storage = storage;
                }
                if (!window.eventBus) window.eventBus = eventBus;
                if (!window.toast) { toast.init(); window.toast = toast; }
                if (!window.dialog) { dialog.init(); window.dialog = dialog; }
                if (!window.themeManager) { theme.init(); window.themeManager = theme; }
                if (window.loginIconManager) window.loginIconManager.init();
                
                const HolidayManagementPage = window.HolidayManagementPage || function() { return { init: () => Promise.resolve() }; };
                const page = new HolidayManagementPage({
                    container: document.getElementById('app'),
                    eventBus: eventBus,
                    storage: storage,
                    theme: theme,
                    toast: toast,
                    dialog: dialog,
                    logger: Logger
                });
                
                await page.init();

                // 初始化菜单处理器（用于分享截图等功能）
                if (window.MenuHandler) {
                    const menuHandler = new MenuHandler({
                        toast: window.toast,
                        logger: Logger
                    });
                    menuHandler.init();
                }
            } catch (e) {
                console.error('初始化失败:', e);
            }
        })();
    </script>

<?php
include 'menu.php';
include 'footer.php';
?>
</body>
</html>
