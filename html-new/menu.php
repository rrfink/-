    <style>
        .mobile-menu {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: var(--z-index-modal);
        }
        
        .mobile-menu.show {
            display: block;
        }
        
        .mobile-menu-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
        }
        
        .mobile-menu-content {
            position: absolute;
            top: 0;
            right: 0;
            width: 280px;
            height: 100%;
            background-color: var(--bg-primary);
            box-shadow: var(--shadow-lg);
            padding: var(--spacing-md);
        }
        
        .mobile-menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--border-color);
        }
        
        .mobile-menu-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding: var(--spacing-md);
            border-radius: var(--border-radius);
            transition: all var(--transition-fast);
            cursor: pointer;
            margin-bottom: var(--spacing-xs);
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            font: inherit;
            color: inherit;
        }
        
        .mobile-menu-item i {
            width: 20px;
            text-align: center;
        }
        
        .mobile-menu-item:hover {
            background-color: var(--bg-tertiary);
        }
        
        .mobile-menu-item.active {
            background-color: rgba(22, 93, 255, 0.1);
            color: var(--primary-color);
        }
        


    </style>
    <script>
        function closeMenuAfterAction() {
            // 首先尝试通过id找到菜单元素
            let menu = document.getElementById('mobileMenu');
            // 如果没找到，再尝试通过class找到
            if (!menu) {
                menu = document.querySelector('.mobile-menu');
            }
            if (menu) {
                menu.classList.remove('show');
                // 移除内联样式，确保后续的toggle操作能正常工作
                setTimeout(() => {
                    menu.style.display = '';
                }, 300);
            }
        }
        
        // 清除所有登录状态
        function clearLoginStatus() {
            // 清除本地存储
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_phone');
            localStorage.removeItem('user_password');
            localStorage.removeItem('login_time');
            localStorage.removeItem('username');
            
            // 清除 cookie
            document.cookie = 'user_id=; max-age=0; path=/; secure=false; samesite=lax';
            document.cookie = 'user_name=; max-age=0; path=/; secure=false; samesite=lax';
            document.cookie = 'user_email=; max-age=0; path=/; secure=false; samesite=lax';
            document.cookie = 'user_phone=; max-age=0; path=/; secure=false; samesite=lax';
            document.cookie = 'user_password=; max-age=0; path=/; secure=false; samesite=lax';
        }
        
        // 直接处理退出登录事件
        function handleLogout() {
            console.log('退出登录按钮被点击');
            const result = confirm('确定要退出登录吗？');
            console.log('退出登录对话框结果:', result);
            
            if (result) {
                // 清除所有登录状态
                clearLoginStatus();
                
                // 显示退出成功提示
                try {
                    if (window.toast) {
                        window.toast.success('退出登录成功');
                    } else {
                        alert('退出登录成功');
                    }
                } catch (e) {
                    alert('退出登录成功');
                }
                
                // 关闭菜单
                closeMenuAfterAction();
                
                // 跳转到登录页面
                setTimeout(() => {
                    window.location.href = '/jg/html-new/login.php';
                }, 1000);
            } else {
                console.log('用户取消退出登录');
                // 关闭菜单
                closeMenuAfterAction();
            }
        }
    </script>
    <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-overlay" data-action="toggle-menu"></div>
        <div class="mobile-menu-content">
            <div class="mobile-menu-header">
                <h3>菜单</h3>
                <button class="mobile-menu-close" data-action="close-menu" onclick="closeMenuAfterAction()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-menu-items">

                <a href="/jg/html-new/phonebook.php" class="mobile-menu-item <?php echo $page === 'phonebook' ? 'active' : ''; ?>">
                    <i class="fas fa-users"></i>
                    <span>同事电话</span>
                </a>
                <a href="/jg/html-new/project-management.php" class="mobile-menu-item <?php echo $page === 'project' ? 'active' : ''; ?>">
                    <i class="fas fa-building"></i>
                    <span>项目管理</span>
                </a>
                <a href="/jg/html-new/data-management.php" class="mobile-menu-item <?php echo $page === 'data' ? 'active' : ''; ?>">
                    <i class="fas fa-database"></i>
                    <span>数据管理</span>
                </a>
                <a href="/jg/html-new/holiday-management.php" class="mobile-menu-item <?php echo $page === 'holiday' ? 'active' : ''; ?>">
                    <i class="fas fa-calendar-alt"></i>
                    <span>节日管理</span>
                </a>
                <a href="/jg/html-new/attendance-status.php" class="mobile-menu-item <?php echo $page === 'attendance' ? 'active' : ''; ?>">
                    <i class="fas fa-calendar-check"></i>
                    <span>考勤状态</span>
                </a>
                <a href="/jg/html-new/query.php" class="mobile-menu-item <?php echo $page === 'query' ? 'active' : ''; ?>">
                    <i class="fas fa-search"></i>
                    <span>查询分析</span>
                </a>
                <a href="/jg/html-new/reimbursement.php" class="mobile-menu-item <?php echo $page === 'reimbursement' ? 'active' : ''; ?>">
                    <i class="fas fa-receipt"></i>
                    <span>报销管理</span>
                </a>
                <a href="/jg/html-new/foreman-management.php" class="mobile-menu-item <?php echo $page === 'foreman-management' ? 'active' : ''; ?>">
                    <i class="fas fa-user-tie"></i>
                    <span>工头管理</span>
                </a>
                <button class="mobile-menu-item" data-action="share-screenshot">
                    <i class="fas fa-share-alt"></i>
                    <span>分享截图</span>
                </button>

                <button class="mobile-menu-item" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>退出登录</span>
                </button>
            </div>
        </div>
    </div>
