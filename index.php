<?php
// 添加合理的缓存控制头
header('Cache-Control: public, max-age=86400'); // 缓存1天
header('Expires: '.gmdate('D, d M Y H:i:s', time() + 86400).' GMT');

// 包含数据库连接文件，用于CSRF令牌生成
include 'includes/db.php';

// 启动会话
session_start();

// 添加 CSP 安全头
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net fonts.googleapis.com; font-src 'self' cdnjs.cloudflare.com cdn.jsdelivr.net fonts.gstatic.com; img-src 'self' data: blob: http: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");

// 添加其他安全头
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

$pageTitle = '考勤管理系统';
$isHome = true;

// 获取文件修改时间作为版本号
function getVersion($file) {
    return file_exists($file) ? filemtime($file) : time();
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#3b82f6">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="任工记工">
    <link rel="icon" type="image/svg+xml" href="/jg/icon.svg">
    <link rel="manifest" href="/jg/manifest.json">
    <link rel="apple-touch-icon" href="/jg/icon.svg">
    <title><?php echo $pageTitle; ?></title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <!-- 合并压缩后的CSS文件 -->
    <link rel="stylesheet" href="/jg/css-new/bundle.min.css?v=<?php echo getVersion('css-new/bundle.min.css'); ?>">
    <link rel="stylesheet" href="/jg/css-new/dialog.css?v=<?php echo getVersion('css-new/dialog.css'); ?>">
    <link rel="stylesheet" href="/jg/css/holiday-theme.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="/jg/css-new/skeleton.css?v=<?php echo getVersion('css-new/skeleton.css'); ?>">
    <!-- 预加载关键资源 -->
    <!-- 只预加载最核心的脚本，其他脚本按需加载 -->
    <link rel="preload" href="/jg/js-core/event-bus.js?v=<?php echo getVersion('js-core/event-bus.js'); ?>" as="script" crossorigin="anonymous">
    <link rel="preload" href="/jg/js-core/storage.js?v=<?php echo getVersion('js-core/storage.js'); ?>" as="script" crossorigin="anonymous">
    <link rel="preload" href="/jg/js-core/intelligent-storage.js?v=<?php echo getVersion('js-core/intelligent-storage.js'); ?>" as="script" crossorigin="anonymous">
    
    <!-- 预加载合并后的CSS -->
    <link rel="preload" href="/jg/css-new/bundle.min.css?v=<?php echo getVersion('css-new/bundle.min.css'); ?>" as="style" crossorigin="anonymous">
    
    <!-- 系统设置 -->
    <script src="/jg/js/system-settings.js"></script>
    <!-- 全局版本号管理 - 统一获取版本号，避免重复代码 -->
    <script>
        (async function() {
            try {
                const response = await fetch('/jg/api/app-version.php');
                const result = await response.json();
                if (result.success && result.version) {
                    window.appVersion = result.version;
                } else {
                    window.appVersion = '1.0.0';
                }
            } catch (error) {
                window.appVersion = '1.0.0';
            }
        })();
        
        // CSRF令牌管理
        window.CSRF_TOKEN = '<?php echo generate_csrf_token(); ?>';
        
        // 为fetch请求添加CSRF令牌
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            // 只对API请求添加CSRF令牌
            if (url.includes('/api/') && options.method && options.method !== 'GET') {
                // 确保options.headers存在
                if (!options.headers) {
                    options.headers = {};
                }
                
                // 处理JSON请求
                if (options.headers['Content-Type'] === 'application/json' || !options.headers['Content-Type']) {
                    // 解析请求体
                    let body = options.body;
                    if (typeof body === 'string') {
                        try {
                            body = JSON.parse(body);
                        } catch (e) {
                            // 不是JSON，保持原样
                        }
                    }
                    
                    // 添加CSRF令牌
                    if (typeof body === 'object' && body !== null) {
                        body.csrf_token = window.CSRF_TOKEN;
                        options.body = JSON.stringify(body);
                    }
                }
            }
            return originalFetch(url, options);
        };

        // 立即执行loadSystemName函数
        (async function() {
            try {
                await loadSystemName({
                    elements: [
                        {
                            selector: '.app-logo',
                            type: 'html',
                            template: '<i class="fas fa-hard-hat"></i> {{systemName}}'
                        }
                    ]
                });
            } catch (error) {
                // 加载失败
            }
        })();

        // 页面加载完成后再次执行，确保所有元素都已加载
        window.addEventListener('load', async function() {
            try {
                await loadSystemName({
                    elements: [
                        {
                            selector: '.app-logo',
                            type: 'html',
                            template: '<i class="fas fa-hard-hat"></i> {{systemName}}'
                        }
                    ]
                });
            } catch (error) {
                // 加载失败
            }
        });
    </script>
