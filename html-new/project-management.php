<?php
$pageTitle = '项目管理 - 任工记工';
$page = 'project';
include 'header.php';
?>
    <link rel="stylesheet" href="/jg/css-new/project-management.css?v=2.3">
    <link rel="stylesheet" href="/jg/css-new/skeleton.css?v=<?php echo file_exists('css-new/skeleton.css') ? filemtime('css-new/skeleton.css') : time(); ?>
    <style>
        /* 项目管理页骨架屏样式 */
        .project-skeleton-container {
            display: none;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .project-skeleton-container.active {
            display: block;
        }
        
        .project-skeleton-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding: 20px;
            background: var(--card-bg, #fff);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .project-skeleton-title {
            width: 120px;
            height: 28px;
        }
        
        .project-skeleton-actions {
            display: flex;
            gap: 12px;
        }
        
        .project-skeleton-btn {
            width: 100px;
            height: 36px;
            border-radius: 6px;
        }
        
        .project-skeleton-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .project-skeleton-stat-card {
            background: var(--card-bg, #fff);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .project-skeleton-stat-label {
            width: 80px;
            height: 14px;
            margin-bottom: 12px;
        }
        
        .project-skeleton-stat-value {
            width: 60px;
            height: 28px;
        }
        
        .project-skeleton-table {
            background: var(--card-bg, #fff);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .project-skeleton-table-header {
            display: flex;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            margin-bottom: 16px;
        }
        
        .project-skeleton-th {
            flex: 1;
            height: 20px;
        }
        
        .project-skeleton-table-row {
            display: flex;
            gap: 16px;
            padding: 16px 0;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        
        .project-skeleton-td {
            flex: 1;
            height: 20px;
        }
        
        .project-skeleton-td:first-child {
            flex: 0 0 50px;
        }
        
        #app.hidden {
            display: none;
        }
        /* 表格容器 - 强制无滚动条 */
        .desktop-table {
            overflow-x: hidden !important;
            width: 100% !important;
        }
        /* 表格样式 */
        #projectTable {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
        }
        #projectTable td {
            text-align: left !important;
            vertical-align: middle !important;
            padding: 10px 8px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        /* 百分比列宽 - 6列总和100% */
        #projectTable td:first-child { width: 5% !important; }
        #projectTable td:nth-child(2) { width: 18% !important; }
        #projectTable td:nth-child(3) { width: 28% !important; }
        #projectTable td:nth-child(4) { width: 12% !important; }
        #projectTable td:nth-child(5) { width: 15% !important; }
        #projectTable td:nth-child(6) { width: 22% !important; }
    </style>
    <!-- 顶部进度条 -->
    <div id="top-progress-bar" class="top-progress-bar">
        <div class="top-progress-bar-inner"></div>
    </div>

    <!-- 骨架屏 -->
    <div id="project-skeleton-container" class="project-skeleton-container">
        <!-- 头部骨架 -->
        <div class="project-skeleton-header">
            <div class="skeleton project-skeleton-title"></div>
            <div class="project-skeleton-actions">
                <div class="skeleton project-skeleton-btn"></div>
                <div class="skeleton project-skeleton-btn"></div>
            </div>
        </div>

        <!-- 统计卡片骨架 -->
        <div class="project-skeleton-stats">
            <div class="project-skeleton-stat-card">
                <div class="skeleton project-skeleton-stat-label"></div>
                <div class="skeleton project-skeleton-stat-value"></div>
            </div>
            <div class="project-skeleton-stat-card">
                <div class="skeleton project-skeleton-stat-label"></div>
                <div class="skeleton project-skeleton-stat-value"></div>
            </div>
            <div class="project-skeleton-stat-card">
                <div class="skeleton project-skeleton-stat-label"></div>
                <div class="skeleton project-skeleton-stat-value"></div>
            </div>
            <div class="project-skeleton-stat-card">
                <div class="skeleton project-skeleton-stat-label"></div>
                <div class="skeleton project-skeleton-stat-value"></div>
            </div>
        </div>

        <!-- 表格骨架 -->
        <div class="project-skeleton-table">
            <div class="project-skeleton-table-header">
                <div class="skeleton project-skeleton-th" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-th"></div>
                <div class="skeleton project-skeleton-th"></div>
                <div class="skeleton project-skeleton-th"></div>
                <div class="skeleton project-skeleton-th"></div>
                <div class="skeleton project-skeleton-th"></div>
            </div>
            <div class="project-skeleton-table-row">
                <div class="skeleton project-skeleton-td" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
            </div>
            <div class="project-skeleton-table-row">
                <div class="skeleton project-skeleton-td" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
            </div>
            <div class="project-skeleton-table-row">
                <div class="skeleton project-skeleton-td" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
            </div>
            <div class="project-skeleton-table-row">
                <div class="skeleton project-skeleton-td" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
            </div>
            <div class="project-skeleton-table-row">
                <div class="skeleton project-skeleton-td" style="flex: 0 0 50px;"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
                <div class="skeleton project-skeleton-td"></div>
            </div>
        </div>
    </div>

    <div id="app"></div>
    
    <script>
        // 显示骨架屏和进度条
        function showProjectSkeleton() {
            const skeletonContainer = document.getElementById('project-skeleton-container');
            const app = document.getElementById('app');
            const progressBar = document.getElementById('top-progress-bar');
            if (skeletonContainer) skeletonContainer.classList.add('active');
            if (app) app.classList.add('hidden');
            if (progressBar) progressBar.classList.add('active');
        }
        
        // 隐藏骨架屏和进度条
        function hideProjectSkeleton() {
            const skeletonContainer = document.getElementById('project-skeleton-container');
            const app = document.getElementById('app');
            const progressBar = document.getElementById('top-progress-bar');
            if (skeletonContainer) skeletonContainer.classList.remove('active');
            if (app) app.classList.remove('hidden');
            if (progressBar) progressBar.classList.remove('active');
        }
        
        (async function() {
            // 先显示骨架屏
            showProjectSkeleton();
            
            const cookieMatch = document.cookie.match(/user_id=([^;]+)/);
            const localStorageUserId = localStorage.getItem('user_id');
            if (!cookieMatch && !localStorageUserId) {
                window.location.href = '/jg/html-new/login.php';
                return;
            }
            
            const loadScript = (src) => new Promise((resolve) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    return resolve();
                }
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
                
                // 加载项目管理页面脚本
                await loadScript(`/jg/js-pages/project-management.js?v=${version}`);

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
                
                const ProjectManagementPage = window.ProjectManagementPage || function() { return { init: () => Promise.resolve() }; };
                const page = new ProjectManagementPage({
                    container: document.getElementById('app'),
                    eventBus: eventBus,
                    storage: storage,
                    theme: theme,
                    toast: toast,
                    dialog: dialog,
                    logger: Logger
                });
                
                await page.init();
                
                // 页面初始化完成，隐藏骨架屏
                hideProjectSkeleton();

                // 初始化菜单处理器（用于分享截图等功能）
                if (window.MenuHandler) {
                    const menuHandler = new MenuHandler({
                        toast: window.toast,
                        logger: window.logger || Logger
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
