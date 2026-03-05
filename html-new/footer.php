    <footer class="app-footer">
        <div class="app-footer-content">
            <p>© 2026 任工记工. All rights reserved.</p>
            <div class="footer-version-info">
                <span id="footerVersion">系统版本: 加载中...</span>
                <span id="footerUpdate">最后更新: 加载中...</span>
            </div>
        </div>
        <style>
            .footer-version-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-light);
            }
            
            .footer-version-info span {
                display: block;
            }
        </style>
        <script src="/jg/js/system-settings.js"></script>
        <script>
            // 加载页脚系统名称
            async function loadFooterSystemName() {
                try {
                    await window.loadSystemName({
                        updateTitle: false,
                        elements: [
                            {
                                selector: '.app-footer-content p',
                                type: 'text'
                            }
                        ]
                    });
                } catch (error) {
                    console.error('加载系统名称失败:', error);
                }
            }
            
            // 独立获取版本号，确保在任何页面都能显示
            (async function() {
                const versionEl = document.getElementById('footerVersion');
                const updateEl = document.getElementById('footerUpdate');
                
                // 加载系统名称
                await loadFooterSystemName();
                
                try {
                    // 直接从API获取版本号
                    const response = await fetch('/jg/api/app-version.php');
                    const result = await response.json();
                    
                    if (result.success && result.version) {
                        if (versionEl) {
                            versionEl.textContent = `系统版本: v${result.version}`;
                        }
                    } else {
                        if (versionEl) {
                            versionEl.textContent = '系统版本: 1.0.0';
                        }
                    }
                } catch (error) {
                    if (versionEl) {
                        versionEl.textContent = '系统版本: 1.0.0';
                    }
                }
                
                // 设置最后更新时间
                if (updateEl) {
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0];
                    updateEl.textContent = `最后更新: ${dateStr}`;
                }
            })();
        </script>
    </footer>