</head>
<body>
    <!-- 顶部进度条 -->
    <div id="top-progress-bar" class="top-progress-bar">
        <div class="top-progress-bar-inner"></div>
    </div>

    <!-- 骨架屏 -->
    <div id="skeleton-container" class="skeleton-container">
        <!-- 头部骨架 -->
        <div class="skeleton-header">
            <div class="skeleton skeleton-logo"></div>
            <div class="skeleton-nav">
                <div class="skeleton skeleton-nav-item"></div>
                <div class="skeleton skeleton-nav-item"></div>
                <div class="skeleton skeleton-nav-item"></div>
            </div>
        </div>

        <!-- 个人信息骨架 -->
        <div class="skeleton-personal-info">
            <div class="skeleton-info-header">
                <div class="skeleton skeleton-info-title"></div>
                <div class="skeleton skeleton-info-action"></div>
            </div>
            <div class="skeleton-info-grid">
                <div class="skeleton-info-item">
                    <div class="skeleton skeleton-info-label"></div>
                    <div class="skeleton skeleton-info-value"></div>
                </div>
                <div class="skeleton-info-item">
                    <div class="skeleton skeleton-info-label"></div>
                    <div class="skeleton skeleton-info-value"></div>
                </div>
                <div class="skeleton-info-item">
                    <div class="skeleton skeleton-info-label"></div>
                    <div class="skeleton skeleton-info-value"></div>
                </div>
                <div class="skeleton-info-item">
                    <div class="skeleton skeleton-info-label"></div>
                    <div class="skeleton skeleton-info-value"></div>
                </div>
            </div>
        </div>

        <!-- 统计卡片骨架 -->
        <div class="skeleton-stats">
            <div class="skeleton-stat-card">
                <div class="skeleton skeleton-stat-label"></div>
                <div class="skeleton skeleton-stat-value"></div>
                <div class="skeleton skeleton-stat-change"></div>
            </div>
            <div class="skeleton-stat-card">
                <div class="skeleton skeleton-stat-label"></div>
                <div class="skeleton skeleton-stat-value"></div>
                <div class="skeleton skeleton-stat-change"></div>
            </div>
            <div class="skeleton-stat-card">
                <div class="skeleton skeleton-stat-label"></div>
                <div class="skeleton skeleton-stat-value"></div>
                <div class="skeleton skeleton-stat-change"></div>
            </div>
        </div>

        <!-- 日历骨架 -->
        <div class="skeleton-calendar">
            <div class="skeleton-calendar-header">
                <div class="skeleton skeleton-calendar-title"></div>
                <div class="skeleton-calendar-nav">
                    <div class="skeleton skeleton-calendar-btn"></div>
                    <div class="skeleton skeleton-calendar-btn"></div>
                </div>
            </div>
            <div class="skeleton-weekdays">
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
                <div class="skeleton skeleton-weekday"></div>
            </div>
            <div class="skeleton-days">
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
                <div class="skeleton skeleton-day"></div>
            </div>
        </div>

        <!-- 工作记录表格骨架 -->
        <div class="skeleton-work-table">
            <div class="skeleton-table-header">
                <div class="skeleton skeleton-table-title"></div>
            </div>
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
        </div>

        <!-- 项目列表骨架 -->
        <div class="skeleton-projects">
            <div class="skeleton-projects-header">
                <div class="skeleton skeleton-projects-title"></div>
                <div class="skeleton skeleton-projects-action"></div>
            </div>
            <div class="skeleton-project-list">
                <div class="skeleton-project-item">
                    <div class="skeleton skeleton-project-icon"></div>
                    <div class="skeleton-project-info">
                        <div class="skeleton skeleton-project-name"></div>
                        <div class="skeleton skeleton-project-desc"></div>
                    </div>
                </div>
                <div class="skeleton-project-item">
                    <div class="skeleton skeleton-project-icon"></div>
                    <div class="skeleton-project-info">
                        <div class="skeleton skeleton-project-name"></div>
                        <div class="skeleton skeleton-project-desc"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 主内容（初始显示，即使没有数据） -->
    <div id="app-content" class="app-content" style="opacity: 0; transition: opacity 0.5s ease-in-out;">
        <header class="app-header">
            <div class="app-header-content">
                <div class="app-logo">
                    <i class="fas fa-hard-hat"></i>
                    任工记工
                </div>
                <div class="flex items-center gap-2">
                    <a href="/jg/html-new/attendance-station.php" class="menu-btn" title="考勤站">
                        <i class="fas fa-clock"></i>
                    </a>
                    <button class="menu-btn" data-action="toggle-menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <button id="theme-toggle" class="menu-btn" title="切换主题">
                        <i class="fas fa-moon"></i>
                    </button>
                    <div id="loginIcon" class="menu-btn" title="登录">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
            </div>
        </header>
        <main class="app-main">
            <!-- HomePage内容将在这里动态生成 -->
        </main>
    </div>

    <!-- 页面样式 -->
    <style>
        .app-content {
            transition: opacity 0.3s ease;
        }

        /* 加载状态指示器样式 */
        .loading-indicator {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: rgba(255,255,255,0.9);
            z-index: 9999;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .loading-logo {
            font-size: 60px;
            color: #165DFF;
            margin-bottom: 30px;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #165DFF;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }

        .loading-text {
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* 数据加载状态样式 */
        .data-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px;
            color: #666;
        }

        .data-loading .loading-spinner {
            width: 30px;
            height: 30px;
            margin-right: 10px;
            margin-bottom: 0;
        }
    </style>

    <!-- 核心脚本 -->
    <script>
        // 显示加载状态
        function showLoading() {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.opacity = '1';
                loadingIndicator.style.visibility = 'visible';
            }
        }

        // 隐藏加载状态
        function hideLoading() {
            const loadingIndicator = document.getElementById('loading-indicator');
            const appContent = document.getElementById('app-content');
            if (loadingIndicator) {
                loadingIndicator.style.opacity = '0';
                loadingIndicator.style.visibility = 'hidden';
            }
            if (appContent) {
                appContent.style.opacity = '1';
            }
        }

        // 显示数据加载状态
        function showDataLoading(container) {
            if (container) {
                container.innerHTML = `
                    <div class="data-loading">
                        <div class="loading-spinner"></div>
                        <span>加载数据中...</span>
                    </div>
                `;
            }
        }

        // 等待DOM加载完成
        document.addEventListener('DOMContentLoaded', async function() {
            // 解析URL参数
            function getUrlParams() {
                const params = {};
                const searchParams = new URLSearchParams(window.location.search);
                for (const [key, value] of searchParams.entries()) {
                    params[key] = value;
                }
                return params;
            }
            
            // 客户端登录状态检查
            function checkLoginStatus() {
                // 检查URL参数
                const urlParams = getUrlParams();
                if (urlParams.user_id && urlParams.admin_view) {
                    localStorage.setItem('user_id', urlParams.user_id);
                    return true;
                }
                
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
            
            // 检查并修复用户账号状态
            async function checkAndFixUser() {
                try {
                    // 检查登录状态
                    const currentUserId = localStorage.getItem('user_id');
                    const currentUserEmail = localStorage.getItem('user_email');

                    // 如果没有登录状态，返回失败，跳转到登录页
                    if (!currentUserId || !currentUserEmail) {
                        return { success: false, message: '未登录' };
                    } else {
                        return { success: true, message: '已登录' };
                    }
                } catch (error) {
                    // 发生错误时返回失败，跳转到登录页
                    return { success: false, message: '检查用户账号时发生错误: ' + error.message };
                }
            }
            
            // 检查登录状态
            if (!checkLoginStatus()) {
                // 尝试修复用户账号状态
                const result = await checkAndFixUser();
                
                // 如果修复成功，刷新页面
                if (result.success) {
                    window.location.reload();
                    return;
                } else {
                    window.location.href = '/jg/html-new/login.php';
                    return;
                }
            }
            
            // 动态加载脚本，添加错误处理
            function loadScript(src) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => {
                        resolve();
                    };
                    script.onerror = () => {
                        // 即使脚本加载失败，也继续执行，不抛出错误
                        resolve();
                    };
                    document.head.appendChild(script);
                });
            }
            
            // 加载核心脚本
            async function loadCoreScripts() {
                try {
                    // 使用全局版本号，避免重复请求
                    const version = window.appVersion || '1.0.0';

                    // 只加载最核心的脚本，其他脚本按需加载
                    await Promise.all([
                        // 基础核心脚本
                        loadScript(`/jg/js-core/event-bus.js?v=${version}`),
                        loadScript(`/jg/js-core/utils.js?v=${version}`),
                        loadScript(`/jg/js-core/logger.js?v=${version}`),
                        // 存储相关脚本
                        loadScript(`/jg/js-core/storage.js?v=${version}`),
                        loadScript(`/jg/js-core/intelligent-storage.js?v=${version}`),
                        // 图片懒加载
                        loadScript(`/jg/js-core/lazy-load.js?v=${version}`),
                        // 共享组件
                        loadScript(`/jg/js-shared/theme.js?v=${version}`),
                        loadScript(`/jg/js-shared/login-icon.js?v=${version}`),
                        // UI组件
                        loadScript(`/jg/js-components/dialog.js?v=${version}`),
                        loadScript(`/jg/js-components/toast.js?v=${version}`),
                        // 页面脚本
                        loadScript(`/jg/js-pages/home.js?v=${version}`)
                    ]);
                    
                    // 加载非核心脚本（不延迟，确保功能可用）
                    const nonCoreScriptsPromise = Promise.all([
                        loadScript(`/jg/js/attendance-alert.js?v=${version}`),
                        loadScript(`/jg/js/weekly-report.js?v=${version}`),
                        loadScript(`/jg/js-core/holiday-theme.js?v=${version}`),
                        loadScript(`/jg/js-shared/menu-handler.js?v=${version}`)
                    ]).catch(error => {
                        // 非核心脚本加载失败不影响主功能
                        console.warn('非核心脚本加载失败:', error.message);
                        return null;
                    });
                    
                    return nonCoreScriptsPromise;
                } catch (error) {
                    // 即使出现错误，也继续执行
                    return false;
                }
            }

            // 实现真正的懒加载，使用动态导入（import()）来实现更高效的懒加载
            const lazyLoadScripts = {
                // 导出模板脚本 - 仅在导出功能需要时加载
                exportTemplates: async () => {
                    if (!window.exportTemplatesLoaded) {
                        try {
                            // 使用动态导入
                            await import(`/jg/js-core/export-templates.js?v=1.0.0`);
                            window.exportTemplatesLoaded = true;
                        } catch (error) {
                            // 降级方案：使用传统脚本加载
                            await loadScript(`/jg/js-core/export-templates.js?v=1.0.0`);
                            window.exportTemplatesLoaded = true;
                        }
                    }
                },
                
                // 常量脚本 - 仅在需要时加载
                constants: async () => {
                    if (!window.constantsLoaded) {
                        try {
                            await import(`/jg/js-core/constants.js?v=1.0.0`);
                            window.constantsLoaded = true;
                        } catch (error) {
                            await loadScript(`/jg/js-core/constants.js?v=1.0.0`);
                            window.constantsLoaded = true;
                        }
                    }
                },
                
                // 表单对话框脚本 - 仅在需要时加载
                formDialog: async () => {
                    if (!window.formDialogLoaded) {
                        try {
                            await import(`/jg/js-components/form-dialog.js?v=1.0.0`);
                            window.formDialogLoaded = true;
                        } catch (error) {
                            await loadScript(`/jg/js-components/form-dialog.js?v=1.0.0`);
                            window.formDialogLoaded = true;
                        }
                    }
                },
                
                // 节日效果脚本 - 仅在需要时加载
                festivalEffect: async () => {
                    if (!window.festivalEffectLoaded) {
                        try {
                            await import(`/jg/js-components/festival-effect.js?v=1.0.0`);
                            window.festivalEffectLoaded = true;
                        } catch (error) {
                            await loadScript(`/jg/js-components/festival-effect.js?v=1.0.0`);
                            window.festivalEffectLoaded = true;
                        }
                    }
                }
            };
            
            // 暴露懒加载函数到全局
            window.lazyLoadScripts = lazyLoadScripts;
            
            // 延迟加载一些可能很快需要的脚本
            function loadNonCoreScripts() {
                // 只加载可能很快需要的脚本，其他的按需加载
                const version = '1.0.0';
                
                // 加载常量脚本，因为它可能被其他模块使用
                loadScript(`/jg/js-core/constants.js?v=${version}`).catch(() => {});

                // 节日效果脚本可以延迟加载
                setTimeout(() => {
                    loadScript(`/jg/js-components/festival-effect.js?v=${version}`).catch(() => {});
                }, 2000);
            }
            
            // 快速检查依赖是否加载完成
            function checkDependencies() {
                const requiredClasses = [
                    'EventBus',
                    'LocalStorageManager',
                    'IntelligentStorageManager',
                    'Logger', 
                    'ThemeManager',
                    'loginIconManager',
                    'Toast',
                    'Dialog',
                    'HomePage'
                ];
                
                const missingClasses = [];
                for (const className of requiredClasses) {
                    if (!window[className]) {
                        missingClasses.push(className);
                    }
                }
                
                return {
                    allLoaded: missingClasses.length === 0,
                    missingClasses: missingClasses
                };
            }
            
            // 显示数据加载状态，等待实际数据加载
            const container = document.querySelector('.app-main');
            if (container) {
                container.innerHTML = `
                    <div class="container">
                        <div class="section">
                            <div class="data-loading">
                                <div class="loading-spinner"></div>
                                <span>加载数据中...</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // 加载脚本
            try {
                // 等待核心脚本和非核心脚本都加载完成
                await loadCoreScripts();
                
                // 初始化应用核心组件
                
                // 确保必要的类存在
                const EventBus = window.EventBus || function() { return { on: () => {}, emit: () => {} }; };
                const LocalStorageManager = window.LocalStorageManager || function() { return { init: () => Promise.resolve(), get: () => null, getAll: () => [], set: () => true, remove: () => true }; };
                const IntelligentStorageManager = window.IntelligentStorageManager || function() { return { init: () => Promise.resolve(), setLocal: () => {}, getLocal: () => null }; };
                const Toast = window.Toast || function() { return { init: () => {}, error: () => {}, info: () => {} }; };
                const Dialog = window.Dialog || function() { return { init: () => {} }; };
                const Logger = window.Logger || { info: () => {}, error: () => {}, warn: () => {} };
                const loginIconManager = window.loginIconManager || { init: () => {} };
                const HomePage = window.HomePage || function() { return { init: () => Promise.resolve(), render: () => {} }; };
                
                // 检查 ThemeManager 是否存在
                const ThemeManager = window.ThemeManager || function() {
                    return {
                        init: () => {},
                        applyTheme: () => {},
                        toggleTheme: () => {}
                    };
                };
                
                // 初始化核心组件
                const eventBus = new EventBus();
                const storage = new IntelligentStorageManager();
                
                try {
                    await storage.init();
                } catch (storageError) {
                    // 存储初始化失败，使用默认实现
                }

                // 初始化其他组件
                const theme = new ThemeManager(storage, eventBus);
                const toast = new Toast(eventBus);
                const dialog = new Dialog(eventBus);

                // 将核心工具库实例暴露到全局
                window.eventBus = eventBus;
                window.storageManager = storage;
                window.themeManager = theme;
                window.toast = toast;
                window.dialog = dialog;
                window.logger = Logger;

                try {
                    theme.init();
                    loginIconManager.init();
                    toast.init();
                    dialog.init();
                } catch (initError) {
                    // 组件初始化失败，继续执行
                }

                // 添加toggleTheme方法
                theme.toggleTheme = function() {
                    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                    try {
                        this.storage.setLocal('theme', this.currentTheme);
                        this.applyTheme();
                        this.eventBus.emit('theme:changed', this.currentTheme);
                    } catch (e) {
                        // 主题切换失败
                    }
                };
                
                // 主题按钮的事件绑定由 theme.js 统一处理
                
                // 考勤站按钮
                const attendanceBtn = document.querySelector('a[href="/jg/html-new/attendance-station.php"]');
                if (attendanceBtn) {
                    attendanceBtn.addEventListener('click', (e) => {
                        // 允许默认跳转行为
                    });
                }
                
                // 注意：菜单按钮事件由 menu-handler.js 统一处理

                  // 初始化菜单处理器（用于分享截图等功能）
                  if (window.MenuHandler) {
                      const menuHandler = new MenuHandler({
                          toast: toast,
                          logger: Logger
                      });
                      menuHandler.init();
                  }

                  // 登录图标
                  const loginIcon = document.getElementById('loginIcon');
                  if (loginIcon) {
                      loginIcon.addEventListener('click', () => {
                          window.location.href = '/jg/html-new/user-center.php';
                      });
                  }
                
                // 创建HomePage实例
                const container = document.querySelector('.app-main');
                
                if (container && HomePage) {
                    try {
                        const homePage = new HomePage({
                            container: container,
                            eventBus: eventBus,
                            storage: storage,
                            theme: theme,
                            toast: toast,
                            dialog: dialog,
                            logger: Logger
                        });
                        
                        await homePage.init();
                        
                        // 将实例暴露到全局，方便调试
                        window.homePage = homePage;
                        
                        // 初始化考勤异常检测
                        if (window.AttendanceAlert) {
                            try {
                                const attendanceAlert = new AttendanceAlert(storage, toast, eventBus);
                                await attendanceAlert.init();
                                
                                // 立即检查一次考勤异常
                                setTimeout(async () => {
                                    try {
                                        await attendanceAlert.checkAttendanceAnomalies();
                                    } catch (checkError) {
                                        console.warn('考勤异常检查失败:', checkError.message);
                                    }
                                }, 2000); // 延迟2秒，等待数据加载完成
                            } catch (alertError) {
                                console.warn('考勤异常检测初始化失败:', alertError.message);
                            }
                        } else {
                            console.warn('AttendanceAlert 未加载，考勤异常检测功能不可用');
                        }
                        
                        // 初始化每周考勤报告
                        if (window.WeeklyReportGenerator) {
                            try {
                                const weeklyReport = new WeeklyReportGenerator(storage, toast, eventBus);
                                await weeklyReport.init();
                                
                                // 保存实例到全局，方便测试
                                window.weeklyReportInstance = weeklyReport;
                            } catch (reportError) {
                                console.warn('每周考勤报告初始化失败:', reportError.message);
                            }
                        } else {
                            console.warn('WeeklyReportGenerator 未加载，每周考勤报告功能不可用');
                        }
                        
                        // 初始化节日主题管理器
                        if (window.HolidayThemeManager) {
                            try {
                                window.holidayThemeManager = new HolidayThemeManager(storage);
                                await window.holidayThemeManager.init();
                            } catch (holidayError) {
                                console.warn('节日主题管理器初始化失败:', holidayError.message);
                            }
                        } else {
                            console.warn('HolidayThemeManager 未加载，节日主题功能不可用');
                        }
                    } catch (homePageError) {
                        console.warn('HomePage初始化失败，继续显示默认内容:', homePageError.message);
                        // 即使HomePage初始化失败，也继续显示默认内容
                    }
                } else {
                    console.warn('容器元素未找到或HomePage不可用，继续显示默认内容');
                    // 继续显示默认内容
                }
                
                // 隐藏加载状态
                hideLoading();
            } catch (error) {
                console.error('初始化应用过程中出现错误:', error);
                // 即使出现错误，也继续显示默认内容
                hideLoading();
            }
        });

        // 注册Service Worker（PWA支持）
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/jg/sw.js')
                    .then((registration) => {
                        console.log('Service Worker 注册成功:', registration.scope);
                    })
                    .catch((error) => {
                        console.log('Service Worker 注册失败:', error);
                    });
            });
        }
    </script>

<?php
include 'html-new/menu.php';
include 'html-new/footer.php';
?>
</body>
</html>