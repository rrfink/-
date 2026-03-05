<?php
$pageTitle = '个人中心';
$isHome = false;
$page = 'user-center';
include 'header.php';
?>
    <div id="app"></div>
    
    <script>
        (async function() {
            // 检查是否为管理员查看模式
            const urlParams = new URLSearchParams(window.location.search);
            const adminView = urlParams.get('admin_view') === '1';
            
            // 非管理员模式下才检查登录状态
            if (!adminView) {
                const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
                const localStorageUserId = localStorage.getItem('user_id');
                if (!cookieMatch && !localStorageUserId) {
                    window.location.href = '/jg/html-new/login.php';
                    return;
                }
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

                // 检查核心脚本是否已加载
                const coreScriptsLoaded = window.eventBus && window.storage && window.toast && window.dialog;

                if (!coreScriptsLoaded) {
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
                        loadScript(`/jg/js-components/form-dialog.js?v=${version}`)
                    ]);
                }
                
                // 加载个人中心页面脚本
                await loadScript(`/jg/js-pages/user-center.js?v=${version}`);

                // 加载菜单处理器（用于分享截图等功能）
                await loadScript(`/jg/js-shared/menu-handler.js?v=${version}`);

                const EventBus = window.EventBus || function() { return { on: () => {}, emit: () => {} }; };
                const IntelligentStorageManager = window.IntelligentStorageManager || function() { return { init: () => Promise.resolve(), setLocal: () => {}, getLocal: () => null }; };
                const Toast = window.Toast || function() { return { init: () => {}, error: () => {}, success: () => {} }; };
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
                
                const UserCenterPage = window.UserCenterPage || function() { return { init: () => Promise.resolve() }; };
                const page = new UserCenterPage({
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
                // 初始化失败
            }
        })();
    </script>

<?php
include 'menu.php';
include 'footer.php';
?>
</body>
</html>
