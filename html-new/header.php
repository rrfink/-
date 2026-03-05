<?php
// 包含数据库连接文件，用于CSRF令牌生成
include_once '../includes/db.php';

// 检查session是否已启动
if (session_status() === PHP_SESSION_NONE) {
    // 配置session cookie参数（必须在session_start之前）
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_secure', '0');
    
    // 启动会话（必须在任何输出之前）
    session_start();
}

// 对于动态页面，禁用缓存以确保CSRF token正确
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

// 添加 CSP 安全头
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdnjs.cloudflare.com fonts.googleapis.com; font-src 'self' cdnjs.cloudflare.com cdnjs.cloudflare.com fonts.gstatic.com; img-src 'self' data: blob: http: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");

// 添加其他安全头
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

$pageTitle = isset($pageTitle) ? $pageTitle : '任工记工考勤管理系统';
$isHome = isset($isHome) ? $isHome : false;
$activeClass = $isHome ? 'active' : '';
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#165DFF">
    <link rel="icon" type="image/svg+xml" href="/jg/icon.svg">
    <title><?php echo $pageTitle; ?></title>

    <!-- 立即初始化主题，避免主题切换闪烁 - 在页面渲染前应用主题 -->
    <script>
        (function() {
            try {
                const savedTheme = localStorage.getItem('theme') || 'light';
                // 使用 data-theme 属性与 CSS 变量保持一致
                document.documentElement.setAttribute('data-theme', savedTheme);
            } catch (e) {
                // 静默处理
            }
        })();
    </script>

    <!-- 预加载关键资源 -->
    <link rel="preload" href="/jg/css-new/bundle.min.css?v=2.1" as="style">
    <link rel="preload" href="/jg/js-core/event-bus.js" as="script">
    <link rel="preload" href="/jg/js-core/storage.js" as="script">
    <link rel="preload" href="/jg/js-core/intelligent-storage.js" as="script">
    <link rel="preload" href="/jg/js-core/logger.js" as="script">
    <link rel="preload" href="/jg/js-core/version-check.js" as="script">
    <link rel="preload" href="/jg/js-shared/theme.js?v=2.4" as="script">
    <link rel="preload" href="/jg/js-shared/login-icon.js" as="script">
    <link rel="preload" href="/jg/js-components/toast.js" as="script">
    <link rel="preload" href="/jg/js-components/dialog.js" as="script">
    
    <!-- 预解析DNS -->
    <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
    <link rel="dns-prefetch" href="//cdn.jsdelivr.net">
    
    <!-- 预建立连接 -->
    <link rel="preconnect" href="//cdnjs.cloudflare.com" crossorigin>
    <link rel="preconnect" href="//cdn.jsdelivr.net" crossorigin>
    
    <!-- 样式和脚本 -->
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/jg/css-new/variables.css?v=2.1">
    <link rel="stylesheet" href="/jg/css-new/bundle.min.css?v=2.1">
    <link rel="stylesheet" href="/jg/css-new/dialog.css?v=2.1">
    
    <!-- 核心脚本 -->
    <script src="/jg/js-core/event-bus.js"></script>
    <script src="/jg/js-core/storage.js"></script>
    <script src="/jg/js-core/intelligent-storage.js"></script>
    <script src="/jg/js-core/logger.js"></script>
    <script src="/jg/js-core/version-check.js"></script>
    <script src="/jg/js-core/script-loader.js?v=2.4"></script>
    <script src="/jg/js-core/app-init.js?v=2.4"></script>
    
    <!-- 组件脚本 -->
    <script src="/jg/js-components/toast.js"></script>
    <script src="/jg/js-components/dialog.js"></script>
    
    <!-- 共享脚本 -->
    <script src="/jg/js-shared/theme.js?v=2.4"></script>
    <script src="/jg/js-shared/login-icon.js"></script>

    <!-- HTML2Canvas库将在需要时动态加载，用于实现页面截图功能 -->
    
    <!-- 系统设置 -->
    <script src="/jg/js/system-settings.js"></script>
    
    <!-- CSRF令牌管理 -->
    <script>
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
                
                // 处理FormData请求
                if (options.body instanceof FormData) {
                    // 检查是否已有token，避免重复添加
                    if (!options.body.has('csrf_token')) {
                        options.body.append('csrf_token', window.CSRF_TOKEN);
                    }
                }
                // 处理JSON请求
                else if (options.headers['Content-Type'] === 'application/json' || !options.headers['Content-Type']) {
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
                    if (typeof body === 'object' && body !== null && !body.csrf_token) {
                        body.csrf_token = window.CSRF_TOKEN;
                        options.body = JSON.stringify(body);
                    }
                }
            }
            return originalFetch(url, options);
        };
    </script>
    
    <!-- 加载系统名称 -->
    <script>
        // 立即执行loadSystemName函数
        (async function() {
            console.log('立即执行loadSystemName函数');
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
                console.log('loadSystemName函数执行完成');
            } catch (error) {
                console.error('执行loadSystemName函数时出错:', error);
            }
        })();
        
        // 页面加载完成后再次执行，确保所有元素都已加载
        window.addEventListener('load', async function() {
            console.log('window.load事件触发，再次执行loadSystemName函数');
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
                console.log('loadSystemName函数再次执行完成');
            } catch (error) {
                console.error('执行loadSystemName函数时出错:', error);
            }
        });
    </script>

    <!-- 注册Service Worker -->
    <script>
        // 注册Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/jg/service-worker.js')
                    .catch((error) => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }
    </script>
</head>
<body>
    <header class="app-header">
        <div class="app-header-content">
            <div class="app-logo">
                <i class="fas fa-hard-hat"></i>
                任工记工
            </div>
            <div class="flex items-center gap-2">
                <?php if (!$isHome): ?>
                <a href="/jg/index.php" class="nav-link" id="homeLink">
                    <i class="fas fa-home"></i>
                </a>
                <script>
                    // 动态设置主页链接，确保传递用户ID和管理员查看标记
                    document.addEventListener('DOMContentLoaded', function() {
                        const homeLink = document.getElementById('homeLink');
                        if (homeLink) {
                            // 解析当前URL参数
                            const urlParams = new URLSearchParams(window.location.search);
                            const user_id = urlParams.get('user_id');
                            const admin_view = urlParams.get('admin_view');
                            const return_url = urlParams.get('return_url');
                            
                            // 如果是管理员查看模式，添加参数
                            if (user_id && admin_view) {
                                let href = '/jg/index.php?user_id=' + user_id + '&admin_view=' + admin_view;
                                if (return_url) {
                                    href += '&return_url=' + encodeURIComponent(return_url);
                                }
                                homeLink.href = href;
                            }
                        }
                    });
                </script>
                <?php endif; ?>
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
