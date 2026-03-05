// 菜单事件处理
class MenuHandler {
    constructor(options) {
        this.toast = options.toast;
        this.logger = options.logger;
    }

    // 初始化菜单事件处理
    init() {
        // 延迟绑定事件，确保 menu.php 已加载
        if (document.querySelector('.mobile-menu')) {
            this.bindMenuEvents();
        } else {
            // 使用 MutationObserver 监听 DOM 变化
            const observer = new MutationObserver((mutations, obs) => {
                if (document.querySelector('.mobile-menu')) {
                    this.bindMenuEvents();
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // 设置超时，5秒后停止观察
            setTimeout(() => observer.disconnect(), 5000);
        }
    }

    // 绑定菜单事件
    bindMenuEvents() {
        // 绑定菜单容器区域的点击事件（包括 mobile-menu-items）
        const menuContainer = document.querySelector('.mobile-menu');
        if (menuContainer) {
            menuContainer.addEventListener('click', (e) => {
                // 检查是否点击了遮罩层
                if (e.target.classList.contains('mobile-menu-overlay')) {
                    this.closeMenu();
                    return;
                }

                // 检查是否点击了菜单项
                const actionEl = e.target.closest('[data-action]');
                if (actionEl) {
                    const action = actionEl.dataset.action;

                    // 阻止事件冒泡
                    e.stopPropagation();

                    switch (action) {
                        case 'toggle-menu':
                            // 菜单按钮的点击单独处理，这里不处理
                            break;
                        case 'close-menu':
                            this.closeMenu();
                            break;
                        case 'share-screenshot':
                            e.preventDefault();
                            this.handleShareScreenshot();
                            break;
                    }
                }
            });
        }

        // 绑定菜单按钮的点击事件
        const menuBtn = document.querySelector('[data-action="toggle-menu"]');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }
    }

    // 处理分享截图
    handleShareScreenshot() {
        // 先关闭菜单
        this.closeMenu();

        // 延迟执行截图操作，确保菜单完全关闭并且页面渲染完成
        setTimeout(() => {
            // 实现分享截图功能
            this.performScreenshot();
        }, 500); // 500毫秒的延迟，确保菜单完全关闭和页面稳定
    }

    // 执行截图操作
    performScreenshot() {
        try {
            // 保存当前滚动位置
            const originalScrollX = window.scrollX;
            const originalScrollY = window.scrollY;

            // 滚动到页面顶部，确保从顶部开始截图
            window.scrollTo(0, 0);

            // 等待页面渲染完成
            setTimeout(() => {
                this.loadHTML2Canvas().then(() => {
                
                // 获取要截图的元素（使用 body 元素）
                const element = document.body;

                // 获取文档的实际尺寸
                const docWidth = Math.max(
                    document.body.scrollWidth,
                    document.body.offsetWidth,
                    document.documentElement.scrollWidth,
                    document.documentElement.offsetWidth
                );
                const docHeight = Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );

                // 配置HTML2Canvas选项，确保生成高清图片
                const options = {
                    scale: 3, // 缩放比例，提高清晰度
                    useCORS: true, // 允许跨域图片
                    allowTaint: true, // 允许污染的图片
                    logging: false, // 禁用日志
                    backgroundColor: '#ffffff', // 设置白色背景
                    removeContainer: true, // 截图完成后移除临时容器
                    width: docWidth, // 使用文档实际宽度
                    height: docHeight, // 使用文档实际高度
                    x: 0, // 从左上角开始截图
                    y: 0, // 从顶部开始截图
                    scrollX: 0, // 不滚动
                    scrollY: 0, // 不滚动
                    imageTimeout: 0, // 不设置图片超时，确保所有图片都加载完成
                    onclone: function(clonedDoc) {
                        // 在克隆的文档中禁用所有动画和过渡，并确保字体图标正确显示
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            *, *::before, *::after {
                                animation: none !important;
                                transition: none !important;
                                transform: none !important;
                            }
                            /* 确保 body 和 html 高度自适应内容 */
                            html, body {
                                height: auto !important;
                                min-height: 100% !important;
                            }
                            /* 确保 Font Awesome 图标显示 */
                            .fas, .far, .fab, .fa {
                                font-family: "Font Awesome 5 Free", "FontAwesome", sans-serif !important;
                                font-weight: 900 !important;
                                -webkit-font-smoothing: antialiased !important;
                                display: inline-block !important;
                                font-style: normal !important;
                                font-variant: normal !important;
                                text-rendering: auto !important;
                                line-height: 1 !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);

                        // 强制重新计算样式以确保字体加载
                        clonedDoc.documentElement.style.fontFamily = getComputedStyle(document.documentElement).fontFamily;

                        // 确保 body 高度正确
                        const body = clonedDoc.body;
                        if (body) {
                            body.style.height = 'auto';
                            body.style.minHeight = body.scrollHeight + 'px';
                        }
                    }
                };

                html2canvas(element, options).then((canvas) => {
                    // 自动保存截图，静默下载不显示提示
                    this.saveCanvasAsImage(canvas);

                    // 恢复原始滚动位置
                    window.scrollTo(originalScrollX, originalScrollY);
                }).catch((error) => {
                    // 恢复原始滚动位置
                    window.scrollTo(originalScrollX, originalScrollY);

                    // 显示错误提示
                    if (this.toast) {
                        this.toast.error('截图失败，请重试');
                    }
                });
                }).catch((error) => {
                    // 恢复原始滚动位置
                    window.scrollTo(originalScrollX, originalScrollY);

                    // 显示错误提示
                    if (this.toast) {
                        this.toast.error('截图库加载失败，请检查网络连接');
                    }
                });
            }, 300); // 等待300ms确保页面渲染完成
        } catch (error) {
            // 显示错误提示
            if (this.toast) {
                this.toast.error('截图过程中发生错误');
            }
        }
    }

    // 加载HTML2Canvas库
    loadHTML2Canvas() {
        return new Promise((resolve, reject) => {
            // 如果已经加载，直接返回
            if (window.html2canvas) {
                resolve();
                return;
            }
            
            // 定义备用CDN地址列表
            const cdnUrls = [
                'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
                'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
            ];
            
            // 尝试从第一个CDN加载
            this.loadScriptFromCdn(cdnUrls, 0, resolve, reject);
        });
    }

    // 从CDN加载脚本
    loadScriptFromCdn(cdnUrls, index, resolve, reject) {
        if (index >= cdnUrls.length) {
            reject(new Error('所有CDN加载失败'));
            return;
        }

        const script = document.createElement('script');
        script.src = cdnUrls[index];
        script.onload = () => {
            if (window.html2canvas) {
                resolve();
            } else {
                // 移除当前脚本
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                // 尝试下一个CDN
                this.loadScriptFromCdn(cdnUrls, index + 1, resolve, reject);
            }
        };
        script.onerror = () => {
            // 移除当前脚本
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            // 尝试下一个CDN
            this.loadScriptFromCdn(cdnUrls, index + 1, resolve, reject);
        };

        document.head.appendChild(script);
    }

    // 保存Canvas为图片
    saveCanvasAsImage(canvas) {
        try {
            // 将Canvas转换为Blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    if (this.toast) {
                        this.toast.error('图片生成失败');
                    }
                    return;
                }

                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                // 生成文件名（使用当前时间戳）
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                link.download = `screenshot-${timestamp}.png`;

                // 触发下载
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 释放URL对象
                URL.revokeObjectURL(url);

                // 静默下载，不显示成功提示
            }, 'image/png');
        } catch (error) {
            if (this.toast) {
                this.toast.error('保存图片失败');
            }
        }
    }

    // 切换菜单显示状态
    toggleMenu() {
        // 首先尝试通过id找到菜单元素
        let menu = document.getElementById('mobileMenu');
        // 如果没找到，再尝试通过class找到
        if (!menu) {
            menu = document.querySelector('.mobile-menu');
        }
        if (menu) {
            const isShowing = menu.classList.contains('show');
            if (isShowing) {
                // 关闭菜单
                menu.classList.remove('show');
                menu.style.display = 'none';
            } else {
                // 显示菜单
                menu.style.display = 'block';
                // 强制重绘
                menu.offsetHeight;
                menu.classList.add('show');
            }
        }
    }

    // 关闭菜单
    closeMenu() {
        let menu = document.getElementById('mobileMenu');
        if (!menu) {
            menu = document.querySelector('.mobile-menu');
        }
        if (menu) {
            menu.classList.remove('show');
            menu.style.display = 'none';
        }
    }

    // 处理退出登录
    handleLogout() {
        // 先关闭菜单
        this.closeMenu();

        // 显示确认对话框
        if (this.dialog) {
            this.dialog.show({
                title: '退出登录',
                content: '确定要退出登录吗？',
                showCancel: true,
                confirmText: '确定',
                cancelText: '取消',
                onConfirm: () => {
                    // 清除登录状态
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_name');
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('token');

                    // 清除cookie
                    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = 'user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

                    // 跳转到登录页面
                    window.location.href = '/jg/html-new/login.php';
                },
                onCancel: () => {
                    // 用户取消，不做任何操作
                }
            });
        } else {
            // 如果没有对话框组件，直接退出
            if (confirm('确定要退出登录吗？')) {
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_role');
                localStorage.removeItem('token');
                window.location.href = '/jg/html-new/login.php';
            }
        }
    }
}

// 导出MenuHandler类
window.MenuHandler = MenuHandler;
