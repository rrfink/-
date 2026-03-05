<?php
$pageTitle = '电话簿 - 任工记工';
$page = 'phonebook';
include 'header.php';
?>
    <!-- 预加载关键资源 -->
    <link rel="preload" href="/jg/css-new/data-management.css" as="style">
    <link rel="preload" href="/jg/js-core/event-bus.js" as="script">
    <link rel="preload" href="/jg/js-core/storage.js" as="script">
    <link rel="preload" href="/jg/js-core/intelligent-storage.js" as="script">
    <link rel="preload" href="/jg/js-pages/phonebook.js" as="script">
    
    <link rel="stylesheet" href="/jg/css-new/data-management.css">
    <div id="app"></div>
    <!-- 预加载脚本 -->
    <script>
        // 预创建必要的全局对象，避免后续脚本执行时出错
        window.syncDataToCloud = window.syncDataToCloud || (async () => ({ success: false, error: 'Not loaded yet' }));
        window.restoreDataFromCloud = window.restoreDataFromCloud || (async () => ({ success: false, error: 'Not loaded yet' }));
    </script>
    
    <!-- 加载必要的脚本 -->
    <script>
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
                        resolve();
                    };
                    script.onerror = () => {
                        console.error('脚本加载失败:', src);
                        // 即使脚本加载失败，也继续执行，不抛出错误
                        resolve();
                    };
                    document.head.appendChild(script);
                });
            }
            
            // 实现真正的懒加载，使用动态导入（import()）来实现更高效的懒加载
            const lazyLoadScripts = {
                utils: async () => {
                    if (!window.Utils) {
                        try {
                            await import(`/jg/js-core/utils.js?v=2.5`);
                        } catch (error) {
                            console.error('工具脚本加载失败:', error);
                            await loadScript(`/jg/js-core/utils.js?v=2.5`);
                        }
                    }
                },
                
                constants: async () => {
                    if (!window.constantsLoaded) {
                        try {
                            await import(`/jg/js-core/constants.js?v=2.5`);
                            window.constantsLoaded = true;
                        } catch (error) {
                            console.error('常量脚本加载失败:', error);
                            await loadScript(`/jg/js-core/constants.js?v=2.5`);
                            window.constantsLoaded = true;
                        }
                    }
                },
                
                formDialog: async () => {
                    if (!window.FormDialog) {
                        try {
                            await import(`/jg/js-components/form-dialog.js?v=2.5`);
                        } catch (error) {
                            console.error('表单对话框脚本加载失败:', error);
                            await loadScript(`/jg/js-components/form-dialog.js?v=2.5`);
                        }
                    }
                },
                
                phonebookUtils: async () => {
                    if (!window.phonebookUtils) {
                        try {
                            await import(`/jg/js/phonebook-utils.js?v=2.5`);
                        } catch (error) {
                            console.error('电话簿工具脚本加载失败:', error);
                            await loadScript(`/jg/js/phonebook-utils.js?v=2.5`);
                        }
                    }
                }
            };
            
            // 暴露懒加载函数到全局
            window.lazyLoadScripts = lazyLoadScripts;
            
            // 加载核心脚本
            async function loadCoreScripts() {
                try {
                    const version = '2.5';

                    // 首先并行加载基础核心脚本
                    await Promise.all([
                        // 基础核心脚本
                        loadScript(`/jg/js-core/event-bus.js?v=${version}`),
                        loadScript(`/jg/js-core/logger.js?v=${version}`),
                        // 存储相关脚本
                        loadScript(`/jg/js-core/storage.js?v=${version}`),
                        loadScript(`/jg/js-core/intelligent-storage.js?v=${version}`),
                        // 共享脚本（theme.js 已由 header.php 加载）
                        loadScript(`/jg/js-shared/login-icon.js?v=${version}`),
                        // 组件脚本
                        loadScript(`/jg/js-components/toast.js?v=${version}`),
                        loadScript(`/jg/js-components/dialog.js?v=${version}`)
                    ]);

                    // 先加载 phonebook.js，确保 PhoneBookPage 类已定义
                    await loadScript(`/jg/js-pages/phonebook.js?v=${version}`);

                    // 再加载 phonebook-init.js，它依赖于 PhoneBookPage
                    await loadScript(`/jg/js-pages/phonebook-init.js?v=${version}`);

                    // 加载菜单处理器（用于分享截图等功能）
                    await loadScript(`/jg/js-shared/menu-handler.js?v=${version}`);

                    return true;
                } catch (error) {
                    console.error('核心脚本加载过程中出现错误:', error);
                    // 即使出现错误，也继续执行
                    return false;
                }
            }
            
            // 延迟加载非核心脚本
            function loadNonCoreScripts() {
                const version = '2.5';
                
                // 加载工具脚本，因为它可能被其他模块使用
                lazyLoadScripts.utils().catch(error => {
                    console.error('工具脚本加载失败:', error);
                });
                
                // 加载常量脚本
                lazyLoadScripts.constants().catch(error => {
                    console.error('常量脚本加载失败:', error);
                });
            }
            
            // 加载脚本
            try {
                await loadCoreScripts();
                
                // 延迟加载非核心脚本
                loadNonCoreScripts();
                
                // 使用应用初始化模块初始化核心组件
                let components;
                if (window.appInitializer) {
                    components = await window.appInitializer.init();
                } else {
                    console.warn('应用初始化模块未加载');
                }

                // 初始化菜单处理器（用于分享截图等功能）
                if (window.MenuHandler) {
                    const menuHandler = new MenuHandler({
                        toast: window.toast,
                        logger: window.logger
                    });
                    menuHandler.init();
                    console.log('MenuHandler 初始化成功');
                } else {
                    console.error('MenuHandler 未加载');
                }
            } catch (error) {
                console.error('初始化应用过程中出现错误:', error);
            }
        });
    </script>
<?php
include 'menu.php';
include 'footer.php';
?>
</body>
</html>
