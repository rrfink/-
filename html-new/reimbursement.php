<?php
$pageTitle = '报销管理 - 任工记工';
$isHome = false;
$page = 'reimbursement';
include 'header.php';
?>
    <link rel="stylesheet" href="/jg/css-new/reimbursement.css">
    <main class="app-main">
        <div class="container">
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title"><i class="fas fa-receipt"></i> 报销管理</h2>
                    <div class="section-actions">
                        <button class="btn btn-outline btn-sm" id="exportCsvBtn">
                            <i class="fas fa-file-csv"></i>
                            导出CSV
                        </button>
                        <button class="btn btn-outline btn-sm" id="exportHtmlBtn">
                            <i class="fas fa-file-code"></i>
                            导出HTML
                        </button>
                        <button class="btn btn-primary btn-sm" id="addReimbursementBtn">
                            <i class="fas fa-plus"></i>
                            添加报销
                        </button>
                    </div>
                </div>
        
        <div class="info-notice" style="background: var(--info-color); color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-info-circle" style="font-size: 20px;"></i>
            <div style="flex: 1;">
                <strong>数据保留说明</strong>
                <p style="margin: 5px 0 0 0;">报销记录和图片仅保留最近三个月的数据，超过三个月的记录会自动删除。请及时导出重要数据。</p>
            </div>
        </div>
        
        <div class="info-notice" style="background: var(--primary-light); color: var(--primary-color); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-file-image" style="font-size: 20px;"></i>
            <div style="flex: 1;">
                <strong>图片压缩工具</strong>
                <p style="margin: 5px 0 0 0;">如果上传的凭证图片过大，可以使用 <a href="/jg/html-new/image-compressor.php" style="color: var(--primary-color); font-weight: bold; text-decoration: underline;" target="_blank">图片压缩工具</a> 来减小文件大小。</p>
            </div>
        </div>
        
        <div class="stats-cards">
            <div class="stat-card">
                <div class="stat-label">报销总额</div>
                <div class="stat-value" id="totalAmount">¥0.00</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">本月报销</div>
                <div class="stat-value" id="monthAmount">¥0.00</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">报销笔数</div>
                <div class="stat-value" id="totalCount">0</div>
            </div>
        </div>
        
        <div class="reimbursement-list" id="reimbursementList">
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>暂无报销记录</p>
            </div>
        </div>
            </div>
        </main>
    <script>
        document.addEventListener('DOMContentLoaded', async function() {
            async function loadAllScripts() {
                const scripts = [
                    '/jg/js-core/event-bus.js',
                    '/jg/js-core/storage.js',
                    '/jg/js-core/intelligent-storage.js',
                    '/jg/js-core/logger.js',
                    '/jg/js-shared/theme.js',
                    '/jg/js-shared/login-icon.js',
                    '/jg/js-components/toast.js',
                    '/jg/js-components/dialog.js'
                ];

                for (const src of scripts) {
                    if (!document.querySelector(`script[src="${src}"]`)) {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = src;
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }
                }
            }

            try {
                await loadAllScripts();
                
                let components;
                if (window.appInitializer) {
                    components = await window.appInitializer.init();
                }
                
                const eventBus = components ? components.eventBus : window.eventBus;
                const storage = components ? components.storage : window.storage;
                
                const ThemeManager = window.ThemeManager || function() { return { init: () => {} }; };
                const theme = window.themeManager || new ThemeManager(storage, eventBus);
                if (!window.themeManager) {
                    theme.init();
                    window.themeManager = theme;
                }

                const Toast = window.Toast || function() { return { init: () => {} }; };
                const toast = window.toast || new Toast(eventBus);
                if (!window.toast) {
                    toast.init();
                    window.toast = toast;
                }

                function setupMenu() {
                    const mobileMenu = document.getElementById('mobileMenu');
                    
                    function toggleMenu() {
                        if (mobileMenu) {
                            if (mobileMenu.style.display === 'block' || mobileMenu.classList.contains('show')) {
                                mobileMenu.classList.remove('show');
                                setTimeout(() => {
                                    mobileMenu.style.display = 'none';
                                }, 300);
                            } else {
                                mobileMenu.style.display = 'block';
                                setTimeout(() => {
                                    mobileMenu.classList.add('show');
                                }, 10);
                            }
                        }
                    }

                    const menuBtn = document.querySelector('.menu-btn[data-action="toggle-menu"]');
                    if (menuBtn) {
                        menuBtn.onclick = function() {
                            toggleMenu();
                        };
                    }

                    const menuOverlay = document.querySelector('.mobile-menu-overlay');
                    if (menuOverlay) {
                        menuOverlay.onclick = function() {
                            toggleMenu();
                        };
                    }

                    const closeMenuBtn = document.querySelector('.mobile-menu-close');
                    if (closeMenuBtn) {
                        closeMenuBtn.onclick = function(e) {
                            e.stopPropagation();
                            toggleMenu();
                        };
                    }

                    const closeMenuElements = document.querySelectorAll('[data-action="close-menu"]');
                    closeMenuElements.forEach((element) => {
                        element.onclick = function(e) {
                            e.stopPropagation();
                            toggleMenu();
                        };
                    });

                    const toggleMenuElements = document.querySelectorAll('[data-action="toggle-menu"]');
                    toggleMenuElements.forEach((element) => {
                        element.onclick = function() {
                            toggleMenu();
                        };
                    });
                }

                setupMenu();

                // 加载并初始化菜单处理器（用于分享截图等功能）
                try {
                    const menuHandlerScript = document.createElement('script');
                    menuHandlerScript.src = '/jg/js-shared/menu-handler.js';
                    menuHandlerScript.onload = function() {
                        if (window.MenuHandler && window.toast) {
                            const menuHandler = new MenuHandler({
                                toast: window.toast,
                                logger: window.logger || { info: () => {}, error: () => {} }
                            });
                            menuHandler.init();
                        }
                    };
                    document.head.appendChild(menuHandlerScript);
                } catch (e) {
                    console.error('加载菜单处理器失败:', e);
                }
            } catch (error) {
                console.error('初始化失败:', error);
            }
        });
    </script>
    <script src="/jg/js-pages/reimbursement.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.reimbursementManager = new ReimbursementManager();
            window.reimbursementManager.init();
        });
    </script>
<?php include 'menu.php'; ?>
<?php include 'footer.php'; ?>
</body>
</html>